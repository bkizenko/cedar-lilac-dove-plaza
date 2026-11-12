import {siteBlocksRegrowth} from './sitePreparation';
import {campAnchor,supplyDrops,supplyApproach,type SupplyDrop} from './campAnchor';
import {hasTaskCommitment} from './workCommitments';
import type {Game} from "./sim";
import type {CropKind,Unit,ResourceNode,Building,GameState} from "./types";
import {HABITATS,habitatAt,habitatKindAt,soilQuality} from "./ecology";
import {calendar,crop,isDependent,reserveSeconds} from "./settlement";
import {beginExpedition} from "./journeys";
import {lifeEvent} from "./communities";

export const CROP_TRIAL_RULES={maximumPeople:3,workFractions:[1,.45,.25]}as const;
export const CROPS:CropKind[]=["grain","pulses","tubers"];
export type CultivationEvidence={demonstratedAt:number;actorIds:number[];inheritedSourceTeam?:number};
/** Historical receipts are earned only by positive staffed work, never inferred
 * from a field, an age, or a legacy cultivated flag. */
export function validCultivationEvidence(s:GameState){
 const actors=(ids:unknown,required=false)=>Array.isArray(ids)&&ids.length<=CROP_TRIAL_RULES.maximumPeople&&(!required||ids.length>0)&&new Set(ids).size===ids.length&&ids.every(id=>Number.isSafeInteger(id)&&id>0&&id<s.nextId);
 for(const t of s.tribes){
  for(const trial of [t.cropTrial,...(t.inheritedCropTrials||[]).map(q=>q.trial)])if(trial?.workActorIds!==undefined&&!actors(trial.workActorIds))return false;
  const evidence=t.cultivationEvidence;if(evidence===undefined)continue;
  if(!evidence||typeof evidence!=='object'||Array.isArray(evidence)||Object.keys(evidence).length>CROPS.length)return false;
  for(const [kind,r]of Object.entries(evidence)){
   if(!CROPS.includes(kind as CropKind)||!t.cultivated?.includes(kind as CropKind)||!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!['demonstratedAt','actorIds','inheritedSourceTeam'].includes(k))||!Number.isFinite(r.demonstratedAt)||r.demonstratedAt<0||r.demonstratedAt>s.time||!actors(r.actorIds,true))return false;
   if(r.inheritedSourceTeam!==undefined&&(!Number.isSafeInteger(r.inheritedSourceTeam)||!s.tribes.some(q=>q.id===r.inheritedSourceTeam)))return false;
  }
 }
 return true;
}

export const CROP_NAMES:Record<CropKind,string>={grain:"Wild grain",pulses:"Wild pulses",tubers:"Wild tubers"};
/** Optional fields migrate in place; existing cultivated land never loses its practice. */
export function initializeCultivation(g:Game,legacy=false){
  for(const t of g.state.tribes){
    t.seeds??=Math.min(100000,Object.values(t.cropSamples||{}).reduce((n,v)=>n+(v||0),0));
    t.cropSamples??={};
    t.cultivated??=g.state.buildings.some(b=>b.team===t.id&&b.type==="farm")||legacy&&t.age>0?["grain"]:[];
  }
  // Candidate identity is initial/migration data, never a reward for reloading.
  if(g.state.cultivationVersion!==1){
  for(const n of g.state.forage){
    if(n.cropCandidate)continue;
    let hash=Math.imul(g.state.seed^n.id,0x45d9f3b);hash=(hash^(hash>>>16))>>>0;
    if(hash%2===0){
      const habitat=habitatAt(g,n.x,n.z);
      n.cropCandidate=habitatKindAt(g,n.x,n.z)==='forest'?"tubers":habitatKindAt(g,n.x,n.z)==='hills'?"pulses":"grain";
    }
  }
  // A viable starter patch is still unknown until somebody actually gathers it.
  const home=g.campOf(0),near=g.state.forage.filter(n=>Math.hypot(n.x-home.x,n.z-home.z)<35);
  if(near.length&&!near.some(n=>n.cropCandidate))near[0].cropCandidate=habitatKindAt(g,near[0].x,near[0].z)==='forest'?"tubers":"grain";
  }
  g.state.cultivationVersion=1;
}
export function collectSamples(u:Unit,n:ResourceNode,food:number){
  if(n.kind!=="forage"||!n.cropCandidate||food<=0)return;
  u.seedSamples??={};u.seedSamples[n.cropCandidate]=(u.seedSamples[n.cropCandidate]||0)+food*.5;
}
/** Stored seed headroom is independent of automatic gathering targets. Refuse
 * the whole receipt before mutations at the strict bound; the carrier keeps it. */
