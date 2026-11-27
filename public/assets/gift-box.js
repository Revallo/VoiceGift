// Gift box: one big wrapped box, and a little glowing present around it for every voice.
// Drawn in a fixed 390×340 stage, same API as the other scenes. The finale: the big box opens (finaleStart),
// then every little present pops its lid (finaleOut); reveal.js adds the confetti.
// No words are drawn here: the text on the box is gift.cake.name, picked from the occasion (themes.js).
import { colorFor } from './common.js';
import { div, createStage, createDrawing, createStickers, createTopper, itemStates, nameText } from './stage.js';

// The wrapping paper (gift.cake.flavor): paper, its shade, the print colour, the colour of the words on it.
export const FLAVORS = {
  red: { label: 'Red', paper: '#E8484F', shade: '#C2333B', print: '#FF8C8F', ink: '#FFFFFF' },
  green: { label: 'Pine', paper: '#3E9A6A', shade: '#2D7A52', print: '#7CD3A3', ink: '#FFFFFF' },
  blue: { label: 'Blue', paper: '#4F86E8', shade: '#3A68C4', print: '#9CC0FF', ink: '#FFFFFF' },
  pink: { label: 'Pink', paper: '#F58FB4', shade: '#DB6E96', print: '#FFC6DA', ink: '#FFFFFF' },
  gold: { label: 'Gold', paper: '#F2C14E', shade: '#D49E2A', print: '#FFE3A0', ink: '#5B3A29' },
  purple: { label: 'Purple', paper: '#9B7BE0', shade: '#7C5CC4', print: '#CBB8FA', ink: '#FFFFFF' },
  mint: { label: 'Mint', paper: '#8FDCC4', shade: '#68C0A5', print: '#C8F2E5', ink: '#2E5E50' },
  kraft: { label: 'Kraft', paper: '#C99A66', shade: '#A97C4C', print: '#E6C59A', ink: '#5B3A29' },
  white: { label: 'Snow', paper: '#F7F3EC', shade: '#DED6C8', print: '#E8DFD0', ink: '#5B3A29' }
};
export const SWATCH = (f) => ({ background: f.paper, boxShadow: `inset 0 -10px 0 ${f.shade}` });

// The box (gift.cake.shape): width and height of the base, the lid's height, how round it is.
export const SHAPES = {
  classic: { label: 'Classic', w: 176, h: 118, lid: 30, r: 10 },
  tall: { label: 'Tall', w: 140, h: 150, lid: 28, r: 10 },
  wide: { label: 'Wide', w: 216, h: 96, lid: 28, r: 10 },
  round: { label: 'Hatbox', w: 172, h: 112, lid: 30, r: 86 }
};
// The ribbon (gift.cake.accent), the print on the paper (gift.cake.pattern), what sits on the lid (gift.cake.topper).
export const ACCENTS = {
  gold: { label: 'Gold', color: '#F6C445' },
  white: { label: 'White', color: '#FFFDF8' },
  red: { label: 'Red', color: '#E23B45' },
  green: { label: 'Green', color: '#3E9A6A' },
  pink: { label: 'Pink', color: '#FF8DB5' },
  blue: { label: 'Blue', color: '#5D8FF0' }
};
export const PATTERNS = {
  plain: { label: 'Plain' },
  dots: { label: 'Dots' },
  stripes: { label: 'Stripes' },
  stars: { label: 'Stars' },
  checks: { label: 'Checks' }
};
export const TOPPERS = {
  none: { label: 'Just the bow' },
  star: { label: 'Star', emoji: '⭐' },
  heart: { label: 'Heart', emoji: '💖' },
  flower: { label: 'Flower', emoji: '🌸' },
  tree: { label: 'Tree', emoji: '🎄' },
  age: { label: 'Age', age: true }
};

const W = 390, H = 340, CX = 195, FLOOR = 306;
const MAX = 40;
const OL = '#5B3A29'; // the brown sticker outline (soft.css --ol)

