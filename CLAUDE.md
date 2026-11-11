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
  The `›››` buttons are real sliders (`swipeButton()` in `common.js`); a tap works too.
- Audio: the browser records **16 kHz mono 16-bit WAV** (`public/assets/recorder.js`) — playable
  everywhere and ready for ASR, so no ffmpeg/conversion anywhere.

## Commands
- `npm run dev` → http://localhost:3000 (`dev.mjs` mimics Vercel rewrites + functions)
- End-to-end test with a fake mic: see the header of `tests/e2e.mjs`. Run it after UI changes;
  it must print `ERRORS none` (it also fails if the page can scroll sideways).

## Pages (see `vercel.json` rewrites)
| URL | File | Who |
| --- | --- | --- |
| `/` | `index.html` | home, logged in only (else `/login`): thank-you notes received, "Make a gift" → `/start`, "Open your gift" (paste the link) |
| `/start` | `start.html` | pick cake / bouquet / lanterns, then its kind (sideways strip of live minis) and flavor; page takes that occasion's colors → "Yes, make the …" → `/new?occasion=…&shape=…&flavor=…` |
| `/new` | `create.html` + `assets/create.js` | organizer: occasion/who (the gift is always drawn on top; 4-digit PIN) → decorate → (account, if logged out) → "Create" opens the gift's page `/m/…`. `?edit=slug&k=` = "Edit design" |
| `/signup`, `/login`, `/account` | `account.html` + `assets/account.js` | organizer: create an account / log in → their gifts (dashboard links), log out |
| `/g/:slug` | `record.html` + `assets/record.js` | friend (calm page, one big mic button): log in → name (filled in from the account, can be changed) + consent → record → check words (shown as the recipient will see them) → done |
| `/m/:slug?k=key` | `manage.html` + `assets/manage.js` | the gift's one page for the organizer (only with the key): the gift + Edit design, 1. invite friends (link), 2. who recorded (names, not content) + demo voices, 3. send it (recipient link + PIN, preview) |
| `/r/:slug?k=openKey` | `reveal.html` + `assets/reveal.js` | recipient: log in → 4-digit PIN (the 4th digit opens it, no button) → items light → listen → finale (blow / throw cap / release lanterns) → keepsake → thank everyone |

Designed screens to match: `design/screens/*.jpg` (Flow1–10 = full journey; Before/Midnight/Listen/Blow/Keep = reveal;
Grad* = graduation, Wed* = wedding; Decorate = cake editor).

## Occasions (themes)
- `assets/themes.js` holds every occasion's words (one object per occasion) and `createScene()`, which picks
  the scene. Pages never hard-code "candle" or "birthday": add words there.
- Scenes: `cake.js` (birthday), `bouquet.js` (graduation), `lanterns.js` (wedding), all built on `stage.js`
  (scaled stage, drawing layer, shared item states). Same API: `setCandles`, `light`, `setActive`,
  `finaleOrder`/`finaleOut`, `reset`…
- `gift.cake {flavor, shape, font, name, dots, stickers}` is reused by every scene: `font` is a key of `NAME_FONTS` in `stage.js`
  (script/serif/hand/round, loaded from Google Fonts by the stage; cake and bouquet names shrink to fit); `flavor` is a key of that scene's
  palette (cake `FLAVORS`, bouquet `WRAPS`, lantern `LIGHTS`; unknown keys fall back to the default); `shape` is a key
  of that scene's `SHAPES` (cake: classic/drip/tower/sheet, bouquet: classic/box/basket/tied, lanterns:
  classic/sky/star/heart — CSS `data-shape`), picked on `/` or in the decorate step; `setShape()` rebuilds only the body;
  `name` is the text on the cake / wrap / under the lanterns; `stickers` = `[[emoji, x, y]]` (sets in
  `themes.js` → `decorate.stickers`, layer in `stage.js`, drag/remove in `create.js`).
- "Edit design" saves with `PATCH /api/gifts` (manageKey), then back to `/m/…`. Each step is a history entry, so the
  phone's back gesture works. No bottom tab bar: the profile button sits top right.
- Wedding calls the couple by the full recipient ("Rina & Bayu"); the others use the first name.
- All UI text is English. No QR codes.

## Demo voices
`public/demo/voices.json` + `public/demo/<occasion>-01..12.wav`: 12 TTS voices per occasion (made once with
`scripts/demo-voices.py`). Dashboard → "Add 12 demo voices" (`POST /api/manage` action `add-demo`, needs the
manage key) stores them like real messages with `demo: true`; `/api/export` leaves them out.

## Accounts
- Email + password, **for everyone** (decided 2026-11-11): making a gift, recording and opening a gift all need one
  (401 without a session, enforced in `api/`). A logged-out friend or recipient goes to `/signup?next=<their link>` and comes straight back.