export const STORED_SEED_LIMIT=1e12;
export function deliverSamples(g:Game,u:Unit){
 const t=g.tribe(u.team),receipts:Partial<Record<CropKind,number>>={};let total=0;
 if(!u.seedSamples){if(u.carryType==='food'&&['grain','pulses','tubers'].includes(u.carryFood||''))total=u.carry*.08;}
 else{let remaining=u.carryType==='food'?u.carry*.5:0;for(const kind of CROPS){const amount=Math.min(remaining,u.seedSamples[kind]||0);remaining-=amount;if(amount>0){receipts[kind]=amount;total+=amount;}}}
 if((t.seeds||0)+total>STORED_SEED_LIMIT||CROPS.some(k=>(t.cropSamples?.[k]||0)+(receipts[k]||0)>STORED_SEED_LIMIT)){u.workReason='Seed storage is at its limit; carrying the same harvest until space is available';return false;}
 t.seeds=(t.seeds||0)+total;
 for(const kind of CROPS){const amount=receipts[kind]||0;if(!amount)continue;t.cropSamples??={};const first=!(t.cropSamples[kind]||0);t.cropSamples[kind]=(t.cropSamples[kind]||0)+amount;
  if(first&&u.team===0&&!t.cultivated?.includes(kind))lifeEvent(g,u.team,`${CROP_NAMES[kind]} samples brought home. Choose Test seeds in Knowledge, or enable Auto work for a free adult to try them.`);
 }
 u.seedSamples=undefined;return true;
}
export function cultivationIssue(g:Game,team=0){
  if(g.tribe(team).cultivated?.length)return null;
  const place=cropTrialWorkplace(g,team)?.kind==='camp'?'camp seed patch':'hearth';
  return `Bring home 8 wild crop food for 4 samples. Choose Test seeds in Knowledge, or enable Auto work; an available adult must reach the ${place}.`;
}
/** A settlement uses its primary completed hearth; a nomadic household uses
 * its real finite communal cache. Neither choice creates architecture or stock. */
