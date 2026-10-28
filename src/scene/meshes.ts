import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { BldType, UnitType, ResKind } from "@/game/types";
import type { HaulageKind } from "@/game/haulage";

function box(w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y + h / 2, z);
  return g;
}

function cyl(rt: number, rb: number, h: number, x: number, y: number, z: number, segs = 8) {
  const g = new THREE.CylinderGeometry(rt, rb, h, segs);
  g.translate(x, y + h / 2, z);
  return g;
}

function cone(r: number, h: number, x: number, y: number, z: number, segs = 10) {
  const g = new THREE.ConeGeometry(r, h, segs);
  g.translate(x, y + h / 2, z);
  return g;
}

function merge(list: THREE.BufferGeometry[]) {
  const prepared = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    return n;
  });
  const keep = new Set(Object.keys(prepared[0]?.attributes ?? {}));
  for (const g of prepared) {
    for (const name of [...keep]) {
      if (!g.getAttribute(name)) keep.delete(name);
    }
  }
  for (const g of prepared) {
    for (const name of Object.keys(g.attributes)) {
      if (!keep.has(name)) g.deleteAttribute(name);
    }
  }
  const m = mergeGeometries(prepared, false);
  prepared.forEach((g) => g.dispose());
  if (!m) return new THREE.BoxGeometry(1, 1, 1);
  m.computeVertexNormals();
  return m;
}

export type MatKit = {
  thatch: THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  crop: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  tile: THREE.MeshStandardMaterial;
  dirt: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  rock: THREE.MeshStandardMaterial;
  berry: THREE.MeshStandardMaterial;
  hide: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  ground: THREE.MeshStandardMaterial;
  hideDark: THREE.MeshStandardMaterial;
};

