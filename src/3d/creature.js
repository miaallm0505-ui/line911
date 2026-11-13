// Существо из леса: выше человека на голову-две, истощённое, руки ниже колен, лица не разобрать.
// Двигается, только когда на него не смотрят.
import * as THREE from 'three';
import { mat } from './psx.js';

function limb(len, r0, r1, m) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 5, 3); g.translate(0, -len / 2, 0);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const knob = Math.exp(-Math.pow((y + len * .02) / (len * .08), 2)) * .25; p.setX(i, p.getX(i) * (1 + knob)); p.setZ(i, p.getZ(i) * (1 + knob)) }
  g.computeVertexNormals(); return new THREE.Mesh(g, m);
}

export function buildCreature(scene) {
  const skin = mat({ color: 0x6f6a62 }), dark = mat({ color: 0x2a2724 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  // ноги: длинные, суставы «не туда»
  const legs = [];
  [-.13, .13].forEach(x => {
    const hip = new THREE.Group(); hip.position.set(x, 1.45, 0); body.add(hip);
    const th = limb(.78, .07, .045, skin); hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -.78; hip.add(knee);
    const sh = limb(.72, .045, .03, skin); knee.add(sh);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(.07, .03, .26), dark); foot.position.set(0, -.72, -.08); knee.add(foot);
    legs.push({ hip, knee });
  });
  // торс: узкий, рёбра проступают
  const torsoG = new THREE.CylinderGeometry(.16, .11, .95, 6, 6); const tp = torsoG.attributes.position;
  for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); const rib = y > -.1 ? 1 + Math.abs(Math.sin(y * 28)) * .06 : .85; tp.setX(i, tp.getX(i) * rib); tp.setZ(i, tp.getZ(i) * rib * .7) }
  torsoG.computeVertexNormals();
  const torso = new THREE.Mesh(torsoG, skin); torso.position.y = 1.95; torso.rotation.x = .18; body.add(torso);
  // руки: до колен, пальцы-ветки
  const arms = [];
  [-1, 1].forEach(s => {
    const sh = new THREE.Group(); sh.position.set(s * .2, 2.35, -.06); body.add(sh);
    const up = limb(.72, .045, .032, skin); sh.add(up); sh.rotation.z = s * .08;
    const el = new THREE.Group(); el.position.y = -.72; sh.add(el);
    const fo = limb(.74, .032, .022, skin); el.add(fo);
    const hand = new THREE.Group(); hand.position.y = -.74; el.add(hand);
    for (let f = 0; f < 4; f++) { const fg = limb(.22 + f % 2 * .04, .012, .005, dark); fg.rotation.z = (f - 1.5) * .12; fg.rotation.x = .1; hand.add(fg) }
    arms.push({ sh, el });
  });
  // шея и голова: вытянутая, наклонена, вместо лица — тень и два отблеска
  const neck = new THREE.Group(); neck.position.set(0, 2.42, -.02); body.add(neck);
  neck.add(limb(.18, .04, .035, skin)); neck.children[0].rotation.x = Math.PI;
  const headG = new THREE.SphereGeometry(.12, 7, 6); headG.scale(1, 1.75, 1.05);
  const head = new THREE.Mesh(headG, skin); head.position.y = .3; neck.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(.1, 6, 5), mat({ color: 0x0b0a09 })); face.scale.set(.9, 1.4, .5); face.position.set(0, .26, -.07); neck.add(face);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xd8e6c8, transparent: true, opacity: .9 });
  const eyes = [-.035, .035].map(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(.009, 4, 3), eyeM); e.position.set(x, .3, -.11); neck.add(e); return e });
  // «рога»: сухие ветки, вросшие в череп
  const branchM = mat({ color: 0x2b241d });
  [-1, 1].forEach(s => { let p = new THREE.Group(); p.position.set(s * .06, .48, 0); p.rotation.z = -s * .5; neck.add(p); for (let k = 0; k < 4; k++) { const b = limb(.2 - k * .03, .014, .008, branchM); b.rotation.z = s * (k % 2 ? .6 : -.3); p.add(b); const nx = new THREE.Group(); nx.position.y = -(.2 - k * .03); b.add(nx); p = nx } });
  root.rotation.y = Math.PI;      // по умолчанию смотрит на +z (в сторону машины)
  root.visible = false; scene.add(root);

  const X = { root, eyes, state: 'hidden', t: 0, seenFor: 0 };
  X.place = (x, y, z, faceTo) => { root.position.set(x, y, z); if (faceTo) root.lookAt(faceTo.x, y, faceTo.z); root.visible = true };
  X.hide = () => { root.visible = false };
  X.update = (dt, t, cam) => {
    if (!root.visible) return;
    X.t += dt;
    // дыхание, покачивание, наклон головы
    body.position.y = Math.sin(t * 1.3) * .015;
    torso.rotation.x = .18 + Math.sin(t * 1.3) * .02;
    neck.rotation.z = Math.sin(t * .4) * .25 + .2; neck.rotation.x = .25 + Math.sin(t * .23) * .1;
    arms.forEach(({ sh, el }, i) => { sh.rotation.x = .08 + Math.sin(t * .9 + i) * .04; el.rotation.x = -.15 - Math.sin(t * 1.7 + i * 2) * .05 });
    legs.forEach(({ knee }) => knee.rotation.x = .12);
    eyes.forEach(e => e.material.opacity = .55 + Math.sin(t * 6) * .1);
    // видит ли его игрок: в центре кадра
    const v = root.position.clone().add(new THREE.Vector3(0, 2.3, 0)).project(cam);
    X.onScreen = v.z < 1 && Math.abs(v.x) < .75 && Math.abs(v.y) < .9;
    X.seenFor = X.onScreen ? X.seenFor + dt : 0;
  };
  return X;
}