export function cropTrialWorkplace(g:Game,team=0):SupplyDrop|null {
  const origin=g.campOf(team),hall=g.state.buildings.filter(b=>b.team===team&&b.type==="townhall"&&g.finished(b)).sort((a,b)=>Math.hypot(a.x-origin.x,a.z-origin.z)-Math.hypot(b.x-origin.x,b.z-origin.z)||a.id-b.id)[0];
  return hall||campAnchor(g,team);
}
export function inheritedTrialWorkplace(g:Game,team:number,q:NonNullable<ReturnType<Game['tribe']>['inheritedCropTrials']>[number]):SupplyDrop|null{
 if(q.anchor.kind==='building')return g.state.buildings.find(b=>b.id===q.anchor.id&&b.team===team&&g.finished(b))||null;
 return supplyDrops(g,team).find(p=>p.kind==='camp'&&Math.hypot(p.x-q.anchor.x,p.z-q.anchor.z)<.01)||null;
}
const inheritedActors=(g:Game,team:number)=>new Set((g.tribe(team).inheritedCropTrials||[]).flatMap(q=>q.actorIds));
export function beginInheritedCropTrial(g:Game,handoverId:number,unitId?:number,team=0){
 const t=g.tribe(team),q=t.inheritedCropTrials?.find(q=>q.handoverId===handoverId);if(!q)return false;
 const workplace=inheritedTrialWorkplace(g,team,q);if(!workplace)return false;
 q.actorIds=q.actorIds.filter(id=>g.state.units.some(u=>u.id===id&&u.team===team&&u.hp>0&&u.studyCrop===q.trial.kind));
 if(q.actorIds.length>=CROP_TRIAL_RULES.maximumPeople)return false;
 const u=g.state.units.find(u=>u.team===team&&(unitId===undefined||u.id===unitId)&&u.hp>0&&u.type==='worker'&&!u.prisoner&&!isDependent(g,u)&&!u.militia&&!u.boat&&!u.emergency&&!u.recalled&&!u.resting&&!u.shelterId&&!u.buildOrder&&u.drill==null&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&!u.jobLock&&!hasTaskCommitment(u)&&!u.studyCrop&&['idle','hold','gather'].includes(u.order)&&!!supplyApproach(g,u,workplace));
 if(!u)return false;g.interruptMission(u);for(const other of t.inheritedCropTrials||[])other.actorIds=other.actorIds.filter(id=>id!==u.id);q.actorIds.push(u.id);u.studyCrop=q.trial.kind;u.node=null;u.target=null;u.order='hold';u.workReason='Resuming the same paid seed trial at its original site';return true;
}
export function beginCropTrial(g:Game,kind:CropKind,team=0,automatic=false,unitId?:number){
  const t=g.tribe(team);
  if(!CROPS.includes(kind)||t.cultivated?.includes(kind)||t.cropTrial&&t.cropTrial.kind!==kind)return false;
  const workplace=cropTrialWorkplace(g,team);if(!workplace)return false;
  const inherited=inheritedActors(g,team),participants=g.state.units.filter(u=>u.hp>0&&u.team===team&&u.studyCrop===kind&&!inherited.has(u.id));
  if(participants.length>=CROP_TRIAL_RULES.maximumPeople||automatic&&participants.length>0)return false;
  const u=g.state.units.find(u=>u.team===team&&(unitId===undefined||u.id===unitId)&&!hasTaskCommitment(u)&&!(u as Unit&{prisoner?:unknown}).prisoner&&u.hp>0&&u.type==="worker"&&!isDependent(g,u)&&u.carry===0&&(!automatic||!u.recalled&&!u.jobLock&&u.buildOrder===undefined&&u.drill==null&&["idle","gather"].includes(u.order))&&!u.emergency&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.foundingJourney&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.copperStudy&&!u.studyCrop&&["idle","gather","hold"].includes(u.order)&&!!supplyApproach(g,u,workplace));
  if(!u)return false;
  if(!t.cropTrial){
    if((t.cropSamples?.[kind]||0)<4)return false;
    t.cropSamples![kind]=(t.cropSamples![kind]||0)-4;
    const home=g.campOf(team);
    t.cropTrial={kind,progress:0,duration:30+Math.round((1-soilQuality(g,home.x,home.z))*15)};
  }
  g.interruptMission(u);for(const q of t.inheritedCropTrials||[])q.actorIds=q.actorIds.filter(id=>id!==u.id);u.studyCrop=kind;u.node=null;u.target=null;u.order="hold";u.workReason=`Testing cultivation of ${kind}`;return true;
}
export function cropStudyAI(g:Game,u:Unit,dt:number){
  if(!u.copperStudy&&!u.studyCrop)return false;
  const t=g.tribe(u.team),inherited=t.inheritedCropTrials?.find(q=>q.actorIds.includes(u.id)),trial=inherited?.trial||t.cropTrial;
  if(u.order!=="hold"||!trial||trial.kind!==u.studyCrop||isDependent(g,u)) {u.studyCrop=undefined;return false;}
  const workplace=inherited?inheritedTrialWorkplace(g,u.team,inherited):cropTrialWorkplace(g,u.team);
  if(!workplace){u.studyCrop=undefined;u.order="idle";return false;}
  const spot=supplyApproach(g,u,workplace),place=workplace.kind==='camp'?'camp seed patch':'hearth';
  if(!spot){u.workReason=`Cultivation trial needs a reachable ${place}`;return true;}
  if(Math.hypot(u.x-spot.x,u.z-spot.z)>1){u.tx=spot.x;u.tz=spot.z;g.steer(u,dt);u.workReason=`Bringing cultivation work to the ${place}`;return true;}
  if(reserveSeconds(g,u.team)<60){u.workReason="Cultivation paused — food for the village comes first";u.studyCrop=undefined;u.order="idle";return false;}
  // Each real participant works only after reaching the same hearth. Stable
  // diminishing shares bound the benefit; extra samples are not charged.
  const inheritedIds=inheritedActors(g,u.team),participants=g.state.units.filter(p=>p.hp>0&&p.team===u.team&&p.studyCrop===trial.kind&&(inherited?inherited.actorIds.includes(p.id):!inheritedIds.has(p.id))).sort((a,b)=>a.id-b.id),rank=participants.indexOf(u);
  const before=trial.progress;
  trial.progress=Math.min(trial.duration,trial.progress+Math.max(0,dt)*(CROP_TRIAL_RULES.workFractions[rank]||0));
  if(trial.progress>before){
   const ids=trial.workActorIds??=[];
   // At most three most recent real contributors. A replacement adult is not
   // credited for earlier work; deceased contributors remain historical facts.
   if(!ids.includes(u.id)){if(ids.length>=CROP_TRIAL_RULES.maximumPeople)ids.shift();ids.push(u.id);}
  }
  u.stride+=dt*6;u.workReason=`Testing ${trial.kind} cultivation · ${Math.round(100*trial.progress/trial.duration)}%`;
  if(trial.progress>=trial.duration){
    t.cultivated??=[];const newlyLearned=!t.cultivated.includes(trial.kind);if(newlyLearned)t.cultivated.push(trial.kind);
    if(trial.workActorIds?.length&&t.cultivationEvidence?.[trial.kind]===undefined){
     t.cultivationEvidence??={};t.cultivationEvidence[trial.kind]={demonstratedAt:g.state.time,actorIds:[...trial.workActorIds],...(inherited?{inheritedSourceTeam:inherited.sourceTeam}:{})};
    }
    if(u.team===0&&newlyLearned){g.banner(`Learned to cultivate ${trial.kind}. Fields can now grow it.`,5);lifeEvent(g,0,`Cultivation trials established ${trial.kind}.`);}
    if(inherited)t.inheritedCropTrials=t.inheritedCropTrials!.filter(q=>q!==inherited);else t.cropTrial=undefined;for(const person of participants){person.studyCrop=undefined;person.order=g.state.autoWorkEnabled===false?'hold':'idle';person.workReason='Cultivation trial complete · ready for other work';}g.workBoard.reset();
  }
  return true;
}
export function cropYield(g:Game,b:Building){
  const kind=b.crop?.kind||b.cropType||"grain",habitat=habitatAt(g,b.x,b.z);
  return kind==="pulses"?.85:kind==="tubers"?(habitatKindAt(g,b.x,b.z)==='forest'?1.15:.9):1;
}
export function setFieldCrop(g:Game,id:number,kind:CropKind){
  const b=g.state.buildings.find(b=>b.id===id&&b.team===0&&b.type==="farm"&&g.finished(b));
  if(!b||!CROPS.includes(kind)||!g.tribe(0).cultivated?.includes(kind))return false;
  const current=crop(g,b);
  b.cropType=kind;
  // Once sown, a change is next spring's plan, never a conversion of live crops.
  if(current.planted===0&&calendar(g).phase===0)current.kind=kind;
  g.workBoard.reset();return true;
}
export function setFieldRest(g:Game,id:number,rest:boolean){
 const b=g.state.buildings.find(b=>b.id===id&&b.team===0&&b.type==='farm'&&g.finished(b));
 if(!b||calendar(g).phase!==0)return false;
 const current=crop(g,b);if(current.planted>0)return false;
 b.fallowYear=rest?calendar(g).year:undefined;
 if(rest)for(const u of g.state.units)if(u.node===b&&u.order==='gather'){
  u.node=null;u.order=u.carry>0?'return':'idle';u.workCheckAt=0;
 }
 g.workBoard.reset();return true;
}

