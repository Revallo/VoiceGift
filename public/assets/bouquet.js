// Graduation: the bouquet. Drawn in a fixed 390×370 stage; every voice is a flower that blooms.
import { colorFor } from './common.js';
import { ITEM_COLORS, FLOWER_TYPES } from './item-options.js';
import { div, seeded, createStage, createDrawing, createStickers, createTopper, itemStates, nameText } from './stage.js';
import { moneySvg, snackSvg, snackKey } from './local.js';

// Wrap colours. The keys are the same as the cake flavours so the API stays the same.
export const WRAPS = {
  strawberry: { label: 'Blush', back: '#D982A6', back2: '#E9A3C0', front: '#F6DDCB', front2: '#EBCDB8', text: '#2B2F55', bow: '#2B2F55' },
  chocolate: { label: 'Kraft', back: '#A9774F', back2: '#C29068', front: '#EAD4B0', front2: '#DCC39C', text: '#4A2C17', bow: '#4A2C17' },
  matcha: { label: 'Sage', back: '#7FA37A', back2: '#9DBE93', front: '#EEF2E3', front2: '#DEE6CF', text: '#2F4A2C', bow: '#2F4A2C' },
  ube: { label: 'Lilac', back: '#9B80CC', back2: '#B7A0E0', front: '#F1EAFB', front2: '#E2D7F4', text: '#3E2A6B', bow: '#3E2A6B' },
  vanilla: { label: 'Cream', back: '#D9B66A', back2: '#E8CB88', front: '#FBF2DC', front2: '#F0E3C3', text: '#6A4A12', bow: '#2B2F55' },
  redvelvet: { label: 'Ruby', back: '#A92D40', back2: '#C4485A', front: '#F7E3DC', front2: '#ECD0C7', text: '#7A1E2C', bow: '#7A1E2C' },
  navy: { label: 'Navy', back: '#2F3A78', back2: '#4352A0', front: '#EEF0FA', front2: '#DCE0F2', text: '#2B2F55', bow: '#C9A24A' },
  sky: { label: 'Sky', back: '#6FB2E6', back2: '#94C9F0', front: '#F1F8FE', front2: '#DDEDFA', text: '#1F4E7A', bow: '#1F4E7A' },
  peach: { label: 'Peach', back: '#F29C7A', back2: '#F7B99F', front: '#FFF1E8', front2: '#F8E0D2', text: '#7A3A1E', bow: '#7A3A1E' },
  mint: { label: 'Mint', back: '#5CC8A8', back2: '#8ADBC2', front: '#EFFBF6', front2: '#DBF2E9', text: '#1E5E4B', bow: '#1E5E4B' },
  charcoal: { label: 'Charcoal', back: '#2E2A33', back2: '#47414F', front: '#F3EFE8', front2: '#E3DDD2', text: '#2E2A33', bow: '#C9A24A' },
  gold: { label: 'Gold', back: '#C9A24A', back2: '#DDBB6A', front: '#FFF9EA', front2: '#F4EAD0', text: '#6A4A12', bow: '#6A4A12' },
  white: { label: 'White', back: '#E9E4EE', back2: '#F6F3F8', front: '#FFFFFF', front2: '#F1EEF4', text: '#2B2F55', bow: '#D982A6' },
  coral: { label: 'Coral', back: '#FF6F61', back2: '#FF9488', front: '#FFF0EC', front2: '#F8DCD5', text: '#8E2A20', bow: '#8E2A20' }
};
export const SWATCH = (w) => ({ background: w.front, boxShadow: `inset 0 -12px 0 ${w.back}` });

// The ribbon (gift.cake.accent), the flower petals (gift.cake.pattern), what's tucked in on top (gift.cake.topper).
export const ACCENTS = {
  auto: { label: 'Same as wrap', color: 'conic-gradient(#FF6B6B, #FFB627, #4ECDC4, #A66CFF, #FF6B6B)' },
  red: { label: 'Red', color: '#E23D4B' },
  pink: { label: 'Pink', color: '#FF7FB0' },
  gold: { label: 'Gold', color: '#E7B32E' },
  blue: { label: 'Blue', color: '#3C7BEA' },
  green: { label: 'Green', color: '#35A56B' },
  white: { label: 'White', color: '#FFFFFF' }
};
export const PATTERNS = {
  round: { label: 'Round petals' },
  tulip: { label: 'Tulips' },
  rose: { label: 'Roses' },
  daisy: { label: 'Daisies' }
};
export const TOPPERS = {
  none: { label: 'None' },
  card: { label: 'Love note', emoji: '💌' },
  cap: { label: 'Grad cap', emoji: '🎓' },
  bear: { label: 'Teddy', emoji: '🧸' },
  star: { label: 'Star', emoji: '🌟' },
  medal: { label: 'Medal', emoji: '🥇' }
};

