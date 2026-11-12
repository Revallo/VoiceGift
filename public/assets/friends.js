// Friends: the two sheets opened from the home page, and the rows they are made of.
//   friendsSheet(onChange)          find someone by email, people you know from gifts, your own profile link
//   profileSheet(profile, onChange) one person: make a gift for them, follow / unfollow
// A profile is { handle, name, bio }. onChange() runs after a follow or unfollow.
import { h, api, toast, openSheet, closeSheet, copyText, initials } from './common.js';

export const setFollow = (handle, on) => api('/api/follow', { method: 'POST', json: { action: on ? 'follow' : 'unfollow', handle } });

// "Follow" / "Following": words you press. Returns the button.
export function followButton(profile, following, onChange) {
  const b = h('button', { type: 'button', class: 'linkbtn' });
  const paint = () => {
    b.textContent = following ? 'Following' : 'Follow';
    b.style.color = following ? 'var(--muted)' : 'var(--accent)';
    b.setAttribute('aria-pressed', String(following));
  };
  paint();
  b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      await setFollow(profile.handle, !following);
      following = !following;
      paint();
      onChange?.();
    } catch (e) {
      toast(e.message);
    } finally {
      b.disabled = false;
    }
  });
  return b;
}

// One person in a list: their name, a line about them, and Follow.
export function personRow(profile, following, onChange) {
  return h('div', { class: 'who-row' },
    h('span', { class: 'avatar', style: { background: 'var(--face)' } }, initials(profile.name)),
    h('div', { class: 'grow' }, h('b', {}, profile.name), profile.bio && h('div', { class: 'tiny muted wrap' }, profile.bio)),
    followButton(profile, following, onChange));
}

export function profileSheet(profile, onChange) {
  openSheet({
    title: profile.name,
    subtitle: profile.bio || '',
    content: [
      h('a', { class: 'btn', href: `/new?for=${encodeURIComponent(profile.name)}` }, `Make a gift for ${profile.name}`),
      h('button', { type: 'button', class: 'btn ghost', style: { alignSelf: 'flex-start' }, onclick: async () => {
        try {
          await setFollow(profile.handle, false);
          closeSheet();
          onChange?.();
        } catch (e) {
          toast(e.message);
        }
      } }, 'Unfollow')
    ]
  });
}

export async function friendsSheet(onChange) {
  const result = h('div', { class: 'who-list' });
  const emailIn = h('input', { class: 'input', type: 'email', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', placeholder: 'friend@example.com', 'aria-label': 'Your friend’s email' });
  const find = h('form', { class: 'stack', style: { gap: '10px' }, novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    const email = emailIn.value.trim();
    if (!email) return;
    try {
      const r = await api('/api/follow?find=' + encodeURIComponent(email));
      result.replaceChildren(r.self ? h('p', { class: 'small muted', style: { margin: 0 } }, 'That’s your own email.') : personRow(r.profile, r.following, onChange));
    } catch (err) {
      result.replaceChildren(h('p', { class: 'small muted', style: { margin: 0 } }, err.message));
    }
  } },
    h('div', { class: 'field' }, h('label', {}, 'Their email, exactly'), emailIn),
    h('button', { type: 'submit', class: 'btn ghost', style: { alignSelf: 'flex-start' } }, 'Find'),
    result);

  const known = h('div', { class: 'who-list' });
  const knownBox = h('div', { hidden: true }, h('h3', { style: { marginBottom: '6px' } }, 'From your gifts'), known);
  const link = h('div', { class: 'linkbox', hidden: true });
  const linkBox = h('div', { hidden: true }, h('p', { class: 'label', style: { margin: 0 } }, 'Or send them your profile link'), link);

  openSheet({ title: 'Find friends', subtitle: 'Follow someone to keep them on your home page.', content: [find, knownBox, linkBox] });
  setTimeout(() => emailIn.focus(), 60);

  try {
    const { me, suggestions = [] } = await api('/api/follow');
    known.replaceChildren(...suggestions.map((p) => personRow(p, false, onChange)));
    knownBox.hidden = !suggestions.length;
    const url = `${location.origin}/u/${me.handle}`;
    link.replaceChildren(h('span', {}, url.replace(/^https?:\/\//, '')), h('button', { type: 'button', onclick: () => copyText(url) }, 'Copy'));
    link.hidden = false;
    linkBox.hidden = false;
  } catch {}
}
