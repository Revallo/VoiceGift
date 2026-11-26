// Birthday: the cake. Drawn in a fixed 390×300 stage; every voice is a candle.
import { colorFor } from './common.js';
import { div, seeded, createStage, createDrawing, createStickers, itemStates, NAME_FONTS, DEFAULT_FONT } from './stage.js';
import { cakeMatSvg, cakeGarlandSvg } from './local.js';

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

// Each friend picks their own candle and flame after recording (message.candle = { body, flame }).
// Three separate picks: the stick, the flame's colour and the flame's shape (message.candle = { body, flame, shape }).
// Keys must match CANDLE_KEYS / FLAME_KEYS / FLAME_SHAPE_KEYS in lib/gifts.js.
export const CANDLES = {
  stripe: { label: 'Stripes' },
  plain: { label: 'Plain' },
  dots: { label: 'Dots' },
  swirl: { label: 'Swirl' },
  gold: { label: 'Gold' },
  tall: { label: 'Tall' },
  chunky: { label: 'Chunky' }
};
export const FLAMES = { // colours
  classic: { label: 'Gold' },
  blue: { label: 'Blue' },
  pink: { label: 'Pink' },
  green: { label: 'Magic' },
  purple: { label: 'Purple' },
  ice: { label: 'Ice' },
  rainbow: { label: 'Rainbow' }
};
export const FLAME_SHAPES = {
  drop: { label: 'Classic' },
  tall: { label: 'Tall' },
  round: { label: 'Round' },
  heart: { label: 'Heart' },
  star: { label: 'Star' },
  twin: { label: 'Twin' },
  sparkler: { label: 'Sparkler' }
};

function candleLook(style, color, w, h) {
  const body = CANDLES[style?.body] ? style.body : 'stripe';
  const size = body === 'tall' ? { w: w * 0.75, h: Math.round(h * 1.3) } : body === 'chunky' ? { w: w * 1.7, h: Math.round(h * 0.7) } : { w, h };
  const shine = 'linear-gradient(90deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 40%, rgba(0,0,0,0.12))';
  const bg = {
    stripe: `repeating-linear-gradient(135deg, ${color} 0px, ${color} 5px, #FFFFFF 5px, #FFFFFF 8px)`,
    plain: `${shine}, ${color}`,
    dots: `radial-gradient(circle, #FFFFFF 0 1.6px, transparent 2px) 0 0 / 6px 7px, ${color}`,
    swirl: `repeating-linear-gradient(160deg, ${color} 0 4px, #FFFFFF 4px 6px, ${color} 6px 10px, #FFD86B 10px 12px)`,
    gold: 'linear-gradient(90deg, #8A6A1E, #F7E08A 35%, #D4A93A 55%, #FFF3BF 70%, #9C7A22)',
    tall: `${shine}, repeating-linear-gradient(0deg, ${color} 0 6px, #FFFFFF 6px 8px)`,
    chunky: `${shine}, repeating-linear-gradient(90deg, ${color} 0 5px, color-mix(in srgb, ${color} 70%, #FFFFFF) 5px 10px)`
  }[body];
  // messages from before the shape pick had 'heart' / 'sparkler' as the flame
  const oldShape = ['heart', 'sparkler'].includes(style?.flame) ? style.flame : null;
  const shape = FLAME_SHAPES[style?.shape] ? style.shape : oldShape || 'drop';
  return { ...size, bg, flame: FLAMES[style?.flame] ? style.flame : 'classic', shape };
}

// One candle (a button: wick, flame, smoke) standing on (p.x, p.base). Also used for the live minis in the picker.
export function buildCandle(p, color, style) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'candle';
  btn.dataset.base = p.base;
  btn._p = p;
  btn._color = color;
  styleCandle(btn, style);
  return btn;
}

