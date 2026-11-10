// Birthday: the cake. Drawn in a fixed 390×300 stage; every voice is a candle.
import { colorFor } from './common.js';
import { div, seeded, createStage, createDrawing, createStickers, itemStates, nameText } from './stage.js';

export const FLAVORS = {
  strawberry: { label: 'Strawberry', b1: '#F2A9C4', b2: '#FFE3EE', frost: '#FFF0F6', top2: '#FFF7FA', text: '#8E2552' },
  chocolate: { label: 'Chocolate', b1: '#8A5236', b2: '#B07650', frost: '#3E2216', top2: '#4E2C1D', text: '#F6D3A8' },
  matcha: { label: 'Matcha', b1: '#9CC28A', b2: '#CFE3C2', frost: '#F6FBEF', top2: '#FFFFFF', text: '#2F5A2A' },
  ube: { label: 'Ube', b1: '#A98BD6', b2: '#D9CBF0', frost: '#F4EFFF', top2: '#FFFFFF', text: '#4B2C7A' },
  vanilla: { label: 'Vanilla', b1: '#F3DFB0', b2: '#FFF1D2', frost: '#FFFFFF', top2: '#FFFDF6', text: '#8A5A12' },
  redvelvet: { label: 'Red velvet', b1: '#B83246', b2: '#D9566A', frost: '#FFF6F2', top2: '#FFFFFF', text: '#FFFFFF' },
  pandan: { label: 'Pandan', b1: '#6DBF6A', b2: '#B9E3A8', frost: '#F4FBEA', top2: '#FFFFFF', text: '#235C23' },
  mango: { label: 'Mango', b1: '#FFB938', b2: '#FFD98A', frost: '#FFF6DA', top2: '#FFFFFF', text: '#8A4B00' },
  blueberry: { label: 'Blueberry', b1: '#6577CF', b2: '#A9B5EC', frost: '#EEF1FF', top2: '#FFFFFF', text: '#FFFFFF' },
  lemon: { label: 'Lemon', b1: '#F2D94E', b2: '#FBEC9A', frost: '#FFFCE6', top2: '#FFFFFF', text: '#7A6400' },
  cottoncandy: { label: 'Cotton candy', b1: '#8CCFF0', b2: '#FFC6E0', frost: '#FFFFFF', top2: '#FFF5FA', text: '#2E6E96' },
  caramel: { label: 'Caramel', b1: '#C4884A', b2: '#E2B27A', frost: '#FFF1DC', top2: '#FFF8EE', text: '#FFFFFF' },
  blackforest: { label: 'Black forest', b1: '#3A2020', b2: '#5A3030', frost: '#FFFFFF', top2: '#FFF5F5', text: '#FF6B7E' },
  tiramisu: { label: 'Tiramisu', b1: '#E9D6B5', b2: '#F6EBD5', frost: '#7B5536', top2: '#8E6644', text: '#5C3B1F' }
};
export const SWATCH = (f) => ({ background: f.b1, boxShadow: `inset 0 9px 0 ${f.frost}` });

const W = 390, H = 300;
const CX = 195, CY = 90; // centre of the top tier's top surface

// Candle positions on the top tier for n candles (1–60). Two rings when there are many.
export function candleSpots(n) {
  const spots = [];
  const ring = (count, rx, ry, offset, depthScale) => {
    for (let i = 0; i < count; i++) {
      const a = Math.PI / 2 + (Math.PI * 2 * i) / count + offset;
      spots.push({ x: CX + rx * Math.cos(a), base: CY + ry * Math.sin(a), d: ((Math.sin(a) + 1) / 2) * depthScale });
    }
  };
  if (n <= 16) ring(n, n <= 3 ? 40 : n <= 6 ? 58 : 76, n <= 6 ? 9 : 12, n === 1 ? -Math.PI / 2 : Math.PI / 24, 1);
  else {
    const outer = Math.ceil(n * 0.62);
    ring(outer, 80, 14, Math.PI / 24, 1);
    ring(n - outer, 42, 6, Math.PI / 7, 0.6);
  }
  const small = n > 32 ? 0.7 : n > 16 ? 0.82 : 1;
  return spots.map((s, i) => ({ ...s, i, w: (8 + 2 * s.d) * small, h: Math.round((42 + 10 * s.d) * small) }));
}

