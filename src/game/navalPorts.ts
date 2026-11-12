import type {Game} from './sim';
import type {Building,Unit} from './types';
import {isDependent} from './settlement';
import {boatClass} from './boatClasses';
import {hasTaskCommitment} from './workCommitments';
import {PORT_WORK_SPECS,PORT_TIERS,PORT_WORK_IDS,designStrength,shipDesign,tierFor,type PortWork} from './navalClasses';

/**
 * Port and naval infrastructure: works built at a real dock by a real builder with finite materials, port tiers,
 * blockade of a port by enemy hulls actually on station, and naval supply drawn from the society's real stores.
 * State is created on first use, so absent `state.naval` means no naval layer and old saves are untouched.
 */
export type PortRecord={dockId:number;team:number;works:Partial<Record<PortWork,{builtAt:number}>>};
export type PortProject={id:number;dockId:number;team:number;work:PortWork;builderId:number;progress:number;paid:{wood:number;stone:number;cordage:number};phase:'building'|'paused'};
export type Vessel={boatId:number;team:number;design:string;commissionedAt:number;stores:{food:number;missiles:number};atSeaSeconds:number;lastDockId?:number;captures:number;rams:number};
export type VesselCommission={id:number;dockId:number;team:number;design:string;builderId:number;progress:number;paid:{wood:number;stone:number;cordage:number;copper:number};phase:'building'|'paused'};
export type Boarding={id:number;attackerBoat:number;targetBoat:number;startedAt:number;seconds:number};
export type NavalEvent={at:number;kind:'ram'|'boarding'|'capture'|'blockade'|'lifted'|'starved'|'sunk';team:number;other?:number;text:string};
export type NavalState={version:1;ports:PortRecord[];projects:PortProject[];vessels:Vessel[];commissions:VesselCommission[];boardings:Boarding[];events:NavalEvent[];blockades:{dockId:number;by:number;since:number}[]};
type Holder={naval?:NavalState};
const st=(g:Game)=>g.state as Game['state']&Holder;
export const NAVAL_RULES=Object.freeze({
 version:1,maximumPorts:24,maximumProjects:12,maximumVessels:48,maximumEvents:64,maximumBoardings:8,
 builderReachMeters:9,baseShipReachMeters:140,extraShipReachMeters:40,breakwaterReach:30,lighthouseReach:50,shipyardReach:20,maximumShipReachMeters:320,
 lighthouseSightMeters:110,
 blockadeRadiusMeters:70,defenderRadiusMeters:45,breakwaterDefence:1.2,drydockDefence:1.1,minimumPower:.8,
 /** Stores: food per person-second at sea comes from the generic ration; capacity is per hull. */
 foodCapacityPerSeat:6,missileCapacity:24,woodPerMissileLoad:1,missilesPerWood:6,harbourMeters:30,seaRadiusMeters:60,starvedSpeed:.7,starvedStrength:.8,
});
const R=NAVAL_RULES;
export const navalState=(g:Game)=>st(g).naval;
export const ensureNaval=(g:Game)=>st(g).naval??={version:1,ports:[],projects:[],vessels:[],commissions:[],boardings:[],events:[],blockades:[]};
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
export const dockOf=(g:Game,id:number)=>g.state.buildings.find(b=>b.id===id&&b.type==='dock'&&b.hp>0&&g.finished(b));
export const portRecord=(g:Game,dockId:number)=>st(g).naval?.ports.find(p=>p.dockId===dockId);
export const portTier=(g:Game,dock:Pick<Building,'id'>)=>tierFor(portRecord(g,dock.id)?.works??{});
export const portTierInfo=(g:Game,dock:Pick<Building,'id'>)=>PORT_TIERS[portTier(g,dock)];
export const hasWork=(g:Game,dockId:number,work:PortWork)=>!!portRecord(g,dockId)?.works[work];
export const noteEvent=(g:Game,e:Omit<NavalEvent,'at'>)=>{const s=ensureNaval(g);s.events.push({at:g.state.time,...e});while(s.events.length>R.maximumEvents)s.events.shift();};

