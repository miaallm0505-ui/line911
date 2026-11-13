// Сцена целиком: мир, машина, существо, камера водителя (осматриваться пальцем или наклоном), касания по предметам.
import * as THREE from 'three';
import { PSX } from './psx.js';
import { buildWorld, roadX, groundY } from './world.js';
import { buildCar } from './car.js';
import { buildCreature } from './creature.js';
import { onTilt } from '../engine/device.js';

export async function createStage(canvas, opts = {}) {
  const psx = new PSX(canvas, { height: opts.height || 200 });
  const scene = new THREE.Scene();
  const FOG = new THREE.Color(0x0a0e13);
  scene.background = FOG; scene.fog = new THREE.FogExp2(FOG, .055);
  scene.add(new THREE.HemisphereLight(0x8094b0, 0x1a1d22, 1.6));
  const moon = new THREE.DirectionalLight(0x8ea4c4, .9); moon.position.set(-20, 30, 10); scene.add(moon);

  const world = await buildWorld(scene);
  const car = buildCar(scene);
  const beast = buildCreature(scene);

  const cam = new THREE.PerspectiveCamera(opts.fov || 72, 1, .05, 120);
  car.group.add(cam); cam.position.copy(car.eye);
  const view = { yaw: 0, pitch: -.12, ty: 0, tp: -.12, minY: -1.9, maxY: 1.9, minP: -.7, maxP: .45, locked: false };

  // ---- осмотр: палец или наклон телефона
  let drag = null; const acts = new Set();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = (cx, cy) => {
    const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const h = ray.intersectObjects(car.acts, false)[0];
    return h && h.distance < 2.2 ? h : null;
  };
  const S = { onTap: null, onDrag: null, onDragEnd: null, mode: 'look' };
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), h: hit(e.clientX, e.clientY) }; if (S.mode !== 'look' && S.onDrag && drag.h) S.onDrag(drag.h, e, true) });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (S.mode !== 'look' && S.onDrag) { const h = hit(e.clientX, e.clientY); if (h) S.onDrag(h, e, false); return }
    if (view.locked) return;
    view.ty = Math.max(view.minY, Math.min(view.maxY, view.ty - dx * .006)); view.tp = Math.max(view.minP, Math.min(view.maxP, view.tp - dy * .005));
  });
  canvas.addEventListener('pointerup', e => {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy), quick = performance.now() - drag.t < 350;
    if (moved < 10 && quick && S.onTap) { const h = hit(e.clientX, e.clientY); S.onTap(h ? h.object.userData.act : null, h) }
    if (S.onDragEnd) S.onDragEnd();
    drag = null;
  });
  const offTilt = onTilt((gx, gy) => { if (!view.locked && !drag) { view.ty = Math.max(view.minY, Math.min(view.maxY, -gx * 1.2)); view.tp = Math.max(view.minP, Math.min(view.maxP, -.12 - gy * .8)) } });

  // ---- плавно повернуть взгляд к предмету / направлению
  S.lookAt = (yaw, pitch = view.tp) => { view.ty = yaw; view.tp = pitch };
  S.lookAct = act => { const o = car.acts.find(a => a.userData.act === act); if (!o) return; const p = o.getWorldPosition(new THREE.Vector3()); car.group.worldToLocal(p); const d = p.sub(car.eye); S.lookAt(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z))) };
  S.lock = on => view.locked = on;
  S.view = view; S.car = car; S.beast = beast; S.world = world; S.scene = scene; S.cam = cam; S.psx = psx; S.fx = psx.fx;
  S.shake = 0;

  // ---- главный цикл
  let last = performance.now(), live = true, t = 0;
  const onResize = () => psx.resize(); addEventListener('resize', onResize);
  (function loop(now) {
    if (!live) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    view.yaw += (view.ty - view.yaw) * Math.min(1, dt * 6); view.pitch += (view.tp - view.pitch) * Math.min(1, dt * 6);
    cam.rotation.set(view.pitch, view.yaw, 0, 'YXZ');
    cam.position.copy(car.eye);
    // дыхание камеры + тряска
    cam.position.y += Math.sin(t * 1.6) * .004;
    if (S.shake > 0) { cam.position.x += (Math.random() - .5) * S.shake * .05; cam.position.y += (Math.random() - .5) * S.shake * .05; S.shake = Math.max(0, S.shake - dt * 2) }
    world.update(dt, cam.getWorldPosition(new THREE.Vector3()));
    car.update(dt, t); beast.update(dt, t, cam);
    if (S.tick) S.tick(dt, t);
    psx.render(scene, cam, t);
    requestAnimationFrame(loop);
  })(last);

  S.dispose = () => { live = false; offTilt(); removeEventListener('resize', onResize); psx.dispose() };
  S.roadX = roadX; S.groundY = groundY;
  return S;
}
