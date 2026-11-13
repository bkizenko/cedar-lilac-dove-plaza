import type {Game} from './sim';
import type {Unit} from './types';
import {ROUTE_RULES,corridorLine,corridorOwner,corridorWear,routeCorridors,routesEnabled,routineTraveller,type Corridor} from './routeWear';
import {hash32} from './rulerCore';
import {societiesAreFoes} from './societyRelations';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {connectedForUnit} from './waterTravel';

/** Waystations: shelter that grows on long, busy routes.
 *
 * A route needing more than a day's walk (sim gatherer speed x loaded factor x one simulation day, along the real path) with
 * sustained traffic gets, over time, a lean-to, then a rest hut with hearth and water, then an inn or caravanserai with stable,
 * store and beds. Each step is paid by the society that makes most of the journeys: real wood, stone and food come out of its
 * stock when work starts, and a real resident walks there and works the labour seconds. Nothing is built for free.
 * Travellers of that society and its friends rest, sleep, eat from the finite store and shelter from weather; visitors from another
 * society pay a small toll in food moved from their stock to the owner's. Enemies and raiders who reach one plunder its store and wear it down.
 * No random numbers: sites and forms come from seeded hashes. Switchable: `setWaystationsEnabled(g,false)`. */
export const WAYSTATION_RULES={
 version:1,
 dayWalkMetres:ROUTE_RULES.dayWalkMetres,
 /** corridor must be at least this much worn, for this long (seconds of sustained traffic), to begin each step */
 stages:[
  {name:'Lean-to',cost:{wood:10},labour:45,minWear:.4,sustain:90,visits:0,store:0,rest:.004},
  {name:'Rest hut',cost:{wood:28,stone:14},labour:120,minWear:.6,sustain:240,visits:4,store:12,rest:.008},
  {name:'Inn',cost:{wood:60,stone:40,food:30},labour:280,minWear:.75,sustain:480,visits:12,store:40,rest:.014},
 ],
 /** the village keeps this much after paying */
 reserve:{wood:30,stone:10,food:60},
 maxPerCorridor:3,maxPerTeam:12,maxTotal:40,
 spacingFraction:.85,
 usageRadius:9,raidRadius:12,raidSeconds:6,raidDamage:.34,
 tollFood:1,restockFood:5,restockAbove:150,
 planEvery:10,workEvery:2,
} as const;

export type StationForm='reed'|'timber'|'stone'|'hide';
export type Station={
 id:number;team:number;corridor:number;x:number;z:number;stage:0|1|2|3;form:StationForm;hp:number;built:number;
 project?:{to:1|2|3;labour:number;need:number;crewId?:number;started:number};
 store:{food:number;wood:number};water:boolean;
 visits:number;nights:number;sheltered:number;income:number;raided:number;lastRaidAt:number;waiting?:string;
};
export type WaystationState={version:1;enabled:boolean;nextId:number;stations:Station[];sustain:Record<string,number>;clock:{plan:number;work:number;use:number}};
type WState={waystations?:WaystationState};
const st=(g:Pick<Game,'state'>)=>g.state as Game['state']&WState;
const FORMS:StationForm[]=['reed','timber','stone','hide'];
function state(g:Pick<Game,'state'>){return st(g).waystations??={version:1,enabled:true,nextId:1,stations:[],sustain:{},clock:{plan:0,work:0,use:0}};}
export const waystationsEnabled=(g:Pick<Game,'state'>)=>routesEnabled(g)&&st(g).waystations?.enabled!==false;
export function setWaystationsEnabled(g:Game,on:boolean){state(g).enabled=!!on;}
export const stationsOf=(g:Pick<Game,'state'>):readonly Station[]=>st(g).waystations?.stations??[];
export const stationLabel=(s:Pick<Station,'stage'|'form'>)=>s.stage<=0?'Site':s.stage===1?'Lean-to':s.stage===2?'Rest hut':s.form==='stone'||s.form==='hide'?'Caravanserai':'Inn';
export const stationBuilt=(s:Station)=>s.stage>=1;
export const longRoute=(len:number)=>len>WAYSTATION_RULES.dayWalkMetres;
/** How many stops a route of this length wants: one per ~0.85 day's walk, never on a route a day's walk or shorter. */
export const stopsWanted=(len:number)=>longRoute(len)?Math.min(WAYSTATION_RULES.maxPerCorridor,Math.max(1,Math.floor(len/(WAYSTATION_RULES.dayWalkMetres*WAYSTATION_RULES.spacingFraction)))):0;

