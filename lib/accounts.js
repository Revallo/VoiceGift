// Accounts: email + password or Google, for everyone: the organizer, every friend who records and the recipient.
//
// users/<id>/user.json            one per account (the password only as a scrypt hash)
// users/<id>/gifts/<slug>.json    one per gift the account made: the account page lists these
// users/<id>/thanks/<slug>.json   one per thank-you the account received: the home page lists these
// emails/<sha256(email)>.json     { id }: finds the account by email, and keeps emails unique
// sessions/<sha256(token)>.json   { userId, expiresAt }: one per logged-in browser (the token itself is only in its cookie)

import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { getJSON, putJSON, listPaths, deleteObject } from './store.js';
import { HttpError, cleanText } from './http.js';
import { rid } from './gifts.js';

const scrypt = promisify(crypto.scrypt);
// One of OWASP's scrypt settings (32 MB of memory, ~0.1 s). Stored with each hash, so it can change later.
const SCRYPT = { N: 2 ** 15, r: 8, p: 3 };
const SESSION_DAYS = 30;
const MAX_TRIES = 10; // wrong passwords in a row before the account has to wait LOCK_MIN minutes
const LOCK_MIN = 15;
const COOKIE = 'vg_session';
const COOKIE_RE = new RegExp(`(?:^|;\\s*)${COOKIE}=([\\w-]{43})(?:;|$)`); // 32 random bytes, base64url

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const userPath = (id) => `users/${id}/user.json`;
const emailPath = (email) => `emails/${sha256(email)}.json`;
const sessionPath = (token) => `sessions/${sha256(token)}.json`;
const giftPath = (userId, slug) => `users/${userId}/gifts/${slug}.json`;

function readEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
  return email;
}

// ---------- passwords ----------
async function hashPassword(password) {
  const { N, r, p } = SCRYPT;
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64, { N, r, p, maxmem: 256 * N * r });
  return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

async function passwordMatches(stored, password) {
  const [kind, N, r, p, salt, hash] = String(stored).split('$');
  if (kind !== 'scrypt') return false;
  const want = Buffer.from(hash, 'base64url');
  const got = await scrypt(password, Buffer.from(salt, 'base64url'), want.length, { N: +N, r: +r, p: +p, maxmem: 256 * N * r });
  return crypto.timingSafeEqual(got, want);
}

// ---------- accounts ----------
const saveUser = (user) => putJSON(userPath(user.id), user, { overwrite: true });

