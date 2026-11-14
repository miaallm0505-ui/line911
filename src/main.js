// Точка входа: стартовый экран, разрешения, ночь в реальном времени, лаборатория механик.
import * as ui from './ui/ui.js';
import * as au from './engine/audio.js';
import * as clock from './engine/clock.js';
import * as dev from './engine/device.js';
import { newState, settings, saveSettings, store, load, drop, SAVE_KEY, START_MIN, fmtT, tx } from './engine/state.js';
import { run, interrupt } from './story/runner.js';
const START_SCENE = 'office1';
import { deathCheck } from './engine/body.js';
import { scenes } from './story/michael.js';
import { LAB } from './lab.js';
import { missedScreen } from './mechanics/phone.js';

let S = null, playing = false, hiddenAt = 0, pendingMissed = null;
const $ = ui.$;

// ---------- стартовый экран
function startScreen() {
  const saved = load(SAVE_KEY);
  $('#start').hidden = false; $('#game').hidden = true;
  $('#cont').hidden = !(saved && saved.scene && !String(saved.scene).startsWith('end_'));
  let fem = false, mode = 'compressed';
  $('#mc').onclick = () => { mode = 'compressed'; $('#mc').classList.add('on'); $('#mr').classList.remove('on') };
  $('#mr').onclick = () => { mode = 'real'; $('#mr').classList.add('on'); $('#mc').classList.remove('on') };
  $('#go').onclick = async () => { au.init(); S = newState('Майкл', false, mode); S.t = 16 * 60 + 20; begin(START_SCENE) };
  $('#cont').onclick = async () => { au.init(); S = saved; begin(saved.scene, true) };
  $('#lab').onclick = () => { au.init(); openLab() };
  $('#perm').onclick = () => permissions();
}

// ---------- разрешения: всё по согласию, у каждой механики есть запасной вариант
function permissions() {
  const ov = ui.overlay('Настройки и разрешения', 'Всё необязательно. Без разрешений игра проходится полностью.', { cls: 'perm' });
  const rows = [
    ['mic', 'Микрофон', '«Замри»: игра слышит, если ты кашлянешь или заговоришь, пока снаружи ходят. Без микрофона — не касайся экрана и не двигай телефон.', dev.askMic],
    ['notify', 'Уведомления', 'Если выйдешь из игры посреди ночи, тебе может прийти «Пропущенный вызов: 911».', dev.askNotify],
    ['motion', 'Наклон телефона', 'Фонарик водится наклоном, а не пальцем.', dev.askMotion],
    ['easy', 'Упростить действия', 'Спичка, лестница, генератор и метель становятся легче. Для тех, кто пришёл за историей.', null],
    ['noTimers', 'Без таймеров', 'Срочные решения ждут тебя столько, сколько нужно. Пропадает часть напряжения.', null],
    ['sound', 'Звук', 'Тихий фон: ветер и метель. Резких звуков нет.', null],
  ];
  rows.forEach(([k, t, d, ask]) => {
    const r = ui.el('div', 'prow'); r.innerHTML = '<div><b></b><p></p></div><button></button>';
    r.querySelector('b').textContent = t; r.querySelector('p').textContent = d;
    const b = r.querySelector('button'); const upd = () => { b.textContent = settings[k] ? 'Вкл' : 'Выкл'; b.className = settings[k] ? 'on' : '' }; upd();
    b.onclick = async () => {
      if (!settings[k] && ask) await ask(); else settings[k] = !settings[k];
      if (k === 'sound') au.setSound(settings.sound); saveSettings(); upd();
    };
    ov.body.appendChild(r);
  });
  ov.button('Готово', () => ov.close());
}

// ---------- ночь
async function begin(sceneId, resumed) {
  $('#start').hidden = true; $('#game').hidden = false; ui.bind(S); clock.attach(S);
  $('#log').innerHTML = '';
  if (resumed) {
    const r = clock.catchUp();
    ui.sys('— ПРОДОЛЖЕНИЕ · ' + fmtT(S.t) + ' —');
    if (r) ui.toast(`Пока тебя не было, прошло ${Math.round(r.mins)} мин. Салон: ${Math.round(S.cabin)}°F`);
    const dd = deathCheck(S); if (dd) sceneId = dd;
  }
  if (S.f.realtime) { clock.start(); $('#bar').classList.add('on') }
  playing = true; dev.keepAwake(true);
  try {
    await run(S, wrapScenes(), sceneId, endCard);
  } catch (e) { console.error(e); ui.toast('Ошибка: ' + e.message, true); if (window.__AUTOPLAY) window.__ERR = (window.__ERR || []).concat(String(e.stack || e)) }
}
// включаем часы в момент аварии
function wrapScenes() {
  const w = Object.assign({}, scenes);
  const crash = scenes.crash;
  if (crash) w.crash = async (S, h) => { const r = await crash(S, h); S.t = START_MIN + 0.5; clock.attach(S); clock.start(); $('#bar').classList.add('on'); ui.hud(); return r };
  return w;
}
clock.onTick(() => { ui.hud(); if (playing && S) { const d = deathCheck(S); if (d) interrupt(d) } });

