// Реальное время. Часы идут всегда — даже когда игра закрыта.
// compressed: 1 игровая минута = 10 с; real: 1 игровая минута = 60 с.
// В опасные моменты (danger) время всегда идёт секунда в секунду.
import { step } from './body.js';

const RATE = { compressed: 10, real: 60 };   // реальных секунд на игровую минуту
let S = null, timer = null, listeners = [], danger = 0, frozen = 0, pauseFn = null;
export function setPause(fn) { pauseFn = fn }

export function attach(state) { S = state; S.realTs = S.realTs || Date.now() }
export function onTick(fn) { listeners.push(fn) }
export function setDanger(on) { danger = Math.max(0, danger + (on ? 1 : -1)) }
export function isDanger() { return danger > 0 }
export function resetDanger() { danger = 0 }
export function freeze(on) { frozen = Math.max(0, frozen + (on ? 1 : -1)) }   // только для меню и концовок
export function secPerMin() { return danger > 0 ? 60 : RATE[S.mode] || 10 }

// Продвинуть игровое время на dtMin, считая тело поминутно
export function advance(dtMin) {
  while (dtMin > 0) { const d = Math.min(1, dtMin); S.t += d; step(S, d); dtMin -= d }
}

function tick() {
  if (!S) return;
  const now = Date.now();
  const realSec = (now - S.realTs) / 1000;
  S.realTs = now;
  if (frozen || realSec <= 0 || (pauseFn && pauseFn())) return;
  advance(realSec / secPerMin());
  listeners.forEach(f => f(S));
}

export function start() { stop(); S.realTs = Date.now(); timer = setInterval(tick, 1000) }
export function stop() { clearInterval(timer); timer = null }

// Возвращение в игру после паузы: досчитать, что случилось (не больше 3 игровых часов за раз)
export function catchUp() {
  if (!S) return null;
  const realSec = (Date.now() - S.realTs) / 1000;
  if (realSec < 20) return null;
  const before = { t: S.t, cabin: S.cabin, core: S.core, bat: S.bat };
  const mins = Math.min(180, realSec / (RATE[S.mode] || 10));
  S.realTs = Date.now();
  advance(mins);
  return { mins, before };
}
