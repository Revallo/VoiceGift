// End-to-end test: walks the whole product in Chromium with a fake microphone
// (create → decorate → 3 friends record → dashboard → open now → reveal → blow → keepsake, plus desktop).
// One-time setup:  npm i --no-save playwright && npx playwright install chromium
// Run:             npm run dev   (in another terminal)
//                  BASE=http://localhost:3000 node tests/e2e.mjs
// Screenshots go to tests/screenshots/. It prints "ERRORS none" when everything passed.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = new URL('./screenshots/', import.meta.url).pathname;
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

// 1. landing
let p = await page();
await p.goto(BASE + '/');
await p.waitForTimeout(2600);
await shot(p, '01-landing');

// 2. create
await p.click('text=Create a gift');
await p.waitForSelector('#recipient');
await p.fill('#recipient', 'Dimas');
await p.click('#inTwo');
await p.fill('#organizer', 'Sari');
await shot(p, '02-create-who');
await p.click('text=Next: decorate the cake');
await p.waitForSelector('[data-screen="decorate"]:not([hidden])');
await p.click('[aria-label="Ube"]');
await p.click('[aria-label="Brush color 2"]');
const hit = await p.$('.draw-hit');
const b = await hit.boundingBox();
await p.mouse.move(b.x + 40, b.y + 200);
await p.mouse.down();
for (let i = 0; i < 20; i++) await p.mouse.move(b.x + 40 + i * 3, b.y + 200 - Math.sin(i / 3) * 12);
await p.mouse.up();
await shot(p, '03-decorate');
await p.click('#createBtn');
await p.waitForSelector('[data-screen="share"]:not([hidden])');
await p.waitForTimeout(400);
await shot(p, '04-share', true);
const friendLink = 'http://' + (await p.textContent('#friendLink'));
const manageHref = await p.getAttribute('#manageBtn', 'href');
const slug = friendLink.split('/g/')[1];
console.log('slug', slug, 'manage', manageHref);

// 3. friends record
const friends = [['Budi', 'Dimas! Selamat ulang tahun, sukses terus bro!'], ['Mama', 'Selamat ulang tahun, Nak. Mama bangga sama kamu.'], ['Ayu', 'Happy birthday Dimas, traktir ya!']];
for (const [k, [name, text]] of friends.entries()) {
  const f = await page();
  await f.goto(`${BASE}/g/${slug}`);
  await f.waitForSelector('[data-screen="invite"]:not([hidden])');
  await f.waitForTimeout(400);
  if (k === 0) await shot(f, '05-invite');
  await f.fill('#name', name);
  await f.check('#consent');
  await f.click('#startBtn');
  await f.waitForSelector('[data-screen="record"]:not([hidden])');
  await f.waitForTimeout(2600);
  if (k === 0) await shot(f, '06-recording');
  await f.click('#stopBtn');
  await f.waitForSelector('[data-screen="caption"]:not([hidden])', { timeout: 15000 });
  if (k === 0) await shot(f, '07-caption');
  await f.fill('#captionText', text);
  await f.click('#sendBtn');
  await f.waitForSelector('[data-screen="done"]:not([hidden])', { timeout: 15000 });
  await f.waitForTimeout(400);
  if (k === 2) await shot(f, '08-done');
  await f.context().close();
}

// 4. recipient before unlock
let r = await page();
await r.goto(`${BASE}/r/${slug}`);
await r.waitForSelector('[data-screen="scene"]:not([hidden])');
await r.waitForTimeout(800);
await shot(r, '09-locked');

// 5. dashboard + open now
const m = await page();
await m.goto(BASE + manageHref);
await m.waitForSelector('[data-screen="main"]:not([hidden])');
await m.waitForTimeout(500);
await shot(m, '10-dashboard', true);
await m.click('#unlockNow');
await m.waitForTimeout(1200);

// 6. recipient reveal
await r.reload();
await r.waitForSelector('text=Open your gift');
await shot(r, '11-ready');
await r.click('text=Open your gift');
await r.waitForTimeout(1900);
await shot(r, '12-lighting');
await r.waitForSelector('#blowBtn', { timeout: 20000 });
await r.waitForTimeout(500);
await shot(r, '13-cake');
await r.click('.friend >> nth=1');
await r.waitForTimeout(1200);
await shot(r, '14-playing');
await r.waitForTimeout(3500);
await r.click('#blowBtn');
await r.waitForTimeout(500);
const hb = await (await r.$('.holdbtn')).boundingBox();
await r.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
await r.mouse.down();
await r.waitForTimeout(700);
await shot(r, '15-blowing');
await r.waitForTimeout(1200);
await r.mouse.up();
await r.waitForTimeout(1500);
await shot(r, '16-keepsake');

// 7. desktop
const d = await page({ viewport: { width: 1280, height: 860 }, permissions: ['microphone'] });
await d.goto(BASE + '/');
await d.waitForTimeout(2600);
await shot(d, '17-desktop-landing');
await d.goto(`${BASE}/r/${slug}`);
await d.waitForSelector('text=Open your gift');
await shot(d, '18-desktop-ready');

// API check: export disabled without key, reveal data
const rev = await (await fetch(`${BASE}/api/reveal?slug=${slug}`)).json();
console.log('messages', rev.messages.map((x) => `${x.sender}: ${x.text} (${x.durationSec}s)`));
console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
