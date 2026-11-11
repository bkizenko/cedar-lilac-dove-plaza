// Civ lineup: the SAME small village layout per culture (cultureGrammar.ts),
// with that culture's architectural habit (material, climate, tradition bias,
// roofTone), palette, flag grammar, pottery profile and owned-gear units
// (unitAppearance.ts). Grammar data is generator output; how a grammar token is
// drawn here (flag cells, lathe pots, body stand-in, roof/ground tinting) is
// this preview's interpretation and is listed in the handoff note.
import { Soup, specMesh, slab, terrainMesh, grainTexture, style, families, trees, caravans, palette, terrace, parts as P, MAT, constants } from './scene-lib.mjs';
import { rigFor } from './rigs.mjs';
const S = '../../src/scene/';
const culture = await import(S + 'cultureGrammar.ts');
const units = await import(S + 'unitAppearance.ts');
const civic = await import(S + 'buildingFamiliesCivic.ts');
const B = constants.BUILDINGS, WORLD = 1207;

export const CIVS = [
  { id: 'desert-canyon', title: 'Desert canyon', input: { seed: 101, climate: 'arid', material: 'mudbrick', craft: 'pottery', coastal: false }, habitat: 'desert', season: 'summer' },
  { id: 'river-delta', title: 'River delta', input: { seed: 202, climate: 'wet', material: 'wattle', craft: 'basketry', coastal: false }, habitat: 'wetland', season: 'summer' },
  { id: 'temperate-forest', title: 'Temperate forest', input: { seed: 303, climate: 'temperate', material: 'timber', craft: 'carving', coastal: false }, habitat: 'forest', season: 'summer' },
  { id: 'steppe-highland', title: 'Steppe / highland', input: { seed: 404, climate: 'cold', material: 'stone', craft: 'weaving', coastal: false }, habitat: 'hills', season: 'autumn' },
  { id: 'coastal-island', title: 'Coastal / island', input: { seed: 505, climate: 'temperate', material: 'stone', craft: 'boatwork', coastal: true }, habitat: 'plains', season: 'summer' },
  { id: 'cold-north', title: 'Cold north', input: { seed: 606, climate: 'cold', material: 'timber', craft: 'metal', coastal: false }, habitat: 'tundra', season: 'winter' },
];