// What the pages may see of an account.
export const publicUser = (user) => ({
  name: user.name,
  email: user.email,
  bio: user.bio || '',
  createdAt: user.createdAt,
  hasPassword: Boolean(user.passwordHash), // false for an account made with Google
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
  if (input.newPassword) {
    const cur = String(input.currentPassword || '');
    const next = String(input.newPassword || '');
    // an account made with Google has no password yet: it can set one without the old one
    if (user.passwordHash && (!cur || !(await passwordMatches(user.passwordHash, cur)))) {
      throw new HttpError(401, 'Current password is incorrect.');
    }
    if (next.length < 8) throw new HttpError(400, 'Use at least 8 characters for your new password.');
    if (next.length > 200) throw new HttpError(400, 'That password is too long.');
    user.passwordHash = await hashPassword(next);
  }
  await saveUser(user);
  return user;
}

export async function signUp(input) {
  const name = cleanText(input.name, 40);
  if (!name) throw new HttpError(400, 'Please enter your name.');
  const email = readEmail(input.email);
  const password = String(input.password ?? '');
  if (password.length < 8) throw new HttpError(400, 'Use at least 8 characters for your password.');
  if (password.length > 200) throw new HttpError(400, 'That password is too long.');
  if (await getJSON(emailPath(email))) throw new HttpError(409, 'There’s already an account with this email. Log in instead.');

  const user = { id: rid(8), name, email, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
  await putJSON(userPath(user.id), user);
  // Not overwritten, so two sign-ups with one email at the same moment can't both get it.
  await putJSON(emailPath(email), { id: user.id }).catch(async (e) => {
    await deleteObject(userPath(user.id));
    throw e;
  });
  return user;
}

export async function logIn(input) {
  const wrong = new HttpError(401, 'Wrong email or password.');
  const email = readEmail(input.email);
  const password = String(input.password ?? '');
  if (!password || password.length > 200) throw wrong;
  const ref = await getJSON(emailPath(email));
  const user = ref && (await getJSON(userPath(ref.id)));
  if (!user) throw wrong;
  if (Date.parse(user.lockedUntil) > Date.now()) throw new HttpError(429, `Too many wrong passwords. Please try again in ${LOCK_MIN} minutes.`);
  if (!user.passwordHash) throw new HttpError(401, 'This account uses Google. Tap “Continue with Google”.');

  if (!(await passwordMatches(user.passwordHash, password))) {
    user.failedLogins = (user.failedLogins || 0) + 1;
    if (user.failedLogins >= MAX_TRIES) Object.assign(user, { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MIN * 60e3).toISOString() });
    await saveUser(user);
    throw wrong;
  }
  delete user.lockedUntil;
  Object.assign(user, { failedLogins: 0, lastLoginAt: new Date().toISOString() });
  await saveUser(user);
  return user;
}

// ---------- Google: "Continue with Google" (only when GOOGLE_CLIENT_ID is set) ----------
export const googleClientId = () => process.env.GOOGLE_CLIENT_ID || '';

// `credential` is the ID token Google's button hands the page. Google itself checks it (one request, no library);
// we check it was made for this app, is still valid, and that Google has verified the email.
// The account with that email is logged in; if there is none yet, it is created (without a password).
export async function googleLogIn(credential) {
  const clientId = googleClientId();
  if (!clientId) throw new HttpError(503, 'Google login is not set up here.');
  const failed = new HttpError(401, 'Google login didn’t work. Please try again.');
  const token = String(credential ?? '');
  if (token.length > 4096 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) throw failed;
  let info;
  try {
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { signal: AbortSignal.timeout(8000) });
    info = r.ok ? await r.json() : null;
  } catch {
    throw new HttpError(502, 'Couldn’t reach Google. Please try again.');
  }
  const good = info && info.aud === clientId && ['accounts.google.com', 'https://accounts.google.com'].includes(info.iss)
    && String(info.email_verified) === 'true' && Number(info.exp) * 1000 > Date.now() && info.sub;
  if (!good) throw failed;

  const email = readEmail(info.email);
  const now = new Date().toISOString();
  const ref = await getJSON(emailPath(email));
  let user = ref && (await getJSON(userPath(ref.id)));
  if (user) {
    if (user.googleSub && user.googleSub !== info.sub) throw failed;
    if (!user.googleSub) {
      // Emails are never verified here, so the password may have been set by someone who doesn't own this
      // email. Google has just proven who does: the password goes, and so does every older session.
      user.googleSub = info.sub;
      delete user.passwordHash;
      user.sessionsFrom = now;
    }
    delete user.lockedUntil;
    Object.assign(user, { failedLogins: 0, lastLoginAt: now });
    await saveUser(user);
    return { user, created: false };
  }
  user = { id: rid(8), name: cleanText(info.name || info.given_name, 40) || email.split('@')[0].slice(0, 40), email, googleSub: info.sub, createdAt: now, lastLoginAt: now };
  await putJSON(userPath(user.id), user);
  await putJSON(emailPath(email), { id: user.id }).catch(async (e) => {
    await deleteObject(userPath(user.id));
    throw e;
  });
  return { user, created: true };
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
  const now = Date.now();
  await putJSON(sessionPath(token), { userId: user.id, startedAt: new Date(now).toISOString(), expiresAt: new Date(now + SESSION_DAYS * 864e5).toISOString() });
  setCookie(res, token, SESSION_DAYS * 86400);
}

export async function endSession(req, res) {
  const token = readToken(req);
  if (token) await deleteObject(sessionPath(token));
  setCookie(res, '', 0);
}

// The logged-in account, or null (no storage read without the cookie, so any request can ask).
// A session from before user.sessionsFrom no longer counts: that is how Google taking over an account
// logs out whoever was in it with the old password.
export async function currentUser(req) {
  const token = readToken(req);
  if (!token) return null;
  const session = await getJSON(sessionPath(token));
  if (!session || !(Date.parse(session.expiresAt) > Date.now())) return null;
  const user = await getJSON(userPath(session.userId));
  if (!user) return null;
  if (user.sessionsFrom && !((session.startedAt || '') >= user.sessionsFrom)) return null;
  return user;
}

export async function sessionUserId(req) {
  return (await currentUser(req))?.id || null;
}

export async function requireUser(req, message = 'Please log in first.') {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, message);
  return user;
}

// ---------- thank-you notes: the recipient thanks everyone, each friend finds it on their home page ----------
export async function addThanks(userId, note) {
  await putJSON(`users/${userId}/thanks/${note.slug}.json`, { ...note, read: false }, { overwrite: true });
}

export async function listThanks(userId) {
  const paths = await listPaths(`users/${userId}/thanks/`);
  const notes = await Promise.all(paths.map(async (path) => ({ ...(await getJSON(path)), path })));
  return notes.filter((n) => n.at).sort((a, b) => b.at.localeCompare(a.at));
}

export async function markThanksRead(userId) {
  const unread = (await listThanks(userId)).filter((n) => !n.read);
  await Promise.all(unread.map(({ path, ...note }) => putJSON(path, { ...note, read: true }, { overwrite: true })));
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
