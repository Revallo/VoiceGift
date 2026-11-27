// Shared scaffolding for the three scenes (cake, bouquet, lanterns):
// a fixed-size coordinate "stage" scaled to fit its container, the finger-drawing layer,
// and the states every scene's items share (lit, active/speaking, mine, out).

export function div(cls, style) {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  Object.assign(d.style, style);
  return d;
}

export function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// Fonts for the name on the cake / the wrap / the lantern words (gift.cake.font). Picked in the decorate step.
export const NAME_FONTS = {
  script: { label: 'Script', css: { fontFamily: "'Pacifico', cursive", fontStyle: 'normal', fontWeight: '400' } },
  serif: { label: 'Classic', css: { fontFamily: "'Fraunces', Georgia, serif", fontStyle: 'italic', fontWeight: '600' } },
  hand: { label: 'Handwritten', css: { fontFamily: "'Caveat', cursive", fontStyle: 'normal', fontWeight: '700' } },
  round: { label: 'Playful', css: { fontFamily: "'Fredoka', sans-serif", fontStyle: 'normal', fontWeight: '600' } }
};
export const DEFAULT_FONT = 'script';
let fontsLinked = false;
function linkFonts() {
  if (fontsLinked) return;
  fontsLinked = true;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Fraunces:ital,wght@0,600;1,600&family=Fredoka:wght@600&family=Pacifico&display=swap';
  document.head.append(l);
}

// The name text: its font, and (fit) shrinks the size until one line fits the width.
export function nameText(el, fit) {
  let max = 0;
  const refit = () => {
    if (!max) return;
    let s = max;
    el.style.fontSize = `${s}px`;
    if (!fit || !el.clientWidth) return;
    while (el.scrollWidth > el.clientWidth + 1 && s > 12) el.style.fontSize = `${--s}px`;
  };
  if (fit) {
    new ResizeObserver(refit).observe(el); // e.g. when a hidden screen is shown
    document.fonts?.addEventListener?.('loadingdone', refit);
  }
  return {
    setFont(key) { Object.assign(el.style, (NAME_FONTS[key] || NAME_FONTS[DEFAULT_FONT]).css); refit(); },
    setSize(px) { max = px; refit(); },
    refit
  };
}

