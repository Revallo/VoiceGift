# Handoff — context from the planning chat

Read this together with `CLAUDE.md`. It carries over what was decided in the earlier chat with
Claude (claude.ai), so a new session can continue without re-asking.

## Who and why
- Revallo, intern on Taiwan Mobile's AI team (Indonesian ASR, ~70% accurate today).
  Prefers casual Indonesian, short practical answers, and a clear recommendation over a list of options.
- Voice Gift is a pitch to his manager. The app must make the **user experience** convincing;
  the labeled ASR data (speech + caption the speaker corrected) is the side effect.

## Answers to the manager's objections (keep these true in the product)
- **"Why download an app?"** → It's a web link. Nothing to install, opens from WhatsApp.
- **"Why not just send a voice note?"** → Voice notes arrive scattered, early, one by one.
  Here everyone's voice is collected in secret and opens **together at one moment** (e.g. 00:00 on
  the birthday) as a cake where each voice is a candle: one shared surprise, and a keepsake page.
- Keep it simple. No feature that doesn't serve the surprise or the keepsake.

## Design source
- Canvas with every screen: https://claude.ai/artifact/Ue7LQ6PB7TyHAFbsVNX3Xo
  (rows: Flow1–10 full journey, Decorate, Birthday reveal, Graduation, Wedding).
  Exported images are in `design/screens/`.
- Pitch deck lives outside the repo (Voice_Gift_v4.pptx, 11 slides).

## Deployment (done)
- GitHub: `Revallo/VoiceGift`, branch `main`. Every push to `main` auto-deploys on Vercel (~1 min).
- Live: **https://voicegift-one.vercel.app** (production domain — share this one, not the
  per-deployment URLs, which require a Vercel login).
- Vercel Blob store `voicegift` (Private) is connected; `BLOB_STORE_ID` is set.
- Not set yet: `ADMIN_KEY` (export + account list), `ASR_URL`/`ASR_API_KEY` (company ASR). Interim ASR: set `GROQ_API_KEY`
  (Groq Whisper large-v3); without it ASR is the mock. Each message stores `asrProvider`.

## How we work
- Local: `npm run dev` → http://localhost:3000 (Windows, PowerShell, VS Code). Keep that terminal
  for the server; run Claude in a second terminal. Local data is in `.data/`, separate from Vercel.
- Revallo also asks the claude.ai chat to make changes; it pushes to `main`.
  **Pull before editing** so changes don't collide.
- A friend may join as a GitHub collaborator: work on branches + pull requests; Vercel makes a
  preview link per branch.
- After UI changes, run the e2e test (see `tests/e2e.mjs`), it must print `ERRORS none`.

## Status
- Working end to end for all three occasions: create → decorate → friends record + fix caption →
  dashboard → recipient link → items light → listen → finale → keepsake. Tested in Chromium (fake mic), mobile + desktop.
- Birthday = cake/candles/blow; Graduation = bouquet/flowers/throw your cap; Wedding = lanterns/release
  (QR card to print for the guestbook table).
- Decision (2026-10-02): **no unlock time at all** (no date picker, no countdown, no reminders). The gift
  opens when the organizer sends the recipient their link (e.g. at 00:00). That link carries its own key
  (`/r/<slug>?k=…`) so friends, who know the slug, can't listen early. It's only on the dashboard.
- The dashboard is only reachable with the secret key in its link (`/m/<slug>?k=…`), given to the
  creator at step 3 and listed on their account page (`/account`, any phone).
- Decision (2026-10-09): **accounts** (email + password), only for organizers, so we know who is who. Making a
  gift needs one: step 2's "Create the gift" asks (sign up or log in) when logged out. Friends and the recipient
  never sign up; a friend who happens to be logged in gets `userId` on their message. Gifts a browser made
  before accounts join the account when it logs in. Team list: `/api/users?key=ADMIN_KEY`.
  Not built yet: password reset / email verification (needs an email service).
- Decision (2026-10-14, kept when `main` and `accounts` were merged 2026-11-05): the opening plays **no voices**,
  each item lights with a chime and the friend's name. Voices play when the recipient taps an item or "Play all".
  Only the recipient hears friends' voices: the organizer's preview and dashboard play demo voices only.
- Merge 2026-11-05: `main`'s "accounts for everyone" (name + email, recipient claims the link) clashed with this
  branch's organizer-only email + password; the organizer-only system was kept for now. Not settled with the manager.
  Limit: the recipient's link still works for anyone who has it, including a logged-out organizer. Accounts and
  claims made under the old system don't carry over.
- Decision (2026-11-11): **everyone logs in**. Friends log in to record (name filled in from the account, can be changed); the recipient follows
  link → log in → PIN. This replaces the organizer-only rule above. `/` is now a logged-in home (make a gift / open your gift / thank-you notes); the picker
  moved to `/start`. The look is one deep colour per occasion + one gold accent + Fraunces headings. The recipient can thank everyone once.
- Consent wording is demo-only for now ("I allow my voice to be saved for this gift", `consentVersion`
  `demo-2026-10`). It doesn't mention ASR training: change it (and the version) before collecting real data.
- For the manager demo: dashboard → "Add 12 demo voices" (TTS, marked `demo`, not exported), then "Preview their page".
- Not yet tested on real iPhone/Android microphones.

## Ideas offered, not started (ask Revallo before building)
- Indonesian UI language (target users are Indonesian).
- A simple admin page showing recordings + ASR text vs corrected text (to show the data value).
- "Save video" export.
