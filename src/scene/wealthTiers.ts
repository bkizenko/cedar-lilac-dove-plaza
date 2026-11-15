/** Primitive to wealthy: geometric tiers laid over any walk-in building, driven by the same wealth value (0..1, from prosperity and
 *  the variant spread) that already picks roofs, storeys and porches. Data table, not special cases: each tier adds named parts once
 *  wealth reaches its threshold. Parts stay inside the footprint and only touch buildings with an entry and a real wall mass. */
import {part,partBounds,type Part,type BuildingSpec} from './buildingParts';
export type WealthTierId='plinth'|'cornice';
export const WEALTH_TIERS:readonly {id:WealthTierId;min:number;mat:'stone'|'woodDark';y:'base'|'eave';height:number;grow:number}[]=[
 {id:'plinth',min:.4,mat:'stone',y:'base',height:.24,grow:.1},
 {id:'cornice',min:.7,mat:'woodDark',y:'eave',height:.16,grow:.14},
];
export const wealthTiersFor=(wealth:number)=>WEALTH_TIERS.filter(t=>wealth>=t.min).map(t=>t.id);
const isWall=(p:Part)=>(p.shape==='box')&&Math.min(p.size[0],p.size[2])>=1.6&&p.size[1]>=1.2&&p.pos[1]<.6&&!/roof|thatch|tile|shingle|slate|straw|recess|accent|water|ground/.test(p.mat);
export function withWealthTiers(spec:BuildingSpec,wealth:number):BuildingSpec{
 const tiers=WEALTH_TIERS.filter(t=>wealth>=t.min);if(!tiers.length||!spec.entry||/mill/i.test(spec.family))return spec;// mills already sit at their triangle cap
 const walls=spec.parts.filter(isWall);if(!walls.length)return spec;
 let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9,top=0;
 for(const p of walls){const b=partBounds(p);minX=Math.min(minX,b.minX);maxX=Math.max(maxX,b.maxX);minZ=Math.min(minZ,b.minZ);maxZ=Math.max(maxZ,b.maxZ);top=Math.max(top,p.pos[1]+p.size[1]);}
 const fw=spec.footprint.w/2-.05,fd=spec.footprint.d/2-.05,add:Part[]=[];
 for(const t of tiers){
  const w=Math.min(2*fw,maxX-minX+t.grow),d=Math.min(2*fd,maxZ-minZ+t.grow),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
  if(w<1||d<1)continue;
  add.push(part('box',t.mat,[w,t.height,d],[cx,t.y==='base'?0:top-t.height,cz],1));
 }
 return add.length?{...spec,parts:[...spec.parts,...add]}:spec;
}
