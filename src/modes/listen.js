// "Hören": an interval is played, name it by ear.
import { INTERVALS, SOUND_GROUPS, groupOf, randomPair, midi, intervalById, germanName, rand } from '../theory.js';
import { renderStaff } from '../notation.js';
import { playInterval } from '../audio.js';
import { createPiano } from '../piano.js';
import { settings, saveSettings, record, pickInterval } from '../stats.js';
import { t, colour } from '../i18n.js';
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

// With groups: first pick the sound colour (rau / süß / hohl / gespannt), then the exact interval within it.
export function renderListenQuestion(container, { onDone, q = newListenQuestion(), nextLabel = t('next'), ids, groups = false } = {}) {
  container.innerHTML = '';
  const result = { id: q.id, listenOk: null, answer: null, kind: 'listen' };
  const midis = q.pair.map(midi);
  const play = () => playInterval(midis, q.harmonic ? 'harmonic' : 'melodic');
  const feedback = h('p', { class: 'feedback' });
  const reveal = h('div', { class: 'reveal', hidden: true });
  const nextBtn = h('button', { type: 'button', class: 'primary', hidden: true }, nextLabel);
  const exact = h('section', {});

  const showExact = (allowed) => {
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
        h('p', { class: 'colour' },
          h('span', { class: `badge group-${groupOf(q.id).id}` }, t(`group_${groupOf(q.id).id}`)),
          ` ${colour(q.id)}`),
        staffBox,
        pianoBox,
      );
      renderStaff(staffBox, { items: q.harmonic ? [q.pair] : q.pair.map((n) => [n]), width: 240 });
      createPiano(pianoBox).mark(midis, 'target');
      nextBtn.hidden = false;
      nextBtn.focus({ preventScroll: true });
    }, allowed);
    exact.replaceChildren(...(groups ? [h('p', { class: 'prompt' }, t('exactQuestion'))] : []), answers.el);
  };

  const step1 = h('div', {});
  if (groups) {
    const active = ids ?? INTERVALS.map((i) => i.id);
    const correct = groupOf(q.id);
    const groupFeedback = h('p', { class: 'feedback' });
    const buttons = new Map();
    const choose = (g) => {
      if (exact.childElementCount) return;
      buttons.forEach((b, id) => {
        b.disabled = true;
        if (id === correct.id) b.classList.add('right');
        else if (id === g.id) b.classList.add('wrong');
      });
      const names = correct.members.filter((m) => active.includes(m)).map((m) => intervalById(m).name).join(', ');
      groupFeedback.className = `feedback ${g === correct ? 'ok' : 'bad'}`;
      groupFeedback.textContent = `${g === correct ? t('correct') : `${t('wrong')} ${t('itWas')}`} ${t(`group_${correct.id}`)} → ${names}`;
      showExact(correct.members.filter((m) => active.includes(m)));
    };
    const wrap = h('div', { class: 'answers groups' });
    for (const g of SOUND_GROUPS) {
      if (!g.members.some((m) => active.includes(m))) continue;
      const b = h('button', { type: 'button', class: `answer group group-${g.id}`, onclick: () => choose(g) },
        h('span', { class: 'group-name' }, t(`group_${g.id}`)),
        h('span', { class: 'group-hint' }, t(`groupHint_${g.id}`)));
      buttons.set(g.id, b);
      wrap.append(b);
    }
    step1.append(wrap, groupFeedback);
  } else {
    showExact(ids);
  }

  container.append(
    h('p', { class: 'prompt' }, groups ? t('groupQuestion') : t('listenQuestion')),
    h('div', { class: 'row center' },
      h('button', { type: 'button', class: 'big-play', onclick: play }, t('again')),
      // the colour is easiest to hear with both notes together
      groups && !q.harmonic && h('button', { type: 'button', class: 'secondary', onclick: () => playInterval(midis, 'harmonic') }, `▶ ${t('together')}`),
    ),
    step1,
    exact,
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
  const groupToggle = h('label', { class: 'toggle group-toggle' },
    h('input', {
      type: 'checkbox',
      checked: settings.listenGroups,
      onchange: (ev) => {
        settings.listenGroups = ev.target.checked;
        saveSettings();
        next();
      },
    }),
    ` ${t('groupMode')}`,
  );
  const card = h('div', { class: 'card' });
  container.replaceChildren(filter, groupToggle, card);
  function next() {
    const ids = settings.listenActive.length ? settings.listenActive : undefined;
    renderListenQuestion(card, { onDone: next, ids, groups: settings.listenGroups });
  }
  next();
}
