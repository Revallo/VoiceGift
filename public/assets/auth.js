// Accounts in the browser: who is logged in, the create-account / log-in form (on /signup and /login, and in
// /new when a new gift needs an account), and the rows of "Your gifts".
import { h, api, icon, toast, fmtAgo } from './common.js';
import { theme } from './themes.js';

let asked;
let current;
// What the server says about this browser: { user, googleClientId }. Asked once per page.
const account = () => (asked ||= api('/api/account').catch(() => ({ user: null })));
// The logged-in account ({ name, email }) or null.
export function me() {
  current ||= account().then((d) => d.user);
  return current;
}

// Pages that need an account: a logged-out visitor goes to create one and comes straight back here.
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

// "Continue with Google": Google draws its own button into `box`. Nothing is shown when the server has no
// GOOGLE_CLIENT_ID, or when Google's script can't be loaded. onDone(user) runs once they're logged in.
let gsi;
export async function googleButton(box, onDone) {
  const { googleClientId } = await account();
  if (!googleClientId || !box) return;
  try {
    await (gsi ||= new Promise((ok, fail) => {
      const s = h('script', { src: 'https://accounts.google.com/gsi/client', async: true });
      s.onload = ok;
      s.onerror = fail;
      document.head.append(s);
    }));
  } catch {
    return;
  }
  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: async ({ credential }) => {
      try {
        const { user } = await api('/api/account', { method: 'POST', json: { action: 'google', credential } });
        current = Promise.resolve(user);
        await claimDeviceGifts();
        await onDone(user);
      } catch (e) {
        toast(e.message);
      }
    }
  });
  box.hidden = false;
  window.google.accounts.id.renderButton(box, { theme: 'filled_black', size: 'large', shape: 'rectangular', text: 'continue_with', logo_alignment: 'center', width: Math.min(380, Math.max(240, box.clientWidth)) });
}

const MODES = {
  signup: { submit: 'Create account', busy: 'Creating your account…', autocomplete: 'new-password', ask: 'Already have an account?', other: 'Log in' },
  login: { submit: 'Log in', busy: 'Logging in…', autocomplete: 'current-password', ask: 'New here?', other: 'Create account' }
};

// mode is 'signup' or 'login'; the person can switch (then onMode(mode) runs). onDone(user) runs once they're logged in.
export function authForm({ mode = 'signup', name = '', onMode, onDone }) {
  const box = h('div');
  let email = '';

  function render() {
    const m = MODES[mode];
    const nameIn = mode === 'signup' && h('input', { class: 'input', id: 'acName', name: 'name', maxlength: '40', autocomplete: 'name', placeholder: 'e.g. Sari', value: name });
    const emailIn = h('input', { class: 'input', id: 'acEmail', name: 'email', type: 'email', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', maxlength: '254', placeholder: 'you@example.com', value: email });
    const passIn = h('input', { class: 'input', id: 'acPass', name: 'password', type: 'password', autocomplete: m.autocomplete, maxlength: '200', placeholder: mode === 'signup' ? 'At least 8 characters' : 'Your password' });
    const show = h('button', { type: 'button', class: 'linkbtn small', onclick: () => {
      const hidden = passIn.type === 'password';
      passIn.type = hidden ? 'text' : 'password';
      show.textContent = hidden ? 'Hide' : 'Show';
    } }, 'Show');
    const err = h('p', { class: 'small err', role: 'alert', hidden: true });
    const fail = (msg) => { err.textContent = msg; err.hidden = !msg; };
    const submit = h('button', { class: 'btn', type: 'submit' }, m.submit);

    const switchMode = (targetMode) => {
      if (targetMode === mode) return;
      if (nameIn) name = nameIn.value;
      email = emailIn.value;
      mode = targetMode;
      render();
      onMode?.(mode);
    };

    const other = h('button', { type: 'button', class: 'linkbtn auth-tab', onclick: () => switchMode(mode === 'signup' ? 'login' : 'signup') }, m.other);

    const google = h('div', { class: 'google-box', hidden: true });
    googleButton(google, onDone);
    const form = h('form', { class: 'stack', style: { gap: '16px' }, novalidate: true },
      google,
      nameIn && h('div', { class: 'field' }, h('label', { for: 'acName' }, 'Your name'), nameIn),
      h('div', { class: 'field' }, h('label', { for: 'acEmail' }, 'Email address'), emailIn),
      h('div', { class: 'field' }, h('div', { class: 'row' }, h('label', { class: 'label grow', for: 'acPass' }, 'Password'), show), passIn),
      err,
      submit,
      h('p', { class: 'small muted', style: { margin: 0 } }, `${m.ask} `, other));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = { action: mode, name: nameIn ? nameIn.value.trim() : undefined, email: emailIn.value.trim(), password: passIn.value };
      const problem = nameIn && !body.name ? 'Please enter your name.'
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ? 'Please enter a valid email address.'
        : !body.password ? 'Please enter your password.'
        : mode === 'signup' && body.password.length < 8 ? 'Use at least 8 characters for your password.' : '';
      fail(problem);
      if (problem) return;
      submit.disabled = true;
      submit.textContent = m.busy;
      try {
        const { user } = await api('/api/account', { method: 'POST', json: body });
        current = Promise.resolve(user);
        await claimDeviceGifts();
        await onDone(user);
      } catch (e) {
        fail(e.message);
      } finally {
        submit.disabled = false;
        submit.textContent = m.submit;
      }
    });
    box.replaceChildren(form);
  }

  render();
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
  const count = typeof g.count === 'number' ? `${g.count} ${g.count === 1 ? 'voice' : 'voices'}` : '';
  const sub = [t.label, count, g.createdAt ? fmtAgo(g.createdAt) : ''].filter(Boolean).join(' · ');
  return h('div', { class: 'gift-item' },
    h('a', { class: 'gift-item-open', href: `/m/${g.slug}?k=${g.key}`, 'aria-label': `Open the gift for ${g.recipient}` }, h('b', {}, g.recipient), h('span', {}, sub)),
    h('button', { type: 'button', class: 'gift-item-del', 'aria-label': `Delete the gift for ${g.recipient}`, html: icon.x(16), onclick: remove }));
}