function canvasTex(size: number, paint: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  paint(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

export function makeMaterials(): MatKit {
  const std = (color: string, roughness: number, metalness = 0, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true, ...opts });
  return {
    thatch: std("#d4b06a", 0.92, 0, {}),
    timber: std("#b88858", 0.78),
    plaster: std("#ead5b5", 0.86),
    stone: std("#a8a49c", 0.9, 0, {}),
    dark: std("#664734", 0.82),
    crop: std("#8ab84a", 0.86),
    metal: std("#8a8884", 0.42, 0.55),
    tile: std("#b9654f", 0.72),
    dirt: std("#8a6a3c", 0.95),
    bark: std("#6a4828", 0.88, 0, {}),
    leaf: std("#579b53", 0.72),
    rock: std("#9a9890", 0.88, 0, {}),
    berry: std("#6a8a40", 0.74),
    hide: std("#e0c49a", 0.68),
    gold: std("#d4b070", 0.45, 0.35),
    ground: std("#ffffff", 0.92, 0, { vertexColors: true }),
    hideDark: std("#8a6a48", 0.75),
  };
}

export type BldGeo = { timber: THREE.BufferGeometry; roof: THREE.BufferGeometry; extra?: THREE.BufferGeometry; extraMat?: keyof MatKit };

function thatchHut(r: number, wallH: number, roofH: number): BldGeo {
  const timber: THREE.BufferGeometry[] = [];
  const roof: THREE.BufferGeometry[] = [];
  timber.push(box(r*1.5,wallH,r*1.5,0,0,0));
  timber.push(box(.8,wallH*.75,.16,0,.02,r*.76));
  // Stepped overhanging roof reads clearly from the RTS camera.
  for(let i=0;i<4;i++)roof.push(box(r*(1.9-i*.38),roofH*.25,r*(1.9-i*.38),0,wallH+i*roofH*.25,0));
  return { timber: merge(timber), roof: merge(roof), extra:merge([
    box(.72,wallH*.72,.18,0,.04,r*.77),
    box(.55,.5,.16,-r*.43,wallH*.48,r*.77),
    box(.16,.5,.55,r*.77,wallH*.48,0),
    box(1.2,.16,.65,0,0,r*.77)
  ]),extraMat:'dark' };
}

function hall(w: number, d: number, h: number, roofH: number, chimney = false): BldGeo {
  const timber: THREE.BufferGeometry[] = [];
  const roof: THREE.BufferGeometry[] = [];
  timber.push(box(w, h, d, 0, 0, 0));
  timber.push(box(w * 0.18, h * 0.7, 0.12, 0, 0.1, d / 2 + 0.02));
  for (let i = 0; i < 5; i++) {
    timber.push(cyl(0.1, 0.12, h + 0.2, -w / 2 + 0.3 + i * ((w - 0.6) / 4), 0, d / 2 + 0.08, 6));
  }
  roof.push(box(w + 1.1, 0.28, d * 0.78, 0, h + roofH * 0.12, 0, 0.52));
  roof.push(box(w + 1.1, 0.28, d * 0.78, 0, h + roofH * 0.12, 0, -0.52));
  const ridge = new THREE.BoxGeometry(w + 0.5, 0.2, 0.28);
  ridge.translate(0, h + roofH * 0.58, 0);
  roof.push(ridge);
  if (chimney) timber.push(box(0.7, h + roofH + 0.4, 0.7, w * 0.28, 0, -d * 0.2));
  return { timber: merge(timber), roof: merge(roof),extra:merge([
    box(w*.18,h*.74,.14,0,.02,d*.51),
    box(.7,.65,.14,-w*.3,h*.48,d*.51),box(.7,.65,.14,w*.3,h*.48,d*.51),
    box(.14,.65,.7,w*.51,h*.48,0),box(.14,.65,.7,-w*.51,h*.48,0),
    box(w*.32,.16,.65,0,0,d*.5),box(w*.95,.12,.12,0,h*.9,d*.51)
  ]),extraMat:'dark' };
}

export function buildingGeos(): Record<BldType, BldGeo> {
  const hut = thatchHut(2.6, 1.9, 2.5);
  const th = hall(5.4, 4.6, 2.6, 1.7, true);
  const farmTimber = [
    box(0.18, 1.15, 0.18, -3.6, 0, -3.6),
    box(0.18, 1.15, 0.18, 3.6, 0, -3.6),
    box(0.18, 1.15, 0.18, -3.6, 0, 3.6),
    box(0.18, 1.15, 0.18, 3.6, 0, 3.6),
    box(7.4, 0.12, 0.12, 0, 0.95, -3.6),
    box(7.4, 0.12, 0.12, 0, 0.95, 3.6),
    box(0.12, 0.12, 7.4, -3.6, 0.95, 0),
    box(0.12, 0.12, 7.4, 3.6, 0.95, 0),
  ];
  const farmExtra = [
    box(7.4, 0.1, 7.4, 0, 0.02, 0),
    box(0.4, 0.48, 6.2, -2.4, 0.12, 0),
    box(0.4, 0.48, 6.2, -1.2, 0.12, 0),
    box(0.4, 0.48, 6.2, 0, 0.12, 0),
    box(0.4, 0.48, 6.2, 1.2, 0.12, 0),
    box(0.4, 0.48, 6.2, 2.4, 0.12, 0),
  ];
  const lumberT: THREE.BufferGeometry[] = [
    cyl(0.9, 1.0, 0.5, -1.4, 0, 0.4, 8),
    box(3.4, 1.5, 2.4, 1.2, 0, 0),
    box(2.4, 0.35, 0.45, -0.2, 0.55, 1.3, 0.3),
    box(2.4, 0.35, 0.45, -0.1, 0.9, 1.1, 0.2),
  ];
  const lumberR = [box(4.0, 0.2, 2.8, 1.2, 1.5, 0, 0.4)];
  const dockT = [
    box(5.6, 0.22, 2.2, 0, 0.55, 0),
    box(0.22, 1.1, 0.22, -2.4, 0, 0.85),
    box(0.22, 1.1, 0.22, -2.4, 0, -0.85),
    box(0.22, 1.1, 0.22, 0, 0, 0.85),
    box(0.22, 1.1, 0.22, 0, 0, -0.85),
    box(0.22, 1.1, 0.22, 2.4, 0, 0.85),
    box(0.22, 1.1, 0.22, 2.4, 0, -0.85),
    box(1.6, 1.2, 1.8, -2.6, 0, -0.1),
  ];
  // Drying rack and planked deck: merged once, no extra scene objects per dock.
  for(let i=0;i<9;i++)dockT.push(box(.06,.035,2.1,-2.4+i*.6,.78,0));
  dockT.push(box(.12,1.7,.12,1,.75,-.8),box(.12,1.7,.12,2.3,.75,-.8),box(1.45,.12,.12,1.65,2.35,-.8));
  for(let i=0;i<4;i++)dockT.push(box(.09,.8,.07,1.1+i*.35,1.55,-.8));
  const dockR = [box(2.2, 0.16, 2.4, -2.6, 1.2, 0, 0.2), box(0.12, 1.4, 0.12, -2.6, 1.2, 0)];
  const quarryT = [box(1.6, 0.7, 1.2, -1.6, 0, 1.2), box(1.2, 0.9, 1.4, 1.5, 0, -0.8), box(0.9, 0.5, 1.1, 0.4, 0, 1.5)];
  const quarryE: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(2.4, 1.6, 0.8, 8), box(1.8, 0.6, 1.2, 1.6, 0, 1.1)];
  quarryE[0].translate(0, 0.15, 0);
  const wareT = [box(5.4, 1.8, 4.6, 0, 0, 0)];
  const wareR = [box(6.2, 0.22, 3.4, 0, 1.8, 0, 0.5), box(6.2, 0.22, 3.4, 0, 1.8, 0, -0.5)];
  const barT: THREE.BufferGeometry[] = [
    box(7.2, 2.2, 6.4, 0, 0, 0),
    box(2.6, 4.2, 2.6, -3.4, 0, -3.0),
    box(2.6, 4.2, 2.6, 3.4, 0, -3.0),
    box(0.18, 3.4, 0.18, 0, 2.0, 3.5),
    box(0.7, 1.1, 0.12, 0, 4.6, 3.5),
  ];
  for (let i = 0; i < 9; i++) {
    const x = -3.4 + i * 0.85;
    barT.push(box(0.22, 2.6, 0.22, x, 0, 3.3));
    barT.push(box(0.22, 2.6, 0.22, x, 0, -3.3));
  }
  const barR = [
    box(5.6, 0.28, 3.8, 0, 2.2, 0, 0.45),
    box(5.6, 0.28, 3.8, 0, 2.2, 0, -0.45),
    cone(1.3, 1.4, -3.4, 4.2, -3.0, 8),
    cone(1.3, 1.4, 3.4, 4.2, -3.0, 8),
  ];
  const forgeT = [box(5.0, 1.8, 4.6, 0, 0, 0), box(1.0, 3.2, 1.0, 1.4, 0, -1.2)];
  const forgeR = [box(5.8, 0.2, 3.2, 0, 1.8, 0, 0.5), box(5.8, 0.2, 3.2, 0, 1.8, 0, -0.5)];
  const towerT: THREE.BufferGeometry[] = [box(2.6, 5.2, 2.6, 0, 0, 0), box(3.2, 0.35, 3.2, 0, 5.2, 0)];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    towerT.push(box(0.4, 1.1, 0.4, Math.cos(a) * 1.5, 5.4, Math.sin(a) * 1.5));
  }
  const templeT: THREE.BufferGeometry[] = [box(6.8, 0.4, 6.4, 0, 0, 0), box(5.6, 2.4, 5.2, 0, 0.4, 0)];
  for (let i = 0; i < 6; i++) {
    templeT.push(cyl(0.22, 0.24, 2.6, -2.6 + (i % 3) * 2.6, 0.4, i < 3 ? 2.4 : -2.4, 8));
  }
  const templeR = [box(7.4, 0.28, 6.8, 0, 3.0, 0)];
  const marketT = [box(6.2, 1.4, 5.4, 0, 0, 0), box(2.2, 1.1, 1.8, -1.8, 0, 1.6), box(2.2, 1.1, 1.8, 1.6, 0, 1.4)];
  const marketR = [box(6.8, 0.16, 3.6, 0, 1.4, 0, 0.35)];
  const keepT = [
    box(7.6, 4.4, 7.6, 0, 0, 0),
    box(2.2, 6.2, 2.2, -3.4, 0, -3.4),
    box(2.2, 6.2, 2.2, 3.4, 0, -3.4),
    box(2.2, 6.2, 2.2, -3.4, 0, 3.4),
    box(2.2, 6.2, 2.2, 3.4, 0, 3.4),
  ];
  const keepR = [box(8.2, 0.3, 8.2, 0, 4.4, 0)];
  const stabT = [box(7.0, 2.2, 6.4, 0, 0, 0), box(0.3, 2.0, 5.4, -2.2, 0, 0), box(0.3, 2.0, 5.4, 2.2, 0, 0)];
  const stabR = [box(7.8, 0.22, 4.6, 0, 2.2, 0, 0.4), box(7.8, 0.22, 4.6, 0, 2.2, 0, -0.4)];
  const uniT: THREE.BufferGeometry[] = [box(8.6, 3.4, 7.0, 0, 0, 0), cyl(0.6, 0.7, 5.2, 0, 0, 0, 10)];
  const uniR: THREE.BufferGeometry[] = [
    box(9.4, 0.24, 5.0, 0, 3.4, 0, 0.45),
    box(9.4, 0.24, 5.0, 0, 3.4, 0, -0.45),
    cone(1.4, 1.6, 0, 5.2, 0, 8),
  ];

  return {
    palisade: {timber:merge(Array.from({length:16},(_,i)=>cyl(.2,.26,2.8,(i%4-1.5)*1.1,0,(Math.floor(i/4)-1.5)*1.1,5))),roof:merge([box(.1,.1,.1,0,0,0)])},
    gate: {timber:merge([box(.5,3.5,3.8,-1.75,0,0),box(.5,3.5,3.8,1.75,0,0),box(4,.4,3.8,0,3.1,0)]),roof:merge([box(3,2.8,.35,0,0,0)])},
    stonewall: {timber:merge([box(4,3,4,0,0,0)]),roof:merge([box(1,.6,4,-1.5,3,0),box(1,.6,4,1.5,3,0),box(2,.6,1,0,3,-1.5),box(2,.6,1,0,3,1.5)])},
    trench: {timber:merge([box(4,.08,4,0,.02,0)]),roof:merge([box(4,.3,.35,0,0,-1.8),box(4,.3,.35,0,0,1.8)])},
    moat: {timber:merge([box(4,.06,4,0,.02,0)]),roof:merge([box(4,.25,.25,0,0,-1.85),box(4,.25,.25,0,0,1.85)])},
    townhall: th,
    cornerstone: {
      timber: merge([cyl(0.13, 0.18, 4.8, 0, 0, 0, 8), box(1.7, 0.12, 0.12, 0.75, 4.4, 0)]),
      roof: merge([box(1.6, 1.1, 0.08, 0.85, 3.3, 0)]),
      extra: merge([cyl(0.85, 1.15, 0.5, 0, 0, 0, 7)]),
      extraMat: "stone",
    },
    hut,
    farm: { timber: merge(farmTimber), roof: merge([box(2.4, 1.2, 2.2, 2.4, 0, 2.2)]), extra: merge(farmExtra), extraMat: "crop" },
    lumber: { timber: merge(lumberT), roof: merge(lumberR) },
    workshop: {timber:merge([box(3.8,.2,1.5,0,1.0,0),box(.3,1,.3,-1.5,0,0),box(.3,1,.3,1.5,0,0),box(.2,2.5,.2,-2,0,-1.5),box(.2,2.5,.2,2,0,-1.5)]),roof:merge([box(5,.15,4,0,2.5,0,.12)])},
    dock: { timber: merge(dockT), roof: merge(dockR) },
    bridge: {timber:merge([box(5.2,.25,12,0,-.25,0),box(.2,.9,12,-2.5,0,0),box(.2,.9,12,2.5,0,0)]),roof:merge([box(.1,.1,.1,0,0,0)])},
    quarry: { timber: merge(quarryT), roof: merge([box(0.1, 0.1, 0.1, 0, 0, 0)]), extra: merge(quarryE), extraMat: "stone" },
    warehouse: { timber: merge(wareT), roof: merge(wareR), extra:merge([
      box(1.2,1.5,.12,0,.02,2.34),box(.7,.55,.12,-1.8,.9,2.34),
      box(.8,.65,.8,-1.8,0,2),box(.65,.5,.65,-1.8,.65,2),
      box(.8,.7,.8,1.8,0,2),box(.8,.1,.9,1.8,.35,2)
    ]),extraMat:'dark' },
    barracks: { timber: merge(barT), roof: merge(barR) },
    forge: { timber: merge(forgeT), roof: merge(forgeR) },
    watchtower: { timber: merge(towerT), roof: merge([box(0.1, 0.1, 0.1, 0, 0, 0)]) },
    temple: { timber: merge(templeT), roof: merge(templeR) },
    market: { timber: merge(marketT), roof: merge(marketR) },
    keep: { timber: merge(keepT), roof: merge(keepR) },
    stables: { timber: merge(stabT), roof: merge(stabR) },
    university: { timber: merge(uniT), roof: merge(uniR) },
    cairn: {
      timber: merge([
        cyl(0.9, 1.15, 0.7, 0, 0, 0, 7),
        cyl(0.55, 0.75, 1.1, 0, 0.7, 0, 6),
        cyl(0.28, 0.42, 1.4, 0, 1.7, 0, 5),
      ]),
      roof: merge([box(0.1, 0.1, 0.1, 0, 0, 0)]),
    },
    grove: {
      timber: merge([
        cyl(0.12, 0.16, 2.2, -1.6, 0, -1.2, 5),
        cyl(0.12, 0.16, 2.4, 1.5, 0, -1.1, 5),
        cyl(0.12, 0.16, 2.1, -0.2, 0, 1.6, 5),
        cyl(0.12, 0.16, 1.9, 1.4, 0, 1.3, 5),
        cyl(0.18, 0.28, 1.4, 0, 0, 0, 6),
      ]),
      roof: merge([cone(2.2, 1.6, 0, 1.4, 0, 7)]),
    },
  };
}

