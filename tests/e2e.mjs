// End-to-end test: walks the whole product in Chromium with a fake microphone, for every occasion
// (create → decorate → friends record → dashboard → 12 demo voices → recipient link → reveal → finale → keepsake, plus desktop).
// One-time setup:  npm i --no-save playwright && npx playwright install chromium
// Run:             npm run dev   (in another terminal)
//                  BASE=http://localhost:3000 node tests/e2e.mjs            (all occasions)
//                  BASE=http://localhost:3000 node tests/e2e.mjs wedding    (just one)
// Screenshots go to tests/screenshots/. It prints "ERRORS none" when everything passed.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = fileURLToPath(new URL('./screenshots/', import.meta.url));
fs.mkdirSync(OUT, { recursive: true });
const errors = [];

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ['microphone'] };

async function page(ctxOpts = phone) {
  const ctx = await browser.newContext(ctxOpts);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource: net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
  p.on('dialog', (d) => d.accept());
  return p;
}
const shot = async (p, name, full = false) => {
  const o = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, app: (() => { const a = document.querySelector('.app'); if (!a) return 0; a.scrollLeft = 50; const s = a.scrollLeft; a.scrollLeft = 0; return s; })(), sx: window.scrollX }));
  if (o.doc > 1 || o.app > 1 || o.sx) errors.push(`overflow on ${name}: ${JSON.stringify(o)}`);
  return p.screenshot({ path: OUT + name + '.png', fullPage: full });
};

// A short 16 kHz mono WAV (a soft tone), for guests added straight through the API.
function wav(sec = 2) {
  const n = 16000 * sec;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((i / 16000) * 2 * Math.PI * 330) * 3000), 44 + i * 2);
  return b;
}
async function apiGuest(slug, name, text) {
  const r = await fetch(`${BASE}/api/message?slug=${slug}&name=${encodeURIComponent(name)}&consent=1`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: wav() });
  const m = await r.json();
  await fetch(`${BASE}/api/message`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, id: m.id, token: m.token, text }) });
}

const CASES = {
  birthday: { recipient: 'Dimas', swatch: 9, friends: [['Budi', 'Dimas! Selamat ulang tahun, sukses terus bro!'], ['Mama', 'Selamat ulang tahun, Nak. Mama bangga sama kamu.'], ['Ayu', 'Happy birthday Dimas, traktir ya!']] },
  graduation: { recipient: 'Nadia', swatch: 6, friends: [['Pak Hadi', 'Selamat, Nadia. Revisinya memang banyak, tapi hasilnya bagus.'], ['Mama', 'Selamat wisuda, Nak!'], ['Rani', 'Nadia! Akhirnya S.Kom, traktir!']] },
  wedding: { recipient: 'Rina & Bayu', swatch: 6, extraGuests: 12, friends: [['Ibu Wati', 'Rina, anak Ibu, selamat menempuh hidup baru.'], ['Pak Joko', 'Selamat ya Bayu dan Rina, langgeng terus.']] }
};

