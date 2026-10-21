// "Noten lesen": name the marked interval in a melody, then play it on the piano.
import { generateMelody, intervalById, countSteps, midi, checkPlayed, germanName, germanNameForMidi, rand } from '../theory.js';
import { renderStaff, setPlaying } from '../notation.js';
import { playSequence, playInterval } from '../audio.js';
import { createPiano } from '../piano.js';
import { settings, record, pickInterval } from '../stats.js';
import { t } from '../i18n.js';
import { h, answerButtons } from '../ui.js';

let lastId = null;

export function newReadQuestion() {
  const id = pickInterval('read', undefined, lastId);
  lastId = id;
  const key = settings.keys === 'mixed' ? rand(['C', 'C', 'G', 'F', 'D']) : 'C';
  const harmonic = settings.readType === 'both' ? Math.random() < 0.5 : settings.readType === 'harmonic';
  return generateMelody({ id, key, harmonic, chromatic: settings.chromatic });
}

function explain(q) {
  const [a, b] = q.pair;
  const steps = countSteps(a, b);
  if (q.id === 'tritonus') {
    const semis = Math.abs(midi(b) - midi(a));
    return `${germanName(a)} – ${germanName(b)}: ${steps.length} · ${semis} ${t('semitones')} → Tritonus`;
  }
  return `${t('counting')}: ${steps.map((s, i) => `${s} ${i + 1}`).join(', ')} → ${intervalById(q.id).name}`;
}

// Renders one question into container; calls onDone({ id, readOk, playOk, answer }) when "Weiter" is pressed.
export function renderReadQuestion(container, { onDone, q = newReadQuestion(), nextLabel = t('next') } = {}) {
  container.innerHTML = '';
  const result = { id: q.id, readOk: null, playOk: null, answer: null, kind: 'read' };
  const targetMidis = q.pair.map(midi);
  const staffBox = h('div', { class: 'staff' });
  const feedbackA = h('p', { class: 'feedback' });
  const melodyBtn = h('button', { type: 'button', class: 'secondary', hidden: true }, t('playMelody'));
  const intervalBtn = h('button', { type: 'button', class: 'secondary', hidden: true }, t('playInterval'));
  const stepB = h('section', { class: 'step', hidden: true });
  const nextBtn = h('button', { type: 'button', class: 'primary', hidden: true }, nextLabel);

  const answers = answerButtons((id) => {
    if (result.readOk !== null) return;
    result.answer = id;
    result.readOk = id === q.id;
    record('read', q.id, result.readOk);
    answers.reveal(id, q.id);
    feedbackA.className = `feedback ${result.readOk ? 'ok' : 'bad'}`;
    feedbackA.replaceChildren(
      result.readOk ? t('correct') : `${t('wrong')} ${t('itWas')}${intervalById(q.id).name}.`,
      h('br'),
      h('span', { class: 'explain' }, explain(q)),
    );
    melodyBtn.hidden = false;
    intervalBtn.hidden = false;
    stepB.hidden = false;
    stepB.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  container.append(
    h('p', { class: 'prompt' }, t('readQuestion')),
    staffBox,
    answers.el,
    feedbackA,
    h('div', { class: 'row' }, melodyBtn, intervalBtn),
    stepB,
    h('div', { class: 'row end' }, nextBtn),
  );
  const { notes, svg } = renderStaff(staffBox, { items: q.items, marked: q.marked, key: q.key });

  melodyBtn.onclick = () =>
    playSequence(q.items.map((it) => it.map(midi)), { onStep: (i) => setPlaying(svg, notes, i) });
  intervalBtn.onclick = () => playInterval(targetMidis, q.harmonic ? 'harmonic' : 'melodic');

  // Step b: play it on the piano
  const played = [];
  const playedBox = h('div', { class: 'played' });
  const feedbackB = h('p', { class: 'feedback' });
  const checkBtn = h('button', { type: 'button', class: 'primary', disabled: true }, t('check'));
  const clearBtn = h('button', { type: 'button', class: 'secondary' }, t('clear'));
  const pianoBox = h('div', { class: 'piano-box' });

  const showPlayed = () => {
    playedBox.replaceChildren(
      h('span', { class: 'muted' }, `${t('youPlayed')}: `),
      ...(played.length ? played.map((m) => h('span', { class: 'chip' }, germanNameForMidi(m))) : [h('span', { class: 'muted' }, t('pressTwo'))]),
    );
    checkBtn.disabled = played.length !== 2 || result.playOk !== null;
    piano.clear('selected');
    piano.mark(played, 'selected');
  };

  const piano = createPiano(pianoBox, {
    onPress: (m) => {
      if (result.playOk !== null) return;
      if (played.length === 2) played.shift();
      played.push(m);
      showPlayed();
    },
  });

  clearBtn.onclick = () => {
    if (result.playOk !== null) return;
    played.length = 0;
    showPlayed();
  };
  checkBtn.onclick = () => {
    result.playOk = checkPlayed(played, targetMidis, settings.checkMode);
    record('play', q.id, result.playOk);
    feedbackB.className = `feedback ${result.playOk ? 'ok' : 'bad'}`;
    feedbackB.textContent = result.playOk ? t('correct') : `${t('wrong')} ${t('correctKeys')}`;
    if (!result.playOk) piano.mark(targetMidis, 'target');
    checkBtn.disabled = true;
    clearBtn.disabled = true;
    nextBtn.hidden = false;
    nextBtn.focus({ preventScroll: true });
    nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  nextBtn.onclick = () => onDone?.(result);

  stepB.append(
    h('p', { class: 'prompt' }, t('playQuestion')),
    pianoBox,
    playedBox,
    h('div', { class: 'row' }, clearBtn, checkBtn),
    feedbackB,
  );
  showPlayed();
  return result;
}

export function mountRead(container) {
  const card = h('div', { class: 'card' });
  container.replaceChildren(card);
  const next = () => {
    renderReadQuestion(card, { onDone: next });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  renderReadQuestion(card, { onDone: next });
}
