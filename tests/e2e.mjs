// End-to-end test: walks the whole product in Chromium with a fake microphone, for every occasion
// (create → decorate → sign up → friends sign up + record → dashboard → 12 demo voices → recipient link → log in → PIN →
// reveal → finale → keepsake → thank everyone → the friend sees it at home, then log in / account page / log out, plus desktop).
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
const RUN = Date.now().toString(36); // a new organizer account per run
const PASSWORD = 'candles at midnight';
const emailFor = (occasion) => `sari.${occasion}.${RUN}@example.com`;

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ['microphone'] };

async function page(ctxOpts = phone, expected) { // expected: a regex for console errors the test causes on purpose
  const ctx = await browser.newContext(ctxOpts);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource: net::ERR/.test(m.text()) && !expected?.test(m.text())) errors.push('console: ' + m.text()); });
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
let guestCookie; // recording needs an account: every API guest shares this one
async function apiGuest(slug, name, text) {
  guestCookie ||= (await fetch(`${BASE}/api/account`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'signup', name: 'Tamu', email: `tamu.${RUN}@example.com`, password: PASSWORD }) })).headers.get('set-cookie').split(';')[0];
  const r = await fetch(`${BASE}/api/message?slug=${slug}&name=${encodeURIComponent(name)}&consent=1`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Cookie: guestCookie }, body: wav() });
  const m = await r.json();
  await fetch(`${BASE}/api/message`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, id: m.id, token: m.token, text }) });
}

// Friends and the recipient arrive logged out: their link asks for an account, then comes straight back.
async function signUpHere(p, name, email) {
  await p.waitForSelector('[data-screen="auth"]:not([hidden])');
  if (new URL(p.url()).pathname !== '/signup') errors.push(`logged-out link went to ${p.url()}`);
  await p.fill('#acName', name);
  await p.fill('#acEmail', email);
  await p.fill('#acPass', PASSWORD);
  await p.click('#authBox button[type="submit"]');
}

const CASES = {
  birthday: { recipient: 'Dimas', swatch: 9, shape: 'tower', friends: [['Budi', 'Dimas! Selamat ulang tahun, sukses terus bro!'], ['Mama', 'Selamat ulang tahun, Nak. Mama bangga sama kamu.'], ['Ayu', 'Happy birthday Dimas, traktir ya!']] },
  graduation: { recipient: 'Nadia', swatch: 6, shape: 'basket', friends: [['Pak Hadi', 'Selamat, Nadia. Revisinya memang banyak, tapi hasilnya bagus.'], ['Mama', 'Selamat wisuda, Nak!'], ['Rani', 'Nadia! Akhirnya S.Kom, traktir!']] },
  wedding: { recipient: 'Rina & Bayu', swatch: 6, shape: 'heart', extraGuests: 12, friends: [['Ibu Wati', 'Rina, anak Ibu, selamat menempuh hidup baru.'], ['Pak Joko', 'Selamat ya Bayu dan Rina, langgeng terus.']] }
};