- `/new` sends a logged-out visitor to `/login?next=/new`; after logging in, `/login` goes to
  `next` (or `/`). The login page is deliberately simple and wears the picked occasion's colors + emoji
  (`--wash`/`--wash2` per theme in `app.css`). The demo-login button only shows with `?demo=1`. The in-place account step at "Create the gift" stays as a fallback (e.g. an expired session).
  Browser: `assets/auth.js` (`me()`, the form, the "Your gifts" row). Server: `lib/accounts.js`.
- Every new message gets the friend's `userId` (also in the export). The name is filled in from the account; the name on the
  message is still the one in the box.
- Thank-you: after the finale the recipient can "Thank everyone" once. Each friend who recorded gets a note on their home page
  (`users/<id>/thanks/<slug>.json`), marked New until seen. Friends who recorded before accounts were required have no `userId` and get none.
- Passwords: scrypt (`node:crypto`, no dependency). Sessions: a random token in an HttpOnly, SameSite=Lax cookie
  (`vg_session`, 30 days); storage keeps only its sha256. 10 wrong passwords in a row → 15 minutes' wait.
- Dashboards still open with the key alone (old gifts, co-organizers). Gifts a browser made before accounts
  (localStorage `vg-mine`) join the account when that browser logs in (`claim`, proven by the manage key).
- Not built: password reset and email verification (they need an email service).

## API (`api/*.js`)
- `POST /api/gifts` {recipient, organizer, occasion, verifyPin, cake{flavor,shape,font,name,dots,stickers}} → {slug, manageKey, openKey} (logged in only); `PATCH` same + {slug, key} → edit
- `GET /api/account` → {user} or {user: null} (`?gifts=1`: + their gifts with keys; `?thanks=1`: + their thank-you notes); `POST` actions `signup`, `login`, `logout`, `claim`, `thanks-read`
- `GET /api/gift?slug` → public gift + message count (never content)
- `POST /api/message?slug&name&consent=1` body = WAV (octet-stream), logged in only → stores, runs ASR → {id, token, asrText}
- `PATCH /api/message` {slug,id,token,text} → final caption; `DELETE` same body → "record again"
- `GET /api/reveal?slug&k=openKey&pin=1234` → messages **only for a logged-in account with the recipient's key + PIN** (server-side rule); the organizer's own account gets demo voices only (`preview: true`)
- `POST /api/reveal` {slug, k, pin, text} → the recipient's thank-you to everyone, once
- `GET /api/audio?slug&id&k=openKey&pin` logged in (or `&token` for your own recording) → WAV with Range support (iOS); the organizer (manage key): demo voices only
- `POST /api/manage` action `update-delivery` {verifyPin} → change the 4-digit PIN
- `GET|POST /api/manage` (manageKey) → dashboard data incl. openKey / `add-demo`
- `GET /api/export?key=ADMIN_KEY` → JSONL: audio path, asrText, finalText, edited, consent… (+ `userId` if the speaker was logged in)
- `GET /api/users?key=ADMIN_KEY` → every account: name, email, joined, last login, number of gifts

Storage layout: `gifts/<slug>/gift.json`, `gifts/<slug>/msg/<ts>-<id>.json`, `gifts/<slug>/audio/<id>.wav`;
accounts: `users/<id>/user.json`, `users/<id>/gifts/<slug>.json`, `users/<id>/thanks/<slug>.json`, `emails/<sha256>.json`, `sessions/<sha256>.json`.
`asrText` and `finalText` are kept separately — **the difference is the training label**. Don't merge them.

## ASR
`lib/asr.js` is the only seam. Mock by default (a plausible Indonesian greeting with typical ASR mistakes, with even word
timings). Set `GROQ_API_KEY` for Groq Whisper large-v3 (interim, free tier), or `ASR_URL` (+ `ASR_API_KEY`) for the
company API (wins over Groq; adapt `fromProvider()` to its response shape). Locally, keys go in `.env`.

## Rules
- Insert user text with `textContent`/the `h()` helper — never `innerHTML` with user data.
- Never return message audio/text without a logged-in account, the recipient's key **and** the gift's 4-digit PIN (`canOpen` in `lib/gifts.js`,
  enforced in `api/`, not just the UI). Being logged in alone never opens a gift; the manage key plays demo voices only.
  The friend's page promises "Only you and <name> can hear this voice": keep that true. No email delivery.
  Friends know the slug (`/g/<slug>`), so the slug alone must never be enough. No unlock time: the
  organizer decides when to send the link. (Old gifts without `openKey` fall back to their `unlockAt`.)
- Consent checkbox on every recording; store `consentVersion`. Accounts are email + password. No phone numbers.
- Never send `passwordHash`, session tokens or `ownerId` to a page (`publicUser`, `publicGift`).
- Mobile first: test at 390×844, and desktop (the app is a centered 440 px column).
- iOS: create the AudioContext inside the tap (see `recorder.js`, `reveal.js` `openGift`).

## Not built yet (designed)
"Save video" export; notifications; per-gift link-preview images.

## Later: moving to the company server
Keep the API contract. Replace `lib/store.js` with the company storage (same 5 functions) and set
`ASR_URL`. The frontend doesn't change.
