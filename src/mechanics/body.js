// Действия руками: «замри», раскопать трубу, чиркнуть спичкой. Состояние тела мешает.
import { overlay, pt, shake, el } from '../ui/ui.js';
import { audio, play, sweep, knock } from '../engine/audio.js';
import { settings, clamp } from '../engine/state.js';
import { listen, onShake, buzz, heartbeat, knockBuzz } from '../engine/device.js';
import { setDanger } from '../engine/clock.js';

// ---- «Замри»: игра слушает тебя по-настоящему (микрофон) или следит, чтобы ты не трогал экран и не двигал телефон.
export function freeze(S, o = {}) {
  return new Promise(async res => {
    const sec = o.sec || 12; setDanger(true);
    const useMic = settings.mic && audio.ctx;
    const ov = overlay('Замри', useMic ? 'Не издавай ни звука. Оно слушает.' : 'Не касайся экрана. Не двигай телефон.', { cls: 'freeze' });
    const ring = el('div', 'fring'); const lvl = el('div', 'flvl'); ov.body.append(ring, lvl);
    let done = false, stopMic = null, offShake = () => { };
    const fin = r => { if (done) return; done = true; setDanger(false); stopMic && stopMic(); offShake(); clearInterval(beat); ov.close(); res(r) };
    // шаги обходят машину по кругу, сердце бьётся
    sweep('steps', -1, 1, sec * .45, { vol: .7 }); setTimeout(() => sweep('steps', 1, -1, sec * .45, { vol: .6 }), sec * 500);
    const beat = setInterval(() => heartbeat(1), 1000);
    if (useMic) {
      let base = [], t0 = Date.now();
      try {
        stopMic = await listen(audio.ctx, v => {
          if (Date.now() - t0 < 1200) { base.push(v); return }
          const b = base.reduce((s, q) => s + q, 0) / Math.max(1, base.length);
          const lim = Math.max(b * 3.2, .035);
          lvl.style.transform = `scaleX(${clamp(v / lim, 0, 1)})`;
          if (v > lim) fin('heard');
        });
      } catch (e) { }
    } else {
      ov.root.addEventListener('pointerdown', () => fin('moved'), { once: true });
      if (settings.motion) offShake = onShake(() => fin('moved'), 3.2);
    }
    setTimeout(() => fin('ok'), sec * 1000);
  });
}

// ---- Раскопать выхлопную трубу: частые касания. Руки мёрзнут на глазах.
export function dig(S, o = {}) {
  return new Promise(res => {
    const ov = overlay('Выхлопная труба', 'Разгребай снег — касайся сугроба часто', { cls: 'dig' });
    const c = ov.canvas(), x = c.getContext('2d'), w = c.width, h = c.height;
    const prev = S.activity; S.activity = 'dig';
    let snow = 1, parts = [], t0 = performance.now(), done = false;
    const tool = o.tool || 'hands';
    c.onpointerdown = e => {
      if (done) return; const p = pt(c, e);
      const eff = (tool === 'shovel' ? .06 : tool === 'scraper' ? .045 : .03) * (1 - S.hands / 140) * (settings.easy ? 2 : 1);
      snow = Math.max(0, snow - eff); play('crunch', { vol: .6, rate: .8 + Math.random() * .4 }); buzz(10);
      for (let i = 0; i < 8; i++) parts.push({ x: p.x, y: p.y, vx: (Math.random() - .5) * w * .02, vy: -Math.random() * h * .02, life: 1 });
      if (snow <= 0) { done = true; ov.hint('Труба чистая. Чёрная дыра в белом.'); setTimeout(() => { S.activity = prev; ov.close(); res({ sec: (performance.now() - t0) / 1000 }) }, 1200) }
    };
    (function frame() {
      if (!ov.root.isConnected) return;
      x.fillStyle = '#1b242c'; x.fillRect(0, 0, w, h);
      // бампер и труба
      x.fillStyle = '#0d1216'; x.fillRect(0, h * .2, w, h * .22);
      x.fillStyle = '#05070a'; x.beginPath(); x.ellipse(w * .5, h * .55, w * .07, w * .05, 0, 0, 7); x.fill();
      // сугроб
      x.fillStyle = '#d8e2e8'; x.beginPath(); x.moveTo(0, h);
      for (let i = 0; i <= 20; i++) { const xx = w * i / 20; x.lineTo(xx, h * (1 - .55 * snow) - Math.sin(i * 1.7) * h * .03 * snow) }
      x.lineTo(w, h); x.fill();
      parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += h * .0015; p.life -= .03; x.fillStyle = `rgba(230,238,244,${p.life})`; x.fillRect(p.x, p.y, w * .012, w * .012) });
      parts = parts.filter(p => p.life > 0);
      // руки мёрзнут: края экрана белеют
      const fz = clamp(S.hands / 100, 0, 1), g = x.createRadialGradient(w / 2, h / 2, h * .25, w / 2, h / 2, h * .75);
      g.addColorStop(0, 'rgba(220,235,245,0)'); g.addColorStop(1, `rgba(220,235,245,${.15 + fz * .6})`); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,.85)'; x.font = `${w * .04}px system-ui`; x.fillText('Руки: ' + (S.hands < 25 ? 'терпимо' : S.hands < 50 ? 'немеют' : S.hands < 75 ? 'не слушаются' : 'деревянные'), w * .05, h * .08);
      requestAnimationFrame(frame);
    })();
  });
}

