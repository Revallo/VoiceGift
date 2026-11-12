// "Continue with Google", the only way to log in: the page gets an ID token from Google's button (Google Identity
// Services) and posts it here. We ask Google whether the token is real (tokeninfo, no library needed) and made for
// our client id. Google has already confirmed the email.
//
// GOOGLE_CLIENT_ID: the OAuth "Web application" client id from Google Cloud Console. Without it nobody can log in.
// DEV_LOGIN=1 (local only, never on Vercel): a plain email + name form instead, for the e2e test and local work.

import { HttpError } from './http.js';

export const googleClientId = process.env.GOOGLE_CLIENT_ID || null;
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
export const devLogin = process.env.DEV_LOGIN === '1' && !process.env.VERCEL;

// The dev login's stand-in for a Google account.
export function devProfile({ email, name }) {
  if (!devLogin) throw new HttpError(404, 'Not found');
  const clean = String(email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254) throw new HttpError(400, 'Please enter a valid email address.');
  return { sub: `dev:${clean}`, email: clean, name: String(name ?? '') };
}

// → { sub, email, name } of a Google account with a confirmed email, or throws 401.
export async function verifyGoogleToken(credential) {
  if (!googleClientId) throw new HttpError(503, 'Google login isn’t set up yet (GOOGLE_CLIENT_ID).');
  const bad = new HttpError(401, 'Google login didn’t work. Please try again.');
  if (typeof credential !== 'string' || credential.length > 4096) throw bad;
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`).catch(() => {
    throw new HttpError(503, 'We couldn’t reach Google just now. Please try again.');
  });
  if (!res.ok) throw bad;
  const t = await res.json();
  if (t.aud !== googleClientId || !ISSUERS.includes(t.iss) || Number(t.exp) * 1000 <= Date.now()) throw bad;
  if (t.email_verified !== true && t.email_verified !== 'true') throw new HttpError(401, 'Your Google account’s email isn’t confirmed yet.');
  return { sub: String(t.sub), email: String(t.email).toLowerCase(), name: t.name || t.given_name || '' };
}
