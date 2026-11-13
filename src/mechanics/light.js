// Фонарик: луч водится наклоном телефона (или пальцем). Видно только то, на что светишь.
import { overlay, pt } from '../ui/ui.js';
import { drawNight, figure } from './scenery.js';
import { onTilt } from '../engine/device.js';
import { settings } from '../engine/state.js';
import { play } from '../engine/audio.js';

function beamLoop(ov, c, drawScene, o, onFrame) {
  const x = c.getContext('2d'), w = c.width, h = c.height;
  const scene = document.createElement('canvas'); scene.width = w; scene.height = h; drawScene(scene.getContext('2d'), w, h);
  const B = { x: w * (o.startX || .5), y: h * (o.startY || .5) }, T = { ...B };
  const off = onTilt((gx, gy) => { T.x = w / 2 + gx * w * .6; T.y = h / 2 + gy * h * .6 });
  c.onpointerdown = c.onpointermove = e => { if (e.buttons || e.pointerType === 'touch') { const p = pt(c, e); T.x = p.x; T.y = p.y } };
  let alive = true;
  (function frame() {
    if (!alive || !ov.root.isConnected) { off(); return }
    B.x += (T.x - B.x) * .15; B.y += (T.y - B.y) * .15;
    const R = Math.min(w, h) * (o.radius || .22) * (o.power == null ? 1 : .5 + o.power * .5);
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    x.save(); x.beginPath(); x.arc(B.x, B.y, R, 0, 7); x.clip(); x.drawImage(scene, 0, 0); x.restore();
    const g = x.createRadialGradient(B.x, B.y, R * .2, B.x, B.y, R); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.75, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = g; x.beginPath(); x.arc(B.x, B.y, R + 2, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,245,220,.05)'; x.beginPath(); x.arc(B.x, B.y, R * .5, 0, 7); x.fill();
    onFrame && onFrame(B, R, w, h);
    requestAnimationFrame(frame);
  })();
  return () => { alive = false; off() };
}

// Найти что-то лучом. o.target {x,y} в долях, o.scene — для drawNight
export function flashlight(S, o = {}) {
  return new Promise(res => {
    const tilt = settings.motion;
    const ov = overlay(o.title || 'Фонарик', o.hint || (tilt ? 'Наклоняй телефон, чтобы вести лучом' : 'Веди лучом пальцем'));
    const c = ov.canvas(); let dwell = 0, done = false;
    const T = o.target || { x: .7, y: .7 };
    const stop = beamLoop(ov, c, (x, w, h) => { drawNight(x, w, h, o.scene || { prints: true }); if (o.figureAt) figure(x, w * o.figureAt.x, h * o.figureAt.y, h * .7) }, { power: S.flash / 100 }, (B, R, w, h) => {
      if (done) return;
      const d = Math.hypot(B.x - T.x * w, B.y - T.y * h);
      dwell = d < R * .5 ? dwell + 1 : Math.max(0, dwell - 2);
      if (dwell > 70) { done = true; ov.hint(o.found || 'Вот оно.'); play('thud', { vol: .5 }); setTimeout(() => { stop(); ov.close(); res({ found: true }) }, 1800) }
    });
    ov.button('Выключить', () => { stop(); ov.close(); res({ found: false }) }, 'ghost');
  });
}

// Читать страницу в темноте: текст проявляется только под лучом
export function diary(S, o = {}) {
  return new Promise(res => {
    const ov = overlay(o.title || 'Дневник', o.hint || 'Свети на страницу, чтобы прочитать');
    const c = ov.canvas();
    const stop = beamLoop(ov, c, (x, w, h) => {
      x.fillStyle = '#d9cfb6'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { x.strokeStyle = 'rgba(80,100,140,.18)'; x.beginPath(); x.moveTo(0, h * .1 + i * h * .033); x.lineTo(w, h * .1 + i * h * .033); x.stroke() }
      x.fillStyle = '#2a2418'; const fs = w * .055; x.font = `italic ${fs}px Georgia, serif`;
      let y = h * .16; (o.lines || []).forEach(l => {
        const words = l.split(' '); let line = '';
        words.forEach(wd => { const t = line + wd + ' '; if (x.measureText(t).width > w * .86) { x.fillText(line, w * .07, y); y += fs * 1.45; line = wd + ' ' } else line = t });
        x.fillText(line, w * .07, y); y += fs * 1.9;
      });
    }, { radius: .3, power: S.flash / 100, startX: .4, startY: .22 });
    ov.button('Закрыть', () => { stop(); ov.close(); res() });
  });
}