const enemy=(g:Game,team:number,owner:number)=>team===3||(team!==owner&&(societiesAreFoes(g,team,owner)||societiesAreFoes(g,owner,team)));
const friend=(g:Game,team:number,owner:number)=>team!==3&&!enemy(g,team,owner)&&!!g.tribe(team);

/* ------------------------------------------------------------------ site choice */
function clearOfWork(g:Game,x:number,z:number,s:WaystationState){
 for(const b of g.state.buildings)if(Math.hypot(b.x-x,b.z-z)<22)return false;
 for(const o of s.stations)if(Math.hypot(o.x-x,o.z-z)<70)return false;
 return true;
}
function nearWater(g:Game,x:number,z:number){
 let best=Infinity;
 for(let k=0;k<12;k++){const a=k/12*Math.PI*2;for(const r of [14,28,45]){const wx=x+Math.cos(a)*r,wz=z+Math.sin(a)*r;if(g.height(wx,wz)<g.waterAt(wx,wz)+.2)best=Math.min(best,r);}}
 return best;
}
/** Dry, gently sloped ground a few metres beside the path, preferring water within a short walk. Deterministic in the world and corridor. */
export function chooseSite(g:Game,c:Corridor,k:number,n:number):{x:number;z:number;water:boolean}|null{
 const line=corridorLine(c,g.state.seed,4,false),pts=line.length/2;if(pts<4)return null;
 const s=state(g);let total=0;const cum=[0];for(let i=1;i<pts;i++){total+=Math.hypot(line[i*2]-line[i*2-2],line[i*2+1]-line[i*2-1]);cum.push(total);}
 const want=total*(k+1)/(n+1);let best:{x:number;z:number;water:boolean;score:number}|null=null;
 for(let i=1;i<pts-1;i++){
  const off=cum[i]-want;if(Math.abs(off)>total*.15)continue;
  const dx=line[i*2+2]-line[i*2-2],dz=line[i*2+3]-line[i*2-1],d=Math.hypot(dx,dz)||1;
  for(const side of [1,-1])for(const lateral of [6,9]){
   const x=line[i*2]-dz/d*lateral*side,z=line[i*2+1]+dx/d*lateral*side;
   if(g.height(x,z)<g.waterAt(x,z)+1.2||!g.walkable(x,z)||!clearOfWork(g,x,z,s))continue;
   const slope=Math.max(Math.abs(g.height(x+3,z)-g.height(x-3,z)),Math.abs(g.height(x,z+3)-g.height(x,z-3)));if(slope>2.2)continue;
   const w=nearWater(g,x,z),score=-Math.abs(off)*.02-slope*1.5-lateral*.05+(w<Infinity?3-w/20:0);
   if(!best||score>best.score+1e-9)best={x,z,water:w<=45,score};
  }
 }
 return best?{x:best.x,z:best.z,water:best.water}:null;
}

/* ------------------------------------------------------------------ planning and work */
const tribeOk=(g:Game,team:number)=>team>=0&&team!==3&&!!g.tribe(team)&&g.tribe(team).alive!==false;
function plan(g:Game){
 const s=state(g),R=WAYSTATION_RULES;
 const live=new Set<string>();
 for(const c of routeCorridors(g)){
  const key=String(c.id),w=corridorWear(c);live.add(key);
  if(longRoute(c.len)&&w>=R.stages[0].minWear)s.sustain[key]=(s.sustain[key]||0)+R.planEvery;
  else s.sustain[key]=Math.max(0,(s.sustain[key]||0)-R.planEvery*2);
  if(s.sustain[key]<R.stages[0].sustain)continue;
  const owner=corridorOwner(c);if(!tribeOk(g,owner))continue;
  const want=stopsWanted(c.len),have=s.stations.filter(t=>t.corridor===c.id);
  if(have.length>=want||s.stations.length>=R.maxTotal||s.stations.filter(t=>t.team===owner).length>=R.maxPerTeam)continue;
  // Fill the first free slot along the route.
  const slot=have.length;
  const site=chooseSite(g,c,slot,want);if(!site)continue;
  s.stations.push({id:s.nextId++,team:owner,corridor:c.id,x:Math.round(site.x*10)/10,z:Math.round(site.z*10)/10,stage:0,form:FORMS[hash32('waystation-form',g.state.seed,owner)%4],hp:1,built:0,store:{food:0,wood:0},water:site.water,visits:0,nights:0,sheltered:0,income:0,raided:0,lastRaidAt:-1e9});
 }
 for(const k of Object.keys(s.sustain))if(!live.has(k))delete s.sustain[k];
}

