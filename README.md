# Voice Gift

Friends record secret voice messages. When you send the gift, each one lights a candle.

A web app (no install) for group voice gifts, built as a prototype for collecting real Indonesian
speech with captions the speakers corrected themselves. Works on phones and desktop.

**Flow**
1. The organizer creates a gift at `/new`: the occasion, who it's for, decorates the cake / bouquet / lanterns,
   then creates an account (email + password) or logs in to save it. `/account` lists their gifts on any phone.
2. Friends open `/g/<gift>` from WhatsApp, record up to 15 s, fix the caption, send.
3. The organizer follows progress at `/m/<gift>?k=<key>` and, when ready (e.g. at 00:00), sends the
   recipient their link `/r/<gift>?k=<key>` from there. For a demo: "Add 12 demo voices".
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
4. Open `https://<your-project>.vercel.app`, create a gift, open the dashboard, tap **Add 12 demo voices**, then **Preview their page**.

Optional environment variables (*Settings → Environment Variables*, then redeploy):

| Variable | What it does |
| --- | --- |
| `ADMIN_KEY` | Enables `GET /api/export?key=…`, a JSONL file of every message for the ML team, and `GET /api/users?key=…`, the list of accounts |
| `ASR_URL`, `ASR_API_KEY` | Use the real speech recognition API instead of the mock (see `lib/asr.js`) |

## Good to know
- **Recordings are private.** The Blob store is private; audio is only served through `/api/audio`,
  and only with the recipient's link (or to the person who recorded it).
- **Accounts are for organizers only.** Friends and the recipient never sign up. Passwords are stored as
  scrypt hashes; there is no password reset yet.
- **Test data only for now.** Until this moves to the company's servers, use it with the team and friends.
- **Vercel Hobby** is meant for personal, non-commercial projects. For a company pilot, use a
  Pro/Team plan or move it to the company server (see `CLAUDE.md`).
- Three occasions: birthday (cake + candles), graduation (bouquet + throw your cap), wedding
  (lanterns + release them, printable QR card for the guestbook table).
- Video export and thank-you replies are designed but not built yet.

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
