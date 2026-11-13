/** Near-camera animal presentation: gait cycle, joint targets, head and body pose. Pure maths, no three.js, no simulation writes.
 *
 * The simulation (animalBehaviour.ts, or the legacy random walk in old saves) stays authoritative: this layer only reads an animal's
 * position, velocity, facing and behaviour state, and derives a smoothed body yaw, a stride phase advanced by actual ground speed
 * (stance feet move backward at exactly the body speed, so no sliding), two-bone leg targets, head/neck pose and lying-down.
 * Visual state is ephemeral and re-derived from the sim record when an animal enters the near zone, so there is no pop and nothing to save. */
import type {Critter,CritterKind} from '../game/types';
import type {DrawDistance} from '../game/drawDistance';
import {ANIMAL_TRAITS} from '../game/animalTraits';

/** Near-zone radius (m from the camera focus) per draw-distance tier; hysteresis keeps animals from flickering at the edge. */
export const ANIMAL_RIG_RULES={radius:{low:48,medium:80,high:110,ultra:150} as Record<DrawDistance,number>,leave:1.18,maxRigs:56,fishRadius:{low:40,medium:65,high:90,ultra:120} as Record<DrawDistance,number>,maxSchools:14,fishPerSchool:5} as const;
export const animalRigRadius=(level:DrawDistance)=>ANIMAL_RIG_RULES.radius[level]??ANIMAL_RIG_RULES.radius.medium;
/** Admit/retain the nearest animals: within radius to enter, radius*leave to stay, never more than maxRigs. Deterministic order. */
export function selectRigAnimals(list:readonly Critter[],cx:number,cz:number,radius:number,current:ReadonlySet<number>,max:number=ANIMAL_RIG_RULES.maxRigs){
 const cand:{c:Critter;d:number}[]=[];
 for(const c of list){const d=Math.hypot(c.x-cx,c.z-cz);if(d<=(current.has(c.id)?radius*ANIMAL_RIG_RULES.leave:radius))cand.push({c,d});}
 cand.sort((a,b)=>a.d-b.d||a.c.id-b.c.id);return cand.slice(0,max).map(v=>v.c);
}

export type Anatomy={bodyL:number;bodyH:number;bodyW:number;leg:number;legR:number;neck:number;headL:number;headR:number;tail:number;color:string;legColor:string;horn:'none'|'antler'|'horn'|'tusk';stance:number};
/** Proportions in metres at scale 1; legs are two equal bones (hip->knee->foot). */
export const ANATOMY:Record<CritterKind,Anatomy>={
 deer:{bodyL:.95,bodyH:.4,bodyW:.28,leg:.3,legR:.035,neck:.4,headL:.28,headR:.075,tail:.1,color:'#9a7248',legColor:'#5b4630',horn:'antler',stance:.17},
 boar:{bodyL:.8,bodyH:.52,bodyW:.4,leg:.17,legR:.05,neck:.2,headL:.34,headR:.11,tail:.12,color:'#4d3d33',legColor:'#2e2420',horn:'tusk',stance:.15},
 goat:{bodyL:.75,bodyH:.38,bodyW:.26,leg:.2,legR:.04,neck:.26,headL:.24,headR:.07,tail:.07,color:'#6b5a4a',legColor:'#3b3128',horn:'horn',stance:.13},
 sheep:{bodyL:.78,bodyH:.46,bodyW:.34,leg:.17,legR:.04,neck:.22,headL:.22,headR:.07,tail:.09,color:'#d9d2c0',legColor:'#4a4038',horn:'none',stance:.14},
 horse:{bodyL:1.2,bodyH:.5,bodyW:.34,leg:.45,legR:.045,neck:.55,headL:.42,headR:.09,tail:.45,color:'#80593a',legColor:'#3a2a1e',horn:'none',stance:.22},
 cattle:{bodyL:1.15,bodyH:.62,bodyW:.46,leg:.3,legR:.06,neck:.34,headL:.36,headR:.12,tail:.4,color:'#5d4636',legColor:'#2b211a',horn:'horn',stance:.2},
 wolf:{bodyL:.82,bodyH:.34,bodyW:.22,leg:.24,legR:.03,neck:.24,headL:.32,headR:.075,tail:.42,color:'#7b776f',legColor:'#46433e',horn:'none',stance:.12},
 bird:{bodyL:.34,bodyH:.14,bodyW:.12,leg:.07,legR:.012,neck:.05,headL:.08,headR:.035,tail:.14,color:'#2f2c2a',legColor:'#5a4a3a',horn:'none',stance:.04},
};
export type LegPose={fx:number;fy:number};
export type VisualState={id:number;species:CritterKind;yaw:number;phase:number;offsets:[number,number,number,number];lie:number;neckPitch:number;headPitch:number;headYaw:number;tailAng:number;bodyPitch:number;bodyRoll:number;speed:number;
 fold:number;flap:number;scan:number;last:{x:number;z:number}|null;t:number};
