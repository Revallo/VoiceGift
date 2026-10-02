// Graduation: the bouquet. Drawn in a fixed 390×370 stage; every voice is a flower that blooms.
import { colorFor } from './common.js';
import { div, seeded, createStage, createDrawing, createStickers, itemStates } from './stage.js';

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

export function createBouquet(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size } = createStage(host, W, H, 'bouquet');
  glow.style.top = '-130px';
  const full = { left: '0', top: '0', width: `${W}px`, height: `${H}px` };
  const P = (parent, style) => { const d = div('p', style); parent.append(d); return d; };

  // back paper
  const back = P(body, { ...full, clipPath: poly([[72, 26], [318, 26], [372, 92], [262, 362], [128, 362], [18, 92]]) });
  const back2 = P(body, { ...full, clipPath: poly([[84, 40], [306, 40], [354, 94], [254, 348], [136, 348], [36, 94]]) });
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

  // front cone, in front of the flowers (clicks pass through to them)
  const front = div('', { position: 'absolute', inset: '0', pointerEvents: 'none' });
  stage.append(front);
  const coneL = P(front, { ...full, clipPath: poly([[52, 168], [338, 168], [252, 356], [138, 356]]) });
  const coneR = P(front, { ...full, clipPath: poly([[195, 168], [338, 168], [252, 356], [195, 356]]) });
  P(front, { left: '52px', top: '166px', width: '286px', height: '4px', background: 'rgba(0,0,0,0.08)' });
  const nameEl = P(front, { left: '62px', top: '196px', width: '266px', textAlign: 'center', fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: '600', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden' });
  const drawing = createDrawing(front, W, H);
  // bow
  const bowParts = [
    P(front, { left: '136px', top: '268px', width: '56px', height: '32px', borderRadius: '50%', transform: 'rotate(18deg)' }),
    P(front, { left: '198px', top: '268px', width: '56px', height: '32px', borderRadius: '50%', transform: 'rotate(-18deg)' }),
    P(front, { left: '184px', top: '290px', width: '10px', height: '46px', borderRadius: '3px', transform: 'rotate(16deg)', transformOrigin: '50% 0' }),
    P(front, { left: '196px', top: '290px', width: '10px', height: '46px', borderRadius: '3px', transform: 'rotate(-16deg)', transformOrigin: '50% 0' })
  ];
  P(front, { left: '185px', top: '276px', width: '20px', height: '20px', borderRadius: '50%', background: '#D9A93A', boxShadow: 'inset -3px -3px 0 rgba(0,0,0,0.15)' });

  const flowers = [];
  const st = itemStates(flowers, glow);
  const stickers = createStickers(stage);

  const api = {
    wrap, stage, candles: flowers, toStage, size, stickers, ...st,
    drawArea: { left: 60, top: 170, width: 270, height: 186 },
    setDots: drawing.setDots, getDots: drawing.getDots, addDot: drawing.addDot,
    setFlavor(f) {
      const c = WRAPS[f] || WRAPS.strawberry;
      back.style.background = c.back;
      back2.style.background = c.back2;
      coneL.style.background = c.front;
      coneR.style.background = c.front2;
      nameEl.style.color = c.text;
      bowParts.forEach((d) => (d.style.background = c.bow));
    },
    setName(t) {
      nameEl.textContent = t || '';
      nameEl.style.fontSize = (t || '').length > 14 ? '24px' : '30px';
    },
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

  api.setFlavor(opts.flavor);
  api.setName(opts.name);
  api.setDots(opts.dots);
  stickers.set(opts.stickers);
  return api;
}
