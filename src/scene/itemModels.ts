/** ITEM MODELS: the registry of every weapon, tool and carried item that has a procedural mesh, and `buildItem` to make one.
 *
 *  BLUF: `ITEM_DEFS[id]` says what an item is (category, frame, tri budget); `buildItem({id,era,skin,condition,seed,lod})` returns a
 *  deterministic `ItemMesh` in the shape of RigMeshData. Weapon ids are exactly the keys of `WEAPONS` (src/game/weaponFamilies.ts); tools,
 *  hunting kit, carried goods and ship fittings have their own ids. Pure: no three.js, no simulation state. */
import {mergeMeshes,meshIsFinite,type ItemMesh,type LodTier} from './itemMesh';
import {makeCtx,type Ctx,type ItemReq} from './itemKit';
import {spearFamily,handAxe,club,warPick,sword,shield} from './itemMelee';
import {bow,crossbow,sling,atlatl,arrow,quiver} from './itemRanged';
import {SIEGE_GENERATORS} from './itemSiege';
import {TOOL_GENERATORS} from './itemTools';

export type ItemCategory='melee'|'ranged'|'shield'|'siege'|'farm'|'craft'|'hunt'|'fish'|'carry'|'ship'|'light';
export type Frame='hand'|'world';
export type ItemDef={id:string;name:string;category:ItemCategory;frame:Frame;/** the weapon id this is the model of, when it is a weapon */weapon?:string;
 /** tri budget at LOD 0/1/2 */budget:readonly [number,number,number];gen:(c:Ctx)=>void;/** eras with a distinct form (others reuse the nearest) */eras?:readonly number[]};
const hb=[5200,2400,700] as const,wb=[12000,5000,1400] as const,sb=[26000,11000,3200] as const;
const D=(id:string,name:string,category:ItemCategory,frame:Frame,gen:(c:Ctx)=>void,budget:readonly [number,number,number]=hb,weapon?:string):[string,ItemDef]=>[id,{id,name,category,frame,gen,budget,weapon}];
export const ITEM_DEFS:Readonly<Record<string,ItemDef>>=Object.freeze(Object.fromEntries([
 // melee weapons (ids are WEAPONS keys)
 D('spear','Spear','melee','hand',c=>spearFamily(c,'spear'),hb,'spear'),
 D('javelin','Javelin','ranged','hand',c=>spearFamily(c,'javelin'),hb,'javelin'),
 D('pike','Long pike','melee','hand',c=>spearFamily(c,'pike'),hb,'pike'),
 D('club','War club / mace','melee','hand',club,hb,'club'),
 D('handAxe','Hafted axe','melee','hand',handAxe,hb,'handAxe'),
 D('bladeSword','Sword','melee','hand',c=>sword(c,'sword'),hb,'bladeSword'),
 D('warPick','War pick','melee','hand',warPick,hb,'warPick'),
 D('dagger','Dagger','melee','hand',c=>sword(c,'dagger'),hb),
 D('shield','Shield','shield','hand',c=>shield(c),[6500,3000,900]),
 // ranged
 D('bow','Bow','ranged','hand',c=>bow(c,false),hb,'bow'),
 D('warBow','Composite war bow','ranged','hand',c=>bow(c,true),hb,'warBow'),
 D('crossbow','Crossbow','ranged','hand',crossbow,hb,'crossbow'),
 D('sling','Sling','ranged','hand',sling,hb,'sling'),
 D('atlatl','Atlatl','ranged','hand',atlatl,hb),
 D('arrow','Arrow','ranged','hand',arrow,[1500,700,250]),
 D('quiver','Quiver of arrows','ranged','hand',quiver,hb),
 ...SIEGE_GENERATORS.map(g=>D(g.id,g.name,'siege','world',g.gen,g.id==='siegeTower'?sb:wb,g.id)),
 ...TOOL_GENERATORS.map(g=>D(g.id,g.name,g.category,g.frame,g.gen,g.budget??hb)),
]));
export const ITEM_IDS:readonly string[]=Object.freeze(Object.keys(ITEM_DEFS));
export const itemDef=(id:string)=>Object.hasOwn(ITEM_DEFS,id)?ITEM_DEFS[id]:undefined;
const cache=new Map<string,ItemMesh>();
export const itemKey=(r:ItemReq)=>[r.id,Math.max(0,Math.min(4,Math.round(r.era))),r.skin??'',Math.round(Math.max(0,Math.min(1,r.condition))*10),r.seed|0,r.lod,r.variant??''].join('|');
/** Build (and cache) one item mesh. Unknown ids return null rather than a placeholder box. */
export function buildItem(req:ItemReq):ItemMesh|null{
 const def=itemDef(req.id);if(!def)return null;
 const norm:ItemReq={...req,era:Math.max(0,Math.min(4,Math.round(req.era))),condition:Math.max(0,Math.min(1,Number.isFinite(req.condition)?req.condition:1)),seed:req.seed|0,lod:req.lod};
 const key=itemKey(norm),hit=cache.get(key);if(hit)return hit;
 const c=makeCtx(norm);def.gen(c);const m=c.b.finish();
 if(cache.size>600)cache.clear();cache.set(key,m);return m;
}
export const clearItemCache=()=>cache.clear();
export function buildSet(reqs:ItemReq[]):ItemMesh{return mergeMeshes(reqs.map(r=>buildItem(r)).filter((m):m is ItemMesh=>!!m));}
export const lods:readonly LodTier[]=[0,1,2];
export {meshIsFinite};
