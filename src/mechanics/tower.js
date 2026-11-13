// Пожарная вышка: генератор, рация, лестница.
import { overlay, pt, shake, el } from '../ui/ui.js';
import { play, knock } from '../engine/audio.js';
import { buzz, knockBuzz } from '../engine/device.js';
import { settings, clamp } from '../engine/state.js';

// ---- Генератор: крутить ручку пальцем по кругу. Снизу стучат.
export function crank(S, o = {}) {
  return new Promise(res => {
    const ov = overlay('Ручной генератор', 'Крути ручку по кругу — ровно и без остановки', { cls: 'crank' });
    const c = ov.canvas(), x = c.getContext('2d'), w = c.width, h = c.height, cx = w / 2, cy = h * .48, R = Math.min(w, h) * .3;
    let charge = 0, ang = 0, prev = null, down = false, done = false, knockAt = performance.now() + 3500, t0 = performance.now();
    c.onpointerdown = e => { down = true; c.setPointerCapture(e.pointerId); const p = pt(c, e); prev = Math.atan2(p.y - cy, p.x - cx) };
    c.onpointermove = e => {
      if (!down || done) return; const p = pt(c, e), a = Math.atan2(p.y - cy, p.x - cx);
      let d = a - prev; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; prev = a;
      if (d > 0) { ang += d; charge = Math.min(100, charge + d * (settings.easy ? 3.2 : 1.6) * (1 - S.fatigue / 250)) }
    };
    c.onpointerup = () => { down = false };
    (function frame(now) {
      if (!ov.root.isConnected) return; now = now || performance.now();
      charge = Math.max(0, charge - .06);
      if (!done && now > knockAt && (o.knocks !== false)) { knock(0, false, 0); knock(.8, false, 0); knock(1.6, false, 0); knockBuzz(); shake(); knockAt = now + 5000 + Math.random() * 3000; ov.hint('Снизу, в люк, — три удара. Не останавливайся.') }
      x.fillStyle = '#0b0f12'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#2a343b'; x.lineWidth = w * .02; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
      const hx = cx + Math.cos(ang) * R, hy = cy + Math.sin(ang) * R;
      x.strokeStyle = '#8a959c'; x.lineWidth = w * .03; x.beginPath(); x.moveTo(cx, cy); x.lineTo(hx, hy); x.stroke();
      x.fillStyle = '#c9a36a'; x.beginPath(); x.arc(hx, hy, w * .05, 0, 7); x.fill();
      x.fillStyle = '#1a2228'; x.fillRect(w * .1, h * .88, w * .8, h * .035);
      x.fillStyle = charge > 99 ? '#8fcf9b' : '#d8a24a'; x.fillRect(w * .1, h * .88, w * .8 * charge / 100, h * .035);
      x.fillStyle = 'rgba(255,255,255,.75)'; x.font = `${w * .04}px ui-monospace,monospace`; x.fillText('ЗАРЯД ' + Math.round(charge) + '%', w * .1, h * .86);
      if (!done && charge >= 100) { done = true; play('ignition', { vol: .3, rate: 2.5, dur: .5 }); ov.hint('Лампочка рации загорается зелёным.'); setTimeout(() => { ov.close(); res({ sec: (now - t0) / 1000 }) }, 1200) }
      requestAnimationFrame(frame);
    })();
  });
}

// ---- Рация: поймать частоту сквозь помехи. CB-диапазон 26.965–27.405 МГц.
// stations: [{id, f, lines:[...] }] ; ghost — частота Дениз
export function radio(S, o = {}) {
  return new Promise(res => {
    const ov = overlay('Рация', 'Крути шкалу. Слушай помехи', { cls: 'radio' });
    const ST = o.stations || [
      { id: 'gus', f: 27.185, who: 'Гас · снегоочиститель', lines: ['…ни черта не видно, Эйч-тринадцать замело по самые фары…', '…кто на девятнадцатом? Приём…'] },
      { id: 'marcy', f: 27.065, who: 'Марси · диспетчерская', lines: ['…девятый канал, округ Алджер слушает. Если вы меня слышите — назовите себя…'] },
      { id: 'denise', f: 27.000, who: '??? ', lines: ['…милый… ты не там ищешь… выйди на дорогу… милый…'], ghost: true },
    ];
    const c = ov.canvas(), x = c.getContext('2d'), w = c.width, h = c.height;
    const lo = 26.965, hi = 27.405; let f = 27.3, down = false, lastX = 0, locked = null, shown = {}, txt = el('div', 'rtxt'); ov.body.appendChild(txt);
    c.onpointerdown = e => { down = true; lastX = pt(c, e).x; c.setPointerCapture(e.pointerId) };
    c.onpointermove = e => { if (!down) return; const p = pt(c, e); f = clamp(f - (p.x - lastX) / w * .12, lo, hi); lastX = p.x };
    c.onpointerup = () => { down = false };
    let tick = 0;
    (function frame() {
      if (!ov.root.isConnected) return;
      let near = null, best = 1;
      ST.forEach(s => { const d = Math.abs(s.f - f) / .012; if (d < best) { best = d; near = s } });
      const clear = near ? 1 - best : 0;
      x.fillStyle = '#0a0d0f'; x.fillRect(0, 0, w, h);
      x.strokeStyle = near && near.ghost ? `rgba(224,90,79,${.3 + clear * .7})` : `rgba(143,207,155,${.3 + clear * .7})`; x.lineWidth = w * .004; x.beginPath();
      for (let i = 0; i < w; i += 4) { const n = (Math.random() - .5) * (1 - clear) * h * .25 + Math.sin(i * .05 + tick * .2) * clear * h * .08; i ? x.lineTo(i, h * .3 + n) : x.moveTo(i, h * .3 + n) }
      x.stroke(); tick++;
      // шкала
      x.fillStyle = '#d8c79c'; x.fillRect(0, h * .62, w, h * .2); x.fillStyle = '#2a2418'; x.font = `${w * .03}px ui-monospace,monospace`;
      for (let k = 0; k <= 40; k++) { const ff = lo + (hi - lo) * k / 40, px = w / 2 + (ff - f) / .12 * w; if (px < 0 || px > w) continue; x.fillRect(px, h * .62, 2, k % 5 ? h * .03 : h * .06); if (k % 5 === 0) x.fillText(ff.toFixed(3), px - w * .06, h * .74) }
      x.fillStyle = '#c4302b'; x.fillRect(w / 2 - 2, h * .6, 4, h * .24);
      x.fillStyle = '#fff'; x.font = `${w * .05}px ui-monospace,monospace`; x.fillText(f.toFixed(3) + ' МГц', w * .28, h * .55);
      if (near && clear > .55 && !shown[near.id]) { shown[near.id] = 1; txt.innerHTML = ''; const b = el('div', 'b ' + (near.ghost ? 'x' : 'r')); b.innerHTML = '<span class="w"></span><span></span>'; b.firstChild.textContent = near.who; b.lastChild.textContent = near.lines.join(' '); txt.appendChild(b); locked = near; play(near.ghost ? 'breath' : 'static', { vol: .4, line: true, dur: 2 }) }
      if (near && clear < .3) { shown[near.id] = 0; if (locked === near) { locked = null; txt.innerHTML = '' } }
      requestAnimationFrame(frame);
    })();
    ov.button('Выйти в эфир', () => { ov.close(); res({ station: locked ? locked.id : null, f }) });
  });
}

