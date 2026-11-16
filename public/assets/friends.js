// /friends: my friend link and my friends.  /u/<code>: someone's friend link ("Add Sari as a friend").
// Friends are only made through a link someone gave you: no search, no phone numbers.
import { $, h, api, icon, showScreen, toast, copyText, waShare, initials, colorFor } from './common.js';
import { requireLogin } from './auth.js';
import { tabBar } from './tabbar.js';

const code = location.pathname.startsWith('/u/') ? decodeURIComponent(location.pathname.split('/')[2] || '') : '';
const user = await requireLogin(); // logged out: log in, then straight back to this link
if (user) (code ? showAdd() : showFriends()).catch((e) => { $('#errorText').textContent = e.message; showScreen('error'); });

async function showAdd() {
  const who = await api(`/api/friends?code=${encodeURIComponent(code)}`);
  if (who.mine) return location.replace('/friends');
  $('#addFace').textContent = initials(who.name);
  $('#addFace').style.background = colorFor(who.name.length);
  $('#addTitle').textContent = who.already ? `You and ${who.name} are friends` : `Add ${who.name} as a friend?`;
  $('#addLead').textContent = who.already ? 'You can send each other voices.' : `Then you and ${who.name} can send each other voices. Only friends hear them.`;
  const btn = $('#addBtn');
  btn.textContent = who.already ? `Send ${who.name} a voice` : `Add ${who.name}`;
  btn.onclick = async () => {
    if (who.already) return (location.href = '/?send=1');
    btn.disabled = true;
    try {
      await api('/api/friends', { method: 'POST', json: { action: 'add', code } });
      who.already = true;
      toast(`You and ${who.name} are friends now`);
      $('#addTitle').textContent = `You and ${who.name} are friends`;
      $('#addLead').textContent = 'Say hi with your voice.';
      btn.textContent = `Send ${who.name} a voice`;
      $('#addSkip').textContent = 'Go to home';
    } catch (e) { toast(e.message); }
    btn.disabled = false;
  };
  showScreen('add');
}

async function showFriends() {
  tabBar();
  const data = await api('/api/friends');
  const link = `${location.origin}/u/${data.code}`;
  $('#myLink').textContent = link.replace(/^https?:\/\//, '');
  const copy = $('#copyLink');
  copy.innerHTML = icon.copy(14);
  copy.append(h('span', {}, 'Copy'));
  copy.onclick = () => copyText(link);
  $('#waLink').href = waShare(`Add me on Voice Gift, so we can send each other voices 🎙️ ${link}`);
  draw(data.friends);
  showScreen('friends');
}

function draw(friends) {
  $('#friendsTitle').textContent = `Your friends (${friends.length})`;
  $('#friendList').replaceChildren(...(friends.length ? friends.map((f, i) => {
    const remove = h('button', { type: 'button', class: 'linkbtn small', 'aria-label': `Remove ${f.name}` }, 'Remove');
    remove.onclick = async () => {
      if (!confirm(`Remove ${f.name}? You won’t be able to send each other voices.`)) return;
      await api('/api/friends', { method: 'POST', json: { action: 'remove', id: f.id } }).catch((e) => toast(e.message));
      draw(friends.filter((x) => x !== f));
    };
    return h('div', { class: 'friend-row' }, h('span', { class: 'avatar', style: { background: colorFor(i) } }, initials(f.name)), h('b', { class: 'grow' }, f.name), remove);
  }) : [h('p', { class: 'small muted', style: { margin: '0' } }, 'Nobody yet. Send your link to a friend.')]));
}
