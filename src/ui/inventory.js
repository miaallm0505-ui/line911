// Рюкзак: что при себе, сколько весит, что можно сделать. Часы во время осмотра вещей идут.
import { overlay, el, toast } from './ui.js';
import { ITEMS, CAP, name, desc, weight, use, combine, stash, unstash } from '../engine/items.js';
import { tx } from '../engine/state.js';

export function openInventory(S, { atCar = false, onText } = {}) {
  const ov = overlay('Вещи', '', { cls: 'inv' });
  let picked = null;
  const draw = () => {
    ov.body.innerHTML = '';
    const w = weight(S);
    ov.hint(`При себе ${w.toFixed(1)} из ${CAP} фунтов${w > CAP ? ' · тяжело, идти медленнее' : ''} · спичек: ${S.matches}`);
    const list = el('div', 'items');
    Object.entries(S.inv).forEach(([id, n]) => {
      const it = ITEMS[id] || {};
      const row = el('div', 'item' + (picked === id ? ' pick' : ''));
      const left = el('div'); const b = el('b'); b.textContent = name(id) + (n > 1 ? ' ×' + n : '') + (S.uses[id] ? ` · ${S.uses[id]}` : ''); const p = el('p'); p.textContent = desc(S, id);
      left.append(b, p); row.appendChild(left);
      const btns = el('div', 'ibtn');
      if (it.use && it.act) { const u = el('button'); u.textContent = it.act; u.onclick = () => { const r = use(S, id); if (r) { ov.close(); onText ? onText(r) : toast(r) } else toast('Сейчас это ни к чему.') ; draw() }; btns.appendChild(u) }
      if (it.combine) { const c = el('button', 'alt'); c.textContent = picked === id ? 'Отмена' : 'Соединить…'; c.onclick = () => { picked = picked === id ? null : id; draw() }; btns.appendChild(c) }
      if (picked && picked !== id) { const c = el('button'); c.textContent = '← сюда'; c.onclick = () => { const r = combine(S, picked, id); picked = null; if (r) { ov.close(); onText ? onText(r) : toast(r) } else { toast('Одно к другому не подходит.'); draw() } }; btns.appendChild(c) }
      if (atCar && !it.keep) { const st = el('button', 'alt'); st.textContent = 'Оставить в машине'; st.onclick = () => { stash(S, id); draw() }; btns.appendChild(st) }
      row.appendChild(btns); list.appendChild(row);
    });
    ov.body.appendChild(list);
    if (atCar && Object.keys(S.stash).length) {
      const h = el('div', 'ihead'); h.textContent = 'В машине'; ov.body.appendChild(h);
      Object.entries(S.stash).forEach(([id, n]) => {
        const row = el('div', 'item'); const left = el('div'); const b = el('b'); b.textContent = name(id) + (n > 1 ? ' ×' + n : ''); left.appendChild(b); row.appendChild(left);
        const t = el('button'); t.textContent = 'Взять'; t.onclick = () => { unstash(S, id); draw() }; const bx = el('div', 'ibtn'); bx.appendChild(t); row.appendChild(bx); ov.body.appendChild(row);
      });
    }
  };
  draw();
  ov.button('Закрыть', () => ov.close());
  return new Promise(res => { const o = ov.close; ov.close = () => { o(); res() } });
}
