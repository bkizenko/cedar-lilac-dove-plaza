#!/usr/bin/env node
// Measured hut variety: for each civ, 12 huts of one village (same settlementSeed, heraldry, ids spread) built through carvedVariantFor ->
// variantSpec -> buildCarvedMesh at the MID tier, projected with the mid-zoom oblique camera into a binary silhouette (0.2 m cells, ground-centred),
// score = mean pairwise silhouette distance (1 - IoU), also reported: tier-1 triangle range, wall/roof hex diversity, min ground y.
//   node --import ./scripts/game-loader.mjs tools/render-preview/hut-variety-score.mjs [--era=1] [--per=12] [--json=out.json]
const cb = await import('../../src/scene/civSkin.ts'), sm = await import('../../src/scene/buildingStyleMap.ts'), cs = await import('../../src/scene/civStyles.ts'), vi = await import('../../src/scene/villageIdentity.ts');
const cm = await import('../../src/scene/carvedMesh.ts'), bp = await import('../../src/scene/buildingParts.ts');
const flags = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const era = +(flags.era ?? 1), per = +(flags.per ?? 12), type = flags.type || 'hut', tier = +(flags.tier ?? 1);
const yaw = -.55, pitch = 34 * Math.PI / 180, cell = .2, GW = 90, GH = 60, cx = GW / 2, base = GH - 6;
function silhouette(d) {
  const g = new Uint8Array(GW * GH), P = d.positions, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const pr = i => { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], rx = x * cy + z * sy, rz = -x * sy + z * cy; return [cx + rx / cell, base - (y * cp - rz * sp) / cell]; };
  for (let t = 0; t < P.length / 9; t++) {
    const a = pr(t * 3), b = pr(t * 3 + 1), c = pr(t * 3 + 2), x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(GW - 1, Math.ceil(Math.max(a[0], b[0], c[0]))), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(GH - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + .5, py = y + .5; if (Math.abs(den) < 1e-9) { g[y * GW + x] = 1; continue; }
      const l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / den, l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / den, l3 = 1 - l1 - l2, e = -.02;
      if (l1 >= e && l2 >= e && l3 >= e) g[y * GW + x] = 1;
    }
  }
  return g;
}
const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { const x = a[k], y = b[k]; if (x & y) i++; if (x | y) u++; } return u ? i / u : 1; };
const rows = [], civs = flags.civs ? String(flags.civs).split(',') : cs.CIV_IDS;
for (const [row, civ] of civs.entries()) {
  const skin = cb.presetSkin(civ), her = vi.villageHeraldry(7, row + 1), sil = [], tri = [], hexes = new Set(); let minY = 9, kinds = new Set();
  for (let k = 0; k < per; k++) {
    const v = sm.carvedVariantFor({ worldSeed: 7, type, id: 11 + row * 17 + k * 5, era, footprint: { w: 5.4, d: 5.2 }, settlementSeed: row + 1, skin, heraldry: her, prosperity: ((k * 37) % 10) / 10 });
    const spec = sm.variantSpec(v), d = cm.buildCarvedMesh(spec, tier); sil.push(silhouette(d)); tri.push(d.triangles);
    for (const p of bp.partsAtLod(spec, tier)) { const h = spec.materials?.[p.mat]?.hex; if (h && p.size[1] > .6) hexes.add(h); minY = Math.min(minY, p.pos[1]); kinds.add(p.shape + ':' + (p.sides || '')); }
  }
  let s = 0, n = 0, mn = 1; for (let i = 0; i < sil.length; i++) for (let j = i + 1; j < sil.length; j++) { const dd = 1 - iou(sil[i], sil[j]); s += dd; n++; mn = Math.min(mn, dd); }
  rows.push({ civ, score: +(s / n).toFixed(3), minPair: +mn.toFixed(3), tris: [Math.min(...tri), Math.max(...tri)], hexes: hexes.size, shapes: kinds.size, minPartY: +minY.toFixed(2) });
}
const mean = +(rows.reduce((a, r) => a + r.score, 0) / rows.length).toFixed(3);
console.log(JSON.stringify({ era, per, type, tier, meanScore: mean, rows }, null, 1));
if (flags.json) (await import('node:fs')).writeFileSync(flags.json, JSON.stringify({ era, per, type, tier, meanScore: mean, rows }, null, 1));
