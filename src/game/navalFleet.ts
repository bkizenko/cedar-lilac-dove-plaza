import type {Game} from './sim';
import type {Unit} from './types';
import {isDependent} from './settlement';
import {FOOD_PER_PERSON_SECOND} from './settlement';
import {FOOD_KINDS} from './pantry';
import {hasTaskCommitment} from './workCommitments';
import {combatPractice} from './warfare';
import {boatClass,boatClassIssue} from './boatClasses';
import {launchRiverboat} from './boats';
import {awardCommanderXp,commandersOf,fleetAuraFor} from './commanders';
import {SHIP_DESIGNS,shipDesign,designStrength,navalMatchup,PORT_TIERS,type ShipDesign,type NavalMode} from './navalClasses';
import {NAVAL_RULES,ensureNaval,navalState,dockOf,portRecord,portTier,hasWork,noteEvent,vesselOf,dockBlockaded,tickNavalPorts,tickBlockades,pauseNavalProject,type NavalOutcome} from './navalPorts';

/**
 * Warships, ramming, boarding and naval supply on top of the existing hulls.
 *
 * Every effect is physical: a commission needs a builder standing at a real dock and finite materials; a ram
 * needs a hull closing fast, bow-on, within a few metres of a hostile hull; boarding needs grapnel range and
 * resolves by real crew hitting real crew through the ordinary damage path; capture moves the hull and a real
 * crewman, never a free ship; supply is drawn from the society's stores and eaten at sea.
 */
export const NAVAL_COMBAT_RULES=Object.freeze({
 tickSeconds:.5,ramReachMeters:3.6,ramMinimumSpeed:1.4,ramAlignmentRadians:.7,ramCooldownSeconds:12,ramBaseDamage:70,ramSpeedCap:1.6,ramRecoil:.1,
 boardingRangeMeters:6.5,boardingBreakMeters:10,boardingSeconds:75,boardingDamagePerSecond:.16,minimumBoarders:2,
});
const C=NAVAL_COMBAT_RULES;
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const no=(reason:string):NavalOutcome=>({accepted:false,reason});
type PortWorker=Unit&{portWorkId?:number};
const boatById=(g:Game,id:number)=>g.state.boats?.find(b=>b.id===id&&b.hp>0);
const aboard=(g:Game,boatId:number)=>g.state.units.filter(u=>u.boat?.id===boatId&&u.boat.phase==='aboard'&&u.hp>0&&!u.prisoner);
/** A hull with no commission record fights as an ordinary civil hull of its class. */
export function designOfBoat(g:Game,boatId:number):ShipDesign{
 const v=vesselOf(g,boatId);if(v){const d=shipDesign(v.design);if(d)return d;}
 const b=g.state.boats?.find(b=>b.id===boatId);const base=b?.hullClass??'riverboat';
 return {id:'civil',name:'Civil hull',role:'hauler',baseHull:base,length:boatClass(b??{}).length,beam:boatClass(b??{}).beam,armour:1,ram:0,boarding:.2,missiles:0,hold:0,minimumCrew:1,requires:[],cost:{wood:0,stone:0,cordage:0,copper:0},workSeconds:0};
}

