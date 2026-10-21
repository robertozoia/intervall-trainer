// Staff rendering with VexFlow (global `Vex` from vendor/vexflow.min.js).
import { vfKey } from './theory.js';

const MARK = '#e8590c';
const SVG_NS = 'http://www.w3.org/2000/svg';

// items: array of arrays of notes; marked: indexes of items to highlight with a bracket.
export function renderStaff(container, { items, marked = [], key = 'C', width, height = 150 } = {}) {
  const VF = Vex.Flow;
  container.innerHTML = '';
  width = width ?? Math.max(220, 120 + items.length * 62);
  const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();
  const stave = new VF.Stave(6, 22, width - 12);
  stave.addClef('treble');
  if (key !== 'C') stave.addKeySignature(key);
  stave.setContext(ctx).draw();

  const notes = items.map((chord, i) => {
    const n = new VF.StaveNote({ keys: chord.map(vfKey), duration: 'q', auto_stem: true });
    if (marked.includes(i)) n.setStyle({ fillStyle: MARK, strokeStyle: MARK });
    return n;
  });
  const voice = new VF.Voice({ num_beats: notes.length, beat_value: 4 });
  voice.addTickables(notes);
  VF.Accidental.applyAccidentals([voice], key);
  // Re-colour accidentals added after styling.
  notes.forEach((n, i) => {
    if (marked.includes(i)) n.getModifiers().forEach((m) => m.setStyle?.({ fillStyle: MARK, strokeStyle: MARK }));
  });
  new VF.Formatter().joinVoices([voice]).format([voice], width - (stave.getNoteStartX() - 6) - 30);
  voice.draw(ctx, stave);

  const svg = container.querySelector('svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.removeAttribute('style');
  svg.classList.add('staff-svg');

  if (marked.length) drawBracket(svg, marked.map((i) => notes[i]), stave);
  return { notes, svg };
}

function drawBracket(svg, notes, stave) {
  const boxes = notes.map((n) => n.getBoundingBox());
  const x1 = Math.min(...boxes.map((b) => b.getX())) - 6;
  const x2 = Math.max(...boxes.map((b) => b.getX() + b.getW())) + 6;
  const top = Math.min(stave.getYForLine(0) - 8, ...boxes.map((b) => b.getY() - 6));
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