async function runGift(occasion, c) {
  const P = (n) => `${occasion}-${n}`;
  // create
  const p = await page();
  // logged out, "/new" sends you to log in first; create an account there, then you're back on "/new"
  await p.goto(`${BASE}/new`);
  await p.waitForSelector('[data-screen="auth"]:not([hidden])');
  if (!/^\/login\?next=/.test(new URL(p.url()).pathname + new URL(p.url()).search)) errors.push(`${occasion}: logged-out /new went to ${p.url()}`);
  await p.click('.auth-tab >> text=create account');
  await p.fill('#acName', 'Sari');
  await p.fill('#acEmail', emailFor(occasion));
  await p.fill('#acPass', PASSWORD);
  await p.waitForTimeout(400);
  await shot(p, P('00-signup'));
  await p.click('#authBox button[type="submit"]');
  await p.waitForURL(/\/new$/);
  await p.waitForSelector('#recipient');
  await p.click(`#occasions [data-v="${occasion}"]`);
  await p.fill('#recipient', c.recipient);
  await p.fill('#organizer', 'Sari');
  await shot(p, P('01-create-who'));
  await p.click('#nextBtn');
  await p.waitForSelector('[data-screen="decorate"]:not([hidden])');
  await p.click(`#shapes [data-v="${c.shape}"]`); // the kind of cake / bouquet / lanterns
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
  // "Create" opens the gift's one page: the gift, invite friends, who recorded, send it
  await p.waitForURL(/\/m\/.+\?k=/);
  await p.waitForSelector('[data-screen="main"]:not([hidden])');
  await p.waitForTimeout(400);
  await shot(p, P('03-dashboard-new'), true);
  // "Edit design": add a sticker, save, back on the gift's page
  await p.click('#editDesignLink');
  await p.waitForSelector('[data-screen="decorate"]:not([hidden])');
  if ((await p.textContent('#createBtn')).trim() !== 'Save changes') errors.push(`${occasion}: no "Save changes" when editing`);
  await p.click('#stickerTray .sticker-btn >> nth=2');
  await p.click('#createBtn');
  await p.waitForURL(/\/m\/.+\?k=/);
  await p.waitForSelector('[data-screen="main"]:not([hidden])');
  const friendLink = 'http://' + (await p.textContent('#friendLink'));
  const manageHref = new URL(p.url()).pathname + new URL(p.url()).search;
  const slug = friendLink.split('/g/')[1];
  console.log(occasion, 'slug', slug, 'manage', manageHref);
  const shape = (await (await fetch(`${BASE}/api/gift?slug=${slug}`)).json()).gift?.cake?.shape;
  if (shape !== c.shape) errors.push(`${occasion}: saved shape is ${shape}, expected ${c.shape}`);
  await p.context().close();

  // friends record
  for (const [k, [name, text]] of c.friends.entries()) {
    const f = await page();
    await f.goto(`${BASE}/g/${slug}`);
    await signUpHere(f, name, `friend.${occasion}.${k}.${RUN}@example.com`);
    await f.waitForSelector('[data-screen="invite"]:not([hidden])');
    if ((await f.inputValue('#name')) !== name) errors.push(`${occasion}: the friend's name wasn't filled in: ${await f.inputValue('#name')}`);
    await f.waitForTimeout(400);
    if (k === 0) await shot(f, P('04-invite'));
    if (k === 1) await f.fill('#name', `${name} Sayang`); // the name can still be changed
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
    if (st !== 401) errors.push(`${u} logged out: ${st}, expected 401`);
  }
  const anon = (await fetch(`${BASE}/api/message?slug=${slug}&name=X&consent=1`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: wav() })).status;
  if (anon !== 401) errors.push(`recording while logged out: ${anon}, expected 401`);

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
  await m.waitForFunction((n) => document.querySelectorAll('#list .who-row').length === n, before + 12, { timeout: 30000 });
  await m.waitForSelector('#addDemo', { state: 'hidden' });
  await shot(m, P('10-dashboard-demo'), true);
  const recipientLink = await m.getAttribute('#openReveal', 'href');
  await m.context().close();

  // recipient reveal (the link from the dashboard)
  const r = await page(phone, /status of 403/); // the wrong PIN below
  await r.goto(recipientLink);
  await signUpHere(r, c.recipient, `recipient.${occasion}.${RUN}@example.com`);
  await r.waitForSelector('[data-screen="verify"]:not([hidden])'); // the link → log in → the 4-digit PIN
  await shot(r, P('10b-pin'));
  // without the PIN, even with the recipient's key: no voices
  const k = new URL(recipientLink).searchParams.get('k');
  for (const u of [`/api/reveal?slug=${slug}&k=${k}`, `/api/reveal?slug=${slug}&k=${k}&pin=0000`, `/api/reveal?slug=${slug}&pin=1234`]) {
    const st = (await r.context().request.get(BASE + u)).status();
    if (st !== 403) errors.push(`${u}: ${st}, expected 403`);
  }
  const logoutSt = (await fetch(`${BASE}/api/reveal?slug=${slug}&k=${k}&pin=1234`)).status;
  if (logoutSt !== 401) errors.push(`right key + PIN while logged out: ${logoutSt}, expected 401`);
  if (await r.$('#verifySubmitBtn')) errors.push('the PIN page still has a button');
  await r.click('.pin-digit >> nth=0');
  await r.keyboard.type('0000'); // wrong: the boxes empty again
  await r.waitForSelector('#verifyError:not([hidden])');
  await r.keyboard.type('1234'); // the 4th digit opens it
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
  if (occasion === 'wedding') { // many guests: the list scrolls and the buttons stay
    const sc = await r.$eval('.friends', (e) => { e.scrollTop = 60; const t = e.scrollTop; e.scrollTop = 0; return t; });
    if (sc <= 0) errors.push('the list of 26 guests does not scroll');
  }
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
  await r.click('text=Thank everyone');
  await r.waitForSelector('.bottom-sheet textarea');
  await r.waitForTimeout(350);
  await shot(r, P('17a-thanks'));
  await r.click('text=Send to everyone');
  await r.waitForSelector('text=Thank-you sent');
  if (await r.$('.names .more')) {
    await r.click('.names .more');
    await shot(r, P('17b-keepsake-all'), true);
  }
  await r.click('text=Listen again');
  await r.waitForTimeout(800);
  await shot(r, P('18-listen-again'));
  const rev = await (await r.context().request.get(`${BASE}/api/reveal?slug=${slug}&k=${k}&pin=1234`)).json();
  if (!rev.thanked) errors.push(`${occasion}: the thank-you was not saved`);
  await r.context().close();

  // the friend's next login: the thank-you is on their home page, "New" only the first time
  const t = await page();
  await t.goto(`${BASE}/`);
  await t.waitForSelector('[data-screen="auth"]:not([hidden])');
  await t.fill('#acEmail', `friend.${occasion}.0.${RUN}@example.com`);
  await t.fill('#acPass', PASSWORD);
  await t.click('#authBox button[type="submit"]');
  await t.waitForSelector('.thanks-card.new');
  await t.waitForTimeout(600);
  await shot(t, P('19-home-thanks'));
  await t.reload();
  await t.waitForSelector('.thanks-card');
  if (await t.$('.thanks-card.new')) errors.push(`${occasion}: the thank-you is still new after being seen`);
  await t.context().close();

  console.log(occasion, 'messages', rev.messages.length, rev.messages.slice(0, 3).map((x) => `${x.sender}: ${x.text} (${x.durationSec}s)`));
  return recipientLink;
}

