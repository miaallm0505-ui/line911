// Проигрыватель сцен. Сцена — асинхронная функция (S, h) => id следующей сцены.
// h — набор помощников: текст, реплики, выборы, механики, звук. В режиме автотеста всё решается само.
import * as ui from '../ui/ui.js';
import * as au from '../engine/audio.js';
import * as clock from '../engine/clock.js';
import { deathCheck } from '../engine/body.js';
import { store, SAVE_KEY, clamp } from '../engine/state.js';
import { rec, checkpoint, replaying } from '../engine/replay.js';
// снимок состояния после механики: при «Продолжить» механика не запускается заново, а состояние восстанавливается
const snap = S => JSON.parse(JSON.stringify(S));
const restore = (S, v) => { for (const k in v) S[k] = v[k] };
import { dialer, timed, question, echo } from '../mechanics/phone.js';
import { freeze, dig, match, knock3 } from '../mechanics/body.js';
import { frost } from '../mechanics/frost.js';
import { sigil } from '../mechanics/sigil.js';
import { flashlight, diary } from '../mechanics/light.js';
import { crank, radio, ladder } from '../mechanics/tower.js';
import { blizzard, combine } from '../mechanics/world.js';

export const WHO = { d: 'Дениз · 911', m: 'Марси Толонен · диспетчерская', k: 'Кейли', x: '???', j: 'Джесс', w: 'Уолт', r: 'Помощник шерифа',
  J: 'Джеймс', A: 'Эндрю', T: 'Тиффани', M: 'Микаэла', P: 'Прия', Jo: 'Джош', B: 'Брэд Коулман', C: 'Кэрол Данн' };
const AMB = {
  silent: [{}, true], road: [{ storm: .35, blizzard: .2 }, true], car: [{ storm: .5, blizzard: .25 }, true],
  out: [{ storm: .75, blizzard: .55 }, false], forest: [{ blizzard: .7, storm: .3 }, false],
};
const AUTO = () => !!window.__AUTOPLAY;
const pick = a => a[Math.floor(Math.random() * a.length)];

export function helpers(S) {
  const h = {
    S,
    alive: () => true,
    para: t => AUTO() ? ui.para(t) : ui.para(t),
    sys: (t, c) => ui.sys(t, c),
    note: (a, b) => ui.note(a, b),
    say: (k, t, label, typing = true) => ui.say(label != null ? label : (WHO[k] || ''), t, k, typing),
    me: t => ui.me(t),
    chat: (title, sub) => ui.chatHead(title, sub),
    msg: (k, t) => ui.msg(WHO[k] || k, t, k),
    send: t => ui.myMsg(t),
    dark: lvl => ui.dark(lvl),
    wait: ms => ui.wait(ms),
    async choose(opts) {
      const vis = opts.filter(o => !o.if || o.if(S));
      const i = await rec(async () => vis.indexOf(AUTO() ? pick(vis) : await ui.choose(vis)));
      const o = vis[i] || vis[0];
      if (o.send) ui.myMsg(o.send === true ? o.t.replace(/^«|»$/g, '') : o.send); else if (o.say) ui.me(o.say === true ? o.t : o.say); else if (o.say !== false) ui.act(o.t);
      if (o.fx) o.fx(S);
      return o;
    },
    async timed(opts, sec) {
      const v = await rec(async () => { const o = AUTO() ? (Math.random() < .2 ? { silence: true } : pick(opts)) : await timed(S, opts, sec); return o.silence ? -1 : opts.indexOf(o) });
      const o = v < 0 ? { silence: true } : opts[v];
      if (o.silence) ui.act('Я промолчал.'); else if (o.say !== false) ui.me(o.say || o.t);
      return o;
    },
    amb(name, extra = {}) { const [l, inside] = AMB[name] || AMB.car; const L = Object.assign({}, l, extra); if (S.engineOn && name === 'car') L.engine = .55; if (h._call) Object.assign(L, h._call); au.mix(L, inside); h._amb = name; h._ambx = extra },
    call(who, num, layer) { ui.callShow(who, num, layer === 'evil'); h._call = layer === 'office' ? { office: .45, static: .08 } : layer === 'kitchen' ? { kitchen: .5 } : { static: .22, murmur: .12 }; h.amb(h._amb || 'car', h._ambx); clock.setDanger(true) },
    endcall() { ui.callHide(); au.play('hangup', { vol: .6 }); h._call = null; h.amb(h._amb || 'car', h._ambx); clock.setDanger(false) },
    snd: (n, o) => au.play(n, o),
    sweep: (n, a, b, d, o) => au.sweep(n, a, b, d, o),
    knock3(pan = 0, roof = true) { knock3(pan, roof) },
    shake: ui.shake, flash: ui.flash, toast: ui.toast,
    danger(on) { clock.setDanger(on); ui.setDangerUI(on) },
    // поставить часы сцены: h.at('17:15') или h.at('17:15', 'ЗАГОЛОВОК'); время после полуночи считается следующими сутками
    async at(hhmm, label) {
      const [hh, mm] = hhmm.split(':').map(Number); let m = hh * 60 + mm;
      if (m < 12 * 60 && S.t >= 18 * 60) m += 24 * 60;
      clock.setTime(m); ui.hud();
      await ui.sys(label || hhmm);
    },
    tick(min, act) { const p = S.activity; if (act) S.activity = act; clock.advance(min); S.activity = p; ui.hud() },
    // механики (каждая записывается вместе со снимком состояния — см. ниже)
    m: {
      dialer: o => AUTO() ? Promise.resolve(pick(['911', '911', '5551234'])) : dialer(S, o),
      question: o => AUTO() ? Promise.resolve('Кому ты записывала сообщение?') : question(S, o),
      echo,
      freeze: o => AUTO() ? Promise.resolve(pick(['ok', 'heard', 'moved'])) : freeze(S, o),
      dig: o => AUTO() ? (S.hands += 6, Promise.resolve({ sec: 20 })) : dig(S, o),
      match: o => AUTO() ? (S.matches = Math.max(0, S.matches - 2), Promise.resolve({ lit: Math.random() < .6, used: 2 })) : match(S, o),
      frost: o => AUTO() ? Promise.resolve({ seen: Math.random() < .8 }) : frost(S, o),
      sigil: o => AUTO() ? Promise.resolve({ ok: Math.random() < .7 }) : sigil(S, o),
      flashlight: o => AUTO() ? Promise.resolve({ found: true }) : flashlight(S, o),
      diary: o => AUTO() ? Promise.resolve() : diary(S, o),
      crank: o => AUTO() ? Promise.resolve({ sec: 30 }) : crank(S, o),
      radio: o => AUTO() ? Promise.resolve({ station: pick(['gus', 'marcy', 'denise', null]) }) : radio(S, o),
      ladder: o => AUTO() ? Promise.resolve({ slips: 1 }) : ladder(S, o),
      blizzard: o => AUTO() ? Promise.resolve({ arrived: Math.random() < .8 }) : blizzard(S, o),
      combine: (items, combos, o) => AUTO() ? Promise.resolve({ made: Object.keys(combos)[0] }) : combine(S, items, combos, o),
    },
  };
  for (const k in h.m) { if (k === 'echo') continue; const fn = h.m[k]; h.m[k] = (...a) => rec(async () => ({ r: await fn(...a), S: snap(S) })).then(v => { if (v && v.S) restore(S, v.S); return v ? v.r : v }) }
  h.snapshot = () => snap(S); h.restore = v => restore(S, v);
  return h;
}

