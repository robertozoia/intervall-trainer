// Staff rendering with VexFlow (global `Vex` from vendor/vexflow.min.js).
import { vfKey, KEYS, TIME_SIGNATURES } from './theory.js';

const MARK = '#e8590c';
const SVG_NS = 'http://www.w3.org/2000/svg';
// duration in eighths → VexFlow duration and dots
const DURATIONS = { 1: ['8', 0], 2: ['q', 0], 3: ['q', 1], 4: ['h', 0], 6: ['h', 1] };

// Split item indexes into bars (one bar when there is no time signature).
function splitBars(durations, timeSig) {
  if (!timeSig) return [durations.map((_, i) => i)];
  const size = TIME_SIGNATURES[timeSig];
  const bars = [];
  let pos = 0;
  durations.forEach((d, i) => {
    const b = Math.floor(pos / size);
    (bars[b] ??= []).push(i);
    pos += d;
  });
  return bars;
}

// Accidentals as written by hand: compared with the key signature, reset at every bar line.
function addAccidentals(VF, note, chord, current, key) {
  chord.forEach((n, k) => {
    const id = `${n.step}/${n.oct}`;
    const expected = current.get(id) ?? KEYS[key][n.step] ?? 0;
    if (n.acc !== expected) {
      note.addModifier(new VF.Accidental(n.acc > 0 ? '#' : n.acc < 0 ? 'b' : 'n'), k);
      current.set(id, n.acc);
    }
  });
}

// items: array of arrays of notes ([] = rest); marked: indexes of items to highlight with a bracket.
// durations (in eighths) and timeSig are optional: without them every item is a quarter note in one bar.
export function renderStaff(container, { items, marked = [], key = 'C', durations, timeSig, width, height = 150 } = {}) {
  const VF = Vex.Flow;
  container.innerHTML = '';
  durations = durations ?? items.map(() => 2);
  const bars = splitBars(durations, timeSig);
  const keyWidth = Object.keys(KEYS[key]).length * 11;
  const headWidth = 50 + keyWidth + (timeSig ? 26 : 0);
  const barWidths = bars.map((bar, b) => (b === 0 ? headWidth : 14) + bar.length * 44 + 16);
  width = width ?? Math.max(220, barWidths.reduce((a, w) => a + w, 0) + 12);
  // stretch bars to the requested width
  const scale = (width - 12) / barWidths.reduce((a, w) => a + w, 0);

  const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();

  const notes = [];
  let x = 6;
  bars.forEach((bar, b) => {
    const w = barWidths[b] * scale;
    const stave = new VF.Stave(x, 22, w);
    if (b === 0) {
      stave.addClef('treble');
      if (key !== 'C') stave.addKeySignature(key);
      if (timeSig) stave.addTimeSignature(timeSig);
    }
    if (timeSig && b === bars.length - 1) stave.setEndBarType(VF.Barline.type.END);
    stave.setContext(ctx).draw();

    const current = new Map();
    const barNotes = bar.map((i) => {
      const chord = items[i];
      const [dur, dots] = DURATIONS[durations[i]];
      const rest = chord.length === 0;
      const n = new VF.StaveNote({
        keys: rest ? ['b/4'] : chord.map(vfKey),
        duration: dur + (rest ? 'r' : ''),
        dots,
        auto_stem: !rest,
      });
      if (dots) VF.Dot.buildAndAttach([n], { all: true });
      if (!rest) addAccidentals(VF, n, chord, current, key);
      if (marked.includes(i)) n.setStyle({ fillStyle: MARK, strokeStyle: MARK });
      notes[i] = n;
      return n;
    });
    marked.forEach((i) => notes[i]?.getModifiers().forEach((m) => m.setStyle?.({ fillStyle: MARK, strokeStyle: MARK })));

    const beats = bar.reduce((a, i) => a + durations[i], 0);
    const voice = new VF.Voice({ num_beats: beats, beat_value: 8 });
    voice.addTickables(barNotes);
    const beams = timeSig ? VF.Beam.generateBeams(barNotes.filter((n) => !n.isRest())) : [];
    new VF.Formatter().joinVoices([voice]).format([voice], w - (stave.getNoteStartX() - x) - 20);
    voice.draw(ctx, stave);
    beams.forEach((beam) => beam.setContext(ctx).draw());
    x += w;
  });

  const svg = container.querySelector('svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  // keep note heads readable on phones: scroll sideways instead of shrinking too far
  svg.setAttribute('style', `min-width: ${Math.round(width * 0.75)}px`);
  svg.classList.add('staff-svg');

  if (marked.length) drawBracket(svg, marked.map((i) => notes[i]));
  return { notes, svg };
}

function drawBracket(svg, notes) {
  const boxes = notes.map((n) => n.getBoundingBox());
  const x1 = Math.min(...boxes.map((b) => b.getX())) - 6;
  const x2 = Math.max(...boxes.map((b) => b.getX() + b.getW())) + 6;
  const top = Math.min(notes[0].getStave().getYForLine(0) - 8, ...boxes.map((b) => b.getY() - 6));
  const y = Math.max(4, top);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', `M${x1} ${y + 8} L${x1} ${y} L${x2} ${y} L${x2} ${y + 8}`);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', MARK);
  path.setAttribute('stroke-width', '2.5');
  path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);
}

// Highlight one item while a melody is playing (index -1 clears).
export function setPlaying(svg, notes, index) {
  notes.forEach((n, i) => {
    const el = n.getSVGElement?.() ?? n.attrs?.el;
    el?.classList.toggle('playing', i === index);
  });
}
