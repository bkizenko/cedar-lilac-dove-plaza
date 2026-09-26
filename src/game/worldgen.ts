import { HALF, MAP, SEGS, WATER_Y } from "./constants";
import { fbm, mulberry32 } from "./rng";
import type { ResKind, ResourceNode } from "./types";

export type WorldData = {
  size: number;
  segs: number;
  heights: Float32Array;
  waterY: number;
  baseWaterY: number;
  islandR: number;
  trees: ResourceNode[];
  stones: ResourceNode[];
  forage: ResourceNode[];
  fish: ResourceNode[];
  copper: ResourceNode[];
  iron: ResourceNode[];
  camps: { x: number; z: number; team: number }[];
  megaliths: { x: number; z: number; ry: number; cache: ResKind; amt: number }[];
  dockSites: { x: number; z: number }[];
  rivers: { pts: { x: number; z: number }[]; w: number }[];
  ridgeNx: number;
  ridgeNz: number;
};

function distToPath(px: number, pz: number, pts: { x: number; z: number }[]) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x;
    const az = pts[i].z;
    const bx = pts[i + 1].x - ax;
    const bz = pts[i + 1].z - az;
    const len2 = bx * bx + bz * bz || 1;
    let t = ((px - ax) * bx + (pz - az) * bz) / len2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const dx = px - (ax + bx * t);
    const dz = pz - (az + bz * t);
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

function makeRiver(rand: () => number, islandR: number, ang: number): { pts: { x: number; z: number }[]; w: number } {
  const endAng = ang + Math.PI + (rand() - 0.5) * 0.85;
  const d0 = islandR * 1.06;
  const sx = Math.sin(ang) * d0;
  const sz = Math.cos(ang) * d0;
  const ex = Math.sin(endAng) * d0;
  const ez = Math.cos(endAng) * d0;
  const px = -Math.cos(ang);
  const pz = Math.sin(ang);
  const mx = (sx + ex) * 0.5 + px * (rand() - 0.5) * islandR * 0.55;
  const mz = (sz + ez) * 0.5 + pz * (rand() - 0.5) * islandR * 0.55;
  const pts: { x: number; z: number }[] = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const omt = 1 - t;
    const wob = Math.sin(t * Math.PI * (2 + rand() * 2)) * (8 + rand() * 10);
    pts.push({
      x: omt * omt * sx + 2 * omt * t * mx + t * t * ex + px * wob * 0.35,
      z: omt * omt * sz + 2 * omt * t * mz + t * t * ez + pz * wob * 0.35,
    });
  }
  return { pts, w: 7 + rand() * 6 };
}

function idx(ix: number, iz: number) {
  return iz * (SEGS + 1) + ix;
}

function node(id: number, kind: ResourceNode["kind"], x: number, z: number, y: number, amount: number, scale: number, rich: number): ResourceNode {
  return { id, kind, x, z, y, amount, maxAmt: amount, regenT: 0, scale, rich };
}