// (Re)draws a candle in a new style; the flame lights again with a little burst.
export function styleCandle(btn, style, { ignite = false } = {}) {
  const p = btn._p, color = btn._color;
  btn._style = style;
  const look = candleLook(style, color, p.w, p.h);
  const hitH = look.h + 46;
  Object.assign(btn.style, { left: `${(p.x - 15).toFixed(1)}px`, top: `${Math.round(p.base - hitH)}px`, height: `${hitH}px` });
  const fw = div(`c-flamewrap fc-${look.flame} fs-${look.shape}`, { bottom: `${look.h + 3}px` });
  const timing = (k) => ({ animationDuration: `${(0.9 + ((p.i + k) % 4) * 0.17).toFixed(2)}s`, animationDelay: `${(-((p.i + k) * 0.21)).toFixed(2)}s` });
  fw.append(div('c-flame', timing(0)));
  if (look.shape === 'twin') fw.append(div('c-flame c-flame2', timing(2)));
  if (look.shape === 'sparkler') {
    const sparks = div('c-sparks');
    for (let k = 0; k < 8; k++) {
      const s = document.createElement('i');
      s.style.setProperty('--a', `${k * 45 + (p.i % 3) * 13}deg`);
      s.style.animationDelay = `${(-k * 0.09).toFixed(2)}s`;
      sparks.append(s);
    }
    fw.append(sparks);
  }
  btn.replaceChildren(
    div('c-ring', { background: color }),
    div('c-body', { left: `${(15 - look.w / 2).toFixed(1)}px`, width: `${look.w.toFixed(1)}px`, height: `${look.h}px`, background: look.bg }),
    div('c-wick', { bottom: `${look.h}px` }),
    fw,
    div('c-flash', { bottom: `${look.h - 6}px` }),
    div('c-smoke', { bottom: `${look.h + 8}px` }),
    div('c-smoke s2', { bottom: `${look.h + 8}px` })
  );
  if (ignite) {
    btn.classList.remove('igniting');
    void btn.offsetWidth; // restart the animation
    btn.classList.add('igniting');
    clearTimeout(btn._ig);
    btn._ig = setTimeout(() => btn.classList.remove('igniting'), 800);
  }
}

// A small candle on its own, for the picker. `only`: 'stick' (just the stick, not lit) or 'flame' (just the flame).
export function miniCandle(style, color, { h = 40, only = '' } = {}) {
  const holder = div(`mini-candle${only ? ` only-${only}` : ''}`);
  const p = { x: 15, base: only === 'flame' ? 40 : only === 'stick' ? 62 : 92, w: 9, h: only === 'flame' ? 0 : h, i: 1 };
  const btn = buildCandle(p, color, style);
  btn.tabIndex = -1;
  if (only !== 'stick') btn.classList.add('lit');
  holder.append(btn);
  return holder;
}

const W = 390, H = 300;
const CX = 195, CY = 90; // centre of the top tier's top surface

export const CANDLES_PER_PAGE = 6;

