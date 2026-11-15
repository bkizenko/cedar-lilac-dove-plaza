import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Game} from '../game/sim';
import {collectPartyPlacements,collectPilePlacements,PILE_RULES} from './tradeVisuals';
import type {PartyPlacement,PilePlacement,PileShape} from './tradeVisuals';
function part(g:THREE.BufferGeometry,color:number,x=0,y=0,z=0){
 const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();n.translate(x,y,z);const c=new THREE.Color(color),a=new Float32Array(n.attributes.position.count*3);
 for(let i=0;i<a.length;i+=3){a[i]=c.r;a[i+1]=c.g;a[i+2]=c.b;}n.setAttribute('color',new THREE.BufferAttribute(a,3));n.deleteAttribute('uv');return n;
}
function merge(parts:THREE.BufferGeometry[]){const r=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());r.computeBoundingSphere();return r;}
const walkerGeo=()=>merge([part(new THREE.BoxGeometry(.5,.9,.32),0x7a5a3a,0,.75),part(new THREE.BoxGeometry(.3,.3,.3),0xd2a679,0,1.35),part(new THREE.BoxGeometry(.46,.5,.3),0x8d6b45,0,.95,-.28)]);
const WOOD=0x6b4a2b,DARK=0x4a3524,CLOTH=0xe8e0cc,RED=0xb4583a,ROPE=0xa88f62;
const box=(w:number,h:number,d:number,x:number,y:number,z:number,color:number,rx=0,rz=0)=>{const g=new THREE.BoxGeometry(w,h,d);if(rx)g.rotateX(rx);if(rz)g.rotateZ(rz);return part(g,color,x,y,z);};
/** Hull of tapered slabs (wide amidships, narrow at bow and stern) with a raised bow and stern post. */
const hull=(len:number,beam:number,h:number,color=WOOD)=>[box(beam,h,len*.5,0,h/2,0,color),box(beam*.78,h,len*.25,0,h/2+.04,len*.37,color),box(beam*.78,h,len*.25,0,h/2+.04,-len*.37,color),box(beam*.5,h*1.5,len*.1,0,h*.9,len*.5,DARK),box(beam*.5,h*1.4,len*.1,0,h*.85,-len*.5,DARK)];
/** Oars angled out and down from both gunwales. */
const oars=(n:number,len:number,beam:number,span:number)=>{const out:THREE.BufferGeometry[]=[];for(let i=0;i<n;i++){const z=(i-(n-1)/2)*span/Math.max(1,n-1);for(const sd of [-1,1])out.push(box(len,.06,.1,sd*(beam/2+len/2*.8),.45,z,ROPE,0,-sd*.45));}return out;};
const SHIP_GEO:Record<string,()=>THREE.BufferGeometry>={
 raft:()=>merge([...[-.9,-.3,.3,.9].map(x=>box(.5,.28,4.2,x,.14,0,0x7a5a3a)),box(2.6,.1,.3,0,.3,-1,ROPE),box(2.6,.1,.3,0,.3,1,ROPE),box(.12,1.4,.12,0,1,.4,DARK),...oars(2,1.2,1.8,1.5)]),
 dugout:()=>merge([...hull(4.6,1.1,.55,0x7b5530),box(.8,.12,2.2,0,.5,0,0x3a2a1c),...oars(3,1.5,1.1,2.2)]),
 sailboat:()=>merge([...hull(6,2,.7),box(1.6,.1,4,0,.72,0,0x8a6a40),box(.16,4.6,.16,0,3,.4,DARK),box(.05,3,2.2,0,3.2,.5,CLOTH),box(.1,.1,2.6,0,1.8,.5,DARK),...oars(3,1.6,2,2.4)]),
 trader:()=>merge([...hull(8,2.8,.95),box(2.4,.1,5.4,0,.97,0,0x8a6a40),box(1.9,1,1.8,0,1.5,-2.3,0x7a5a3a),box(2,.1,2,0,2.05,-2.3,RED),box(.2,6,.2,0,4,.8,DARK),box(.05,4,3.2,0,4.4,.9,CLOTH),box(.1,.1,3.6,0,2.4,.9,DARK),...oars(4,1.8,2.8,3.4)]),
 merchantman:()=>merge([...hull(11,3.6,1.2),box(3.2,.1,7.6,0,1.25,0,0x8a6a40),box(2.6,1.3,2.4,0,1.9,-3.4,0x7a5a3a),box(2.7,.1,2.5,0,2.6,-3.4,RED),box(.22,7.6,.22,0,5,2.2,DARK),box(.05,5,3.8,0,5.4,2.3,CLOTH),box(.22,6.4,.22,0,4.4,-.6,DARK),box(.05,4.2,3.2,0,4.8,-.5,CLOTH),box(.1,.1,4.2,0,2.7,2.2,DARK),box(.1,.1,3.6,0,2.4,-.6,DARK)]),
 cog:()=>merge([...hull(12.5,4.2,1.5),box(3.6,.1,8.4,0,1.55,0,0x8a6a40),box(3,1.6,2.6,0,2.4,-3.9,0x7a5a3a),box(3.1,.1,2.8,0,3.25,-3.9,RED),box(2.2,1.2,1.8,0,2.2,4.3,0x7a5a3a),box(.26,9,.26,0,6,.4,DARK),box(.05,6.2,5.2,0,6.6,.6,CLOTH),box(.05,6.2,.9,0,7.4,.6,RED)]),
 galleon:()=>merge([...hull(15,4.8,1.7),box(4.2,.1,10,0,1.75,0,0x8a6a40),box(3.8,2.2,3.4,0,2.9,-5,0x7a5a3a),box(3.9,.1,3.5,0,4.05,-5,RED),box(2.6,1.5,2.2,0,2.5,5.6,0x7a5a3a),box(.28,10,.28,0,6.7,2.4,DARK),box(.05,5.4,4.8,0,7.2,2.5,CLOTH),box(.28,10.5,.28,0,7,-.8,DARK),box(.05,5.6,5,0,7.4,-.7,CLOTH),box(.24,6.5,.24,0,4.9,-3.6,DARK),box(.05,3.6,3.2,0,5.2,-3.5,CLOTH),box(.1,.1,4.6,0,2.2,2.5,DARK)]),
};
const SHIP_IDS=Object.keys(SHIP_GEO);
const crateGeo=()=>merge([part(new THREE.BoxGeometry(.6,.5,.6),0x9a7440,0,.25)]);
const logGeo=()=>{const c=new THREE.CylinderGeometry(.16,.16,.9,6);c.rotateZ(Math.PI/2);return merge([part(c,0x6e4f30,0,.16)]);};
const sackGeo=()=>merge([part(new THREE.CylinderGeometry(.24,.3,.55,7),0xc9b48a,0,.28)]);
const GEO:Record<PileShape,()=>THREE.BufferGeometry>={crate:crateGeo,log:logGeo,sack:sackGeo};
const SHAPES:PileShape[]=['crate','log','sack'];
/** Trade parties (land walkers, ships) and overflow stockpiles beside full stores. Instanced, derived each sync from existing game records. */
export class TradeVisualLayer{
 private root=new THREE.Group();private scene:THREE.Scene;private disposed=false;
 private mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:0});
 private walkers:THREE.InstancedMesh;private boats=new Map<string,THREE.InstancedMesh>();private piles=new Map<PileShape,THREE.InstancedMesh>();
 private parties:PartyPlacement[]=[];private pilePlacements:PilePlacement[]=[];private pileTime=-1e9;private pileCount=0;
 private m=new THREE.Matrix4();private q=new THREE.Quaternion();private p=new THREE.Vector3();private s=new THREE.Vector3();private up=new THREE.Vector3(0,1,0);
 constructor(scene:THREE.Scene){
  this.scene=scene;this.root.name='trade-visuals';
  const mk=(geo:THREE.BufferGeometry,cap:number,name:string)=>{const im=new THREE.InstancedMesh(geo,this.mat,cap);im.name=name;im.count=0;im.visible=false;im.frustumCulled=false;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.root.add(im);return im;};
  this.walkers=mk(walkerGeo(),PILE_RULES.maxPartyInstances,'trade-party-walkers');for(const id of SHIP_IDS)this.boats.set(id,mk(SHIP_GEO[id](),PILE_RULES.maxPartyInstances,'trade-party-ship-'+id));
  for(const sh of SHAPES)this.piles.set(sh,mk(GEO[sh](),PILE_RULES.maxPileInstances,'stockpile-'+sh));
  scene.add(this.root);
 }
 sync(g:Game,shadows=false){
  if(this.disposed)return;
  collectPartyPlacements(g,this.parties);let w=0;const nb:Record<string,number>={};
  for(const o of this.parties){
   if(!(o.mode==='sea'?true:g.visibleAt(o.x,o.z)))continue;
   const bob=o.walking&&o.mode==='land'?Math.abs(Math.sin(g.state.time*6+o.id))*.05:0;
   this.p.set(o.x,g.travelHeight(o.x,o.z)+bob,o.z);this.q.setFromAxisAngle(this.up,o.yaw);this.s.set(1,1,1);this.m.compose(this.p,this.q,this.s);
   if(o.mode==='sea'){const id=o.ship&&this.boats.has(o.ship)?o.ship:'sailboat';this.boats.get(id)!.setMatrixAt(nb[id]=(nb[id]||0),this.m);nb[id]++;}else this.walkers.setMatrixAt(w++,this.m);
  }
  this.finish(this.walkers,w,shadows);for(const [id,im] of this.boats)this.finish(im,nb[id]||0,shadows);
  if(g.state.time-this.pileTime>=PILE_RULES.refreshSeconds||g.state.time<this.pileTime){
   this.pileTime=g.state.time;this.pilePlacements.length=0;
   for(const t of g.state.tribes)if(t.alive!==false)collectPilePlacements(g,t.id,this.pilePlacements);
   this.pileCount=this.pilePlacements.length;
  }
  const n:Record<PileShape,number>={crate:0,log:0,sack:0};
  for(let i=0;i<this.pileCount;i++){
   const o=this.pilePlacements[i];if(!g.visibleAt(o.x,o.z))continue;
   const mesh=this.piles.get(o.shape)!;this.p.set(o.x,g.travelHeight(o.x,o.z)+o.layer*.45,o.z);this.q.setFromAxisAngle(this.up,o.yaw);this.s.set(o.scale,o.scale,o.scale);this.m.compose(this.p,this.q,this.s);mesh.setMatrixAt(n[o.shape]++,this.m);
  }
  for(const sh of SHAPES)this.finish(this.piles.get(sh)!,n[sh],shadows);
 }
 private finish(mesh:THREE.InstancedMesh,count:number,shadows:boolean){mesh.count=count;mesh.visible=count>0;mesh.castShadow=shadows;mesh.receiveShadow=shadows;if(count>0)mesh.instanceMatrix.needsUpdate=true;}
 dispose(){if(this.disposed)return;this.disposed=true;for(const im of [this.walkers,...this.boats.values(),...this.piles.values()]){im.geometry.dispose();im.dispose();}this.mat.dispose();this.scene.remove(this.root);}
}
