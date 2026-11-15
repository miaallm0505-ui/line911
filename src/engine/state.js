// Состояние игры и сохранение. Одно сохранение на ночь.
export const SAVE_KEY = 'line911.save.v1';
export const SETTINGS_KEY = 'line911.settings.v1';
// Ночь выживания и мороз: на них настроен баланс тела (tests/engine.test.mjs).
// Значения остались от прежнего сюжета — уточнить, когда в сюжете Мии дойдёт до ночи в лесу.
export const START_MIN = 23 * 60 + 41;          // 23:41
export const DAWN_MIN = 24 * 60 + 8 * 60 + 9;   // 08:09 следующего дня
export const OUT_T = -24;                        // °F снаружи

export function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true } catch (e) { return false } }
export function load(k, def = null) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : def } catch (e) { return def } }
export function drop(k) { try { localStorage.removeItem(k) } catch (e) { } }

export function newState(name = 'Майкл', fem = false) {
  return {
    v: 1, name, fem,
    t: START_MIN,            // игровые минуты (дробные)
    scene: null, loc: 'car', activity: 'car',
    core: 98.6, hands: 0, handsP: 0, feet: 0, feetP: 0,
    hunger: 24, thirst: 20, fatigue: 34, blood: 100, bleed: 0, sanity: 82,
    cabin: 38, engineOn: false, pipe: false, pipeAt: 0, co: 0, fuel: 3.3,
    bat: 64, phoneWarm: false, flash: 0, wrap: false, socks: false, matches: 11,
    inv: { phone: 1, keys: 1, wallet: 1 }, stash: {}, uses: {},
    f: {}, log: [],
  };
}

export const settings = Object.assign({ mic: false, motion: false, easy: false, noTimers: false, sound: true }, load(SETTINGS_KEY, {}));
export function saveSettings() { store(SETTINGS_KEY, settings) }

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function fmtT(t) { const m = ((Math.floor(t) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') }
export function g(S, m, f) { return S.fem ? f : m }
export function tx(S, s) {
  if (typeof s === 'function') s = s(S);
  if (!S) return String(s);
  return String(s).replace(/\{name\}/g, S.name).replace(/\{g:([^|}]*)\|([^}]*)\}/g, (_, a, b) => S.fem ? b : a);
}
