/** Concept harness entry: the real map renderer plus a runtime ground/vegetation palette override (nothing in src/ is edited; see ground.mjs patcher).
 * spec.ground = {palette:{provinceKind:{grass:[spring,summer,autumn,winter],dry,litter,sand,rock,rockWarm}}, autumn:[gold,rust,olive], leaf:{form:hex}, lush:'r,g,b', moss:'r,g,b', rocks:{kind:{bands,soil}}}
 * The override is applied before the view is (re)built; on a palette change the existing view is rebuilt from the same game. */
import './map-concept-entry';
import * as THREE from 'three';
import {ROCK_PALETTE} from '@/scene/painterGeology';
import {BOTANICAL_SPECIES} from '@/scene/botanicalSpecies';
// The default tree set is 'botanical': its leaf colour (read every sync) and foliage tints (baked into geometry at build) live on the species table. Mutate it in place.
const SP0=BOTANICAL_SPECIES.map(s=>({leaf:s.leaf,top:[...s.top],bottom:[...s.bottom],autumn:[...s.autumn]}));
function applyTrees(g:G|undefined){
 BOTANICAL_SPECIES.forEach((s,i)=>{s.leaf=SP0[i].leaf;for(let j=0;j<3;j++){s.top[j]=SP0[i].top[j];s.bottom[j]=SP0[i].bottom[j];}s.autumn.length=0;s.autumn.push(...SP0[i].autumn);});
 if(!g?.leaf)return;
 const hsl=(h:string)=>{const o={h:0,s:0,l:0};new THREE.Color(h).getHSL(o);return o;};
 const by:Record<string,{h:number;s:number;l:number;n:number}>={};
 for(const s of BOTANICAL_SPECIES){const c=hsl(s.leaf),m=by[s.group]??(by[s.group]={h:0,s:0,l:0,n:0});m.h+=c.h;m.s+=c.s;m.l+=c.l;m.n++;}
 for(const s of BOTANICAL_SPECIES){const t=g.leaf[s.group];if(!t)continue;const m=by[s.group],c=hsl(s.leaf),T=hsl(t);
  const col=new THREE.Color().setHSL(T.h+(c.h-m.h/m.n)*.5,Math.max(0,Math.min(1,T.s*(c.s/(m.s/m.n)))),Math.max(.05,Math.min(.9,T.l*(c.l/(m.l/m.n)))));s.leaf='#'+col.getHexString();}
 if(g.foliage){const seen=new Set<number[]>();for(const s of BOTANICAL_SPECIES){if(!seen.has(s.top)){seen.add(s.top);for(let j=0;j<3;j++)s.top[j]=1+(s.top[j]-1)*.3;}}}
 for(const s of BOTANICAL_SPECIES)s.autumn=s.autumn.map(a=>{const o=hsl(a);return '#'+new THREE.Color().setHSL(o.h,o.s*.8,o.l*.95).getHexString();});
}
type G={palette?:Record<string,Record<string,unknown>>;autumn?:[string,string,string];leaf?:Record<string,string>;lush?:string;moss?:string;foliage?:{top:number[];bottom:number[]};rocks?:Record<string,{bands?:string[];soil?:string}>};
const w=window as unknown as {renderMap:(s:Record<string,unknown>)=>Promise<unknown>};
const base=w.renderMap;
let cum=1;
const orig:{pal?:string;rocks?:string;leaf?:string;sig?:string}={};
w.renderMap=async(S:Record<string,unknown>)=>{
 const g=S.ground as G|undefined;applyTrees(g);
 const gl=(globalThis as unknown as {__HW_GROUND?:{PAINTER_PALETTE:Record<string,unknown>;set:(k:string,p:unknown)=>void;autumn:(a:string,b:string,c:string)=>void};__HW_LEAF?:{o?:Record<string,string>};__HW_LUSH?:string;__HW_MOSS?:string});
 if(gl.__HW_GROUND){
  orig.pal??=JSON.stringify(gl.__HW_GROUND.PAINTER_PALETTE);orig.rocks??=JSON.stringify(ROCK_PALETTE);orig.leaf??=JSON.stringify(gl.__HW_LEAF?.o??{});
  const P0=JSON.parse(orig.pal) as Record<string,unknown>;for(const k of Object.keys(P0))gl.__HW_GROUND.set(k,P0[k]);
  const R0=JSON.parse(orig.rocks) as Record<string,{bands:string[];soil:string}>;for(const k of Object.keys(R0)){const t=(ROCK_PALETTE as Record<string,{bands:string[];soil:string}>)[k];t.bands=R0[k].bands as never;t.soil=R0[k].soil;}
  if(gl.__HW_LEAF?.o)Object.assign(gl.__HW_LEAF.o,JSON.parse(orig.leaf));
  gl.__HW_GROUND.autumn('#c9983c','#a65a2c','#8c9a44');gl.__HW_LUSH=undefined;gl.__HW_MOSS=undefined;
  if(g){
   for(const [k,p] of Object.entries(g.palette??{}))gl.__HW_GROUND.set(k,p);
   if(g.autumn)gl.__HW_GROUND.autumn(...g.autumn);
   if(g.leaf&&gl.__HW_LEAF?.o)Object.assign(gl.__HW_LEAF.o,g.leaf);
   gl.__HW_LUSH=g.lush;gl.__HW_MOSS=g.moss;(globalThis as unknown as {__HW_FT?:number[];__HW_FB?:number[]}).__HW_FT=g.foliage?.top;(globalThis as unknown as {__HW_FT?:number[];__HW_FB?:number[]}).__HW_FB=g.foliage?.bottom;
   for(const [k,p] of Object.entries(g.rocks??{})){const t=(ROCK_PALETTE as Record<string,{bands:string[];soil:string}>)[k];if(p.bands)t.bands=p.bands as never;if(p.soil)t.soil=p.soil;}
  }
 }
 const sig=JSON.stringify(g??null),W=window as unknown as {__game?:unknown;__view?:{rebuild:(g:unknown)=>void}};
 // same world, new palette: rebuild the view from the existing game (no world regeneration), which repaints terrain and re-creates vegetation.
 if(W.__view&&W.__game&&orig.sig!==undefined&&orig.sig!==sig)W.__view.rebuild(W.__game);
 orig.sig=sig;
 // renderer.toneMappingExposure is multiplied by light.exposure on every call; track the running product so each shot gets exactly its own value
 const target=(S.light as {exposure?:number}|undefined)?.exposure??1;const light={...((S.light as object)??{}),exposure:target/cum};cum=target;
 return base({...S,light});
};