// -- influence reach (read by the terrain influence adapter) ---------------------------------------------------------
/** How far from this dock ships carry influence across open water. Port works lengthen it; a blockade cuts it. */
export function portInfluenceReachMeters(g:Game,dock:Building,ships:number){
 const rec=portRecord(g,dock.id);let reach=R.baseShipReachMeters+R.extraShipReachMeters*Math.max(0,ships-1);
 if(rec?.works.breakwater)reach+=R.breakwaterReach;if(rec?.works.lighthouse)reach+=R.lighthouseReach;if(rec?.works.slipway&&rec.works.breakwater)reach+=R.shipyardReach;
 return Math.min(R.maximumShipReachMeters,reach);
}

// -- port works ----------------------------------------------------------------------------------------------------------
export type NavalOutcome={accepted:boolean;reason:string;id?:number};
const no=(reason:string):NavalOutcome=>({accepted:false,reason});
const freeBuilder=(g:Game,u:Unit|undefined,team:number)=>!!u&&u.team===team&&u.hp>0&&!isDependent(g,u)&&!u.prisoner&&!u.boat&&!u.emergency&&!u.recalled&&!hasTaskCommitment(u)&&!u.jobLock&&!u.carry;
export function portWorkIssue(g:Game,dockId:number,work:PortWork,builderId:number,team=0):string|null{
 const spec=PORT_WORK_SPECS[work],dock=dockOf(g,dockId),u=g.state.units.find(u=>u.id===builderId);
 if(!spec)return 'Unknown port work';if(!dock||dock.team!==team)return 'Choose one of your finished docks';
 if(!freeBuilder(g,u,team))return 'The builder must be a free, healthy adult on land';
 const rec=portRecord(g,dockId);if(rec?.works[work])return `${spec.name} is already built here`;
 for(const need of spec.requires)if(!rec?.works[need])return `${PORT_WORK_SPECS[need].name} must be built first`;
 const s=st(g).naval;if(s?.projects.some(p=>p.dockId===dockId&&p.work===work)||s?.projects.some(p=>p.builderId===builderId))return 'That work or builder is already committed';
 if((s?.projects.length??0)>=R.maximumProjects)return 'Too many port works are under way';
 const t=g.tribe(team),cost=spec;if(t.wood<cost.wood||t.stone<cost.stone||(t.items?.cordage||0)<cost.cordage)return `Needs ${cost.wood} timber, ${cost.stone} stone${cost.cordage?` and ${cost.cordage} cordage`:''} in store`;
 return null;
}
export function beginPortWork(g:Game,dockId:number,work:PortWork,builderId:number,team=0):NavalOutcome{
 const issue=portWorkIssue(g,dockId,work,builderId,team);if(issue)return no(issue);
 const spec=PORT_WORK_SPECS[work],t=g.tribe(team),u=g.state.units.find(u=>u.id===builderId)!,s=ensureNaval(g);
 t.wood-=spec.wood;t.stone-=spec.stone;if(spec.cordage)(t.items??={}).cordage=(t.items?.cordage||0)-spec.cordage;
 if(!portRecord(g,dockId)){if(s.ports.length>=R.maximumPorts)return no('Too many ports recorded');s.ports.push({dockId,team,works:{}});}
 const p:PortProject={id:g.id(),dockId,team,work,builderId,progress:0,paid:{wood:spec.wood,stone:spec.stone,cordage:spec.cordage},phase:'building'};
 s.projects.push(p);(u as Unit&{portWorkId?:number}).portWorkId=p.id;g.interruptMission?.(u);u.order='hold';u.node=null;u.target=null;
 return {accepted:true,reason:`${spec.name} begun; materials set aside and the builder is walking to the dock`,id:p.id};
}
export function resumePortWork(g:Game,projectId:number,builderId:number):NavalOutcome{
 const p=st(g).naval?.projects.find(p=>p.id===projectId),u=g.state.units.find(u=>u.id===builderId);
 if(!p||p.phase!=='paused')return no('No paused port work with that id');
 if(!freeBuilder(g,u,p.team))return no('The new builder must be a free, healthy adult on land');
 p.builderId=builderId;p.phase='building';(u as Unit&{portWorkId?:number}).portWorkId=p.id;return {accepted:true,reason:'Work resumes',id:p.id};
}
function walkToDock(g:Game,u:Unit,dock:Building,dt:number){
 const spot=g.interactionSpot(u,dock);if(!spot)return false;
 u.order='move';u.tx=spot.x;u.tz=spot.z;g.steer(u,dt);return dist(u,spot)<=R.builderReachMeters;
}
const clocks=new WeakMap<Game,number>();
/** Port works progress only while the builder is physically at the dock. A lost builder pauses the work; materials are never refunded. */
export function tickNavalPorts(g:Game,dt:number){
 const s=st(g).naval;if(!s||!(dt>0))return;
 for(const p of s.projects.slice()){
  const dock=dockOf(g,p.dockId);
  if(!dock){s.projects=s.projects.filter(x=>x!==p);continue;}
  const u=g.state.units.find(u=>u.id===p.builderId);
  if(p.phase==='paused')continue;
  if(!u||u.hp<=0||u.team!==p.team||u.prisoner||(u as Unit&{portWorkId?:number}).portWorkId!==p.id){p.phase='paused';continue;}
  if(walkToDock(g,u,dock,dt)){p.progress+=dt;u.order='hold';}
  if(p.progress>=PORT_WORK_SPECS[p.work].workSeconds){
   const rec=portRecord(g,p.dockId)??(()=>{const r:PortRecord={dockId:p.dockId,team:p.team,works:{}};s.ports.push(r);return r;})();
   rec.works[p.work]={builtAt:g.state.time};s.projects=s.projects.filter(x=>x!==p);delete (u as Unit&{portWorkId?:number}).portWorkId;u.order='idle';
  }
 }
}

