/** Ruins in the world: draws every ruin site (abandoned or destroyed villages, fallen wonders, ancient sites) as an aged variant of what stood there,
 * built by ruins.ts from the real source parts in the style of the people who raised it. Decay comes from game time (ruinsWorld.ruinDecay), is
 * quantised so a ruin re-meshes only when it passes a visible step, and gives collapse stages, vegetation overgrowth (or sand drift) and rubble.
 * Thin three.js adapter over pure, tested modules (ruins, wonderKit, buildingStyleMap, carvedMesh). Nothing is created until the first ruin exists. */
import * as THREE from 'three';
import {buildingTierAt} from '../game/detailLevel';
import {partsAtLod,hashSeed,type BuildingSpec,type LodTier} from './buildingParts';
import {buildCarvedMesh} from './carvedMesh';
import {carvedGeometry,createCarvedMaterial} from './carvedBuildingLayer';
import {carvedBuildingSpec} from './buildingStyleMap';
import {generateWonderKit,type WonderKind} from './wonderKit';
import {ruinSpec,type RuinSpec} from './ruins';
import {isCivId} from './civSkin';
import type {CivId} from './civStyles';
import type {RuinView} from '../game/ruinsWorld';
import {STAGE_COUNT} from '../game/wonderDefs';

export const RUIN_DECAY_STEPS=20;
const ANCIENT_KINDS:WonderKind[]=['stoneCircle','mausoleum','ziggurat','granary','citadel','beaconTower'];
const quant=(d:number)=>Math.round(Math.max(0,Math.min(1,d))*RUIN_DECAY_STEPS)/RUIN_DECAY_STEPS;
/** The clean source a ruin was before it fell (pure). Wonders and ancient sites come from the kit in their own civ style; villages from the carved building generator. */
export function ruinSource(v:Pick<RuinView,'kind'|'was'|'style'|'seed'|'w'|'d'|'id'>,habitat:'plains'|'desert'|'hills'|'forest'|'wetland'='plains'):BuildingSpec|null{
 const civ:CivId=isCivId(v.style)?v.style:'aureline',w=Math.max(16,Math.min(80,v.w)),d=Math.max(16,Math.min(80,v.d));
 if(v.kind==='village')return carvedBuildingSpec({worldSeed:v.seed,type:v.was,id:v.id,era:2,habitat,footprint:{w:v.w,d:v.d}});
 const family=(v.kind==='wonder'?v.was:ANCIENT_KINDS[v.seed%ANCIENT_KINDS.length]) as WonderKind;
 try{const plan=generateWonderKit({v:1,seed:hashSeed(v.seed,'ruin-src',v.id),civ,family,options:{footprint:{w,d},era:v.kind==='ancient'?1:3,wealth:.5}});return{...plan.spec,materials:plan.materials};}catch{return null;}
}
/** The ruin spec at a decay step (pure; exported for tests and the harness). */
export function ruinSpecFor(v:Pick<RuinView,'kind'|'was'|'style'|'seed'|'w'|'d'|'id'|'decay'|'climate'>,habitat?:Parameters<typeof ruinSource>[1]):RuinSpec|null{
 const src=ruinSource(v,habitat);if(!src)return null;
 const decay=quant(v.decay),spec=ruinSpec(src,{seed:hashSeed(v.seed,'ruin'),decay,overgrowth:Math.min(1,decay*(v.climate==='arid'?.35:v.climate==='wet'?1:.8)),climate:v.climate});
 return{...spec,variantKey:`ruin.${v.id}.${Math.round(decay*RUIN_DECAY_STEPS)}`};
}
type Entry={spec:RuinSpec;meshes:Map<LodTier,THREE.InstancedMesh>;used:number};
const m4=new THREE.Matrix4(),q4=new THREE.Quaternion(),p3=new THREE.Vector3(),s3=new THREE.Vector3(1,1,1),up=new THREE.Vector3(0,1,0);
export class RuinLayer{
 private scene:THREE.Scene;private material=createCarvedMaterial();private entries=new Map<string,Entry>();private frame=0;
 constructor(scene:THREE.Scene){this.scene=scene;}
 sync(views:readonly RuinView[],camera:THREE.Vector3,groundAt:(x:number,z:number)=>number){
  this.frame++;
  for(const e of this.entries.values())for(const m of e.meshes.values())m.visible=false;
  for(const v of views){
   const key=`${v.id}|${Math.round(quant(v.decay)*RUIN_DECAY_STEPS)}`;
   let e=this.entries.get(key);
   if(!e){const spec=ruinSpecFor(v);if(!spec)continue;e={spec,meshes:new Map(),used:this.frame};this.entries.set(key,e);}
   e.used=this.frame;
   const tier=Math.min(2,buildingTierAt(Math.hypot(v.x-camera.x,v.z-camera.z))) as LodTier;
   let mesh=e.meshes.get(tier);
   if(!mesh){mesh=new THREE.InstancedMesh(carvedGeometry(buildCarvedMesh(e.spec,tier)),this.material,1);mesh.name=`ruin-${key}#${tier}`;mesh.frustumCulled=false;mesh.castShadow=tier<2;mesh.receiveShadow=true;this.scene.add(mesh);e.meshes.set(tier,mesh);}
   const hw=v.w/2,hd=v.d/2,y=Math.min(groundAt(v.x,v.z),groundAt(v.x-hw,v.z-hd),groundAt(v.x+hw,v.z-hd),groundAt(v.x-hw,v.z+hd),groundAt(v.x+hw,v.z+hd));
   q4.setFromAxisAngle(up,v.yaw);p3.set(v.x,y,v.z);m4.compose(p3,q4,s3);
   mesh.setMatrixAt(0,m4);mesh.count=1;mesh.instanceMatrix.needsUpdate=true;mesh.visible=true;
  }
  for(const [k,e] of this.entries)if(e.used<this.frame-600){for(const m of e.meshes.values()){m.parent?.remove(m);m.geometry.dispose();m.dispose();}this.entries.delete(k);}
 }
 stats(){let tris=0,calls=0;for(const e of this.entries.values())for(const [t,m] of e.meshes)if(m.visible){calls++;tris+=partsAtLod(e.spec,t).length?(m.geometry.getAttribute('position').count/3):0;}return{ruins:calls,triangles:tris};}
 dispose(){for(const e of this.entries.values())for(const m of e.meshes.values()){m.parent?.remove(m);m.geometry.dispose();m.dispose();}this.entries.clear();this.material.dispose();}
}
void STAGE_COUNT;
