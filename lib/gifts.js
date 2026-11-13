// Gift + message model on top of the object store.
//
// gifts/<slug>/gift.json                 one per gift
// gifts/<slug>/msg/<ts>-<id>.json        one per message (overwritten when the caption is edited)
// gifts/<slug>/audio/<id>.wav            the recording (16 kHz mono WAV)

import crypto from 'node:crypto';
import { getJSON, putJSON, listPaths, getObject, putObject, deleteObject } from './store.js';
import { HttpError } from './http.js';

export const OCCASIONS = ['birthday', 'graduation', 'wedding', 'other'];
export const CONSENT_VERSION = 'asr-2026-11';
const ORPHAN_TTL_MS = 30 * 60 * 1000; // 30 minutes for abandoned unsent recordings

// What a friend may add after recording. The mood is only a playback effect (public/assets/voicefx.js):
// the stored WAV is never changed, it stays clean ASR training data. Same keys as voicefx.js MOODS / cake.js CANDLES, FLAMES.
export const MOOD_KEYS = ['normal', 'angry', 'sad', 'chipmunk', 'giant', 'robot', 'radio', 'stadium'];
export const CANDLE_KEYS = ['stripe', 'plain', 'dots', 'swirl', 'gold', 'tall', 'chunky'];
export const FLAME_KEYS = ['classic', 'blue', 'pink', 'green', 'rainbow', 'heart', 'sparkler'];
export const cleanMood = (m) => (MOOD_KEYS.includes(m) ? m : 'normal');
export function cleanCandle(c) {
  if (!c || typeof c !== 'object') return null;
  const body = CANDLE_KEYS.includes(c.body) ? c.body : 'stripe';
  const flame = FLAME_KEYS.includes(c.flame) ? c.flame : 'classic';
  return { body, flame };
}

export function rid(bytes = 8) {
  return crypto.randomBytes(bytes).toString('base64url').replace(/[-_]/g, '').slice(0, Math.ceil(bytes * 1.3)).toLowerCase();
}

function slugify(name) {
  const base = String(name).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
  return `${base || 'gift'}-${rid(3).slice(0, 4)}`;
}

export function isSlug(s) {
  return typeof s === 'string' && /^[a-z0-9-]{3,40}$/.test(s);
}

const giftPath = (slug) => `gifts/${slug}/gift.json`;

export async function createGift(input) {
  const slug = slugify(input.recipient);
  const rawPin = String(input.verifyPin || input.verifyAnswer || '1234').replace(/\D/g, '').slice(0, 4);
  const gift = {
    slug,
    recipient: input.recipient,
    occasion: input.occasion,
    organizer: input.organizer,
    cake: input.cake,
    verifyPin: rawPin.length === 4 ? rawPin : '1234',
    ownerId: input.ownerId, // the organizer's account (lib/accounts.js)
    manageKey: rid(12), // the organizer's dashboard link
    openKey: rid(10), // the recipient's link: whoever has it can listen
    createdAt: new Date().toISOString()
  };
  await putJSON(giftPath(slug), gift);
  return gift;
}

export async function loadGift(slug) {
  if (!isSlug(slug)) throw new HttpError(404, 'Gift not found');
  const gift = await getJSON(giftPath(slug));
  if (!gift) throw new HttpError(404, 'Gift not found');
  return gift;
}

export async function saveGift(gift) {
  await putJSON(giftPath(gift.slug), gift, { overwrite: true });
}

export function checkVerifyPin(gift, pin) {
  const got = String(pin ?? '').trim();
  if (!got) return false;
  const expected = String(gift.verifyPin || '1234').trim();
  return got === expected;
}
export const checkVerifyAnswer = checkVerifyPin;

// May this request listen to the gift? Only the recipient: their link's key AND the 4-digit PIN.
// Friends know the slug, so neither the slug nor an account is ever enough. (Gifts from before the PIN: the key alone;
// gifts from before the key: their unlockAt.)
export function canOpen(gift, key, { pin = '' } = {}) {
  if (gift.openKey) {
    if (!key || key !== gift.openKey) return false;
    return gift.verifyPin ? checkVerifyPin(gift, pin) : true;
  }
  return Boolean(gift.unlockAt) && Date.now() >= Date.parse(gift.unlockAt);
}

// Length in seconds of a 44-byte-header PCM WAV (what the browser recorder writes), or null.
export function wavDuration(buf) {
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
  const byteRate = buf.readUInt32LE(28);
  if (!byteRate) return null;
  return (buf.length - 44) / byteRate;
}

