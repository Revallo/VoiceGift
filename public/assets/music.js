// Short instrumental loops, played with Web Audio (no sound files). gift.cake.music is a key of TUNES.
import { tone } from './common.js';

const N = { G3: 196, A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880 };
const seq = (s) => s.split(' ').map((c) => (c === '-' ? null : c.split('+').map((k) => N[k])));

export const TUNES = {
  none: { label: 'No music' },
  party: { label: 'Party', beat: 0.19, notes: seq('C4+E5 G4 E5 G4 D5 G4 C5 - A3+C5 E4 C5 E4 D5 E4 E5 - F4+A4 C5 A4 C5 G3+B4 D5 B4 G5 C4+C5 E4 G4 C5 E5 - C5 -') },
  musicbox: { label: 'Music box', beat: 0.3, vol: 0.12, notes: seq('E5 G5 C5 G5 D5 G5 B4 G5 C5 E5 A4 E5 B4 D5 G4 D5') },
  waltz: { label: 'Waltz', beat: 0.27, notes: seq('C4+E5 G4 C5 C4+D5 G4 C5 A3+C5 E4 A4 A3+B4 E4 A4 F4+A4 C5 F4 G3+B4 D5 G4') },
  dreamy: { label: 'Dreamy', beat: 0.42, vol: 0.11, notes: seq('C4+G4 E5 A3+E4 C5 F4+A4 D5 G3+G4 B4') }
};

// Starts a tune; returns a function that stops it.
export function playTune(ac, key, { loop = true } = {}) {
  const tune = TUNES[key];
  if (!ac || !tune?.notes) return () => {};
  let i = 0, timer = 0, stopped = false;
  const tick = () => {
    if (stopped) return;
    if (!loop && i >= tune.notes.length) return;
    for (const f of tune.notes[i % tune.notes.length] || []) tone(ac, f, 0, tune.beat * 3, tune.vol || 0.11);
    i++;
    timer = setTimeout(tick, tune.beat * 1000);
  };
  tick();
  return () => { stopped = true; clearTimeout(timer); };
}