// What stands behind the gift (gift.cake.backdrop). '' = the occasion's own colour.
export const BACKDROPS = {
  party: { label: 'Party', bg: '' },
  sunny: { label: 'Sunny', bg: 'linear-gradient(180deg, #8A6A3A, #7A4A38)' },
  bubblegum: { label: 'Bubblegum', bg: 'radial-gradient(circle at 20% 25%, #FFFFFF22 0 26px, transparent 27px), radial-gradient(circle at 82% 60%, #FFFFFF1A 0 38px, transparent 39px), linear-gradient(180deg, #7A4A68, #574A84)' },
  garden: { label: 'Garden', bg: 'linear-gradient(180deg, #2F4F63 0 62%, #35583F 62% 100%)' },
  sky: { label: 'Blue sky', bg: 'radial-gradient(ellipse 70px 24px at 22% 22%, #FFFFFF33 98%, transparent), radial-gradient(ellipse 90px 28px at 78% 34%, #FFFFFF2B 98%, transparent), linear-gradient(180deg, #27507A, #41708F)' },
  sunset: { label: 'Sunset', bg: 'linear-gradient(180deg, #342B60, #84455F 62%, #A8743F)' },
  night: { label: 'Starry night', bg: 'radial-gradient(circle at 16% 18%, #FFF 0 1.5px, transparent 2px), radial-gradient(circle at 68% 12%, #FFF 0 2px, transparent 2.5px), radial-gradient(circle at 88% 42%, #FFF 0 1.5px, transparent 2px), radial-gradient(circle at 36% 38%, #FFF 0 1.5px, transparent 2px), linear-gradient(180deg, #16215A, #3B3F8F)' },
  // Local backdrops, shown only for their country (gift.cake.local). Muted, so the gift stays the star.
  // Batik kawung: four oval "palm fruit" petals around a dot, in soga brown.
  kawung: { label: 'Batik kawung', local: 'id', bg: 'radial-gradient(circle at 50% 50%, #9A7448 0 2px, transparent 2.6px) 0 0 / 40px 40px, radial-gradient(ellipse 4.6px 7.6px at 50% 29%, #4E3826 94%, transparent) 0 0 / 40px 40px, radial-gradient(ellipse 4.6px 7.6px at 50% 71%, #4E3826 94%, transparent) 0 0 / 40px 40px, radial-gradient(ellipse 7.6px 4.6px at 29% 50%, #4E3826 94%, transparent) 0 0 / 40px 40px, radial-gradient(ellipse 7.6px 4.6px at 71% 50%, #4E3826 94%, transparent) 0 0 / 40px 40px, radial-gradient(circle at 0 0, #6B4E33 0 1.6px, transparent 2.2px) 0 0 / 40px 40px, linear-gradient(180deg, #33241A, #271B13)' },
  // Thai gold: a fine gold lattice on deep plum, like lacquer-and-gold work.
  thaigold: { label: 'Thai gold', local: 'th', bg: 'radial-gradient(circle, #E7B32E55 0 1.6px, transparent 2.2px) 0 0 / 22px 22px, repeating-linear-gradient(45deg, #E7B32E22 0 1px, transparent 1px 15.5px), repeating-linear-gradient(-45deg, #E7B32E22 0 1px, transparent 1px 15.5px), linear-gradient(180deg, #3A1D3E, #26142C)' },
  // Fiesta: a string of banderitas (paper bunting) across the top of the night.
  fiesta: { label: 'Fiesta', local: 'ph', bg: 'conic-gradient(from 150deg at 50% 0, #E85D75 0 60deg, transparent 0) 0 6px / 36px 20px repeat-x, conic-gradient(from 150deg at 50% 0, #F4C531 0 60deg, transparent 0) 12px 6px / 36px 20px repeat-x, conic-gradient(from 150deg at 50% 0, #4FB3D9 0 60deg, transparent 0) 24px 6px / 36px 20px repeat-x, linear-gradient(#FFFFFF55, #FFFFFF55) 0 5px / 100% 1px no-repeat, linear-gradient(180deg, #1E2B4A, #2C2244)' },
  // Imlek: deep lucky red, gold dragon scales along the bottom, soft gold clouds above.
  dragon: { label: 'Dragon red', bg: 'radial-gradient(circle at 50% 100%, transparent 9px, #F2C14E33 9.5px 10.5px, transparent 11px) 0 100% / 22px 12px repeat-x, radial-gradient(circle at 50% 100%, transparent 9px, #F2C14E33 9.5px 10.5px, transparent 11px) 11px calc(100% - 10px) / 22px 12px repeat-x, radial-gradient(ellipse 26px 9px at 22% 20%, #F2C14E2A 96%, transparent), radial-gradient(ellipse 18px 7px at 30% 15%, #F2C14E2A 96%, transparent), radial-gradient(ellipse 30px 10px at 78% 32%, #F2C14E24 96%, transparent), radial-gradient(ellipse 18px 7px at 70% 27%, #F2C14E24 96%, transparent), radial-gradient(ellipse at 50% 0, #C0242C, transparent 70%), linear-gradient(180deg, #8E1018, #5E0A10)' },
  // Tết: lucky red with small gold blossoms.
  tet: { label: 'Tết red', local: 'vn', bg: 'radial-gradient(circle at 30% 30%, #F6C445 0 1.6px, transparent 2.1px) 0 0 / 40px 40px, radial-gradient(circle at 75% 70%, #F6C44588 0 1.4px, transparent 1.9px) 0 0 / 40px 40px, radial-gradient(ellipse at 50% 0, #A3242A, transparent 70%), linear-gradient(180deg, #6E1218, #4A0C12)' }
};

// The thing standing on the gift (gift.cake.topper): an emoji, the age, or the couple's initials.
export function createTopper(parent, { x, base, size }) {
  const el = div('topper', { left: `${x}px`, top: `${base}px`, fontSize: `${size}px` });
  parent.append(el);
  return (topper, value) => {
    el.textContent = topper?.emoji || value || '';
    el.classList.toggle('topper-text', !topper?.emoji);
  };
}

