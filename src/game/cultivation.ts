import type {Game} from "./sim";
import type {CropKind,Unit,ResourceNode,Building} from "./types";
import {HABITATS,habitatAt,soilQuality} from "./ecology";
import {calendar,crop,isDependent,reserveSeconds} from "./settlement";
import {beginExpedition} from "./journeys";
import {lifeEvent} from "./communities";

export const CROPS:CropKind[]=["grain","pulses","tubers"];
export const CROP_NAMES:Record<CropKind,string>={grain:"Wild grain",pulses:"Wild pulses",tubers:"Wild tubers"};
/** Optional fields migrate in place; existing cultivated land never loses its practice. */
export function initializeCultivation(g:Game,legacy=false){
  for(const t of g.state.tribes){
    t.seeds??=Math.min(100000,Object.values(t.cropSamples||{}).reduce((n,v)=>n+(v||0),0));
    t.cropSamples??={};
    t.cultivated??=g.state.buildings.some(b=>b.team===t.id&&b.type==="farm")||legacy&&t.age>0?["grain"]:[];
  }
  for(const n of g.state.forage){
    if(n.cropCandidate)continue;
    let hash=Math.imul(g.state.seed^n.id,0x45d9f3b);hash=(hash^(hash>>>16))>>>0;
    if(hash%2===0){
      const habitat=habitatAt(g,n.x,n.z);
      n.cropCandidate=habitat===HABITATS.forest?"tubers":habitat===HABITATS.hills?"pulses":"grain";
    }
  }
  // A viable starter patch is still unknown until somebody actually gathers it.
  const home=g.campOf(0),near=g.state.forage.filter(n=>Math.hypot(n.x-home.x,n.z-home.z)<35);
  if(near.length&&!near.some(n=>n.cropCandidate))near[0].cropCandidate=habitatAt(g,near[0].x,near[0].z)===HABITATS.forest?"tubers":"grain";
  g.state.cultivationVersion=1;
}
export function collectSamples(u:Unit,n:ResourceNode,food:number){
  if(n.kind!=="forage"||!n.cropCandidate||food<=0)return;
  u.seedSamples??={};u.seedSamples[n.cropCandidate]=(u.seedSamples[n.cropCandidate]||0)+food*.5;
}
export function deliverSamples(g:Game,u:Unit){
  if(!u.seedSamples){
    if(u.carryType==='food'&&['grain','pulses','tubers'].includes(u.carryFood||''))g.tribe(u.team).seeds=Math.min(100000,(g.tribe(u.team).seeds||0)+u.carry*.08);
    return;
  }
  const t=g.tribe(u.team);t.cropSamples??={};
  let remaining=u.carryType==="food"?u.carry*.5:0;
  for(const kind of CROPS){
    const amount=Math.min(remaining,u.seedSamples[kind]||0);remaining-=amount;
    if(!amount)continue;
    t.seeds=Math.min(100000,(t.seeds||0)+amount);
    const first=!(t.cropSamples[kind]||0);t.cropSamples[kind]=(t.cropSamples[kind]||0)+amount;
    if(first&&u.team===0&&!t.cultivated?.includes(kind))lifeEvent(g,u.team,`${CROP_NAMES[kind]} samples brought home. Residents will test these seeds at the hearth automatically.`);
  }
  u.seedSamples=undefined;
}
export function cultivationIssue(g:Game,team=0){
  return g.tribe(team).cultivated?.length?null:"Gather wild grain, pulses or tubers: bring home 8 crop food for 4 samples, residents will learn cultivation automatically at the hearth.";
}
export function beginCropTrial(g:Game,kind:CropKind,team=0,automatic=false){
  const t=g.tribe(team);
  if(!CROPS.includes(kind)||t.cultivated?.includes(kind)||t.cropTrial&&t.cropTrial.kind!==kind)return false;
  if(g.state.units.some(u=>u.hp>0&&u.team===team&&u.studyCrop===kind))return false;
  const u=g.state.units.find(u=>u.team===team&&u.hp>0&&u.type==="worker"&&!isDependent(g,u)&&u.carry===0&&(!automatic||!u.recalled&&!u.jobLock&&u.buildOrder===undefined&&u.drill==null&&["idle","gather"].includes(u.order))&&!u.emergency&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.foundingJourney&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.studyCrop&&["idle","gather","hold"].includes(u.order));
  if(!u||!g.state.buildings.some(b=>b.team===team&&b.type==="townhall"&&g.finished(b)))return false;
  if(!t.cropTrial){
    if((t.cropSamples?.[kind]||0)<4)return false;
    t.cropSamples![kind]=(t.cropSamples![kind]||0)-4;
    const home=g.campOf(team);
    t.cropTrial={kind,progress:0,duration:30+Math.round((1-soilQuality(g,home.x,home.z))*15)};
  }
  u.studyCrop=kind;u.node=null;u.target=null;u.order="hold";u.workReason=`Testing cultivation of ${kind}`;return true;
}
export function cropStudyAI(g:Game,u:Unit,dt:number){
  if(!u.studyCrop)return false;
  const t=g.tribe(u.team),trial=t.cropTrial;
  if(u.order!=="hold"||!trial||trial.kind!==u.studyCrop||isDependent(g,u)) {u.studyCrop=undefined;return false;}
  const hall=g.state.buildings.filter(b=>b.team===u.team&&b.type==="townhall"&&g.finished(b)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(!hall){u.studyCrop=undefined;u.order="idle";return false;}
  const spot=g.interactionSpot(u,hall);
  if(!spot){u.workReason="Cultivation trial needs a reachable hearth";return false;}
  if(Math.hypot(u.x-spot.x,u.z-spot.z)>1){u.tx=spot.x;u.tz=spot.z;g.steer(u,dt);u.workReason="Bringing cultivation work to the hearth";return true;}
  if(reserveSeconds(g,u.team)<60){u.workReason="Cultivation paused — food for the village comes first";u.studyCrop=undefined;u.order="idle";return false;}
  // Only one participant contributes: extra villagers cannot accelerate it without limit.
  const lead=g.state.units.find(p=>p.hp>0&&p.team===u.team&&p.studyCrop===trial.kind);
  if(lead?.id===u.id)trial.progress=Math.min(trial.duration,trial.progress+dt);
  u.stride+=dt*6;u.workReason=`Testing ${trial.kind} cultivation · ${Math.round(100*trial.progress/trial.duration)}%`;
  if(trial.progress>=trial.duration){
    t.cultivated??=[];t.cultivated.push(trial.kind);
    if(u.team===0){g.banner(`Learned to cultivate ${trial.kind}. Fields can now grow it.`,5);lifeEvent(g,0,`Cultivation trials established ${trial.kind}.`);}
    t.cropTrial=undefined;u.studyCrop=undefined;u.order="idle";g.workBoard.reset();
  }
  return true;
}
export function cropYield(g:Game,b:Building){
  const kind=b.crop?.kind||b.cropType||"grain",habitat=habitatAt(g,b.x,b.z);
  return kind==="pulses"?.85:kind==="tubers"?(habitat===HABITATS.forest?1.15:.9):1;
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
  const adults=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==="worker"&&!isDependent(g,u)&&u.carry===0&&!u.emergency&&!u.recalled&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.studyCrop&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.foundingJourney&&["idle","hold","gather"].includes(u.order))
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
 const t=g.tribe(0);
 if(!t||reserveSeconds(g,0)<120||g.state.weather==='storm')return;
 const kind=t.cropTrial?.kind||CROPS.find(k=>!t.cultivated?.includes(k)&&(t.cropSamples?.[k]||0)>=4);
 if(!kind)return;
 beginCropTrial(g,kind,0,true);
}
/** Replant depleted local stands with seed baskets, never logs. Existing forest
 * regrowth supplies the growth clock, weather response and saved tree identity. */
export function replantStand(g:Game,buildingId:number,team=0){
 const b=g.state.buildings.find(b=>b.id===buildingId&&b.team===team&&['lumber','townhall'].includes(b.type)&&g.finished(b));
 if(!b)return 0;
 const t=g.tribe(team);let planted=0;
 for(const n of g.state.trees){
  if(planted>=4||(t.seeds||0)<(team===0?1:5))break;
  if(n.amount>0||n.regenT<=120||Math.hypot(n.x-b.x,n.z-b.z)>28||(team===0&&!g.exploredAt(n.x,n.z)))continue;
  if(g.state.buildings.some(site=>g.solidBuilding(site)&&Math.abs(site.x-n.x)<site.w*.4&&Math.abs(site.z-n.z)<site.d*.4))continue;
  t.seeds!--;n.regenT=120;n.planted=true;planted++;
 }
 if(team===0)g.banner(planted?`${planted} trees replanted. Growth takes about two minutes in mild weather.`:'Need seed baskets and depleted trees within 28m of this camp.',5);
 return planted;
}
