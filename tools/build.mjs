// Сборка: www/ (для Android-приложения, звуки файлами) и dist/line911.html (одна страница, звуки внутри).
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');

const res = await build({ entryPoints: [path.join(root, 'src/main.js')], bundle: true, format: 'iife', target: ['es2020'], minify: true, write: false, legalComments: 'none' });
const js = res.outputFiles[0].text;
const css = rd('src/ui/styles.css');
const audioDir = path.join(root, 'assets/audio');
const names = fs.readdirSync(audioDir).filter(f => f.endsWith('.ogg')).map(f => f.slice(0, -4)).sort();
const tpl = rd('src/index.html').replace('/*CSS*/', () => css).replace('/*JS*/', () => js.replace(/<\/script/g, '<\\/script'));

// www/ для Capacitor
const www = path.join(root, 'www');
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(path.join(www, 'assets/audio'), { recursive: true });
names.forEach(n => fs.copyFileSync(path.join(audioDir, n + '.ogg'), path.join(www, 'assets/audio', n + '.ogg')));
fs.writeFileSync(path.join(www, 'index.html'), tpl.replace('/*DATA*/', () => 'window.__SND_LIST=' + JSON.stringify(names) + ';'));

// dist/ — одна страница
const snd = Object.fromEntries(names.map(n => [n, fs.readFileSync(path.join(audioDir, n + '.ogg')).toString('base64')]));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const one = tpl.replace('/*DATA*/', () => 'window.__SND=' + JSON.stringify(snd) + ';');
fs.writeFileSync(path.join(root, 'dist/line911.html'), one);
console.log(`www/ готово (${names.length} звуков), dist/line911.html — ${(one.length / 1048576).toFixed(2)} МБ, JS ${(js.length / 1024).toFixed(0)} КБ`);
