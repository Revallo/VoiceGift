// Loy Krathong (Thailand): a river at night under a full moon, and every voice is a krathong, a little float of
// banana leaf with flowers and a candle. Drawn in a fixed 390×340 stage. The friend picks the flowers on their
// krathong (message.item.type, KRATHONG_TYPES). The finale: all the krathongs float away down the river with their wishes.
// Natural materials only (no styrofoam); no temples, monks or incense (see `ide local.md`); the name is never drawn in red.
import { KRATHONG_TYPES } from './item-options.js';
import { div, seeded, createStage, createStickers, createTopper, itemStates, nameText } from './stage.js';
import { drapeSvg } from './local.js';

// The night (gift.cake.flavor): the colour of the sky and the water.
export const FLAVORS = {
  moonlit: { label: 'Moonlit', sky: '#0F1B3D', sky2: '#24386B', water: '#0E2547', moon: '#FFF2C4' },
  twilight: { label: 'Twilight', sky: '#26163F', sky2: '#5B3366', water: '#1E1838', moon: '#FFD9B0' },
  golden: { label: 'Golden', sky: '#1B1630', sky2: '#6A4630', water: '#211B2A', moon: '#FFD36E' },
  jade: { label: 'Jade', sky: '#0D2626', sky2: '#1E4A45', water: '#0B2A2B', moon: '#EFFFF0' }
};
export const SWATCH = (f) => ({ background: `linear-gradient(180deg, ${f.sky2}, ${f.sky} 55%, ${f.water})` });

// What every krathong is made of (gift.cake.shape).
export const SHAPES = {
  classic: { label: 'Banana leaf' },
  lotus: { label: 'Lotus folds' },
  bread: { label: 'Bread' },
  coconut: { label: 'Coconut shell' }
};
// The lights on the far bank (gift.cake.accent), the sky (gift.cake.pattern), a mark above the name (gift.cake.topper).
export const ACCENTS = {
  warm: { label: 'Warm lights', color: '#FFD27A' },
  white: { label: 'White lights', color: '#F4F4FF' },
  pink: { label: 'Pink lights', color: '#FF9EC0' },
  dark: { label: 'No lights', color: '#3A3F55' }
};
export const PATTERNS = {
  plain: { label: 'Clear sky' },
  stars: { label: 'Stars' },
  fireworks: { label: 'Fireworks' },
  lanterns: { label: 'Far lanterns' }
};
export const TOPPERS = {
  none: { label: 'None' },
  sparkle: { label: 'Sparkles', emoji: '✨' },
  heart: { label: 'Heart', emoji: '💖' },
  star: { label: 'Star', emoji: '🌟' },
  flower: { label: 'Flower', emoji: '🌼' }
};

