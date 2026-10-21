// Small DOM helpers shared by the modes.
import { INTERVALS } from './theory.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return el;
}

// Grid of the nine interval answer buttons. Calls onAnswer(id) once.
export function answerButtons(onAnswer, ids = INTERVALS.map((i) => i.id)) {
  const wrap = h('div', { class: 'answers' });
  const buttons = new Map();
  for (const iv of INTERVALS) {
    if (!ids.includes(iv.id)) continue;
    const b = h('button', { type: 'button', class: 'answer', onclick: () => onAnswer(iv.id) }, iv.name);
    buttons.set(iv.id, b);
    wrap.append(b);
  }
  return {
    el: wrap,
    reveal(chosen, correct) {
      buttons.forEach((b, id) => {
        b.disabled = true;
        if (id === correct) b.classList.add('right');
        else if (id === chosen) b.classList.add('wrong');
      });
    },
  };
}
