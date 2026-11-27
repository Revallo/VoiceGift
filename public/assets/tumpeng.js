// Tumpeng (an Indonesian birthday): a cone of rice on a bamboo tray lined with banana leaf.
// Drawn in a fixed 390×360 stage; every voice is a side dish around the cone, picked by the friend
// (satay, ketupat, lontong, fried chicken…). The finale: the recipient cuts the top of the tumpeng.
import { DISH_TYPES } from './item-options.js';
import { div, seeded, createStage, createStickers, createTopper, itemStates, nameText } from './stage.js';

// The rice (gift.cake.flavor).
export const FLAVORS = {
  turmeric: { label: 'Turmeric', rice: '#F2C12E', rice2: '#D99A16', grain: '#FFE58F' },
  coconut: { label: 'Coconut', rice: '#F4EFE2', rice2: '#D3C8AE', grain: '#FFFFFF' },
  redrice: { label: 'Red rice', rice: '#B85B4B', rice2: '#843A31', grain: '#DD8B7B' },
  pandan: { label: 'Pandan', rice: '#93C76E', rice2: '#5E9A45', grain: '#C8EAAE' },
  telang: { label: 'Butterfly pea', rice: '#7590E2', rice2: '#4A5FB4', grain: '#B2C3F7' }
};
export const SWATCH = (f) => ({ background: `linear-gradient(90deg, ${f.rice2}, ${f.rice} 45%, ${f.rice2})` });

// The cone (gift.cake.shape): half the width at the base, and where the tip is.
export const SHAPES = {
  classic: { label: 'Classic', hw: 76, tip: 74 },
  tall: { label: 'Tall', hw: 58, tip: 40 },
  wide: { label: 'Short', hw: 92, tip: 124 },
  grand: { label: 'Grand', hw: 104, tip: 46 },
  slim: { label: 'Slim', hw: 48, tip: 78 }
};

// The tray (gift.cake.accent), the garnish on the cone (gift.cake.pattern), what sits on the tip (gift.cake.topper).
export const ACCENTS = {
  bamboo: { label: 'Bamboo tray', color: '#C9A063', rim: '#9E7840', line: '#AE8649' },
  gold: { label: 'Gold tray', color: '#E3BE58', rim: '#B48A2C', line: '#F3D98A' },
  white: { label: 'White plate', color: '#F1ECE3', rim: '#CFC6B6', line: '#E2DACB' },
  clay: { label: 'Clay', color: '#B8643F', rim: '#7E3F22', line: '#CD7F58' }
};
export const PATTERNS = {
  plain: { label: 'Plain' },
  egg: { label: 'Egg ribbons' },
  cucumber: { label: 'Cucumber' },
  chili: { label: 'Chili strips' },
  serundeng: { label: 'Serundeng' }
};
export const TOPPERS = {
  none: { label: 'None' },
  chili: { label: 'Chili flower', emoji: '🌶️' },
  flower: { label: 'Flower', emoji: '🌺' },
  star: { label: 'Star', emoji: '⭐' },
  candle: { label: 'Candle', emoji: '🕯️' },
  age: { label: 'Age', age: true }
};