// -- commissioning -----------------------------------------------------------------------------------------------------
const freeBuilder=(g:Game,u:Unit|undefined,team:number)=>!!u&&u.team===team&&u.hp>0&&!isDependent(g,u)&&!u.prisoner&&!u.boat&&!u.emergency&&!u.recalled&&!hasTaskCommitment(u)&&!u.jobLock&&!u.carry;
export function commissionIssue(g:Game,dockId:number,designId:string,builderId:number,team=0):string|null{
 const d=shipDesign(designId),dock=dockOf(g,dockId),u=g.state.units.find(u=>u.id===builderId);
 if(!d)return 'Unknown ship design';if(!dock||dock.team!==team)return 'Choose one of your finished docks';
 for(const need of d.requires)if(!hasWork(g,dockId,need))return `${d.name}: this dock lacks the ${need==='navalStores'?'naval storehouse':need}`;
 if(!freeBuilder(g,u,team))return 'The shipwright must be a free, healthy adult on land';
 const base=d.baseHull==='riverboat'?null:boatClassIssue(g,d.baseHull,team);if(base)return base;
 const s=navalState(g);
 if((s?.commissions.length??0)>=NAVAL_RULES.maximumProjects)return 'Too many hull commissions are under way';
 if((s?.vessels.length??0)+(s?.commissions.length??0)>=NAVAL_RULES.maximumVessels)return 'Too many commissioned hulls';
 if(s?.commissions.some(c=>c.builderId===builderId||c.dockId===dockId&&c.phase==='building'))return 'This dock or shipwright is already building a hull';
 if(dockBlockaded(g,dock))return 'The harbour is blockaded';
 const moored=(g.state.boats??[]).filter(b=>b.team===team&&b.hp>0&&dist(b,dock)<=NAVAL_RULES.harbourMeters).length+(s?.commissions.filter(c=>c.dockId===dockId).length??0);
 if(moored>=PORT_TIERS[portTier(g,dock)].moorage)return `Moorage here holds ${PORT_TIERS[portTier(g,dock)].moorage} hulls; build a breakwater for more`;
 if((g.state.boats??[]).filter(b=>b.team===team&&b.hp>0).length>=12)return 'Twelve hulls is the most a society can keep';
 const t=g.tribe(team),c=d.cost;if(t.wood<c.wood||t.stone<c.stone||(t.items?.cordage||0)<c.cordage||t.copper<c.copper)return `Needs ${c.wood} timber, ${c.stone} stone, ${c.cordage} cordage${c.copper?` and ${c.copper} copper`:''} in store`;
 return null;
}
export function commissionVessel(g:Game,dockId:number,designId:string,builderId:number,team=0):NavalOutcome{
 const issue=commissionIssue(g,dockId,designId,builderId,team);if(issue)return no(issue);
 const d=shipDesign(designId)!,t=g.tribe(team),c=d.cost,u=g.state.units.find(u=>u.id===builderId)!,s=ensureNaval(g);
 t.wood-=c.wood;t.stone-=c.stone;if(c.cordage)(t.items??={}).cordage=(t.items?.cordage||0)-c.cordage;t.copper-=c.copper;
 const rec={id:g.id(),dockId,team,design:designId,builderId,progress:0,paid:{...c},phase:'building' as const};
 g.interruptMission(u);s.commissions.push(rec);(u as PortWorker).portWorkId=rec.id;u.order='hold';u.node=null;u.target=null;
 return {accepted:true,reason:`${d.name} laid down; materials set aside, the shipwright is walking to the dock`,id:rec.id};
}
/** Reassign the original paid hull; this never charges its materials again. */
export function resumeVesselCommissionIssue(g:Game,projectId:number,builderId:number,team=0):string|null{
 const c=navalState(g)?.commissions.find(c=>c.id===projectId),u=g.state.units.find(u=>u.id===builderId);
 if(!c||c.team!==team||c.phase!=='paused')return 'No paused hull commission of your society with that id';
 const dock=dockOf(g,c.dockId);if(!dock||dock.team!==team)return 'The original dock is no longer available';
 if(!freeBuilder(g,u,team))return 'The replacement shipwright must be a free, healthy adult on land';
 if(dockBlockaded(g,dock))return 'The harbour is blockaded';
 return navalState(g)?.commissions.some(p=>p!==c&&p.dockId===c.dockId&&p.phase==='building')?'This dock is already building a hull':null;
}
export function resumeVesselCommission(g:Game,projectId:number,builderId:number,team=0):NavalOutcome{
 const issue=resumeVesselCommissionIssue(g,projectId,builderId,team);if(issue)return no(issue);
 const c=navalState(g)!.commissions.find(c=>c.id===projectId)!,u=g.state.units.find(u=>u.id===builderId)!;
 pauseNavalProject(g,c);g.interruptMission(u);c.builderId=builderId;c.phase='building';(u as PortWorker).portWorkId=c.id;u.order='hold';u.node=null;u.target=null;
 return {accepted:true,reason:'The paid hull resumes with its replacement shipwright',id:c.id};
}
function tickCommissions(g:Game,dt:number){
 const s=navalState(g);if(!s)return;
 for(const c of s.commissions.slice()){
  const dock=dockOf(g,c.dockId),d=shipDesign(c.design);
  if(!dock||dock.team!==c.team||!d){pauseNavalProject(g,c);continue;}
  if(c.phase==='paused')continue;
  const u=g.state.units.find(u=>u.id===c.builderId) as PortWorker|undefined;
  if(!u||u.hp<=0||u.team!==c.team||u.prisoner||u.boat||u.emergency||u.recalled||u.portWorkId!==c.id){pauseNavalProject(g,c);continue;}
  const spot=g.interactionSpot(u,dock);if(!spot)continue;
  u.order='move';u.tx=spot.x;u.tz=spot.z;g.steer(u,dt);
  if(dist(u,spot)<=NAVAL_RULES.builderReachMeters){c.progress+=dt;u.order='hold';}
  if(c.progress<d.workSeconds)continue;
  const before=g.state.boats?.length??0;
  if(!launchRiverboat(g,dock,d.baseHull==='riverboat'?undefined:d.baseHull)||(g.state.boats?.length??0)===before){pauseNavalProject(g,c);continue;}
  const boat=g.state.boats![g.state.boats!.length-1];
  s.vessels.push({boatId:boat.id,team:c.team,design:c.design,commissionedAt:g.state.time,stores:{food:0,missiles:0},atSeaSeconds:0,lastDockId:dock.id,captures:0,rams:0});
  s.commissions=s.commissions.filter(x=>x!==c);delete u.portWorkId;u.order='idle';
 }
}

