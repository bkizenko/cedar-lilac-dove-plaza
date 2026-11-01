import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Game} from '../game/sim';
import type {Unit} from '../game/types';

export const WATER_VESSEL_ART={capacity:2048,roughness:.94} as const;
export function vesselStyleColor(style:string,target=new THREE.Color()){
 let hash=2166136261;for(let i=0;i<style.length;i++)hash=Math.imul(hash^style.charCodeAt(i),16777619);
 return target.setHSL(.035+(hash>>>0)%35/1000,.38+(hash>>>8)%15/100,.37+(hash>>>16)%15/100);
}
function colored(g:THREE.BufferGeometry,color:number){
 const c=new THREE.Color(color),a=new Float32Array(g.attributes.position.count*3);
 for(let i=0;i<a.length;i+=3){a[i]=c.r;a[i+1]=c.g;a[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;
}
/** Empty equipment has no model. This is one actually owned jar, never a
 * decoration that pretends to be delivered stock or an extra water source. */
export function waterVesselGeometry(){
 const jar=new THREE.LatheGeometry([new THREE.Vector2(.035,0),new THREE.Vector2(.09,.025),new THREE.Vector2(.13,.12),new THREE.Vector2(.10,.22),new THREE.Vector2(.055,.25),new THREE.Vector2(.055,.29),new THREE.Vector2(.043,.29)],12);
 const rim=new THREE.TorusGeometry(.055,.009,3,12);rim.rotateX(Math.PI/2);rim.translate(0,.285,0);
 const band=new THREE.TorusGeometry(.124,.007,3,12);band.rotateX(Math.PI/2);band.translate(0,.13,0);
 const handle=new THREE.TorusGeometry(.045,.009,4,8,Math.PI*1.5);handle.rotateY(Math.PI/2);handle.translate(-.09,.22,0);
 const strap=new THREE.BoxGeometry(.018,.48,.022);strap.translate(-.03,.35,-.01);
 const parts=[colored(jar,0xffffff),colored(rim,0xc9b8a1),colored(band,0x66513d),colored(handle,0xffffff),colored(strap,0x493c2c)].map(g=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();n.translate(-.28,.30,.02);return n;});
 const result=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());result.computeBoundingBox();result.computeBoundingSphere();return result;
}
export class WaterVesselLayer{
 readonly mesh:THREE.InstancedMesh;readonly owners:Unit[]=[];
 private scene:THREE.Scene;private color=new THREE.Color();private count=0;private disposed=false;private sourcesMap=new Map<THREE.InstancedMesh,Unit[]>();
 constructor(scene:THREE.Scene){this.scene=scene;
  this.mesh=new THREE.InstancedMesh(waterVesselGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:WATER_VESSEL_ART.roughness,metalness:0,side:THREE.DoubleSide}),WATER_VESSEL_ART.capacity);
  this.mesh.name='owned-water-vessels';this.mesh.count=0;this.mesh.visible=false;this.mesh.frustumCulled=false;this.mesh.receiveShadow=true;this.mesh.castShadow=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  this.mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(WATER_VESSEL_ART.capacity*3),3);this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);this.sourcesMap.set(this.mesh,this.owners);scene.add(this.mesh);
 }
 beginFrame(quality:'low'|'med'|'high',shadows=false){this.count=0;this.owners.length=0;this.mesh.castShadow=shadows&&quality!=='low';}
 write(g:Pick<Game,'visibleAt'>,u:Unit,body:THREE.Matrix4){
  if(this.disposed||u.hp<=0||u.shelterId||!u.waterVessel||u.waterVessel.tripsRemaining<=0||u.team!==0&&!g.visibleAt(u.x,u.z)||this.count>=WATER_VESSEL_ART.capacity)return false;
  this.mesh.setMatrixAt(this.count,body);this.mesh.setColorAt(this.count,vesselStyleColor(u.waterVessel.origin?.style??`unattributed-${u.team}`,this.color));this.owners.push(u);this.count++;return true;
 }
 endFrame(){this.mesh.count=this.count;this.mesh.visible=this.count>0;if(this.count){this.mesh.instanceMatrix.needsUpdate=true;this.mesh.instanceColor!.needsUpdate=true;}}
 sources(){return this.sourcesMap;}
 dispose(){if(this.disposed)return;this.disposed=true;this.scene.remove(this.mesh);this.mesh.dispose();this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();this.owners.length=0;this.sourcesMap.clear();}
}
