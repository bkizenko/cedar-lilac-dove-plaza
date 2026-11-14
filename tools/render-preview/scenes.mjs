// Scene definitions for the H render preview. Every model comes from the real
// generator (src/scene); the only non-generator geometry is display plinths
// and the review terrain heightfield (coloured by carvedTerrainColorsForPositions).
import { Soup, specMesh, impostorMesh, slab, terrainMesh, waterMesh, grainTexture, style, families, trees, caravans, wonders, constants, palette, terrace, parts as P } from './scene-lib.mjs';
import { rigFor } from './rigs.mjs';
import { CIVS, civScene, civLineupScene } from './civ.mjs';
import { civBuildingsScene } from './civ-bldgs.mjs';
import { hutSheetScene } from './hut-sheet.mjs';
import { hutVarietyScene } from './hut-variety.mjs';
import { slopeScene, villagesScene } from './placement-demo.mjs';
import { slopeTiersScene } from './slope-tiers.mjs';
import { terraceFarmScene, slopeNuanceScene } from './terraces.mjs';
import { hillFarmingDefaultScene, hillFarmingTerracedScene } from './hill-farming.mjs';

const B = constants.BUILDINGS;
const WORLD = 1207;

// Representative stable building type per family (real BldType + footprint).
export const FAMILY_TYPES = [
  ['roundhouse', 'hut'], ['cottage', 'house'], ['longhouse', 'barracks'], ['granary', 'warehouse'], ['storehouse', 'warehouse'],
  ['watermill', 'grindingStone', { reviewWatermill: true, waterSide: '+x' }], ['quernShelter', 'grindingStone'], ['workshop', 'forge'],
  ['palisade', 'palisade', { wallAxis: 'x' }], ['gate', 'gate'], ['tower', 'watchtower'], ['church', 'temple'], ['marketStalls', 'market'], ['hearth', 'hearth'],
  ['fieldPlot', 'farm'], ['pen', 'pen'], ['pier', 'dock', { waterSide: '-z' }], ['bridge', 'bridge'], ['keep', 'keep'], ['stables', 'stables'], ['college', 'university'],
  ['quarry', 'quarry'], ['cairn', 'cairn'], ['grove', 'grove'], ['outpost', 'cornerstone'], ['threshing', 'threshingFloor'], ['stoneWall', 'stonewall', { wallAxis: 'x' }], ['trench', 'trench'], ['moat', 'moat'],
];
export const COLUMNS = [
  { era: 0, prosperity: .5, label: 'E0 wattle' },
  { era: 2, prosperity: .1, label: 'E2 poor' },
  { era: 2, prosperity: .9, label: 'E2 rich' },
  { era: 3, prosperity: .5, label: 'E3 stone' },
  { era: 5, prosperity: .5, label: 'E5 imperial' },
];

/** Spec for a family forced to stay that family across eras (the type
 * mapping would otherwise swap e.g. roundhouse -> cottage after era 1). */
export function familySpec(family, type, col, extra = {}, id = 11) {
  const input = { worldSeed: WORLD, type, id, era: col.era, habitat: 'plains', footprint: { w: B[type].w, d: B[type].d }, prosperity: col.prosperity, settlementSeed: 3, ...extra };
  const v = style.carvedVariantFor(input);
  return families.generateFamily(family, v.ctx, v.key + '|forced:' + family);
}

const sheetCamera = (cx, cz, half, pitchDeg = 48) => {
  const p = pitchDeg * Math.PI / 180, dist = 300;
  return { ortho: half, eye: [cx, Math.sin(p) * dist, cz + Math.cos(p) * dist], target: [cx, 0, cz], near: 10, far: 900 };
};

