import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  note, midi, classify, isClean, categoryFromSemitones, germanName, cleanPairs,
  generateMelody, checkPlayed, countSteps, INTERVAL_IDS, KEYS, dia, LEVEL2_KEYS, TIME_SIGNATURES,
} from '../src/theory.js';

const C4 = note(0, 0, 4), D4 = note(1, 0, 4), E4 = note(2, 0, 4), F4 = note(3, 0, 4),
  G4 = note(4, 0, 4), A4 = note(5, 0, 4), H4 = note(6, 0, 4), C5 = note(0, 0, 5), F5 = note(3, 0, 5);

test('midi numbers', () => {
  assert.equal(midi(C4), 60);
  assert.equal(midi(A4), 69);
  assert.equal(midi(note(3, 1, 4)), 66);
  assert.equal(midi(note(6, -1, 4)), 70);
});

test('classify natural intervals from C', () => {
  const expected = { 0: 'prime', 1: 'sekunde', 2: 'terz', 3: 'quarte', 4: 'quinte', 5: 'sexte', 6: 'septime', 7: 'oktave' };
  for (const [steps, id] of Object.entries(expected)) {
    const d = 28 + Number(steps);
    const b = note(d % 7, 0, Math.floor(d / 7));
    assert.equal(classify(C4, b), id);
    assert.equal(classify(b, C4), id, 'descending');
  }
});

test('tritonus in both spellings and directions', () => {
  assert.equal(classify(F4, H4), 'tritonus');
  assert.equal(classify(H4, F5), 'tritonus');
  assert.equal(classify(H4, F4), 'tritonus');
  assert.equal(classify(C4, note(3, 1, 4)), 'tritonus'); // C-Fis
  assert.equal(classify(C4, note(4, -1, 4)), 'tritonus'); // C-Ges
  assert.equal(classify(F4, note(6, -1, 4)), 'quarte'); // F-B
});

test('isClean rejects odd augmented/diminished intervals', () => {
  assert.ok(isClean(C4, E4));
  assert.ok(isClean(C4, note(2, -1, 4))); // kleine Terz
  assert.ok(!isClean(C4, note(2, 1, 4))); // C-Eis
  assert.ok(!isClean(C4, note(0, 1, 4))); // C-Cis (übermäßige Prime)
  assert.ok(isClean(F4, H4));
});

test('semitones to category', () => {
  const expected = ['prime', 'sekunde', 'sekunde', 'terz', 'terz', 'quarte', 'tritonus', 'quinte', 'sexte', 'sexte', 'septime', 'septime', 'oktave'];
  expected.forEach((id, s) => {
    assert.equal(categoryFromSemitones(s), id);
    assert.equal(categoryFromSemitones(-s), id);
  });
});

test('every clean written pair C3..C6 agrees with its semitone category', () => {
  for (const key of Object.keys(KEYS)) {
    for (const id of INTERVAL_IDS) {
      const pairs = cleanPairs(id, { key, loDia: 21, hiDia: 42, chromatic: true });
      assert.ok(pairs.length > 0, `${id} in ${key}`);
      for (const { pair: [a, b] } of pairs) {
        assert.equal(categoryFromSemitones(midi(b) - midi(a)), id, `${germanName(a)}-${germanName(b)}`);
      }
    }
  }
});

test('german names', () => {
  assert.equal(germanName(H4), 'H');
  assert.equal(germanName(note(6, -1, 4)), 'B');
  assert.equal(germanName(note(2, -1, 4)), 'Es');
  assert.equal(germanName(note(5, -1, 4)), 'As');
  assert.equal(germanName(note(3, 1, 4)), 'Fis');
  assert.equal(germanName(note(1, -1, 4)), 'Des');
});

test('generated melodies contain the marked interval inside the range', () => {
  for (let i = 0; i < 300; i++) {
    const id = INTERVAL_IDS[i % INTERVAL_IDS.length];
    const harmonic = i % 3 === 0;
    const key = Object.keys(KEYS)[i % 4];
    const m = generateMelody({ id, key, harmonic, chromatic: i % 2 === 0 });
    assert.ok(m.items.length >= 6 && m.items.length <= 8);
    const notes = m.marked.length === 1 ? m.items[m.marked[0]] : m.marked.map((k) => m.items[k][0]);
    assert.equal(classify(notes[0], notes[1]), id);
    assert.ok(isClean(notes[0], notes[1]));
    for (const it of m.items) for (const n of it) assert.ok(dia(n) >= 28 && dia(n) <= 40);
  }
});

test('level 2 melodies: full bars, rests never marked, range A3..C6, no odd spellings', () => {
  for (let i = 0; i < 500; i++) {
    const id = INTERVAL_IDS[i % INTERVAL_IDS.length];
    const harmonic = i % 3 === 0 && id !== 'prime';
    const key = LEVEL2_KEYS[i % LEVEL2_KEYS.length];
    const m = generateMelody({ id, key, harmonic, level: 2 });
    const bar = TIME_SIGNATURES[m.timeSig];
    assert.equal(m.durations.length, m.items.length);
    let pos = 0;
    for (const d of m.durations) {
      assert.ok(Math.floor(pos / bar) === Math.floor((pos + d - 1) / bar), 'note crosses a bar line');
      pos += d;
    }
    assert.equal(pos % bar, 0, 'bars are full');
    for (const k of m.marked) assert.ok(m.items[k].length > 0, 'marked note is not a rest');
    const notes = m.marked.length === 1 ? m.items[m.marked[0]] : m.marked.map((k) => m.items[k][0]);
    assert.equal(classify(notes[0], notes[1]), id);
    assert.ok(isClean(notes[0], notes[1]));
    for (const it of m.items) {
      for (const n of it) {
        assert.ok(dia(n) >= 26 && dia(n) <= 42);
        assert.ok(!['E#', 'H#', 'Fb', 'Cb'].includes(['C', 'D', 'E', 'F', 'G', 'A', 'H'][n.step] + (n.acc > 0 ? '#' : n.acc < 0 ? 'b' : '')));
      }
    }
  }
});

test('countSteps', () => {
  assert.deepEqual(countSteps(E4, C4), ['C', 'D', 'E']);
  assert.deepEqual(countSteps(C4, C5).length, 8);
});

test('checkPlayed', () => {
  assert.ok(checkPlayed([64, 60], [C4, E4], 'exact'));
  assert.ok(!checkPlayed([60, 63], [C4, E4], 'exact'));
  assert.ok(!checkPlayed([62, 66], [C4, E4], 'exact'));
  assert.ok(checkPlayed([62, 66], [C4, E4], 'interval'));
  assert.ok(checkPlayed([60, 60], [G4, G4], 'interval'));
  assert.ok(!checkPlayed([60], [C4, E4], 'exact'));
});