const hexRgb = palette.hexToRgb, mixRgb = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ROOF = new Set([MAT.thatch, MAT.shingle, MAT.tile]);
/** Copy of a mesh with roof-material vertices pulled toward the culture's roofTone. */
function roofToned(m, roofHex, t = .45) {
  const c = new Float32Array(m.colors), rt = hexRgb(roofHex);
  for (let i = 0; i < m.mats.length; i++) if (ROOF.has(m.mats[i])) { const o = mixRgb([c[i * 3], c[i * 3 + 1], c[i * 3 + 2]], rt, t); c[i * 3] = o[0]; c[i * 3 + 1] = o[1]; c[i * 3 + 2] = o[2]; }
  return { ...m, colors: c };
}
function cultureSpec(civ, cul, family, type, id, extra = {}, prosperity = .6) {
  const fp = extra.footprint || { w: B[type].w, d: B[type].d };
  const v = style.carvedVariantFor({ worldSeed: WORLD, type, id, era: 2, habitat: civ.habitat, footprint: fp, prosperity, ...extra });
  const ctx = { ...v.ctx, material: cul.architecture.material, climate: cul.architecture.climate, tradition: cul.architecture.tradition };
  return families.generateFamily(family || v.family, ctx, v.key + '|culture:' + cul.key);
}
/** Recolour a part-built mesh per part (keeps the generator's baked AO ratio). */
function recolorByParts(spec, m, colorOf) {
  const out = { ...m, colors: new Float32Array(m.colors) }; let v = 0;
  for (const p of P.partsAtLod(spec, 0)) { const n = P.partTriangles(p) * 3, hex = colorOf(p); if (hex) { const base = hexRgb(palette.CARVED_MATERIALS[p.mat].hex), c = hexRgb(hex); for (let k = 0; k < n; k++, v++) for (let j = 0; j < 3; j++) out.colors[v * 3 + j] = Math.min(1, c[j] * (m.colors[v * 3 + j] / Math.max(1e-3, base[j]))); } else v += n; }
  return out;
}
/** Flag grammar drawn as a 10x6 cell banner on a pole (division, charge, border). */
function flagMesh(flag, h = 5.2) {
  const parts = [P.part('cylinder', 'woodDark', [.14, h, .1], [0, 0, 0], 2, undefined, 6)], cols = [null];
  const W = 10, H = 6, cw = .16, ch = .16, x0 = .07, y0 = h - H * ch - .05, f = flag.fields, F = i => f[Math.min(i, f.length - 1)];
  for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) {
    const u = (i + .5) / W, v = (j + .5) / H; let c = F(0);
    switch (flag.division) {
      case 'vertical': c = u < .5 ? F(0) : F(1); break; case 'horizontal': c = v > .5 ? F(0) : F(1); break;
      case 'triband-v': c = F(Math.floor(u * 3)); break; case 'triband-h': c = F(2 - Math.floor(v * 3)); break;
      case 'quarters': c = (u < .5) === (v > .5) ? F(0) : F(1); break; case 'diagonal': c = u > v ? F(0) : F(1); break;
      case 'chevron': c = u < .45 - Math.abs(v - .5) * .9 ? F(1) : F(0); break; case 'saltire': c = Math.abs(u - v) < .14 || Math.abs(u - (1 - v)) < .14 ? F(1) : F(0); break;
      case 'canton': c = u < .45 && v > .5 ? F(1) : F(0); break; case 'pall': c = Math.abs(v - .5) < .12 && u > .35 || Math.abs(v - u) < .12 && u < .4 || Math.abs((1 - v) - u) < .12 && u < .4 ? F(1) : (v > .5 ? F(0) : F(2)); break;
      case 'checker': c = (i + j) % 2 ? F(0) : F(1); break;
    }
    if (flag.border !== 'none' && (i === 0 || j === 0 || i === W - 1 || j === H - 1)) c = flag.borderColor;
    const cx = flag.placement === 'hoist' ? 1 : flag.placement === 'canton' ? 2 : W / 2 - .5, cy = flag.placement === 'canton' ? H - 2 : H / 2 - .5;
    if (flag.charge !== 'none' && (flag.placement === 'repeat' ? (i % 3 === 1 && j % 3 === 1) : Math.abs(i - cx) <= .6 && Math.abs(j - cy) <= .6)) c = flag.chargeColor;
    parts.push(P.part('box', 'cloth', [cw, ch, .03], [x0 + cw * (i + .5), y0 + ch * j, 0], 2)); cols.push(c);
  }
  const spec = { family: 'flag', variantKey: 'flag|' + flag.key, footprint: { w: 2, d: 2 }, parts, notes: { reference: '' } };
  let k = 0; return recolorByParts(spec, { ...specMesh(spec, 0) }, () => cols[k++]);
}
/** Lathe pot from the pottery profile ([r,h] in [0,1], base to rim). */
function potMesh(pot, height = .55, rmax = .24, seg = 14) {
  const prof = pot.profile, p = [], n = [], c = [], g = [], u = [], m = [], body = hexRgb(pot.body), paint = hexRgb(pot.paint);
  const ring = (r, y, a) => [Math.cos(a) * r * rmax, y * height, Math.sin(a) * r * rmax];
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, y0] = prof[i], [r1, y1] = prof[i + 1], band = pot.decoration !== 'none' && (y0 + y1) / 2 > .45 && (y0 + y1) / 2 < .75;
    for (let s = 0; s < seg; s++) {
      const a0 = s / seg * Math.PI * 2, a1 = (s + 1) / seg * Math.PI * 2, A = ring(r0, y0, a0), Bv = ring(r0, y0, a1), C = ring(r1, y1, a1), D = ring(r1, y1, a0);
      const col = band && s % 2 === 0 ? paint : body, nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2), dr = (r1 - r0) * rmax, dy = (y1 - y0) * height, l = Math.hypot(dr, dy) || 1, ny = -dr / l, nr = dy / l;
      for (const q of [A, D, C, A, C, Bv]) { p.push(...q); n.push(nx * nr, ny, nz * nr); c.push(...col); g.push(0); u.push(0, 0); m.push(MAT.stone); }
    }
  }
  return { positions: new Float32Array(p), normals: new Float32Array(n), colors: new Float32Array(c), grain: new Float32Array(g), uvs: new Float32Array(u), mats: new Uint8Array(m), triangles: p.length / 9 };
}
/** Unit: generator gear parts (owned garment/armor/weapon) on a plain body stand-in for meshes.ts. */
function unitMesh(cul, civ, type, seed) {
  const season = civ.season, garment = cul.dress[season].garment;
  const gear = { garment: { item: garment, condition: .85 }, ...(type === 'spearman' ? { armor: { kind: 'paddedTorso', condition: .7 } } : {}) };
  const app = units.unitAppearance({ type, seed, gear, culture: cul, season, era: 2 });
  const body = [P.part('cylinder', 'woodLight', [.28, .9, .3], [0, 0, 0], 2, undefined, 8), P.part('sphere', 'woodLight', [.24, .26, .24], [0, .92, 0], 2)];
  const spec = { family: 'unit', variantKey: 'unit|' + app.geometryKey + '|' + civ.id, footprint: { w: 1, d: 1 }, parts: [...body, ...app.parts], notes: { reference: '' } };
  const nb = body.length; let k = 0;
  const mm = recolorByParts(spec, specMesh(spec, 0), () => { const i = k++; return i < nb ? '#c79a6a' : app.slotColors[app.parts[i - nb].slot]; });
  return { mesh: mm, app };
}