function eligibleCrew(g:Game,u:Unit,team:number,x:number,z:number){
 return u.team===team&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!u.boat&&!hasTaskCommitment(u)&&!u.envoy&&!u.visit&&!u.trade&&!u.scout&&!u.expedition&&!u.emergency&&
  (u.order==='idle'||u.order==='hold')&&(u.carry||0)===0&&Math.hypot(u.x-x,u.z-z)<600&&connectedForUnit(g,u,x,z);
}
function release(g:Game,s:Station){
 const id=s.project?.crewId;if(id===undefined)return;
 const u=g.state.units.find(p=>p.id===id);if(u&&u.hp>0&&u.workReason?.startsWith('Raising')){u.order='idle';u.stationOnArrival=false;u.workReason='Finished work on the road';}
 if(s.project)s.project.crewId=undefined;
}
function work(g:Game,dt:number){
 const s=state(g),R=WAYSTATION_RULES;
 for(const t of s.stations){
  if(t.stage>=3&&!t.project)continue;
  const c=routeCorridors(g).find(x=>x.id===t.corridor);
  if(!t.project){
   if(!tribeOk(g,t.team)){t.waiting='No society to build it';continue;}
   const to=(t.stage+1) as 1|2|3,spec=R.stages[to-1];
   if(!c){t.waiting='Route is no longer used';continue;}
   if(corridorWear(c)<spec.minWear||(s.sustain[String(c.id)]||0)<spec.sustain){t.waiting='Waiting for steadier traffic';continue;}
   if(t.visits<spec.visits){t.waiting='Waiting for more travellers to use it';continue;}
   const tr=g.tribe(t.team),cost=spec.cost as Record<string,number>;
   const need={wood:(cost.wood||0)+(cost.wood?R.reserve.wood:0),stone:(cost.stone||0)+(cost.stone?R.reserve.stone:0),food:(cost.food||0)+(cost.food?R.reserve.food:0)};
   if(tr.wood<need.wood){t.waiting=`Needs ${cost.wood} wood`;continue;}
   if((cost.stone||0)>0&&tr.stone<need.stone){t.waiting=`Needs ${cost.stone} stone`;continue;}
   if((cost.food||0)>0&&tr.food<need.food){t.waiting=`Needs ${cost.food} food`;continue;}
   g.spend(t.team,cost);
   t.project={to,labour:0,need:spec.labour,started:g.state.time};t.waiting=undefined;
  }
  const p=t.project!;
  let crew=p.crewId!==undefined?g.state.units.find(u=>u.id===p.crewId&&u.hp>0&&u.team===t.team):undefined;
  if(!crew){
   p.crewId=undefined;
   crew=g.state.units.filter(u=>eligibleCrew(g,u,t.team,t.x,t.z)).sort((a,b)=>Math.hypot(a.x-t.x,a.z-t.z)-Math.hypot(b.x-t.x,b.z-t.z)||a.id-b.id)[0];
   if(!crew){t.waiting='No spare hands to build it';continue;}
   p.crewId=crew.id;
  }
  t.waiting=undefined;
  if(Math.hypot(crew.x-t.x,crew.z-t.z)<5){
   crew.order='hold';crew.vx=0;crew.vz=0;crew.workReason=`Raising a ${stationLabel({stage:p.to,form:t.form}).toLowerCase()} on the road`;
   p.labour+=dt;
   if(p.labour>=p.need){
    release(g,t);t.stage=p.to;t.project=undefined;t.hp=1;t.built=g.state.time;
    if(t.stage===2)t.store.wood+=6;
    if(t.stage===3)t.store.food+=Math.min(30,R.stages[2].store);
    if(t.team===0)g.banner(`A ${stationLabel(t).toLowerCase()} now stands on the long road.`,5);
   }
  }else if(!(crew.order==='move'&&crew.stationOnArrival&&Math.hypot(crew.tx-t.x,crew.tz-t.z)<3)){
   if(crew.order==='idle'||crew.order==='hold'||crew.order==='move'){crew.order='move';crew.tx=t.x;crew.tz=t.z;crew.stationOnArrival=true;crew.workReason=`Raising a ${stationLabel({stage:p.to,form:t.form}).toLowerCase()} on the road`;}
   else{p.crewId=undefined;}
  }
 }
}

