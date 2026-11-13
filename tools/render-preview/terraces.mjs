// Terrain model v2 sheets, built from the REAL assessSiteV2 / foundationBoxes / terraceFrame (src/game/*): the terrain is a function, never edited.
//   terrace-farm  : a terraced mountainside farm. Rows climb the hill (about 8, 20, 31 and 42 degrees): bunds, drystone, stone-faced with a water channel, stone stairs.
//   slope-nuance  : the same hut on a ridge, in a hollow, on a natural shelf, on a smooth and a broken 15 degree slope, and on sun and shade slopes.
import { Soup, slab, terrainMesh, grainTexture } from './scene-lib.mjs';
import { rigFor } from './rigs.mjs';
import { paint } from './placement-demo.mjs';
const sm = await import('../../src/scene/buildingStyleMap.ts'), cs = await import('../../src/scene/civSkin.ts'), vi = await import('../../src/scene/villageIdentity.ts');
const v2 = await import('../../src/game/siteAssessmentV2.ts'), sf = await import('../../src/game/siteFoundation.ts'), tf = await import('../../src/game/terraceFarming.ts'), nu = await import('../../src/game/slopeNuance.ts');
const STONE = '#a89c86', TIMBER = '#7a5a3a', TREAD = '#8c6d46', TREAD2 = '#7d6340', BUND = '#7f6848', CHANNEL = '#6f93a3', CROP = ['#86a64e', '#7a9a48', '#93b35a'];
const BOX_COLOUR = { 'strip-tread': TREAD, 'strip-tread-alt': TREAD2, 'strip-bund': BUND, 'strip-wall': STONE, channel: CHANNEL, post: TIMBER, beam: TIMBER };
const TINT = { level: [.55, 1.1, .6], moderate: [1.2, .98, .42], steep: [1.22, .72, .4], severe: [1.15, .45, .4] };
const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

/** Mountainside: falls toward +z (south, toward the camera). The angle steepens up the hill; a gentle swell in x bends the contours. */
function mountain() {
  const Z0 = -60, Z1 = 60, N = 480, dz = (Z1 - Z0) / N, ang = z => (8 + (30 - z) * .62 * (z < 30 ? 1 : 0.4)) * Math.PI / 180, table = new Float64Array(N + 1);
  // integrate from the south edge up: h(z) = sum tan(angle) dz
  for (let i = N - 1; i >= 0; i--) table[i] = table[i + 1] + Math.tan(Math.min(ang(Z0 + (i + .5) * dz), 50 * Math.PI / 180)) * dz;
  const base = z => { const f = (Math.max(Z0, Math.min(Z1, z)) - Z0) / dz, i = Math.min(N - 1, Math.floor(f)), t = f - i; return table[i] * (1 - t) + table[i + 1] * t; };
  return (x, z) => 2 + base(z) + .5 * Math.sin(x * .07 + z * .02) + .18 * Math.sin(x * .31 + 1.3) * Math.cos(z * .23);
}

export const terraceFarmScene = () => async ({ rig }) => {
  const H = mountain(), meshes = [], labels = [], stone = new Soup('terraces'), crops = new Soup('crops');
  const cols = [-27, -9, 9, 27], rows = [24, 10, -4, -18];
  meshes.push(terrainMesh({ x0: -52, x1: 52, z0: -44, z1: 44, step: .5, height: H, colorHeight: () => 0, waterY: -99, seed: 5, natural: true, name: 'hill' }));
  const cap = { age: 2, stonework: true, labour: 40, irrigationKnown: true, mountain: false };
  const summary = [];
  rows.forEach((z, ri) => {
    cols.forEach((x, ci) => {
      const a = v2.assessSiteV2(H, 'farm', x, z, 8.2, 8.2, { capability: cap, altitude: 20 + (44 - z) * .9, baseWork: 82 });
      if (!a.ok || !a.terrace) return;
      if (ci === 0) summary.push(a);
      const rec = a.terrace, plot = { x, z, w: 8.2, d: 8.2 };
      if (rec.k !== 'none') {
        const boxes = sf.foundationBoxes('strips', plot, { height: H, level: H(x, z), downhill: a.downhill, terrace: { n: rec.n, kind: rec.k } });
        for (const b of boxes) stone.add(slab(b.length, b.width, b.height, BOX_COLOUR[b.kind] || STONE, .5), { x: b.x, y: b.y + b.height / 2, z: b.z, yaw: b.yaw });
        // crops on the level treads, rows along the contour
        const fr = tf.terraceFrame(H, plot, rec.n, a.downhill), tan = fr.tangent;
        for (const st of fr.strips) {
          const tm = (st.t0 + st.t1) / 2, ch = tf.chordAt(plot, fr.dir, tm); if (!ch) continue;
          for (let t = st.t0 + .45; t < st.t1 - .3; t += .85) for (let s = ch.s0 + .5; s < ch.s1 - .4; s += .8) {
            const px = x + fr.dir.x * t + tan.x * s, pz = z + fr.dir.z * t + tan.z * s, hh = .32 + .22 * hash(px, pz);
            crops.add(slab(.34, .34, hh, CROP[(Math.floor(hash(pz, px) * 3)) % 3], .4), { x: px, y: st.level + .03 + hh / 2, z: pz, yaw: Math.atan2(-tan.z, tan.x) });
          }
        }
      }
    });
  });
  for (const a of summary) {
    const k = a.terrace;
    labels.push({ world: [-41, H(-30, rows[summary.indexOf(a)]) + 3.2, rows[summary.indexOf(a)] + 6], text: `${a.meanSlopeDeg.toFixed(0)}°  ${a.label}`, align: 'left', size: 13 });
    labels.push({ world: [-41, H(-30, rows[summary.indexOf(a)]) + 2.2, rows[summary.indexOf(a)] + 6], text: `${k.n} strips ${k.tread.toFixed(1)} m wide, ${k.rise.toFixed(1)} m risers · +${a.extraStone} stone · +${a.workPct}% labour`, align: 'left', size: 9 });
  }
  const p = 27 * Math.PI / 180;
  return { width: 1800, height: 1000, background: '#e7c493', camera: { ortho: 24, eye: [0, 14 + Math.sin(p) * 230, 0 + Math.cos(p) * 230], target: [0, 14, 0], near: 5, far: 900 },
    rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 10, 0], radius: 70 }, grain: grainTexture(), meshes: [...meshes, stone.encode(), crops.encode()], labels };
};

