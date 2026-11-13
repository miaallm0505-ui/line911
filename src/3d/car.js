// Машина после аварии: салон изнутри (вид водителя), капот в сугробе, фары в лес, стёкла с инеем.
import * as THREE from 'three';
import { mat } from './psx.js';
import { tex, frostCanvas, crackCanvas, drawingCanvas, gaugesCanvas, freshenerCanvas, snowCrustCanvas, rng } from './textures.js';
import { roadX, groundY, CAR_SPOT } from './world.js';

const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o };

// Стекло с инеем: иней (кристаллы) × маска (где протёрли) + трещины + налипший снаружи снег
const GLASS_V = `varying vec2 vUv; void main(){ vUv = uv; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); p.xyz/=p.w; p.xy=floor(p.xy*160.+.5)/160.; p.xyz*=p.w; gl_Position = p; }`;
const GLASS_F = `
uniform sampler2D tFrost, tMask, tCrack, tSnow; uniform float uFrost, uLight, uFog, uTime; uniform vec3 uTint;
varying vec2 vUv;
void main(){
  float m = texture2D(tMask, vUv).r;
  vec4 f = texture2D(tFrost, vUv);
  float frost = f.a * m * uFrost;
  float fog = uFog * m * (1. - smoothstep(.0, .9, abs(vUv.x - .5) * 1.6)) * smoothstep(1., .2, vUv.y);   // запотевание от дыхания — снизу по центру
  vec4 c = texture2D(tCrack, vUv); vec4 s = texture2D(tSnow, vUv);
  vec3 col = f.rgb * uTint * (.25 + uLight);
  float a = clamp(frost * .92 + fog * .55, 0., .97);
  col = mix(col, vec3(.55,.6,.66) * (.3 + uLight), fog * .5);
  col = mix(col, vec3(.9) * (.4 + uLight), c.a * .7); a = max(a, c.a * .55);
  col = mix(col, vec3(.85,.88,.92) * (.15 + uLight * .7), s.a); a = max(a, s.a * .96);
  gl_FragColor = vec4(col, a * .96 + .04);
}`;
function glassMat(seed, crack) {
  const mask = document.createElement('canvas'); mask.width = 256; mask.height = 128;
  const mx = mask.getContext('2d'); mx.fillStyle = '#fff'; mx.fillRect(0, 0, 256, 128);
  const tm = tex(mask, false);
  const m = new THREE.ShaderMaterial({
    vertexShader: GLASS_V, fragmentShader: GLASS_F, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      tFrost: { value: tex(frostCanvas(512, 256, seed), false) }, tMask: { value: tm },
      tCrack: { value: tex(crack ? crackCanvas(512, 256, .7, .66) : document.createElement('canvas'), false) },
      tSnow: { value: tex(snowCrustCanvas(seed), false) }, uFrost: { value: .15 }, uLight: { value: .2 }, uFog: { value: 0 }, uTime: { value: 0 }, uTint: { value: new THREE.Color(.82, .9, 1) }
    }
  });
  m.mask = mask; m.mx = mx; m.tm = tm;
  return m;
}

