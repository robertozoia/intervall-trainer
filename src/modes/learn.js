// "Lernen": overview of all intervals with an example from C, sound and a mnemonic song.
import { INTERVALS, note, fromDia, midi, germanName } from '../theory.js';
import { renderStaff } from '../notation.js';
import { playInterval } from '../audio.js';
import { t, song } from '../i18n.js';
import { h } from '../ui.js';

const C4 = note(0, 0, 4);

function example(iv) {
  if (iv.id === 'tritonus') return [C4, note(3, 1, 4)]; // C – Fis
  return [C4, fromDia(28 + iv.steps)];
}

export function mountLearn(container) {
  const grid = h('div', { class: 'learn-grid' });
  container.replaceChildren(h('p', { class: 'intro' }, t('learnIntro')), grid);
  for (const iv of INTERVALS) {
    const pair = example(iv);
    const midis = pair.map(midi);
    const staffBox = h('div', { class: 'staff small' });
    const semis = iv.semitones.join(' / ');
    const card = h('article', { class: 'card learn-card' },
      h('h3', {}, iv.name),
      h('p', { class: 'muted' }, `${pair.map(germanName).join(' – ')} · ${semis} ${t('semitones')}`),
      staffBox,
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'secondary', onclick: () => playInterval(midis) }, `▶ ${t('up')}`),
        h('button', { type: 'button', class: 'secondary', onclick: () => playInterval([...midis].reverse()) }, `▶ ${t('down')}`),
        h('button', { type: 'button', class: 'secondary', onclick: () => playInterval(midis, 'harmonic') }, `▶ ${t('together')}`),
      ),
      h('p', { class: 'song' }, h('strong', {}, `${t('song')}: `), song(iv.id)),
    );
    grid.append(card);
    renderStaff(staffBox, { items: [[pair[0]], [pair[1]], iv.id === 'prime' ? [pair[0]] : pair], width: 230, height: 140 });
  }
}