// -- blockade ------------------------------------------------------------------------------------------------------------
export function vesselOf(g:Game,boatId:number){return st(g).naval?.vessels.find(v=>v.boatId===boatId);}
const crewAboard=(g:Game,boatId:number)=>g.state.units.filter(u=>u.boat?.id===boatId&&u.boat.phase==='aboard'&&u.hp>0&&!u.prisoner).length;
/** Fighting power of one hull on station: design strength (best of ram/boarding/missile), hull condition, crew aboard. */
export function vesselPower(g:Game,boatId:number){
 const v=vesselOf(g,boatId),b=g.state.boats?.find(b=>b.id===boatId&&b.hp>0);if(!v||!b)return 0;
 const d=shipDesign(v.design);if(!d||d.role==='hauler')return 0;
 const crew=crewAboard(g,boatId);if(crew<1)return 0;
 const spec=boatClass(b).maxHp;
 const condition=Math.max(.25,Math.min(1,b.hp/spec));
 return Math.max(designStrength(d,'ram',crew),designStrength(d,'boarding',crew),designStrength(d,'missile',crew))*condition*(v.stores.food<=0&&v.atSeaSeconds>0?R.starvedStrength:1);
}
export type BlockadeStatus={blockaded:boolean;by:number|null;attackerPower:number;defenderPower:number;attackers:number[]};
export function blockadeAt(g:Game,dock:Building):BlockadeStatus{
 const none:BlockadeStatus={blockaded:false,by:null,attackerPower:0,defenderPower:0,attackers:[]};
 if(!st(g).naval?.vessels.length)return none;
 const byTeam=new Map<number,{power:number;ids:number[]}>();let defence=0;
 const rec=portRecord(g,dock.id),bonus=(rec?.works.breakwater?R.breakwaterDefence:1)*(rec?.works.drydock?R.drydockDefence:1);
 for(const b of g.state.boats??[]){
  if(b.hp<=0)continue;const power=vesselPower(g,b.id);if(power<=0)continue;
  if(b.team===dock.team){if(dist(b,dock)<=R.defenderRadiusMeters)defence+=power;continue;}
  if(!g.isFoe(b.team,dock.team)&&!g.isFoe(dock.team,b.team))continue;
  if(dist(b,dock)>R.blockadeRadiusMeters)continue;
  const e=byTeam.get(b.team)??{power:0,ids:[]};e.power+=power;e.ids.push(b.id);byTeam.set(b.team,e);
 }
 let best:{team:number;power:number;ids:number[]}|undefined;
 for(const [team,e] of [...byTeam.entries()].sort((a,b)=>a[0]-b[0]))if(!best||e.power>best.power)best={team,...e};
 if(!best)return {...none,defenderPower:defence*bonus};
 const defender=defence*bonus;
 return {blockaded:best.power>=R.minimumPower&&best.power>defender,by:best.power>=R.minimumPower&&best.power>defender?best.team:null,attackerPower:best.power,defenderPower:defender,attackers:best.ids.sort((a,b)=>a-b)};
}
/** Is any finished dock of this society under blockade? New coastal departures and sea influence stop while it is. */
export function portBlockaded(g:Game,team:number){
 if(!st(g).naval?.vessels.length)return false;
 return g.state.buildings.some(b=>b.team===team&&b.type==='dock'&&b.hp>0&&g.finished(b)&&blockadeAt(g,b).blockaded);
}
export function dockBlockaded(g:Game,dock:Building){return !!st(g).naval?.vessels.length&&blockadeAt(g,dock).blockaded;}
/** Review blockades once per second, noting their start and lifting, so the player can read the cause. */
export function tickBlockades(g:Game,dt:number){
 const s=st(g).naval;if(!s||!(dt>0))return;
 const acc=(clocks.get(g)||0)+dt;if(acc<1){clocks.set(g,acc);return;}clocks.set(g,0);
 const active=new Map<number,number>();
 for(const d of g.state.buildings)if(d.type==='dock'&&d.hp>0&&g.finished(d)){const b=blockadeAt(g,d);if(b.blockaded)active.set(d.id,b.by!);}
 for(const [dockId,by] of active)if(!s.blockades.some(x=>x.dockId===dockId)){s.blockades.push({dockId,by,since:g.state.time});const d=g.state.buildings.find(b=>b.id===dockId)!;noteEvent(g,{kind:'blockade',team:by,other:d.team,text:`Hulls hold the approaches to a harbour`});}
 s.blockades=s.blockades.filter(x=>{if(active.has(x.dockId))return true;const d=g.state.buildings.find(b=>b.id===x.dockId);noteEvent(g,{kind:'lifted',team:x.by,other:d?.team,text:'The blockade is broken or the hulls withdrew'});return false;});
}

