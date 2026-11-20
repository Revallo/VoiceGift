// The team's ASR page (/admin/asr), header X-Admin-Key = ADMIN_KEY.
// GET  /api/asr                                → which ASR runs, TWM's health + our latest tasks there, and how many corrected
//                                                captions reached TWM (+ the ones that did not, to retry). Never message audio.
// POST /api/asr { action: "retry", slug, id, kind: "message"|"thanks" } → sends that caption to TWM again
import { route, send, jsonBody, requireAdmin, HttpError } from '../lib/http.js';
import { asrProvider, syncCorrection } from '../lib/asr.js';
import { twmConfigured, twmBase, twmHealth, twmRecentTasks } from '../lib/twm-asr.js';
import { listAllGiftSlugs, loadMessages, loadThanksVoices, findMessage, findThanksVoice, updateMessage, isSlug } from '../lib/gifts.js';
import { putJSON } from '../lib/store.js';

const settle = (p) => p.then((value) => ({ value }), (e) => ({ error: String(e.message || e).slice(0, 200) }));

export default route({
  async GET(req, res) {
    requireAdmin(req, 'The ASR page');
    const twm = twmConfigured();
    const [health, tasks] = await Promise.all([
      twm ? settle(twmHealth()) : null,
      twm ? settle(twmRecentTasks(15)) : null
    ]);

    // our side: every real (non-demo) caption, and whether its correction reached TWM
    const stats = { voices: 0, captioned: 0, edited: 0, twm: 0, synced: 0, failed: 0, waiting: 0 };
    const failed = [];
    for (const slug of await listAllGiftSlugs()) {
      const thanks = await loadThanksVoices(slug).catch(() => []);
      for (const m of [...await loadMessages(slug), ...thanks]) {
        if (m.demo) continue;
        stats.voices++;
        if (!m.finalText) continue;
        stats.captioned++;
        if (m.edited) stats.edited++;
        if (m.asrProvider !== 'twm' || !m.asrTaskId) continue;
        stats.twm++;
        if (m.asrSync?.ok) stats.synced++;
        else if (m.asrSync) {
          stats.failed++;
          if (failed.length < 50) failed.push({ slug, id: m.id, kind: m.kind || 'message', taskId: m.asrTaskId, at: m.asrSync.at, error: m.asrSync.error || '' });
        } else stats.waiting++;
      }
    }

    send(res, 200, {
      provider: asrProvider,
      twm: twm ? { host: new URL(twmBase()).host, model: process.env.TWM_ASR_MODEL || '', health, tasks } : null,
      stats,
      failed
    });
  },

  async POST(req, res) {
    requireAdmin(req, 'The ASR page');
    const body = await jsonBody(req);
    if (body.action !== 'retry') throw new HttpError(400, 'Unknown action');
    if (!isSlug(body.slug)) throw new HttpError(404, 'Gift not found');
    const id = String(body.id || '');
    const thanks = body.kind === 'thanks';
    const found = thanks ? await findThanksVoice(body.slug, id) : await findMessage(body.slug, id);
    const item = thanks ? found.voice : found.msg;
    if (!item.finalText) throw new HttpError(400, 'This voice has no caption yet.');
    item.asrSync = await syncCorrection({ ...item, asrSync: null }, item.finalText);
    if (thanks) await putJSON(found.path, item, { overwrite: true });
    else await updateMessage(found.path, item);
    send(res, 200, { asrSync: item.asrSync });
  }
});
