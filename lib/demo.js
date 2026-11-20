// Demo voices: made once with TTS (demo/voices.json + demo/<occasion>-NN.wav, bundled with the functions via
// `includeFiles` in vercel.json). They are never written to storage: a gift only keeps `demo: { at, hidden }` in its
// gift.json, and the messages are built here on every read. That keeps "+ Add demo voices" at one storage write
// instead of two per voice.
// Demo messages are marked demo: true, so they are never training data (export and stats skip them) and get no thank-you.

import fs from 'node:fs/promises';
import path from 'node:path';
import { evenWords } from './asr.js';
import { CONSENT_VERSION } from './gifts.js';

const DEMO_DIR = path.join(process.cwd(), 'demo');
export const DEMO_COUNT = 5; // five different voices, each with its own mood (was 20, decided 2026-11-19)
const MOODS = ['normal', 'dangdut', 'sad', 'helium', 'toa', 'normal', 'angry', 'alien', 'horror', 'arcade'];
const CANDLES = [
  { body: 'stripe', flame: 'classic', shape: 'drop' }, { body: 'gold', flame: 'rainbow', shape: 'sparkler' },
  { body: 'dots', flame: 'blue', shape: 'round' }, { body: 'swirl', flame: 'pink', shape: 'heart' },
  { body: 'plain', flame: 'green', shape: 'tall' }, { body: 'tall', flame: 'purple', shape: 'star' },
  { body: 'chunky', flame: 'classic', shape: 'twin' }, { body: 'stripe', flame: 'ice', shape: 'drop' },
  { body: 'gold', flame: 'classic', shape: 'heart' }, { body: 'dots', flame: 'rainbow', shape: 'star' }
];

export const isDemoId = (id) => /^demo\d{2}$/.test(String(id));

let scripts;
const durations = new Map();

async function samples(occasion) {
  scripts ||= JSON.parse(await fs.readFile(path.join(DEMO_DIR, 'voices.json'), 'utf8'));
  const key = Array.isArray(scripts[occasion]) ? occasion : 'birthday';
  return { key, list: scripts[key] };
}

async function durationOf(file) {
  if (!durations.has(file)) {
    // only the header is needed for the length
    const fh = await fs.open(file);
    try {
      const { size } = await fh.stat();
      const head = Buffer.alloc(44);
      await fh.read(head, 0, 44, 0);
      const perSec = head.toString('ascii', 8, 12) === 'WAVE' ? head.readUInt32LE(28) : 0; // byte rate
      durations.set(file, perSec ? +((size - 44) / perSec).toFixed(2) : 3);
    } finally {
      await fh.close();
    }
  }
  return durations.get(file);
}

// The gift's demo messages (none unless the organizer added them), shaped like stored messages.
export async function demoMessages(gift) {
  if (!gift?.demo) return [];
  const { key, list } = await samples(gift.occasion);
  const hidden = new Set(gift.demo.hidden || []);
  const start = Date.parse(gift.demo.at) || Date.now();
  const out = [];
  for (let i = 0; i < DEMO_COUNT; i++) {
    const id = `demo${String(i).padStart(2, '0')}`;
    if (hidden.has(id)) continue;
    const source = i % list.length;
    const sample = list[source];
    const file = path.join(DEMO_DIR, `${key}-${String(source + 1).padStart(2, '0')}.wav`);
    const durationSec = await durationOf(file);
    const words = evenWords(sample.text, durationSec);
    out.push({
      id, sender: i < list.length ? sample.name : `${sample.name} · demo 2`, durationSec,
      asrProvider: 'demo', asrText: sample.text, asrWords: words, finalText: sample.text, finalWords: words,
      edited: false, corrections: [],
      mood: MOODS[i % MOODS.length], candle: CANDLES[i % CANDLES.length],
      flower: { type: ['round', 'tulip', 'rose', 'daisy'][i % 4], color: ['pink', 'gold', 'mint', 'blue', 'lilac'][i % 5] },
      lantern: { color: ['gold', 'pink', 'mint', 'blue', 'lilac'][i % 5] },
      dish: { type: ['satay', 'ketupat', 'chicken', 'egg', 'lontong', 'tempeh', 'perkedel', 'krupuk'][i % 8] },
      consent: true, consentVersion: CONSENT_VERSION, demo: true, demoFile: file,
      createdAt: new Date(start + i).toISOString(), sentAt: gift.demo.at
    });
  }
  return out;
}

export const demoAudio = (msg) => fs.readFile(msg.demoFile);
