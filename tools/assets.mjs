// Подготовка 3D-моделей под PSX-стиль: упростить сетку, оставить только цветовую текстуру 256 px, упаковать в .glb.
// Запуск: node tools/assets.mjs <папка_с_сырьём> <папка_вывода>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, prune, dedup, textureCompress, center } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs'; import path from 'node:path';

const [src, out] = process.argv.slice(2);
const TARGET = { tree_stump_01: 900, dead_tree_trunk: 1200, rock_moss_set_01: 1600, vintage_flashlight: 700, modified_thermos: 500 };
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
fs.mkdirSync(out, { recursive: true });
for (const dir of fs.readdirSync(src)) {
  const f = fs.readdirSync(path.join(src, dir)).find(x => x.endsWith('.gltf')); if (!f) continue;
  const doc = await io.read(path.join(src, dir, f));
  const tris = () => doc.getRoot().listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + (p.getIndices()?.getCount() || 0) / 3, 0), 0);
  const before = tris(), want = TARGET[dir] || 1000;
  for (const m of doc.getRoot().listMaterials()) {      // PSX: только цвет
    m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null);
    m.setRoughnessFactor(1); m.setMetallicFactor(0);
  }
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, want / before), error: 0.05, lockBorder: false }), dedup(), prune(),
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [256, 256], quality: 80 }));
  await io.write(path.join(out, dir + '.glb'), doc);
  console.log(dir.padEnd(20), Math.round(before), '→', Math.round(tris()), 'треуг.,', Math.round(fs.statSync(path.join(out, dir + '.glb')).size / 1024), 'КБ');
}
