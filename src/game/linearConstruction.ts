import type {Game} from './sim';
import type {BldType} from './types';
export function linearStructure(t:BldType){return ['palisade','stonewall','trench','moat'].includes(t);}
/** Axis-aligned joined sections avoid diagonal holes in the collision grid. */
export function constructionLine(a:{x:number;z:number},b:{x:number;z:number}){
 const horizontal=Math.abs(b.x-a.x)>=Math.abs(b.z-a.z);
 const delta=horizontal?b.x-a.x:b.z-a.z;
 const count=Math.min(32,Math.floor(Math.abs(delta)/4)+1),sign=Math.sign(delta)||1;
 return Array.from({length:count},(_,i)=>({x:a.x+(horizontal?i*4*sign:0),z:a.z+(horizontal?0:i*4*sign)}));
}
export function placeConstructionLine(g:Game,type:BldType,a:{x:number;z:number},b:{x:number;z:number}){
 if(!linearStructure(type))return 0;
 let count=0;
 for(const p of constructionLine(a,b)){
  // Stop at the first obstruction; never silently move a section or leave holes.
  if(!g.placementValid(type,p.x,p.z,0)||!g.placeBuilding(type,p.x,p.z,0))break;
  count++;
 }
 g.banner(count?`${count} sections placed · leave a gate for access`:'Line blocked — choose clear, explored ground',4);
 return count;
}
