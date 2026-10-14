// GET /api/reveal?slug=…&k=…  → the messages, for a signed-in user only:
//   - the first account that opens the recipient's link (k) claims the gift and becomes its recipient;
//     after that only that account can open it (a forwarded link is useless), with or without k
//   - the organizer may preview it without claiming it
import { route, send, query, HttpError } from '../lib/http.js';
import { loadGift, publicGift, giftAccess, claimGift, loadMessages } from '../lib/gifts.js';
import { requireUser } from '../lib/auth.js';
import { evenWords } from '../lib/asr.js';

const norm = (w) => String(w).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const CONNECT = new Set(['dan', 'and', '']);

// Where the speaker calls the recipient's name ("Dimas!", "Rina dan Bayu"), as [start, end] seconds, or null.
// The opening plays only that bit of each voice, never a random first second.
function nameAt(words, recipient) {
  const names = new Set(String(recipient).split(/[\s&,]+/).map(norm).filter((n) => n.length >= 2));
  if (!words?.length) return null;
  const i = words.findIndex((w) => names.has(norm(w.w)));
  if (i < 0) return null;
  let j = i;
  while (j + 2 < words.length && CONNECT.has(norm(words[j + 1].w)) && names.has(norm(words[j + 2].w))) j += 2;
  const start = Math.max(0, words[i].start - 0.12);
  const end = Math.min(start + 1.8, (words[j].end || words[j].start + 0.6) + 0.2);
  return end - start >= 0.3 ? [+start.toFixed(2), +end.toFixed(2)] : null;
}

export default route({
  async GET(req, res) {
    const user = await requireUser(req);
    const { slug, k } = query(req);
    const gift = await loadGift(slug);
    const role = giftAccess(gift, user, k);
    if (!role) {
      throw new HttpError(403, gift.recipientId
        ? `This gift was already opened by another account. If that wasn’t you, ask ${gift.organizer} to send it again.`
        : `This link isn’t complete. Ask ${gift.organizer} for the link to the gift.`);
    }
    if (role === 'claim') await claimGift(gift, user);

    const messages = (await loadMessages(gift.slug))
      .filter((m) => m.finalText || m.asrText) // skip recordings abandoned before the caption step
      .map((m) => {
        const text = m.finalText || m.asrText;
        const words = (m.finalWords && m.finalWords.length ? m.finalWords : null) || evenWords(text, m.durationSec);
        return {
          id: m.id,
          sender: m.sender,
          text,
          words,
          // real ASR timings first (they follow the voice); the corrected caption's timings are only spread evenly
          nameAt: (m.asrProvider !== 'mock' && nameAt(m.asrWords, gift.recipient)) || nameAt(words, gift.recipient),
          durationSec: m.durationSec
        };
      });
    send(res, 200, { gift: publicGift(gift), messages, preview: role === 'owner' });
  }
});