const W = 390, H = 370;

export function miniFlower(style) {
  const holder = div('stage mini-flower', { position: 'relative', width: '48px', height: '48px' });
  holder.style.setProperty('--c', ITEM_COLORS[style?.color]?.hex || ITEM_COLORS.pink.hex);
  const flower = div('flower lit', { left: '5px', top: '5px', width: '38px', height: '38px' });
  flower.dataset.petal = FLOWER_TYPES[style?.type] ? style.type : 'round';
  const bloom = div('f-bloom');
  for (let k = 0; k < 5; k++) { const petal = div('f-petal'); petal.style.setProperty('--a', `${k * 72}deg`); bloom.append(petal); }
  bloom.append(div('f-core')); flower.append(bloom); holder.append(flower);
  holder.setAttribute('aria-hidden', 'true');
  return holder;
}

// The greenery around the flowers (gift.cake.greens).
export const GREENS = {
  leaf: { label: 'Leaves' },
  eucalyptus: { label: 'Eucalyptus' },
  fern: { label: 'Fern' },
  none: { label: 'None' }
};

// One sprig, drawn pointing up from (0, 0) with length l. Returns SVG markup (static, no user text).
const r1 = (n) => Math.round(n * 10) / 10;
function leafPath(l, w) { // a pointed leaf; the right half a shade darker, a light vein down the middle
  const a = `M0 0C${r1(w * 0.62)} ${r1(-l * 0.22)} ${r1(w * 0.52)} ${r1(-l * 0.74)} 0 ${-l}`;
  const b = `C${r1(-w * 0.52)} ${r1(-l * 0.74)} ${r1(-w * 0.62)} ${r1(-l * 0.22)} 0 0Z`;
  return `<path d="${a}${b}" fill="#6FA86A"/><path d="${a}Z" fill="#4F8A50"/><path d="M0 0L0 ${r1(-l * 0.88)}" stroke="#CFE8C4" stroke-opacity=".45" stroke-width="1.2"/>`;
}
function sprig(kind, l) {
  let out = '';
  const at = (x, y, rot, inner) => `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${rot})">${inner}</g>`;
  if (kind === 'eucalyptus') {
    out += `<path d="M0 0Q4 ${r1(-l / 2)} 0 ${-l}" stroke="#7F9A8C" stroke-width="2" fill="none"/>`;
    for (let k = 0, y = -8; y > -l + 2; k++, y -= 9) {
      const r = 8.5 - (k * 4.5) / (l / 9);
      out += `<ellipse cx="${k % 2 ? 6 : -6}" cy="${y}" rx="${r1(r)}" ry="${r1(r * 0.86)}" fill="${k % 2 ? '#9DB8A8' : '#86A595'}" stroke="#6E8C7C" stroke-width="1"/>`;
    }
    return out;
  }
  if (kind === 'fern') {
    out += `<path d="M0 0L0 ${-l}" stroke="#4C8746" stroke-width="2"/>`;
    for (let y = -6; y > -l + 3; y -= 5) {
      const len = 4 + 13 * ((l + y) / l);
      for (const side of [-1, 1]) out += at(0, y, side * 62, `<ellipse cx="0" cy="${r1(-len / 2)}" rx="2.2" ry="${r1(len / 2)}" fill="${side < 0 ? '#6BAA60' : '#57944F'}"/>`);
    }
    return out + at(0, -l, 0, '<ellipse cx="0" cy="-3" rx="2.2" ry="4" fill="#6BAA60"/>');
  }
  // leaf: a short stem, one leaf at the tip and two at the sides
  out += `<path d="M0 0L0 ${r1(-l * 0.62)}" stroke="#4F8A50" stroke-width="2.4"/>`;
  out += at(0, -l * 0.3, -46, leafPath(l * 0.42, l * 0.3));
  out += at(0, -l * 0.42, 44, leafPath(l * 0.4, l * 0.28));
  out += at(0, -l * 0.58, 0, leafPath(l * 0.44, l * 0.32));
  return out;
}
function greensSvg(kind) {
  if (kind === 'none') return '';
  const rnd = seeded(23);
  let g = '';
  // around the edge: sprigs reaching out from behind the flowers
  for (const a of [-86, -64, -42, -20, 2, 22, 44, 66, 88]) {
    const rad = ((a + (rnd() - 0.5) * 8) * Math.PI) / 180;
    const x = 195 + Math.sin(rad) * 112, y = 146 - Math.cos(rad) * 84;
    const l = (a / 2) % 2 ? 54 : 64;
    g += `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1((rad * 180) / Math.PI)})">${sprig(kind, l)}</g>`;
  }
  // inside: a few short ones among the flowers, so a bouquet with few voices still looks full
  for (const [x, y, r] of [[118, 120, -40], [156, 96, -16], [234, 96, 16], [272, 120, 40], [195, 138, 0], [104, 160, -64], [286, 160, 64]]) {
    g += `<g transform="translate(${x} ${y}) rotate(${r})">${sprig(kind, 40)}</g>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;overflow:visible" aria-hidden="true">${g}</svg>`;
}



// Flower positions for n flowers (1–40): rows from the back (top) to the front, each wider than the last.
export function flowerSpots(n, shape = 'classic') {
  const rows = n <= 3 ? 1 : n <= 7 ? 2 : n <= 12 ? 3 : n <= 20 ? 4 : n <= 30 ? 5 : 6;
  const size = n <= 3 ? 72 : n <= 7 ? 58 : n <= 12 ? 52 : n <= 20 ? 44 : n <= 30 ? 38 : 34;
  const weights = Array.from({ length: rows }, (_, r) => 3 + r);
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.floor((n * w) / sum));
  for (let left = n - counts.reduce((a, b) => a + b, 0), r = rows - 1; left > 0; left--, r = (r + rows - 1) % rows) counts[r]++;
  const rnd = seeded(11 + n);
  const spots = [];
  counts.forEach((c, r) => {
    const rim = shape === 'box' ? 156 : shape === 'basket' ? 160 : 166;
    const lastY = rim - size / 2 - 10;
    const y = rows === 1 ? lastY : 62 + ((lastY - 62) * r) / (rows - 1);
    const width = Math.min(250, (c - 1) * size * 0.98);
    for (let k = 0; k < c; k++) {
      const x = 195 + (c === 1 ? 0 : -width / 2 + (width * k) / (c - 1));
      spots.push({ x, y, s: size, rot: Math.round(rnd() * 30) });
    }
  });
  // Spread the messages over the bouquet instead of filling it row by row.
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  return spots.map((s, i) => ({ ...s, i }));
}

