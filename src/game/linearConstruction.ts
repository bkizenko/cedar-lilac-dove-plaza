import type {Game} from './sim';
import type {BldType} from './types';
export function linearStructure(t:BldType){return ['palisade','stonewall','trench','moat'].includes(t);}
/** Follow the drag with edge-joined grid cells: diagonal corner contacts leave gaps. */
export function constructionLine(a:{x:number;z:number},b:{x:number;z:number}){
 if(![a.x,a.z,b.x,b.z].every(Number.isFinite))return [];
 const nx=Math.floor(Math.abs(b.x-a.x)/4),nz=Math.floor(Math.abs(b.z-a.z)/4);
 const sx=Math.sign(b.x-a.x),sz=Math.sign(b.z-a.z);
 const points=[{x:a.x,z:a.z}];let ix=0,iz=0;
 while(points.length<32&&(ix<nx||iz<nz)){
  // Compare the next grid-edge crossing along each axis. Every section shares
  // a full edge with its predecessor, including through bends.
  if(ix<nx&&(iz>=nz||(ix+.5)/nx<=(iz+.5)/nz))ix++;
  else iz++;
  points.push({x:a.x+ix*4*sx,z:a.z+iz*4*sz});
 }
 return points;
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
