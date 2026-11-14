/** Bridges the game's Critter / Livestock / fishing-ground state to the instanced animal rig layer. Reads real state only; draws, never mutates.
 * `?animals=legacy` (or localStorage hearthwild.animals=legacy) keeps the old merged low-poly meshes. */
import * as THREE from 'three';
import {AnimalRigLayer,tierForDistance} from './animalRigLayer';
import {entryFor,hasEntry} from './animalCatalog';
import {lookFor,MotionTracker,type Look} from './animalLife';
import {shoalFor,type FishKind} from './fishShoal';
import {BIRDS} from './animalFlyers';
import {QUADS,type QuadId} from './animalSpecs';
import {hashSeed} from './buildingParts';
import type {Gait} from './animalPose';

export type AnimalSet='rig'|'legacy';
export function readAnimalSet():AnimalSet{
 try{const q=typeof location!=='undefined'?new URLSearchParams(location.search).get('animals'):null;if(q==='legacy'||q==='rig')return q;}catch{/* fall through */}
 try{const s=typeof localStorage!=='undefined'?localStorage.getItem('hearthwild.animals'):null;if(s==='legacy'||s==='rig')return s;}catch{/* fall through */}
 return 'rig';
}
/** Models face +X; the sim's facing is atan2(vx,vz) (forward = +Z at facing 0). */
/** Surface ripple rings around fish read as stray circles; off. */
const RIPPLES_ON=false;
export const FACING_OFFSET=-Math.PI/2;
export type AnimalRow={c:{id:number;species:string;x:number;y:number;z:number;facing:number;scale:number;hp:number;fly:number;beh?:{st:string};vx?:number;vz?:number;adultScale?:number;sex?:'female'|'male'};domestic:boolean;
 /** 0 spring .. 3 winter and progress within it */season:number;within:number;shore:boolean};