// -- naval supply --------------------------------------------------------------------------------------------------------
export const stowCapacity=(g:Game,boatId:number)=>{const b=g.state.boats?.find(b=>b.id===boatId);return b?{food:b.capacity*R.foodCapacityPerSeat,missiles:R.missileCapacity}:{food:0,missiles:0};};
/** Load rations and missiles from the society's real stores at its own harbour. Everything loaded leaves the stores. */
export function resupplyVessel(g:Game,boatId:number,want:{food?:number;missileLoads?:number}={},team=0):NavalOutcome{
 const v=vesselOf(g,boatId),b=g.state.boats?.find(b=>b.id===boatId&&b.hp>0);
 if(!v||!b||v.team!==team||b.team!==team)return no('Not one of your commissioned hulls');
 const dock=g.state.buildings.find(d=>d.team===team&&d.type==='dock'&&d.hp>0&&g.finished(d)&&dist(d,b)<=R.harbourMeters);
 if(!dock)return no('A hull is resupplied only while moored at one of your finished docks');
 if(dockBlockaded(g,dock))return no('The harbour is blockaded; nothing can be loaded');
 const t=g.tribe(team),cap=stowCapacity(g,boatId);
 const food=Math.max(0,Math.min(want.food??cap.food-v.stores.food,cap.food-v.stores.food,t.food-1)),loads=Math.max(0,Math.min(want.missileLoads??Math.ceil((cap.missiles-v.stores.missiles)/R.missilesPerWood),Math.ceil((cap.missiles-v.stores.missiles)/R.missilesPerWood),t.wood));
 if(!(food>0)&&!(loads>0))return no('Nothing to load, or the stores cannot spare it');
 t.food-=food;t.wood-=loads*R.woodPerMissileLoad;v.stores.food=Math.min(cap.food,v.stores.food+food);v.stores.missiles=Math.min(cap.missiles,v.stores.missiles+loads*R.missilesPerWood);v.lastDockId=dock.id;v.atSeaSeconds=0;
 return {accepted:true,reason:`Loaded ${Math.round(food)} food and ${loads*R.missilesPerWood} missiles from the stores`};
}
/** Speed multiplier a supply-starved hull suffers; 1 otherwise. Read by boat movement. */
export function navalSpeedMultiplier(g:Game,boatId:number){const v=vesselOf(g,boatId);return v&&v.stores.food<=0&&v.atSeaSeconds>0?R.starvedSpeed:1;}

