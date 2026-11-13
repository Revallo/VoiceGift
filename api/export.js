// GET /api/export?key=ADMIN_KEY  → JSON Lines, one line per sent message, for the ML team.
// Disabled unless the ADMIN_KEY environment variable is set.
import { route, send, query, HttpError } from '../lib/http.js';
import { listAllGiftSlugs, loadMessages, loadThanksVoices } from '../lib/gifts.js';

export default route({
  async GET(req, res) {
    const { key } = query(req);
    if (!process.env.ADMIN_KEY) throw new HttpError(404, 'Export is disabled. Set ADMIN_KEY to enable it.');
    if (key !== process.env.ADMIN_KEY) throw new HttpError(403, 'Wrong key');
    const lines = [];
    for (const slug of await listAllGiftSlugs()) {
      // friends' messages + the recipient's thank-you voices (kind "thanks"), both corrected by the speaker
      const thanks = await loadThanksVoices(slug).catch(() => []);
      for (const m of [...await loadMessages(slug), ...thanks]) {
        if (!m.finalText || m.demo) continue; // demo voices are TTS, not training data
        lines.push(JSON.stringify({
          gift: slug,
          kind: m.kind || 'message',
          id: m.id,
          userId: m.userId, // the speaker's account, when they recorded while logged in (left out otherwise)
          audio: m.audioPath,
          durationSec: m.durationSec,
          asrProvider: m.asrProvider,
          asrText: m.asrText,
          finalText: m.finalText,
          edited: m.edited,
          corrections: m.corrections || [],
          mood: m.mood || 'normal', // a playback effect only: the audio file is the clean recording
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
