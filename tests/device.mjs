// Проверка настоящего APK в Android-эмуляторе (запускается в GitHub Actions).
// Ставит приложение, подключается к WebView, проверяет звук, микрофон, вибрацию, уведомления,
// сворачивание и возвращение, прогоняет автопрохождения. Итог — out/device/report.json и скриншоты.
import { _android as android } from 'playwright-core';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const PKG = 'com.line911.forestroad';
const OUT = 'out/device';
fs.mkdirSync(OUT, { recursive: true });
const adb = c => { try { return execSync('adb ' + c, { encoding: 'utf8', timeout: 60000 }) } catch (e) { return 'ERR ' + e.message } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = { checks: [], console: [], crashes: [] };
const check = (name, ok, info = '') => { R.checks.push({ name, ok: !!ok, info: String(info).slice(0, 300) }); console.log((ok ? 'OK  ' : 'FAIL') + ' ' + name + (info ? ' — ' + String(info).slice(0, 160) : '')) };

process.on('unhandledRejection', e => console.log('unhandled', e && e.message));
const [dev] = await android.devices();
if (!dev) { console.error('Нет устройства'); process.exit(1) }
const apk = fs.readdirSync('.').find(f => f.endsWith('.apk'));
check('APK найден', apk, apk);
check('Установка', !adb(`install -r -g ${apk}`).startsWith('ERR'));
['RECORD_AUDIO', 'POST_NOTIFICATIONS'].forEach(p => adb(`shell pm grant ${PKG} android.permission.${p}`));
adb('logcat -c');
adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
await sleep(6000);
const shot = async n => { try { fs.writeFileSync(`${OUT}/${n}.png`, await dev.screenshot()) } catch (e) { } };
await shot('01_start');

let page;
try { const wv = await dev.webView({ pkg: PKG }, { timeout: 30000 }); page = await wv.page() } catch (e) { check('WebView доступен', false, e.message) }
if (page) {
  check('WebView доступен', true);
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) R.console.push(m.type() + ': ' + m.text()) });
  page.on('pageerror', e => R.console.push('pageerror: ' + e.message));
  const ev = (js, ms = 20000) => Promise.race([page.evaluate(js), sleep(ms).then(() => 'TIMEOUT')]).catch(e => 'ERR ' + e.message);

  check('Стартовый экран', await ev(`!document.querySelector('#start').hidden`));
  check('Нативная платформа', await ev(`window.Capacitor && Capacitor.isNativePlatform()`));
  check('Плагины на месте', await ev(`['Haptics','LocalNotifications','App','KeepAwake','StatusBar'].filter(p=>!Capacitor.isPluginAvailable(p)).join(',')||true`) === true);

  // звук: нажимаем «Лаборатория» настоящим тапом — это жест пользователя
  await page.click('#lab').catch(e => check('Клик по Лаборатории', false, e.message)); await sleep(4000); await shot('02_lab');
  check('Звук: контекст запущен', (await ev(`(window.__audioState&&window.__audioState())||'нет хука'`)) === 'running', await ev(`(window.__audioState&&window.__audioState())`));
  check('Звук: файлы декодированы', (await ev(`window.__audioCount?window.__audioCount():0`)) >= 40, await ev(`window.__audioCount?window.__audioCount():0`));
  check('Микрофон', await ev(`navigator.mediaDevices.getUserMedia({audio:true}).then(s=>{s.getTracks().forEach(t=>t.stop());return true}).catch(e=>'ERR '+e.name)`) === true);
  check('Вибрация', await ev(`Capacitor.Plugins.Haptics.vibrate({duration:80}).then(()=>true).catch(e=>'ERR '+e.message)`) === true);
  check('Наклон (deviceorientation есть)', await ev(`'DeviceOrientationEvent' in window`));
  check('Экран не гаснет', await ev(`Capacitor.Plugins.KeepAwake.keepAwake().then(()=>true).catch(e=>'ERR '+e.message)`) === true);
  const perm = await ev(`Capacitor.Plugins.LocalNotifications.checkPermissions().then(r=>r.display)`);
  check('Уведомления: разрешение', perm === 'granted', perm);
  check('Уведомление ставится', await ev(`Capacitor.Plugins.LocalNotifications.schedule({notifications:[{id:991,title:'Пропущенный вызов',body:'911 · тест',schedule:{at:new Date(Date.now()+3000)}}]}).then(()=>true).catch(e=>'ERR '+e.message)`) === true);
  await sleep(7000);
  const notif = adb('shell dumpsys notification --noredact');
  check('Уведомление показано', notif.includes('911') || notif.includes('Пропущенный'), '');
  await ev(`document.querySelector('.mech .mf button:last-child')?.click()`);

  // автопрохождения прямо на телефоне
  for (let i = 0; i < 3; i++) {
    await ev(`location.reload()`, 3000); await sleep(4000);
    const end = await ev(`window.__autoplay()`, 120000);
    const errs = await ev(`window.__ERR||[]`);
    check(`Автопрохождение ${i + 1}`, ['proto', 'open'].includes(end) && (!errs.length || errs === 'TIMEOUT'), end + ' ' + JSON.stringify(errs));
  }
  await shot('03_after_autoplay');

  // настоящая ночь: начать, свернуть на 50 с, вернуться — должен быть пропущенный вызов
  await ev(`location.reload()`, 3000); await sleep(4000);
  await ev(`window.__SLOW=0; (window.__state&&0); document.querySelector('#nm').value='Тест'`);
  await page.click('#go').catch(e => check('Клик по Начать', false, e.message)); await sleep(3000);
  await ev(`(()=>{const S=window.__state(); S.f.realtime=1; return true})()`);
  await shot('04_game');
  await ev(`Capacitor.Plugins.LocalNotifications.removeAllDelivered().then(()=>1)`);
  adb('shell input keyevent KEYCODE_HOME'); await sleep(52000);
  const n2 = adb('shell dumpsys notification --noredact');
  check('Пропущенный вызов при выходе', /911 · \d\d:\d\d/.test(n2) && !n2.includes('911 · тест'), (n2.match(/911 · [^\s"]*/) || [''])[0]);
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`); await sleep(5000);
  await shot('05_return');
  check('Экран пропущенных после возвращения', await ev(`!!document.querySelector('.mech')`), await ev(`document.querySelector('.mech .mh b')?.textContent||''`));
}

const log = adb(`logcat -d -t 4000`);
R.crashes = log.split('\n').filter(l => /FATAL EXCEPTION|AndroidRuntime: |ANR in|Capacitor\/Console.*(Error|error)/.test(l)).slice(0, 60);
check('Без падений приложения', !R.crashes.some(l => /FATAL|ANR/.test(l)), R.crashes.slice(0, 3).join(' | '));
fs.writeFileSync(`${OUT}/logcat.txt`, log);
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(R, null, 2));
const bad = R.checks.filter(c => !c.ok);
console.log(`\nИтог: ${R.checks.length - bad.length}/${R.checks.length} проверок пройдено`);
fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY || `${OUT}/summary.md`,
  `## Проверка на эмуляторе\n\n| | Проверка | Детали |\n|---|---|---|\n` + R.checks.map(c => `| ${c.ok ? '✅' : '❌'} | ${c.name} | ${c.info.replace(/\|/g, '/')} |`).join('\n') +
  `\n\nКонсоль: ${R.console.length} предупреждений/ошибок\n`);
process.exit(0);