const wrap=(a:number)=>{a%=Math.PI*2;return a>Math.PI?a-Math.PI*2:a<-Math.PI?a+Math.PI*2:a;};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const ease=(u:number)=>u*u*(3-2*u);
const damp=(cur:number,tgt:number,rate:number,dt:number)=>cur+(tgt-cur)*(1-Math.exp(-rate*dt));
/** Start from the sim record so an animal entering the near zone continues smoothly: same yaw, speed-matched phase, state-matched pose. */
export function newVisual(c:Critter):VisualState{
 const st=c.beh?.st,lying=st==='rest'||st==='sleep'||st==='ruminate'||st==='wallow';
 const v:VisualState={id:c.id,species:c.species,yaw:c.facing,phase:(c.id*.37)%1,offsets:[0,.5,.5,0],lie:lying?1:0,neckPitch:0,headPitch:0,headYaw:0,tailAng:0,bodyPitch:0,bodyRoll:0,speed:Math.hypot(c.vx,c.vz),fold:0,flap:0,scan:(c.id*.9)%6.28,last:null,t:0};
 const target=headTarget(c);v.neckPitch=target.neck;v.headPitch=target.head;return v;
}
function headTarget(c:Critter){
 const st=c.beh?.st;
 switch(st){case 'graze':return{neck:1.0,head:.55};case 'drink':return{neck:1.15,head:.5};case 'wallow':case 'groom':return{neck:.45,head:.2};
  case 'alert':return{neck:-.35,head:-.15};case 'flee':case 'chase':return{neck:-.1,head:.1};case 'stalk':return{neck:.55,head:.15};case 'feed':return{neck:1.0,head:.5};
  case 'rest':case 'sleep':return{neck:.3,head:.1};case 'ruminate':return{neck:.05,head:0};case 'rut':return{neck:-.25,head:-.1};case 'nurse':return{neck:.8,head:.4};default:return{neck:.1,head:0};}
}
/** Gait table: stride length per leg-length, stance duty factor, per-leg phase offsets (LH, LF, RH, RF), speed (m/s) the gait is centred on. */
export function gaitFor(speed:number,species:CritterKind){
 const T=ANIMAL_TRAITS[species].gaits;
 if(speed<(T[0]+T[1])/2)return{k:1.35,duty:.66,off:[0,.25,.5,.75] as const};
 if(speed<(T[1]+T[2])/2)return{k:1.9,duty:.52,off:[0,.5,.5,0] as const};
 if(speed<(T[2]+T[3])/2)return{k:2.6,duty:.4,off:[0,.08,.45,.55] as const};
 return{k:3.3,duty:.3,off:[0,.1,.5,.6] as const};
}
/** Advance the visual state by dt seconds from the current sim record. Returns the foot targets (body-local sagittal: x forward, y up from the standing foot level). */
export function stepVisual(v:VisualState,c:Critter,dt:number,height:(x:number,z:number)=>number){
 const A=ANATOMY[c.species],s=c.scale,L=A.leg*s,st=c.beh?.st;
 v.t+=dt;const gv=Math.hypot(c.vx,c.vz);v.speed=damp(v.speed,gv,10,dt);
 // body yaw follows the actual heading with a bounded rate (no snapping, no spinning in place)
 const heading=gv>.12?Math.atan2(c.vx,c.vz):c.facing,face=gv>.12?heading:c.facing;
 v.yaw+=clamp(wrap(face-v.yaw),-4.5*dt,4.5*dt);
 const g=gaitFor(v.speed,c.species);
 // stride: feet on the ground move back at exactly the body speed
 const f=v.speed>.04?clamp(v.speed/Math.max(.05,g.k*L),.25,3.6):0,S=f>0?v.speed/f:0;
 v.phase=(v.phase+f*dt)%1;
 for(let i=0;i<4;i++)v.offsets[i]+=clamp(g.off[i]-v.offsets[i],-1.2*dt,1.2*dt);
 // posture targets
 const lying=st==='rest'||st==='sleep'||st==='ruminate'||st==='wallow'&&false||st==='groom'&&c.beh?.sp===0&&(c.id%3===0);
 v.lie=damp(v.lie,lying&&v.speed<.1?1:0,1.6,dt);
 const ht=headTarget(c);let neck=ht.neck,head=ht.head;
 if(st==='graze'&&v.speed>.04){neck=.9;head=.5;}
 // sentinels and drinkers scan; grazers lift their heads now and then
 v.scan+=dt*(st==='alert'?.8:.3);
 const lift=st==='graze'?Math.max(0,Math.sin(v.t*.4+c.id))>.82?1:0:0;
 if(lift){neck=-.15;head=-.05;}
 v.neckPitch=damp(v.neckPitch,neck,3.2,dt);v.headPitch=damp(v.headPitch,head,3.2,dt);
 v.headYaw=damp(v.headYaw,st==='alert'?Math.sin(v.scan)*.9:st==='graze'?Math.sin(v.scan*1.7)*.18:st==='stalk'?0:Math.sin(v.scan)*.12,4,dt);
 v.tailAng=damp(v.tailAng,Math.sin(v.t*(2+v.speed*2)+c.id)*(.25+.15*Math.min(1,v.speed)),8,dt);
 // terrain pitch from the ground under hips and shoulders
 const fx=Math.sin(v.yaw),fz=Math.cos(v.yaw),hl=A.bodyL*s*.5;
 const slope=Math.atan2(height(c.x+fx*hl,c.z+fz*hl)-height(c.x-fx*hl,c.z-fz*hl),hl*2);
 v.bodyPitch=damp(v.bodyPitch,slope*.8,6,dt);
 const turn=wrap(face-v.yaw);v.bodyRoll=damp(v.bodyRoll,clamp(turn*.18*Math.min(1,v.speed),-.18,.18),5,dt);
 v.flap+=dt*(c.species==='bird'?(st==='perch'?0:5+v.speed*1.6):0);
 v.fold=damp(v.fold,st==='perch'?1:0,4,dt);
 // legs
 const legs:LegPose[]=[];
 const H=Math.min(S*g.duty/2,L*.9);
 const bob=Math.abs(Math.sin(v.phase*Math.PI*2*(g.duty>.45?2:1)))*L*.04*Math.min(1,v.speed/1.5);
 for(let i=0;i<4;i++){
  const p=(v.phase+v.offsets[i])%1;let x:number,y:number;
  if(v.speed<.05&&!lying){x=0;y=0;}
  else if(p<g.duty){const u=p/g.duty;x=H*(1-2*u);y=0;}
  else{const u=(p-g.duty)/(1-g.duty);x=-H+2*H*ease(u);y=Math.sin(Math.PI*u)*L*.28*Math.min(1,.4+v.speed/2);}
  legs.push({fx:x*(1-v.lie),fy:y*(1-v.lie)});
 }
 const stand=L*2*.9,lieHip=A.bodyH*s*.5,hipH=stand*(1-v.lie)+lieHip*v.lie;
 return{legs,bob:bob*(1-v.lie),L,lie:v.lie,hipH};
}
/** Two-bone planar IK. Hip at (0,0), foot at (fx,-(L*2*.88)+fy). Returns knee offset and bone angles (from straight down, + = forward). Bend direction +1 knee forward (front legs), -1 backward (hind). */
export function legIK(len:number,hipH:number,fx:number,fy:number,bend:1|-1){
 const a=len,b=len,reach=a+b-.02*len;let dx=fx,dy=-hipH+fy;
 let d=Math.hypot(dx,dy);const maxD=a+b-1e-4,minD=.15*len;d=clamp(d,minD,maxD);
 const ang=Math.atan2(dx,-dy),cosA=clamp((a*a+d*d-b*b)/(2*a*d),-1,1),A=Math.acos(cosA);
 const upper=ang+bend*A,kx=Math.sin(upper)*a,ky=-Math.cos(upper)*a,lower=Math.atan2(dx-kx,-(dy-ky));
 return{upper,lower,kx,ky,footY:dy,reachY:reach};
}
/** Fish schooling and wake for the near zone: deterministic from time and node id, positions never read or written by the simulation. */
export function schoolFish(nodeId:number,index:number,t:number,spread:number){
 const a=nodeId*1.7+index*1.31,w=.35+((index*7+nodeId)%5)*.05;
 const px=Math.sin(t*w+a)*spread+Math.sin(t*.9*w+a*2)*spread*.4,pz=Math.cos(t*w*.8+a)*spread+Math.sin(t*.7*w+a)*spread*.3;
 const vx=Math.cos(t*w+a)*w*spread+Math.cos(t*.9*w+a*2)*.9*w*spread*.4,vz=-Math.sin(t*w*.8+a)*w*.8*spread+Math.cos(t*.7*w+a)*.7*w*spread*.3;
 const sp=Math.hypot(vx,vz),yaw=Math.atan2(vx,vz),depth=.18+.22*(.5+.5*Math.sin(t*.25+a*3));
 return{x:px,z:pz,yaw,speed:sp,depth,tail:Math.sin(t*(5+sp*3)+a)*.5,wake:depth<.26};
}
