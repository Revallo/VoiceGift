// Tết (Vietnamese New Year): a blossom tree in a pot, and every voice is a red lì xì envelope hanging on its branches
// (people really hang lì xì on their mai / đào tree). Drawn in a fixed 390×370 stage. The friend picks the design of
// their envelope (message.item.type, ENVELOPE_TYPES). The finale: the recipient opens them all, a gold coin pops out of each.
// Kept clear of what Vietnam frowns on (see `ide local.md`): no flags or maps, no white or black wrapping, no zodiac
// animals, except the dragon of the Imlek kind (themes.js IMLEK), drawn as a lucky motif, never as a year sign.
import { ENVELOPE_TYPES } from './item-options.js';
import { div, seeded, createStage, createStickers, createTopper, itemStates, nameText } from './stage.js';
import { drapeSvg } from './local.js';

// The blossoms (gift.cake.flavor): yellow mai (the South), pink đào (the North), a kumquat tree, or both blossoms.
export const FLAVORS = {
  mai: { label: 'Mai (yellow)', petal: '#F6C92B', petal2: '#FFE27A', heart: '#D9800F' },
  dao: { label: 'Đào (pink)', petal: '#F49AB8', petal2: '#FFD0DF', heart: '#C2416B' },
  kumquat: { label: 'Kumquat', petal: '#F28C1E', petal2: '#FFB75A', heart: '#3F7D2E', fruit: true },
  mix: { label: 'Mai & đào', petal: '#F6C92B', petal2: '#FFE27A', heart: '#D9800F', mix: '#F49AB8' }
};
export const SWATCH = (f) => ({ background: f.mix ? `linear-gradient(90deg, ${f.petal} 50%, ${f.mix} 50%)` : `radial-gradient(circle, ${f.petal2}, ${f.petal})` });

// What the tree stands in (gift.cake.shape).
export const SHAPES = {
  classic: { label: 'Round pot' },
  vase: { label: 'Tall vase' },
  bonsai: { label: 'Bonsai tray' },
  basket: { label: 'Basket' }
};
// The pot's colour (gift.cake.accent), extras on the branches (gift.cake.pattern), what crowns the tree (gift.cake.topper).
export const ACCENTS = {
  blue: { label: 'Blue & white', color: '#2F5FA8', light: '#E9F0FA' },
  red: { label: 'Red lacquer', color: '#B3202A', light: '#E8B53A' },
  gold: { label: 'Gold', color: '#D8A73A', light: '#FFF0B8' },
  celadon: { label: 'Celadon', color: '#7FAE94', light: '#DDEFE3' }
};
export const PATTERNS = {
  plain: { label: 'Just blossoms' },
  lights: { label: 'Fairy lights' },
  lanterns: { label: 'Mini lanterns' },
  crackers: { label: 'Paper crackers' }
};
export const TOPPERS = {
  none: { label: 'None' },
  sparkle: { label: 'Sparkles', emoji: '✨' },
  star: { label: 'Star', emoji: '🌟' },
  lantern: { label: 'Lantern', emoji: '🏮' },
  fireworks: { label: 'Fireworks', emoji: '🎆' }
};

