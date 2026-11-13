// Телефон героя: звонилка, звонок с таймером, вопрос своими словами, пропущенные вызовы.
import { overlay, el, $, keepLast } from '../ui/ui.js';
import { tx, settings } from '../engine/state.js';
import { play } from '../engine/audio.js';
import { buzz } from '../engine/device.js';
import { setDanger } from '../engine/clock.js';

// ---- Звонилка: игрок сам набирает номер. Возвращает набранные цифры.
export function dialer(S, o = {}) {
  return new Promise(res => {
    const ov = overlay(o.title || 'Телефон', o.hint || 'Набери номер', { cls: 'dial' });
    const scr = el('div', 'dscr'); const num = el('div', 'dnum'); const sub = el('div', 'dsub');
    sub.textContent = '1 полоска · ' + Math.round(S.bat) + '%'; scr.append(num, sub); ov.body.appendChild(scr);
    const pad = el('div', 'dpad'); let v = '';
    const fmt = s => s.length === 10 ? `+1 (${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6)}` : s;
    const LET = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ', 0: '+' };
    '123456789*0#'.split('').forEach(k => {
      const b = el('button', 'dk', `<b>${k}</b><small>${LET[k] || ''}</small>`);
      b.onpointerdown = () => { if (v.length < 14) { v += k; num.textContent = fmt(v); play('key', { vol: .7, rate: .9 + Math.random() * .2 }); buzz(12) } };
      pad.appendChild(b);
    });
    ov.body.appendChild(pad);
    const row = el('div', 'drow');
    const del = el('button', 'ddel', '⌫'); del.onclick = () => { v = v.slice(0, -1); num.textContent = fmt(v) };
    const call = el('button', 'dcall', '✆'); call.onclick = () => { if (!v) return; ov.close(); res(v) };
    row.append(el('span'), call, del); ov.body.appendChild(row);
    if (o.cancel) ov.button(o.cancel, () => { ov.close(); res(null) }, 'ghost');
  });
}

// ---- Звонок с таймером: собеседник ждёт ответа. Молчание — тоже ответ.
// opts: [{t, ...}], sec — сколько ждут. Возвращает выбранный вариант или {silence:true}
export function timed(S, opts, sec = 9) {
  return new Promise(res => {
    setDanger(true);
    const box = $('#choices'); box.innerHTML = '';
    const bar = el('div', 'tbar', '<i></i>'); box.appendChild(bar);
    let done = false;
    const fin = r => { if (done) return; done = true; clearInterval(iv); box.innerHTML = ''; setDanger(false); res(r) };
    opts.forEach(o => { const b = el('button'); b.textContent = tx(S, o.t); b.onclick = () => fin(o); box.appendChild(b) });
    keepLast();
    const t0 = Date.now(); const fill = bar.firstChild;
    // без таймеров: решение ждёт, молчание — отдельная кнопка
    if (settings.noTimers) { bar.remove(); const q = el('button', 'quiet'); q.textContent = 'Промолчать'; q.onclick = () => fin({ silence: true }); box.appendChild(q); var iv = 0; return }
    var iv = setInterval(() => { const k = 1 - (Date.now() - t0) / (sec * 1000); fill.style.width = Math.max(0, k * 100) + '%'; if (k <= 0) fin({ silence: true }) }, 80);
  });
}

// ---- Вопрос своими словами
export function question(S, o = {}) {
  return new Promise(res => {
    const ov = overlay(o.title || 'Спросить', o.hint || 'Спроси то, что знает только настоящий человек', { cls: 'ask' });
    const ta = el('textarea'); ta.placeholder = o.placeholder || 'Например: кому ты записывала сообщение?'; ta.maxLength = 140;
    ov.body.appendChild(ta); setTimeout(() => ta.focus(), 300);
    ov.button('Спросить через стекло', () => { const v = ta.value.trim(); if (!v) return; ov.close(); res(v) });
  });
}
// Мимик повторяет вопрос слово в слово, но «твоим голосом»: заедает на последних словах
export function echo(q) { const w = q.replace(/[?!.]+$/, '').split(/\s+/); const tail = w.slice(-2).join(' '); return [q, `${q.replace(/[?!.]+$/, '')}… ${tail}… ${tail}…`] }

// ---- Пропущенные вызовы (экран телефона при возвращении)
export function missedScreen(S, list) {
  return new Promise(res => {
    const ov = overlay('Пропущенные вызовы', 'Пока тебя не было', { cls: 'missed' });
    list.forEach(m => { const r = el('div', 'mrow'); r.innerHTML = '<b></b><span></span>'; r.firstChild.textContent = m.who; r.lastChild.textContent = m.time; ov.body.appendChild(r) });
    ov.button('Закрыть', () => { ov.close(); res() });
  });
}
