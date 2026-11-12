import type {Game} from './sim';
import type {GameState} from './types';
import {boatClass} from './boatClasses';

/**
 * G16 sea storms. An optional, saved event that exists only while the game's own weather state is
 * "storm", is placed on deep water near hulls that are actually afloat, and acts only on hulls inside
 * it that sit in deep water. Consequences are in this lane: damage (which the existing hull-condition
 * speed rule turns into delay) and, at zero hull points, loss. Crews react only to a storm they can
 * see (radius plus sight). Weather itself, hull physics and the canonical deep-water extents stay with
 * their owners: depth here is read from the existing height/water surface functions.
 */
export const SEA_STORM_RULES={version:1,checkSeconds:45,spawnChance:.55,minimumRadius:28,maximumRadius:55,minimumSeconds:60,maximumSeconds:120,deepMeters:2.5,sightMeters:40,damagePerSecond:.006,maximumConcurrent:2,maximumRecords:32,offsetMeters:70,dockClearMeters:30} as const;
export type SeaStormExposure={boatId:number;team:number;seconds:number;damage:number;lost?:boolean};
export type SeaStorm={id:number;x:number;z:number;radius:number;intensity:number;startedAt:number;until:number;ended?:boolean;exposures:SeaStormExposure[]};
export type SeaStormState={version:1;nextCheckAt:number;index:number;storms:SeaStorm[]};
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
function unit(seed:number,a:number,b:number){let h=(seed^Math.imul(a+1,0x9e3779b1)^Math.imul(b+7,0x85ebca6b))>>>0;h=Math.imul(h^(h>>>15),0x2c1b3c6d)>>>0;h=Math.imul(h^(h>>>12),0x297a2d39)>>>0;return((h^(h>>>15))>>>0)/4294967296;}
export function deepWater(g:Game,x:number,z:number){return g.waterAt(x,z)-g.height(x,z)>=SEA_STORM_RULES.deepMeters;}
const root=(g:Game)=>g.state.seaStorms??={version:1,nextCheckAt:SEA_STORM_RULES.checkSeconds,index:0,storms:[]};
export const activeSeaStorms=(g:Game)=>(g.state.seaStorms?.storms||[]).filter(s=>!s.ended);
/** A crew sees a storm only from within its radius plus sight. */
export function observedSeaStorm(g:Game,at:{x:number;z:number}){return activeSeaStorms(g).find(s=>dist(at,s)<=s.radius+SEA_STORM_RULES.sightMeters);}
function afloat(g:Game){return(g.state.boats||[]).filter(b=>b.hp>0&&deepWater(g,b.x,b.z)&&!g.state.buildings.some(d=>d.id===b.dock&&dist(d,b)<SEA_STORM_RULES.dockClearMeters));}
export function tickSeaStorms(g:Game,dt:number){
 const R=SEA_STORM_RULES,s=g.state.seaStorms;
 if(g.state.weather==='storm'&&g.state.time>=(s?.nextCheckAt??R.checkSeconds)){const st=root(g);st.nextCheckAt=g.state.time+R.checkSeconds;
  const boats=afloat(g);if(boats.length&&activeSeaStorms(g).length<R.maximumConcurrent){const i=st.index++,r=unit(g.state.seed,i,1);
   if(r<R.spawnChance){const b=boats[Math.floor(unit(g.state.seed,i,2)*boats.length)],a=unit(g.state.seed,i,3)*Math.PI*2,d=unit(g.state.seed,i,4)*R.offsetMeters,x=b.x+Math.cos(a)*d,z=b.z+Math.sin(a)*d;
    if(deepWater(g,x,z)){st.storms.push({id:g.id(),x,z,radius:R.minimumRadius+unit(g.state.seed,i,5)*(R.maximumRadius-R.minimumRadius),intensity:.5+unit(g.state.seed,i,6)*.5,startedAt:g.state.time,until:g.state.time+R.minimumSeconds+unit(g.state.seed,i,7)*(R.maximumSeconds-R.minimumSeconds),exposures:[]});
     while(st.storms.length>R.maximumRecords){const k=st.storms.findIndex(x=>x.ended);if(k<0)break;st.storms.splice(k,1);}}}}}
 if(!g.state.seaStorms)return;
 for(const storm of g.state.seaStorms.storms){if(storm.ended)continue;if(g.state.time>=storm.until){storm.ended=true;continue;}
  for(const b of g.state.boats||[]){if(b.hp<=0||dist(b,storm)>storm.radius||!deepWater(g,b.x,b.z))continue;
   let e=storm.exposures.find(x=>x.boatId===b.id);if(!e){e={boatId:b.id,team:b.team,seconds:0,damage:0};storm.exposures.push(e);}
   const max=boatClass(b).maxHp,dmg=Math.min(b.hp,max*R.damagePerSecond*storm.intensity*dt);b.hp-=dmg;e.seconds+=dt;e.damage+=dmg;if(b.hp<=1e-9){b.hp=0;e.lost=true;}}}
}
export function validSeaStormState(s:GameState){const t=s.seaStorms;if(t===undefined)return true;const fin=(n:unknown,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 if(!t||t.version!==1||!fin(t.nextCheckAt)||!Number.isInteger(t.index)||t.index<0||!Array.isArray(t.storms)||t.storms.length>SEA_STORM_RULES.maximumRecords)return false;
 for(const x of t.storms){if(!Number.isInteger(x.id)||!Number.isFinite(x.x)||!Number.isFinite(x.z)||!fin(x.radius,500)||x.radius<=0||!fin(x.intensity,1)||!fin(x.startedAt)||!fin(x.until)||x.until<x.startedAt||!Array.isArray(x.exposures)||x.exposures.length>64)return false;
  for(const e of x.exposures)if(!Number.isInteger(e.boatId)||!fin(e.seconds)||!fin(e.damage))return false;}
 return true;}