// One drawing per envelope design, in a 40×58 box (static markup, never user text).
const flower = (cx, cy, r, petal, heart) => {
  let s = '';
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 - Math.PI / 2; s += `<circle cx="${(cx + r * Math.cos(a)).toFixed(1)}" cy="${(cy + r * Math.sin(a)).toFixed(1)}" r="${(r * 0.78).toFixed(1)}" fill="${petal}"/>`; }
  return s + `<circle cx="${cx}" cy="${cy}" r="${(r * 0.55).toFixed(1)}" fill="${heart}"/>`;
};
const RED = '#C8202A', GOLD = '#F2C14E';
const frame = (bg, line) => `<rect x="1" y="1" width="38" height="56" rx="4" fill="${bg}"/><rect x="4" y="4" width="32" height="50" rx="2.5" fill="none" stroke="${line}" stroke-width="1.2"/><path d="M1 12Q20 24 39 12" fill="none" stroke="${line}" stroke-width="1.2" opacity=".8"/>`;
const DRAW = {
  red: `${frame(RED, GOLD)}<circle cx="20" cy="20" r="3.4" fill="${GOLD}"/><path d="M10 44h20M13 48h14" stroke="${GOLD}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`,
  loc: `${frame(RED, GOLD)}<circle cx="20" cy="35" r="11" fill="none" stroke="${GOLD}" stroke-width="1.2"/><text x="20" y="39.5" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="12" fill="${GOLD}">Lộc</text>`,
  blossom: `${frame(RED, GOLD)}${flower(20, 35, 5.6, '#F6C92B', '#D9800F')}${flower(30, 46, 3, '#F6C92B', '#D9800F')}<path d="M8 50Q14 40 20 35M30 46Q26 42 20 35" stroke="#7A3B16" stroke-width="1.1" fill="none"/>`,
  peach: `${frame(RED, GOLD)}${flower(20, 34, 5.6, '#F7A6C0', '#C2416B')}${flower(11, 45, 3, '#F7A6C0', '#C2416B')}<path d="M32 50Q26 40 20 34M11 45Q15 40 20 34" stroke="#7A3B16" stroke-width="1.1" fill="none"/>`,
  coin: `${frame(RED, GOLD)}<circle cx="20" cy="36" r="10" fill="${GOLD}" stroke="#B9852A" stroke-width="1.2"/><rect x="16.5" y="32.5" width="7" height="7" fill="${RED}"/><circle cx="20" cy="36" r="7.6" fill="none" stroke="#B9852A" stroke-width=".8"/>`,
  koi: `${frame(RED, GOLD)}<path d="M9 38C13 30 25 30 29 36L34 31L33 38L34 45L29 40C25 46 13 46 9 38Z" fill="#F0A33A" stroke="${GOLD}" stroke-width=".8"/><circle cx="13.5" cy="36.6" r="1.1" fill="#5A1A10"/><path d="M17 33q2 5 0 10M21.5 32.5q2 5.5 0 11" stroke="#C8622A" stroke-width=".9" fill="none"/>`,
  dragon: `${frame(RED, GOLD)}<path d="M9 44c2-7 9-6 10-1 1 4 7 4 8-1 1-6-6-8-10-5" fill="none" stroke="${GOLD}" stroke-width="2.6" stroke-linecap="round"/><path d="M17 37c1-4 6-6 10-4l3-3 .5 4 3 1.5-3.5 1.5c-.5 3-3 4.5-6 4" fill="${GOLD}"/><circle cx="27.4" cy="35" r=".9" fill="${RED}"/><path d="M11 42l-2-2M14 46l-1 3M22 46l1 3" stroke="${GOLD}" stroke-width="1.3" stroke-linecap="round"/><circle cx="20" cy="20" r="2.6" fill="${GOLD}"/>`,
  scale: `${frame(RED, GOLD)}${[28, 34, 40, 46].map((y, r) => [0, 1, 2, 3].map((c) => `<path d="M${7 + c * 7 + (r % 2) * 3.5} ${y}a3.5 3.5 0 0 1 7 0" fill="none" stroke="${GOLD}" stroke-width="1.1"/>`).join('')).join('')}<circle cx="20" cy="19" r="2.6" fill="${GOLD}"/>`,
  cloud: `${frame(RED, GOLD)}<path d="M9 40a4 4 0 0 1 6-3 5 5 0 0 1 9 1 3.5 3.5 0 1 1 1 7H11a3 3 0 0 1-2-5z" fill="none" stroke="${GOLD}" stroke-width="1.4"/><path d="M16 41a2 2 0 1 1 3 1.6M24 30a3 3 0 0 1 5-1 2.5 2.5 0 1 1 2 4h-6" fill="none" stroke="${GOLD}" stroke-width="1.2" stroke-linecap="round"/><circle cx="20" cy="20" r="2.6" fill="${GOLD}"/>`,
  lantern: `${frame(GOLD, RED)}<path d="M20 22v4" stroke="${RED}" stroke-width="1.2"/><rect x="15" y="26" width="10" height="2.5" rx="1" fill="#8A1A1A"/><ellipse cx="20" cy="37" rx="9" ry="9.5" fill="${RED}"/><path d="M14 37h12M20 28v18" stroke="#8A1A1A" stroke-width=".8" opacity=".7"/><rect x="15" y="45.5" width="10" height="2.5" rx="1" fill="#8A1A1A"/><path d="M20 48v5" stroke="${RED}" stroke-width="1.6"/>`
};
export const ENVELOPES = Object.fromEntries(Object.entries(ENVELOPE_TYPES).map(([k, v]) => [k, { ...v, svg: DRAW[k] }]));
export const envelopeKey = (type, i = 0) => (ENVELOPES[type] ? type : Object.keys(ENVELOPES)[i % Object.keys(ENVELOPES).length]);
const envelopeSvg = (type) => `<svg viewBox="0 0 40 58" class="e-svg" aria-hidden="true">${ENVELOPES[type].svg}</svg>`;