// Where the little presents go: an arc over the big box, then little piles on the floor at both sides.
export function presentSpots(n) {
  n = Math.max(0, Math.min(MAX, Math.floor(Number(n) || 0)));
  if (!n) return [];
  const size = n <= 6 ? 50 : n <= 10 ? 44 : n <= 16 ? 38 : n <= 26 ? 33 : 29;
  const arc = n <= 12 ? n : Math.min(22, Math.ceil(n * 0.55));
  const floor = n - arc;
  const spots = [];
  for (let k = 0; k < arc; k++) {
    const a = ((arc === 1 ? 270 : 192 + (156 * k) / (arc - 1)) * Math.PI) / 180;
    spots.push({ x: CX + 168 * Math.cos(a), y: 222 + 160 * Math.sin(a), size });
  }
  // piles: three wide, up to three high, filled from the bottom, left and right in turn
  const cols = [[26, 60, 94], [364, 330, 296]];
  for (let k = 0; k < floor; k++) {
    const side = k % 2, m = Math.floor(k / 2), row = Math.floor(m / 3), col = m % 3;
    spots.push({ x: cols[side][col] + (row % 2 ? (side ? -8 : 8) : 0), y: FLOOR + 10 - size / 2 - row * (size - 4), size: size - 4 });
  }
  return spots.map((s, i) => ({ ...s, i }));
}

// One little present (static markup). Its colour is --c.
const PRESENT = `<svg class="p-art" viewBox="0 0 40 40" aria-hidden="true">
  <rect class="p-base" x="5" y="16" width="30" height="21" rx="3" fill="var(--c)" stroke="${OL}" stroke-width="2.2"/>
  <rect x="17" y="16" width="6" height="21" fill="#FFF6E0" stroke="${OL}" stroke-width="1.4"/>
  <g class="p-lid"><rect x="3" y="10" width="34" height="8" rx="2.5" fill="var(--c)" stroke="${OL}" stroke-width="2.2"/>
  <rect x="17" y="10" width="6" height="8" fill="#FFF6E0" stroke="${OL}" stroke-width="1.4"/>
  <path d="M20 10q-9-9-11-3t11 3q9-9 11-3t-11 3" fill="#FFF6E0" stroke="${OL}" stroke-width="1.6" stroke-linejoin="round"/></g>
</svg>`;

function printDefs(id, pattern, c) {
  const P = (inner, s = 18) => `<pattern id="${id}p" width="${s}" height="${s}" patternUnits="userSpaceOnUse">${inner}</pattern>`;
  if (pattern === 'dots') return P(`<circle cx="4.5" cy="4.5" r="2.6" fill="${c.print}"/><circle cx="13.5" cy="13.5" r="2.6" fill="${c.print}"/>`);
  if (pattern === 'stripes') return P(`<path d="M-4 22L22-4M5 31L31 5" stroke="${c.print}" stroke-width="5"/>`);
  if (pattern === 'stars') return P(`<path d="M9 3.2l1.7 3.5 3.8.5-2.8 2.6.7 3.8L9 11.8l-3.4 1.8.7-3.8-2.8-2.6 3.8-.5z" fill="${c.print}"/>`, 22);
  if (pattern === 'checks') return P(`<rect width="9" height="9" fill="${c.print}" opacity=".7"/><rect x="9" y="9" width="9" height="9" fill="${c.print}" opacity=".7"/>`);
  return '';
}

