import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {BldGeo} from './meshes';
import {normalizeTowerPlatform,type TowerPlatform} from '../game/towerPlatforms';
export type TowerPlatformGeometry=BldGeo&{platformHeightMeters:number;overallHeightMeters:number;geometryKey:string};
const cache=new Map<string,TowerPlatformGeometry>();
function box(w:number,h:number,d:number,x=0,y=0,z=0){const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y+h/2,z);return g;}
function beam(a:THREE.Vector3,b:THREE.Vector3,width=.12){const delta=b.clone().sub(a),g=new THREE.BoxGeometry(width,delta.length(),width);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);return g;}
function combine(parts:THREE.BufferGeometry[]){const plain=parts.map(g=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();return n;});const g=mergeGeometries(plain)!;plain.forEach(p=>p.dispose());g.computeBoundingBox();g.computeBoundingSphere();return g;}
export function towerPlatformGeometryKey(input:TowerPlatform){const c=normalizeTowerPlatform(input);return`${c.material}:${c.heightMeters}`;}
/** Shared immutable geometry: at most19 material/whole-metre variants. Callers
 * own their mesh/materials, never dispose these buffers on an ordinary sync. */
export function towerPlatformGeos(input:TowerPlatform):TowerPlatformGeometry{
 const c=normalizeTowerPlatform(input),key=towerPlatformGeometryKey(c),old=cache.get(key);if(old)return old;
 const h=c.heightMeters,timber:THREE.BufferGeometry[]=[box(3.8,.24,3.8,0,h-.24,0)],stone:THREE.BufferGeometry[]=[];
 if(c.material==='timber'){
  for(const x of[-1.65,1.65])for(const z of[-1.65,1.65])timber.push(box(.28,h,.28,x,0,z));
  const levels=Math.ceil(h/2.5);for(let level=0;level<levels;level++){const y=.12+level*h/levels,top=(level+1)*h/levels-.12;
   for(const side of[-1,1]){timber.push(beam(new THREE.Vector3(-1.65,y,side*1.65),new THREE.Vector3(1.65,top,side*1.65)),beam(new THREE.Vector3(side*1.65,y,-1.65),new THREE.Vector3(side*1.65,top,1.65)));}
  }
  for(const x of[-1.8,1.8])for(const z of[-1.8,1.8])timber.push(box(.15,1.08,.15,x,h,z));
  for(const y of[h+.5,h+1]){timber.push(box(3.7,.12,.12,0,y,-1.8),box(.12,.12,3.7,-1.8,y,0),box(.12,.12,3.7,1.8,y,0),box(1.35,.12,.12,-1.15,y,1.8),box(1.35,.12,.12,1.15,y,1.8));}
 }else{
  const body=new THREE.CylinderGeometry(1.72,1.82,h-.24,8);body.rotateY(Math.PI/8);body.translate(0,(h-.24)/2,0);stone.push(body);
  // Mortar courses and protective parapets have actual geometry, kept coarse.
  for(let y=1;y<h-.4;y+=1.2){const ring=new THREE.TorusGeometry(1.7,.035,3,8);ring.rotateX(Math.PI/2);ring.rotateY(Math.PI/8);ring.translate(0,y,0);stone.push(ring);}
  stone.push(box(3.8,.85,.28,0,h,-1.8),box(.28,.85,3.8,-1.8,h,0),box(.28,.85,3.8,1.8,h,0),box(1.35,.85,.28,-1.15,h,1.8),box(1.35,.85,.28,1.15,h,1.8));
  for(const side of[-1,1])for(const offset of[-1.65,-.55,.55,1.65])stone.push(box(.4,.3,.36,offset,h+.85,side*1.8),box(.36,.3,.4,side*1.8,h+.85,offset));
 }
 // An accessible front gap and a real ladder extend from ground to deck.
 timber.push(box(.1,h+.4,.12,-.29,0,2.03),box(.1,h+.4,.12,.29,0,2.03));
 for(let y=.28;y<h;y+=.28)timber.push(box(.67,.08,.13,0,y,2.03));
 const timberGeo=combine(timber),stoneGeo=stone.length?combine(stone):undefined;
 const result:TowerPlatformGeometry={timber:timberGeo,roof:combine([box(.01,.01,.01)]),...(stoneGeo?{extra:stoneGeo,extraMat:'stone' as const}:{}),platformHeightMeters:h,overallHeightMeters:Math.max(timberGeo.boundingBox!.max.y,stoneGeo?.boundingBox?.max.y??0),geometryKey:key};cache.set(key,result);return result;
}
/** Called at renderer teardown, never per-frame. */
export function disposeTowerPlatformGeometries(){for(const g of cache.values()){g.timber.dispose();g.roof.dispose();g.extra?.dispose();}cache.clear();}
export function towerPlatformGeometryCacheSize(){return cache.size;}
