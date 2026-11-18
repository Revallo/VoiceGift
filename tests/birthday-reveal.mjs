// Recipient playback regression. Start a local server with DEV_LOGIN=1 and no ASR keys.
// PowerShell: $env:BASE='http://localhost:3017'; node tests/birthday-reveal.mjs
// Uses local dummy accounts and a synthetic WAV; never records a real microphone.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');
const BASE = process.env.BASE || 'http://localhost:3000';
assert(['localhost', '127.0.0.1'].includes(new URL(BASE).hostname), 'Run only against a local development server.');
const OUT = new URL('./screenshots/', import.meta.url);
await fs.mkdir(OUT, { recursive: true });
const RUN = Date.now().toString(36);
const errors = [];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let gift;

async function post(path, body, cookie) {
  const response = await fetch(BASE + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) }, body: JSON.stringify(body)
  });
  const data = await response.json();
  assert(response.ok, `${path}: ${response.status} ${JSON.stringify(data)}`);
  return { response, data };
}
async function account(name, id) {
  const { response } = await post('/api/account', { action: 'dev-login', name, email: `birthday.qa.${id}.${RUN}@example.com` });
  return response.headers.get('set-cookie').split(';')[0];
}
function wav(seconds = 5) {
  const samples = 16000 * seconds, b = Buffer.alloc(44 + samples * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24);
  b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) b.writeInt16LE(Math.round(Math.sin(i / 16000 * Math.PI * 660) * 1200), 44 + i * 2);
  return b;
}
async function makeFixture() {
  const config = await (await fetch(BASE + '/api/account')).json();
  assert(config.devLogin, 'DEV_LOGIN=1 is required.');
  const organizer = await account('Sari', 'organizer');
  gift = (await post('/api/gifts', {
    occasion: 'birthday', recipient: 'Dimas', organizer: 'Sari', verifyPin: '2411',
    cake: { flavor: 'chocolate', shape: 'classic', name: 'Dimas', font: 'script', dots: [], stickers: [] }
  }, organizer)).data;
  for (const [index, [name, text]] of [
    ['Mama', 'Selamat ulang tahun, Nak. Mama bangga sama kamu. Semoga selalu sehat dan bahagia.'],
    ['Budi', 'Dimas! Selamat ulang tahun, sukses terus bro! Jangan lupa traktir kita ya.'],
    ['Kak Rina & keluarga', 'Happy birthday Dimas! Semoga semua keinginanmu tercapai tahun ini.']
  ].entries()) {
    const cookie = await account(name, `friend-${index}`);
    const r = await fetch(`${BASE}/api/message?${new URLSearchParams({ slug: gift.slug, name, consent: '1' })}`, {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Cookie: cookie }, body: wav()
    });
    const message = await r.json();
    assert(r.ok, `Create message: ${JSON.stringify(message)}`);
    assert.equal(message.asrProvider, 'mock', 'Do not run against an external ASR provider.');
    const patch = await fetch(BASE + '/api/message', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: gift.slug, id: message.id, token: message.token, text, mood: index === 1 ? 'dangdut' : 'normal' })
    });
    assert(patch.ok, 'Save mock caption');
  }
  const cookie = await account('Dimas', 'recipient');
  return { ...gift, cookie, pin: '2411', url: `${BASE}/r/${gift.slug}?k=${gift.openKey}` };
}
async function open(fixture, viewport, wrongPin = false, failedAudio = false) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 500 ? 2 : 1, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
  await context.addCookies([{ name: 'vg_session', value: fixture.cookie.split('=')[1], url: BASE }]);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  if (failedAudio) await page.route('**/api/audio?**', route => route.abort());
  await page.goto(fixture.url);
  await page.locator('[data-screen="verify"]:visible').waitFor();
  if (wrongPin) {
    await page.locator('.pin-digit').first().focus();
    await page.keyboard.type('0000');
    await page.locator('#verifyError:visible').waitFor();
    assert.equal(await page.locator('.pin-digit').first().inputValue(), '');
  }
  await page.locator('.pin-digit').first().focus();
  await page.keyboard.type(fixture.pin);
  await page.waitForFunction(() => document.body.dataset.revealPhase === 'ready');
  return page;
}
async function noOverflow(page, state) {
  const overflow = await page.evaluate(() => {
    const app = document.querySelector('.app');
    const old = app.scrollLeft;
    app.scrollLeft = 50;
    const appScroll = app.scrollLeft;
    app.scrollLeft = old;
    return { document: document.documentElement.scrollWidth - document.documentElement.clientWidth, app: appScroll };
  });
  assert(overflow.document <= 1 && overflow.app <= 1, `${state} has horizontal overflow: ${JSON.stringify(overflow)}`);
}
async function shot(page, name) {
  await noOverflow(page, name);
  await page.screenshot({ path: fileURLToPath(new URL(`birthday-redesign-${name}.png`, OUT)) });
}
async function listen(page) {
  await page.getByRole('button', { name: 'Open your gift', exact: true }).click();
  await page.waitForFunction(() => document.body.dataset.revealPhase === 'lighting');
  await page.waitForFunction(() => document.body.dataset.revealPhase === 'cake', { timeout: 20000 });
}
async function playing(page) {
  await page.locator('.birthday-player[data-player-state="playing"]').waitFor();
}

