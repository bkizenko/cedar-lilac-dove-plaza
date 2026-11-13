/** Quadruped pose solver: gait clips (idle, graze, alert, drink, walk, trot, gallop, dead) over the skeleton of animalModels.ts.
 * Pure maths: input is a state + a phase (from metres actually moved) + the frame time for breathing and ear flicks; output is one matrix per bone in
 * the torso frame and the height that puts the lowest hoof on the ground. No ambient randomness or clock. */
import * as THREE from 'three';
import type {Bone,QuadModel} from './animalModels';
import {boneMatrix} from './animalModels';

export type Gait='idle'|'graze'|'alert'|'drink'|'walk'|'trot'|'gallop'|'dead';
export type PoseIn={gait:Gait;/** cycle position 0..1 (walk/trot/gallop) */phase:number;/** seconds, drives breathing and flicks */t:number;seed:number;
 /** 0..1: adulthood (juvenile proportions: big head, long legs) */age:number};
export type Posed={mats:Map<string,THREE.Matrix4>;/** metres to add to the torso origin so the lowest hoof is on the ground */lift:number;pitch:number};
const D=Math.PI/180;
const sin=Math.sin,PI2=Math.PI*2;
const ease=(x:number)=>x*x*(3-2*x);
type GaitK={duty:number;legOff:Record<'foreL'|'foreR'|'hindL'|'hindR',number>};
const GAITS:Record<'walk'|'trot'|'gallop',GaitK>={
 // lateral-sequence walk, diagonal trot, transverse gallop
 walk:{duty:.66,legOff:{hindL:0,foreL:.25,hindR:.5,foreR:.75}},
 trot:{duty:.46,legOff:{hindL:0,foreR:0,foreL:.5,hindR:.5}},
 gallop:{duty:.34,legOff:{hindL:0,hindR:.09,foreR:.5,foreL:.6}},
};
/** leg chain deltas [U,M,C,H] (radians, relative to rest) for stride cycle position ph. */
function legCycle(fore:boolean,ph:number,k:GaitK,amp:number):[number,number,number,number]{
 ph=((ph%1)+1)%1;
 let u:number,f=0;
 if(ph<k.duty){u=amp*(1-2*ph/k.duty);}                       // stance: foot travels back relative to the body
 else{const s=(ph-k.duty)/(1-k.duty);u=-amp+2*amp*ease(s);f=sin(Math.PI*s);}   // swing: forward with joint flexion
 const fl=f*(.55+amp*.8);
 if(fore)return [u*.8,u*.2-fl*.35,-fl*1.05,-fl*.5];
 return [u*.8,u*.2-fl*.8,fl*1.25,-fl*.45];
}
const key=(m:QuadModel)=>m;
const grazeCache=new WeakMap<QuadModel,{neck:number;head:number}>();
/** Neck/head pitch that puts the muzzle just above the ground; solved from the real skeleton, cached per model. */
export function grazeAngles(m:QuadModel):{neck:number;head:number}{
 const hit=grazeCache.get(key(m));if(hit)return hit;
 const sp=m.spec,bones=m.bones,sol=(zn:number)=>{
  const zh=zn*-.55;
  const mats=new Map<string,THREE.Matrix4>();
  for(const b of bones){if(b.id!=='torso'&&b.id!=='neck'&&b.id!=='head')continue;const mm=boneMatrix(b,b.id==='neck'?[0,0,zn]:b.id==='head'?[0,0,zh]:undefined);if(b.parent)mm.premultiply(mats.get(b.parent)!);mats.set(b.id,mm);}
  const tip=sp.head.sec[sp.head.sec.length-1],v=new THREE.Vector3(tip[0],tip[1]-tip[2],0).applyMatrix4(mats.get('head')!);return {y:v.y,zh};
 };
 const ground=groundOf(m);let lo=-1.9,hi=0;
 for(let i=0;i<30;i++){const mid=(lo+hi)/2;if(sol(mid).y>ground+.04)hi=mid;else lo=mid;}
 const r={neck:(lo+hi)/2,head:(lo+hi)/2*-.55};grazeCache.set(m,r);return r;
}
const groundCache=new WeakMap<QuadModel,number>();
/** Standing ground height in the torso frame (lowest hoof). */
function groundOf(m:QuadModel){
 const hit=groundCache.get(m);if(hit!==undefined)return hit;
 const lo=Math.min(...Object.values(m.feetY));groundCache.set(m,lo);return lo;
}
const boxes=new WeakMap<QuadModel,Map<string,THREE.Vector3[]>>();
function footCorners(m:QuadModel,b:Bone){
 let mp=boxes.get(m);if(!mp){mp=new Map();boxes.set(m,mp);}
 let c=mp.get(b.part);
 if(!c){const g=m.geo[b.part]!;g.computeBoundingBox();const bb=g.boundingBox!;c=[];for(const x of [bb.min.x,bb.max.x])for(const y of [bb.min.y,bb.max.y])for(const z of [bb.min.z,bb.max.z])c.push(new THREE.Vector3(x,y,z));mp.set(b.part,c);}
 return c;
}
/** Deterministic ear flick (seeded): returns 0..1 envelope. */
function flick(t:number,seed:number,side:number){const p=(t*.37+seed*.173+side*.31)%1;return p<.05?sin(p/.05*Math.PI):0;}
export function solvePose(m:QuadModel,pin:PoseIn):Posed{
 const sp=m.spec,bones=m.bones,g=pin.gait,t=pin.t,seed=pin.seed;
 const moving=g==='walk'||g==='trot'||g==='gallop';
 const kg=moving?GAITS[g]:null,ampDeg=moving?sp.gait.amp[g==='walk'?0:g==='trot'?1:2]:0,amp=ampDeg*D;
 const ex=new Map<string,[number,number,number]>();const set=(id:string,v:[number,number,number])=>{const o=ex.get(id)??[0,0,0];ex.set(id,[o[0]+v[0],o[1]+v[1],o[2]+v[2]]);};
 let neck=0,head=0,tail=0,earFwd=0,pitch=0,bob=0,roll=0;
 const breath=sin(t*1.9+seed)*.012;
 switch(g){
  case 'idle':neck=breath+.05*sin(t*.31+seed);head=.03*sin(t*.23+seed*2);tail=.08*sin(t*.9+seed);break;
  case 'alert':neck=.34+breath;head=.16;earFwd=1;tail=.15;set('neck',[0,.35*sin(t*.2+seed),0]);break;
  case 'graze':{const a=grazeAngles(m);neck=a.neck+.04*sin(t*1.3+seed);head=a.head;tail=.12*sin(t*1.4+seed);break;}
  case 'drink':{const a=grazeAngles(m);neck=a.neck-.06;head=a.head;set('foreU-1',[0,0,.18]);set('foreU1',[0,0,.18]);break;}
  case 'dead':neck=-.5;head=-.3;break;
  default:break;
 }
 if(moving&&kg){
  const ph=pin.phase,legs:[string,boolean,number][]=[['foreU',true,0],['hindU',false,0]];
  void legs;
  for(const sd of [-1,1] as const){
   const lr=sd<0?'L':'R';
   for(const [grp,fore] of [['fore',true],['hind',false]] as const){
    const off=kg.legOff[(grp+lr) as 'foreL'];
    const d=legCycle(fore,ph+off,kg,amp);
    ex.set(grp+'U'+sd,[0,0,d[0]]);ex.set(grp+'M'+sd,[0,0,d[1]]);ex.set(grp+'C'+sd,[0,0,d[2]]);ex.set(grp+'H'+sd,[0,0,d[3]]);
   }
  }
  const w=PI2*ph;
  if(g==='walk'){bob=.012*Math.abs(sin(w*2))*sp.real.shoulder;roll=.025*sin(w);neck=.04*sin(w*2+1)+.02;head=-.03*sin(w*2+1);tail=.3*sin(w);pitch=.02*sin(w*2);}
  if(g==='trot'){bob=.03*Math.abs(sin(w*2))*sp.real.shoulder;roll=.02*sin(w);neck=.05*sin(w*2);head=-.04*sin(w*2);tail=.25*sin(w*2)+.2;pitch=.03*sin(w*2+.6);}
  if(g==='gallop'){const gp=sin(w);bob=.06*sp.real.shoulder*(.5+.5*sin(w+1.2));pitch=.12*sin(w+.5);neck=-.12+.18*sin(w+2.2);head=-.14-.08*sin(w+2.2);tail=.5;roll=0;
   ex.set('foreU-1',[0,0,legCycle(true,ph+kg.legOff.foreL,kg,amp)[0]]);void gp;}
  earFwd=g==='gallop'?-.8:0;
 }
 if(g!=='alert'&&g!=='dead'){set('neck',[0,.05*sin(t*.17+seed*3),0]);}
 const ears=(id:string,side:number)=>{const fl=flick(t,seed,side);const e:[number,number,number]=[0,0,-earFwd*sp.head.ear.pitch*D*.9+fl*.45+(g==='graze'?.12*sin(t*.8+side):0)];if(g==='gallop'||g==='graze'&&false)e[2]+=.6;set(id,e);};
 ears('ear-1',-1);ears('ear1',1);
 set('neck',[0,0,neck]);set('head',[0,0,head]);set('tail',[0,0,-tail]);
 // young: big head, long legs
 const young=1-Math.max(0,Math.min(1,pin.age)),headK=1+(sp.young.head-1)*young,legK=1+(sp.young.leg-1)*young;
 const mats=new Map<string,THREE.Matrix4>();
 const root=new THREE.Matrix4().compose(new THREE.Vector3(0,0,0),new THREE.Quaternion().setFromEuler(new THREE.Euler(roll,0,pitch,'ZYX')),new THREE.Vector3(1,1,1));
 for(const b of bones){
  const sc=b.id==='head'?headK:(b.part==='foreU'||b.part==='hindU')?legK:1;
  const mm=boneMatrix(b,ex.get(b.id),sc);
  if(b.parent)mm.premultiply(mats.get(b.parent)!);else mm.premultiply(root);
  mats.set(b.id,mm);
 }
 // lift: lowest foot bottom -> ground
 let low=1e9;const v=new THREE.Vector3();
 for(const b of bones)if(b.part==='foreH'||b.part==='hindH'){const mm=mats.get(b.id)!;for(const c of footCorners(m,b)){v.copy(c).applyMatrix4(mm);if(v.y<low)low=v.y;}}
 return {mats,lift:-low+bob,pitch};
}
/** Shoulder (withers) height of the standing animal, metres: top of the torso loft above the lowest hoof. */
export function standingShoulder(m:QuadModel){
 const p=solvePose(m,{gait:'idle',phase:0,t:0,seed:0,age:1});
 const top=Math.max(...m.spec.T.map(r=>r[1]));return top+p.lift;
}
