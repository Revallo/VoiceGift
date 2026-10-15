// GET /api/users?key=ADMIN_KEY  → every account (name, email, when they joined / last logged in, how many gifts), for the team.
// Disabled unless the ADMIN_KEY environment variable is set.
import { route, send, query, HttpError } from '../lib/http.js';
import { listUsers } from '../lib/accounts.js';

export default route({
  async GET(req, res) {
    const { key } = query(req);
    if (!process.env.ADMIN_KEY) throw new HttpError(404, 'The account list is disabled. Set ADMIN_KEY to enable it.');
    if (key !== process.env.ADMIN_KEY) throw new HttpError(403, 'Wrong key');
    send(res, 200, { users: await listUsers() });
  }
});
