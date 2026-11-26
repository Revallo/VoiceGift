# Ide: every idea we've talked about

Short list so nothing gets forgotten. ✅ = built, ⏳ = not yet. 🎯 = also brings better ASR data (see `AImustRead.md`).
Add new ideas here, one line each.

## Built
- ✅ **Soft redesign** (2026-11-26): light pastel look, Montserrat in capitals, black pills, cute two-tone icons, no card boxes; `/new` in one screen (kind carousel, occasion tiles, slide to create) + Customize as its own page with icon tabs; organizer page = three actions in sheets; bottom nav on home and account; twist pickers as round tiles in two tabs.
- ✅ **Ketupat, Imlek, wrap motifs** (2026-11-26): wedding kind `ketupat` (woven ketupat instead of lanterns, a Ramadan feel), wedding kind `imlek` (red-gold angpao tree, dragon / scale / cloud envelopes, dragon backdrop), each country's motif printed on the bouquet's wrapping paper.
- ⏳ Delete the old CSS layers under `soft.css` (Candlelit, quiet look, dead classes in `app.css`) once every page is checked.
- ✅ **Calmer gift scenes** (2026-11-19): show up to six spaced candles per group, with Previous/Next and automatic group selection when a voice plays; every voice keeps its own candle. Restored the caption heading above the gift. Default graduation wrap has soft curved tissue folds; lantern rows fill evenly (8 = 4 + 4, 20 = 7 + 7 + 6).
- ✅ 🎯 **Gift, words, personalization in one open page** (revised 2026-11-19): no preview before recording. After recording, show the gift scene first, then the large cream editable caption, then expanded personalization. No disclosure arrows; birthday-style playback cards also cover graduation and wedding.
- ✅ **Immediate opening bells** (2026-11-19): four bells answer the Open gift tap before audio downloads; clearer chimes accompany each item lighting. Start selected music only after the lighting sequence, and offer retry if browser audio cannot start.
- ✅ **Personal flowers and lanterns** (2026-11-19): each sender chooses flower type/color or lantern color; lanterns show sender initials, matching sender-avatar colors. Bouquet rows fit above each container's rim, with greenery inset from the frame.
- ✅ **Orderly sprinkles, separated music, twenty demos** (2026-11-19): evenly spaced rows follow cake surfaces; lighting chimes finish before selected music starts, and music stops for messages. Twenty demo items reuse ten sample recordings twice, explicitly labeled and excluded from training data.
- ✅ **Shape-aware cake patterns + adjacent drawing Undo** (2026-11-19): decorations follow each cake's tier/frosting surfaces, stay within curved edges and leave the name clear; removed fixed sprinkles from plain cakes. Undo sits beside Done and affects drawing strokes only. Music source audit: `docs/MUSIC.md`.
- ✅ 🎯 **Birthday recipient as a personal letter** (2026-11-18): quiet warm opening, real sender initials, integrated personalized cake, large cream caption card, pause/resume/replay/next controls, and readable sender names. Hearing and reading the exact message is the focus; no rewards. Implemented locally; publication is separate.
- ✅ **Voice mood**, festive set (2026-11-13): 😭 Sad (sad trombone, rain, flames shrink), 😡 Angry (growl + BRAKK!, red shake,
  steam), 💃 Dangdut (kendang + disco lights), 📢 Toa (ding-dong + echo), 👻 Horror (hum, flicker, green flames, ghost),
  🎈 Helium (slide whistle, balloons, item floats), 👽 Alien (theremin, UFO beam), 👾 8-bit (coin, pixels). Playback only; WAV stays clean.
  (Sinetron and Concert were tried and dropped the same day.)
- ✅ **Your own candle** in three picks (2026-11-13): stick (7), flame colour (7), flame shape (Classic / Tall / Round / Heart /
  Star / Twin / Sparkler). Each pick shows only that thing, live; the candle on the cake lights again with a burst.
- ✅ 🎯 **Thank-you with voice** (2026-11-13): one voice for everyone or one per friend, ASR + corrected words (training data).
  One by one is a friend list (with search): record for whoever you want, the others get a written note.
- ✅ **Thank-you pop-up**: pops up once on home, then waits in the Dashboard for 7 days after it was opened.
- ✅ "My gifts" → "Dashboard" on home, so it isn't mixed up with "Open your gift".

## Home page
- ⏳ Make "Open your gift" (paste a link) a small text link at the bottom: recipients usually tap the WhatsApp link.
- ⏳ Show the gifts you're making right on home (`🎂 For Rina · 5 voices · Send`) instead of a button.