/** Known plants are gathered; unknown locations require a provisioned search. */
export function seekCropSamples(g:Game){
  g.updateVision(0);
  const adults=g.state.units.filter(u=>u.team===0&&!hasTaskCommitment(u)&&!(u as Unit&{prisoner?:unknown}).prisoner&&u.hp>0&&u.type==="worker"&&!isDependent(g,u)&&u.carry===0&&!u.emergency&&!u.recalled&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.copperStudy&&!u.studyCrop&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.foundingJourney&&["idle","hold","gather"].includes(u.order))
    .sort((a,b)=>Number(b.selected)-Number(a.selected)||Number(a.order==="gather")-Number(b.order==="gather"));
  let sent=0;
  for(const u of adults){
    if(sent>=2)break;
    const patch=g.state.forage.filter(n=>n.amount>=1&&n.cropCandidate&&!g.tribe(0).cultivated?.includes(n.cropCandidate)&&g.exploredAt(n.x,n.z)&&g.workBoard.connected(g,u.x,u.z,n.x,n.z)&&g.state.units.filter(p=>p.hp>0&&p.node===n&&p.order==="gather").length<2)
      .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
    const destination=patch||g.findExploreTarget(u);
    if(!destination||!patch&&!beginExpedition(g,u))continue;
    g.interruptMission(u);u.job="food";u.jobLock=true;u.huntOnly=false;u.target=null;u.gatherT=0;u.tx=destination.x;u.tz=destination.z;
    u.node=patch||null;u.order=patch?"gather":"explore";u.searchJob=patch?undefined:"food";
    u.workReason=patch?`Gathering ${CROP_NAMES[patch.cropCandidate!]} — carry samples home`:"Searching unknown ground for edible plants and crop seeds";sent++;
  }
  g.workBoard.reset();g.banner(sent?`${sent} residents looking for wild crop samples; harvests must be brought home`:"Need an available adult and either a known plant or food for exploration",5);return sent;
}