// ----- one krathong, in a 60×52 box (static markup, never user text) -----
// hex mixed towards white by k (0..1)
const light = (hex, k) => '#' + [1, 3, 5].map((j) => Math.round(parseInt(hex.slice(j, j + 2), 16) * (1 - k) + 255 * k).toString(16).padStart(2, '0')).join('');
function base(kind) {
  if (kind === 'bread') return '<ellipse cx="30" cy="42" rx="25" ry="8" fill="#B7793A"/><ellipse cx="30" cy="38" rx="24" ry="8.5" fill="#D9A25A"/><ellipse cx="30" cy="36.5" rx="20" ry="6" fill="#E8C27E"/><path d="M14 38q4-3 8 0M26 40q4-3 8 0M38 38q4-3 8 0" stroke="#B7793A" stroke-width="1" fill="none" opacity=".7"/>';
  if (kind === 'coconut') return '<path d="M5 34Q6 48 30 49Q54 48 55 34Z" fill="#6B4426"/><path d="M5 34Q6 48 30 49Q54 48 55 34" fill="none" stroke="#4A2E18" stroke-width="1"/><path d="M12 38q3 6 8 8M26 40q1 5 2 8M40 39q-2 5-5 8" stroke="#8A5A33" stroke-width="1" fill="none"/><ellipse cx="30" cy="34" rx="25" ry="7" fill="#F2EBD8"/>';
  // banana leaf: a pale banana-trunk disc ringed with folded green points (the back ones behind it, the front ones over it)
  const n = kind === 'lotus' ? 10 : 14, tall = kind === 'lotus' ? 15 : 9;
  let back = '', front = '';
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, x = 30 + 24 * Math.cos(a), y = 37 + 6.5 * Math.sin(a);
    const fold = `<path d="M${(x - 4.5).toFixed(1)} ${(y + 2).toFixed(1)}L${x.toFixed(1)} ${(y - tall).toFixed(1)}L${(x + 4.5).toFixed(1)} ${(y + 2).toFixed(1)}Z" fill="${k % 2 ? '#4E9A3E' : '#67B24E'}" stroke="#2F6B2A" stroke-width=".7" stroke-linejoin="round"/>`;
    if (Math.sin(a) < 0) back += fold; else front += fold;
  }
  return `<ellipse cx="30" cy="42" rx="27" ry="8" fill="#2F6B2A"/>${back}<ellipse cx="30" cy="38" rx="25" ry="7.5" fill="#E9E1C2"/><ellipse cx="30" cy="36.5" rx="18" ry="5" fill="#DCD3B0"/>${front}`;
}
function blooms(type) {
  const c = KRATHONG_TYPES[type]?.tint || '#F59A1E';
  const rnd = seeded(type.length * 7 + 3);
  let s = '';
  const spots = [[18, 32], [42, 32], [24, 28], [36, 28], [30, 31], [21, 35], [39, 35], [30, 26]];
  for (const [x, y] of spots) {
    if (type === 'lotus') s += `<path d="M${x} ${y + 4}C${x - 6} ${y} ${x - 3} ${y - 6} ${x} ${y - 8}C${x + 3} ${y - 6} ${x + 6} ${y} ${x} ${y + 4}Z" fill="${c}" stroke="${light(c, 0.25)}" stroke-width=".8"/>`;
    else if (type === 'orchid') s += `<g transform="rotate(${Math.round(rnd() * 60 - 30)} ${x} ${y})"><ellipse cx="${x - 3}" cy="${y}" rx="3.6" ry="2.2" fill="${c}"/><ellipse cx="${x + 3}" cy="${y}" rx="3.6" ry="2.2" fill="${c}"/><ellipse cx="${x}" cy="${y - 3}" rx="2.2" ry="3.4" fill="${light(c, 0.35)}"/><circle cx="${x}" cy="${y + 0.6}" r="1.3" fill="#FFF3B0"/></g>`;
    else if (type === 'jasmine') s += `<g fill="#FFFDF4" stroke="#D8D0B4" stroke-width=".5">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="${x}" cy="${y - 2.2}" rx="1.4" ry="2.4" transform="rotate(${a} ${x} ${y})"/>`).join('')}</g><circle cx="${x}" cy="${y}" r=".9" fill="#E8D27A"/>`;
    else if (type === 'rose') s += `<circle cx="${x}" cy="${y}" r="4" fill="${c}"/><path d="M${x - 2} ${y}a2 2 0 1 1 2 2a1 1 0 1 1-1-1" stroke="${light(c, 0.45)}" stroke-width=".8" fill="none"/>`;
    else s += `<circle cx="${x}" cy="${y}" r="4" fill="${c}"/><circle cx="${x}" cy="${y}" r="2.4" fill="${light(c, type === 'marigold' ? 0.3 : 0.45)}"/>`; // marigold, butterfly pea
  }
  return s;
}
const krathongSvg = (kind, type) => `<svg viewBox="0 0 60 52" class="k-svg" aria-hidden="true">${base(kind)}${blooms(type)}<rect x="28.6" y="13" width="2.8" height="14" rx="1" fill="#FFF6DD"/></svg><i class="k-flame"></i>`;
export const krathongKey = (type, i = 0) => (KRATHONG_TYPES[type] ? type : Object.keys(KRATHONG_TYPES)[i % Object.keys(KRATHONG_TYPES).length]);

// A krathong on its own (the friend's pick row).
export function miniKrathong(type, size = 44, kind = 'classic') {
  const holder = div('mini-krathong', { position: 'relative', width: `${size}px`, height: `${Math.round(size * 0.87)}px` });
  holder.innerHTML = krathongSvg(SHAPES[kind] ? kind : 'classic', krathongKey(type));
  holder.setAttribute('aria-hidden', 'true');
  return holder;
}

const W = 390, H = 340;
const SHORE = 150; // where the far bank meets the water
const MAX = 36;
let uid = 0;

// Where the krathongs float: rows on the water, smaller towards the far bank, every other row shifted.
export function krathongSpots(n) {
  n = Math.max(0, Math.min(MAX, Math.floor(Number(n) || 0)));
  if (!n) return [];
  const rows = n <= 3 ? [268] : n <= 8 ? [222, 290] : n <= 16 ? [200, 250, 304] : [186, 226, 266, 310];
  const big = n <= 3 ? 78 : n <= 8 ? 64 : n <= 16 ? 52 : n <= 26 ? 44 : 38;
  const scale = (y) => 0.58 + (0.42 * (y - SHORE)) / (H - SHORE);
  // nearer rows are bigger, so they hold fewer
  const weights = rows.map((y) => 1 / scale(y));
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.floor((n * w) / sum));
  for (let k = 0; counts.reduce((a, b) => a + b, 0) < n; k++) counts[k % rows.length]++;
  const rnd = seeded(17 + n);
  const spots = [];
  rows.forEach((y, r) => {
    const count = counts[r], size = Math.round(big * scale(y));
    const span = Math.min(W - size - 20, count * (size + 8));
    for (let k = 0; k < count; k++) {
      const x = (count === 1 ? W / 2 : W / 2 - span / 2 + (span * k) / (count - 1)) + (r % 2 ? size * 0.25 : 0) + (rnd() - 0.5) * 8;
      spots.push({ x, y: y + (rnd() - 0.5) * 6, size, bob: (2.2 + rnd() * 1.6).toFixed(2) });
    }
  });
  return spots.map((s, i) => ({ ...s, i }));
}

export function createKrathong(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size, setBackdrop } = createStage(host, W, H, 'krathongs');
  // the country (gift.cake.local): what hangs across the top at a wedding there
  const drape = div('local-drape');
  body.prepend(drape);
  const paintDrape = (k) => { drape.innerHTML = drapeSvg(k, W); }; // static markup
  paintDrape(opts.local);
  glow.style.top = '-60px';
  const id = `kt${++uid}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  Object.assign(svg.style, { position: 'absolute', left: '0', top: '0', width: `${W}px`, height: `${H}px`, overflow: 'visible' });
  body.append(svg);
  const sign = div('kt-name', { position: 'absolute', left: '20px', width: `${W - 40}px`, top: '58px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: '1.3' });
  const signFont = nameText(sign, true);
  body.append(sign);
  const placeTopper = createTopper(body, { x: W / 2, base: 56, size: 26 });

  let night = FLAVORS.moonlit, kind = 'classic', bank = ACCENTS.warm, pattern = 'plain', topper = 'none';

  function draw() {
    const rnd = seeded(23);
    let sky = '';
    if (pattern === 'stars') for (let k = 0; k < 40; k++) sky += `<circle class="kt-star" cx="${(rnd() * W).toFixed(1)}" cy="${(rnd() * (SHORE - 30)).toFixed(1)}" r="${(0.6 + rnd() * 1.1).toFixed(1)}" fill="#FFF" style="animation-delay:${(-rnd() * 3).toFixed(2)}s"/>`;
    if (pattern === 'fireworks') for (const [fx, fy, c] of [[70, 44, '#FF9EC0'], [300, 70, '#FFD27A'], [150, 28, '#9FD3FF']]) {
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; sky += `<path d="M${fx + 5 * Math.cos(a)} ${fy + 5 * Math.sin(a)}L${(fx + 17 * Math.cos(a)).toFixed(1)} ${(fy + 17 * Math.sin(a)).toFixed(1)}" stroke="${c}" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>`; }
    }
    if (pattern === 'lanterns') for (let k = 0; k < 14; k++) { const x = 20 + rnd() * 350, y = 14 + rnd() * 100, s = 2 + rnd() * 2.4; sky += `<rect class="kt-far" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${s.toFixed(1)}" height="${(s * 1.3).toFixed(1)}" rx="1" fill="#FFC56E" style="animation-delay:${(-rnd() * 6).toFixed(2)}s"/>`; }
    // the far bank: low hills and trees, with a string of lights
    let shore = `M0 ${SHORE}`;
    for (let x = 0; x <= W; x += 15) shore += `L${x} ${(SHORE - 10 - 8 * Math.sin(x / 37) - 6 * Math.abs(Math.sin(x / 11)) - (x > 230 && x < 300 ? 10 : 0)).toFixed(1)}`;
    shore += `L${W} ${SHORE}Z`;
    let lights = '';
    if (bank !== ACCENTS.dark) for (let x = 6; x < W; x += 9) lights += `<circle cx="${x}" cy="${(SHORE - 4 - (x % 27 === 0 ? 3 : 0)).toFixed(1)}" r="1.2" fill="${bank.color}"/>`;
    // the moon on the water: broken strokes of light, wider and fainter towards us
    let reflection = '';
    for (let k = 0; k < 13; k++) {
      const y = SHORE + 5 + k * 14, w = 8 + k * 3.4 + rnd() * 8, x = 318 + (rnd() - 0.5) * (6 + k * 2);
      reflection += `<rect x="${(x - w / 2).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${(2 + k * 0.25).toFixed(1)}" rx="1.5" fill="${night.moon}" opacity="${(0.6 - k * 0.035).toFixed(2)}"/>`;
    }
    let ripples = '';
    for (let k = 0; k < 14; k++) { const y = SHORE + 12 + k * 13, x = 20 + rnd() * 300, w = 20 + (y - SHORE) * 0.35; ripples += `<path d="M${x.toFixed(1)} ${y}q${(w / 4).toFixed(1)} -3 ${(w / 2).toFixed(1)} 0t${(w / 2).toFixed(1)} 0" stroke="rgba(255,255,255,.12)" stroke-width="1.2" fill="none"/>`; }
    svg.innerHTML = `<defs>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night.sky}"/><stop offset="1" stop-color="${night.sky2}"/></linearGradient>
      <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night.sky2}"/><stop offset=".25" stop-color="${night.water}"/><stop offset="1" stop-color="#05080F"/></linearGradient>
      <radialGradient id="${id}m" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="${night.moon}" stop-opacity=".45"/><stop offset="1" stop-color="${night.moon}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${SHORE}" fill="url(#${id}s)"/>${sky}
    <circle cx="318" cy="46" r="40" fill="url(#${id}m)"/><circle cx="318" cy="46" r="22" fill="${night.moon}"/>
    <circle cx="311" cy="40" r="4" fill="#000" opacity=".06"/><circle cx="325" cy="53" r="3" fill="#000" opacity=".05"/>
    <rect y="${SHORE - 2}" width="${W}" height="${H - SHORE + 2}" fill="url(#${id}w)"/>
    <g class="kt-reflect">${reflection}</g>
    <path d="${shore}" fill="#060A14" opacity=".9"/>${lights}${ripples}`;
    const t = TOPPERS[topper];
    placeTopper(t?.emoji ? t : null, '');
  }

  const items = [];
  const st = itemStates(items, glow);
  const stickers = createStickers(stage);
  const types = [];

  const api = {
    setLocal: paintDrape,
    wrap, stage, candles: items, toStage, size, stickers, ...st, setBackdrop,
    drawArea: null, // no drawing on the river
    setDots() {}, getDots() { return []; }, addDot() {},
    setFlavor(f) { night = FLAVORS[f] || FLAVORS.moonlit; draw(); },
    // every krathong is made the same way, so a new kind redraws them all
    setShape(k) { kind = SHAPES[k] ? k : 'classic'; stage.dataset.shape = kind; items.forEach((el, i) => el.classList.contains('spot') || api.setItemStyle(i, { type: types[i] })); },
    setAccent(k) { bank = ACCENTS[k] || ACCENTS.warm; draw(); },
    setPattern(k) { pattern = PATTERNS[k] ? k : 'plain'; draw(); },
    setTopper(k) { topper = k; draw(); },
    setName(text) { sign.textContent = text || ''; signFont.setSize(28); },
    setFont: signFont.setFont,
    setItemStyle(i, style) {
      const el = items[i];
      if (!el) return;
      const type = krathongKey(style?.type, i);
      types[i] = type;
      el.querySelector('.k-body').innerHTML = krathongSvg(kind, type);
      el.style.setProperty('--c', KRATHONG_TYPES[type].tint);
    },
    // Float `n` krathongs (+ empty ripples up to `spots`). Returns the krathong elements in message order.
    setCandles(n, { spots = n, items: styles, names, onTap } = {}) {
      layer.textContent = '';
      items.length = 0;
      const total = Math.min(Math.max(n, spots), MAX);
      const els = [];
      // back to front, so the near krathongs overlap the far ones
      for (const p of krathongSpots(total).sort((a, b) => a.y - b.y)) {
        const isSpot = p.i >= n;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'krathong' + (isSpot ? ' spot' : '');
        btn.tabIndex = isSpot || !onTap ? -1 : 0;
        if (!isSpot) btn.setAttribute('aria-label', names?.[p.i] ? `Play ${names[p.i]}'s message` : `Krathong ${p.i + 1}`);
        const h = Math.round(p.size * 0.87);
        Object.assign(btn.style, { left: `${(p.x - p.size / 2).toFixed(1)}px`, top: `${(p.y - h * 0.8).toFixed(1)}px`, width: `${p.size}px`, height: `${h}px` });
        btn.style.setProperty('--bob', `${p.bob}s`);
        btn.style.setProperty('--bob-at', `${(-p.i * 0.53).toFixed(2)}s`);
        // the finale: away down the river, towards the far bank on the right
        btn.style.setProperty('--away-x', `${Math.round(W + 40 - p.x + (p.i % 4) * 20)}px`);
        btn.style.setProperty('--away-y', `${Math.round(SHORE + 8 - p.y)}px`);
        btn.style.setProperty('--away-at', `${((p.i % 7) * 0.22).toFixed(2)}s`);
        btn.append(div('k-glow'), div('k-body'));
        if (onTap && !isSpot) btn.addEventListener('click', () => onTap(p.i));
        layer.append(btn);
        els[p.i] = btn;
      }
      items.push(...els);
      for (let i = 0; i < n && i < MAX; i++) api.setItemStyle(i, styles?.[i]);
      st.updateGlow();
      return els;
    },
    // Finale: they float away one after another, the nearest first.
    finaleOrder(n) { return krathongSpots(Math.min(n, MAX)).sort((a, b) => b.y - a.y || a.x - b.x).map((s) => s.i); },
    finaleOut(i) { st.out(i, true); },
    setBend() {},
    setDim(level) { body.style.filter = stickers.layer.style.filter = level ? `saturate(${1 - 0.4 * level}) brightness(${1 - 0.4 * level})` : 'none'; },
    reset() { items.forEach((c) => c.classList.remove('out')); api.lightAll(); }
  };

  night = FLAVORS[opts.flavor] || FLAVORS.moonlit;
  kind = SHAPES[opts.shape] ? opts.shape : 'classic';
  stage.dataset.shape = kind;
  bank = ACCENTS[opts.accent] || ACCENTS.warm;
  pattern = PATTERNS[opts.pattern] ? opts.pattern : 'plain';
  topper = opts.topper || 'none';
  draw();
  api.setFont(opts.font);
  api.setName(opts.name);
  st.updateGlow();
  setBackdrop(opts.backdrop);
  stickers.set(opts.stickers);
  return api;
}