export function createStage(host, W, H, cls = '') {
  linkFonts();
  const wrap = div('stage-wrap');
  const stage = div(`stage ${cls}`.trim(), { width: `${W}px`, height: `${H}px` });
  wrap.append(stage);
  host.append(wrap);
  const glow = div('glow');
  const body = div('scenebody');
  const layer = div('', { position: 'absolute', inset: '0' }); // the items (candles, flowers, lanterns)
  stage.append(glow, body, layer);

  function fit() {
    const k = wrap.clientWidth / W || 1;
    stage.style.transform = `scale(${k})`;
    wrap.style.height = `${Math.round(H * k)}px`;
  }
  fit();
  new ResizeObserver(fit).observe(wrap);

  // Convert a pointer event to stage coordinates.
  const toStage = (e) => {
    const r = stage.getBoundingClientRect();
    const k = r.width / W;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };
  // No backdrop picked: the gift stands on the page itself, nothing behind it. A picked backdrop is painted on the
  // stage and fades out at its edges (soft.css), so it is never a box either.
  const setBackdrop = (key) => {
    const bg = BACKDROPS[key]?.bg || '';
    stage.style.background = bg;
    wrap.classList.toggle('with-backdrop', Boolean(bg));
  };
  return { wrap, stage, glow, body, layer, toStage, size: { w: W, h: H }, setBackdrop };
}

// Stickers on top of the scene, stored with the gift as [emoji, x, y] (centre, stage coordinates).
// Shown on every page; only the decorate step makes them movable (see create.js).
export function createStickers(stage) {
  const layer = div('stickers');
  stage.append(layer);
  let list = [];
  const st = {
    layer,
    onRender: null,
    set(l) { list = (Array.isArray(l) ? l : []).map((s) => [...s]); st.render(); },
    get() { return list.map((s) => [...s]); },
    render() {
      layer.textContent = '';
      list.forEach(([emoji, x, y], i) => {
        const el = div('sticker', { left: `${x}px`, top: `${y}px` });
        el.textContent = emoji;
        el.dataset.i = i;
        layer.append(el);
      });
      st.onRender?.();
    }
  };
  return st;
}

export const BRUSHES = ['#FFFFFF', '#F6B93B', '#FF5A5F', '#5CC8A8', '#6FB7FF', '#2A1328'];

// Dots drawn with a finger, stored with the gift as [x, y, colorIndex].
export function createDrawing(parent, W, H) {
  const canvas = document.createElement('canvas');
  canvas.className = 'draw';
  Object.assign(canvas.style, { width: `${W}px`, height: `${H}px` });
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  parent.append(canvas);
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  let dots = [];

  function paint() {
    g.clearRect(0, 0, W, H);
    for (const [x, y, c] of dots) {
      g.fillStyle = BRUSHES[c] || BRUSHES[0];
      g.beginPath();
      g.arc(x, y, 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  return {
    setDots(d) { dots = Array.isArray(d) ? d.slice() : []; paint(); },
    getDots() { return dots.slice(); },
    // join = this dot continues the previous stroke, so fill the gap between them
    addDot(x, y, c, join) {
      const last = dots[dots.length - 1];
      if (last && join) {
        const dx = x - last[0], dy = y - last[1];
        const n = Math.min(12, Math.floor(Math.hypot(dx, dy) / 4));
        for (let s = 1; s < n; s++) dots.push([Math.round(last[0] + (dx * s) / n), Math.round(last[1] + (dy * s) / n), c]);
      }
      dots.push([Math.round(x), Math.round(y), c]);
      if (dots.length > 2500) dots = dots.slice(-2500);
      paint();
    }
  };
}

// Item states shared by every scene. `items` is the live array of item elements in message order.
export function itemStates(items, glow) {
  const st = {
    light(i, on = true) {
      const c = items[i];
      if (c && !c.classList.contains('spot')) { c.classList.toggle('lit', on); if (on) c.classList.remove('out'); }
      st.updateGlow();
    },
    lightAll(on = true) { items.forEach((c, i) => st.light(i, on)); },
    // The finale for one item: candle blown out (keepLit false) or lantern released (keepLit true).
    out(i, keepLit = false) {
      const c = items[i];
      if (!c || !c.classList.contains('lit') || c.classList.contains('out')) return;
      c.classList.remove('active', 'speaking');
      if (!keepLit) c.classList.remove('lit');
      c.classList.add('out');
      st.updateGlow();
    },
    setActive(i, speaking = false) { items.forEach((c, k) => { c.classList.toggle('active', k === i); c.classList.toggle('speaking', k === i && speaking); }); },
    mark(i) { items[i]?.classList.add('mine'); },
    litCount() { return items.filter((c) => c.classList.contains('lit') && !c.classList.contains('out')).length; },
    updateGlow() {
      glow.style.opacity = items.length ? (st.litCount() / items.length).toFixed(2) : '0';
    }
  };
  return st;
}
