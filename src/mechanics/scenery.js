// Ночной лес, нарисованный кодом: снег, сосны, следы, силуэты. Одинаковый при каждом запуске (зерно).
export function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 }

export function drawNight(ctx, w, h, o = {}) {
  const r = rng(o.seed || 7);
  // небо и снег
  const sky = ctx.createLinearGradient(0, 0, 0, h * .55); sky.addColorStop(0, '#05080b'); sky.addColorStop(1, '#16202a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  const gr = ctx.createLinearGradient(0, h * .5, 0, h); gr.addColorStop(0, '#2a3540'); gr.addColorStop(1, '#4d5c68');
  ctx.fillStyle = gr; ctx.fillRect(0, h * .5, w, h * .5);
  // дальние и ближние сосны
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = layer ? '#070a0d' : '#0e151b';
    const n = layer ? 9 : 16;
    for (let i = 0; i < n; i++) {
      const x = r() * w, base = h * (.5 + layer * .06 + r() * .04), th = h * (.25 + r() * .25) * (layer ? 1.4 : 1), tw = th * .28;
      ctx.beginPath(); ctx.moveTo(x, base - th);
      for (let k = 1; k <= 5; k++) { const yy = base - th + th * k / 5; ctx.lineTo(x + tw * k / 5, yy); ctx.lineTo(x + tw * k / 10, yy) }
      for (let k = 5; k >= 1; k--) { const yy = base - th + th * k / 5; ctx.lineTo(x - tw * k / 10, yy); ctx.lineTo(x - tw * k / 5, yy) }
      ctx.closePath(); ctx.fill();
    }
  }
  if (o.car) car(ctx, w * o.car.x, h * o.car.y, w * .22, o.car.blink);
  if (o.prints) prints(ctx, w, h, r);
  if (o.figure) figure(ctx, w * o.figure.x, h * o.figure.y, h * (o.figure.s || .62));
  // снег на ветру
  ctx.fillStyle = 'rgba(230,238,244,.55)';
  for (let i = 0; i < 140; i++) { ctx.beginPath(); ctx.arc(r() * w, r() * h, (r() * 1.6 + .4) * (w / 400), 0, 7); ctx.fill() }
}

// Цепочка босых следов с семью пальцами: из леса к окну
function prints(ctx, w, h, r) {
  ctx.fillStyle = 'rgba(14,20,26,.55)';
  for (let i = 0; i < 9; i++) {
    const t = i / 8, x = w * (.62 - t * .2 + (i % 2 ? .035 : -.035)), y = h * (.56 + t * .4), s = w * (.016 + t * .03);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.35 + (i % 2) * .15);
    ctx.beginPath(); ctx.ellipse(0, 0, s * .55, s * 1.6, 0, 0, 7); ctx.fill();
    for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(-s * .75 + k * s * .25, -s * 2.1 - Math.sin(k / 6 * Math.PI) * s * .5, s * .11, s * .32, 0, 0, 7); ctx.fill() }
    ctx.restore();
  }
}
// Высокая фигура: слишком длинные руки, ни облачка пара
export function figure(ctx, x, y, hh) {
  ctx.save(); ctx.fillStyle = 'rgba(150,160,166,.18)'; ctx.strokeStyle = 'rgba(170,180,186,.22)';
  ctx.beginPath(); ctx.ellipse(x, y - hh * .93, hh * .045, hh * .06, 0, 0, 7); ctx.fill();
  ctx.lineWidth = hh * .035; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - hh * .86); ctx.lineTo(x + hh * .01, y - hh * .45); ctx.stroke();
  ctx.lineWidth = hh * .02;
  ctx.beginPath(); ctx.moveTo(x, y - hh * .8); ctx.quadraticCurveTo(x - hh * .1, y - hh * .5, x - hh * .07, y - hh * .18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - hh * .8); ctx.quadraticCurveTo(x + hh * .1, y - hh * .5, x + hh * .09, y - hh * .2); ctx.stroke();
  ctx.lineWidth = hh * .026;
  ctx.beginPath(); ctx.moveTo(x, y - hh * .45); ctx.lineTo(x - hh * .04, y); ctx.moveTo(x + hh * .01, y - hh * .45); ctx.lineTo(x + hh * .05, y); ctx.stroke();
  ctx.restore();
}
function car(ctx, x, y, w, blink) {
  ctx.fillStyle = '#20282e'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - w * .22, w, w * .22, w * .04); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x - w * .3, y - w * .36, w * .55, w * .16, w * .05); ctx.fill();
  ctx.fillStyle = 'rgba(220,230,236,.75)'; ctx.fillRect(x - w / 2, y - w * .25, w, w * .05);
  if (blink) { ctx.fillStyle = 'rgba(255,150,40,.9)'; ctx.beginPath(); ctx.arc(x + w * .46, y - w * .14, w * .025, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x - w * .46, y - w * .14, w * .025, 0, 7); ctx.fill() }
}

// Текстура инея: молочная плёнка с кристаллами-папоротниками
export function frostTexture(w, h, seed = 3) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const r = rng(seed);
  x.fillStyle = 'rgba(206,222,232,.93)'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = Math.max(1, w / 500);
  for (let i = 0; i < 70; i++) {
    let px = r() * w, py = r() * h, a = r() * 6.28;
    for (let k = 0; k < 14; k++) {
      const len = w * (.012 + r() * .02), nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len;
      x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
      x.beginPath(); x.moveTo(nx, ny); x.lineTo(nx + Math.cos(a + .8) * len * .6, ny + Math.sin(a + .8) * len * .6);
      x.moveTo(nx, ny); x.lineTo(nx + Math.cos(a - .8) * len * .6, ny + Math.sin(a - .8) * len * .6); x.stroke();
      px = nx; py = ny; a += (r() - .5) * .5;
    }
  }
  const id = x.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n }
  x.putImageData(id, 0, 0); return c;
}
