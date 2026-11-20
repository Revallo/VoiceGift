// "povbaru": the same POV reel as promo/record.mjs, but the gift is a TUMPENG (every friend brings a side dish:
// satay, ketupat, lontong, fried chicken…) and the finale is cutting the top. See promo/povbaru/README.md.
// Reuses the 12 voices in promo/build/voices/ (promo/make-voices.py); writes only to promo/povbaru/build/.
//   PowerShell: $env:DEV_LOGIN=1; $env:PORT=3017; node --env-file-if-exists=.env dev.mjs
//   then:       $env:BASE="http://localhost:3017"; node promo/povbaru/record.mjs
// Out: promo/povbaru/build/screen/*.jpg (1170×2532) + timeline.json (each frame, each dish served, each voice,
// the taps, the cut, the confetti) + home/*.jpg (the /new page with the tumpeng, for the closing card).
// Playwright's recordVideo records CSS pixels only (390×844), so the frames come from Chromium's screencast instead.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');

const BASE = process.env.BASE || 'http://localhost:3017';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const BUILD = HERE + 'build/';
const VOICES = HERE + '../build/voices/'; // shared with the cake video, read only
fs.mkdirSync(BUILD + 'voices/', { recursive: true });
const data = JSON.parse(fs.readFileSync(HERE + '../voices.json', 'utf8'));
const RUN = Date.now().toString(36);
const PIN = '2411';

const json = (r) => r.json();
async function account(name) {
  const res = await fetch(`${BASE}/api/account`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'dev-login', name, email: `${name.toLowerCase().replace(/\W/g, '')}.${RUN}@example.com` }) });
  if (res.status !== 200) throw new Error(`dev login ${name}: ${res.status} (is the server running with DEV_LOGIN=1?)`);
  return res.headers.get('set-cookie').split(';')[0];
}