// One drawing per dish, in a 40×40 box (static markup, never user text).
function krupukPath() {
  let d = '';
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2, r = k % 2 ? 14.6 : 13;
    d += `${k ? 'L' : 'M'}${(20 + r * Math.cos(a)).toFixed(1)} ${(21 + r * 0.82 * Math.sin(a)).toFixed(1)}`;
  }
  return d + 'Z';
}
const DRAW = {
  satay: '<path d="M3 35L37 7" stroke="#D8B47E" stroke-width="1.6" stroke-linecap="round"/><g fill="#8B4A24" stroke="#5E2E14" stroke-width=".8"><rect x="8" y="23" width="9" height="7.5" rx="3" transform="rotate(-39 12.5 26.7)"/><rect x="15" y="17.2" width="9" height="7.5" rx="3" transform="rotate(-39 19.5 21)"/><rect x="22" y="11.5" width="9" height="7.5" rx="3" transform="rotate(-39 26.5 15.2)"/></g><path d="M9 24q4 4 8-1q4-5 8-1q3-4 7-4" fill="none" stroke="#C9822F" stroke-width="2.2" stroke-linecap="round"/><g fill="#F3E2B5"><circle cx="14" cy="23" r=".9"/><circle cx="21" cy="18" r=".9"/><circle cx="27" cy="13" r=".9"/></g>',
  ketupat: '<path d="M20 5L34 20L20 35L6 20Z" fill="#9CC75A" stroke="#4E7A2A" stroke-width="1.2" stroke-linejoin="round"/><path d="M9.5 16.3L23.5 31.3M13 12.5L27 27.5M16.5 8.8L30.5 23.8M23.5 8.8L9.5 23.8M27 12.5L13 27.5M30.5 16.3L16.5 31.3" stroke="#5E8F36" stroke-width="1"/><path d="M20 5q-1-3-5-4M20 5q2-3 6-3" stroke="#4E7A2A" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
  lontong: '<rect x="4" y="12" width="23" height="13" rx="6.5" fill="#7DB04E" stroke="#4E7A2A" stroke-width="1"/><path d="M10 12v13M16 12v13M22 12v13" stroke="#5E8F36" stroke-width=".8"/><ellipse cx="30" cy="24" rx="5.4" ry="7" fill="#F4F2E6" stroke="#7DB04E" stroke-width="2"/><ellipse cx="22" cy="31" rx="5" ry="6.2" fill="#F4F2E6" stroke="#7DB04E" stroke-width="2"/>',
  chicken: '<path d="M5 35L13 27" stroke="#F3E6CF" stroke-width="3.6" stroke-linecap="round"/><circle cx="4.2" cy="33" r="2.4" fill="#F3E6CF"/><circle cx="7" cy="36.3" r="2.4" fill="#F3E6CF"/><path d="M11 30C8 24 10 12 19 8C27 5 35 11 33 19C31 26 22 27 15 31Z" fill="#C47A2A" stroke="#7E4614" stroke-width="1"/><path d="M17 13q3-2 6-1M22 19q3-1 5 1M14 22q2-1 4 0M26 12q2 0 3 2" stroke="#E8B262" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
  egg: '<ellipse cx="20" cy="22" rx="14" ry="10.5" fill="#FBF7EC" stroke="#D8CDB4" stroke-width="1"/><circle cx="20" cy="22" r="5.8" fill="#F4B728" stroke="#E09A12" stroke-width="1"/><path d="M8 17q5-6 11-4M23 31q6 1 10-4" stroke="#D63B2A" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  tempeh: '<rect x="11" y="9" width="22" height="15" rx="2.5" fill="#B9853A" stroke="#7E5520" stroke-width="1"/><rect x="6" y="16" width="24" height="16" rx="2.5" fill="#D2A04E" stroke="#8A5E22" stroke-width="1"/><g fill="#F1DDAE"><ellipse cx="10.5" cy="21" rx="1.6" ry="1.2"/><ellipse cx="16" cy="24" rx="1.6" ry="1.2"/><ellipse cx="22" cy="20.5" rx="1.6" ry="1.2"/><ellipse cx="26" cy="26" rx="1.6" ry="1.2"/><ellipse cx="12" cy="28" rx="1.6" ry="1.2"/><ellipse cx="19.5" cy="29" rx="1.6" ry="1.2"/></g>',
  perkedel: '<ellipse cx="20" cy="23" rx="14" ry="10" fill="#B87A2C" stroke="#7E5018" stroke-width="1"/><ellipse cx="20" cy="21" rx="11" ry="7" fill="#DDA552"/><g fill="#7A4A16"><circle cx="15" cy="19" r=".9"/><circle cx="22" cy="18" r=".9"/><circle cx="25" cy="23" r=".9"/><circle cx="17" cy="24" r=".9"/></g><g fill="#4F8A2E"><circle cx="19" cy="20" r="1"/><circle cx="24" cy="20" r=".9"/><circle cx="14" cy="22" r=".9"/></g>',
  krupuk: `<path d="${krupukPath()}" fill="#F6E3C2" stroke="#D3AE7C" stroke-width="1"/><g fill="#E8CFA6"><ellipse cx="15" cy="17" rx="2.4" ry="1.6"/><ellipse cx="25" cy="20" rx="2.8" ry="1.8"/><ellipse cx="18" cy="26" rx="2.2" ry="1.4"/></g>`,
  urap: '<path d="M5 29C5 19 13 12 20 12C28 12 35 19 35 29Z" fill="#5E9C3A" stroke="#3F6E24" stroke-width="1"/><path d="M9 25q4-7 9-5M16 18q5-5 10 0M22 25q4-6 9-2" stroke="#8CC65A" stroke-width="2.2" fill="none" stroke-linecap="round"/><g fill="#FFF6DD"><circle cx="12" cy="22" r="1"/><circle cx="18" cy="16" r="1"/><circle cx="24" cy="21" r="1"/><circle cx="29" cy="25" r="1"/><circle cx="16" cy="26" r=".9"/><circle cx="21" cy="27" r=".9"/></g><ellipse cx="20" cy="29" rx="15" ry="2" fill="#3F6E24" opacity=".5"/>',
  sambal: '<path d="M6 19H34A14 12 0 0 1 6 19Z" fill="#A9643A" stroke="#6E3C1E" stroke-width="1"/><ellipse cx="20" cy="19" rx="14" ry="4.6" fill="#D8361F" stroke="#6E3C1E" stroke-width="1"/><g fill="#F6824D"><circle cx="15" cy="18.5" r="1"/><circle cx="21" cy="20" r="1"/><circle cx="26" cy="18" r="1"/></g><path d="M24 15q6-9 12-6" stroke="#3E8A2A" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  fish: '<path d="M31 21L38 14L37 21L38 28Z" fill="#9E5E26" stroke="#6E3F15" stroke-width="1" stroke-linejoin="round"/><path d="M4 21C9 11 26 11 32 21C26 31 9 31 4 21Z" fill="#B8742F" stroke="#6E3F15" stroke-width="1"/><circle cx="10" cy="19.4" r="1.7" fill="#2B1A0E"/><path d="M15 15q2.5 6 0 12M20.5 14q2.5 7 0 14M26 15q2.5 6 0 12" stroke="#875019" stroke-width="1" fill="none"/>',
  tofu: '<path d="M7 15L20 9L33 15L20 21Z" fill="#EEC46E"/><path d="M7 15L20 21L20 34L7 28Z" fill="#CF9338"/><path d="M33 15L20 21L20 34L33 28Z" fill="#B57A26"/><path d="M7 15L20 9L33 15V28L20 34L7 28Z" fill="none" stroke="#86561A" stroke-width="1" stroke-linejoin="round"/><g fill="#F8DE9A"><circle cx="16" cy="14" r=".9"/><circle cx="23" cy="15.5" r=".9"/></g>'
};
export const DISHES = Object.fromEntries(Object.entries(DISH_TYPES).map(([k, v]) => [k, { ...v, svg: DRAW[k] }]));
export const dishKey = (type, i = 0) => (DISHES[type] ? type : Object.keys(DISHES)[i % Object.keys(DISHES).length]);
const dishSvg = (type) => `<svg viewBox="0 0 40 40" class="d-food" aria-hidden="true">${DISHES[type].svg}</svg>`;

