// Accounts: "Continue with Google", for everyone: the organizer, every friend who records and the recipient.
// Google has already confirmed the email, so there are no passwords, confirm emails or resets here (lib/google.js
// checks the token). Accounts from the email + password days join their Google account by the same email.
//
// users/<id>/user.json            one per account { id, name, email, googleSub, … }
// users/<id>/gifts/<slug>.json    one per gift the account made: the account page lists these
// users/<id>/thanks/<slug>.json   one per thank-you the account received: the home page lists these
// emails/<sha256(email)>.json     { id }: finds the account by email, and keeps emails unique
// sessions/<sha256(token)>.json   { userId, createdAt, expiresAt }: one per logged-in browser (the token itself is only in its cookie)

import crypto from 'node:crypto';
import { getJSON, putJSON, listPaths, deleteObject } from './store.js';
import { HttpError, cleanText } from './http.js';
import { rid } from './gifts.js';

const SESSION_DAYS = 30;
const COOKIE = 'vg_session';
const COOKIE_RE = new RegExp(`(?:^|;\\s*)${COOKIE}=([\\w-]{43})(?:;|$)`); // 32 random bytes, base64url

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const userPath = (id) => `users/${id}/user.json`;
const emailPath = (email) => `emails/${sha256(email)}.json`;
const sessionPath = (token) => `sessions/${sha256(token)}.json`;
const giftPath = (userId, slug) => `users/${userId}/gifts/${slug}.json`;

// ---------- accounts ----------
const saveUser = (user) => putJSON(userPath(user.id), user, { overwrite: true });

// What the pages may see of an account.
export const publicUser = (user) => ({
  name: user.name,
  email: user.email,
  bio: user.bio || '',
  createdAt: user.createdAt,
  prefs: {
    asrLang: user.prefs?.asrLang || 'id-ID',
    autoHighlight: user.prefs?.autoHighlight !== false,
    shareCorpus: user.prefs?.shareCorpus !== false
  }
});

export async function updateProfile(user, input = {}) {
  if (input.name !== undefined) {
    const name = cleanText(input.name, 40);
    if (!name) throw new HttpError(400, 'Please enter your name.');
    user.name = name;
  }
  if (input.bio !== undefined) {
    user.bio = cleanText(input.bio, 120);
  }
  if (input.prefs && typeof input.prefs === 'object') {
    user.prefs = {
      asrLang: ['id-ID', 'en-US'].includes(input.prefs.asrLang) ? input.prefs.asrLang : (user.prefs?.asrLang || 'id-ID'),
      autoHighlight: input.prefs.autoHighlight !== undefined ? Boolean(input.prefs.autoHighlight) : (user.prefs?.autoHighlight !== false),
      shareCorpus: input.prefs.shareCorpus !== undefined ? Boolean(input.prefs.shareCorpus) : (user.prefs?.shareCorpus !== false)
    };
  }
  await saveUser(user);
  return user;
}

// A Google account ({ sub, email, name }, already checked): logs in the account with that email, or makes one.
// An account from the email + password days joins it (Google proved the email is theirs); its password is dropped.
export async function googleSignIn(profile) {
  const now = new Date().toISOString();
  const email = String(profile.email).toLowerCase();
  const ref = await getJSON(emailPath(email));
  const user = ref && (await getJSON(userPath(ref.id)));
  if (user) {
    if (user.googleSub && user.googleSub !== profile.sub) throw new HttpError(409, 'This email belongs to another Google account.');
    for (const old of ['passwordHash', 'failedLogins', 'lockedUntil', 'verified', 'verifiedAt', 'emailedAt', 'passwordChangedAt']) delete user[old];
    Object.assign(user, { googleSub: profile.sub, lastLoginAt: now });
    await saveUser(user);
    return user;
  }
  const name = cleanText(profile.name, 40) || email.split('@')[0].slice(0, 40);
  const fresh = { id: rid(8), name, email, googleSub: profile.sub, createdAt: now, lastLoginAt: now };
  await putJSON(userPath(fresh.id), fresh);
  // Not overwritten (unless a stale reference points nowhere), so two first logins at the same moment can't both get it.
  await putJSON(emailPath(email), { id: fresh.id }, { overwrite: Boolean(ref) }).catch(async (e) => {
    await deleteObject(userPath(fresh.id));
    throw e;
  });
  return fresh;
}