function familySheet(list, title) {
  return async ({ rig }) => {
    const soup = new Soup('buildings'), base = new Soup('plinths'), labels = [];
    const cell = 11.6, rowD = 16, blocksAcross = 2, gap = 8, blockW = COLUMNS.length * cell, perCol = Math.ceil(list.length / blocksAcross);
    const totalW = blocksAcross * blockW + (blocksAcross - 1) * gap, totalD = perCol * rowD;
    base.add(slab(totalW + 16, totalD + 16, .6, palette.CARVED_TERRAIN.bands[0], .5), { x: 0, z: 0 });
    list.forEach(([family, type, extra], i) => {
      const bx = Math.floor(i / perCol), row = i % perCol;
      const x0 = -totalW / 2 + bx * (blockW + gap), z = -totalD / 2 + rowD * (row + .5);
      base.add(slab(blockW - 1, rowD - 2.2, .25, palette.CARVED_TERRAIN.bands[2], .6), { x: x0 + blockW / 2, z, y: .25 });
      labels.push({ world: [x0 + .3, .3, z + rowD / 2 - 1.1], text: `${family}  (${type} ${B[type].w}×${B[type].d} m)`, align: 'left', size: 10 });
      COLUMNS.forEach((col, c) => {
        const spec = familySpec(family, type, col, extra || {});
        soup.add(specMesh(spec, 0), { x: x0 + cell * (c + .5), y: .25, z, yaw: -.5 });
      });
    });
    COLUMNS.forEach((col, c) => { for (let bx = 0; bx < blocksAcross; bx++) labels.push({ world: [-totalW / 2 + bx * (blockW + gap) + cell * (c + .5), 0, -totalD / 2 - 2.5], text: col.label, size: 10, bg: 'rgba(120,70,30,.75)' }); });
    labels.push({ x: 12, y: 16, text: title, align: 'left', size: 14, weight: 700 });
    labels.push({ x: 788, y: 490, text: 'Preview: real generator meshes (near LOD) in a stand-in WebGL2 renderer, not in-game', align: 'right', size: 9, bg: 'rgba(40,24,10,.6)' });
    return { width: 800, height: 500, background: '#e7c493', camera: sheetCamera(0, 2, totalW / 2 / 1.6 * 1.02), rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: Math.max(totalW, totalD) * .62 },
      grain: grainTexture(), meshes: [base.encode(), soup.encode()], labels };
  };
}