export function unitGeo(type: UnitType): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  if (type === "cavalry") {
    const horse = new THREE.CapsuleGeometry(0.32, 0.9, 3, 6);
    horse.rotateZ(Math.PI / 2);
    horse.translate(0, 0.55, 0.05);
    parts.push(horse);
    parts.push(cyl(0.07, 0.08, 0.5, -0.35, 0, 0.18, 5));
    parts.push(cyl(0.07, 0.08, 0.5, -0.35, 0, -0.18, 5));
    parts.push(cyl(0.07, 0.08, 0.5, 0.35, 0, 0.18, 5));
    parts.push(cyl(0.07, 0.08, 0.5, 0.35, 0, -0.18, 5));
    const rider = new THREE.CapsuleGeometry(0.16, 0.38, 3, 6);
    rider.translate(0, 1.15, 0);
    parts.push(rider);
    const head = new THREE.SphereGeometry(0.13, 6, 5);
    head.translate(0, 1.48, 0.02);
    parts.push(head);
    return merge(parts);
  }
  const bodyH = type === "swordsman" ? 0.55 : 0.48;
  const body = new THREE.CapsuleGeometry(type === "swordsman" ? 0.2 : 0.16, bodyH, 4, 8);
  body.translate(0, 0.55, 0);
  parts.push(body);
  const head = new THREE.SphereGeometry(0.13, 8, 6);
  head.translate(0, 1.05, 0.02);
  parts.push(head);
  parts.push(cyl(0.05, 0.06, 0.42, -0.1, 0, 0.04, 5));
  parts.push(cyl(0.05, 0.06, 0.42, 0.1, 0, 0.04, 5));
  if (type === "spearman") {
    const spear = new THREE.CylinderGeometry(0.03, 0.03, 2.1, 5);
    spear.rotateX(Math.PI / 2.4);
    spear.translate(0.22, 0.85, 0.55);
    parts.push(spear);
  } else if (type === "archer") {
    const bow = new THREE.TorusGeometry(0.28, 0.03, 5, 10, Math.PI);
    bow.rotateY(Math.PI / 2);
    bow.translate(0.22, 0.8, 0.15);
    parts.push(bow);
  } else if (type === "swordsman") {
    const blade = new THREE.BoxGeometry(0.06, 0.7, 0.12);
    blade.rotateZ(-0.4);
    blade.translate(0.28, 0.85, 0.25);
    parts.push(blade);
  } else if (type === "leader") {
    const cloak = new THREE.ConeGeometry(0.38, 0.95, 7);
    cloak.translate(0, 0.55, -0.04);
    parts.push(cloak);
    const staff = new THREE.CylinderGeometry(0.035, 0.035, 1.7, 5);
    staff.translate(0.32, 0.95, 0.1);
    parts.push(staff);
    const circlet = new THREE.TorusGeometry(0.14, 0.025, 5, 8);
    circlet.rotateX(Math.PI / 2);
    circlet.translate(0, 1.16, 0.02);
    parts.push(circlet);
  } else if (type === "warden") {
    const shield = new THREE.BoxGeometry(0.08, 0.7, 0.55);
    shield.translate(-0.32, 0.75, 0.05);
    parts.push(shield);
    const axe = new THREE.BoxGeometry(0.12, 0.7, 0.18);
    axe.rotateZ(-0.45);
    axe.translate(0.3, 0.9, 0.2);
    parts.push(axe);
  } else if (type === "ranger") {
    const bow = new THREE.TorusGeometry(0.34, 0.03, 5, 10, Math.PI);
    bow.rotateY(Math.PI / 2);
    bow.translate(0.22, 0.85, 0.15);
    parts.push(bow);
    const quiver = new THREE.CylinderGeometry(0.07, 0.08, 0.55, 5);
    quiver.translate(-0.22, 0.75, -0.05);
    parts.push(quiver);
  } else {
    const tool = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5);
    tool.rotateZ(-0.5);
    tool.translate(0.28, 0.7, 0.2);
    parts.push(tool);
  }
  return merge(parts);
}

