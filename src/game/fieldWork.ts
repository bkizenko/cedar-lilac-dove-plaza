import type {Game} from './sim';
import type {Building,Unit} from './types';
import {calendar,farmAvailable,farmWork} from './settlement';
import {plotArea} from './plots';
type Station={lane:number;point:number;worked:number;key:string;x:number;z:number};
const crews=new WeakMap<Building,Map<Unit,Station>>();
function point(b:Building,lane:number,index:number,slots:number){
 const width=b.w-2.4,depth=b.d-2.4;
 const cols=Math.min(slots,Math.max(1,Math.floor(width/1.8))),rows=Math.ceil(slots/cols);
 const x=b.x-width/2+(lane%cols+.5)*width/cols;
 const band=depth/rows,z0=b.z-depth/2+Math.floor(lane/cols)*band;
 const fraction=[.18,.5,.82,.5][index%4];
 let z=z0+band*fraction;
 // Keep the one tool shed at the far corner clear of routine field labor.
 if(x>b.x+b.w/2-3.8&&z>b.z+b.d/2-3.5)z=Math.min(z,b.z+b.d/2-3.7);
 return {x,z};
}
/** Temporary row reservations derive from actual assignments; no saved crop state is reset. */
export function fieldWorkStep(g:Game,u:Unit,b:Building,dt:number){
 if(!g.finished(b)||!farmAvailable(g,b)){u.node=null;u.order=u.carry>0?'return':'idle';return;}
 let crew=crews.get(b);if(!crew){crew=new Map();crews.set(b,crew);}
 for(const person of crew.keys())if(person.hp<=0||person.node!==b||person.order!=='gather')crew.delete(person);
 const cal=calendar(g),key=`${cal.year}:${cal.phase}:${b.w}:${b.d}`,slots=Math.min(12,Math.ceil(3*plotArea(b)));
 let station=crew.get(u);
 if(!station||station.key!==key){
   const used=new Set([...crew.entries()].filter(([p,s])=>p!==u&&s.key===key).map(([,s])=>s.lane));
   let lane=0;while(used.has(lane)&&lane<slots)lane++;
   if(lane>=slots){u.node=null;u.order=u.carry>0?'return':'idle';u.workReason='Field crew full — finding other work';return;}
   station={lane,point:0,worked:0,key,...point(b,lane,0,slots)};crew.set(u,station);
 }
 // A blocked row must not leave a villager walking into an obstacle forever.
 if(!g.walkable(station.x,station.z)||u.stuckT>6){
   let found=false;
   for(let n=1;n<=4;n++){const p=point(b,station.lane,station.point+n,slots);if(g.walkable(p.x,p.z)&&g.workBoard.connected(g,u.x,u.z,p.x,p.z)){station.point+=n;Object.assign(station,p);u.stuckT=0;found=true;break;}}
   if(!found){crew.delete(u);u.blockedTask=b.id;u.retryWorkAt=g.state.time+30;u.node=null;u.order=u.carry>0?'return':'idle';u.workReason='Field row blocked — finding another task';return;}
 }
 if(Math.hypot(u.x-station.x,u.z-station.z)>1){
   u.tx=station.x;u.tz=station.z;g.steer(u,dt);u.workReason=cal.phase===2?'Walking to the harvest row':'Walking to the next field row';return;
 }
 farmWork(g,u,b,dt);u.vx=0;u.vz=0;u.facing=station.point<2?0:Math.PI;
 station.worked+=dt;
 if(station.worked>=8){station.worked=0;station.point=(station.point+1)%4;Object.assign(station,point(b,station.lane,station.point,slots));}
}
export function staffField(g:Game,b:Building){
 if(b.team!==0||b.type!=='farm'||!g.finished(b)||!farmAvailable(g,b)){g.banner('No field work this season',3);return 0;}
 const slots=Math.min(12,Math.ceil(3*plotArea(b)));
 const existing=g.state.units.filter(u=>u.hp>0&&u.node===b&&u.order==='gather').length;
 const candidates=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&(!u.maturesAt||u.maturesAt<=g.state.time)&&u.carry===0&&!u.emergency&&!u.recalled&&!u.envoy&&!u.expedition&&!u.scout&&!u.visit&&!u.studyCrop&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.tamingWork&&!u.husbandryWork&&!u.tributeJourney&&!u.foundingJourney&&u.node!==b&&['idle','hold','gather'].includes(u.order))
   .sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z));
 let sent=0;
 for(const u of candidates){if(existing+sent>=slots)break;if(!g.workBoard.connected(g,u.x,u.z,b.x,b.z))continue;
   g.interruptMission(u);u.order='gather';u.node=b;u.job='food';u.jobLock=false;u.huntOnly=false;u.target=null;u.workReason='Assigned to this field';sent++;
 }
 g.workBoard.reset();g.banner(`${existing+sent}/${slots} farmers assigned`,3);return sent;
}
