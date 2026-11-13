// Лаборатория: все механики по отдельности.
import * as au from './engine/audio.js';
import * as dev from './engine/device.js';
import * as clock from './engine/clock.js';
import { settings, fmtT } from './engine/state.js';
import { dialer, timed, question, echo, missedScreen } from './mechanics/phone.js';
import { freeze, dig, match, knock3 } from './mechanics/body.js';
import { frost } from './mechanics/frost.js';
import { sigil, SHAPES } from './mechanics/sigil.js';
import { flashlight, diary } from './mechanics/light.js';
import { crank, radio, ladder } from './mechanics/tower.js';
import { blizzard, combine } from './mechanics/world.js';
import { overlay, el } from './ui/ui.js';
import { demo3d } from './demo3d.js';

export const LAB = [
  { n: '3D: салон после аварии', d: 'Черновик новой графики в стиле PS1. Осмотрись, протри стекло, зажги спичку, выключи фары. Смотри в лес.', run: () => demo3d() },
  { n: 'Реальное время', d: 'Часы идут, пока ты думаешь. Смотри, как остывает салон и садится телефон.', run: S => new Promise(res => {
    const ov = overlay('Реальное время', 'Сжатая ночь: 1 игровая минута = 10 секунд. Опасные моменты — секунда в секунду.');
    const b = el('div', 'rt'); ov.body.appendChild(b); clock.attach(S); clock.start();
    const iv = setInterval(() => { b.innerHTML = `<div class="big">${fmtT(S.t)}</div><p>Салон: ${S.cabin.toFixed(1)}°F<br>Тело: ${S.core.toFixed(2)}°F<br>Телефон: ${S.bat.toFixed(1)}%<br>Голод: ${S.hunger.toFixed(1)}</p><p class="dim">${clock.isDanger() ? 'ОПАСНОСТЬ — время идёт секунда в секунду' : 'Обычный ход времени'}</p>` }, 250);
    ov.button('Опасный момент вкл/выкл', () => clock.setDanger(!clock.isDanger()));
    ov.button('Закрыть', () => { clearInterval(iv); clock.stop(); if (clock.isDanger()) clock.setDanger(false); ov.close(); res() });
  }) },
  { n: 'Иней на стекле', d: 'Протри пальцем, чтобы выглянуть. Иней нарастает снова.', run: async S => { const r = await frost(S, { scene: { prints: true, figure: { x: .85, y: .58 } }, target: { x: .3, y: .6, w: .45, h: .35 }, reveal: 'Следы. Пальцев — семь.' }); return r.seen ? 'Разглядел(а).' : 'Не успел(а).' } },
  { n: 'Знак на инее', d: 'Нарисуй пальцем условный знак. Голос оно крадёт, знак — нет.', run: async S => { const want = SHAPES[Math.floor(Math.random() * SHAPES.length)]; const r = await sigil(S, { want }); return r.ok ? 'Кейли узнала знак.' : 'Знак не получился.' } },
  { n: 'Звонилка', d: 'Набери номер сам: 911 или номер Марси +1 (906) 387-4410.', run: async S => { const n = await dialer(S, { hint: 'Набери 911 или 9063874410', cancel: 'Отмена' }); return n === '911' ? 'Гудки… На шестом — щелчок.' : n === '9063874410' ? 'Центральная диспетчерская, Марси Толонен.' : n ? 'Номер не обслуживается.' : null } },
  { n: 'Звонок с таймером', d: 'Дениз ждёт ответа. Молчание — тоже ответ.', run: async S => { const r = await timed(S, [{ t: '«Да. Один»' }, { t: '«Нет. Нас двое»' }], 7); return r.silence ? 'Дениз: «Молчите. Это ничего. Я и так знаю».' : r.t.includes('двое') ? 'Дениз: «Я слышу только одно сердце, милый».' : 'Дениз: «Хорошо. Это хорошо».' } },
  { n: 'Стук в руке', d: 'Три удара вибрацией телефона и звуком по сторонам.', run: async () => { knock3(-.8); await new Promise(r => setTimeout(r, 2600)); knock3(.8); return 'Слева… теперь справа.' } },
  { n: 'Замри', d: 'Молчи по-настоящему. С микрофоном — оно слышит. Без — не трогай экран.', run: async S => { const r = await freeze(S, { sec: 10 }); return r === 'ok' ? 'Шаги уходят.' : r === 'heard' ? 'Оно услышало.' : 'Ты пошевелил(ась).' } },
  { n: 'Выхлопная труба', d: 'Разгребай снег частыми касаниями. Руки мёрзнут.', run: async S => { const r = await dig(S); return `Готово за ${Math.round(r.sec)} с. Руки: ${Math.round(S.hands)}%` } },
  { n: 'Спичка', d: 'Чиркни по тёрке и прикрой пламя от ветра.', run: async S => { if (S.matches < 3) S.matches = 11; const r = await match(S); return r.lit ? `Горит. Спичек осталось: ${S.matches}` : `Не вышло. Спичек осталось: ${S.matches}` } },
  { n: 'Вопрос своими словами', d: 'Напиши проверочный вопрос. Мимик повторит его твоим голосом.', run: async S => { const q = await question(S); return 'Из-за стекла твоим голосом: «' + echo(q)[1] + '»' } },
  { n: 'Фонарик наклоном', d: 'Найди лучом «Хонду» Кейли. Включи наклон в настройках или веди пальцем.', run: async S => { const r = await flashlight(S, { scene: { car: { x: .72, y: .72, blink: true } }, target: { x: .72, y: .66 }, found: 'Серебристая «Хонда», замело почти до крыши.' }); return r.found ? 'Нашёл(а).' : null } },
  { n: 'Дневник с фонариком', d: 'Страница видна только под лучом.', run: async S => { await diary(S, { title: 'Журнал рейнджера · 1998', lines: ['28.12. Стучит трижды. Говорит голосом Айно.', '29.12. Д. больше не дрожит. Говорит, что не голодна.', '30.12. Она спросила, сколько во мне мяса. Я не понял вопроса.', '31.12. Оно обещает взять только одного. Господи, прости меня.'] }) } },
  { n: 'Генератор', d: 'Крути ручку по кругу. Снизу стучат.', run: async S => { const r = await crank(S); return `Заряжено за ${Math.round(r.sec)} с.` } },
  { n: 'Рация', d: 'Найди Гаса на 27.185, Марси на 27.065. И не слушай пустую частоту.', run: async S => { const r = await radio(S); return r.station === 'gus' ? 'Гас: «Слышу тебя! Держись, пробиваюсь»' : r.station === 'marcy' ? 'Марси: «Слышу вас, назовите себя»' : r.station === 'denise' ? 'Эфир молчит. Потом: «…милый…»' : 'Никто не ответил.' } },
  { n: 'Лестница вышки', d: 'Левая — правая — в такт.', run: async S => { const r = await ladder(S); return `Наверху. Срывов: ${r.slips}.` } },
  { n: 'Вещи руками', d: 'Перетащи батарейки на фонарик.', run: async S => { const r = await combine(S, [{ k: 'flashlight', n: 'Фонарик', icon: '🔦' }, { k: 'batteries', n: 'Батарейки', icon: '🔋' }, { k: 'matches', n: 'Спички', icon: '🔥' }, { k: 'medkit', n: 'Аптечка', icon: '✚' }], { 'batteries+flashlight': S => { S.flash = 100; return 'Щелчок — и ровный белый луч.' } }); return r.made ? 'Фонарик работает.' : null } },
  { n: 'Метель', d: 'Держи курс по компасу. Ветер сносит, следы заметает.', run: async S => { const r = await blizzard(S); return r.arrived ? 'Дошёл(ла).' : 'Заблудился(лась).' } },
  { n: 'Пропущенный вызов', d: 'Выйди из игры на 15 секунд. Если включены уведомления — тебе позвонят.', run: async S => {
    S.missed = [{ who: '911', time: fmtT(S.t + 2) }, { who: '911', time: fmtT(S.t + 5) }];
    if (settings.notify) dev.scheduleMissed('Пропущенный вызов', '911 · ' + fmtT(S.t + 2), 10);
    await new Promise(r => { const h = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', h); r() } }; document.addEventListener('visibilitychange', h); setTimeout(() => { document.removeEventListener('visibilitychange', h); r() }, 20000) });
    await missedScreen(S, S.missed); S.missed = [];
  } },
  { n: 'Звук по сторонам', d: 'В наушниках: шаги обходят машину слева направо.', run: async () => { au.sweep('steps', -1, 1, 6); await new Promise(r => setTimeout(r, 6500)); return 'Обошло.' } },
];
