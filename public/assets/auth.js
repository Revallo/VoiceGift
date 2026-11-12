// Accounts in the browser: who is logged in, the log-in box (on /login and /signup, and in /new when a new gift
// needs an account), and the rows of "Your gifts". Logging in is "Continue with Google" only.
// Google blocks its login inside apps' own browsers (Instagram, Line, Facebook…: "Error 403: disallowed_useragent"),
// so there the button is replaced by a hint to open the page in Chrome or Safari. WhatsApp opens a real browser.
import { h, api, icon, toast, fmtAgo, initials } from './common.js';
import { theme } from './themes.js';

let current, account;
const askServer = () => (account ||= api('/api/account').catch(() => ({ user: null })));
// The logged-in account ({ name, email }) or null. Asked once per page.
export function me() {
  current ||= askServer().then((d) => d.user || null);
  return current;
}

// Pages that need an account: a logged-out visitor goes to log in and comes straight back here.
export async function requireLogin() {
  const user = await me();
  if (!user) location.replace('/signup?next=' + encodeURIComponent(location.pathname + location.search));
  return user;
}

// When the server says nobody is logged in after all (logged out in another tab, say).
export function forgetMe() {
  current = Promise.resolve(null);
}

export async function logOut() {
  await api('/api/account', { method: 'POST', json: { action: 'logout' } });
  forgetMe();
}

// Gifts this browser made before it had an account (the home page's "Your gifts") move into the account.
async function claimDeviceGifts() {
  try {
    const mine = JSON.parse(localStorage.getItem('vg-mine') || '[]');
    if (!mine.length) return;
    const { claimed } = await api('/api/account', { method: 'POST', json: { action: 'claim', gifts: mine.map(({ slug, key }) => ({ slug, key })) } });
    localStorage.setItem('vg-mine', JSON.stringify(mine.filter((g) => !claimed.includes(g.slug))));
  } catch {}
}

// An app's own browser (a WebView), where Google refuses to log in.
const IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|\bLine\/|TikTok|musical_ly|BytedanceWebview|Snapchat|; wv\)/i;
export const inAppBrowser = () => IN_APP.test(navigator.userAgent);

let gsi;
function loadGoogle() {
  gsi ||= new Promise((resolve, reject) => {
    const s = h('script', { src: 'https://accounts.google.com/gsi/client', async: true });
    s.onload = () => resolve(window.google.accounts.id);
    s.onerror = () => { gsi = null; reject(new Error('Google didn’t load')); };
    document.head.append(s);
  });
  return gsi;
}

let onGoogle; // the box on screen now; Google's button calls it with the ID token
let googleReady;