// ---------- sessions: a random token in an HttpOnly cookie; storage keeps only its hash ----------
function readToken(req) {
  return COOKIE_RE.exec(req.headers.cookie || '')?.[1] || null;
}

// Secure on Vercel (always https), not on the local dev server (plain http).
function setCookie(res, value, maxAge) {
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${process.env.VERCEL ? '; Secure' : ''}`);
}

export async function startSession(req, res, user) {
  const old = readToken(req);
  if (old) await deleteObject(sessionPath(old)); // someone else was logged in on this browser
  const token = crypto.randomBytes(32).toString('base64url');
  await putJSON(sessionPath(token), { userId: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5).toISOString() });
  setCookie(res, token, SESSION_DAYS * 86400);
}

export async function endSession(req, res) {
  const token = readToken(req);
  if (token) await deleteObject(sessionPath(token));
  setCookie(res, '', 0);
}

// The logged-in account, or null. Sessions from the email + password days don't count: those accounts log in with
// Google once (then they have a googleSub).
export async function currentUser(req) {
  const token = readToken(req);
  if (!token) return null;
  const session = await getJSON(sessionPath(token));
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return null;
  const user = await getJSON(userPath(session.userId));
  return user?.googleSub ? user : null;
}

export async function requireUser(req, message = 'Please log in first.') {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, message);
  return user;
}

// ---------- thank-you notes: the recipient thanks everyone, each friend finds it on their home page ----------
// A new note pops up once on the home page; after that it waits in the Dashboard and is deleted 7 days after
// it was first opened. (The recipient's voice itself stays with the gift as training data; only the note goes.)
export const THANKS_KEEP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const expiresAt = (n) => (n.read ? Date.parse(n.readAt || n.at) + THANKS_KEEP_DAYS * DAY_MS : null);

export async function addThanks(userId, note) {
  await putJSON(`users/${userId}/thanks/${note.slug}.json`, { ...note, read: false }, { overwrite: true });
}

// The account's notes, newest first, each with `expiresAt` once opened. Expired ones are deleted here.
export async function listThanks(userId) {
  const paths = await listPaths(`users/${userId}/thanks/`);
  const notes = await Promise.all(paths.map(async (path) => ({ ...(await getJSON(path)), path })));
  const now = Date.now();
  const live = [];
  for (const n of notes.filter((x) => x.at)) {
    const exp = expiresAt(n);
    if (exp && exp <= now) await deleteObject(n.path).catch(() => {});
    else live.push({ ...n, expiresAt: exp ? new Date(exp).toISOString() : null });
  }
  return live.sort((a, b) => b.at.localeCompare(a.at));
}

export async function findThanksNote(userId, slug) {
  return (await listThanks(userId)).find((n) => n.slug === slug) || null;
}

// Marks one note (or every unread note) as opened: its 7 days start now.
export async function markThanksRead(userId, slug) {
  const unread = (await listThanks(userId)).filter((n) => !n.read && (!slug || n.slug === slug));
  const readAt = new Date().toISOString();
  await Promise.all(unread.map(({ path, expiresAt: _, ...note }) => putJSON(path, { ...note, read: true, readAt }, { overwrite: true })));
}

// ---------- the gifts an account made ----------
export async function addGift(userId, slug) {
  await putJSON(giftPath(userId, slug), { slug, at: new Date().toISOString() }, { overwrite: true });
}

export async function forgetGift(userId, slug) {
  await deleteObject(giftPath(userId, slug));
}

export async function giftSlugs(userId) {
  return (await listPaths(`users/${userId}/gifts/`)).map((p) => p.slice(p.lastIndexOf('/') + 1, -'.json'.length));
}

// Every account, newest first, for the team (GET /api/users).
export async function listUsers() {
  const paths = await listPaths('users/');
  const gifts = {};
  for (const [, id, kind] of paths.map((p) => p.split('/'))) if (kind === 'gifts') gifts[id] = (gifts[id] || 0) + 1;
  const users = await Promise.all(paths.filter((p) => p.endsWith('/user.json')).map((p) => getJSON(p)));
  return users.filter(Boolean)
    .map((u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt || null, gifts: gifts[u.id] || 0 }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