const poly = (pts) => `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(', ')})`;

// The kinds of bouquet (gift.cake.shape). The flowers sit in the same place in all of them.
export const SHAPES = {
  classic: { label: 'Soft wrap' },
  box: { label: 'Flower box' },
  basket: { label: 'Basket' },
  tied: { label: 'Hand-tied' },
  // Each voice is a fan of folded notes / a snack instead of a flower, in the soft wrap. The money and the
  // snacks follow the gift's country (gift.cake.local, see local.js).
  money: { label: 'Money bouquet', treat: 'money' },
  snack: { label: 'Snack bouquet', treat: 'snack' }
};
export const isTreat = (shape) => Boolean(SHAPES[shape]?.treat);

const full = { left: '0', top: '0', width: `${W}px`, height: `${H}px` };

// The bow: two loops + two tails around (x, y), plus the gold knot.
function bow(P, x, y) {
  P({ left: `${x - 59}px`, top: `${y - 8}px`, width: '56px', height: '32px', borderRadius: '50%', transform: 'rotate(18deg)' }, 'bow');
  P({ left: `${x + 3}px`, top: `${y - 8}px`, width: '56px', height: '32px', borderRadius: '50%', transform: 'rotate(-18deg)' }, 'bow');
  P({ left: `${x - 11}px`, top: `${y + 14}px`, width: '10px', height: '46px', borderRadius: '3px', transform: 'rotate(16deg)', transformOrigin: '50% 0' }, 'bow');
  P({ left: `${x + 1}px`, top: `${y + 14}px`, width: '10px', height: '46px', borderRadius: '3px', transform: 'rotate(-16deg)', transformOrigin: '50% 0' }, 'bow');
  P({ left: `${x - 10}px`, top: `${y}px`, width: '20px', height: '20px', borderRadius: '50%', background: '#D9A93A', boxShadow: 'inset -3px -3px 0 rgba(0,0,0,0.15)' });
}

