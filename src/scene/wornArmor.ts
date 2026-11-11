import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {wornArmor,type ArmorAsset,type ArmorState} from '../game/armor';
import type {Game} from '../game/sim';
import type {Unit} from '../game/types';
import {wornGarmentFit} from './wornGarments';
export const WORN_ARMOR_RULES=Object.freeze({instances:2048,maximumTriangles:600,wornBrightness:.60});
function paint(g:THREE.BufferGeometry,color:string){const c=new THREE.Color(color),values=new Float32Array(g.attributes.position.count*3);for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(values,3));return g;}
/** A sleeveless quilted torso outside the ordinary clothing layer; no face,
 * tool or weapon geometry is added and no armor is inferred from military duty. */
export function wornArmorGeometry(){
 const parts:THREE.BufferGeometry[]=[];
 function box(w:number,h:number,d:number,x:number,y:number,z:number,color:string,roll=0){const g=new THREE.BoxGeometry(w,h,d);g.rotateZ(roll);g.translate(x,y,z);parts.push(paint(g,color));}
 function shell(rt:number,rb:number,h:number,y:number,color:string){const g=new THREE.CylinderGeometry(rt,rb,h,12,1,true);g.scale(1,1,.84);g.translate(0,y,0);parts.push(paint(g,color));}
 shell(.255,.28,.49,.585,'#a78b55');
 for(const side of[-1,1]){
  for(const x of[-.17,-.085,0,.085,.17])box(.013,.40,.014,x,.58,side*.238,'#6f5b38');
  for(const y of[.40,.51,.62,.73])box(.405,.026,.018,0,y,side*.243,'#c0a66b');
  box(.07,.11,.24,side*.205,.79,0,'#806944',side*.10);
 }
 shell(.282,.282,.043,.425,'#51462f');
 box(.075,.065,.025,0,.425,.25,'#c2b080');
 const plain=parts.map(g=>{if(!g.index)return g;const n=g.toNonIndexed();g.dispose();return n;}),joined=mergeGeometries(plain)!;
 plain.forEach(g=>g.dispose());joined.computeBoundingBox();joined.computeBoundingSphere();return joined;
}
/** One bounded shared batch follows the same already-admitted body matrix as
 * garments. Ownership remains the game asset's actual current physical holder. */