// ---- the gift, made through the API ----
const sari = await account(data.organizer);
const gift = await fetch(`${BASE}/api/gifts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: sari }, body: JSON.stringify({
  recipient: data.recipient, organizer: data.organizer, occasion: 'tumpeng', verifyPin: PIN,
  cake: { flavor: 'turmeric', shape: 'classic', font: 'script', name: data.recipient, accent: 'bamboo', pattern: 'egg', topper: 'chili',
    backdrop: 'night', music: 'musicbox', stickers: [['✨', 40, 60], ['🎈', 352, 30], ['⭐', 46, 170], ['💫', 336, 150]] }
}) }).then(json);
if (!gift.slug) throw new Error('gift: ' + JSON.stringify(gift));
// every friend's own dish (DISH_TYPES in item-options.js), in the order of voices.json: Bayu brings satay, Mama fried chicken
const dishes = ['ketupat', 'satay', 'lontong', 'egg', 'chicken', 'tempeh', 'perkedel', 'krupuk', 'urap', 'fish', 'sambal', 'tofu'];
for (const [i, v] of data.voices.entries()) {
  const cookie = v.name === data.organizer ? sari : await account(v.name);
  const wav = fs.readFileSync(`${VOICES}${String(i).padStart(2, '0')}.wav`);
  const m = await fetch(`${BASE}/api/message?slug=${gift.slug}&name=${encodeURIComponent(v.name)}&consent=1`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Cookie: cookie }, body: wav }).then(json);
  if (!m.id) throw new Error('message: ' + JSON.stringify(m));
  await fetch(`${BASE}/api/message`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: gift.slug, id: m.id, token: m.token, text: v.text, mood: v.mood, dish: { type: dishes[i % dishes.length] } }) });
}
const link = `${BASE}/r/${gift.slug}?k=${gift.openKey}`;
console.log('gift', link, 'PIN', PIN);

// ---- the recipient, recorded ----
const dimas = await account(data.recipient);
const browser = await chromium.launch({ args: ['--force-device-scale-factor=3', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, permissions: ['microphone']
});
await ctx.addCookies([{ name: dimas.split('=')[0], value: dimas.split('=').slice(1).join('='), url: BASE }]);
// In the page: note when a dish is served or hops and when a long sound (a voice) starts, in wall-clock ms.
await ctx.addInitScript(() => {
  window.__log = [];
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    if (this.buffer && this.buffer.duration > 1.5) window.__log.push({ ev: 'voice', t: Date.now(), dur: this.buffer.duration, when: a[0] || 0, now: this.context.currentTime });
    return start.apply(this, a);
  };
  new MutationObserver((list) => {
    for (const m of list) {
      const c = m.target;
      if (!c.classList?.contains('dish') || c.classList.contains('spot')) continue;
      const was = m.oldValue || '';
      const i = c.getAttribute('aria-label');
      if (c.classList.contains('lit') && !/\blit\b/.test(was)) window.__log.push({ ev: 'lit', i, t: Date.now() });
      if (c.classList.contains('out') && !/\bout\b/.test(was)) window.__log.push({ ev: 'out', i, t: Date.now() });
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
});
const p = await ctx.newPage();
// The screencast sends a frame whenever the screen changes, each with its wall-clock time.
const SHOTS = BUILD + 'screen/';
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const frames = [];
const cdp = await ctx.newCDPSession(p);
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  const file = `${String(frames.length).padStart(5, '0')}.jpg`;
  frames.push({ t: metadata.timestamp * 1000, file });
  fs.writeFile(SHOTS + file, Buffer.from(data, 'base64'), () => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 1170, maxHeight: 2532, everyNthFrame: 1 });
const marks = [];
const mark = (ev, extra = {}) => marks.push({ ev, t: Date.now(), ...extra });
p.on('pageerror', (e) => console.log('pageerror', e.message));

await p.goto(link);
await p.waitForSelector('.pin-digit');
await p.waitForTimeout(800);
await p.click('.pin-digit >> nth=0');
await p.keyboard.type(PIN, { delay: 120 });
await p.waitForSelector('text=Open your gift');
await p.waitForTimeout(1500);

async function tap(selector) {
  await p.locator(selector).scrollIntoViewIfNeeded();
  await p.waitForTimeout(250);
  const b = await p.locator(selector).boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  mark('tap', { x, y, what: selector });
  await p.mouse.click(x, y);
}
await tap('text=Open your gift');
await p.waitForSelector('#blowBtn', { timeout: 30000 });
mark('listen');
await p.waitForTimeout(900);

const dish = (i) => `.dish[aria-label="Play ${data.voices[i].name}'s message"]`;
for (const i of data.heard) {
  const before = await p.evaluate(() => window.__log.filter((e) => e.ev === 'voice').length);
  await tap(dish(i));
  await p.waitForFunction((n) => window.__log.filter((e) => e.ev === 'voice').length > n, before, { timeout: 10000 });
  const dur = await p.evaluate(() => window.__log.filter((e) => e.ev === 'voice').at(-1).dur);
  await p.waitForTimeout(dur * 1000 + 700);
}

await tap('#blowBtn');
await p.waitForSelector('.holdbtn');
await p.waitForTimeout(700);
// "Tap to cut": one tap, the top comes off, the dishes hop, confetti
const hb = await (await p.$('.holdbtn')).boundingBox();
mark('cut', { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 });
await p.mouse.click(hb.x + hb.width / 2, hb.y + hb.height / 2);
await p.waitForSelector('#confetti:not([hidden])', { timeout: 15000 });
mark('confetti');
await p.waitForTimeout(4000);

const log = await p.evaluate(() => window.__log);
await cdp.send('Page.stopScreencast');
await p.waitForTimeout(500);

// A voice with a mood is played with Web Audio effects (never baked into the WAV), so render the very same effect
// offline with the app's own playVoice() → promo/povbaru/build/voices/NN-mood.wav (starts when playVoice is called).
// The organizer's "What do you want to make?" page with the tumpeng picked, for the closing card → build/home/*.jpg
const home = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await home.addCookies([{ name: sari.split('=')[0], value: sari.split('=').slice(1).join('='), url: BASE }]);
const hp = await home.newPage();
await hp.goto(BASE + '/new?occasion=tumpeng');
await hp.fill('#recipient', data.recipient).catch(() => {});
await hp.waitForTimeout(2500);
const HOME = BUILD + 'home/';
fs.rmSync(HOME, { recursive: true, force: true });
fs.mkdirSync(HOME, { recursive: true });
const homeFrames = [];
const hcdp = await home.newCDPSession(hp);
hcdp.on('Page.screencastFrame', ({ data: d, metadata, sessionId }) => {
  hcdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  const file = `${String(homeFrames.length).padStart(5, '0')}.jpg`;
  homeFrames.push([metadata.timestamp, file]);
  fs.writeFile(HOME + file, Buffer.from(d, 'base64'), () => {});
});
await hcdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1170, maxHeight: 2532 });
await hp.waitForTimeout(6000);
await hcdp.send('Page.stopScreencast');
await hp.waitForTimeout(300);
fs.writeFileSync(HOME + 'frames.json', JSON.stringify(homeFrames.map(([t, f]) => [+(t - homeFrames[0][0]).toFixed(3), f])));

const fx = await ctx.newPage();
await fx.goto(BASE + '/');
for (const [i, v] of data.voices.entries()) {
  if (!v.mood) continue;
  const name = `${BUILD}voices/${String(i).padStart(2, '0')}`, src = `${VOICES}${String(i).padStart(2, '0')}`;
  const pcm = await fx.evaluate(async ({ b64, mood }) => {
    const { playVoice } = await import('/assets/voicefx.js');
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const buf = await new OfflineAudioContext(1, 48000, 48000).decodeAudioData(bytes.buffer);
    const ac = new OfflineAudioContext(1, Math.ceil((buf.duration + 3) * 48000), 48000);
    playVoice(ac, buf, mood);
    const out = (await ac.startRendering()).getChannelData(0);
    let end = out.length; while (end > 0 && Math.abs(out[end - 1]) < 1e-4) end--;
    return Array.from(out.subarray(0, end + 4800), (s) => Math.round(Math.max(-1, Math.min(1, s)) * 32767));
  }, { b64: fs.readFileSync(src + '-hq.wav').toString('base64'), mood: v.mood });
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length * 2, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(48000, 24); h.writeUInt32LE(96000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length * 2, 40);
  fs.writeFileSync(name + '-mood.wav', Buffer.concat([h, Buffer.from(Int16Array.from(pcm).buffer)]));
  console.log('mood', v.mood, '→', name + '-mood.wav');
}
await browser.close();

const t0 = frames[0].t;
const sec = (t) => +((t - t0) / 1000).toFixed(3);
const timeline = [...log, ...marks].sort((a, b) => a.t - b.t).map(({ t, ...e }) => ({ s: sec(t), ...e }));
fs.writeFileSync(BUILD + 'timeline.json', JSON.stringify({ slug: gift.slug, heard: data.heard, events: timeline, frames: frames.map((f) => [sec(f.t), f.file]) }));
console.log(timeline.map((e) => `${e.s.toFixed(2).padStart(6)}  ${e.ev} ${e.i ?? ''}${e.dur ? ' ' + e.dur.toFixed(2) + 's' : ''}`).join('\n'));
console.log(frames.length, 'frames over', sec(frames.at(-1).t), 's');