// Extracts VAD speech boundaries (start/end seconds), RMS energy, and a 32-bar waveform envelope from 16-bit PCM WAV.
export function analyzeWav(buf, barsCount = 32) {
  const durationSec = wavDuration(buf);
  if (durationSec === null) return null;
  const totalSamples = Math.floor((buf.length - 44) / 2);
  if (totalSamples <= 0) return { durationSec, rms: 0, peak: 0, speechStartSec: 0, speechEndSec: durationSec, waveform: Array(barsCount).fill(20) };

  const blockSize = Math.max(1, Math.floor(totalSamples / barsCount));
  const blockRms = [];
  let sumSqAll = 0;
  let peakAll = 0;

  for (let b = 0; b < barsCount; b++) {
    const start = b * blockSize;
    const end = b === barsCount - 1 ? totalSamples : Math.min(totalSamples, (b + 1) * blockSize);
    let sumSq = 0;
    const count = Math.max(1, end - start);
    const stride = Math.max(1, Math.floor(count / 200));
    let sampled = 0;
    for (let i = start; i < end; i += stride) {
      const v = buf.readInt16LE(44 + i * 2) / 32768;
      const abs = Math.abs(v);
      if (abs > peakAll) peakAll = abs;
      sumSq += v * v;
      sampled++;
    }
    const r = Math.sqrt(sumSq / Math.max(1, sampled));
    blockRms.push(r);
    sumSqAll += r * r;
  }

  const rms = Math.sqrt(sumSqAll / barsCount);
  const maxBlock = Math.max(0.01, ...blockRms);
  const waveform = blockRms.map((r) => Math.max(14, Math.min(100, Math.round((r / maxBlock) * 92 + 8))));

  // Voice Activity Detection (VAD) window for accurate word-level karaoke timing
  const vadThreshold = Math.max(0.008, maxBlock * 0.18);
  let firstActive = blockRms.findIndex((r) => r >= vadThreshold);
  let lastActive = -1;
  for (let b = blockRms.length - 1; b >= 0; b--) {
    if (blockRms[b] >= vadThreshold) { lastActive = b; break; }
  }
  if (firstActive === -1) { firstActive = 0; lastActive = barsCount - 1; }
  const speechStartSec = +((firstActive / barsCount) * durationSec).toFixed(2);
  const speechEndSec = +(((lastActive + 1) / barsCount) * durationSec).toFixed(2);

  return { durationSec, rms, peak: peakAll, speechStartSec, speechEndSec, waveform };
}

// Public view of a gift (no secret keys, no raw verification PIN).
export function publicGift(gift) {
  const { manageKey, openKey, unlockAt, ownerId, verifyPin, verifyQuestion, verifyAnswer, thanks, ...rest } = gift;
  return {
    ...rest,
    pinLength: String(verifyPin || '1234').length,
    hasVerification: true
  };
}

async function messagePaths(slug) {
  return listPaths(`gifts/${slug}/msg/`);
}

export async function countMessages(slug) {
  const msgs = await loadMessages(slug);
  return msgs.filter((m) => m.finalText).length || msgs.length;
}

export async function loadMessages(slug) {
  const paths = await messagePaths(slug);
  const now = Date.now();
  const items = await Promise.all(paths.map(async (p) => {
    const m = await getJSON(p);
    if (!m) return null;
    // Auto-prune abandoned unsent recordings older than 30 minutes
    if (!m.finalText && !m.demo && now - Date.parse(m.createdAt) > ORPHAN_TTL_MS) {
      await deleteMessage(p, m).catch(() => {});
      return null;
    }
    return { ...m, _path: p };
  }));
  return items.filter(Boolean).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function findMessage(slug, id) {
  if (!/^[a-z0-9]{6,20}$/.test(String(id))) throw new HttpError(404, 'Message not found');
  const paths = await messagePaths(slug);
  const p = paths.find((x) => x.endsWith(`-${id}.json`));
  if (!p) throw new HttpError(404, 'Message not found');
  const msg = await getJSON(p);
  if (!msg) throw new HttpError(404, 'Message not found');
  return { msg, path: p };
}

export async function createMessage(slug, msg, wav) {
  const id = rid(8);
  const ts = Date.now().toString(36).padStart(9, '0');
  const audioPath = `gifts/${slug}/audio/${id}.wav`;
  await putObject(audioPath, wav, 'audio/wav');
  const full = { id, ...msg, audioPath, token: rid(10), createdAt: new Date().toISOString() };
  await putJSON(`gifts/${slug}/msg/${ts}-${id}.json`, full);
  return full;
}

export async function updateMessage(path, msg) {
  await putJSON(path, msg, { overwrite: true });
}

export async function deleteMessage(path, msg) {
  await deleteObject(path);
  if (msg.audioPath) await deleteObject(msg.audioPath);
}

// Deletes the whole gift: gift.json, every message and every recording.
export async function deleteGift(slug) {
  for (const p of await listPaths(`gifts/${slug}/`)) await deleteObject(p);
}

export async function loadAudio(msg) {
  return getObject(msg.audioPath);
}

export async function listAllGiftSlugs() {
  const paths = await listPaths('gifts/');
  return [...new Set(paths.filter((p) => p.endsWith('/gift.json')).map((p) => p.split('/')[1]))];
}
