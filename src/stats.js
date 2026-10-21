// Settings and statistics, kept in localStorage (safe if storage is unavailable).
import { INTERVAL_IDS, rand } from './theory.js';

const SETTINGS_KEY = 'intervalle.settings';
const STATS_KEY = 'intervalle.stats';

const DEFAULTS = {
  lang: 'de',
  labels: true,
  checkMode: 'exact', // 'exact' | 'interval'
  level: 1, // score difficulty for "Noten lesen" and "Prüfung": 1 | 2
  keys: 'C', // 'C' | 'mixed' (level 1)
  chromatic: false,
  readType: 'melodic', // 'melodic' | 'harmonic' | 'both'
  listenType: 'up', // 'up' | 'down' | 'harmonic' | 'both'
  listenActive: [...INTERVAL_IDS],
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: keep working in memory
  }
}

export const settings = load(SETTINGS_KEY, DEFAULTS);
export const saveSettings = () => save(SETTINGS_KEY, settings);

// stats[kind][intervalId] = { ok, total }, kind = 'read' | 'play' | 'listen'
const stats = load(STATS_KEY, { read: {}, play: {}, listen: {} });

export function record(kind, id, ok) {
  const s = (stats[kind][id] ??= { ok: 0, total: 0 });
  s.total++;
  if (ok) s.ok++;
  save(STATS_KEY, stats);
}

export const getStats = () => stats;

export function resetStats() {
  for (const kind of Object.keys(stats)) stats[kind] = {};
  save(STATS_KEY, stats);
}

// Choose an interval, preferring ones with many mistakes or few attempts.
export function pickInterval(kind, ids = INTERVAL_IDS, avoid = null) {
  if (!ids.length) ids = INTERVAL_IDS;
  const pool = ids.length > 1 && avoid ? ids.filter((i) => i !== avoid) : ids;
  const weights = pool.map((id) => {
    const s = stats[kind][id];
    if (!s || s.total < 3) return 2;
    return 1 + 3 * (1 - s.ok / s.total);
  });
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return rand(pool);
}
