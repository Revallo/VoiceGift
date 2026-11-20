// Records the recipient's side of a birthday gift for the promo video (promo/README.md).
// Needs the 12 voices (promo/make-voices.py) and the local server with the dev login:
//   PowerShell: $env:DEV_LOGIN=1; $env:PORT=3017; node --env-file-if-exists=.env dev.mjs
//   then:       BASE=http://localhost:3017 node promo/record.mjs
// Out: promo/build/screen/*.jpg (1170×2532: 390×844 at 3×) + promo/build/timeline.json (seconds since the first
// frame: each frame, each candle lighting, each voice starting, the taps, the blow, the confetti).
// Playwright's recordVideo records CSS pixels only (390×844), so the frames come from Chromium's screencast instead.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');

const BASE = process.env.BASE || 'http://localhost:3017';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const BUILD = HERE + 'build/';
const data = JSON.parse(fs.readFileSync(HERE + 'voices.json', 'utf8'));
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
  recipient: data.recipient, organizer: data.organizer, occasion: 'birthday', verifyPin: PIN,
  cake: { flavor: 'chocolate', shape: 'tower', font: 'script', name: data.recipient, accent: 'auto', pattern: 'sprinkles', topper: 'none',
    backdrop: 'night', music: 'musicbox', stickers: [['✨', 40, 70], ['🎈', 352, 22], ['⭐', 52, 250], ['💫', 320, 235]] }
}) }).then(json);
if (!gift.slug) throw new Error('gift: ' + JSON.stringify(gift));
// every friend's own candle: stick, flame colour, flame shape (CANDLES / FLAMES / FLAME_SHAPES in cake.js)
const candles = [['stripe', 'classic', 'drop'], ['gold', 'rainbow', 'sparkler'], ['swirl', 'pink', 'heart'], ['tall', 'blue', 'tall'],
  ['dots', 'pink', 'heart'], ['chunky', 'green', 'star'], ['stripe', 'purple', 'twin'], ['gold', 'ice', 'round'],
  ['swirl', 'classic', 'star'], ['tall', 'purple', 'drop'], ['dots', 'rainbow', 'round'], ['chunky', 'blue', 'sparkler']];
for (const [i, v] of data.voices.entries()) {
  const cookie = v.name === data.organizer ? sari : await account(v.name);
  const wav = fs.readFileSync(`${BUILD}voices/${String(i).padStart(2, '0')}.wav`);
  const m = await fetch(`${BASE}/api/message?slug=${gift.slug}&name=${encodeURIComponent(v.name)}&consent=1`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Cookie: cookie }, body: wav }).then(json);
  if (!m.id) throw new Error('message: ' + JSON.stringify(m));
  await fetch(`${BASE}/api/message`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: gift.slug, id: m.id, token: m.token, text: v.text, mood: v.mood, candle: { body: candles[i % 12][0], flame: candles[i % 12][1], shape: candles[i % 12][2] } }) });
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
// CAKE_FIX (video only; the app itself is unchanged): how the age and the candles share the top of the cake.
//   A = as the app draws it (the age among the candles)   B = a smaller age set into the front cream, candles behind
//   C = the candles move out to the left and right, the age stands clear in the middle
const FIX = process.env.CAKE_FIX || 'A';
const FIX_CSS = { A: '', B: '.age-numbers{z-index:5;transform:translate(-50%,-100%) translateY(30px) scale(.6)!important;transform-origin:50% 100%}', C: '.age-numbers{z-index:5}' }[FIX];
await ctx.addInitScript(({ css, spread }) => document.addEventListener('DOMContentLoaded', () => {
  const s = document.createElement('style');
  s.textContent = css;
  document.head.append(s);
  if (!spread) return;
  const out = () => document.querySelectorAll('.candle:not(.spot)').forEach((c) => {
    if (c.dataset.x0) return;
    const x0 = parseFloat(c.style.left); c.dataset.x0 = x0;
    const d = x0 + 15 - 195; // from the cake's middle (stage is 390 wide, a candle 30)
    c.style.left = `${195 - 15 + d * 0.8 + Math.sign(d || 1) * 62}px`;
  });
  new MutationObserver(out).observe(document, { subtree: true, childList: true });
}), { css: FIX_CSS, spread: FIX === 'C' });
// In the page: note when a candle lights or goes out and when a long sound (a voice) starts, in wall-clock ms.
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
      if (!c.classList?.contains('candle') || c.classList.contains('spot')) continue;
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

const candle = (i) => `.candle[aria-label="Play ${data.voices[i].name}'s message"]`;
for (const i of data.heard) {
  const before = await p.evaluate(() => window.__log.filter((e) => e.ev === 'voice').length);
  await tap(candle(i));
  await p.waitForFunction((n) => window.__log.filter((e) => e.ev === 'voice').length > n, before, { timeout: 10000 });
  const dur = await p.evaluate(() => window.__log.filter((e) => e.ev === 'voice').at(-1).dur);
  await p.waitForTimeout(dur * 1000 + 700);
}

await tap('#blowBtn');
await p.waitForSelector('.holdbtn');
await p.waitForTimeout(700);
const hb = await (await p.$('.holdbtn')).boundingBox();
mark('hold', { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 });
await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
await p.mouse.down();
await p.waitForFunction(() => document.querySelectorAll('.candle.out').length > 0, null, { timeout: 8000 }).catch(() => {});
await p.waitForSelector('#confetti:not([hidden])', { timeout: 10000 });
mark('confetti');
await p.mouse.up();
mark('release');
await p.waitForTimeout(4000);

const log = await p.evaluate(() => window.__log);
await cdp.send('Page.stopScreencast');
await p.waitForTimeout(500);

// A voice with a mood is played with Web Audio effects (never baked into the WAV), so render the very same effect
// offline with the app's own playVoice() → promo/build/voices/NN-mood.wav (starts when playVoice is called).
// The organizer's home page (the three gifts drawn live), for the closing card → promo/build/home/*.jpg
const home = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await home.addCookies([{ name: sari.split('=')[0], value: sari.split('=').slice(1).join('='), url: BASE }]);
const hp = await home.newPage();
await hp.goto(BASE + '/');
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
  const name = `${BUILD}voices/${String(i).padStart(2, '0')}`;
  const pcm = await fx.evaluate(async ({ b64, mood }) => {
    const { playVoice } = await import('/assets/voicefx.js');
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const buf = await new OfflineAudioContext(1, 48000, 48000).decodeAudioData(bytes.buffer);
    const ac = new OfflineAudioContext(1, Math.ceil((buf.duration + 3) * 48000), 48000);
    playVoice(ac, buf, mood);
    const out = (await ac.startRendering()).getChannelData(0);
    let end = out.length; while (end > 0 && Math.abs(out[end - 1]) < 1e-4) end--;
    return Array.from(out.subarray(0, end + 4800), (s) => Math.round(Math.max(-1, Math.min(1, s)) * 32767));
  }, { b64: fs.readFileSync(name + '-hq.wav').toString('base64'), mood: v.mood });
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
