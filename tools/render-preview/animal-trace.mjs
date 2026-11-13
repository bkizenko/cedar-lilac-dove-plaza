// Behaviour trace images from the REAL simulation: top-down paths over a simulated day (herd), a wolf chase, and a drinking pattern.
//   NODE_PATH=/opt/npm-tools/node_modules node --import ./scripts/game-loader.mjs tools/render-preview/animal-trace.mjs [--out=DIR]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Game } from '../../src/game/sim.ts';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const need = (n) => { for (const b of [root, process.env.NODE_PATH, '/opt/npm-tools']) { try { return createRequire(path.join(b, 'x.js'))(n); } catch { /* next */ } } throw new Error(n); };
const sharp = need('sharp');
const outDir = path.resolve((process.argv.find(a => a.startsWith('--out=')) || '--out=' + path.join(root, 'docs/renders/animals')).slice(6));
fs.mkdirSync(outDir, { recursive: true });
const STATE_COL = { graze: '#4c8a3a', walk: '#2f6fb5', rest: '#8a6bb5', sleep: '#5a4a8a', ruminate: '#a58bd0', drink: '#1ec0d6', wallow: '#7a5a2a', groom: '#b59a5a', alert: '#e0b020', flee: '#d6302a', rut: '#d66aa0', nurse: '#f0a0c0', stalk: '#e07a20', chase: '#c01010', feed: '#6a1a1a' };
function world(seed) { const g = new Game(); g.reset(seed); g.enterIsland(); g.state.weather = 'clear'; g.state.weatherT = 1e9; g.state.units = []; g.state.autoWorkEnabled = false; g.tickWildlife(.01); return g; }
function nearLod(g, c) { const u = g.spawnUnit('worker', c.x + 30, c.z, 0); u.shelterId = -1; return u; }
function terrainSvg(g, cx, cz, half, px) {
  const n = 80, cell = half * 2 / n, s = px / (half * 2); let out = '';
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = cx - half + (i + .5) * cell, z = cz - half + (j + .5) * cell, h = g.height(x, z), w = g.waterAt(x, z);
    const col = h < w + .1 ? '#5aa1b4' : h < w + .6 ? '#d8cf9a' : `hsl(${92 - Math.min(30, h * 1.2)},${34}%,${Math.max(30, Math.min(58, 38 + h * 1.4))}%)`;
    out += `<rect x="${(i * cell) * s}" y="${(j * cell) * s}" width="${cell * s + .6}" height="${cell * s + .6}" fill="${col}"/>`;
  }
  return out;
}
function svgOf(g, cx, cz, half, px, layers, legend, title) {
  const s = px / (half * 2), X = x => (x - (cx - half)) * s, Z = z => (z - (cz - half)) * s;
  let body = terrainSvg(g, cx, cz, half, px);
  for (const L of layers) body += L(X, Z);
  const leg = legend.map(([k, c], i) => `<rect x="${12 + i * 118}" y="${px + 8}" width="14" height="14" fill="${c}"/><text x="${30 + i * 118}" y="${px + 20}" font-size="13" fill="#f2e8d0" font-family="sans-serif">${k}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px + 34}"><rect width="100%" height="100%" fill="#1b1b1b"/>${body}<text x="12" y="22" font-size="18" font-weight="700" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke" font-family="sans-serif">${title}</text>${leg}</svg>`;
}
const write = async (name, svg) => { await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, name + '.png')); console.log(name); };
const path_ = (pts, X, Z, col, w = 1.6, op = .9) => `<polyline fill="none" stroke="${col}" stroke-width="${w}" stroke-opacity="${op}" stroke-linejoin="round" points="${pts.map(p => X(p[0]).toFixed(1) + ',' + Z(p[1]).toFixed(1)).join(' ')}"/>`;

