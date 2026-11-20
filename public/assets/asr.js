// /admin/asr: the team's view of the company ASR. Needs ADMIN_KEY, sent as the X-Admin-Key header and kept only for this tab
// (sessionStorage). Everything shown comes from the server and is inserted with h() (text only).
import { h, toast } from './common.js';

const form = document.getElementById('keyForm');
const out = document.getElementById('out');
const store = { get: () => { try { return sessionStorage.getItem('vg-admin') || ''; } catch { return ''; } },
  set: (v) => { try { v ? sessionStorage.setItem('vg-admin', v) : sessionStorage.removeItem('vg-admin'); } catch {} } };

async function call(method, json) {
  const res = await fetch('/api/asr', {
    method,
    headers: { 'X-Admin-Key': store.get(), ...(json ? { 'Content-Type': 'application/json' } : {}) },
    body: json ? JSON.stringify(json) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

const box = (title, ...kids) => h('div', { class: 'box' }, h('h2', {}, title), ...kids);
const stat = (label, value) => h('div', {}, h('div', { class: 'num' }, value ?? '–'), h('div', { class: 'small muted' }, label));
const dot = (ok) => h('span', { class: `dot ${ok === true ? 'ok' : ok === false ? 'bad' : ''}` });
const when = (iso) => { const d = new Date(iso); return Number.isNaN(+d) ? String(iso || '') : d.toLocaleString(); };

function render(d) {
  const t = d.twm;
  const provider = box('Recognition',
    h('p', { class: 'small', style: { margin: 0 } }, dot(d.provider === 'twm'),
      d.provider === 'twm' ? `Taiwan Mobile ASR (${t.host}${t.model ? `, model ${t.model}` : ''})`
        : d.provider === 'mock' ? 'Mock (no ASR set). Set TWM_ASR_USER + TWM_ASR_PASSWORD on Vercel.'
          : `${d.provider} (TWM not set: TWM_ASR_USER + TWM_ASR_PASSWORD)`));

  const parts = [provider];
  if (t) {
    const hl = t.health;
    parts.push(box('Server health', hl?.error ? h('p', { class: 'small' }, dot(false), hl.error)
      : h('div', { class: 'stack', style: { gap: '10px' } },
        h('p', { class: 'small', style: { margin: 0 } }, dot(hl.value.ok), hl.value.ok ? 'Running' : 'Not ready', hl.value.statusDesc ? ` · ${hl.value.statusDesc}` : ''),
        h('div', { class: 'grid' },
          stat('free workers', `${hl.value.availableWorkers ?? '–'} / ${hl.value.totalWorkers ?? '–'}`),
          stat('tasks done', hl.value.taskSuccess), stat('tasks failed', hl.value.taskFailed), stat('tasks total', hl.value.taskTotal)))));
    const tk = t.tasks;
    parts.push(box('Latest recognitions on TWM', tk?.error ? h('p', { class: 'small' }, dot(false), tk.error)
      : !tk.value.length ? h('p', { class: 'small muted' }, 'None yet.')
        : h('div', { class: 'rows' }, tk.value.map((x) => h('div', { class: 'rowx small' },
          h('div', {}, dot(x.healthy), `#${x.id} · ${x.status}`, h('div', { class: 'muted' }, `${when(x.createTime)} · ${x.audioLength}s · ${x.wordCount} words${x.model ? ` · ${x.model}` : ''}`),
            x.error ? h('div', { class: 'muted' }, x.error) : null))))));
  }

  const s = d.stats;
  parts.push(box('Captions (training data)', h('div', { class: 'grid' },
    stat('voices', s.voices), stat('captions checked', s.captioned), stat('fixed by the speaker', s.edited),
    stat('recognised by TWM', s.twm), stat('correction saved on TWM', s.synced), stat('not saved yet', s.failed + s.waiting))));

  if (d.failed.length) {
    parts.push(box('Corrections that did not reach TWM', h('div', { class: 'rows' }, d.failed.map((f) => {
      const btn = h('button', { class: 'btn sm', type: 'button' }, 'Retry');
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const r = await call('POST', { action: 'retry', slug: f.slug, id: f.id, kind: f.kind });
          toast(r.asrSync?.ok ? 'Saved on TWM' : `Still failing: ${r.asrSync?.error || 'unknown'}`);
          load();
        } catch (e) { toast(e.message); btn.disabled = false; }
      });
      return h('div', { class: 'rowx small' },
        h('div', {}, `${f.kind} ${f.id} · task #${f.taskId}`, h('div', { class: 'muted' }, `${when(f.at)} · ${f.error}`)), btn);
    }))));
  }

  parts.push(h('div', { style: { display: 'flex', gap: '8px' } },
    h('button', { class: 'btn sm', type: 'button', onclick: load }, 'Refresh'),
    h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { store.set(''); out.replaceChildren(); form.hidden = false; } }, 'Forget key')));
  out.replaceChildren(...parts);
}

async function load() {
  out.replaceChildren(h('div', { class: 'loading' }, h('div', { class: 'spinner' })));
  try {
    render(await call('GET'));
    form.hidden = true;
  } catch (e) {
    out.replaceChildren(h('p', { class: 'small' }, e.message));
    if (e.status === 403 || e.status === 429) { store.set(''); form.hidden = false; }
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  store.set(document.getElementById('key').value.trim());
  document.getElementById('key').value = '';
  load();
});

if (store.get()) load(); else form.hidden = false;
