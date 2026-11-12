// Birthday: the cake. Drawn in a fixed 390×300 stage; every voice is a candle.
import { colorFor } from './common.js';
import { div, seeded, createStage, createDrawing, createStickers, itemStates, NAME_FONTS, DEFAULT_FONT } from './stage.js';

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

// The cream on top (gift.cake.accent). auto = the flavor's own.
export const ACCENTS = {
  auto: { label: 'Same as flavor', color: 'conic-gradient(#FF6B6B, #FFB627, #4ECDC4, #A66CFF, #FF6B6B)' },
  white: { label: 'White', color: '#FFFFFF' },
  pink: { label: 'Pink', color: '#FFC2DA' },
  butter: { label: 'Butter', color: '#FFE9A8' },
  mint: { label: 'Mint', color: '#BFF0DA' },
  lilac: { label: 'Lilac', color: '#DCCBFF' },
  sky: { label: 'Sky', color: '#BFE3FF' },
  choco: { label: 'Chocolate', color: '#5A3423' }
};
// Little decorations around the name (gift.cake.pattern).
export const PATTERNS = {
  none: { label: 'Plain' },
  sprinkles: { label: 'Sprinkles' },
  dots: { label: 'Dots' },
  hearts: { label: 'Hearts', glyph: '♥' },
  stars: { label: 'Stars', glyph: '★' }
};
export const TOPPERS = {
  none: { label: 'None' },
  age: { label: 'Age', age: true },
  crown: { label: 'Crown', emoji: '👑' },
  star: { label: 'Star', emoji: '⭐' },
  cherry: { label: 'Cherry', emoji: '🍒' },
  bear: { label: 'Teddy', emoji: '🧸' },
  unicorn: { label: 'Unicorn', emoji: '🦄' }
};

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
  sheet: { label: 'Square' },
  naked: { label: 'Naked cake' },
  rainbow: { label: 'Rainbow' },
  ruffle: { label: 'Ruffles' },
  dome: { label: 'Dome' },
  stripe: { label: 'Stripes' },
  rosette: { label: 'Rosettes' },
  pearl: { label: 'Pearl tiers' },
  cupcake: { label: 'Giant cupcake' },
  pancake: { label: 'Pancakes' }
};

const SPRINKLES = ['#F6B93B', '#5CC8A8', '#FF6FA3', '#6FB7FF', '#FF7A3D'];
const RAINBOW = ['#FF6B6B', '#FFB627', '#FFE066', '#6BCB77', '#4D96FF', '#A66CFF'];
const TIER_SHADE = 'inset -20px 0 0 rgba(0,0,0,0.08), inset 14px 0 0 rgba(255,255,255,0.16)';
const px = (n) => `${Math.round(n)}px`;