// A: a deer herd over a day, segments coloured by behaviour state
{
  const g = world(5), leader = g.state.wildlife.filter(c => c.species === 'deer')[0];
  const herd = g.state.wildlife.filter(c => c.beh.grp === leader.beh.grp && c.hp > 0), keep = new Set(herd.map(c => c.id));
  g.state.wildlife = g.state.wildlife.filter(c => keep.has(c.id)); nearLod(g, leader);
  const tr = new Map(herd.map(c => [c.id, []])); const T = 1350, dt = .25;
  for (let t = 0; t < T; t += dt) { g.state.time += dt; g.tickWildlife(dt); if (Math.round(t / dt) % 4 === 0) for (const c of herd) tr.get(c.id).push([c.x, c.z, c.beh.st, g.dayPhase() * 24]); }
  let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; for (const a of tr.values()) for (const p of a) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[1]); maxz = Math.max(maxz, p[1]); }
  const cx = (minx + maxx) / 2, cz = (minz + maxz) / 2, half = Math.max(30, Math.max(maxx - minx, maxz - minz) / 2 + 12);
  const layer = (X, Z) => { let o = ''; for (const a of tr.values()) { for (let i = 1; i < a.length; i++) o += path_([a[i - 1], a[i]], X, Z, STATE_COL[a[i][2]] || '#fff', 2.2, .9); o += `<circle cx="${X(a[0][0])}" cy="${Z(a[0][1])}" r="4" fill="#fff" stroke="#000"/><circle cx="${X(a.at(-1)[0])}" cy="${Z(a.at(-1)[1])}" r="4" fill="#000" stroke="#fff"/>`; } return o; };
  await write('trace-herd-day', svgOf(g, cx, cz, half, 1100, [layer], ['graze', 'walk', 'rest', 'ruminate', 'sleep', 'drink', 'alert', 'groom', 'wallow'].map(k => [k, STATE_COL[k]]), `Deer herd (${herd.length}) over one simulated day (${Math.round(2 * half)} m view): path colour = behaviour state; white = start, black = end`));
}
// B: wolf pack chasing a goat herd member
{
  const g = world(21), wolves = g.state.wildlife.filter(c => c.species === 'wolf').slice(0, 3);
  const dry = (x0, z0, x1, z1) => { for (let i = 0; i <= 40; i++) { const x = x0 + (x1 - x0) * i / 40, z = z0 + (z1 - z0) * i / 40; if (!g.walkable(x, z) || g.height(x, z) < g.waterAt(x, z) + .6) return false; } return true; };
  const goats = g.state.wildlife.filter(c => c.species === 'goat'), anchor = goats.find(c => dry(c.x - 60, c.z, c.x + 60, c.z)) || goats[0];
  const prey = goats.filter(c => c.beh.grp === anchor.beh.grp).slice(0, 3); if (!prey.includes(anchor)) prey.unshift(anchor);
  const herdId = prey[0].id; prey.forEach(p => p.beh.grp = herdId); g.state.wildlife = [...wolves, ...prey]; nearLod(g, prey[0]);
  prey.forEach((p, i) => { if (p !== prey[0]) { p.x = prey[0].x + i * 2; p.z = prey[0].z + (i % 2) * 2; } p.beh.grp = prey[0].id; delete p.beh.lead; }); prey[0].beh.lead = 1;
  wolves.forEach((w, i) => { w.x = prey[0].x - 30; w.z = prey[0].z + (i - 1) * 2.5; w.beh.hunger = .9; w.beh.grp = wolves[0].id; if (i) delete w.beh.lead; w.beh.st = 'walk'; w.beh.until = 0; });
  const tr = new Map(g.state.wildlife.map(c => [c.id, []])); let killT = -1;
  for (let t = 0; t < 140; t += 1 / 15) { g.state.time += 1 / 15; g.tickWildlife(1 / 15); for (const c of g.state.wildlife) tr.get(c.id).push([c.x, c.z, c.beh.st]); if (killT < 0 && prey.some(p => p.hp <= 0)) killT = t; }
  let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; for (const a of tr.values()) for (const p of a) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[1]); maxz = Math.max(maxz, p[1]); }
  const cx = (minx + maxx) / 2, cz = (minz + maxz) / 2, half = Math.max(24, Math.max(maxx - minx, maxz - minz) / 2 + 10);
  const layer = (X, Z) => { let o = ''; for (const [id, a] of tr) { const wolf = wolves.some(w => w.id === id); for (let i = 1; i < a.length; i++) o += path_([a[i - 1], a[i]], X, Z, wolf ? (STATE_COL[a[i][2]] || '#222') : (a[i][2] === 'flee' ? '#ff5a3a' : '#f5f5f0'), wolf ? 2.6 : 2, .95); const e = a.at(-1); o += `<circle cx="${X(e[0])}" cy="${Z(e[1])}" r="5" fill="${wolf ? '#222' : '#fff'}" stroke="${wolf ? '#fff' : '#000'}"/>`; } return o; };
  await write('trace-predator-chase', svgOf(g, cx, cz, half, 1100, [layer], [['wolf stalk', STATE_COL.stalk], ['wolf chase', STATE_COL.chase], ['wolf feed', STATE_COL.feed], ['prey flee', '#ff5a3a'], ['prey calm', '#f5f5f0']], `Wolf pack (3) vs goat herd: stalk, chase, stamina, ${killT >= 0 ? 'kill at ' + killT.toFixed(0) + ' s then feeding' : 'no kill in 140 s'}`));
}
// C: drinking pattern: where each animal stood while in the drink state over two days, on the shoreline
{
  const g = world(5), deer = g.state.wildlife.filter(c => ['deer', 'boar', 'goat'].includes(c.species));
  g.state.wildlife = deer; nearLod(g, deer[0]); const pts = []; const dt = .5;
  for (let t = 0; t < 2700; t += dt) { g.state.time += dt; g.tickWildlife(dt); if (Math.round(t / dt) % 4 === 0) for (const c of deer) if (c.beh.st === 'drink' || c.beh.st === 'wallow') pts.push([c.x, c.z, c.species, c.beh.st]); }
  const sp = { deer: '#f0e060', boar: '#e08060', goat: '#f0f0f0' };
  let cx = 0, cz = 0; if (pts.length) { cx = pts.reduce((a, p) => a + p[0], 0) / pts.length; cz = pts.reduce((a, p) => a + p[1], 0) / pts.length; } else { cx = deer[0].x; cz = deer[0].z; }
  const layer = (X, Z) => pts.map(p => `<circle cx="${X(p[0])}" cy="${Z(p[1])}" r="${p[3] === 'wallow' ? 5 : 3.2}" fill="${sp[p[2]]}" fill-opacity=".75" stroke="#000" stroke-width=".6"/>`).join('');
  await write('trace-drinking', svgOf(g, cx, cz, 70, 1100, [layer], [['deer', sp.deer], ['boar', sp.boar], ['goat', sp.goat], ['water', '#5aa1b4']], `Drinking/wallowing positions over two days (${pts.length} samples): animals stand on the shore, not in the water`));
}
