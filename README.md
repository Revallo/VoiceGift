rea# Voice Gift

Friends record secret voice messages. When you send the gift, each one lights a candle.

A web app (no install) for group voice gifts, built as a prototype for collecting real Indonesian
speech with captions the speakers corrected themselves. Works on phones and desktop.

**Flow**
1. The organizer creates a gift at `/new`: the occasion, who it's for, decorates the cake / bouquet / lanterns,
   then creates an account (email + password) or logs in to save it. `/account` lists their gifts on any phone.
2. Friends open `/g/<gift>` from WhatsApp, record up to 15 s, fix the caption, send.
3. The organizer follows progress at `/m/<gift>?k=<key>` and, when ready (e.g. at 00:00), sends the
   recipient their link `/r/<gift>?k=<key>` + the 4-digit PIN from there.
4. The recipient opens it: the candles light up one voice at a time, they tap candles to listen,
   blow them out, and keep the page.

## Run locally
```bash
npm install
npm run dev          # http://localhost:3000 — data is saved in .data/
```
The microphone needs `localhost` or `https`. To test on your phone over Wi-Fi, deploy to Vercel instead.

## Deploy on Vercel
1. **Import:** vercel.com → *Add New → Project* → import `revallo/VoiceGift` → *Deploy*.
   No settings to change; `vercel.json` has them.
2. **Storage:** in the project, *Storage → Create → Blob* → choose **Private** access and region
   **Singapore (sin1)** → *Connect* to this project (all environments).
3. **Redeploy:** *Deployments → ⋯ → Redeploy* so the app picks up the storage connection.
4. Open `https://<your-project>.vercel.app` and test with three accounts: organizer, friend, recipient.

Optional environment variables (*Settings → Environment Variables*, then redeploy):

| Variable | What it does |
| --- | --- |
| `ADMIN_KEY` | Enables `GET /api/export?key=…`, a JSONL file of every message for the ML team, and `GET /api/users?key=…`, the list of accounts |
| `ASR_URL`, `ASR_API_KEY` | Use the company's speech recognition API instead of the mock (see `lib/asr.js`) |
| `GROQ_API_KEY` | Use Groq Whisper large-v3 for now, until the company API is ready (`ASR_URL` wins if both are set) |

## Good to know
- **Recordings are private.** The Blob store is private; audio is only served through `/api/audio`,
  and only with the recipient's link (or to the person who recorded it).
- **Everyone has an account** (email + password): organizer, friends and recipient. Passwords are stored as
  scrypt hashes; there is no password reset yet.
- **Test data only for now.** Until this moves to the company's servers, use it with the team and friends.
- **Vercel Hobby** is meant for personal, non-commercial projects. For a company pilot, use a
  Pro/Team plan or move it to the company server (see `CLAUDE.md`).
- Three occasions: birthday (cake + candles), graduation (bouquet + throw your cap), wedding
  (lanterns + release them).
- The recipient can thank everyone once; video export is designed but not built yet.

## Project layout
```
api/            serverless functions (one file per endpoint)
lib/            storage (Vercel Blob / local folder), ASR seam, gift + account model, HTTP helpers
public/         the website: plain HTML + ES modules, no build step
  assets/themes.js    words per occasion + picks the scene
  assets/cake.js      birthday: the cake + candles
  assets/bouquet.js   graduation: the bouquet + flowers
  assets/lanterns.js  wedding: strings of lanterns
  assets/stage.js     shared scene scaffolding
  assets/recorder.js  records 16 kHz mono WAV in the browser
  assets/auth.js      accounts in the browser: who is logged in, the sign-up / log-in form
design/screens/ the designed screens this app is built from
tests/e2e.mjs   end-to-end test with a fake microphone
dev.mjs         local server that mimics Vercel
```

## Known flaws (review 2026-11-12)
Ten weak spots found in a code + screen review, most important first. Nothing here is fixed yet.

1. **Voices past the scene's limit don't show.** The server takes any number of messages, but the lanterns
   draw at most 36 and the bouquet 40 (`MAX` in `lanterns.js`, `flowerSpots` in `bouquet.js`). Voice 37/41 has no item,
   so the recipient can't tap it. Fix: a cap per gift in `api/message.js`, shown on the friend's page ("the gift is full").
2. **The 4-digit PIN can be guessed.** `/api/reveal` has no limit on wrong PINs (only 10,000 options), and a wrong PIN
   gets a different error than a wrong key, which tells the guesser the key is right. Fix: count wrong PINs per gift and lock for a while, like passwords.
3. **"The organizer can never open their own gift" only holds per account.** The organizer sees the recipient link + PIN on
   the dashboard, so a second account opens it. Hard to close fully; be honest about it in the pitch.
4. **No email verification.** Anyone can sign up with someone else's email, and then the real owner can't. Anyone who knows
   an email can also lock that account for 15 minutes with 10 wrong passwords.
5. **No password reset.** A forgotten password means the account and its gifts are gone (dashboards still open with the key link).
6. **No limits on recordings or sign-ups.** One friend can record 50 times into one gift, and a script can make many accounts.
   That costs storage and ASR quota (Groq free tier) and puts repeated, low-quality samples in the training data.
7. **The friend's page promises "Only you and <name> can hear this voice"**, but the consent says the voice is also saved for
   ASR training, so the AI team hears it too. Change the promise to match, e.g. "Only <name> opens this gift".
8. **The UI is English only**, while the speakers are Indonesian. Some friends may stop at the consent or the caption check.
9. **Storage is last-write-wins.** Two writes to the same file at once (design edited in two tabs, two thank-yous sent at the same time)
   silently overwrite each other; the "thank everyone once" check can pass twice. Rare at prototype scale.
10. **Not tested on real phones yet.** Recording is only tested with Chromium's fake microphone; iOS Safari (AudioContext,
    16 kHz resampling, the Range audio player) and Android WebViews (WhatsApp's in-app browser) are the riskiest.