/** One short automatic trial, with food work protected and explicit orders respected. */
export function tickAutomaticCultivation(g:Game){
 if(g.state.autoWorkEnabled===false)return;
 const t=g.tribe(0);
 if(!t||reserveSeconds(g,0)<120||g.state.weather==='storm')return;
 const inherited=t.inheritedCropTrials?.find(q=>!q.actorIds.some(id=>g.state.units.some(u=>u.id===id&&u.hp>0&&u.team===0&&u.studyCrop===q.trial.kind)));
 if(inherited&&beginInheritedCropTrial(g,inherited.handoverId))return;
 const kind=t.cropTrial?.kind||CROPS.find(k=>!t.cultivated?.includes(k)&&(t.cropSamples?.[k]||0)>=4);
 if(!kind)return;
 beginCropTrial(g,kind,0,true);
}
/** Replant depleted local stands with seed baskets, never logs. Existing forest
 * regrowth supplies the growth clock, weather response and saved tree identity. */
export function replantStand(g:Game,buildingId:number,team=0,limit=4,silent=false){
 const b=g.state.buildings.find(b=>b.id===buildingId&&b.team===team&&['lumber','townhall'].includes(b.type)&&!b.plannedCost&&g.finished(b));
 if(!b)return 0;
 const t=g.tribe(team);let planted=0;
 for(const n of g.state.trees){
  if(planted>=Math.max(0,Math.min(4,limit))||(t.seeds||0)<(team===0?1:5))break;
  if(n.amount>0||n.regenT<=120||Math.hypot(n.x-b.x,n.z-b.z)>28||(team===0&&!g.exploredAt(n.x,n.z)))continue;
  if(siteBlocksRegrowth(g,n))continue;
  if(g.state.buildings.some(site=>g.solidBuilding(site)&&Math.abs(site.x-n.x)<site.w*.4&&Math.abs(site.z-n.z)<site.d*.4))continue;
  t.seeds!--;n.regenT=120;n.planted=true;planted++;
 }
 if(team===0&&!silent)g.banner(planted?`${planted} trees replanted. Growth takes about two minutes in mild weather.`:'Need seed baskets and depleted trees within 28m of this camp.',5);
 return planted;
}

