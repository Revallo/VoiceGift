// Wedding: lanterns on strings of fairy lights. Drawn in a fixed 390×330 stage; every voice is a lantern.
import { colorFor, initials as senderInitials } from './common.js';
import { ITEM_COLORS } from './item-options.js';
import { div, seeded, createStage, createStickers, createTopper, itemStates, nameText } from './stage.js';

// Fairy-light colours. The keys are the same as the cake flavours so the API stays the same.
export const LIGHTS = {
  vanilla: { label: 'Warm white', light: '#FFE6A3' },
  chocolate: { label: 'Amber', light: '#F5B661' },
  strawberry: { label: 'Rose', light: '#F9B8CB' },
  ube: { label: 'Lilac', light: '#CDB9F7' },
  matcha: { label: 'Mint', light: '#BDEBCB' },
  redvelvet: { label: 'Ruby', light: '#FF8E9C' },
  gold: { label: 'Gold', light: '#FFD25E' },
  sky: { label: 'Sky', light: '#9FD3FF' },
  peach: { label: 'Peach', light: '#FFC3A0' },
  teal: { label: 'Teal', light: '#7FE3D6' },
  snow: { label: 'Snow', light: '#FFFFFF' },
  coral: { label: 'Coral', light: '#FF9E80' }
};
// The kinds of lantern (gift.cake.shape): only the outline changes, see .stage.lanterns[data-shape] in app.css.
export const SHAPES = {
  classic: { label: 'Paper' },
  sky: { label: 'Sky lantern' },
  star: { label: 'Stars' },
  heart: { label: 'Hearts' },
  // Local lanterns. Hội An silk lanterns end on the river (thả đèn hoa đăng) instead of in the sky.
  hoian: { label: 'Hội An silk', river: true },
  capiz: { label: 'Capiz shell' },
  xi: { label: 'Red lantern' },
  // Ramadan / Lebaran feel: a woven-palm ketupat instead of a lantern (food, not a religious symbol).
  ketupat: { label: 'Ketupat' }
};
export const onRiver = (shape) => Boolean(SHAPES[shape]?.river);
export const SWATCH = (l) => ({ background: l.light, boxShadow: `0 0 12px ${l.light}` });

// The string (gift.cake.accent), the lantern motif (gift.cake.pattern), the mark above the words (gift.cake.topper).
export const ACCENTS = {
  auto: { label: 'Soft', color: 'conic-gradient(#FFE6A3, #FFFFFF, #FFE6A3)' },
  gold: { label: 'Gold', color: '#E7B32E' },
  white: { label: 'White', color: '#FFFFFF' },
  rose: { label: 'Rose', color: '#FF9BB8' },
  leaf: { label: 'Leaf', color: '#6FCF97' }
};
export const PATTERNS = {
  plain: { label: 'Plain' },
  stripes: { label: 'Stripes' },
  dots: { label: 'Dots' },
  band: { label: 'Gold band' },
  // shown only for their country (gift.cake.local)
  kawung: { label: 'Batik kawung', local: 'id' },
  laithai: { label: 'Thai gold', local: 'th' },
  banig: { label: 'Banig weave', local: 'ph' },
  blossom: { label: 'Mai blossoms', local: 'vn' }
};
export const TOPPERS = {
  none: { label: 'None' },
  initials: { label: 'Initials', initials: true },
  ring: { label: 'Rings', emoji: '💍' },
  dove: { label: 'Doves', emoji: '🕊️' },
  heart: { label: 'Heart', emoji: '💖' },
  swan: { label: 'Swan', emoji: '🦢' }
};

const W = 390, H = 330;
const RIVER = 306; // where the Hội An lanterns float
const MAX = 36;

// Keep the lower string above the topper/inscription, while filling the sky evenly.
const strings = (total) => total <= 0 ? [] : total <= 4 ? [66] : total <= 12 ? [24, 108] : [8, 67, 126];
const sagY = (base, x) => base + 22 * (1 - ((x - 195) / 205) ** 2);

