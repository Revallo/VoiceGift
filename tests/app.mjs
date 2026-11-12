// End-to-end test of the app shell, in Chromium with a fake microphone: the bar at the bottom, the Record tab
// (record first, choose the gift after), the two home pages (first time / after using it) and following.
// The gift flow itself is in e2e.mjs. Same setup:  npm i --no-save playwright && npx playwright install chromium
// Run:  npm run dev   (in another terminal), then   BASE=http://localhost:3000 node tests/app.mjs
// Screenshots go to tests/screenshots/app-*.png. It prints "ERRORS none" when everything passed.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = fileURLToPath(new URL('./screenshots/', import.meta.url));
fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const RUN = Date.now().toString(36);
const PASSWORD = 'candles at midnight';
const check = (ok, msg) => { if (!ok) errors.push(msg); };

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ['microphone'] });
const p = await ctx.newPage();
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
const shot = async (name) => {
  const wide = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (wide > 1) errors.push(`${name} scrolls sideways by ${wide}px`);
  await p.screenshot({ path: `${OUT}app-${name}.png` });
};

// The organizer and their gift, made through the API.
const json = (cookie) => ({ 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) });
const orgEmail = `sari.app.${RUN}@example.com`;
const signup = await fetch(`${BASE}/api/account`, { method: 'POST', headers: json(), body: JSON.stringify({ action: 'signup', name: 'Sari', email: orgEmail, password: PASSWORD }) });
const orgCookie = signup.headers.get('set-cookie').split(';')[0];
const made = await (await fetch(`${BASE}/api/gifts`, { method: 'POST', headers: json(orgCookie), body: JSON.stringify({ recipient: 'Dimas', organizer: 'Sari', occasion: 'birthday', verifyPin: '4821', cake: {} }) })).json();
check(made.slug, 'the gift was not made: ' + JSON.stringify(made));
const { slug } = made;

// A friend signs up. First time: the three gifts and "What would you like to do?", with the bar at the bottom.
await p.goto(`${BASE}/signup`);
await p.fill('#acName', 'Budi');
await p.fill('#acEmail', `budi.app.${RUN}@example.com`);
await p.fill('#acPass', PASSWORD);
await p.click('#authBox button[type="submit"]');
await p.waitForSelector('[data-screen="home"]:not([hidden])');
check(await p.isVisible('#homeFirst'), 'a new account does not get the first-time home page');
check(!(await p.isVisible('#homeBack')), 'a new account already sees the "after" home page');
check((await p.$$('.tabbar .tab')).length === 3, 'the bar at the bottom does not have 3 tabs');
await p.waitForTimeout(500);
await shot('01-home-first');

// Opening the friends' link is the invitation; then the Record tab: record first, choose after.
await p.goto(`${BASE}/g/${slug}`);
await p.waitForSelector('[data-screen="invite"]:not([hidden])');
await p.goto(`${BASE}/`);
await p.click('.tabbar a[href="/record"]');
await p.waitForSelector('[data-screen="ready"]:not([hidden])');
await shot('02-record-tab');
await p.click('#startBtn');
await p.waitForSelector('[data-screen="record"]:not([hidden])');
check(!(await p.$('.tabbar')), 'the bar is still there while recording');
await p.waitForTimeout(2600);
await p.click('#stopBtn');
await p.waitForSelector('[data-screen="pick"]:not([hidden])');
await p.waitForSelector(`#invites a[href="/g/${slug}?draft=1"]`);
await p.waitForTimeout(300);
await shot('03-who-is-it-for');
const before = await (await fetch(`${BASE}/api/gift?slug=${slug}`)).json();
check(before.count === 0, `a voice reached the server before a gift was chosen (${before.count})`);
// the recording survives leaving the page
await p.goto(`${BASE}/`);
await p.goto(`${BASE}/record`);
await p.waitForSelector('[data-screen="pick"]:not([hidden])');
await p.click(`#invites a[href="/g/${slug}?draft=1"]`);
await p.waitForSelector('[data-screen="invite"]:not([hidden])');
check((await p.textContent('#startBtn')).trim() === 'Add my voice', 'the gift page did not pick up the recording');
await p.click('#startBtn'); // no consent yet: nothing may be sent
await p.waitForSelector('#inviteError:not([hidden])');
await shot('04-add-my-voice');
await p.check('#consent');
await p.click('#startBtn');
await p.waitForSelector('[data-screen="caption"]:not([hidden])', { timeout: 15000 });
await p.fill('#captionText', 'Dimas! Selamat ulang tahun, sukses terus bro!');
await p.click('#sendBtn');
await p.waitForSelector('[data-screen="done"]:not([hidden])', { timeout: 15000 });
const after = await (await fetch(`${BASE}/api/gift?slug=${slug}`)).json();
check(after.count === 1, `the gift has ${after.count} voices, expected 1`);
await p.goto(`${BASE}/record`);
await p.waitForSelector('[data-screen="ready"]:not([hidden])'); // the draft is gone once it is sent