// "Continue with Google" (or, inside an app's browser, how to get to it). onDone(user) runs once they're logged in.
export function loginBox({ onDone }) {
  const err = h('p', { class: 'small err', role: 'alert', hidden: true });
  const fail = (msg) => { err.textContent = msg; err.hidden = !msg; };
  const slot = h('div', { class: 'google-box' }, h('div', { class: 'google-btn' }, h('div', { class: 'spinner' })));
  const note = h('p', { class: 'small muted center', style: { margin: 0 } }, 'New here? The same button makes your account. We only use your name and email.');
  const box = h('div', { class: 'card stack', id: 'loginBox', style: { gap: '14px' } }, slot, err, note);

  async function logIn(json) {
    fail('');
    try {
      const { user } = await api('/api/account', { method: 'POST', json });
      current = Promise.resolve(user);
      await claimDeviceGifts();
      await onDone(user);
    } catch (e) {
      fail(e.message);
    }
  }
  onGoogle = ({ credential }) => logIn({ action: 'google', credential });

  askServer().then(async ({ googleClientId, devLogin }) => {
    const parts = [];
    if (googleClientId && inAppBrowser()) {
      note.hidden = true;
      const copy = h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => {
        try { await navigator.clipboard.writeText(location.href); copy.textContent = 'Link copied'; } catch { copy.textContent = 'Use ⋯ → Open in browser'; }
      } }, 'Copy this page’s link');
      parts.push(h('div', { class: 'inapp-hint', id: 'inAppHint' },
        h('b', {}, 'Open this page in Chrome or Safari'),
        h('span', {}, 'Google login doesn’t work inside this app. Tap ⋯ (top right) and choose “Open in browser”, or copy the link into Chrome or Safari.'),
        copy));
    } else if (googleClientId) {
      const btn = h('div', { class: 'google-btn', id: 'googleBtn' });
      parts.push(btn);
      slot.replaceChildren(btn);
      try {
        const id = await loadGoogle();
        if (googleReady !== googleClientId) {
          id.initialize({ client_id: googleClientId, callback: (r) => onGoogle?.(r), ux_mode: 'popup', context: 'signin' });
          googleReady = googleClientId;
        }
        id.renderButton(btn, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'center', width: Math.max(200, Math.min(400, btn.clientWidth || 320)) });
      } catch {
        fail('Google didn’t load. Check your connection and reload the page.');
      }
    } else if (!devLogin) {
      parts.push(h('p', { class: 'small', style: { margin: 0, color: 'var(--soft)' } }, 'Logging in isn’t set up yet. Please try again later.'));
    }
    if (devLogin) { // local only (DEV_LOGIN=1): stands in for Google, for tests
      const nameIn = h('input', { class: 'input', id: 'devName', placeholder: 'Name', maxlength: '40' });
      const emailIn = h('input', { class: 'input', id: 'devEmail', type: 'email', placeholder: 'email@example.com', autocapitalize: 'none' });
      const go = h('button', { type: 'submit', class: 'btn ghost', id: 'devLoginBtn' }, 'Dev login');
      const form = h('form', { class: 'stack', style: { gap: '10px' }, onsubmit: (e) => { e.preventDefault(); logIn({ action: 'dev-login', name: nameIn.value, email: emailIn.value }); } },
        h('p', { class: 'or-line' }, 'local dev login'), nameIn, emailIn, go);
      parts.push(form);
    }
    slot.replaceChildren(...parts);
  });
  return box;
}

// One row of "Your gifts" ({ slug, key, recipient, occasion, createdAt? }): opens its dashboard; × deletes the
// whole gift (every message and recording) with its manage key, then onDeleted(g).
export function giftItem(g, onDeleted) {
  const t = theme(g.occasion);
  async function remove() {
    if (!confirm(`Delete the gift for ${g.recipient}, with every message and recording? This can't be undone.`)) return;
    try {
      await api('/api/manage', { method: 'POST', json: { slug: g.slug, key: g.key, action: 'delete-gift' } });
    } catch (e) {
      if (!/not found/i.test(e.message)) return toast(e.message); // already gone: just forget it
    }
    onDeleted(g);
  }
  const sub = [t.label, g.createdAt ? fmtAgo(g.createdAt) : ''].filter(Boolean).join(' · ');
  const count = typeof g.count === 'number' ? `${g.count} ${g.count === 1 ? 'voice' : 'voices'}` : '';
  return h('div', { class: 'gift-item' },
    h('div', { class: 'gift-item-top' },
      h('span', { class: 'gift-item-ava' }, t.emoji || initials(g.recipient)),
      h('div', { class: 'gift-item-meta' }, h('b', {}, g.recipient), h('span', {}, sub)),
      h('button', { type: 'button', class: 'gift-item-del', 'aria-label': `Delete the gift for ${g.recipient}`, html: icon.x(14), onclick: remove })
    ),
    h('div', { class: 'gift-item-bottom' },
      count && h('span', { class: 'gift-item-count' }, count),
      h('a', { class: 'gift-item-open', href: `/m/${g.slug}?k=${g.key}` }, 'Open dashboard →')
    )
  );
}
