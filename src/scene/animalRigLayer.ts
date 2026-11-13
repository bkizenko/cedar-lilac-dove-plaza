/** Near-camera animal rig: jointed legs (two-bone IK), neck and head, tail, wings; and swimming fish schools.
 * Presentation only. Positions come from the simulation each frame; nothing here writes game state. Shared unit part meshes are tinted per instance,
 * so the whole layer is about a dozen draw calls regardless of species. */
import * as THREE from 'three';
import type {Critter} from '../game/types';
import {ANATOMY,ANIMAL_RIG_RULES,legIK,newVisual,schoolFish,stepVisual,type VisualState} from './animalVisual';

const _m=new THREE.Matrix4(),_root=new THREE.Matrix4(),_loc=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_p=new THREE.Vector3(),_s=new THREE.Vector3(),_c=new THREE.Color();
const unitSphere=()=>new THREE.SphereGeometry(1,9,6);
const unitLimb=()=>{const g=new THREE.CylinderGeometry(1,.78,1,6);g.translate(0,-.5,0);return g;};
const unitNeck=()=>{const g=new THREE.CylinderGeometry(.7,1,1,6);g.rotateZ(-Math.PI/2);g.translate(.5,0,0);return g;};
const unitHead=()=>{const g=new THREE.SphereGeometry(1,8,6);g.translate(.4,0,0);return g;};
const unitHorn=()=>{const a=new THREE.ConeGeometry(1,1,5);a.translate(0,.5,0);const b=a.clone();a.translate(0,0,1.2);b.translate(0,0,-1.2);const m=new THREE.BufferGeometry();return mergeTwo(a,b);};
function mergeTwo(a:THREE.BufferGeometry,b:THREE.BufferGeometry){const A=a.toNonIndexed(),B=b.toNonIndexed(),pos=new Float32Array(A.attributes.position.count*3+B.attributes.position.count*3);pos.set(A.attributes.position.array as Float32Array,0);pos.set(B.attributes.position.array as Float32Array,A.attributes.position.count*3);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.computeVertexNormals();return g;}
const unitWing=()=>{const g=new THREE.SphereGeometry(1,7,4);g.translate(0,0,1);return g;};
const mkMesh=(geo:THREE.BufferGeometry,n:number,mat:THREE.Material)=>{const m=new THREE.InstancedMesh(geo,mat,n);m.count=0;m.frustumCulled=false;m.castShadow=true;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);return m;};

