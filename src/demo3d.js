// Демонстрация 3D-салона: осмотреться, протереть стекло, спичка, фары, существо в свете фар.
import * as THREE from 'three';
import { createStage } from './3d/stage.js';
import { el, toast } from './ui/ui.js';

export async function demo3d() {
  const wrap = el('div', 'stage3d'); wrap.innerHTML = '<canvas></canvas><div class="s3hint"></div><div class="s3bar"></div>';
  document.body.appendChild(wrap);
  const hint = wrap.querySelector('.s3hint'), bar = wrap.querySelector('.s3bar');
  hint.textContent = 'Загрузка…';
  const st = await createStage(wrap.querySelector('canvas'));
  window.__stage = st;
  const c = st.car, s = c.state;
  hint.textContent = 'Веди пальцем — осмотреться. Коснись стекла, бардачка, телефона, рисунка.';
  const btn = (t, fn) => { const b = el('button'); b.textContent = t; b.onclick = fn; bar.appendChild(b); return b };
  let wiping = false;
  btn('Протереть стекло', () => { wiping = !wiping; st.mode = wiping ? 'wipe' : 'look'; hint.textContent = wiping ? 'Три стекло пальцем. Иней возвращается с краёв.' : 'Осмотр' });
  btn('Спичка', () => { s.match = s.match ? 0 : 1 });
  btn('Фары', () => { s.headlights = !s.headlights });
  btn('Иней +', () => { s.frost = Math.min(1, s.frost + .25) });
  btn('Выйти', () => { st.dispose(); wrap.remove() });
  st.onDrag = (h, e) => { if (h.object.material.mx) c.wipe(h.object, h.uv, 12) };
  st.onTap = act => {
    const msg = { glovebox: 'Бардачок: фонарик, батарейки, страховка на имя Уолта Кима.', phone: 'Телефон: 64%, одна полоска.', drawing: 'Рисунок племянницы. «Дядя на дороге».', ignition: 'Ключ. Стартер щёлкает — аккумулятор почти сел.', door: 'Дверь примёрзла.', mirror: 'В зеркале — только темнота заднего стекла.', windshield: 'Лобовое: трещина паутиной справа.', window_l: 'Боковое стекло. За ним — лес.', window_r: 'Боковое стекло. Сугроб до середины двери.' }[act];
    if (msg) toast(msg);
  };
  // существо: стоит у границы света фар; пока не смотришь — подходит ближе
  const P = new THREE.Vector3(); let dist = 17;
  const place = () => { const base = c.group.localToWorld(new THREE.Vector3(1.2, 0, -dist)); st.beast.place(base.x, st.groundY(base.x, base.z) - .1, base.z, c.group.getWorldPosition(P)) };
  setTimeout(place, 1500);
  let unseen = 0;
  st.tick = (dt) => {
    s.frost = Math.min(1, s.frost + dt * .004);
    c.regrow(dt, .05 + s.frost * .08);
    if (!st.beast.root.visible) return;
    if (st.beast.onScreen) unseen = 0; else { unseen += dt; if (unseen > 4 && dist > 6) { dist -= 3.5; place(); unseen = 0 } }
  };
}
