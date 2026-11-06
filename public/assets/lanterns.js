// Wedding: lanterns on strings of fairy lights. Drawn in a fixed 390×330 stage; every voice is a lantern.
import { colorFor } from './common.js';
import { div, seeded, createStage, createStickers, itemStates } from './stage.js';

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
  heart: { label: 'Hearts' }
};
export const SWATCH = (l) => ({ background: l.light, boxShadow: `0 0 12px ${l.light}` });

const W = 390, H = 330;
const MAX = 36;

const strings = (total) => (total <= 12 ? [26, 128] : [14, 88, 162]);
const sagY = (base, x) => base + 22 * (1 - ((x - 195) / 205) ** 2);

// Lantern positions for n lanterns (1–36), spread over two or three strings.
export function lanternSpots(n) {
  const rows = strings(n);
  const per = Math.max(Math.ceil(n / rows.length), n <= 12 ? 6 : 1);
  const small = rows.length > 2;
  const rnd = seeded(3 + n);
  const spots = [];
  rows.forEach((base, r) => {
    const count = Math.min(per, n - spots.length);
    for (let k = 0; k < count; k++) {
      // Alternate strings start half a step in, so the lanterns don't line up in columns.
      const step = 330 / per;
      const x = 30 + step * (k + (r % 2 ? 0.5 : 0.25));
      spots.push({ x, top: sagY(base, x), len: Math.round((small ? 8 : 12) + rnd() * (small ? 16 : 26)), w: small ? 24 : 30, h: small ? 32 : 40, swing: (2.6 + rnd() * 1.6).toFixed(2), drift: Math.round((rnd() - 0.5) * 70) });
    }
  });
  return spots.map((s, i) => ({ ...s, i }));
}

export function createLanterns(host, opts = {}) {
  const { wrap, stage, glow, body, layer, toStage, size } = createStage(host, W, H, 'lanterns');
  glow.style.top = '-120px';
  const sky = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  sky.setAttribute('viewBox', `0 0 ${W} ${H}`);
  Object.assign(sky.style, { position: 'absolute', left: '0', top: '0', width: `${W}px`, height: `${H}px`, overflow: 'visible' });
  body.append(sky);
  const lines = div('', { position: 'absolute', left: '0', width: `${W}px`, textAlign: 'center' });
  const words = div('', { fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: '600', lineHeight: '1.15', padding: '0 14px' });
  const names = div('', { marginTop: '10px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.62)' });
  lines.append(words, names);
  body.append(lines);

  let lightColor = LIGHTS.vanilla.light;
  // Strings with small fairy lights. Redrawn when the number of strings changes.
  function drawStrings(total) {
    const rows = strings(total);
    let svg = '';
    for (const base of rows) {
      svg += `<path d="M -10 ${base} Q 195 ${base + 44} 400 ${base}" fill="none" stroke="rgba(255,235,190,0.28)" stroke-width="1.2"/>`;
      for (let x = 2; x < W; x += 11) svg += `<circle class="fairy" cx="${x}" cy="${sagY(base, x).toFixed(1)}" r="1.7"/>`;
    }
    sky.innerHTML = svg;
    sky.style.setProperty('--light', lightColor);
    lines.style.top = rows.length > 2 ? '246px' : '240px';
  }

  const lanterns = [];
  const st = itemStates(lanterns, glow);
  const stickers = createStickers(stage);
  const updateGlow = st.updateGlow;
  st.updateGlow = () => {
    updateGlow();
    sky.style.setProperty('--on', lanterns.length ? (0.3 + (0.7 * st.litCount()) / lanterns.length).toFixed(2) : '0.3');
  };

  const api = {
    wrap, stage, candles: lanterns, toStage, size, stickers, ...st,
    drawArea: null, // no drawing on the lanterns
    setDots() {}, getDots() { return []; }, addDot() {},
    setFlavor(f) {
      lightColor = (LIGHTS[f] || LIGHTS.vanilla).light;
      sky.style.setProperty('--light', lightColor);
      words.style.color = lightColor;
    },
    setShape(shape) { stage.dataset.shape = SHAPES[shape] ? shape : 'classic'; },
    setName(t) {
      words.textContent = t || '';
      words.style.fontSize = (t || '').length > 22 ? '25px' : '29px';
    },
    setNames(t) { names.textContent = t || ''; },
    // Lay out `n` lanterns (+ empty hooks up to `spots`). Returns the lantern elements in message order.
    setCandles(n, { spots = n, colors, onTap } = {}) {
      layer.textContent = '';
      lanterns.length = 0;
      const total = Math.min(Math.max(n, spots), MAX);
      drawStrings(total);
      const els = [];
      for (const p of lanternSpots(total)) {
        const isSpot = p.i >= n;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lantern' + (isSpot ? ' spot' : '');
        btn.tabIndex = isSpot || !onTap ? -1 : 0;
        Object.assign(btn.style, { left: `${(p.x - p.w / 2 - 6).toFixed(1)}px`, top: `${p.top.toFixed(1)}px`, width: `${p.w + 12}px`, height: `${p.len + p.h + 14}px` });
        btn.style.setProperty('--swing', `${p.swing}s`);
        btn.style.setProperty('--swing-at', `${(-p.i * 0.37).toFixed(2)}s`);
        btn.style.setProperty('--c', (colors && colors[p.i]) || colorFor(p.i));
        btn.style.setProperty('--drift', `${p.drift}px`);
        btn.append(
          div('l-line', { height: `${p.len}px` }),
          div('l-body', { top: `${p.len}px`, left: '6px', width: `${p.w}px`, height: `${p.h}px` }),
          div('l-tassel', { top: `${p.len + p.h + 2}px` })
        );
        if (onTap && !isSpot) btn.addEventListener('click', () => onTap(p.i));
        layer.append(btn);
        els[p.i] = btn;
      }
      lanterns.push(...els);
      st.updateGlow();
      return els;
    },
    // Finale: the lanterns float up one after another, left to right.
    finaleOrder(n) { return lanternSpots(Math.min(n, MAX)).sort((a, b) => a.x - b.x).map((s) => s.i); },
    finaleOut(i) { st.out(i, true); },
    setBend() {},
    setDim(level) { body.style.filter = stickers.layer.style.filter = level ? `saturate(${1 - 0.4 * level}) brightness(${1 - 0.4 * level})` : 'none'; },
    reset() { lanterns.forEach((c) => c.classList.remove('out')); api.lightAll(); }
  };

  api.setFlavor(opts.flavor || 'vanilla');
  api.setShape(opts.shape);
  api.setName(opts.name);
  api.setNames(opts.names);
  drawStrings(12);
  st.updateGlow();
  stickers.set(opts.stickers);
  return api;
}
