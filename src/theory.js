// Music theory helpers: notes, interval classification and question generators.
// A note is { step, acc, oct }: step 0..6 = C D E F G A H, acc -1/0/+1, oct like scientific pitch (C4 = middle C).

export const STEP_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const GERMAN_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];
const VF_LETTERS = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];

export const INTERVALS = [
  { id: 'prime', name: 'Prime', steps: 0, semitones: [0] },
  { id: 'sekunde', name: 'Sekunde', steps: 1, semitones: [1, 2] },
  { id: 'terz', name: 'Terz', steps: 2, semitones: [3, 4] },
  { id: 'quarte', name: 'Quarte', steps: 3, semitones: [5] },
  { id: 'tritonus', name: 'Tritonus', steps: null, semitones: [6] },
  { id: 'quinte', name: 'Quinte', steps: 4, semitones: [7] },
  { id: 'sexte', name: 'Sexte', steps: 5, semitones: [8, 9] },
  { id: 'septime', name: 'Septime', steps: 6, semitones: [10, 11] },
  { id: 'oktave', name: 'Oktave', steps: 7, semitones: [12] },
];
export const INTERVAL_IDS = INTERVALS.map((i) => i.id);
export const intervalById = (id) => INTERVALS.find((i) => i.id === id);

// Key signatures: accidental per step.
export const KEYS = {
  C: {},
  G: { 3: 1 },
  F: { 6: -1 },
  D: { 3: 1, 0: 1 },
};

export const note = (step, acc, oct) => ({ step, acc, oct });
export const dia = (n) => n.oct * 7 + n.step;
export const midi = (n) => 12 * (n.oct + 1) + STEP_SEMITONES[n.step] + n.acc;
export const fromDia = (d, acc = 0) => note(((d % 7) + 7) % 7, acc, Math.floor(d / 7));
export const sameNote = (a, b) => a.step === b.step && a.acc === b.acc && a.oct === b.oct;

export function germanName(n) {
  const base = GERMAN_LETTERS[n.step];
  if (n.acc === 0) return base;
  if (n.acc > 0) return base + 'is';
  // flats: B (=Hb), Es, As are irregular
  if (n.step === 6) return 'B';
  if (n.step === 2) return 'Es';
  if (n.step === 5) return 'As';
  return base + 'es';
}

// German name for a piano key (midi), preferring sharps except B.
export function germanNameForMidi(m) {
  const names = ['C', 'Cis', 'D', 'Es', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'B', 'H'];
  return names[((m % 12) + 12) % 12];
}

export const vfKey = (n) => `${VF_LETTERS[n.step]}${n.acc > 0 ? '#' : n.acc < 0 ? 'b' : ''}/${n.oct}`;

// Category from semitone distance only (ear training / playing on the piano).
export function categoryFromSemitones(s) {
  s = Math.abs(s);
  return INTERVALS.find((i) => i.semitones.includes(s))?.id ?? null;
}

// Category of a written interval: count staff positions; 6 semitones over a 4th/5th is Tritonus.
export function classify(a, b) {
  const steps = Math.abs(dia(b) - dia(a));
  const semis = Math.abs(midi(b) - midi(a));
  if (semis === 6 && (steps === 3 || steps === 4)) return 'tritonus';
  return INTERVALS.find((i) => i.steps === steps)?.id ?? null;
}

// A "clean" interval: one the test would use (no augmented/diminished except the Tritonus).
export function isClean(a, b) {
  const [lo, hi] = dia(a) <= dia(b) ? [a, b] : [b, a];
  const steps = dia(hi) - dia(lo);
  const semis = midi(hi) - midi(lo);
  const id = classify(lo, hi);
  if (!id) return false;
  if (id === 'tritonus') return true;
  if (steps === 0) return semis === 0;
  return intervalById(id).semitones.includes(semis);
}