// Each group has its own spaced front arc. Logical indices still address every voice.
export function candleSpots(n) {
  n = Math.min(60, Math.max(0, Math.floor(n)));
  const spots = [];
  for (let i = 0; i < n; i++) {
    const page = Math.floor(i / CANDLES_PER_PAGE), start = page * CANDLES_PER_PAGE;
    const count = Math.min(CANDLES_PER_PAGE, n - start), at = i - start;
    const span = count <= 1 ? 0 : count <= 3 ? 80 : 150;
    const u = count <= 1 ? 0 : -1 + 2 * at / (count - 1);
    const d = Math.sqrt(Math.max(0, 1 - u * u));
    spots.push({ i, page, x: CX + span * u / 2, base: CY + 12 * d, d, w: 8, h: 34 + (i % 3) * 3 });
  }
  return spots;
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

// Decoration surfaces in stage coordinates, following each cake's actual tiers/frosting.
// Rounded/elliptical masks keep every decoration on the cake, including rotated sprinkles.
export const PATTERN_SURFACES = {
  classic: [[64, 198, 262, 68, '0 0 50% 50% / 0 0 22px 22px'], [100, 114, 190, 42, '0 0 50% 50% / 0 0 18px 18px']],
  drip: [[80, 132, 230, 120, '0 0 50% 50% / 0 0 20px 20px']],
  tower: [[42, 228, 306, 36, '0 0 50% 50% / 0 0 18px 18px'], [72, 166, 246, 28, '50% / 16px'], [100, 114, 190, 24, '50% / 12px']],
  sheet: [[64, 130, 262, 108, '4px']],
  naked: [[76, 108, 238, 23, '50% / 8px'], [76, 180, 238, 22, '50% / 8px'], [76, 234, 238, 19, '50% / 8px']],
  rainbow: [[78, 110, 234, 38, '50% / 12px'], [78, 222, 234, 30, '50% / 12px']],
  ruffle: [[82, 76, 226, 28, '50%'], [84, 162, 222, 35, '50% / 12px']],
  dome: [[66, 60, 258, 204, '50% 50% 10% 10% / 78% 78% 8% 8%']],
  stripe: [[84, 122, 222, 132, '0 0 50% 50% / 0 0 20px 20px']],
  rosette: [[82, 76, 226, 28, '50%']],
  pearl: [[72, 186, 246, 58, '50% / 16px'], [118, 110, 154, 25, '50% / 10px']],
  cupcake: [[58, 132, 274, 62, '50%'], [84, 98, 222, 56, '50%'], [112, 68, 166, 46, '50%']],
  pancake: [[84, 72, 222, 34, '50%'], [68, 121, 254, 24, '50%'], [66, 230, 258, 22, '50%']]
};

// Builds one shape's pieces into `el`. P(style, role): role = which flavor colour it takes (b1, b2, frost, top2).
// Returns where the name goes: along a curve from (x1, y) to (x2, y) that dips by sag, like the front of a round cake.
function buildShape(shape, P) {
  const rnd = seeded(7);
  const plate = () => {
    P({ left: '33px', top: '248px', width: '324px', height: '50px', borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 4px 10px rgba(80,40,60,0.18)' }, 'plate');
    P({ left: '47px', top: '254px', width: '296px', height: '36px', borderRadius: '50%', background: '#F4E6DC' }, 'plate');
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
    return { x1: 132, x2: 258, y: 200, sag: 0, size: 30 };
  }
  // classic: two tiers
  plate();
  P({ left: '64px', top: '170px', width: '262px', height: '100px', borderRadius: '0 0 131px 131px / 0 0 22px 22px', boxShadow: 'inset -22px 0 0 rgba(0,0,0,0.08), inset 16px 0 0 rgba(255,255,255,0.14)' }, 'b1');
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
    width() { return measure.measureText(tp.textContent).width; },
    setColor(c) { text.style.fill = c; }
  };
}

// One slice of the cake on a plate, in the cake's own colours (static markup, never user text).
let sliceId = 0;
function sliceSvg(c, cream) {
  const id = `sl${++sliceId}`, frost = cream || c.frost;
  return `<svg viewBox="0 0 100 90" aria-hidden="true"><defs><clipPath id="${id}"><path d="M12 42L90 38V70L12 66Z"/></clipPath></defs>
    <ellipse cx="51" cy="76" rx="47" ry="11" fill="#000" opacity=".25"/><ellipse cx="50" cy="74" rx="46" ry="11" fill="#F4F1EC"/><ellipse cx="50" cy="73" rx="37" ry="7.5" fill="#E4DED3"/>
    <path d="M80 24L90 38V70L80 57Z" fill="${frost}"/><path d="M80 24L90 38V70L80 57Z" fill="#000" opacity=".12"/>
    <g clip-path="url(#${id})"><rect x="0" y="30" width="100" height="50" fill="${c.b1}"/><rect x="0" y="48" width="100" height="4" fill="${frost}"/><rect x="0" y="52" width="100" height="7" fill="${c.b2}"/><rect x="0" y="59" width="100" height="3.5" fill="${frost}"/></g>
    <path d="M12 42L90 38V70L12 66Z" fill="none" stroke="#000" stroke-opacity=".08"/>
    <path d="M12 42L80 24L90 38Z" fill="${frost}"/><path d="M12 42Q50 44 90 38" stroke="${c.top2}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="69" cy="30" r="5.4" fill="#E0314B"/><path d="M66 26q3-4 6 0" stroke="#3F8A2E" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="67.4" cy="29" r="1.2" fill="#FFF" opacity=".6"/>
  </svg>`;
}

export function createCake(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size, setBackdrop } = createStage(host, W, H, opts.interactive ? 'interactive' : '');

  const shapeEl = div('', { position: 'absolute', inset: '0' });
  body.append(shapeEl);
  let parts = {};
  let flavor = opts.flavor;
  let accent = opts.accent, pattern = opts.pattern, nameArea = null, currentShape = 'classic';
  const decoEl = div('cake-pattern', { position: 'absolute', inset: '0', pointerEvents: 'none' });
  // The country (gift.cake.local): what the cake stands on, and a garland of its flowers on the plate.
  let local = opts.local;
  const matEl = div('cake-local', { position: 'absolute', inset: '0', pointerEvents: 'none' });
  const garlandEl = div('cake-local', { position: 'absolute', inset: '0', pointerEvents: 'none' });
  const paintLocal = () => {
    const dy = currentShape === 'sheet' ? -10 : 0;
    matEl.innerHTML = cakeMatSvg(local, dy); // static markup
    garlandEl.innerHTML = cakeGarlandSvg(local, dy);
    // the country's mat takes the place of the white plate
    for (const d of parts.plate || []) d.style.visibility = matEl.childElementCount ? 'hidden' : '';
  };
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
    currentShape = SHAPES[shape] ? shape : 'classic';
    nameArea = buildShape(currentShape, P);
    name.place(nameArea);
    shapeEl.prepend(matEl);
    shapeEl.append(garlandEl, decoEl, name.svg);
    paintLocal();
    api.setPattern(pattern);
    api.setFlavor(flavor);
  }

  const drawing = createDrawing(body, W, H);
  const candles = [];
  const st = itemStates(candles, glow);
  // the warm light of the burning candles on the cream: brighter the more candles are lit
  const warm = div('cake-warm');
  stage.insertBefore(warm, layer);
  const glowOnly = st.updateGlow;
  st.updateGlow = () => { glowOnly(); warm.style.setProperty('--warm', candles.length ? (st.litCount() / candles.length).toFixed(2) : '0'); };
  const stickers = createStickers(stage);
  let candlePage = 0, realCount = 0;
  const pages = div('candle-pages');
  pages.hidden = true;
  pages.setAttribute('role', 'group');
  pages.setAttribute('aria-label', 'Browse the candles');
  const previousPage = document.createElement('button'), nextPage = document.createElement('button');
  previousPage.type = nextPage.type = 'button';
  previousPage.textContent = 'Previous'; nextPage.textContent = 'Next';
  previousPage.setAttribute('aria-label', 'Previous candles'); nextPage.setAttribute('aria-label', 'Next candles');
  const pageLabel = div('candle-page-label');
  pageLabel.setAttribute('aria-live', 'polite');
  pages.append(previousPage, pageLabel, nextPage);
  host.append(pages);
  function showCandlePage(page) {
    const pageCount = Math.max(1, Math.ceil(realCount / CANDLES_PER_PAGE));
    candlePage = Math.max(0, Math.min(pageCount - 1, page));
    candles.forEach((c, i) => { c.hidden = Math.floor(i / CANDLES_PER_PAGE) !== candlePage; });
    previousPage.disabled = candlePage === 0;
    nextPage.disabled = candlePage === pageCount - 1;
    const label = `${candlePage * CANDLES_PER_PAGE + 1}–${Math.min((candlePage + 1) * CANDLES_PER_PAGE, realCount)} of ${realCount}`;
    if (pageLabel.textContent !== label) pageLabel.textContent = label;
    pages.hidden = realCount <= CANDLES_PER_PAGE;
  }
  previousPage.addEventListener('click', () => showCandlePage(candlePage - 1));
  nextPage.addEventListener('click', () => showCandlePage(candlePage + 1));

  const api = {
    wrap, stage, candles, toStage, size, stickers, ...st, setBackdrop,
    get candlePages() { return Math.ceil(realCount / CANDLES_PER_PAGE); },
    showCandlePage,
    light(i, on = true) { if (on) showCandlePage(Math.floor(i / CANDLES_PER_PAGE)); st.light(i, on); },
    lightAll(on = true) { st.lightAll(on); showCandlePage(0); },
    setActive(i, speaking = false) { if (i >= 0 && i < candles.length) showCandlePage(Math.floor(i / CANDLES_PER_PAGE)); st.setActive(i, speaking); },
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
    setLocal(k) { local = k; paintLocal(); },
    // Evenly spaced curved rows follow each surface, leaving room for the inscription.
    setPattern(k) {
      pattern = k;
      decoEl.textContent = '';
      const p = PATTERNS[k];
      if (!p || k === 'none' || !nameArea) return;
      const { x1, x2, y, sag, size: s } = nameArea;
      const halfName = (nameArea.plaque ? x2 - x1 : Math.min(x2 - x1, name.width())) / 2 + 12;
      const nameCenter = (x1 + x2) / 2;
      for (const [left, top, width, height, borderRadius] of PATTERN_SURFACES[currentShape]) {
        const surface = div('cake-pattern-surface', { position: 'absolute', left: px(left), top: px(top), width: px(width), height: px(height), borderRadius, overflow: 'hidden' });
        decoEl.append(surface);
        const rows = Math.max(1, Math.floor((height - 8) / 22));
        for (let row = 0; row < rows; row++) {
          const yy = rows === 1 ? height / 2 : 10 + row * (height - 20) / (rows - 1);
          const curve = Math.sqrt(Math.max(0, 1 - ((yy - height / 2) / (height / 2)) ** 2));
          const span = Math.max(20, (width - 20) * curve);
          const columns = Math.max(2, Math.floor(span / 25));
          for (let column = 0; column < columns; column++) {
            const x = width / 2 - span / 2 + (column + 0.5) * span / columns;
            const gx = left + x, gy = top + yy;
            if (Math.abs(gx - nameCenter) < halfName && gy > y - s - 6 && gy < y + sag + 14) continue;
            // Keep marks inside the curved edge, without cutting most of them off.
            const i = row + column;
            const col = SPRINKLES[i % 5];
            const d = k === 'sprinkles' ? div('p', { left: px(x - 1.5), top: px(yy - 4.5), width: '3px', height: '9px', borderRadius: '2px', background: col, transform: `rotate(${i % 2 ? 28 : -28}deg)` })
              : k === 'dots' ? div('p', { left: px(x - 3), top: px(yy), width: '7px', height: '7px', borderRadius: '50%', background: col })
              : div('p', { left: px(x - 6), top: px(yy - 4), fontSize: '12px', lineHeight: '1', color: col });
            if (p.glyph) d.textContent = p.glyph;
            surface.append(d);
          }
        }
      }
    },
    setTopper(k, age) { const t = TOPPERS[k]; setSeat(t?.emoji ? t : null, t?.age ? String(age || '') : ''); },
    setShape,
    setName(text) { name.setText(text); api.setPattern(pattern); },
    setFont(key) { name.setFont(key); api.setPattern(pattern); },
    // Lay out `n` candles (+ empty spots up to `spots`). Returns the candle elements in message order.
    // `styles[i]` = that friend's { body, flame } (optional).
    setCandles(n, { spots = n, colors, styles, names, onTap } = {}) {
      layer.textContent = '';
      candles.length = 0;
      const total = Math.max(n, spots);
      realCount = Math.min(n, 60);
      const pos = candleSpots(Math.min(total, 60));
      const order = pos.slice().sort((a, b) => a.base - b.base); // back to front
      const els = [];
      for (const p of order) {
        const isSpot = p.i >= n;
        const color = (colors && colors[p.i]) || colorFor(p.i);
        const btn = buildCandle(p, color, isSpot ? null : styles?.[p.i]);
        if (isSpot) btn.classList.add('spot');
        btn.tabIndex = isSpot || !onTap ? -1 : 0;
        btn.setAttribute('aria-label', names?.[p.i] ? `Play ${names[p.i]}'s message` : `Candle ${p.i + 1}`);
        if (onTap && !isSpot) btn.addEventListener('click', () => onTap(p.i));
        layer.append(btn);
        els[p.i] = btn;
      }
      candles.push(...els.slice(0, total));
      showCandlePage(0);
      seatAge();
      return els;
    },
    // A friend picked another candle / flame: redraw just that one, and light it again.
    setCandleStyle(i, style) { if (candles[i]) styleCandle(candles[i], style, { ignite: true }); },
    // Finale: candles go out left to right while the flames bend.
    finaleOrder(n) { return candleSpots(Math.min(n, 60)).sort((a, b) => a.x - b.x).map((s) => s.i); },
    finaleOut(i) { st.out(i); },
    setBend(strength) { stage.style.setProperty('--bend', strength ? `skewX(${(-(4 + 24 * strength)).toFixed(1)}deg) scale(${(1 - 0.18 * strength).toFixed(2)}, ${(1 - 0.3 * strength).toFixed(2)})` : 'none'); },
    setDim(level) { body.style.filter = stickers.layer.style.filter = level ? `saturate(${1 - 0.45 * level}) brightness(${1 - 0.38 * level})` : 'none'; },
    // After the candles are out: the first slice comes out of the cake onto a plate.
    finaleCut() {
      stage.querySelector('.cake-slice')?.remove();
      const cream = accent && ACCENTS[accent]?.color?.startsWith('#') ? ACCENTS[accent].color : null;
      stage.append(Object.assign(div('cake-slice'), { innerHTML: sliceSvg(FLAVORS[flavor] || FLAVORS.strawberry, cream) }));
    },
    reset() { stage.querySelector('.cake-slice')?.remove(); candles.forEach((c) => c.classList.remove('out')); api.lightAll(); api.setBend(0); }
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
