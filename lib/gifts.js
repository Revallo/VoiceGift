// Gift + message model on top of the object store.
//
// gifts/<slug>/gift.json                 one per gift
// gifts/<slug>/msg/<ts>-<id>.json        one per message (overwritten when the caption is edited)
// gifts/<slug>/audio/<id>.wav            the recording (16 kHz mono WAV)

import crypto from 'node:crypto';
import { getJSON, putJSON, listPaths, getObject, putObject, deleteObject } from './store.js';
import { HttpError } from './http.js';
import { remember, forget } from './auth.js';

export const OCCASIONS = ['birthday', 'graduation', 'wedding', 'other'];
// demo-2026-10: "I allow my voice to be saved for this gift" (demo wording, does not mention ASR training).
// proto-2026-10 (before): "My voice and caption may be used to improve speech recognition."
export const CONSENT_VERSION = 'demo-2026-10';

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
    cake: input.cake,
    ownerId: input.ownerId, // the organizer's account
    manageKey: rid(12), // the organizer's dashboard link
    openKey: rid(10), // the recipient's link: the first account that opens it becomes the recipient
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

// May this request listen to the gift? Needs the recipient's key. (Gifts made before the key existed
// opened at a set time instead: unlockAt.)
export function canOpen(gift, key) {
  if (gift.openKey) return Boolean(key) && key === gift.openKey;
  return Boolean(gift.unlockAt) && Date.now() >= Date.parse(gift.unlockAt);
}

// Who is this signed-in user for this gift?
//   'owner'     the organizer (may preview, never claims it)
//   'recipient' the account that claimed it: opens it any time, even without the key
//   'claim'     nobody has claimed it yet and they have the recipient's link → they become the recipient
//   null        no access (e.g. a friend who changed /g/ into /r/, or the link reached someone else)
export function giftAccess(gift, user, key) {
  if (!user) return null;
  if (gift.ownerId && gift.ownerId === user.id) return 'owner';
  if (gift.recipientId) return gift.recipientId === user.id ? 'recipient' : null;
  return canOpen(gift, key) ? 'claim' : null;
}

export async function claimGift(gift, user) {
  Object.assign(gift, { recipientId: user.id, recipientAccount: { name: user.name, email: user.email }, claimedAt: new Date().toISOString() });
  await saveGift(gift);
  await remember(user.id, 'got', gift.slug, { slug: gift.slug });
}

// The organizer gives the gift back (wrong person opened it): a new recipient link, the old one stops working.
export async function unclaimGift(gift) {
  if (gift.recipientId) await forget(gift.recipientId, 'got', gift.slug);
  delete gift.recipientId;
  delete gift.recipientAccount;
  delete gift.claimedAt;
  gift.openKey = rid(10);
  await saveGift(gift);
}

// Length in seconds of a 44-byte-header PCM WAV (what the browser recorder writes), or null.
export function wavDuration(buf) {
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
  const byteRate = buf.readUInt32LE(28);
  if (!byteRate) return null;
  return (buf.length - 44) / byteRate;
}

// Public view of a gift (no keys).
export function publicGift(gift) {
  const { manageKey, openKey, unlockAt, ownerId, recipientId, recipientAccount, ...rest } = gift;
  return rest;
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

export async function deleteMessage(path, msg, slug) {
  await deleteObject(path);
  if (msg.audioPath) await deleteObject(msg.audioPath);
  if (msg.userId) await forget(msg.userId, 'sent', `${slug}-${msg.id}`);
}

// Deletes the whole gift: gift.json, every message and every recording (and it leaves everyone's account).
export async function deleteGift(gift) {
  for (const m of await loadMessages(gift.slug)) if (m.userId) await forget(m.userId, 'sent', `${gift.slug}-${m.id}`);
  if (gift.ownerId) await forget(gift.ownerId, 'made', gift.slug);
  if (gift.recipientId) await forget(gift.recipientId, 'got', gift.slug);
  for (const p of await listPaths(`gifts/${gift.slug}/`)) await deleteObject(p);
}

export async function loadAudio(msg) {
  return getObject(msg.audioPath);
}

export async function listAllGiftSlugs() {
  const paths = await listPaths('gifts/');
  return [...new Set(paths.filter((p) => p.endsWith('/gift.json')).map((p) => p.split('/')[1]))];
}