// A dish on its own (the friend's pick row).
export function miniDish(type, size = 44) {
  const holder = div('mini-dish', { position: 'relative', width: `${size}px`, height: `${size}px` });
  holder.innerHTML = `<i class="d-leaf"></i>${dishSvg(dishKey(type))}`;
  holder.setAttribute('aria-hidden', 'true');
  return holder;
}

const W = 390, H = 360;
const CX = 195, CY = 262; // the middle of the tray
const BASE = CY - 6; // where the cone stands
const MAX = 40;
const OL = '#5B3A29'; // the brown sticker outline (soft.css --ol)
let uid = 0;

// Where the dishes go: around the tray (but never hidden behind the cone), then a second row in front.
// θ = 90° is the front of the tray, -90° the back.
export function dishSpots(n) {
  n = Math.max(0, Math.min(MAX, Math.floor(Number(n) || 0)));
  if (!n) return [];
  const size = n <= 4 ? 64 : n <= 7 ? 54 : n <= 12 ? 44 : n <= 18 ? 40 : n <= 26 ? 34 : n <= 32 ? 29 : 25;
  // Points along a ring, evenly spaced along the drawn curve (by angle, the sides of a flat ellipse would crowd).
  const curve = (rx, ry, from, to) => {
    const pts = [], len = [0];
    for (let k = 0; k <= 200; k++) {
      const a = ((from + ((to - from) * k) / 200) * Math.PI) / 180;
      pts.push([CX + rx * Math.cos(a), CY + ry * Math.sin(a)]);
      if (k) len.push(len[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    }
    return { pts, len, total: len[200] };
  };
  const ring = (c, count, start) => Array.from({ length: count }, (_, j) => {
    const k = c.len.findIndex((l) => l >= (c.total * (j + 0.5)) / count);
    return { i: start + j, x: c.pts[k][0], y: c.pts[k][1], size };
  });
  // one ring around the tray; from 13 dishes on, a second row in front of the cone, shared by length
  const outer = curve(162, 55, -50, 230), inner = curve(100, 31, 18, 162);
  const nOuter = n <= 12 ? n : Math.round((n * outer.total) / (outer.total + inner.total));
  const spots = [...ring(outer, nOuter, 0), ...ring(inner, n - nOuter, nOuter)];
  return spots;
}

export function createTumpeng(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size, setBackdrop } = createStage(host, W, H, 'tumpeng');
  glow.style.top = '-150px';
  const id = `tp${++uid}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  Object.assign(svg.style, { position: 'absolute', left: '0', top: '0', width: `${W}px`, height: `${H}px`, overflow: 'visible' });
  body.append(svg);
  const sign = div('tp-name', { position: 'absolute', left: '20px', width: `${W - 40}px`, top: '326px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: '1.3' });
  const signFont = nameText(sign, true);
  body.append(sign);
  // the topper rides on the top piece when it is cut, so it sits in its own little holder
  const tip = div('tp-tip', { position: 'absolute', left: '0', top: '0', width: `${W}px`, height: `${H}px`, pointerEvents: 'none' });
  body.append(tip);
  const placeTopper = createTopper(tip, { x: CX, base: 0, size: 28 });

  let flavor = FLAVORS.turmeric, shape = SHAPES.classic, tray = ACCENTS.bamboo, pattern = 'plain', topper = 'none', age = 0;

  // The cone: convex sides, a soft round tip, the base an arc of an ellipse.
  const conePath = (hw, tipY) => {
    const L = CX - hw, R = CX + hw, h = BASE - tipY;
    return `M${L} ${BASE}C${L + hw * 0.22} ${BASE - h * 0.5} ${CX - hw * 0.3} ${tipY + h * 0.1} ${CX - 7} ${tipY + 5}Q${CX} ${tipY - 3} ${CX + 7} ${tipY + 5}C${CX + hw * 0.3} ${tipY + h * 0.1} ${R - hw * 0.22} ${BASE - h * 0.5} ${R} ${BASE}A${hw} 15 0 0 1 ${L} ${BASE}Z`;
  };

  function garnish(hw, tipY) {
    const h = BASE - tipY;
    // half the width of the cone at height y (close enough to the curve for a garnish)
    const halfAt = (y) => hw * Math.pow(Math.max(0, (y - tipY) / h), 0.8);
    let out = '';
    if (pattern === 'egg') { // thin omelette ribbons wound around the cone
      for (const f of [0.34, 0.58, 0.82]) {
        const y = tipY + h * f, w = halfAt(y);
        out += `<path d="M${CX - w - 2} ${y - 6}Q${CX} ${y + 10} ${CX + w + 2} ${y - 6}" fill="none" stroke="#E9A23A" stroke-width="7.5" stroke-linecap="round"/>`;
        out += `<path d="M${CX - w - 2} ${y - 6}Q${CX} ${y + 10} ${CX + w + 2} ${y - 6}" fill="none" stroke="#FAD66A" stroke-width="4.5" stroke-linecap="round"/>`;
      }
    } else if (pattern === 'chili') {
      for (const f of [0.3, 0.52, 0.74, 0.94]) {
        const y = tipY + h * f, w = halfAt(y) * 0.92;
        out += `<path d="M${CX - w} ${y - 4}Q${CX} ${y + 8} ${CX + w} ${y - 4}" fill="none" stroke="#D63B2A" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="9 7"/>`;
      }
    } else if (pattern === 'serundeng') {
      const rnd = seeded(41);
      for (let k = 0; k < 70; k++) {
        const y = tipY + h * (0.15 + 0.85 * Math.sqrt(rnd())), w = halfAt(y) * 0.9;
        out += `<circle cx="${(CX + (rnd() * 2 - 1) * w).toFixed(1)}" cy="${y.toFixed(1)}" r="${(1 + rnd() * 1.1).toFixed(1)}" fill="${rnd() < 0.5 ? '#7A4A1E' : '#A8692E'}"/>`;
      }
    }
    return out;
  }

  // Cucumber slices stand around the foot of the cone, on the leaf.
  function footGarnish(hw) {
    if (pattern !== 'cucumber') return '';
    let out = '';
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI * (0.06 + 0.88 * (k / 8));
      const x = CX - Math.cos(a) * (hw + 4), y = BASE + Math.sin(a) * 15;
      out += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="9" ry="6" fill="#4E8A2E"/><ellipse cx="${x.toFixed(1)}" cy="${(y - 0.6).toFixed(1)}" rx="7.4" ry="4.8" fill="#DDF0C4"/><ellipse cx="${x.toFixed(1)}" cy="${(y - 0.6).toFixed(1)}" rx="3.6" ry="2.2" fill="#BFE09A"/>`;
    }
    return out;
  }

  // A happy face low on the cone, sized to fit its width there (static markup). Dark eyes, or light ones on red rice.
  function coneFace(hw, tipY) {
    const h = BASE - tipY, y = tipY + h * 0.66, half = hw * Math.pow(0.66, 0.8);
    const k = Math.min(1, half / 50), x = CX, ink = flavor === FLAVORS.redrice ? '#FFF1E0' : '#4A2E20';
    return `<g transform="translate(${x} ${y.toFixed(1)}) scale(${k.toFixed(2)})">
      <ellipse cx="-30" cy="9" rx="9" ry="5" fill="#FF8FA8" opacity=".6"/><ellipse cx="30" cy="9" rx="9" ry="5" fill="#FF8FA8" opacity=".6"/>
      <ellipse cx="-16" cy="0" rx="4" ry="5" fill="${ink}"/><ellipse cx="16" cy="0" rx="4" ry="5" fill="${ink}"/>
      <circle cx="-14.6" cy="-1.8" r="1.4" fill="#FFF"/><circle cx="17.4" cy="-1.8" r="1.4" fill="#FFF"/>
      <path d="M-8 6Q0 14 8 6" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/></g>`;
  }

  function draw() {
    const { hw, tip: tipY } = shape;
    const h = BASE - tipY;
    const cut = tipY + h * 0.27; // where the top piece comes off
    const rnd = seeded(7);
    let grains = '';
    for (let k = 0; k < 70; k++) {
      const y = tipY + 6 + h * Math.sqrt(rnd()), w = hw * Math.pow((y - tipY) / h, 0.8);
      const x = (CX + (rnd() * 2 - 1) * w * 0.95).toFixed(1);
      grains += `<ellipse cx="${x}" cy="${y.toFixed(1)}" rx="1.9" ry="1.1" transform="rotate(${Math.round(rnd() * 180)} ${x} ${y.toFixed(1)})" fill="${flavor.grain}" opacity="${(0.35 + rnd() * 0.4).toFixed(2)}"/>`;
    }
    let weave = '';
    for (let r = 0.18; r < 1; r += 0.12) weave += `<ellipse cx="${CX}" cy="${CY}" rx="${(182 * r).toFixed(1)}" ry="${(64 * r).toFixed(1)}" fill="none" stroke="${tray.line}" stroke-width="1.2" opacity=".7"/>`;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      weave += `<path d="M${CX} ${CY}L${(CX + 182 * Math.cos(a)).toFixed(1)} ${(CY + 64 * Math.sin(a)).toFixed(1)}" stroke="${tray.line}" stroke-width=".8" opacity=".45"/>`;
    }
    // banana leaf: a scalloped ellipse with veins
    let leaf = '';
    for (let k = 0; k <= 36; k++) {
      const a = (k / 36) * Math.PI * 2, r = k % 2 ? 1 : 0.94;
      leaf += `${k ? 'L' : 'M'}${(CX + 170 * r * Math.cos(a)).toFixed(1)} ${(CY - 2 + 56 * r * Math.sin(a)).toFixed(1)}`;
    }
    let veins = '';
    for (let k = -7; k <= 7; k++) veins += `<path d="M${CX + k * 22} ${CY - 50 + Math.abs(k) * 3.5}L${CX + k * 22 + 10} ${CY + 50 - Math.abs(k) * 3.5}" stroke="#2F6B2A" stroke-width="1" opacity=".35"/>`;
    const cone = conePath(hw, tipY);
    svg.innerHTML = `<defs>
      <linearGradient id="${id}r" x1="0" x2="1"><stop offset=".2" stop-color="${flavor.grain}"/><stop offset=".2" stop-color="${flavor.rice}"/><stop offset=".8" stop-color="${flavor.rice}"/><stop offset=".8" stop-color="${flavor.rice2}"/></linearGradient>
      <radialGradient id="${id}l" cx=".5" cy=".42" r=".6"><stop offset=".62" stop-color="#62AE4C"/><stop offset=".62" stop-color="#4E9A3E"/></radialGradient>
      <clipPath id="${id}c"><path d="${cone}"/></clipPath>
      <clipPath id="${id}t"><rect x="0" y="0" width="${W}" height="${cut + 1}"/></clipPath>
      <clipPath id="${id}b"><rect x="0" y="${cut}" width="${W}" height="${H}"/></clipPath>
    </defs>
    <ellipse cx="${CX}" cy="${CY + 16}" rx="186" ry="58" fill="#000" opacity=".1"/>
    <ellipse cx="${CX}" cy="${CY + 7}" rx="184" ry="64" fill="${tray.rim}" stroke="${OL}" stroke-width="3"/>
    <ellipse cx="${CX}" cy="${CY}" rx="182" ry="64" fill="${tray.color}"/>${weave}
    <path d="${leaf}Z" fill="url(#${id}l)" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>${veins}
    <path d="M${CX - 160} ${CY - 2}H${CX + 160}" stroke="#2F6B2A" stroke-width="1.6" opacity=".4"/>
    <ellipse cx="${CX}" cy="${BASE + 4}" rx="${hw + 10}" ry="18" fill="#1E3F18" opacity=".45"/>
    <g class="tp-bottom" clip-path="url(#${id}b)"><g clip-path="url(#${id}c)"><path d="${cone}" fill="url(#${id}r)"/>${grains}${garnish(hw, tipY)}<path d="${cone}" fill="none" stroke="${OL}" stroke-width="6.4"/></g>${coneFace(hw, tipY)}</g>
    <g class="tp-top" clip-path="url(#${id}t)"><g clip-path="url(#${id}c)"><path d="${cone}" fill="url(#${id}r)"/>${grains}${garnish(hw, tipY)}<path d="${cone}" fill="none" stroke="${OL}" stroke-width="6.4"/></g></g>
    <ellipse class="tp-cutline" cx="${CX}" cy="${cut}" rx="${(hw * Math.pow(0.27, 0.8) + 1).toFixed(1)}" ry="4.5" fill="${flavor.grain}" stroke="${OL}" stroke-width="2"/>
    ${footGarnish(hw)}`;
    stage.style.setProperty('--cut', `${cut}px`);
    drawTopper();
  }

  function drawTopper() {
    const t = TOPPERS[topper];
    placeTopper(t?.emoji ? t : null, t?.age && age ? String(age) : '');
    const el = tip.querySelector('.topper');
    if (el) el.style.top = `${shape.tip + 6}px`;
  }

  const dishes = [];
  const st = itemStates(dishes, glow);
  const stickers = createStickers(stage);
  const types = [];

  const api = {
    wrap, stage, candles: dishes, toStage, size, stickers, ...st, setBackdrop,
    drawArea: null, // no drawing on the tumpeng
    setDots() {}, getDots() { return []; }, addDot() {},
    setFlavor(f) { flavor = FLAVORS[f] || FLAVORS.turmeric; draw(); },
    setShape(k) { shape = SHAPES[k] || SHAPES.classic; stage.dataset.shape = SHAPES[k] ? k : 'classic'; draw(); },
    setAccent(k) { tray = ACCENTS[k] || ACCENTS.bamboo; draw(); },
    setPattern(k) { pattern = PATTERNS[k] ? k : 'plain'; draw(); },
    setTopper(k, a) { topper = k; age = a || 0; drawTopper(); },
    setName(text) { sign.textContent = text || ''; signFont.setSize(26); },
    setFont: signFont.setFont,
    setDishStyle(i, style) {
      const el = dishes[i];
      if (!el) return;
      const type = dishKey(style?.type, i);
      types[i] = type;
      el.querySelector('.d-food')?.remove();
      el.insertAdjacentHTML('beforeend', dishSvg(type));
      el.style.setProperty('--c', DISHES[type].tint);
    },
    // Lay out `n` dishes (+ empty leaves up to `spots`). Returns the dish elements in message order.
    setCandles(n, { spots = n, dishes: styles, names, onTap } = {}) {
      layer.textContent = '';
      dishes.length = 0;
      const total = Math.min(Math.max(n, spots), MAX);
      const els = [];
      // drawn back to front, so the front dishes overlap the ones behind
      for (const p of dishSpots(total).sort((a, b) => a.y - b.y)) {
        const isSpot = p.i >= n;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dish' + (isSpot ? ' spot' : '');
        btn.tabIndex = isSpot || !onTap ? -1 : 0;
        if (!isSpot) btn.setAttribute('aria-label', names?.[p.i] ? `Play ${names[p.i]}'s message` : `Dish ${p.i + 1}`);
        Object.assign(btn.style, { left: `${(p.x - p.size / 2).toFixed(1)}px`, top: `${(p.y - p.size * 0.72).toFixed(1)}px`, width: `${p.size}px`, height: `${p.size}px` });
        btn.style.setProperty('--hop-at', `${(p.i * 0.05).toFixed(2)}s`);
        btn.innerHTML = '<i class="d-leaf"></i>';
        if (onTap && !isSpot) btn.addEventListener('click', () => onTap(p.i));
        layer.append(btn);
        els[p.i] = btn;
      }
      dishes.push(...els);
      for (let i = 0; i < n && i < MAX; i++) api.setDishStyle(i, styles?.[i]);
      st.updateGlow();
      return els;
    },
    // Finale: the top of the tumpeng is cut, then every dish hops, left to right.
    finaleStart() { stage.classList.add('cut'); },
    finaleOrder(n) { return dishSpots(Math.min(n, MAX)).sort((a, b) => a.x - b.x).map((s) => s.i); },
    finaleOut(i) { st.out(i, true); },
    setBend() {},
    setDim(level) { body.style.filter = stickers.layer.style.filter = level ? `saturate(${1 - 0.4 * level}) brightness(${1 - 0.4 * level})` : 'none'; },
    reset() { stage.classList.remove('cut'); dishes.forEach((c) => c.classList.remove('out')); api.lightAll(); }
  };

  flavor = FLAVORS[opts.flavor] || FLAVORS.turmeric;
  shape = SHAPES[opts.shape] || SHAPES.classic;
  stage.dataset.shape = SHAPES[opts.shape] ? opts.shape : 'classic';
  tray = ACCENTS[opts.accent] || ACCENTS.bamboo;
  pattern = PATTERNS[opts.pattern] ? opts.pattern : 'plain';
  topper = opts.topper || 'none';
  age = opts.age || 0;
  draw();
  api.setFont(opts.font);
  api.setName(opts.name);
  st.updateGlow();
  setBackdrop(opts.backdrop);
  stickers.set(opts.stickers);
  return api;
}