// Balanced rows, rather than filling the first string before starting the next.
// Each returned index still belongs to the same voice; no decorative voices are added.
export function lanternSpots(n) {
  n = Math.max(0, Math.min(MAX, Math.floor(Number(n) || 0)));
  const rows = strings(n);
  if (!rows.length) return [];
  const per = Math.floor(n / rows.length), extra = n % rows.length;
  const [w, h] = n <= 4 ? [44, 58] : n <= 8 ? [40, 52] : n <= 12 ? [34, 46] : n <= 21 ? [28, 36] : n <= 30 ? [24, 32] : [22, 30];
  const rnd = seeded(3 + n);
  const spots = [];
  rows.forEach((base, r) => {
    const count = per + (r < extra ? 1 : 0);
    for (let k = 0; k < count; k++) {
      const span = count === 2 ? 210 : 312;
      const x = count === 1 ? 195 : 195 - span / 2 + span * k / (count - 1);
      const len = Math.round((rows.length === 3 ? 8 : 12) + rnd() * (rows.length === 3 ? 4 : 6));
      spots.push({ x, top: sagY(base, x), len, w, h, swing: (2.6 + rnd() * 1.6).toFixed(2), drift: Math.round((rnd() - 0.5) * 70) });
    }
  });
  return spots.map((s, i) => ({ ...s, i }));
}

