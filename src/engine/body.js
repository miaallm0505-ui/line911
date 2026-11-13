// Тело, машина, телефон. Шаг симуляции — одна игровая минута (может быть дробной).
import { OUT_T, clamp } from './state.js';

const OUTSIDE = new Set(['out', 'walk', 'run', 'dig', 'tube']);
function effTemp(S, a) {
  switch (a) {
    case 'out': case 'dig': return OUT_T - 22;
    case 'walk': return OUT_T - 18;
    case 'run': return OUT_T - 14;
    case 'tube': return OUT_T + 22;
    case 'fire': return 52;
    case 'cabin': return 62;
    default: return S.cabin;
  }
}

export function step(S, dt = 1) {
  const a = S.activity || 'car';
  const outside = OUTSIDE.has(a);
  // салон
  if (S.engineOn) {
    S.cabin += (74 - S.cabin) * 0.10 * dt;
    S.fuel = Math.max(0, S.fuel - 0.0078 * dt);
    S.co = S.pipe ? Math.max(0, S.co - 0.6 * dt) : S.co + 1.15 * dt;
    if (S.fuel <= 0) S.engineOn = false;
  } else {
    S.cabin += (OUT_T - S.cabin) * (S.f.glassbroken ? 0.06 : 0.022) * dt;
    S.co = Math.max(0, S.co - 0.25 * dt);
  }
  if (S.pipe && S.t - S.pipeAt > 140) { S.pipe = false; S.f.pipeWarn = 1 }
  // тепло тела
  const e = effTemp(S, a);
  const ins = 0.36 + (S.wrap && !['walk', 'run', 'dig'].includes(a) ? 0.22 : 0);
  const k = 1 + S.hunger / 220 + S.fatigue / 400;
  if (e < 62) {
    let d = (62 - e) * 0.00052 * (1 - ins) * k;
    if (outside && a !== 'tube') d *= 1.75;
    if (a === 'walk') d -= 0.010;
    if (a === 'run' || a === 'dig') d -= 0.018;
    S.core -= Math.max(0.001, d) * dt;
  } else S.core = Math.min(98.6, S.core + 0.045 * dt);
  // обморожение
  const hR = a === 'dig' ? 1.6 : outside ? (a === 'tube' ? 0.12 : 0.42) : (S.cabin < 12 ? 0.035 : -0.18);
  const fR = outside ? (a === 'tube' ? 0.1 : (S.socks ? 0.22 : 0.42)) : (S.cabin < 12 ? 0.03 : -0.15);
  S.hands = clamp(S.hands + hR * dt, S.handsP, 100);
  S.feet = clamp(S.feet + fR * dt, S.feetP, 100);
  if (S.hands >= 45) S.handsP = Math.max(S.handsP, S.hands * 0.55);
  if (S.feet >= 45) S.feetP = Math.max(S.feetP, S.feet * 0.55);
  // потребности
  const busy = a === 'walk' || a === 'run' || a === 'dig';
  S.hunger = clamp(S.hunger + (0.07 + (e < 10 ? 0.045 : 0) + (busy ? 0.06 : 0)) * dt, 0, 100);
  S.thirst = clamp(S.thirst + (0.06 + (busy ? 0.05 : 0)) * dt, 0, 100);
  S.fatigue = clamp(S.fatigue + (a === 'sleep' ? -0.55 : busy ? 0.2 : 0.045) * dt, 0, 100);
  if (S.bleed > 0) S.blood = clamp(S.blood - S.bleed * 0.09 * dt, 0, 100);
  let ds = 0;
  if (S.core < 94) ds -= 0.04;
  if (S.hunger > 75) ds -= 0.03;
  if (S.fatigue > 85) ds -= 0.03;
  if (S.co > 10) ds -= 0.05;
  S.sanity = clamp(S.sanity + ds * dt, 0, 100);
  // телефон
  S.bat = Math.max(0, S.bat - (0.035 + (e < 15 ? 0.04 : 0)) * (S.phoneWarm ? 0.5 : 1) * dt);
  if (S.f.torchOn) S.flash = Math.max(0, S.flash - 0.45 * dt);
}

// Чем человек слабее, тем громче он для вииндиго (0..100)
export function loudness(S) { return clamp(S.hunger * 0.5 + (98.6 - S.core) * 7 + (100 - S.blood) * 0.6, 0, 100) }

export function deathCheck(S) {
  if (S.co >= 30) return 'end_co';
  if (S.core <= 86.5) return 'end_cold';
  if (S.blood <= 30) return 'end_blood';
  return null;
}
