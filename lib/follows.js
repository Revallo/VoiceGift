// Following: who an account follows, shown as the strip of friends on the home page and offered on the
// Record tab ("a new gift for a friend").
//
// users/<id>/following/<otherId>.json   { id, at }: one per person this account follows
// users/<id>/followers/<otherId>.json   { id, at }: the same link, seen from the other side
//
// Following never lets anyone hear anything: a gift only opens for the recipient's key + PIN (canOpen in gifts.js).
// Other people only ever see publicProfile(): a handle, a name, a line about them. Never an email or an id.

import { getJSON, putJSON, listPaths, deleteObject } from './store.js';
import { HttpError } from './http.js';
import { loadGift, loadMessages } from './gifts.js';
import { publicProfile, userById, giftSlugs, listSent } from './accounts.js';

const MAX_FOLLOWING = 500;
const followingPath = (id, other) => `users/${id}/following/${other}.json`;
const followerPath = (id, other) => `users/${id}/followers/${other}.json`;
const idsUnder = async (prefix) => (await listPaths(prefix)).map((p) => p.slice(p.lastIndexOf('/') + 1, -'.json'.length));

export const followingIds = (userId) => idsUnder(`users/${userId}/following/`);

export async function isFollowing(userId, otherId) {
  return Boolean(await getJSON(followingPath(userId, otherId)));
}

export async function follow(user, other) {
  if (user.id === other.id) throw new HttpError(400, 'That’s you.');
  if (await isFollowing(user.id, other.id)) return;
  if ((await followingIds(user.id)).length >= MAX_FOLLOWING) throw new HttpError(400, 'You follow a lot of people already.');
  const link = { at: new Date().toISOString() };
  await putJSON(followingPath(user.id, other.id), { id: other.id, ...link }, { overwrite: true });
  await putJSON(followerPath(other.id, user.id), { id: user.id, ...link }, { overwrite: true });
}

export async function unfollow(user, other) {
  await deleteObject(followingPath(user.id, other.id));
  await deleteObject(followerPath(other.id, user.id));
}

async function profilesOf(ids) {
  const users = await Promise.all(ids.map((id) => userById(id)));
  return Promise.all(users.filter(Boolean).map((u) => publicProfile(u)));
}

// The people an account follows, as public profiles, by name.
export async function listFollowing(userId) {
  return (await profilesOf(await followingIds(userId))).sort((a, b) => a.name.localeCompare(b.name));
}

// People this account already knows through a gift and doesn't follow yet:
// whoever made a gift it recorded for, and whoever recorded for a gift it made.
// (Not the other friends on someone else's gift: who else recorded there is not theirs to know.)
export async function suggestions(user, max = 12) {
  const ids = new Set();
  const sentSlugs = [...new Set((await listSent(user.id)).map((s) => s.slug))].slice(0, 20);
  await Promise.all(sentSlugs.map(async (slug) => {
    const gift = await loadGift(slug).catch(() => null);
    if (gift?.ownerId) ids.add(gift.ownerId);
  }));
  const madeSlugs = (await giftSlugs(user.id)).slice(-20);
  await Promise.all(madeSlugs.map(async (slug) => {
    const msgs = await loadMessages(slug).catch(() => []);
    for (const m of msgs) if (m.userId && m.finalText) ids.add(m.userId);
  }));
  ids.delete(user.id);
  for (const id of await followingIds(user.id)) ids.delete(id);
  return profilesOf([...ids].slice(0, max));
}