/** Shared low-poly equipment; local +Z points towards the person pulling it. */
export function haulageGeo(kind: HaulageKind): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const deck = kind === 'cart' ? .6 : .24;
  for (let i = 0; i < 4; i++) parts.push(box(.25, .1, 1.6, -.42 + i * .28, deck, 0));
  parts.push(box(1.16, .09, .1, 0, deck + .09, -.75));
  parts.push(box(1.16, .09, .1, 0, deck + .09, .75));
  // Shafts connect the vehicle to the owner's hands without more scene objects.
  for (const side of [-1, 1]) {
    const shaft = box(.065, .065, 2.1, side * .32, deck + .06, 1.15);
    shaft.rotateX(-.08); parts.push(shaft);
  }
  if (kind === 'sled') {
    for (const side of [-1, 1]) {
      parts.push(box(.11, .14, 1.9, side * .46, .04, 0));
      const tip = box(.11, .12, .48, side * .46, .02, 1.02);
      tip.rotateX(-.18); parts.push(tip);
      parts.push(box(.11, .13, .18, side * .46, .12, -.5));
      parts.push(box(.11, .13, .18, side * .46, .12, .5));
    }
  } else {
    const axle = new THREE.CylinderGeometry(.055, .055, 1.5, 5);
    axle.rotateZ(Math.PI / 2); axle.translate(0, .42, -.2); parts.push(axle);
    for (const side of [-1, 1]) {
      const wheel = new THREE.CylinderGeometry(.41, .41, .12, 10);
      wheel.rotateZ(Math.PI / 2); wheel.translate(side * .69, .42, -.2); parts.push(wheel);
      parts.push(box(.055, .25, 1.62, side * .53, deck + .1, 0));
    }
  }
  return merge(parts);
}

