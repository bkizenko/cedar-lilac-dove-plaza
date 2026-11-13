/** What a particular animal looks like and what it is doing, from real state only: species + id seed -> model, sex, age, coat; positions over time ->
 * speed, gait and stride phase; clock + seed -> idle behaviour (graze / alert / stand / drink). Pure and deterministic. */
import {hashSeed,seededRandom} from './buildingParts';
import {QUADS,TYPICAL_SCALE,type QuadId,type SpeciesId} from './animalSpecs';
import {hornFactor,type Sex} from './animalModels';
import type {Gait} from './animalPose';

export type Look={species:SpeciesId;sex:Sex;/** 0 newborn .. 1 adult */age:number;/** metres multiplier on the spec's real size */size:number;seed:number;
 horns:boolean;coat:{spots:number;winter:number;seed:number;tint:[number,number,number];scale:number}};
export type CritterLike={id:number;species:string;scale:number;adultScale?:number;sex?:'female'|'male'};
/** Season phase 0 spring .. 3 winter -> winter-coat amount (thick grey coat grows in autumn, is shed by early summer). */
export const winterAmount=(phase:number,within=.5)=>phase===3?1:phase===2?.35+.5*within:phase===0?.45*(1-within):0;
export function speciesFor(species:string,id:number,domestic:boolean):SpeciesId|null{
 const h=hashSeed(id,'species')%100;
 switch(species){
  case 'deer':return h<56?'redDeer':h<82?'fallowDeer':'roeDeer';
  case 'boar':return 'boar';
  case 'goat':return domestic?'goat':'ibex';
  case 'sheep':return domestic?'sheep':'mouflon';
  case 'horse':return domestic?'horse':'wildHorse';
  case 'cattle':return domestic?'cattle':'aurochs';
  case 'bird':return h<58?'duck':h<86?'goose':'raptor';
  case 'wolf':case 'fox':case 'bear':case 'hare':case 'donkey':case 'duck':case 'goose':case 'raptor':return species as SpeciesId;
  default:return null;
 }
}
/** Individual appearance. `season` = calendar phase 0..3, `within` = progress inside that season 0..1. */
export function lookFor(c:CritterLike,domestic:boolean,season:number,within=.5):Look|null{
 const sp=speciesFor(c.species,c.id,domestic);if(!sp)return null;
 const r=seededRandom(hashSeed(c.id,'look',sp)),sex:Sex=c.sex?(c.sex==='male'?'m':'f'):r()<.42?'m':'f';
 const typical=TYPICAL_SCALE[c.species]??1;
 let age=1;
 if(c.adultScale)age=Math.max(.1,Math.min(1,c.scale/c.adultScale));
 else if(r()<.13)age=.2+r()*.45;
 const q=QUADS[sp as QuadId];
 const sexK=q?(sex==='m'?Math.sqrt(q.sexSize):1/Math.sqrt(q.sexSize)):1,youngK=q?q.young.size+(1-q.young.size)*Math.min(1,age):1;
 const indiv=.94+r()*.12,size=((c.adultScale??c.scale)/typical)*sexK*youngK*indiv;
 const winter=(q?q.coat.winterGrey:.2)*winterAmount(season,within);
 let spots=0;
 if(q?.coat.spots){
  if(age<.55)spots=sp==='boar'?-.9:.95;
  else if(sp==='fallowDeer'&&season!==3&&hashSeed(c.id,'spot')%4!==0)spots=.85*(1-winterAmount(season,within));
 }else if(sp==='boar'&&age<.55)spots=-.95;
 const lum=.9+r()*.2,warm=(r()-.5)*.08,cold=winterAmount(season,within)>.6?.04:0;
 const hornsOn=hornFactor(sp as QuadId,sex)>0&&age>.7&&!(season===0&&(sp==='redDeer'||sp==='fallowDeer'||sp==='roeDeer')&&within<.6)&&!(sp==='roeDeer'&&season===3&&false);
 const shoulder=q?q.real.shoulder:.5;
 return {species:sp,sex,age,size,seed:hashSeed(c.id,'seed')%100000,horns:hornsOn,coat:{spots,winter,seed:(c.id%97)/97,tint:[lum+warm-cold,lum-cold*.5,lum-warm+cold],scale:.8/shoulder}};
}
// ---------------------------------------------------------------------------------------------------------------- motion
export type Motion={x:number;z:number;t:number;speed:number;phase:number;gait:Gait;gaitT:number;idleT:number;idle:Gait};
/** Per-animal motion memory: speed from real displacement, stride phase from real metres moved. */
export class MotionTracker{
 private m=new Map<number,Motion>();private seen=new Set<number>();
 get(id:number){return this.m.get(id);}
 /** `drink` true when standing beside water. */
 step(id:number,x:number,z:number,now:number,sp:{walkMax:number;trotMax:number;stride:readonly [number,number,number]},herbivore:boolean,drink:boolean,seed:number,simState?:string,v0=0):Motion{
  let s=this.m.get(id);
  if(!s){const g0:Gait=v0<.08?'idle':v0<sp.walkMax?'walk':v0<sp.trotMax?'trot':'gallop';
   s={x,z,t:now,speed:v0,phase:(seed%100)/100,gait:g0,gaitT:0,idleT:now-seed%7,idle:'idle'};this.m.set(id,s);}
  const dt=now-s.t;this.seen.add(id);
  if(dt>1e-4){
   const d=Math.hypot(x-s.x,z-s.z),inst=Math.min(d/dt,12),k=1-Math.exp(-dt*8);
   s.speed=d>3?0:s.speed+(inst-s.speed)*k;      // a teleport (spawn, pen move) is not locomotion
   const g:Gait=s.speed<.08?'idle':s.speed<sp.walkMax?'walk':s.speed<sp.trotMax?'trot':'gallop';
   const stride=g==='walk'?sp.stride[0]:g==='trot'?sp.stride[1]:sp.stride[2];
   if(g!=='idle'&&d<3)s.phase=(s.phase+d/stride)%1;
   s.gait=g;s.x=x;s.z=z;s.t=now;
  }
  if(s.gait==='idle'){
   // idle behaviour changes every 7-19 s, chosen by a seeded hash of the interval index: graze 55% (herbivores), alert 22%, stand otherwise
   const slot=Math.floor((now+seed%13)/ (7+(seed%12))),h=hashSeed(seed,slot)%100;
   // the behaviour sim (flagged saves) names what the animal is doing: show exactly that on the rig
   const sim=simState==='graze'?'graze':simState==='drink'?'drink':simState==='alert'||simState==='stalk'||simState==='flee'?'alert':simState==='rest'||simState==='sleep'||simState==='ruminate'||simState==='feed'?(simState==='feed'?'graze':'idle'):undefined;
   if(sim)s.idle=sim;else s.idle=drink?'drink':h<(herbivore?55:20)?'graze':h<(herbivore?77:50)?'alert':'idle';
  }
  return s;
 }
 prune(){for(const id of this.m.keys())if(!this.seen.has(id))this.m.delete(id);this.seen.clear();}
}