try {
  const fixture = await makeFixture();
  const page = await open(fixture, { width: 390, height: 844 }, true);
  await shot(page, 'ready');
  await listen(page);
  await shot(page, 'listen');
  await page.locator('.friend').first().click();
  await playing(page);
  await page.waitForTimeout(800);
  await shot(page, 'playing');
  await page.getByRole('button', { name: "Pause Mama's message", exact: true }).click();
  await page.locator('[data-player-state="paused"]').waitFor();
  const progress = () => page.locator('.birthday-progress i').evaluate(el => el.style.width);
  const pausedProgress = await progress();
  await page.waitForTimeout(700);
  assert.equal(await progress(), pausedProgress, 'Paused playback progress must remain frozen.');
  await shot(page, 'paused');
  await page.getByRole('button', { name: "Resume Mama's message", exact: true }).click();
  await playing(page);
  await page.waitForTimeout(500);
  assert.notEqual(await progress(), pausedProgress, 'Resumed playback must advance.');
  await page.getByRole('button', { name: 'Play next voice', exact: true }).click();
  await page.locator('.birthday-player .name').filter({ hasText: 'Budi' }).waitFor();
  await playing(page);
  await page.getByRole('button', { name: "Pause Budi's message", exact: true }).click();
  await page.locator('[data-player-state="paused"]').waitFor();
  // The mood has a playback-length timer; a long pause must preserve its visual effect.
  await page.waitForTimeout(6500);
  assert.equal(await page.locator('.stage-wrap.mood-dangdut .moodfx:not(.out)').count(), 1);
  await page.getByRole('button', { name: "Resume Budi's message", exact: true }).click();
  await page.locator('[data-player-state="ended"]').waitFor({ timeout: 12000 });
  assert.match(await page.locator('#heard').textContent(), /^1 of 3/);
  await page.getByRole('button', { name: "Play again Budi's message", exact: true }).click();
  await playing(page);
  await page.getByRole('button', { name: "Pause Budi's message", exact: true }).click();
  await page.locator('[data-player-state="paused"]').waitFor();
  await page.locator('#blowBtn').click();
  await page.locator('.holdbtn').focus();
  await page.keyboard.down('Space');
  await page.waitForFunction(() => document.body.dataset.revealPhase === 'done', { timeout: 7000 });
  await page.keyboard.up('Space');
  await page.waitForTimeout(500);
  await shot(page, 'keepsake');
  await page.getByRole('button', { name: 'Listen again', exact: true }).click();
  await page.waitForFunction(() => document.body.dataset.revealPhase === 'cake');
  assert.equal(await page.locator('.friend').count(), 3);
  await page.context().close();

  for (const [name, viewport] of [['320', { width: 320, height: 740 }], ['desktop', { width: 1280, height: 900 }]]) {
    const sized = await open(fixture, viewport);
    await noOverflow(sized, `${name} ready`);
    await listen(sized);
    await sized.locator('.friend').first().click();
    await playing(sized);
    await sized.getByRole('button', { name: "Pause Mama's message", exact: true }).click();
    await shot(sized, name);
    await sized.context().close();
  }

  const failed = await open(fixture, { width: 390, height: 844 }, false, true);
  await listen(failed);
  await failed.locator('.friend').first().click();
  await failed.locator('[data-player-state="error"]').waitFor();
  assert.match(await failed.locator('#heard').textContent(), /^0 of 3/);
  assert.match(await failed.locator('.birthday-player .caption').textContent(), /Selamat ulang tahun/);
  assert.equal(await failed.getByRole('button', { name: "Try again Mama's message", exact: true }).count(), 1);
  await failed.unroute('**/api/audio?**');
  await failed.getByRole('button', { name: "Try again Mama's message", exact: true }).click();
  await playing(failed);
  await failed.context().close();
  assert.deepEqual(errors, [], 'No browser page errors');
  console.log('ERRORS none — birthday playback, pause/resume with mood, next/replay, keyboard finale, failed audio, 320px and desktop');
} finally {
  await browser.close();
  if (gift) await post('/api/manage', { slug: gift.slug, key: gift.manageKey, action: 'delete-gift' }).catch(() => {});
}
