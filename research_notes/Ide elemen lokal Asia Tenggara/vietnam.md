# Vietnamese local elements for Voice Gift (scenes, items, finales, moods, tunes, stickers)

Scope: Vietnam only. "Map" = where it could go in the app: **scene/occasion**, **item-per-voice**, **finale**, **mood**, **tune**, **stickers**, **backdrop**, **decoration**. App mappings are design inferences (marked as such); cultural facts are cited.

## Tết Nguyên Đán (Lunar New Year): lì xì, hoa mai/đào, mâm ngũ quả, câu đối, chúc Tết

### Takeaway
Tết is the strongest Vietnamese hook: a **lì xì red-envelope scene (each voice = one red envelope, each envelope = a wish)** maps almost 1:1 onto the custom of giving lucky money in exchange for New Year wishes. Blossom branches (mai in the South, đào in the North) are a natural second "item-per-voice" scene, and the five-fruit tray and calligraphy give decorate options and stickers.

### Cited Findings
- Lì xì = Tết lucky money, usually in red envelopes, given mainly to children and elders as a wish for luck, health, success and happiness — [Tuoi Tre News](https://news.tuoitre.vn/tet-custom-the-gift-of-lucky-money-10320812.htm); [QĐND](https://en.qdnd.vn/culture-sports/culture/li-xi-or-the-gift-of-lucky-money-during-tet-427888)
- Red of the envelope symbolizes luck and wards off evil; giving money without an envelope is considered improper (the envelope itself carries fortune and respect) — [Vinpearl](https://vinpearl.com/en/vietnamese-lucky-money-a-cultural-insight-for-travelers); [LocalVietnam](https://localvietnam.com/culture/holidays/vietnam-lucky-money/)
- Custom has extended to working adults giving to parents and to friends/neighbours on New Year visits; giving continues up to ~9th-10th day of Tết; typical sums are modest (20,000–100,000 VND) — "the gesture matters more than the sum" — [LocalVietnam](https://localvietnam.com/culture/holidays/vietnam-lucky-money/); [VinWonders](https://vinwonders.com/en/wonderpedia/news/vietnamese-lucky-money-an-integral-lunar-new-year-tradition/)
- Lucky money is framed as "an exchange for best New Year wishes" (the child wishes the elder well, gets an envelope) — [The Nation (ASEAN)](https://www.nationthailand.com/world/asean/40035470)
- Hoa mai (yellow apricot blossom) is a hallmark of Southern Tết, symbolizing prosperity, luck, joy; hoa đào (pink peach blossom) is the Northern/Hanoi symbol (Nhật Tân peach garden) — [Vietjet guide](https://www.vietjetair.com/en/pages/tet-flower-markets-meaning-of-peach-and-apricot-blossoms-during-lunar-new-year-1747384790182)
- Mâm ngũ quả (five-fruit tray) expresses gratitude ("Ăn quả nhớ kẻ trồng cây" – when eating fruit, remember who planted the tree); Northern trays follow the five elements and include a bunch of bananas (open hand = protection); Southern trays use wordplay: mãng cầu (custard apple) – sung (fig) – dừa (coconut) – đu đủ (papaya) – xoài (mango) ≈ "cầu vừa đủ xài" ("pray for just enough to spend"); Southerners avoid some fruits for homophone reasons; the Centre is relaxed — [Vietnam Discovery](https://vietnamdiscovery.com/culture-arts/five-fruit-tray-mam-ngu-qua-in-vietnam/); [Báo Nghệ An](https://baonghean.vn/en/print/10020885.html); [Bắc Ninh gov](https://bacninh.gov.vn/web/english/59/-/details/4790216/meaning-of-each-type-of-fruit-displayed-on-five-fruit-tray-during-tet-57220639)
- Fruit meanings cited: pear/sweet fruit = everything goes smoothly; pomegranate = many children/grandchildren — [Bắc Ninh gov](https://bacninh.gov.vn/web/english/59/-/details/4790216/meaning-of-tet-five-fruit-tray-89334361)
- "Xin chữ": at Tết people ask ông đồ (scholar-calligraphers) for characters such as Phát, Lộc (fortune), Tài (talent), Cát Tường (auspicious), Như Ý (as you wish); North: from ~28th of the last month to ~10th–15th of January; South: done before the 30th; still popular at Văn Miếu (Hanoi) in 2026 — [Lao Động](https://news.laodong.vn/van-hoa-giai-tri/xin-chu-ong-do-ngay-tet-va-cach-nguoi-viet-khoi-dau-nam-moi-1657321.ldo); [Saigoneer](https://saigoneer.com/saigon-culture/28748-a-brief-history-of-ông-đồ,-vietnam’s-scholars-whose-calligraphy-is-highly-sought-after); [Hanoi Times](https://hanoitimes.vn/red-paper-rising-hopes-tet-calligraphy-lights-up-hanoi.985899.html)
- Standard wishes: "Chúc mừng năm mới" (Happy New Year), "Vạn sự như ý" (may everything go as you wish), "An khang thịnh vượng" (peace, health and prosperity), often said together — [Vietcetera](https://vietcetera.com/en/vietnam-survival-guide-lunar-new-year-greetings-101); [Prep](https://prepedu.com/vi/blog/van-su-nhu-y-tieng-trung)

### Inferences
- **New occasion "Tết" / scene "Lì xì"** (strongest idea): a red-and-gold envelope fan or an envelope hung on a mai/đào branch; each voice = one envelope (`DISH_TYPES`-style pick of envelope design: plain red, gold "Lộc", zodiac animal, blossom). Opening an envelope = playing that voice (fits "wish in exchange for lì xì" exactly, but reversed: friends give the wishes). Easy SVG: rounded rectangle + flap + gold circle/character.
- **Alternative item-per-voice: blossom branch** — each voice = one blossom on a mai (yellow, 5 petals, South) or đào (pink, North) branch; a decorate toggle "Mai / Đào" respects North-South. Finale: "Shake the branch" (petals fall) or "Open all envelopes" (envelopes flip open, gold coins/confetti).
- **Decorate options**: five-fruit tray as a "topper/base" (Northern vs Southern set), calligraphy scroll with one character (Phúc / Lộc / Thọ / Như Ý / An Khang) as the `name` banner style, red câu đối couplet strips at the sides as a backdrop.
- **Stickers (Tết set)**: 🧧 envelope, 🌼 mai, 🌸 đào, 🍉 watermelon, 🥭 mango, 🥥 coconut, 🍊 kumquat tree, bánh chưng (green square, would need custom SVG — no emoji), 🎆 fireworks, zodiac animal of the year (2027 = Year of the Goat — verify).
- **Backdrop**: deep red with gold dots / mai yellow on red; night with fireworks (Giao thừa = New Year's Eve countdown fits the "send at 00:00" use case).
- **Moment**: the organizer can send the link at Giao thừa (midnight Lunar New Year's Eve), mirroring the existing 00:00 birthday surprise.

### Gaps
- No source fetched on bánh chưng/bánh tét imagery or on kumquat (quất) trees; widely known, but uncited here.
- Southern avoided-fruit list (which homophones) not fully verified; avoid specifying fruit taboos in UI text.
- Tết song licensing (e.g. "Ngày Tết quê em", "Xuân đã về", ABBA "Happy New Year", which is played everywhere at Tết) — no clear source found; VCPMC collects royalties and has reciprocal deals for foreign works ([Vietnam News](https://vietnamnews.vn/life-style/1763636/viet-nam-collects-over-16-million-usd-in-music-royalties-in-2025.html)), so assume all of these are copyrighted. Many current hit Tết songs are brand-commissioned ads ([Vietnamnet](https://vietnamnet.vn/en/when-tet-music-splits-into-triumph-and-turmoil-2491259.html)). Use original melodies "in the style of".

## Mid-Autumn (Tết Trung Thu), Hội An lanterns and thả đèn hoa đăng

### Takeaway
Mid-Autumn gives a ready **children's/lantern scene**: each voice = a star lantern (đèn ông sao), finale = **lion dance (múa lân)**. Hội An's **floating flower lanterns (thả đèn hoa đăng)** are the best Vietnamese finale for the lantern/wedding scene: lanterns drift on a river instead of rising.

### Cited Findings
- Trung Thu = 15th day of the 8th lunar month; a children's festival; not an official holiday but one of the biggest celebrations — [vietnam.travel](https://www.vietnam.travel/things-to-do/vietnams-magical-mid-autumn-festival); [Vietnam Airlines](https://www.vietnamairlines.com/au/en/plan-book/travel/travel-guide/mid-autumn-festival-in-vietnam)
- Đèn ông sao: traditional five-pointed star lantern of bamboo, coloured (often red cellophane) paper and jute; children parade with them at night, singing; families set out fruit trays and mooncakes — [Wikipedia: Star lantern](https://en.wikipedia.org/wiki/Star_lantern); [Accor guide](https://all.accor.com/a/en/limitless/thematics/art-culture/tet-trung-thu-mid-autumn-festival-vietnam.html)
- Lion dance is central: children's troupes go door to door; believed to bring luck; big crowds in Đà Nẵng in 2024 — [Tuoi Tre News](https://news.tuoitre.vn/lion-dance-lanterns-light-up-da-nang-for-mid-autumn-festival-10381982.htm)
- Hội An: boat rides on the Hoài River where locals and tourists light a flower/lotus-shaped candle lantern, make a wish and release it on the water; also done on full-moon nights and as prayers/tribute to parents — [VnExpress](https://e.vnexpress.net/news/travel-life/travel/central-vietnam-river-glows-in-a-tribute-to-parents-3798040.html); [Klook listing](https://www.klook.com/activity/38935-hoai-river-boat-ride-ticket-release-lantern-hoi-an/)

### Inferences
- **Lantern scene, Vietnamese variant**: add `SHAPES` "star" (đèn ông sao — already a `star` shape exists in `lanterns.js`; give it a 5-point red cellophane look), "Hội An" (round silk lantern, red/yellow/purple, tassel), "lotus" (hoa đăng floating). Each voice = one lantern.
- **Finale "Float the lanterns" (thả đèn hoa đăng)**: lanterns drift down a river and spread out, reflections shimmer; gentler than sky release and environmentally framed (sky lanterns are a fire concern — not checked). The "make a wish" step matches each lantern = one wish.
- **Trung Thu occasion**: item = star lantern or mooncake (round, with a stamped pattern — easy SVG); finale = "Call the lion": a lion head bobs in, drum beat, lanterns sway. Lion head = SVG-able but detailed; a simplified cartoon lân head is feasible.
- **Sounds**: drum + cymbal "tùng tùng cheng" for a lion-dance intro sound (mood or finale), useful also for Tết.
- **Stickers**: 🏮, ⭐ star lantern, 🥮 mooncake, 🌕, 🐇 (moon rabbit), chú Cuội & chị Hằng (folk figures; text only).
- **Backdrop**: Hội An old town at night (yellow walls, lantern strings), full moon.

### Gaps
- Mid-Autumn is mainly a children's festival, so it's a weaker "voice gift" occasion for 18–35 than Tết; could be framed as "for your kid/niece" or as a lantern style only.
- Environmental/regulatory status of floating lanterns not researched (some are paper + candle; the app only draws them).

## Life events: birthday, thôi nôi, graduation, wedding (đám hỏi), Teachers' Day 20/11, Women's Day 20/10 and 8/3

### Takeaway
Young Vietnamese celebrate birthdays Western-style (cake, candles, song), so the existing cake works; local flavour = Vietnamese cake flavours, the Vietnamese "Happy Birthday" lyrics and **thôi nôi** (first birthday: the baby grabs one of ~12 objects — "each voice = an object on the tray" is a lovely fit). **Đám hỏi betrothal trays (mâm quả, red cloth-covered, odd number)** fit "each voice = one tray". **Teachers' Day 20/11** and **Women's Day 20/10 / 8/3** are big, flower-and-wishes occasions where a group voice gift (a class for a teacher, colleagues for women) fits naturally — reusable with the bouquet scene.

### Cited Findings
- Birthdays: "Happy birthday to you" widely sung in English or Vietnamese after the candles are lit; birthday person makes a wish (ước nguyện) before blowing; balloons, cake; modern cakes include salted-egg-yolk (bông lan trứng muối), cheesecake, tiramisu — [LocalVietnam](https://localvietnam.com/culture/people/birthdays-vietnam/); [VOV World](https://vovworld.vn/letter-box/wednesday-june-15-2022-1965000.vov5); [VinWonders](https://vinwonders.com/en/wonderpedia/news/vietnamese-birthday-cakes-flavor-guide-varieties/)
- Traditionally everyone "aged together" at Tết; individual birthdays are a more modern habit (sources partly disagree) — [LocalVietnam](https://localvietnam.com/culture/people/birthdays-vietnam/)
- Thôi nôi (South) / Lễ Đầy Năm (North) = first birthday; "thôi" = leave, "nôi" = cradle; the baby picks from ~12 symbolic items (e.g. pen = scholar), read as a hint of future career; now usually followed by a Western party — [Viet Bookstore](https://vietbookstore.com/blogs/vietnamese-learning-resources/l%E1%BB%85-cung-thoi-noi-a-beautiful-vietnamese-first-birthday-tradition); [USC Folklore](https://folklore.usc.edu/?p=56818); [Wikipedia: Zhuazhou](https://en.wikipedia.org/wiki/Zhuazhou); [Bizhub (HCMC festival)](https://bizhub.vietnamnews.vn/hundreds-of-families-join-first-birthday-festival-in-hcm-city-post403072.html)
- Gifts to avoid at thôi nôi include chrysanthemums/white lilies (funeral flowers) — [Chus.vn](https://chus.vn/what-gifts-to-avoid-at-thoi-noi-to-protect-babys-luck)
- Graduation: students dress up and take photos at their universities and famous spots; female students wear áo dài; bouquets are traditional, now plus personalized gifts ("graduation flower cups" trend) — [VnExpress](https://e.vnexpress.net/news/life/school-s-out-time-to-let-your-hair-down-3431284.html); [Vietnamnet](https://vietnamnet.vn/en/ao-dai-symbolic-costume-of-vietnamese-women-690517.html); [Lao Động](https://news.laodong.vn/gia-dinh-hon-nhan/cup-hoa-tot-nghiep-tao-con-sot-dich-vu-lam-qua-theo-yeu-cau-dat-khach-1711193.ldo); RMIT Vietnam students decorate their caps — [RMIT](https://www.rmit.edu.vn/students/student-news-and-events/student-news/2025/rmit-vietnam-graduate-cap-decorations)
- Popular student flowers (florist = marketing): sunflowers, roses, tulips, baby's breath — [Saigon Flowers](https://www.saigonflowers.com/blogs/flower-bouquets/graduation-flower-bouquets-in-vietnam)
- Đám hỏi / lễ ăn hỏi: gifts in ritual trays (mâm quả: betel & areca, tea, wine, bánh phu thê/xu xê cakes, fruit, sticky rice, roasted pig) carried by unmarried young men of the groom's side and received by unmarried young women of the bride's side; trays usually odd in number (5/7/9) — sources disagree on the South (some say even) — [Wikipedia: Vietnamese wedding](https://en.wikipedia.org/wiki/Vietnamese_wedding); [Vietnam Airlines](https://www.vietnamairlines.com/en/useful-information/travel-guide/traditional-vietnamese-wedding); [Mytour](https://mytour.vn/en/blog/bai-viet/what-are-the-6-wedding-fruit-trays-meaning-of-each-wedding-fruit-tray-mytour.html); [TheSmartLocal](https://thesmartlocal.com/vietnam/vietnamese-weddings/)
- Teachers' Day 20/11 (since 1958): not a public holiday but socially big; students bring flowers (sunflowers, hydrangeas, roses) + written wishes/cards; former students visit teachers — [Vietcetera](https://vietcetera.com/en/flowers-at-the-gate-stories-in-the-card-the-unspoken-etiquette-of-vietnamese-teachers-day); [Lao Động (flowers)](https://news.laodong.vn/chuyen-nha-minh/5-loai-hoa-y-nghia-danh-tang-thay-co-nhan-dip-2011-1611261.ldo); [Lao Động (wishes)](https://news.laodong.vn/giao-duc/nhung-loi-chuc-ngay-nha-giao-viet-nam-2011-y-nghia-dac-biet-gui-toi-thay-co-1611534.ldo)
- Women's Day twice: 8/3 (international) and 20/10 (Vietnamese Women's Day, from the 1930 founding of the women's union); men give flowers, cards, small gifts to mothers, wives, sisters, colleagues; workplaces hold events; flower vendors fill streets — [Vietcetera](https://vietcetera.com/en/why-vietnam-celebrates-womens-day-twice); students are main buyers, trend toward practical gifts but flowers remain standard — [Lao Động](https://news.laodong.vn/thi-truong/gioi-tre-chuong-qua-2010-vua-tui-tien-dung-duoc-moi-ngay-1594140.ldo); women also give each other flowers — [LocalVietnam](https://localvietnam.com/culture/holidays/vietnamese-womens-day/)

### Inferences
- **Birthday (Vietnam flavour)**: add cake `FLAVORS` "salted egg & pork floss" (bông lan trứng muối — yellow sponge, orange yolk flecks), "pandan" (green, lá dứa — uncited but very common), "coconut". Name font & greeting "Chúc mừng sinh nhật" only as a sticker/decoration text (UI stays English).
- **Thôi nôi occasion** (new, very drawable): a red tray/mat; each voice = one object (pen, book, abacus/calculator, stethoscope, microphone, money, scissors-free!, ball, paintbrush, laptop, rice bowl, comb...). Finale: "Let baby choose" — a little hand reaches and one object glows (random or the organizer's pick). Avoid knives/scissors as items (cutting = bad luck per [Vietnam Tourism](https://www.vietnamtourism.com/en/gift-giving-in-vietnam-what-to-bring-what-to-avoid-and-how-to-hand-it-over)).
- **Graduation (Vietnam flavour)**: bouquet `WRAPS`/flowers: sunflower (hướng dương), hydrangea, baby's breath; sticker áo dài, mortarboard, university gate. Finale stays "throw cap".
- **Wedding / Đám hỏi**: new scene "Betrothal trays" — a row of round red-cloth-covered trays (mâm quả); each voice = one tray with contents (betel & areca, tea, wine, bánh phu thê green-yellow square cakes, fruit, xôi gấc red sticky rice, roasted pig). Finale: "Lift the red cloths" (all covers lift together, double-happiness 囍 glows). Colours red + gold. Keep tray count = number of voices (don't force odd numbers, but could default demo to odd).
- **Teachers' Day 20/11 & Women's Day 20/10 / 8/3**: new occasions reusing `bouquet.js` (each voice = a flower) — "From the class to Cô/Thầy ..." is a perfect group-voice use; Women's Day for colleagues/mothers. Finale e.g. "Hand over the bouquet" / petals burst. Timing: send the link on the morning of 20/11 or 20/10.

### Gaps
- No source on exact thôi nôi object list (≈12 items varies by family).
- Bánh phu thê / xôi gấc / bánh cốm details not fetched directly (Wikipedia wedding page lists tray items; not verified line-by-line).
- No data on how young Vietnamese use group voice messages / Zalo voice notes (could inform tone).

## Music, sounds and voice moods

### Takeaway
Distinct, recognizable sounds: **đàn bầu** (one-string, gliding/wailing tone — ideal "Sad"/"Bolero" mood intro), **street-vendor calls** ("bánh mì nóng giòn đây!" — perfect comic intro, like the existing Indonesian "Toa"/"Dangdut" moods), **motorbike horn**, **lion-dance drums**, Tết firecracker-style crackle. Use original melodies; most Vietnamese songs are copyrighted.

### Cited Findings
- Đàn bầu: Vietnamese one-string zither (độc huyền cầm), played with a plectrum on harmonics, with a flexible rod bending pitch; solo instrument in folk music; seen as a national symbol like nón lá and áo dài — [Wikipedia](https://en.wikipedia.org/wiki/%C4%90%C3%A0n_b%E1%BA%A7u); [Vietnam News](https://vietnamnews.vn/life-style/424256/dan-bau-instrument-vietnamese-national-treasure.html)
- Street cries (tiếng rao): "bánh mì đây!" at midday in Hanoi; many vendors now loop pre-recorded calls on speakers, e.g. "bánh mì nóng giòn đây" (hot crispy bread here); calls differ by region and vendor — [Mekong Review](https://mekongreview.com/?p=93502); [Vietcetera](https://vietcetera.com/en/the-fading-echoes-of-vietnams-street-cries); [Vietnamnet](https://vietnamnet.vn/en/memories-of-street-calls-E178312.html); HCMC vendors keep live cries — [Tuoi Tre News](https://news.tuoitre.vn/in-ho-chi-minh-city-street-vendors-keep-traditional-cries-alive-amid-changing-times-103260627171149568.htm); looped sales speakers also annoy many residents — [Tuoi Tre News](https://news.tuoitre.vn/in-vietnam-many-haunted-by-street-vendors-sales-speakers-103251225123725891.htm)
- "Happy birthday to you" is widely sung, also with Vietnamese lyrics — [VOV World](https://vovworld.vn/letter-box/wednesday-june-15-2022-1965000.vov5)
- Music royalties are actively collected by VCPMC (~US$16M in 2025; reciprocal deals with foreign societies) — [Vietnam News](https://vietnamnews.vn/life-style/1763636/viet-nam-collects-over-16-million-usd-in-music-royalties-in-2025.html)

### Inferences
- **New moods** (intro sound + voice FX, in `MOODS` style):
  - "Đàn bầu" / "Bolero" (sad-sweet): a gliding single-string intro + slight vibrato/reverb on voice (Bolero = beloved sentimental genre across ages; uncited here).
  - "Bánh mì!" (street vendor): a looped-speaker style "bánh mì nóng giòn đây" jingle (must be newly recorded/synthesized, not copied) + megaphone/lo-fi band-pass voice — the Vietnamese twin of "Toa".
  - "Honk" (motorbike traffic): two beeps + scooter rev intro, voice with light street noise.
  - "Lân" (lion dance): drum + cymbal roll intro, voice unchanged or slightly boomy; good for Tết/Trung Thu.
  - "Karaoke" (Vietnamese love karaoke — unverified here): echo/reverb voice + synth intro.
- **Tunes (`TUNES` in `music.js`)**: original pentatonic Tết-style melody (no copyrighted song), a lullaby-ish đàn bầu line for thôi nôi, a light Vpop beat; "Happy Birthday" melody is reportedly public domain in the US since 2016 (not verified for Vietnam — check before use).
- **Phrases (stickers/decoration text only; UI stays English)**: "Chúc mừng sinh nhật", "Chúc mừng năm mới", "Vạn sự như ý", "An khang thịnh vượng", "Tết đến rồi!", "Mừng tuổi" (= lì xì in the North), "Cảm ơn thầy cô" (Teachers' Day).

### Gaps
- No source fetched on bolero's popularity among 18–35 or on Vpop/TikTok meme sounds; validate with Vietnamese colleagues.
- Copyright of the Vietnamese-lyric "Happy Birthday" and Tết classics not confirmed.
- Motorbike horn culture: widely known but not cited here.

## Stickers, patterns, and sensitivities (political symbols, colours, numbers, North/South)

### Takeaway
Safe, recognizable sticker set: nón lá, áo dài, phở, bánh mì, cà phê sữa đá (phin filter), motorbike, lì xì envelope, mai/đào blossom, star lantern, mooncake, lotus, bamboo, water buffalo. **Avoid**: any maps (nine-dash line is illegal to show and has banned films/apps), any flags (the yellow-with-three-red-stripes South Vietnam flag is highly sensitive; the national flag is political too), white chrysanthemums / white-only wrapping (funerals), sets of 4, knives/scissors/clocks as gift items. Respect North/South choices (đào vs mai, fruit tray).

### Cited Findings
- Nón lá, áo dài and đàn bầu are described as national symbols — [Vietnamnet](https://vietnamnet.vn/en/monochord-zither-embodies-vietnamese-culture-E173231.html)
- Nine-dash line: Vietnam pulled *Abominable* (2019), *Uncharted* (2022), banned *Barbie* (2023) over maps; streaming platforms removed *Let Me Shine*; a car importer was ordered to drop navigation apps showing Chinese claims; officials say using products with the line violates law — [PBS](https://www.pbs.org/newshour/world/vietnam-bans-barbie-movie-over-map-of-south-china-sea); [Dawn](https://www.dawn.com/news/1948507); [SCMP](https://www.scmp.com/news/asia/southeast-asia/article/3034207/vietnam-orders-car-importer-ditch-china-map-app-over-nine); [RFA](https://www.rfa.org/english/news/vietnam/southchinasea-nine-dash-barbie-07052023162820.html)
- South Vietnamese flag (yellow, three red stripes): treated by the government as a symbol of "reactionary forces", rarely displayed; celebrities pictured with it faced online campaigns; diaspora treats it as a memorial — [RFA explainer](https://www.rfa.org/english/news/vietnam/south-vietnam-flag-explained-08302024215421.html); [RFA celebrities](https://www.rfa.org/english/news/vietnam/south-vietnam-flag-celebrities-08302024214934.html)
- Number 4 sounds like "death" (tứ/tử) — avoid sets of four; odd quantities preferred; white flowers esp. chrysanthemums = funerals; avoid white/black wrapping, prefer red/gold/yellow/pink; clocks, knives/scissors, handkerchiefs are poor gifts — [Vietnam Tourism](https://www.vietnamtourism.com/en/gift-giving-in-vietnam-what-to-bring-what-to-avoid-and-how-to-hand-it-over); [Cultural Atlas](https://culturalatlas.sbs.com.au/articles/9ec1254b-06ea-45c1-827e-4bcfdb84a61e); [Vietcetera superstitions](https://vietcetera.com/en/vietnamese-superstitions-origin-and-cultural-connotations); sources disagree in places (some contexts avoid odd vs even) — [Chus.vn](https://chus.vn/ghost-month-gift-taboos-avoid-cultural-mistakes)
- North/South differences: thôi nôi vs đầy năm naming; mai vs đào; fruit-tray logic; even vs odd tray counts at engagements; calligraphy timing — [Viet Bookstore](https://vietbookstore.com/blogs/vietnamese-learning-resources/l%E1%BB%85-cung-thoi-noi-a-beautiful-vietnamese-first-birthday-tradition); [Vietjet](https://www.vietjetair.com/en/pages/tet-flower-markets-meaning-of-peach-and-apricot-blossoms-during-lunar-new-year-1747384790182); [Báo Nghệ An](https://baonghean.vn/en/print/10020885.html); [Mytour](https://mytour.vn/en/blog/bai-viet/what-are-the-6-wedding-fruit-trays-meaning-of-each-wedding-fruit-tray-mytour.html); [Lao Động](https://news.laodong.vn/van-hoa-giai-tri/xin-chu-ong-do-ngay-tet-va-cach-nguoi-viet-khoi-dau-nam-moi-1657321.ldo)

### Inferences
- **Sticker sets (`decorate.stickers` in `themes.js`)**:
  - Vietnam everyday: nón lá, áo dài, 🛵 motorbike, ☕ cà phê sữa đá in a phin, bánh mì, 🍜 phở, bamboo, lotus (🪷), water buffalo (🐃), 🚲 xích lô, Hội An lantern.
  - Tết: 🧧, mai 🌼, đào 🌸, bánh chưng, kumquat tree, 🎆, zodiac animal, "Lộc" calligraphy tile.
  - Trung Thu: ⭐ star lantern, 🥮, 🌕, 🐇, lion head.
  - Many need custom SVG (nón lá, bánh mì, phin, bánh chưng) since emoji don't exist; all are simple geometric shapes.
- **Patterns/backdrops**: red + gold (Tết, wedding), mai-yellow on red, Hội An yellow walls + lanterns, rice terraces (green bands), lotus pond, "gạch bông" encaustic floor tiles (popular retro café aesthetic; uncited), Đông Hồ woodblock-print style (folk art; uncited).
- **Rules for the app**: no maps or flags in any scene/sticker; don't offer white chrysanthemums or white-only wrap as bouquet options for Vietnam (fine elsewhere? keep generally optional); avoid exactly-4 default counts in demo data for Vietnam (DEMO_COUNT = 5 is already fine); no knife/scissors items (the tumpeng "cut" finale is fine, but a Vietnamese thôi nôi scene should avoid scissors objects); always let users pick North (đào) or South (mai) variants; write "Hồ Chí Minh City"/political figures nowhere.

### Gaps
- Gạch bông, Đông Hồ prints, bolero/karaoke, pandan cake popularity, and motorbike-horn culture are from general knowledge, not sources fetched here — verify before claiming in copy.
- No source on whether the official red flag with yellow star is fine in a casual gift app (likely acceptable but political; recommend avoiding all flags).
- No user research on which of these the 18–35 group finds fresh vs cliché (e.g. nón lá may feel touristy to locals) — test with Vietnamese users.
