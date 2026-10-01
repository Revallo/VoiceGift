// Gift + message model on top of the object store.
//
// gifts/<slug>/gift.json                 one per gift (overwritten only by "unlock now")
// gifts/<slug>/msg/<ts>-<id>.json        one per message (overwritten when the caption is edited)
// gifts/<slug>/audio/<id>.wav            the recording (16 kHz mono WAV)

import crypto from 'node:crypto';
import { getJSON, putJSON, listPaths, getObject, putObject, deleteObject } from './store.js';
import { HttpError } from './http.js';

export const FLAVORS = ['strawberry', 'chocolate', 'matcha', 'ube', 'vanilla', 'redvelvet'];
export const OCCASIONS = ['birthday', 'graduation', 'wedding', 'other'];
export const CONSENT_VERSION = 'proto-2026-10';

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
  const gift = {
    slug,
    recipient: input.recipient,
    occasion: input.occasion,
    organizer: input.organizer,
    unlockAt: input.unlockAt,
    cake: input.cake,
    manageKey: rid(12),
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

export function isUnlocked(gift, now = Date.now()) {
  return now >= Date.parse(gift.unlockAt);
}

// Public view of a gift (no secrets).
export function publicGift(gift) {
  const { manageKey, ...rest } = gift;
  return { ...rest, unlocked: isUnlocked(gift) };
}

async function messagePaths(slug) {
  return listPaths(`gifts/${slug}/msg/`);
}

export async function countMessages(slug) {
  return (await messagePaths(slug)).length;
}

export async function loadMessages(slug) {
  const paths = await messagePaths(slug);
  const items = await Promise.all(paths.map((p) => getJSON(p).then((m) => (m ? { ...m, _path: p } : null))));
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

export async function loadAudio(msg) {
  return getObject(msg.audioPath);
}

export async function listAllGiftSlugs() {
  const paths = await listPaths('gifts/');
  return [...new Set(paths.filter((p) => p.endsWith('/gift.json')).map((p) => p.split('/')[1]))];
}
