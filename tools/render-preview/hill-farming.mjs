// Terrain model v3 sheets, built from the REAL assessSiteV2 (model v3) / hillFieldLines / planTerraceUpgrade / foundationBoxes / terraceFrame (src/game/*): the terrain is a function, never edited.
//   hill-farming-default  : the DEFAULT way to farm a hill: three fields on 10, 18 and 26 degrees (the last turned to face south-west). Furrows and crop rows follow the contour, an earth bank holds the lower edge, no stone.
//   hill-farming-terraced : the same three hillsides after the optional 'Terrace this field' action. Top row: earth bunds (first step, everyone). Bottom row: stone facing (needs stone-working and a gang).
import { Soup, slab, terrainMesh, grainTexture } from './scene-lib.mjs';
import { rigFor } from './rigs.mjs';
const v2 = await import('../../src/game/siteAssessmentV2.ts'), sf = await import('../../src/game/siteFoundation.ts'), tf = await import('../../src/game/terraceFarming.ts'), hf = await import('../../src/game/hillFarming.ts');
const STONE = '#a89c86', TREAD = '#8c6d46', TREAD2 = '#7d6340', BUND = '#7f6848', CHANNEL = '#6f93a3', CROP = ['#86a64e', '#7a9a48', '#93b35a'], FURROW = '#6b4f30', RIDGE = '#9a7a4c', BANK = '#8a7a45', BANK_TOP = '#6f8a3e';
const BOX_COLOUR = { 'strip-tread': TREAD, 'strip-tread-alt': TREAD2, 'strip-bund': BUND, 'strip-wall': STONE, channel: CHANNEL };
const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const CAP = { age: 2, stonework: true, labour: 40, irrigationKnown: true, mountain: false };
const COLS = [{ deg: 10, asp: 0 }, { deg: 18, asp: 0 }, { deg: 26, asp: 35 }], CW = 17, W = 8.2, D = 8.2;
/** One hillside cell: falls toward (sin asp, cos asp), `deg` degrees, centred on (cx, zc). */
const hillside = ({ deg, asp }, cx, zc, base = 6) => { const g = Math.tan(deg * Math.PI / 180), a = asp * Math.PI / 180; return (x, z) => base - g * ((x - cx) * Math.sin(a) + (z - zc) * Math.cos(a)) + .14 * Math.sin(x * .9 + z * .6) * Math.cos(z * .7); };

function ordinaryField(H, cx, zc, soup, crops) {
  const plot = { x: cx, z: zc, w: W, d: D }, a = v2.assessSiteV2(H, 'farm', cx, zc, W, D, { model: 'v3', capability: CAP, baseWork: 82, altitude: 25 });
  const dir = a.downhill, tn = { x: -dir.z, z: dir.x };
  for (const ln of hf.hillFieldLines(H, plot, dir)) {
    const bank = ln.kind === 'bank', hgt = bank ? .36 : .1, wid = bank ? .6 : .26, gy = H(ln.x, ln.z);
    soup.add(slab(ln.length + .03, wid, hgt, bank ? BANK : FURROW, .5), { x: ln.x, y: gy + hgt / 2 - .02, z: ln.z, yaw: ln.yaw });
    if (bank) { soup.add(slab(ln.length + .03, .22, .1, BANK_TOP, .5), { x: ln.x, y: gy + hgt - .01, z: ln.z, yaw: ln.yaw }); continue; }
    // crop plants sit on the ridge just uphill of each furrow, in a row along the contour
    for (let s = -ln.length / 2 + .35; s < ln.length / 2 - .15; s += .8) {
      const px = ln.x + tn.x * s - dir.x * .62, pz = ln.z + tn.z * s - dir.z * .62, hh = .3 + .2 * hash(px, pz);
      crops.add(slab(.32, .32, hh, CROP[Math.floor(hash(pz, px) * 3) % 3], .4), { x: px, y: H(px, pz) + .03 + hh / 2, z: pz, yaw: ln.yaw });
    }
  }
  return a;
}

function terracedField(H, cx, zc, kind, n, soup, crops) {
  const plot = { x: cx, z: zc, w: W, d: D }, a = v2.assessSiteV2(H, 'farm', cx, zc, W, D, { model: 'v3', capability: CAP, baseWork: 82, altitude: 25 });
  const boxes = sf.foundationBoxes('strips', plot, { height: H, level: H(cx, zc), downhill: a.downhill, terrace: { n, kind } });
  for (const b of boxes) soup.add(slab(b.length, b.width, b.height, BOX_COLOUR[b.kind] || STONE, .5), { x: b.x, y: b.y + b.height / 2, z: b.z, yaw: b.yaw });
  const fr = tf.terraceFrame(H, plot, n, a.downhill), tan = fr.tangent;
  for (const st of fr.strips) {
    const tm = (st.t0 + st.t1) / 2, ch = tf.chordAt(plot, fr.dir, tm); if (!ch) continue;
    for (let t = st.t0 + .45; t < st.t1 - .3; t += .85) for (let s = ch.s0 + .5; s < ch.s1 - .4; s += .8) {
      const px = cx + fr.dir.x * t + tan.x * s, pz = zc + fr.dir.z * t + tan.z * s, hh = .32 + .22 * hash(px, pz);
      crops.add(slab(.34, .34, hh, CROP[Math.floor(hash(pz, px) * 3) % 3], .4), { x: px, y: st.level + .03 + hh / 2, z: pz, yaw: Math.atan2(-tan.z, tan.x) });
    }
  }
}

