// Мир снаружи: лесная дорога в метель, ели под снегом, сугробы, пни и камни, падающий снег.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mat, psxify } from './psx.js';
import { photo, asset, rng } from './textures.js';

const r = rng(2254);
const gl = new GLTFLoader();
export function loadModel(name) {
  return new Promise(res => gl.load(asset('models/' + name + '.glb'), g => {
    g.scene.traverse(o => { if (o.isMesh) { const m = o.material; o.material = mat({ map: m.map || null, color: m.color }) } });
    res(g.scene);
  }, undefined, () => res(new THREE.Group())));
}

// Дорога петляет: x(z)
export const roadX = z => Math.sin(z * .021) * 9 + Math.sin(z * .053) * 3;
const ground0 = (x, z) => {
  const d = Math.abs(x - roadX(z));
  const bank = d < 4.2 ? 0 : d < 6.5 ? (d - 4.2) * .45 : 1.05 + (d - 6.5) * .02;      // кювет и сугроб вдоль обочины
  return bank + Math.sin(x * .3) * Math.cos(z * .27) * .25 * Math.min(1, d / 8) - (d > 4.2 && d < 5.4 ? .35 : 0);
};


// Ель: ярусы-конусы с рваными краями, снег на верхних гранях (цвет вершин)
function pineGeo(seed) {
  const rr = rng(seed), parts = [];
  const tiers = 5 + Math.floor(rr() * 2), H = 7 + rr() * 5;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers, rad = (1 - t) * (1.9 + rr() * .5) + .3, h = H / tiers * 1.7;
    const g = new THREE.ConeGeometry(rad, h, 7, 2, true); g.translate(0, 1.2 + t * H * .82 + h / 2, 0);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const y = p.getY(k); if (y < 1.2 + t * H * .82 + h * .2) { p.setX(k, p.getX(k) * (1 + (rr() - .3) * .35)); p.setZ(k, p.getZ(k) * (1 + (rr() - .3) * .35)); p.setY(k, y - rr() * .35) } }
    g.computeVertexNormals(); parts.push(g);
  }
  const trunk = new THREE.CylinderGeometry(.12, .25, 2.2, 5); trunk.translate(0, 1.1, 0); parts.push(trunk);
  const geo = mergeGeos(parts);
  const col = [], n = geo.attributes.normal, P = geo.attributes.position;
  for (let k = 0; k < P.count; k++) {
    const isTrunk = P.getY(k) < 1.3 && Math.hypot(P.getX(k), P.getZ(k)) < .3;
    const snow = !isTrunk && n.getY(k) > .25 && rr() < .8;
    const c = isTrunk ? [.16, .12, .1] : snow ? [.78, .82, .88] : [.05 + rr() * .03, .13 + rr() * .05, .09];
    col.push(...c);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}
export function mergeGeos(list) {
  const out = new THREE.BufferGeometry(), pos = [], nor = [], uv = [];
  list.forEach(g => { g = g.index ? g.toNonIndexed() : g; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); if (g.attributes.uv) uv.push(...g.attributes.uv.array); else uv.push(...new Array(g.attributes.position.count * 2).fill(0)) });
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}

// Машина стоит в кювете справа у z=2 — вокруг неё ничего не растёт, снег под ней примят
export const CAR_SPOT = { x: roadX(2) + 4.4, z: 2 };
CAR_SPOT.y = ground0(CAR_SPOT.x, CAR_SPOT.z);
const ground = (x, z) => { const g = ground0(x, z), d = Math.hypot(x - CAR_SPOT.x, (z - CAR_SPOT.z) * .6); return d < 3.2 ? Math.min(g, CAR_SPOT.y + (d > 2.2 ? (d - 2.2) * .5 : 0)) : g };
export const groundY = ground;
const clearOf = (x, z, r = 5) => Math.hypot(x - CAR_SPOT.x, z - CAR_SPOT.z) > r;