// Запуск цепочки сцен. scenes: {id: async (S,h) => nextId | {end:'id'}}
// Смерть может наступить посреди сцены (время идёт само). Тогда сцена обрывается:
// все помощники h после этого бросают ABORT, оверлеи и выборы убираются, играет сцена смерти.
const ABORT = { abort: true };
let killer = null;
export function interrupt(sceneId) { if (killer) killer(sceneId) }
function guard(h, st) {
  const wrap = fn => (...a) => { if (st.dead) throw ABORT; const r = fn(...a); return r && r.then ? r.then(v => { if (st.dead) throw ABORT; return v }) : r };
  const g = {};
  for (const k in h) g[k] = typeof h[k] === 'function' ? wrap(h[k].bind(h)) : h[k];
  g.m = {}; for (const k in h.m) g.m[k] = wrap(h.m[k]);
  return g;
}
export async function run(S, scenes, startId, onEnd, opt = {}) {
  let resumed = !!opt.resumed;
  const h0 = helpers(S);
  let id = startId;
  for (let n = 0; n < 400; n++) {
    const sc = scenes[id];
    if (!sc) throw new Error('Нет сцены: ' + id);
    S.scene = id;
    if (resumed) resumed = false; else checkpoint(S, id, document.querySelector('#log').innerHTML);
    ui.pace.fast = (!!window.__AUTOPLAY && !window.__SLOW) || replaying();
    clock.resetDanger(); ui.setDangerUI(false); if (h0._call) clock.setDanger(true);
    const st = { dead: false }; const h = guard(h0, st);
    const died = new Promise(r => killer = to => { if (st.dead || String(id).startsWith('end_')) return; st.dead = true; r(to) });
    let nx;
    try { nx = await Promise.race([sc(S, h), died.then(to => ({ __died: to }))]) }
    catch (e) { if (e !== ABORT) throw e; nx = { __died: await died } }
    killer = null;
    if (nx && nx.__died) {
      document.querySelectorAll('.mech').forEach(o => o.remove()); ui.clearChoices();
      if (h0._call) { ui.callHide(); h0._call = null }
      nx = nx.__died;
    }
    const d = deathCheck(S);
    if (d && scenes[d] && !String(id).startsWith('end_')) nx = d;
    if (nx && typeof nx === 'object' && nx.end) { await onEnd(nx, S); return nx }
    if (!nx) throw new Error('Сцена ' + id + ' не вернула продолжение');
    id = nx;
  }
  throw new Error('Слишком длинная цепочка сцен');
}
