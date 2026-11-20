// GET /api/users?key=ADMIN_KEY  → every account (name, email, when they joined / last logged in, how many gifts), for the team.
// Disabled unless the ADMIN_KEY environment variable is set.
import { route, send, requireAdmin } from '../lib/http.js';
import { listUsers } from '../lib/accounts.js';

export default route({
  async GET(req, res) {
    requireAdmin(req, 'The account list');
    send(res, 200, { users: await listUsers() });
  }
});
