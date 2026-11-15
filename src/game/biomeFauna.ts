import type {Game} from './sim';
import type {CritterKind} from './types';
import {habitatKindAt} from './ecology';
/** Extra herds per terrain band. Mountains (high ground) carry goat herds; valleys (low ground near water) carry deer, cattle and horses.
 * New worlds only: faunaVersion 1 marks it done and saves never gain animals on load. */
export const BIOME_FAUNA_RULES={version:1,spawnAttempts:260,
 mountain:{minHeight:9,species:[['goat',14,6]] as [CritterKind,number,number][]},
 valley:{maxHeight:4,waterWithin:40,species:[['deer',8,3],['cattle',4,2],['horse',4,2],['boar',4,2]] as [CritterKind,number,number][]}} as const;
const BODY:Partial<Record<CritterKind,{hp:number;scale:number}>>={deer:{hp:3,scale:1.15},boar:{hp:4,scale:1.05},goat:{hp:2,scale:.95},horse:{hp:4,scale:1.1},cattle:{hp:6,scale:1.2},wolf:{hp:5,scale:1}};
export function initializeBiomeFauna(g:Game){
 if(g.state.faunaVersion===1)return;
 g.state.faunaVersion=1;
 let seed=(g.state.seed^0x2c1b3c6d)>>>0;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const half=g.world.size/2-8,R=BIOME_FAUNA_RULES;
 for(const [band,cfg] of [['mountain',R.mountain],['valley',R.valley]] as const){
  for(const [species,count,herd] of cfg.species){
   const body=BODY[species];if(!body)continue;
   let placed=0,seedX=0,seedZ=0,inHerd=0;
   for(let attempt=0;attempt<R.spawnAttempts&&placed<count;attempt++){
    const fresh=inHerd===0||inHerd>=herd;
    const x=fresh?(random()*2-1)*half:seedX+(random()*2-1)*6,z=fresh?(random()*2-1)*half:seedZ+(random()*2-1)*6;
    if(Math.abs(x)>half||Math.abs(z)>half)continue;
    const y=g.height(x,z);
    if(!Number.isFinite(y)||y<=g.waterAt(x,z)+.4||!g.walkable(x,z))continue;
    if(band==='mountain'?y<R.mountain.minHeight:(y>R.valley.maxHeight||habitatKindAt(g,x,z)==='hills'))continue;
    if(g.world.camps.some(c=>Math.hypot(c.x-x,c.z-z)<85)||g.state.wildlife.some(a=>Math.hypot(a.x-x,a.z-z)<2))continue;
    if(fresh){seedX=x;seedZ=z;inHerd=0;}
    g.state.wildlife.push({id:g.id(),species,x,y,z,facing:random()*Math.PI*2,vx:0,vz:0,wanderT:random()*4,hp:body.hp,maxHp:body.hp,fly:0,scale:body.scale*(.9+random()*.2),grazing:species==='wolf'?undefined:{x:seedX,z:seedZ}});
    placed++;inHerd++;
   }
  }
 }
}