export function generateWorld(seed: number): WorldData {
  const rand = mulberry32(seed);
  const n = SEGS + 1;
  const heights = new Float32Array(n * n);

  const islandR = 155 + rand() * 95;
  const hillScale = 0.55 + rand() * 0.75;
  const nHills = 5 + ((rand() * 7) | 0);
  const hills: { x: number; z: number; r: number; h: number }[] = [];
  for (let i = 0; i < nHills; i++) {
    const a = rand() * Math.PI * 2;
    const d = islandR * (0.18 + rand() * 0.62);
    hills.push({
      x: Math.sin(a) * d,
      z: Math.cos(a) * d,
      r: 12 + rand() * 24,
      h: (2.4 + rand() * 4.8) * hillScale,
    });
  }
  const nPeaks = 1 + ((rand() * 3) | 0);
  for (let i = 0; i < nPeaks; i++) {
    const a = rand() * Math.PI * 2;
    const d = islandR * (0.42 + rand() * 0.38);
    hills.push({
      x: Math.sin(a) * d,
      z: Math.cos(a) * d,
      r: 11 + rand() * 14,
      h: (5.5 + rand() * 5.5) * hillScale,
    });
  }
  const ridgeA = rand() * Math.PI * 2;
  const ridge = {
    nx: Math.cos(ridgeA),
    nz: Math.sin(ridgeA),
    h: 2.8 + rand() * 3.6,
    w: 12 + rand() * 16,
  };

  const nRivers = 1 + (rand() < 0.55 ? 1 : 0) + (rand() < 0.22 ? 1 : 0);
  const rivers: { pts: { x: number; z: number }[]; w: number }[] = [];
  const usedAng: number[] = [];
  for (let i = 0; i < nRivers; i++) {
    let ang = rand() * Math.PI * 2;
    for (let t = 0; t < 8 && usedAng.some((a) => Math.abs(Math.atan2(Math.sin(ang - a), Math.cos(ang - a))) < 0.7); t++) {
      ang = rand() * Math.PI * 2;
    }
    usedAng.push(ang);
    rivers.push(makeRiver(rand, islandR, ang));
  }

  const lobes = 2 + ((rand() * 3) | 0);
  const lobePhase = rand() * Math.PI * 2;
  const lobeAmp = 0.07 + rand() * 0.18;
  const coastAmp = 12 + rand() * 10;
  const lake =
    rand() < 0.72
      ? {
          x: Math.sin(rand() * 6.28) * islandR * (0.12 + rand() * 0.28),
          z: Math.cos(rand() * 6.28) * islandR * (0.12 + rand() * 0.28),
          r: 10 + rand() * 16,
        }
      : null;

  const waterY = WATER_Y;
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const x = (ix / SEGS) * MAP - HALF;
      const z = (iz / SEGS) * MAP - HALF;
      const dist = Math.hypot(x, z);
      const ang = Math.atan2(x, z);
      const warble = fbm(x * 0.016 + 3, z * 0.016, 4) * coastAmp;
      const r = islandR * (1 + lobeAmp * Math.sin(lobes * ang + lobePhase)) + warble;
      const coast = Math.max(0, Math.min(1, (r - dist) / 8));

      let h = 0.7 + fbm(x * 0.018, z * 0.018, 5) * (1.8 + hillScale * 1.2);
      h += fbm(x * 0.048 + 20, z * 0.048, 3) * 0.85 * hillScale;
      h += Math.max(0, fbm(x * 0.009 - 8, z * 0.009, 4) - 0.56) * 3.6 * hillScale;
      h += (fbm(x * 0.007 + 40, z * 0.007, 2) - 0.5) * 1.4;

      for (const hill of hills) {
        const hd = hill.r - Math.hypot(x - hill.x, z - hill.z);
        if (hd > 0) {
          const t = hd / hill.r;
          h += t * t * (0.35 + t) * hill.h;
        }
      }

      const along = x * ridge.nx + z * ridge.nz;
      const across = -x * ridge.nz + z * ridge.nx;
      const ridgeBand = Math.exp(-(across * across) / (ridge.w * ridge.w));
      if (Math.abs(along) < islandR * 0.78) h += ridgeBand * ridge.h * (0.4 + fbm(along * 0.04, 2, 2) * 0.6);

      if (lake) {
        const ld = Math.hypot(x - lake.x, z - lake.z);
        if (ld < lake.r) {
          const t = 1 - ld / lake.r;
          h -= t * t * 2.8;
        }
      }

      for (const rv of rivers) {
        const d = distToPath(x, z, rv.pts);
        const half = rv.w * 0.55;
        if (d < half * 2.2) {
          const t = Math.max(0, 1 - d / (half * 2.2));
          h -= t * t * 2.4;
          if (d < half) h = Math.min(h, waterY - 0.42 * (1 - d / half));
        }
      }

      if (coast < 0.16) h = 0.04;
      else h = Math.max(0.06, h * (0.22 + 0.78 * coast));
      heights[idx(ix, iz)] = Math.min(h, 13.2);
    }
  }

  const fords: { x: number; z: number }[] = [];
  for (const rv of rivers) {
    for (let k = 3; k < rv.pts.length - 3; k += 4) {
      const p = rv.pts[k];
      if (Math.hypot(p.x, p.z) < islandR * 0.82) fords.push({ x: p.x, z: p.z });
    }
  }
  for (const fd of fords) {
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const x = (ix / SEGS) * MAP - HALF;
        const z = (iz / SEGS) * MAP - HALF;
        const d = Math.hypot(x - fd.x, z - fd.z);
        if (d < 5.5) {
          const i = idx(ix, iz);
          const k = 1 - d / 5.5;
          const pad = waterY + 0.38;
          heights[i] = heights[i] * (1 - k * 0.85) + pad * (k * 0.85);
        }
      }
    }
  }

  const pickCamp = (ang: number, spread: number, near = 0.24, far = 0.36, want: "low" | "high" | "mid" = "low") => {
    let best: { x: number; z: number } | null = null;
    let bestScore = 1e9;
    for (let t = 0; t < 80; t++) {
      const a = ang + (rand() - 0.5) * spread;
      const d = islandR * (near + rand() * (far - near));
      const x = Math.sin(a) * d;
      const z = Math.cos(a) * d;
      const h = sampleHeight(heights, x, z);
      const minH = want === "high" ? waterY + 2.4 : waterY + 0.9;
      const maxH = want === "high" ? waterY + 7.2 : want === "mid" ? waterY + 4.4 : waterY + 3.2;
      if (h < minH || h > maxH) continue;
      if (Math.hypot(x, z) > islandR - 14) continue;
      const slope =
        Math.abs(sampleHeight(heights, x + 3, z) - sampleHeight(heights, x - 3, z)) +
        Math.abs(sampleHeight(heights, x, z + 3) - sampleHeight(heights, x, z - 3));
      if (slope > (want === "high" ? 2.4 : 1.8)) continue;
      const score =
        slope * 3 + (want === "high" ? -(h - waterY) : want === "mid" ? Math.abs(h - waterY - 2.2) : h - waterY);
      if (score < bestScore) {
        bestScore = score;
        best = { x, z };
      }
    }
    return best || { x: Math.sin(ang) * islandR * 0.32, z: Math.cos(ang) * islandR * 0.32 };
  };

  const player = pickCamp(0.08, 0.4, 0.16, 0.28, "low");
  let rival = pickCamp(2.28, 0.5, 0.5, 0.72, "high");
  let ash = pickCamp(-2.28, 0.5, 0.5, 0.72, "mid");
  const minD = 148 + rand() * 48;
  for (let t = 0; t < 28 && Math.hypot(rival.x - player.x, rival.z - player.z) < minD; t++) rival = pickCamp(2.15 + rand() * 0.55, 0.4, 0.52, 0.74, "high");
  for (let t = 0; t < 28 && (Math.hypot(ash.x - player.x, ash.z - player.z) < minD || Math.hypot(ash.x - rival.x, ash.z - rival.z) < 96); t++) {
    ash = pickCamp(-2.15 - rand() * 0.55, 0.4, 0.52, 0.74, "mid");
  }

  const camps = [
    { x: player.x, z: player.z, team: 0 },
    { x: rival.x, z: rival.z, team: 1 },
    { x: ash.x, z: ash.z, team: 2 },
  ];

  for (const c of camps) {
    const bowlR = c.team === 0 ? 44 : c.team === 1 ? 16 : 22;
    const campH = c.team === 1 ? waterY + 3.6 : c.team === 2 ? waterY + 1.9 : waterY + 1.22;
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const x = (ix / SEGS) * MAP - HALF;
        const z = (iz / SEGS) * MAP - HALF;
        const b = Math.hypot(x - c.x, z - c.z);
        if (b < bowlR) {
          const i = idx(ix, iz);
          if (heights[i] < waterY + 0.32) continue;
          const k = 1 - b / bowlR;
          const flatten = Math.min(1, k * k * (c.team === 0 ? 1.15 : 0.85) + (b < 16 && c.team === 0 ? 0.35 : 0));
          heights[i] = heights[i] * (1 - flatten) + campH * flatten;
        }
      }
    }
  }

  let nid = 1;
  const trees: ResourceNode[] = [];
  const stones: ResourceNode[] = [];
  const forage: ResourceNode[] = [];
  const fish: ResourceNode[] = [];
  const copper: ResourceNode[] = [];
  const iron: ResourceNode[] = [];

  const tooClose = (list: ResourceNode[], x: number, z: number, min: number) => {
    for (const n0 of list) {
      const dx = n0.x - x;
      const dz = n0.z - z;
      if (dx * dx + dz * dz < min * min) return true;
    }
    return false;
  };
  const nearCamp = (x: number, z: number, r: number) => camps.some((c) => Math.hypot(x - c.x, z - c.z) < r);

  const treeTries = 1100 + ((rand() * 180) | 0);
  for (let i = 0; i < treeTries; i++) {
    const x = (rand() - 0.5) * (MAP - 16);
    const z = (rand() - 0.5) * (MAP - 16);
    const h = sampleHeight(heights, x, z);
    if (h < waterY + 0.6) continue;
    if (h > 9.5) continue;
    if (camps[0] && Math.hypot(x - camps[0].x, z - camps[0].z) < 18) continue;
    if (nearCamp(x, z, 9)) continue;
    if (tooClose(trees, x, z, 2.8)) continue;
    const dense = fbm(x * 0.055 + 4, z * 0.055, 3);
    if (dense < 0.28 && rand() > 0.35) continue;
    const amt = 8 + ((rand() * 8) | 0);
    trees.push(node(nid++, "tree", x, z, h, amt, 0.9 + rand() * 0.7, 0.7 + rand() * 0.6));
  }
  const nGroves = 3 + ((rand() * 4) | 0);
  for (let g = 0; g < nGroves; g++) {
    const gx = Math.sin(rand() * 6.28) * islandR * (0.25 + rand() * 0.45);
    const gz = Math.cos(rand() * 6.28) * islandR * (0.25 + rand() * 0.45);
    const gr = 14 + rand() * 18;
    for (let i = 0; i < 40; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * gr;
      const x = gx + Math.sin(a) * d;
      const z = gz + Math.cos(a) * d;
      const h = sampleHeight(heights, x, z);
      if (h < waterY + 0.6 || h > 9) continue;
      if (nearCamp(x, z, 10)) continue;
      if (tooClose(trees, x, z, 2.2)) continue;
      trees.push(node(nid++, "tree", x, z, h, 8 + ((rand() * 8) | 0), 0.85 + rand() * 0.8, 0.7 + rand() * 0.55));
    }
  }
  const ashC = camps[2];
  if (ashC) {
    for (let i = 0; i < 90; i++) {
      const a = rand() * Math.PI * 2;
      const d = 12 + rand() * 38;
      const x = ashC.x + Math.sin(a) * d;
      const z = ashC.z + Math.cos(a) * d;
      const h = sampleHeight(heights, x, z);
      if (h < waterY + 0.6 || h > 8) continue;
      if (Math.hypot(x - ashC.x, z - ashC.z) < 9) continue;
      if (tooClose(trees, x, z, 2.4)) continue;
      trees.push(node(nid++, "tree", x, z, h, 8 + ((rand() * 8) | 0), 0.9 + rand() * 0.7, 0.75 + rand() * 0.5));
    }
  }
  const redC = camps[1];
  if (redC) {
    for (let i = 0; i < 22; i++) {
      const a = rand() * Math.PI * 2;
      const d = 16 + rand() * 28;
      const x = redC.x + Math.sin(a) * d;
      const z = redC.z + Math.cos(a) * d;
      const h = sampleHeight(heights, x, z);
      if (h < waterY + 1.2) continue;
      if (tooClose(stones, x, z, 6)) continue;
      stones.push(node(nid++, "stone", x, z, h, 12 + ((rand() * 10) | 0), 0.85 + rand() * 0.45, 0.8 + rand() * 0.4));
    }
  }

  for (let i = 0; i < 68; i++) {
    const x = (rand() - 0.5) * (MAP - 18);
    const z = (rand() - 0.5) * (MAP - 18);
    const h = sampleHeight(heights, x, z);
    if (h < waterY + 1.0) continue;
    if (nearCamp(x, z, 26) && camps[0] && Math.hypot(x - camps[0].x, z - camps[0].z) < 26) continue;
    if (tooClose(stones, x, z, 7)) continue;
    if (h < 2.8 && rand() > 0.28) continue;
    const amt = 12 + ((rand() * 10) | 0);
    stones.push(node(nid++, "stone", x, z, h, amt, 0.8 + rand() * 0.5, 0.75 + rand() * 0.5));
  }

  for (let i = 0; i < 36; i++) {
    const x = (rand() - 0.5) * (MAP - 22);
    const z = (rand() - 0.5) * (MAP - 22);
    const h = sampleHeight(heights, x, z);
    if (h < waterY + 1.4) continue;
    if (tooClose(copper, x, z, 9) || tooClose(stones, x, z, 5)) continue;
    if (nearCamp(x, z, 16)) continue;
    copper.push(node(nid++, "copper", x, z, h, 8 + ((rand() * 6) | 0), 0.75 + rand() * 0.4, 0.8 + rand() * 0.4));
  }
  for (let i = 0; i < 28; i++) {
    const x = (rand() - 0.5) * (MAP - 22);
    const z = (rand() - 0.5) * (MAP - 22);
    const h = sampleHeight(heights, x, z);
    if (h < waterY + 2.0) continue;
    if (tooClose(iron, x, z, 10) || tooClose(copper, x, z, 6) || tooClose(stones, x, z, 5)) continue;
    if (nearCamp(x, z, 18)) continue;
    iron.push(node(nid++, "iron", x, z, h, 7 + ((rand() * 5) | 0), 0.7 + rand() * 0.35, 0.75 + rand() * 0.4));
  }

  for (let i = 0; i < 110; i++) {
    const x = (rand() - 0.5) * (MAP - 18);
    const z = (rand() - 0.5) * (MAP - 18);
    const h = sampleHeight(heights, x, z);
    if (h < waterY + 0.5 || h > 4.2) continue;
    if (camps[0] && Math.hypot(x - camps[0].x, z - camps[0].z) < 14) continue;
    if (nearCamp(x, z, 8)) continue;
    if (tooClose(forage, x, z, 4.6)) continue;
    const amt = 8 + ((rand() * 7) | 0);
    forage.push(node(nid++, "forage", x, z, h, amt, 0.85 + rand() * 0.35, 0.7 + rand() * 0.55));
  }

  const home = camps[0];
  if (home) {
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI * 2;
      const d = 16 + rand() * 12;
      const x = home.x + Math.cos(a) * d;
      const z = home.z + Math.sin(a) * d;
      const h = sampleHeight(heights, x, z);
      if (h < waterY + 0.5 || h > waterY + 2.2) continue;
      if (tooClose(forage, x, z, 3.2)) continue;
      forage.push(node(nid++, "forage", x, z, h, 10 + ((rand() * 6) | 0), 0.9 + rand() * 0.3, 0.85 + rand() * 0.4));
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.2;
      const d = 15 + rand() * 6;
      const x = home.x + Math.cos(a) * d;
      const z = home.z + Math.sin(a) * d;
      const h = sampleHeight(heights, x, z);
      if (h < waterY + 0.7) continue;
      if (tooClose(stones, x, z, 5)) continue;
      stones.push(node(nid++, "stone", x, z, h, 14 + ((rand() * 8) | 0), 1 + rand() * 0.25, 0.95 + rand() * 0.3));
    }
  }

  const tryFish = (x: number, z: number) => {
    if (!inBounds(x, z, 3)) return;
    if (tooClose(fish, x, z, 5.4)) return;
    const h = sampleHeight(heights, x, z);
    if (h < waterY - 0.04 || h > waterY + 0.5) return;
    fish.push(node(nid++, "fish", x, z, waterY + 0.1, 10 + ((rand() * 8) | 0), 0.9 + rand() * 0.4, 0.8 + rand() * 0.5));
  };
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2;
    for (let d = islandR - 14; d < islandR + 5; d += 1.6) {
      const before = fish.length;
      tryFish(Math.sin(a) * d, Math.cos(a) * d);
      if (fish.length > before) break;
    }
  }
  for (const rv of rivers) {
    for (const p of rv.pts) {
      tryFish(p.x + (rand() - 0.5) * 3, p.z + (rand() - 0.5) * 3);
    }
  }
  if (home) {
    let nearest = { x: home.x, z: home.z, d: 1e9 };
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const d = 18 + (i % 6) * 4;
      const x = home.x + Math.cos(a) * d;
      const z = home.z + Math.sin(a) * d;
      const h = sampleHeight(heights, x, z);
      if (h < waterY + 0.4) {
        const dd = Math.hypot(x - home.x, z - home.z);
        if (dd < nearest.d) nearest = { x, z, d: dd };
      }
    }
    if (nearest.d < 80) {
      for (let k = 0; k < 6; k++) {
        tryFish(nearest.x + (rand() - 0.5) * 8, nearest.z + (rand() - 0.5) * 8);
      }
    }
  }

  const kinds: ResKind[] = ["food", "wood", "stone"];
  const megaliths: WorldData["megaliths"] = [];
  for (let i = 0; i < 5 + ((rand() * 4) | 0); i++) {
    const a = rand() * Math.PI * 2;
    const d = islandR * (0.22 + rand() * 0.52);
    const x = Math.sin(a) * d;
    const z = Math.cos(a) * d;
    const h = sampleHeight(heights, x, z);
    if (h < waterY + 0.7 || nearCamp(x, z, 18)) continue;
    megaliths.push({
      x,
      z,
      ry: rand() * Math.PI,
      cache: kinds[(rand() * 3) | 0],
      amt: 18 + ((rand() * 22) | 0),
    });
  }

  const dockSites: { x: number; z: number }[] = [];
  const origin = home || camps[0];
  if (origin) {
    const cand: { x: number; z: number; d: number }[] = [];
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      for (let d = 14; d < 62; d += 2.2) {
        const x = origin.x + Math.cos(a) * d;
        const z = origin.z + Math.sin(a) * d;
        const h = sampleHeight(heights, x, z);
        if (h < waterY + 0.28 || h > waterY + 1.7) continue;
        let wet = false;
        for (let k = 0; k < 8; k++) {
          const aa = (k / 8) * Math.PI * 2;
          if (sampleHeight(heights, x + Math.cos(aa) * 5.5, z + Math.sin(aa) * 5.5) < waterY + 0.32) {
            wet = true;
            break;
          }
        }
        if (!wet) continue;
        cand.push({ x, z, d });
        break;
      }
    }
    cand.sort((a, b) => a.d - b.d);
    for (const c of cand) {
      if (dockSites.some((s) => Math.hypot(s.x - c.x, s.z - c.z) < 14)) continue;
      dockSites.push({ x: c.x, z: c.z });
      if (dockSites.length >= 3) break;
    }
    for (const s of dockSites) {
      for (let iz = 0; iz < n; iz++) {
        for (let ix = 0; ix < n; ix++) {
          const x = (ix / SEGS) * MAP - HALF;
          const z = (iz / SEGS) * MAP - HALF;
          const b = Math.hypot(x - s.x, z - s.z);
          if (b < 5) {
            const i = idx(ix, iz);
            const k = 1 - b / 5;
            const padH = waterY + 0.85;
            heights[i] = heights[i] * (1 - k * 0.7) + padH * (k * 0.7);
          }
        }
      }
    }
    const clearNear = (list: ResourceNode[], r: number) => {
      for (let i = list.length - 1; i >= 0; i--) {
        if (dockSites.some((s) => Math.hypot(list[i].x - s.x, list[i].z - s.z) < r)) list.splice(i, 1);
      }
    };
    clearNear(trees, 6.5);
    clearNear(forage, 6);
    clearNear(stones, 6);
  }

  return {
    size: MAP,
    segs: SEGS,
    heights,
    waterY,
    baseWaterY: waterY,
    islandR,
    trees,
    stones,
    forage,
    fish,
    copper,
    iron,
    camps,
    megaliths,
    dockSites,
    rivers,
    ridgeNx: ridge.nx,
    ridgeNz: ridge.nz,
  };
}

