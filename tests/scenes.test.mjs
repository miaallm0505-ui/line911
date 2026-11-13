// Проверка сцен без браузера: каждая сцена, на которую ведёт `return '...'`, существует; нет сирот.
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/story/prologue.js', import.meta.url), 'utf8');
const keys = [...src.matchAll(/^async (\w+)\(S, h\)/gm), ...src.matchAll(/^scenes\.(\w+) = async/gm)].map(m => m[1]);
const targets = [...src.matchAll(/return '(\w+)'/g)].map(m => m[1]);
const missing = targets.filter(t => !keys.includes(t));
const reached = new Set(['station', 'end_cold', 'end_co', 'end_blood', ...targets, ...[...src.matchAll(/\|\| '(\w+)'/g)].map(m => m[1])]);
const orphans = keys.filter(k => !reached.has(k));
console.log(`Сцен: ${keys.length}, переходов: ${targets.length}`);
if (missing.length) { console.error('Нет сцен:', missing); process.exit(1) }
if (orphans.length) { console.error('Недостижимы:', orphans); process.exit(1) }
console.log('Сцены в порядке.');
