// Taiwan Mobile's overseas ASR (BRONCI "Conversational ASR Streaming API" v3.22 + the subtitle-json edit API).
// Used by lib/asr.js when TWM_ASR_USER + TWM_ASR_PASSWORD are set. No library: Node 22 has fetch and WebSocket.
//
// 1. Recognise: POST /api/v1/login → token; GET /api/v1/streaming/transcript/access-info → { url, ticket } (ticket lives ~30 s);
//    WebSocket url?ticket&type=file&saveResult=1&audioFilename → wait for code 180 → send the WAV (frames < 384 KB) → "EOS"
//    → collect every result with final=1 until end=1 / code 204. Code 100 carries the taskId.
// 2. Write back the speaker's correction: PUT /api/v1/subtitle/tasks/:taskId/subtitle-json {category:"dia", type:"edited", …}.
//    The ASR side keeps the original AND the latest edited version, so we need no versioning of our own.
// 3. Read-only, for the admin page (/admin/asr): GET /api/v1/health, GET /api/v1/subtitle/tasks/streaming-record.
//
// Env: TWM_ASR_URL (default https://asrapi.bronci.ai/gateway, the overseas production gateway), TWM_ASR_USER,
//      TWM_ASR_PASSWORD, TWM_ASR_MODEL (optional modelName, ask the TWM project PM).
//
// Safety: the password and token only ever go to TWM_ASR_URL, over HTTPS (http only for a local fake server on localhost);
// the WebSocket must be wss:// (it carries the ticket, never the token); every call has a timeout; a failed login waits
// a minute before trying again (5 wrong logins can lock the account, code 42213); nothing from TWM is trusted for size.

const BASE = (process.env.TWM_ASR_URL || 'https://asrapi.bronci.ai/gateway').replace(/\/+$/, '');
const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(BASE + '/'); // the test's fake server
const FRAME = 256 * 1024; // the server refuses frames of 384 KB or more
const WS_TIMEOUT_MS = 50000; // a recording is at most 90 s (sent as a file, faster than real time); Vercel stops functions at 60 s (vercel.json)
const HTTP_TIMEOUT_MS = 10000;
const LIST_TIMEOUT_MS = 25000; // the streaming-record list (admin page only) is slow on TWM's side; 10 s timed out (2026-11-28)
const LOGIN_COOLDOWN_MS = 60000;
const MAX_TEXT = 1000;

export const twmConfigured = () => Boolean(process.env.TWM_ASR_USER && process.env.TWM_ASR_PASSWORD);
export const twmBase = () => BASE;

function checkBase() {
  if (!BASE.startsWith('https://') && !LOCAL) throw new Error('TWM_ASR_URL must start with https://');
}

