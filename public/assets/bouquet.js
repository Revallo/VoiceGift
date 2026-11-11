// Graduation: the bouquet. Drawn in a fixed 390×370 stage; every voice is a flower that blooms.
import { colorFor } from './common.js';
import { div, seeded, createStage, createDrawing, createStickers, createTopper, itemStates, nameText } from './stage.js';

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

// Flower positions for n flowers (1–40): rows from the back (top) to the front, each wider than the last.
export function flowerSpots(n) {
  const rows = n <= 3 ? 1 : n <= 7 ? 2 : n <= 12 ? 3 : n <= 20 ? 4 : n <= 30 ? 5 : 6;
  const size = n <= 3 ? 72 : n <= 7 ? 58 : n <= 12 ? 52 : n <= 20 ? 44 : n <= 30 ? 38 : 34;
  const weights = Array.from({ length: rows }, (_, r) => 3 + r);
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.floor((n * w) / sum));
  for (let left = n - counts.reduce((a, b) => a + b, 0), r = rows - 1; left > 0; left--, r = (r + rows - 1) % rows) counts[r]++;
  const rnd = seeded(11 + n);
  const spots = [];
  counts.forEach((c, r) => {
    const y = rows === 1 ? 118 : 70 + (88 * r) / (rows - 1);
    const width = Math.min(250, (c - 1) * size * 0.98);
    for (let k = 0; k < c; k++) {
      const x = 195 + (c === 1 ? 0 : -width / 2 + (width * k) / (c - 1));
      spots.push({ x: x + (rnd() - 0.5) * 6, y: y + (rnd() - 0.5) * 8, s: size, rot: Math.round(rnd() * 72) });
    }
  });
  // Spread the messages over the bouquet instead of filling it row by row.
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  return spots.map((s, i) => ({ ...s, i }));
}

const poly = (pts) => `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(', ')})`;

// The kinds of bouquet (gift.cake.shape). The flowers sit in the same place in all of them.
export const SHAPES = {
  classic: { label: 'Paper cone' },
  box: { label: 'Flower box' },
  basket: { label: 'Basket' },
  tied: { label: 'Hand-tied' }
};

const full = { left: '0', top: '0', width: `${W}px`, height: `${H}px` };

// The bow: two loops + two tails around (x, y), plus the gold knot.
function bow(P, x, y) {
  P({ left: `${x - 59}px`, top: `${y - 8}px`, width: '56px', height: '32px', borderRadius: '50%', transform: 'rotate(18deg)' }, 'bow');
  P({ left: `${x + 3}px`, top: `${y - 8}px`, width: '56px', height: '32px', borderRadius: '50%', transform: 'rotate(-18deg)' }, 'bow');
  P({ left: `${x - 11}px`, top: `${y + 14}px`, width: '10px', height: '46px', borderRadius: '3px', transform: 'rotate(16deg)', transformOrigin: '50% 0' }, 'bow');
  P({ left: `${x + 1}px`, top: `${y + 14}px`, width: '10px', height: '46px', borderRadius: '3px', transform: 'rotate(-16deg)', transformOrigin: '50% 0' }, 'bow');
  P({ left: `${x - 10}px`, top: `${y}px`, width: '20px', height: '20px', borderRadius: '50%', background: '#D9A93A', boxShadow: 'inset -3px -3px 0 rgba(0,0,0,0.15)' });
}

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
  // classic: the paper cone
  B({ ...full, clipPath: poly([[72, 26], [318, 26], [372, 92], [262, 362], [128, 362], [18, 92]]) }, 'back');
  B({ ...full, clipPath: poly([[84, 40], [306, 40], [354, 94], [254, 348], [136, 348], [36, 94]]) }, 'back2');
  F({ ...full, clipPath: poly([[52, 168], [338, 168], [252, 356], [138, 356]]) }, 'front');
  F({ ...full, clipPath: poly([[195, 168], [338, 168], [252, 356], [195, 356]]) }, 'front2');
  F({ left: '52px', top: '166px', width: '286px', height: '4px', background: 'rgba(0,0,0,0.08)' });
  bow(F, 195, 276);
  return { top: 196 };
}

