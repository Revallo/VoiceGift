// End-to-end test: walks the whole product in Chromium with a fake microphone, for every occasion
// (create → decorate → sign up → friends sign up + record → dashboard → recipient link → log in → PIN →
// reveal → finale → keepsake → thank everyone → the friend sees it at home, then log in / account page / log out, plus desktop),
// then the limits. Logging in is Google only; the test uses the local stand-in, so start the server with DEV_LOGIN=1.
// One-time setup:  npm i --no-save playwright && npx playwright install chromium
// Run:             DEV_LOGIN=1 npm run dev   (in another terminal; PowerShell: $env:DEV_LOGIN=1; npm run dev)
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
const pins = {}; // recipient link → PIN (each gift gets its own)
const RUN = Date.now().toString(36); // a new organizer account per run
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
const post = (body, cookie) => fetch(`${BASE}/api/account`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) }, body: JSON.stringify(body) });
const cookieOf = (res) => res.headers.get('set-cookie')?.split(';')[0];

// An account through the API (the dev login stands in for Google): its session cookie.
async function apiAccount(name, email) {
  const res = await post({ action: 'dev-login', name, email });
  if (res.status !== 200) errors.push(`dev login ${email}: ${res.status} (is the server running with DEV_LOGIN=1?)`);
  return cookieOf(res);
}

// Guests added straight through the API: one account each (one account can send only a few voices to a gift).
async function apiGuest(slug, name, text) {
  const cookie = await apiAccount(name, `tamu.${slug}.${name.replace(/\W/g, '')}.${RUN}@example.com`.toLowerCase());
  const r = await fetch(`${BASE}/api/message?slug=${slug}&name=${encodeURIComponent(name)}&consent=1`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Cookie: cookie }, body: wav() });
  const m = await r.json();
  await fetch(`${BASE}/api/message`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, id: m.id, token: m.token, text }) });
}

// The login box: the dev login stands in for "Continue with Google".
async function logInHere(p, name, email) {
  await p.waitForSelector('#devLoginBtn');
  await p.fill('#devName', name);
  await p.fill('#devEmail', email);
  await p.click('#devLoginBtn');
}

// Friends and the recipient arrive logged out: their link asks them to log in, then comes straight back.
async function signUpHere(p, name, email, shotName) {
  await p.waitForSelector('[data-screen="auth"]:not([hidden])');
  if (new URL(p.url()).pathname !== '/signup') errors.push(`logged-out link went to ${p.url()}`);
  if (shotName) { await p.waitForSelector('#devLoginBtn'); await shot(p, shotName); }
  await logInHere(p, name, email);
}

const CASES = {
  birthday: { recipient: 'Dimas', swatch: 9, shape: 'tower', friends: [['Budi', 'Dimas! Selamat ulang tahun, sukses terus bro!'], ['Mama', 'Selamat ulang tahun, Nak. Mama bangga sama kamu.'], ['Ayu', 'Happy birthday Dimas, traktir ya!']] },
  graduation: { recipient: 'Nadia', swatch: 6, shape: 'basket', friends: [['Pak Hadi', 'Selamat, Nadia. Revisinya memang banyak, tapi hasilnya bagus.'], ['Mama', 'Selamat wisuda, Nak!'], ['Rani', 'Nadia! Akhirnya S.Kom, traktir!']] },
  wedding: { recipient: 'Rina & Bayu', swatch: 6, shape: 'heart', extraGuests: 24, friends: [['Ibu Wati', 'Rina, anak Ibu, selamat menempuh hidup baru.'], ['Pak Joko', 'Selamat ya Bayu dan Rina, langgeng terus.']] }
};