const bucket=(n:number)=>Math.round(n*4)/4;
export class AnimalAdapter{
 readonly layer:AnimalRigLayer;readonly motion=new MotionTracker();private smooth=new Map<number,{x:number;y:number;z:number;f:number;phase:number}>();private wallT=0;private looks=new Map<string,Look|null>();stats={animals:0};
 constructor(scene:THREE.Scene){this.layer=new AnimalRigLayer(scene);}
 private look(r:AnimalRow){
  const k=r.c.id+':'+r.c.species+':'+(r.domestic?1:0)+':'+r.season+':'+bucket(r.within)+':'+r.c.scale.toFixed(2);
  let l=this.looks.get(k);if(l===undefined){l=lookFor({id:r.c.id,species:r.c.species,scale:r.c.scale,...(r.c.adultScale?{adultScale:r.c.adultScale}:{}),...(r.c.sex?{sex:r.c.sex}:{})},r.domestic,r.season,bucket(r.within));if(this.looks.size>4000)this.looks.clear();this.looks.set(k,l);}
  return l;
 }
 frame(rows:readonly AnimalRow[],camera:THREE.Vector3,now:number,wall:number=now){
  const L=this.layer;L.beginFrame();this.stats.animals=rows.length;
  // Presentation smoothing: sim positions arrive in discrete steps, so ease the drawn position/heading toward them every frame (snap on teleports).
  const dtw=this.wallT?Math.min(.1,Math.max(0,wall-this.wallT)):0;this.wallT=wall;
  const kp=1-Math.exp(-dtw*14),kf=1-Math.exp(-dtw*9),seenIds=new Set<number>();
  for(const r of rows){
   const c=r.c,look=this.look(r);if(!look||!hasEntry(look.species))continue;
   const e=entryFor(look.species),dist=Math.hypot(c.x-camera.x,c.z-camera.z),tier=tierForDistance(dist),corpse=c.hp<=0;
   const bird=c.species==='bird',flying=bird&&c.y-0>0&&c.fly>0;
   const mot=this.motion.step(c.id,c.x,c.z,now,e.gait,e.herbivore,r.shore,look.seed,c.beh?.st,Math.hypot(c.vx??0,c.vz??0));
   let gait:Gait|'fly'|'swim'|'glide'=corpse?'dead':mot.gait==='idle'?mot.idle:mot.gait,phase=mot.phase;
   if(bird&&!corpse){const sp=BIRDS[look.species as 'duck'];gait=flying?(look.species==='raptor'?'glide':'fly'):mot.gait==='idle'?'idle':'walk';phase=(now*sp.hz*(flying?1:.3)+look.seed%10/10)%1000;}
   let sm=this.smooth.get(c.id);seenIds.add(c.id);
   if(!sm||Math.hypot(c.x-sm.x,c.z-sm.z)>3){sm={x:c.x,y:c.y,z:c.z,f:c.facing,phase:phase};this.smooth.set(c.id,sm);}
   else{
    const px=sm.x,pz=sm.z;sm.x+=(c.x-sm.x)*kp;sm.z+=(c.z-sm.z)*kp;sm.y+=(c.y-sm.y)*kp;
    let df=c.facing-sm.f;df=Math.atan2(Math.sin(df),Math.cos(df));if(Math.hypot(c.vx??0,c.vz??0)>.05||Math.abs(df)>1.2)sm.f+=df*kf;
    if(!bird&&!corpse&&mot.gait!=='idle'){const st=e.gait.stride[mot.gait==='walk'?0:mot.gait==='trot'?1:2];sm.phase=(sm.phase+Math.hypot(sm.x-px,sm.z-pz)/st)%1;}
    if(!bird&&!corpse)phase=sm.phase;
   }
   const size=look.size;
   const age=look.age;
   const posed=tier===2?null:e.pose(look.sex,look.seed,{gait,phase,t:now,seed:c.id,age});
   const lift=posed?posed.lift:(e.pose(look.sex,look.seed,{gait:'idle',phase:0,t:0,seed:c.id,age:1}).lift);
   const corpseShift=corpse?(QUADS[look.species as QuadId]?.T?.[3]?.[3]??.15)*.95:0;
   L.add({model:e.rig(look.sex,look.seed),x:sm.x,y:corpse?sm.y+corpseShift*size:sm.y,z:sm.z,facing:sm.f+FACING_OFFSET,size,mats:posed?.mats,lift:corpse?0:lift,tier,fly:flying,
    coat:{spots:look.coat.spots,winter:look.coat.winter,seed:look.coat.seed,tint:look.coat.tint,scale:look.coat.scale},rx:corpse?Math.PI/2:0,
    hidden:look.horns?undefined:['hornL','hornR']});
  }
  this.motion.prune();for(const id of this.smooth.keys())if(!seenIds.has(id))this.smooth.delete(id);L.endFrame();
 }
 dispose(){this.layer.dispose();}
}
type Water={waterAt(x:number,z:number):number};
/** Fish in the fishing grounds, replacing the grey marker wedge. */
export class FishAdapter{
 readonly layer:AnimalRigLayer;private ripples:THREE.InstancedMesh;private cap=96;
 private scene:THREE.Scene;
 constructor(scene:THREE.Scene){
  this.scene=scene;this.layer=new AnimalRigLayer(scene,false,{opacity:.88,renderOrder:3});
  const g=new THREE.RingGeometry(.82,1,20);g.rotateX(-Math.PI/2);
  this.ripples=new THREE.InstancedMesh(g,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}),this.cap);
  this.ripples.frustumCulled=false;this.ripples.renderOrder=4;this.ripples.count=0;this.ripples.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(this.cap*3),3);scene.add(this.ripples);
 }
 private wakes:{x:number;y:number;z:number;facing:number}[]=[];
 /** A moving boat leaves a short wake: three expanding rings behind the stern (drawn on the next frame). */
 wake(x:number,y:number,z:number,facing:number){if(this.wakes.length<48)this.wakes.push({x,y,z,facing});}
 private m=new THREE.Matrix4();private q=new THREE.Quaternion();private e=new THREE.Euler();private p=new THREE.Vector3();private s=new THREE.Vector3();private col=new THREE.Color();
 frame(nodes:readonly {id:number;x:number;z:number;amount:number;maxAmt?:number;scale?:number}[],water:Water,camera:THREE.Vector3,now:number,visible:(x:number,z:number)=>boolean){
  const L=this.layer;L.beginFrame();let ri=0;
  for(const n of nodes){
   if(!(n.amount>=1)||!visible(n.x,n.z))continue;
   const dist=Math.hypot(n.x-camera.x,n.z-camera.z);if(dist>150)continue;
   const {fish,ripples}=shoalFor(n,now),tier=tierForDistance(dist),surf=water.waterAt(n.x,n.z);
   for(const f of fish){
    const e=entryFor(f.kind),rig=e.rig('f',1),posed=tier===2?null:e.pose('f',1,{gait:f.leaping?'swim':'swim',phase:f.phase,t:now,seed:n.id,age:1});
    const sizeK=f.size,y=surf-f.depth;
    L.add({model:rig,x:f.x,y,z:f.z,facing:f.facing,size:sizeK,mats:posed?.mats,lift:0,tier,rz:f.pitch,coat:{spots:0,winter:0,seed:(n.id%97)/97,tint:[1,1,1],scale:1.4}});
   }
   for(const r of (RIPPLES_ON?ripples:[])){if(ri>=this.cap)break;const k=r.age/r.life,rad=r.radius+r.age*.5;
    this.p.set(r.x,surf+.03,r.z);this.s.set(rad,1,rad);this.q.identity();this.m.compose(this.p,this.q,this.s);this.ripples.setMatrixAt(ri,this.m);
    const a=Math.max(0,1-k)*.9;this.col.setRGB(a,a,a);this.ripples.setColorAt(ri,this.col);ri++;}
  }
  for(const w of this.wakes)for(let k=0;k<3&&ri<this.cap;k++){
   const back=1.7+k*.8,fx=Math.sin(w.facing),fz=Math.cos(w.facing),rad=.5+k*.4+.15*Math.sin(now*3+k);
   this.p.set(w.x-fx*back,w.y+.03,w.z-fz*back);this.s.set(rad,1,rad*.8);this.q.setFromAxisAngle(new THREE.Vector3(0,1,0),w.facing);this.m.compose(this.p,this.q,this.s);this.ripples.setMatrixAt(ri,this.m);
   const a=(1-k/3)*.6;this.col.setRGB(a,a,a);this.ripples.setColorAt(ri,this.col);ri++;}
  this.wakes.length=0;
  L.endFrame();this.ripples.count=ri;this.ripples.visible=ri>0;this.ripples.instanceMatrix.needsUpdate=true;if(this.ripples.instanceColor)this.ripples.instanceColor.needsUpdate=true;
 }
 dispose(){this.layer.dispose();this.scene.remove(this.ripples);this.ripples.geometry.dispose();(this.ripples.material as THREE.Material).dispose();}
}
void hashSeed;void (null as unknown as FishKind);
