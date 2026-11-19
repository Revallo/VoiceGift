// Local regression: expanded gift/words/personalization layout, individual styles, 20 demos, music order and bouquet bounds.
// DEV_LOGIN=1 server without provider keys; BASE=http://localhost:3022 node tests/gift-polish.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const BASE = process.env.BASE || 'http://localhost:3000';
assert(['localhost', '127.0.0.1'].includes(new URL(BASE).hostname));
await fs.mkdir('tests/screenshots', { recursive: true });
const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const errors = [], RUN = Date.now();
const fixtures = [];
async function account(name, suffix) {
  const response = await fetch(BASE + '/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dev-login', name, email: `polish.${RUN}.${suffix}@example.com` }) });
  assert(response.ok); return response.headers.get('set-cookie').split(';')[0];
}
async function post(path, body, cookie) {
  const response = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  const data = await response.json(); assert(response.ok, JSON.stringify(data)); return data;
}
async function context(cookie) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] });
  await ctx.addCookies([{ name: 'vg_session', value: cookie.split('=')[1], url: BASE }]); return ctx;
}
async function screenshot(page, name) {
  await page.waitForTimeout(450);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `tests/screenshots/polish-${name}.png` });
}
async function senderLayout(page) {
  assert(await page.locator('#seenScene').isVisible(), 'The gift scene is always expanded.');
  assert(await page.locator('#captionText').isVisible(), 'The corrected words remain directly editable.');
  assert(await page.locator('#twist').isVisible(), 'Personalization is always expanded.');
  assert(await page.locator('#moodRow .pick').first().isVisible(), 'Mood choices do not need a toggle.');
  assert.equal(await page.locator('[data-screen="caption"] details, [data-screen="caption"] summary').count(), 0, 'No collapsed sections or disclosure arrows on the caption screen.');
  const layout = await page.evaluate(() => {
    const scene = document.querySelector('#seenScene').getBoundingClientRect();
    const card = document.querySelector('#captionCard').getBoundingClientRect();
    const twist = document.querySelector('#twist').getBoundingClientRect();
    return { sceneBottom: scene.bottom, cardTop: card.top, cardBottom: card.bottom, twistTop: twist.top, width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
  });
  assert(layout.sceneBottom <= layout.cardTop + 1, 'The gift scene comes above the words card.');
  assert(layout.cardBottom <= layout.twistTop + 1, 'The words card comes above personalization.');
  assert(layout.scrollWidth <= layout.width, 'The expanded sender layout must not scroll horizontally.');
}
try {
  const organizer = await account('Sari', 'org');
  for (const occasion of ['birthday', 'graduation', 'wedding']) {
    const gift = await post('/api/gifts', { occasion, recipient: occasion === 'wedding' ? 'Rina & Bayu' : 'Nadia', organizer: 'Sari', verifyPin: '2411', cake: { name: 'Nadia', shape: occasion === 'graduation' ? 'box' : 'classic', music: 'dreamy', pattern: occasion === 'birthday' ? 'sprinkles' : 'round' } }, organizer);
    fixtures.push(gift);
    const demo = await post('/api/manage', { slug: gift.slug, key: gift.manageKey, action: 'add-demo' });
    assert.equal(demo.added, 20);
    const friendCookie = await account('Ayu', `friend-${occasion}`);
    const friend = await context(friendCookie), p = await friend.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${BASE}/g/${gift.slug}`);
    await p.locator('[data-screen="invite"]:visible').waitFor();
    assert.equal(await p.locator('.invite-preview, #invitePreviewScene, #invitePreviewLabel').count(), 0, 'No example preview before recording.');
    await p.check('#consent'); await p.click('#startBtn');
    await p.locator('[data-screen="record"]:visible').waitFor(); await p.waitForTimeout(1300); await p.click('#stopBtn');
    await p.locator('[data-screen="caption"]:visible').waitFor();
    assert(await p.locator('#captionText').isVisible());
    assert.equal(await p.locator('#seenCaption').isVisible(), false);
    await senderLayout(p);
    assert(await p.locator('#captionText').evaluate(e => parseFloat(getComputedStyle(e).fontSize) >= 20));
    await p.fill('#captionText', 'Semoga selalu bahagia. Ini ucapan Ayu!');
    await screenshot(p, `${occasion}-caption`);
    await p.setViewportSize({ width: 320, height: 740 });
    await senderLayout(p);
    await screenshot(p, `${occasion}-caption-320`);
    await p.setViewportSize({ width: 390, height: 844 });
    await p.click('#playOwn'); await p.locator('#seenCaption:visible').waitFor();
    assert.equal(await p.locator('#captionText').isVisible(), false);
    await p.click('#playOwn'); await p.locator('#captionText:visible').waitFor();
    await senderLayout(p);
    if (occasion === 'graduation') {
      await p.click('#flowerTypeRow [data-key="rose"]'); await p.click('#flowerColorRow [data-key="blue"]');
      assert.equal(await p.locator('#seenScene .flower[data-petal="rose"]').count(), 1);
    } else if (occasion === 'wedding') {
      await p.click('#lanternColorRow [data-key="lilac"]');
      assert.equal(await p.locator('#seenScene .l-initial').last().textContent(), 'A');
    }
    await p.click('#sendBtn'); await p.locator('[data-screen="done"]:visible').waitFor(); await friend.close();
    const recipientCookie = await account('Recipient', `recipient-${occasion}`);
    const response = await fetch(`${BASE}/api/reveal?slug=${gift.slug}&k=${gift.openKey}&pin=2411`, { headers: { Cookie: recipientCookie } });
    const data = await response.json(); assert.equal(data.messages.length, 21);
    const own = data.messages.find(m => m.sender === 'Ayu' && m.text.includes('Ini ucapan'));
    assert(own);
    if (occasion === 'graduation') assert.deepEqual(own.flower, { type: 'rose', color: 'blue' });
    if (occasion === 'wedding') assert.deepEqual(own.lantern, { color: 'lilac' });
    const recipient = await context(recipientCookie), r = await recipient.newPage();
    r.on('pageerror', e => errors.push(e.message));
    // Instrument the served module only inside this test to observe tune start, without production hooks.
    await r.route('**/assets/music.js', async route => {
      const original = await route.fetch();
      const body = (await original.text()).replace('const tune = TUNES[key];', `window.__musicEvents ||= []; window.__musicEvents.push({ phase: document.body.dataset.revealPhase, lit: document.querySelectorAll('#cake .lit:not(.spot)').length }); const tune = TUNES[key];`);
      await route.fulfill({ response: original, body });
    });
    await r.goto(`${BASE}/r/${gift.slug}?k=${gift.openKey}`);
    await r.locator('[data-screen="verify"]:visible').waitFor(); await r.waitForTimeout(120);
    await r.locator('.pin-digit').first().focus(); await r.keyboard.type('2411');
    await r.getByRole('button', { name: 'Open your gift', exact: true }).click();
    await r.waitForFunction(() => document.body.dataset.revealPhase === 'lighting');
    assert.equal(await r.evaluate(() => window.__musicEvents?.length || 0), 0);
    await r.waitForFunction(() => document.body.dataset.revealPhase === 'cake', { timeout: 30000 });
    const tunes = await r.evaluate(() => window.__musicEvents);
    assert.equal(tunes.length, 1); assert.equal(tunes[0].lit, 21, 'Music starts only after every gift item lights up.');
    await r.locator('.friend').last().click(); await r.locator('.birthday-player[data-player-state="playing"]').waitFor();
    assert.equal(await r.locator('.birthday-player').count(), 1);
    assert(await r.locator('.birthday-player .caption').evaluate(e => parseFloat(getComputedStyle(e).fontSize) >= 20));
    await screenshot(r, `${occasion}-recipient`);
    if (occasion === 'graduation') {
      const bounds = await r.evaluate(async () => {
        const { flowerSpots } = await import('/assets/bouquet.js');
        const bad = [];
        for (const shape of ['classic', 'box', 'basket', 'tied']) for (const n of [1, 3, 12, 20, 40]) {
          const rim = shape === 'box' ? 156 : shape === 'basket' ? 160 : 166;
          for (const p of flowerSpots(n, shape)) if (p.y - p.s / 2 < 0 || p.y + p.s / 2 >= rim || p.x - p.s / 2 < 0 || p.x + p.s / 2 > 390) bad.push(`${shape}/${n}`);
        }
        return bad;
      });
      assert.deepEqual(bounds, []);
    }
    await recipient.close();
  }
  assert.deepEqual(errors, []);
  console.log('ERRORS none — expanded gift/words/personalization layout at 320/390px, saved flowers/lanterns, 20 demos, music sequencing, bouquet bounds');
} catch (error) {
  console.error('Browser errors:', errors);
  for (const ctx of browser.contexts()) for (const page of ctx.pages()) console.error(page.url(), (await page.locator('body').innerText()).slice(0, 700));
  throw error;
} finally {
  await browser.close();
  for (const gift of fixtures) await post('/api/manage', { slug: gift.slug, key: gift.manageKey, action: 'delete-gift' }).catch(() => {});
}
