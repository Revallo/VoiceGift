// Voices between friends: a short recording sent to one friend or to all of them, always with its words.
// Like a gift's message it goes through ASR and the speaker corrects the caption before it is sent, so every
// voice is a labeled example too (exported with kind "voice").
//
// voices/<id>/voice.json                 the recording's record: asrText, finalText, fromId, to [userId], replyTo…
// voices/<id>/audio.wav                  the clean 16 kHz mono WAV (moods are playback only)
// users/<id>/inbox/<ts>-<voiceId>.json   one per voice this account received { voiceId, at, heard }
// users/<id>/sent/<ts>-<voiceId>.json    one per voice this account sent     { voiceId, at }
//
// A voice is written to the inboxes only when its caption is saved (sendVoice), so a draft is never seen.
// Also here: the three steps every recording shares (gift messages, thank-yous, voices): readWav → asrFields → applyCaption.

import { getJSON, putJSON, listPaths, getObject, putObject, deleteObject } from './store.js';
import { HttpError, rawBody, cleanText } from './http.js';
import { rid, analyzeWav, CONSENT_VERSION } from './gifts.js';
import { transcribe, asrProvider, evenWords, computeCorrections } from './asr.js';
import { countRecording } from './limits.js';

// ---------- shared by every recording ----------

// The uploaded WAV, checked: readable, 0.8–20 s, not silent. Needs ?consent=1.
export async function readWav(req, q) {
  if (q.consent !== '1') throw new HttpError(400, 'Please allow saving your voice first.');
  const wav = await rawBody(req);
  const info = analyzeWav(wav);
  if (!info) throw new HttpError(400, 'The recording could not be read. Please record again.');
  if (info.durationSec < 0.8) throw new HttpError(400, 'That was too short. Please record again.');
  if (info.durationSec > 20) throw new HttpError(400, 'Recordings can be up to 15 seconds.');
  if (info.peak < 0.005) throw new HttpError(400, 'No voice detected. Speak a little louder.');
  return { wav, info };
}

// Counts the recording against the account's daily limit, runs ASR, and returns the fields every recording stores.
// `asrText` is written here once and never changed again: the difference with `finalText` is the training label.
export async function asrFields(req, user, { wav, info }, { recipient, occasion, hint } = {}) {
  const { durationSec, waveform, speechStartSec, speechEndSec } = info;
  await countRecording(user.id);
  let asr;
  try {
    asr = await transcribe({ wav, durationSec, recipient, occasion, speechStartSec, speechEndSec, clientHint: cleanText(hint, 300) });
  } catch (e) {
    console.error(e);
    asr = { text: '', words: [], typos: [] }; // never lose the recording because ASR failed
  }
  return {
    userId: user.id,
    durationSec: +durationSec.toFixed(2),
    speechStartSec,
    speechEndSec,
    waveform,
    asrProvider,
    asrText: asr.text,
    asrWords: asr.words,
    asrTypos: asr.typos || [],
    finalText: null,
    edited: false,
    corrections: [],
    consent: true,
    consentVersion: CONSENT_VERSION,
    userAgent: cleanText(req.headers['user-agent'], 300)
  };
}

// The caption the speaker checked: saved next to asrText, with the word-level differences.
export function applyCaption(rec, value, max = 400) {
  const text = cleanText(value, max);
  if (!text) throw new HttpError(400, 'The caption is empty.');
  rec.finalText = text;
  rec.edited = text !== (rec.asrText || '').trim();
  rec.corrections = computeCorrections(rec.asrText, text, rec.asrTypos);
  rec.finalWords = rec.edited
    ? evenWords(text, rec.durationSec, new Set(), rec.speechStartSec || 0, rec.speechEndSec || null)
    : rec.asrWords;
  return rec;
}

