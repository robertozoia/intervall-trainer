// App shell: tabs, settings dialog, language and piano loading.
import { settings, saveSettings } from './stats.js';
import { t, setLang } from './i18n.js';
import { loadPiano, unlockAudio } from './audio.js';
import { refreshAllLabels } from './piano.js';
import { h } from './ui.js';
import { mountLearn } from './modes/learn.js';
import { mountRead } from './modes/read.js';
import { mountListen } from './modes/listen.js';
import { mountExam } from './modes/exam.js';
import { mountStats } from './modes/stats-view.js';

const TABS = [
  { id: 'learn', label: 'tabLearn', icon: '📖', mount: mountLearn },
  { id: 'read', label: 'tabRead', icon: '🎼', mount: mountRead },
  { id: 'listen', label: 'tabListen', icon: '👂', mount: mountListen },
  { id: 'exam', label: 'tabExam', icon: '📝', mount: mountExam },
  { id: 'stats', label: 'tabStats', icon: '📊', mount: mountStats },
];

setLang(settings.lang);

const main = document.getElementById('main');
const nav = document.getElementById('tabs');
const status = document.getElementById('status');
let current = TABS.find((tab) => `#${tab.id}` === location.hash)?.id ?? 'learn';

function renderNav() {
  document.documentElement.lang = settings.lang;
  document.getElementById('title').textContent = t('title');
  document.getElementById('settings-btn').setAttribute('aria-label', t('settings'));
  nav.replaceChildren(...TABS.map((tab) => h('button', {
    type: 'button',
    class: tab.id === current ? 'tab active' : 'tab',
    'aria-current': tab.id === current ? 'page' : null,
    onclick: () => show(tab.id),
  }, h('span', { class: 'tab-icon', 'aria-hidden': 'true' }, tab.icon), h('span', { class: 'tab-label' }, t(tab.label)))));
}

function show(id) {
  current = id;
  history.replaceState(null, '', `#${id}`);
  renderNav();
  TABS.find((tab) => tab.id === id).mount(main);
}

// Settings dialog
const dialog = document.getElementById('settings');

function radioGroup(name, label, options) {
  return h('fieldset', {},
    h('legend', {}, label),
    options.map(([value, text]) => h('label', {},
      h('input', {
        type: 'radio', name, value, checked: settings[name] === value,
        onchange: () => { settings[name] = value; saveSettings(); },
      }),
      ` ${text}`,
    )),
  );
}

function renderSettings() {
  dialog.replaceChildren(h('form', { method: 'dialog', class: 'settings-form' },
    h('h2', {}, t('settings')),
    h('fieldset', {},
      h('legend', {}, t('setLanguage')),
      [['de', 'Deutsch'], ['es', 'Español']].map(([value, text]) => h('label', {},
        h('input', {
          type: 'radio', name: 'lang', value, checked: settings.lang === value,
          onchange: () => {
            settings.lang = value;
            saveSettings();
            setLang(value);
            renderSettings();
            show(current);
          },
        }),
        ` ${text}`,
      )),
    ),
    h('label', { class: 'toggle' },
      h('input', {
        type: 'checkbox', checked: settings.labels,
        onchange: (ev) => { settings.labels = ev.target.checked; saveSettings(); refreshAllLabels(); },
      }),
      ` ${t('setLabels')}`,
    ),
    radioGroup('checkMode', t('setCheck'), [['exact', t('setCheckExact')], ['interval', t('setCheckInterval')]]),
    radioGroup('readType', t('setReadType'), [['melodic', t('typeMelodic')], ['harmonic', t('typeHarmonic')], ['both', t('typeBoth')]]),
    radioGroup('listenType', t('setListenType'), [['up', t('typeUp')], ['down', t('typeDown')], ['harmonic', t('typeHarmonic')], ['both', t('typeBoth')]]),
    radioGroup('keys', t('setKeys'), [['C', t('setKeysC')], ['mixed', t('setKeysMixed')]]),
    h('label', { class: 'toggle' },
      h('input', {
        type: 'checkbox', checked: settings.chromatic,
        onchange: (ev) => { settings.chromatic = ev.target.checked; saveSettings(); },
      }),
      ` ${t('setChromatic')}`,
    ),
    h('div', { class: 'row end' }, h('button', { class: 'primary', value: 'close' }, t('close'))),
  ));
}

document.getElementById('settings-btn').addEventListener('click', () => {
  renderSettings();
  dialog.showModal();
});
// Some settings change how questions are built: start fresh when the dialog closes.
dialog.addEventListener('close', () => {
  if (current !== 'stats' && current !== 'exam') show(current);
});

// Piano samples: load in the background, unlock audio on the first tap.
status.textContent = t('loading');
loadPiano().then(() => {
  status.textContent = '';
  status.hidden = true;
});
document.addEventListener('pointerdown', () => unlockAudio(), { once: true, capture: true });

show(current);
