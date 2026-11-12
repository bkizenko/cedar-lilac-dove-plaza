#!/usr/bin/env node
// Blender pipeline driver: export -> Cycles render per scene -> label overlay.
//   BLENDER=/path/to/blender node tools/blender/run.mjs [--samples=96] [--quick] [scene ...]
// Writes docs/art-reference/h-renders/blender/<name>.png (1920x1200; the hero
// shot b-village-hero-4k.png is 3840x2400). Labels (sheet titles, family
// names) are drawn afterwards in headless Chromium with the same projection
// the stand-in renderer uses, so Blender itself renders no text.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const args = process.argv.slice(2), flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const only = args.filter(a => !a.startsWith('--'));
const BLENDER = process.env.BLENDER || 'blender', samples = flags.quick ? 24 : Number(flags.samples || 96);
const work = path.join(here, 'out'), outDir = path.join(root, 'docs/art-reference/h-renders/blender');
fs.mkdirSync(outDir, { recursive: true });

const exp = spawnSync(process.execPath, [path.join(here, 'export-scenes.mjs'), work, ...only], { stdio: 'inherit' });
if (exp.status) process.exit(exp.status);
const scenes = fs.readdirSync(work).filter(d => fs.existsSync(path.join(work, d, 'scene.json')) && (!only.length || only.includes(d)));

let req; for (const b of [root, process.env.NODE_PATH || '/home/claude/.npm-global/lib/node_modules']) { try { req = createRequire(path.join(b, b === root ? 'package.json' : 'x.js')); req.resolve('playwright'); break; } catch { req = null; } }
const { chromium } = req ? req('playwright') : { chromium: null };

const M = { // same math as renderer.html, for label placement
  persp(f, a, n, fa) { const t = 1 / Math.tan(f / 2), r = new Float64Array(16); r[0] = t / a; r[5] = t; r[10] = (fa + n) / (n - fa); r[11] = -1; r[14] = 2 * fa * n / (n - fa); return r; },
  ortho(l, r_, b, t, n, f) { const r = new Float64Array(16); r[0] = 2 / (r_ - l); r[5] = 2 / (t - b); r[10] = -2 / (f - n); r[12] = -(r_ + l) / (r_ - l); r[13] = -(t + b) / (t - b); r[14] = -(f + n) / (f - n); r[15] = 1; return r; },
  look(e, c) { const sub = (a, b) => a.map((v, i) => v - b[i]), nrm = a => { const l = Math.hypot(...a); return a.map(v => v / l); }, cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const z = nrm(sub(e, c)), x = nrm(cr([0, 1, 0], z)), y = cr(z, x), r = new Float64Array(16); r[0] = x[0]; r[4] = x[1]; r[8] = x[2]; r[1] = y[0]; r[5] = y[1]; r[9] = y[2]; r[2] = z[0]; r[6] = z[1]; r[10] = z[2]; r[12] = -dt(x, e); r[13] = -dt(y, e); r[14] = -dt(z, e); r[15] = 1; return r; },
  mul(a, b) { const r = new Float64Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; r[i * 4 + j] = s; } return r; },
  xf(m, p) { const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]; return [(m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w, (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w, (m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]) / w]; },
};

for (const name of scenes) {
  const S = JSON.parse(fs.readFileSync(path.join(work, name, 'scene.json'), 'utf8')), hero = name === 'village-hero';
  const res = hero ? '3840x2400' : '1920x1200', out = path.join(outDir, S.output);
  console.error(`[blender] ${name} -> ${out} (${res}, ${samples} spp)`);
  const r = spawnSync(BLENDER, ['-b', '--factory-startup', '-noaudio', '-P', path.join(here, 'render_blender.py'), '--', path.join(work, name), out, '--samples', String(hero ? Math.max(samples, 128) : samples), '--res', res], { stdio: 'inherit' });
  if (r.status) { console.error(`[blender] ${name} failed (${r.status})`); process.exitCode = 1; continue; }
  if (!S.labels.length || !chromium) continue;
  // overlay labels in CSS pixels of the scene's 800x500 design size, scaled to the render
  const [W, H] = res.split('x').map(Number), C = S.camera, aspect = S.width / S.height;
  const proj = C.ortho ? M.ortho(-C.ortho * aspect, C.ortho * aspect, -C.ortho, C.ortho, C.near || 1, C.far || 2000) : M.persp(C.fov * Math.PI / 180, aspect, C.near || 1, C.far || 2000);
  const VP = M.mul(proj, M.look(C.eye, C.target)), k = W / S.width;
  const labels = S.labels.map(L => { if (!L.world) return L; const p = M.xf(VP, L.world); return { ...L, x: (p[0] * .5 + .5) * S.width, y: (1 - (p[1] * .5 + .5)) * S.height }; });
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: W, height: H } });
  const img = 'data:image/png;base64,' + fs.readFileSync(out).toString('base64');
  await page.setContent(`<html><body style="margin:0"><canvas id=c width=${W} height=${H}></canvas></body></html>`);
  await page.evaluate(async ([img, labels, k]) => {
    const c = document.getElementById('c'), g = c.getContext('2d'), im = new Image(); im.src = img; await im.decode(); g.drawImage(im, 0, 0); g.scale(k, k);
    for (const L of labels) { g.font = `${L.weight || 600} ${L.size || 11}px ui-sans-serif, DejaVu Sans, sans-serif`; g.textAlign = L.align || 'center'; g.textBaseline = 'middle';
      if (L.box !== false) { const w = g.measureText(L.text).width + 8, h = (L.size || 11) + 6, bx = g.textAlign === 'center' ? L.x - w / 2 : g.textAlign === 'left' ? L.x - 4 : L.x - w + 4; g.fillStyle = L.bg || 'rgba(52,30,12,.72)'; g.fillRect(bx, L.y - h / 2, w, h); }
      g.fillStyle = L.color || '#fbeedb'; g.fillText(L.text, L.x, L.y); }
  }, [img, labels, k]);
  await page.locator('#c').screenshot({ path: out }); await b.close();
}
