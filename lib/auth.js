// Accounts (prototype): sign in with a name + email, no password yet.
// The real version would verify the email/phone (Google or an OTP); everything else stays the same.
//
// users/<id>/user.json                   { id, email, name, createdAt }   id = hash of the email
// users/<id>/made/<slug>.json            gifts this person created
// users/<id>/got/<slug>.json             gifts this person received (claimed when they first opened it)
// users/<id>/sent/<slug>-<msgId>.json    messages this person recorded
//
// The session is a signed cookie (vg=<id>.<expires>.<signature>), so nothing is stored per session.

import crypto from 'node:crypto';
import { getJSON, putJSON, listPaths, deleteObject } from './store.js';
import { HttpError, cleanText } from './http.js';

const COOKIE = 'vg';
const DAYS = 180;
const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_KEY || 'voice-gift-dev-only';
if (process.env.VERCEL && !process.env.SESSION_SECRET) console.warn('Set SESSION_SECRET so sign-in cookies cannot be forged.');

const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url').slice(0, 32);
const userPath = (id) => `users/${id}/user.json`;
export const userIdFor = (email) => crypto.createHash('sha256').update(email).digest('hex').slice(0, 20);

export function cleanEmail(value) {
  const email = cleanText(value, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new HttpError(400, 'Please enter a valid email.');
  return email;
}

// Creates the account the first time, otherwise updates the name. Returns the user.
export async function signIn(email, name) {
  const id = userIdFor(email);
  const now = new Date().toISOString();
  const user = { ...((await getJSON(userPath(id))) || { id, email, createdAt: now }), name, lastSignIn: now };
  await putJSON(userPath(id), user, { overwrite: true });
  return user;
}

export function sessionCookie(user, req) {
  const exp = Math.floor(Date.now() / 1000) + DAYS * 86400;
  const value = `${user.id}.${exp}.${sign(`${user.id}.${exp}`)}`;
  return `${COOKIE}=${value}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; SameSite=Lax${secure(req)}`;
}
export const signOutCookie = (req) => `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure(req)}`;
const secure = (req) => (req.headers['x-forwarded-proto'] === 'https' || process.env.VERCEL ? '; Secure' : '');

// The signed-in user, or null.
export async function currentUser(req) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(req.headers.cookie || '');
  if (!m) return null;
  const [id, exp, sig] = m[1].split('.');
  if (!/^[a-f0-9]{20}$/.test(id || '') || !sig || sig !== sign(`${id}.${exp}`) || Number(exp) * 1000 < Date.now()) return null;
  return getJSON(userPath(id));
}

export async function requireUser(req) {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, 'Please sign in first.');
  return user;
}

export const publicUser = (u) => (u ? { id: u.id, name: u.name, email: u.email } : null);

// ---------- "my account" lists ----------
export async function remember(userId, kind, key, data) {
  await putJSON(`users/${userId}/${kind}/${key}.json`, { ...data, at: new Date().toISOString() }, { overwrite: true });
}
export async function forget(userId, kind, key) {
  await deleteObject(`users/${userId}/${kind}/${key}.json`);
}
export async function listOf(userId, kind) {
  const paths = await listPaths(`users/${userId}/${kind}/`);
  return (await Promise.all(paths.map((p) => getJSON(p)))).filter(Boolean);
}
