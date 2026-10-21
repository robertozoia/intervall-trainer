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

// Sound colour groups for ear training: decide the group first, then narrow or wide.
export const SOUND_GROUPS = [
  { id: 'rau', members: ['sekunde', 'septime'] },
  { id: 'suess', members: ['terz', 'sexte'] },
  { id: 'hohl', members: ['prime', 'quarte', 'quinte', 'oktave'] },
  { id: 'gespannt', members: ['tritonus'] },
];
export const groupOf = (id) => SOUND_GROUPS.find((g) => g.members.includes(id));
export const intervalById = (id) => INTERVALS.find((i) => i.id === id);

// Key signatures: accidental per step.
export const KEYS = {
  C: {},
  G: { 3: 1 },
  F: { 6: -1 },
  D: { 3: 1, 0: 1 },
  A: { 3: 1, 0: 1, 4: 1 },
  Bb: { 6: -1, 2: -1 },
  Eb: { 6: -1, 2: -1, 5: -1 },
};
export const LEVEL1_KEYS = ['C', 'G', 'F', 'D'];
export const LEVEL2_KEYS = Object.keys(KEYS);

// Spellings a beginner never meets (Eis, His, Fes, Ces).
const ODD = new Set(['2:1', '6:1', '3:-1', '0:-1']);
const isOdd = (n) => ODD.has(`${n.step}:${n.acc}`);

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
        const n = fromDia(d, acc);
        if (Math.abs(acc) <= 1 && !isOdd(n)) out.push({ n, chromatic: true });
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
// Level 1: quarter notes only. Level 2: bars, rhythms, rests, ledger lines and bigger leaps.
export function generateMelody(opts) {
  if (opts.harmonic && opts.id === 'prime') opts = { ...opts, harmonic: false };
  return opts.level === 2 ? generateMelody2(opts) : generateMelody1(opts);
}

function generateMelody1({ id, key = 'C', harmonic = false, chromatic = false, loDia = 28, hiDia = 40 }) {
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

// Durations are counted in eighths: 1 = eighth, 2 = quarter, 3 = dotted quarter, 4 = half, 6 = dotted half.
export const TIME_SIGNATURES = { '4/4': 8, '3/4': 6, '2/4': 4 };
const BARS = { '4/4': 2, '3/4': 3, '2/4': 3 };
export const LEVEL2_RANGE = { loDia: 26, hiDia: 42 }; // A3 .. C6

function rhythmBar(eighths, last) {
  const out = [];
  let left = last ? eighths - (eighths === 6 && Math.random() < 0.5 ? 6 : 4) : eighths;
  while (left > 0) {
    if (left >= 4 && Math.random() < 0.3) {
      out.push(...rand([[4], [3, 1]]));
      left -= 4;
    } else {
      out.push(...rand([[2], [2], [1, 1]]));
      left -= 2;
    }
  }
  if (last) out.push(eighths - out.reduce((a, b) => a + b, 0));
  return out;
}

// Rhythm skeleton: slots { dur, rest } over 2–3 bars; occasional quarter rests, never first or last.
export function generateRhythm(timeSig) {
  const eighths = TIME_SIGNATURES[timeSig];
  const bars = BARS[timeSig];
  const slots = [];
  for (let b = 0; b < bars; b++) {
    for (const dur of rhythmBar(eighths, b === bars - 1)) slots.push({ dur, rest: false });
  }
  slots.forEach((s, i) => {
    if (i > 0 && i < slots.length - 1 && s.dur === 2 && Math.random() < 0.12) s.rest = true;
  });
  return slots;
}

function generateMelody2({ id, key = 'C', harmonic = false, chromatic = true }) {
  const { loDia, hiDia } = LEVEL2_RANGE;
  const timeSig = rand(Object.keys(TIME_SIGNATURES));
  const slots = generateRhythm(timeSig);
  const span = harmonic ? 1 : 2;
  const starts = [];
  for (let k = 0; k + span <= slots.length; k++) {
    // a chord is never an eighth note, so it stands out on its own
    if (slots.slice(k, k + span).every((s) => !s.rest) && (!harmonic || slots[k].dur >= 2)) starts.push(k);
  }
  const pos = rand(starts);
  const pair = randomPair(id, { key, loDia, hiDia, chromatic, direction: harmonic ? 'up' : 'any' });

  const keyAcc = (d) => KEYS[key][((d % 7) + 7) % 7] ?? 0;
  const pitch = (d) => {
    let n = fromDia(d, keyAcc(d));
    if (chromatic && Math.random() < 0.12) {
      const alt = fromDia(d, keyAcc(d) + rand([-1, 1]));
      if (Math.abs(alt.acc) <= 1 && !isOdd(alt)) n = alt;
    }
    return n;
  };
  const items = slots.map(() => []);
  const fill = (from, indexes) => {
    let d = dia(from);
    for (const i of indexes) {
      if (slots[i].rest) continue;
      const options = [-5, -4, -3, -2, -1, 1, 2, 2, 3, 4, 5, -2, -1, 1].map((s) => d + s).filter((x) => x >= loDia && x <= hiDia);
      d = rand(options);
      items[i] = [pitch(d)];
    }
  };
  if (harmonic) items[pos] = [pair[0], pair[1]];
  else [items[pos], items[pos + 1]] = [[pair[0]], [pair[1]]];
  const before = [];
  for (let i = pos - 1; i >= 0; i--) before.push(i);
  const after = [];
  for (let i = pos + span; i < slots.length; i++) after.push(i);
  fill(pair[0], before);
  fill(pair[1], after);

  const marked = harmonic ? [pos] : [pos, pos + 1];
  return { items, marked, pair, id, harmonic, key, timeSig, durations: slots.map((s) => s.dur), level: 2 };
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