// ---------------------------------------------------------------- village
// Composition after the bottom-middle H panel of style-options-D-I.png:
// carved contour hills top-left, church + bell tower in a palisade on a raised
// terrace, cottages below it, river from top-right to bottom-left, arch/trestle
// bridge, watermill on the left bank, cottages and fields across the river,
// lollipop tree clumps. Buildings, trees and colours are generator output; the
// heightfield and layout are this preview's review diorama (not a game map).
const RIVER = [[70, -52], [48, -30], [32, -12], [18, 4], [5, 17], [-8, 27], [-20, 38], [-30, 56], [-36, 75]];
const BRIDGE_Y = -.6, RIVER_HALF = 4.6, WATER_Y = -1.4, SURFACE_Y = -.55, LAND_RAW = .25;
function segDist(px, pz, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz))); return [Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz), t]; }
function polyDist(px, pz, line) { let m = Infinity; for (let i = 0; i < line.length - 1; i++) m = Math.min(m, segDist(px, pz, line[i], line[i + 1])[0]); return m; }
function polyAt(line, u) { // u in [0,1] by segment count; returns point and unit normal (left of flow)
  const f = u * (line.length - 1), i = Math.min(line.length - 2, Math.floor(f)), t = f - i, a = line[i], b = line[i + 1];
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); return { p: [a[0] + dx * t, a[1] + dz * t], n: [-dz / l, dx / l], d: [dx / l, dz / l] };
}
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const CHURCH = [-6, -24];
function rawHeight(x, z) {
  let h = LAND_RAW;
  // carved hills rising to the back-left with wavy contours
  const ridge = (-z - 20) + (-x - 10) * .55 + 5 * Math.sin(x * .09 + 1.3) + 3 * Math.sin(z * .13 + x * .04);
  h += Math.max(0, ridge) * .2;
  // gentle rise back-right behind the tree clump
  h += Math.max(0, (-z - 44) + (x - 20) * .15) * .12;
  // church terrace: one band up
  const e = Math.hypot((x - CHURCH[0]) / 15.5, (z - CHURCH[1]) / 13);
  h += 1.6 * sstep(1.08, .96, e);
  // river channel with steep carved banks
  const d = polyDist(x, z, RIVER), f = sstep(RIVER_HALF + .5, RIVER_HALF - .3, d);
  h = h * (1 - f) + (WATER_Y - .3 - .6 * sstep(RIVER_HALF, 0, d)) * f;
  return h;
}
const dispHeight = (x, z) => { const h = rawHeight(x, z); return h < WATER_Y ? h : terrace.terracedHeight(h, WATER_Y, 1); };
let HEIGHT_FN = dispHeight;
const groundAt = (x, z) => { let m = -Infinity; for (const [dx, dz] of [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) m = Math.max(m, HEIGHT_FN(x + dx, z + dz)); return m; };

function villagePaths() {
  const br = polyAt(RIVER, .5), gate = [CHURCH[0], CHURCH[1] + 11];
  const a = [br.p[0] - br.n[0] * 9, br.p[1] - br.n[1] * 9], b = [br.p[0] + br.n[0] * 9, br.p[1] + br.n[1] * 9];
  return [
    [[-70, 8], [-40, 6], [-22, 4], [-8, 2], gate],
    [gate, [-4, 4], [0, 10], a],
    [b, [20, 22], [30, 30], [44, 34], [70, 38]],
    [b, [26, 14], [36, 6], [48, -4], [70, -12]],
    [[-8, 2], [-14, 14], [-18, 24]],
    [[0, 10], [2, 30], [4, 48], [6, 75]],
  ];
}

function villageScene({ rig, lodTier = 0, hero = false, terrain: tmode = 'natural' } = {}) {
  const natural = tmode !== 'carved', H = natural ? (x, z) => rawHeight(x, z) : dispHeight; HEIGHT_FN = H;
  const soup = new Soup('village'), labels = [], paths = villagePaths();
  const pathW = (x, z) => { let m = Infinity; for (const p of paths) m = Math.min(m, polyDist(x, z, p)); return 1 - sstep(.75, 1.2, m); };
  const terrain = terrainMesh({ x0: -80, x1: 80, z0: -80, z1: 80, step: .3, height: H, colorHeight: rawHeight, waterY: WATER_Y, seed: 5, pathWeight: pathW, grainAmplitude: rigFor(rig).terrainGrainAmplitude ?? null, natural });
  const water = waterMesh(-80, 80, -80, 80, SURFACE_Y);
  let id = 100;
  const put = (type, x, z, yaw, extra = {}, era = 2) => {
    if (extra.avoidRiver !== false && !['bridge', 'grindingStone'].includes(type) && polyDist(x, z, RIVER) < RIVER_HALF + Math.max(B[type].w, B[type].d) / 2 + 1.5) return null;
    const spec = style.carvedBuildingSpec({ worldSeed: WORLD, type, id: id++, era, habitat: 'plains', footprint: extra.footprint || { w: B[type].w, d: B[type].d }, settlementSeed: 7, prosperity: extra.prosperity ?? .5, ...extra });
    soup.add(specMesh(spec, lodTier), { x, y: extra.y ?? groundAt(x, z), z, yaw });
    return spec;
  };
  // church + palisade compound on the terrace
  put('temple', CHURCH[0] + 1, CHURCH[1] - 1, 0, { prosperity: .8 });
  const cx0 = CHURCH[0] - 12, cz0 = CHURCH[1] - 10, nx = 6, nz = 5;
  for (let i = 0; i < nx; i++) for (const [j, edge] of [[0, 'n'], [nz - 1, 's']]) {
    const x = cx0 + 2 + i * 4, z = cz0 + 2 + j * 4;
    if (i === 0 || i === nx - 1) continue;
    if (edge === 's' && (i === 2 || i === 3)) { if (i === 2) put('gate', x + 2, z, 0); continue; }
    put('palisade', x, z, 0, { wallAxis: 'x' });
  }
  for (let j = 1; j < nz - 1; j++) for (const i of [0, nx - 1]) put('palisade', cx0 + 2 + i * 4, cz0 + 2 + j * 4, 0, { wallAxis: 'z' });
  put('palisade', cx0 + 2, cz0 + 2, 0, { wallAxis: 'corner' });
  put('palisade', cx0 + 2 + (nx - 1) * 4, cz0 + 2, -Math.PI / 2, { wallAxis: 'corner' });
  put('palisade', cx0 + 2 + (nx - 1) * 4, cz0 + 2 + (nz - 1) * 4, Math.PI, { wallAxis: 'corner' });
  put('palisade', cx0 + 2, cz0 + 2 + (nz - 1) * 4, Math.PI / 2, { wallAxis: 'corner' });
  // cottages below the church (left bank)
  const houses = [[-30, -2, -.2], [-22, -6, -.35], [-14, -4, -.1], [-24, 11, -.3], [-15, 9, -.25], [-6, 13, -.45], [-32, 14, -.15], [-11, 22, -.35], [6, -6, -.5], [-2, 28, -.4], [-36, 26, -.2], [-26, 30, -.3]];
  houses.forEach(([x, z, yaw], k) => put(k % 4 === 3 ? 'hut' : 'house', x, z, yaw, { prosperity: (k * 37 % 100) / 100 }));
  put('warehouse', 10, -16, -.5, { prosperity: .6 });
  put('workshop', 9, 30, -.35);
  put('hearth', 3, 40, 0);
  put('market', 14, 44, -.3, {}, 3);
  // watermill on the left bank, wheel side towards the river
  { const m = polyAt(RIVER, .74), off = RIVER_HALF + 1.9, x = m.p[0] + m.n[0] * off, z = m.p[1] + m.n[1] * off;
    put('grindingStone', x, z, Math.atan2(m.n[1], -m.n[0]), { reviewWatermill: true, waterSide: '+x' }); }
  // bridge across the river (long axis = local z), deck meets the banks
  { const br = polyAt(RIVER, .5); put('bridge', br.p[0], br.p[1], Math.atan2(br.n[0], br.n[1]), { y: natural ? LAND_RAW - 1.05 : BRIDGE_Y }); }
  // across the river: cottages and fields
  [[30, 2, -.6], [38, -6, -.55], [42, 10, -.7], [24, -10, -.5]].forEach(([x, z, yaw], k) => put('house', x, z, yaw, { prosperity: .3 + k * .2 }));
  [[22, 34, -.35], [33, 26, -.35], [44, 21, -.35], [30, 42, -.35]].forEach(([x, z, yaw]) => put('farm', x, z, yaw));
  // trees: lollipop broadleaf clumps, a few cypress by the church
  const treeAt = (x, z, k, species = null) => {
    const inst = trees.treeInstance({ worldSeed: WORLD, id: k, habitat: 'plains', season: 'summer' }), sp = species || 'broadleaf';
    const spec = trees.treeSpec(sp, inst.variant); soup.add(specMesh(spec, lodTier), { x, z, y: H(x, z), yaw: inst.yaw, scale: inst.scale, tint: inst.tint });
  };
  let k = 0; const rnd = P.seededRandom(99);
  const clump = (cx, cz, n, rx, rz, sp) => { for (let i = 0; i < n; i++) { const x = cx + (rnd() - .5) * 2 * rx, z = cz + (rnd() - .5) * 2 * rz; if (polyDist(x, z, RIVER) < RIVER_HALF + 2 || pathW(x, z) > .2) continue; treeAt(x, z, k++, sp); } };
  for (let i = 0; i < 9; i++) treeAt(-52 + i * 5.2, -50 + Math.sin(i) * 1.5, k++);
  clump(30, -36, 16, 10, 7); clump(-54, 6, 10, 6, 14); clump(-44, 40, 7, 6, 6); clump(52, 18, 6, 5, 9); clump(-20, -40, 6, 8, 4);
  treeAt(-20, -14, k++, 'cypress'); treeAt(8, -22, k++, 'cypress'); treeAt(12, 20, k++, 'cypress');
  clump(8, 58, 5, 8, 4, 'shrub');
  return { width: 800, height: 500, background: '#e2b884',
    camera: hero ? { eye: [-12, 34, 38], target: [-4, 0, -2], fov: 36, near: 3, far: 900, dof: { fstop: .08 } } : { eye: [-7, 55, 60], target: [-1, 0, 4], fov: 38, near: 4, far: 900, dof: { fstop: .12 } },
    rig: rigFor(rig), background: natural ? '#e8c9a0' : '#e2b884', shadow: { center: [0, 0, 0], radius: 95 }, grain: grainTexture(), meshes: [terrain, water, soup.encode()], labels: [], stats: { tris: terrain.tris + soup.tris } };
}

// ------------------------------------------------------------- closeup
function closeupScene({ rig }) {
  const soup = new Soup('close'), base = new Soup('plinth'), labels = [];
  const items = [['cottage', 'house', {}, { era: 2, prosperity: .9 }], ['longhouse', 'barracks', {}, { era: 2, prosperity: .5 }], ['church', 'temple', {}, { era: 2, prosperity: .8 }], ['workshop', 'forge', {}, { era: 2, prosperity: .5 }], ['granary', 'warehouse', {}, { era: 2, prosperity: .5 }], ['watermill', 'grindingStone', { reviewWatermill: true, waterSide: '+x' }, { era: 2, prosperity: .5 }]];
  base.add(slab(46, 26, .6, palette.CARVED_TERRAIN.bands[0], .5));
  items.forEach(([fam, type, extra, col], i) => { const x = -14.5 + (i % 3) * 14.5, z = -5.5 + Math.floor(i / 3) * 12; soup.add(specMesh(familySpec(fam, type, col, extra), 0), { x, z, yaw: -.55 }); labels.push({ world: [x, 0, z + 5.2], text: fam, size: 11 }); });
  labels.push({ x: 12, y: 16, text: 'Close-up: near-LOD detail (roof courses, recessed windows, grain)', align: 'left', size: 14, weight: 700 });
  return { width: 800, height: 500, background: '#e7c493', camera: sheetCamera(0, .5, 14.2, 40), rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: 40 }, grain: grainTexture(), meshes: [base.encode(), soup.encode()], labels };
}