// The kinds of cake (gift.cake.shape). Every shape keeps its top surface centred on (CX, CY), so the candles fit all of them.
export const SHAPES = {
  classic: { label: 'Two tiers' },
  drip: { label: 'Drip cake' },
  tower: { label: 'Three tiers' },
  sheet: { label: 'Square' }
};

const SPRINKLES = ['#F6B93B', '#5CC8A8', '#FFFFFF', '#6FB7FF', '#FF7A3D'];
const TIER_SHADE = 'inset -20px 0 0 rgba(0,0,0,0.08), inset 14px 0 0 rgba(255,255,255,0.16)';
const px = (n) => `${Math.round(n)}px`;

// Builds one shape's pieces into `el`. P(style, role): role = which flavor colour it takes (b1, b2, frost, top2).
// Returns where the name goes.
function buildShape(shape, P) {
  const rnd = seeded(7);
  const plate = () => {
    P({ left: '33px', top: '248px', width: '324px', height: '50px', borderRadius: '50%', background: '#3A2337' });
    P({ left: '47px', top: '254px', width: '296px', height: '36px', borderRadius: '50%', background: '#4A2E46' });
  };
  // a round tier: side (role), its top ellipse (topRole), optional frosting drips along the front edge
  const tier = (x, w, top, h, role, topRole, ry, drips) => {
    P({ left: px(x), top: px(top), width: px(w), height: px(h), borderRadius: `0 0 ${w / 2}px ${w / 2}px / 0 0 ${ry}px ${ry}px`, boxShadow: TIER_SHADE }, role);
    P({ left: px(x), top: px(top - ry), width: px(w), height: px(ry * 2), borderRadius: '50%' }, topRole);
    if (drips) for (let i = 0; i < drips; i++) {
      const xc = x + 12 + (i * (w - 24)) / (drips - 1), dx = (xc - (x + w / 2)) / (w / 2);
      const ya = top + ry * Math.sqrt(Math.max(0, 1 - dx * dx));
      P({ left: px(xc - 9), top: px(ya - 6), width: '18px', height: px(8 + rnd() * 18 + Math.abs(dx) * 8), borderRadius: '0 0 9px 9px' }, topRole);
    }
  };
  const pearls = (x, w, y, ry, n) => {
    for (let i = 0; i < n; i++) {
      const xc = x + 10 + (i * (w - 20)) / (n - 1), dx = (xc - (x + w / 2)) / (w / 2);
      P({ left: px(xc - 4), top: px(y + ry * Math.sqrt(Math.max(0, 1 - dx * dx))), width: '8px', height: '8px', borderRadius: '50%', background: '#F6B93B' });
    }
  };
  const sprinkles = (x1, x2, y1, y2, n) => {
    for (let i = 0; i < n; i++) {
      P({ left: px(x1 + rnd() * (x2 - x1)), top: px(y1 + rnd() * (y2 - y1)), width: '3px', height: '9px', borderRadius: '2px', background: SPRINKLES[i % 5], transform: `rotate(${Math.round(rnd() * 180)}deg)` });
    }
  };

  if (shape === 'drip') {
    plate();
    P({ left: '80px', top: '90px', width: '230px', height: '172px', borderRadius: '0 0 115px 115px / 0 0 22px 22px', boxShadow: TIER_SHADE }, 'b1');
    P({ left: '80px', top: '206px', width: '230px', height: '22px', borderRadius: '0 0 115px 115px / 0 0 14px 14px', opacity: '0.85' }, 'b2');
    tier(80, 230, 90, 0, 'b1', 'frost', 22, 13);
    pearls(80, 230, 240, 20, 13);
    return { left: 80, top: 160, width: 230, size: 30 };
  }
  if (shape === 'tower') {
    plate();
    tier(42, 306, 204, 64, 'b1', 'frost', 18, 15);
    sprinkles(60, 120, 228, 258, 6); sprinkles(270, 330, 228, 258, 6);
    tier(72, 246, 146, 60, 'b2', 'top2', 16, 0);
    pearls(72, 246, 190, 16, 13);
    tier(100, 190, 90, 56, 'b1', 'top2', 20, 9);
    return { left: 42, top: 228, width: 306, size: 24 };
  }
  if (shape === 'sheet') {
    P({ left: '26px', top: '238px', width: '338px', height: '50px', borderRadius: '12px', background: '#3A2337' });
    P({ left: '36px', top: '244px', width: '318px', height: '36px', borderRadius: '10px', background: '#4A2E46' });
    P({ left: '56px', top: '92px', width: '278px', height: '164px', borderRadius: '0 0 14px 14px', boxShadow: 'inset -26px 0 0 rgba(0,0,0,0.08), inset 18px 0 0 rgba(255,255,255,0.16)' }, 'b1');
    P({ left: '56px', top: '62px', width: '278px', height: '56px', borderRadius: '16px' }, 'top2');
    for (let i = 0; i < 14; i++) P({ left: px(52 + i * 20.5), top: '108px', width: '22px', height: '16px', borderRadius: '50%' }, 'frost');
    for (let i = 0; i < 14; i++) P({ left: px(52 + i * 20.5), top: '246px', width: '22px', height: '16px', borderRadius: '50%' }, 'frost');
    sprinkles(70, 130, 140, 230, 7); sprinkles(260, 320, 140, 230, 7);
    return { left: 56, top: 168, width: 278, size: 30 };
  }
  // classic: two tiers
  plate();
  P({ left: '64px', top: '170px', width: '262px', height: '100px', borderRadius: '0 0 131px 131px / 0 0 22px 22px', boxShadow: 'inset -22px 0 0 rgba(0,0,0,0.08), inset 16px 0 0 rgba(255,255,255,0.14)' }, 'b1');
  for (let i = 0; i < 16; i++) {
    const left = i % 2 === 0;
    P({ left: px(left ? 80 + rnd() * 62 : 250 + rnd() * 62), top: px(216 + rnd() * 26), width: '3px', height: '9px', borderRadius: '2px', background: SPRINKLES[i % 5], transform: `rotate(${Math.round(rnd() * 180)}deg)` });
  }
  P({ left: '64px', top: '148px', width: '262px', height: '44px', borderRadius: '50%' }, 'frost');
  for (let i = 0; i < 11; i++) {
    const xc = 76 + i * 23.8, dx = (xc - 195) / 131;
    const ya = 170 + 22 * Math.sqrt(Math.max(0, 1 - dx * dx));
    P({ left: px(xc - 10), top: px(ya - 8), width: '20px', height: px(8 + rnd() * 8 + Math.abs(dx) * 12), borderRadius: '0 0 10px 10px' }, 'frost');
  }
  P({ left: '100px', top: '90px', width: '190px', height: '80px', borderRadius: '0 0 95px 95px / 0 0 18px 18px', boxShadow: 'inset -16px 0 0 rgba(0,0,0,0.07), inset 12px 0 0 rgba(255,255,255,0.3)' }, 'b2');
  pearls(100, 190, 128, 18, 11);
  P({ left: '100px', top: '70px', width: '190px', height: '40px', borderRadius: '50%' }, 'top2');
  return { left: 64, top: 218, width: 262, size: 30 };
}