// Builds one shape's pieces into `el`. P(style, role): role = which flavor colour it takes (b1, b2, frost, top2).
// Returns where the name goes: along a curve from (x1, y) to (x2, y) that dips by sag, like the front of a round cake.
function buildShape(shape, P) {
  const rnd = seeded(7);
  const plate = () => {
    P({ left: '33px', top: '248px', width: '324px', height: '50px', borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 4px 10px rgba(80,40,60,0.18)' });
    P({ left: '47px', top: '254px', width: '296px', height: '36px', borderRadius: '50%', background: '#F4E6DC' });
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

  // Layers from the bottom up: each one's curved bottom edge overlaps the one below it.
  const layers = (x, w, top, bottom, ry, roles) => {
    const h = (bottom - top) / roles.length;
    roles.slice().reverse().forEach((role, i) => {
      const y = bottom - h * (i + 1);
      const isColor = role.startsWith('#');
      P({ left: px(x), top: px(y), width: px(w), height: px(h + ry), borderRadius: `0 0 ${w / 2}px ${w / 2}px / 0 0 ${ry}px ${ry}px`, boxShadow: TIER_SHADE, ...(isColor ? { background: role } : {}) }, isColor ? undefined : role);
    });
  };
  const top = (x, w, y, ry, role) => P({ left: px(x), top: px(y - ry), width: px(w), height: px(ry * 2), borderRadius: '50%' }, role);
  const plaque = (x, y, w, h) => P({ left: px(x), top: px(y), width: px(w), height: px(h), borderRadius: '50%', boxShadow: '0 2px 0 rgba(0,0,0,0.12)' }, 'frost');
  const frills = (x, w, y, n, role) => {
    for (let i = 0; i < n; i++) {
      const xc = x + (i * w) / (n - 1), dx = (xc - (x + w / 2)) / (w / 2);
      P({ left: px(xc - 15), top: px(y + 14 * Math.sqrt(Math.max(0, 1 - dx * dx))), width: '30px', height: '24px', borderRadius: '0 0 15px 15px', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.08)' }, role);
    }
  };

  if (shape === 'naked') {
    plate();
    layers(72, 246, 90, 256, 20, ['b2', 'frost', 'b2', 'frost', 'b2']);
    top(72, 246, 90, 22, 'top2');
    return { x1: 96, x2: 294, y: 162, sag: 13, size: 24, plaque: true };
  }
  if (shape === 'rainbow') {
    plate();
    layers(72, 246, 90, 256, 20, [RAINBOW[0], RAINBOW[1], RAINBOW[2], 'frost', RAINBOW[3], RAINBOW[4], RAINBOW[5]]);
    top(72, 246, 90, 22, 'top2');
    return { x1: 104, x2: 286, y: 186, sag: 12, size: 20, plaque: true };
  }
  if (shape === 'ruffle') {
    plate();
    layers(72, 246, 90, 256, 20, ['b1']);
    for (let y = 236; y > 198; y -= 18) frills(78, 234, y, 12, y % 36 ? 'b2' : 'b1');
    layers(70, 250, 158, 200, 18, ['frost']);
    for (let y = 136; y > 100; y -= 18) frills(78, 234, y, 12, 'b2');
    top(72, 246, 90, 22, 'top2');
    return { x1: 104, x2: 286, y: 184, sag: 14, size: 25, plaque: true };
  }
  if (shape === 'dome') {
    plate();
    P({ left: '66px', top: '60px', width: '258px', height: '204px', borderRadius: '50% 50% 10% 10% / 78% 78% 8% 8%', boxShadow: 'inset -22px -8px 0 rgba(0,0,0,0.08)' }, 'b1');
    P({ left: '96px', top: '78px', width: '60px', height: '86px', borderRadius: '50%', background: 'rgba(255,255,255,0.28)', transform: 'rotate(24deg)' });
    pearls(66, 258, 244, 12, 15);
    return { x1: 92, x2: 298, y: 196, sag: 16, size: 30 };
  }
  if (shape === 'stripe') {
    plate();
    P({ left: '78px', top: '90px', width: '234px', height: '172px', borderRadius: '0 0 117px 117px / 0 0 22px 22px', boxShadow: TIER_SHADE }, 'stripe');
    tier(78, 234, 90, 0, 'b1', 'frost', 22, 12);
    plaque(100, 150, 190, 72);
    return { x1: 116, x2: 274, y: 190, sag: 6, size: 26, plaque: true };
  }
  if (shape === 'rosette') {
    plate();
    layers(72, 246, 90, 256, 20, ['b1']);
    top(72, 246, 90, 22, 'top2');
    for (const [y, n] of [[122, 10], [232, 10]]) for (let i = 0; i < n; i++) {
      const xc = 92 + (i * 206) / (n - 1), dx = (xc - 195) / 123, ya = y + 14 * Math.sqrt(Math.max(0, 1 - dx * dx));
      P({ left: px(xc - 15), top: px(ya - 15), width: '30px', height: '30px', borderRadius: '50%', boxShadow: 'inset 0 0 0 5px rgba(255,255,255,0.35), inset 0 0 0 10px rgba(0,0,0,0.05)' }, 'b2');
    }
    return { x1: 92, x2: 298, y: 190, sag: 13, size: 29 };
  }
  if (shape === 'pearl') {
    plate();
    tier(66, 258, 150, 112, 'b1', 'frost', 20, 0);
    pearls(66, 258, 244, 18, 16);
    pearls(66, 258, 158, 20, 16);
    tier(112, 166, 90, 62, 'b2', 'top2', 18, 0);
    pearls(112, 166, 134, 18, 10);
    return { x1: 90, x2: 300, y: 212, sag: 12, size: 29 };
  }
  if (shape === 'cupcake') {
    plate();
    P({ left: '0', top: '0', width: px(W), height: px(H), clipPath: 'polygon(84px 158px, 306px 158px, 278px 266px, 112px 266px)' }, 'stripe');
    P({ left: '58px', top: '132px', width: '274px', height: '62px', borderRadius: '50%', boxShadow: 'inset 0 -8px 0 rgba(0,0,0,0.07)' }, 'frost');
    P({ left: '84px', top: '98px', width: '222px', height: '56px', borderRadius: '50%', boxShadow: 'inset 0 -7px 0 rgba(0,0,0,0.07)' }, 'top2');
    P({ left: '112px', top: '68px', width: '166px', height: '46px', borderRadius: '50%', boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.07)' }, 'frost');
    plaque(112, 200, 166, 50);
    return { x1: 126, x2: 264, y: 228, sag: 4, size: 23, plaque: true };
  }
  if (shape === 'pancake') {
    plate();
    for (let i = 0; i < 7; i++) {
      const w = 276 - (i % 2) * 18, x = 195 - w / 2, y = 222 - i * 23;
      P({ left: px(x), top: px(y), width: px(w), height: '40px', borderRadius: '50% / 46%', boxShadow: 'inset 0 -7px 0 rgba(0,0,0,0.12)' }, i % 2 ? 'b2' : 'b1');
    }
    P({ left: '84px', top: '72px', width: '222px', height: '34px', borderRadius: '50%' }, 'frost');
    for (const [x, h] of [[100, 46], [150, 30], [238, 54], [282, 34]]) P({ left: px(x), top: '92px', width: '13px', height: px(h), borderRadius: '0 0 7px 7px' }, 'frost');
    plaque(102, 158, 186, 56);
    return { x1: 118, x2: 272, y: 192, sag: 5, size: 25, plaque: true };
  }
  if (shape === 'drip') {
    plate();
    P({ left: '80px', top: '90px', width: '230px', height: '172px', borderRadius: '0 0 115px 115px / 0 0 22px 22px', boxShadow: TIER_SHADE }, 'b1');
    P({ left: '80px', top: '206px', width: '230px', height: '22px', borderRadius: '0 0 115px 115px / 0 0 14px 14px', opacity: '0.85' }, 'b2');
    tier(80, 230, 90, 0, 'b1', 'frost', 22, 13);
    pearls(80, 230, 240, 20, 13);
    return { x1: 102, x2: 288, y: 190, sag: 14, size: 30 };
  }
  if (shape === 'tower') {
    plate();
    tier(42, 306, 204, 64, 'b1', 'frost', 18, 15);
    sprinkles(60, 120, 228, 258, 6); sprinkles(270, 330, 228, 258, 6);
    tier(72, 246, 146, 60, 'b2', 'top2', 16, 0);
    pearls(72, 246, 190, 16, 13);
    tier(100, 190, 90, 56, 'b1', 'top2', 20, 9);
    return { x1: 104, x2: 286, y: 244, sag: 10, size: 24 };
  }
  if (shape === 'sheet') {
    P({ left: '26px', top: '238px', width: '338px', height: '50px', borderRadius: '12px', background: '#FFFFFF', boxShadow: '0 4px 10px rgba(80,40,60,0.18)' });
    P({ left: '36px', top: '244px', width: '318px', height: '36px', borderRadius: '10px', background: '#F4E6DC' });
    P({ left: '56px', top: '92px', width: '278px', height: '164px', borderRadius: '0 0 14px 14px', boxShadow: 'inset -26px 0 0 rgba(0,0,0,0.08), inset 18px 0 0 rgba(255,255,255,0.16)' }, 'b1');
    P({ left: '56px', top: '62px', width: '278px', height: '56px', borderRadius: '16px' }, 'top2');
    for (let i = 0; i < 14; i++) P({ left: px(52 + i * 20.5), top: '108px', width: '22px', height: '16px', borderRadius: '50%' }, 'frost');
    for (let i = 0; i < 14; i++) P({ left: px(52 + i * 20.5), top: '246px', width: '22px', height: '16px', borderRadius: '50%' }, 'frost');
    sprinkles(70, 130, 140, 230, 7); sprinkles(260, 320, 140, 230, 7);
    return { x1: 132, x2: 258, y: 200, sag: 0, size: 30 };
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
  return { x1: 92, x2: 298, y: 236, sag: 12, size: 30 };
}

// 0–1, how light a #RRGGBB colour is.
const lightness = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; };

// The name, piped straight onto the cake: it follows the curve of the tier. Sized with a canvas, so it works on hidden screens.
const SVG = 'http://www.w3.org/2000/svg';
let nameIds = 0;
function curvedName() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  Object.assign(svg.style, { position: 'absolute', left: '0', top: '0', width: `${W}px`, height: `${H}px`, overflow: 'visible', pointerEvents: 'none' });
  const path = document.createElementNS(SVG, 'path');
  path.id = `cake-name-${++nameIds}`;
  path.setAttribute('fill', 'none');
  const text = document.createElementNS(SVG, 'text');
  text.setAttribute('text-anchor', 'middle');
  const tp = document.createElementNS(SVG, 'textPath');
  tp.setAttribute('href', `#${path.id}`);
  tp.setAttribute('startOffset', '50%');
  text.append(tp);
  svg.append(path, text);
  const measure = document.createElement('canvas').getContext('2d');
  let area = null, css = NAME_FONTS[DEFAULT_FONT].css;
  const refit = () => {
    if (!area) return;
    const room = area.x2 - area.x1;
    let size = area.size;
    for (; size > 11; size--) {
      measure.font = `${css.fontStyle} ${css.fontWeight} ${size}px ${css.fontFamily}`;
      if (measure.measureText(tp.textContent).width <= room) break;
    }
    text.setAttribute('font-size', size);
  };
  document.fonts?.addEventListener?.('loadingdone', refit);
  return {
    svg,
    place(a) { area = a; path.setAttribute('d', `M ${a.x1 - 8} ${a.y} Q 195 ${a.y + 2 * a.sag} ${a.x2 + 8} ${a.y}`); refit(); },
    setFont(key) { css = (NAME_FONTS[key] || NAME_FONTS[DEFAULT_FONT]).css; Object.assign(text.style, css); refit(); },
    setText(t) { tp.textContent = t || ''; refit(); },
    setColor(c) { text.style.fill = c; }
  };
}

export function createCake(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size, setBackdrop } = createStage(host, W, H, opts.interactive ? 'interactive' : '');

  const shapeEl = div('', { position: 'absolute', inset: '0' });
  body.append(shapeEl);
  let parts = {};
  let flavor = opts.flavor;
  let accent = opts.accent, pattern = opts.pattern, nameArea = null;
  const decoEl = div('', { position: 'absolute', inset: '0' });
  const name = curvedName();
  // The topper (age numbers or a sugar figure) is pushed into the cream: frosting rises around its foot,
  // and it stands among the candles, so nearer candles stay in front of it.
  const AGE_BASE = 100;
  const ageEl = div('age-numbers', { left: `${CX}px`, top: `${AGE_BASE}px` });
  let lipColor = '#FFFFFF';
  function seatAge() {
    if (!ageEl.childElementCount) return ageEl.remove();
    layer.insertBefore(ageEl, [...layer.children].find((c) => Number(c.dataset.base) > AGE_BASE) || null);
  }
  function setSeat(topper, age) {
    ageEl.replaceChildren();
    ageEl.classList.toggle('figure', !!topper?.emoji);
    let w = 0;
    const inner = div('seat-inner');
    if (topper?.emoji) {
      // A sugar figure standing ON the cake: the glyph with a little thickness behind it, lit from the top
      // left and darker towards its feet, leaning back with the cake's top, and a soft shadow on the cream.
      w = 62;
      const f = div('seat-figure');
      for (const part of ['fig-glyph', 'fig-shade', 'fig-shine']) {
        const g = div(part);
        g.textContent = topper.emoji;
        f.append(g);
      }
      inner.append(f);
      ageEl.append(div('seat-shadow', { width: `${w + 14}px` }), inner);
      return seatAge();
    } else if (age) {
      const digits = [...age];
      const fs = digits.length > 2 ? 62 : 82;
      w = digits.length * fs * 0.58;
      for (const ch of digits) {
        const d = div('age-digit', { fontSize: `${fs}px` });
        const face = div('age-face');
        d.textContent = face.textContent = ch;
        d.append(face);
        inner.append(d);
      }
    }
    if (w) ageEl.append(div('seat-back', { width: `${w + 16}px` }), inner, div('age-lip', { width: `${w * 0.92}px`, background: lipColor }));
    seatAge();
  }

  function setShape(shape) {
    shapeEl.textContent = '';
    parts = {};
    const P = (style, key) => { const d = div('p', style); shapeEl.append(d); if (key) (parts[key] ||= []).push(d); return d; };
    nameArea = buildShape(SHAPES[shape] ? shape : 'classic', P);
    name.place(nameArea);
    shapeEl.append(decoEl, name.svg);
    api.setPattern(pattern);
    api.setFlavor(flavor);
  }

  const drawing = createDrawing(body, W, H);
  const candles = [];
  const st = itemStates(candles, glow);
  const stickers = createStickers(stage);

  const api = {
    wrap, stage, candles, toStage, size, stickers, ...st, setBackdrop,
    drawArea: { left: 30, top: 40, width: 330, height: 260 },
    setDots: drawing.setDots, getDots: drawing.getDots, addDot: drawing.addDot,
    setFlavor(f) {
      flavor = f;
      const c = FLAVORS[f] || FLAVORS.strawberry;
      const cream = accent && ACCENTS[accent]?.color?.startsWith('#') ? ACCENTS[accent].color : null;
      const colors = { ...c, frost: cream || c.frost, top2: cream || c.top2, stripe: `repeating-linear-gradient(90deg, ${c.b1} 0 20px, ${c.b2} 20px 40px)` };
      for (const role of ['b1', 'b2', 'frost', 'top2', 'stripe']) (parts[role] || []).forEach((d) => (d.style.background = colors[role]));
      lipColor = colors.top2;
      ageEl.querySelector('.age-lip')?.style.setProperty('background', lipColor);
      // On a plaque the letters are on the cream, so they take whatever reads best on it.
      name.setColor(nameArea?.plaque ? (lightness(colors.frost) > 0.55 ? '#4A2238' : '#FFFFFF') : c.text);
    },
    setAccent(k) { accent = k; api.setFlavor(flavor); },
    // Small decorations in two rows that follow the cake's curve, above and below the name.
    setPattern(k) {
      pattern = k;
      decoEl.textContent = '';
      const p = PATTERNS[k];
      if (!p || k === 'none' || !nameArea) return;
      const { x1, x2, y, sag, size: s } = nameArea;
      const rnd = seeded(13);
      for (const off of [-s - 12, 14]) for (let i = 0; i < 9; i++) {
        const t = i / 8, x = x1 + (x2 - x1) * t, yy = y + off + 4 * sag * t * (1 - t);
        const col = SPRINKLES[i % 5];
        const d = k === 'sprinkles' ? div('p', { left: px(x), top: px(yy), width: '3px', height: '9px', borderRadius: '2px', background: col, transform: `rotate(${Math.round(rnd() * 180)}deg)` })
          : k === 'dots' ? div('p', { left: px(x - 3), top: px(yy), width: '7px', height: '7px', borderRadius: '50%', background: col })
          : div('p', { left: px(x - 6), top: px(yy - 4), fontSize: '12px', lineHeight: '1', color: col });
        if (p.glyph) d.textContent = p.glyph;
        decoEl.append(d);
      }
    },
    setTopper(k, age) { const t = TOPPERS[k]; setSeat(t?.emoji ? t : null, t?.age ? String(age || '') : ''); },
    setShape,
    setName: name.setText,
    setFont: name.setFont,
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
        btn.dataset.base = p.base;
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
      seatAge();
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
  api.setTopper(opts.topper, opts.age);
  setBackdrop(opts.backdrop);
  stickers.set(opts.stickers);
  return api;
}
