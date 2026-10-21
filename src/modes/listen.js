// "Hören": an interval is played, name it by ear.
import { INTERVALS, randomPair, midi, intervalById, germanName, rand } from '../theory.js';
import { renderStaff } from '../notation.js';
import { playInterval } from '../audio.js';
import { createPiano } from '../piano.js';
import { settings, saveSettings, record, pickInterval } from '../stats.js';
import { t } from '../i18n.js';
import { h, answerButtons } from '../ui.js';

let lastId = null;

export function newListenQuestion() {
  const id = pickInterval('listen', settings.listenActive, lastId);
  lastId = id;
  const type = settings.listenType === 'both' ? rand(['up', 'down', 'harmonic']) : settings.listenType;
  const direction = type === 'down' ? 'down' : 'up';
  // C4..C6, so everything fits on the on-screen piano
  const pair = randomPair(id, { key: 'C', loDia: 28, hiDia: 42, chromatic: true, direction });
  return { id, pair, harmonic: type === 'harmonic' };
}

export function renderListenQuestion(container, { onDone, q = newListenQuestion(), nextLabel = t('next'), ids } = {}) {
  container.innerHTML = '';
  const result = { id: q.id, listenOk: null, answer: null, kind: 'listen' };
  const midis = q.pair.map(midi);
  const play = () => playInterval(midis, q.harmonic ? 'harmonic' : 'melodic');
  const feedback = h('p', { class: 'feedback' });
  const reveal = h('div', { class: 'reveal', hidden: true });
  const nextBtn = h('button', { type: 'button', class: 'primary', hidden: true }, nextLabel);

  const answers = answerButtons((id) => {
    if (result.listenOk !== null) return;
    result.answer = id;
    result.listenOk = id === q.id;
    record('listen', q.id, result.listenOk);
    answers.reveal(id, q.id);
    feedback.className = `feedback ${result.listenOk ? 'ok' : 'bad'}`;
    feedback.textContent = result.listenOk ? t('correct') : `${t('wrong')} ${t('itWas')}${intervalById(q.id).name}.`;
    reveal.hidden = false;
    const staffBox = h('div', { class: 'staff small' });
    const pianoBox = h('div', { class: 'piano-box' });
    reveal.replaceChildren(
      h('p', { class: 'muted' }, q.pair.map(germanName).join(' – ')),
      staffBox,
      pianoBox,
    );
    renderStaff(staffBox, { items: q.harmonic ? [q.pair] : q.pair.map((n) => [n]), width: 240 });
    createPiano(pianoBox).mark(midis, 'target');
    nextBtn.hidden = false;
    nextBtn.focus({ preventScroll: true });
  }, ids);

  container.append(
    h('p', { class: 'prompt' }, t('listenQuestion')),
    h('div', { class: 'row center' }, h('button', { type: 'button', class: 'big-play', onclick: play }, t('again'))),
    answers.el,
    feedback,
    reveal,
    h('div', { class: 'row end' }, nextBtn),
  );
  nextBtn.onclick = () => onDone?.(result);
  play();
  return result;
}

export function mountListen(container) {
  const filter = h('details', { class: 'filter' },
    h('summary', {}, t('activeIntervals')),
    h('div', { class: 'checks' },
      INTERVALS.map((iv) => h('label', {},
        h('input', {
          type: 'checkbox',
          checked: settings.listenActive.includes(iv.id),
          onchange: (ev) => {
            const set = new Set(settings.listenActive);
            ev.target.checked ? set.add(iv.id) : set.delete(iv.id);
            settings.listenActive = INTERVALS.map((i) => i.id).filter((i) => set.has(i));
            saveSettings();
          },
        }),
        ` ${iv.name}`,
      )),
    ),
  );
  const card = h('div', { class: 'card' });
  container.replaceChildren(filter, card);
  const next = () => {
    const ids = settings.listenActive.length ? settings.listenActive : undefined;
    renderListenQuestion(card, { onDone: next, ids });
  };
  next();
}
