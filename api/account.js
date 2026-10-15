// GET  /api/account               → { user: { name, email } | null }: who is logged in on this browser
// GET  /api/account?gifts=1       → also the gifts they made, each with its dashboard key
// POST /api/account { action: "signup", name, email, password }  → new account, logged in
//                   { action: "login", email, password }         → logged in for 30 days (HttpOnly cookie)
//                   { action: "logout" }
//                   { action: "claim", gifts: [{ slug, key }] }  → gifts this browser made before accounts join the account
import { route, send, query, jsonBody, HttpError } from '../lib/http.js';
import { loadGift, saveGift } from '../lib/gifts.js';
import { signUp, logIn, startSession, endSession, currentUser, publicUser, addGift, forgetGift, giftSlugs } from '../lib/accounts.js';

// The account's gifts, newest first. Gifts deleted since are skipped (and forgotten).
async function giftsOf(user) {
  const gifts = await Promise.all((await giftSlugs(user.id)).map(async (slug) => {
    let g;
    try {
      g = await loadGift(slug);
    } catch (e) {
      if (e.status !== 404) throw e;
      await forgetGift(user.id, slug);
      return null;
    }
    if (g.ownerId !== user.id) return null;
    return { slug, key: g.manageKey, recipient: g.recipient, occasion: g.occasion, createdAt: g.createdAt };
  }));
  return gifts.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// The browser's own "Your gifts" list from before accounts: the manage key proves a gift is this person's,
// so a gift without an owner joins the account. Returns the slugs the browser no longer needs to keep.
async function claim(user, list) {
  const done = await Promise.all((Array.isArray(list) ? list.slice(0, 50) : []).map(async (item) => {
    const { slug, key } = item || {};
    let gift;
    try {
      gift = await loadGift(slug);
    } catch (e) {
      if (e.status === 404) return slug; // gone: nothing to keep
      throw e;
    }
    if (!key || key !== gift.manageKey) return null;
    if (!gift.ownerId) {
      gift.ownerId = user.id;
      await saveGift(gift);
      await addGift(user.id, gift.slug);
    }
    return gift.ownerId === user.id ? gift.slug : null;
  }));
  return done.filter(Boolean);
}

export default route({
  async GET(req, res) {
    const user = await currentUser(req);
    if (!user) return send(res, 200, { user: null });
    const out = { user: publicUser(user) };
    if (query(req).gifts) out.gifts = await giftsOf(user);
    send(res, 200, out);
  },

  async POST(req, res) {
    const b = await jsonBody(req);
    if (b.action === 'signup' || b.action === 'login') {
      const user = b.action === 'signup' ? await signUp(b) : await logIn(b);
      await startSession(req, res, user);
      return send(res, b.action === 'signup' ? 201 : 200, { user: publicUser(user) });
    }
    if (b.action === 'logout') {
      await endSession(req, res);
      return send(res, 200, { ok: true });
    }
    if (b.action === 'claim') {
      const user = await currentUser(req);
      if (!user) throw new HttpError(401, 'Please log in first.');
      return send(res, 200, { claimed: await claim(user, b.gifts) });
    }
    throw new HttpError(400, 'Unknown action');
  }
});