async function endCard(end, S) {
  clock.stop(); playing = false; dev.keepAwake(false); drop(SAVE_KEY);
  const d = ui.el('div', 'endcard' + (end.end === 'proto' ? ' act' : ''));
  d.innerHTML = '<small></small><h2></h2><p></p><div class="cnt"></div>';
  d.querySelector('small').textContent = end.end === 'proto' ? 'ПРОТОТИП' : 'КОНЦОВКА';
  d.querySelector('h2').textContent = end.title; d.querySelector('p').textContent = end.desc || '';
  d.querySelector('.cnt').textContent = `${fmtT(S.t)} · тело ${S.core.toFixed(1)}°F · руки ${Math.round(S.hands)}% · рассудок ${Math.round(S.sanity)}% · заряд ${Math.round(S.bat)}%`;
  $('#log').appendChild(d); $('#log').scrollTop = 1e9;
  if (window.__AUTOPLAY) { window.__END = end.end; return }
  const o = await ui.choose([{ t: '↻ Начать ночь заново' }, { t: '⚙ Лаборатория механик' }, { t: '⌂ В меню' }]);
  if (o.t.includes('заново')) { S = newState('Майкл', false, S.mode); S.t = 16 * 60 + 20; begin(START_SCENE) }
  else if (o.t.includes('Лаборатория')) openLab(); else startScreen();
}

// ---------- тело (панель)
$('#bodyBtn').onclick = () => {
  if (!S) return;
  const ov = ui.overlay('Тело', 'Обновляется в реальном времени', { cls: 'bodyp' });
  const box = ui.el('div', 'stats'); ov.body.appendChild(box);
  const lvl = v => v < 25 ? 'норма' : v < 50 ? 'слабо' : v < 75 ? 'сильно' : 'критично';
  const draw = () => {
    if (!ov.root.isConnected) return clearInterval(iv);
    const rows = [['Температура тела', S.core.toFixed(1) + '°F', (S.core - 86) / 12.6], ['Руки', lvl(S.hands), 1 - S.hands / 100], ['Ноги', lvl(S.feet), 1 - S.feet / 100], ['Голод', lvl(S.hunger), 1 - S.hunger / 100], ['Жажда', lvl(S.thirst), 1 - S.thirst / 100], ['Усталость', lvl(S.fatigue), 1 - S.fatigue / 100], ['Кровь', Math.round(S.blood) + '%', S.blood / 100], ['Рассудок', Math.round(S.sanity) + '%', S.sanity / 100], ['Салон', Math.round(S.cabin) + '°F', (S.cabin + 24) / 98], ['Телефон', Math.round(S.bat) + '%', S.bat / 100]];
    box.innerHTML = rows.map(([a, b, k]) => `<div class="st ${k < .35 ? 'bad' : k < .6 ? 'mid' : ''}"><div class="l"><span>${a}</span><b>${b}</b></div><div class="bar"><i style="width:${Math.max(0, Math.min(1, k)) * 100}%"></i></div></div>`).join('');
  };
  draw(); const iv = setInterval(draw, 1000);
  ov.button('Закрыть', () => ov.close());
};
$('#snd').onclick = () => { au.setSound(!settings.sound); $('#snd').textContent = settings.sound ? '🔊' : '🔇' };
$('#snd').textContent = settings.sound ? '🔊' : '🔇';
// тап по ленте = «далее» (прокрутка пальцем тапом не считается)
$('#log').addEventListener('click', () => ui.advance());
// время на паузе, пока герой читает; идёт, пока выбираешь и действуешь
clock.setPause(() => ui.reader.reading);

