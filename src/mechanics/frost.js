// Иней на стекле: протереть пальцем, чтобы выглянуть. Иней нарастает снова — чем холоднее, тем быстрее.
import { overlay, pt } from '../ui/ui.js';
import { drawNight, frostTexture } from './scenery.js';
import { play } from '../engine/audio.js';

// o: scene (для drawNight), target {x,y,w,h} в долях экрана, reveal — подпись, когда разглядел; cold 0..1
export function frost(S, o = {}) {
  return new Promise(res => {
    const ov = overlay(o.title || 'Окно', o.hint || 'Протри иней пальцем, чтобы выглянуть наружу');
    const c = ov.canvas(), x = c.getContext('2d'), w = c.width, h = c.height;
    const bg = document.createElement('canvas'); bg.width = w; bg.height = h; drawNight(bg.getContext('2d'), w, h, o.scene || {});
    const tex = frostTexture(w, h);
    const fr = document.createElement('canvas'); fr.width = w; fr.height = h; const fx = fr.getContext('2d'); fx.drawImage(tex, 0, 0);
    const cold = o.cold == null ? Math.max(.15, Math.min(1, (40 - S.cabin) / 60)) : o.cold;
    let down = false, last = null, done = false, lastSnd = 0;
    const R = w * .075;
    function rub(p) {
      fx.save(); fx.globalCompositeOperation = 'destination-out';
      const steps = last ? Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / (R * .3)) : 1;
      for (let i = 1; i <= steps; i++) {
        const q = last ? { x: last.x + (p.x - last.x) * i / steps, y: last.y + (p.y - last.y) * i / steps } : p;
        const gr = fx.createRadialGradient(q.x, q.y, 0, q.x, q.y, R); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        fx.fillStyle = gr; fx.beginPath(); fx.arc(q.x, q.y, R, 0, 7); fx.fill();
      }
      fx.restore(); last = p;
      const now = performance.now(); if (now - lastSnd > 380) { play('window', { vol: .15, rate: 1.6, dur: .25 }); lastSnd = now }
    }
    c.onpointerdown = e => { down = true; last = null; c.setPointerCapture(e.pointerId); rub(pt(c, e)) };
    c.onpointermove = e => { if (down) rub(pt(c, e)) };
    c.onpointerup = c.onpointercancel = () => { down = false; last = null };
    let t0 = performance.now(), checkAt = 0, revealed = false;
    function cleared() {
      const T = o.target || { x: .2, y: .45, w: .6, h: .45 };
      const id = fx.getImageData(T.x * w, T.y * h, T.w * w, T.h * h).data; let clear = 0, n = 0;
      for (let i = 3; i < id.length; i += 4 * 97) { n++; if (id[i] < 90) clear++ }
      return n ? clear / n : 0;
    }
    function frame(now) {
      if (done) return;
      const dt = Math.min(.1, (now - t0) / 1000); t0 = now;
      fx.save(); fx.globalAlpha = dt * cold * .22; fx.drawImage(tex, 0, 0); fx.restore();   // иней нарастает
      x.drawImage(bg, 0, 0); x.drawImage(fr, 0, 0);
      if (now > checkAt) { checkAt = now + 300; if (!revealed && cleared() > .5) { revealed = true; ov.hint(o.reveal || 'Ты видишь, что снаружи.'); if (o.onReveal) o.onReveal(); setTimeout(finish, o.holdMs || 2600) } }
      requestAnimationFrame(frame);
    }
    function finish() { if (done) return; done = true; ov.close(); res({ seen: revealed }) }
    ov.button(o.leave || 'Отвернуться', finish, 'ghost');
    requestAnimationFrame(frame);
  });
}