const finish = ({ rig, meshes, labels, width, height, ortho, cx0, cz0 }) => {
  const p = 27 * Math.PI / 180;
  return { width, height, background: '#e7c493', camera: { ortho, eye: [cx0, 7 + Math.sin(p) * 230, cz0 + Math.cos(p) * 230], target: [cx0, 7, cz0], near: 5, far: 900 },
    rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [cx0, 6, cz0], radius: 60 }, grain: grainTexture(), meshes, labels };
};

export const hillFarmingDefaultScene = () => async ({ rig }) => {
  const meshes = [], labels = [], soup = new Soup('furrows'), crops = new Soup('crops'), zc = 0;
  COLS.forEach((c, i) => {
    const cx = (i - 1) * CW, H = hillside(c, cx, zc);
    meshes.push(terrainMesh({ x0: cx - CW / 2 + .6, x1: cx + CW / 2 - .6, z0: zc - 9, z1: zc + 9, step: .5, height: H, colorHeight: () => 0, waterY: -99, seed: 11 + i, natural: true, name: 'hill' + i }));
    const a = ordinaryField(H, cx, zc, soup, crops), rec = a.terrace;
    const lx = cx - 7, lz = zc + 8.2, ly = H(lx, lz) + .2;
    labels.push({ world: [lx, ly, lz], text: `${a.meanSlopeDeg.toFixed(0)}°  ${a.label}`, align: 'left', size: 13 });
    labels.push({ world: [lx, ly - .9, lz], text: `contour furrows · lower-edge bank · no stone`, align: 'left', size: 9 });
    labels.push({ world: [lx, ly - 1.6, lz], text: `soil ${rec.soil.toFixed(1)} m · loses ${(rec.eros * 100).toFixed(1)}% a year${hf.gullyRisk(rec.eros) ? ' · gully risk' : ''}${hf.hillWorkFor(a.meanSlopeDeg, W * D) === 'hoe' ? ' · hand-tilled' : ''}`, align: 'left', size: 9 });
  });
  return finish({ rig, meshes: [...meshes, soup.encode(), crops.encode()], labels, width: 1800, height: 700, ortho: 10.8, cx0: 0, cz0: zc + 1 });
};

export const hillFarmingTerracedScene = () => async ({ rig }) => {
  const meshes = [], labels = [], soup = new Soup('terraces'), crops = new Soup('crops'), ROWS = [-9, 9];
  ROWS.forEach((zc, ri) => COLS.forEach((c, i) => {
    const cx = (i - 1) * CW, H = hillside(c, cx, zc, ri === 0 ? 11 : 6);
    meshes.push(terrainMesh({ x0: cx - CW / 2 + .6, x1: cx + CW / 2 - .6, z0: zc - 6.6, z1: zc + 6.6, step: .5, height: H, colorHeight: () => 0, waterY: -99, seed: 21 + i + 3 * ri, natural: true, name: `hill${ri}${i}` }));
    const plot = { x: cx, z: zc, w: W, d: D }, base = v2.assessSiteV2(H, 'farm', cx, zc, W, D, { model: 'v3', capability: CAP, baseWork: 82, altitude: 25 }).terrace;
    const step1 = hf.planTerraceUpgrade(H, plot, base, CAP), step2 = step1.record ? hf.planTerraceUpgrade(H, plot, step1.record, CAP) : null;
    const plan = ri === 0 ? step1 : step2, lx = cx - 7, lz = zc + 6.3, ly = H(lx, lz) + .2;
    if (plan?.ok) {
      terracedField(H, cx, zc, plan.to, plan.record.n, soup, crops);
      labels.push({ world: [lx, ly, lz], text: `${base.slope.toFixed(0)}°  ${tf.TERRACE_RULES.kinds[plan.to].word}`, align: 'left', size: 13 });
      labels.push({ world: [lx, ly - 1, lz], text: `${plan.record.n} strips ${plan.record.tread.toFixed(1)} m wide, ${plan.record.rise.toFixed(1)} m risers`, align: 'left', size: 9 });
      labels.push({ world: [lx, ly - 1.8, lz], text: `${ri === 0 ? 'Terrace this field' : 'Face with stone'}: ${plan.wood} wood${plan.stone ? ` + ${plan.stone} stone` : ''} · soil loss ${(base.eros * 100).toFixed(1)}% to ${(plan.record.eros * 100).toFixed(1)}% a year`, align: 'left', size: 9 });
    } else {
      terracedField(H, cx, zc, 'bund', step1.record.n, soup, crops);
      labels.push({ world: [lx, ly, lz], text: `${base.slope.toFixed(0)}°  Contour bunds (enough)`, align: 'left', size: 13 });
      labels.push({ world: [lx, ly - 1, lz], text: plan?.issue || 'no further step', align: 'left', size: 9 });
    }
  }));
  return finish({ rig, meshes: [...meshes, soup.encode(), crops.encode()], labels, width: 1800, height: 1000, ortho: 19, cx0: 0, cz0: 0 });
};
