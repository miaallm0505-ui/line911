// Текстуры, нарисованные кодом: иней, трещины на стекле, детский рисунок, приборная панель, экран телефона.
import * as THREE from 'three';

export const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
export function tex(c, nearest = true) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false }
  return t;
}
export function asset(name) { return (window.__ASSETS && window.__ASSETS[name]) || 'assets/' + name }
const loader = new THREE.TextureLoader();
export function photo(name, repeat = 1) {
  const t = loader.load(asset('tex/' + name + '.jpg'));
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  return t;
}

// Иней: ветвистые кристаллы-«папоротники», растущие от краёв стекла
export function frostCanvas(w = 512, h = 256, seed = 7) {
  const c = canvas(w, h), x = c.getContext('2d'), r = rng(seed);
  // матовая основа: гуще у краёв
  const g0 = x.createRadialGradient(w / 2, h / 2, h * .2, w / 2, h / 2, w * .62); g0.addColorStop(0, 'rgba(200,218,232,.22)'); g0.addColorStop(1, 'rgba(210,226,240,.8)');
  x.fillStyle = g0; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(240,248,255,${r() * .25})`; x.fillRect(r() * w, r() * h, 1, 1) }
  // ветви
  const fern = (px, py, ang, len, depth) => {
    if (depth <= 0 || len < 2) return;
    const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
    x.strokeStyle = `rgba(245,250,255,${.25 + depth * .1})`; x.lineWidth = Math.max(.6, depth * .45);
    x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
    const n = 3 + Math.floor(r() * 3);
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1), bx = px + (ex - px) * t, by = py + (ey - py) * t;
      fern(bx, by, ang + .9 + r() * .3, len * .42, depth - 1);
      fern(bx, by, ang - .9 - r() * .3, len * .42, depth - 1);
    }
    fern(ex, ey, ang + (r() - .5) * .5, len * .7, depth - 1);
  };
  for (let i = 0; i < 70; i++) {
    const side = Math.floor(r() * 4); let px, py, a;
    if (side === 0) { px = r() * w; py = h; a = -Math.PI / 2 } else if (side === 1) { px = r() * w; py = 0; a = Math.PI / 2 }
    else if (side === 2) { px = 0; py = r() * h; a = 0 } else { px = w; py = r() * h; a = Math.PI }
    fern(px, py, a + (r() - .5) * 1.2, 20 + r() * 60, 4);
  }
  return c;
}

// Трещина от удара: «паутина» из точки
export function crackCanvas(w = 512, h = 256, cx = .72, cy = .62, seed = 3) {
  const c = canvas(w, h), x = c.getContext('2d'), r = rng(seed);
  const X = cx * w, Y = cy * h;
  x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1;
  const rays = [];
  for (let i = 0; i < 14; i++) {
    let a = i / 14 * Math.PI * 2 + r() * .3, px = X, py = Y; const pts = [[px, py]];
    const L = 40 + r() * 170;
    for (let d = 0; d < L; d += 8) { a += (r() - .5) * .35; px += Math.cos(a) * 8; py += Math.sin(a) * 8; pts.push([px, py]) }
    rays.push(pts); x.beginPath(); pts.forEach(([a1, b1], j) => j ? x.lineTo(a1, b1) : x.moveTo(a1, b1)); x.stroke();
  }
  for (let ring = 1; ring < 4; ring++) {
    x.beginPath();
    rays.forEach((p, i) => { const q = p[Math.min(p.length - 1, ring * 3)]; i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]) });
    x.closePath(); x.globalAlpha = .5 / ring; x.stroke(); x.globalAlpha = 1;
  }
  const g = x.createRadialGradient(X, Y, 0, X, Y, 18); g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(X - 20, Y - 20, 40, 40);
  return c;
}

// Детский рисунок на пассажирском сиденье: дом, семья, ёлки — и серая длинная фигура у края
export function drawingCanvas() {
  const c = canvas(256, 192), x = c.getContext('2d'), r = rng(11);
  x.fillStyle = '#efe9da'; x.fillRect(0, 0, 256, 192);
  const crayon = (col, w, pts) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); pts.forEach(([a, b], i) => { a += (r() - .5) * 2; b += (r() - .5) * 2; i ? x.lineTo(a, b) : x.moveTo(a, b) }); x.stroke() };
  crayon('#2b6fd6', 3, [[0, 160], [256, 158]]);
  crayon('#c23a2b', 3, [[70, 150], [70, 100], [110, 70], [150, 100], [150, 150], [70, 150]]);
  crayon('#e8b21c', 3, [[100, 118], [100, 98], [120, 98], [120, 118], [100, 118]]);
  [[30, 150], [200, 150], [225, 150]].forEach(([a, b]) => crayon('#2f7d32', 3, [[a - 12, b], [a, b - 40], [a + 12, b], [a - 12, b]]));
  // семья: трое
  [[165, 1], [178, .8], [188, .6]].forEach(([a, s]) => { crayon('#222', 2, [[a, 150], [a, 150 - 22 * s]]); x.beginPath(); x.arc(a, 150 - 28 * s, 5 * s, 0, 7); x.stroke() });
  // серая фигура — выше дома, руки до колен
  x.globalAlpha = .85; crayon('#7a7d80', 4, [[238, 152], [236, 60]]); crayon('#7a7d80', 3, [[236, 70], [222, 120]]); crayon('#7a7d80', 3, [[236, 70], [250, 122]]);
  crayon('#7a7d80', 3, [[236, 152], [228, 170]]); crayon('#7a7d80', 3, [[238, 152], [246, 170]]);
  x.beginPath(); x.ellipse(236, 50, 6, 10, 0, 0, 7); x.fillStyle = '#7a7d80'; x.fill(); x.globalAlpha = 1;
  x.fillStyle = '#222'; x.font = 'bold 13px Comic Sans MS, cursive'; x.fillText('ДЯДЯ НА', 12, 22); x.fillText('ДОРОГЕ', 12, 38);
  return c;
}

// Приборная панель: спидометр и указатели, подсветка тускнеет с аккумулятором
export function gaugesCanvas(bat = 1, fuel = .3, temp = .2) {
  const c = canvas(256, 96), x = c.getContext('2d');
  x.fillStyle = '#07090b'; x.fillRect(0, 0, 256, 96);
  const glow = `rgba(255,${Math.round(120 + 60 * bat)},60,${.25 + .7 * bat})`;
  const dial = (cx, cy, R, v, label) => {
    x.strokeStyle = glow; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, R, Math.PI * .8, Math.PI * 2.2); x.stroke();
    for (let i = 0; i <= 10; i++) { const a = Math.PI * .8 + i / 10 * Math.PI * 1.4; x.beginPath(); x.moveTo(cx + Math.cos(a) * R * .82, cy + Math.sin(a) * R * .82); x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.stroke() }
    const a = Math.PI * .8 + v * Math.PI * 1.4; x.strokeStyle = `rgba(255,70,40,${.4 + .6 * bat})`; x.lineWidth = 2;
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R * .9, cy + Math.sin(a) * R * .9); x.stroke();
    x.fillStyle = glow; x.font = '8px monospace'; x.textAlign = 'center'; x.fillText(label, cx, cy + R * .6);
  };
  dial(70, 52, 36, 0, 'MPH'); dial(186, 52, 36, 0, 'RPM'); dial(128, 40, 16, fuel, 'FUEL'); dial(128, 78, 12, temp, '°');
  if (bat < .5) { x.fillStyle = `rgba(255,40,30,${.6})`; x.fillRect(116, 6, 24, 8); x.fillStyle = '#000'; x.font = '7px monospace'; x.fillText('BATT', 128, 13) }
  return c;
}

// Хвойная «ёлочка»-ароматизатор на зеркале — без марки
export function freshenerCanvas() {
  const c = canvas(32, 64), x = c.getContext('2d');
  x.fillStyle = '#2f8a3a'; x.beginPath(); x.moveTo(16, 2);
  [[26, 18], [20, 18], [29, 34], [21, 34], [31, 52], [18, 52], [18, 62], [14, 62], [14, 52], [1, 52], [11, 34], [3, 34], [12, 18], [6, 18]].forEach(([a, b]) => x.lineTo(a, b));
  x.closePath(); x.fill(); return c;
}

// Снег, налипший снаружи на стекло: плотнее снизу
export function snowCrustCanvas(seed = 5) {
  const c = canvas(256, 128), x = c.getContext('2d'), r = rng(seed);
  for (let i = 0; i < 700; i++) { const y = 128 - Math.pow(r(), 3) * 50; x.fillStyle = `rgba(240,245,250,${.2 + r() * .5})`; const s = 1 + r() * 2; x.fillRect(r() * 256, y, s, s) }
  const g = x.createLinearGradient(0, 128, 0, 100); g.addColorStop(0, 'rgba(235,240,248,.95)'); g.addColorStop(1, 'rgba(235,240,248,0)');
  x.fillStyle = g; x.fillRect(0, 100, 256, 28); return c;
}

// ---- фактуры салона (маленькие, как на PS1)
function noiseFill(x, w, h, base, amp, r) { const id = x.createImageData(w, h); for (let i = 0; i < w * h; i++) { const n = (r() - .5) * amp; id.data[i * 4] = base[0] + n; id.data[i * 4 + 1] = base[1] + n; id.data[i * 4 + 2] = base[2] + n; id.data[i * 4 + 3] = 255 } x.putImageData(id, 0, 0) }
export function fabricTex(base = [74, 70, 66], seed = 1) {
  const c = canvas(64, 64), x = c.getContext('2d'), r = rng(seed); noiseFill(x, 64, 64, base, 26, r);
  x.globalAlpha = .07; for (let i = 0; i < 64; i += 2) { x.fillStyle = i % 4 ? '#000' : '#fff'; x.fillRect(0, i, 64, 1) } x.globalAlpha = 1;
  x.strokeStyle = 'rgba(20,18,16,.55)'; x.setLineDash([2, 2]); x.strokeRect(3.5, 3.5, 57, 57); x.beginPath(); x.moveTo(32, 4); x.lineTo(32, 60); x.stroke();
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function plasticTex(base = [52, 55, 60], seed = 2) {
  const c = canvas(64, 64), x = c.getContext('2d'); noiseFill(x, 64, 64, base, 12, rng(seed));
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function leatherTex() {
  const c = canvas(64, 16), x = c.getContext('2d'), r = rng(4); noiseFill(x, 64, 16, [38, 36, 34], 18, r);
  x.strokeStyle = 'rgba(120,110,95,.5)'; x.setLineDash([1, 2]); x.beginPath(); x.moveTo(0, 3); x.lineTo(64, 3); x.moveTo(0, 13); x.lineTo(64, 13); x.stroke();
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function doorTex() {
  const c = canvas(128, 64), x = c.getContext('2d'), r = rng(6); noiseFill(x, 128, 64, [60, 62, 66], 12, r);
  x.fillStyle = 'rgba(92,85,77,1)'; x.fillRect(6, 8, 116, 22); x.strokeStyle = 'rgba(25,22,20,.6)'; x.setLineDash([2, 2]); x.strokeRect(7.5, 9.5, 113, 19);
  x.setLineDash([]); x.fillStyle = '#1a1b1d'; x.beginPath(); x.arc(30, 48, 11, 0, 7); x.fill();
  x.fillStyle = '#2b2d30'; for (let i = 0; i < 40; i++) { const a = r() * 7, d = r() * 9; x.fillRect(30 + Math.cos(a) * d, 48 + Math.sin(a) * d, 1, 1) }
  x.fillStyle = '#26282b'; x.fillRect(70, 38, 46, 6);
  return tex(c);
}
export function ventTex() {
  const c = canvas(32, 16), x = c.getContext('2d'); x.fillStyle = '#121315'; x.fillRect(0, 0, 32, 16);
  x.fillStyle = '#2c2f33'; for (let i = 1; i < 16; i += 3) x.fillRect(1, i, 30, 1); x.strokeStyle = '#3a3d42'; x.strokeRect(.5, .5, 31, 15); return tex(c);
}
// Рация CB в торпедо: частота горит зелёным
export function radioCanvas(freq = '27.185', ch = '19', on = true) {
  const c = canvas(128, 32), x = c.getContext('2d'); x.fillStyle = '#16181a'; x.fillRect(0, 0, 128, 32);
  x.fillStyle = on ? '#0c1f12' : '#0a0c0b'; x.fillRect(30, 6, 68, 20);
  if (on) { x.fillStyle = '#5dff8a'; x.font = 'bold 13px monospace'; x.fillText(freq, 36, 21); x.font = '7px monospace'; x.fillText('CH ' + ch, 82, 13) }
  x.fillStyle = '#2b2e31'; [12, 114].forEach(cx => { x.beginPath(); x.arc(cx, 16, 8, 0, 7); x.fill() }); x.fillStyle = '#505459'; [12, 114].forEach(cx => x.fillRect(cx - 1, 9, 2, 6));
  return c;
}
// Обивка потолка
export function headlinerTex() { const c = canvas(32, 32), x = c.getContext('2d'); noiseFill(x, 32, 32, [96, 92, 86], 14, rng(8)); const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t }
// Резиновый коврик
export function matTex() { const c = canvas(32, 32), x = c.getContext('2d'); noiseFill(x, 32, 32, [28, 28, 30], 10, rng(9)); x.fillStyle = '#1b1b1d'; for (let i = 2; i < 32; i += 4) x.fillRect(0, i, 32, 1); const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t }