export class AnimalRigLayer{
 readonly group=new THREE.Group();
 readonly vis=new Map<number,VisualState>();
 body:THREE.InstancedMesh;head:THREE.InstancedMesh;neck:THREE.InstancedMesh;horn:THREE.InstancedMesh;tail:THREE.InstancedMesh;upper:THREE.InstancedMesh;lower:THREE.InstancedMesh;wing:THREE.InstancedMesh;
 /** animals drawn this frame, index-aligned with body/head instances (for picking) */
 drawn:Critter[]=[];
 constructor(scene:THREE.Scene,n=ANIMAL_RIG_RULES.maxRigs){
  const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92,metalness:0,flatShading:true});
  this.body=mkMesh(unitSphere(),n,mat);this.head=mkMesh(unitHead(),n,mat);this.neck=mkMesh(unitNeck(),n,mat);this.horn=mkMesh(unitHorn(),n,mat);this.tail=mkMesh(unitLimb(),n,mat);
  this.upper=mkMesh(unitLimb(),n*4,mat);this.lower=mkMesh(unitLimb(),n*4,mat);this.wing=mkMesh(unitWing(),n*2,mat);
  for(const m of this.meshes())this.group.add(m);scene.add(this.group);
 }
 meshes(){return[this.body,this.head,this.neck,this.horn,this.tail,this.upper,this.lower,this.wing];}
 /** Drop visual state for animals that left the near zone (they re-derive from the sim record on return). */
 update(animals:readonly Critter[],dt:number,height:(x:number,z:number)=>number){
  const keep=new Set<number>();this.drawn=[];let nb=0,nl=0,nw=0,nh=0;
  const col=(m:THREE.InstancedMesh,i:number,hex:string,k=1)=>{_c.set(hex);if(k!==1)_c.multiplyScalar(k);m.setColorAt(i,_c);};
  for(const c of animals){
   if(nb>=this.body.instanceMatrix.count)break;keep.add(c.id);
   let v=this.vis.get(c.id);if(!v){v=newVisual(c);this.vis.set(c.id,v);}
   const A=ANATOMY[c.species],s=c.scale,bird=c.species==='bird';
   const r=stepVisual(v,c,Math.min(dt,.1),height);
   const flying=bird&&c.beh?.st!=='perch'&&(c.beh?.alt??0)>.6;
   const groundY=bird?c.y-(c.beh?.alt??0):c.y;
   // root frame: yaw so local +x is the heading; pitch about z (nose up), roll about x
   _e.set(v.bodyRoll,v.yaw-Math.PI/2,v.bodyPitch,'YZX');_q.setFromEuler(_e);
   const baseY=(bird&&flying?c.y:groundY)+r.bob;
   _root.compose(_p.set(c.x,baseY,c.z),_q,_s.set(1,1,1));
   const L=r.L,hip=bird?(flying?.1:A.leg*2*s):r.hipH;
   const put=(mesh:THREE.InstancedMesh,i:number,local:THREE.Matrix4)=>{_m.multiplyMatrices(_root,local);mesh.setMatrixAt(i,_m);};
   const bodyY=hip+A.bodyH*s*.25;
   _loc.compose(_p.set(0,bodyY,0),_q.identity(),_s.set(A.bodyL*s/2,A.bodyH*s/2,A.bodyW*s/2));put(this.body,nb,_loc);col(this.body,nb,A.color);
   // neck and head
   const shoulderX=A.bodyL*s*.36,shoulderY=bodyY+A.bodyH*s*.18,nAng=bird?.5-v.neckPitch*.6:.55-v.neckPitch*1.8,nLen=A.neck*s;
   _e.set(0,v.headYaw*.4,nAng);_q.setFromEuler(_e);_loc.compose(_p.set(shoulderX,shoulderY,0),_q,_s.set(nLen,A.headR*s*1.6,A.headR*s*1.5));put(this.neck,nb,_loc);col(this.neck,nb,A.color,.96);
   const tipX=shoulderX+Math.cos(nAng)*nLen*Math.cos(v.headYaw*.4),tipY=shoulderY+Math.sin(nAng)*nLen,tipZ=-Math.sin(v.headYaw*.4)*Math.cos(nAng)*nLen;
   const hAng=nAng*.35-v.headPitch*.8-.1;_e.set(0,v.headYaw,hAng,'YZX');_q.setFromEuler(_e);
   _loc.compose(_p.set(tipX,tipY,tipZ),_q,_s.set(A.headL*s*.5,A.headR*s*1.1,A.headR*s));put(this.head,nb,_loc);col(this.head,nb,A.color,1.04);
   // horns / antlers / tusks ride on the head frame
   const hs=A.horn==='none'?0:A.horn==='antler'?.2:A.horn==='horn'?.12:.06;
   _loc.compose(_p.set(tipX,tipY+A.headR*s*.6,tipZ),_q,_s.set(A.headR*s*.35*(hs?1:0),hs*s*(hs?1:0),A.headR*s*.35*(hs?1:0)));
   _m.compose(_p,_q,_s);_loc.multiplyMatrices(_root,_m);this.horn.setMatrixAt(nb,_loc);col(this.horn,nb,A.horn==='tusk'?'#e8e0c8':A.horn==='antler'?'#b8a27a':'#d8d0b8');
   // tail
   _e.set(0,v.tailAng*.6,bird?-.2:-1.2+v.tailAng*.2);_q.setFromEuler(_e);_loc.compose(_p.set(-A.bodyL*s*.48,bodyY+A.bodyH*s*.18,0),_q,_s.set(A.legR*s*1.3,A.tail*s,A.legR*s*1.3));put(this.tail,nb,_loc);col(this.tail,nb,A.color,.9);
   // legs: LH, LF, RH, RF (left z>0)
   if(!bird||!flying){
    const att=[[-A.bodyL*s*.32,1,-1],[A.bodyL*s*.3,1,1],[-A.bodyL*s*.32,-1,-1],[A.bodyL*s*.3,-1,1]] as const;
    for(let k=0;k<4;k++){
     const [hx,side,bend]=att[k],leg=r.legs[k];
     const ik=legIK(L,hip,leg.fx,leg.fy,bend as 1|-1);
     const hz=side*A.bodyW*s*.42;
     _e.set(0,0,ik.upper);_q.setFromEuler(_e);_loc.compose(_p.set(hx,hip,hz),_q,_s.set(A.legR*s*1.7,L,A.legR*s*1.7));put(this.upper,nl,_loc);col(this.upper,nl,A.color,.93);
     _e.set(0,0,ik.lower);_q.setFromEuler(_e);_loc.compose(_p.set(hx+ik.kx,hip+ik.ky,hz),_q,_s.set(A.legR*s*1.35,L,A.legR*s*1.35));put(this.lower,nl,_loc);col(this.lower,nl,A.legColor);nl++;
    }
   }
   // wings (birds): flap in flight, folded when perched
   if(bird){
    for(const side of[1,-1]){
     const ang=flying?Math.sin(v.flap)*.9:1.35*v.fold+Math.sin(v.flap)*.05;
     _e.set(side*(ang+.12),0,0);_q.setFromEuler(_e);_loc.compose(_p.set(A.bodyL*s*.1,bodyY+A.bodyH*s*.3,0),_q,_s.set(A.bodyL*s*.3,A.bodyW*s*.18,side*A.bodyL*s*.8));put(this.wing,nw,_loc);col(this.wing,nw,'#403b36');nw++;
    }
   }
   this.drawn.push(c);nb++;nh++;
  }
  for(const id of[...this.vis.keys()])if(!keep.has(id))this.vis.delete(id);
  const upd=(m:THREE.InstancedMesh,n:number)=>{m.count=n;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;};
  upd(this.body,nb);upd(this.head,nb);upd(this.neck,nb);upd(this.horn,nb);upd(this.tail,nb);upd(this.upper,nl);upd(this.lower,nl);upd(this.wing,nw);
  void nh;
 }
 /** Is this animal currently drawn by the rig (so the legacy merged instance should be hidden)? */
 has(id:number){return this.vis.has(id);}
 dispose(scene:THREE.Scene){scene.remove(this.group);for(const m of this.meshes()){m.geometry.dispose();m.dispose();}}
}