// ------------------------------------------------------------------- LOD
function lodScene({ rig }) {
  const soup = new Soup('lod'), base = new Soup('plinth'), labels = [];
  const rows = [['cottage', familySpec('cottage', 'house', { era: 2, prosperity: .9 })], ['church', familySpec('church', 'temple', { era: 2, prosperity: .8 })], ['granary', familySpec('granary', 'warehouse', { era: 2, prosperity: .5 })], ['palisade', familySpec('palisade', 'palisade', { era: 2, prosperity: .5 }, { wallAxis: 'x' })],
    ['broadleaf tree', trees.treeSpec('broadleaf', 1)], ['conifer tree', trees.treeSpec('conifer', 2)]];
  const tiers = ['near (<30 m)', 'mid (30–70 m)', 'far (70–120 m)', 'impostor (>120 m)'], cell = 12, rowD = 10.5, W = tiers.length * cell, D = rows.length * rowD;
  base.add(slab(W + 30, D + 8, .6, palette.CARVED_TERRAIN.bands[0], .5));
  rows.forEach(([name, spec], r) => {
    const z = -D / 2 + rowD * (r + .5); labels.push({ world: [-W / 2 - 1, 0, z], text: name, align: 'right', size: 10 });
    tiers.forEach((t, c) => {
      const x = -W / 2 + cell * (c + .5) + 4; let tris;
      if (c < 3) { const m = specMesh(spec, c); soup.add(m, { x, z, yaw: -.55 }); tris = m.triangles; }
      else if (name.includes('tree')) { const im = trees.treeImpostor(spec), card = { ...spec, parts: [{ shape: 'box', mat: im.colour, size: [im.width * .7, im.height, .01], pos: [0, 0, 0], lod: 2 }, { shape: 'box', mat: im.colour, size: [.01, im.height, im.width * .7], pos: [0, 0, 0], lod: 2 }], variantKey: spec.variantKey + '|imp' }; soup.add(specMesh(card, 2), { x, z, yaw: -.55 }); tris = 4; }
      else { soup.add(impostorMesh(spec), { x, z, yaw: -.55 }); tris = 4; }
      labels.push({ world: [x, 0, z + 4.2], text: `${tris} tris`, size: 9, bg: 'rgba(60,35,15,.55)' });
    });
  });
  tiers.forEach((t, c) => labels.push({ world: [-W / 2 + cell * (c + .5) + 4, 0, -D / 2 - 2], text: t, size: 10, bg: 'rgba(120,70,30,.75)' }));
  labels.push({ x: 12, y: 16, text: 'LOD tiers side by side (same spec; tree impostor drawn as 2 thin boxes standing in for crossed quads)', align: 'left', size: 12, weight: 700 });
  return { width: 800, height: 500, background: '#e7c493', camera: sheetCamera(-1, 1, 30, 40), rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: 50 }, grain: grainTexture(), meshes: [base.encode(), soup.encode()], labels };
}