/** Fits the worker's existing wooden handle, avoiding a second overlapping tool. */
export function farmToolHeadGeo(): THREE.BufferGeometry {
  const blade = box(.15, .09, .38, .49, 1.04, .34);
  blade.rotateZ(-.03);
  return merge([blade, box(.13, .15, .11, .49, 1.01, .2)]);
}

export function pineGeo() {
  return {trunk:merge([box(.4,3.1,.4,0,0,0)]),canopy:merge([
    box(2.8,1.3,2.8,0,1.8,0),box(2.15,1.2,2.15,0,3,0),
    box(1.5,1,1.5,0,4.1,0),box(.8,.8,.8,0,5,0)
  ])};
}

export function rockGeo() {
  const g = new THREE.DodecahedronGeometry(0.7, 0);
  g.scale(1.2, 0.7, 1.0);
  g.translate(0, 0.28, 0);
  return g;
}

export function bushGeo() {
  return merge([box(.8,.65,.75,-.18,.05,0),box(.65,.85,.65,.25,.05,.05),box(.55,.5,.55,.05,.1,-.4)]);
}

export function dockPostGeo() {
  return merge([
    cyl(0.09, 0.12, 2.4, 0, 0, 0, 6),
    box(0.04, 0.7, 0.55, 0.28, 1.5, 0),
    box(0.08, 0.08, 0.08, 0, 2.35, 0),
  ]);
}