/** Swimming fish for fishing grounds near the camera: schooling around the node, depth variation, tail beat and a surface wake. */
export class FishSchoolLayer{
 readonly group=new THREE.Group();body:THREE.InstancedMesh;tail:THREE.InstancedMesh;wake:THREE.InstancedMesh;
 constructor(scene:THREE.Scene,max=ANIMAL_RIG_RULES.maxSchools*ANIMAL_RIG_RULES.fishPerSchool){
  const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.35,metalness:.25,flatShading:true});
  const b=new THREE.SphereGeometry(1,8,5);const t=new THREE.ConeGeometry(1,1,4);t.rotateZ(Math.PI/2);t.translate(-.5,0,0);
  this.body=mkMesh(b,max,mat);this.tail=mkMesh(t,max,mat);this.body.castShadow=false;this.tail.castShadow=false;
  const rg=new THREE.RingGeometry(.7,1,20);rg.rotateX(-Math.PI/2);
  this.wake=mkMesh(rg,max,new THREE.MeshBasicMaterial({color:0xdff3f0,transparent:true,opacity:.38,depthWrite:false}));this.wake.castShadow=false;
  for(const m of[this.body,this.tail,this.wake])this.group.add(m);scene.add(this.group);
 }
 /** nodes: fishing grounds to draw as schools. Returns the node ids drawn. */
 update(nodes:readonly {id:number;x:number;z:number;scale:number;amount:number}[],t:number,surfaceAt:(x:number,z:number)=>number){
  let n=0,w=0;const drawn=new Set<number>();
  for(const f of nodes){
   const count=Math.min(ANIMAL_RIG_RULES.fishPerSchool,Math.max(2,Math.ceil(f.amount/6)));if(n+count>this.body.instanceMatrix.count)break;drawn.add(f.id);
   for(let i=0;i<count;i++){
    const sf=schoolFish(f.id,i,t,1.1+f.scale*.5),x=f.x+sf.x,z=f.z+sf.z,y=surfaceAt(x,z)-sf.depth,len=.5*(.8+(i%3)*.12);
    _e.set(0,sf.yaw-Math.PI/2,0);_q.setFromEuler(_e);_m.compose(_p.set(x,y,z),_q,_s.set(len,len*.26,len*.2));this.body.setMatrixAt(n,_m);
    _c.set(i%2?'#8db8b8':'#a6c0a0');this.body.setColorAt(n,_c);
    _e.set(0,sf.yaw-Math.PI/2+sf.tail,0);_q.setFromEuler(_e);
    const bx=Math.sin(sf.yaw)*len*.9,bz=Math.cos(sf.yaw)*len*.9;
    _m.compose(_p.set(x-bx,y,z-bz),_q,_s.set(len*.55,len*.3,len*.06));this.tail.setMatrixAt(n,_m);_c.set('#6f9a96');this.tail.setColorAt(n,_c);
    if(sf.wake&&w<this.wake.instanceMatrix.count){const r=.25+.12*((t*1.3+i)%1);_m.compose(_p.set(x,surfaceAt(x,z)+.02,z),_q.identity(),_s.set(r,1,r));this.wake.setMatrixAt(w++,_m);}
    n++;
   }
  }
  const upd=(m:THREE.InstancedMesh,k:number)=>{m.count=k;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;};
  upd(this.body,n);upd(this.tail,n);upd(this.wake,w);return drawn;
 }
}
