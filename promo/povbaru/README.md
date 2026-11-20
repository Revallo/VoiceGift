# Promo video "povbaru": the tumpeng POV reel

The same reel as `promo/` (pov-2, the cake), but the gift is a **tumpeng**: every friend brings one side dish
(satay, ketupat, lontong, fried chicken…), and the finale is **cutting the top of the tumpeng** instead of blowing out candles.
This answers the request for local, Indonesian elements in both the product and the video. ~32 s, 1080×1920, 30 fps, -14 LUFS, no caption (like pov-2).
Out: `promo/out/povbaru.mp4` (+ `povbaru.jpg`, one frame: Mama's voice). `pov-1/2/3` are untouched.

- The same 12 voices as the cake video (`promo/voices.json`, `promo/build/voices/`, read only). Bayu (satay) and Mama
  (fried chicken, Helium mood) are the two that get tapped and heard.
- The tumpeng: turmeric rice, egg ribbons, a chili on top, bamboo tray, starry-night backdrop (`record.mjs`).
- Notification "Sari: buka ini 🎉"; closing card "Tumpeng ulang tahun dari suara teman-temanmu 🥳" over the live
  "What do you want to make?" page with Tumpeng picked.
- Sounds made here as in `promo/compose.py`; the blow/breath is replaced by a slice, a soft lift and a light pop per dish.

## Make it again

```powershell
$env:DEV_LOGIN=1; $env:PORT=3017; node --env-file-if-exists=.env dev.mjs   # 1. in another terminal
$env:BASE="http://localhost:3017"; node promo/povbaru/record.mjs           # 2. makes the gift, records the recipient's screen
node promo/povbaru/overlays.mjs                                            # 3. text layers → promo/povbaru/build/overlays/
py promo/povbaru/compose.py                                                # 4. soundtrack + edit → promo/out/povbaru.mp4
```

Needs the voices from `promo/make-voices.py` first (already in `promo/build/voices/`).