const habitatTrees = { desert: ['cypress', 'shrub'], wetland: ['broadleaf', 'shrub'], forest: ['broadleaf', 'conifer'], hills: ['conifer', 'shrub'], plains: ['broadleaf', 'cypress'], tundra: ['conifer', 'conifer'] };
/** Build one civ village into soups at an offset. Returns label anchors. */
export function buildCivVillage(civ, soup, ox = 0, oz = 0) {
  const cul = culture.generateCulture(civ.input), A = cul.architecture, rt = A.roofTone;
  const add = (m, x, z, yaw = 0, o = {}) => soup.add(m, { x: ox + x, z: oz + z, y: o.y ?? 0, yaw, ...o });
  const bld = (fam, type, id, x, z, yaw, extra = {}, pr = .6) => add(roofToned(specMesh(cultureSpec(civ, cul, fam, type, id, extra, pr), 0), rt), x, z, yaw);
  // civic buildings take the culture as their default path (applyCulture + dress)
  const civ_ = (fam, size, id, x, z, yaw) => { const fp = civic.CIVIC_FAMILIES[fam].sizes[size], v = style.carvedVariantFor({ worldSeed: WORLD, type: 'house', id, era: 2, habitat: civ.habitat, footprint: fp, prosperity: .7 });
    add(specMesh(civic.generateCivic(fam, { ...v.ctx, footprint: fp, culture: cul, tradition: undefined }, `civic|${fam}|${size}|${cul.key}|${id}`), 0), x, z, yaw); };
  // same layout for every civ
  civ_('townHall', 1, 1, -1, -8, 0);
  civ_('shrine', 1, 8, 16, -8.5, -Math.PI / 2);
  bld('cottage', 'house', 2, -11, -3, .25, {}, .3); bld('cottage', 'house', 3, 9, -3.5, -.25, {}, .6); bld('cottage', 'house', 4, -12, 6, .1, {}, .9); bld('cottage', 'house', 5, 11, 5.5, -.15, {}, .5);
  civ_('marketHall', 0, 6, 5, 13, -.1); civ_('smithy', 0, 7, -7, 13, .05);
  for (let i = 0; i < 4; i++) bld('palisade', 'palisade', 20 + i, -14 + i * 4, -14, 0, { wallAxis: 'x' });
  bld('gate', 'gate', 30, 2, -14, 0); for (let i = 0; i < 3; i++) bld('palisade', 'palisade', 24 + i, 6 + i * 4, -14, 0, { wallAxis: 'x' });
  // market: stall with pottery, culture pots beside it, flag in the square
  const stall = caravans.caravanSpec({ carrier: 'stall', seed: civ.input.seed, cargo: [{ kind: 'pottery', amount: 40 }, { kind: civ.habitat === 'desert' ? 'grain' : 'cloth', amount: 20 }] });
  add(specMesh(stall, 0), 4.5, 1.8, -.35);
  const pot = potMesh(cul.pottery); [[6.6, 3.2], [7.1, 2.5], [6.2, 2.4], [7.4, 3.5]].forEach(([x, z], i) => add(pot, x, z, i, { scale: .8 + (i % 2) * .25 }));
  add(flagMesh(cul.flag), -2.2, 1.5, -.5);
  // units: worker, spearman (owned padded torso), archer, leader
  const people = [['worker', -5.2, 3.6, .4], ['spearman', -3.6, 4.4, .2], ['archer', -1.8, 4.2, -.3], ['leader', -0.2, 3.2, -.6]];
  const apps = people.map(([t, x, z, yaw], i) => { const u = unitMesh(cul, civ, t, civ.input.seed * 10 + i); add(u.mesh, x, z, yaw, { scale: u.app.fit.scale[0], sy: u.app.fit.scale[1] * 1.0 }); return [t, u.app]; });
  // trees by habitat
  const sp = habitatTrees[civ.habitat], r = P.seededRandom(civ.input.seed);
  for (let i = 0; i < 9; i++) { const side = i % 2 ? 1 : -1, x = side * (19.5 + r() * 2.5), z = -12 + i * 3 + r() * 2, s = trees.treeSpec(sp[i % 2], i % 4); add(specMesh(s, 0), x, z, r() * 6, { scale: .85 + r() * .3 }); }
  return { cul, apps };
}

