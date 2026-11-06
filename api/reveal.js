// GET /api/reveal?slug=…&k=…  → the messages, only with the recipient's key (the link the organizer sends).
// The organizer's own account gets the demo voices only (their preview): real voices are for the recipient.
import { route, send, query, HttpError } from '../lib/http.js';
import { loadGift, publicGift, canOpen, checkVerifyPin, loadMessages } from '../lib/gifts.js';
import { currentUser } from '../lib/accounts.js';
import { evenWords } from '../lib/asr.js';

export default route({
  async GET(req, res) {
    const { slug, k, pin, answer } = query(req);
    const candidatePin = pin ?? answer;
    const gift = await loadGift(slug);
    const user = await currentUser(req);
    if (candidatePin !== undefined && candidatePin !== '' && !checkVerifyPin(gift, candidatePin)) {
      throw new HttpError(403, 'Kode PIN verifikasi salah. Silakan coba lagi.');
    }
    if (!canOpen(gift, k, { user, pin: candidatePin })) {
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
      messages,
      loggedIn: Boolean(user),
      userEmail: user?.email || null,
      verifiedByPin: Boolean(candidatePin && checkVerifyPin(gift, candidatePin))
    });
  }
});