// -------------------------------------------------------------- caravans
function caravanScene({ rig }) {
  const soup = new Soup('caravans'), base = new Soup('plinth'), labels = [];
  const cargoA = [{ kind: 'grain', amount: 30 }, { kind: 'pottery', amount: 8 }, { kind: 'cloth', amount: 6 }];
  const row1 = [['pack animal', { carrier: 'packAnimal', seed: 7, cargo: [{ kind: 'grain', amount: 30 }, { kind: 'hides', amount: 10 }] }], ['pack + escort', { carrier: 'packAnimal', seed: 8, cargo: [{ kind: 'copper', amount: 20 }], escort: true }],
    ['sled', { carrier: 'sled', seed: 3, cargo: [{ kind: 'wood', amount: 50 }, { kind: 'stone', amount: 20 }] }], ['cart', { carrier: 'cart', seed: 4, cargo: cargoA.concat([{ kind: 'iron', amount: 20 }, { kind: 'fish', amount: 30 }]) }],
    ['cart, empty', { carrier: 'cart', seed: 5, cargo: [] }], ['cart + goat (led, not drawn)', { carrier: 'cart', seed: 9, cargo: [{ kind: 'bread', amount: 40 }, { kind: 'goat', amount: 2 }] }]];
  const row2 = [['scout canoe', { carrier: 'boat', boatClass: 'scoutCanoe', seed: 1, cargo: [{ kind: 'berries', amount: 20 }] }], ['riverboat', { carrier: 'boat', boatClass: 'riverboat', seed: 2, cargo: cargoA }], ['freight punt', { carrier: 'boat', boatClass: 'freightPunt', seed: 3, cargo: [{ kind: 'stone', amount: 120 }, { kind: 'wood', amount: 60 }] }],
    ['stall', { carrier: 'stall', seed: 6, cargo: [{ kind: 'pottery', amount: 30 }, { kind: 'bread', amount: 20 }, { kind: 'cloth', amount: 20 }] }], ['stall, sparse', { carrier: 'stall', seed: 7, cargo: [{ kind: 'meat', amount: 10 }] }]];
  const rows = [row1, row2], cell = 6.2;
  base.add(slab(44, 22, .6, palette.CARVED_TERRAIN.bands[0], .5));
  rows.forEach((row, r) => row.forEach(([name, inp], c) => { const x = -cell * (row.length - 1) / 2 + c * cell - (r ? 5 : 0), z = -6 + r * 9; const spec = caravans.caravanSpec(inp); soup.add(specMesh(spec, 0), { x, z, yaw: -.6 }); labels.push({ world: [x, 0, z + 3.6], text: name, size: 10 }); }));
  // parcels and market stalls family
  ['grain', 'wood', 'pottery', 'cloth', 'fish'].forEach((kind, i) => { const spec = caravans.parcelSpec(kind, 30, i); soup.add(specMesh(spec, 0), { x: -14 + i * 2.2, z: 10.5, yaw: .3 }); });
  labels.push({ world: [-9.6, 0, 12.3], text: 'dropped parcels', size: 10 });
  soup.add(specMesh(familySpec('marketStalls', 'market', { era: 3, prosperity: .9 }), 0), { x: 15.5, z: 8.5, yaw: -.4 });
  labels.push({ world: [15.5, 0, 13.5], text: 'marketStalls family (era 3, rich)', size: 10 });
  labels.push({ x: 12, y: 16, text: 'Caravans, boats, stalls and parcels (caravanModels.ts) — loads come from the passed cargo', align: 'left', size: 13, weight: 700 });
  return { width: 800, height: 500, background: '#e7c493', camera: sheetCamera(0, 2, 13.5, 42), rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: 30 }, grain: grainTexture(), meshes: [base.encode(), soup.encode()], labels };
}

