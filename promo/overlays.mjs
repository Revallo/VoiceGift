// Renders the promo video's still layers as 1080×1920 PNGs (Chromium draws the text: bold fonts, colour emoji, shadows).
//   node promo/overlays.mjs      → promo/build/overlays/*.png
// Safe zone (TikTok/Reels buttons): no text in the bottom 15% (y > 1632) or the right 15% (x > 918).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');

const HERE = fileURLToPath(new URL('.', import.meta.url));
const OUT = HERE + 'build/overlays/';
fs.mkdirSync(OUT, { recursive: true });
const data = JSON.parse(fs.readFileSync(HERE + 'voices.json', 'utf8'));
export const PHONE = { x: 180, y: 350, w: 720, h: 1558, r: 64 }; // where the screen recording sits
export const END_PHONE = { x: 235, y: 470, w: 508, h: 1100, r: 46 }; // the home page on the closing card

export const CAPTIONS = { // promo/out/pov-<n>.mp4 ('' = no caption)
  1: 'POV: jam 12 malam kamu buka link dari sahabatmu',
  2: '',
  3: 'Kado ultah paling murah tapi bikin nangis'
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,500&family=Noto+Color+Emoji&display=block" rel="stylesheet">`;
const BASE = `*{margin:0;box-sizing:border-box}html,body{width:1080px;height:1920px;background:transparent;overflow:hidden}
body{font-family:'Plus Jakarta Sans','Noto Color Emoji',sans-serif;color:#fff;position:relative}
.safe{position:absolute;left:60px;width:858px}`;
const caption = (text) => `<div class="safe" style="top:96px;text-align:center;font-weight:800;font-size:62px;line-height:1.2;letter-spacing:-0.5px;
  text-shadow:0 4px 14px rgba(0,0,0,.85),0 0 3px rgba(0,0,0,.9),0 2px 0 rgba(0,0,0,.6)">${esc(text)}</div>`;

const pages = {
  // background around the phone: a warm midnight glow, a transparent rounded hole for the screen, a thin bezel
  bg: `<canvas id="c" width="1080" height="1920"></canvas><script>{ // a block: setContent keeps one JS realm, so top-level consts would clash
    const c = document.getElementById('c').getContext('2d'), P = ${JSON.stringify(PHONE)};
    const g = c.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, '#1d1430'); g.addColorStop(0.55, '#120c1c'); g.addColorStop(1, '#07050b');
    c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
    const r = c.createRadialGradient(540, 1000, 50, 540, 1000, 820); r.addColorStop(0, 'rgba(255,170,90,0.28)'); r.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = r; c.fillRect(0, 0, 1080, 1920);
    const rr = (x, y, w, h, rad) => { c.beginPath(); c.roundRect(x, y, w, h, rad); };
    rr(P.x - 16, P.y - 16, P.w + 32, P.h + 32, P.r + 16); c.fillStyle = '#0b0b0f'; c.fill();
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.18)'; c.stroke();
    c.globalCompositeOperation = 'destination-out'; rr(P.x, P.y, P.w, P.h, P.r); c.fill();
  }</script>`,
  // the lock screen before midnight, and at midnight
  ...Object.fromEntries(['23:59', '00:00'].map((time) => [`clock-${time.replace(':', '')}`, `<div style="position:absolute;inset:0;background:#000"></div>
    <div class="safe" style="top:470px;text-align:center">
      <div style="font-size:30px;font-weight:600;color:rgba(255,255,255,.75)">Sabtu, 21 November</div>
      <div style="font-size:250px;font-weight:700;letter-spacing:-8px;line-height:1.05;font-variant-numeric:tabular-nums">${time}</div>
    </div>`])),
  // a chat notification (a generic chat icon, no real app's branding)
  notif: `<div class="safe" style="top:900px;left:84px;width:810px;background:rgba(245,245,250,.16);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.18);
      border-radius:40px;padding:28px 32px;display:flex;gap:26px;align-items:center;box-shadow:0 10px 40px rgba(0,0,0,.5)">
    <div style="width:92px;height:92px;flex:none;border-radius:24px;background:linear-gradient(160deg,#ffb36b,#f0627e);display:grid;place-items:center">
      <svg width="54" height="54" viewBox="0 0 24 24" fill="#fff"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg></div>
    <div style="flex:1">
      <div style="display:flex;justify-content:space-between;font-size:30px;color:rgba(255,255,255,.7);font-weight:600"><span>Pesan</span><span>sekarang</span></div>
      <div style="font-size:40px;font-weight:800;margin-top:4px">${esc(data.organizer)}</div>
      <div style="font-size:38px;font-weight:500;margin-top:2px">buka ini 🎂</div>
    </div></div>`,
  // the closing card: a transparent phone-shaped hole (the home page plays behind it), the headline above
  'end-bg': `<canvas id="c" width="1080" height="1920"></canvas><script>{ // a block: setContent keeps one JS realm, so top-level consts would clash
    const c = document.getElementById('c').getContext('2d'), P = ${JSON.stringify(END_PHONE)};
    const g = c.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, '#3a1838'); g.addColorStop(0.5, '#1a1024'); g.addColorStop(1, '#07050b');
    c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
    const r = c.createRadialGradient(540, 1000, 80, 540, 1000, 700); r.addColorStop(0, 'rgba(255,190,110,0.45)'); r.addColorStop(1, 'rgba(255,190,110,0)');
    c.fillStyle = r; c.fillRect(0, 0, 1080, 1920);
    const rr = (x, y, w, h, rad) => { c.beginPath(); c.roundRect(x, y, w, h, rad); };
    rr(P.x - 12, P.y - 12, P.w + 24, P.h + 24, P.r + 12); c.fillStyle = '#0b0b0f'; c.fill();
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.25)'; c.stroke();
    c.globalCompositeOperation = 'destination-out'; rr(P.x, P.y, P.w, P.h, P.r); c.fill();
  }</script>`,
  end: `<div class="safe" style="top:110px;text-align:center;text-shadow:0 4px 18px rgba(0,0,0,.6)">
      <div style="font-family:Fraunces,serif;font-weight:600;font-size:70px;line-height:1.1;letter-spacing:-1px">Kumpulkan suara teman buat yang ulang tahun 🎂</div>
      <div style="font-size:44px;font-weight:700;margin-top:22px;color:#ffd7a0">Tanpa download app ✨</div>
    </div>`,
  // "Link di bio", bobbing over the bottom of that phone
  'end-pill': `<div class="safe" style="top:1478px;text-align:center">
      <div style="display:inline-block;padding:24px 58px;border-radius:999px;background:linear-gradient(180deg,#ffe2b0,#f6b45f);color:#2a1630;font-size:54px;font-weight:800;
        box-shadow:0 0 0 6px rgba(255,255,255,.25),0 14px 40px rgba(0,0,0,.55)">Link di bio 👆</div></div>`,
  // a tap on the screen (scaled to the phone)
  tap: `<div style="position:absolute;left:0;top:0;width:96px;height:96px;border-radius:50%;background:rgba(255,255,255,.35);border:5px solid rgba(255,255,255,.9);box-shadow:0 0 20px rgba(0,0,0,.4)"></div>`
};
for (const [n, t] of Object.entries(CAPTIONS)) pages[`caption-${n}`] = caption(t);
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.log('page error:', e.message));
for (const [name, body] of Object.entries(pages)) {
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}</style></head><body>${body}</body></html>`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  if (name.endsWith('bg')) { // canvas layers: exported directly (a screenshot would miss the canvas)
    const url = await p.$eval('#c', (c) => c.toDataURL('image/png'));
    fs.writeFileSync(OUT + name + '.png', Buffer.from(url.split(',')[1], 'base64'));
  } else if (name === 'tap') {
    await p.screenshot({ path: OUT + 'tap.png', omitBackground: true, clip: { x: 0, y: 0, width: 96, height: 96 } });
  } else await p.screenshot({ path: OUT + name + '.png', omitBackground: true });
  console.log(name);
}

// a confetti burst from the cake, 2.4 s at 30 fps (transparent frames)
const CF = OUT + 'confetti/';
fs.mkdirSync(CF, { recursive: true });
await p.setContent('<canvas id="c" width="1080" height="1920"></canvas>');
const frames = await p.evaluate(() => {
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cols = ['#FF6B8B', '#FFD166', '#7BDFF2', '#B388FF', '#7CE38B', '#FFFFFF', '#FF9F43'];
  const bits = Array.from({ length: 150 }, () => {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 2.4, v = 900 + rnd() * 1500;
    return { x: 540 + (rnd() - 0.5) * 300, y: 950, vx: Math.cos(a) * v * 0.75, vy: Math.sin(a) * v, w: 12 + rnd() * 12, h: 18 + rnd() * 16,
      r: rnd() * 6, vr: (rnd() - 0.5) * 14, c: cols[Math.floor(rnd() * cols.length)], round: rnd() < 0.25, delay: rnd() * 0.15 };
  });
  const c = document.getElementById('c').getContext('2d'), out = [];
  for (let f = 0; f < 72; f++) {
    const t = f / 30;
    c.clearRect(0, 0, 1080, 1920);
    for (const b of bits) {
      const s = Math.max(0, t - b.delay), drag = (1 - Math.exp(-2.2 * s)) / 2.2;
      const x = b.x + b.vx * drag + Math.sin(s * 5 + b.r) * 30, y = b.y + b.vy * drag + 700 * s * s;
      c.save(); c.translate(x, y); c.rotate(b.r + b.vr * s); c.globalAlpha = Math.min(1, s * 12) * Math.min(1, (2.4 - t) / 0.5);
      c.fillStyle = b.c;
      if (b.round) { c.beginPath(); c.arc(0, 0, b.w / 2, 0, 7); c.fill(); } else c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.vr * s)) + 2);
      c.restore();
    }
    out.push(document.getElementById('c').toDataURL('image/png').split(',')[1]);
  }
  return out;
});
frames.forEach((b64, i) => fs.writeFileSync(CF + String(i).padStart(3, '0') + '.png', Buffer.from(b64, 'base64')));
console.log('confetti', frames.length, 'frames');
await browser.close();
