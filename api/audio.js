// GET /api/audio?slug=…&id=…&k=…  or  …&token=…
// Streams one recording: to the logged-in recipient (k = the recipient's key + pin), to the person who recorded it (token). Never to the organizer.
import { route, query, HttpError } from '../lib/http.js';
import { loadGift, canOpen, findMessage, loadAudio } from '../lib/gifts.js';
import { currentUser } from '../lib/accounts.js';
import { sendWav } from '../lib/voices.js';

export default route({
  async GET(req, res) {
    const q = query(req);
    const gift = await loadGift(q.slug);
    const { msg } = await findMessage(gift.slug, String(q.id || ''));
    const own = q.token && q.token === msg.token;
    const user = await currentUser(req);
    if (!own && !(user && canOpen(gift, q.k, { pin: q.pin }))) throw new HttpError(403, 'Not allowed');
    if (!own && gift.ownerId && user?.id === gift.ownerId) throw new HttpError(403, 'Friends’ voices are only for the recipient');
    const buf = await loadAudio(msg);
    if (!buf) throw new HttpError(404, 'Recording not found');
    sendWav(req, res, buf);
  }
});