// --------------------------------------------------------------- wonders
const WONDER_FP = { ringObservatory: { w: 26, d: 26 }, cascadeGarden: { w: 22, d: 18 }, crescentHarbor: { w: 48, d: 40 }, millMarket: { w: 34, d: 28 }, canyonCistern: { w: 30, d: 30 }, assemblyCourt: { w: 32, d: 28 } };
const WONDER_SITE = { crescentHarbor: { tidalRangeM: 2, exposed: true }, millMarket: { bankHeightM: 1.1, flowDir: 1, flowSpeedMps: 2 }, canyonCistern: { bankHeightM: 1.4, flowSpeedMps: 1.6, exposed: true }, assemblyCourt: { grade: .3, exposed: true } };
function wonderScene({ rig }) {
  const soup = new Soup('wonders'), base = new Soup('plinth'), labels = [];
  const fams = Object.keys(WONDER_FP), cellW = 56, cellD = 50;
  base.add(slab(cellW * 3 + 10, cellD * 2 + 10, .6, palette.CARVED_TERRAIN.bands[0], .5));
  fams.forEach((f, i) => {
    const plan = wonders.generateWonderPlan(f, WORLD, 1, WONDER_FP[f], WONDER_SITE[f]), x = -cellW + (i % 3) * cellW, z = -cellD / 2 + Math.floor(i / 3) * cellD;
    const spec = { family: 'wonder:' + f, variantKey: `wonder|${f}|${plan.seed}`, footprint: plan.footprint, parts: plan.parts, notes: { reference: '' } };
    base.add(slab(plan.footprint.w + 2, plan.footprint.d + 2, .3, palette.CARVED_TERRAIN.bands[2], .6), { x, z, y: .3 });
    soup.add(specMesh(spec, 0), { x, z, y: .3, yaw: 0 });
    const tri = P.specTriangles(spec, 0);
    labels.push({ world: [x, 0, z + plan.footprint.d / 2 + 3], text: `${f}  ${plan.footprint.w}×${plan.footprint.d} m · ${plan.parts.length} parts · ${tri} tris`, size: 10 });
  });
  labels.push({ x: 12, y: 16, text: 'Six wonder plans (wonderPlans.ts v1), near LOD, site inputs set for review', align: 'left', size: 13, weight: 700 });
  return { width: 800, height: 500, background: '#e7c493', camera: sheetCamera(0, 3, 58, 52), rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: 110 }, grain: grainTexture(), meshes: [base.encode(), soup.encode()], labels };
}

