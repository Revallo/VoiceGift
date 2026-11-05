import { $, $$, h, api, icon, showScreen, slugFromPath, fmtAgo, addStars, copyText, colorFor, initials, toast, openSheet, closeSheet } from './common.js';
import { createScene, applyTheme } from './themes.js';
import { friendUrl, recipientUrl, qrSvg, shareRow, recipientCard, printQrCard } from './share.js';
import { me } from './auth.js';

addStars($('#app'), 20, 40);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

const slug = slugFromPath();
const key = new URLSearchParams(location.search).get('k') || '';
let scene;
let previewAudio = null, previewBtn = null, previewId = '';

function togglePreview(id, btn) {
  if (previewAudio && previewId === id && !previewAudio.paused) {
    previewAudio.pause();
    return;
  }
  if (previewAudio) {
    previewAudio.pause();
    if (previewBtn) { previewBtn.classList.remove('playing'); previewBtn.innerHTML = icon.play(11); }
  }
  previewId = id;
  previewBtn = btn;
  previewAudio = new Audio(`/api/audio?slug=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}&k=${encodeURIComponent(key)}`);
  btn.classList.add('playing');
  btn.innerHTML = icon.pause(11);
  previewAudio.onpause = () => { btn.classList.remove('playing'); btn.innerHTML = icon.play(11); };
  previewAudio.onended = () => { btn.classList.remove('playing'); btn.innerHTML = icon.play(11); };
  previewAudio.play().catch(() => { btn.classList.remove('playing'); btn.innerHTML = icon.play(11); });
}

// Logged in: "back" goes to the account's list of gifts.
me().then((u) => {
  if (!u) return;
  $('.backbtn').href = '/account';
  $('.backbtn').setAttribute('aria-label', 'Back to your gifts');
});

