// Shared helpers for every page.
import { icon } from './icons.js';
export { icon };

export const PALETTE = ['#FF6B6B', '#F9A01B', '#2EC4B6', '#5B8DEF', '#A66CFF', '#FF7FB0', '#43AA8B', '#F9844A', '#3DA5D9', '#7B61FF', '#EF476F', '#8AC926'];

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Tiny DOM builder. Text is always set with textContent (never innerHTML) so names can't inject markup.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v; // only for trusted static markup (icons)
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === undefined || c === null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: {} };
  if (opts.json !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.json);
  } else if (opts.body !== undefined) {
    init.headers['Content-Type'] = 'application/octet-stream';
    init.body = opts.body;
  }
  let res;
  try {
    res = await fetch(path, init);
  } catch {
    throw new Error('No connection. Please check your internet and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

let toastTimer;
export function toast(msg, ms = 2600) {
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), ms);
}

// The "›››" buttons: slide the knob to the right (or just tap). Sliding most of the way presses the button.
export function swipeButton(btn) {
  if (!btn || btn.querySelector('.knob')) return;
  const knob = h('i', { class: 'knob', 'aria-hidden': 'true', html: icon.chevrons(18) });
  btn.prepend(knob);
  let x0 = null, dx = 0, max = 0, skipClick = false;
  const press = () => { skipClick = false; btn.form ? btn.form.requestSubmit(btn) : btn.click(); };
  const reset = () => { x0 = null; knob.style.transition = ''; knob.style.transform = ''; };
  btn.addEventListener('pointerdown', (e) => {
    if (btn.disabled) return;
    skipClick = false;
    x0 = e.clientX;
    dx = 0;
    max = btn.clientWidth - knob.offsetWidth - 12;
    knob.style.transition = 'none';
    btn.setPointerCapture?.(e.pointerId);
  });
  btn.addEventListener('pointermove', (e) => {
    if (x0 === null) return;
    dx = Math.max(0, Math.min(max, e.clientX - x0));
    knob.style.transform = `translateX(${dx}px)`;
  });
  btn.addEventListener('pointerup', () => {
    if (x0 === null) return;
    if (dx > 8) skipClick = true; // a slide, not a tap: the browser's own click is ignored
    const far = dx > max * 0.55;
    reset();
    if (far) setTimeout(press, 0);
  });
  btn.addEventListener('pointercancel', reset);
  btn.addEventListener('click', (e) => { if (skipClick) { skipClick = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
}

export function showScreen(name) {
  for (const s of $$('[data-screen]')) s.hidden = s.dataset.screen !== name;
  window.scrollTo(0, 0);
  document.querySelector('.app')?.scrollTo(0, 0); // on a wide screen the phone frame scrolls, not the page
}

export function slugFromPath() {
  return decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || '');
}

export function fmtAgo(iso) {
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const pick = parts.length > 1 && /^(pak|bu|ibu|kak|om|tante|mas|mbak|bang|dek)$/i.test(parts[0]) ? parts[1] : parts[0];
  return pick[0].toUpperCase();
}

export function colorFor(i) {
  return PALETTE[i % PALETTE.length];
}

export async function copyText(text, done = 'Link copied') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }, text);
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(done);
}