## Fun for friends and the recipient
- ⏳ 🎯 **Karaoke caption everywhere**: words light up exactly as spoken (real ASR word timings). Wrong words stand out, so people fix them.
- ⏳ **Choir**: each friend sings one line of "Selamat ulang tahun"; the app joins them into one song before the candles are blown.
- ⏳ **Guess who**: the recipient hears a voice without the name and guesses; score at the end. Hard mode = with a mood effect.
- ⏳ 🎯 **Challenge cards** when you don't know what to say: "embarrassing moment", "roast in 10 s", "say it in Javanese / Sundanese / Batak / Betawi accent".
- ⏳ **Time capsule**: one voice locked until next year's birthday.
- ⏳ **One voice per hour** all through the birthday, instead of all at once.
- ⏳ **Story video**: the cake + candles + karaoke caption as a 15 s vertical video for IG Story / TikTok.
- ⏳ Moods made for the bouquet and lanterns too (now they get the general show, not item-specific touches).
- ⏳ Friends reply to the thank-you voice (a voice chain).
- ⏳ Candle colour picker (now it's the friend's colour by order).

## More data, still fun (ideas from 2026-11-13)
- ⏳ 🎯 **Read-aloud cards**: "read this pickup line as dramatically as you can". The text is known, so it's a perfect label with no correcting.
- ⏳ 🎯 **Pantun chain**: each friend adds one pantun line for the recipient; rhymes, rich vocabulary.
- ⏳ 🎯 **Numbers challenge**: "say their birth date / age / phone-style lucky number". Numbers are hard for ASR.
- ⏳ 🎯 **Jaksel mode**: mixed Indonesian–English on purpose ("which is literally…"). Code-switching data.
- ⏳ 🎯 **Typo detective badge**: a small badge / streak for friends who fix captions carefully.
- ⏳ 🎯 **Recipient double-check**: the recipient can tap a wrong word in a caption too, a second check on the label.
- ⏳ 🎯 **More occasions**: Lebaran (maaf lahir batin, ketupat scene), get well soon, good luck on exams, farewell. More reasons to send = more voices.

## Getting people to really fix the caption (ideas from 2026-11-13)
- ⏳ 🎯 **The candle burns brighter as the caption gets right**: unchecked words = a dim, flickery flame; each fix brightens it; all checked = a golden sparkle.
- ⏳ 🎯 **Unlock by checking**: the special flames / moods (Rainbow, Sparkler, Alien…) unlock once every flagged word is fixed or confirmed.
- ⏳ 🎯 **Tap a word to hear it**: plays just that bit of the recording, then fix that one word in place (no big text box).
- ⏳ 🎯 **"AI misheard me" card**: after sending, a funny shareable card ("AI heard: 'di hukum' 😭 I said: 'dihukum'"). Only exists if you fixed something.
- ⏳ 🎯 **Nudge before Send**: "3 words may be wrong. Dimas will read this 👀". Shown once, not blocking.
- ⏳ 🎯 **"Caption checked ✓" next to the name** on the recipient's side; friends see others did it.
- ⏳ 🎯 **Mission line**: "AI understands only 70% of Indonesian. Every fix teaches it our language, slang and accents."
- ⏳ 🎯 **Recipient typo patrol**: the recipient can tap a wrong word too; the friend gets "Dimas fixed your caption 😂".
- ⚠️ Guard the label: fix to what was *said*, not a nicer sentence. If the edit changes most words, suggest "Record again" instead.

## Natural caption checking, no rewards (proposed 2026-11-18)
- Removed by user choice (2026-11-19): **Recipient preview before recording**. Keep the recipient preview on the post-recording caption screen instead.
- ⏳ 🎯 **Edit the preview itself**: one caption surface using the recipient's presentation; tap any word or phrase to edit, with an accessible full-caption editor as a fallback, instead of showing duplicate text boxes.
- ⏳ 🎯 **Listen, decide, correct**: tapping a suspect phrase offers its audio context, manual editing and "that's what I said"; suggestions never silently replace speech or normalize slang.
- ⏳ 🎯 **Words first, decoration second**: keep moods and candle choices collapsed until the caption review is finished, without making effects a reward for editing.
- ⏳ 🎯 **Measure verified accuracy**: compare sampled audio-caption accuracy and recording-to-send completion for the old and proposed flows; edit count alone is not success, and unchanged captions are not automatically verified.
- ⏳ 🎯 **Separate simulation from real collection**: clearly identify mock transcripts and artificially inserted errors; exclude simulated recognition from real-ASR correction metrics and training exports by default.
