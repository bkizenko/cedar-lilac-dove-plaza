// Headless Chromium (Playwright) driver for renderer.html; writes a PNG.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
export async function renderToPng(scene, outPath) {
  let req = null; // repo node_modules first (CI), then a global install (authoring sandbox)
  for (const b of [path.resolve(here, '../..'), process.env.NODE_PATH || '/home/claude/.npm-global/lib/node_modules']) { try { const r = createRequire(path.join(b, 'noop.js')); r.resolve('playwright'); req = r; break; } catch { } }
  if (!req) throw new Error('playwright not found (npm ci, or set NODE_PATH)');
  const { chromium } = req('playwright');
  const browser = await chromium.launch(process.env.CI ? { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : undefined);
  try {
    const W = scene.width || 800, H = scene.height || 500;
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
    page.on('pageerror', e => console.error('[pageerror]', e.message));
    await page.goto(pathToFileURL(path.join(here, 'renderer.html')).href);
    const res = await page.evaluate(s => window.renderScene(s), { ...scene, width: W, height: H, pixelRatio: 1 * 2 });
    console.error('[render]', JSON.stringify(res));
    const tmp = outPath + '.raw.png';
    await page.locator('#wrap').screenshot({ path: tmp });
    // quantise only if above budget (keeps PNGs < 1.5 MB)
    let sharp = null; try { sharp = req('sharp'); } catch { }
    let buf = fs.readFileSync(tmp);
    if (sharp) { buf = await sharp(tmp).png({ compressionLevel: 9 }).toBuffer(); if (buf.length > 1.45e6) buf = await sharp(tmp).png({ compressionLevel: 9, palette: true, quality: 95, colours: 256, dither: .6 }).toBuffer(); }
    fs.writeFileSync(outPath, buf); fs.unlinkSync(tmp);
  } finally { await browser.close(); }
}
