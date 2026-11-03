import{settleMaintenanceHandover}from'./buildingMaintenance';
import{captureCommunityKnowledge}from'./inheritedKnowledge';
import type{Game}from'./sim';import type{GameState,Unit}from'./types';
import type{CommunityHandover,HandoverProvenance,HandoverAnchor}from'./communityHandoverTypes';
import{gameSnapshot,validateGameSave}from'./persistence';import{foodInventory}from'./pantry';
import{reconcilePenWater,adoptHerdWaterLoad}from'./penWater';import{cropTrialWorkplace}from'./cultivation';
import{agreeSocietyTruce}from'./societyRelations';import{recordDiplomaticLegal}from'./diplomaticKnowledge';
import{WorkBoard}from'./settlement';
const live=(p:{phase:string})=>!['complete','completed','lost'].includes(p.phase);
const asset=(p:HandoverProvenance&{team:number},r:CommunityHandover)=>{p.originTeam??=p.team;p.handoverId=r.id;p.team=r.toTeam;};
const anchor=(p:ReturnType<typeof cropTrialWorkplace>):HandoverAnchor|undefined=>p?{kind:p.kind==='camp'?'camp':'building',...('id'in p?{id:p.id}:{}),x:p.x,y:p.y,z:p.z}:undefined;
type PaidProject=NonNullable<GameState['production']>['projects'][number];
function productionChangesOwner(p:PaidProject,people:Set<number>,sites:Set<number>){const phase=p.phase==='paused'?p.resumePhase:p.phase;if(['carrying','returning','unloading'].includes(phase))return p.actorId!==null&&people.has(p.actorId);if(['stored','collecting'].includes(phase))return p.cacheAnchor?.id!==undefined&&sites.has(p.cacheAnchor.id);return sites.has(p.workplace);}
function settleLocalProduction(s:GameState,p:PaidProject,r:CommunityHandover,sites:Set<number>){const phase=p.phase==='paused'?p.resumePhase:p.phase,u=s.units.find(u=>u.id===p.actorId),actorTeam=u?(r.residentIds.includes(u.id)?r.toTeam:u.team):undefined;if(u&&actorTeam!==p.team){if(u.productionProjectId===p.id)delete u.productionProjectId;p.actorId=null;if(phase==='collecting'){p.phase='stored';p.resumePhase='collecting';}else{p.phase='paused';p.resumePhase=phase as PaidProject['resumePhase'];}p.blockedReason='The paid parcel stays at its actual site; choose a same-owner replacement';}else if(phase==='carrying'&&!sites.has(p.workplace)&&p.team===r.toTeam||phase==='carrying'&&sites.has(p.workplace)&&p.team!==r.toTeam){p.phase='paused';p.resumePhase='carrying';p.blockedReason='Carried paid inputs retained; resume at a compatible owned workplace';}}
function stopCommerce(g:Game,source:number,only?:Set<number>){
 // Only the finite seller escrow is restored; carried cargo stays on its body.
 // Avoid recording this ownership/cancellation as a new food harvest.
 for(const u of g.state.units){if(only&&!only.has(u.id))continue;if(u.team!==source&&u.tradeTeam!==source&&u.tradeReservation?.team!==source)continue;
  const e=u.tradeReservation,hadReservation=!!e;if(e){const t=g.tribe(e.team);if(e.kind==='food'){const lots=foodInventory(t);lots.provisions+=e.amount;t.food+=e.amount;t.foodLots=lots;}else t[e.kind]+=e.amount;delete u.tradeReservation;}
  if(u.trade||hadReservation){u.trade=null;u.tradeTeam=0;u.customOffer=undefined;u.procurement=undefined;u.order='return';u.node=null;u.target=null;}
  if(u.visit){delete u.visit;u.order='return';u.node=null;u.target=null;}
  if(u.envoy){delete u.envoy;u.order='return';u.node=null;u.target=null;}
 }
}
function transferStocks(g:Game,r:CommunityHandover){const from=g.tribe(r.fromTeam),to=g.tribe(r.toTeam),a=foodInventory(from),b=foodInventory(to),oldItems={...to.items};
 r.stocks={food:from.food,foodLots:{...a},wood:from.wood,stone:from.stone,copper:from.copper,iron:from.iron,spears:from.spears,bows:from.bows,blades:from.blades,seeds:from.seeds||0,waterLiters:from.survival?.waterLiters||0,items:{...from.items}};
 for(const[k,n]of Object.entries(a))b[k as keyof typeof b]+=n;to.food+=from.food;to.foodLots=b;from.food=0;from.foodLots={};
 for(const key of['wood','stone','copper','iron','spears','bows','blades']as const){to[key]+=from[key];from[key]=0;}
 to.seeds=(to.seeds||0)+(from.seeds||0);from.seeds=0;
 if(from.items){to.items??={};for(const[k,n]of Object.entries(from.items))to.items[k as keyof typeof to.items]=(to.items[k as keyof typeof to.items]||0)+(n||0);from.items={};}
 for(const key of['flour','rawHide','cleanHide']as const)if((r.stocks.items[key]||0)>0){to.itemFreshness??={};if(!(oldItems[key]!>0))delete to.itemFreshness[key];const incoming=from.itemFreshness?.[key];if(incoming!==undefined)to.itemFreshness[key]=Math.min(to.itemFreshness[key]??Infinity,incoming);}if(from.itemFreshness)from.itemFreshness={};
 for(const key of['basketOrigins','potteryOrigins']as const)if(from[key]){to[key]??=[];for(const entry of from[key]!){const old=to[key]!.find(x=>JSON.stringify(x.origin)===JSON.stringify(entry.origin));if(old)old.count+=entry.count;else to[key]!.push(entry);}from[key]=[];}
 if(from.cropSamples){to.cropSamples??={};for(const[k,n]of Object.entries(from.cropSamples)){const key=k as keyof typeof to.cropSamples;to.cropSamples[key]=(to.cropSamples[key]||0)+(n||0);}from.cropSamples={};}
 if(from.survival){if(!to.survival)to.survival={waterLiters:0,waterConsumedLiters:0,waterDeliveredLiters:0,waterLostLiters:0,fuelBurnedWood:0,waterShortageSeconds:0,coldExposurePersonSeconds:0};to.survival.waterLiters+=from.survival.waterLiters;from.survival.waterLiters=0;}
}
function returnVoyage(g:Game,v:NonNullable<GameState['coastalVoyages']>[number]){const u=g.state.units.find(u=>u.id===v.actorId);if(!u)return;const paused=v.phase==='paused';const next=u.boat?.phase==='aboard'?'sailingHome':v.phase==='unloading'?'unloading':'boardingHome';v.resumePhase=next;v.phase=paused?'paused':next;v.blockedReason='Community joined — returning the same crew, hull, cargo and paid pack home';if(!paused&&next==='sailingHome'){u.order='move';u.tx=v.homeSea.x;u.tz=v.homeSea.z;}u.target=null;u.pillage=-1;u.attackDestination=null;}
/** Pure preflight: every edited object belongs to a structured-cloned draft.
 * No constructor, world regeneration, live reconciliation, RNG or save writes. */