export function fishGeo() {
  const body = new THREE.SphereGeometry(0.22, 6, 5);
  body.scale(1.6, 0.55, 0.7);
  body.translate(0, 0.08, 0);
  const tail = new THREE.ConeGeometry(0.12, 0.28, 4);
  tail.rotateZ(Math.PI / 2);
  tail.translate(-0.32, 0.08, 0);
  return merge([body, tail]);
}

export function grassGeo() {
  const a = new THREE.ConeGeometry(0.12, 0.62, 4);
  a.translate(0, 0.3, 0);
  const b = new THREE.ConeGeometry(0.09, 0.5, 4);
  b.translate(0.09, 0.24, 0.04);
  const c = new THREE.ConeGeometry(0.08, 0.44, 4);
  c.translate(-0.07, 0.2, -0.03);
  return merge([a, b, c]);
}

export function flameGeo() {
  const g = new THREE.ConeGeometry(0.28, 0.7, 5);
  g.translate(0, 0.35, 0);
  return g;
}

export function firepitGeo() {
  const bits: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = new THREE.DodecahedronGeometry(0.22, 0);
    s.scale(1.1, 0.55, 0.8);
    s.translate(Math.cos(a) * 0.7, 0.12, Math.sin(a) * 0.7);
    bits.push(s);
  }
  bits.push(cyl(0.12, 0.14, 0.7, 0.12, 0.05, 0.05, 5));
  bits.push(cyl(0.1, 0.12, 0.65, -0.1, 0.05, -0.08, 5));
  return merge(bits);
}

