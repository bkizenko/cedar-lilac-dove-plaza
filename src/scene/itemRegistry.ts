/** ITEM RENDER REGISTRY: the mapping from real equipment state (weapon ids, rig held items, weapon cargo kinds, goods, tools) to an item mesh request, and
 *  the placements of that mesh (in hand, lying on the ground, as an inventory icon). Pure data and maths; the three.js side is itemGeometry.ts.
 *
 *  BLUF: nothing here creates goods or equipment. A mesh is requested only for state that already exists: a unit that holds a spear gets a spear for
 *  its society and era in its real condition; a ground bundle of `bows` gets a stack of bows; a tool a worker is using gets that tool. Everything
 *  is deterministic in (kind, era, skin, condition, seed) so identical items share one geometry and one instanced draw. */
import {WEAPON_IDS} from '../game/weaponFamilies';
import {buildItem,itemDef,ITEM_DEFS,type ItemDef} from './itemModels';
import type {ItemMesh,LodTier,V3} from './itemMesh';
import {hash32,TAU} from './itemMesh';
import type {ItemReq} from './itemKit';

/** The character rig's held-item ids (characterRig.ItemId) and the model each draws. */
export const RIG_ITEM_MODEL:Readonly<Record<string,string>>=Object.freeze({
 spear:'spear',bow:'bow',blade:'bladeSword',axe:'handAxe',pick:'pickaxe',mallet:'mallet',hoe:'hoe',rod:'fishingRod',standard:'standard',shield:'shield',hammer:'hammer',staff:'staff',
 sickle:'sickle',torch:'torch',knife:'skinningKnife',scraper:'scraper',net:'fishNet',spade:'spade',flail:'flail',oar:'oar',
});
/** Weapon cargo kinds (wq14 weaponCargo.ts) and goods whose stacks have a model. */
export const CARGO_MODEL:Readonly<Record<string,string>>=Object.freeze({
 spears:'spear',bows:'bow',blades:'bladeSword',basket:'basket',pottery:'pot',cordage:'ropeCoil',
});
/** Shield kinds the rig owns, as era/material hints for the one shield model. */
export const SHIELD_KIND_ERA:Readonly<Record<string,number>>=Object.freeze({hideShield:0,woodShield:1,bronzeShield:2});
/** Every weapon id in src/game/weaponFamilies.ts has a model of the same id. */
export const WEAPON_MODEL:Readonly<Record<string,string>>=Object.freeze(Object.fromEntries(WEAPON_IDS.map(id=>[id,id])));

export type EquipmentState={
 /** a WEAPONS id, a rig item id, a cargo kind, or a tool id */kind:string;
 /** 0..1, 1 new; default .85 (lightly used) */condition?:number;/** game age 0..4 (flint .. steel) */era?:number;skin?:string|null;
 /** per-person seed (maker's mark, warp); omit for a society-wide batchable seed */seed?:number;variant?:string;broken?:boolean;
};
/** The model id for any equipment kind, or null when there is none (never a placeholder box). */
export function modelIdFor(kind:string):string|null{
 if(itemDef(kind))return kind;
 if(Object.hasOwn(RIG_ITEM_MODEL,kind))return RIG_ITEM_MODEL[kind];
 if(Object.hasOwn(CARGO_MODEL,kind))return CARGO_MODEL[kind];
 return null;
}
export const lodForDistance=(d:number,quality:'low'|'med'|'high'='high'):LodTier=>{const k=quality==='high'?1:quality==='med'?.7:.5;return d<14*k?0:d<40*k?1:2;};
/** The mesh request for a piece of equipment at a level of detail. */
export function requestFor(eq:EquipmentState,lod:LodTier=0):ItemReq|null{
 const id=modelIdFor(eq.kind);if(!id)return null;
 const era=Math.max(0,Math.min(4,Math.round(eq.era??(Object.hasOwn(SHIELD_KIND_ERA,eq.kind)?SHIELD_KIND_ERA[eq.kind]:2))));
 return {id,era,skin:eq.skin??null,condition:eq.broken?0:Math.max(0,Math.min(1,eq.condition??.85)),seed:eq.seed??(hash32('society',eq.skin??'')%97),lod,variant:eq.variant??(eq.broken?'broken':undefined)};
}
/** The mesh for equipment, or null. */
export function meshForEquipment(eq:EquipmentState,lod:LodTier=0):ItemMesh|null{const r=requestFor(eq,lod);return r?buildItem(r):null;}

