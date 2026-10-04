import type {Game} from "./sim";
import type {CropKind,Unit,ResourceNode,Building} from "./types";
import {HABITATS,habitatAt,soilQuality} from "./ecology";
import {isDependent,reserveSeconds} from "./settlement";
import {lifeEvent} from "./communities";

export const CROPS:CropKind[]=["grain","pulses","tubers"];
export const CROP_NAMES:Record<CropKind,string>={grain:"Wild grain",pulses:"Wild pulses",tubers:"Wild tubers"};
/** Optional fields migrate in place; existing cultivated land never loses its practice. */
export function initializeCultivation(g:Game,legacy=false){
  for(const t of g.state.tribes){
    t.cropSamples??={};
    t.cultivated??=g.state.buildings.some(b=>b.team===t.id&&b.type==="farm")||legacy&&t.age>0?["grain"]:[];
  }
  for(const n of g.state.forage){
    if(n.cropCandidate)continue;
    let hash=Math.imul(g.state.seed^n.id,0x45d9f3b);hash=(hash^(hash>>>16))>>>0;
    if(hash%4===0){
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
  u.seedSamples??={};u.seedSamples[n.cropCandidate]=(u.seedSamples[n.cropCandidate]||0)+food*.25;
}
export function deliverSamples(g:Game,u:Unit){
  if(!u.seedSamples)return;
  const t=g.tribe(u.team);t.cropSamples??={};
  let remaining=u.carryType==="food"?u.carry*.25:0;
  for(const kind of CROPS){
    const amount=Math.min(remaining,u.seedSamples[kind]||0);remaining-=amount;
    if(!amount)continue;
    const first=!(t.cropSamples[kind]||0);t.cropSamples[kind]=(t.cropSamples[kind]||0)+amount;
    if(first&&u.team===0&&!t.cultivated?.includes(kind))lifeEvent(g,u.team,`${CROP_NAMES[kind]} samples brought home. Test cultivation at the hearth.`);
  }
  u.seedSamples=undefined;
}
export function cultivationIssue(g:Game,team=0){
  return g.tribe(team).cultivated?.length?null:"Gather wild grain, pulses or tubers: bring home 16 food for 4 samples, then test cultivation in the village ledger (L).";
}
export function beginCropTrial(g:Game,kind:CropKind,team=0){
  const t=g.tribe(team);
  if(!CROPS.includes(kind)||t.cultivated?.includes(kind)||t.cropTrial&&t.cropTrial.kind!==kind)return false;
  if(g.state.units.some(u=>u.hp>0&&u.team===team&&u.studyCrop===kind))return false;
  const u=g.state.units.find(u=>u.team===team&&u.hp>0&&u.type==="worker"&&!isDependent(g,u)&&u.carry===0&&!u.emergency&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.foundingJourney&&!u.studyCrop&&["idle","gather","hold"].includes(u.order));
  if(!u||!g.state.buildings.some(b=>b.team===team&&b.type==="townhall"&&g.finished(b)))return false;
  if(!t.cropTrial){
    if((t.cropSamples?.[kind]||0)<4||t.wood<6||t.food<4)return false;
    t.cropSamples![kind]=(t.cropSamples![kind]||0)-4;t.wood-=6;t.food-=4;
    const home=g.campOf(team);
    t.cropTrial={kind,progress:0,duration:180+Math.round((1-soilQuality(g,home.x,home.z))*180)};
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
  const b=g.state.buildings.find(b=>b.id===id&&b.team===0&&b.type==="farm");
  if(!b||!g.tribe(0).cultivated?.includes(kind)||b.crop&&b.crop.planted>0&&b.crop.year===Math.floor(g.state.time/1800))return false;
  b.cropType=kind;if(b.crop)b.crop.kind=kind;g.workBoard.reset();return true;
}