async function runGift(occasion, c) {
  const P = (n) => `${occasion}-${n}`;
  // create
  const p = await page();
  await p.goto(`${BASE}/new`);
  await p.waitForSelector('#recipient');
  await p.click(`#occasions [data-v="${occasion}"]`);
  await p.fill('#recipient', c.recipient);
  await p.fill('#organizer', 'Sari');
  await shot(p, P('01-create-who'));
  await p.click('#nextBtn');
  await p.waitForSelector('[data-screen="decorate"]:not([hidden])');
  await p.click(`#flavors .swatch >> nth=${c.swatch}`);
  const hit = await p.$('.draw-hit');
  if (hit) {
    await p.click('[aria-label="Brush color 2"]');
    const b = await hit.boundingBox();
    await p.mouse.move(b.x + 40, b.y + b.height - 40);
    await p.mouse.down();
    for (let i = 0; i < 20; i++) await p.mouse.move(b.x + 40 + i * 3, b.y + b.height - 40 - Math.sin(i / 3) * 12);
    await p.mouse.up();
  }
  // stickers: add two, drag one, remove one with ×
  await p.click('#stickerTray .sticker-btn >> nth=0');
  await p.click('#stickerTray .sticker-btn >> nth=1');
  await p.click('#stickerTray .sticker-btn >> nth=-1'); // the tray scrolls sideways
  const sb = await (await p.$('.stickers .sticker >> nth=0')).boundingBox();
  await p.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await p.mouse.down();
  await p.mouse.move(sb.x + sb.width / 2 - 60, sb.y + sb.height / 2 - 30, { steps: 6 });
  await p.mouse.up();
  await p.click('.sticker.sel .x');
  if ((await p.$$('.stickers .sticker')).length !== 2) errors.push(`${occasion}: expected 2 stickers after removing one`);
  await p.waitForTimeout(300);
  await shot(p, P('02-decorate'));
  await p.click('#createBtn');
  await p.waitForSelector('[data-screen="share"]:not([hidden])');
  await p.waitForTimeout(400);
  await shot(p, P('03-share'), true);
  // back from step 3: edit, add a sticker, save
  await p.click('[data-screen="share"] .backbtn');
  await p.waitForSelector('[data-screen="decorate"]:not([hidden])');
  if ((await p.textContent('#createBtn')).trim() !== 'Save changes') errors.push(`${occasion}: no "Save changes" after going back`);
  await p.click('#stickerTray .sticker-btn >> nth=2');
  await p.click('#createBtn');
  await p.waitForSelector('[data-screen="share"]:not([hidden])');
  const friendLink = 'http://' + (await p.textContent('#friendLink'));
  const manageHref = await p.getAttribute('#manageBtn', 'href');
  const slug = friendLink.split('/g/')[1];
  console.log(occasion, 'slug', slug, 'manage', manageHref);
  await p.context().close();

  // friends record
  for (const [k, [name, text]] of c.friends.entries()) {
    const f = await page();
    await f.goto(`${BASE}/g/${slug}`);
    await f.waitForSelector('[data-screen="invite"]:not([hidden])');
    await f.waitForTimeout(400);
    if (k === 0) await shot(f, P('04-invite'));
    await f.fill('#name', name);
    await f.check('#consent');
    await f.click('#startBtn');
    await f.waitForSelector('[data-screen="record"]:not([hidden])');
    await f.waitForTimeout(2600);
    if (k === 0) await shot(f, P('05-recording'));
    await f.click('#stopBtn');
    await f.waitForSelector('[data-screen="caption"]:not([hidden])', { timeout: 15000 });
    if (k === 0) await shot(f, P('06-caption'));
    await f.fill('#captionText', text);
    await f.click('#sendBtn');
    await f.waitForSelector('[data-screen="done"]:not([hidden])', { timeout: 15000 });
    await f.waitForTimeout(400);
    if (k === c.friends.length - 1) await shot(f, P('07-done'));
    await f.context().close();
  }
  for (let g = 0; g < (c.extraGuests || 0); g++) await apiGuest(slug, `Tamu ${g + 1}`, `Selamat menempuh hidup baru, semoga bahagia selalu. (${g + 1})`);

  // friends who change /g/ into /r/ can't listen: the recipient's link has its own key
  const peek = await (await browser.newContext(phone)).newPage(); // its 403 is expected, so no error listener
  await peek.goto(`${BASE}/r/${slug}`);
  await peek.waitForSelector('[data-screen="error"]:not([hidden])');
  await shot(peek, P('08-no-key'));
  await peek.context().close();
  for (const u of [`/api/reveal?slug=${slug}`, `/api/reveal?slug=${slug}&k=guess`]) {
    const st = (await fetch(BASE + u)).status;
    if (st !== 403) errors.push(`${u} without the key: ${st}`);
  }

  // dashboard + demo voices
  const m = await page();
  await m.goto(BASE + manageHref);
  await m.waitForSelector('[data-screen="main"]:not([hidden])');
  await m.waitForTimeout(500);
  await shot(m, P('09-dashboard'), true);
  // the dashboard needs the organizer's key
  const noKey = await fetch(`${BASE}/api/manage?slug=${slug}`);
  const badKey = await fetch(`${BASE}/api/manage?slug=${slug}&key=guess`);
  if (noKey.status !== 403 || badKey.status !== 403) errors.push(`dashboard without key: ${noKey.status}/${badKey.status}`);
  const before = c.friends.length + (c.extraGuests || 0);
  await m.click('#addDemo');
  await m.waitForFunction((n) => document.querySelectorAll('#list .item').length === n, before + 12, { timeout: 30000 });
  await m.waitForSelector('#demoCard', { state: 'hidden' });
  await shot(m, P('10-dashboard-demo'), true);
  const recipientLink = await m.getAttribute('#openReveal', 'href');
  await m.context().close();

  // recipient reveal (the link from the dashboard)
  const r = await page();
  await r.goto(recipientLink);
  await r.waitForSelector('text=Open your gift');
  const shown = (await r.$$('.stickers .sticker')).length;
  if (shown !== 3) errors.push(`${occasion}: recipient sees ${shown} stickers, expected 3`);
  await shot(r, P('11-ready'));
  await r.click('text=Open your gift');
  await r.waitForTimeout(1900);
  await shot(r, P('12-lighting'));
  await r.waitForSelector('#blowBtn', { timeout: 30000 });
  await r.waitForTimeout(600);
  await shot(r, P('13-listen'));
  await r.click('.friend >> nth=1');
  await r.waitForTimeout(1200);
  await shot(r, P('14-playing'));
  await r.waitForTimeout(2500);
  await r.click('#blowBtn');
  await r.waitForTimeout(500);
  await shot(r, P('15-finale'));
  const hb = await (await r.$('.holdbtn')).boundingBox();
  if (occasion === 'birthday') {
    await r.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await r.mouse.down();
    await r.waitForTimeout(700);
    await shot(r, P('16-finale-doing'));
    await r.waitForTimeout(1200);
    await r.mouse.up();
  } else {
    await r.click('.holdbtn');
    await r.waitForTimeout(900);
    await shot(r, P('16-finale-doing'));
  }
  await r.waitForSelector('text=With love from', { timeout: 15000 });
  await r.waitForTimeout(1500);
  await shot(r, P('17-keepsake'));
  if (await r.$('.names .more')) {
    await r.click('.names .more');
    await shot(r, P('17b-keepsake-all'), true);
  }
  await r.click('text=Listen again');
  await r.waitForTimeout(800);
  await shot(r, P('18-listen-again'));
  await r.context().close();

  const rev = await (await fetch(`${BASE}/api/reveal?slug=${slug}&k=${new URL(recipientLink).searchParams.get('k')}`)).json();
  console.log(occasion, 'messages', rev.messages.length, rev.messages.slice(0, 3).map((x) => `${x.sender}: ${x.text} (${x.durationSec}s)`));
  return recipientLink;
}

const only = process.argv[2];
const slugs = {};
for (const [occasion, c] of Object.entries(CASES)) if (!only || only === occasion) slugs[occasion] = await runGift(occasion, c);

// landing + desktop
const l = await page();
await l.goto(BASE + '/');
await l.waitForTimeout(2600);
await shot(l, 'landing');
for (const o of ['graduation', 'wedding']) {
  await l.click(`#occasions [data-v="${o}"]`);
  await l.waitForTimeout(2600);
  await shot(l, `landing-${o}`);
}
const d = await page({ viewport: { width: 1280, height: 860 }, permissions: ['microphone'] });
await d.goto(BASE + '/');
await d.waitForTimeout(2600);
await shot(d, 'desktop-landing');
await d.goto(Object.values(slugs)[0]);
await d.waitForSelector('text=Open your gift');
await shot(d, 'desktop-ready');

console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
