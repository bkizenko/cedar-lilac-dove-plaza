import type {Game} from './sim';
import type {GameState,Unit} from './types';
import {hasTaskCommitment} from './workCommitments';
import {isDependent} from './settlement';
import {supplyApproach,supplyReached} from './campAnchor';
export const SURVIVAL_RULES={version:1,waterLitersPerPersonSecond:.008,startingWaterSeconds:600,
 waterWarningSeconds:180,autoCollectBelowSeconds:240,waterTripLiters:24,collectSeconds:12,
 sourceSearchMeters:900,thirstGraceSeconds:180,thirstFatalExposureSeconds:1800,
 coldThresholdCelsius:6,fireWarmthCelsius:9,shelterWarmthCelsius:5,fireRadiusMeters:48,
 woodPerPersonColdSecond:.003,coldGraceSeconds:180,coldFatalExposureSeconds:2400,
 recoverySecondsPerSecond:3} as const;
export type SurvivalStock={waterLiters:number;waterConsumedLiters:number;waterDeliveredLiters:number;waterLostLiters:number;fuelBurnedWood:number;waterShortageSeconds:number;coldExposurePersonSeconds:number};
export type WaterWork={sourceX:number;sourceZ:number;bankX:number;bankZ:number;phase:'outbound'|'collecting'|'returning';progressSeconds:number;liters:number;paused?:boolean};
const emptyStock=(waterLiters=0):SurvivalStock=>({waterLiters,waterConsumedLiters:0,waterDeliveredLiters:0,waterLostLiters:0,fuelBurnedWood:0,waterShortageSeconds:0,coldExposurePersonSeconds:0});
const residents=(g:Game,team:number)=>g.state.units.filter(u=>u.team===team&&u.hp>0&&!u.expedition&&!u.visit);
const burningFires=new WeakMap<Game,Set<number>>();
export const survivalFireActive=(g:Game,team=0)=>g.state.survivalVersion===1&&(burningFires.get(g)?.has(team)??false);
export function initializeSurvival(g:Game){
 burningFires.delete(g);
 g.state.survivalVersion=1;autoCheck.delete(g);
 for(const t of g.state.tribes)t.survival=emptyStock(residents(g,t.id).length*SURVIVAL_RULES.waterLitersPerPersonSecond*SURVIVAL_RULES.startingWaterSeconds);
}
export function ambientTemperature(g:Game){
 // Match the game's displayed rounded ambient temperature, including night.
 const display=g.clockState().weather.match(/(-?\d+)°C/);return display?Number(display[1]):10;
}
function sheltered(g:Game,u:Unit){
 // Shelter benefit belongs to an actual completed building near this resident;
 // remote housing does not heat somebody on a distant expedition.
 return g.state.buildings.some(b=>b.team===u.team&&g.finished(b)&&['hut','townhall','keep'].includes(b.type)&&
  (u.shelterId===b.id||Math.hypot(u.x-b.x,u.z-b.z)<Math.max(b.w,b.d)*.5+4));
}
function fireDemand(g:Game,team:number,temp:number){return temp<SURVIVAL_RULES.coldThresholdCelsius?residents(g,team).length*SURVIVAL_RULES.woodPerPersonColdSecond:0;}
export function survivalStatus(g:Game,team=0){
 const t=g.tribe(team),stock=t?.survival,enabled=g.state.survivalVersion===1&&!!stock,people=residents(g,team),temp=ambientTemperature(g);
 const demand=people.length*SURVIVAL_RULES.waterLitersPerPersonSecond,fuelDemand=fireDemand(g,team,temp);
 const water=stock?.waterLiters??0,fuel=t?.wood??0,waterSeconds=demand?water/demand:Infinity,fuelSeconds=fuelDemand?fuel/fuelDemand:Infinity;
 const coldResidents=people.filter(u=>(u.coldSeconds??0)>0).length,waterWorkers=people.filter(u=>u.waterWork&&!u.waterWork.paused).length;
 const warnings:string[]=[];
 if(enabled){
  if(waterSeconds<SURVIVAL_RULES.waterWarningSeconds)warnings.push(water<=0?'Drinking water empty — send a water carrier':'Drinking water low — collect from freshwater');
  if(temp<SURVIVAL_RULES.coldThresholdCelsius&&fuelSeconds<180)warnings.push(fuel<=0?'No firewood — gather timber before exposure worsens':'Firewood low — gather timber for warmth');
  if(coldResidents)warnings.push(`${coldResidents} residents recovering from cold exposure — shelter and firewood help`);
 }
 return {enabled,water,waterSeconds,fuel,fuelSeconds,coldResidents,warnings,waterWorkers,
  fuelWorkers:people.filter(u=>u.order==='gather'&&u.job==='wood').length,temp,waterDemandLitersPerSecond:demand,
  fuelDemandWoodPerSecond:fuelDemand,sheltered:people.filter(u=>sheltered(g,u)).length,metrics:stock};
}
function free(g:Game,u:Unit,automatic=false){
 return u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.militia&&!u.emergency&&!u.boat&&!u.recalled&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&!u.foundingJourney&&!u.tributeJourney&&!u.resting&&
 !u.buildOrder&&u.drill==null&&!u.haulage&&u.carry===0&&!hasTaskCommitment(u,'waterWork')&&(!u.waterWork||u.waterWork.paused)&&
 (automatic?(!u.jobLock&&['idle','gather'].includes(u.order)):['idle','hold','gather','return','move'].includes(u.order));
}
type Source={sourceX:number;sourceZ:number;bankX:number;bankZ:number};
function sourceFor(g:Game,u:Unit):Source|null{
 const sources:{x:number;z:number}[]=[];
 for(const river of g.world.rivers)for(let i=1;i<river.pts.length-2;i++){
  const a=river.pts[i-1],b=river.pts[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/8));
  for(let j=0;j<steps;j++)sources.push({x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps});
 }
 for(const lake of g.world.features??[])if(lake.kind==='lake')sources.push(lake);
 // Elevated lakes can be wider than the bank search radius. Inspect their
 // actual irregular shoreline rather than treating the lake centre as a bank.
 for(const body of g.world.waterBodies??[])if(body.kind==='lake'&&body.shoreline){
  const stride=Math.max(1,Math.floor(body.shoreline.length/16));
  for(let i=0;i<body.shoreline.length;i+=stride){const p=body.shoreline[i];sources.push({x:body.x+(p.x-body.x)*.94,z:body.z+(p.z-body.z)*.94});}
 }
 const candidates:Source[]=[];
 for(const p of sources){
  if(Math.hypot(p.x-u.x,p.z-u.z)>SURVIVAL_RULES.sourceSearchMeters)continue;

  if(g.height(p.x,p.z)>g.waterAt(p.x,p.z)+.25)continue;
  for(const d of [8,16,24,32])for(let i=0;i<12;i++){
   const a=i*Math.PI/6,x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;
   if(u.team===0&&!g.exploredAt(x,z))continue;
   if(!g.walkable(x,z)||!g.workBoard.connected(g,u.x,u.z,x,z))continue;
   // Collection is physically beside fresh water, rather than from a distant
   // dry waypoint that happens to be close to a river's metadata.
   const reach=Array.from({length:8},(_,j)=>{const a=j*Math.PI/4;return g.height(x+Math.cos(a)*5,z+Math.sin(a)*5)<g.waterAt(x+Math.cos(a)*5,z+Math.sin(a)*5)+.2;}).some(Boolean);
   if(reach)candidates.push({sourceX:p.x,sourceZ:p.z,bankX:x,bankZ:z});
  }
 }
 candidates.sort((a,b)=>Math.hypot(a.bankX-u.x,a.bankZ-u.z)-Math.hypot(b.bankX-u.x,b.bankZ-u.z));return candidates[0]??null;
}
function proposal(g:Game,team:number,automatic=false){
 if(g.state.survivalVersion!==1||!g.tribe(team)?.survival)return {reason:'This saved village uses the previous survival rules'};
 const adults=[...g.state.units].filter(u=>u.team===team&&free(g,u,automatic)).sort((a,b)=>Number(b.selected)-Number(a.selected));
 if(!adults.length)return {reason:'Choose an empty-handed adult without a reserved project'};
 for(const u of adults){if(u.waterWork?.paused)return {u,source:null,reason:null};const source=sourceFor(g,u);if(source)return {u,source,reason:null};}
 return {reason:'Explore a freshwater bank reachable by land before collecting water'};
}
const issueCache=new WeakMap<Game,Map<number,{time:number;reason:string|null}>>();
export function waterCollectionIssue(g:Game,team=0){
 let cache=issueCache.get(g);if(!cache){cache=new Map();issueCache.set(g,cache);}
 const prior=cache.get(team);if(prior&&g.state.time>=prior.time&&g.state.time-prior.time<1)return prior.reason;
 const reason=proposal(g,team).reason??null;cache.set(team,{time:g.state.time,reason});return reason;
}
export function pauseWaterCollection(u:Unit){if(u.waterWork)u.waterWork.paused=true;}
export function validSurvivalState(state:GameState):boolean{
 if(state.survivalVersion!==undefined&&state.survivalVersion!==1)return false;
 const finite=(n:unknown,max=1e12)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 for(const tr of state.tribes){
  if(tr.survival!==undefined){if(!tr.survival||typeof tr.survival!=='object')return false;
   for(const key of ['waterLiters','waterConsumedLiters','waterDeliveredLiters','waterLostLiters','fuelBurnedWood','waterShortageSeconds','coldExposurePersonSeconds'] as const)if(!finite(tr.survival[key]))return false;}
  if(state.survivalVersion===1&&!tr.survival)return false;
 }
 for(const u of state.units){
  if(u.thirstSeconds!==undefined&&!finite(u.thirstSeconds))return false;if(u.coldSeconds!==undefined&&!finite(u.coldSeconds))return false;
  const w=u.waterWork;if(w!==undefined){if(!w||typeof w!=='object'||!['outbound','collecting','returning'].includes(w.phase))return false;
   for(const key of ['sourceX','sourceZ','bankX','bankZ'] as const)if(typeof w[key]!=='number'||!Number.isFinite(w[key])||Math.abs(w[key])>(state.worldOptions?.size??1040)/2+32)return false;
   if(!finite(w.liters,SURVIVAL_RULES.waterTripLiters)||!finite(w.progressSeconds,SURVIVAL_RULES.collectSeconds)||w.paused!==undefined&&typeof w.paused!=='boolean')return false;
   if(w.phase!=='returning'&&w.liters!==0)return false;
  }
 }
 return true;
}
export function beginWaterCollection(g:Game,team=0,automatic=false){
 issueCache.delete(g);const p=proposal(g,team,automatic);if(p.reason||!p.u)return {accepted:false,reason:p.reason??'No water carrier available'};
 const u=p.u;
 if(!u.waterWork){g.interruptMission(u);u.waterWork={...p.source!,phase:'outbound',progressSeconds:0,liters:0};}
 else u.waterWork.paused=false;
 u.order='hold';u.node=null;u.target=null;g.invalidateRoute(u);g.workBoard.reset();
 u.workReason='Collecting drinking water from a freshwater bank';return {accepted:true,reason:'Water carrier dispatched',actorId:u.id};
}
/** Credits only cargo that physically reached a real supply entrance. */
export function deliverWaterCargo(g:Game,u:Unit):number{
 const work=u.waterWork,stock=g.tribe(u.team)?.survival;if(!work||work.liters<=0||!stock)return 0;
 const drop=g.nearestDrop(u.x,u.z,u.team),spot=drop?supplyApproach(g,u,drop):null;
 if(!drop||!spot||!supplyReached(g,u,drop,spot))return 0;
 const liters=work.liters;stock.waterLiters+=liters;stock.waterDeliveredLiters+=liters;u.waterWork=undefined;return liters;
}
export function waterCollectionAI(g:Game,u:Unit,dt:number){
 const w=u.waterWork;
 if(!w||w.paused||u.order!=='hold'||u.emergency||g.state.survivalVersion!==1)return false;
 if(w.phase==='returning'){
  const drop=g.nearestDrop(u.x,u.z,u.team),spot=drop?supplyApproach(g,u,drop):null;
  if(!drop||!spot){u.workReason='Water cargo waiting for a reachable camp or store';return true;}
  u.tx=spot.x;u.tz=spot.z;if(!supplyReached(g,u,drop,spot)){g.steer(u,dt);u.workReason=`Returning ${w.liters.toFixed(0)} L of drinking water`;return true;}
  deliverWaterCargo(g,u);u.order='idle';u.workReason='Drinking water delivered';g.invalidateRoute(u);g.workBoard.reset();return true;
 }
 if(!g.walkable(w.bankX,w.bankZ)||(u.stuckT??0)>30||g.height(w.sourceX,w.sourceZ)>g.waterAt(w.sourceX,w.sourceZ)+.25){w.paused=true;u.order='idle';u.workReason='Water source dry, flooded or unreachable — collection paused';return true;}
 u.tx=w.bankX;u.tz=w.bankZ;
 if(Math.hypot(u.x-w.bankX,u.z-w.bankZ)>1.5){g.steer(u,dt);u.workReason='Walking to a freshwater bank';return true;}
 w.phase='collecting';w.progressSeconds=Math.min(SURVIVAL_RULES.collectSeconds,w.progressSeconds+dt);u.workReason=`Filling water vessels · ${Math.min(100,Math.floor(w.progressSeconds/SURVIVAL_RULES.collectSeconds*100))}%`;
 if(w.progressSeconds>=SURVIVAL_RULES.collectSeconds){w.liters=SURVIVAL_RULES.waterTripLiters;w.phase='returning';g.invalidateRoute(u);}
 return true;
}
const autoCheck=new WeakMap<Game,number>();
export function tickSurvival(g:Game,dt:number){
 if(g.state.survivalVersion!==1||dt<=0)return;
 const temp=ambientTemperature(g),rules=SURVIVAL_RULES;
 const activeFires=new Set<number>();burningFires.set(g,activeFires);
 const reconcileLost=()=>{for(const u of g.state.units)if(u.hp<=0&&u.waterWork){
  const stock=g.tribe(u.team)?.survival;if(stock)stock.waterLostLiters+=u.waterWork.liters;
  u.waterWork=undefined;
 }};reconcileLost();
 for(const tr of g.state.tribes){
  const stock=tr.survival;if(!stock)continue;
  const people=residents(g,tr.id);if(!people.length)continue;
  const demand=people.length*rules.waterLitersPerPersonSecond*dt,used=Math.min(stock.waterLiters,demand),shortfall=demand>0?1-used/demand:0;
  stock.waterLiters=Math.max(0,stock.waterLiters-used);stock.waterConsumedLiters+=used;stock.waterShortageSeconds+=dt*shortfall;
  const fuelNeeded=fireDemand(g,tr.id,temp)*dt,fuel=Math.min(tr.wood,fuelNeeded),fireFraction=fuelNeeded?fuel/fuelNeeded:0;
  if(fuel>0)activeFires.add(tr.id);
  tr.wood=Math.max(0,tr.wood-fuel);stock.fuelBurnedWood+=fuel;
  const home=g.campOf(tr.id);
  for(const u of people){
   const beforeThirst=u.thirstSeconds??0;u.thirstSeconds=Math.max(0,beforeThirst+dt*(shortfall>0?shortfall:-rules.recoverySecondsPerSecond));
   const thirstDamage=Math.max(0,u.thirstSeconds-rules.thirstGraceSeconds)-Math.max(0,beforeThirst-rules.thirstGraceSeconds);
   if(thirstDamage>0)u.hp-=thirstDamage*u.maxHp/rules.thirstFatalExposureSeconds;
   const fire=Math.hypot(u.x-home.x,u.z-home.z)<=rules.fireRadiusMeters?fireFraction:0;
   const effective=temp+fire*rules.fireWarmthCelsius+(sheltered(g,u)?rules.shelterWarmthCelsius:0);
   const exposure=Math.max(0,Math.min(2,(rules.coldThresholdCelsius-effective)/6)),before=u.coldSeconds??0;
   u.coldSeconds=Math.max(0,before+dt*(exposure>0?exposure:-rules.recoverySecondsPerSecond));stock.coldExposurePersonSeconds+=dt*exposure;
   const coldDamage=Math.max(0,u.coldSeconds-rules.coldGraceSeconds)-Math.max(0,before-rules.coldGraceSeconds);
   if(coldDamage>0)u.hp-=coldDamage*u.maxHp/rules.coldFatalExposureSeconds;
  }
 }
 reconcileLost();
 // At most one ordinary carrier per society; automatic survival execution never
 // overrides a direct order or takes an actor from paid/reserved work.
 if(g.state.time>=(autoCheck.get(g)??0)){
  autoCheck.set(g,g.state.time+5);
  for(const tr of g.state.tribes){const status=survivalStatus(g,tr.id);if(status.enabled&&status.waterSeconds<rules.autoCollectBelowSeconds&&!status.waterWorkers)beginWaterCollection(g,tr.id,true);}
 }
}
