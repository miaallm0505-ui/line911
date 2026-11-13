// Метель по компасу и вещи, которые соединяются руками.
import { overlay, pt, el, shake } from '../ui/ui.js';
import { play } from '../engine/audio.js';
import { onTilt, buzz } from '../engine/device.js';
import { settings } from '../engine/state.js';
import { rng } from './scenery.js';

// ---- Метель: держать курс по компасу, пока следы заметает. Ветер сносит.
export function blizzard(S, o = {}) {
  return new Promise(res => {
    const ov = overlay(o.title || 'Метель', o.hint || 'Держи курс: стрелка должна смотреть на цель. Веди пальцем влево-вправо', { cls: 'bliz' });
    const c = ov.canvas(), x = c.getContext('2d'), w = c.width, h = c.height;
    const target = o.bearing == null ? 40 : o.bearing; let head = target - 70 + Math.random() * 140, prog = 0, off = 0, done = false, drift = 0, lastX = null;
    const prev = S.activity; S.activity = 'walk';
    const r = rng(9), flakes = Array.from({ length: 220 }, () => ({ x: r() * w, y: r() * h, s: r() * 2 + .5 }));
    c.onpointerdown = e => { lastX = pt(c, e).x; c.setPointerCapture(e.pointerId) };
    c.onpointermove = e => { if (lastX == null) return; const p = pt(c, e); head += (p.x - lastX) / w * 90; lastX = p.x };
    c.onpointerup = () => { lastX = null };
    const offT = onTilt(gx => { head += gx * .8 });
    let stepT = 0;
    (function frame(now) {
      if (!ov.root.isConnected) { offT(); return } now = now || performance.now();
      drift += (Math.random() - .5) * .25; drift *= .985; head += drift * (settings.easy ? .3 : .6);
      const err = ((head - target + 540) % 360) - 180, ae = Math.abs(err);
      if (ae < 15) { prog += .0016; off = Math.max(0, off - .02) } else if (ae > 55) off += .006;
      if (now - stepT > 650) { stepT = now; play('crunch', { vol: .35, pan: Math.max(-1, Math.min(1, err / 90)) }) }
      x.fillStyle = '#2b353d'; x.fillRect(0, 0, w, h);
      // ориентир впереди: огонёк, виден, только если курс верный
      const vis = Math.max(0, 1 - ae / 40) * (.3 + prog * .7);
      const lx = w / 2 - err / 90 * w; x.fillStyle = `rgba(255,190,110,${vis})`; x.beginPath(); x.arc(lx, h * .35, w * .015 + prog * w * .02, 0, 7); x.fill();
      flakes.forEach(f => { f.x += (3 + f.s * 2) * (w / 400) + drift * 4; f.y += f.s * (w / 400); if (f.x > w) f.x = 0; if (f.x < 0) f.x = w; if (f.y > h) f.y = 0; x.fillStyle = 'rgba(235,240,245,.8)'; x.fillRect(f.x, f.y, f.s * w / 300, f.s * w / 300) });
      x.fillStyle = `rgba(200,210,218,${Math.min(.85, off * .6)})`; x.fillRect(0, 0, w, h);
      // компас
      const cx = w / 2, cy = h * .8, R = w * .16; x.strokeStyle = '#9aa5ab'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
      x.save(); x.translate(cx, cy); x.rotate((target - head) * Math.PI / 180); x.fillStyle = '#c4302b'; x.beginPath(); x.moveTo(0, -R * .9); x.lineTo(R * .12, 0); x.lineTo(-R * .12, 0); x.fill(); x.restore();
      x.fillStyle = '#fff'; x.font = `${w * .04}px ui-monospace,monospace`; x.fillText('путь ' + Math.round(prog * 100) + '%', w * .05, h * .08);
      if (!done && prog >= 1) { done = true; S.activity = prev; ov.hint(o.arrive || 'Сквозь снег проступает цель.'); setTimeout(() => { offT(); ov.close(); res({ arrived: true }) }, 1300) }
      if (!done && off > 1.6) { done = true; S.activity = prev; shake(); buzz(300); ov.hint('Следов больше нет. Ты не знаешь, где ты.'); setTimeout(() => { offT(); ov.close(); res({ arrived: false }) }, 1800) }
      requestAnimationFrame(frame);
    })();
  });
}

// ---- Вещи руками: перетащи одну вещь на другую. combos: {'batteries+flashlight': fn → текст}
export function combine(S, items, combos, o = {}) {
  return new Promise(res => {
    const ov = overlay(o.title || 'Вещи', o.hint || 'Перетащи одну вещь на другую', { cls: 'items' });
    const grid = el('div', 'igrid'); ov.body.appendChild(grid);
    const msg = el('div', 'imsg'); ov.body.appendChild(msg);
    let ghost = null, from = null;
    items.forEach(it => {
      const card = el('div', 'icard'); card.dataset.k = it.k; card.innerHTML = `<i>${it.icon}</i><b></b>`; card.querySelector('b').textContent = it.n; grid.appendChild(card);
      card.onpointerdown = e => {
        from = it.k; card.setPointerCapture(e.pointerId); ghost = card.cloneNode(true); ghost.classList.add('ghost'); document.body.appendChild(ghost);
        const mv = ev => { ghost.style.left = ev.clientX - 45 + 'px'; ghost.style.top = ev.clientY - 45 + 'px' }; mv(e);
        card.onpointermove = mv;
        card.onpointerup = ev => {
          card.onpointermove = null; ghost.remove(); ghost = null;
          const under = document.elementsFromPoint(ev.clientX, ev.clientY).find(n => n.classList && n.classList.contains('icard') && n !== card);
          if (!under) return; const k2 = under.dataset.k; const f = combos[from + '+' + k2] || combos[k2 + '+' + from];
          if (!f) { msg.textContent = 'Это не сочетается.'; shake(); return }
          play('door', { vol: .3, rate: 2 }); buzz(30); msg.textContent = f(S);
          under.classList.add('ok'); card.remove(); setTimeout(() => { ov.close(); res({ made: from + '+' + k2 }) }, 1600);
        };
      };
    });
    ov.button('Закрыть', () => { ov.close(); res({ made: null }) }, 'ghost');
  });
}