// ---------- уход и возвращение: время идёт, звонят пропущенные
// Android сообщает о сворачивании системным событием (appStateChange), браузер — visibilitychange. Ловим оба, без двойных срабатываний.
let away = false;
async function setAway(on) {
  if (on === away) return; away = on;
  if (!S || !playing || !S.f.realtime) return;
  if (on) {
    clock.stop(); au.suspend(true); dev.keepAwake(false); store(SAVE_KEY, S);
    // звонок «приходит» через 40 с отсутствия; шторка уведомлений или быстрый выход его не вызывают
    const at = fmtT(S.t + 40 / clock.secPerMin() + Math.random() * 2);
    hiddenAt = Date.now(); pendingMissed = { who: '911', time: at };
    dev.scheduleMissed('Пропущенный вызов', '911 · ' + at, 40);
  } else {
    au.suspend(false); dev.cancelAll(); dev.keepAwake(true);
    if (pendingMissed && Date.now() - hiddenAt >= 40000) S.missed.push(pendingMissed); pendingMissed = null;
    const r = clock.catchUp(); clock.start(); ui.hud();
    const dd = deathCheck(S); if (dd) { interrupt(dd); return }
    if (r && r.mins > 1) ui.toast(`Пока тебя не было: ${Math.round(r.mins)} мин. Салон остыл до ${Math.round(S.cabin)}°F`);
    if (S.missed.length && r) { const list = S.missed.slice(); S.missed = []; await missedScreen(S, list) } else S.missed = [];
  }
}
document.addEventListener('visibilitychange', () => setAway(document.hidden));
dev.onAppState(active => setAway(!active));

// ---------- лаборатория
function openLab() {
  const D = newState('Алекс', false, 'compressed'); D.flash = 80; ui.bind(D); clock.attach(D);
  const ov = ui.overlay('Лаборатория механик', 'Каждую можно попробовать отдельно. В игре они появляются в своих сценах.', { cls: 'lab' });
  LAB.forEach((m, i) => {
    const r = ui.el('div', 'lcard'); r.innerHTML = '<div><small></small><b></b><p></p></div><button>▶</button>';
    r.querySelector('small').textContent = String(i + 1).padStart(2, '0'); r.querySelector('b').textContent = m.n; r.querySelector('p').textContent = m.d;
    r.querySelector('button').onclick = async () => { try { const res = await m.run(D); if (res) ui.toast(res) } catch (e) { ui.toast('Ошибка: ' + e.message, true) } };
    ov.body.appendChild(r);
  });
  ov.button('В меню', () => { ov.close(); startScreen() });
}

// ---------- автотест (запускается из tests/play.py)
window.__state = () => S;
window.__audioState = () => au.audio.ctx ? au.audio.ctx.state : 'нет';
window.__audioCount = () => Object.keys(au.audio.buf).length;
window.__autoplay = async (from = START_SCENE) => { window.__AUTOPLAY = true; window.__END = null; ui.pace.fast = !window.__SLOW; await au.init(); S = newState('Майкл', false); S.t = 16 * 60 + 20; if (!['office1'].includes(from)) { S.f.realtime = 1; S.t = START_MIN + 5 } await begin(from); return window.__END };

// ---------- снег
(function snow() {
  const c = $('#snow'), x = c.getContext('2d'); let W, H; const P = [];
  const rs = () => { W = c.width = innerWidth; H = c.height = innerHeight }; rs(); addEventListener('resize', rs);
  for (let i = 0; i < 140; i++) P.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.7 + .4, s: Math.random() * 1.2 + .5, d: Math.random() * 2 + 1 });
  (function f() { x.clearRect(0, 0, W, H); x.fillStyle = 'rgba(220,230,235,.75)'; P.forEach(p => { p.x += p.d * .7; p.y += p.s; if (p.x > W) p.x = -5; if (p.y > H) { p.y = -5; p.x = Math.random() * W } x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill() }); requestAnimationFrame(f) })();
})();

// ---------- кнопка «Назад» на Android: закрыть механику нельзя, из игры — двойным нажатием (ночь продолжится)
let backAt = 0;
dev.onBack(() => {
  if (document.querySelector('.mech.lab, .mech.perm, .mech.bodyp')) { document.querySelector('.mech .mf button:last-child')?.click(); return }
  if (document.querySelector('.mech')) return;
  if (Date.now() - backAt < 2000) return dev.minimize();
  backAt = Date.now(); ui.toast(playing ? 'Ещё раз — свернуть. Ночь не остановится.' : 'Ещё раз — выйти');
});
dev.statusBar();
startScreen();
