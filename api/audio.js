// GET /api/audio?slug=…&id=…[&token=…]
// Streams one recording. Allowed after the gift unlocks, or before that for the person who recorded it (token).
import { route, send, query, HttpError } from '../lib/http.js';
import { loadGift, isUnlocked, findMessage, loadAudio } from '../lib/gifts.js';

export default route({
  async GET(req, res) {
    const q = query(req);
    const gift = await loadGift(q.slug);
    const { msg } = await findMessage(gift.slug, String(q.id || ''));
    const own = q.token && q.token === msg.token;
    if (!isUnlocked(gift) && !own) throw new HttpError(403, 'This gift is still locked.');
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
