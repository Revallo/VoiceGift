# Voice Gift — guide for Claude Code

## What this is
A web app where friends record short voice messages for someone. The organizer sends the recipient
their link when they want the surprise to start (e.g. at 00:00 on a birthday); it opens as a scene where every voice is one item: a cake with
candles (birthday), a bouquet of flowers (graduation) or lanterns (wedding). Built for
Taiwan Mobile's AI team: every message gives **Indonesian speech + the caption the speaker
corrected** — labeled data for our Indonesian ASR (~70% accurate today). The UX is the product;
the data is the side effect. This is a **prototype**: keep it simple and readable.

**Start here:** also read `docs/HANDOFF.md` (decisions, live URL, how we work, open ideas).

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
| `/new` | `create.html` + `assets/create.js` | organizer: occasion/who → decorate → friends' link + QR + dashboard |
| `/g/:slug` | `record.html` + `assets/record.js` | friend: name + consent → record → fix caption → done |
| `/m/:slug` | `manage.html` + `assets/manage.js` | organizer dashboard (owner's account only): who recorded (not content), recipient link, who opened it, demo voices |
| `/r/:slug?k=openKey` | `reveal.html` + `assets/reveal.js` | recipient: sign in → claims the gift → items light → listen → finale (blow / throw cap / release lanterns) → keepsake |
| `/login?next=` | `login.html` + `assets/login.js` | sign in (prototype: name + email, no password), then back to `next` |
| `/me` | `me.html` + `assets/me.js` | My gifts: gifts I made, gifts for me, messages I recorded |

Designed screens to match: `design/screens/*.jpg` (Flow1–10 = full journey; Before/Midnight/Listen/Blow/Keep = reveal;
Grad* = graduation, Wed* = wedding; Decorate = cake editor).

## Occasions (themes)
- `assets/themes.js` holds every occasion's words (one object per occasion) and `createScene()`, which picks
  the scene. Pages never hard-code "candle" or "birthday": add words there.
- Scenes: `cake.js` (birthday), `bouquet.js` (graduation), `lanterns.js` (wedding), all built on `stage.js`
  (scaled stage, drawing layer, shared item states). Same API: `setCandles`, `light`, `setActive`,
  `finaleOrder`/`finaleOut`, `reset`…
- `gift.cake {flavor, name, dots, stickers}` is reused by every scene: `flavor` is a key of that scene's
  palette (cake `FLAVORS`, bouquet `WRAPS`, lantern `LIGHTS`; unknown keys fall back to the default);
  `name` is the text on the cake / wrap / under the lanterns; `stickers` = `[[emoji, x, y]]` (sets in
  `themes.js` → `decorate.stickers`, layer in `stage.js`, drag/remove in `create.js`).
- Step 3 → back → step 2 saves with `PATCH /api/gifts` (manageKey). Each step is a history entry, so the
  phone's back gesture works.
- Wedding calls the couple by the full recipient ("Rina & Bayu"); the others use the first name.
- Step 3 of `/new` stays simple: friends' link, QR, dashboard. The recipient's link is only on the dashboard.

## Demo voices
`public/demo/voices.json` + `public/demo/<occasion>-01..12.wav`: 12 TTS voices per occasion (made once with
`scripts/demo-voices.py`). Dashboard → "Add 12 demo voices" (`POST /api/manage` action `add-demo`, needs the
manage key) stores them like real messages with `demo: true`; `/api/export` leaves them out.

## API (`api/*.js`)
- `GET|POST|DELETE /api/auth` → current user / sign in {name, email} (signed cookie `vg`) / sign out; `GET /api/me` → made, received, recorded
- `POST /api/gifts` {recipient, occasion, cake{flavor,name,dots,stickers}} (organizer = account name) → {slug, manageKey, openKey}; `PATCH` same + {slug} → edit (owner only)
- `GET /api/gift?slug` → public gift + message count (never content)
- `POST /api/message?slug&name&consent=1` body = WAV (octet-stream) → stores, runs ASR → {id, token, asrText}
- `PATCH /api/message` {slug,id,token,text} → final caption; `DELETE` same body → "record again"
- `GET /api/reveal?slug&k=openKey` → messages. The first account that opens it with the key **claims** it (`recipientId`); afterwards only that account (no key needed). The owner can preview without claiming. Each message has `nameAt` = [start, end] where the recipient's name is said (the opening plays only that bit).
- `GET /api/audio?slug&id&k=openKey` → WAV with Range support (iOS), for the recipient, the owner, or whoever recorded it
- `GET|POST /api/manage` (owner's account; old gifts: manageKey) → dashboard data incl. openKey + `opened` / `add-demo`, `delete`, `delete-gift`, `unclaim` (new recipient link)
- `GET /api/export?key=ADMIN_KEY` → JSONL: audio path, asrText, finalText, edited, consent…

Storage layout: `gifts/<slug>/gift.json`, `gifts/<slug>/msg/<ts>-<id>.json`, `gifts/<slug>/audio/<id>.wav`;
accounts in `users/<id>/user.json` + `users/<id>/{made,got,sent}/…json` (`lib/auth.js`, id = hash of the email).
`asrText` and `finalText` are kept separately — **the difference is the training label**. Don't merge them.

## ASR
`lib/asr.js` is the only seam. Mock by default (returns the occasion's greeting, e.g. "Selamat ulang tahun, <name>!", with even word
timings). Set `GROQ_API_KEY` for Groq Whisper large-v3 (interim, free tier), or `ASR_URL` (+ `ASR_API_KEY`) for the
company API (wins over Groq; adapt `fromProvider()` to its response shape). Locally, keys go in `.env`.

## Rules
- Insert user text with `textContent`/the `h()` helper — never `innerHTML` with user data.
- Everyone signs in (organizer, friends, recipient). Never return message audio/text except to the recipient's
  account, the owner or the speaker (enforced in `api/`, not just the UI).
  Friends know the slug (`/g/<slug>`), so the slug alone must never be enough. No unlock time: the
  organizer decides when to send the link. (Old gifts without `openKey` fall back to their `unlockAt`.)
- Consent checkbox on every recording; store `consentVersion` and `userId`. Accounts are name + email only (prototype,
  no password); `SESSION_SECRET` signs the cookie (set it on Vercel).
- Mobile first: test at 390×844, and desktop (the app is a centered 440 px column).
- iOS: create the AudioContext inside the tap (see `recorder.js`, `reveal.js` `openGift`).

## Not built yet (designed)
"Save video" export; thank-you reply to everyone; notifications; per-gift link-preview images.

## Later: moving to the company server
Keep the API contract. Replace `lib/store.js` with the company storage (same 5 functions) and set
`ASR_URL`. The frontend doesn't change.
