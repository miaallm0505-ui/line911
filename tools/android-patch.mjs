// Донастройка Android-проекта после `npx cap add android`: разрешения, портрет, тёмная тема, имя версии.
import fs from 'node:fs';
const mf = 'android/app/src/main/AndroidManifest.xml';
let m = fs.readFileSync(mf, 'utf8');
const perms = ['android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS', 'android.permission.VIBRATE', 'android.permission.POST_NOTIFICATIONS', 'android.permission.SCHEDULE_EXACT_ALARM'];
perms.forEach(p => { if (!m.includes(p)) m = m.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`) });
m = m.replace(/<activity\b(?![^>]*screenOrientation)/, '<activity android:screenOrientation="portrait"');
fs.writeFileSync(mf, m);
const gr = 'android/app/build.gradle';
let g = fs.readFileSync(gr, 'utf8');
const n = process.env.GITHUB_RUN_NUMBER || '1';
g = g.replace(/versionCode \d+/, `versionCode ${n}`).replace(/versionName "[^"]*"/, `versionName "0.1.${n}"`);
fs.writeFileSync(gr, g);
console.log('Android: разрешения и версия 0.1.' + n);