export class WornArmorLayer{
 private scene:THREE.Scene;private mesh:THREE.InstancedMesh;private ground:THREE.InstancedMesh;private groundOwners:ArmorAsset[]=[];private groundPicking=new Map<THREE.InstancedMesh,ArmorAsset[]>();private groundCount=0;private frustum=new THREE.Frustum();private viewProjection=new THREE.Matrix4();private groundSphere=new THREE.Sphere(new THREE.Vector3(),.75);private groundPosition=new THREE.Vector3();private groundRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0));private groundScale=new THREE.Vector3(1.65,1.65,.36);private groundCenter=new THREE.Matrix4().makeTranslation(0,-.594,0);private owners:Unit[]=[];private picking=new Map<THREE.InstancedMesh,Unit[]>();private fit=new THREE.Matrix4();private matrix=new THREE.Matrix4();private color=new THREE.Color();private count=0;private disposed=false;
 constructor(scene:THREE.Scene){this.scene=scene;const material=new THREE.MeshStandardMaterial({vertexColors:true,color:0xffffff,roughness:.96,metalness:0,side:THREE.DoubleSide});this.mesh=new THREE.InstancedMesh(wornArmorGeometry(),material,WORN_ARMOR_RULES.instances);this.mesh.name='worn-padded-armor';this.mesh.count=0;this.mesh.visible=false;this.mesh.frustumCulled=false;this.mesh.castShadow=false;this.mesh.receiveShadow=true;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(WORN_ARMOR_RULES.instances*3),3);this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);this.picking.set(this.mesh,this.owners);scene.add(this.mesh);this.ground=new THREE.InstancedMesh(this.mesh.geometry,material,WORN_ARMOR_RULES.instances);this.ground.name='ground-padded-armor';this.ground.count=0;this.ground.visible=false;this.ground.frustumCulled=false;this.ground.receiveShadow=true;this.ground.castShadow=false;this.ground.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.ground.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(WORN_ARMOR_RULES.instances*3),3);this.ground.instanceColor.setUsage(THREE.DynamicDrawUsage);this.groundPicking.set(this.ground,this.groundOwners);scene.add(this.ground);}
 beginFrame(quality:'low'|'med'|'high',shadows=false){this.count=0;this.owners.length=0;this.mesh.castShadow=shadows&&quality!=='low';this.groundCount=0;this.groundOwners.length=0;this.ground.castShadow=shadows&&quality!=='low';}
 write(g:Game,u:Unit,bodyMatrix:THREE.Matrix4){
  if(this.disposed||u.hp<=0||u.shelterId||this.count>=WORN_ARMOR_RULES.instances||u.team!==0&&!g.visibleAt(u.x,u.z))return false;
  const armor=wornArmor(g,u);if(!armor||armor.kind!=='paddedTorso'||armor.team!==u.team||armor.holder.kind!=='unit'||armor.holder.id!==u.id)return false;
  wornGarmentFit(u.type,this.fit);this.matrix.copy(bodyMatrix).multiply(this.fit);this.mesh.setMatrixAt(this.count,this.matrix);this.color.setScalar(WORN_ARMOR_RULES.wornBrightness+(1-WORN_ARMOR_RULES.wornBrightness)*Math.max(0,Math.min(1,armor.condition)));this.mesh.setColorAt(this.count,this.color);this.owners.push(u);this.count++;return true;
 }
 /** Dropped assets stay at their actual holder coordinates. This batch has
  * asset owners, deliberately separate from the unit-picking registry. */
 writeGround(g:Game,camera?:THREE.Camera){
  if(this.disposed)return 0;
  if(camera){camera.updateMatrixWorld();this.viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.viewProjection);}
  for(const armor of (g.state as Game['state']&{armor?:ArmorState}).armor?.assets||[]){
   if(this.groundCount>=WORN_ARMOR_RULES.instances)break;
   if(armor.kind!=='paddedTorso'||armor.holder.kind!=='ground')continue;
   const {x,z}=armor.holder;if(!g.visibleAt(x,z))continue;
   this.groundPosition.set(x,g.height(x,z)+.10,z);this.groundSphere.center.copy(this.groundPosition);
   if(camera&&!this.frustum.intersectsSphere(this.groundSphere))continue;
   this.matrix.compose(this.groundPosition,this.groundRotation,this.groundScale).multiply(this.groundCenter);this.ground.setMatrixAt(this.groundCount,this.matrix);this.color.setScalar(WORN_ARMOR_RULES.wornBrightness+(1-WORN_ARMOR_RULES.wornBrightness)*Math.max(0,Math.min(1,armor.condition)));this.ground.setColorAt(this.groundCount,this.color);this.groundOwners.push(armor);this.groundCount++;
  }
  return this.groundCount;
 }
 endFrame(){this.mesh.count=this.count;this.mesh.visible=this.count>0;if(this.count){this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;}this.ground.count=this.groundCount;this.ground.visible=this.groundCount>0;if(this.groundCount){this.ground.instanceMatrix.needsUpdate=true;if(this.ground.instanceColor)this.ground.instanceColor.needsUpdate=true;}}
 sources(){return this.picking;}
 groundSources(){return this.groundPicking;}
 dispose(){if(this.disposed)return;this.disposed=true;this.scene.remove(this.mesh,this.ground);this.mesh.dispose();this.ground.dispose();this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();this.owners.length=0;this.picking.clear();this.groundOwners.length=0;this.groundPicking.clear();}
}