async function runGift(occasion, c) {
  const P = (n) => `${occasion}-${n}`;
  // create
  const p = await page();
  // logged out, "/new" sends you to log in first; create an account there, then you're back on "/new"
  await p.goto(`${BASE}/new`);
  await p.waitForSelector('[data-screen="auth"]:not([hidden])');
  if (!/^\/login\?next=/.test(new URL(p.url()).pathname + new URL(p.url()).search)) errors.push(`${occasion}: logged-out /new went to ${p.url()}`);
  await p.waitForSelector('#devLoginBtn');
  await p.waitForTimeout(400);
  await shot(p, P('00-signup'));
  await logInHere(p, 'Sari', emailFor(occasion));
  await p.waitForURL(/\/new$/);
  await p.waitForSelector('#recipient');
  await p.click(`#occasions [data-v="${occasion}"]`);
  await p.fill('#recipient', c.recipient);
  await p.fill('#organizer', 'Sari');
  await shot(p, P('01-create-who'));
  await p.click('#nextBtn');
  await p.waitForSelector('[data-screen="decorate"]:not([hidden])');
  // the kind of cake / bouquet / lanterns: swiping the big gift changes it, the strip of pictures picks one
  await p.waitForTimeout(300);
  const kind0 = await p.getAttribute('#kinds .on', 'data-v');
  const sb0 = await (await p.$('#decorCake')).boundingBox();
  await p.mouse.move(sb0.x + sb0.width * 0.8, sb0.y + 60);
  await p.mouse.down();
  await p.mouse.move(sb0.x + sb0.width * 0.2, sb0.y + 60, { steps: 4 });
  await p.mouse.up();
  if ((await p.getAttribute('#kinds .on', 'data-v')) === kind0) errors.push(`${occasion}: swiping the gift did not change its kind`);
  const lastKind = await p.$eval('#kinds', (b) => b.lastElementChild.dataset.v);
  await p.click(`#kinds [data-v="${lastKind}"]`);
  await p.waitForTimeout(500);
  const kindsScroll = await p.$eval('#kinds', (b) => b.scrollLeft);
  if (!kindsScroll) errors.push(`${occasion}: the strip jumped back to the start after picking the last kind`);
  await p.click(`#kinds [data-v="${c.shape}"]`);
  if ((await p.getAttribute('#kinds .on', 'data-v')) !== c.shape) errors.push(`${occasion}: tapping a kind did not pick it`);
  // a strip picks whatever stops in the middle
  const flavor = await p.$eval(`#flavors > :nth-child(${c.swatch + 1})`, (el) => { el.parentElement.scrollLeft = el.offsetLeft - (el.parentElement.clientWidth - el.offsetWidth) / 2; return el.dataset.v; });
  await p.waitForTimeout(400);
  if ((await p.getAttribute('#flavors .on', 'data-v')) !== flavor) errors.push(`${occasion}: sliding the strip did not pick ${flavor}`);
  const hit = await p.$('.draw-hit');
  if (hit) {
    await p.click('#sketchToggle');
    await p.click('[aria-label="Brush color 2"]');
    await p.waitForTimeout(400);
    const b = await hit.boundingBox();
    await p.mouse.move(b.x + 40, b.y + b.height - 40);
    await p.mouse.down();
    for (let i = 0; i < 20; i++) await p.mouse.move(b.x + 40 + i * 3, b.y + b.height - 40 - Math.sin(i / 3) * 12);
    await p.mouse.up();
    await p.click('#sketchToggle');
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
  // "No music" is the default: pressing play goes to a real tune and plays it
  await p.click('#musicPlay');
  await p.waitForFunction(() => document.querySelector('#tunes .on')?.dataset.v === 'party');
  await p.waitForTimeout(200);
  if (!(await p.$eval('#musicPlay', (b) => b.innerHTML.includes('rect')))) errors.push(`${occasion}: pressing play did not start the music`);
  await p.click('#musicPlay');
  // the tools scroll on their own, so the gift stays on screen
  await p.$eval('#decorToolsCard', (c) => { c.scrollTop = c.scrollHeight; });
  if ((await (await p.$('#decorCake')).boundingBox()).y < 0) errors.push(`${occasion}: scrolling the tools moved the gift off screen`);
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
    await signUpHere(f, name, `friend.${occasion}.${k}.${RUN}@example.com`, k === 0 && P('03b-login'));
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
  await m.waitForFunction(() => document.querySelector('#recipientBox .linkbox'));
  await m.waitForTimeout(500);
  await shot(m, P('09-dashboard'), true);
  // the dashboard needs the organizer's key
  const noKey = await fetch(`${BASE}/api/manage?slug=${slug}`);
  const badKey = await fetch(`${BASE}/api/manage?slug=${slug}&key=guess`);
  if (noKey.status !== 403 || badKey.status !== 403) errors.push(`dashboard without key: ${noKey.status}/${badKey.status}`);
  if (await m.$('#addDemo, #openReveal')) errors.push('the dashboard still has demo voices or a preview');
  const recipientLink = 'http://' + (await m.textContent('#recipientBox .linkbox span'));
  const pin = await m.textContent('#pinVal');
  pins[recipientLink] = pin;
  await m.context().close();

  // recipient reveal (the link from the dashboard)
  const r = await page(phone, /status of 403/); // the wrong PIN below
  await r.goto(recipientLink);
  await signUpHere(r, c.recipient, `recipient.${occasion}.${RUN}@example.com`);
  await r.waitForSelector('[data-screen="verify"]:not([hidden])'); // the link → log in → the 4-digit PIN
  await shot(r, P('10b-pin'));
  // without the PIN, even with the recipient's key: no voices
  const k = new URL(recipientLink).searchParams.get('k');
  for (const u of [`/api/reveal?slug=${slug}&k=${k}`, `/api/reveal?slug=${slug}&k=${k}&pin=${pin === '0000' ? '1111' : '0000'}`, `/api/reveal?slug=${slug}&pin=${pin}`]) {
    const st = (await r.context().request.get(BASE + u)).status();
    if (st !== 403) errors.push(`${u}: ${st}, expected 403`);
  }
  const logoutSt = (await fetch(`${BASE}/api/reveal?slug=${slug}&k=${k}&pin=${pin}`)).status;
  if (logoutSt !== 401) errors.push(`right key + PIN while logged out: ${logoutSt}, expected 401`);
  if (await r.$('#verifySubmitBtn')) errors.push('the PIN page still has a button');
  await r.click('.pin-digit >> nth=0');
  await r.keyboard.type(pin === '0000' ? '1111' : '0000'); // wrong: the boxes empty again
  await r.waitForSelector('#verifyError:not([hidden])');
  await r.keyboard.type(pin); // the 4th digit opens it
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
  // thank everyone with one voice: record → check the words → send
  await r.click('text=Thank everyone');
  await r.waitForSelector('.bottom-sheet .thanks-opt');
  await r.waitForTimeout(350);
  await shot(r, P('17a-thanks'));
  // wedding (many guests): one by one from the list, the others get the note; the rest: one voice for everyone
  const oneByOne = occasion === 'wedding';
  if (oneByOne) {
    await r.click('text=One by one');
    await r.waitForSelector('.thanks-friend');
    await shot(r, P('17a-thanks-list'));
    await r.click('.thanks-friend >> nth=0');
  } else await r.click('text=One voice for everyone');
  await r.check('.bottom-sheet .check input');
  await r.click('#thanksMic');
  await r.waitForSelector('#thanksStop');
  await r.waitForTimeout(2200);
  await r.click('#thanksStop');
  await r.waitForSelector('#thanksWords', { timeout: 15000 });
  await shot(r, P('17a-thanks-words'));
  await r.fill('#thanksWords', 'Makasih banyak semuanya, aku terharu banget!');
  await r.click('#thanksSave');
  if (oneByOne) {
    await r.waitForSelector('.thanks-friend.done');
    await shot(r, P('17a-thanks-list-done'));
  }
  await r.click('#thanksSend');
  await r.waitForSelector('text=Thank-you sent');
  if (await r.$('.names .more')) {
    await r.click('.names .more');
    await shot(r, P('17b-keepsake-all'), true);
  }
  await r.click('text=Listen again');
  await r.waitForTimeout(800);
  await shot(r, P('18-listen-again'));
  const rev = await (await r.context().request.get(`${BASE}/api/reveal?slug=${slug}&k=${k}&pin=${pin}`)).json();
  if (!rev.thanked) errors.push(`${occasion}: the thank-you was not saved`);
  await r.context().close();

  // the friend's next login: the thank-you pops up once on home (with the voice), then waits in the Dashboard for 7 days
  const t = await page();
  await t.goto(`${BASE}/`);
  await t.waitForSelector('[data-screen="auth"]:not([hidden])');
  await logInHere(t, 'Budi', `friend.${occasion}.0.${RUN}@example.com`);
  await t.waitForSelector('.bottom-sheet .thanks-card.big');
  if (!(await t.$('.bottom-sheet .thanks-voice'))) errors.push(`${occasion}: the thank-you voice is missing`);
  await t.waitForTimeout(700);
  await shot(t, P('19-home-thanks'));
  await t.click('.bottom-sheet .btn');
  await t.waitForTimeout(600);
  await t.reload();
  await t.waitForSelector('[data-screen="home"]:not([hidden])');
  await t.waitForTimeout(800);
  if (await t.$('.bottom-sheet .thanks-card')) errors.push(`${occasion}: the thank-you popped up again after being seen`);
  await t.goto(`${BASE}/account`);
  await t.waitForSelector('#thanksArchive .thanks-card');
  if (!/disappears in 7 days/.test(await t.textContent('#thanksArchive'))) errors.push(`${occasion}: the archived thank-you has no 7-day note`);
  await shot(t, P('19b-dashboard-thanks'));
  await t.context().close();

  console.log(occasion, 'messages', rev.messages.length, rev.messages.slice(0, 3).map((x) => `${x.sender}: ${x.text} (${x.durationSec}s)`));
  return recipientLink;
}

// Accounts: no gift without one; the organizer logs in on another phone, finds the gift, is recognized on a
// friends' page, logs out.
async function accountFlow(occasion, recipientLink) {
  const slug = new URL(recipientLink).pathname.split('/')[2];
  const email = emailFor(occasion);
  const st = (await fetch(`${BASE}/api/gifts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient: 'X', organizer: 'Y' }) })).status;
  if (st !== 401) errors.push(`creating a gift without an account: ${st}`);

  const a = await page();
  await a.goto(`${BASE}/`); // the home page needs an account: logged out it goes to log in
  await a.waitForSelector('[data-screen="auth"]:not([hidden])');
  if (new URL(a.url()).pathname !== '/login') errors.push('"Log in" went to ' + a.url());
  await logInHere(a, 'Sari', email); // the same account on another phone
  await a.waitForSelector('[data-screen="home"]:not([hidden])'); // logged in → the home page: make a gift / open your gift
  const own = (await a.context().request.get(`${BASE}/api/reveal?slug=${slug}&k=${new URL(recipientLink).searchParams.get('k')}&pin=${pins[recipientLink]}`)).status();
  if (own !== 403) errors.push(`the organizer opening their own gift: ${own}, expected 403`);
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

  await a.context().close();
}

const only = process.argv[2];
const slugs = {};
for (const [occasion, c] of Object.entries(CASES)) if (!only || only === occasion) slugs[occasion] = await runGift(occasion, c);
await accountFlow(...Object.entries(slugs)[0]);

// a gift picked on the home page while logged out → log in (in that occasion's colors) + desktop
const l = await page();
await l.goto(BASE + '/new?occasion=wedding');
await l.waitForSelector('[data-screen="auth"]:not([hidden])');
if ((await l.evaluate(() => document.body.dataset.theme)) !== 'wedding') errors.push('the login page lost the picked colors');
if (!/occasion%3Dwedding/.test(l.url())) errors.push('logged-out /new went to ' + l.url());
await l.waitForTimeout(500);
await shot(l, 'login-wedding');
const d = await page({ viewport: { width: 1280, height: 860 }, permissions: ['microphone'] });
await d.goto(BASE + '/start');
await d.waitForTimeout(1500);
await shot(d, 'desktop-login');
await d.goto(Object.values(slugs)[0]);
await signUpHere(d, 'Dimas', `desktop.${RUN}@example.com`);
await d.waitForSelector('[data-screen="verify"]:not([hidden])');
await d.click('.pin-digit >> nth=0');
await d.keyboard.type(pins[Object.values(slugs)[0]]);
await d.waitForSelector('text=Open your gift');
await shot(d, 'desktop-ready');

// Limits, and only Google logs in (no more passwords).
async function limits(slug) {
  const cookie = await apiAccount('Late', `late.${RUN}@example.com`);
  let last;
  for (let i = 0; i < 4; i++) last = (await fetch(`${BASE}/api/message?slug=${slug}&name=Late&consent=1`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Cookie: cookie }, body: wav() })).status;
  if (last !== 429) errors.push(`a 4th voice from one account in one gift: ${last}, expected 429`);
  for (const action of ['signup', 'login', 'forgot']) {
    const st = (await post({ action, name: 'X', email: `x.${RUN}@example.com`, password: 'password123' })).status;
    if (st !== 400) errors.push(`the old "${action}" action: ${st}, expected 400`);
  }
  const fake = (await post({ action: 'google', credential: 'not.a.token' })).status;
  if (![401, 503].includes(fake)) errors.push(`a fake Google token: ${fake}, expected 401 or 503`);
}
await limits(Object.keys(slugs).length && new URL(Object.values(slugs)[0]).pathname.split('/')[2]);

console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