const NUANCE_COLS = (() => {
  const g = d => Math.tan(d * Math.PI / 180);
  return [
    { name: 'Ridge', H: (x, z) => 10 + g(6) * x - .04 * (x * x + z * z), x0: 0 },
    { name: 'Hollow', H: (x, z) => 10 + g(6) * x + .035 * (x * x + z * z), x0: 0 },
    { name: 'Natural shelf (30° hill)', H: x => 10 + g(30) * (x >= 3 ? x - 3 : x <= -3 ? x + 3 : 0), x0: 0 },
    { name: 'Smooth 15°', H: x => 10 + g(15) * x, x0: 0 },
    { name: 'Broken 15°', H: (x, z) => 10 + g(15) * x + .6 * Math.sin(x * 2.3) * Math.cos(z * 1.9), x0: 0 },
    { name: 'South-facing', H: (x, z) => 10 - g(14) * z, x0: 0 },
    { name: 'North-facing', H: (x, z) => 10 + g(14) * z, x0: 0 },
  ];
})();

export const slopeNuanceScene = () => async ({ rig }) => {
  const W = 5.4, D = 5.2, CW = 13.6, ZP = -9, ZB = 9, meshes = [], labels = [], ghosts = new Soup('g'), built = new Soup('b'), cols = NUANCE_COLS;
  const hut = () => paint(sm.variantSpec(sm.carvedVariantFor({ worldSeed: 4, type: 'hut', id: 5, era: 1, footprint: { w: W, d: D }, settlementSeed: 0, skin: cs.presetSkin('aureline'), heraldry: vi.villageHeraldry(4, 0) })));
  cols.forEach((c, i) => {
    const cx = (i - (cols.length - 1) / 2) * CW, Hc = (x, z) => c.H(x - cx, z);
    for (const zr of [ZP, ZB]) meshes.push(terrainMesh({ x0: cx - CW / 2 + 1, x1: cx + CW / 2 - 1, z0: zr - 7.5, z1: zr + 7.5, step: .5, height: (x, z) => Hc(x, z - zr), colorHeight: () => 0, waterY: -99, seed: 3 + i, natural: true, name: `terrain${i}${zr}` }));
    const a = v2.assessSiteV2(Hc, 'hut', cx, 0, W, D, { baseWork: 8 }), tint = TINT[a.tier];
    let level = -1e9; for (const [px, pz] of [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]]) level = Math.max(level, Hc(cx + px, pz)); level += .03;
    for (const [z, ghost] of [[ZP, true], [ZB, false]]) {
      const Hr = (x, zz) => Hc(x, zz - z);
      if (!a.ok && !ghost) { labels.push({ world: [cx - 3.2, Hc(cx, 0) + .5, z], text: 'refused: nothing is built', align: 'left', size: 11 }); continue; }
      const soup = ghost ? ghosts : built, lvl = level;
      soup.add(hut(), { x: cx, y: lvl, z, yaw: 0, tint: ghost ? tint : null });
      for (const b of sf.foundationBoxes(a.ok ? a.foundation : 'none', { x: cx, z, w: W, d: D }, { height: Hr, level: lvl, downhill: a.downhill, fall: a.fall, burial: .18 }))
        soup.add(slab(b.length, b.width, b.height, b.kind === 'post' || b.kind === 'beam' ? TIMBER : STONE, .5), { x: b.x, y: b.y + b.height / 2, z: b.z, yaw: b.yaw, tint: ghost ? tint : null });
    }
    const goods = [a.extraWood ? `+${a.extraWood} wood` : '', a.extraStone ? `+${a.extraStone} stone` : '', a.workPct ? `+${a.workPct}% labour` : ''].filter(Boolean).join('  ') || 'no extra cost';
    const lx = cx - 6, ly = 5.5, n = nu.surveyNuance(Hc, cx, 0, W, D);
    labels.push({ world: [lx, ly + 3.4, ZP - 5], text: c.name, align: 'left', size: 12 });
    labels.push({ world: [lx, ly + 2.5, ZP - 5], text: a.label, align: 'left', size: 10 });
    labels.push({ world: [lx, ly + 1.7, ZP - 5], text: a.ok ? goods : 'too steep', align: 'left', size: 9 });
    labels.push({ world: [lx, ly + .9, ZP - 5], text: `curv ${n.curvature.toFixed(1)} m · rough ${n.roughness.toFixed(2)} m · sun ${n.sun.toFixed(1)} · wet ${n.wetness.toFixed(2)}`, align: 'left', size: 8 });
  });
  const p = 40 * Math.PI / 180, half = cols.length * CW / 2;
  return { width: 1800, height: 900, background: '#e7c493', camera: { ortho: 25.5, eye: [0, Math.sin(p) * 220 + 3, 160 + Math.cos(p) * 220], target: [0, 2, 0], near: 5, far: 900 },
    rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: half }, grain: grainTexture(), meshes: [...meshes, ghosts.encode(), built.encode()], labels };
};
