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
const boatGeo=()=>merge([part(new THREE.BoxGeometry(2.2,.6,6),0x6b4a2b,0,.3),part(new THREE.BoxGeometry(.18,4,.18),0x4a3524,0,2.6),part(new THREE.BoxGeometry(.06,2.6,2),0xe8e0cc,0,3,.1)]);
const crateGeo=()=>merge([part(new THREE.BoxGeometry(.6,.5,.6),0x9a7440,0,.25)]);
const logGeo=()=>{const c=new THREE.CylinderGeometry(.16,.16,.9,6);c.rotateZ(Math.PI/2);return merge([part(c,0x6e4f30,0,.16)]);};
const sackGeo=()=>merge([part(new THREE.CylinderGeometry(.24,.3,.55,7),0xc9b48a,0,.28)]);
const GEO:Record<PileShape,()=>THREE.BufferGeometry>={crate:crateGeo,log:logGeo,sack:sackGeo};
const SHAPES:PileShape[]=['crate','log','sack'];
/** Trade parties (land walkers, ships) and overflow stockpiles beside full stores. Instanced, derived each sync from existing game records. */
export class TradeVisualLayer{
 private root=new THREE.Group();private scene:THREE.Scene;private disposed=false;
 private mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:0});
 private walkers:THREE.InstancedMesh;private boats:THREE.InstancedMesh;private piles=new Map<PileShape,THREE.InstancedMesh>();
 private parties:PartyPlacement[]=[];private pilePlacements:PilePlacement[]=[];private pileTime=-1e9;private pileCount=0;
 private m=new THREE.Matrix4();private q=new THREE.Quaternion();private p=new THREE.Vector3();private s=new THREE.Vector3();private up=new THREE.Vector3(0,1,0);
 constructor(scene:THREE.Scene){
  this.scene=scene;this.root.name='trade-visuals';
  const mk=(geo:THREE.BufferGeometry,cap:number,name:string)=>{const im=new THREE.InstancedMesh(geo,this.mat,cap);im.name=name;im.count=0;im.visible=false;im.frustumCulled=false;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.root.add(im);return im;};
  this.walkers=mk(walkerGeo(),PILE_RULES.maxPartyInstances,'trade-party-walkers');this.boats=mk(boatGeo(),PILE_RULES.maxPartyInstances,'trade-party-ships');
  for(const sh of SHAPES)this.piles.set(sh,mk(GEO[sh](),PILE_RULES.maxPileInstances,'stockpile-'+sh));
  scene.add(this.root);
 }
 sync(g:Game,shadows=false){
  if(this.disposed)return;
  collectPartyPlacements(g,this.parties);let w=0,b=0;
  for(const o of this.parties){
   if(!(o.mode==='sea'?true:g.visibleAt(o.x,o.z)))continue;
   const bob=o.walking&&o.mode==='land'?Math.abs(Math.sin(g.state.time*6+o.id))*.05:0;
   this.p.set(o.x,g.travelHeight(o.x,o.z)+bob,o.z);this.q.setFromAxisAngle(this.up,o.yaw);this.s.set(1,1,1);this.m.compose(this.p,this.q,this.s);
   if(o.mode==='sea')this.boats.setMatrixAt(b++,this.m);else this.walkers.setMatrixAt(w++,this.m);
  }
  this.finish(this.walkers,w,shadows);this.finish(this.boats,b,shadows);
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
 dispose(){if(this.disposed)return;this.disposed=true;for(const im of [this.walkers,this.boats,...this.piles.values()]){im.geometry.dispose();im.dispose();}this.mat.dispose();this.scene.remove(this.root);}
}