export function sampleHeight(heights: Float32Array, x: number, z: number) {
  const gx = ((x + HALF) / MAP) * SEGS;
  const gz = ((z + HALF) / MAP) * SEGS;
  const ix = Math.max(0, Math.min(SEGS - 1, Math.floor(gx)));
  const iz = Math.max(0, Math.min(SEGS - 1, Math.floor(gz)));
  const fx = Math.max(0, Math.min(1, gx - ix));
  const fz = Math.max(0, Math.min(1, gz - iz));
  const nn = SEGS + 1;
  const a = heights[iz * nn + ix];
  const b = heights[iz * nn + ix + 1];
  const c = heights[(iz + 1) * nn + ix];
  const d = heights[(iz + 1) * nn + ix + 1];
  return a * (1 - fx) * (1 - fz) + b * fx * (1 - fz) + c * (1 - fx) * fz + d * fx * fz;
}

export function inBounds(x: number, z: number, pad = 2) {
  return Math.abs(x) < HALF - pad && Math.abs(z) < HALF - pad;
}

export function isFertile(heights: Float32Array, x: number, z: number, waterY: number) {
  const h = sampleHeight(heights, x, z);
  if (h < waterY + 0.28 || h > waterY + 3.15) return false;
  const s =
    Math.abs(sampleHeight(heights, x + 2.2, z) - sampleHeight(heights, x - 2.2, z)) +
    Math.abs(sampleHeight(heights, x, z + 2.2) - sampleHeight(heights, x, z - 2.2));
  return s < 2.2;
}
