// Following other accounts. Logged in only. Other people are only ever returned as { handle, name, bio }.
// GET  /api/follow                 → { me, following: [profile], suggestions: [profile] }
// GET  /api/follow?find=<email>    → { profile, following, self }: the account with exactly that email (404 if none)
// GET  /api/follow?handle=<handle> → { profile, following, self }: for a profile link (/u/<handle>)
// POST /api/follow { action: "follow" | "unfollow", handle } → { ok, following: [profile] }
import { route, send, query, jsonBody, rateLimit, HttpError } from '../lib/http.js';
import { requireUser, publicProfile, userByHandle, userByEmail } from '../lib/accounts.js';
import { follow, unfollow, isFollowing, listFollowing, suggestions } from '../lib/follows.js';

async function shown(user, other) {
  return { profile: await publicProfile(other), following: await isFollowing(user.id, other.id), self: user.id === other.id };
}

export default route({
  async GET(req, res) {
    const user = await requireUser(req);
    const q = query(req);
    if (q.find !== undefined) {
      rateLimit(req, 'find-friend', 20); // looking up emails one by one is slow on purpose
      const other = await userByEmail(q.find);
      if (!other) throw new HttpError(404, 'Nobody here uses that email yet.');
      return send(res, 200, await shown(user, other));
    }
    if (q.handle !== undefined) {
      const other = await userByHandle(q.handle);
      if (!other) throw new HttpError(404, 'This profile doesn’t exist.');
      return send(res, 200, await shown(user, other));
    }
    const [me, following, suggested] = await Promise.all([publicProfile(user), listFollowing(user.id), suggestions(user)]);
    send(res, 200, { me, following, suggestions: suggested });
  },

  async POST(req, res) {
    const user = await requireUser(req);
    const b = await jsonBody(req);
    if (b.action !== 'follow' && b.action !== 'unfollow') throw new HttpError(400, 'Unknown action');
    const other = await userByHandle(b.handle);
    if (!other) throw new HttpError(404, 'This profile doesn’t exist.');
    await (b.action === 'follow' ? follow(user, other) : unfollow(user, other));
    send(res, 200, { ok: true, following: await listFollowing(user.id) });
  }
});