// One login per warm function instance, renewed a minute before it expires.
let cached = { token: null, until: 0 };
let loginBlockedUntil = 0;
async function token(force = false) {
  if (!force && cached.token && Date.now() < cached.until) return cached.token;
  if (Date.now() < loginBlockedUntil) throw new Error('TWM ASR login failed recently; waiting a minute before trying again');
  checkBase();
  let res, json;
  try {
    res = await fetch(`${BASE}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: process.env.TWM_ASR_USER, password: process.env.TWM_ASR_PASSWORD, rememberMe: 1 }),
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
    });
    json = await res.json().catch(() => ({}));
  } catch (e) {
    loginBlockedUntil = Date.now() + LOGIN_COOLDOWN_MS;
    throw new Error(`TWM ASR login unreachable: ${e.name === 'TimeoutError' ? 'timeout' : e.message}`);
  }
  if (json.code !== 200 || typeof json.token !== 'string' || !json.token) {
    loginBlockedUntil = Date.now() + LOGIN_COOLDOWN_MS;
    cached = { token: null, until: 0 };
    throw new Error(`TWM ASR login failed: code ${Number(json.code) || res.status}`); // never echo the request
  }
  const sec = Math.min(Number(json.expiration) || 3600, 7 * 24 * 3600);
  cached = { token: json.token, until: Date.now() + Math.max(30, sec - 60) * 1000 };
  return cached.token;
}

// Authenticated JSON call; logs in again once if the token was rejected.
async function api(method, path, body, timeoutMs = HTTP_TIMEOUT_MS) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await token(attempt > 0)}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (res.status === 401 && attempt === 0) { cached = { token: null, until: 0 }; continue; }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || (Number(json.code) >= 400)) {
      throw new Error(`TWM ASR ${method} ${path.split('?')[0]}: ${Number(json.code) || res.status} ${String(json.error || '').slice(0, 120)}`);
    }
    return json;
  }
}

const cleanTaskId = (id) => (/^[0-9]{1,20}$/.test(String(id)) ? String(id) : null);

// → { text, taskId }. `name` becomes the stored file name on the ASR side (letters, digits, - _ . only, ≤ 64).
export async function twmTranscribe(wav, name = 'voice') {
  const info = await api('GET', '/api/v1/streaming/transcript/access-info');
  const target = info.data?.[0];
  if (!target?.url || !target?.ticket) throw new Error(`TWM ASR has no free stream (code ${Number(info.code)})`);
  const url = new URL(target.url);
  // the ticket travels only over an encrypted socket (plain ws:// only to the local fake server)
  if (url.protocol !== 'wss:' && !(LOCAL && url.protocol === 'ws:')) throw new Error('TWM ASR gave a non-wss:// stream URL');
  url.searchParams.set('type', 'file'); // our WAV is raw PCM 16 kHz mono 16-bit
  url.searchParams.set('rate', '16000'); // required, ignored for type=file
  url.searchParams.set('saveResult', '1'); // keeps audio + transcript, so a task exists to write the correction to
  const safe = String(name).replace(/[^A-Za-z0-9._-]/g, '').slice(0, 44) || 'voice';
  url.searchParams.set('audioFilename', `${safe}-${Date.now().toString(36)}.wav`); // unique, ≤ 64 chars
  url.searchParams.set('title', 'voicegift');
  if (process.env.TWM_ASR_MODEL) url.searchParams.set('modelName', process.env.TWM_ASR_MODEL);
  url.search += `&ticket=${encodeURIComponent(target.ticket)}`; // the doc asks for a URL-encoded ticket

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const segments = new Map(); // segment number → final transcript
    let taskId = null;
    let sent = false;
    let done = false;
    const finish = (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      if (err) return reject(err);
      const text = [...segments.keys()].sort((a, b) => a - b).map((k) => segments.get(k)).join(' ').replace(/\s+/g, ' ').trim();
      resolve({ text: text.slice(0, MAX_TEXT), taskId });
    };
    const timer = setTimeout(() => finish(segments.size ? null : new Error('TWM ASR timed out')), WS_TIMEOUT_MS);

    ws.onerror = () => finish(new Error('TWM ASR WebSocket error'));
    ws.onclose = () => finish(sent ? null : new Error('TWM ASR closed before the audio was sent'));
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string' || ev.data.length > 64 * 1024) return; // results are small JSON text frames
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (!m || typeof m !== 'object') return;
      if (m.taskId != null && cleanTaskId(m.taskId)) taskId = cleanTaskId(m.taskId);
      const code = Number(m.code);
      if (code === 180 && !sent) {
        // server ready: send the whole file, then tell it we are done
        sent = true;
        const buf = Buffer.from(wav);
        for (let i = 0; i < buf.length; i += FRAME) ws.send(buf.subarray(i, i + FRAME));
        ws.send('EOS');
      } else if (code === 200) {
        for (const r of Array.isArray(m.result) ? m.result : []) {
          if (Number(r?.final) === 1 && segments.size < 200) segments.set(Number(r.segment) || 0, String(r.transcript ?? '').slice(0, MAX_TEXT).trim());
        }
        if (Number(m.end) === 1) finish();
      } else if (code === 202 || code === 204) {
        finish(); // 202 = no words found, 204 = everything processed
      } else if (code >= 400) {
        finish(new Error(`TWM ASR ${code}: ${String(m.message || '').slice(0, 120)}`));
      }
    };
  });
}

// "00:00:01.070"
function stamp(sec) {
  const ms = Math.max(0, Math.round(Number(sec || 0) * 1000));
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`;
}
const isStamp = (s) => typeof s === 'string' && /^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(s);

// Saves the speaker's corrected caption as the task's "edited" transcript (the original stays on the ASR side).
// Our recordings are ≤ 90 s and the speaker fixes the caption as one text, so it is saved as one subtitle line over the speech; speaker + times are taken from
// the original transcript when it can be read.
export async function twmSaveCorrection(taskId, text, { startSec = 0, endSec = null } = {}) {
  const id = cleanTaskId(taskId);
  if (!id) throw new Error('Bad TWM task id');
  const base = `/api/v1/subtitle/tasks/${id}/subtitle-json`;
  let speaker = 'speaker_1';
  let speakers = [{ id: 0, speaker, color: '#3f8cbf' }];
  let start = stamp(startSec);
  let end = stamp(endSec ?? startSec + 1);
  try {
    const orig = await api('GET', base);
    const data = Array.isArray(orig.data) ? orig.data[0] : orig.data || orig;
    const lines = Array.isArray(data?.subtitle) ? data.subtitle : [];
    if (lines.length) {
      if (typeof lines[0].speaker === 'string' && lines[0].speaker.length <= 40) speaker = lines[0].speaker;
      if (isStamp(lines[0].startTime)) start = lines[0].startTime;
      if (isStamp(lines[lines.length - 1].endTime)) end = lines[lines.length - 1].endTime;
    }
    if (Array.isArray(data?.speakers) && data.speakers.length && data.speakers.length <= 10) speakers = data.speakers;
  } catch { /* fall back to our own speech times */ }
  return api('PUT', base, {
    category: 'dia',
    type: 'edited',
    subtitle: [{ id: 0, speaker, startTime: start, endTime: end, text: String(text).slice(0, MAX_TEXT) }],
    speakers
  });
}

// Service status, no login needed: { status, statusDesc, totalWorkers, availableWorkers, taskTotal, … }.
export async function twmHealth() {
  checkBase();
  const res = await fetch(`${BASE}/api/v1/health`, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
  const json = await res.json().catch(() => ({}));
  const d = json.data?.[0] || {};
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
  return {
    ok: res.ok && Number(json.code) === 200 && Number(d.status) === 1 && Number(d.totalWorkers) > 0,
    status: n(d.status), statusDesc: String(d.statusDesc ?? '').slice(0, 120),
    totalWorkers: n(d.totalWorkers), availableWorkers: n(d.availableWorkers),
    taskTotal: n(d.taskTotal), taskSuccess: n(d.taskSuccess), taskFailed: n(d.taskFailed), taskCanceled: n(d.taskCanceled)
  };
}

// Our latest recognitions on the ASR side (only the fields the admin page shows).
export async function twmRecentTasks(size = 15) {
  const q = new URLSearchParams({ pageIndex: '0', pageSize: String(Math.min(50, Math.max(1, size))), title: 'voicegift', sort: 'desc' });
  const json = await api('GET', `/api/v1/subtitle/tasks/streaming-record?${q}`, undefined, LIST_TIMEOUT_MS);
  return (Array.isArray(json.data) ? json.data : []).slice(0, 50).map((t) => ({
    id: cleanTaskId(t.id),
    status: String(t.statusDisp ?? t.status ?? '').slice(0, 40),
    healthy: Number(t.healthy) === 1,
    audioLength: Number(t.audioLength) || 0,
    wordCount: Number(t.wordCount) || 0,
    model: String(t.modelDisplayName || t.modelName || '').slice(0, 60),
    createTime: String(t.createTime || '').slice(0, 40),
    error: String(t.resultComment || '').slice(0, 120)
  }));
}
