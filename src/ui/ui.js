// Интерфейс: лента текста, реплики, выборы, верхняя панель, оверлеи для механик.
import { fmtT, tx } from '../engine/state.js';

export const $ = s => document.querySelector(s);
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e };
let S = null;
export function bind(state) { S = state }

// ---- скорость текста: тап ускоряет
export const pace = { fast: false };
export const wait = ms => new Promise(r => setTimeout(r, pace.fast ? Math.min(ms, 50) : ms));

// ---- лента
export function log() { return $('#log') }
function scroll() { const l = log(); l.scrollTop = l.scrollHeight }
export async function para(text, cls = '') {
  const p = el('p', 'n ' + cls); p.textContent = tx(S, text); log().appendChild(p); scroll();
  await wait(Math.min(3800, 700 + p.textContent.length * 27));
}
export async function sys(text, cls = '') { const p = el('div', 'sys ' + cls); p.textContent = tx(S, text); log().appendChild(p); scroll(); await wait(cls.includes('act') ? 2000 : 800) }
export async function note(title, text) {
  const d = el('div', 'note'); d.append(el('small', '', ''), el('span', '', '')); d.firstChild.textContent = title; d.lastChild.textContent = tx(S, text);
  log().appendChild(d); scroll(); await wait(1500 + text.length * 25);
}
export async function say(who, text, cls = '', typing = true) {
  text = tx(S, text);
  if (typing) { const t = el('div', 'typing', '<span></span><span></span><span></span>'); log().appendChild(t); scroll(); await wait(Math.min(1800, 400 + text.length * 14)); t.remove() }
  const b = el('div', 'b ' + cls); if (who) { const w = el('span', 'w'); w.textContent = tx(S, who); b.appendChild(w) }
  const s = el('span'); s.textContent = text; b.appendChild(s); log().appendChild(b); scroll();
  await wait(Math.min(2800, 600 + text.length * 20));
}
export function me(text) { const b = el('div', 'b me'); const s = el('span'); s.textContent = tx(S, text); b.appendChild(s); log().appendChild(b); scroll() }
export function act(text) { const a = el('div', 'act'); a.textContent = '▸ ' + tx(S, text); log().appendChild(a); scroll() }

// ---- выборы
export function choose(opts) {
  return new Promise(res => {
    const box = $('#choices'); box.innerHTML = '';
    opts.forEach((o, i) => {
      if (o.if && !o.if(S)) return;
      const b = el('button', o.danger ? 'danger' : ''); const s = el('span'); s.textContent = tx(S, o.t); b.appendChild(s);
      if (o.hint) { const h = el('small'); h.textContent = tx(S, o.hint); b.appendChild(h) }
      b.onclick = () => { box.innerHTML = ''; res(o) };
      box.appendChild(b);
    });
  });
}
export function clearChoices() { $('#choices').innerHTML = '' }

// ---- верхняя панель
export function hud() {
  if (!S) return;
  $('#hT').textContent = fmtT(S.t);
  const c = S.core; const ce = $('#hC'); ce.textContent = c.toFixed(1) + '°'; ce.classList.toggle('low', c < 95);
  const b = Math.round(S.bat); const be = $('#hB'); be.textContent = b + '%'; be.classList.toggle('low', b < 15);
  $('#hS').textContent = S.loc === 'car' ? 'салон ' + Math.round(S.cabin) + '°F' : '−24°F';
  document.body.classList.toggle('cold', c < 95);
  document.body.classList.toggle('blood', S.blood < 65);
}
export function setDangerUI(on) { document.body.classList.toggle('danger', !!on) }

// ---- звонок
let callIv = null;
export function callShow(who, num, evil) {
  const c = $('#call'); c.className = 'on' + (evil ? ' evil' : ''); $('#cWho').textContent = tx(S, who); $('#cNum').textContent = num || '';
  const t0 = Date.now(); clearInterval(callIv);
  callIv = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $('#cTm').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') }, 500);
}
export function callHide() { $('#call').className = ''; clearInterval(callIv) }

// ---- тосты и эффекты
let tT = null;
export function toast(msg, bad) { const o = $('.toast'); if (o) o.remove(); const d = el('div', 'toast' + (bad ? ' bad' : '')); d.textContent = tx(S, msg); document.body.appendChild(d); clearTimeout(tT); tT = setTimeout(() => d.remove(), 2600) }
export function shake() { const a = $('#app'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake') }
export function flash(op = .45) { const f = $('#flash'); f.style.opacity = op; setTimeout(() => f.style.opacity = 0, 180) }

// ---- оверлей для механик: полноэкранная сцена с заголовком, подсказкой и холстом
export function overlay(title, hint, opts = {}) {
  const o = el('div', 'mech' + (opts.cls ? ' ' + opts.cls : ''));
  o.innerHTML = '<div class="mh"><b></b><span></span></div><div class="mb"></div><div class="mf"></div>';
  o.querySelector('b').textContent = tx(S, title); o.querySelector('.mh span').textContent = tx(S, hint || '');
  document.body.appendChild(o);
  const body = o.querySelector('.mb'), foot = o.querySelector('.mf');
  return {
    root: o, body, foot,
    hint(t) { o.querySelector('.mh span').textContent = tx(S, t) },
    canvas() {
      const c = el('canvas'); body.appendChild(c);
      const fit = () => { const r = body.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); c.width = r.width * d; c.height = r.height * d; c.style.width = r.width + 'px'; c.style.height = r.height + 'px'; c.dpr = d };
      fit(); return c;
    },
    button(label, fn, cls) { const b = el('button', cls || ''); b.textContent = tx(S, label); b.onclick = fn; foot.appendChild(b); return b },
    close() { o.classList.add('out'); setTimeout(() => o.remove(), 300) }
  };
}
// координаты касания в пикселях холста
export function pt(c, e) { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * c.dpr, y: (e.clientY - r.top) * c.dpr } }
