import type {Game} from './sim';
import {climateAt,habitatKindAt} from './ecology';
/** Finite initial fauna; never a wildlife replenishment or save migration. */
export const CATTLE_RULES={version:1,maximumWild:8,perCamp:2,spawnAttempts:192} as const;
/** Fresh-reset hook only. An independent stream leaves original terrain and fauna
 * generation unchanged; restore replaces this initial wildlife with saved actors. */
export function initializeCattle(g:Game){
 if(g.state.cattleVersion===1)return;
 g.state.cattleVersion=1;
 let seed=(g.state.seed^0x39e47b25)>>>0;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 let total=g.state.wildlife.filter(a=>a.species==='cattle').length;
 for(const camp of g.world.camps.filter(c=>c.team!==3)){
  for(let attempt=0,placed=0;attempt<CATTLE_RULES.spawnAttempts&&placed<CATTLE_RULES.perCamp&&total<CATTLE_RULES.maximumWild;attempt++){
   const angle=random()*Math.PI*2,d=35+random()*90,x=camp.x+Math.sin(angle)*d,z=camp.z+Math.cos(angle)*d,y=g.height(x,z);
   if(![x,y,z].every(Number.isFinite)||Math.abs(x)>g.world.size/2-8||Math.abs(z)>g.world.size/2-8||y<=g.waterAt(x,z)+.4||!g.walkable(x,z))continue;
   if(habitatKindAt(g,x,z)==='forest')continue;
   const climate=climateAt(g,x,z);
   if(!Number.isFinite(climate.temperature)||!Number.isFinite(climate.humidity)||climate.temperature< -10||climate.temperature>34||climate.humidity<.3)continue;
   if(g.state.wildlife.some(a=>Math.hypot(a.x-x,a.z-z)<3)||!g.workBoard.connected(g,camp.x,camp.z,x,z))continue;
   g.state.wildlife.push({id:g.id(),species:'cattle',x,y,z,facing:random()*Math.PI*2,vx:0,vz:0,wanderT:random()*4,hp:6,maxHp:6,fly:0,scale:1.2+random()*.15,grazing:{x,z}});
   placed++;total++;
  }
 }
}