function groundSoup(civ, cul, w, d, ox, oz) {
  const g = new Soup('ground'), band = hexRgb(palette.CARVED_TERRAIN.bands[0]), gr = hexRgb(cul.palette.ground), m = slab(w, d, .8, palette.CARVED_TERRAIN.bands[0], .45);
  const t = mixRgb(band, gr, .3); for (let i = 0; i < m.colors.length; i += 3) { m.colors[i] = t[0]; m.colors[i + 1] = t[1]; m.colors[i + 2] = t[2]; }
  g.add(m, { x: ox, z: oz }); const sq = slab(9, 7, .05, palette.CARVED_TERRAIN.path, .3); g.add(sq, { x: ox + 1, z: oz + 2.5, y: .05 });
  return g;
}

export function civScene(civ) {
  return ({ rig }) => {
    const soup = new Soup('civ'), { cul, apps } = buildCivVillage(civ, soup), ground = groundSoup(civ, cul, 46, 36, 0, 0);
    const p = cul.palette, labels = [
      { x: 12, y: 16, text: `${civ.title} — culture seed ${civ.input.seed}`, align: 'left', size: 14, weight: 700 },
      { x: 12, y: 36, text: `${cul.climate} · ${cul.material} · craft ${cul.craft}${cul.coastal ? ' · coastal' : ''} · motifs ${cul.motifs.join(', ')} · ${civ.season}`, align: 'left', size: 10 },
      { x: 12, y: 54, text: `tradition pitch ${cul.architecture.tradition.pitchBiasDeg}° · annex ${cul.architecture.tradition.annexBias} · proportion ${cul.architecture.tradition.proportion} · porch ${cul.architecture.tradition.porchBias} · ${cul.architecture.courtyard ? 'courtyard' : 'no courtyard'}${cul.architecture.stilts ? ' · stilts (not drawn)' : ''}`, align: 'left', size: 10 },
      { x: 12, y: 72, text: `flag ${cul.flag.division}/${cul.flag.charge}/${cul.flag.placement} · pottery ${cul.pottery.form} ${cul.pottery.firing} ${cul.pottery.decoration}`, align: 'left', size: 10 },
      ...['ground', 'field', 'accent', 'trim', 'shadow'].map((k, i) => ({ x: 545 + i * 38, y: 16, text: k, size: 8, bg: p[k], color: palette.luminance(p[k]) > .45 ? '#1e1a17' : '#f4ecd8' })),
      { x: 545 + 5 * 38, y: 16, text: 'roof', size: 8, bg: cul.architecture.roofTone, color: palette.luminance(cul.architecture.roofTone) > .45 ? '#1e1a17' : '#f4ecd8' },
      { x: 12, y: 488, text: 'units: ' + apps.map(([t, a]) => `${t}=${[a.rendered.garment, a.rendered.cut, a.rendered.headwear, a.rendered.armor, a.rendered.weapon].filter(Boolean).join('/')}`).join(' · '), align: 'left', size: 9, bg: 'rgba(40,24,10,.6)' },
    ];
    return { width: 800, height: 500, background: '#e7c493', camera: { eye: [-5, 25, 29], target: [0, 0, 1], fov: 40, near: 2, far: 400 },
      rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: 30 }, grain: grainTexture(), meshes: [ground.encode(), soup.encode()], labels };
  };
}

export function civLineupScene({ rig }) {
  const soup = new Soup('civs'), gsoup = new Soup('ground'), labels = [], cw = 50, cd = 40;
  CIVS.forEach((civ, i) => {
    const ox = -cw + (i % 3) * cw, oz = -cd / 2 + Math.floor(i / 3) * cd, { cul } = buildCivVillage(civ, soup, ox, oz), g = groundSoup(civ, cul, 46, 36, ox, oz);
    gsoup.p.push(...g.p); gsoup.n.push(...g.n); gsoup.c.push(...g.c); gsoup.g.push(...g.g); gsoup.u.push(...g.u); gsoup.m.push(...g.m); gsoup.tris += g.tris;
    labels.push({ world: [ox, 0, oz + 19.5], text: `${civ.title} · ${cul.climate}/${cul.material}/${cul.craft}`, size: 10 });
  });
  labels.push({ x: 12, y: 16, text: 'Civ lineup: same layout, six cultures (cultureGrammar.ts + unitAppearance.ts, owned gear only)', align: 'left', size: 13, weight: 700 });
  return { width: 800, height: 500, background: '#e7c493', camera: { ortho: 47, eye: [0, 300 * Math.sin(.85), 300 * Math.cos(.85) + 1], target: [0, 0, 1], near: 10, far: 900 },
    rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: 90 }, grain: grainTexture(), meshes: [gsoup.encode(), soup.encode()], labels };
}
