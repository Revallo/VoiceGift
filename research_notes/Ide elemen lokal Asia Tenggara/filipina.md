# Filipino cultural elements for Voice Gift (Philippines)

Scope: concrete, drawable/playable Filipino elements mapped to app slots (scene/occasion, item-per-voice, finale, mood, tune, stickers, backdrop, decoration), with cultural notes and sensitivities. Research date 2026-11-25. Sources are mostly Philippine media (Inquirer, Philstar, GMA, Rappler, Manila Bulletin, SunStar), PSA, Wikipedia and USC Folklore Archive (student-collected folklore; good for "how people actually do it", weak for history).

## 1. Filipino birthday customs (handaan, pancit, debut, kids' parties)

### Takeaway
The 18th-birthday **debut** is the strongest fit: its "18 roses / 18 candles / 18 treasures" rituals already mean "one guest = one item + a short wish/speech", which is exactly Voice Gift's model. For ordinary birthdays, **pancit (long noodles = long life)** and the **handaan** table (lechon, spaghetti, hotdog-marshmallow sticks) are the recognizable visuals; **pabitin** is a ready-made kids' finale.

### Cited Findings
- Debut = coming-of-age party at 18 for girls; men traditionally at 21, often with less formality or none — [Wikipedia: Philippine debut](https://en.wikipedia.org/wiki/Philippine_debut)
- **18 Roses**: 18 men (relatives/close friends) each give the debutante a rose and dance with her; some do 9 instead of 18 — [Wikipedia](https://en.wikipedia.org/wiki/Philippine_debut); [Culture Trip](https://theculturetrip.com/asia/philippines/articles/real-life-fairytale-a-girls-18th-birthday-in-the-philippines)
- **18 Candles**: 18 women present candles and give well-wishes/advice (a short speech each) — [Wikipedia](https://en.wikipedia.org/wiki/Philippine_debut); [USC Folklore: Debut](https://folklore.usc.edu/?p=85838)
- **18 Treasures**: a newer addition; givers can be any gender, often with a speech per gift — [Wikipedia](https://en.wikipedia.org/wiki/Philippine_debut)
- Families adapt the 18s freely (e.g. 18 cinnamon trees planted; "18 carnations", "18 sparklers"); a Cebuana chose an eco-friendly debut theme — [Wikipedia](https://en.wikipedia.org/wiki/Philippine_debut); [Cebu Daily News](https://cebudailynews.inquirer.net/?p=383265)
- Pancit at birthdays = long, prosperous life; noodles shouldn't be cut; Chinese roots (prosperity, health, longevity) — [USC Folklore: Long noodles](https://folklore.usc.edu/eat-long-noodles-on-your-birthday-for-a-long-life/); [Philstar: Pancit for long life](https://philstar.com/cebu-lifestyle/2015/02/17/1424661/pancit-long-life); [Daily Tribune](https://tribune.net.ph/2025/12/31/pancit-for-long-life)
- Some families swap pancit for long spaghetti, keeping the long-life meaning — [USC Folklore](https://folklore.usc.edu/eat-long-noodles-on-your-birthday-for-a-long-life/)
- Filipino spaghetti is sweet (banana ketchup, ground meat, hotdogs); hotdog + marshmallow on a stick is a kids'-party staple; **pabitin** = prizes hung from a bamboo grid that kids jump to grab — [Inquirer USA](https://usa.inquirer.net/138123/this-is-what-its-like-to-celebrate-a-birthday-in-the-philippines); [Gulf News](https://gulfnews.com/lifestyle/community/7-reasons-filipino-birthdays-are-the-most-epic-celebrations-1.2001613)
- Birthday "**blowout**": the celebrant treats others (pancit + soft drinks will do) — [Inquirer USA](https://usa.inquirer.net/138123/this-is-what-its-like-to-celebrate-a-birthday-in-the-philippines)
- **Lechon** (whole roast pig) is the centerpiece of fiestas, weddings, birthdays and Christmas; symbol of abundance/hospitality; Cebu lechon is a regional pride; Balayan, Batangas holds a Lechon Festival (24 June) with a parade; designer-decorated lechon exists — [GMA](https://gmanetwork.com/news/lifestyle/food/287527/lechon-for-pinoys-not-just-a-meal-but-a-mouth-watering-tradition/story); [Philstar Cebu](https://www.philstar.com/cebu-lifestyle/2019/01/18/1886129/cebuano-fiesta-fare); [Wikipedia: Lechon Festival](https://en.wikipedia.org/wiki/Lechon_Festival); [VICE](https://broadly.vice.com/en/article/v7ex58/designer-customized-lechon-roast-pig-philippines)

### Inferences
- **New occasion "Debut (18th)"** — best Philippine-specific scene. Item per voice: a **rose** (Roses mode) or a **candle** (Candles mode) or a wrapped **treasure box**; the 18-person framing maps cleanly but must not cap voices (keep "one logical item per voice", show groups like the cake does). Finale: the debutante's "last dance / cotillion" — items rise into a bouquet, or all 18 candles glow then sparklers. Could reuse `bouquet.js` (roses) + `cake.js` (candles) rather than a new scene. Label suggestion: "18 Roses", "18 Candles", "18 Treasures" — words in `themes.js`.
- **New occasion "Handaan (Filipino birthday)"** analogous to tumpeng: a long table / bilao (round woven tray) with **pancit** as the centrepiece; every voice = a dish the friend picks: lumpia, spaghetti (red, with hotdog slices), hotdog-marshmallow stick, lechon slice, puto, leche flan, kakanin, halo-halo glass, BBQ skewer, ensaymada, buko pandan, Coke/softdrink bottle. Finale: "Slurp the pancit" — one long noodle pulled from the plate without breaking (long-life gesture), or "Pabitin!" — the bamboo grid drops and prizes scatter.
- **Pabitin** as a kids'-birthday finale is very SVG-friendly (a square bamboo lattice with hanging candy/toys that the recipient taps or that falls).
- Lechon is iconic but pork (see Q6) — offer it as an optional dish, never the default/centre.

### Gaps
- No reliable source on the 7th-birthday custom (often mentioned as a milestone for kids, but I found no citable description); treat as unverified.
- No citation found for the origin of "18 treasures" beyond "recent addition".

## 2. Graduation and wedding

### Takeaway
Graduation in the Philippines is visually about **tarpaulin congratulation banners ("tarps")**, **garlands/leis** (including money garlands) and sampaguita. Weddings offer several perfect one-per-voice metaphors: **money dance (each guest pins a bill)**, **13 arrhae coins**, **veil and cord**, **dove release** (finale), and **ninong/ninang sponsors**.

### Cited Findings
- Congratulatory **tarpaulins** for graduates are a recognized practice (politicians post them every year; a viral 2026 story of a 6-year-old asking for a "Congratulations! For Passing the Kindergarten" tarp) — [Interaksyon/Philstar](https://interaksyon.philstar.com/breaking-news/2018/04/05/123934/graduation-season-welcomed-by-politicos-greetings/); [Interaksyon](https://interaksyon.philstar.com/?p=312119)
- **Money garlands** at graduation are common enough to be debated (is it necessary?) — [Cebu Daily News](https://cebudailynews.inquirer.net/576072/is-giving-money-garlands-during-graduation-necessary)
- **Sampaguita** (national flower) garlands: Centro Escolar University's "Sampaguita Interlude" since 1938, graduates hand sampaguita garlands to juniors; the flower stands for modesty and loyalty — [Manila Bulletin](https://mb.com.ph/2024/7/16/ceu-class-of-2024-bids-farewell-in-sampaguita-interlude-1); [Inquirer](https://newsinfo.inquirer.net/?p=391271)
- A vendor claims graduation leis were adopted from Hawaii and that families use Philippine-flag-colour leis (single commercial source; low confidence) — [Rosette Leis](https://www.rosetteleis.com/graduation-lei-philippines/)
- **Arrhae / arras**: 13 coins the groom gives the bride = commitment to provide — [The Knot](https://www.theknot.com/content/cultural-traditions-philippines); [Remitly](https://www.remitly.com/blog/lifestyle-culture/wedding-traditions-in-the-philippines/)
- **Veil and cord**: sponsors drape a veil (unity/protection) and a figure-eight cord (everlasting fidelity) over the couple — [The Knot](https://www.theknot.com/content/cultural-traditions-philippines); [Wikipedia: Marriage in the Philippines](https://en.wikipedia.com/wiki/Marriage_in_the_Philippines)
- **Money dance**: guests pin money on the couple while dancing to wish prosperity — [USC Folklore: Money Dance](https://folklore.usc.edu/?p=83704); [The Knot](https://www.theknot.com/content/cultural-traditions-philippines)
- **Doves**: the couple releases two doves (peace, harmony); rice throwing for prosperity — [Remitly](https://www.remitly.com/blog/lifestyle-culture/wedding-traditions-in-the-philippines/)
- **Ninong/ninang** (principal sponsors): witness/sign the marriage certificate, act as lifelong advisers; usually 3–5 pairs — [Eventnest](https://eventnest.ph/blog/principal-sponsors-ninong-ninang-how-many-how-to-ask-what-they-really-do); [Wikipedia](https://en.wikipedia.com/wiki/Marriage_in_the_Philippines)
- Lechon is described as "king" of the wedding reception (catering-vendor source) — [Eventnest](https://eventnest.ph/blog/why-lechon-is-still-the-king-of-every-filipino-wedding-reception/)

### Inferences
- **Graduation (PH skin on `bouquet.js`)**: every voice = a **sampaguita garland strand** or a flower in a sampaguita/ilang-ilang lei hung around a toga'd figure or a diploma. Backdrop: a **"CONGRATS GRAD!" tarpaulin** with the recipient's name in bold printed-tarp style (glossy gradient, big photo placeholder circle) — very recognisable and funny to young Filipinos. Finale stays "throw cap".
- Optional "money garland" sticker/decoration (folded peso-bill fan) — playful, but note the debate; don't make it the default.
- **Wedding (PH skin on `lanterns.js` or new)**: item per voice = a **bill pinned in the money dance** (draw generic stylised notes, not real peso banknote art) or one of **13 arrhae coins** (but 13 is a fixed number; prefer pinned bills, which scale). Finale: **release two white doves** (alternative to releasing lanterns) or "tie the cord" — a figure-eight cord wraps the couple's names. Decoration: veil lace pattern + infinity cord.
- Ninong/ninang: a label idea for co-organizers or for a special voice badge ("Ninang's message").

### Gaps
- No source found on when tarpaulins became standard at graduations or on a specific "Congrats Grad" design convention.
- Money-dance bill imagery: banknote design reproduction rules (BSP) not checked; avoid realistic banknotes.

## 3. Christmas, fiestas, balikbayan box, pasalubong

### Takeaway
Christmas is the biggest Filipino season (starting in September, "ber months"), and the **parol** star lantern is the single most iconic, drawable symbol: "every voice = a parol" is a natural new scene. The **balikbayan box** (OFW families packing gifts home, once even with recorded cassette messages) is an emotionally precise metaphor for a voice gift.

### Cited Findings
- **Parol**: Christmas lantern, name from Spanish *farol*; standardized as a five-pointed star (Star of Bethlehem) in the American period; Francisco Estanislao of San Fernando, Pampanga credited with the first five-pointed parol (1908, bamboo + cloth) — [Wikipedia: Parol](https://en.wikipedia.org/wiki/Parol); [Inquirer Lifestyle](https://lifestyle.inquirer.net/1897/parol-lantern-making-tradition/); [Vera Files](https://verafiles.org/articles/the-visual-delight-of-the-filipino-parol)
- **Giant Lantern Festival** (Ligligan Parul), San Fernando, Pampanga = "Christmas Capital of the Philippines"; lights change in patterns; origin dated 1904/1930/1931 depending on source (conflicting) — [Wikipedia](https://en.wikipedia.org/wiki/Giant_Lantern_Festival); [GMA](https://gmanetwork.com/lifestyle/news/108003/the-giant-lantern-festival-is-colorful-display-of-lights-and-tradition/story); [Inquirer Business](https://business.inquirer.net/428058/pampanga-lanterns-dazzle-endure)
- **Simbang Gabi**: nine dawn Masses 16–24 Dec (Misa de Gallo); after Mass people buy **bibingka** (rice cake, clay pot, banana leaf, salted egg, cheese) and **puto bumbong** (purple rice steamed in bamboo, butter, sugar, coconut) — [Philstar](https://www.philstar.com/lifestyle/2023/12/15/2318642/christmas-philippines-why-simbang-gabi-important-filipino-tradition); [Inquirer Business](https://business.inquirer.net/?p=438469); [Manila Bulletin](https://mb.com.ph/2025/12/17/rizal-provinces-simbang-gabi-tradition-delights-foodies-craving-for-bibingka-puto-bumbong)
- **Noche Buena**: Christmas Eve family feast after night Mass — [SBS Food](https://www.sbs.com.au/food/article/filipino-christmas-food/d8uwxrcs0); [Remitly](https://www.remitly.com/blog/lifestyle-culture/christmas-traditions-philippines/)
- **"Ber months"** and **Jose Mari Chan** "Christmas in Our Hearts" memes every 1 September; Chan says don't overdo it — [Inquirer Tech](https://technology.inquirer.net/79079/september-jose-mari-chan-memes-coming); [ABS-CBN](https://www.abs-cbn.com/2023/8/29/jose-mari-chan-on-his-memes-thank-you-for-making-me-one-of-the-symbols-of-ph-christmas-854); [Philstar 2025](https://interaksyon.philstar.com/trends-spotlights/2025/09/01/301436/ber-months-welcomed-jose-mari-chan/)
- **Balikbayan box**: corrugated box of goods sent home by overseas Filipinos; tied to pasalubong; legal basis EO 206 (1987); packers cram as much as possible, cushioning gadgets in clothes; unboxing is a shared family event; **before video calls some boxes held cassette tapes with recorded messages from relatives abroad**; customs-inspection controversy 2015 — [Wikipedia](https://www.wikipedia.org/wiki/Balikbayan_box); [AP via NY1, 2026](https://ny1.com/nyc/all-boroughs/ap-top-news/2026/05/15/the-balikbayan-box-the-way-filipino-americans-have-sent-love-all-the-way-back-home); [Inquirer Global Nation](https://globalnation.inquirer.net/115787/staple-answered-prayer-quirky); [Rappler](https://www.rappler.com/?p=155405)
- Sinulog (Cebu) and Ati-Atihan (Kalibo, Aklan) are January festivals honoring the **Santo Niño**; Sinulog adapted from Ati-Atihan in 1980 — [Inquirer Opinion](https://opinion.inquirer.net/?p=100929); [Inquirer](https://newsinfo.inquirer.net/?p=862498)

### Inferences
- **New occasion "Paskong Pinoy" (Christmas)**: every voice = a **parol** in a different colour/shape (5-point star with tails/tassels; capiz-like segmented panels; blinking light patterns à la Pampanga). Reuse `lanterns.js` architecture (it already has `star` shape). Finale: "Light the Giant Lantern" — all parols blink in a kaleidoscope sequence then merge into one giant parol. Backdrop: night sky + nipa hut or a barangay street with fairy lights. Side items: bibingka, puto bumbong, queso de bola, ham as stickers. Christmas is not tied to one recipient's birthday, so it fits "a gift for a family member abroad" or "barkada Christmas".
- **New occasion "Balikbayan box" (OFW/family abroad)** — strongest emotional idea: every voice = an item packed into the box (canned corned beef, chocolates, Spam-like can, lotion, sneakers, T-shirt, toy, perfume, coffee, a photo) the friend picks after recording (same pattern as tumpeng `dish`). Finale: "Open the box" — tape is cut (box with the classic brown tape and marker-written name/address "TO: <name>"), items pop out one by one. The historic cassette-tape-messages detail is a perfect story hook for marketing. Avoid real brand logos (draw generic cans/jars).
- **Pasalubong** = lighter version (a bag of local delicacies: dried mangoes, otap, piaya, polvoron).
- Fiesta backdrop/decoration: **banderitas** (colourful triangular bunting across a street) — easy SVG.

### Gaps
- Exact parol colour/shape conventions beyond the five-point star not sourced; Pampanga parols' rotating-light patterns described only generally.

## 4. Music and sounds (moods, tunes)

### Takeaway
Videoke is "practically a national sport", so a **videoke** mood/tune is very on-brand; avoid "My Way". Street sounds (**jeepney** horn/barker "Para!", **taho** vendor call) are distinctive intro sounds. Birthday songs: "Maligayang Bati" (Tagalog), the jokey "Hapi Bertday" version, and Nina's "Araw Mo" (copyrighted; don't use the recording).

### Cited Findings
- Karaoke/"videoke" practically a national sport in Manila; cheap per-song machines — [Wikipedia: My Way killings](https://en.wikipedia.org/wiki/My_Way_killings); [The World/PRI](https://theworld.org/stories/2013/08/15/sinatras-my-way-deadly-karaoke-philippines)
- "My Way" killings: at least 6 (up to ~13) deaths linked to singing Sinatra's "My Way" since ~2002; bars pulled it; UP's Roland Tolentino notes karaoke triggers existing tensions — [Wikipedia](https://en.wikipedia.org/wiki/My_Way_killings); [GMA News](https://www.gmanetwork.com/news/topstories/regions/373467/my-way-strikes-again-man-killed-in-videoke-row-over-sinatra-classic/story/); [Culture Trip](https://theculturetrip.com/asia/philippines/articles/singing-frank-sinatra-in-the-philippines-could-get-you-killed)
- Jeepney horns are often modified with quirky/laughing sound effects; barkers call passengers at terminals — [IWU blog](https://blogs.iwu.edu/culture-shock-carly/?p=302); [Freesound field recording](https://freesound.org/people/kevp888/sounds/839654); [Malay Mail 2026](https://www.malaymail.com/news/life/2026/06/13/colour-chaos-and-community-on-wheels-jeepneys-remain-manilas-most-iconic-and-contested-transport/223469)
- Taho vendors (magtataho) shout their product; a singing vendor from Daraga, Albay went viral and his sales rose from P250 to P700/day — [Daily Tribune](https://tribune.net.ph/2023/12/17/soya-sidekick)
- Birthday songs: "Maligayang bati" is what's sung; also the funny "Hapi Bertday"; English version common; Nina's "Araw Mo" (2006) dubbed "official birthday song" (citation-needed) — [Ling](https://ling-app.com/blog/happy-birthday-in-tagalog/); [Filipiknow](https://filipiknow.net/happy-birthday-in-tagalog/); [Wikipedia: Araw Mo](https://en.wikipedia.com/wiki/Araw_Mo)
- "Christmas in Our Hearts" (Jose Mari Chan) = unofficial Christmas anthem — [VICE](https://vice.com/en/article/philippines-unofficial-christmas-hearts-anthem-jose-mari-chan)

### Inferences
- **Moods (`voicefx.js`)** — Filipino counterparts to Dangdut/Toa:
  - **Videoke** — intro: the machine's "score" fanfare; effect: heavy reverb/echo + slight pitch "wobble"; show: a score number pops ("98! Excellent!") — the score screen is a well-known videoke-machine trope (not sourced; validate with Filipino users).
  - **Jeepney** — intro: a quirky jeepney horn; show: a jeepney drives across the gift; effect: mild road noise/band-pass. Barker line "Para!"/route calling as flavour.
  - **Taho** — intro: a sing-song "Tahooooo!" call (record our own, don't sample); effect: outdoor echo.
  - **Rondalla** — intro: a short plucked-string (bandurria/octavina) flourish; gentle, nostalgic (alternative to "Sad").
  - **Kilig** (the Filipino word for romantic giddiness; widely used) — sparkly chime + slight pitch up; show: hearts. (Term widely known; not separately sourced here.)
- **Tunes (`music.js`)**: public-domain-safe choices = "Happy Birthday" melody (PD), a rondalla-style folk arrangement (e.g. "Bahay Kubo", "Paru-parong Bukid" — traditional folk songs, confirm PD status), Christmas carol "Ang Pasko ay Sumapit" (composed 1933 by Vicente Rubi/Mariano Vestil — verify copyright before use). Do **not** use "Araw Mo", "Christmas in Our Hearts" or "My Way" recordings/melodies (copyrighted; "My Way" also carries the violence association).
- A "videoke" tune skin (MIDI-like synth + bouncing ball lyrics look) would be fun but must avoid "My Way".

### Gaps
- No citable source for the exact wording of taho calls, the videoke score-screen convention, or PD status of specific Filipino folk songs/carols.

## 5. Greetings, phrases, stickers, patterns

### Takeaway
Use English UI (project rule) with optional Filipino flavour words in decorations: "Maligayang kaarawan!", "Maligayang bati!", Cebuano "Malipayong adlaw sa pagkatawo". Sticker set candidates are food (halo-halo, mango, pancit, lumpia, lechon, ube), transport (jeepney, tricycle) and symbols (sampaguita, parol, carabao, sun-and-stars, bahay kubo). **Banig** (woven mat) geometry and **capiz** translucent-shell grids are ideal SVG patterns.

### Cited Findings
- Tagalog: "Maligayang kaarawan" (spoken greeting), "maligayang bati" (sung) — [Ling](https://ling-app.com/blog/happy-birthday-in-tagalog/); [Omniglot Tagalog](https://omniglot.com/language/phrases/tagalog.php)
- Cebuano: "Maligayang adlaw sa pagkatawo" / "Malipayong adlaw sa pagkatawo"; Omniglot: "Malipayong adlawng natawhan!" — [Preply](https://preply.com/en/blog/happy-birthday-in-cebuano); [Omniglot birthday](https://omniglot.com/language/phrases/birthday.htm)
- Hiligaynon: "Masadya gid nga adlaw sa imo pagkatawo" — [Omniglot Hiligaynon](https://omniglot.com/language/phrases/hiligaynon.htm)
- Ilocano phrases found only on low-quality copied pages (unverified) — see [Omniglot Ilocano](https://omniglot.com/language/phrases/ilocano.php) for checking
- **Capiz shell windows**: small panes of translucent oyster shell instead of glass, a heritage feature now used in lamps/chandeliers — [Wikipedia: Capiz shell window](https://en.wikipedia.org/wiki/Capiz_shell_window); [Inquirer Lifestyle](https://lifestyle.inquirer.net/107959/capiz-senseware-design-studio/)
- **Banig**: mats woven by folding strips into geometric designs (e.g. Basey, Samar) — [BusinessMirror](https://businessmirror.com.ph/2023/07/14/filipino-artisans/); [AUT thesis](https://openrepository.aut.ac.nz/bitstreams/f3487c85-c9e0-4725-bb59-1b8eb8126bc4/download)
- **Okir**: curvilinear folk-art motif distinct to Maranao/Iranun (Mindanao), central to Meranaw identity; pre-Islamic origins — [Wikipedia: Okir](https://en.wikipedia.org/wiki/Okir); [Rappler](https://rappler.com/?p=2660065)

### Inferences
- **Sticker set "Pinoy"** (`themes.js` → `decorate.stickers`; emoji where possible): 🥭 mango, 🍧 halo-halo, 🍜 pancit, 🐖 lechon (optional), 🌼 sampaguita (no exact emoji; 🤍🌸 as stand-in or custom SVG), ⭐ parol, 🇵🇭 flag, 🥥 buko, 🍌 banana-cue, 🐃 carabao (water buffalo emoji exists), 🏝️ beach, 🛺 tricycle (auto-rickshaw emoji approximates), 🎤 videoke, 📦 balikbayan box, 🏀 basketball (very popular; not sourced here). Jeepney has no emoji → custom SVG sticker (chrome hood, horse ornament, colourful side stripes, route sign "PARA").
- **Backdrops** (`BACKDROPS` in `stage.js`): fiesta street with banderitas; Manila Bay sunset; rice terraces (Banaue); nipa hut/bahay kubo; capiz-window wall glowing at night; congrats tarpaulin.
- **Patterns/decorations**: banig checker/diamond weave (cake `pattern`, bouquet wrap), capiz grid (lantern panel), barong/piña lace embroidery (wedding veil/wrap) — barong as formal national wear is common knowledge (not separately sourced), parol tassel trim.
- **Name fonts**: a "tarpaulin" bold sans with outline/drop shadow, and a "jeepney sign" painted script — both recognisable to young Filipinos.
- Respectful address words for labels/tooltips: "Kuya" (older brother), "Ate" (older sister), "Lola/Lolo", "Tita/Tito", "Ninang/Ninong", "barkada" (friend group) — common Filipino terms (not separately sourced).

### Gaps
- No named banig motif vocabulary found; no verified Ilocano greeting.

## 6. Sensitivities (religion, region, appropriation)

### Takeaway
The Philippines is ~79% Catholic but has ~7 million Muslims (6.4%, 91% of BARMM); keep scenes secular-festive (parol as a star/light, not a nativity), make pork optional, avoid sacred images (Santo Niño) and don't borrow Moro/indigenous art casually — there are recent public controversies about exactly that.

### Cited Findings
- 2020 census: Roman Catholic 78.8% (~85.6M); Islam 6.4% (~7M); Islam = 90.9% of BARMM household population — [PSA](https://www.psa.gov.ph/statistics/population-and-housing/node/1684041576); [Philstar](https://www.philstar.com/headlines/2023/02/22/2246855/philippines-still-overwhelmingly-catholic)
- 2024 Sinulog: a university contingent performed the Maranao **Singkil** in Moro attire while honoring the Santo Niño; Moro community called it appropriation; university apologized; a Bangsamoro official demanded an apology — [SunStar](https://www.sunstar.com.ph/tacloban/sinulog-dancers-in-moro-attire-carrying-image-of-child-jesus-draw-flak); [Rappler opinion](https://www.rappler.com/voices/thought-leaders/opinion-sinulog-singkil-religious-insensitivity-cebu/); [MindaNews](https://mindanews.com/top-stories/2024/01/bangsamoro-official-demands-apology-for-misappropriation-of-bangsamoro-culture-in-sinulog/)
- Ati-Atihan: performers blacken skin with soot to portray the Ati (indigenous); criticized as blackface (2020); Dinagyang criticized for aestheticizing Ati without their participation — [Wikipedia: Ati-Atihan](https://en.wikipedia.org/wiki/Ati-Atihan); [Daily Guardian](https://www.dailyguardian.com.ph/blog/is-dinagyang-beyond-authenticity)
- Okir: other groups adding non-traditional motifs to Maranao okir is noted; identity-linked — [Wikipedia: Okir](https://en.wikipedia.org/wiki/Okir)
- "My Way" violence association — [Wikipedia](https://en.wikipedia.org/wiki/My_Way_killings)
- Balikbayan box history touches Marcos-era politics and 2015 customs anger (sensitive for OFWs) — [AP via NY1](https://ny1.com/nyc/all-boroughs/ap-top-news/2026/05/15/the-balikbayan-box-the-way-filipino-americans-have-sent-love-all-the-way-back-home); [Wikipedia](https://www.wikipedia.org/wiki/Balikbayan_box)
- Regional languages differ (Tagalog vs Cebuano vs Hiligaynon greetings above) — [Omniglot](https://omniglot.com/language/phrases/birthday.htm)

### Inferences
- **Religious imagery**: keep the parol as a star of light; no crosses, saints, Santo Niño, rosaries or Mass scenes as stickers/items. Simbang Gabi can appear only via food (bibingka, puto bumbong). Wedding: veil/cord/coins are Catholic-rooted but read as cultural; fine as optional decorations, avoid priest/church imagery.
- **Food**: lechon and hotdogs are pork; for Muslim users always offer non-pork dishes and never default to lechon. Don't put pork next to Moro motifs.
- **Moro/indigenous art** (okir, Singkil, T'nalak, Ati body paint): do not use as generic "Filipino" decoration without community input; prefer broadly shared lowland/everyday motifs (banig, capiz, banderitas, jeepney).
- **Language**: UI stays English (rule); if adding greetings, provide Tagalog + Cebuano at least (Cebuano/Bisaya speakers can feel Tagalog-centrism, a common sentiment though not sourced here); have native speakers check any non-Tagalog text.
- **Money imagery**: money dance/garlands are real but draw stylised bills, not BSP banknote art.
- **Balikbayan box**: frame warmly (family, love from abroad); avoid customs/inspection jokes.
- **Videoke**: never "My Way"; keep the mood playful, not mocking singers (mockery is the documented trigger).

### Gaps
- No NCCA guideline found on commercial use of indigenous motifs; I didn't fetch NCCA pages. Not verified whether "kilig", "barkada", "Kuya/Ate" usage or the Cebuano anti-Tagalog sentiment need citations beyond common knowledge.

---

### Quick mapping (summary for the report writer)
| Element | App slot | Priority |
| --- | --- | --- |
| Debut 18 roses / 18 candles / 18 treasures | New occasion; item = rose/candle/treasure; finale = cotillion/last dance, sparklers | High |
| Handaan table with pancit centre | New occasion (like tumpeng); item = dish; finale = pull the long noodle / pabitin | High |
| Balikbayan box | New occasion (OFW); item = packed item; finale = cut tape, open box | High |
| Parol (Paskong Pinoy) | New occasion or lanterns skin; item = parol; finale = Giant Lantern light show | High |
| Congrats Grad tarpaulin, sampaguita garland | Graduation backdrop + item skin | Medium |
| Money dance bills, doves, veil & cord, 13 arrhae | Wedding item / finale (release doves) / decoration | Medium |
| Pabitin | Kids finale | Medium |
| Videoke, Jeepney, Taho, Rondalla, Kilig | Voice moods | Medium |
| Maligayang bati (PD melody), folk songs (rondalla) | Music tunes | Medium |
| Jeepney, halo-halo, mango, sampaguita, carabao, parol, bibingka | Sticker set | High (cheap) |
| Banig weave, capiz grid, banderitas, barong lace | Patterns / backdrops | Medium |
