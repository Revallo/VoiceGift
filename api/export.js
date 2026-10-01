// GET /api/export?key=ADMIN_KEY  → JSON Lines, one line per sent message, for the ML team.
// Disabled unless the ADMIN_KEY environment variable is set.
import { route, send, query, HttpError } from '../lib/http.js';
import { listAllGiftSlugs, loadMessages } from '../lib/gifts.js';

export default route({
  async GET(req, res) {
    const { key } = query(req);
    if (!process.env.ADMIN_KEY) throw new HttpError(404, 'Export is disabled. Set ADMIN_KEY to enable it.');
    if (key !== process.env.ADMIN_KEY) throw new HttpError(403, 'Wrong key');
    const lines = [];
    for (const slug of await listAllGiftSlugs()) {
      for (const m of await loadMessages(slug)) {
        if (!m.finalText) continue;
        lines.push(JSON.stringify({
          gift: slug,
          id: m.id,
          audio: m.audioPath,
          durationSec: m.durationSec,
          asrProvider: m.asrProvider,
          asrText: m.asrText,
          finalText: m.finalText,
          edited: m.edited,
          consent: m.consent,
          consentVersion: m.consentVersion,
          createdAt: m.createdAt
        }));
      }
    }
    send(res, 200, lines.join('\n') + (lines.length ? '\n' : ''), {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Content-Disposition': 'attachment; filename="voice-gift-export.jsonl"',
      'Cache-Control': 'no-store'
    });
  }
});
