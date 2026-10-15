// Accounts in the browser: who is logged in, the create-account / log-in form (on /signup and /login, and in
// /new when a new gift needs an account), and the rows of "Your gifts".
import { h, api, icon, toast, fmtAgo } from './common.js';
import { theme } from './themes.js';

let current;
// The logged-in account ({ name, email }) or null. Asked once per page.
export function me() {
  current ||= api('/api/account').then((d) => d.user, () => null);
  return current;
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

const MODES = {
  signup: { submit: 'Create account', busy: 'Creating your account…', autocomplete: 'new-password', ask: 'Already have an account?', other: 'Log in' },
  login: { submit: 'Log in', busy: 'Logging in…', autocomplete: 'current-password', ask: 'New here?', other: 'Create an account' }
};

// mode is 'signup' or 'login'; the person can switch (then onMode(mode) runs). onDone(user) runs once they're logged in.
export function authForm({ mode = 'signup', name = '', onMode, onDone }) {
  const box = h('div');
  let email = '';

  function render() {
    const m = MODES[mode];
    const nameIn = mode === 'signup' && h('input', { class: 'input', id: 'acName', name: 'name', maxlength: '40', autocomplete: 'name', placeholder: 'e.g. Sari', value: name });
    // autocomplete "username": password managers save the email with the password.
    const emailIn = h('input', { class: 'input', id: 'acEmail', name: 'email', type: 'email', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', maxlength: '254', placeholder: 'you@example.com', value: email });
    const passIn = h('input', { class: 'input', id: 'acPass', name: 'password', type: 'password', autocomplete: m.autocomplete, maxlength: '200', placeholder: mode === 'signup' ? 'At least 8 characters' : '' });
    const show = h('button', { type: 'button', class: 'linkbtn small', onclick: () => {
      const hidden = passIn.type === 'password';
      passIn.type = hidden ? 'text' : 'password';
      show.textContent = hidden ? 'Hide' : 'Show';
    } }, 'Show');
    const err = h('p', { class: 'small err', role: 'alert', hidden: true });
    const fail = (msg) => { err.textContent = msg; err.hidden = !msg; };
    const submit = h('button', { class: 'btn', type: 'submit' }, m.submit);
    const other = h('button', { type: 'button', class: 'linkbtn', onclick: () => {
      if (nameIn) name = nameIn.value;
      email = emailIn.value;
      mode = mode === 'signup' ? 'login' : 'signup';
      render();
      onMode?.(mode);
    } }, m.other);

    const form = h('form', { class: 'stack', novalidate: true },
      nameIn && h('div', { class: 'field' }, h('label', { for: 'acName' }, 'Your name'), nameIn),
      h('div', { class: 'field' }, h('label', { for: 'acEmail' }, 'Email'), emailIn),
      h('div', { class: 'field' }, h('div', { class: 'row' }, h('label', { class: 'label grow', for: 'acPass' }, 'Password'), show), passIn),
      err,
      submit,
      h('p', { class: 'small muted center', style: { margin: 0 } }, `${m.ask} `, other));

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
  return h('div', { class: 'item' },
    h('a', { class: 'grow row', href: `/m/${g.slug}?k=${g.key}`, style: { color: '#fff', textDecoration: 'none' } },
      h('div', { class: 'grow' }, h('b', {}, `${t.emoji} For ${g.recipient}`), h('div', { class: 'small muted' }, g.createdAt ? `${t.label} · ${fmtAgo(g.createdAt)}` : t.label)),
      h('span', { class: 'small', style: { color: 'var(--gold)', fontWeight: '700' } }, 'Dashboard')),
    h('button', { type: 'button', class: 'del', 'aria-label': `Delete the gift for ${g.recipient}`, html: icon.x(), onclick: remove }));
}