export function createLanterns(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size, setBackdrop } = createStage(host, W, H, 'lanterns');
  glow.style.top = '-120px';
  body.append(div('l-stars')); // two slow layers of stars behind everything
  const sky = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  sky.setAttribute('viewBox', `0 0 ${W} ${H}`);
  Object.assign(sky.style, { position: 'absolute', left: '0', top: '0', width: `${W}px`, height: `${H}px`, overflow: 'visible' });
  body.append(sky);
  // The river under the Hội An lanterns: they come down onto it in the finale and drift away.
  const river = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  river.setAttribute('viewBox', `0 0 ${W} 60`);
  river.setAttribute('aria-hidden', 'true');
  river.classList.add('river');
  Object.assign(river.style, { position: 'absolute', left: '0', top: `${RIVER - 18}px`, width: `${W}px`, height: '60px', overflow: 'visible' });
  river.innerHTML = '<defs><linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E2A3A" stop-opacity="0"/><stop offset=".35" stop-color="#123447" stop-opacity=".9"/><stop offset="1" stop-color="#0B2230"/></linearGradient></defs>'
    + '<path d="M-20 10Q100 4 195 8T410 6V70H-20Z" fill="url(#rv)"/><path d="M-20 10Q100 4 195 8T410 6" stroke="rgba(160,210,235,.35)" stroke-width="1.2" fill="none"/>'
    + '<path class="rv-wave" d="M10 22q20-4 40 0t40 0M150 30q20-4 40 0t40 0M280 20q20-4 40 0t40 0M60 40q20-4 40 0t40 0M240 44q20-4 40 0" stroke="rgba(255,226,160,.42)" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
  body.append(river);
  const lines = div('', { position: 'absolute', left: '0', width: `${W}px`, textAlign: 'center' });
  const words = div('', { lineHeight: '1.25', padding: '0 14px' });
  const wordsFont = nameText(words, false);
  const names = div('', { marginTop: '10px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.62)' });
  lines.append(words, names);
  body.append(lines);

  let lightColor = LIGHTS.vanilla.light;
  let topper, coupleNames = opts.names;
  const placeTopper = createTopper(body, { x: 195, base: 240, size: 28 });
  const initials = () => String(coupleNames || '').split(/\s*(?:&|and|\+)\s*/i).map((n) => n.trim()[0]?.toUpperCase()).filter(Boolean).join(' & ');
  const drawTopper = () => { const t = TOPPERS[topper]; placeTopper(t, t?.initials ? initials() : ''); };
  // Strings with small fairy lights. Redrawn when the number of strings changes.
  function drawStrings(total) {
    const rows = strings(total);
    let svg = '';
    for (const base of rows) {
      svg += `<path d="M -10 ${base} Q 195 ${base + 44} 400 ${base}" fill="none" stroke="var(--string, rgba(255,235,190,0.28))" stroke-width="1.4"/>`;
      for (let x = 2; x < W; x += 11) svg += `<circle class="fairy" cx="${x}" cy="${sagY(base, x).toFixed(1)}" r="1.7"/>`;
    }
    sky.innerHTML = svg;
    sky.style.setProperty('--light', lightColor);
    lines.style.top = `${(rows.length > 2 ? 246 : 240) - (onRiver(stage.dataset.shape) ? 14 : 0)}px`;
  }
  let lastTotal = 12;

  const lanterns = [];
  const st = itemStates(lanterns, glow);
  const stickers = createStickers(stage);
  const updateGlow = st.updateGlow;
  st.updateGlow = () => {
    updateGlow();
    sky.style.setProperty('--on', lanterns.length ? (0.3 + (0.7 * st.litCount()) / lanterns.length).toFixed(2) : '0.3');
  };

  const api = {
    wrap, stage, candles: lanterns, toStage, size, stickers, ...st, setBackdrop,
    drawArea: null, // no drawing on the lanterns
    setDots() {}, getDots() { return []; }, addDot() {},
    setFlavor(f) {
      lightColor = (LIGHTS[f] || LIGHTS.vanilla).light;
      sky.style.setProperty('--light', lightColor);
      words.style.color = lightColor;
    },
    setShape(shape) {
      stage.dataset.shape = SHAPES[shape] ? shape : 'classic';
      river.style.display = onRiver(shape) ? '' : 'none';
      drawStrings(lastTotal);
    },
    setAccent(k) { const c = ACCENTS[k]?.color; if (c?.startsWith('#')) sky.style.setProperty('--string', c); else sky.style.removeProperty('--string'); },
    setPattern(k) { stage.dataset.motif = PATTERNS[k] ? k : 'plain'; },
    setTopper(k) { topper = k; drawTopper(); },
    setName(t) {
      words.textContent = t || '';
      wordsFont.setSize((t || '').length > 22 ? 25 : 29);
    },
    setFont: wordsFont.setFont,
    setLanternStyle(i, style) {
      if (lanterns[i] && ITEM_COLORS[style?.color]) lanterns[i].style.setProperty('--c', ITEM_COLORS[style.color].hex);
    },
    setNames(t) { names.textContent = t || ''; coupleNames = t; drawTopper(); },
    // Lay out `n` lanterns (+ empty hooks up to `spots`). Returns the lantern elements in message order.
    setCandles(n, { spots = n, colors, lanterns: styles, names, onTap } = {}) {
      layer.textContent = '';
      lanterns.length = 0;
      const total = Math.min(Math.max(n, spots), MAX);
      lastTotal = total;
      drawStrings(total);
      const els = [];
      const spotList = lanternSpots(total);
      // On the river they land side by side, left to right, each on its own spot of water
      const landing = new Map(spotList.slice().sort((a, b) => a.x - b.x || a.i - b.i).map((s, r, all) => [s.i, all.length === 1 ? 195 : 34 + (322 * r) / (all.length - 1)]));
      for (const p of spotList) {
        const isSpot = p.i >= n;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lantern' + (isSpot ? ' spot' : '');
        btn.tabIndex = isSpot || !onTap ? -1 : 0;
        if (!isSpot && names?.[p.i]) btn.setAttribute('aria-label', `Play ${names[p.i]}'s message`);
        Object.assign(btn.style, { left: `${(p.x - p.w / 2 - 6).toFixed(1)}px`, top: `${p.top.toFixed(1)}px`, width: `${p.w + 12}px`, height: `${p.len + p.h + 14}px` });
        btn.style.setProperty('--swing', `${p.swing}s`);
        btn.style.setProperty('--swing-at', `${(-p.i * 0.37).toFixed(2)}s`);
        btn.style.setProperty('--c', (colors && colors[p.i]) || colorFor(p.i));
        btn.style.setProperty('--drift', `${p.drift}px`);
        // Hội An finale: from its string down onto the river, then away with the current
        btn.style.setProperty('--river-dy', `${Math.round(RIVER - (p.top + 0.62 * (p.len + p.h / 2)))}px`); // it shrinks to 0.62 from the top of its string
        btn.style.setProperty('--river-dx', `${Math.round(landing.get(p.i) - p.x)}px`);
        btn.style.setProperty('--river-at', `${(p.i % 5) * 0.12}s`);
        btn.append(
          div('l-line', { height: `${p.len}px` }),
          Object.assign(div('l-body', { top: `${p.len}px`, left: '6px', width: `${p.w}px`, height: `${p.h}px` }), { innerHTML: '<i class="l-motif"></i>' }),
          div('l-tassel', { top: `${p.len + p.h + 2}px` }),
          div('l-trail', { top: `${p.len + p.h * 0.7}px` }) // the glow it leaves behind as it rises
        );
        if (!isSpot && names?.[p.i]) {
          const label = div('l-initial');
          label.textContent = senderInitials(names[p.i]);
          label.setAttribute('aria-hidden', 'true');
          btn.querySelector('.l-body').append(label);
        }
        if (onTap && !isSpot) btn.addEventListener('click', () => onTap(p.i));
        layer.append(btn);
        els[p.i] = btn;
      }
      lanterns.push(...els);
      styles?.forEach((style, i) => api.setLanternStyle(i, style));
      st.updateGlow();
      return els;
    },
    // Finale: the lanterns float up one after another, left to right.
    finaleOrder(n) { return lanternSpots(Math.min(n, MAX)).sort((a, b) => a.x - b.x).map((s) => s.i); },
    onRiver: () => onRiver(stage.dataset.shape),
    finaleOut(i) { st.out(i, true); },
    setBend() {},
    setDim(level) { body.style.filter = stickers.layer.style.filter = level ? `saturate(${1 - 0.4 * level}) brightness(${1 - 0.4 * level})` : 'none'; },
    // After the lanterns are gone: a star for every guest, joined into one constellation, with their first names.
    constellation(people) {
      stage.querySelector('.constellation')?.remove();
      const n = Math.min(people.length, MAX);
      if (!n) return;
      const box = div('constellation');
      const rnd = seeded(7 + n);
      // a gentle wave across the sky, so the line reads as one shape however many guests there are
      const pts = Array.from({ length: n }, (_, k) => ({ x: 26 + (338 * (k + 0.5)) / n + (rnd() - 0.5) * 8, y: 92 + 46 * Math.sin(k * (n > 12 ? 0.7 : 1.25) + 0.6) + (rnd() - 0.5) * 22 }));
      const named = n <= 14; // with more, the names are in the list right below
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      line.setAttribute('viewBox', `0 0 ${W} ${H}`);
      line.setAttribute('aria-hidden', 'true');
      line.innerHTML = `<polyline class="c-line" pathLength="1" points="${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"/>`;
      box.append(line);
      pts.forEach((p, k) => {
        const star = div('c-star', { left: `${p.x}px`, top: `${p.y}px`, animationDelay: `${(k * 0.14).toFixed(2)}s` });
        if (named) {
          const label = div('c-label' + (k % 2 ? ' up' : ''), { animationDelay: `${(0.3 + k * 0.14).toFixed(2)}s` });
          label.textContent = String(people[k] || '').split(/\s+/)[0];
          star.append(label);
        }
        box.append(star);
      });
      box.style.setProperty('--draw', `${(0.6 + n * 0.14).toFixed(2)}s`);
      stage.append(box);
    },
    reset() { stage.querySelector('.constellation')?.remove(); lanterns.forEach((c) => c.classList.remove('out')); api.lightAll(); }
  };

  api.setFlavor(opts.flavor || 'vanilla');
  api.setShape(opts.shape);
  api.setFont(opts.font);
  api.setName(opts.name);
  api.setNames(opts.names);
  st.updateGlow();
  api.setAccent(opts.accent);
  api.setPattern(opts.pattern);
  api.setTopper(opts.topper);
  setBackdrop(opts.backdrop);
  stickers.set(opts.stickers);
  return api;
}