// The country's motif, printed lightly on the wrapping paper (gift.cake.local): the same patterns as the local
// lanterns and backdrops, scaled up for paper. Faint, so the name on the wrap stays easy to read.
const kawung = (c, s) => { const a = (s * 0.13).toFixed(1), b = (s * 0.22).toFixed(1); return ['50% 25%', '50% 75%', '25% 50%', '75% 50%'].map((at, i) => `radial-gradient(ellipse ${i < 2 ? `${a}px ${b}px` : `${b}px ${a}px`} at ${at}, ${c} 94%, transparent) 0 0 / ${s}px ${s}px`).join(', ') + `, radial-gradient(circle at 50% 50%, ${c} 0 ${(s * 0.05).toFixed(1)}px, transparent ${(s * 0.07).toFixed(1)}px) 0 0 / ${s}px ${s}px`; };
const blossoms = (petal, heart, s) => ['50% 30%', '31% 46%', '69% 46%', '38% 68%', '62% 68%'].map((at) => `radial-gradient(circle at ${at}, ${petal} 0 2.6px, transparent 3.1px) 0 0 / ${s}px ${s}px`).join(', ') + `, radial-gradient(circle at 50% 50%, ${heart} 0 1.8px, transparent 2.3px) 0 0 / ${s}px ${s}px`;
export const WRAP_MOTIFS = {
  id: kawung('rgba(92, 56, 26, 0.45)', 44),
  th: 'radial-gradient(circle, rgba(201, 150, 28, 0.7) 0 2px, transparent 2.5px) 0 0 / 16px 16px, repeating-linear-gradient(45deg, rgba(201, 150, 28, 0.5) 0 1.2px, transparent 1.2px 11.3px), repeating-linear-gradient(-45deg, rgba(201, 150, 28, 0.5) 0 1.2px, transparent 1.2px 11.3px)',
  ph: 'repeating-linear-gradient(45deg, rgba(232, 87, 122, 0.32) 0 6px, transparent 6px 12px), repeating-linear-gradient(-45deg, rgba(63, 163, 122, 0.26) 0 6px, transparent 6px 12px)',
  vn: blossoms('rgba(240, 176, 20, 0.8)', 'rgba(214, 90, 20, 0.75)', 30)
};

