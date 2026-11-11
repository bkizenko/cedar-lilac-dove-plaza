import type {CommunityHandover} from './communityHandoverTypes';
import type {Game} from './sim';
import type {GameState,Unit,Building} from './types';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {workRuntime} from './workRuntime';
import {craftingBenches,craftingQueue} from './crafting';
import {supplyDrops,supplyApproach} from './campAnchor';
/** Adjustable gameplay units, not claims about historical construction costs. */
export const SIEGE_RAM_RULES={version:1,maximumAssets:32,wood:24,cordage:4,workSeconds:150,packetWood:8,packetCordage:2,minimumCrew:2,maximumCrew:4,crewRadius:2.2,impactReach:.8,chargeSeconds:8,damage:36,hp:120,pace:.55,packetPace:.75} as const;
type Materials={wood:number;cordage:number};
type Point={x:number;z:number};
type Phase='collecting'|'carrying'|'assembling'|'ready'|'moving'|'striking'|'paused'|'broken';
export type SiegeRamAsset={version:1;id:number;team:number;workplaceId:number;makerId?:number;lastMakerId?:number;crewIds:number[];lastCrewIds?:number[];targetId?:number;approach?:Point;trail?:Point[];phase:Phase;resumePhase?:Exclude<Phase,'paused'|'broken'>;x:number;z:number;hp:number;progress:number;charge:number;createdAt:number;paid:Materials;uncollected:Materials;delivered:Materials;source:Point&{cacheId?:number;custodyTeam:number};packet?:Materials&Point&{carrierId?:number;custodyTeam:number};blockedReason:string;impacts:number};
export type SiegeRamState={version:1;assets:SiegeRamAsset[]};
type RamUnit=Unit&{siegeRamId?:number};
type RamGameState=GameState&{siegeRams?:SiegeRamState};
const state=(g:Game)=>(g.state as RamGameState).siegeRams??={version:1,assets:[]};
const assets=(g:Game)=>(g.state as RamGameState).siegeRams?.assets||[];
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const people=(g:Game)=>g.state.units as RamUnit[];
function custody(u:Unit){return u.prisoner&&u.prisoner.phase!=='released'?u.prisoner.captorTeam:u.team;}
function own(g:Game,u:RamUnit,team:number){return u.team===team&&u.hp>0&&(!u.prisoner||u.prisoner.phase==='released')&&!isDependent(g,u)&&!u.boat&&!u.emergency&&!u.recalled;}
function free(g:Game,u:RamUnit,team:number){return own(g,u,team)&&!u.siegeRamId&&!hasTaskCommitment(u)&&!u.jobLock&&!u.carry&&!Object.values(u.itemCargo||{}).some(n=>n>0)&&!u.buildOrder&&!u.resting&&!u.shelterId&&['idle','hold','gather'].includes(u.order);}
function bind(g:Game,u:RamUnit,a:SiegeRamAsset){u.siegeRamId=a.id;u.job=null;u.node=null;u.target=null;u.order='hold';g.invalidateRoute(u);}
function claim(g:Game,a:SiegeRamAsset){const jobs=workRuntime(g),id=`siege-ram:${a.id}`,existing=jobs.job(id);const actors=a.progress<SIEGE_RAM_RULES.workSeconds?[a.makerId!]:a.crewIds;if(!existing)jobs.propose({id,kind:'siegeRam',owner:a.team,actors,target:a.workplaceId});const b=workshop(g,a),requests=a.progress<SIEGE_RAM_RULES.workSeconds&&b?[{key:`craft:${b.id}:bench`,amount:1,capacity:Math.max(0,craftingBenches(b)-craftingQueue(g,b).filter(u=>!u.haulageWork&&!(u as RamUnit).siegeRamId).length)}]:[];return jobs.amend(id,actors,requests);}
function release(g:Game,a:SiegeRamAsset){if(a.makerId!==undefined)a.lastMakerId=a.makerId;if(a.crewIds.length)a.lastCrewIds=[...a.crewIds];a.makerId=undefined;a.crewIds=[];const jobs=workRuntime(g),id=`siege-ram:${a.id}`;jobs.finish(id);jobs.forget(id);for(const u of people(g))if(u.siegeRamId===a.id){delete u.siegeRamId;if(u.order==='hold'||u.order==='move')u.order='idle';u.workReason='Siege duty ended';g.invalidateRoute(u);}}
function walk(g:Game,u:Unit,p:Point,dt:number){u.order='move';u.tx=p.x;u.tz=p.z;g.steer(u,dt);}
function workshop(g:Game,a:SiegeRamAsset){return g.state.buildings.find(b=>b.id===a.workplaceId&&b.team===a.team&&b.type==='workshop'&&g.finished(b)&&b.hp>0);}
function drySegment(g:Game,u:Unit,from:Point,to:Point){const steps=Math.max(1,Math.ceil(distance(from,to)/.4));let probe={...u,...from,y:g.height(from.x,from.z)};for(let i=1;i<=steps;i++){const f=i/steps,x=from.x+(to.x-from.x)*f,z=from.z+(to.z-from.z)*f;if(g.height(x,z)<=g.waterAt(x,z)+.3||!g.canStep(probe,x,z))return false;probe={...probe,x,z,y:g.height(x,z)};}return true;}
function targetIssue(g:Game,a:SiegeRamAsset,b:Building|undefined){return !b||b.hp<=0||!g.finished(b)||!['palisade','stonewall','gate'].includes(b.type)?'Choose an existing completed wall or gate.':!g.isFoe(a.team,b.team)?'The target is no longer an enemy fortification.':null;}
export function beginSiegeRam(g:Game,workplaceId:number,makerId:number){
 const b=g.state.buildings.find(b=>b.id===workplaceId&&b.type==='workshop'&&b.hp>0&&g.finished(b)),u=people(g).find(u=>u.id===makerId);
 if(!b||!u||!free(g,u,b.team)||assets(g).length>=SIEGE_RAM_RULES.maximumAssets)return {accepted:false,reason:'Choose an available adult and finished crafting shelter.'};
 if(assets(g).some(a=>a.workplaceId===b.id&&a.progress<SIEGE_RAM_RULES.workSeconds&&a.phase!=='broken'))return {accepted:false,reason:'Finish or resume this shelter’s existing paid ram.'};
 const source=supplyDrops(g,b.team).map(d=>({d,p:supplyApproach(g,u,d)})).find(({p})=>p&&g.workBoard.connected(g,p.x,p.z,b.x,b.z));
 const entrance=g.interactionSpot(u,b),t=g.tribe(b.team);
 if(!source?.p||!entrance||t.wood<SIEGE_RAM_RULES.wood||(t.items?.cordage||0)<SIEGE_RAM_RULES.cordage)return {accepted:false,reason:'Need reachable materials: 24 timber and 4 delivered cordage.'};
 const a:SiegeRamAsset={version:1,id:g.id(),team:b.team,workplaceId:b.id,makerId:u.id,crewIds:[],phase:'collecting',x:entrance.x,z:entrance.z,hp:SIEGE_RAM_RULES.hp,progress:0,charge:0,createdAt:g.state.time,paid:{wood:SIEGE_RAM_RULES.wood,cordage:SIEGE_RAM_RULES.cordage},uncollected:{wood:SIEGE_RAM_RULES.wood,cordage:SIEGE_RAM_RULES.cordage},delivered:{wood:0,cordage:0},source:{x:source.p.x,z:source.p.z,custodyTeam:b.team,...(source.d.kind==='camp'?{}:{cacheId:source.d.id})},blockedReason:'',impacts:0};
 if(!claim(g,a)){workRuntime(g).finish(`siege-ram:${a.id}`,true);workRuntime(g).forget(`siege-ram:${a.id}`);return {accepted:false,reason:'The maker or physical shelter benches are already reserved.'};}
 t.wood-=SIEGE_RAM_RULES.wood;(t.items??={}).cordage=(t.items?.cordage||0)-SIEGE_RAM_RULES.cordage;state(g).assets.push(a);bind(g,u,a);return {accepted:true,reason:'Timber and cordage reserved; the maker will carry them to the shelter.',id:a.id};
}
export function pauseSiegeRam(g:Game,id:number,reason='Siege work paused by direct order.'){
 const a=assets(g).find(a=>a.id===id);if(!a||a.phase==='broken'||a.phase==='paused')return false;
 a.resumePhase=a.phase;a.phase='paused';a.charge=0;a.blockedReason=reason;release(g,a);return true;
}
export function interruptSiegeRam(g:Game,u:Unit){const id=(u as RamUnit).siegeRamId;if(id!==undefined)pauseSiegeRam(g,id);}
export function resumeSiegeRam(g:Game,id:number,makerId:number){
 const a=assets(g).find(a=>a.id===id),u=people(g).find(u=>u.id===makerId);if(!a||a.phase!=='paused'||a.progress>=SIEGE_RAM_RULES.workSeconds||!u||!free(g,u,a.team)||!workshop(g,a))return false;
 a.makerId=u.id;a.crewIds=[];if(!claim(g,a))return false;a.phase=a.packet?'carrying':a.uncollected.wood||a.uncollected.cordage?'collecting':'assembling';a.resumePhase=undefined;a.blockedReason='';bind(g,u,a);return true;
}
export function deploySiegeRam(g:Game,id:number,targetId:number,crewIds:number[]){
 const a=assets(g).find(a=>a.id===id),b=g.state.buildings.find(b=>b.id===targetId),ids=[...new Set(crewIds)],crew=ids.map(id=>people(g).find(u=>u.id===id));
 if(!a||a.hp<=0||a.progress<SIEGE_RAM_RULES.workSeconds||!['ready','paused'].includes(a.phase)||targetIssue(g,a,b)||ids.length<2||ids.length>SIEGE_RAM_RULES.maximumCrew||crew.some(u=>!u||!free(g,u,a.team)))return {accepted:false,reason:'A completed ram needs two to four available adults and an enemy wall or gate.'};
 if(crew.some(u=>!g.workBoard.connected(g,u!.x,u!.z,a.x,a.z))||crew.some(u=>!g.interactionSpot(u!,b!)))return {accepted:false,reason:'The real crew needs a dry route to the ram and target frontage.'};
 a.makerId=undefined;a.crewIds=ids;a.targetId=targetId;a.approach=g.interactionSpot(crew[0]!,b!)!;a.trail=[{x:crew[0]!.x,z:crew[0]!.z}];if(!claim(g,a))return {accepted:false,reason:'A crew member already owns another paid task.'};a.phase='moving';a.resumePhase=undefined;a.charge=0;a.blockedReason='';for(const u of crew)bind(g,u!,a);return {accepted:true,reason:'The crew will reach and move the existing ram.'};
}
export function siegeRamMovementMultiplier(g:Game,u:Unit){if(assets(g).some(a=>a.packet?.carrierId===u.id))return SIEGE_RAM_RULES.packetPace;return 1;}
export function siegeRamCarriedMaterials(g:Game,u:Unit){const packet=assets(g).find(a=>a.packet?.carrierId===u.id)?.packet;return packet?{wood:packet.wood,cordage:packet.cordage}:undefined;}
/** One body holds a finite packet. An interruption never refunds or recreates it. */
export function reconcileSiegeRams(g:Game){for(const a of assets(g)){
 if(a.packet?.carrierId!==undefined){const u=people(g).find(u=>u.id===a.packet!.carrierId);if(u){a.packet.x=u.x;a.packet.z=u.z;a.packet.custodyTeam=custody(u);}if(!u||u.hp<=0)delete a.packet.carrierId;}
 if(a.phase==='paused'||a.phase==='ready'||a.phase==='broken')continue;
 if(!claim(g,a)){pauseSiegeRam(g,a.id,'The real crew or shelter bench is reserved by another task.');continue;}
 const ids=a.progress<SIEGE_RAM_RULES.workSeconds?[a.makerId]:a.crewIds;
 if(ids.some(id=>{const u=people(g).find(u=>u.id===id);return !u||!own(g,u,a.team)||u.siegeRamId!==a.id;}))pauseSiegeRam(g,a.id,'A crew member is unavailable; paid materials and the ram remain in place.');
 }}