// Notes from the staff positions lo..hi (inclusive) of a key; with chromatic, also ±1 from the key's accidental.
export function noteCandidates(key, loDia, hiDia, chromatic = false) {
  const out = [];
  for (let d = loDia; d <= hiDia; d++) {
    const step = ((d % 7) + 7) % 7;
    const keyAcc = KEYS[key][step] ?? 0;
    out.push({ n: fromDia(d, keyAcc), chromatic: false });
    if (chromatic) {
      for (const acc of [keyAcc - 1, keyAcc + 1]) {
        if (Math.abs(acc) <= 1) out.push({ n: fromDia(d, acc), chromatic: true });
      }
    }
  }
  return out;
}

export const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// All clean written pairs [first, second] of the given category inside the range.
export function cleanPairs(id, { key = 'C', loDia = 28, hiDia = 40, chromatic = false, direction = 'any' } = {}) {
  const cands = noteCandidates(key, loDia, hiDia, chromatic);
  const pairs = [];
  for (const a of cands) {
    for (const b of cands) {
      const up = dia(b.n) > dia(a.n) || (dia(b.n) === dia(a.n) && midi(b.n) >= midi(a.n));
      if (direction === 'up' && !up) continue;
      if (direction === 'down' && up) continue;
      if (id === 'prime' && !sameNote(a.n, b.n)) continue;
      if (classify(a.n, b.n) !== id || !isClean(a.n, b.n)) continue;
      pairs.push({ pair: [a.n, b.n], chromatic: a.chromatic || b.chromatic });
    }
  }
  return pairs;
}

// Pick a random clean pair; chromatic ones only sometimes, so most questions stay in the key.
export function randomPair(id, opts = {}) {
  const all = cleanPairs(id, opts);
  const plain = all.filter((p) => !p.chromatic);
  const fancy = all.filter((p) => p.chromatic);
  const pool = fancy.length && (!plain.length || Math.random() < 0.3) ? fancy : plain;
  return rand(pool).pair;
}

// A short melody (array of items; each item is an array of notes, two notes = chord) with a marked interval.
export function generateMelody({ id, key = 'C', harmonic = false, chromatic = false, loDia = 28, hiDia = 40 }) {
  if (harmonic && id === 'prime') harmonic = false;
  const opts = { key, loDia, hiDia, chromatic, direction: harmonic ? 'up' : 'any' };
  const pair = randomPair(id, opts);
  const len = randInt(6, 8);
  const span = harmonic ? 1 : 2;
  const pos = randInt(0, len - span);
  const scaleNote = (d) => fromDia(d, KEYS[key][((d % 7) + 7) % 7] ?? 0);
  const walk = (from, count) => {
    const out = [];
    let d = dia(from);
    for (let i = 0; i < count; i++) {
      const options = [-2, -1, 1, 2, 3, -3].map((s) => d + s).filter((x) => x >= loDia && x <= hiDia);
      d = rand(options);
      out.push([scaleNote(d)]);
    }
    return out;
  };
  const before = walk(pair[0], pos).reverse();
  const middle = harmonic ? [[pair[0], pair[1]]] : [[pair[0]], [pair[1]]];
  const after = walk(pair[1], len - pos - span);
  const items = [...before, ...middle, ...after];
  const marked = harmonic ? [pos] : [pos, pos + 1];
  return { items, marked, pair, id, harmonic, key };
}

// Steps between two written notes, low to high, for the explanation ("C 1, D 2, E 3 → Terz").
export function countSteps(a, b) {
  const [lo, hi] = dia(a) <= dia(b) ? [a, b] : [b, a];
  const out = [];
  for (let d = dia(lo); d <= dia(hi); d++) out.push(GERMAN_LETTERS[((d % 7) + 7) % 7]);
  return out;
}

// Check two played piano keys against the target pair.
// exact: same pitches (any order); interval: same semitone distance anywhere.
export function checkPlayed(played, target, mode = 'exact') {
  if (played.length !== 2) return false;
  const t = target.map((n) => (typeof n === 'number' ? n : midi(n)));
  if (mode === 'exact') {
    const a = [...played].sort((x, y) => x - y);
    const b = [...t].sort((x, y) => x - y);
    return a[0] === b[0] && a[1] === b[1];
  }
  return Math.abs(played[1] - played[0]) === Math.abs(t[1] - t[0]);
}
