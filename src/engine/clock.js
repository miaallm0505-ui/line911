// Игровое время. Часы двигаются только действиями и сценами: каждое действие «стоит» своих минут.
// Реальное время на игру не влияет: можно думать сколько угодно, закрыть игру и вернуться.
import { step } from './body.js';

let S = null, listeners = [];
export function attach(state) { S = state }
export function onTick(fn) { listeners.push(fn) }

// Продвинуть игровое время на dtMin, считая тело поминутно; после — сообщить подписчикам (HUD, проверка смерти)
export function advance(dtMin) {
  if (!S || !(dtMin > 0)) return;
  while (dtMin > 0) { const d = Math.min(1, dtMin); S.t += d; step(S, d); dtMin -= d }
  listeners.forEach(f => f(S));
}
// Поставить часы на конкретное время сцены (например, «18:45»), не прогоняя тело
export function setTime(min) { if (S) { S.t = min; listeners.forEach(f => f(S)) } }

// Совместимость со старыми вызовами: реального хода времени больше нет
export function start() { }
export function stop() { }
export function setDanger() { }
export function isDanger() { return false }
export function resetDanger() { }
export function freeze() { }
export function secPerMin() { return 60 }
export function setPause() { }
export function catchUp() { return null }