export type LocalHandoverSelection={siteIds:number[];residentIds:number[];boatIds:number[];occupationId:number};
export function prepareOwnedHandover(g:Game,fromTeam:number,toTeam=0,local?:LocalHandoverSelection):{accepted:true;state:GameState;record:CommunityHandover}|{accepted:false;reason:string}{
 try{
  if(fromTeam===toTeam||fromTeam===3||toTeam===3||!g.tribe(fromTeam)?.alive||!g.tribe(toTeam)?.alive)return{accepted:false,reason:'The two communities must still exist'};
  validateGameSave(gameSnapshot(g));
  const draft=Object.assign(Object.create(Object.getPrototypeOf(g)),g)as Game;draft.state=structuredClone(g.state);draft.workBoard=new WorkBoard();draft.onSfx=()=>{};
  const s=draft.state,source=draft.tribe(fromTeam),trialAnchor=anchor(cropTrialWorkplace(draft,fromTeam));
  const sites=s.buildings.filter(b=>b.team===fromTeam&&(!local||local.siteIds.includes(b.id))),siteIds=new Set(sites.map(b=>b.id)),people=s.units.filter(u=>u.team===fromTeam&&(!local||local.residentIds.includes(u.id))),personIds=new Set(people.map(u=>u.id));
  const r:CommunityHandover={version:1,id:s.nextId++,fromTeam,toTeam,timeSeconds:s.time,scope:local?'community':'society',cacheAnchor:local?undefined:trialAnchor,recipientCacheAnchor:anchor(cropTrialWorkplace(draft,toTeam)),hallIds:sites.filter(b=>b.type==='townhall').map(b=>b.id),siteIds:sites.map(b=>b.id),residentIds:people.map(u=>u.id),boatIds:(s.boats||[]).filter(b=>b.team===fromTeam&&(!local||local.boatIds.includes(b.id))).map(b=>b.id),productionIds:(s.production?.projects||[]).filter(p=>p.team===fromTeam&&live(p)&&(!local||productionChangesOwner(p,personIds,siteIds))).map(p=>p.id),haulageProjectIds:(s.haulageProjects||[]).filter(p=>p.team===fromTeam&&(!local||siteIds.has(p.work.workplace))).map(p=>p.id),livestockIds:(s.livestock||[]).filter(a=>a.team===fromTeam&&(!local||siteIds.has(a.pen))).map(a=>a.id),coastalVoyageIds:(s.coastalVoyages||[]).filter(v=>v.team===fromTeam&&live(v)&&(!local||personIds.has(v.actorId)&&local.boatIds.includes(v.boatId))).map(v=>v.id),societyMissionIds:(s.rivalMissions||[]).filter(m=>m.team===fromTeam&&live(m)&&(!local||m.actors.every(a=>personIds.has(a.id)))).map(m=>m.id),coastalCommissionIds:(s.coastalCommissions||[]).filter(c=>c.team===fromTeam&&(!local||c.dockId!==undefined&&siteIds.has(c.dockId))).map(c=>c.id)};
  r.knowledge=captureCommunityKnowledge(draft,r);if(r.knowledge.proofs.some(p=>p.copperPrototype))draft.tribe(toTeam).copperExperiment=true;draft.tribe(toTeam).cultivated=[...new Set([...(draft.tribe(toTeam).cultivated||[]),...r.knowledge.proofs.flatMap(p=>p.cultivated)])];s.communityHandovers??=[];s.communityHandovers.push(r);
  reconcilePenWater(draft);stopCommerce(draft,fromTeam,local?personIds:undefined);if(!local)transferStocks(draft,r);
  if(source.cropTrial&&(!local||trialAnchor?.id!==undefined&&siteIds.has(trialAnchor.id))){if(!trialAnchor)return{accepted:false,reason:'The paid seed trial has no physical workplace'};const trialActors=people.filter(u=>u.studyCrop===source.cropTrial!.kind);if(local)for(const u of s.units)if(u.team===fromTeam&&!personIds.has(u.id)&&u.studyCrop===source.cropTrial!.kind)delete u.studyCrop;draft.tribe(toTeam).inheritedCropTrials??=[];draft.tribe(toTeam).inheritedCropTrials!.push({sourceTeam:fromTeam,handoverId:r.id,trial:{...source.cropTrial},actorIds:trialActors.map(u=>u.id),anchor:trialAnchor});source.cropTrial=undefined;}
  if(source.inheritedCropTrials?.length){const move=source.inheritedCropTrials.filter(q=>!local||q.anchor.id!==undefined&&siteIds.has(q.anchor.id));draft.tribe(toTeam).inheritedCropTrials??=[];draft.tribe(toTeam).inheritedCropTrials!.push(...move);source.inheritedCropTrials=source.inheritedCropTrials.filter(q=>!move.includes(q));if(local)for(const q of move){for(const id of q.actorIds)if(!personIds.has(id)){const actor=s.units.find(u=>u.id===id);if(actor?.studyCrop===q.trial.kind)delete actor.studyCrop;}q.actorIds=q.actorIds.filter(id=>personIds.has(id));}if(local)for(const q of source.inheritedCropTrials)q.actorIds=q.actorIds.filter(id=>!personIds.has(id));}
  for(const p of s.production?.projects||[]){if(r.productionIds.includes(p.id))asset(p,r);if(local&&live(p)&&(siteIds.has(p.workplace)||p.actorId!==null&&personIds.has(p.actorId)))settleLocalProduction(s,p,r,siteIds);}
  for(const p of s.haulageProjects||[]){if(r.haulageProjectIds.includes(p.id))asset(p,r);if(local&&p.actorId!==null&&((personIds.has(p.actorId)?toTeam:fromTeam)!==p.team)){const u=s.units.find(u=>u.id===p.actorId);if(u?.haulageWork?.projectId===p.id)delete u.haulageWork;p.lastActorId=p.actorId;p.actorId=null;p.work.paused=true;p.blockedReason='Paid transport batch remains at its actual workplace; choose a same-owner replacement';}}
  for(const b of sites){b.team=toTeam;b.selected=false;}
  for(const b of s.boats||[])if(r.boatIds.includes(b.id))b.team=toTeam;
  for(const a of s.livestock||[])if(r.livestockIds.includes(a.id))a.team=toTeam;
  for(const u of people){if(local&&u.studyCrop&&!draft.tribe(toTeam).inheritedCropTrials?.some(q=>q.actorIds.includes(u.id)))delete u.studyCrop;asset(u,r);u.selected=false;if(u.scout){u.scout.returning=true;delete u.scout.preparing;}if(u.prisoner?.phase==='released'&&(u.prisoner.rejoinedTeam??u.prisoner.originTeam)===fromTeam){u.prisoner.rejoinedTeam=toTeam;u.prisoner.rejoinedHandoverId=r.id;}if(u.waterCargoEvidence)asset(u.waterCargoEvidence,r);if(u.prisoner&&u.prisoner.captorTeam===fromTeam&&u.prisoner.originTeam!==toTeam)u.prisoner.captorTeam=toTeam;adoptHerdWaterLoad(draft,u);}
  reconcilePenWater(draft);
  for(const u of s.units){const w=u.practicalHelper;if(w){const leader=s.units.find(p=>p.id===w.leaderId),site=s.buildings.find(b=>b.id===w.workplace);if(leader?.team!==u.team||site?.team!==u.team){w.phase='paused';w.separatedAtHandoverId=r.id;}}const lesson=u.productionApprentice;if(lesson){const teacher=s.units.find(p=>p.id===lesson.teacherId),site=s.buildings.find(b=>b.id===lesson.workplace);if(teacher?.team!==u.team||site?.team!==u.team)lesson.phase='paused';}}
  for(const c of s.coastalCommissions||[])if(r.coastalCommissionIds.includes(c.id)){asset(c,r);c.phase='paused';c.reason='Community joined — paid dock and hull work remain available in their actual queues';const u=s.units.find(u=>u.id===c.actorId);if(u?.coastalCommissionId===c.id)delete u.coastalCommissionId;}
  for(const v of s.coastalVoyages||[])if(r.coastalVoyageIds.includes(v.id)){asset(v,r);returnVoyage(draft,v);}
  for(const m of s.rivalMissions||[])if(r.societyMissionIds.includes(m.id)){asset(m,r);m.phase='returning';m.blockedReason='Community joined — the same party and paid packs return physically';for(const a of m.actors){const u=s.units.find(u=>u.id===a.id);if(u){u.target=null;u.pillage=-1;u.attackDestination=null;}}}
  for(const u of s.units){if(u.enslavedFrom===fromTeam&&u.team===toTeam&&(!local||personIds.has(u.id))){if(!personIds.has(u.id)){r.residentIds.push(u.id);personIds.add(u.id);}delete u.enslavedFrom;delete u.captivityUnrest;}if(u.prisoner&&((u.prisoner.originTeam===fromTeam&&u.prisoner.captorTeam===toTeam)||(u.prisoner.originTeam===toTeam&&u.prisoner.captorTeam===fromTeam))&&(!local||personIds.has(u.id))){if(!personIds.has(u.id)){r.residentIds.push(u.id);personIds.add(u.id);}u.prisoner.phase='released';if(u.prisoner.originTeam!==toTeam){u.prisoner.rejoinedTeam=toTeam;u.prisoner.rejoinedHandoverId=r.id;}const guard=s.units.find(p=>p.id===u.prisoner!.guardId);if(guard?.escortId===u.id)delete guard.escortId;delete u.prisoner.guardId;u.order='return';u.recalled=true;u.repatriating=true;}if(u.target?.team===u.team){u.target=null;u.pillage=-1;u.attackDestination=null;if(['attack','attackmove'].includes(u.order))u.order='hold';}}
  for(const message of s.diplomaticMessages||[])if(message.team===fromTeam&&!['delivered','lost','superseded'].includes(message.phase)&&(!local||message.carrierId!==undefined&&personIds.has(message.carrierId))){message.phase='superseded';message.supersededAtHandoverId=r.id;}
  for(const u of s.units)if(r.residentIds.includes(u.id)&&(!u.prisoner||u.prisoner.phase==='released')){for(const p of[...(u.tradeIntelCargo||[]),...(u.structureReportCargo||[]),...(u.visitorRefusalCargo?[u.visitorRefusalCargo]:[])]){p.holderTeam=toTeam;p.handoverId=r.id;}}
  for(const c of s.communities||[])if(c.team===fromTeam&&(!local||siteIds.has(c.hall)))c.team=toTeam;
  if(!local)for(const p of s.regions)if(p.owner===fromTeam)p.owner=toTeam;
  for(const c of s.occupations||[])if(!local&&(c.formerTeam===fromTeam||c.controllerTeam===fromTeam)){if(!['integrated','withdrawn'].includes(c.phase)){c.phase='withdrawn';c.blockedReason='Prior authority ended by lawful community handover; actual people and structures remain';}}
  s.projectiles=s.projectiles.filter(p=>{if(p.team===fromTeam&&(!local||p.attackerId!==undefined&&personIds.has(p.attackerId)))p.team=toTeam;return!p.target||p.target.team!==p.team;});
  if(!local)s.routes=s.routes.filter(p=>p.team!==fromTeam);for(const u of s.units)if(u.caravanRoute!==undefined&&!s.routes.some(r=>r.id===u.caravanRoute))delete u.caravanRoute;
  if(s.encounter?.team===fromTeam&&(!local||personIds.has(s.encounter.stranger)))s.encounter=undefined;
  if(!local){  agreeSocietyTruce(draft,toTeam,fromTeam);source.hostile=false;source.ally=false;source.tension=0;source.peaceTerm='annexation';source.peaceOffer=undefined;source.tribute=undefined;source.alive=false;source.fallenT=s.time;
  if(!s.tribes.some(t=>t.id>0&&t.id!==3&&t.alive))s.conquestAt=s.time;
  recordDiplomaticLegal(draft,fromTeam,false);}
  else{const c=s.occupations?.find(c=>c.id===local.occupationId);if(c){c.phase='integrated';c.integratedAt=s.time;c.blockedReason=undefined;}}
  s.selBld=null;s.placing=null;s.walkDirty=true;
  settleMaintenanceHandover(s,fromTeam,toTeam,!!local,siteIds,personIds);
  validateGameSave(gameSnapshot(draft));return{accepted:true,state:s,record:r};
 }catch(e){return{accepted:false,reason:e instanceof Error?e.message:'The community handover could not preserve its owned work'};}
}
export function prepareSocietyHandover(g:Game,fromTeam:number,toTeam=0){return prepareOwnedHandover(g,fromTeam,toTeam);}
export function annexSociety(g:Game,fromTeam:number){const plan=prepareSocietyHandover(g,fromTeam);if(!plan.accepted)return false;g.commitCommunityState(plan.state);g.banner(`Annexation agreed with ${g.tribe(fromTeam).name}. People, structures and paid work joined intact.`,7);return true;}
