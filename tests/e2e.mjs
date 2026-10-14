// End-to-end test: walks the whole product in Chromium with a fake microphone, for every occasion
// (sign in → create → decorate → friends sign in + record → dashboard → 12 demo voices → recipient signs in + claims →
//  reveal → finale → keepsake → a forwarded link fails for other accounts, plus desktop).
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

// Signs a page's context in through the API (same cookie the sign-in page sets).
async function signedIn(name, email, ctxOpts = phone) {
  const p = await page(ctxOpts);
  const r = await p.context().request.post(`${BASE}/api/auth`, { data: { name, email } });
  if (!r.ok()) errors.push(`sign in ${email}: ${r.status()}`);
  return p;
}
// A cookie for plain fetch() calls.
async function cookieFor(name, email) {
  const r = await fetch(`${BASE}/api/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email }) });
  return r.headers.get('set-cookie').split(';')[0];
}
const emailOf = (name, domain) => `${name.replace(/\W/g, '').toLowerCase()}@${domain}`;
// Fills the sign-in page and waits to be back where we started.
async function signInUi(p, name, email, shotName) {
  await p.waitForSelector('#form');
  await p.waitForTimeout(400);
  if (shotName) await shot(p, shotName);
  await p.fill('#name', name);
  await p.fill('#email', email);
  await p.click('#go');
  await p.waitForURL((u) => !u.pathname.startsWith('/login'));
}

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
  const Cookie = await cookieFor(name, emailOf(name, 'guest.test'));
  const r = await fetch(`${BASE}/api/message?slug=${slug}&name=${encodeURIComponent(name)}&consent=1`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Cookie }, body: wav() });
  const m = await r.json();
  await fetch(`${BASE}/api/message`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie }, body: JSON.stringify({ slug, id: m.id, text }) });
}

const CASES = {
  birthday: { recipient: 'Dimas', swatch: 9, friends: [['Budi', 'Dimas! Selamat ulang tahun, sukses terus bro!'], ['Mama', 'Selamat ulang tahun, Nak. Mama bangga sama kamu.'], ['Ayu', 'Happy birthday Dimas, traktir ya!']] },
  graduation: { recipient: 'Nadia', swatch: 6, friends: [['Pak Hadi', 'Selamat, Nadia. Revisinya memang banyak, tapi hasilnya bagus.'], ['Mama', 'Selamat wisuda, Nak!'], ['Rani', 'Nadia! Akhirnya S.Kom, traktir!']] },
  wedding: { recipient: 'Rina & Bayu', swatch: 6, extraGuests: 12, friends: [['Ibu Wati', 'Rina, anak Ibu, selamat menempuh hidup baru.'], ['Pak Joko', 'Selamat ya Bayu dan Rina, langgeng terus.']] }
};

async function runGift(occasion, c) {
  const P = (n) => `${occasion}-${n}`;
  const ORG = ['Sari', 'sari@organizer.test'];
  const RCP = [c.recipient, `${occasion}@recipient.test`];
  // sign in, then create
  const p = await page();
  await p.goto(`${BASE}/new`);
  await signInUi(p, ...ORG, P('00-signin-create'));
  await p.waitForSelector('#recipient');
  await p.click(`#occasions [data-v="${occasion}"]`);
  await p.fill('#recipient', c.recipient);
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

  // friends sign in and record (the first one through the sign-in page)
  for (const [k, [name, text]] of c.friends.entries()) {
    const email = emailOf(name, 'friend.test');
    const f = k === 0 ? await page() : await signedIn(name, email);
    await f.goto(`${BASE}/g/${slug}`);
    if (k === 0) await signInUi(f, name, email, P('04a-signin-friend'));
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
  const friendCookie = await cookieFor('Budi', 'budi@friend.test');
  const peekCtx = await browser.newContext(phone); // its 403 is expected, so no error listener
  await peekCtx.request.post(`${BASE}/api/auth`, { data: { name: 'Budi', email: 'budi@friend.test' } });
  const peek = await peekCtx.newPage();
  await peek.goto(`${BASE}/r/${slug}`);
  await peek.waitForSelector('[data-screen="error"]:not([hidden])');
  await shot(peek, P('08-no-key'));
  await peekCtx.close();
  for (const [u, Cookie, want] of [[`/api/reveal?slug=${slug}`, '', 401], [`/api/reveal?slug=${slug}`, friendCookie, 403], [`/api/reveal?slug=${slug}&k=guess`, friendCookie, 403]]) {
    const st = (await fetch(BASE + u, { headers: { Cookie } })).status;
    if (st !== want) errors.push(`${u}: ${st}, expected ${want}`);
  }

  // dashboard + demo voices (only the organizer's account)
  const m = await signedIn(...ORG);
  await m.goto(BASE + manageHref);
  await m.waitForSelector('[data-screen="main"]:not([hidden])');
  await m.waitForTimeout(500);
  await shot(m, P('09-dashboard'), true);
  const anon = await fetch(`${BASE}/api/manage?slug=${slug}`);
  const other = await fetch(`${BASE}/api/manage?slug=${slug}`, { headers: { Cookie: friendCookie } });
  if (anon.status !== 401 || other.status !== 403) errors.push(`dashboard for others: ${anon.status}/${other.status}`);
  const before = c.friends.length + (c.extraGuests || 0);
  await m.click('#addDemo');
  await m.waitForFunction((n) => document.querySelectorAll('#list .item').length === n, before + 12, { timeout: 30000 });
  await m.waitForSelector('#demoCard', { state: 'hidden' });
  await shot(m, P('10-dashboard-demo'), true);
  const recipientLink = await m.getAttribute('#openReveal', 'href');
  // the organizer's preview doesn't claim the gift
  await m.goto(recipientLink);
  await m.waitForSelector('text=Open your gift');
  await shot(m, P('10b-preview'));

  // recipient signs in through the link from the dashboard → the gift becomes theirs
  const r = await page();
  await r.goto(recipientLink);
  await signInUi(r, ...RCP, P('11a-signin-recipient'));
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
  // it's in their account, and opens without the key
  await r.goto(`${BASE}/me`);
  await r.waitForSelector('#received:not([hidden]) .item');
  await shot(r, P('19-my-gifts-recipient'));
  await r.goto(`${BASE}/r/${slug}`);
  await r.waitForSelector('text=Open your gift');
  await r.context().close();

  // the same link, forwarded to someone else: no access
  const leakCtx = await browser.newContext(phone);
  await leakCtx.request.post(`${BASE}/api/auth`, { data: { name: 'Stranger', email: 'stranger@leak.test' } });
  const leak = await leakCtx.newPage();
  await leak.goto(recipientLink);
  await leak.waitForSelector('[data-screen="error"]:not([hidden])');
  await shot(leak, P('20-forwarded-link'));
  await leakCtx.close();

  // the organizer sees who opened it; their list shows it too
  await m.goto(BASE + manageHref);
  await m.waitForSelector('text=opened it');
  await shot(m, P('21-dashboard-opened'), true);
  await m.goto(`${BASE}/me`);
  await m.waitForSelector('#made .item');
  await shot(m, P('22-my-gifts-organizer'), true);
  await m.context().close();

  const rCookie = await cookieFor(...RCP);
  const rev = await (await fetch(`${BASE}/api/reveal?slug=${slug}`, { headers: { Cookie: rCookie } })).json();
  // the organizer never hears a friend: their preview has the demo voices only
  const oCookie = await cookieFor(...ORG);
  const own = await (await fetch(`${BASE}/api/reveal?slug=${slug}`, { headers: { Cookie: oCookie } })).json();
  if (own.messages.length !== 12) errors.push(`${occasion}: organizer preview has ${own.messages.length} messages, expected the 12 demo voices`);
  const real = rev.messages.find((x) => !own.messages.some((o) => o.id === x.id));
  const st = (await fetch(`${BASE}/api/audio?slug=${slug}&id=${real.id}`, { headers: { Cookie: oCookie } })).status;
  if (st !== 403) errors.push(`${occasion}: organizer got a friend's audio: ${st}`);
  console.log(occasion, 'messages', rev.messages.length, rev.messages.slice(0, 3).map((x) => `${x.sender}: ${x.text} (${x.durationSec}s)`));
  return { link: recipientLink, recipient: RCP };
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
const firstGift = Object.values(slugs)[0];
await d.context().request.post(`${BASE}/api/auth`, { data: { name: firstGift.recipient[0], email: firstGift.recipient[1] } });
await d.goto(firstGift.link);
await d.waitForSelector('text=Open your gift');
await shot(d, 'desktop-ready');

console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