/* ------------------------------------------------------------------ use by travellers, raiders */
const present=new WeakMap<Game,Map<string,number>>();
const dwell=new WeakMap<Game,Map<string,number>>();
const sleptAt=new WeakMap<Game,Map<string,number>>();
/** One displayed 24-hour cycle in simulation seconds (1800 s year / 32 days x the 24x clock slowdown). */
const VISIBLE_DAY_SECONDS=1800/32*24;
function use(g:Game,dt:number){
 const s=state(g),R=WAYSTATION_RULES;if(!s.stations.some(t=>t.stage>=1))return;
 let seen=present.get(g);if(!seen)present.set(g,seen=new Map());
 let held=dwell.get(g);if(!held)dwell.set(g,held=new Map());
 let slept=sleptAt.get(g);if(!slept)sleptAt.set(g,slept=new Map());
 const bad=['rain','storm','frost','flood'].includes(g.state.weather),night=g.isNight(),now=g.state.time;
 for(const u of g.state.units){
  if(u.hp<=0||u.boat)continue;
  for(const t of s.stations){
   if(t.stage<1)continue;
   const d=Math.hypot(u.x-t.x,u.z-t.z);
   if(enemy(g,u.team,t.team)){
    const key=`${u.id}:${t.id}`;
    if(d<R.raidRadius){const h=(held.get(key)||0)+dt;held.set(key,h);if(h>=R.raidSeconds){held.set(key,0);plunder(g,t,u);}}else if(held.has(key))held.delete(key);
    continue;
   }
   if(d>R.usageRadius||!friend(g,u.team,t.team)||!(routineTraveller(u)||u.order==='move'))continue;
   const key=`${u.id}:${t.id}`,last=seen.get(key);
   const arrival=last===undefined||now-last>60;seen.set(key,now);
   const spec=R.stages[t.stage-1];
   if(arrival){t.visits++;
    if(u.team!==t.team&&t.stage>=2&&g.tribe(u.team).food>=40){g.spend(u.team,{food:R.tollFood});g.tribe(t.team).food+=R.tollFood;t.income+=R.tollFood;}
   }
   // overnight rest and weather shelter
   const rate=spec.rest*(night||bad?2.2:1);
   if((u.fatigue||0)>0)u.fatigue=Math.max(0,(u.fatigue||0)-rate*dt*6);
   if(night){const idx=Math.floor(now/VISIBLE_DAY_SECONDS);if(slept.get(key)!==idx){slept.set(key,idx);t.nights++;}}
   if(bad)t.sheltered+=dt;
   if(t.stage>=2){
    if((u.thirstSeconds||0)>0&&t.water)u.thirstSeconds=Math.max(0,(u.thirstSeconds||0)-dt*3);
    if((u.hunger||0)>25&&t.store.food>=.5){const take=Math.min(t.store.food,.35*dt);t.store.food-=take;u.hunger=Math.max(0,(u.hunger||0)-take*40);}
   }
  }
 }
 // Keeping the store: moves real food from the owner's stock when it has plenty.
 for(const t of s.stations){
  if(t.stage<2)continue;
  const cap=R.stages[t.stage-1].store,tr=g.tribe(t.team);
  if(tribeOk(g,t.team)&&t.store.food<cap*.5&&tr.food>R.restockAbove){const n=Math.min(R.restockFood,cap-t.store.food);g.spend(t.team,{food:n});t.store.food+=n;}
 }
}
function plunder(g:Game,t:Station,u:Unit){
 const loot=t.store.food,wood=t.store.wood,tr=g.tribe(u.team);
 if(tr){tr.food+=loot;tr.wood+=wood;}
 t.store.food=0;t.store.wood=0;t.raided++;t.lastRaidAt=g.state.time;t.hp-=WAYSTATION_RULES.raidDamage;
 if(t.hp<=0){release(g,t);t.stage=Math.max(0,t.stage-1) as 0|1|2|3;t.hp=1;t.project=undefined;t.waiting='Raided and burned back';}
 if(t.team===0)g.banner(`Raiders plundered the ${stationLabel(t).toLowerCase()} on the road.`,5);
}