// ---------------------------------------------------------------------------------------------------------------- placements
export type Pose={rot:V3;offset:V3;scale:number};
const rotXYZ=(p:V3,r:V3):V3=>{ // Y, then X, then Z (matches itemMesh euler order closely enough for a rest pose about one axis)
 const [rx,ry,rz]=r;let [x,y,z]=p;
 let c=Math.cos(rz),s=Math.sin(rz);[x,y]=[x*c-y*s,x*s+y*c];
 c=Math.cos(rx);s=Math.sin(rx);[y,z]=[y*c-z*s,y*s+z*c];
 c=Math.cos(ry);s=Math.sin(ry);[x,z]=[x*c+z*s,-x*s+z*c];
 return [x,y,z];
};
/** a copy of the mesh rotated, scaled and shifted (positions and normals) */
export function transformMesh(m:ItemMesh,pose:Pose):ItemMesh{
 const n=m.positions.length,pos=new Float32Array(n),nor=new Float32Array(n),min:V3=[Infinity,Infinity,Infinity],max:V3=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<n;i+=3){
  const p=rotXYZ([m.positions[i],m.positions[i+1],m.positions[i+2]],pose.rot),q=rotXYZ([m.normals[i],m.normals[i+1],m.normals[i+2]],pose.rot);
  for(let k=0;k<3;k++){pos[i+k]=p[k]*pose.scale+pose.offset[k];nor[i+k]=q[k];min[k]=Math.min(min[k],pos[i+k]);max[k]=Math.max(max[k],pos[i+k]);}
 }
 if(!n){for(let k=0;k<3;k++){min[k]=0;max[k]=0;}}
 return {positions:pos,normals:nor,colors:m.colors,triangles:m.triangles,bounds:{min,max}};
}
/** How a model lies on the ground: long hand items on their side (resting on their thickest part), world items as they stand. Bottom at y=0. */
export function groundPose(def:ItemDef,m:ItemMesh,yaw=0):Pose{
 const sz:V3=[m.bounds.max[0]-m.bounds.min[0],m.bounds.max[1]-m.bounds.min[1],m.bounds.max[2]-m.bounds.min[2]];
 const lay=def.frame==='hand'&&sz[1]>Math.max(sz[0],sz[2])*1.6;
 const rot:V3=lay?[0,yaw,-Math.PI/2]:[0,yaw,0];
 const t=transformMesh(m,{rot,offset:[0,0,0],scale:1});
 return {rot,offset:[-(t.bounds.min[0]+t.bounds.max[0])/2,-t.bounds.min[1],-(t.bounds.min[2]+t.bounds.max[2])/2],scale:1};
}
/** An inventory icon pose: fits the longest side to `size`, centred, turned to a readable three-quarter view. */
export function inventoryPose(def:ItemDef,m:ItemMesh,size=1):Pose{
 const sz:V3=[m.bounds.max[0]-m.bounds.min[0],m.bounds.max[1]-m.bounds.min[1],m.bounds.max[2]-m.bounds.min[2]];
 const long=def.frame==='hand'&&sz[1]>Math.max(sz[0],sz[2])*1.6,rot:V3=long?[0,-.6,-.75]:[.25,-.7,0],t=transformMesh(m,{rot,offset:[0,0,0],scale:1}),dim=Math.max(t.bounds.max[0]-t.bounds.min[0],t.bounds.max[1]-t.bounds.min[1],t.bounds.max[2]-t.bounds.min[2])||1,k=size/dim;
 return {rot,scale:k,offset:[-(t.bounds.min[0]+t.bounds.max[0])/2*k,-(t.bounds.min[1]+t.bounds.max[1])/2*k,-(t.bounds.min[2]+t.bounds.max[2])/2*k]};
}
export function groundItemMesh(eq:EquipmentState,lod:LodTier=1,yaw=0):ItemMesh|null{
 const r=requestFor(eq,lod),def=r&&itemDef(r.id),m=r&&buildItem(r);if(!r||!def||!m)return null;return transformMesh(m,groundPose(def,m,yaw));
}
export function inventoryItemMesh(eq:EquipmentState,size=1):ItemMesh|null{
 const r=requestFor(eq,0),def=r&&itemDef(r.id),m=r&&buildItem(r);if(!r||!def||!m)return null;return transformMesh(m,inventoryPose(def,m,size));
}
/** The held-item mesh the character rig draws for a rig item id, in the rig's socket frame. null when this society/era has no model for it. */
export function heldItemMesh(rigItem:string,o:{skin?:string|null;era?:number;lod:LodTier;condition?:number;shieldKind?:string;seed?:number}):ItemMesh|null{
 const id=Object.hasOwn(RIG_ITEM_MODEL,rigItem)?RIG_ITEM_MODEL[rigItem]:null;if(!id)return null;
 const era=o.era??(rigItem==='shield'&&o.shieldKind?SHIELD_KIND_ERA[o.shieldKind]??2:2);
 return buildItem({id,era:Math.max(0,Math.min(4,Math.round(era))),skin:o.skin??null,condition:o.condition??.88,seed:o.seed??(hash32('society',o.skin??'')%97),lod:o.lod});
}
/** A short stable signature of the inputs of a held mesh, for the rig layer's geometry cache. */
export const heldKey=(rigItem:string,skin:string|undefined,era:number|undefined,shieldKind?:string)=>`${rigItem}|${skin??''}|${era??'-'}|${shieldKind??''}`;
export const ITEM_CATALOGUE=()=>Object.values(ITEM_DEFS).map(d=>({id:d.id,name:d.name,category:d.category,frame:d.frame,weapon:d.weapon??null,budget:[...d.budget]}));
void TAU;