// Builds a shape: B() = behind the flowers, F() = in front. Second argument = the wrap colour it takes.
// Returns where the name goes.
function buildShape(shape, B, F) {
  if (shape === 'box') {
    B({ left: '56px', top: '136px', width: '278px', height: '60px', borderRadius: '50%', boxShadow: 'inset 0 10px 18px rgba(0,0,0,0.35)' }, 'back');
    F({ left: '58px', top: '168px', width: '274px', height: '180px', borderRadius: '0 0 137px 137px / 0 0 30px 30px' }, 'front');
    F({ left: '195px', top: '168px', width: '137px', height: '180px', borderRadius: '0 0 137px 0 / 0 0 30px 0' }, 'front2');
    F({ left: '52px', top: '156px', width: '286px', height: '28px', borderRadius: '50%', boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.12)' }, 'back2');
    F({ left: '58px', top: '292px', width: '274px', height: '18px' }, 'bow');
    bow(F, 195, 290);
    return { top: 214 };
  }
  if (shape === 'basket') {
    B({ left: '62px', top: '0px', width: '266px', height: '330px', boxSizing: 'border-box', border: '12px solid', borderBottom: '0', borderRadius: '50% 50% 0 0 / 46% 46% 0 0', background: 'transparent' }, 'handle');
    F({ ...full, clipPath: poly([[46, 174], [344, 174], [300, 352], [90, 352]]) }, 'weave');
    F({ left: '40px', top: '160px', width: '310px', height: '24px', borderRadius: '12px', boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.15)' }, 'back');
    bow(F, 300, 176);
    return { top: 218 };
  }
  if (shape === 'tied') {
    // the stems start just below the lowest flowers, so they never cover one
    F({ ...full, clipPath: poly([[146, 184], [244, 184], [214, 292], [210, 362], [180, 362], [176, 292]]), background: 'repeating-linear-gradient(96deg, #4F8455 0 7px, #3F6E46 7px 10px)' });
    F({ left: '166px', top: '262px', width: '58px', height: '26px', borderRadius: '8px' }, 'bow');
    bow(F, 195, 262);
    F({ left: '232px', top: '284px', width: '140px', height: '52px', borderRadius: '10px', transform: 'rotate(-7deg)', boxShadow: '0 4px 10px rgba(0,0,0,0.25)' }, 'front');
    return { top: 300, left: 232, width: 140, size: 18, rotate: -7 };
  }
  // classic: overlapping tissue and a softly curved paper wrap, rather than a rigid cone.
  const paper = (d) => ({ ...full, clipPath: `path('${d}')` });
  B(paper('M48 145 C36 111 51 80 88 72 Q137 82 187 130 L239 332 Q195 354 146 336 Z'), 'back');
  B(paper('M342 144 C353 110 339 78 302 70 Q252 81 204 129 L151 334 Q197 354 244 336 Z'), 'back2');
  B({ ...paper('M69 151 C58 121 71 101 103 96 Q150 115 195 145 Q242 114 287 96 C321 100 333 122 322 151 L243 326 Q195 344 146 326 Z'), opacity: '.68' }, 'back2');
  F({ ...paper('M62 156 Q195 184 328 156 C314 216 284 295 248 343 Q195 361 142 343 C105 294 76 216 62 156 Z'), boxShadow: 'inset 0 -10px 0 rgba(0,0,0,.04)' }, 'front');
  F(paper('M195 170 Q262 178 328 156 C314 216 284 295 248 343 Q224 353 195 354 Z'), 'front2');
  F({ ...paper('M62 156 Q195 184 328 156 L324 166 Q195 194 66 166 Z'), background: 'rgba(255,255,255,.3)' });
  F({ ...paper('M192 174 Q198 258 195 350 L199 350 Q203 257 198 174 Z'), background: 'rgba(255,255,255,.19)' });
  bow(F, 195, 280);
  return { top: 208, left: 90, width: 210, size: 30 };
}

export function createBouquet(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size, setBackdrop } = createStage(host, W, H, 'bouquet');
  glow.style.top = '-130px';
  const P = (parent, style) => { const d = div('p', style); parent.append(d); return d; };

  const backEl = div('', { position: 'absolute', inset: '0' }); // the shape's pieces behind the flowers
  body.append(backEl);
  const stemsEl = div('', { position: 'absolute', inset: '0' });
  body.append(stemsEl);
  // greenery and baby's breath inside the wrap, so the bouquet looks full even with a few flowers
  const greensEl = div('', { position: 'absolute', inset: '0', transform: 'translateY(12px) scale(.86)', transformOrigin: '195px 150px' });
  body.append(greensEl);
  const rndIn = seeded(9);
  for (let i = 0; i < 26; i++) {
    const d = 3 + Math.round(rndIn() * 3);
    P(body, { left: `${Math.round(92 + rndIn() * 206)}px`, top: `${Math.round(58 + rndIn() * 104)}px`, width: `${d}px`, height: `${d}px`, borderRadius: '50%', background: '#FFFFFF', opacity: '0.9' });
  }
  // baby's breath
  const rnd = seeded(5);
  for (let i = 0; i < 34; i++) {
    const a = rnd() * Math.PI, rr = 150 + rnd() * 30;
    const d = 2 + Math.round(rnd() * 3);
    P(body, { left: `${Math.round(195 + Math.cos(a) * rr * 1.05)}px`, top: `${Math.round(150 - Math.sin(a) * rr * 0.72)}px`, width: `${d}px`, height: `${d}px`, borderRadius: '50%', background: '#FFFFFF', opacity: '0.85' });
  }

  // what's tucked in: on a pick, behind the flowers and in front of the leaves
  const tuck = div('tuck');
  tuck.append(div('tuck-stick'));
  body.append(tuck);
  const setTucked = createTopper(tuck, { x: 232, base: 66, size: 54 });

  // front cone, in front of the flowers (clicks pass through to them)
  const front = div('', { position: 'absolute', inset: '0', pointerEvents: 'none' });
  stage.append(front);
  const frontEl = div('', { position: 'absolute', inset: '0' }); // the shape's pieces in front of the flowers
  front.append(frontEl);
  const nameEl = div('p', { textAlign: 'center', lineHeight: '1.25', whiteSpace: 'nowrap', overflow: 'hidden' });
  const nameFit = nameText(nameEl, true);
  const drawing = createDrawing(front, W, H);

  let parts = {};
  let flavor = opts.flavor;
  let accent = opts.accent;
  let nameSize = null;
  let currentShape = 'classic', lastLayout = null, local = opts.local;
  function setShape(shape) {
    currentShape = SHAPES[shape] ? shape : 'classic';
    stage.dataset.treat = SHAPES[currentShape].treat || '';
    backEl.textContent = frontEl.textContent = '';
    parts = {};
    const add = (parent) => (style, role) => { const d = div('p', style); parent.append(d); if (role) (parts[role] ||= []).push(d); return d; };
    const n = buildShape(SHAPES[shape] ? shape : 'classic', add(backEl), add(frontEl));
    nameSize = n.size || null;
    Object.assign(nameEl.style, { left: `${n.left ?? 62}px`, top: `${n.top}px`, width: `${n.width ?? 266}px`, transform: n.rotate ? `rotate(${n.rotate}deg)` : '' });
    frontEl.append(nameEl);
    api.setFlavor(flavor);
    api.setName(nameEl.textContent);
    if (lastLayout) api.setCandles(lastLayout.n, lastLayout.options);
  }

  const flowers = [];
  const st = itemStates(flowers, glow);
  const stickers = createStickers(stage);

  const api = {
    wrap, stage, candles: flowers, toStage, size, stickers, ...st, setBackdrop,
    drawArea: { left: 60, top: 170, width: 270, height: 186 },
    setDots: drawing.setDots, getDots: drawing.getDots, addDot: drawing.addDot,
    setFlavor(f) {
      flavor = f;
      const c = WRAPS[f] || WRAPS.strawberry;
      const paint = (role, bg) => (parts[role] || []).forEach((d) => (d.style.background = bg));
      const ribbon = ACCENTS[accent]?.color?.startsWith('#') ? ACCENTS[accent].color : c.bow;
      // the country's motif is printed on the paper that faces you (and, softer, on the paper behind)
      const motif = WRAP_MOTIFS[local];
      stage.dataset.wrapmotif = motif ? local : '';
      for (const role of ['back', 'back2', 'front', 'front2']) paint(role, motif && role !== 'back2' ? `${motif}, ${c[role]}` : c[role]);
      paint('bow', ribbon);
      (parts.handle || []).forEach((d) => (d.style.borderColor = c.back));
      paint('weave', `repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 16px), repeating-linear-gradient(90deg, ${c.front} 0 14px, ${c.front2} 14px 22px)`);
      nameEl.style.color = c.text;
    },
    setShape,
    // The country: which money / which snacks (only the money and snack bouquets change).
    setLocal(k) { local = k; api.setFlavor(flavor); if (lastLayout && SHAPES[currentShape].treat) api.setCandles(lastLayout.n, lastLayout.options); },
    setAccent(k) { accent = k; api.setFlavor(flavor); },
    setPattern(k) { stage.dataset.petal = PATTERNS[k] ? k : 'round'; },
    setTopper(k) { setTucked(TOPPERS[k]); tuck.hidden = !TOPPERS[k]?.emoji; },
    setGreens(k) { greensEl.innerHTML = greensSvg(GREENS[k] ? k : 'leaf'); }, // static markup, no user text
    setName(t) {
      nameEl.textContent = t || '';
      nameFit.setSize(nameSize || 30); // shrinks to fit
    },
    setFont: nameFit.setFont,
    setFlowerStyle(i, style) {
      const flower = flowers[i];
      if (!flower) return;
      if (SHAPES[currentShape].treat === 'snack' && style) {
        const type = snackKey(style.snack, i, local);
        if (flower.dataset.snack !== type) { flower.dataset.snack = type; flower.querySelector('.t-art').innerHTML = snackSvg(type); } // static markup
      }
      if (ITEM_COLORS[style?.color]) flower.style.setProperty('--c', ITEM_COLORS[style.color].hex);
      if (FLOWER_TYPES[style?.type]) flower.dataset.petal = style.type;
    },
    // Lay out `n` flowers (+ closed buds up to `spots`). Returns the flower elements in message order.
    setCandles(n, { spots = n, colors, flowers: styles, names, onTap } = {}) {
      lastLayout = { n, options: { spots, colors, flowers: styles, names, onTap } };
      layer.textContent = '';
      flowers.length = 0;
      const total = Math.min(Math.max(n, spots), 40);
      const pos = flowerSpots(total, currentShape);
      const treat = SHAPES[currentShape].treat;
      // stems in the soft wrap; money and snacks sit on wooden sticks
      stemsEl.innerHTML = currentShape === 'classic' || treat
        ? `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${pos.map(p => `<path d="M${p.x} ${p.y + p.s * .24} Q${195 + (p.x - 195) * .4} 199 195 278" fill="none" stroke="${treat ? '#D8B98A' : '#638959'}" stroke-width="${treat ? 2 : 2.4}" stroke-linecap="round"/>`).join('')}</svg>`
        : '';
      const els = [];
      for (const p of pos.slice().sort((a, b) => a.y - b.y)) {
        const isSpot = p.i >= n;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'flower' + (isSpot ? ' spot' : '');
        btn.tabIndex = isSpot || !onTap ? -1 : 0;
        if (!isSpot && names?.[p.i]) btn.setAttribute('aria-label', `Play ${names[p.i]}'s message`);
        Object.assign(btn.style, { left: `${(p.x - p.s / 2).toFixed(1)}px`, top: `${(p.y - p.s / 2).toFixed(1)}px`, width: `${p.s}px`, height: `${p.s}px` });
        btn.style.setProperty('--c', (colors && colors[p.i]) || colorFor(p.i));
        if (treat) {
          // a fan of notes / a snack pack, tilted a little like the flowers
          btn.classList.add('treat');
          const art = div('t-art');
          art.style.setProperty('--rot', `${(p.rot - 15) * 0.6}deg`);
          if (treat === 'snack') btn.dataset.snack = snackKey(styles?.[p.i]?.snack, p.i, local);
          art.innerHTML = treat === 'money' ? moneySvg(local) : snackSvg(btn.dataset.snack); // static markup
          btn.append(art);
        } else {
          const bloom = div('f-bloom');
          bloom.style.setProperty('--rot', `${p.rot}deg`);
          for (let k = 0; k < 5; k++) { const pe = div('f-petal'); pe.style.setProperty('--a', `${k * 72}deg`); pe.style.setProperty('--k', k); bloom.append(pe); }
          bloom.append(div('f-core'));
          btn.append(bloom);
        }
        if (onTap && !isSpot) btn.addEventListener('click', () => onTap(p.i));
        layer.append(btn);
        els[p.i] = btn;
      }
      flowers.push(...els);
      styles?.forEach((style, i) => api.setFlowerStyle(i, style));
      return els;
    },
    // The finale (throwing caps) happens around the bouquet, so the flowers stay.
    finaleOrder() { return []; },
    finaleOut() {},
    setBend() {},
    setDim(level) { body.style.filter = front.style.filter = stickers.layer.style.filter = level ? `saturate(${1 - 0.4 * level}) brightness(${1 - 0.45 * level})` : 'none'; },
    reset() { api.lightAll(); }
  };

  nameEl.textContent = opts.name || '';
  nameFit.setFont(opts.font);
  setShape(opts.shape);
  api.setDots(opts.dots);
  api.setPattern(opts.pattern);
  api.setTopper(opts.topper);
  api.setGreens(opts.greens);
  setBackdrop(opts.backdrop);
  stickers.set(opts.stickers);
  return api;
}
