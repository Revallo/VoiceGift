// GET /api/reveal?slug=…&k=…&pin=…  → the messages, only with the recipient's key (the link the organizer sends)
// and the gift's 4-digit PIN. Logging in never opens a gift: the voices are for the recipient only.
import { route, send, query, HttpError } from '../lib/http.js';
import { loadGift, publicGift, canOpen, checkVerifyPin, loadMessages } from '../lib/gifts.js';
import { evenWords } from '../lib/asr.js';

export default route({
  async GET(req, res) {
    const { slug, k, pin } = query(req);
    const gift = await loadGift(slug);
    if (k && k === gift.openKey && pin && !checkVerifyPin(gift, pin)) {
      throw new HttpError(403, 'Kode PIN salah. Coba lagi.');
    }
    if (!canOpen(gift, k, { pin })) {
      throw new HttpError(403, `This link isn’t complete. Ask ${gift.organizer} for the link or PIN to the gift.`);
    }
    const messages = (await loadMessages(gift.slug))
      .filter((m) => m.finalText || m.asrText) // skip recordings abandoned before the caption step
      .map((m) => {
        const text = m.finalText || m.asrText;
        return {
          id: m.id,
          sender: m.sender,
          text,
          words: (m.finalWords && m.finalWords.length ? m.finalWords : null) || evenWords(text, m.durationSec),
          durationSec: m.durationSec
        };
      });
    send(res, 200, {
      gift: publicGift(gift),
      messages
    });
  }
});