// Home, now that they've used it: one voice sent today, nothing waiting, friends to find.
await p.goto(`${BASE}/`);
await p.waitForSelector('[data-screen="home"]:not([hidden])');
check(await p.isVisible('#homeBack'), 'after sending a voice the home page is still the first-time one');
check((await p.textContent('#sentToday')).trim() === '1', `"sent today" says ${await p.textContent('#sentToday')}`);
check(!(await p.isVisible('#waitingBox')), 'the gift is still "waiting for your voice" after recording for it');

// Follow the organizer, found by her email. Nobody's email or id is ever sent to someone else.
await p.click('#findFriends');
await p.fill('.bottom-sheet input[type="email"]', orgEmail);
await p.click('.bottom-sheet button[type="submit"]');
await p.waitForSelector('.bottom-sheet .who-row');
await p.waitForTimeout(300);
await shot('05-find-friends');
await p.click('.bottom-sheet .who-row .linkbtn >> nth=0');
await p.waitForSelector('#people .person:not(.add)');
await p.click('.sheet-close');
await p.waitForTimeout(400);
check((await p.textContent('#people .person:not(.add)')).includes('Sari'), 'the friend followed is not on the home page');
await shot('06-home-after');
const found = await (await ctx.request.get(`${BASE}/api/follow?find=${encodeURIComponent(orgEmail)}`)).text();
check(!found.includes('@') && !/"id"|passwordHash|ownerId/.test(found), 'a lookup leaks more than a public profile: ' + found);
const list = await (await ctx.request.get(`${BASE}/api/follow`)).text();
check(!list.includes('example.com') && !/"id"|passwordHash/.test(list), 'the following list leaks more than public profiles: ' + list);
check((await ctx.request.get(`${BASE}/api/follow?find=nobody.${RUN}@example.com`)).status() === 404, 'an unknown email is not a 404');
check((await fetch(`${BASE}/api/follow`)).status === 401, 'following works logged out');

// Following opens nothing: no key, no PIN, no voices.
const openKey = made.openKey;
for (const u of [`/api/reveal?slug=${slug}`, `/api/reveal?slug=${slug}&pin=4821`, `/api/reveal?slug=${slug}&k=${openKey}`]) {
  const st = (await ctx.request.get(BASE + u)).status();
  check(st === 403, `${u} as a follower: ${st}, expected 403`);
}

// The organizer sees Budi among the people she knows from her gift; her profile link shows who she is.
const org = await (await fetch(`${BASE}/api/follow`, { headers: { Cookie: orgCookie } })).json();
check(org.suggestions?.some((s) => s.name === 'Budi'), 'the organizer is not offered the friend who recorded: ' + JSON.stringify(org.suggestions));
await p.goto(`${BASE}/u/${org.me.handle}`);
await p.waitForSelector('[data-screen="profile"]:not([hidden])');
check((await p.textContent('#name')).trim() === 'Sari', 'the profile link does not show the name');
check((await p.textContent('#followBox')).trim() === 'Following', 'the profile link does not say "Following"');
await shot('07-profile-link');
// tapping her on the home page: a gift for her, with her name filled in
await p.goto(`${BASE}/`);
await p.click('#people .person:not(.add)');
await p.click('.bottom-sheet a.btn');
await p.waitForSelector('#recipient');
check((await p.inputValue('#recipient')) === 'Sari', `"Make a gift for Sari" filled in ${await p.inputValue('#recipient')}`);

// Profile tab
await p.goto(`${BASE}/`);
await p.click('.tabbar a[href="/account"]');
await p.waitForSelector('[data-screen="me"]:not([hidden])');
check((await p.getAttribute('.tabbar .tab.on', 'href')) === '/account', 'the Profile tab is not marked as the current one');

await browser.close();
console.log('ERRORS', errors.length ? errors : 'none');