// -- ramming -----------------------------------------------------------------------------------------------------------------
const last=new WeakMap<Game,{t:number;pos:Map<number,{x:number;z:number}>;speed:Map<number,number>;cool:Map<number,number>}>();
function motion(g:Game){
 let m=last.get(g);if(!m){m={t:g.state.time,pos:new Map(),speed:new Map(),cool:new Map()};last.set(g,m);}
 return m;
}
/** Wake effect of a ram on a hostile hull. Exposed for tests and for AI that wants to preview a blow. */
export function ramBlow(g:Game,attackerId:number,defenderId:number,speed:number){
 const a=boatById(g,attackerId),d=boatById(g,defenderId);if(!a||!d)return null;
 const ad=designOfBoat(g,attackerId),dd=designOfBoat(g,defenderId),crew=aboard(g,attackerId).length;
 const m=navalMatchup(ad,dd,'ram'),aura=fleetAuraFor(g,a)?.ram??0,strength=designStrength(ad,'ram',crew);
 if(strength<=0)return null;
 const damage=C.ramBaseDamage*strength*m.multiplier*Math.min(C.ramSpeedCap,speed/C.ramMinimumSpeed)*(1+aura)*dd.armour;
 return {damage,recoil:damage*C.ramRecoil/Math.max(.5,ad.armour+.5),matchup:m};
}
function tickRams(g:Game,dt:number){
 const s=navalState(g);if(!s?.vessels.length)return;
 const m=motion(g),now=g.state.time;
 if(now-m.t<C.tickSeconds)return;const span=Math.max(.01,now-m.t);m.t=now;
 for(const b of g.state.boats??[]){const p=m.pos.get(b.id);m.speed.set(b.id,p?dist(p,b)/span:0);m.pos.set(b.id,{x:b.x,z:b.z});}
 for(const v of s.vessels){
  const a=boatById(g,v.boatId);if(!a)continue;const d=shipDesign(v.design);if(!d||d.ram<=0)continue;
  if(now<(m.cool.get(a.id)??-1e9))continue;
  const speed=m.speed.get(a.id)??0;if(speed<C.ramMinimumSpeed)continue;
  const bow={x:a.x+Math.sin(a.facing)*d.length/2,z:a.z+Math.cos(a.facing)*d.length/2};
  let target:typeof a|undefined,best=Infinity;
  for(const o of g.state.boats??[]){
   if(o.hp<=0||o.id===a.id||o.team===a.team||!(g.isFoe(a.team,o.team)||g.isFoe(o.team,a.team)))continue;
   const dd=designOfBoat(g,o.id),reach=C.ramReachMeters+dd.length/2,r=dist(bow,o);if(r>reach||r>=best)continue;
   const bearing=Math.atan2(o.x-a.x,o.z-a.z),off=Math.abs(Math.atan2(Math.sin(bearing-a.facing),Math.cos(bearing-a.facing)));if(off>C.ramAlignmentRadians)continue;
   target=o;best=r;
  }
  if(!target)continue;
  const blow=ramBlow(g,a.id,target.id,speed);if(!blow)continue;
  target.hp=Math.max(0,target.hp-blow.damage);a.hp=Math.max(1,a.hp-blow.recoil);m.cool.set(a.id,now+C.ramCooldownSeconds);v.rams++;
  noteEvent(g,{kind:target.hp<=0?'sunk':'ram',team:a.team,other:target.team,text:`${d.name} rams a hull (${Math.round(blow.damage)} damage${blow.matchup.reasons.length?`; ${blow.matchup.reasons[0]}`:''})`});
  const cmd=commandersOf(g,a.team).find(c=>c.kind==='fleet'&&c.boatIds.includes(a.id));if(cmd)awardCommanderXp(g,cmd.id,target.hp<=0?8:3);
 }
}

