// Интерфейс: лента текста, реплики, выборы, верхняя панель, оверлеи для механик.
import { fmtT, tx } from '../engine/state.js';
import { rec } from '../engine/replay.js';

export const $ = s => document.querySelector(s);
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e };
let S = null;
export function bind(state) { S = state }

// ---- чтение по шагам: следующий абзац появляется только по тапу. Экран сам не прыгает.
export const pace = { fast: false };
export const reader = { reading: false, pending: null };
export const wait = ms => new Promise(r => setTimeout(r, pace.fast ? 0 : ms));
export function log() { return $('#log') }
let moreEl = null, newEl = null;
function moreBar() {
  if (!moreEl) { moreEl = el('div', 'more'); moreEl.innerHTML = '<span>далее</span><i>▾</i>'; $('#game').appendChild(moreEl); moreEl.onclick = e => { e.stopPropagation(); advance() } }
  return moreEl;
}
function newPill() {
  if (!newEl) { newEl = el('button', 'newpill', 'новое ↓'); $('#game').appendChild(newEl); newEl.onclick = () => { const l = log(); l.scrollTo({ top: l.scrollHeight, behavior: 'smooth' }); newEl.classList.remove('on') } }
  return newEl;
}
export function advance() { if (reader.pending) { const f = reader.pending; reader.pending = null; f() } }
// ждать тапа «далее»; пока ждём — герой читает, и часы стоят
function nextTap() {
  if (window.__AUTOPLAY) return pace.fast ? Promise.resolve() : wait(350);   // автотест «тапает» сам
  // каждый тап записывается в след сохранения: «Продолжить» вернёт ровно к этому абзацу
  return rec(() => new Promise(res => {
    reader.reading = true; moreBar().classList.add('on');
    reader.pending = () => { reader.reading = false; moreBar().classList.remove('on'); res('t') };
  }));
}
// восстановить текст на экране из сохранения
export function restoreLog(html) { const l = log(); l.innerHTML = html || ''; lastNode = l.lastElementChild; requestAnimationFrame(() => l.scrollTop = l.scrollHeight) }
// показать новый блок. Прокрутка только если игрок «следит» за лентой (предыдущий блок виден целиком),
// и ровно настолько, чтобы новый блок поместился; если он длиннее экрана — показываем его начало.
let lastNode = null;
const posIn = (node, l) => node.getBoundingClientRect().top - l.getBoundingClientRect().top + l.scrollTop;
function place(node) {
  const l = log();
  const following = !lastNode || !lastNode.isConnected || posIn(lastNode, l) + lastNode.offsetHeight <= l.scrollTop + l.clientHeight + 48;
  l.appendChild(node); lastNode = node;
  if (following || pace.fast) {
    const top = posIn(node, l), bottom = top + node.offsetHeight + 72;   // запас под полосу «далее»
    const target = Math.min(bottom - l.clientHeight, top - 16);
    if (target > l.scrollTop) l.scrollTo({ top: target, behavior: pace.fast ? 'auto' : 'smooth' });
    newPill().classList.remove('on');
  } else newPill().classList.add('on');
}
// когда снизу появляются кнопки выбора, лента становится ниже: держим последний абзац на виду
export function keepLast() {
  const l = log(); if (!lastNode || !lastNode.isConnected) return;
  requestAnimationFrame(() => { const bottom = posIn(lastNode, l) + lastNode.offsetHeight + 16; if (bottom > l.scrollTop + l.clientHeight) l.scrollTo({ top: bottom - l.clientHeight, behavior: 'smooth' }) });
}
export function header(text, cls = 'loc') { const d = el('div', cls); d.textContent = tx(S, text); place(d) }
export async function para(text, cls = '') {
  const p = el('p', 'n ' + cls); const t = tx(S, text);
  if (darkLevel > 0) { p.dataset.orig = t; p.textContent = corrupt(t, darkLevel); p.classList.add('gloom'); darkened.push(p) } else p.textContent = t;
  place(p); await nextTap();
}
export async function sys(text, cls = '') { const p = el('div', 'sys ' + cls); p.textContent = tx(S, text); place(p); if (cls.includes('act') || cls.includes('title')) await nextTap() }
export async function note(title, text) {
  const d = el('div', 'note'); d.append(el('small', '', ''), el('span', '', '')); d.firstChild.textContent = title; d.lastChild.textContent = tx(S, text);
  place(d); await nextTap();
}
export async function say(who, text, cls = '', typing = true) {
  text = tx(S, text);
  if (typing && !pace.fast) { const t = el('div', 'typing', '<span></span><span></span><span></span>'); place(t); await wait(Math.min(900, 300 + text.length * 6)); t.remove() }
  const b = el('div', 'b ' + cls); if (who) { const w = el('span', 'w'); w.textContent = tx(S, who); b.appendChild(w) }
  const s2 = el('span'); s2.textContent = text; b.appendChild(s2); place(b); await nextTap();
}
// ---- телефон: переписка в мессенджере (не путать с репликами вслух)
let lastSender = null;
export function chatHead(title, sub = '') { const d = el('div', 'chathead'); d.innerHTML = '<b></b><small></small>'; d.firstChild.textContent = title; d.lastChild.textContent = sub; place(d); lastSender = null }
export async function msg(who, text, cls = '') {
  text = tx(S, text);
  if (!pace.fast) { const t = el('div', 'typing msgtyping', '<span></span><span></span><span></span>'); place(t); await wait(Math.min(1100, 350 + text.length * 9)); t.remove() }
  const b = el('div', 'msg ' + cls + (lastSender === who ? ' cont' : ''));
  if (who && lastSender !== who) { const w = el('span', 'w'); w.textContent = who; b.appendChild(w) }
  const s2 = el('span'); s2.textContent = text; b.appendChild(s2); place(b); lastSender = who;
  await nextTap();
}
export function myMsg(text) { const b = el('div', 'msg mine'); const s2 = el('span'); s2.textContent = tx(S, text); b.appendChild(s2); place(b); lastSender = '__me' }
export function endChat() { lastSender = null }

// ---- «Темнота ест текст»: в темноте слова теряют буквы; когда свет возвращается, текст тоже возвращается
let darkLevel = 0;
const darkened = [];
function corrupt(text, k) {
  return text.split(' ').map(w => {
    if (w.length < 3 || Math.random() > k * .55) return w;
    return [...w].map((c, i) => (i > 0 && /[а-яёa-z]/i.test(c) && Math.random() < .35 + k * .35) ? '·' : c).join('');
  }).join(' ');
}
export function dark(level) {
  darkLevel = level;
  document.body.classList.toggle('dark', level > 0);
  document.body.style.setProperty('--darkk', level);
  if (level === 0) { darkened.splice(0).forEach(p => { p.textContent = p.dataset.orig; p.classList.remove('gloom'); p.classList.add('relit') }) }
}
export function isDark() { return darkLevel > 0 }

export function me(text) { const b = el('div', 'b me'); const s2 = el('span'); s2.textContent = tx(S, text); b.appendChild(s2); place(b) }
export function act(text) { const a = el('div', 'act'); a.textContent = '▸ ' + tx(S, text); place(a) }
function scroll() { }

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
    keepLast();
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
