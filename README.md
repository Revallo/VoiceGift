# Voice Gift

Friends record secret voice messages. At midnight, each one lights a candle.

A web app (no install) for group voice gifts, built as a prototype for collecting real Indonesian
speech with captions the speakers corrected themselves. Works on phones and desktop.

**Flow**
1. The organizer creates a gift at `/new`: who it's for, when it opens, decorates the cake.
2. Friends open `/g/<gift>` from WhatsApp, record up to 15 s, fix the caption, send.
3. The recipient opens `/r/<gift>`. It shows a countdown until the unlock time, then the candles
   light up one voice at a time, they tap candles to listen, blow them out, and keep the page.
4. The organizer follows progress at `/m/<gift>?k=<key>` (and can open it early for demos).

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
4. Open `https://<your-project>.vercel.app`, create a gift, and pick **“In 2 minutes (demo)”**.

Optional environment variables (*Settings → Environment Variables*, then redeploy):

| Variable | What it does |
| --- | --- |
| `ADMIN_KEY` | Enables `GET /api/export?key=…`, a JSONL file of every message for the ML team |
| `ASR_URL`, `ASR_API_KEY` | Use the real speech recognition API instead of the mock (see `lib/asr.js`) |

## Good to know
- **Recordings are private.** The Blob store is private; audio is only served through `/api/audio`,
  and only after the gift opens (or to the person who recorded it).
- **Test data only for now.** Until this moves to the company's servers, use it with the team and friends.
- **Vercel Hobby** is meant for personal, non-commercial projects. For a company pilot, use a
  Pro/Team plan or move it to the company server (see `CLAUDE.md`).
- Graduation and wedding themes, video export and thank-you replies are designed but not built yet.

## Project layout
```
api/            serverless functions (one file per endpoint)
lib/            storage (Vercel Blob / local folder), ASR seam, gift model, HTTP helpers
public/         the website: plain HTML + ES modules, no build step
  assets/cake.js      the cake + candles (shared by every page)
  assets/recorder.js  records 16 kHz mono WAV in the browser
design/screens/ the designed screens this app is built from
tests/e2e.mjs   end-to-end test with a fake microphone
dev.mjs         local server that mimics Vercel
```
