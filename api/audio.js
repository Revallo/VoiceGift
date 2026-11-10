// GET /api/audio?slug=…&id=…&k=…  or  …&token=…
// Streams one recording: to the recipient (k = the recipient's key + pin), to the person who recorded it (token),
// or, for demo voices only, to the organizer (k = the manage key).
import { route, send, query, HttpError } from '../lib/http.js';
import { loadGift, canOpen, findMessage, loadAudio } from '../lib/gifts.js';
import { currentUser } from '../lib/accounts.js';

export default route({
  async GET(req, res) {
    const q = query(req);
    const gift = await loadGift(q.slug);
    const { msg } = await findMessage(gift.slug, String(q.id || ''));
    const own = q.token && q.token === msg.token;
    const organizerDemo = q.k && q.k === gift.manageKey && msg.demo; // friends' voices are not for the organizer
    if (!own && !organizerDemo && !canOpen(gift, q.k, { pin: q.pin })) throw new HttpError(403, 'Not allowed');
    if (!own && !msg.demo && gift.ownerId && (await currentUser(req))?.id === gift.ownerId) throw new HttpError(403, 'Friends’ voices are only for the recipient'); // the organizer's preview
    const buf = await loadAudio(msg);
    if (!buf) throw new HttpError(404, 'Recording not found');

    const headers = { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600' };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range) {
      // iOS Safari asks for byte ranges before playing audio.
      let start = range[1] === '' ? buf.length - Number(range[2]) : Number(range[1]);
      let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : buf.length - 1;
      start = Math.max(0, start);
      end = Math.min(buf.length - 1, end);
      if (start > end) return send(res, 416, null, { 'Content-Range': `bytes */${buf.length}` });
      return send(res, 206, buf.subarray(start, end + 1), { ...headers, 'Content-Range': `bytes ${start}-${end}/${buf.length}`, 'Content-Length': String(end - start + 1) });
    }
    send(res, 200, buf, { ...headers, 'Content-Length': String(buf.length) });
  }
});