// -- boarding ----------------------------------------------------------------------------------------------------------------
export function boardingIssue(g:Game,attackerId:number,targetId:number,team=0):string|null{
 const a=boatById(g,attackerId),t=boatById(g,targetId);
 if(!a||a.team!==team)return 'Not one of your hulls';if(!t||t.team===team)return 'Choose an enemy hull';
 if(!(g.isFoe(a.team,t.team)||g.isFoe(t.team,a.team)))return 'You are not at war with that society';
 const d=designOfBoat(g,a.id);if(d.boarding<=0)return 'This hull carries no boarders';
 if(aboard(g,a.id).length<C.minimumBoarders)return `Needs at least ${C.minimumBoarders} fighters aboard`;
 if(dist(a,t)>C.boardingRangeMeters+designOfBoat(g,t.id).length/2)return 'Close to grapnel range first';
 const s=navalState(g);if(s?.boardings.some(b=>b.attackerBoat===a.id||b.targetBoat===t.id))return 'A boarding is already under way';
 if((s?.boardings.length??0)>=NAVAL_RULES.maximumBoardings)return 'Too many boardings at once';
 return null;
}
export function beginBoarding(g:Game,attackerId:number,targetId:number,team=0):NavalOutcome{
 const issue=boardingIssue(g,attackerId,targetId,team);if(issue)return no(issue);
 const s=ensureNaval(g),b={id:g.id(),attackerBoat:attackerId,targetBoat:targetId,startedAt:g.state.time,seconds:0};s.boardings.push(b);
 noteEvent(g,{kind:'boarding',team,other:boatById(g,targetId)!.team,text:'Grapnels bite; boarders cross'});
 return {accepted:true,reason:'Boarding begun',id:b.id};
}
const power=(g:Game,boatId:number,attacking:boolean,vs:ShipDesign)=>{
 const d=designOfBoat(g,boatId),crew=aboard(g,boatId),b=boatById(g,boatId);if(!b)return 0;
 const fighters=crew.reduce((s,u)=>s+Math.max(1,u.dmg||8)*combatPractice(u)*Math.max(.2,u.hp/Math.max(1,u.maxHp)),0);
 const v=vesselOf(g,boatId),starved=v&&v.stores.food<=0&&v.atSeaSeconds>0?NAVAL_RULES.starvedStrength:1;
 const aura=attacking?1+(fleetAuraFor(g,b)?.boarding??0):1+(fleetAuraFor(g,b)?.defense??0);
 const matchup=attacking?navalMatchup(d,vs,'boarding').multiplier:1/navalMatchup(vs,d,'boarding').multiplier;
 return fighters*designStrength(d,'boarding',crew.length)*matchup*aura*starved*(attacking?1:1+(1-d.armour)*.5);
};
function tickBoardings(g:Game,dt:number){
 const s=navalState(g);if(!s?.boardings.length)return;
 for(const b of s.boardings.slice()){
  const a=boatById(g,b.attackerBoat),t=boatById(g,b.targetBoat),end=()=>{s.boardings=s.boardings.filter(x=>x!==b);};
  if(!a||!t){end();continue;}
  b.seconds+=dt;
  const ad=designOfBoat(g,a.id),td=designOfBoat(g,t.id),att=aboard(g,a.id),def=aboard(g,t.id);
  if(dist(a,t)>C.boardingBreakMeters+td.length/2||att.length<1||b.seconds>C.boardingSeconds){noteEvent(g,{kind:'boarding',team:t.team,other:a.team,text:'The boarding is beaten off'});end();continue;}
  if(!def.length){
   // Capture: the hull and one real boarder move; no free crew, no free ship.
   const dock=g.state.buildings.filter(d=>d.team===a.team&&d.type==='dock'&&d.hp>0&&g.finished(d)).sort((p,q)=>dist(p,t)-dist(q,t)||p.id-q.id)[0];
   const prize=att.filter(u=>u.id!==a.captain).sort((p,q)=>(q.combatXP||0)-(p.combatXP||0)||p.id-q.id)[0]??att[0];
   if(!dock||!prize){t.hp=0;noteEvent(g,{kind:'sunk',team:a.team,other:t.team,text:'The prize is scuttled; there is no harbour to take her to'});end();continue;}
   if(prize.id===a.captain)delete a.captain;
   const oldTeam=t.team;t.team=a.team;t.dock=dock.id;t.captain=prize.id;prize.boat={id:t.id,phase:'aboard'};prize.x=t.x;prize.z=t.z;
   const rec=vesselOf(g,t.id);if(rec){rec.team=a.team;rec.atSeaSeconds=0;}
   const mine=vesselOf(g,a.id);if(mine)mine.captures++;
   noteEvent(g,{kind:'capture',team:a.team,other:oldTeam,text:`${ad.name} takes a ${td.name} as a prize`});
   const cmd=commandersOf(g,a.team).find(c=>c.kind==='fleet'&&c.boatIds.includes(a.id));if(cmd)awardCommanderXp(g,cmd.id,12);
   end();continue;
  }
  const attackPower=power(g,a.id,true,td),defendPower=power(g,t.id,false,ad);
  const lowest=(l:Unit[])=>l.slice().sort((p,q)=>p.hp-q.hp||p.id-q.id)[0];
  const hurt=(from:Unit[],to:Unit[],amount:number,team:number)=>{const victim=lowest(to),src=from[0];if(victim&&src&&amount>0)g.applyCombatDamage(team,victim,amount*C.boardingDamagePerSecond*dt,src.id);};
  hurt(att,def,attackPower,a.team);hurt(def,att,defendPower,t.team);
 }
}
/** Dispatch-friendly start: pick the nearest hostile hull in grapnel range. */
export function boardNearest(g:Game,attackerId:number,team=0):NavalOutcome{
 const a=boatById(g,attackerId);if(!a||a.team!==team)return no('Not one of your hulls');
 const near=(g.state.boats??[]).filter(b=>b.hp>0&&b.team!==team).sort((p,q)=>dist(p,a)-dist(q,a)||p.id-q.id)[0];
 return near?beginBoarding(g,attackerId,near.id,team):no('No enemy hull nearby');
}