export function siegeRamAI(g:Game,u:Unit,elapsed:number){
 const a=assets(g).find(a=>a.id===(u as RamUnit).siegeRamId);if(!a||['paused','ready','broken'].includes(a.phase))return false;
 const dt=Math.max(0,Math.min(.5,elapsed));if(!own(g,u as RamUnit,a.team)){pauseSiegeRam(g,a.id,'A crew member cannot continue.');return false;}
 if(a.progress<SIEGE_RAM_RULES.workSeconds){
  if(a.makerId!==u.id)return false;const b=workshop(g,a);if(!b){pauseSiegeRam(g,a.id,'The original shelter is unavailable.');return true;}
  if(a.packet){const p=a.packet,carrier=p.carrierId===undefined?undefined:people(g).find(v=>v.id===p.carrierId&&v.hp>0);if(carrier){p.x=carrier.x;p.z=carrier.z;if(custody(carrier)!==a.team){pauseSiegeRam(g,a.id,'The paid packet is held by another community.');return true;}}
   if(p.carrierId!==u.id){if(distance(u,p)>1.5){walk(g,u,p,dt);u.workReason='Reaching the original paid ram materials';return true;}p.carrierId=u.id;p.custodyTeam=u.team;}
   const entrance=g.interactionSpot(u,b);if(!entrance){pauseSiegeRam(g,a.id,'Ram materials need a reachable shelter entrance.');return true;}
   a.phase='carrying';u.workReason='Carrying reserved timber and lashings';if(!g.buildingWorkReached(u,b)){walk(g,u,entrance,dt);return true;}
   a.delivered.wood+=p.wood;a.delivered.cordage+=p.cordage;delete a.packet;a.phase=a.uncollected.wood||a.uncollected.cordage?'collecting':'assembling';return true;
  }
  if(a.uncollected.wood||a.uncollected.cordage){if(a.source.custodyTeam!==a.team){pauseSiegeRam(g,a.id,'The remaining reserved materials are in another community’s custody.');return true;}a.phase='collecting';u.workReason='Collecting the ram’s reserved materials';if(distance(u,a.source)>1.5){walk(g,u,a.source,dt);return true;}
   const wood=Math.min(SIEGE_RAM_RULES.packetWood,a.uncollected.wood),cordage=Math.min(SIEGE_RAM_RULES.packetCordage,a.uncollected.cordage);a.uncollected.wood-=wood;a.uncollected.cordage-=cordage;a.packet={wood,cordage,carrierId:u.id,custodyTeam:u.team,x:u.x,z:u.z};a.phase='carrying';return true;
  }
  const entrance=g.interactionSpot(u,b);if(!entrance){pauseSiegeRam(g,a.id,'The ram bench is unreachable.');return true;}if(!g.buildingWorkReached(u,b)){walk(g,u,entrance,dt);return true;}
  u.order='hold';u.workReason='Lashing an exposed beam ram';a.phase='assembling';a.progress=Math.min(SIEGE_RAM_RULES.workSeconds,a.progress+dt);if(a.progress>=SIEGE_RAM_RULES.workSeconds){a.x=entrance.x;a.z=entrance.z;a.phase='ready';a.makerId=undefined;release(g,a);}return true;
 }
 const crew=a.crewIds.map(id=>people(g).find(p=>p.id===id&&own(g,p,a.team)&&p.siegeRamId===a.id));if(crew.some(p=>!p)||crew.length<2){pauseSiegeRam(g,a.id,'At least two actual crew are required.');return true;}
 const b=g.state.buildings.find(b=>b.id===a.targetId),issue=targetIssue(g,a,b);if(issue){a.phase='ready';a.targetId=undefined;a.crewIds=[];a.charge=0;a.blockedReason=issue;release(g,a);return true;}
 const front=a.approach;if(!front){pauseSiegeRam(g,a.id,'There is no reachable fortification frontage.');return true;}
 if(distance(u,a)>SIEGE_RAM_RULES.crewRadius){walk(g,u,a,dt);u.workReason='Joining the ram crew';return true;}
 if(g.height(a.x,a.z)<=g.waterAt(a.x,a.z)+.3){pauseSiegeRam(g,a.id,'The ram is not on usable dry ground.');return true;}
 if(u.id!==a.crewIds[0]){if(distance(a,front)<=SIEGE_RAM_RULES.impactReach&&!g.buildingWorkReached(u,b!))walk(g,u,front,dt);else if(distance(a,front)>SIEGE_RAM_RULES.impactReach&&distance(u,a)>.55)walk(g,u,a,dt);else u.order='hold';u.workReason='Staffing the beam ram';return true;}
 const staffed=crew.every(p=>distance(p!,a)<=SIEGE_RAM_RULES.crewRadius);
 if(!staffed){a.charge=0;u.order='hold';u.workReason='Waiting for the real ram crew';return true;}
 const d=distance(a,front);
 if(d>SIEGE_RAM_RULES.impactReach){a.phase='moving';a.charge=0;
  // Follow the helm's actual ground footsteps, including native detours. The
  // engine never snaps to a remote frontage or cuts a straight chord through it.
  if(distance(u,a)<1.15){const before={x:u.x,z:u.z};walk(g,u,front,dt);if(distance(before,u)>.015){const trail=a.trail??=[];if(trail.length>=128){pauseSiegeRam(g,a.id,'The ram crew needs to close its route gap.');return true;}trail.push({x:u.x,z:u.z});}}else u.order='hold';
  const trail=a.trail??=[];while(trail.length&&distance(a,trail[0])<.04)trail.shift();
  const waypoint=trail[0];if(waypoint){const gap=distance(a,waypoint),speed=Math.min(...crew.map(p=>g.travelSpeed(p!)))*SIEGE_RAM_RULES.pace,step=Math.min(gap,speed*dt),next={x:a.x+(waypoint.x-a.x)*step/gap,z:a.z+(waypoint.z-a.z)*step/gap};
   if(!drySegment(g,u,a,next)){pauseSiegeRam(g,a.id,'The ram needs continuous dry ground; clear a crossing or route.');return true;}
   a.x=next.x;a.z=next.z;
  }
  u.workReason='Moving the staffed beam ram';return true;
 }
 if(!crew.every(p=>g.buildingWorkReached(p!,b!))){a.charge=0;a.blockedReason='The real crew must reach the actual fortification frontage.';if(!g.buildingWorkReached(u,b!))walk(g,u,front,dt);else u.order='hold';return true;}
 if(!drySegment(g,u,a,front)){pauseSiegeRam(g,a.id,'Water or blocked ground separates the ram from the fortification.');return true;}
 a.phase='striking';u.order='hold';u.workReason='Charging the beam against the fortification';a.charge+=dt;
 if(a.charge>=SIEGE_RAM_RULES.chargeSeconds){a.charge=0;g.applyCombatDamage(a.team,b!,SIEGE_RAM_RULES.damage,a.id,'dominate');a.impacts++;}return true;
}
export function damageSiegeRam(g:Game,id:number,amount:number){const a=assets(g).find(a=>a.id===id);if(!a||!Number.isFinite(amount)||amount<=0)return false;a.hp=Math.max(0,a.hp-amount);if(!a.hp){release(g,a);a.phase='broken';a.charge=0;a.blockedReason='The ram is broken; its paid record remains.';}return true;}
/** Legal transfer follows physical site scope. A far deployed engine is not
 * silently gifted with its former workshop in a partial community handover. */
