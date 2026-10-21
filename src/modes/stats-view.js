// "Statistik": correct answers per interval and kind.
import { INTERVALS } from '../theory.js';
import { getStats, resetStats } from '../stats.js';
import { t } from '../i18n.js';
import { h } from '../ui.js';

function cell(s) {
  if (!s || !s.total) return h('td', { class: 'muted' }, '–');
  const pct = Math.round((100 * s.ok) / s.total);
  const level = pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low';
  return h('td', { class: `stat ${level}` }, `${s.ok}/${s.total}`, h('span', { class: 'pct' }, ` ${pct} %`));
}

export function mountStats(container) {
  const stats = getStats();
  const kinds = [['read', t('statsRead')], ['play', t('statsPlay')], ['listen', t('statsListen')]];
  const any = kinds.some(([k]) => Object.keys(stats[k]).length);
  const table = h('table', { class: 'stats' },
    h('thead', {}, h('tr', {}, h('th', {}, t('statsInterval')), kinds.map(([, label]) => h('th', {}, label)))),
    h('tbody', {}, INTERVALS.map((iv) => h('tr', {}, h('th', {}, iv.name), kinds.map(([k]) => cell(stats[k][iv.id]))))),
  );
  const resetBtn = h('button', { type: 'button', class: 'secondary' }, t('statsReset'));
  let armed = false;
  resetBtn.onclick = () => {
    // two-step confirm instead of a blocking dialog
    if (!armed) {
      armed = true;
      resetBtn.textContent = t('statsConfirm');
      resetBtn.classList.add('danger');
      return;
    }
    resetStats();
    mountStats(container);
  };
  container.replaceChildren(h('div', { class: 'card' },
    any ? table : h('p', {}, t('statsEmpty')),
    h('div', { class: 'row end' }, resetBtn),
  ));
}