export function createGiftBox(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size, setBackdrop } = createStage(host, W, H, 'giftbox');
  glow.style.top = '40px';
  const art = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  art.setAttribute('viewBox', `0 0 ${W} ${H}`);
  art.setAttribute('aria-hidden', 'true');
  art.classList.add('gb-art');
  Object.assign(art.style, { position: 'absolute', left: '0', top: '0', width: `${W}px`, height: `${H}px`, overflow: 'visible' });
  body.append(art);
  const drawing = createDrawing(body, W, H);
  const words = div('gb-name', { position: 'absolute', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: '1.2' });
  const wordsFont = nameText(words, true);
  body.append(words);
  const placeTopper = createTopper(body, { x: CX, base: 120, size: 30 });

  let flavor = FLAVORS.red, shape = SHAPES.classic, ribbon = null, pattern = 'plain', topper = 'none', age = 0;
  const id = `gb${Math.random().toString(36).slice(2, 7)}`;

  // The big box: base, lid (its own group, so it can fly off), ribbon, bow.
  function draw() {
    const { w, h, lid, r } = shape;
    const x = CX - w / 2, top = FLOOR - h, lw = w + 16, lx = CX - lw / 2, ly = top - lid + 6;
    const rib = ribbon || '#F6C445';
    const round = r > 40; // the hatbox: an oval top and bottom
    const print = pattern !== 'plain' ? `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="url(#${id}p)"/>` : '';
    const base = round
      ? `<path d="M${x} ${top}V${FLOOR - 12}A${w / 2} 14 0 0 0 ${x + w} ${FLOOR - 12}V${top}Z"/>`
      : `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="6"/>`;
    const lidShape = round
      ? `<ellipse cx="${CX}" cy="${ly + lid / 2}" rx="${lw / 2}" ry="${lid / 2 + 6}"/>`
      : `<rect x="${lx}" y="${ly}" width="${lw}" height="${lid}" rx="6"/>`;
    art.innerHTML = `<defs>${printDefs(id, pattern, flavor)}<clipPath id="${id}b">${base}</clipPath></defs>
      <ellipse cx="${CX}" cy="${FLOOR + 4}" rx="${w / 2 + 26}" ry="10" fill="rgba(60,35,20,.16)"/>
      <g class="gb-light"><path d="M${CX - w / 2 + 14} ${top} L${CX - w} 0 H${CX + w} L${CX + w / 2 - 14} ${top}Z" fill="url(#${id}l)" opacity=".9"/></g>
      <g clip-path="url(#${id}b)"><rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${flavor.paper}"/>${print}
        <rect x="${x + w - 26}" y="${top}" width="26" height="${h}" fill="${flavor.shade}" opacity=".55"/>
        <rect x="${CX - 9}" y="${top}" width="18" height="${h}" fill="${rib}"/></g>
      <g fill="none" stroke="${OL}" stroke-width="4">${base}</g>
      <path d="M${CX - 9} ${top}V${FLOOR - (round ? 2 : 0)}M${CX + 9} ${top}V${FLOOR - (round ? 2 : 0)}" stroke="${OL}" stroke-width="2"/>
      <g class="gb-lid">
        <g fill="${flavor.paper}" stroke="${OL}" stroke-width="4">${lidShape}</g>
        <rect x="${CX - 9}" y="${ly + 1}" width="18" height="${lid - 2}" fill="${rib}" stroke="${OL}" stroke-width="2"/>
        <g fill="${rib}" stroke="${OL}" stroke-width="3" stroke-linejoin="round">
          <path d="M${CX} ${ly + 2}C${CX - 18} ${ly - 30} ${CX - 52} ${ly - 22} ${CX - 40} ${ly - 4}C${CX - 32} ${ly + 6} ${CX - 12} ${ly + 4} ${CX} ${ly + 2}Z"/>
          <path d="M${CX} ${ly + 2}C${CX + 18} ${ly - 30} ${CX + 52} ${ly - 22} ${CX + 40} ${ly - 4}C${CX + 32} ${ly + 6} ${CX + 12} ${ly + 4} ${CX} ${ly + 2}Z"/>
          <path d="M${CX - 4} ${ly + 4}L${CX - 22} ${ly + 30}L${CX - 12} ${ly + 28}L${CX - 8} ${ly + 38}Z"/>
          <path d="M${CX + 4} ${ly + 4}L${CX + 22} ${ly + 30}L${CX + 12} ${ly + 28}L${CX + 8} ${ly + 38}Z"/>
          <ellipse cx="${CX}" cy="${ly + 1}" rx="9" ry="8"/>
        </g>
      </g>`;
    // the soft light that comes out when the box opens
    const defs = art.querySelector('defs');
    defs.insertAdjacentHTML('beforeend', `<linearGradient id="${id}l" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFF4C2" stop-opacity=".95"/><stop offset="1" stop-color="#FFF4C2" stop-opacity="0"/></linearGradient>`);
    // the words sit on the front of the box, under the bow's tails
    const nameTop = top + Math.max(34, h * 0.42);
    Object.assign(words.style, { left: `${x + 10}px`, width: `${w - 20}px`, top: `${nameTop}px`, color: flavor.ink,
      textShadow: flavor.ink === '#FFFFFF' ? `0 2px 0 ${flavor.shade}` : 'none' });
    stage.style.setProperty('--lid-y', `${ly}px`);
    drawTopper(ly);
  }
  function drawTopper(ly = FLOOR - shape.h - shape.lid + 6) {
    const t = TOPPERS[topper];
    placeTopper(t?.emoji ? t : null, t?.age && age ? String(age) : '');
    const el = body.querySelector('.topper');
    if (el) el.style.top = `${ly - 46}px`;
  }

  const presents = [];
  const st = itemStates(presents, glow);
  const stickers = createStickers(stage);

  const api = {
    wrap, stage, candles: presents, toStage, size, stickers, ...st, setBackdrop,
    drawArea: { left: 40, top: 150, width: 310, height: 160 },
    setDots: drawing.setDots, getDots: drawing.getDots, addDot: drawing.addDot,
    setFlavor(f) { flavor = FLAVORS[f] || FLAVORS.red; draw(); },
    setShape(k) { shape = SHAPES[k] || SHAPES.classic; stage.dataset.shape = SHAPES[k] ? k : 'classic'; draw(); },
    setAccent(k) { ribbon = ACCENTS[k]?.color || null; draw(); },
    setPattern(k) { pattern = PATTERNS[k] ? k : 'plain'; draw(); },
    setTopper(k, a) { topper = k; age = a || 0; drawTopper(); },
    setName(text) { words.textContent = text || ''; wordsFont.setSize((text || '').length > 16 ? 20 : 26); },
    setFont: wordsFont.setFont,
    setNames() {},
    // Lay out `n` presents (+ empty places up to `spots`). Returns the present elements in message order.
    setCandles(n, { spots = n, colors, names, onTap } = {}) {
      layer.textContent = '';
      presents.length = 0;
      const total = Math.min(Math.max(n, spots), MAX);
      const els = [];
      for (const p of presentSpots(total).sort((a, b) => a.y - b.y)) {
        const isSpot = p.i >= n;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'present' + (isSpot ? ' spot' : '');
        btn.tabIndex = isSpot || !onTap ? -1 : 0;
        if (!isSpot) btn.setAttribute('aria-label', names?.[p.i] ? `Play ${names[p.i]}'s message` : `Present ${p.i + 1}`);
        Object.assign(btn.style, { left: `${(p.x - p.size / 2).toFixed(1)}px`, top: `${(p.y - p.size / 2).toFixed(1)}px`, width: `${p.size}px`, height: `${p.size}px` });
        btn.style.setProperty('--c', (colors && colors[p.i]) || colorFor(p.i));
        btn.style.setProperty('--hop-at', `${((p.i % 6) * 0.06).toFixed(2)}s`);
        btn.style.setProperty('--bob-at', `${(-p.i * 0.41).toFixed(2)}s`);
        if (!isSpot) btn.innerHTML = PRESENT; // static markup
        if (onTap && !isSpot) btn.addEventListener('click', () => onTap(p.i));
        layer.append(btn);
        els[p.i] = btn;
      }
      presents.push(...els);
      st.updateGlow();
      return els;
    },
    // Finale: the big box opens, then every little present pops its lid, left to right.
    finaleStart() { stage.classList.add('opened'); },
    finaleOrder(n) { return presentSpots(Math.min(n, MAX)).sort((a, b) => a.x - b.x).map((s) => s.i); },
    finaleOut(i) { st.out(i, true); },
    setBend() {},
    setDim(level) { body.style.filter = stickers.layer.style.filter = level ? `saturate(${1 - 0.4 * level}) brightness(${1 - 0.4 * level})` : 'none'; },
    reset() { stage.classList.remove('opened'); presents.forEach((c) => c.classList.remove('out')); api.lightAll(); }
  };

  flavor = FLAVORS[opts.flavor] || FLAVORS.red;
  shape = SHAPES[opts.shape] || SHAPES.classic;
  stage.dataset.shape = SHAPES[opts.shape] ? opts.shape : 'classic';
  ribbon = ACCENTS[opts.accent]?.color || null;
  pattern = PATTERNS[opts.pattern] ? opts.pattern : 'plain';
  topper = opts.topper || 'none';
  age = opts.age || 0;
  draw();
  api.setFont(opts.font);
  api.setName(opts.name);
  setBackdrop(opts.backdrop);
  drawing.setDots(opts.dots);
  stickers.set(opts.stickers);
  return api;
}
