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
- Not set yet: `ADMIN_KEY` (export), `ASR_URL`/`ASR_API_KEY` (ASR is still the mock).

## How we work
- Local: `npm run dev` → http://localhost:3000 (Windows, PowerShell, VS Code). Keep that terminal
  for the server; run Claude in a second terminal. Local data is in `.data/`, separate from Vercel.
- Revallo also asks the claude.ai chat to make changes; it pushes to `main`.
  **Pull before editing** so changes don't collide.
- A friend may join as a GitHub collaborator: work on branches + pull requests; Vercel makes a
  preview link per branch.
- After UI changes, run the e2e test (see `tests/e2e.mjs`), it must print `ERRORS none`.

## Status
- Working end to end: create → decorate → friends record + fix caption → dashboard →
  countdown → candles light → listen → blow → keepsake. Tested in Chromium (fake mic), mobile + desktop.
- Not yet tested on real iPhone/Android microphones.

## Ideas offered, not started (ask Revallo before building)
- Indonesian UI language (target users are Indonesian).
- Graduation and Wedding themes (designed in the canvas).
- Thank-you reply from the recipient to everyone.
- A simple admin page showing recordings + ASR text vs corrected text (to show the data value).
- "Save video" export.