// An envelope on its own (the friend's pick row).
export function miniEnvelope(type, size = 44) {
  const holder = div('mini-envelope', { position: 'relative', width: `${Math.round(size * 0.69)}px`, height: `${size}px` });
  holder.innerHTML = envelopeSvg(envelopeKey(type));
  holder.setAttribute('aria-hidden', 'true');
  return holder;
}

const W = 390, H = 370;
const CX = 195;
const POT = 268; // the rim of the pot
const MAX = 36;
let uid = 0;

// The rows of branches (always at least three, so a few voices still hang on a full tree), the rows that hold
// envelopes, and how wide the crown is at a height.
const branchRows = (n) => (n <= 21 ? [52, 116, 180] : [36, 92, 148, 204]);
const rowsFor = (n) => (n <= 4 ? [116] : n <= 10 ? [116, 180] : branchRows(n));
const halfWidth = (y) => 172 * Math.sqrt(Math.max(0.08, 1 - ((y - 128) / 150) ** 2));
const branchY = (base, x, hw) => base + 18 * (1 - Math.min(1, Math.abs(x - CX) / hw)) ** 1.5;

// Where the envelopes hang: balanced rows across the crown, each from its own branch.
export function envelopeSpots(n) {
  n = Math.max(0, Math.min(MAX, Math.floor(Number(n) || 0)));
  if (!n) return [];
  const rows = rowsFor(n);
  const [w, h] = n <= 3 ? [40, 58] : n <= 6 ? [34, 50] : n <= 10 ? [30, 44] : n <= 15 ? [27, 39] : n <= 21 ? [24, 35] : n <= 28 ? [21, 31] : [19, 28];
  const per = Math.floor(n / rows.length), extra = n % rows.length;
  const rnd = seeded(11 + n);
  const spots = [];
  rows.forEach((base, r) => {
    const count = per + (r < extra ? 1 : 0), hw = halfWidth(base);
    const span = Math.min(2 * hw - w - 16, count * (w + 10));
    for (let k = 0; k < count; k++) {
      const x = count === 1 ? CX : CX - span / 2 + (span * k) / (count - 1);
      const top = branchY(base, x, hw);
      spots.push({ x, top, len: Math.round(6 + rnd() * 8), w, h, swing: (2.4 + rnd() * 1.4).toFixed(2) });
    }
  });
  return spots.map((s, i) => ({ ...s, i }));
}

