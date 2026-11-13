# AI must read: why this app exists

Read this before changing anything. It explains the real goal behind Voice Gift.

## The goal in one line
Voice Gift collects **Indonesian speech + the text a native speaker corrected**, so Taiwan Mobile's AI team
can train its Indonesian speech-to-text (ASR / STT) model. Today that model is only about 70% accurate.

## How the app gets that data
1. A friend records a short voice message in Indonesian for someone's birthday, graduation or wedding.
2. The app runs ASR on the recording and shows the text it heard (`asrText`).
3. The friend fixes the mistakes, because the recipient will see these words as the caption under their voice.
4. The fixed text is saved as `finalText`.

The pair **audio + `finalText`** is a labeled training example. The difference between `asrText` and
`finalText` shows exactly where the ASR is wrong.

People don't feel like they are labeling data. They are making a gift for a friend, and they fix the caption
because they want it to look right. **The UX is the product; the data is the side effect.**

## What this means when you write code
- **Never merge `asrText` and `finalText`**, and never overwrite `asrText` after the first ASR run. Both are needed.
- Keep audio as **16 kHz mono 16-bit WAV** (`public/assets/recorder.js`). It's the format the ASR model trains on,
  so don't add compression or conversion.
- The "check words" step on the friend's page is where the label is made. Keep it easy and inviting to fix words
  (show the caption as the recipient will see it). Don't hide it or make it skippable without thought.
- Every message needs the **consent checkbox** and its `consentVersion`. Without consent, the data can't be used.
- `GET /api/export` (admin key) gives the training set as JSONL: audio path, `asrText`, `finalText`, `edited`,
  consent, `userId`.
- `lib/asr.js` is the only place that talks to an ASR provider (mock, Groq Whisper, or the company API via `ASR_URL`).
- Never trade privacy for data: message audio and text open only for the logged-in recipient with the key and PIN
  (see the Rules in `CLAUDE.md`).

## What a good example looks like
- Natural, spoken Indonesian (casual greetings, slang, names, mixed Indonesian/English are all useful).
- `edited = true` with small, real fixes is the most valuable: it teaches the model its own mistakes.
- `edited = false` is still useful: it confirms the ASR got that sentence right.
