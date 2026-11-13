// Знак на инее: нарисовать пальцем условный знак. Голос оно украдёт, знак — нет.
// Распознавание — классический алгоритм $1 (Wobbrock, 2007): ресемплинг, поворот, масштаб, сравнение.
import { overlay, pt } from '../ui/ui.js';
import { frostTexture } from './scenery.js';
import { play } from '../engine/audio.js';

const N = 48, SQ = 250, PHI = .5 * (-1 + Math.sqrt(5));
const TPL = {
  'треугольник': [[0, 1], [.5, 0], [1, 1], [0, 1]],
  'круг': Array.from({ length: 25 }, (_, i) => [.5 + .5 * Math.cos(i / 24 * 6.283 - 1.57), .5 + .5 * Math.sin(i / 24 * 6.283 - 1.57)]),
  'молния': [[.7, 0], [.2, .45], [.75, .55], [.3, 1]],
};
const len = p => p.reduce((s, q, i) => i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0, 0);
function resample(p) {
  const I = len(p) / (N - 1); let D = 0; const out = [p[0]]; p = p.slice();
  for (let i = 1; i < p.length; i++) {
    const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (D + d >= I && d > 0) { const t = (I - D) / d, q = [p[i - 1][0] + t * (p[i][0] - p[i - 1][0]), p[i - 1][1] + t * (p[i][1] - p[i - 1][1])]; out.push(q); p.splice(i, 0, q); D = 0 } else D += d;
  }
  while (out.length < N) out.push(p[p.length - 1]); return out.slice(0, N);
}
const cen = p => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
function rot(p, a) { const [cx, cy] = cen(p), c = Math.cos(a), s = Math.sin(a); return p.map(([x, y]) => [(x - cx) * c - (y - cy) * s + cx, (x - cx) * s + (y - cy) * c + cy]) }
function norm(p) {
  p = resample(p); const [cx, cy] = cen(p); p = rot(p, -Math.atan2(cy - p[0][1], cx - p[0][0]));
  const xs = p.map(q => q[0]), ys = p.map(q => q[1]), bw = Math.max(...xs) - Math.min(...xs) || 1, bh = Math.max(...ys) - Math.min(...ys) || 1;
  p = p.map(([x, y]) => [x * SQ / bw, y * SQ / bh]); const [c2x, c2y] = cen(p); return p.map(([x, y]) => [x - c2x, y - c2y]);
}
const pd = (a, b) => a.reduce((s, q, i) => s + Math.hypot(q[0] - b[i][0], q[1] - b[i][1]), 0) / a.length;
function best(p, t) {
  let a = -.785, b = .785, x1 = PHI * a + (1 - PHI) * b, f1 = pd(rot(p, x1), t), x2 = (1 - PHI) * a + PHI * b, f2 = pd(rot(p, x2), t);
  while (Math.abs(b - a) > .035) { if (f1 < f2) { b = x2; x2 = x1; f2 = f1; x1 = PHI * a + (1 - PHI) * b; f1 = pd(rot(p, x1), t) } else { a = x1; x1 = x2; f1 = f2; x2 = (1 - PHI) * a + PHI * b; f2 = pd(rot(p, x2), t) } }
  return Math.min(f1, f2);
}
const T = Object.fromEntries(Object.entries(TPL).map(([k, v]) => [k, norm(v)]));
export function recognize(points) {
  if (points.length < 6) return { name: null, score: 0 };
  const p = norm(points); let bn = null, bd = 1e9;
  for (const k in T) { const d = best(p, T[k]); if (d < bd) { bd = d; bn = k } }
  return { name: bn, score: 1 - bd / (.5 * Math.sqrt(2 * SQ * SQ)) };
}
export const SHAPES = Object.keys(TPL);

// o.want — какой знак нужен; o.tries — попыток
export function sigil(S, o = {}) {
  return new Promise(res => {
    const ov = overlay(o.title || 'Знак на инее', o.hint || ('Нарисуй пальцем на стекле: ' + o.want));
    const c = ov.canvas(), x = c.getContext('2d'), w = c.width, h = c.height;
    const tex = frostTexture(w, h, 11); let pts = [], down = false, tries = o.tries || 3, done = false;
    function paint() { x.clearRect(0, 0, w, h); x.fillStyle = '#0a1015'; x.fillRect(0, 0, w, h); x.drawImage(tex, 0, 0) }
    paint();
    function line(a, b) {
      x.save(); x.globalCompositeOperation = 'destination-out'; x.lineCap = 'round'; x.lineWidth = w * .035;
      x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); x.restore();
      x.save(); x.globalCompositeOperation = 'destination-over'; x.fillStyle = '#0a1015'; x.fillRect(0, 0, w, h); x.restore();
    }
    c.onpointerdown = e => { if (done) return; down = true; c.setPointerCapture(e.pointerId); paint(); const p = pt(c, e); pts = [[p.x, p.y]] };
    c.onpointermove = e => { if (!down) return; const p = pt(c, e), q = [p.x, p.y]; line(pts[pts.length - 1], q); pts.push(q) };
    c.onpointerup = () => {
      if (!down) return; down = false;
      const r = recognize(pts); const ok = r.name === o.want && r.score > .72;
      if (ok) { done = true; play('creak', { vol: .3, rate: 1.4 }); ov.hint('Знак получился: ' + r.name + '.'); setTimeout(() => { ov.close(); res({ ok: true, shape: r.name }) }, 1100) }
      else if (--tries <= 0) { done = true; ov.hint('Не похоже. Иней снова затягивает стекло.'); setTimeout(() => { ov.close(); res({ ok: false, shape: r.name }) }, 1400) }
      else { ov.hint(`Не похоже на «${o.want}». Ещё попыток: ${tries}`); setTimeout(paint, 700) }
    };
  });
}
