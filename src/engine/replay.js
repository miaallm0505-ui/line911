// Сохранение посреди сцены. В начале каждой сцены делаем «контрольную точку»: состояние, текст на экране, id сцены.
// Дальше каждое действие игрока (тап «далее», выбор, ввод, результат механики) пишется в след (trail).
// «Продолжить» = восстановить точку и мгновенно проиграть след: игрок оказывается ровно там, где вышел.
import { store, load, drop, SAVE_KEY } from './state.js';

export const R = { cp: null, i: 0, on: false, onStop: null };
const SAVE = () => { if (!window.__AUTOPLAY && R.cp) store(SAVE_KEY, R.cp) };

export function checkpoint(S, scene, logHTML) {
  R.cp = { v: 2, scene, state: JSON.parse(JSON.stringify(S)), log: logHTML, trail: [] };
  R.i = 0; R.on = false; SAVE();
}
export function loadSave() { const s = load(SAVE_KEY); return s && s.v === 2 && s.scene && !String(s.scene).startsWith('end_') ? s : null }
export function clearSave() { drop(SAVE_KEY); R.cp = null }
// начать проигрывание следа сохранения
export function resume(cp) { R.cp = cp; R.i = 0; R.on = cp.trail.length > 0 }
function stop() { if (R.on) { R.on = false; R.onStop && R.onStop() } }
export const replaying = () => R.on;

// Обернуть ввод игрока: при проигрывании вернуть записанное, иначе дождаться настоящего ответа и записать его
export async function rec(real) {
  if (R.on) {
    if (R.i < R.cp.trail.length) { const v = R.cp.trail[R.i++]; if (R.i >= R.cp.trail.length) stop(); return v }
    stop();
  }
  const v = await real();
  if (R.cp) { R.cp.trail.push(v === undefined ? null : v); SAVE() }
  return v;
}