export function settleSiegeRamHandover(s:GameState,r:CommunityHandover){
 const sites=s.buildings.filter(b=>r.siteIds.includes(b.id)),residents=new Set(r.residentIds);
 for(const a of s.siegeRams?.assets||[]){
  const sourceTransferred=a.source.custodyTeam===r.fromTeam&&(a.source.cacheId!==undefined?r.siteIds.includes(a.source.cacheId):r.scope==='society'&&r.cacheAnchor?.kind==='camp');
  if(sourceTransferred)a.source.custodyTeam=r.toTeam;
  const carrier=a.packet?.carrierId===undefined?undefined:s.units.find(u=>u.id===a.packet!.carrierId);if(a.packet&&carrier)a.packet.custodyTeam=custody(carrier);
  const engineInScope=a.team===r.fromTeam&&(r.scope==='society'||sites.some(b=>Math.abs(a.x-b.x)<=b.w/2+2.5&&Math.abs(a.z-b.z)<=b.d/2+2.5));
  const actorSeparated=a.makerId!==undefined&&residents.has(a.makerId)||a.crewIds.some(id=>residents.has(id));
  if(engineInScope)a.team=r.toTeam;
  if((engineInScope||actorSeparated)&&!['ready','broken'].includes(a.phase)){
   if(a.phase!=='paused'&&a.phase!=='broken')a.resumePhase=a.phase;a.phase='paused';a.charge=0;a.blockedReason='Community authority changed; the same ram and paid parcels await new orders.';
   if(a.makerId!==undefined)a.lastMakerId=a.makerId;if(a.crewIds.length)a.lastCrewIds=[...a.crewIds];a.makerId=undefined;a.crewIds=[];
   for(const u of s.units)if(u.siegeRamId===a.id){delete u.siegeRamId;if(['hold','move'].includes(u.order))u.order='idle';}
  }
 }
}
/** Strict conservation and references; absent fields keep old villages valid. */
export function validSiegeRamState(s:GameState){const v=(s as RamGameState).siegeRams;if(v===undefined)return !(s.units as RamUnit[]).some(u=>u.siegeRamId!==undefined);if(!v||v.version!==1||!Array.isArray(v.assets)||v.assets.length>SIEGE_RAM_RULES.maximumAssets)return false;const occupied=new Set([...s.units,...s.buildings,...s.trees,...s.stones,...s.forage,...s.fish,...s.copper,...s.iron,...s.wildlife,...(s.production?.projects||[]),...(s.armor?.assets||[]),...(s.livestock||[]),...(s.clay?.deposits||[]),...(s.boats||[]),...(s.haulageProjects||[]),...(s.excavations||[])].map(p=>p.id));const ids=new Set<number>(),assigned=new Set<number>(),finite=(n:unknown,max=1e12)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max,id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0&&Number(n)<s.nextId,point=(p:Point)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=(s.worldOptions?.size||1040)/2+32&&Math.abs(p.z)<=(s.worldOptions?.size||1040)/2+32;
 for(const a of v.assets){if(!a||a.version!==1||!id(a.id)||ids.has(a.id)||occupied.has(a.id)||!s.tribes[a.team]||!id(a.workplaceId)||!point(a)||!point(a.source)||!Number.isSafeInteger(a.source.custodyTeam)||!s.tribes[a.source.custodyTeam]||!finite(a.hp,SIEGE_RAM_RULES.hp)||!finite(a.progress,SIEGE_RAM_RULES.workSeconds)||!finite(a.charge,SIEGE_RAM_RULES.chargeSeconds)||!finite(a.createdAt,s.time)||!Number.isSafeInteger(a.impacts)||a.impacts<0||typeof a.blockedReason!=='string'||a.blockedReason.length>400||!['collecting','carrying','assembling','ready','moving','striking','paused','broken'].includes(a.phase)||a.phase==='broken'&&a.hp!==0||a.hp===0&&a.phase!=='broken'||!Array.isArray(a.crewIds)||a.crewIds.length>SIEGE_RAM_RULES.maximumCrew||new Set(a.crewIds).size!==a.crewIds.length)return false;ids.add(a.id);
  if(a.approach!==undefined&&!point(a.approach)||a.trail!==undefined&&(!Array.isArray(a.trail)||a.trail.length>128||a.trail.some(p=>!point(p))))return false;
  if(a.lastMakerId!==undefined&&!id(a.lastMakerId)||a.lastCrewIds!==undefined&&(!Array.isArray(a.lastCrewIds)||a.lastCrewIds.length>SIEGE_RAM_RULES.maximumCrew||new Set(a.lastCrewIds).size!==a.lastCrewIds.length||a.lastCrewIds.some(v=>!id(v))))return false;
  if(a.resumePhase!==undefined&&!['collecting','carrying','assembling','ready','moving','striking'].includes(a.resumePhase)||a.makerId!==undefined&&!id(a.makerId)||a.crewIds.some(id=>!Number.isSafeInteger(id)||!s.units.some(u=>u.id===id))||a.targetId!==undefined&&!id(a.targetId))return false;
  if(!a.paid||a.paid.wood!==SIEGE_RAM_RULES.wood||a.paid.cordage!==SIEGE_RAM_RULES.cordage||!a.uncollected||!a.delivered)return false;for(const k of ['wood','cordage'] as const)if(!finite(a.uncollected[k],a.paid[k])||!finite(a.delivered[k],a.paid[k])||a.packet&&!finite(a.packet[k],k==='wood'?SIEGE_RAM_RULES.packetWood:SIEGE_RAM_RULES.packetCordage)||a.uncollected[k]+a.delivered[k]+(a.packet?.[k]||0)!==a.paid[k])return false;
  if(a.packet&&(!point(a.packet)||!Number.isSafeInteger(a.packet.custodyTeam)||!s.tribes[a.packet.custodyTeam]||a.packet.carrierId!==undefined&&(!id(a.packet.carrierId)||!s.units.some(u=>u.id===a.packet!.carrierId&&custody(u)===a.packet!.custodyTeam))||!a.packet.wood&&!a.packet.cordage))return false;
  if(a.progress>0&&(a.delivered.wood!==SIEGE_RAM_RULES.wood||a.delivered.cordage!==SIEGE_RAM_RULES.cordage)||['ready','moving','striking'].includes(a.phase)&&a.progress!==SIEGE_RAM_RULES.workSeconds||['moving','striking'].includes(a.phase)&&(a.crewIds.length<SIEGE_RAM_RULES.minimumCrew||a.makerId!==undefined||a.targetId===undefined||a.approach===undefined||a.trail===undefined)||a.progress<SIEGE_RAM_RULES.workSeconds&&a.crewIds.length)return false;
  if(!['paused','ready','broken'].includes(a.phase)){const crew=a.progress<SIEGE_RAM_RULES.workSeconds?[a.makerId]:a.crewIds;for(const member of crew){if(!id(member)||assigned.has(member!)||!(s.units as RamUnit[]).some(u=>u.id===member&&u.team===a.team&&u.siegeRamId===a.id))return false;assigned.add(member!);}}
 }
 return (s.units as RamUnit[]).every(u=>u.siegeRamId===undefined||v.assets.some(a=>a.id===u.siegeRamId&&!['paused','ready','broken'].includes(a.phase)&&(a.makerId===u.id||a.crewIds.includes(u.id))));
}
