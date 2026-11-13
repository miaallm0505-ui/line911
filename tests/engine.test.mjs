// Проверка движка без браузера: тело, машина, телефон, часы. Плюс отчёт по балансу: сколько живёт герой.
import { newState, START_MIN, DAWN_MIN, fmtT } from '../src/engine/state.js';
import { step, deathCheck } from '../src/engine/body.js';
let fail = 0; const ok = (n, c, i = '') => { console.log((c ? 'OK   ' : 'FAIL ') + n + (i ? ' — ' + i : '')); if (!c) fail++ };

function sim(setup, minutes = DAWN_MIN - START_MIN, each) {
  const S = newState(); S.t = START_MIN; setup(S);
  for (let m = 0; m < minutes; m++) { if (each) each(S, m); step(S, 1); S.t++; const d = deathCheck(S); if (d) return { S, d, at: m } }
  return { S, d: null, at: minutes };
}
const show = r => `${r.d ? 'смерть ' + r.d + ' в ' + fmtT(START_MIN + r.at) + ` (через ${Math.floor(r.at / 60)} ч ${r.at % 60} мин)` : 'дожил до рассвета'} · тело ${r.S.core.toFixed(1)}°F, салон ${Math.round(r.S.cabin)}°F, руки ${Math.round(r.S.hands)}, заряд ${Math.round(r.S.bat)}%`;

console.log('\n— Баланс за ночь (23:41 → 08:09) —');
const passive = sim(S => { });
console.log('Сидеть в машине, ничего не делать:  ', show(passive));
const wrap = sim(S => { S.wrap = true });
console.log('Укутаться шарфом/пледом:            ', show(wrap));
const engine = sim(S => { S.engineOn = true });
console.log('Включить мотор, трубу не чистить:   ', show(engine));
const engPipe = sim(S => { S.engineOn = true; S.pipe = true; S.pipeAt = START_MIN });
console.log('Мотор + чистая труба (раз за ночь): ', show(engPipe));
const smart = sim(S => { S.wrap = true }, undefined, (S, m) => { if (m % 60 === 0) { S.engineOn = true; S.pipe = true; S.pipeAt = S.t } if (m % 60 === 15) S.engineOn = false });
console.log('Мотор по 15 мин в час, труба чистая:', show(smart));
const outside = sim(S => { S.activity = 'walk' });
console.log('Идти пешком по лесу:                ', show(outside));

console.log('\n— Проверки —');
ok('Пассивно в машине нельзя дожить до утра (нужно действовать)', !!passive.d);
ok('Пассивно в машине живёшь хотя бы 2 часа (есть время понять, что делать)', passive.at >= 120, passive.at + ' мин');
ok('Мотор с заваленной трубой убивает угарным газом', engine.d === 'end_co');
ok('Мотор с заваленной трубой даёт хотя бы 15 минут', engine.at >= 15, engine.at + ' мин');
ok('Разумная стратегия позволяет дожить до рассвета', !smart.d, show(smart));
ok('Пешком по лесу смерть быстрее, чем в машине', outside.at < passive.at, outside.at + ' < ' + passive.at);
ok('Телефон не садится раньше чем за 3 часа', (() => { const r = sim(S => { S.wrap = true; S.engineOn = true; S.pipe = true }, 180); return r.S.bat > 0 })());
ok('Обморожение необратимо: нижняя граница рук растёт', (() => { const r = sim(S => { S.activity = 'dig' }, 40); const p = r.S.handsP; for (let i = 0; i < 300; i++) { r.S.activity = 'car'; r.S.cabin = 70; step(r.S, 1) } return p > 0 && r.S.hands >= p - 0.01 })());
ok('Температура тела не поднимается выше 98.6', (() => { const S = newState(); S.activity = 'fire'; for (let i = 0; i < 500; i++) step(S, 1); return S.core <= 98.6 })());
ok('Дробные шаги дают тот же результат, что целые', (() => { const a = newState(), b = newState(); for (let i = 0; i < 60; i++) step(a, 1); for (let i = 0; i < 600; i++) step(b, .1); return Math.abs(a.core - b.core) < .05 && Math.abs(a.cabin - b.cabin) < .5 })(), '');
console.log(fail ? `\n${fail} проверок не прошло` : '\nВсе проверки пройдены');
process.exitCode = fail ? 1 : 0;
ok('Укутавшись и ничего не делая, до рассвета не дожить (с запасом в час)', wrap.d && wrap.at < DAWN_MIN - START_MIN - 60, show(wrap));
