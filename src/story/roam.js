// Свободное выживание между сюжетными сценами: локации, действия, переходы, вещи.
// Время идёт само (пока выбираешь), а каждое действие ещё и «стоит» игровых минут.
// Сюжетные события (стук, звонок) могут прервать меню в любой момент.
import * as ui from '../ui/ui.js';
import { openInventory } from '../ui/inventory.js';
import { deathCheck } from '../engine/body.js';
import { weight, CAP } from '../engine/items.js';
import { fmtT } from '../engine/state.js';
import { rec } from '../engine/replay.js';

const AUTO = () => !!window.__AUTOPLAY;
const txt = (S, v) => typeof v === 'function' ? v(S) : v;
const cost = m => m >= 60 ? `≈ ${Math.round(m / 6) / 10} ч` : `≈ ${m} мин`;

// меню, которое может прервать сюжетное событие
function menu(S, h, opts, events) {
  return new Promise(res => {
    let done = false;
    const finish = v => { if (done) return; done = true; clearInterval(iv); ui.clearChoices(); res(v) };
    const iv = setInterval(() => {
      try { h.alive() } catch (e) { clearInterval(iv); return }      // сцену оборвала смерть
      const ev = events.find(e => !S.f['ev_' + e.id] && e.when(S));
      if (ev) finish({ event: ev });
    }, 400);
    const ready = events.find(e => !S.f['ev_' + e.id] && e.when(S));
    if (ready) return finish({ event: ready });
    if (AUTO()) { setTimeout(() => finish(opts[Math.floor(Math.random() * opts.length)]), 0); return }
    const box = document.querySelector('#choices'); box.innerHTML = '';
    opts.forEach(o => {
      const b = ui.el('button', 'cost' + (o.danger ? ' danger' : ''));
      const t = ui.el('span'); t.textContent = o.t; b.appendChild(t);
      if (o.min) { const c = ui.el('span', 't'); c.textContent = cost(o.min); b.appendChild(c) }
      b.onclick = () => finish(o); box.appendChild(b);
    });
    ui.keepLast();
  });
}

export async function roam(S, h, LOC, opt = {}) {
  const events = opt.events || [];
  S.visited = S.visited || {};
  let headerShown = null;
  for (let guard = 0; guard < 2000; guard++) {
    const L = LOC[S.loc]; if (!L) throw new Error('Нет локации ' + S.loc);
    if (headerShown !== S.loc) {
      headerShown = S.loc;
      ui.header(txt(S, L.n) + ' · ' + fmtT(S.t));
      if (!S.visited[S.loc]) { S.visited[S.loc] = 1; if (L.first) await h.para(txt(S, L.first)) }
    }
    const heavy = weight(S) > CAP ? 1.4 : 1;
    const acts = (L.actions ? L.actions(S) : []).filter(a => !a.if || a.if(S)).filter(a => !(a.once && S.f['done_' + a.once]));
    const exits = (L.exits ? L.exits(S) : []).filter(e => !e.if || e.if(S)).map(e => ({ ...e, min: Math.round((e.min || 1) * heavy), go: true }));
    const opts = [...acts, ...exits, { t: 'Вещи', inv: true }];
    const pickd = await rec(async () => { const r = await menu(S, h, opts, events); return r.event ? { ev: r.event.id } : { i: opts.indexOf(r) } });
    const o = pickd.ev ? { event: events.find(e => e.id === pickd.ev) } : opts[pickd.i] || opts[opts.length - 1];

    if (o.event) {
      S.f['ev_' + o.event.id] = 1;
      const r = await o.event.run(S, h);
      if (r) return r;
    } else if (o.inv) {
      if (AUTO()) { h.tick(1); continue }
      // рюкзак записывается целиком: что поменялось в вещах и теле + текст результата
      const v = await rec(async () => { let said = null; await openInventory(S, { atCar: !!L.car, onText: t => said = t }); return { said, S: h.snapshot() } });
      h.restore(v.S);
      if (v.said) await h.para(v.said);
    } else if (o.go) {
      ui.act(o.t);
      h.tick(o.min, o.act || 'walk');
      if (o.run) { const r = await o.run(S, h); if (r) return r }
      S.loc = o.to;
    } else {
      ui.act(o.t);
      if (o.once) S.f['done_' + o.once] = 1;
      if (o.min) h.tick(o.min, o.act || L.act || 'car');
      if (o.run) { const r = await o.run(S, h); if (r) return r }
    }
    const dead = deathCheck(S); if (dead) return dead;
    if (opt.until && opt.until(S)) return opt.next || null;
  }
  throw new Error('Слишком долгое блуждание');
}
