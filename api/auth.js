// GET    /api/auth                 → { user } (null when signed out)
// POST   /api/auth {name, email}   → signs in (creates the account the first time) → { user }
// DELETE /api/auth                 → signs out
import { route, send, jsonBody, cleanText, HttpError } from '../lib/http.js';
import { currentUser, signIn, sessionCookie, signOutCookie, cleanEmail, publicUser } from '../lib/auth.js';

export default route({
  async GET(req, res) {
    send(res, 200, { user: publicUser(await currentUser(req)) });
  },

  async POST(req, res) {
    const b = await jsonBody(req);
    const name = cleanText(b.name, 40);
    if (!name) throw new HttpError(400, 'Please enter your name.');
    const user = await signIn(cleanEmail(b.email), name);
    send(res, 200, { user: publicUser(user) }, { 'Set-Cookie': sessionCookie(user, req) });
  },

  async DELETE(req, res) {
    send(res, 200, { ok: true }, { 'Set-Cookie': signOutCookie(req) });
  }
});