// -- supply at sea --------------------------------------------------------------------------------------------------------------
export function navalIndependentFood(g:Game,u:Unit){
 if(u.boat?.phase!=='aboard'||u.hp<=0||u.prisoner||u.coastalVoyageId||u.societyMissionId||u.scoutProvisions||u.expedition)return false;
 const v=vesselOf(g,u.boat.id),b=boatById(g,u.boat.id);if(!v||!b||v.team!==u.team||b.team!==u.team)return false;
 return !g.state.buildings.some(d=>d.team===u.team&&d.type==='dock'&&d.hp>0&&g.finished(d)&&dist(d,b)<=NAVAL_RULES.seaRadiusMeters);
}
function tickSupply(g:Game,dt:number){
 const s=navalState(g);if(!s)return;
 for(const v of s.vessels){
  const b=boatById(g,v.boatId);if(!b||b.team!==v.team)continue;
  const home=g.state.buildings.some(d=>d.team===v.team&&d.type==='dock'&&d.hp>0&&g.finished(d)&&dist(d,b)<=NAVAL_RULES.seaRadiusMeters);
  if(home){v.atSeaSeconds=0;continue;}
  const crew=aboard(g,b.id).filter(u=>navalIndependentFood(g,u));if(!crew.length)continue;
  v.atSeaSeconds+=dt;
  const need=crew.length*FOOD_PER_PERSON_SECOND*dt,eaten=Math.min(v.stores.food,need);v.stores.food-=eaten;
  if(v.stores.foodLots){let left=eaten;for(const k of FOOD_KINDS){const n=Math.min(left,v.stores.foodLots[k]??0);v.stores.foodLots[k]=(v.stores.foodLots[k]??0)-n;left-=n;}}
  const fraction=need>0?Math.min(1,eaten/need):1;
  for(const u of crew){const previous=u.hunger||0,deficit=1-fraction;u.hunger=Math.min(1200,Math.max(0,previous+dt*deficit-dt*3*fraction));const exposure=Math.max(0,previous+dt*deficit-60)-Math.max(0,previous-60);if(deficit>0)u.hp=Math.max(0,u.hp-exposure*u.maxHp/160);}
  if(eaten+1e-9<need){
   if(!s.events.some(e=>e.kind==='starved'&&e.team===v.team&&g.state.time-e.at<120))noteEvent(g,{kind:'starved',team:v.team,text:`${shipDesign(v.design)?.name??'A hull'} has run out of rations at sea`});
  }
 }
}
/** Combined speed factor for boat movement: supply starvation and a fleet commander's navigation. */
export function navalSpeedFactor(g:Game,boat:{id:number;x:number;z:number}){
 if(!navalState(g)?.vessels.length&&!(g.state as unknown as {commanders?:{roster:unknown[]}}).commanders?.roster.length)return 1;
 const v=vesselOf(g,boat.id),starved=v&&v.stores.food<=0&&v.atSeaSeconds>0?NAVAL_RULES.starvedSpeed:1;
 return starved*(1+(fleetAuraFor(g,boat)?.navalSpeed??0));
}

