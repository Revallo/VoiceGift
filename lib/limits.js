// Limits that protect storage, the ASR quota and the training data from floods (one friend recording 50 times).
// Signing up and emails have no daily cap (decided 2026-11-12); emails only wait a minute between two of a kind
// (lib/accounts.js). Brevo's free tier still stops at 300 emails a day in all. Counters live in storage, so they hold across serverless instances.
// Two requests at the same moment can both pass (storage is last-write-wins): fine for limits this loose.
//
// limits/<name>/<sha256(who)>-<period>.json   { n }

import crypto from 'node:crypto';
import { getJSON, putJSON } from './store.js';
import { HttpError } from './http.js';

export const LIMITS = {
  recordingsPerGift: 3, // one account's voices in one gift (drafts count, "record again" frees one)
  recordingsPerDay: 20, // one account, every gift: each one is an ASR call
  giftsPerDay: 10 // gifts one account creates
};

const day = () => new Date().toISOString().slice(0, 10);
const path = (name, who, period) => `limits/${name}/${crypto.createHash('sha256').update(String(who)).digest('hex').slice(0, 32)}-${period}.json`;

// Counts one more use; throws 429 with `message` when `max` were already used in this period.
async function bump(name, who, period, max, message) {
  const p = path(name, who, period);
  const n = (await getJSON(p))?.n || 0;
  if (n >= max) throw new HttpError(429, message);
  await putJSON(p, { n: n + 1 }, { overwrite: true });
}

export const countRecording = (userId) =>
  bump('recordings', userId, day(), LIMITS.recordingsPerDay, 'You’ve recorded a lot today. Please try again tomorrow.');

export const countGift = (userId) =>
  bump('gifts', userId, day(), LIMITS.giftsPerDay, 'You’ve made a lot of gifts today. Please try again tomorrow.');