export function createCake(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size } = createStage(host, W, H, opts.interactive ? 'interactive' : '');

  const shapeEl = div('', { position: 'absolute', inset: '0' });
  body.append(shapeEl);
  let parts = {};
  let flavor = opts.flavor;
  const nameEl = div('p', { textAlign: 'center', lineHeight: '1.25', whiteSpace: 'nowrap', overflow: 'hidden' });
  const nameFit = nameText(nameEl, true);

  function setShape(shape) {
    shapeEl.textContent = '';
    parts = {};
    const P = (style, key) => { const d = div('p', style); shapeEl.append(d); if (key) (parts[key] ||= []).push(d); return d; };
    const n = buildShape(SHAPES[shape] ? shape : 'classic', P);
    Object.assign(nameEl.style, { left: px(n.left), top: px(n.top - Math.round(n.size * 0.12)), width: px(n.width) });
    nameFit.setSize(n.size);
    shapeEl.append(nameEl);
    api.setFlavor(flavor);
  }

  const drawing = createDrawing(body, W, H);
  const candles = [];
  const st = itemStates(candles, glow);
  const stickers = createStickers(stage);

  const api = {
    wrap, stage, candles, toStage, size, stickers, ...st,
    drawArea: { left: 30, top: 40, width: 330, height: 260 },
    setDots: drawing.setDots, getDots: drawing.getDots, addDot: drawing.addDot,
    setFlavor(f) {
      flavor = f;
      const c = FLAVORS[f] || FLAVORS.strawberry;
      for (const role of ['b1', 'b2', 'frost', 'top2']) (parts[role] || []).forEach((d) => (d.style.background = c[role]));
      nameEl.style.color = c.text;
    },
    setShape,
    setName(t) { nameEl.textContent = t || ''; nameFit.refit(); },
    setFont: nameFit.setFont,
    // Lay out `n` candles (+ empty spots up to `spots`). Returns the candle elements in message order.
    setCandles(n, { spots = n, colors, onTap } = {}) {
      layer.textContent = '';
      candles.length = 0;
      const total = Math.max(n, spots);
      const pos = candleSpots(Math.min(total, 60));
      const order = pos.slice().sort((a, b) => a.base - b.base); // back to front
      const els = [];
      for (const p of order) {
        const isSpot = p.i >= n;
        const color = (colors && colors[p.i]) || colorFor(p.i);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'candle' + (isSpot ? ' spot' : '');
        btn.tabIndex = isSpot || !onTap ? -1 : 0;
        const hitH = p.h + 46;
        Object.assign(btn.style, { left: `${(p.x - 15).toFixed(1)}px`, top: `${Math.round(p.base - hitH)}px`, height: `${hitH}px` });
        const bodyEl = div('c-body', { left: `${(15 - p.w / 2).toFixed(1)}px`, width: `${p.w.toFixed(1)}px`, height: `${p.h}px`, background: `repeating-linear-gradient(135deg, ${color} 0px, ${color} 5px, #FFFFFF 5px, #FFFFFF 8px)` });
        const ring = div('c-ring', { background: color });
        const wick = div('c-wick', { bottom: `${p.h}px` });
        const fw = div('c-flamewrap', { bottom: `${p.h + 3}px` });
        const flame = div('c-flame', { animationDuration: `${(0.9 + (p.i % 4) * 0.17).toFixed(2)}s`, animationDelay: `${(-(p.i * 0.21)).toFixed(2)}s` });
        fw.append(flame);
        const s1 = div('c-smoke', { bottom: `${p.h + 8}px` });
        const s2 = div('c-smoke s2', { bottom: `${p.h + 8}px` });
        btn.append(ring, bodyEl, wick, fw, s1, s2);
        if (onTap && !isSpot) btn.addEventListener('click', () => onTap(p.i));
        layer.append(btn);
        els[p.i] = btn;
      }
      candles.push(...els.slice(0, total));
      return els;
    },
    // Finale: candles go out left to right while the flames bend.
    finaleOrder(n) { return candleSpots(Math.min(n, 60)).sort((a, b) => a.x - b.x).map((s) => s.i); },
    finaleOut(i) { st.out(i); },
    setBend(strength) { stage.style.setProperty('--bend', strength ? `skewX(${(-(4 + 24 * strength)).toFixed(1)}deg) scale(${(1 - 0.18 * strength).toFixed(2)}, ${(1 - 0.3 * strength).toFixed(2)})` : 'none'); },
    setDim(level) { body.style.filter = stickers.layer.style.filter = level ? `saturate(${1 - 0.45 * level}) brightness(${1 - 0.38 * level})` : 'none'; },
    reset() { candles.forEach((c) => c.classList.remove('out')); api.lightAll(); api.setBend(0); }
  };

  setShape(opts.shape);
  api.setFont(opts.font);
  api.setName(opts.name);
  api.setDots(opts.dots);
  stickers.set(opts.stickers);
  return api;
}