// -- tick and read model ------------------------------------------------------------------------------------------------------
export function tickNaval(g:Game,dt:number){
 if(!navalState(g)||!(dt>0))return;
 tickNavalPorts(g,dt);tickCommissions(g,dt);tickBlockades(g,dt);tickBoardings(g,dt);tickRams(g,dt);tickSupply(g,dt);
 const s=navalState(g)!,boats=new Set((g.state.boats??[]).map(b=>b.id));
 if(s.vessels.some(v=>!boats.has(v.boatId)))s.vessels=s.vessels.filter(v=>boats.has(v.boatId));
}
export type NavalView={
 ports:{dockId:number;tier:number;tierName:string;moorage:number;moored:number;works:string[];projects:{id:number;work:string;progress:number;of:number;phase:string}[];blockaded:boolean;blockadedBy:number|null;influenceReachMeters:number}[];
 vessels:{boatId:number;design:string;name:string;role:string;crew:number;hp:number;stores:{food:number;missiles:number};atSeaSeconds:number;starved:boolean;captures:number;rams:number}[];
 commissions:{id:number;design:string;progress:number;of:number;phase:string}[];
 events:{at:number;kind:string;text:string}[];designs:{id:string;name:string;role:string;baseHull:string;length:number;beam:number;requires:string[];cost:Record<string,number>}[];
};
export function navalView(g:Game,team=0):NavalView{
 const s=navalState(g);
 const docks=g.state.buildings.filter(b=>b.team===team&&b.type==='dock'&&b.hp>0&&g.finished(b));
 const ports=docks.map(d=>{const rec=portRecord(g,d.id),tier=portTier(g,d),info=PORT_TIERS[tier],bl=s?.vessels.length?dockBlockaded(g,d):false;
  return {dockId:d.id,tier,tierName:info.name,moorage:info.moorage,moored:(g.state.boats??[]).filter(b=>b.team===team&&b.hp>0&&dist(b,d)<=NAVAL_RULES.harbourMeters).length,works:Object.keys(rec?.works??{}),
   projects:(s?.projects??[]).filter(p=>p.dockId===d.id).map(p=>({id:p.id,work:p.work,progress:Math.round(p.progress),of:Math.round(({breakwater:240,slipway:180,lighthouse:300,drydock:360,navalStores:150} as Record<string,number>)[p.work]),phase:p.phase})),
   blockaded:bl,blockadedBy:s?.blockades.find(x=>x.dockId===d.id)?.by??null,influenceReachMeters:Math.round(NAVAL_RULES.baseShipReachMeters+(rec?.works.breakwater?NAVAL_RULES.breakwaterReach:0)+(rec?.works.lighthouse?NAVAL_RULES.lighthouseReach:0))};});
 const vessels=(s?.vessels??[]).filter(v=>v.team===team).map(v=>{const b=g.state.boats?.find(b=>b.id===v.boatId),d=shipDesign(v.design)!;return {boatId:v.boatId,design:v.design,name:d.name,role:d.role,crew:aboard(g,v.boatId).length,hp:b?Math.round(b.hp):0,stores:{food:Math.round(v.stores.food*10)/10,missiles:v.stores.missiles},atSeaSeconds:Math.round(v.atSeaSeconds),starved:v.stores.food<=0&&v.atSeaSeconds>0,captures:v.captures,rams:v.rams};});
 return {ports,vessels,commissions:(s?.commissions??[]).filter(c=>c.team===team).map(c=>({id:c.id,design:c.design,progress:Math.round(c.progress),of:shipDesign(c.design)!.workSeconds,phase:c.phase})),
  events:(s?.events??[]).filter(e=>e.team===team||e.other===team).slice(-12).map(e=>({at:Math.round(e.at),kind:e.kind,text:e.text})),
  designs:Object.values(SHIP_DESIGNS).map(d=>({id:d.id,name:d.name,role:d.role,baseHull:d.baseHull,length:d.length,beam:d.beam,requires:[...d.requires],cost:{...d.cost}}))};
}