// ------------------------------------------------------------ civic families
const civicMod = await import('../../src/scene/buildingFamiliesCivic.ts');
export const CIVIC_IDS = Object.keys(civicMod.CIVIC_FAMILIES);
/** Civic spec: base context from the style map (same seeding rules), then the civic generator. */
export function civicSpec(family, { era = 2, prosperity = .5, size = 0, culture = null, id = 11, habitat = 'plains' } = {}) {
  const fp = civicMod.CIVIC_FAMILIES[family].sizes[size];
  const v = style.carvedVariantFor({ worldSeed: WORLD, type: 'house', id, era, habitat, footprint: fp, prosperity, settlementSeed: 3 });
  const ctx = { ...v.ctx, footprint: fp, ...(culture ? { culture, tradition: undefined } : {}) };
  return civicMod.generateCivic(family, ctx, `civic|${family}|${era}|${prosperity}|${size}|${culture ? culture.key : '-'}|${v.key}`);
}
const CIVIC_COLS = [{ era: 0, prosperity: .5, label: 'E0' }, { era: 2, prosperity: .2, label: 'E2 poor' }, { era: 2, prosperity: .9, label: 'E2 rich' }, { era: 3, prosperity: .6, label: 'E3 stone' }, { era: 5, prosperity: .8, label: 'E5' }];
function civicSheet(list, title) {
  return async ({ rig }) => {
    const soup = new Soup('civic'), base = new Soup('plinths'), labels = [];
    const cell = 13.5, rowD = 16.5, blocksAcross = 2, gap = 6, blockW = CIVIC_COLS.length * cell, perCol = Math.ceil(list.length / blocksAcross);
    const totalW = blocksAcross * blockW + gap, totalD = perCol * rowD;
    base.add(slab(totalW + 14, totalD + 14, .6, palette.CARVED_TERRAIN.bands[0], .5));
    list.forEach((family, i) => {
      const bx = Math.floor(i / perCol), row = i % perCol, x0 = -totalW / 2 + bx * (blockW + gap), z = -totalD / 2 + rowD * (row + .5), fp = civicMod.CIVIC_FAMILIES[family].sizes[0];
      base.add(slab(blockW - 1, rowD - 2.2, .25, palette.CARVED_TERRAIN.bands[2], .6), { x: x0 + blockW / 2, z, y: .25 });
      labels.push({ world: [x0 + .3, .3, z + rowD / 2 - 1.1], text: `${family}  (${fp.w}×${fp.d} m)`, align: 'left', size: 10 });
      CIVIC_COLS.forEach((col, c) => soup.add(specMesh(civicSpec(family, col), 0), { x: x0 + cell * (c + .5), y: .25, z, yaw: -.5 }));
    });
    CIVIC_COLS.forEach((col, c) => { for (let bx = 0; bx < blocksAcross; bx++) labels.push({ world: [-totalW / 2 + bx * (blockW + gap) + cell * (c + .5), 0, -totalD / 2 - 2.5], text: col.label, size: 10, bg: 'rgba(120,70,30,.75)' }); });
    labels.push({ x: 12, y: 16, text: title, align: 'left', size: 14, weight: 700 });
    return { width: 800, height: 500, background: '#e7c493', camera: sheetCamera(0, 2, totalW / 2 / 1.6 * 1.02), rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: Math.max(totalW, totalD) * .62 },
      grain: grainTexture(), meshes: [base.encode(), soup.encode()], labels };
  };
}
/** Town centre: market hall, shrine, town hall, fort barracks, smithy round a paved square. */
function townCentreScene({ rig }) {
  const soup = new Soup('town'), base = new Soup('ground'), labels = [];
  base.add(slab(70, 54, .8, palette.CARVED_TERRAIN.bands[0], .45));
  base.add(slab(20, 16, .05, palette.CARVED_TERRAIN.path, .3), { x: 0, z: 2, y: .05 });
  const put = (fam, x, z, yaw, o = {}) => { const sp = civicSpec(fam, { era: 3, prosperity: .7, ...o }); soup.add(specMesh(sp, 0), { x, z, yaw }); labels.push({ world: [x, 0, z + sp.footprint.d / 2 + 1.5], text: fam, size: 10 }); };
  put('townHall', 0, -12, 0, { size: 2 }); put('marketHall', 0, 4, 0, { size: 1 }); put('shrine', -19, -6, Math.PI / 2, { size: 2 });
  put('fortBarracks', 20, -6, -Math.PI / 2, { size: 1 }); put('smithy', 15, 12, -.4);
  [[-18, 12, .3], [-26, 16, .2], [26, 16, -.2], [-27, -18, .1], [27, -19, -.1]].forEach(([x, z, yaw], k) => soup.add(specMesh(style.carvedBuildingSpec({ worldSeed: WORLD, type: 'house', id: 300 + k, era: 3, habitat: 'plains', footprint: { w: B.house.w, d: B.house.d }, prosperity: .6 }), 0), { x, z, yaw }));
  const r = P.seededRandom(5); for (let i = 0; i < 12; i++) { const x = (i % 2 ? 1 : -1) * (31 + r() * 2), z = -22 + i * 4; soup.add(specMesh(trees.treeSpec('broadleaf', i % 4), 0), { x, z, yaw: r() * 6, scale: .9 + r() * .2 }); }
  labels.push({ x: 12, y: 16, text: 'Town centre (buildingFamiliesCivic.ts, era 3, no culture): market hall, shrine, town hall, fort barracks, smithy', align: 'left', size: 12, weight: 700 });
  return { width: 800, height: 500, background: '#e7c493', camera: { eye: [-8, 40, 48], target: [0, 0, 0], fov: 40, near: 3, far: 600 }, rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: 50 }, grain: grainTexture(), meshes: [base.encode(), soup.encode()], labels };
}