export function createBouquet(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size, setBackdrop } = createStage(host, W, H, 'bouquet');
  glow.style.top = '-130px';
  const P = (parent, style) => { const d = div('p', style); parent.append(d); return d; };

  const backEl = div('', { position: 'absolute', inset: '0' }); // the shape's pieces behind the flowers
  body.append(backEl);
  // greenery and baby's breath inside the wrap, so the bouquet looks full even with a few flowers
  const rndIn = seeded(9);
  for (const [x, y, r] of [[118, 112, -42], [156, 86, -18], [195, 78, 0], [234, 86, 18], [272, 112, 42], [100, 150, -64], [290, 150, 64], [146, 140, -26], [244, 140, 26], [195, 128, 0]]) {
    P(body, { left: `${x - 9}px`, top: `${y - 30}px`, width: '18px', height: '52px', borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', background: r % 4 ? '#4F8455' : '#3F6E46', transform: `rotate(${r}deg)`, transformOrigin: '50% 100%' });
  }
  for (let i = 0; i < 26; i++) {
    const d = 3 + Math.round(rndIn() * 3);
    P(body, { left: `${Math.round(92 + rndIn() * 206)}px`, top: `${Math.round(58 + rndIn() * 104)}px`, width: `${d}px`, height: `${d}px`, borderRadius: '50%', background: '#FFFFFF', opacity: '0.9' });
  }
  // leaves
  const leafA = '#5C8F5E', leafB = '#4A7A50';
  for (const [x, y, r, c] of [[150, -2, -14, leafA], [195, -14, 0, leafB], [240, -2, 14, leafA], [92, 30, -48, leafB], [298, 30, 48, leafB], [52, 84, -72, leafA], [338, 84, 72, leafA], [40, 138, -96, leafB], [350, 138, 96, leafB]]) {
    P(body, { left: `${x - 11}px`, top: `${y}px`, width: '22px', height: '64px', borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', background: c, transform: `rotate(${r}deg)`, transformOrigin: '50% 100%', boxShadow: 'inset -4px 0 0 rgba(0,0,0,0.1)' });
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
  function setShape(shape) {
    backEl.textContent = frontEl.textContent = '';
    parts = {};
    const add = (parent) => (style, role) => { const d = div('p', style); parent.append(d); if (role) (parts[role] ||= []).push(d); return d; };
    const n = buildShape(SHAPES[shape] ? shape : 'classic', add(backEl), add(frontEl));
    nameSize = n.size || null;
    Object.assign(nameEl.style, { left: `${n.left ?? 62}px`, top: `${n.top}px`, width: `${n.width ?? 266}px`, transform: n.rotate ? `rotate(${n.rotate}deg)` : '' });
    frontEl.append(nameEl);
    api.setFlavor(flavor);
    api.setName(nameEl.textContent);
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
      for (const role of ['back', 'back2', 'front', 'front2']) paint(role, c[role]);
      paint('bow', ribbon);
      (parts.handle || []).forEach((d) => (d.style.borderColor = c.back));
      paint('weave', `repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 16px), repeating-linear-gradient(90deg, ${c.front} 0 14px, ${c.front2} 14px 22px)`);
      nameEl.style.color = c.text;
    },
    setShape,
    setAccent(k) { accent = k; api.setFlavor(flavor); },
    setPattern(k) { stage.dataset.petal = PATTERNS[k] ? k : 'round'; },
    setTopper(k) { setTucked(TOPPERS[k]); tuck.hidden = !TOPPERS[k]?.emoji; },
    setName(t) {
      nameEl.textContent = t || '';
      nameFit.setSize(nameSize || 30); // shrinks to fit
    },
    setFont: nameFit.setFont,
    // Lay out `n` flowers (+ closed buds up to `spots`). Returns the flower elements in message order.
    setCandles(n, { spots = n, colors, onTap } = {}) {
      layer.textContent = '';
      flowers.length = 0;
      const total = Math.min(Math.max(n, spots), 40);
      const pos = flowerSpots(total);
      const els = [];
      for (const p of pos.slice().sort((a, b) => a.y - b.y)) {
        const isSpot = p.i >= n;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'flower' + (isSpot ? ' spot' : '');
        btn.tabIndex = isSpot || !onTap ? -1 : 0;
        Object.assign(btn.style, { left: `${(p.x - p.s / 2).toFixed(1)}px`, top: `${(p.y - p.s / 2).toFixed(1)}px`, width: `${p.s}px`, height: `${p.s}px` });
        btn.style.setProperty('--c', (colors && colors[p.i]) || colorFor(p.i));
        const bloom = div('f-bloom');
        bloom.style.setProperty('--rot', `${p.rot}deg`);
        for (let k = 0; k < 5; k++) { const pe = div('f-petal'); pe.style.setProperty('--a', `${k * 72}deg`); bloom.append(pe); }
        bloom.append(div('f-core'));
        btn.append(bloom);
        if (onTap && !isSpot) btn.addEventListener('click', () => onTap(p.i));
        layer.append(btn);
        els[p.i] = btn;
      }
      flowers.push(...els);
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
  setBackdrop(opts.backdrop);
  stickers.set(opts.stickers);
  return api;
}
