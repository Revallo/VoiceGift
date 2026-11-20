# Promo video: "POV" birthday reel (TikTok/Reels)

~28 s, 1080×1920, 30 fps, -14 LUFS. Three versions, the same video with a different caption at the top (until the closing card):
`promo/out/pov-1.mp4`, `pov-2.mp4` (no caption), `pov-3.mp4` (+ one `.jpg` frame of each). The captions are `CAPTIONS` in `overlays.mjs`.

All sound is made here: TTS voices (edge-tts), and bells, the chat "ting", breath and an original music-box waltz
synthesised with numpy in `compose.py`. No music or sound effects from anywhere else. Mama's voice uses the app's
Helium mood (less obviously TTS): the effect is rendered offline with the app's own `playVoice()` (`voicefx.js`).
No subtitles: the app's own card shows the words as they are spoken.

The cake: chocolate, three tiers, no topper (candles only), starry-night backdrop, sprinkles, stickers, and every friend's own candle (stick, flame colour,
flame shape) — set in `record.mjs`. Everything plays at real speed; only the waits between steps are cut.

| 0–4.5 s | black lock screen, 23:59 → 00:00, the chat notification "Sari: buka ini 🎂" + ting, tapped |
| 4.5–~12 s | the recipient page: open, 12 candles light (a rising bell each), "Happy birthday, Dimas." |
| ~12–20 s | Bayu's candle tapped, his voice; then Mama's, with Helium (balloons on the cake) |
| ~20–24 s | hold to blow, the candles go out, confetti |
| last 3.6 s | closing card: the home page (bouquet, cake, lanterns) live in a phone, "Link di bio 👆" |

Text stays out of the bottom 15% and the right 15% (TikTok's buttons).

## Make it again

```powershell
uv run --with edge-tts promo/make-voices.py            # 1. the 12 voices → promo/build/voices/
$env:DEV_LOGIN=1; $env:PORT=3017; node --env-file-if-exists=.env dev.mjs   # 2. in another terminal
$env:BASE="http://localhost:3017"; node promo/record.mjs   # 3. makes the gift, records the recipient's screen
node promo/overlays.mjs                                 # 4. text layers, phone frame, confetti → promo/build/overlays/
py promo/compose.py                                     # 5. soundtrack + edit → promo/out/
```

- `voices.json`: who says what (`text` = subtitle, `say` = what the TTS speaks, with fewer pauses), and `heard`: which
  candles get tapped and heard, in order (the last one is Mama).
- `record.mjs` writes `promo/build/timeline.json`: when each frame was captured, each candle lit, each voice started,
  each tap, the blow and the confetti. `compose.py` cuts and syncs everything from it, so a new recording needs no hand edits.
- The screen comes from Chromium's screencast (CDP) with `--force-device-scale-factor=3`, not Playwright's `recordVideo`:
  `recordVideo` (and the screencast without that flag) only gives CSS pixels (390×844).
- Needs ffmpeg on the PATH (Windows: `winget install Gyan.FFmpeg`), Python with numpy, and Playwright (`npm i --no-save playwright`).
