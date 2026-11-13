// Slope ladder: the same hut on 2/5/10/15/22/35 degrees (plus 35 degrees in soft rock): top row = the placement preview colour for the tier,
// bottom row = the built result with the foundation the graded slope model chose. Built from the REAL generators and the REAL
// assessSite / foundationBoxes (src/game/slopeTiers.ts, siteFoundation.ts); the terrain is a plane per column, no terrain edits.
import { Soup, slab, terrainMesh, grainTexture } from './scene-lib.mjs';
import { rigFor } from './rigs.mjs';
import { paint } from './placement-demo.mjs';
const sm = await import('../../src/scene/buildingStyleMap.ts'), cs = await import('../../src/scene/civSkin.ts'), vi = await import('../../src/scene/villageIdentity.ts');
const st = await import('../../src/game/slopeTiers.ts'), sf = await import('../../src/game/siteFoundation.ts');
const TINT = { level: [.55, 1.1, .6], moderate: [1.2, .98, .42], steep: [1.22, .72, .4], severe: [1.15, .45, .4] };
const STONE = '#a89c86', TIMBER = '#7a5a3a', COLS = [[2], [5], [10], [15], [22], [35], [35, 'sand']];
const SAND = { rockName: 'sandstone', hardness: .7, soilDepthMeters: .2, landformTag: 'none' };
export const slopeTiersScene = () => async ({ rig }) => {
  const W = 5.4, D = 5.2, CW = 13.6, ZP = -9, ZB = 9, meshes = [], labels = [], ghosts = new Soup('g'), built = new Soup('b');
  const hut = () => paint(sm.variantSpec(sm.carvedVariantFor({ worldSeed: 4, type: 'hut', id: 5, era: 1, footprint: { w: W, d: D }, settlementSeed: 0, skin: cs.presetSkin('aureline'), heraldry: vi.villageHeraldry(4, 0) })));
  COLS.forEach(([deg, geo], i) => {
    const cx = (i - (COLS.length - 1) / 2) * CW, g = Math.tan(deg * Math.PI / 180), H = (x) => g * (x - cx), ground = geo ? SAND : null;
    meshes.push(terrainMesh({ x0: cx - CW / 2 + 1, x1: cx + CW / 2 - 1, z0: -16, z1: 16, step: .5, height: (x) => H(x), colorHeight: () => 0, waterY: -99, seed: 3 + i, natural: true, name: 'terrain' + i }));
    const a = st.assessSite(H, 'hut', cx, 0, W, D, { ground, baseWork: 8 }), tint = TINT[a.tier];
    const top = H(cx + W / 2), level = a.foundation === 'dugout' ? H(cx - W / 2) + .03 : top + .03;
    for (const [row, z, ghost] of [['preview', ZP, true], ['built', ZB, false]]) {
      if (!a.ok && !ghost) { labels.push({ world: [cx - 3.2, H(cx) + .5, z], text: 'refused: nothing is built', align: 'left', size: 11 }); continue; }
      const soup = ghost ? ghosts : built, lvl = a.ok ? level : top + .03;
      soup.add(hut(), { x: cx, y: lvl, z, yaw: 0, tint: ghost ? tint : null });
      for (const b of sf.foundationBoxes(a.ok ? a.foundation : 'none', { x: cx, z, w: W, d: D }, { height: H, level: lvl, downhill: a.downhill, fall: a.fall, burial: .18 })) {
        const col = b.kind === 'post' || b.kind === 'beam' ? TIMBER : STONE;
        soup.add(slab(b.length, b.width, b.height, col, .5), { x: b.x, y: b.y + b.height / 2, z: b.z, yaw: b.yaw, tint: ghost ? tint : null });
      }
    }
    const goods = [a.extraWood ? `+${a.extraWood} wood` : '', a.extraStone ? `+${a.extraStone} stone` : '', a.workPct ? `+${a.workPct}% labour` : ''].filter(Boolean).join('  ');
    const lx = cx - 6, ly = 5.5;
    labels.push({ world: [lx, ly + 2.6, ZP - 5], text: `${deg}°${geo ? ' soft rock' : ''}  ${a.label}`, align: 'left', size: 12 });
    labels.push({ world: [lx, ly + 1.6, ZP - 5], text: a.ok ? st.foundationText(a.foundation) : 'Too steep for a home', align: 'left', size: 9 });
    labels.push({ world: [lx, ly + .8, ZP - 5], text: goods, align: 'left', size: 9 });
  });
  const p = 40 * Math.PI / 180, half = COLS.length * CW / 2;
  return { width: 1800, height: 900, background: '#e7c493', camera: { ortho: 25.5, eye: [0, Math.sin(p) * 220 + 3, 160 + Math.cos(p) * 220], target: [0, 2, 0], near: 5, far: 900 },
    rig: { ...rigFor(rig), fogNearMetres: 1e4, fogFarMetres: 2e4 }, shadow: { center: [0, 0, 0], radius: half }, grain: grainTexture(), meshes: [...meshes, ghosts.encode(), built.encode()], labels };
};
