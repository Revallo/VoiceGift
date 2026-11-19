// Local browser regression: all cake silhouettes/patterns and stroke-only Undo.
// DEV_LOGIN=1 server required. BASE=http://localhost:3017 node tests/cake-decorations.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:3000';
assert(['localhost', '127.0.0.1'].includes(new URL(BASE).hostname));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/pattern-review', route => route.fulfill({ contentType: 'text/html', body: '<link rel="stylesheet" href="/assets/app.css"><style>body{display:block!important;height:auto!important;overflow:visible!important;padding:24px!important}</style><main id="gallery" style="display:grid;grid-template-columns:repeat(3,370px);gap:18px"></main>' }));
  await page.goto(BASE + '/pattern-review');
  const result = await page.evaluate(async () => {
    const { createCake, SHAPES, PATTERNS } = await import('/assets/cake.js');
    const signatures = [], failures = [];
    for (const shape of Object.keys(SHAPES)) {
      const host = document.createElement('div');
      host.style.width = '370px';
      host.append(document.createTextNode(SHAPES[shape].label));
      document.querySelector('#gallery').append(host);
      const scene = createCake(host, { shape, name: 'Dimas', flavor: 'chocolate' });
      for (const pattern of Object.keys(PATTERNS)) {
        scene.setPattern(pattern);
        const marks = host.querySelectorAll('.cake-pattern .p');
        if (pattern === 'none' ? marks.length !== 0 : marks.length === 0) failures.push(`${shape}/${pattern}: ${marks.length} marks`);
        for (const mark of marks) if (getComputedStyle(mark.parentElement).overflow !== 'hidden') failures.push(`${shape}: unmasked decoration`);
      }
      scene.setPattern('sprinkles');
      const before = host.querySelector('.cake-pattern').innerHTML;
      scene.setFlavor('matcha');
      if (before !== host.querySelector('.cake-pattern').innerHTML) failures.push(`${shape}: flavor moved pattern`);
      signatures.push(before);
      scene.setCandles(3); scene.lightAll();
    }
    return { failures, unique: new Set(signatures).size, shapes: Object.keys(SHAPES).length };
  });
  assert.deepEqual(result.failures, []);
  assert.equal(result.unique, result.shapes, 'Every silhouette needs its own pattern geometry.');
  await page.screenshot({ path: 'tests/screenshots/cake-patterns.png', fullPage: true });
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const login = await phone.request.post(BASE + '/api/account', { data: { action: 'dev-login', name: 'Drawing QA', email: `draw.${Date.now()}@example.com` } });
  assert.equal(login.status(), 200);
  const p = await phone.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '/new');
  await p.fill('#recipient', 'Dimas'); await p.fill('#organizer', 'QA');
  await p.click('#nextBtn'); await p.locator('#sketchToggle').click();
  const hit = await p.locator('.draw-hit').boundingBox();
  async function stroke(y) {
    await p.mouse.move(hit.x + 60, hit.y + y); await p.mouse.down();
    await p.mouse.move(hit.x + 100, hit.y + y, { steps: 8 }); await p.mouse.up();
  }
  const pixels = () => p.locator('#decorCake canvas.draw').evaluate(c => c.toDataURL());
  const blank = await pixels();
  await stroke(120); const first = await pixels(); assert.notEqual(first, blank);
  await stroke(145); assert.notEqual(await pixels(), first);
  const controls = await p.locator('#drawRow').evaluate(row => { const a = row.querySelector('#sketchToggle').getBoundingClientRect(), b = row.querySelector('#undoDraw').getBoundingClientRect(); return { gap: b.left - a.right, sameRow: Math.abs(a.top - b.top) < 2 }; });
  assert(controls.sameRow && controls.gap >= 0 && controls.gap < 20, 'Undo must sit beside Done.');
  await p.click('#undoDraw'); assert.equal(await pixels(), first);
  await p.click('#clearDraw'); assert.equal(await pixels(), blank);
  await p.click('#undoDraw'); assert.equal(await pixels(), first, 'Undo can restore Clear.');
  await p.click('#sketchToggle'); await p.click('#sketchToggle');
  await p.click('#undoDraw'); assert.equal(await pixels(), blank, 'Done preserves stroke history.');
  assert.equal(await p.locator('#undoDraw').isDisabled(), true);
  assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log(`ERRORS none — ${result.shapes} cake shapes, all patterns, stable flavor placement, stroke Undo/Clear/Done`);
} finally { await browser.close(); }
