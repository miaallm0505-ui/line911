// Машина после аварии: салон изнутри (вид водителя), капот в сугробе, фары в лес, стёкла с инеем.
import * as THREE from 'three';
import { mat } from './psx.js';
import { tex, frostCanvas, crackCanvas, drawingCanvas, gaugesCanvas, freshenerCanvas, snowCrustCanvas, rng, fabricTex, plasticTex, leatherTex, doorTex, ventTex, radioCanvas, headlinerTex, matTex } from './textures.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
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
  car.position.set(cx, CAR_SPOT.y + .02, CAR_SPOT.z);
  car.rotation.set(-.06, -.2, .05, 'YXZ');      // нос в кювете, повёрнут к лесу
  scene.add(car);

  // ---- материалы с фактурами
  const T = { fab: fabricTex(), fabD: fabricTex([58, 55, 52], 3), pl: plasticTex(), pl2: plasticTex([70, 73, 78], 5), lea: leatherTex(), door: doorTex(), vent: ventTex(), roofT: headlinerTex(), matT: matTex() };
  const plastic = mat({ map: T.pl }), plastic2 = mat({ map: T.pl2 }), fabric = mat({ map: T.fab }), fabricD = mat({ map: T.fabD }), leather = mat({ map: T.lea });
  const paint = mat({ color: 0x7a1c1c }), chrome = mat({ color: 0xa8aeb4 }), rubber = mat({ color: 0x18191b }), snowM = mat({ color: 0xdfe5ec });
  const rbox = (w, h, d, r, m, x, y, z, seg = 2) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), m); o.position.set(x, y, z); return o };

  // ---- пол, моторный щит, ниши для ног (чтобы сквозь салон не было видно улицу)
  car.add(box(1.56, .56, .04, plastic, 0, .48, -.6));
  [-.78, .78].forEach(x => car.add(box(.04, .5, .5, plastic, x, .45, -.4)));
  car.add(box(1.56, .25, .04, plastic, 0, .3, 1.62));
  car.add(box(1.56, .04, 2.2, mat({ map: T.matT }), 0, .2, .5));
  const tunnel = rbox(.26, .16, 1.6, .05, plastic, 0, .27, .35); car.add(tunnel);
  [-.45, -.37, -.27].forEach((x, i) => { const pd = box(i === 2 ? .05 : .07, .1, .02, rubber, x, .3, -.5); pd.rotation.x = .5; car.add(pd) });
  // ---- торпедо: изогнутый профиль, вытянутый на всю ширину
  const prof = new THREE.Shape(); prof.moveTo(0, 0); prof.lineTo(.42, 0); prof.quadraticCurveTo(.5, .14, .44, .26); prof.lineTo(.08, .3); prof.quadraticCurveTo(-.02, .22, 0, 0);
  const dg = new THREE.ExtrudeGeometry(prof, { depth: 1.56, bevelEnabled: false, curveSegments: 3 }); dg.rotateY(Math.PI / 2); dg.translate(-.78, .72, -.42);
  const dash = new THREE.Mesh(dg, plastic); car.add(dash);
  // козырёк над приборами
  const hoodC = rbox(.5, .07, .2, .03, plastic, -.37, 1.04, -.5); hoodC.rotation.x = .15; car.add(hoodC);
  C.gaugeC = gaugesCanvas(1, .3); C.gaugeT = tex(C.gaugeC);
  const gauges = new THREE.Mesh(new THREE.PlaneGeometry(.42, .16), new THREE.MeshBasicMaterial({ map: C.gaugeT })); gauges.position.set(-.37, .95, -.44); gauges.rotation.x = -.25; car.add(gauges);
  // дефлекторы
  [-.7, -.06, .06, .7].forEach(x => { const v = new THREE.Mesh(new THREE.PlaneGeometry(.11, .055), mat({ map: T.vent })); v.position.set(x, .93, -.405); car.add(v) });
  // центральная консоль: рация CB, ручки печки
  const cons = rbox(.3, .34, .22, .03, plastic2, 0, .66, -.36); car.add(cons);
  C.radioC = radioCanvas('27.185', '19', false); C.radioT = tex(C.radioC);
  const radio = new THREE.Mesh(new THREE.PlaneGeometry(.24, .06), new THREE.MeshBasicMaterial({ map: C.radioT })); radio.position.set(0, .78, -.248); car.add(radio);
  radio.userData.act = 'radio'; C.acts.push(radio);
  [-.07, 0, .07].forEach(x => { const k = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .02, 8), rubber); k.rotation.x = Math.PI / 2; k.position.set(x, .66, -.245); car.add(k) });
  const shifter = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .16, 5), chrome); shifter.position.set(0, .42, -.05); shifter.rotation.x = -.3; car.add(shifter);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 5), leather); knob.position.set(0, .5, -.08); car.add(knob);
  // подстаканник с термосом и бардачок
  C.thermosSpot = new THREE.Vector3(0, .37, .18);
  const glove = rbox(.46, .15, .04, .015, plastic2, .4, .8, -.385); glove.userData.act = 'glovebox'; car.add(glove); C.acts.push(glove); C.glove = glove;
  const gl2 = box(.06, .015, .01, chrome, .4, .85, -.36); car.add(gl2);
  // руль в коже, на ступице — сдувшаяся подушка
  const wheel = new THREE.Group(); wheel.position.set(-.37, .93, -.27); wheel.rotation.x = -1.15; car.add(wheel);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(.185, .024, 6, 18), leather));
  [Math.PI * .5 + 2.1, Math.PI * .5 - 2.1, -Math.PI * .5].forEach(a => { const sp = box(.15, .03, .02, plastic, Math.cos(a) * .085, Math.sin(a) * .085, 0); sp.rotation.z = a; wheel.add(sp) });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.07, .075, .06, 10), plastic); hub.rotation.x = Math.PI / 2; wheel.add(hub);
  const bagG = new THREE.PlaneGeometry(.34, .3, 8, 8), bp = bagG.attributes.position, br = rng(31);
  for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i); bp.setZ(i, (br() - .5) * .03 + Math.max(0, .08 - Math.hypot(x, y)) * .8 - Math.max(0, -y) * .25) }
  bagG.computeVertexNormals();
  const bag = new THREE.Mesh(bagG, mat({ color: 0xcfc9bd, side: THREE.DoubleSide })); bag.position.set(0, -.04, .04); wheel.add(bag);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, .3, 6), plastic); column.position.set(-.37, .86, -.38); column.rotation.x = -1.15 + Math.PI / 2; car.add(column);
  // ключ в замке
  const key = box(.018, .045, .008, chrome, -.2, .84, -.36); key.userData.act = 'ignition'; car.add(key); C.acts.push(key);
  const fob = rbox(.03, .045, .012, .006, mat({ color: 0x2a2a2c }), -.2, .8, -.355); car.add(fob); C.fob = fob;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.012, .002, 4, 8), chrome); ring.position.set(-.2, .815, -.356); car.add(ring);

  // ---- потолок, стойки, двери с обивкой, рамки стёкол
  const roof = box(1.56, .04, 1.86, mat({ map: T.roofT }), 0, 1.49, .72); car.add(roof);
  const dome = rbox(.14, .02, .08, .01, mat({ color: 0xd8d4c8 }), 0, 1.465, .2); car.add(dome);
  [[-.76, 1], [.76, -1]].forEach(([x, s2]) => {
    const p = rbox(.08, .86, .08, .03, plastic2, x, 1.228, -.547); p.rotation.x = .95; car.add(p);
    const door = new THREE.Mesh(new THREE.BoxGeometry(.05, .62, 1.3), [plastic2, mat({ map: T.door }), plastic2, plastic2, plastic2, plastic2]);
    door.material[0] = mat({ map: T.door }); door.position.set(x, .62, .12); car.add(door);
    const arm = rbox(.09, .05, .48, .02, fabricD, x + s2 * .05, .72, .2); car.add(arm);
    const sill = box(.06, .03, 1.2, rubber, x + s2 * .01, .935, .12); car.add(sill);
    const bpil = rbox(.07, .52, .1, .02, plastic2, x, 1.18, .82); car.add(bpil);
    const visor = rbox(.36, .015, .15, .01, fabricD, x * .48, 1.465, -.12); car.add(visor);
  });
  const handle = box(.02, .03, .09, chrome, -.72, .88, .02); handle.userData.act = 'door'; car.add(handle); C.acts.push(handle);
  // ---- передние сиденья: подушка, боковины, спинка, подголовник
  [-.37, .37].forEach(x => {
    car.add(rbox(.5, .13, .5, .05, fabric, x, .45, .3));
    [-.22, .22].forEach(dx => car.add(rbox(.07, .1, .48, .03, fabricD, x + dx, .52, .3)));
    const back = new THREE.Group(); back.position.set(x, .52, .56); back.rotation.x = -.2; car.add(back);
    back.add(rbox(.5, .66, .12, .05, fabric, 0, .33, 0));
    [-.22, .22].forEach(dx => back.add(rbox(.07, .55, .1, .03, fabricD, dx, .3, -.04)));
    back.add(rbox(.26, .17, .09, .04, fabric, 0, .8, 0));
    [-.06, .06].forEach(dx => { const pin = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .1, 4), chrome); pin.position.set(dx, .7, 0); back.add(pin) });
  });
  // детский рисунок на пассажирском сиденье
  const drawing = new THREE.Mesh(new THREE.PlaneGeometry(.28, .21), mat({ map: tex(drawingCanvas()) })); drawing.rotation.set(-Math.PI / 2 + .08, 0, .3); drawing.position.set(.36, .525, .25);
  drawing.userData.act = 'drawing'; car.add(drawing); C.acts.push(drawing);
  // ---- задний ряд: диван и детское кресло (пустое)
  car.add(rbox(1.4, .14, .5, .05, fabric, 0, .45, 1.2));
  const rb = rbox(1.4, .6, .12, .05, fabric, 0, .78, 1.45); rb.rotation.x = -.18; car.add(rb);
  const cs = new THREE.Group(); cs.position.set(.36, .55, 1.15); car.add(cs);
  cs.add(rbox(.38, .08, .36, .04, mat({ color: 0x3d4a66 }), 0, 0, 0));
  cs.add(rbox(.38, .5, .07, .04, mat({ color: 0x3d4a66 }), 0, .27, .17));
  [-.19, .19].forEach(dx => cs.add(rbox(.05, .32, .34, .02, mat({ color: 0x2f3a52 }), dx, .14, .02)));
  const strap = box(.03, .3, .005, mat({ color: 0x1c1f26 }), -.07, .2, .13); cs.add(strap); cs.add(box(.03, .3, .005, mat({ color: 0x1c1f26 }), .07, .2, .13));
  const toy = new THREE.Mesh(new THREE.SphereGeometry(.05, 6, 5), mat({ color: 0x8a6d4a })); toy.position.set(.06, .08, -.02); cs.add(toy);
  [-.03, .03].forEach(dx => { const e = new THREE.Mesh(new THREE.SphereGeometry(.02, 5, 4), mat({ color: 0x8a6d4a })); e.position.set(.06 + dx, .13, -.02); cs.add(e) });
  // зеркало и ёлочка
  const mirror = rbox(.26, .07, .025, .012, plastic, 0, 1.37, -.24); car.add(mirror); mirror.userData.act = 'mirror'; C.acts.push(mirror);
  const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(.24, .055), new THREE.MeshBasicMaterial({ color: 0x0a0d10 })); mirrorGlass.position.set(0, 1.37, -.226); mirrorGlass.rotation.y = Math.PI; car.add(mirrorGlass);
  const fresh = new THREE.Mesh(new THREE.PlaneGeometry(.04, .08), mat({ map: tex(freshenerCanvas()), transparent: true, alphaTest: .5, side: THREE.DoubleSide })); fresh.position.set(0, 1.28, -.24); car.add(fresh); C.fresh = fresh;
  const thread = box(.002, .05, .002, mat({ color: 0xcccccc }), 0, 1.33, -.24); car.add(thread);
  // телефон в держателе
  const holder = rbox(.09, .02, .03, .008, plastic, .12, .965, -.42); car.add(holder);
  const phone = rbox(.075, .155, .01, .008, mat({ color: 0x060606 }), .12, 1.04, -.43); phone.rotation.x = -.3; phone.userData.act = 'phone'; car.add(phone); C.acts.push(phone);
  C.phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(.066, .14), new THREE.MeshBasicMaterial({ color: 0x9fc4ff })); C.phoneScreen.position.set(.12, 1.04, -.4245); C.phoneScreen.rotation.x = -.3; car.add(C.phoneScreen);
  // заднее стекло
  C.rearSpot = new THREE.Vector3(0, 1.15, 1.62);

  // капот снаружи: смятый, в снегу, уходит в сугроб
  const hoodG = new THREE.PlaneGeometry(1.6, 1.5, 8, 8); hoodG.rotateX(-Math.PI / 2);
  const hp = hoodG.attributes.position, rr = rng(9);
  for (let i = 0; i < hp.count; i++) { const z = hp.getZ(i); hp.setY(i, -z * .12 + (z < -.3 ? rr() * .14 * (-z) : 0)) }
  hoodG.computeVertexNormals();
  const hood = new THREE.Mesh(hoodG, paint); hood.position.set(0, .86, -1.5); car.add(hood);
  const hoodSnow = new THREE.Mesh(hoodG.clone(), snowM); hoodSnow.position.set(0, .885, -1.6); hoodSnow.scale.set(.96, 1, .8); car.add(hoodSnow);
  const drift = new THREE.Mesh(new THREE.SphereGeometry(1.4, 7, 5), snowM); drift.scale.set(1.3, .42, .7); drift.position.set(.5, .3, -2.6); car.add(drift);
  [-.7, .7].forEach(x => car.add(box(.08, .55, 4.4, paint, x * 1.14, .62, .1)));
  const trunk = box(1.6, .5, .9, paint, 0, .65, 2.1); car.add(trunk); const trunkSnow = box(1.5, .06, .85, snowM, 0, .93, 2.1); car.add(trunkSnow);

  // стёкла: лобовое с трещиной, боковые
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.48, .82), glassMat(7, true)); ws.rotation.set(0.95, 0, 0); ws.position.set(0, 1.228, -.547);
  ws.userData.act = 'windshield'; car.add(ws); C.acts.push(ws); C.glass.push(ws); C.windshield = ws;
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .5), glassMat(29, false)); rear.position.set(0, 1.18, 1.62); rear.rotation.x = -.7; rear.userData.act = 'rear'; car.add(rear); C.acts.push(rear); C.glass.push(rear);
  [[-.775, 'window_l', 13], [.775, 'window_r', 21]].forEach(([x, act, seed]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .44), glassMat(seed, false)); w.position.set(x, 1.17, .14); w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    w.userData.act = act; car.add(w); C.acts.push(w); C.glass.push(w);
  });

  // фары: левая светит, правая разбита и мигает
  const beams = [];
  [[-.62, true], [.62, false]].forEach(([x, ok]) => {
    const L = new THREE.SpotLight(0xfff1d6, ok ? 160 : 60, 36, .45, .5, 1.5); L.position.set(x, .68, -2.2); car.add(L);
    const T = new THREE.Object3D(); T.position.set(x * 2.5, .1, -14); car.add(T); L.target = T;
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
  C.lights.dash = new THREE.PointLight(0xff7a30, .45, 1.1, 1.4); C.lights.dash.position.set(-.37, 1.0, -.4); car.add(C.lights.dash);
  C.lights.phone = new THREE.PointLight(0x9fc4ff, 2.2, 2.2, 1.2); C.lights.phone.position.set(.12, 1.05, -.38); car.add(C.lights.phone);
  C.lights.match = new THREE.PointLight(0xffa04a, 0, 4, 1.1); C.lights.match.position.set(-.2, 1.0, -.05); car.add(C.lights.match);
  C.lights.torch = new THREE.SpotLight(0xfff6e0, 0, 25, .35, .6, 1.3); car.add(C.lights.torch); car.add(C.lights.torch.target);

  // ---- слои: 0 — мир снаружи (луна, фары), 1 — салон (свои источники света)
  const OUTER = new Set([hood, hoodSnow, drift, trunk, trunkSnow]);
  beams.forEach(b => { OUTER.add(b.L); OUTER.add(b.cone); OUTER.add(b.L.target) });
  car.children.forEach(o => { if (!OUTER.has(o) && !(o.isMesh && o.material === paint)) o.traverse(k => k.layers.set(1)) });
  const inAmb = new THREE.HemisphereLight(0x3c4a64, 0x0d0f12, .9); inAmb.layers.set(1); car.add(inAmb);
  const snowBounce = new THREE.DirectionalLight(0x9db0c8, .35); snowBounce.position.set(.4, .3, -1); snowBounce.layers.set(1); car.add(snowBounce); car.add(snowBounce.target);
  C.lights.torch.layers.enableAll();

  // камера — глаза водителя
  C.eye = new THREE.Vector3(-.37, 1.16, .32);

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
    C.lights.dash.intensity = s.battery ? .45 * s.bat : 0;
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