// -- validation ----------------------------------------------------------------------------------------------------------
export function validNaval(s:any){
 const v=s.naval;if(v===undefined)return true;
 if(!v||typeof v!=='object'||Array.isArray(v)||v.version!==1)return false;
 for(const k of ['ports','projects','vessels','commissions','boardings','events','blockades'])if(!Array.isArray(v[k]))return false;
 if(v.ports.length>R.maximumPorts||v.projects.length>R.maximumProjects||v.vessels.length>R.maximumVessels||v.events.length>R.maximumEvents||v.boardings.length>R.maximumBoardings||v.commissions.length>R.maximumProjects||v.blockades.length>R.maximumPorts)return false;
 const id=(n:any)=>Number.isInteger(n)&&n>=0&&n<s.nextId,team=(n:any)=>Number.isInteger(n)&&n>=0&&n<s.tribes.length,fin=(n:any,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 const docks=new Set<number>();
 for(const p of v.ports){if(!p||!id(p.dockId)||!team(p.team)||docks.has(p.dockId)||!p.works||typeof p.works!=='object')return false;docks.add(p.dockId);
  for(const [k,w] of Object.entries<any>(p.works)){if(!PORT_WORK_IDS.includes(k as PortWork)||!w||!fin(w.builtAt))return false;for(const need of PORT_WORK_SPECS[k as PortWork].requires)if(!p.works[need])return false;}}
 const costOk=(c:any,keys:string[])=>!!c&&keys.every(k=>fin(c[k],1e6));
 const seen=new Set<number>(),builders=new Set<number>();
 for(const p of v.projects){if(!p||!id(p.id)||seen.has(p.id)||!id(p.dockId)||!team(p.team)||!PORT_WORK_IDS.includes(p.work)||!id(p.builderId)||builders.has(p.builderId)&&p.phase==='building'||!fin(p.progress,1e6)||!['building','paused'].includes(p.phase)||!costOk(p.paid,['wood','stone','cordage'])||p.progress>PORT_WORK_SPECS[p.work as PortWork].workSeconds+1e-6)return false;seen.add(p.id);if(p.phase==='building')builders.add(p.builderId);}
 const boats=new Set<number>();
 for(const x of v.vessels){if(!x||!id(x.boatId)||boats.has(x.boatId)||!team(x.team)||!shipDesign(x.design)||!fin(x.commissionedAt)||!x.stores||!fin(x.stores.food,1e6)||!fin(x.stores.missiles,1e6)||!fin(x.atSeaSeconds)||!Number.isInteger(x.captures)||x.captures<0||!Number.isInteger(x.rams)||x.rams<0)return false;boats.add(x.boatId);if(x.lastDockId!==undefined&&!id(x.lastDockId))return false;}
 for(const c of v.commissions){if(!c||!id(c.id)||seen.has(c.id)||!id(c.dockId)||!team(c.team)||!shipDesign(c.design)||!id(c.builderId)||!fin(c.progress,1e6)||!['building','paused'].includes(c.phase)||!costOk(c.paid,['wood','stone','cordage','copper'])||c.progress>shipDesign(c.design)!.workSeconds+1e-6)return false;seen.add(c.id);}
 const act=new Set<number>();
 for(const b of v.boardings){if(!b||!id(b.id)||!id(b.attackerBoat)||!id(b.targetBoat)||b.attackerBoat===b.targetBoat||!fin(b.startedAt)||!fin(b.seconds,1e6)||act.has(b.attackerBoat))return false;act.add(b.attackerBoat);}
 for(const e of v.events){if(!e||!fin(e.at)||!['ram','boarding','capture','blockade','lifted','starved','sunk'].includes(e.kind)||!team(e.team)||e.other!==undefined&&!team(e.other)||typeof e.text!=='string'||e.text.length>160)return false;}
 for(const b of v.blockades){if(!b||!id(b.dockId)||!team(b.by)||!fin(b.since))return false;}
 return true;
}
