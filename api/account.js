// GET  /api/account               → { user: { name, email } | null, googleClientId, devLogin }: who is logged in on this browser
// GET  /api/account?gifts=1       → also the gifts they made, each with its dashboard key + ASR stats
// GET  /api/account?thanks=1      → also the thank-you notes this account received
// POST /api/account { action: "google", credential }             → "Continue with Google" (an ID token): logged in for 30 days
//                                                                   (HttpOnly cookie), the account made if new
//                   { action: "dev-login", email, name }         → the same without Google: only locally with DEV_LOGIN=1 (tests)
//                   { action: "logout" }
//                   { action: "claim", gifts: [{ slug, key }] }  → gifts this browser made before accounts join the account
//                   { action: "thanks-read" }                    → the thank-you notes on the home page have been seen
import { route, send, query, jsonBody, HttpError } from '../lib/http.js';
import { loadGift, saveGift, loadMessages } from '../lib/gifts.js';
import { startSession, endSession, currentUser, requireUser, publicUser, updateProfile, addGift, forgetGift, giftSlugs, listThanks, markThanksRead, googleSignIn } from '../lib/accounts.js';
import { googleClientId, verifyGoogleToken, devLogin, devProfile } from '../lib/google.js';

// The account's gifts, newest first. Gifts deleted since are skipped (and forgotten).
async function giftsAndStatsOf(user) {
  let totalRecordings = 0;
  let captionsImproved = 0;
  let wordsCorrected = 0;
  let totalAudioSec = 0;

  const gifts = await Promise.all((await giftSlugs(user.id)).map(async (slug) => {
    let g;
    try {
      g = await loadGift(slug);
    } catch (e) {
      if (e.status !== 404) throw e;
      await forgetGift(user.id, slug);
      return null;
    }
    if (g.ownerId !== user.id) return null;
    const msgs = await loadMessages(slug).catch(() => []);
    const sent = msgs.filter((m) => m.finalText);
    const real = sent.filter((m) => !m.demo);
    const edited = real.filter((m) => m.edited);
    for (const m of real) {
      totalRecordings++;
      totalAudioSec += Number(m.durationSec) || 0;
      if (m.edited) {
        captionsImproved++;
        wordsCorrected += Array.isArray(m.corrections) && m.corrections.length ? m.corrections.length : 1;
      }
    }
    return {
      slug,
      key: g.manageKey,
      recipient: g.recipient,
      occasion: g.occasion,
      createdAt: g.createdAt,
      count: sent.length,
      editedCount: edited.length
    };
  }));
  const sorted = gifts.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    gifts: sorted,
    stats: {
      totalGifts: sorted.length,
      totalRecordings,
      captionsImproved,
      wordsCorrected,
      totalAudioSec: +totalAudioSec.toFixed(1),
      joinedAt: user.createdAt
    }
  };
}

// The browser's own "Your gifts" list from before accounts: the manage key proves a gift is this person's,
// so a gift without an owner joins the account. Returns the slugs the browser no longer needs to keep.
async function claim(user, list) {
  const done = await Promise.all((Array.isArray(list) ? list.slice(0, 50) : []).map(async (item) => {
    const { slug, key } = item || {};
    let gift;
    try {
      gift = await loadGift(slug);
    } catch (e) {
      if (e.status === 404) return slug; // gone: nothing to keep
      throw e;
    }
    if (!key || key !== gift.manageKey) return null;
    if (!gift.ownerId) {
      gift.ownerId = user.id;
      await saveGift(gift);
      await addGift(user.id, gift.slug);
    }
    return gift.ownerId === user.id ? gift.slug : null;
  }));
  return done.filter(Boolean);
}

export default route({
  async GET(req, res) {
    const user = await currentUser(req);
    if (!user) return send(res, 200, { user: null, googleClientId, devLogin });
    const q = query(req);
    if (q.export === '1') {
      const lines = [];
      for (const slug of await giftSlugs(user.id)) {
        const msgs = await loadMessages(slug).catch(() => []);
        for (const m of msgs) {
          if (!m.finalText || m.demo) continue;
          lines.push(JSON.stringify({
            gift: slug,
            id: m.id,
            sender: m.sender,
            durationSec: m.durationSec,
            speechStartSec: m.speechStartSec || 0,
            speechEndSec: m.speechEndSec || m.durationSec,
            asrProvider: m.asrProvider,
            asrText: m.asrText,
            finalText: m.finalText,
            edited: m.edited,
            corrections: m.corrections || [],
            consentVersion: m.consentVersion,
            createdAt: m.createdAt
          }));
        }
      }
      return send(res, 200, lines.join('\n') + (lines.length ? '\n' : ''), {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Content-Disposition': 'attachment; filename="voice-gift-asr-corpus.jsonl"',
        'Cache-Control': 'no-store'
      });
    }
    const out = { user: publicUser(user), googleClientId, devLogin };
    if (q.gifts) Object.assign(out, await giftsAndStatsOf(user));
    if (q.thanks) out.thanks = (await listThanks(user.id)).map(({ path, ...note }) => note);
    send(res, 200, out);
  },

  async PATCH(req, res) {
    const user = await currentUser(req);
    if (!user) throw new HttpError(401, 'Please log in first.');
    const b = await jsonBody(req);
    const updated = await updateProfile(user, b);
    send(res, 200, { user: publicUser(updated) });
  },

  async POST(req, res) {
    const b = await jsonBody(req);
    if (b.action === 'google' || b.action === 'dev-login') {
      const profile = b.action === 'google' ? await verifyGoogleToken(b.credential) : devProfile(b);
      const user = await googleSignIn(profile);
      await startSession(req, res, user);
      return send(res, 200, { user: publicUser(user) });
    }
    if (b.action === 'logout') {
      await endSession(req, res);
      return send(res, 200, { ok: true });
    }
    if (b.action === 'claim') {
      const user = await requireUser(req);
      return send(res, 200, { claimed: await claim(user, b.gifts) });
    }
    if (b.action === 'thanks-read') {
      const user = await currentUser(req);
      if (!user) throw new HttpError(401, 'Please log in first.');
      await markThanksRead(user.id);
      return send(res, 200, { ok: true });
    }
    throw new HttpError(400, 'Unknown action');
  }
});
