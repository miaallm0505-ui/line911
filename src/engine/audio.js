// Звук: фоновые слои с плавными переходами, приглушение в машине, телефонная линия, звук по сторонам.
import { settings, saveSettings } from './state.js';

// Тихий фон: только ровный ветер и метель. Одиночных резких звуков нет вовсе.
const LOOPS = ['storm', 'blizzard'];
const QUIET = .45;   // общий потолок громкости фона
const ON_LINE = new Set(['static', 'office', 'kitchen', 'murmur']);   // слышно «через трубку»
const A = { ctx: null, buf: {}, g: {}, master: null, muff: null, line: null, ready: false, pending: null, early: [] };
export const audio = A;

function b64(b) { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer }
async function fetchBuf(name) {
  if (window.__SND && window.__SND[name]) return b64(window.__SND[name]);
  const r = await fetch('assets/audio/' + name + '.ogg'); return r.arrayBuffer();
}
const NAMES = () => window.__SND ? Object.keys(window.__SND) : (window.__SND_LIST || []);

export async function init() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return }
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  A.ctx = new C();
  A.master = A.ctx.createGain(); A.master.gain.value = settings.sound ? 1 : 0;
  const comp = A.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
  A.master.connect(comp); comp.connect(A.ctx.destination);
  A.muff = A.ctx.createBiquadFilter(); A.muff.type = 'lowpass'; A.muff.frequency.value = 650; A.muff.connect(A.master);
  A.line = A.ctx.createBiquadFilter(); A.line.type = 'bandpass'; A.line.frequency.value = 1400; A.line.Q.value = 0.6; A.line.connect(A.master);
  await Promise.all(NAMES().map(async n => { try { A.buf[n] = await A.ctx.decodeAudioData(await fetchBuf(n)) } catch (e) { } }));
  LOOPS.forEach(n => {
    const b = A.buf['L_' + n]; if (!b) return;
    const s = A.ctx.createBufferSource(); s.buffer = b; s.loop = true;
    const gn = A.ctx.createGain(); gn.gain.value = 0; s.connect(gn);
    gn.connect(n === 'storm' || n === 'blizzard' ? A.muff : ON_LINE.has(n) ? A.line : A.master);
    s.start(0, Math.random() * Math.max(0, b.duration - 1)); A.g[n] = gn;
  });
  A.ready = true;
  if (A.pending) { const p = A.pending; A.pending = null; mix(p.layers, p.inside) }
  // звуки, запрошенные до окончания загрузки: играем, если опоздали не больше чем на 1,5 с
  const now = performance.now(); A.early.splice(0).forEach(([n, o, ts]) => { if (now - ts < 1500) play(n, o) });
}

// Фон: {storm:.6, engine:.4, ...}; inside — приглушить метель (мы в машине)
export function mix(layers = {}, inside = true) {
  if (!A.ready) { A.pending = { layers, inside }; return }
  const t = A.ctx.currentTime;
  A.muff.frequency.setTargetAtTime(inside ? 650 : 16000, t, 0.6);
  for (const n in A.g) A.g[n].gain.setTargetAtTime((layers[n] || 0) * QUIET, t, 2.5);
}

// Одиночный звук. o: vol, rate, at, lp, pan, line, dur
export function play(name, o = {}) {
  return;   // одиночные звуки отключены: в игре только тихий фон
  if (!settings.sound) return;
  if (!A.ready) { A.early.push([name, o, performance.now()]); return }
  const b = A.buf['S_' + name]; if (!b) return;
  const t = A.ctx.currentTime + (o.at || 0);
  const s = A.ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = o.rate || 1;
  let node = s;
  if (o.lp) { const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f }
  if (o.pan != null && A.ctx.createStereoPanner) { const p = A.ctx.createStereoPanner(); p.pan.value = o.pan; node.connect(p); node = p }
  const gn = A.ctx.createGain(); gn.gain.value = o.vol == null ? 1 : o.vol; node.connect(gn);
  gn.connect(o.line ? A.line : A.master); s.start(t); if (o.dur) s.stop(t + o.dur);
  return s;
}

// Звук, который движется по сторонам (шаги вокруг машины): pan от a до b за dur секунд
export function sweep(name, from, to, dur, o = {}) {
  return;
  if (!A.ready || !settings.sound) return;
  const b = A.buf['S_' + name]; if (!b) return;
  const s = A.ctx.createBufferSource(); s.buffer = b; s.loop = !!o.loop;
  const p = A.ctx.createStereoPanner(); const gn = A.ctx.createGain(); gn.gain.value = o.vol || 0.9;
  const t = A.ctx.currentTime; p.pan.setValueAtTime(from, t); p.pan.linearRampToValueAtTime(to, t + dur);
  s.connect(p); p.connect(gn); gn.connect(A.master); s.start(t); s.stop(t + dur + 0.1);
}

export function knock(at = 0, roof = true, pan = 0) { play('knock', { at, rate: roof ? .78 : .92, lp: roof ? 1600 : 3200, vol: roof ? 1.2 : 1, pan }) }

export function setSound(on) {
  settings.sound = on; saveSettings();
  if (A.master) A.master.gain.setTargetAtTime(on ? 1 : 0, A.ctx.currentTime, 0.1);
}
export function suspend(on) { if (A.ctx) on ? A.ctx.suspend() : A.ctx.resume() }