export function fenceSegGeo() {
  return merge([
    box(0.13, 1.22, 0.13, -0.95, 0, 0),
    box(0.13, 1.22, 0.13, 0.95, 0, 0),
    box(1.95, 0.08, 0.08, 0, 0.48, 0),
    box(1.95, 0.08, 0.08, 0, 0.86, 0),
  ]);
}

export function goatGeo() {
  const body = new THREE.CapsuleGeometry(0.22, 0.55, 3, 6);
  body.rotateZ(Math.PI / 2);
  body.translate(0, 0.48, 0);
  const head = new THREE.SphereGeometry(0.14, 6, 5);
  head.translate(0.38, 0.62, 0);
  const snout = new THREE.ConeGeometry(0.07, 0.16, 5);
  snout.rotateZ(-Math.PI / 2);
  snout.translate(0.5, 0.56, 0);
  const hornL = new THREE.ConeGeometry(0.03, 0.16, 4);
  hornL.translate(0.36, 0.78, 0.06);
  const hornR = new THREE.ConeGeometry(0.03, 0.16, 4);
  hornR.translate(0.36, 0.78, -0.06);
  return merge([
    body,
    head,
    snout,
    hornL,
    hornR,
    cyl(0.045, 0.05, 0.42, -0.18, 0, 0.1, 4),
    cyl(0.045, 0.05, 0.42, -0.18, 0, -0.1, 4),
    cyl(0.045, 0.05, 0.42, 0.18, 0, 0.1, 4),
    cyl(0.045, 0.05, 0.42, 0.18, 0, -0.1, 4),
  ]);
}