// Sends a WAV with Range support (iOS Safari asks for byte ranges before it plays audio).
export function sendWav(req, res, buf, maxAge = 3600) {
  const headers = { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Cache-Control': `private, max-age=${maxAge}` };
  const end = (status, body, extra) => { res.statusCode = status; for (const [k, v] of Object.entries({ ...headers, ...extra })) res.setHeader(k, v); res.end(body); };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (!range) return end(200, buf, { 'Content-Length': String(buf.length) });
  let start = range[1] === '' ? buf.length - Number(range[2]) : Number(range[1]);
  let last = range[1] !== '' && range[2] !== '' ? Number(range[2]) : buf.length - 1;
  start = Math.max(0, start);
  last = Math.min(buf.length - 1, last);
  if (start > last) return end(416, null, { 'Content-Range': `bytes */${buf.length}` });
  end(206, buf.subarray(start, last + 1), { 'Content-Range': `bytes ${start}-${last}/${buf.length}`, 'Content-Length': String(last - start + 1) });
}

// ---------- voices between friends ----------
const DRAFT_TTL_MS = 30 * 60 * 1000; // a recording never sent is removed after 30 minutes
const voicePath = (id) => `voices/${id}/voice.json`;
const stamp = () => Date.now().toString(36).padStart(9, '0');

export async function createVoice(rec, wav) {
  const id = rid(8);
  const audioPath = `voices/${id}/audio.wav`;
  await putObject(audioPath, wav, 'audio/wav');
  const full = { id, kind: 'voice', ...rec, audioPath, token: rid(10), createdAt: new Date().toISOString() };
  await putJSON(voicePath(id), full);
  return full;
}

export async function findVoice(id) {
  if (!/^[a-z0-9]{6,20}$/.test(String(id))) throw new HttpError(404, 'Voice not found');
  const voice = await getJSON(voicePath(id));
  if (!voice) throw new HttpError(404, 'Voice not found');
  return voice;
}

// The only door to a voice's audio and words: the person who sent it, and the friends it was sent to.
export const canHear = (voice, userId) => Boolean(userId) && (voice.fromId === userId || (voice.sentAt && voice.to.includes(userId)));

export const loadVoiceAudio = (voice) => getObject(voice.audioPath);

export async function deleteVoice(voice) {
  await deleteObject(voicePath(voice.id));
  await deleteObject(voice.audioPath);
}

// The caption is saved: the voice appears in each friend's inbox and in the sender's "Sent".
export async function sendVoice(voice) {
  const first = !voice.sentAt;
  voice.sentAt ||= new Date().toISOString();
  await putJSON(voicePath(voice.id), voice, { overwrite: true });
  if (!first) return;
  const name = `${stamp()}-${voice.id}.json`;
  await Promise.all([
    putJSON(`users/${voice.fromId}/sent/${name}`, { voiceId: voice.id, at: voice.sentAt }),
    ...voice.to.map((id) => putJSON(`users/${id}/inbox/${name}`, { voiceId: voice.id, at: voice.sentAt, heard: false }))
  ]);
}

// What a page may see of a voice (never the token, account ids or the raw ASR text).
const publicVoice = (voice, entry, mine) => ({
  id: voice.id,
  mine,
  from: voice.fromName,
  to: voice.toNames || [],
  toAll: Boolean(voice.toAll),
  text: voice.finalText,
  words: voice.finalWords?.length ? voice.finalWords : evenWords(voice.finalText, voice.durationSec),
  durationSec: voice.durationSec,
  mood: voice.mood || 'normal',
  replyTo: voice.replyText ? { from: voice.replyFrom, text: voice.replyText } : null,
  at: voice.sentAt,
  heard: mine ? true : Boolean(entry.heard)
});

// The account's voices, newest first: received (`box` "inbox") or sent ("sent"). Entries whose voice is gone are removed.
export async function listVoices(userId, box, max = 60) {
  const paths = (await listPaths(`users/${userId}/${box}/`)).reverse().slice(0, max);
  const items = await Promise.all(paths.map(async (path) => {
    const entry = await getJSON(path);
    const voice = entry && (await getJSON(voicePath(entry.voiceId)));
    if (!voice || !voice.finalText || !canHear(voice, userId)) {
      await deleteObject(path).catch(() => {});
      return null;
    }
    return publicVoice(voice, entry, box === 'sent');
  }));
  return items.filter(Boolean);
}

export async function markHeard(userId, voiceId) {
  const path = (await listPaths(`users/${userId}/inbox/`)).find((p) => p.endsWith(`-${voiceId}.json`));
  const entry = path && (await getJSON(path));
  if (entry && !entry.heard) await putJSON(path, { ...entry, heard: true }, { overwrite: true });
}

// Every sent voice, for the export. Drafts older than 30 minutes are removed on the way.
export async function listAllVoices() {
  const paths = (await listPaths('voices/')).filter((p) => p.endsWith('/voice.json'));
  const now = Date.now();
  const out = [];
  for (const p of paths) {
    const v = await getJSON(p);
    if (!v) continue;
    if (!v.finalText && now - Date.parse(v.createdAt) > DRAFT_TTL_MS) await deleteVoice(v).catch(() => {});
    else if (v.finalText) out.push(v);
  }
  return out;
}

// How much one account has recorded for friends (the profile's numbers).
export async function voiceStatsOf(userId) {
  const paths = await listPaths(`users/${userId}/sent/`);
  const voices = await Promise.all(paths.map(async (p) => { const e = await getJSON(p); return e && getJSON(voicePath(e.voiceId)); }));
  const sent = voices.filter((v) => v?.finalText);
  return {
    recordings: sent.length,
    audioSec: sent.reduce((s, v) => s + (Number(v.durationSec) || 0), 0),
    improved: sent.filter((v) => v.edited).length,
    words: sent.filter((v) => v.edited).reduce((s, v) => s + (v.corrections?.length || 1), 0)
  };
}