export function waShare(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function addStars(root, n = 24, maxTop = 70) {
  const box = h('div', { class: 'stars', 'aria-hidden': 'true' });
  for (let i = 0; i < n; i++) {
    box.append(h('i', { style: { left: `${Math.random() * 100}%`, top: `${Math.random() * maxTop}%`, animationDelay: `${-Math.random() * 4}s`, animationDuration: `${2 + Math.random() * 3}s` } }));
  }
  root.prepend(box);
}

// The bar at the top of a page: a round back button, a title or a small pill in the middle, a round button
// on the right (usually the profile). back: a URL or a function; right: a Node, or {href, icon, label}.
export function topBar({ back = null, title = '', right = null, backLabel = 'Back' } = {}) {
  const circle = (opts) => {
    const tag = opts.href ? 'a' : 'button';
    return h(tag, { class: 'icon-btn', href: opts.href, type: opts.href ? undefined : 'button', 'aria-label': opts.label, id: opts.id, onclick: opts.onclick, html: icon[opts.icon](20) });
  };
  const left = back
    ? circle(typeof back === 'function' ? { icon: 'back', label: backLabel, onclick: back } : { icon: 'back', label: backLabel, href: back })
    : h('span', { class: 'icon-btn ghost', 'aria-hidden': 'true' });
  const mid = title instanceof Node ? title : h('b', { class: 'top-title' }, title);
  const r = right instanceof Node ? right : right ? circle(right) : h('span', { class: 'icon-btn ghost', 'aria-hidden': 'true' });
  return h('header', { class: 'top-bar' }, left, mid, r);
}

// The floating pill at the bottom of home and the account page (ref: a soft pill with 4 icons).
// The floating nav on home, gifts and profile: three icons, no words (the label is for screen readers).
// The black circle is one blob behind the icons. Tapping another tab stretches it into a bar over every tab
// between, then the page changes and the new page shrinks it back to a circle on its own tab.
const NAV = [['home', '/', 'home', 'Home'], ['gifts', '/gifts', 'gift', 'Your gifts'], ['me', '/account', 'user', 'Profile']];
const NAV_STEP = 60, NAV_PAD = 6, NAV_TAB = 56; // tab width + gap, the nav's padding, tab width (soft.css .tab)
export function bottomNav(active = 'home') {
  const at = Math.max(0, NAV.findIndex(([key]) => key === active));
  const blob = h('span', { class: 'nav-blob', 'aria-hidden': 'true' });
  const tabs = NAV.map(([key, href, ico, label], i) => h('a', {
    class: `tab ${i === at ? 'on' : ''}`.trim(), href, 'aria-label': label, 'aria-current': i === at ? 'page' : undefined,
    html: icon[ico](24), onclick: (e) => go(e, i, href)
  }));
  const nav = h('nav', { class: 'bottom-nav', 'aria-label': 'Main' }, blob, ...tabs);
  let wide = 0;
  const span = (from, to, animate) => { // the blob over tabs from..to
    const lo = Math.min(from, to), hi = Math.max(from, to);
    blob.classList.toggle('still', !animate);
    blob.style.left = `${NAV_PAD + lo * NAV_STEP}px`;
    blob.style.width = `${NAV_TAB + (hi - lo) * NAV_STEP}px`;
    const paint = () => tabs.forEach((t, i) => t.classList.toggle('lit', i >= lo && i <= hi));
    if (animate && hi - lo < wide) setTimeout(paint, 110); else paint(); // shrinking: icons stay white until the bar has left them
    wide = hi - lo;
  };
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function go(e, i, href) {
    if (i === at || e.metaKey || e.ctrlKey || e.shiftKey || calm()) return;
    e.preventDefault();
    span(at, i, true);
    try { sessionStorage.setItem('vg-nav', String(at)); } catch {}
    setTimeout(() => { location.href = href; }, 190);
  }
  let from = null;
  try { from = sessionStorage.getItem('vg-nav'); sessionStorage.removeItem('vg-nav'); } catch {}
  if (from !== null && +from !== at && NAV[+from] && !calm()) {
    span(+from, at, false); // arrive as the bar the last page left…
    setTimeout(() => { void blob.offsetWidth; span(at, at, true); }, 0); // …and shrink onto this tab (once the page has put the nav in)
  } else span(at, at, false);
  addEventListener('pageshow', (e) => { if (e.persisted) span(at, at, false); }); // back to a page kept in memory
  return nav;
}

let activeSheet = null;
export function closeSheet() {
  if (!activeSheet) return;
  const { backdrop, onClose, keyHandler } = activeSheet;
  activeSheet = null;
  window.removeEventListener('keydown', keyHandler);
  backdrop.classList.add('closing');
  setTimeout(() => backdrop.remove(), 220);
  if (typeof onClose === 'function') onClose();
}

export function openSheet({ title = '', subtitle = '', content = null, onClose = null } = {}) {
  if (activeSheet) { // a sheet over a sheet: the first one is closed properly, so what it borrowed goes back
    const prev = activeSheet;
    activeSheet = null;
    prev.backdrop.remove();
    window.removeEventListener('keydown', prev.keyHandler);
    if (typeof prev.onClose === 'function') prev.onClose();
  }
  const bodyBox = h('div', { class: 'sheet-body' });
  if (Array.isArray(content)) bodyBox.append(...content);
  else if (content instanceof Node) bodyBox.append(content);

  const sheet = h('div', { class: 'bottom-sheet', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'sheet-handle-wrap', onclick: closeSheet }, h('span', { class: 'sheet-handle' })),
    (title || subtitle) && h('div', { class: 'sheet-head' },
      h('div', { class: 'sheet-titles' },
        title && h('h3', { class: 'sheet-title' }, title),
        subtitle && h('span', { class: 'sheet-sub' }, subtitle)
      ),
      h('button', { type: 'button', class: 'sheet-close', 'aria-label': 'Close sheet', onclick: closeSheet, html: icon.x(14) })
    ),
    bodyBox
  );

  const backdrop = h('div', {
    class: 'sheet-backdrop',
    onclick: (ev) => { if (ev.target === backdrop) closeSheet(); }
  }, sheet);

  const keyHandler = (ev) => { if (ev.key === 'Escape') closeSheet(); };
  window.addEventListener('keydown', keyHandler);
  activeSheet = { backdrop, onClose, keyHandler };
  document.body.append(backdrop);
  return { close: closeSheet, sheet, bodyBox };
}

// Soft chime for candles lighting, built with Web Audio (no files).
export function tone(ac, freq, when = 0, dur = 1, vol = 0.1, destination = ac?.destination) {
  if (!ac) return;
  try {
    const t = ac.currentTime + when;
    for (const [mult, v] of [[1, vol], [2, vol * 0.22]]) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq * mult, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (mult === 1 ? 1 : 0.5));
      o.connect(g);
      g.connect(destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  } catch {}
}
