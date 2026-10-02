// Birthday: the cake. Drawn in a fixed 390×300 stage; every voice is a candle.
import { colorFor } from './common.js';
import { div, seeded, createStage, createDrawing, createStickers, itemStates } from './stage.js';

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

export function createCake(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size } = createStage(host, W, H, opts.interactive ? 'interactive' : '');

  const rnd = seeded(7);
  const parts = {};
  const P = (style, key) => { const d = div('p', style); body.append(d); if (key) (parts[key] ||= []).push(d); return d; };

  // plate
  P({ left: '33px', top: '248px', width: '324px', height: '50px', borderRadius: '50%', background: '#3A2337' });
  P({ left: '47px', top: '254px', width: '296px', height: '36px', borderRadius: '50%', background: '#4A2E46' });
  // bottom tier
  P({ left: '64px', top: '170px', width: '262px', height: '100px', borderRadius: '0 0 131px 131px / 0 0 22px 22px', boxShadow: 'inset -22px 0 0 rgba(0,0,0,0.08), inset 16px 0 0 rgba(255,255,255,0.14)' }, 'b1');
  const sprCols = ['#F6B93B', '#5CC8A8', '#FFFFFF', '#6FB7FF', '#FF7A3D'];
  for (let i = 0; i < 16; i++) {
    const left = i % 2 === 0;
    P({ left: `${Math.round(left ? 80 + rnd() * 62 : 250 + rnd() * 62)}px`, top: `${Math.round(216 + rnd() * 26)}px`, width: '3px', height: '9px', borderRadius: '2px', background: sprCols[i % 5], transform: `rotate(${Math.round(rnd() * 180)}deg)` });
  }
  const nameEl = P({ left: '64px', top: '218px', width: '262px', textAlign: 'center', fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: '600', fontSize: '30px', lineHeight: '1', whiteSpace: 'nowrap', overflow: 'hidden' }, 'text');
  P({ left: '64px', top: '148px', width: '262px', height: '44px', borderRadius: '50%' }, 'frost');
  for (let i = 0; i < 11; i++) {
    const xc = 76 + i * 23.8, dx = (xc - 195) / 131;
    const ya = 170 + 22 * Math.sqrt(Math.max(0, 1 - dx * dx));
    P({ left: `${Math.round(xc - 10)}px`, top: `${Math.round(ya - 8)}px`, width: '20px', height: `${Math.round(8 + rnd() * 8 + Math.abs(dx) * 12)}px`, borderRadius: '0 0 10px 10px' }, 'frost');
  }
  // top tier
  P({ left: '100px', top: '90px', width: '190px', height: '80px', borderRadius: '0 0 95px 95px / 0 0 18px 18px', boxShadow: 'inset -16px 0 0 rgba(0,0,0,0.07), inset 12px 0 0 rgba(255,255,255,0.3)' }, 'b2');
  for (let i = 0; i < 11; i++) {
    const xc = 110 + i * 17, dx = (xc - 195) / 95;
    P({ left: `${Math.round(xc - 4)}px`, top: `${Math.round(128 + 18 * Math.sqrt(Math.max(0, 1 - dx * dx)))}px`, width: '8px', height: '8px', borderRadius: '50%', background: '#F6B93B' });
  }
  P({ left: '100px', top: '70px', width: '190px', height: '40px', borderRadius: '50%' }, 'top2');

  const drawing = createDrawing(body, W, H);
  const candles = [];
  const st = itemStates(candles, glow);
  const stickers = createStickers(stage);

  const api = {
    wrap, stage, candles, toStage, size, stickers, ...st,
    drawArea: { left: 30, top: 40, width: 330, height: 260 },
    setDots: drawing.setDots, getDots: drawing.getDots, addDot: drawing.addDot,
    setFlavor(f) {
      const c = FLAVORS[f] || FLAVORS.strawberry;
      parts.b1.forEach((d) => (d.style.background = c.b1));
      parts.b2.forEach((d) => (d.style.background = c.b2));
      parts.frost.forEach((d) => (d.style.background = c.frost));
      parts.top2.forEach((d) => (d.style.background = c.top2));
      nameEl.style.color = c.text;
    },
    setName(t) { nameEl.textContent = t || ''; },
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

  api.setFlavor(opts.flavor);
  api.setName(opts.name);
  api.setDots(opts.dots);
  stickers.set(opts.stickers);
  return api;
}
