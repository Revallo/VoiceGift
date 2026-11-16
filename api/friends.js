// Friends: made by opening someone's friend link (/u/<code>), always mutual. No search, no phone numbers.
// GET  /api/friends            → { friends: [{ id, name }], code }: my friends and my own link code
// GET  /api/friends?code=…     → { name, mine, already }: whose link this is (their name only)
// POST /api/friends { action: "add", code }   → we are friends now (both sides)
//                   { action: "remove", id }  → not any more (both sides)
import { route, send, query, jsonBody, HttpError } from '../lib/http.js';
import { requireUser, inviteCodeOf, userByInvite, listFriends, addFriends, removeFriend } from '../lib/accounts.js';

const byCode = async (code) => {
  const other = await userByInvite(code);
  if (!other) throw new HttpError(404, 'This friend link doesn’t exist. Ask your friend to send it again.');
  return other;
};

export default route({
  async GET(req, res) {
    const user = await requireUser(req);
    const { code } = query(req);
    const friends = await listFriends(user.id);
    if (code) {
      const other = await byCode(code);
      return send(res, 200, { name: other.name, mine: other.id === user.id, already: friends.some((f) => f.id === other.id) });
    }
    send(res, 200, { friends: friends.map(({ id, name }) => ({ id, name })), code: await inviteCodeOf(user) });
  },

  async POST(req, res) {
    const user = await requireUser(req);
    const b = await jsonBody(req);
    if (b.action === 'add') {
      const other = await byCode(b.code);
      await addFriends(user, other);
      return send(res, 200, { name: other.name });
    }
    if (b.action === 'remove') {
      await removeFriend(user.id, b.id);
      return send(res, 200, { ok: true });
    }
    throw new HttpError(400, 'Unknown action');
  }
});
