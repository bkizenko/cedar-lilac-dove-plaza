/** Live wonders: draws every record in `state.wonders` through wonderKit, wearing its owner's CivSkin (grammar leans, signature landmark, palette).
 * A wonder is one unique carved mesh per (record, skin, build stage, LOD): the kit assembly is seeded per record, so two societies' wonders never match.
 * Thin three.js adapter over pure, tested modules (wonderKit, carvedMesh); nothing is created until the first record exists. */
import * as THREE from 'three';
import {partsAtLod,renderTierForDistance,type BuildingSpec,type LodTier} from './buildingParts';
import {buildCarvedMesh} from './carvedMesh';
import {carvedGeometry,createCarvedMaterial} from './carvedBuildingLayer';
import {generateWonderKit,type WonderFunction,type WonderOptions} from './wonderKit';
import {skinSignature,type CivSkin} from './civSkin';
import type {CivId} from './civStyles';
import {hashSeed} from './buildingParts';
import type {WonderRecord} from '../game/wonderRecords';
export type {WonderRecord};

type Entry={spec:BuildingSpec;meshes:Map<LodTier,THREE.InstancedMesh>;used:number};
const m4=new THREE.Matrix4(),q4=new THREE.Quaternion(),p3=new THREE.Vector3(),s3=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
export class WonderLayer{
 private scene:THREE.Scene;private material=createCarvedMaterial();private entries=new Map<string,Entry>();private frame=0;
 constructor(scene:THREE.Scene){this.scene=scene;}
 /** The kit spec for a record under a skin (pure; exported for tests and the harness). */
 static specFor(r:WonderRecord,skin:CivSkin|null):BuildingSpec{
  const civ:CivId=skin?.grammar??'aureline',options:WonderOptions={footprint:{w:r.w,d:r.d},era:r.era??3,wealth:r.wealth??.6,...(skin?.palette?{palette:skin.palette,signature:skin.wonder.signature}:{})};
  const plan=generateWonderKit({v:1,seed:hashSeed(r.seed,'wonder',r.id),civ,family:r.family,options});
  return {...plan.spec,variantKey:`wonder.${r.id}.${skin?skinSignature(skin):'-'}`,materials:plan.materials};
 }
 sync(records:readonly WonderRecord[],camera:THREE.Vector3,skinOf:(team:number)=>CivSkin|null,groundAt:(x:number,z:number)=>number,seen:(x:number,z:number)=>boolean=()=>true){
  this.frame++;
  for(const e of this.entries.values())for(const m of e.meshes.values())m.visible=false;
  for(const r of records){
   if(!seen(r.x,r.z))continue;
   const skin=skinOf(r.team),key=`${r.id}|${skin?skinSignature(skin):'-'}`;
   let e=this.entries.get(key);if(!e){e={spec:WonderLayer.specFor(r,skin),meshes:new Map(),used:this.frame};this.entries.set(key,e);}
   e.used=this.frame;
   // a landmark stays visible from far away: the far tier keeps the core and crown silhouette
   const tier=Math.min(2,renderTierForDistance(Math.hypot(r.x-camera.x,r.z-camera.z))) as LodTier;
   let mesh=e.meshes.get(tier);
   if(!mesh){mesh=new THREE.InstancedMesh(carvedGeometry(buildCarvedMesh(e.spec,tier)),this.material,1);mesh.name=`wonder-${key}#${tier}`;mesh.frustumCulled=false;mesh.castShadow=tier<2;mesh.receiveShadow=true;this.scene.add(mesh);e.meshes.set(tier,mesh);}
   const hw=r.w/2,hd=r.d/2,y=Math.min(groundAt(r.x,r.z),groundAt(r.x-hw,r.z-hd),groundAt(r.x+hw,r.z-hd),groundAt(r.x-hw,r.z+hd),groundAt(r.x+hw,r.z+hd));
   q4.setFromAxisAngle(up,r.yaw);p3.set(r.x,y,r.z);s3.set(1,Math.max(.12,Math.min(1,r.progress)),1);m4.compose(p3,q4,s3);
   mesh.setMatrixAt(0,m4);mesh.count=1;mesh.instanceMatrix.needsUpdate=true;mesh.visible=true;
  }
  // drop stale stages and tiers that were not used for a while
  for(const [k,e] of this.entries)if(e.used<this.frame-600){for(const m of e.meshes.values()){m.parent?.remove(m);m.geometry.dispose();m.dispose();}this.entries.delete(k);}
 }
 stats(){let tris=0,calls=0;for(const e of this.entries.values())for(const [t,m] of e.meshes)if(m.visible){calls++;tris+=partsAtLod(e.spec,t).length?(m.geometry.getAttribute('position').count/3):0;}return {wonders:calls,triangles:tris};}
 dispose(){for(const e of this.entries.values())for(const m of e.meshes.values()){m.parent?.remove(m);m.geometry.dispose();m.dispose();}this.entries.clear();this.material.dispose();}
}