export function tickWaystations(g:Game,dt:number){
 if(!waystationsEnabled(g)||!routeCorridors(g).length&&!st(g).waystations?.stations.length)return;
 const s=state(g);s.clock.plan+=dt;s.clock.work+=dt;s.clock.use+=dt;
 if(s.clock.plan>=WAYSTATION_RULES.planEvery){s.clock.plan=0;plan(g);}
 if(s.clock.work>=WAYSTATION_RULES.workEvery){const d=s.clock.work;s.clock.work=0;work(g,d);}
 if(s.clock.use>=1){const d=s.clock.use;s.clock.use=0;use(g,d);}
 // A route that vanished takes its unbuilt sites with it; built ones remain (people still use the hut).
 s.stations=s.stations.filter(t=>t.stage>=1||t.project||routeCorridors(g).some(c=>c.id===t.corridor));
}

/* ------------------------------------------------------------------ read model for the world pin and the Hearth card */
export type StationView={id:number;team:number;x:number;z:number;stage:number;label:string;form:StationForm;hp:number;progress:number|null;waiting?:string;food:number;visits:number;nights:number;income:number;raided:number;water:boolean};
export function stationViews(g:Game,team=0):StationView[]{
 return stationsOf(g).filter(t=>t.team===team||g.exploredAt(t.x,t.z)).filter(t=>t.stage>=1||t.project).map(t=>({id:t.id,team:t.team,x:t.x,z:t.z,stage:t.stage,label:t.project&&t.stage===0?'Raising a lean-to':stationLabel(t),form:t.form,hp:t.hp,
  progress:t.project?Math.min(1,t.project.labour/t.project.need):null,waiting:t.waiting,food:Math.round(t.store.food*10)/10,visits:t.visits,nights:t.nights,income:t.income,raided:t.raided,water:t.water}));
}

export function validWaystations(s:any):boolean{
 const w=s?.waystations;if(w===undefined)return true;
 const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
 if(!w||typeof w!=='object'||w.version!==1||typeof w.enabled!=='boolean'||!Number.isSafeInteger(w.nextId)||w.nextId<1||!Array.isArray(w.stations)||w.stations.length>WAYSTATION_RULES.maxTotal||!w.sustain||typeof w.sustain!=='object'||!w.clock)return false;
 const ids=new Set();
 for(const t of w.stations){
  if(!t||!Number.isSafeInteger(t.id)||t.id<1||ids.has(t.id)||!Number.isSafeInteger(t.team)||t.team<0||t.team>16||!Number.isSafeInteger(t.corridor)||!n(t.x)||!n(t.z)||![0,1,2,3].includes(t.stage)||!FORMS.includes(t.form)||!n(t.hp)||t.hp<0||t.hp>1)return false;
  ids.add(t.id);
  if(!t.store||!n(t.store.food)||t.store.food<0||!n(t.store.wood)||t.store.wood<0)return false;
  for(const k of ['visits','nights','sheltered','income','raided'])if(!n(t[k])||t[k]<0)return false;
  if(t.project&&(![1,2,3].includes(t.project.to)||!n(t.project.labour)||t.project.labour<0||!n(t.project.need)||t.project.need<=0))return false;
 }
 return true;
}
