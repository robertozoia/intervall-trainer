// On-screen piano keyboard (C4–C6, or from A3 for level 2), touch, mouse and computer keyboard.
import { germanNameForMidi } from './theory.js';
import { playKey } from './audio.js';
import { settings } from './stats.js';

const HIGH = 84;
const BLACK = new Set([1, 3, 6, 8, 10]);
// Computer keys (works for QWERTZ and QWERTY): white row a s d f …, black row w e t z/y u o p.
const KEYMAP = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, z: 68, y: 68, h: 69, u: 70, j: 71,
  k: 72, o: 73, l: 74, p: 75, 'ö': 76, ';': 76,
};

const pianos = new Set();

document.addEventListener('keydown', (ev) => {
  if (ev.repeat || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (ev.target.closest?.('input, select, textarea')) return;
  const m = KEYMAP[ev.key.toLowerCase()];
  if (m === undefined) return;
  for (const p of pianos) {
    if (!p.el.isConnected) pianos.delete(p);
    else if (p.isVisible()) p.press(m);
  }
});

export function createPiano(container, { onPress, low = 60 } = {}) {
  const el = document.createElement('div');
  el.className = 'piano';
  const keys = new Map();
  const whites = [];
  for (let m = low; m <= HIGH; m++) if (!BLACK.has(m % 12)) whites.push(m);
  const whiteW = 100 / whites.length;

  for (let m = low; m <= HIGH; m++) {
    const black = BLACK.has(m % 12);
    const k = document.createElement('button');
    k.type = 'button';
    k.className = black ? 'key black' : 'key white';
    k.dataset.midi = m;
    const label = document.createElement('span');
    label.className = 'key-label';
    label.textContent = germanNameForMidi(m);
    k.appendChild(label);
    if (black) {
      const leftWhite = whites.indexOf(m - 1);
      k.style.left = `${(leftWhite + 1) * whiteW - whiteW * 0.3}%`;
      k.style.width = `${whiteW * 0.6}%`;
    } else {
      k.style.width = `${whiteW}%`;
    }
    k.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      press(m);
    });
    keys.set(m, k);
    el.appendChild(k);
  }
  container.appendChild(el);

  function press(m) {
    const k = keys.get(m);
    if (!k) return;
    playKey(m);
    k.classList.add('down');
    setTimeout(() => k.classList.remove('down'), 180);
    onPress?.(m);
  }

  const api = {
    el,
    press,
    isVisible: () => el.offsetParent !== null && !el.closest('[inert]'),
    mark(midis, cls) {
      midis.forEach((m) => keys.get(m)?.classList.add(cls));
    },
    clear(cls) {
      keys.forEach((k) => (cls ? k.classList.remove(cls) : k.classList.remove('selected', 'target', 'wrong')));
    },
    refreshLabels() {
      el.classList.toggle('no-labels', !settings.labels);
    },
  };
  api.refreshLabels();
  pianos.add(api);
  return api;
}

export const refreshAllLabels = () => pianos.forEach((p) => p.refreshLabels());