// ---- Лестница вышки: перехватывать руками в ритм. Сбился — повис на одной руке.
export function ladder(S, o = {}) {
  return new Promise(res => {
    const ov = overlay('Лестница · 80 футов', 'Левая — правая — в такт. Не смотри вниз', { cls: 'ladder' });
    const c = ov.canvas(), x = c.getContext('2d'), w = c.width, h = c.height;
    const rungs = o.rungs || 14, beat = settings.easy ? 1100 : 900; let n = 0, next = 'L', slips = 0, t0 = performance.now(), lastBeat = t0, done = false, sway = 0;
    const row = el('div', 'lrow'); const L = el('button', 'lh', 'Левая'); const R = el('button', 'lh', 'Правая'); row.append(L, R); ov.body.appendChild(row);
    function press(side) {
      if (done) return; const now = performance.now(); const ph = ((now - lastBeat) % beat) / beat; const off = Math.min(ph, 1 - ph);
      const win = .28 - S.hands / 600;
      if (side === next && off < win) { n++; next = side === 'L' ? 'R' : 'L'; play('creak', { vol: .4, rate: 1 + n * .02 }); buzz(15) }
      else { slips++; n = Math.max(0, n - 1); shake(); buzz(160); play('glass', { vol: .2, rate: .5 }); ov.hint('Нога соскальзывает — ты висишь на одной руке. Снова в такт.') }
      if (n >= rungs) { done = true; ov.hint('Люк. Ты наверху.'); setTimeout(() => { ov.close(); res({ slips, sec: (now - t0) / 1000 }) }, 1100) }
    }
    L.onpointerdown = () => press('L'); R.onpointerdown = () => press('R');
    (function frame(now) {
      if (!ov.root.isConnected) return; now = now || performance.now();
      if (now - lastBeat > beat) { lastBeat += beat; play('key', { vol: .25, rate: .5 }) }
      sway = Math.sin(now / 700) * w * .02 * (1 + Math.sin(now / 2300));
      x.fillStyle = '#05080b'; x.fillRect(0, 0, w, h);
      const off = (n % 1) * 0; x.strokeStyle = '#4a5560'; x.lineWidth = w * .02;
      x.beginPath(); x.moveTo(w * .3 + sway, 0); x.lineTo(w * .3 + sway, h); x.moveTo(w * .7 + sway, 0); x.lineTo(w * .7 + sway, h); x.stroke();
      for (let i = 0; i < 8; i++) { const y = ((i * h / 7) + (n * h / 7) % (h / 7)) % h; x.beginPath(); x.moveTo(w * .3 + sway, y); x.lineTo(w * .7 + sway, y); x.stroke() }
      const ph = ((now - lastBeat) % beat) / beat; x.fillStyle = `rgba(216,162,74,${1 - ph})`; x.beginPath(); x.arc(w / 2, h * .12, w * .04 * (1.4 - ph * .4), 0, 7); x.fill();
      x.fillStyle = '#fff'; x.font = `${w * .045}px ui-monospace,monospace`; x.fillText(`${n}/${rungs}`, w * .05, h * .08);
      x.fillStyle = 'rgba(200,210,215,.7)'; x.fillText('сейчас: ' + (next === 'L' ? 'ЛЕВАЯ' : 'ПРАВАЯ'), w * .55, h * .08);
      requestAnimationFrame(frame);
    })();
  });
}
