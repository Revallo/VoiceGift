// Accounts in the browser: who is logged in, the create-account / log-in form (on /signup and /login, and in
// /new when a new gift needs an account), and the rows of "Your gifts".
import { h, api, icon, toast, fmtAgo, initials } from './common.js';
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

    const tabs = h('div', { class: 'auth-tabs' },
      h('button', { type: 'button', class: 'auth-tab' + (mode === 'login' ? ' on' : ''), onclick: () => switchMode('login') }, 'log in'),
      h('button', { type: 'button', class: 'auth-tab' + (mode === 'signup' ? ' on' : ''), onclick: () => switchMode('signup') }, 'create account')
    );

    const demoBtn = h('button', {
      type: 'button',
      class: 'btn ghost sm',
      style: { width: '100%', minHeight: '42px', borderStyle: 'dashed' },
      onclick: async () => {
        demoBtn.disabled = true;
        demoBtn.textContent = 'Signing in as Sari…';
        try {
          const { user } = await api('/api/account', {
            method: 'POST',
            json: { action: 'login', email: 'sari@voicegift.id', password: 'password123' }
          });
          current = Promise.resolve(user);
          await claimDeviceGifts();
          await onDone(user);
        } catch (e) {
          fail(e.message);
        } finally {
          demoBtn.disabled = false;
          demoBtn.textContent = '1-tap demo login · Sari (organizer)';
        }
      }
    }, '1-tap demo login · Sari (organizer)');

    const other = h('button', { type: 'button', class: 'linkbtn', onclick: () => switchMode(mode === 'signup' ? 'login' : 'signup') }, m.other);

    const form = h('form', { class: 'card stack', style: { gap: '14px' }, novalidate: true },
      tabs,
      nameIn && h('div', { class: 'field' }, h('label', { for: 'acName' }, 'your name'), nameIn),
      h('div', { class: 'field' }, h('label', { for: 'acEmail' }, 'email address'), emailIn),
      h('div', { class: 'field' }, h('div', { class: 'row' }, h('label', { class: 'label grow', for: 'acPass' }, 'password'), show), passIn),
      err,
      submit,
      /[?&]demo=1/.test(location.search) && demoBtn, // only for demos: /login?demo=1
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
  const sub = [t.label.toLowerCase(), g.createdAt ? fmtAgo(g.createdAt) : ''].filter(Boolean).join(' · ');
  const countLabel = typeof g.count === 'number' ? `+ ${g.count} ${g.count === 1 ? 'voice' : 'voices'}` : '+ open';
  return h('div', { class: 'item' },
    h('div', { class: 'bento-top' },
      h('span', { class: 'avatar', style: { background: 'var(--emerald)', color: '#fff', width: '32px', height: '32px', borderRadius: '10px', fontSize: '12px' } }, initials(g.recipient)),
      h('div', { class: 'bento-meta' },
        h('b', {}, g.recipient),
        h('span', {}, sub)
      ),
      h('button', { type: 'button', class: 'del', 'aria-label': `Delete the gift for ${g.recipient}`, html: icon.x(12), onclick: remove })
    ),
    h('a', { class: 'bento-val', href: `/m/${g.slug}?k=${g.key}`, style: { textDecoration: 'none' } },
      h('span', { class: 'tag-plus' }, countLabel),
      h('span', { class: 'tiny muted', style: { fontWeight: '500' } }, g.editedCount ? `${g.editedCount} fixed` : 'dashboard →')
    )
  );
}
