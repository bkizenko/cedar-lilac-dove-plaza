import {geography,type LandFeature} from './geography';
import {landforms} from './landforms';
import type {WorldRequest,WorldOptions} from './worldOptions';
import {rivalCountForArea} from "./factions";
import { MAP, WATER_Y } from "./constants";
import { fbm, mulberry32 } from "./rng";
import type { ResKind, ResourceNode } from "./types";

export type WorldData = {
  size: number;
  options?: WorldOptions;
  features?: LandFeature[];
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
  biomes: { kind: "plains" | "forest" | "hills"; x: number; z: number }[];
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

function makeRiver(
  rand: () => number,
  islandR: number,
  ang: number,
): { pts: { x: number; z: number }[]; w: number } {
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

function node(
  id: number,
  kind: ResourceNode["kind"],
  x: number,
  z: number,
  y: number,
  amount: number,
  scale: number,
  rich: number,
): ResourceNode {
  // New wild plant patches support a food surplus before cultivated harvests.
  if (kind === "forage") amount *= 2;
  return { id, kind, x, z, y, amount, maxAmt: amount, regenT: 0, scale, rich };
}

export function generateWorld(seed: number, version = 1, request: WorldRequest = {}): WorldData {
  const land=version>=7?landforms(seed,request):null;
  const MAP=land?.options.size??1040, HALF=MAP/2;
  const SEGS=land?Math.round(MAP/1040*256):256;
  const idx=(ix:number,iz:number)=>iz*(SEGS+1)+ix;
  const sample=(heights:Float32Array,x:number,z:number)=>sampleHeight(heights,x,z,MAP);
  const inside=(x:number,z:number,pad=2)=>inBounds(x,z,pad,MAP);
  const rand = mulberry32(seed);
  const n = SEGS + 1;
  const heights = new Float32Array(n * n);

  const islandR = (410 + rand() * 45) * (MAP/1040);
  const hillScale = 0.55 + rand() * 0.75;
  const nHills = 5 + ((rand() * 7) | 0);
  const hills: { x: number; z: number; r: number; h: number }[] = [];
  for (let i = 0; i < nHills; i++) {
    const a = rand() * Math.PI * 2;
    const d = islandR * (0.18 + rand() * 0.62);
    hills.push({
      x: Math.sin(a) * d,
      z: Math.cos(a) * d,
      r: (12 + rand() * 24) * (version >= 2 ? 2.2 : 1),
      h: (2.4 + rand() * 4.8) * hillScale * (version >= 2 ? 2 : 1),
    });
  }
  const nPeaks = 1 + ((rand() * 3) | 0);
  for (let i = 0; i < nPeaks; i++) {
    const a = rand() * Math.PI * 2;
    const d = islandR * (0.42 + rand() * 0.38);
    hills.push({
      x: Math.sin(a) * d,
      z: Math.cos(a) * d,
      r: (11 + rand() * 14) * (version >= 2 ? 2.6 : 1),
      h: (5.5 + rand() * 5.5) * hillScale * (version >= 2 ? 3 : 1),
    });
  }
  const ridgeA = rand() * Math.PI * 2;
  const ridge = {
    nx: Math.cos(ridgeA),
    nz: Math.sin(ridgeA),
    h: (2.8 + rand() * 3.6) * (version >= 2 ? 2.5 : 1),
    w: (12 + rand() * 16) * (version >= 2 ? 2 : 1),
  };

  const nRivers = (version >= 2 ? 2 : 1) + (rand() < 0.55 ? 1 : 0) + (rand() < 0.22 ? 1 : 0);
  const rivers: { pts: { x: number; z: number }[]; w: number }[] = [];
  const usedAng: number[] = [];
  for (let i = 0; i < nRivers; i++) {
    let ang = rand() * Math.PI * 2;
    for (
      let t = 0;
      t < 8 &&
      usedAng.some((a) => Math.abs(Math.atan2(Math.sin(ang - a), Math.cos(ang - a))) < 0.7);
      t++
    ) {
      ang = rand() * Math.PI * 2;
    }
    usedAng.push(ang);
    const river=makeRiver(rand,islandR,ang);
    if(version>=2)river.w*=i===0?3:1.3+(i%3)*0.5;
    if(version>=5&&i>0){
      const branchRandom=mulberry32(seed^(i*0x19a71));
      const trunk=rivers[0].pts;
      const join=trunk[5+Math.floor(branchRandom()*11)];
      const start=river.pts[0],dx=join.x-start.x,dz=join.z-start.z;
      const length=Math.hypot(dx,dz),bend=(branchRandom()-.5)*length*.25;
      const phase=branchRandom()*Math.PI*2;
      river.pts=Array.from({length:21},(_,j)=>{
        const t=j/20;
        // End taper makes the tributary join the trunk exactly; continuous
        // bends replace per-vertex random zigzags in the branch channel.
        const offset=Math.sin(t*Math.PI)*bend+Math.sin(t*Math.PI*4+phase)*Math.sin(t*Math.PI)*8;
        return {x:start.x+dx*t-dz/length*offset,z:start.z+dz*t+dx/length*offset};
      });
      river.w=Math.min(river.w,rivers[0].w*.45);
    }
    rivers.push(river);
  }

  const lobes = 2 + ((rand() * 3) | 0);
  const lobePhase = rand() * Math.PI * 2;
  const lobeAmp = 0.07 + rand() * 0.18;
  const coastAmp = 12 + rand() * 10;
  const lake =
    (rand() < 0.72 || version >= 2)
      ? {
          x: Math.sin(rand() * 6.28) * islandR * (0.12 + rand() * 0.28),
          z: Math.cos(rand() * 6.28) * islandR * (0.12 + rand() * 0.28),
          r: (10 + rand() * 16) * (version >= 2 ? 2.2 : 1),
        }
      : null;

  // Independent stream keeps every historic terrain version byte-for-byte stable.
  const landscapeRandom=mulberry32(seed^0x4e617475);
  const coastAngle=landscapeRandom()*Math.PI,coastStretch=.82+landscapeRandom()*.48;
  const coastCos=Math.cos(coastAngle),coastSin=Math.sin(coastAngle);
  const shorelineWidth=14+landscapeRandom()*14;
  const woodlandShift=landscapeRandom()*700;
  const waterY = WATER_Y;
  const geo=land?geography(seed,MAP,land.distance):null;
  if(geo){rivers.length=0;rivers.push(...geo.rivers);}
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const x = (ix / SEGS) * MAP - HALF;
      const z = (iz / SEGS) * MAP - HALF;
      // Domain-warp the shoreline on new worlds: coves and headlands vary
      // independently of the mountains and of the map's square boundary.
      const wx=version>=4?x+(fbm(x*.006+seed%997,z*.006,3)-.5)*150:x;
      const wz=version>=4?z+(fbm(x*.006-37,z*.006+seed%619,3)-.5)*150:z;
      const localX=wx*coastCos-wz*coastSin,localZ=wx*coastSin+wz*coastCos;
      const dist = version>=6?Math.hypot(localX*coastStretch,localZ/coastStretch):Math.hypot(wx*(version>=4?1.12:1), wz*(version>=4?.9:1));
      const ang = Math.atan2(wx, wz);
      const warble = fbm(x * 0.016 + 3, z * 0.016, 4) * coastAmp;
      const inlet=version>=4?(fbm(wx*.012+seed%353,wz*.012-81,4)-.5)*100:0;
      const r = islandR * (1 + lobeAmp * Math.sin(lobes * ang + lobePhase)) + warble + inlet;
      const coast = Math.max(0, Math.min(1, (land?geo!.coast(x,z,land.distance(x,z)):r-dist) / (version>=6?shorelineWidth:8)));

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
      if (!geo && Math.abs(along) < islandR * 0.78)
        h += ridgeBand * ridge.h * (0.4 + fbm(along * 0.04, 2, 2) * 0.6);

      if(geo)h=geo.elevation(x,z,h,waterY);
      if (lake && !geo) {
        const ld = Math.hypot(x - lake.x, z - lake.z);
        if (ld < lake.r) {
          const t = 1 - ld / lake.r;
          h -= t * t * (version>=2?8:2.8);
          if(version>=2&&ld<lake.r*0.65)h=Math.min(h,waterY-0.5);
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

      if (coast < 0.16) h = land ? waterY-1.5-Math.max(0,-land.distance(x,z))*.025 : 0.04;
      else h = Math.max(0.06, h * (0.22 + 0.78 * coast));
      heights[idx(ix, iz)] = Math.min(h, land?96:version>=2?42:13.2);
    }
  }

  const fords: { x: number; z: number }[] = [];
  for (const rv of rivers) {
    for (let k = version>=5?6:3; k < rv.pts.length - 3; k += version>=5?10:4) {
      const p = rv.pts[k];
      if (Math.hypot(p.x, p.z) < islandR * 0.82) fords.push({ x: p.x, z: p.z });
    }
  }
  for (const fd of geo?[]:fords) {
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const x = (ix / SEGS) * MAP - HALF;
        const z = (iz / SEGS) * MAP - HALF;
        const d = Math.hypot(x - fd.x, z - fd.z);
        const fordRadius=version>=5?7:14;
        if (d < fordRadius) {
          const i = idx(ix, iz);
          const k = Math.min(1, (fordRadius - d) / (version>=5?3:5));
          const pad = waterY + 0.65;
          heights[i] = Math.max(heights[i], heights[i] * (1 - k) + pad * k);
        }
      }
    }
  }

  const pickCamp = (
    ang: number,
    spread: number,
    near = 0.24,
    far = 0.36,
    want: "low" | "high" | "mid" = "low",
  ) => {
    let best: { x: number; z: number } | null = null;
    let bestScore = 1e9;
    for (let t = 0; t < 80; t++) {
      const a = ang + (rand() - 0.5) * spread;
      const d = islandR * (near + rand() * (far - near));
      const x = Math.sin(a) * d;
      const z = Math.cos(a) * d;
      const h = sample(heights, x, z);
      const minH = want === "high" ? waterY + 2.4 : waterY + 0.9;
      const maxH = want === "high" ? waterY + 7.2 : want === "mid" ? waterY + 4.4 : waterY + 3.2;
      if (h < minH || h > maxH) continue;
      if (Math.hypot(x, z) > islandR - 14) continue;
      const slope =
        Math.abs(sample(heights, x + 3, z) - sample(heights, x - 3, z)) +
        Math.abs(sample(heights, x, z + 3) - sample(heights, x, z - 3));
      if (slope > (want === "high" ? 2.4 : 1.8)) continue;
      const score =
        slope * 3 +
        (want === "high"
          ? -(h - waterY)
          : want === "mid"
            ? Math.abs(h - waterY - 2.2)
            : h - waterY);
      if (score < bestScore) {
        bestScore = score;
        best = { x, z };
      }
    }
    return best || { x: Math.sin(ang) * islandR * 0.32, z: Math.cos(ang) * islandR * 0.32 };
  };

  const player = pickCamp(0.08, 0.3, 0.38, 0.46, "low");
  let rival = pickCamp(2.28, 0.5, 0.5, 0.72, "high");
  let ash = pickCamp(-2.28, 0.5, 0.5, 0.72, "mid");
  const minD = 340 + rand() * 45;
  for (let t = 0; t < 28 && Math.hypot(rival.x - player.x, rival.z - player.z) < minD; t++)
    rival = pickCamp(2.15 + rand() * 0.55, 0.4, 0.52, 0.74, "high");
  for (
    let t = 0;
    t < 28 &&
    (Math.hypot(ash.x - player.x, ash.z - player.z) < minD ||
      Math.hypot(ash.x - rival.x, ash.z - rival.z) < 300);
    t++
  ) {
    ash = pickCamp(-2.15 - rand() * 0.55, 0.4, 0.52, 0.74, "mid");
  }

  const camps = [
    { x: player.x, z: player.z, team: 0 },
    { x: rival.x, z: rival.z, team: 1 },
    { x: ash.x, z: ash.z, team: 2 },
  ];
  if(land){
    const sites:{x:number;z:number;noise:number}[]=[],siteRandom=mulberry32(seed^0x3c721);
    for(let z=-HALF+48;z<HALF-48;z+=20)for(let x=-HALF+48;x<HALF-48;x+=20){
      const h=sample(heights,x,z);if(h<waterY+.8||h>12)continue;
      const corners=[[-12,-12],[-12,12],[12,-12],[12,12]].map(([dx,dz])=>sample(heights,x+dx,z+dz));
      if(corners.some(y=>y<waterY+.6)||Math.max(h,...corners)-Math.min(h,...corners)>3)continue;
      let approaches=0;
      for(let i=0;i<8;i++){const a=i*Math.PI/4,y=sample(heights,x+Math.sin(a)*40,z+Math.cos(a)*40);if(y>waterY+.55&&Math.abs(y-h)<4)approaches++;}
      if(approaches<6)continue;
      sites.push({x,z,noise:siteRandom()});
    }
    if(sites.length<3)throw new Error('This seed has no viable settlement sites');
    const area=heights.reduce((sum,h)=>sum+Number(h>waterY+.8),0)*(MAP/SEGS)**2;
    const teams=[0,1,2,4,5].slice(0,1+rivalCountForArea(area));
    camps.length=0;
    for(const team of teams){
      let best=sites[0],score=-Infinity;
      for(const site of sites){
        const distance=camps.length?Math.min(...camps.map(c=>Math.hypot(c.x-site.x,c.z-site.z))):MAP*.3;
        const value=distance+site.noise*MAP*(camps.length?.06:.7);
        if(value>score){score=value;best=site;}
      }
      camps.push({x:best.x,z:best.z,team});
    }
  }
  const biomes: WorldData["biomes"] = [
    { kind: "plains", x: camps[0].x, z: camps[0].z },
    { kind: "hills", x: camps[1].x, z: camps[1].z },
    { kind: "forest", x: camps[2].x, z: camps[2].z },
  ];
  if(version>=2){
    const kinds=["plains","forest","hills"] as const;
    for(let i=0;i<biomes.length;i++)biomes[i].kind=kinds[(i+(seed>>>0)%3)%3];
  }
  if(land)for(const c of camps.slice(3))biomes.push({...c,kind:c.team===4?'forest':'hills'});
  if(version>=3&&version<7){
    const usableArea=heights.reduce((n,h)=>n+(h>waterY+.8?1:0),0)*(MAP/SEGS)**2;
    const wanted=rivalCountForArea(usableArea);
    for(const team of [4,5].slice(0,wanted-2)){
      let best:{x:number;z:number}|null=null,score=-Infinity;
      for(let z=-islandR+40;z<islandR-40;z+=20)for(let x=-islandR+40;x<islandR-40;x+=20){
        if(Math.hypot(x,z)>islandR-45)continue;
        const h=sample(heights,x,z);
        if(h<waterY+1||h>waterY+8)continue;
        const corners=[[-7,-7],[-7,7],[7,-7],[7,7]].map(([dx,dz])=>sample(heights,x+dx,z+dz));
        if(corners.some(y=>y<waterY+.8)||Math.max(...corners,h)-Math.min(...corners,h)>2)continue;
        const distances=camps.map(c=>Math.hypot(c.x-x,c.z-z));
        if(distances[0]<220||Math.min(...distances)<180)continue;
        const value=Math.min(...distances)-(Math.max(...corners)-Math.min(...corners))*8;
        if(value>score){score=value;best={x,z};}
      }
      if(best){camps.push({...best,team});biomes.push({...best,kind:team===4?'forest':'hills'});}
    }
  }
  const biomeAt = (x: number, z: number) => {
    let best: WorldData["biomes"][number]["kind"] = "plains";
    let bd = 1e12;
    for (const b of biomes) {
      const d = (b.x - x) ** 2 + (b.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = b.kind;
      }
    }
    return best;
  };

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
          const flatten = Math.min(
            1,
            k * k * (c.team === 0 ? 1.15 : 0.85) + (b < 16 && c.team === 0 ? 0.35 : 0),
          );
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
  const nearCamp = (x: number, z: number, r: number) =>
    camps.some((c) => Math.hypot(x - c.x, z - c.z) < r);

  const stamp = (
    list: ResourceNode[],
    kind: ResourceNode["kind"],
    cx: number,
    cz: number,
    count: number,
    radius: number,
    sep: number,
    amount: () => number,
  ) => {
    let placed = 0;
    for (let n = 0; n < count * 14 && placed < count; n++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * radius;
      const x = cx + Math.sin(a) * d;
      const z = cz + Math.cos(a) * d;
      const h = sample(heights, x, z);
      if (h < waterY + 0.55 || h > 9.2) continue;
      if (!land && Math.hypot(x, z) > islandR - 12) continue;
      if (tooClose(list, x, z, sep)) continue;
      list.push(node(nid++, kind, x, z, h, amount(), 0.85 + rand() * 0.5, 0.75 + rand() * 0.4));
      placed++;
    }
    return placed;
  };
  const centers: { x: number; z: number }[] = [];
  const pickCenter = (
    minCamp: number,
    minOther: number,
    biome?: WorldData["biomes"][number]["kind"],
  ) => {
    for (let pass = 0; pass < 2; pass++) {
      for (let t = 0; t < 48; t++) {
        const a = rand() * Math.PI * 2;
        const dist = islandR * (0.22 + rand() * 0.55);
        const x = Math.sin(a) * dist;
        const z = Math.cos(a) * dist;
        const h = sample(heights, x, z);
        if (h < waterY + 0.8 || h > 7.2) continue;
        if (pass === 0 && biome && biomeAt(x, z) !== biome) continue;
        if (camps.some((c) => Math.hypot(c.x - x, c.z - z) < minCamp)) continue;
        if (centers.some((c) => Math.hypot(c.x - x, c.z - z) < minOther)) continue;
        centers.push({ x, z });
        return { x, z };
      }
    }
    return null;
  };

  const home = camps[0];
  if (home) {
    stamp(forage, "forage", home.x + 18, home.z - 8, 10, 9, 2.4, () => 24 + ((rand() * 8) | 0));
    stamp(trees, "tree", home.x - 16, home.z + 14, 14, 11, 2.2, () => 8 + ((rand() * 6) | 0));
    const closeFood = forage.filter((f) => Math.hypot(f.x - home.x, f.z - home.z) < 36).length;
    if (closeFood < 4) {
      for (let i = 0; i < 8; i++) {
        const a = rand() * Math.PI * 2;
        const x = home.x + Math.cos(a) * (14 + rand() * 8);
        const z = home.z + Math.sin(a) * (14 + rand() * 8);
        const h = sample(heights, x, z);
        if (h < waterY + 0.4) continue;
        if (tooClose(forage, x, z, 2.2)) continue;
        forage.push(node(nid++, "forage", x, z, h, 24, 0.9, 0.8));
      }
    }
  }
  const ashC = camps[2];
  if (ashC) stamp(trees, "tree", ashC.x + 18, ashC.z, 28, 16, 2.3, () => 8 + ((rand() * 8) | 0));
  if(version>=3)for(const camp of camps.filter(c=>c.team>=4)){
    stamp(trees,"tree",camp.x+20,camp.z,24,18,2.3,()=>12+((rand()*10)|0));
    stamp(stones,"stone",camp.x,camp.z+24,10,14,4.5,()=>14+((rand()*10)|0));
    stamp(forage,"forage",camp.x-18,camp.z,10,14,2.6,()=>18+((rand()*8)|0));
  }
  const redC = camps[1];
  if (redC) stamp(stones, "stone", redC.x, redC.z + 20, 8, 12, 4.5, () => 12 + ((rand() * 8) | 0));

  for (let i = 0; i < 3; i++) {
    const c = pickCenter(78, 90, "forest");
    if (c) stamp(trees, "tree", c.x, c.z, 22, 13, 2.2, () => 9 + ((rand() * 7) | 0));
  }
  for (let i = 0; i < 3; i++) {
    const c = pickCenter(90, 100, "hills");
    if (c) stamp(stones, "stone", c.x, c.z, 7, 10, 4.2, () => 14 + ((rand() * 8) | 0));
  }
  for (let i = 0; i < 2; i++) {
    const c = pickCenter(70, 80, "plains");
    if (c) stamp(forage, "forage", c.x, c.z, 9, 8, 2.6, () => 20 + ((rand() * 8) | 0));
  }
  for (let i = 0; i < 2; i++) {
    const c = pickCenter(110, 120, "hills");
    if (c) stamp(copper, "copper", c.x, c.z, 5, 8, 3.4, () => 8 + ((rand() * 5) | 0));
  }
  for (let i = 0; i < 2; i++) {
    const c = pickCenter(120, 130, "hills");
    if (c) stamp(iron, "iron", c.x, c.z, 4, 7, 3.6, () => 7 + ((rand() * 4) | 0));
  }

  for (let i = 0; i < 640; i++) {
    const x = (rand() - 0.5) * (MAP - 28);
    const z = (rand() - 0.5) * (MAP - 28);
    if (!land && Math.hypot(x, z) > islandR - 18) continue;
    const h = sample(heights, x, z);
    if (h < waterY + 0.7 || h > 8.6) continue;
    const bio = biomeAt(x, z);
    const nearHome = !!home && Math.hypot(x - home.x, z - home.z) < 36;
    if (bio === "forest") {
      if (rand() > 0.7 || nearCamp(x, z, 8) || tooClose(trees, x, z, 3.2)) continue;
      trees.push(node(nid++, "tree", x, z, h, 7 + ((rand() * 6) | 0), 0.85 + rand() * 0.55, 0.75 + rand() * 0.4));
    } else if (bio === "hills") {
      if (nearHome) continue;
      const roll = rand();
      if (roll < 0.22) {
        if (h < waterY + 1.2 || tooClose(stones, x, z, 6.2)) continue;
        stones.push(node(nid++, "stone", x, z, h, 10 + ((rand() * 8) | 0), 0.8 + rand() * 0.4, 0.8));
      } else if (roll < 0.32) {
        if (tooClose(copper, x, z, 8) || tooClose(stones, x, z, 4)) continue;
        copper.push(node(nid++, "copper", x, z, h, 6 + ((rand() * 5) | 0), 0.75 + rand() * 0.3, 0.8));
      } else if (roll < 0.4) {
        if (tooClose(iron, x, z, 9) || tooClose(copper, x, z, 5)) continue;
        iron.push(node(nid++, "iron", x, z, h, 5 + ((rand() * 4) | 0), 0.7 + rand() * 0.3, 0.75));
      } else if (roll < 0.62 && !tooClose(trees, x, z, 4.8)) {
        trees.push(node(nid++, "tree", x, z, h, 6 + ((rand() * 4) | 0), 0.8 + rand() * 0.4, 0.7));
      }
    } else if (rand() < 0.38) {
      if (nearCamp(x, z, 9) || tooClose(forage, x, z, 5.2)) continue;
      forage.push(node(nid++, "forage", x, z, h, 16 + ((rand() * 8) | 0), 0.85 + rand() * 0.3, 0.75));
    } else if (rand() < 0.08 && !tooClose(trees, x, z, 8)) {
      trees.push(node(nid++, "tree", x, z, h, 6, 0.8, 0.7));
    }
  }

  const tryFish = (x: number, z: number) => {
    if (!inside(x, z, 3)) return;
    if (tooClose(fish, x, z, 5.4)) return;
    const h = sample(heights, x, z);
    if (h < waterY - 0.04 || h > waterY + 0.5) return;
    fish.push(
      node(
        nid++,
        "fish",
        x,
        z,
        waterY + 0.1,
        36 + ((rand() * 24) | 0),
        0.9 + rand() * 0.4,
        0.8 + rand() * 0.5,
      ),
    );
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
      const h = sample(heights, x, z);
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
    const h = sample(heights, x, z);
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
        const h = sample(heights, x, z);
        if (h < waterY + 0.28 || h > waterY + 1.7) continue;
        let wet = false;
        for (let k = 0; k < 8; k++) {
          const aa = (k / 8) * Math.PI * 2;
          if (
            sample(heights, x + Math.cos(aa) * 5.5, z + Math.sin(aa) * 5.5) <
            waterY + 0.32
          ) {
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
    if(!land)for (const s of dockSites) {
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
        if (dockSites.some((s) => Math.hypot(list[i].x - s.x, list[i].z - s.z) < r))
          list.splice(i, 1);
      }
    };
    clearNear(trees, 6.5);
    clearNear(forage, 6);
    clearNear(stones, 6);
  }

  // Habitat dressing runs after every terrain/dock operation with its own RNG.
  // Loading a saved world reconstructs that exact landscape, then restores the
  // saved resource arrays; changing this starter mix never replenishes a save.
  if (version >= 2 && home) {
    const habitatRandom = mulberry32(seed ^ 0x5f3759df);
    const localRadius = 72;
    const nearHome = (n: ResourceNode) => Math.hypot(n.x - home.x, n.z - home.z) < localRadius;
    const safeApproach = (x: number, z: number, origin = home) => {
      const distance = Math.hypot(x - origin.x, z - origin.z);
      if (distance < 16 || distance >= localRadius || !inside(x, z, 4)) return false;
      if (dockSites.some(s => Math.hypot(s.x - x, s.z - z) < 7)) return false;
      const h = sample(heights, x, z);
      if (h < waterY + 0.55 || (!land && Math.hypot(x, z) > islandR - 12)) return false;
      const grade = Math.max(
        Math.abs(sample(heights, x + 2, z) - sample(heights, x - 2, z)),
        Math.abs(sample(heights, x, z + 2) - sample(heights, x, z - 2)),
      ) / 4;
      if (grade > 0.55) return false;
      // Starter supplies must share a dry, gentle approach with the hearth.
      // This deliberately excludes attractive-looking patches across a river.
      const steps = Math.ceil(distance / 2);
      let previous = sample(heights, origin.x, origin.z);
      for (let i = 1; i <= steps; i++) {
        const y = sample(heights, origin.x + (x - origin.x) * i / steps, origin.z + (z - origin.z) * i / steps);
        if (y < waterY + 0.32 || Math.abs(y - previous) > 1.25) return false;
        previous = y;
      }
      return true;
    };
    const viableClearing = (origin: typeof home) => {
      // A dry centre alone can be a tiny island or a crater enclosed by cliffs.
      // Require room for the hearth, a shelter, and actual routes to resources.
      let low = Infinity, high = -Infinity;
      for (let dz = -10; dz <= 10; dz += 5) for (let dx = -10; dx <= 10; dx += 5) {
        const h = sample(heights, origin.x + dx, origin.z + dz);
        if (h < waterY + 0.55) return false;
        low = Math.min(low, h); high = Math.max(high, h);
      }
      if (high - low > 4) return false;
      let close = 0, outer = 0;
      for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12;
        if (safeApproach(origin.x + Math.cos(a) * 26, origin.z + Math.sin(a) * 26, origin)) close++;
        if (safeApproach(origin.x + Math.cos(a) * 48, origin.z + Math.sin(a) * 48, origin)) outer++;
      }
      return close >= 12 && outer >= 8;
    };
    if (!viableClearing(home)) {
      const oldX = home.x, oldZ = home.z;
      search: for (let radius = 8; radius <= 128; radius += 8) for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12;
        const candidate = { ...home, x: oldX + Math.cos(a) * radius, z: oldZ + Math.sin(a) * radius };
        if (!inside(candidate.x, candidate.z, 72) || camps.some(c => c.team !== 0 && Math.hypot(c.x - candidate.x, c.z - candidate.z) < 120)) continue;
        if (!viableClearing(candidate)) continue;
        // Only new settlement metadata moves. Heights, rivers and historical
        // dock pads were finalized above; saved buildings/people are restored.
        home.x = candidate.x; home.z = candidate.z;
        break search;
      }
    }
    const habitat = biomeAt(home.x, home.z);
    const bearing = habitatRandom() * Math.PI * 2;
    const dress = (list: ResourceNode[], kind: ResourceNode["kind"], count: number, minimum: number) => {
      const previous = list.filter(nearHome);
      for (let i = list.length - 1; i >= 0; i--) if (nearHome(list[i])) list.splice(i, 1);
      const placed: ResourceNode[] = [];
      const separation = kind === "stone" ? 4.8 : kind === "tree" ? 3.3 : 3;
      for (let attempt = 0; attempt < count * 90 && placed.length < count; attempt++) {
        const nearby = placed.length < minimum;
        const cluster = Math.floor(habitatRandom() * 3);
        const angle = nearby || kind === "forage"
          ? habitatRandom() * Math.PI * 2
          : bearing + cluster * 1.7 + (habitatRandom() - 0.5) * 1.3;
        const distance = nearby ? 17 + habitatRandom() * 17
          : 23 + habitatRandom() * (habitat === "forest" && kind === "tree" ? 44 : 35);
        const x = home.x + Math.cos(angle) * distance;
        const z = home.z + Math.sin(angle) * distance;
        if (!safeApproach(x, z) || tooClose(list, x, z, separation)) continue;
        if ([trees, stones, forage].some(nodes => nodes !== list && tooClose(nodes, x, z, 2.6))) continue;
        const amount = kind === "forage" ? 24 + Math.floor(habitatRandom() * 12)
          : kind === "tree" ? 10 + Math.floor(habitatRandom() * 7)
          : 14 + Math.floor(habitatRandom() * 10);
        const n = node(previous[placed.length]?.id ?? nid++, kind, x, z,
          sample(heights, x, z), amount, 0.85 + habitatRandom() * 0.45, 0.8 + habitatRandom() * 0.4);
        list.push(n);
        placed.push(n);
      }
      // Exceptionally constrained shorelines retain their original supplies
      // if sampling cannot meet the opening's survival minimum.
      for (const n of previous) {
        if (placed.length >= minimum) break;
        if (placed.some(p => p.id === n.id) || !safeApproach(n.x, n.z) || tooClose(list, n.x, n.z, separation)) continue;
        list.push(n);
        placed.push(n);
      }
      if (placed.length < minimum) {
        // Do not strip finite existing supplies if this unusual terrain cannot
        // accommodate the ordinary habitat mix even after start-site repair.
        for (let i = list.length - 1; i >= 0; i--) if (placed.includes(list[i])) list.splice(i, 1);
        list.push(...previous);
      }
    };
    const treeCount = habitat === "forest" ? 52 + Math.floor(habitatRandom() * 18)
      : habitat === "hills" ? 16 + Math.floor(habitatRandom() * 9) : 7 + Math.floor(habitatRandom() * 5);
    const forageCount = habitat === "plains" ? 28 + Math.floor(habitatRandom() * 12)
      : habitat === "forest" ? 16 + Math.floor(habitatRandom() * 8) : 12 + Math.floor(habitatRandom() * 6);
    const stoneCount = habitat === "hills" ? 12 + Math.floor(habitatRandom() * 8)
      : 2 + Math.floor(habitatRandom() * 3);
    // Food comes first so dense woodland cannot crowd out its edible understory.
    dress(forage, "forage", forageCount, 8);
    dress(trees, "tree", treeCount, 7);
    dress(stones, "stone", stoneCount, 0);
  }

  if(version>=4&&version<7){
    const vegetation=mulberry32(seed^0x7f031);
    // Continuous woodland belts with broken edges and clearings, not stamps.
    // Bounded instances keep the low-quality renderer affordable.
    for(let attempt=0,added=0;attempt<5000&&added<400;attempt++){
      const x=(vegetation()-.5)*MAP*.9,z=(vegetation()-.5)*MAP*.9;
      const broadCanopy=fbm(x*.014+seed%571,z*.014-23,4);
      // A second, slower field creates groves, broad clearings and irregular
      // woodland margins without multiplying the renderer's tree budget.
      const canopy=version>=6?broadCanopy*.65+fbm(x*.006+woodlandShift,z*.006+71,3)*.35:broadCanopy;
      if(canopy<.49||vegetation()>(canopy-.44)*3)continue;
      const y=sample(heights,x,z);
      if(y<waterY+.5||y>27||Math.abs(sample(heights,x+3,z)-sample(heights,x-3,z))>4)continue;
      if(version>=6&&Math.abs(sample(heights,x,z+3)-sample(heights,x,z-3))>4)continue;
      if(camps.some(c=>Math.hypot(c.x-x,c.z-z)<20)||trees.some(t=>Math.hypot(t.x-x,t.z-z)<5)||stones.some(t=>Math.hypot(t.x-x,t.z-z)<4))continue;
      trees.push(node(nid++,"tree",x,z,y,18+Math.floor(vegetation()*20),.85+vegetation()*.35,1));added++;
    }
  }
  if(land){
    const vegetation=mulberry32(seed^0x740f93),bucketSize=6,buckets=new Map<string,ResourceNode[]>();
    const bucket=(x:number,z:number)=>`${Math.floor(x/bucketSize)},${Math.floor(z/bucketSize)}`;
    const add=(t:ResourceNode)=>{const k=bucket(t.x,t.z),list=buckets.get(k)||[];list.push(t);buckets.set(k,list);};
    trees.forEach(add);stones.forEach(add);
    const crowded=(x:number,z:number)=>{
      const ix=Math.floor(x/bucketSize),iz=Math.floor(z/bucketSize);
      for(let z0=iz-1;z0<=iz+1;z0++)for(let x0=ix-1;x0<=ix+1;x0++)
        if(buckets.get(`${x0},${z0}`)?.some(t=>Math.hypot(t.x-x,t.z-z)<(t.kind==='tree'?3.5:4)))return true;
      return false;
    };
    const target=Math.floor(2300*Math.pow(MAP/1040,1.15));
    for(let attempt=0;attempt<target*35&&trees.length<target;attempt++){
      const x=(vegetation()-.5)*MAP*.96,z=(vegetation()-.5)*MAP*.96;
      const canopy=fbm(x*.006+seed%571,z*.006-23,4)*.65+fbm(x*.018+woodlandShift,z*.018+71,3)*.35;
      if(canopy<.43||vegetation()>(canopy-.38)*4)continue;
      const y=sample(heights,x,z);if(y<waterY+.55||y>30||Math.abs(sample(heights,x+3,z)-sample(heights,x-3,z))>4||Math.abs(sample(heights,x,z+3)-sample(heights,x,z-3))>4)continue;
      if(camps.some(c=>Math.hypot(c.x-x,c.z-z)<19)||dockSites.some(s=>Math.hypot(s.x-x,s.z-z)<8)||crowded(x,z))continue;
      const t=node(nid++,'tree',x,z,y,16+Math.floor(vegetation()*20),.8+vegetation()*.65,.85+vegetation()*.3);
      trees.push(t);add(t);
    }
    // Coastline fish sites follow actual shores on every landmass.
    for(let attempt=0;attempt<4000&&fish.length<300;attempt++)tryFish((vegetation()-.5)*MAP*.95,(vegetation()-.5)*MAP*.95);
  }
  if(version>=3)for(const tree of trees){tree.amount*=2;tree.maxAmt=tree.amount;}
  return {
    size: MAP,
    ...(land?{options:land.options,features:geo!.features}:{}),
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
    biomes,
    ridgeNx: ridge.nx,
    ridgeNz: ridge.nz,
  };
}

export function sampleHeight(heights: Float32Array, x: number, z: number, size=MAP) {
  const MAP=size,HALF=size/2,SEGS=Math.round(Math.sqrt(heights.length))-1;
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

export function inBounds(x: number, z: number, pad = 2, size=MAP) {
  const HALF=size/2;
  return Math.abs(x) < HALF - pad && Math.abs(z) < HALF - pad;
}

export function isFertile(heights: Float32Array, x: number, z: number, waterY: number, size=MAP) {
  const h = sampleHeight(heights, x, z,size);
  if (h < waterY + 0.28 || h > waterY + 3.15) return false;
  const s =
    Math.abs(sampleHeight(heights, x + 2.2, z,size) - sampleHeight(heights, x - 2.2, z,size)) +
    Math.abs(sampleHeight(heights, x, z + 2.2,size) - sampleHeight(heights, x, z - 2.2,size));
  return s < 2.2;
}