export const SCENES = {
  'civic-1': civicSheet(CIVIC_IDS.slice(0, 10), 'Civic families 1/2 (buildingFamiliesCivic.ts), near LOD, no culture'),
  'civic-2': civicSheet(CIVIC_IDS.slice(10), 'Civic families 2/2 (buildingFamiliesCivic.ts), near LOD, no culture'),
  'town-centre': townCentreScene,
  'families-1': familySheet(FAMILY_TYPES.slice(0, 10), 'Building families 1/3: near LOD, columns = era / prosperity'),
  'families-2': familySheet(FAMILY_TYPES.slice(10, 20), 'Building families 2/3: near LOD, columns = era / prosperity'),
  'families-3': familySheet(FAMILY_TYPES.slice(20), 'Building families 3/3: near LOD, columns = era / prosperity'),
  village: villageScene,
  'village-mid': o => villageScene({ ...o, lodTier: 1 }),
  'village-hero': o => villageScene({ ...o, hero: true }),
  'village-carved': o => villageScene({ ...o, terrain: 'carved', rig: o.rig === 'golden' ? 'tuned' : o.rig }),
  closeup: closeupScene,
  lod: lodScene,
  caravans: caravanScene,
  wonders: wonderScene,
  'civ-lineup': civLineupScene,
  'placement-slope': slopeScene(),
  'slope-tiers': slopeTiersScene(),
  'terrace-farm': terraceFarmScene(),
  'slope-nuance': slopeNuanceScene(),
  'hill-farming-default': hillFarmingDefaultScene(),
  'hill-farming-terraced': hillFarmingTerracedScene(),
  'placement-villages': villagesScene(),
  'hut-sheet': hutSheetScene(),
  'hut-sheet-a': hutSheetScene({ civs: ['sandrill','nilemark','tigrane','hanrei','vedara','aureline','sahelan'] }),
  'hut-sheet-b': hutSheetScene({ civs: ['quillan','kaaltun','mekhari','brythen','rusvolt','steppan','skoldar'] }),
  'hut-variety-mid-a': hutVarietyScene({ civs: ['sandrill','nilemark','tigrane','hanrei','vedara','aureline','sahelan'] }),
  'hut-variety-mid-b': hutVarietyScene({ civs: ['quillan','kaaltun','mekhari','brythen','rusvolt','steppan','skoldar'] }),
  'hut-variety-close-1': hutVarietyScene({ close: true, civs: ['sandrill','nilemark'] }),
  'hut-variety-close-2': hutVarietyScene({ close: true, civs: ['tigrane','hanrei'] }),
  'hut-variety-close-3': hutVarietyScene({ close: true, civs: ['vedara','aureline'] }),
  'hut-variety-close-4': hutVarietyScene({ close: true, civs: ['sahelan','quillan'] }),
  'hut-variety-close-5': hutVarietyScene({ close: true, civs: ['kaaltun','mekhari'] }),
  'hut-variety-close-6': hutVarietyScene({ close: true, civs: ['brythen','rusvolt'] }),
  'hut-variety-close-7': hutVarietyScene({ close: true, civs: ['steppan','skoldar'] }),
  'house-variety-mid-a': hutVarietyScene({ type: 'house', era: 3, per: 4, civs: ['sandrill','nilemark','tigrane','hanrei','vedara','aureline','sahelan'] }),
  'house-variety-mid-b': hutVarietyScene({ type: 'house', era: 3, per: 4, civs: ['quillan','kaaltun','mekhari','brythen','rusvolt','steppan','skoldar'] }),
  'civ-bldgs': civBuildingsScene(),
  'civ-bldgs-b': civBuildingsScene(['sandrill', 'tigrane']),
  'civ-bldgs-c': civBuildingsScene(['nilemark', 'hanrei', 'aureline']),
  'civ-bldgs-m': civBuildingsScene(['tigrane', 'hanrei', 'aureline'], true),
  'civ-bldgs-w': civBuildingsScene(['nilemark', 'tigrane', 'mekhari'], 'worn'),
  'civ-bldgs-d': civBuildingsScene(['skoldar', 'quillan', 'sandrill']),
  'civ-bldgs-h': civBuildingsScene(['steppan', 'brythen', 'tigrane'], false, true),
  'civ-bldgs-h2': civBuildingsScene(['sahelan', 'mekhari', 'sandrill'], false, true),
  'civ-bldgs-k': civBuildingsScene(['kaaltun', 'tigrane']),
  ...Object.fromEntries(CIVS.map(c => ['civ-' + c.id, civScene(c)])),
};