/** Shared seed-funded work assignment. Both societies must reach and plant each stump. */
export function assignWoodlandPlanting(g:Game,buildingId:number,team=0,reserve=8,known=(x:number,z:number)=>g.exploredAt(x,z)){
 if(calendar(g).phase>=2)return 0;
 const b=g.state.buildings.find(b=>b.id===buildingId&&b.team===team&&!b.plannedCost&&g.finished(b)&&['lumber','townhall'].includes(b.type));
 const t=g.tribe(team);if(!b||(t.seeds||0)<=reserve)return 0;
 let assigned=0;
 for(const n of g.state.trees){
  if(assigned>=4||(t.seeds||0)<=reserve)break;
  if(siteBlocksRegrowth(g,n))continue;
  if(n.amount>0||n.planted||n.regenT<=120||Math.hypot(n.x-b.x,n.z-b.z)>28||!known(n.x,n.z)||!g.walkable(n.x,n.z)||
     g.state.units.some(p=>p.hp>0&&p.plantingWork?.treeId===n.id))continue;
  const u=g.state.units.find(p=>p.team===team&&p.hp>0&&p.type==='worker'&&!isDependent(g,p)&&!p.militia&&!p.jobLock&&!p.buildOrder&&!p.tributeJourney&&p.drill==null&&!p.studyCrop&&!p.copperStudy&&!p.plantingWork&&!p.weaponWork&&!p.haulageWork&&!p.farmToolWork&&!p.tamingWork&&!p.emergency&&!p.recalled&&!p.expedition&&!p.scout&&!p.trade&&!p.visit&&!p.envoy&&!p.foundingJourney&&p.carry===0&&['idle','gather'].includes(p.order)&&Math.hypot(p.x-b.x,p.z-b.z)<35&&g.workBoard.connected(g,p.x,p.z,n.x,n.z));
  if(!u)break;
  t.seeds!--;u.plantingWork={treeId:n.id,progress:0};u.order='gather';u.node=null;u.job='wood';u.jobLock=true;assigned++;
 }
 if(assigned){g.workBoard.reset();if(team===0)g.banner(`${assigned} residents assigned to plant saplings`,3);}
 return assigned;
}
const forestReviews=new WeakMap<Game,number>();
/** Timber focus sustains worked forests with spare seeds; no mature logs appear instantly. */
export function tickManagedWoodland(g:Game,dt:number){
 if(g.state.autoWorkEnabled===false)return 0;
 const elapsed=(forestReviews.get(g)||0)+dt;
 if(elapsed<60){forestReviews.set(g,elapsed);return 0;}
 forestReviews.set(g,0);
 if(g.state.laborPolicy!=='wood')return 0;
 for(const b of g.state.buildings){
  if(b.team!==0||b.type!=='lumber')continue;
  const assigned=assignWoodlandPlanting(g,b.id);
  if(assigned)return assigned;
 }
 return 0;
}

export function plantingAI(g:Game,u:Unit,dt:number){
 const work=u.plantingWork;if(!work)return false;
 const n=g.state.trees.find(n=>n.id===work.treeId);
 if(!n||n.amount>0||n.planted){cancelPlanting(g,u);return false;}
 if(Math.hypot(u.x-n.x,u.z-n.z)>2){u.tx=n.x;u.tz=n.z;u.workReason='Taking a seed basket to the planting site';g.steer(u,dt);return true;}
 u.vx=0;u.vz=0;u.stride+=dt*5;u.workReason='Planting a sapling';work.progress=Math.min(12,work.progress+dt);
 if(work.progress>=12){n.planted=true;n.regenT=120;u.plantingWork=undefined;u.jobLock=false;u.order='idle';g.workBoard.reset();}
 return true;
}
export function cancelPlanting(g:Game,u:Unit){if(!u.plantingWork)return;u.plantingWork=undefined;g.tribe(u.team).seeds=(g.tribe(u.team).seeds||0)+1;u.jobLock=false;}