async function load() {
  let data;
  try {
    data = await api(`/api/manage?slug=${encodeURIComponent(slug)}&key=${encodeURIComponent(key)}`);
  } catch (e) {
    $('#errorText').textContent = e.message;
    return showScreen('error');
  }
  const { gift, openKey, messages } = data;
  const t = applyTheme(gift.occasion);
  const name = t.callName(gift.recipient);
  const sentMsgs = messages.filter((m) => m.sent);
  const realEdited = messages.filter((m) => !m.demo && m.edited);
  const totalSec = Math.round(sentMsgs.reduce((acc, m) => acc + (Number(m.durationSec) || 0), 0));
  const msgs = `${sentMsgs.length} ${sentMsgs.length === 1 ? 'voice' : 'voices'}`;
  $('#title').textContent = `For ${gift.recipient}`;
  $('#status').textContent = `${msgs} · ${totalSec}s`;
  if ($('#asrStatBadge')) $('#asrStatBadge').textContent = `${realEdited.length} asr fixed`;
  if ($('#voiceCountSub')) $('#voiceCountSub').textContent = `${messages.length} total`;
  if ($('#editDesignLink')) $('#editDesignLink').href = `/new?edit=${encodeURIComponent(slug)}&k=${encodeURIComponent(key)}`;

  const renderDashScene = () => {
    $('#cake').textContent = '';
    scene = createScene($('#cake'), gift);
    scene.setCandles(sentMsgs.length, { spots: Math.max(12, sentMsgs.length) });
    scene.lightAll();
  };
  renderDashScene();

  const custBtn = $('#customizeDashBtn');
  if (custBtn) {
    custBtn.onclick = () => {
      const dr = $('#cakeDrawer');
      if (!dr) return;
      dr.hidden = !dr.hidden;
      custBtn.classList.toggle('active-toggle', !dr.hidden);
      if (!dr.hidden) renderDashScene();
    };
  }

  const list = $('#list');
  list.textContent = '';
  if (!messages.length) list.append(h('div', { class: 'item small muted' }, 'Nobody yet. Share the link below.'));
  messages.forEach((m, i) => {
    const fixNote = m.demo
      ? 'demo'
      : m.edited
        ? `${m.fixes || 1} fixed`
        : m.sent ? 'sent' : 'draft';
    const playBtn = h('button', {
      type: 'button',
      class: 'play-mini',
      'aria-label': `Play ${m.sender}'s voice`,
      title: 'Play voice preview',
      html: icon.play(11),
      onclick: () => togglePreview(m.id, playBtn)
    });
    list.append(h('div', { class: 'item' },
      h('div', { class: 'bento-top' },
        h('span', { class: 'avatar', style: { background: colorFor(i), width: '32px', height: '32px', borderRadius: '10px', fontSize: '12px' } }, initials(m.sender)),
        h('div', { class: 'bento-meta' },
          h('b', {}, m.sender),
          h('span', {}, fmtAgo(m.createdAt))
        ),
        h('button', { type: 'button', class: 'del', 'aria-label': `Delete ${m.sender}'s message`, html: icon.x(12), onclick: () => remove(m) })
      ),
      h('div', { class: 'bento-val' },
        h('span', { class: 'tag-plus' }, `+ ${Math.round(m.durationSec)}s`),
        h('div', { class: 'row', style: { gap: '6px' } },
          h('span', { class: 'tiny muted', style: { fontWeight: '600' } }, fixNote),
          playBtn
        )
      )
    ));
  });

  const friend = friendUrl(gift);
  $('#inviteTitle').textContent = gift.occasion === 'wedding' ? 'Invite more guests' : 'Invite more friends';
  $('#friendLink').textContent = friend.replace(/^https?:\/\//, '');
  const b = $('#copyFriend');
  b.innerHTML = icon.copy(14);
  b.append(h('span', {}, 'Copy'));
  b.onclick = () => copyText(friend);
  $('#waBtn').replaceWith(Object.assign(shareRow(t.waFriends(name), friend), { id: 'waBtn' }));
  $('#qr').innerHTML = qrSvg(friend);
  $('#printQr').innerHTML = icon.print(14);
  $('#printQr').append(h('span', {}, 'Print'));
  $('#printQr').onclick = () => printQrCard(gift);

  $('#delivery').textContent = '';
  const deliveryRow = h('div', { class: 'nav-list', style: { marginBottom: '4px' } },
    h('button', {
      type: 'button',
      class: 'nav-row',
      onclick: () => openDeliverySheet(gift, openKey)
    },
      h('span', { class: 'nav-ico', html: icon.shield(16) }),
      h('div', { class: 'nav-info' },
        h('b', {}, 'send langsung ke akun & verifikasi'),
        h('small', {}, gift.recipientEmail ? `terkirim ke ${gift.recipientEmail}` : '1. tanpa akun → pertanyaan · 2. ada akun → langsung buka')
      ),
      h('span', { class: 'nav-val' }, gift.recipientEmail ? 'terkirim ✓' : 'atur'),
      h('span', { class: 'nav-chev', html: icon.chevronRight(16) })
    ),
    h('button', {
      type: 'button',
      class: 'nav-row',
      onclick: () => openSheet({
        title: `share link · ${gift.recipient}`,
        subtitle: 'kirim link ke penerima atau bagikan via whatsapp',
        content: recipientCard(gift, openKey)
      })
    },
      h('span', { class: 'nav-ico', html: icon.send(16) }),
      h('div', { class: 'nav-info' },
        h('b', {}, `share link ke ${gift.recipient}`),
        h('small', {}, 'whatsapp · qr code · direct reveal link')
      ),
      h('span', { class: 'nav-val' }, 'share'),
      h('span', { class: 'nav-chev', html: icon.chevronRight(16) })
    )
  );
  $('#delivery').append(deliveryRow);
  $('#openReveal').href = recipientUrl(gift, openKey);
  $('#demoCard').hidden = messages.filter((m) => m.demo).length >= 12; // stays if a run was cut short
  showScreen('main');
}

function openDeliverySheet(gift, openKey) {
  const emailIn = h('input', {
    class: 'input',
    type: 'email',
    value: gift.recipientEmail || 'dimas@voicegift.id',
    placeholder: 'e.g. dimas@voicegift.id'
  });
  const qIn = h('input', {
    class: 'input',
    value: gift.verifyQuestion || `Siapa nama panggilan akrab ${gift.recipient}?`,
    maxlength: 140,
    placeholder: 'Pertanyaan verifikasi untuk penerima tanpa akun'
  });
  const aIn = h('input', {
    class: 'input',
    value: gift.verifyAnswer || gift.recipient.split(/\s+/)[0],
    maxlength: 80,
    placeholder: `Jawaban (contoh: ${gift.recipient.split(/\s+/)[0]})`
  });
  const saveBtn = h('button', { type: 'submit', class: 'btn' }, 'kirim ke akun & simpan verifikasi');

  const form = h('form', {
    class: 'stack',
    style: { gap: '12px' },
    onsubmit: async (ev) => {
      ev.preventDefault();
      saveBtn.disabled = true;
      try {
        await api('/api/manage', {
          method: 'POST',
          json: {
            slug,
            key,
            action: 'update-delivery',
            recipientEmail: emailIn.value.trim().toLowerCase(),
            verifyQuestion: qIn.value.trim(),
            verifyAnswer: aIn.value.trim()
          }
        });
        closeSheet();
        toast(`Terkirim ke akun ${emailIn.value.trim() || gift.recipient}!`);
        await load();
      } catch (e) {
        toast(e.message);
      } finally {
        saveBtn.disabled = false;
      }
    }
  },
    h('div', { class: 'field' },
      h('label', {}, 'email akun penerima (langsung masuk ke akunnya)'),
      emailIn
    ),
    h('div', { class: 'field' },
      h('label', {}, 'pertanyaan verifikasi (jika penerima tidak punya akun)'),
      qIn
    ),
    h('div', { class: 'field' },
      h('label', {}, 'jawaban verifikasi'),
      aIn
    ),
    saveBtn,
    h('div', { class: 'dual-pills', style: { marginTop: '4px' } },
      h('a', { class: 'pill-btn dark', href: `/r/${gift.slug}?verify=1`, style: { background: '#222625', fontSize: '12.5px' } }, 'cek verifikasi tamu'),
      h('a', { class: 'pill-btn light', href: `/r/${gift.slug}?k=${openKey}`, style: { fontSize: '12.5px' } }, 'buka voice gift')
    )
  );

  openSheet({
    title: 'send ke akun & verifikasi',
    subtitle: '1. gak ada akun → verifikasi pertanyaan · 2. ada akun → langsung buka',
    content: form
  });
}

// Gone for good: the server deletes the message and its recording.
async function remove(m) {
  if (!confirm(`Delete ${m.sender}'s message? This can't be undone.`)) return;
  try {
    await api('/api/manage', { method: 'POST', json: { slug, key, action: 'delete', id: m.id } });
    toast('Message deleted');
    await load();
  } catch (e) {
    toast(e.message);
  }
}

$('#refresh').addEventListener('click', load);
$('#deleteGift').addEventListener('click', async () => {
  if (!confirm("Delete this whole gift, with every message and recording? This can't be undone.")) return;
  try {
    await api('/api/manage', { method: 'POST', json: { slug, key, action: 'delete-gift' } });
    try { localStorage.setItem('vg-mine', JSON.stringify(JSON.parse(localStorage.getItem('vg-mine') || '[]').filter((g) => g.slug !== slug))); } catch {}
    location.href = (await me()) ? '/account' : '/';
  } catch (e) {
    toast(e.message);
  }
});
$('#addDemo').addEventListener('click', async () => {
  const b = $('#addDemo');
  b.disabled = true;
  b.textContent = 'Adding 12 voices…';
  try {
    await api('/api/manage', { method: 'POST', json: { slug, key, action: 'add-demo' } });
    toast('12 demo voices added');
    await load();
  } catch (e) {
    toast(e.message);
  } finally {
    b.disabled = false;
    b.textContent = 'Add 12 demo voices';
  }
});
load();