export function deerGeo() {
  const body = new THREE.CapsuleGeometry(0.2, 0.72, 3, 6);
  body.rotateZ(Math.PI / 2);
  body.translate(0, 0.62, 0);
  const neck = new THREE.CylinderGeometry(0.07, 0.09, 0.32, 5);
  neck.translate(0.28, 0.82, 0);
  const head = new THREE.SphereGeometry(0.12, 6, 5);
  head.translate(0.42, 0.98, 0);
  const antL = new THREE.ConeGeometry(0.025, 0.28, 4);
  antL.translate(0.4, 1.18, 0.06);
  const antR = new THREE.ConeGeometry(0.025, 0.28, 4);
  antR.translate(0.4, 1.18, -0.06);
  return merge([
    body,
    neck,
    head,
    antL,
    antR,
    cyl(0.04, 0.04, 0.58, -0.22, 0, 0.1, 4),
    cyl(0.04, 0.04, 0.58, -0.22, 0, -0.1, 4),
    cyl(0.04, 0.04, 0.58, 0.22, 0, 0.1, 4),
    cyl(0.04, 0.04, 0.58, 0.22, 0, -0.1, 4),
  ]);
}

export function boarGeo() {
  const body = new THREE.CapsuleGeometry(0.28, 0.5, 3, 6);
  body.rotateZ(Math.PI / 2);
  body.translate(0, 0.4, 0);
  const head = new THREE.SphereGeometry(0.16, 6, 5);
  head.translate(0.32, 0.42, 0);
  const tuskL = new THREE.ConeGeometry(0.03, 0.14, 4);
  tuskL.rotateZ(-Math.PI / 2);
  tuskL.translate(0.46, 0.34, 0.06);
  const tuskR = new THREE.ConeGeometry(0.03, 0.14, 4);
  tuskR.rotateZ(-Math.PI / 2);
  tuskR.translate(0.46, 0.34, -0.06);
  return merge([
    body,
    head,
    tuskL,
    tuskR,
    cyl(0.05, 0.05, 0.34, -0.16, 0, 0.12, 4),
    cyl(0.05, 0.05, 0.34, -0.16, 0, -0.12, 4),
    cyl(0.05, 0.05, 0.34, 0.16, 0, 0.12, 4),
    cyl(0.05, 0.05, 0.34, 0.16, 0, -0.12, 4),
  ]);
}

export function birdGeo() {
  const body = new THREE.CapsuleGeometry(0.05, 0.16, 3, 5);
  body.rotateZ(Math.PI / 2);
  const wingL = new THREE.ConeGeometry(0.04, 0.28, 4);
  wingL.rotateZ(Math.PI / 2);
  wingL.translate(0, 0.02, 0.16);
  const wingR = new THREE.ConeGeometry(0.04, 0.28, 4);
  wingR.rotateZ(-Math.PI / 2);
  wingR.translate(0, 0.02, -0.16);
  return merge([body, wingL, wingR]);
}

export function skyGeo() {
  const geo = new THREE.SphereGeometry(250, 48, 24);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color("#7eafd2");
  const horizon = new THREE.Color("#f3d6a4");
  const ground = new THREE.Color("#cbb896");
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 250;
    if (y > 0) c.lerpColors(horizon, zenith, Math.pow(y, 0.55));
    else c.lerpColors(horizon, ground, Math.min(1, -y * 1.8));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

void hall;


/** Distinct shared cargo silhouettes, centered on the carrier's hands/vehicle. */
export function cargoGeo(kind:ResKind){
 const parts:THREE.BufferGeometry[]=[];
 if(kind==='wood'){
  for(const [x,y] of [[-.18,-.22],[.18,-.22],[0,.04]])parts.push(box(.29,.25,1.05,x,y,0));
  for(const z of [-.32,.32])parts.push(box(.7,.045,.065,0,.02,z));
 }else if(kind==='food'){
  parts.push(box(.66,.43,.65,0,-.25,0),box(.45,.12,.48,0,.18,0),box(.18,.1,.2,0,.3,0));
 }else{
  parts.push(box(.43,.33,.5,-.14,-.25,.1,.22),box(.35,.4,.38,.18,-.25,-.12,-.3),box(.36,.24,.35,0,.05,0,.4));
 }
 return merge(parts);
}
