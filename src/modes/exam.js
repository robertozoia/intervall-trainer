// "Prüfung": 10 mixed questions (5 read + play, 5 by ear), then a score.
import { intervalById } from '../theory.js';
import { renderReadQuestion, levelSwitch } from './read.js';
import { renderListenQuestion } from './listen.js';
import { t } from '../i18n.js';
import { h } from '../ui.js';

const COUNT = 10;

export function mountExam(container) {
  const card = h('div', { class: 'card' });
  container.replaceChildren(card);
  showIntro();

  function showIntro() {
    card.replaceChildren(
      h('p', { class: 'prompt' }, t('examIntro')),
      levelSwitch(showIntro),
      h('div', { class: 'row center' }, h('button', { type: 'button', class: 'primary', onclick: start }, t('examStart'))),
    );
  }

  function start() {
    const kinds = Array.from({ length: COUNT }, (_, i) => (i % 2 ? 'listen' : 'read')).sort(() => Math.random() - 0.5);
    const results = [];
    const step = (i) => {
      if (i === COUNT) return showResult(results);
      const header = h('p', { class: 'exam-progress' }, `${t('examQuestion')} ${i + 1} / ${COUNT}`,
        h('progress', { max: COUNT, value: i }));
      const body = h('div');
      card.replaceChildren(header, body);
      const onDone = (r) => {
        results.push(r);
        step(i + 1);
      };
      const nextLabel = i === COUNT - 1 ? t('examResult') : t('next');
      if (kinds[i] === 'read') renderReadQuestion(body, { onDone, nextLabel });
      else renderListenQuestion(body, { onDone, nextLabel });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    step(0);
  }

  function showResult(results) {
    let points = 0;
    let max = 0;
    const mistakes = [];
    for (const r of results) {
      const name = intervalById(r.id).name;
      if (r.kind === 'read') {
        max += 2;
        points += (r.readOk ? 1 : 0) + (r.playOk ? 1 : 0);
        if (!r.readOk) mistakes.push(`${t('examRead')}: ${name} (${t('examYour')}: ${intervalById(r.answer).name})`);
        if (!r.playOk) mistakes.push(`${t('examPlay')}: ${name}`);
      } else {
        max += 1;
        points += r.listenOk ? 1 : 0;
        if (!r.listenOk) mistakes.push(`${t('examListen')}: ${name} (${t('examYour')}: ${intervalById(r.answer).name})`);
      }
    }
    const pct = Math.round((100 * points) / max);
    card.replaceChildren(
      h('h2', {}, t('examResult')),
      h('p', { class: 'score' }, `${points} / ${max} ${t('examPoints')}`, h('span', { class: 'muted' }, ` (${pct} %)`)),
      h('p', { class: 'score-emoji' }, pct >= 90 ? '🌟🌟🌟' : pct >= 70 ? '🌟🌟' : pct >= 50 ? '🌟' : '💪'),
      h('h3', {}, t('examMistakes')),
      mistakes.length ? h('ul', { class: 'mistakes' }, mistakes.map((m) => h('li', {}, m))) : h('p', {}, t('examNoMistakes')),
      h('div', { class: 'row center' }, h('button', { type: 'button', class: 'primary', onclick: start }, t('examAgain'))),
    );
  }
}
