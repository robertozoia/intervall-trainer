// Piano sound with Tone.js (global `Tone` from vendor/tone.min.js) and the local Salamander samples.

const SAMPLE_NOTES = ['A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6', 'A6'];

let sampler = null;
let ready = null;

export function loadPiano() {
  if (ready) return ready;
  const urls = Object.fromEntries(SAMPLE_NOTES.map((n) => [n.replace('s', '#'), `${n}.mp3`]));
  ready = new Promise((resolve) => {
    sampler = new Tone.Sampler({ urls, baseUrl: './samples/', release: 1, onload: resolve }).toDestination();
  });
  return ready;
}

// Browsers only allow sound after a user gesture.
export async function unlockAudio() {
  if (Tone.context.state !== 'running') await Tone.start();
}

const toNote = (m) => Tone.Frequency(m, 'midi').toNote();

let playToken = 0;

async function prepare() {
  await unlockAudio();
  await loadPiano();
  sampler.releaseAll();
  return ++playToken;
}

export async function playKey(m) {
  await unlockAudio();
  await loadPiano();
  sampler.triggerAttackRelease(toNote(m), 1.2);
}

// mode: 'melodic' (first then second) or 'harmonic' (together)
export async function playInterval(midis, mode = 'melodic') {
  await prepare();
  const now = Tone.now() + 0.05;
  if (mode === 'harmonic') {
    sampler.triggerAttackRelease(midis.map(toNote), 2, now);
  } else {
    sampler.triggerAttackRelease(toNote(midis[0]), 1.1, now);
    sampler.triggerAttackRelease(toNote(midis[1]), 1.6, now + 0.9);
  }
}

// items: array of arrays of midi numbers; onStep(index) is called when each item sounds.
export async function playSequence(items, { tempo = 0.55, onStep } = {}) {
  const token = await prepare();
  const now = Tone.now() + 0.05;
  items.forEach((chord, i) => {
    sampler.triggerAttackRelease(chord.map(toNote), tempo * 1.4, now + i * tempo);
    if (onStep) {
      setTimeout(() => token === playToken && onStep(i), (0.05 + i * tempo) * 1000);
    }
  });
  if (onStep) setTimeout(() => token === playToken && onStep(-1), (0.05 + items.length * tempo) * 1000);
}