export async function buildWorld(scene) {
  const W = { trees: [], update: () => { } };
  // земля: снег, дорога под снегом
  const g = new THREE.PlaneGeometry(220, 260, 110, 130); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, col = [];
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i); P.setY(i, ground(x, z));
    const d = Math.abs(x - roadX(z)), rut = d < 3.6 ? (Math.abs(Math.abs(x - roadX(z)) - 1.1) < .35 ? .72 : .86) : 1;
    col.push(rut * .92, rut * .95, rut);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const snowMat = mat({ map: photo('snow_02', 40), vertexColors: true, color: 0xdfe6ee });
  const land = new THREE.Mesh(g, snowMat); scene.add(land);

  // ели: много вариантов, расставлены вдоль дороги, гуще в глубине
  const variants = [1, 2, 3, 4].map(s => pineGeo(s * 97));
  const treeMat = psxify(new THREE.MeshLambertMaterial({ vertexColors: true }), 150);
  const spots = [];
  for (let i = 0; i < 900 && spots.length < 420; i++) {
    const z = -120 + r() * 240, side = r() < .5 ? -1 : 1, d = 7 + Math.pow(r(), 1.6) * 70;
    const x = roadX(z) + side * d;
    if (!clearOf(x, z, 6) || spots.some(s => Math.hypot(s[0] - x, s[1] - z) < 2.6)) continue;
    spots.push([x, z]);
  }
  variants.forEach((geo, vi) => {
    const mine = spots.filter((_, i) => i % 4 === vi);
    const im = new THREE.InstancedMesh(geo, treeMat, mine.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    mine.forEach(([x, z], i) => { const k = .8 + r() * .6; s.set(k, k * (.9 + r() * .3), k); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28); m4.compose(new THREE.Vector3(x, ground(x, z) - .3, z), q, s); im.setMatrixAt(i, m4); W.trees.push({ x, z, k }) });
    scene.add(im);
  });

  // пни, бревно, камни — фотосканы Poly Haven, ужатые под PSX
  const [stump, log, rocks] = await Promise.all(['tree_stump_01', 'dead_tree_trunk', 'rock_moss_set_01'].map(loadModel));
  const place = (obj, x, z, s, ry = 0) => { if (!clearOf(x, z, 5)) return null; const o = obj.clone(); o.position.set(x, ground(x, z) - .05, z); o.scale.setScalar(s); o.rotation.y = ry; scene.add(o); return o };
  for (let i = 0; i < 14; i++) { const z = -60 + r() * 100, sd = r() < .5 ? -1 : 1; place(stump, roadX(z) + sd * (6.5 + r() * 9), z, 1 + r() * .8, r() * 6) }
  place(log, roadX(-14) - 7.5, -14, 1.4, .4); place(log, roadX(12) + 8, 12, 1.2, 2.1);
  for (let i = 0; i < 10; i++) { const z = -50 + r() * 90, sd = r() < .5 ? -1 : 1; place(rocks, roadX(z) + sd * (7 + r() * 12), z, .8 + r() * .7, r() * 6) }

  // дорожный знак: ограничение скорости, весь в снегу
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.2, 5), mat({ color: 0x555b60 }));
  const sx = roadX(-26) + 4.8; post.position.set(sx, ground(sx, -26) + 1.1, -26); scene.add(post);
  const signC = document.createElement('canvas'); signC.width = 64; signC.height = 80; const sc = signC.getContext('2d');
  sc.fillStyle = '#e9ecee'; sc.fillRect(0, 0, 64, 80); sc.strokeStyle = '#111'; sc.lineWidth = 3; sc.strokeRect(4, 4, 56, 72);
  sc.fillStyle = '#111'; sc.font = 'bold 11px Arial'; sc.textAlign = 'center'; sc.fillText('SPEED', 32, 22); sc.fillText('LIMIT', 32, 35); sc.font = 'bold 30px Arial'; sc.fillText('45', 32, 66);
  sc.fillStyle = 'rgba(245,248,252,.85)'; sc.fillRect(0, 0, 64, 14); sc.fillRect(0, 60, 22, 20);
  const st = new THREE.CanvasTexture(signC); st.magFilter = THREE.NearestFilter; st.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(.6, .75), mat({ map: st })); sign.position.set(sx, ground(sx, -26) + 2.1, -25.97); sign.rotation.y = -.2; scene.add(sign);

  // падающий снег: частицы вокруг камеры, метель сносит вбок
  const N = 2600, sp = new Float32Array(N * 3), sv = new Float32Array(N);
  for (let i = 0; i < N; i++) { sp[i * 3] = (r() - .5) * 40; sp[i * 3 + 1] = r() * 18; sp[i * 3 + 2] = (r() - .5) * 40; sv[i] = .6 + r() * .8 }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const smat = new THREE.PointsMaterial({ color: 0xc8d2dc, size: .03, sizeAttenuation: true, transparent: true, opacity: .85, depthWrite: false });
  const snow = new THREE.Points(sg, smat); snow.frustumCulled = false; scene.add(snow);
  W.wind = 2.5;
  W.update = (dt, cam) => {
    const p = sg.attributes.position.array, cx = cam.x, cy = cam.y, cz = cam.z;
    for (let i = 0; i < N; i++) {
      p[i * 3] += W.wind * dt * sv[i] + Math.sin(i + performance.now() * .001) * dt * .3; p[i * 3 + 1] -= dt * 1.6 * sv[i];
      if (p[i * 3 + 1] < -1) p[i * 3 + 1] += 18;
      if (p[i * 3] - cx > 20) p[i * 3] -= 40; if (p[i * 3] - cx < -20) p[i * 3] += 40;
      if (p[i * 3 + 2] - cz > 20) p[i * 3 + 2] -= 40; if (p[i * 3 + 2] - cz < -20) p[i * 3 + 2] += 40;
      const dx = p[i * 3] - cx, dz = p[i * 3 + 2] - cz, dd = dx * dx + dz * dz;
      if (dd < 5.8 && p[i * 3 + 1] < cy + 1.2) { const k = 2.45 / Math.sqrt(dd + 1e-4); p[i * 3] = cx + dx * k; p[i * 3 + 2] = cz + dz * k }
    }
    sg.attributes.position.needsUpdate = true;
  };
  return W;
}