// Accounts: no gift without one; the organizer logs in on another phone, finds the gift, is recognized on a
// friends' page, logs out; an email can't sign up twice.
async function accountFlow(occasion, recipientLink) {
  const slug = new URL(recipientLink).pathname.split('/')[2];
  const email = emailFor(occasion);
  const st = (await fetch(`${BASE}/api/gifts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient: 'X', organizer: 'Y' }) })).status;
  if (st !== 401) errors.push(`creating a gift without an account: ${st}`);

  const a = await page(phone, /status of (401|409)/); // the wrong password and the taken email
  await a.goto(`${BASE}/`); // the home page needs an account: logged out it goes to log in
  await a.waitForSelector('[data-screen="auth"]:not([hidden])');
  if (new URL(a.url()).pathname !== '/login') errors.push('"Log in" went to ' + a.url());
  await a.fill('#acEmail', email);
  await a.fill('#acPass', 'not the password');
  await a.click('#authBox button[type="submit"]');
  await a.waitForSelector('#authBox .err:not([hidden])');
  await a.waitForTimeout(400);
  await shot(a, 'account-01-login-wrong');
  await a.fill('#acPass', PASSWORD);
  await a.click('#authBox button[type="submit"]');
  await a.waitForSelector('[data-screen="home"]:not([hidden])'); // logged in → the home page: make a gift / open your gift
  await shot(a, 'account-01b-home');
  await a.click('#openToggle');
  await a.fill('#openLink', recipientLink);
  await a.click('#openForm button[type="submit"]');
  await a.waitForURL(/\/r\/.+\?k=/); // pasting the link opens the gift's PIN page
  await a.goto(`${BASE}/`);
  await a.click('#profileLink');
  await a.waitForSelector(`#gifts a[href^="/m/${slug}?k="]`);
  await a.waitForTimeout(400);
  await shot(a, 'account-02-me', true);

  await a.goto(`${BASE}/g/${slug}`);
  await a.waitForSelector('#signedIn:not([hidden])');
  if ((await a.inputValue('#name')) !== 'Sari') errors.push(`friends' page name for a logged-in organizer: ${await a.inputValue('#name')}`);
  await a.waitForTimeout(400);
  await shot(a, 'account-03-friend-page');
  await a.goto(`${BASE}/new`);
  await a.click('[data-screen="who"] a[aria-label="Profile"]');
  await a.waitForSelector('[data-screen="me"]:not([hidden])');
  await a.click('#logout');
  await a.waitForSelector('[data-screen="auth"]:not([hidden])');
  if (new URL(a.url()).pathname !== '/login') errors.push('after logging out the address is ' + a.url());

  await a.goto(`${BASE}/signup`);
  await a.fill('#acName', 'Someone else');
  await a.fill('#acEmail', email);
  await a.fill('#acPass', 'another password');
  await a.click('#authBox button[type="submit"]');
  await a.waitForSelector('#authBox .err:not([hidden])');
  if (!/already an account/.test(await a.textContent('#authBox .err'))) errors.push('signing up twice: ' + (await a.textContent('#authBox .err')));
  await shot(a, 'account-05-signup-taken');
  await a.context().close();
}

const only = process.argv[2];
const slugs = {};
for (const [occasion, c] of Object.entries(CASES)) if (!only || only === occasion) slugs[occasion] = await runGift(occasion, c);
await accountFlow(...Object.entries(slugs)[0]);

// the picker: pick what to make → "Yes" → log in (in that occasion's colors) + desktop
const l = await page();
await l.goto(BASE + '/start');
for (const o of ['birthday', 'graduation', 'wedding']) {
  await l.click(`.pick[data-v="${o}"]`);
  await l.waitForTimeout(2400);
  await shot(l, `pick-${o}`);
}
await l.click('#goBtn');
await l.waitForSelector('[data-screen="auth"]:not([hidden])');
if ((await l.evaluate(() => document.body.dataset.theme)) !== 'wedding') errors.push('the login page lost the picked colors');
if (!/occasion%3Dwedding/.test(l.url())) errors.push('"Yes" went to ' + l.url());
await l.waitForTimeout(500);
await shot(l, 'login-wedding');
const d = await page({ viewport: { width: 1280, height: 860 }, permissions: ['microphone'] });
await d.goto(BASE + '/start');
await d.waitForTimeout(2400);
await shot(d, 'desktop-pick');
await d.goto(Object.values(slugs)[0]);
await signUpHere(d, 'Dimas', `desktop.${RUN}@example.com`);
await d.waitForSelector('[data-screen="verify"]:not([hidden])');
await d.click('.pin-digit >> nth=0');
await d.keyboard.type('1234');
await d.waitForSelector('text=Open your gift');
await shot(d, 'desktop-ready');

console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
