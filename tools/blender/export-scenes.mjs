#!/usr/bin/env node
// Export the real generator output (via tools/render-preview/scenes.mjs) to a
// Blender-friendly bundle per scene:
//   <out>/<scene>/scene.json   camera, rig, background, labels, material table, mesh list
//   <out>/<scene>/<mesh>.<attr>.bin   raw little-endian buffers
// attrs: pos f32x3 (scene frame: Y up, metres), nrm f32x3, col f32x3 (sRGB 0..1,
// exactly the generator's vertex colours), grain f32 (palette grain strength,
// -1 = water), uv f32x2 (metric grain UVs), mat u8 (index into scene.json
// materials = palette CarvedMaterialId list + 'terrain','plinth'), idx u32 (optional).
// Usage: node tools/blender/export-scenes.mjs [outDir] [scene ...] [--rig=tuned|adapter]
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
await import(pathToFileURL(path.join(root, 'scripts/game-loader.mjs')).href);
const { SCENES } = await import('../render-preview/scenes.mjs');
const { OUTPUTS } = await import('../render-preview/outputs.mjs');
const { MAT_IDS, palette } = await import('../render-preview/scene-lib.mjs');

export const BLENDER_OUTPUTS = [...OUTPUTS, ['village-hero', 'b-village-hero-4k.png']];
const args = process.argv.slice(2), flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const pos = args.filter(a => !a.startsWith('--'));
const outDir = path.resolve(pos[0] || path.join(here, 'out'));
const wanted = pos.length > 1 ? pos.slice(1) : BLENDER_OUTPUTS.map(o => o[0]);

const materials = MAT_IDS.map(id => ({ id, hex: palette.CARVED_MATERIALS[id]?.hex ?? (id === 'terrain' ? palette.CARVED_TERRAIN.bands[0] : palette.CARVED_TERRAIN.bands[2]), grain: palette.CARVED_MATERIALS[id]?.grain ?? .5, roughness: palette.CARVED_MATERIALS[id]?.roughness ?? .9 }));
for (const name of wanted) {
  if (!SCENES[name]) { console.error('unknown scene', name); process.exitCode = 1; continue; }
  const s = await SCENES[name]({ rig: flags.rig || 'tuned' }), dir = path.join(outDir, name);
  fs.mkdirSync(dir, { recursive: true });
  const meshes = s.meshes.map((m, i) => {
    const base = `${i}-${m.name}`, files = {};
    for (const k of ['pos', 'nrm', 'col', 'grain', 'uv', 'mat', 'idx']) if (m[k]) { const f = `${base}.${k}.bin`; fs.writeFileSync(path.join(dir, f), Buffer.from(m[k], 'base64')); files[k] = f; }
    return { name: m.name, cast: m.cast !== false, flat: m.flat !== false, water: !!m.water, files };
  });
  const file = (BLENDER_OUTPUTS.find(o => o[0] === name) || [name, name + '.png'])[1];
  fs.writeFileSync(path.join(dir, 'scene.json'), JSON.stringify({ scene: name, output: file, width: s.width, height: s.height, background: s.background, camera: s.camera, rig: s.rig, shadow: s.shadow, labels: s.labels || [], materials, meshes,
    note: 'Generator output from src/scene via tools/render-preview/scenes.mjs. Scene frame is Y-up metres; render_blender.py converts to Blender Z-up as (x, -z, y).' }, null, 1));
  const bytes = fs.readdirSync(dir).reduce((a, f) => a + fs.statSync(path.join(dir, f)).size, 0);
  console.error(`[export] ${name}: ${meshes.length} meshes, ${(bytes / 1e6).toFixed(1)} MB -> ${dir}`);
}
