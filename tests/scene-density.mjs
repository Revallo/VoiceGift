// Local scene regression: paged candles, balanced lanterns, and the refreshed soft bouquet.
// BASE=http://localhost:3023 node tests/scene-density.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:3000';
assert(['localhost', '127.0.0.1'].includes(new URL(BASE).hostname), 'Local development only.');
await fs.mkdir('tests/screenshots', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1220, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/scene-density-review', route => route.fulfill({ contentType: 'text/html', body: '<link rel="stylesheet" href="/assets/app.css"><style>body{display:block!important;height:auto!important;overflow:visible!important;padding:20px!important}#gallery{display:grid;grid-template-columns:repeat(3,380px);gap:20px}.sample{width:380px}.sample>h2{font-size:16px;margin:0 0 12px}</style><main id="gallery"></main>' }));
  await page.goto(BASE + '/scene-density-review');
  const result = await page.evaluate(async () => {
    const { createCake, candleSpots, CANDLES_PER_PAGE, SHAPES } = await import('/assets/cake.js');
    const { createBouquet } = await import('/assets/bouquet.js');
    const { createLanterns, lanternSpots } = await import('/assets/lanterns.js');
    const failures = [];
    const check = (ok, message) => { if (!ok) failures.push(message); };
    const gallery = document.querySelector('#gallery');
    const sample = label => { const host = document.createElement('section'); host.className = 'sample'; const heading = document.createElement('h2'); heading.textContent = label; host.append(heading); gallery.append(host); return host; };
    for (let n = 0; n <= 60; n++) {
      const points = candleSpots(n);
      check(points.length === n, `${n}: candle positions preserve every voice`);
      for (let start = 0; start < n; start += CANDLES_PER_PAGE) {
        const group = points.slice(start, start + CANDLES_PER_PAGE).sort((a, b) => a.x - b.x);
        for (let i = 1; i < group.length; i++) check(group[i].x - group[i - 1].x >= 24, `${n}: candles too close on page ${start}`);
      }
    }
    for (const shape of Object.keys(SHAPES)) {
      const host = document.createElement('div'); host.style.width = '380px'; gallery.append(host);
      const scene = createCake(host, { shape, flavor: 'strawberry', name: 'Dimas' });
      for (const n of [0, 1, 6, 7, 20, 60]) {
        let clicked = -1;
        scene.setCandles(n, { names: Array.from({ length: n }, (_, i) => `Friend ${i + 1}`), onTap: i => { clicked = i; } });
        scene.lightAll();
        check(scene.candles.length === n, `${shape}/${n}: logical candle count changed`);
        check(scene.candles.filter(c => !c.hidden).length <= 6, `${shape}/${n}: too many visible candles`);
        if (n) {
          scene.setActive(n - 1, true);
          check(!scene.candles[n - 1].hidden, `${shape}/${n}: selected voice must be visible`);
          scene.candles[n - 1].click(); check(clicked === n - 1, `${shape}/${n}: wrong voice callback`);
          scene.lightAll(); check(!scene.candles[0].hidden, `${shape}/${n}: lightAll must start on first group`);
          scene.light(n - 1); check(!scene.candles[n - 1].hidden, `${shape}/${n}: lighting must follow group`);
          scene.reset(); check(!scene.candles[0].hidden, `${shape}/${n}: reset must start on first group`);
        }
        const finale = scene.finaleOrder(n);
        check(finale.length === n && new Set(finale).size === n, `${shape}/${n}: finale lost a voice`);
      }
      host.remove();
    }
    const cakeHost = sample('Twenty voices · six candles at a time');
    const cake = createCake(cakeHost, { shape: 'classic', name: 'Dimas', flavor: 'strawberry' });
    cake.setCandles(20, { names: Array.from({ length: 20 }, (_, i) => `Friend ${i + 1}`), onTap: i => { window.__lastCandleClicked = i; } });
    cake.lightAll(); window.__densityCake = cake;
    const label = () => cakeHost.querySelector('.candle-page-label').textContent;
    check(label() === '1–6 of 20', 'First candle page label');
    cakeHost.querySelector('[aria-label="Next candles"]').click();
    check(label() === '7–12 of 20' && !cake.candles[6].hidden && cake.candles[0].hidden, 'Next candle group');
    cakeHost.querySelector('[aria-label="Previous candles"]').click();
    check(label() === '1–6 of 20', 'Previous candle group');
    for (const n of [8, 10, 20]) {
      const host = sample(`Soft wrap · ${n} flowers`), bouquet = createBouquet(host, { shape: 'classic', name: 'Nadia', flavor: 'strawberry' });
      bouquet.setCandles(n); bouquet.lightAll();
      check(bouquet.candles.length === n, `Bouquet ${n}: voice count changed`);
    }
    for (let n = 1; n <= 36; n++) {
      const points = lanternSpots(n), rows = [];
      // sagY uses this same fixed quadratic; recover each string's base to group its members.
      for (const p of points) {
        const base = Math.round(p.top - 22 * (1 - ((p.x - 195) / 205) ** 2));
        let row = rows.find(row => row.base === base); if (!row) rows.push(row = { base, points: [] }); row.points.push(p);
        check(p.x - p.w / 2 - 6 >= 0 && p.x + p.w / 2 + 6 <= 390, `Lantern ${n}: horizontal clipping`);
        check(p.top >= 0 && p.top + p.len + p.h + 14 < 240, `Lantern ${n}: overlaps inscription`);
      }
      check(points.length === n && new Set(points.map(p => p.i)).size === n, `Lantern ${n}: lost voice mapping`);
      const counts = rows.map(row => row.points.length);
      check(Math.max(...counts) - Math.min(...counts) <= 1, `Lantern ${n}: unbalanced row counts`);
      for (const row of rows) if (row.points.length > 1) {
        const xs = row.points.map(p => p.x);
        check(Math.abs(Math.min(...xs) + Math.max(...xs) - 390) < .1, `Lantern ${n}: row not centered`);
        check(Math.max(...xs) - Math.min(...xs) >= 200, `Lantern ${n}: row too sparse`);
      }
    }
    for (const n of [8, 20, 36]) {
      const host = sample(`${n} lanterns · balanced strings`), lanterns = createLanterns(host, { name: 'With love', names: 'Rina & Bayu' });
      lanterns.setCandles(n, { names: Array.from({ length: n }, (_, i) => `Friend ${i + 1}`) }); lanterns.lightAll();
    }
    return { failures };
  });
  assert.deepEqual(result.failures, []);
  await page.screenshot({ path: 'tests/screenshots/scene-density-gallery.png', fullPage: true });
  await page.evaluate(() => window.__densityCake.setActive(19, true));
  await page.locator('.sample').first().getByRole('button', { name: "Play Friend 20's message", exact: true }).click();
  assert.equal(await page.evaluate(() => window.__lastCandleClicked), 19);
  await page.getByRole('button', { name: 'Previous candles', exact: true }).click();
  assert.equal(await page.locator('.candle-page-label').first().textContent(), '13–18 of 20');
  const record = await (await fetch(BASE + '/record.html')).text();
  assert(record.includes('Check your words') && record.indexOf('Check your words') < record.indexOf('id="seenScene"'), 'The heading belongs above the gift.');
  assert(!record.includes('<details') && !record.includes('invitePreviewScene'), 'Sender stays expanded without pre-record preview.');
  assert.deepEqual(errors, []);
  console.log('ERRORS none — six visible candles with all voice mappings, navigation/finale, balanced lanterns1–36, refreshed bouquet gallery');
} finally { await browser.close(); }
