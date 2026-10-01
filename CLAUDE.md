# Voice Gift — guide for Claude Code

## What this is
A web app where friends record short voice messages for someone. The gift stays locked until a set
time (e.g. 00:00 on a birthday), then opens as a cake where every voice is one candle. Built for
Taiwan Mobile's AI team: every message gives **Indonesian speech + the caption the speaker
corrected** — labeled data for our Indonesian ASR (~70% accurate today). The UX is the product;
the data is the side effect. This is a **prototype**: keep it simple and readable.

## Stack (prototype)
- Vercel: static files in `public/`, serverless functions in `api/` (Node 22, ESM, no framework).
- Storage: **Vercel Blob, private store**. Locally a `.data/` folder with the same interface (`lib/store.js`).
- Frontend: plain HTML + ES modules, **no build step, no framework**. Fonts: Fraunces + Plus Jakarta Sans.
- Audio: the browser records **16 kHz mono 16-bit WAV** (`public/assets/recorder.js`) — playable
  everywhere and ready for ASR, so no ffmpeg/conversion anywhere.

## Commands
- `npm run dev` → http://localhost:3000 (`dev.mjs` mimics Vercel rewrites + functions)
- End-to-end test with a fake mic: see the header of `tests/e2e.mjs`. Run it after UI changes;
  it must print `ERRORS none` (it also fails if the page can scroll sideways).

## Pages (see `vercel.json` rewrites)
| URL | File | Who |
| --- | --- | --- |
| `/` | `index.html` | landing |
| `/new` | `create.html` + `assets/create.js` | organizer: who/when → decorate cake → share links + QR |
| `/g/:slug` | `record.html` + `assets/record.js` | friend: name + consent → record → fix caption → done |
| `/m/:slug?k=key` | `manage.html` + `assets/manage.js` | organizer dashboard: who recorded (not content), "open now" |
| `/r/:slug` | `reveal.html` + `assets/reveal.js` | recipient: countdown → candles light → listen → blow → keepsake |

Designed screens to match: `design/screens/*.jpg` (Flow1–10 = full journey; Before/Midnight/Listen/Blow/Keep = reveal;
Grad*/Wed* = future themes; Decorate = cake editor).

## API (`api/*.js`)
- `POST /api/gifts` {recipient, organizer, occasion, unlockAt, cake{flavor,name,dots}} → {slug, manageKey}
- `GET /api/gift?slug` → public gift + message count (never content)
- `POST /api/message?slug&name&consent=1` body = WAV (octet-stream) → stores, runs ASR → {id, token, asrText}
- `PATCH /api/message` {slug,id,token,text} → final caption; `DELETE` same body → "record again"
- `GET /api/reveal?slug` → messages **only after unlockAt** (server-side rule)
- `GET /api/audio?slug&id[&token]` → WAV with Range support (iOS); after unlock, or own recording via token
- `GET|POST /api/manage` (manageKey) → dashboard data / `unlock-now`
- `GET /api/export?key=ADMIN_KEY` → JSONL: audio path, asrText, finalText, edited, consent…

Storage layout: `gifts/<slug>/gift.json`, `gifts/<slug>/msg/<ts>-<id>.json`, `gifts/<slug>/audio/<id>.wav`.
`asrText` and `finalText` are kept separately — **the difference is the training label**. Don't merge them.

## ASR
`lib/asr.js` is the only seam. Mock by default (returns "Selamat ulang tahun, <name>!" with even word
timings). Set `ASR_URL` (+ `ASR_API_KEY`) to call the company API; adapt `fromProvider()` to its response shape.

## Rules
- Insert user text with `textContent`/the `h()` helper — never `innerHTML` with user data.
- Never return message audio/text before unlock (enforced in `api/`, not just the UI).
- Consent checkbox on every recording; store `consentVersion`. No accounts, no phone numbers.
- Mobile first: test at 390×844, and desktop (the app is a centered 440 px column).
- iOS: create the AudioContext inside the tap (see `recorder.js`, `reveal.js` `openGift`).

## Not built yet (designed)
Graduation (bouquet, throw cap) and wedding (lanterns, QR guestbook, opens next morning) themes;
"Save video" export; thank-you reply to everyone; notifications; per-gift link-preview images.

## Later: moving to the company server
Keep the API contract. Replace `lib/store.js` with the company storage (same 5 functions) and set
`ASR_URL`. The frontend doesn't change.
