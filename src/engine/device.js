// Телефон игрока: вибрация, уведомления, наклон, микрофон. Всё — только по согласию и с запасными вариантами.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { settings, saveSettings } from './state.js';

export const native = Capacitor.isNativePlatform();

// ---- вибрация
export async function buzz(ms = 60) {
  try { if (native) await Haptics.vibrate({ duration: ms }); else navigator.vibrate && navigator.vibrate(ms) } catch (e) { }
}
export async function thud() { try { if (native) await Haptics.impact({ style: ImpactStyle.Heavy }); else navigator.vibrate && navigator.vibrate(70) } catch (e) { } }
// три удара: тяжёлые, медленные
export function knockBuzz(gap = 800) { [0, 1, 2].forEach(i => setTimeout(thud, i * gap)) }
export function heartbeat(times = 4) { for (let i = 0; i < times; i++) { setTimeout(() => buzz(40), i * 900); setTimeout(() => buzz(30), i * 900 + 260) } }

// ---- уведомления
export async function askNotify() {
  try {
    if (native) { const r = await LocalNotifications.requestPermissions(); settings.notify = r.display === 'granted' }
    else if ('Notification' in window) { settings.notify = (await Notification.requestPermission()) === 'granted' }
  } catch (e) { settings.notify = false }
  saveSettings(); return settings.notify;
}
let nid = 1;
export async function scheduleMissed(title, body, inSec) {
  if (!settings.notify) return null;
  const id = nid++;
  try {
    if (native) await LocalNotifications.schedule({ notifications: [{ id, title, body, schedule: { at: new Date(Date.now() + inSec * 1000) } }] });
    else setTimeout(() => { if (document.hidden && 'Notification' in window) new Notification(title, { body }) }, inSec * 1000);
  } catch (e) { }
  return id;
}
export async function cancelAll() { try { if (native) { const p = await LocalNotifications.getPending(); if (p.notifications.length) await LocalNotifications.cancel(p) } } catch (e) { } }

// ---- наклон телефона (для фонарика)
export async function askMotion() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function')
      settings.motion = (await DeviceOrientationEvent.requestPermission()) === 'granted';
    else settings.motion = 'DeviceOrientationEvent' in window;
  } catch (e) { settings.motion = false }
  saveSettings(); return settings.motion;
}
export function onTilt(fn) {
  if (!settings.motion) return () => { };
  let base = null;
  const h = e => { if (e.beta == null) return; if (!base) base = { b: e.beta, g: e.gamma }; fn((e.gamma - base.g) / 25, (e.beta - base.b) / 25) };
  window.addEventListener('deviceorientation', h);
  return () => window.removeEventListener('deviceorientation', h);
}
export function onShake(fn, limit = 2.2) {
  const h = e => { const a = e.acceleration || {}; const m = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0); if (m > limit) fn(m) };
  window.addEventListener('devicemotion', h);
  return () => window.removeEventListener('devicemotion', h);
}

// ---- микрофон
export async function askMic() {
  try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); settings.mic = true }
  catch (e) { settings.mic = false }
  saveSettings(); return settings.mic;
}
// Слушать уровень громкости: fn(level 0..1) каждые ~50 мс. Возвращает stop().
export async function listen(ctx, fn) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
  const src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser(); an.fftSize = 1024; src.connect(an);
  const data = new Float32Array(an.fftSize); let live = true;
  (function loop() { if (!live) return; an.getFloatTimeDomainData(data); let s = 0; for (const v of data) s += v * v; fn(Math.sqrt(s / data.length)); setTimeout(loop, 50) })();
  return () => { live = false; stream.getTracks().forEach(t => t.stop()) };
}
