// Local regression: measure rendered Web Audio signal during preload/lighting, then test resume recovery.
// Start DEV_LOGIN=1 without provider keys. BASE=http://localhost:3022 node tests/opening-chimes.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:3000';
assert(['localhost', '127.0.0.1'].includes(new URL(BASE).hostname), 'Local development server only.');
const browser = await chromium.launch();
const run = Date.now().toString(36), errors = [];
let gift;
async function post(path, body, cookie) {
  const response = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) }, body: JSON.stringify(body) });
  const data = await response.json(); assert(response.ok, `${path}: ${response.status} ${JSON.stringify(data)}`); return { response, data };
}
async function account(name, kind) {
  return (await post('/api/account', { action: 'dev-login', name, email: `chimes.${run}.${kind}@example.com` })).response.headers.get('set-cookie').split(';')[0];
}
function wav() {
  const samples = 32000, b = Buffer.alloc(44 + samples * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24);
  b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) b.writeInt16LE(Math.round(Math.sin(i / 16000 * Math.PI * 660) * 1200), 44 + i * 2);
  return b;
}
async function recipient(cookie) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addCookies([{ name: 'vg_session', value: cookie.split('=')[1], url: BASE }]);
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.route('**/assets/music.js', async route => {
    const original = await route.fetch();
    const body = (await original.text()).replace('const tune = TUNES[key];', `window.__musicEvents ||= []; window.__musicEvents.push({ time: performance.now(), lit: document.querySelectorAll('#cake .lit:not(.spot)').length }); const tune = TUNES[key];`);
    await route.fulfill({ response: original, body });
  });
  await page.goto(`${BASE}/r/${gift.slug}?k=${gift.openKey}`);
  await page.locator('[data-screen="verify"]:visible').waitFor();
  await page.locator('.pin-digit').first().focus(); await page.keyboard.type('2411');
  await page.getByRole('button', { name: 'Open your gift', exact: true }).waitFor();
  return page;
}
try {
  const config = await (await fetch(BASE + '/api/account')).json(); assert(config.devLogin);
  const owner = await account('Sari', 'owner');
  gift = (await post('/api/gifts', { occasion: 'birthday', recipient: 'Dimas', organizer: 'Sari', verifyPin: '2411', cake: { shape: 'classic', name: 'Dimas', music: 'dreamy' } }, owner)).data;
  const friend = await account('Ayu', 'friend');
  for (let i = 0; i < 3; i++) {
    const response = await fetch(`${BASE}/api/message?${new URLSearchParams({ slug: gift.slug, name: `Friend ${i + 1}`, consent: '1' })}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Cookie: friend }, body: wav() });
    const message = await response.json(); assert(response.ok, JSON.stringify(message)); assert.equal(message.asrProvider, 'mock');
    const saved = await fetch(BASE + '/api/message', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: gift.slug, id: message.id, token: message.token, text: 'Selamat ulang tahun, Dimas!', mood: 'normal' }) });
    assert(saved.ok);
  }
  const cookie = await account('Dimas', 'recipient');
  const page = await recipient(cookie);
  await page.evaluate(() => {
    window.__chimeSamples = []; window.__musicEvents = [];
    const nativeConnect = AudioNode.prototype.connect, tapped = new WeakSet(), analysers = [];
    // Tap the real output path into an analyser and a silent sink. Oscillator creation alone cannot pass this test.
    AudioNode.prototype.connect = function(destination, ...args) {
      const result = nativeConnect.call(this, destination, ...args);
      if (destination === this.context.destination && !tapped.has(this)) {
        tapped.add(this);
        const analyser = this.context.createAnalyser(); analyser.fftSize = 512;
        const silent = this.context.createGain(); silent.gain.value = 0;
        nativeConnect.call(this, analyser); nativeConnect.call(analyser, silent); nativeConnect.call(silent, destination);
        analysers.push({ analyser, data: new Float32Array(512) });
      }
      return result;
    };
    window.__sampleTimer = setInterval(() => {
      let rms = 0;
      for (const tap of analysers) {
        tap.analyser.getFloatTimeDomainData(tap.data);
        rms = Math.max(rms, Math.sqrt(tap.data.reduce((sum, x) => sum + x * x, 0) / tap.data.length));
      }
      window.__chimeSamples.push({ time: performance.now(), phase: document.body.dataset.revealPhase, rms });
    }, 20);
  });
  await page.route('**/api/audio?**', async route => { await new Promise(resolve => setTimeout(resolve, 1800)); await route.continue(); });
  await page.evaluate(() => { window.__openAt = performance.now(); });
  await page.getByRole('button', { name: 'Open your gift', exact: true }).click();
  await page.waitForFunction(() => window.__chimeSamples.some(s => s.phase === 'loading-audio' && s.rms > .002), null, { timeout: 1600 });
  assert.equal(await page.evaluate(() => window.__musicEvents.length), 0, 'No selected music during preload.');
  await page.waitForFunction(() => window.__chimeSamples.some(s => s.phase === 'lighting' && s.rms > .002), null, { timeout: 12000 });
  await page.waitForFunction(() => document.body.dataset.revealPhase === 'cake', null, { timeout: 15000 });
  const signal = await page.evaluate(() => {
    clearInterval(window.__sampleTimer);
    const byPhase = phase => window.__chimeSamples.filter(s => s.phase === phase && s.rms > .002);
    return { loadingRms: Math.max(...byPhase('loading-audio').map(s => s.rms)), lightingRms: Math.max(...byPhase('lighting').map(s => s.rms)), firstSignalMs: byPhase('loading-audio')[0].time - window.__openAt, firstLightingSignal: byPhase('lighting')[0].time, music: window.__musicEvents };
  });
  assert(signal.firstSignalMs < 1600); assert(signal.loadingRms > .002); assert(signal.lightingRms > .002);
  assert.equal(signal.music.length, 1); assert.equal(signal.music[0].lit, 3);
  assert(signal.firstLightingSignal < signal.music[0].time, 'Lighting signal exists before selected music starts.');
  await page.context().close();

  const recovery = await recipient(cookie);
  await recovery.evaluate(() => { window.__nativeResume = AudioContext.prototype.resume; AudioContext.prototype.resume = () => Promise.reject(new Error('Simulated audio restriction')); });
  await recovery.getByRole('button', { name: 'Open your gift', exact: true }).click();
  await recovery.getByText('Sound could not start. Tap Open your gift to try again.', { exact: true }).waitFor();
  assert.equal(await recovery.evaluate(() => document.body.dataset.revealPhase), 'ready');
  await recovery.evaluate(() => { AudioContext.prototype.resume = () => new Promise(() => {}); });
  await recovery.getByRole('button', { name: 'Open your gift', exact: true }).click();
  await recovery.waitForFunction(() => document.body.dataset.revealPhase === 'ready', null, { timeout: 5000 });
  await recovery.evaluate(() => { AudioContext.prototype.resume = window.__nativeResume; });
  await recovery.getByRole('button', { name: 'Open your gift', exact: true }).click();
  await recovery.waitForFunction(() => document.body.dataset.revealPhase === 'cake', null, { timeout: 15000 });
  assert.deepEqual(errors, []);
  console.log('ERRORS none — rendered opening/lighting signal, slow preload, rejected/stalled audio resume and successful retry', JSON.stringify(signal));
} finally {
  await browser.close();
  if (gift) await post('/api/manage', { slug: gift.slug, key: gift.manageKey, action: 'delete-gift' }).catch(() => {});
}