export function createLixi(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size, setBackdrop } = createStage(host, W, H, 'lixi');
  // the country (gift.cake.local): what hangs across the top at a wedding there
  const drape = div('local-drape');
  body.prepend(drape);
  const paintDrape = (k) => { drape.innerHTML = drapeSvg(k, W); }; // static markup
  paintDrape(opts.local);
  glow.style.top = '-140px';
  const id = `lx${++uid}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  Object.assign(svg.style, { position: 'absolute', left: '0', top: '0', width: `${W}px`, height: `${H}px`, overflow: 'visible' });
  body.append(svg);
  const sign = div('lx-name', { position: 'absolute', left: '20px', width: `${W - 40}px`, top: '332px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: '1.3' });
  const signFont = nameText(sign, true);
  body.append(sign);
  const placeTopper = createTopper(body, { x: CX, base: 0, size: 30 });

  let flavor = FLAVORS.mai, shape = 'classic', pot = ACCENTS.blue, pattern = 'plain', topper = 'none', total = 8;

  function potSvg() {
    const c = pot.color, l = pot.light;
    if (shape === 'vase') return `<path d="M${CX - 22} ${POT}Q${CX - 44} ${POT + 34} ${CX - 30} ${POT + 58}H${CX + 30}Q${CX + 44} ${POT + 34} ${CX + 22} ${POT}Z" fill="${c}"/><ellipse cx="${CX}" cy="${POT}" rx="23" ry="5" fill="${l}" opacity=".9"/><path d="M${CX - 34} ${POT + 30}H${CX + 34}" stroke="${l}" stroke-width="2.4" opacity=".75"/><path d="M${CX - 20} ${POT + 42}q10-8 20 0t20 0" stroke="${l}" stroke-width="1.6" fill="none" opacity=".7"/>`;
    if (shape === 'bonsai') return `<path d="M${CX - 92} ${POT + 22}H${CX + 92}L${CX + 80} ${POT + 46}H${CX - 80}Z" fill="${c}"/><rect x="${CX - 96}" y="${POT + 16}" width="192" height="8" rx="3" fill="${l}" opacity=".85"/><rect x="${CX - 74}" y="${POT + 46}" width="14" height="8" rx="2" fill="${c}"/><rect x="${CX + 60}" y="${POT + 46}" width="14" height="8" rx="2" fill="${c}"/><ellipse cx="${CX}" cy="${POT + 18}" rx="60" ry="6" fill="#5B3A1E"/>`;
    if (shape === 'basket') {
      let weave = '';
      for (let k = 0; k < 9; k++) weave += `<path d="M${CX - 52 + k * 13} ${POT + 4}L${CX - 46 + k * 11.5} ${POT + 54}" stroke="${l}" stroke-width="1.2" opacity=".55"/>`;
      for (let r = 0; r < 4; r++) weave += `<path d="M${CX - 52 + r * 2} ${POT + 14 + r * 11}H${CX + 52 - r * 2}" stroke="${l}" stroke-width="1.4" opacity=".55"/>`;
      return `<path d="M${CX - 56} ${POT}L${CX - 46} ${POT + 56}H${CX + 46}L${CX + 56} ${POT}Z" fill="${c}"/>${weave}<rect x="${CX - 60}" y="${POT - 4}" width="120" height="9" rx="4" fill="${c}" stroke="${l}" stroke-width="1" stroke-opacity=".6"/>`;
    }
    return `<path d="M${CX - 50} ${POT}Q${CX - 66} ${POT + 30} ${CX - 36} ${POT + 56}H${CX + 36}Q${CX + 66} ${POT + 30} ${CX + 50} ${POT}Z" fill="${c}"/><rect x="${CX - 54}" y="${POT - 5}" width="108" height="10" rx="4" fill="${c}" stroke="${l}" stroke-width="1.4" stroke-opacity=".7"/>`
      + `<path d="M${CX - 40} ${POT + 16}q10-8 20 0t20 0t20 0t20 0" stroke="${l}" stroke-width="1.8" fill="none" opacity=".8"/>${blossomSvg(CX, POT + 33, 6, l, c)}<path d="M${CX - 54} ${POT + 33}h28M${CX + 26} ${POT + 33}h28" stroke="${l}" stroke-width="1.2" opacity=".6"/>`;
  }
  const blossomSvg = (cx, cy, r, petal, heart) => flower(cx, cy, r, petal, heart);

  function draw() {
    const rows = branchRows(total);
    const top = rows[0] + 14, base = shape === 'bonsai' ? POT + 18 : POT;
    const rnd = seeded(5 + total);
    // the trunk: wide at the pot, thin at the top, with a little bend
    const trunk = `<path d="M${CX - 11} ${base}C${CX - 18} ${base - 60} ${CX + 10} ${(base + top) / 2} ${CX - 3} ${top}L${CX + 3} ${top}C${CX + 16} ${(base + top) / 2} ${CX - 4} ${base - 60} ${CX + 11} ${base}Z" fill="#6B4226"/>`;
    let branches = '', blooms = '', extras = '';
    rows.forEach((y, r) => {
      const hw = halfWidth(y);
      for (const side of [-1, 1]) {
        let d = `M${CX} ${(y + 18 + r * 2).toFixed(1)}`;
        for (let k = 1; k <= 12; k++) { const x = CX + side * hw * (k / 12); d += `L${x.toFixed(1)} ${branchY(y, x, hw).toFixed(1)}`; }
        branches += `<path d="${d}" fill="none" stroke="#6B4226" stroke-width="${(3.6 - r * 0.4).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
        for (let k = 0; k < 3; k++) { // twigs
          const x = CX + side * hw * (0.3 + k * 0.25), yb = branchY(y, x, hw);
          branches += `<path d="M${x.toFixed(1)} ${yb.toFixed(1)}q${side * 8} -10 ${side * 16} -14" fill="none" stroke="#7A4E2E" stroke-width="1.4" stroke-linecap="round"/>`;
        }
        const count = Math.round(hw / 13);
        for (let k = 0; k < count; k++) {
          const x = CX + side * hw * ((k + 0.5) / count) + (rnd() - 0.5) * 6, yb = branchY(y, x, hw) + (rnd() - 0.6) * 16;
          const petal = flavor.mix && rnd() < 0.5 ? flavor.mix : rnd() < 0.3 ? flavor.petal2 : flavor.petal;
          if (flavor.fruit) blooms += `<ellipse cx="${(x + 3).toFixed(1)}" cy="${(yb - 3).toFixed(1)}" rx="5" ry="2.4" fill="#3F7D2E" transform="rotate(-30 ${(x + 3).toFixed(1)} ${(yb - 3).toFixed(1)})"/><circle cx="${x.toFixed(1)}" cy="${yb.toFixed(1)}" r="${(3 + rnd() * 1.4).toFixed(1)}" fill="${petal}"/>`;
          else blooms += blossomSvg(+x.toFixed(1), +yb.toFixed(1), +(2.6 + rnd() * 1.6).toFixed(1), petal, flavor.heart);
        }
        if (pattern === 'lights') for (let k = 1; k < 10; k++) { const x = CX + side * hw * (k / 10); extras += `<circle class="lx-fairy" cx="${x.toFixed(1)}" cy="${(branchY(y, x, hw) + 3).toFixed(1)}" r="1.8"/>`; }
        if (pattern === 'lanterns') { const x = CX + side * (hw - 6), yb = branchY(y, x, hw); extras += `<path d="M${x} ${yb}v6" stroke="#E8B53A" stroke-width=".8"/><ellipse cx="${x}" cy="${yb + 12}" rx="5.5" ry="6.5" fill="#D8302A"/><rect x="${x - 3}" y="${yb + 4.6}" width="6" height="1.8" fill="#E8B53A"/><rect x="${x - 3}" y="${yb + 17.6}" width="6" height="1.8" fill="#E8B53A"/>`; }
        if (pattern === 'crackers') {
          const x = CX + side * (hw - 18), yb = branchY(y, x, hw);
          extras += `<path d="M${x} ${yb}v34" stroke="#E8B53A" stroke-width=".8"/>`;
          for (let k = 0; k < 5; k++) extras += `<rect x="${x - 2.4 + (k % 2 ? 2.2 : -2.2)}" y="${yb + 5 + k * 6}" width="4.8" height="5" rx="1" fill="#D8302A" stroke="#E8B53A" stroke-width=".5"/>`;
        }
      }
    });
    svg.innerHTML = `<defs><radialGradient id="${id}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFE7A0" stop-opacity=".22"/><stop offset="1" stop-color="#FFE7A0" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="${CX}" cy="128" rx="190" ry="150" fill="url(#${id}g)"/>
      <ellipse cx="${CX}" cy="${POT + 60}" rx="${shape === 'bonsai' ? 104 : 66}" ry="9" fill="#000" opacity=".3"/>
      ${trunk}${branches}${blooms}${extras}<g class="lx-pot">${potSvg()}</g>`;
    placeTopper(TOPPERS[topper]?.emoji ? TOPPERS[topper] : null, '');
    const el = body.querySelector('.topper');
    if (el) el.style.top = `${Math.max(32, rows[0] - 2)}px`;
  }

  const envelopes = [];
  const st = itemStates(envelopes, glow);
  const stickers = createStickers(stage);

  const api = {
    setLocal: paintDrape,
    wrap, stage, candles: envelopes, toStage, size, stickers, ...st, setBackdrop,
    drawArea: null, // no drawing on the tree
    setDots() {}, getDots() { return []; }, addDot() {},
    setFlavor(f) { flavor = FLAVORS[f] || FLAVORS.mai; draw(); },
    setShape(k) { shape = SHAPES[k] ? k : 'classic'; stage.dataset.shape = shape; draw(); },
    setAccent(k) { pot = ACCENTS[k] || ACCENTS.blue; draw(); },
    setPattern(k) { pattern = PATTERNS[k] ? k : 'plain'; draw(); },
    setTopper(k) { topper = k; draw(); },
    setName(text) { sign.textContent = text || ''; signFont.setSize(26); },
    setFont: signFont.setFont,
    setItemStyle(i, style) {
      const el = envelopes[i];
      if (!el) return;
      const type = envelopeKey(style?.type, i);
      el.querySelector('.e-svg')?.remove();
      el.querySelector('.e-body').insertAdjacentHTML('afterbegin', envelopeSvg(type));
      el.style.setProperty('--c', ENVELOPES[type].tint);
    },
    // Hang `n` envelopes (+ empty hooks up to `spots`). Returns the envelope elements in message order.
    setCandles(n, { spots = n, items: styles, names, onTap } = {}) {
      layer.textContent = '';
      envelopes.length = 0;
      total = Math.min(Math.max(n, spots), MAX);
      draw();
      const els = [];
      for (const p of envelopeSpots(total)) {
        const isSpot = p.i >= n;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'envelope' + (isSpot ? ' spot' : '');
        btn.tabIndex = isSpot || !onTap ? -1 : 0;
        if (!isSpot) btn.setAttribute('aria-label', names?.[p.i] ? `Play ${names[p.i]}'s message` : `Envelope ${p.i + 1}`);
        Object.assign(btn.style, { left: `${(p.x - p.w / 2).toFixed(1)}px`, top: `${p.top.toFixed(1)}px`, width: `${p.w}px`, height: `${p.len + p.h}px` });
        btn.style.setProperty('--swing', `${p.swing}s`);
        btn.style.setProperty('--swing-at', `${(-p.i * 0.41).toFixed(2)}s`);
        btn.style.setProperty('--open-at', `${((p.i % 6) * 0.06).toFixed(2)}s`);
        btn.append(div('e-thread', { height: `${p.len}px` }), Object.assign(div('e-body', { top: `${p.len}px`, height: `${p.h}px` }), { innerHTML: '<i class="e-coin"></i>' }));
        if (onTap && !isSpot) btn.addEventListener('click', () => onTap(p.i));
        layer.append(btn);
        els[p.i] = btn;
      }
      envelopes.push(...els);
      for (let i = 0; i < n && i < MAX; i++) api.setItemStyle(i, styles?.[i]);
      st.updateGlow();
      return els;
    },
    // Finale: the envelopes open one after another, left to right, and a gold coin pops out of each.
    finaleOrder(n) { return envelopeSpots(Math.min(n, MAX)).sort((a, b) => a.x - b.x || a.top - b.top).map((s) => s.i); },
    finaleOut(i) { st.out(i, true); },
    setBend() {},
    setDim(level) { body.style.filter = stickers.layer.style.filter = level ? `saturate(${1 - 0.4 * level}) brightness(${1 - 0.4 * level})` : 'none'; },
    reset() { envelopes.forEach((c) => c.classList.remove('out')); api.lightAll(); }
  };

  flavor = FLAVORS[opts.flavor] || FLAVORS.mai;
  shape = SHAPES[opts.shape] ? opts.shape : 'classic';
  stage.dataset.shape = shape;
  pot = ACCENTS[opts.accent] || ACCENTS.blue;
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