export function buildCar(scene) {
  const C = { acts: [], glass: [], lights: {} };
  const car = new THREE.Group(); C.group = car;
  const cx = CAR_SPOT.x;
  car.position.set(cx, groundY(cx, CAR_SPOT.z) + .05, CAR_SPOT.z);
  car.rotation.set(-.07, -.42, .06, 'YXZ');      // нос в кювете, повёрнут к лесу
  scene.add(car);

  const plastic = mat({ color: 0x3a3e44 }), plastic2 = mat({ color: 0x4a4e55 }), fabric = mat({ color: 0x5c554d }), paint = mat({ color: 0x7a1c1c }), chrome = mat({ color: 0xa8aeb4 });
  const snowM = mat({ color: 0xdfe5ec });

  // приборная панель
  const dash = box(1.56, .26, .42, plastic, 0, .86, -.62); car.add(dash);
  const dashTop = box(1.56, .05, .5, plastic2, 0, 1.0, -.66); dashTop.rotation.x = .12; car.add(dashTop);
  const cluster = box(.46, .2, .12, plastic, -.37, 1.0, -.47); cluster.rotation.x = -.35; car.add(cluster);
  C.gaugeC = gaugesCanvas(1, .3); C.gaugeT = tex(C.gaugeC);
  const gauges = new THREE.Mesh(new THREE.PlaneGeometry(.4, .15), new THREE.MeshBasicMaterial({ map: C.gaugeT })); gauges.position.set(-.37, .995, -.405); gauges.rotation.x = -.35; car.add(gauges);
  const console_ = box(.3, .32, .5, plastic2, 0, .66, -.3); car.add(console_);
  const vent = box(.22, .06, .02, mat({ color: 0x0c0d0e }), 0, .93, -.415); car.add(vent);
  // бардачок
  const glove = box(.48, .16, .04, plastic2, .4, .78, -.41); glove.userData.act = 'glovebox'; car.add(glove); C.acts.push(glove); C.glove = glove;
  // руль
  const wheel = new THREE.Group(); wheel.position.set(-.37, .93, -.3); wheel.rotation.x = -1.1; car.add(wheel);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(.19, .022, 5, 14), plastic));
  [0, 2.1, 4.2].forEach(a => { const s = box(.17, .025, .02, plastic, Math.cos(a) * .09, Math.sin(a) * .09, 0); s.rotation.z = a; wheel.add(s) });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .05, 8), plastic2); hub.rotation.x = Math.PI / 2; wheel.add(hub);
  // подушка безопасности сработала — свисает с руля
  const bag = new THREE.Mesh(new THREE.SphereGeometry(.17, 6, 4), mat({ color: 0xcfc9bd })); bag.scale.set(1, .35, 1); bag.position.set(-.37, .86, -.22); bag.rotation.x = -.9; car.add(bag);
  // ключ в замке зажигания
  const key = box(.02, .05, .01, chrome, -.12, .86, -.415); key.userData.act = 'ignition'; car.add(key); C.acts.push(key);
  const fob = new THREE.Mesh(new THREE.SphereGeometry(.018, 5, 4), mat({ color: 0x8a2a1a })); fob.position.set(-.12, .82, -.41); car.add(fob); C.fob = fob;
  // крыша, стойки, двери
  const roof = box(1.56, .04, 1.3, fabric, 0, 1.45, .33); car.add(roof);
  [[-.76, 1], [.76, -1]].forEach(([x, s]) => {
    const p = box(.08, .72, .08, plastic, x, 1.19, -.6); p.rotation.x = .95; car.add(p);
    const door = box(.06, .5, 1.3, plastic2, x, .7, .1); car.add(door);
    const arm = box(.1, .06, .5, fabric, x - s * .05, .76, .2); car.add(arm);
    const b = box(.06, .5, .06, plastic, x, 1.18, .82); car.add(b);
  });
  const handle = box(.02, .03, .1, chrome, -.72, .9, .05); handle.userData.act = 'door'; car.add(handle); C.acts.push(handle);
  // сиденья
  [-.37, .37].forEach(x => { car.add(box(.5, .14, .5, fabric, x, .44, .25)); const back = box(.5, .62, .12, fabric, x, .8, .55); back.rotation.x = -.18; car.add(back); car.add(box(.26, .16, .08, fabric, x, 1.2, .62)) });
  // детский рисунок на пассажирском сиденье
  const drawing = new THREE.Mesh(new THREE.PlaneGeometry(.28, .21), mat({ map: tex(drawingCanvas()) })); drawing.rotation.set(-Math.PI / 2 + .1, 0, .3); drawing.position.set(.36, .52, .2);
  drawing.userData.act = 'drawing'; car.add(drawing); C.acts.push(drawing);
  // термос в подстаканнике
  C.thermosSpot = new THREE.Vector3(0.05, .86, -.12);
  // зеркало и ёлочка
  const mirror = box(.26, .07, .02, plastic, 0, 1.33, -.28); car.add(mirror); mirror.userData.act = 'mirror'; C.acts.push(mirror);
  const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(.24, .055), new THREE.MeshBasicMaterial({ color: 0x0a0d10 })); mirrorGlass.position.set(0, 1.33, -.268); mirrorGlass.rotation.y = Math.PI; car.add(mirrorGlass);
  const fresh = new THREE.Mesh(new THREE.PlaneGeometry(.04, .08), mat({ map: tex(freshenerCanvas()), transparent: true, alphaTest: .5, side: THREE.DoubleSide })); fresh.position.set(0, 1.23, -.28); car.add(fresh); C.fresh = fresh;
  // телефон в держателе у решётки
  const phone = box(.075, .15, .01, mat({ color: 0x050505 }), .12, 1.03, -.43); phone.rotation.x = -.3; phone.userData.act = 'phone'; car.add(phone); C.acts.push(phone);
  C.phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(.066, .136), new THREE.MeshBasicMaterial({ color: 0x9fc4ff })); C.phoneScreen.position.set(.12, 1.03, -.424); C.phoneScreen.rotation.x = -.3; car.add(C.phoneScreen);

  // капот снаружи: смятый, в снегу, уходит в сугроб
  const hoodG = new THREE.PlaneGeometry(1.6, 1.5, 8, 8); hoodG.rotateX(-Math.PI / 2);
  const hp = hoodG.attributes.position, rr = rng(9);
  for (let i = 0; i < hp.count; i++) { const z = hp.getZ(i); hp.setY(i, -z * .12 + (z < -.3 ? rr() * .14 * (-z) : 0)) }
  hoodG.computeVertexNormals();
  const hood = new THREE.Mesh(hoodG, paint); hood.position.set(0, .86, -1.5); car.add(hood);
  const hoodSnow = new THREE.Mesh(hoodG.clone(), snowM); hoodSnow.position.set(0, .885, -1.6); hoodSnow.scale.set(.96, 1, .8); car.add(hoodSnow);
  const drift = new THREE.Mesh(new THREE.SphereGeometry(1.4, 7, 5), snowM); drift.scale.set(1.4, .6, .9); drift.position.set(.2, .5, -2.5); car.add(drift);
  [-.7, .7].forEach(x => car.add(box(.08, .5, 3.6, paint, x * 1.12, .6, -.3)));

  // стёкла: лобовое с трещиной, боковые
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.48, .68), glassMat(7, true)); ws.rotation.set(0.95, 0, 0); ws.position.set(0, 1.19, -.6);
  ws.userData.act = 'windshield'; car.add(ws); C.acts.push(ws); C.glass.push(ws); C.windshield = ws;
  [[-.775, 'window_l', 13], [.775, 'window_r', 21]].forEach(([x, act, seed]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .44), glassMat(seed, false)); w.position.set(x, 1.17, .14); w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    w.userData.act = act; car.add(w); C.acts.push(w); C.glass.push(w);
  });

  // фары: левая светит, правая разбита и мигает
  const beams = [];
  [[-.62, true], [.62, false]].forEach(([x, ok]) => {
    const L = new THREE.SpotLight(0xfff1d6, ok ? 160 : 60, 36, .45, .5, 1.5); L.position.set(x, .68, -2.2); car.add(L);
    const T = new THREE.Object3D(); T.position.set(x * 2.5, -.6, -14); car.add(T); L.target = T;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 13, 10, 1, true), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uI: { value: ok ? .16 : .07 } },
      vertexShader: 'varying float vY; varying vec3 vN, vV; void main(){ vY = position.y; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform float uI; varying float vY; varying vec3 vN, vV; void main(){ float k = smoothstep(-6.5, 6.5, vY); float rim = pow(abs(dot(vN, vV)), 1.5); gl_FragColor = vec4(vec3(1.,.95,.85) * uI * k * rim, 1.); }'
    }));
    cone.position.set(x * 1.3, .2, -8.6); cone.rotation.x = Math.PI / 2 - .08; car.add(cone);
    beams.push({ L, cone, ok });
  });
  C.beams = beams;
  // свет внутри: подсветка приборов, экран телефона, спичка
  C.lights.dash = new THREE.PointLight(0xff8a40, 1.2, 1.6, 1.2); C.lights.dash.position.set(-.37, 1.0, -.4); car.add(C.lights.dash);
  C.lights.phone = new THREE.PointLight(0x9fc4ff, 2.2, 2.2, 1.2); C.lights.phone.position.set(.12, 1.05, -.38); car.add(C.lights.phone);
  C.lights.match = new THREE.PointLight(0xffa04a, 0, 4, 1.1); C.lights.match.position.set(-.2, 1.0, -.05); car.add(C.lights.match);
  C.lights.torch = new THREE.SpotLight(0xfff6e0, 0, 25, .35, .6, 1.3); car.add(C.lights.torch); car.add(C.lights.torch.target);

  // камера — глаза водителя
  C.eye = new THREE.Vector3(-.37, 1.13, .3);

  // ---- состояние и обновление
  C.state = { bat: 1, frost: .15, fog: 0, battery: true, headlights: true, phoneOn: true, match: 0 };
  let flick = 0, gaugeTimer = 0;
  C.update = (dt, t) => {
    const s = C.state;
    flick += dt;
    beams.forEach(b => {
      let on = s.headlights && s.battery ? s.bat : 0;
      if (!b.ok) on *= (Math.sin(t * 23) > .6 || Math.sin(t * 3.1) > .9) ? 0 : 1;
      b.L.intensity = (b.ok ? 160 : 60) * on; b.cone.material.uniforms.uI.value = (b.ok ? .16 : .07) * on;
    });
    C.lights.dash.intensity = s.battery ? 1.2 * s.bat : 0;
    C.lights.phone.intensity = s.phoneOn ? 2.2 : 0; C.phoneScreen.material.color.setHex(s.phoneOn ? 0x9fc4ff : 0x050608);
    C.lights.match.intensity = s.match > 0 ? s.match * (7 + Math.sin(t * 31) * 1.2 + Math.sin(t * 17) * 1) : 0;
    const light = .08 + (s.phoneOn ? .12 : 0) + s.match * .6 + (C.lights.torch.intensity > 0 ? .5 : 0);
    C.glass.forEach((g, i) => { const u = g.material.uniforms; u.uFrost.value = s.frost; u.uLight.value = light; u.uFog.value = i === 0 ? s.fog : 0; u.uTime.value = t });
    fresh.rotation.y = Math.sin(t * .7) * .3;
    gaugeTimer += dt; if (gaugeTimer > 2) { gaugeTimer = 0; const c2 = gaugesCanvas(s.battery ? s.bat : 0, .3); C.gaugeC.getContext('2d').drawImage(c2, 0, 0); C.gaugeT.needsUpdate = true }
  };
  // протереть стекло пальцем в точке uv; вернёт долю чистого стекла
  C.wipe = (glass, uv, radius = 14) => {
    const m = glass.material, x = m.mx, X = uv.x * 256, Y = (1 - uv.y) * 128;
    const g = x.createRadialGradient(X, Y, 0, X, Y, radius); g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(.7, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'source-over'; x.fillStyle = g; x.beginPath(); x.arc(X, Y, radius, 0, 7); x.fill();
    m.tm.needsUpdate = true;
  };
  // иней нарастает обратно — с краёв быстрее; rate 0..1 в секунду
  C.regrow = (dt, rate) => {
    C.glass.forEach(g => {
      const x = g.material.mx; x.globalCompositeOperation = 'lighter';
      const k = Math.min(1, rate * dt);
      const gr = x.createRadialGradient(128, 64, 10, 128, 64, 150); gr.addColorStop(0, `rgba(255,255,255,${k * .35})`); gr.addColorStop(1, `rgba(255,255,255,${k * 1.6})`);
      x.fillStyle = gr; x.fillRect(0, 0, 256, 128); x.globalCompositeOperation = 'source-over'; g.material.tm.needsUpdate = true;
    });
  };
  C.clearness = glass => { const d = glass.material.mx.getImageData(0, 0, 256, 128).data; let s = 0; for (let i = 0; i < d.length; i += 16) s += d[i]; return 1 - s / (d.length / 16) / 255 };
  return C;
}