// ---- Спичка: чиркнуть по коробку, потом прикрыть пламя ладонью от ветра.
export function match(S, o = {}) {
  return new Promise(res => {
    const ov = overlay('Спичка', `Проведи пальцем от головки спички по тёрке — быстро. Спичек: ${S.matches}`, { cls: 'match' });
    const c = ov.canvas(), x = c.getContext('2d'), w = c.width, h = c.height;
    const wind = o.wind == null ? .5 : o.wind;
    let st = 'idle', tr = [], flame = 0, shield = false, gustAt = 0, gust = 0, used = 0, litT = 0, done = false;
    const strip = { x: w * .15, y: h * .62, w: w * .7, h: h * .07 };
    const fin = lit => { if (done) return; done = true; setTimeout(() => { ov.close(); res({ lit, used }) }, lit ? 900 : 1300) };
    c.onpointerdown = e => {
      const p = pt(c, e);
      if (st === 'lit') { shield = true; return }
      if (S.matches <= 0) return; tr = [{ ...p, t: performance.now() }]; st = 'drag';
    };
    c.onpointermove = e => { if (st === 'drag') tr.push({ ...pt(c, e), t: performance.now() }) };
    c.onpointerup = () => {
      if (st === 'lit') { shield = false; return }
      if (st !== 'drag') return; st = 'idle';
      const a = tr[0], b = tr[tr.length - 1]; if (!a || !b) return;
      const dist = Math.hypot(b.x - a.x, b.y - a.y), sp = dist / Math.max(1, b.t - a.t);
      const crossed = tr.some(q => q.y > strip.y && q.y < strip.y + strip.h * 1.6);
      if (dist < w * .3 || !crossed) { ov.hint('Нужно провести по тёрке — длинно и быстро.'); return }
      used++; S.matches--;
      const tremor = S.hands / 100;
      if (sp < w * .0012) { play('match', { vol: .4, rate: .7 }); ov.hint(`Слишком медленно — головка только крошится. Спичек: ${S.matches}`); if (!S.matches) fin(false); return }
      if (Math.random() < tremor * .6) { play('branch', { vol: .3, rate: 2.2 }); ov.hint(`Пальцы не слушаются — спичка ломается. Спичек: ${S.matches}`); shake(); if (!S.matches) fin(false); return }
      play('match'); st = 'lit'; flame = 1; litT = performance.now(); gustAt = litT + 900 + Math.random() * 800;
      ov.hint('Горит! Прикрой пламя — держи палец рядом с огнём, когда дует ветер.');
    };
    (function frame(now) {
      if (!ov.root.isConnected) return; now = now || performance.now();
      x.fillStyle = '#07090b'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#5a2b1e'; x.fillRect(strip.x, strip.y, strip.w, strip.h); x.fillStyle = '#2d1610';
      for (let i = 0; i < 60; i++) x.fillRect(strip.x + Math.random() * strip.w, strip.y + Math.random() * strip.h, 2, 2);
      x.fillStyle = 'rgba(255,255,255,.6)'; x.font = `${w * .035}px system-ui`; x.fillText('Мотель 6 · Эсканаба', strip.x, strip.y + strip.h * 2.2);
      if (st === 'drag' && tr.length > 1) { x.strokeStyle = 'rgba(255,200,140,.4)'; x.lineWidth = w * .01; x.beginPath(); tr.forEach((q, i) => i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y)); x.stroke() }
      if (st === 'lit') {
        if (now > gustAt) { gust = 1; gustAt = now + 1500 + Math.random() * 1200; play('window', { vol: .3, rate: .6 }) }
        gust = Math.max(0, gust - .02);
        if (gust > .3 && !shield) flame -= .04 * wind * 3; else flame = Math.min(1, flame + .01);
        const fx0 = w * .5, fy = h * .35, s = h * .12 * flame * (1 + Math.sin(now / 60) * .08);
        const g = x.createRadialGradient(fx0, fy, 0, fx0, fy, s * 2.5); g.addColorStop(0, 'rgba(255,190,90,.5)'); g.addColorStop(1, 'rgba(255,120,40,0)');
        x.fillStyle = g; x.fillRect(0, 0, w, h);
        x.fillStyle = '#ffd27a'; x.beginPath(); x.ellipse(fx0 + gust * s * .6, fy, s * .28, s * .7, gust * .6, 0, 7); x.fill();
        x.fillStyle = '#d9c7a3'; x.fillRect(fx0 - w * .006, fy + s * .5, w * .012, h * .2);
        if (gust > .3) { x.fillStyle = shield ? 'rgba(160,220,170,.9)' : 'rgba(255,140,120,.95)'; x.fillText(shield ? 'Прикрыто' : 'Ветер! Прикрой!', w * .35, h * .12) }
        if (flame <= 0) { st = 'idle'; play('window', { vol: .2 }); ov.hint(`Погасла. Спичек: ${S.matches}`); if (!S.matches) fin(false) }
        else if (now - litT > (o.holdMs || 4500)) { st = 'won'; ov.hint('Огонь держится.'); fin(true) }
      }
      if (st === 'idle' || st === 'drag') { x.fillStyle = '#c9b48a'; x.fillRect(w * .2, h * .4, w * .45, h * .015); x.fillStyle = '#7a1f17'; x.beginPath(); x.ellipse(w * .2, h * .4 + h * .007, w * .02, h * .014, 0, 0, 7); x.fill() }
      requestAnimationFrame(frame);
    })();
    ov.button('Хватит', () => fin(false), 'ghost');
  });
}

// ---- Стук: три удара по крыше — звук по сторонам + вибрация в руке
export function knock3(pan = 0, roof = true) { knock(0, roof, pan); knock(.8, roof, pan); knock(1.6, roof, pan); knockBuzz(800); [0, 800, 1600].forEach(t => setTimeout(shake, t)) }
