import * as THREE from 'three';
import type {Game} from '../game/sim';
import type {Unit} from '../game/types';
import {methodRecords,methodRecordRecoverable,type MethodRecord} from '../game/methodRecords';
import {cargoGeo} from './meshes';
import {ensureInstanceCapacity} from './instanceCapacity';
/** Existing stone cargo geometry marks a real visible clay record, without granting custody.
 * Display offsets never change its saved holder or the physical pickup point. */
export class MethodRecordLayer {
 private mesh:THREE.InstancedMesh;
 private geometry=cargoGeo('stone');
 private owners:MethodRecord[]=[];
 private disposed=false;
 private matrix=new THREE.Matrix4();
 private rotation=new THREE.Quaternion();
 private scale=new THREE.Vector3(.65,.28,.65);
 private position=new THREE.Vector3();
 private slots=new Map<string,number>();
 private carriers=new Map<number,Unit>();
 private scene:THREE.Scene;
 constructor(scene:THREE.Scene,material:THREE.Material){this.scene=scene;this.mesh=new THREE.InstancedMesh(this.geometry,material,64);this.mesh.name='owned-physical-method-records';this.mesh.count=0;this.mesh.visible=false;this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);}
 sync(g:Game,quality:'low'|'med'|'high'='low',shadows=false){
  if(this.disposed)return;const records=g.state.methodRecords?.records;
  if(!records?.length){if(this.mesh.count||this.mesh.visible){this.mesh.count=0;this.mesh.visible=false;}this.owners.length=0;this.slots.clear();this.carriers.clear();return;}
  this.owners.length=0;this.slots.clear();this.carriers.clear();const{matrix,rotation,scale,position,slots}=this;
  for(const r of records){if(r.holder.kind==='carrier'){const holder=r.holder,u=g.state.units.find(u=>u.id===holder.unitId&&u.team===r.team&&u.hp>0&&!u.shelterId&&u.methodRecordCargoId===r.id);if(u&&g.visibleAt(u.x,u.z)){this.carriers.set(r.id,u);this.owners.push(r);}}else if(g.visibleAt(r.holder.x,r.holder.z))this.owners.push(r);}
  this.mesh=ensureInstanceCapacity(this.scene,this.mesh,this.owners.length);
  this.owners.forEach((r,i)=>{const carrier=this.carriers.get(r.id);if(carrier){position.set(carrier.x-Math.sin(carrier.facing)*.5,carrier.y+1.1,carrier.z-Math.cos(carrier.facing)*.5);this.mesh.setMatrixAt(i,matrix.compose(position,rotation,scale));return;}let{x,z}=r.holder;if(r.holder.kind==='cache'&&r.holder.buildingId!==undefined){const site=g.state.buildings.find(b=>r.holder.kind==='cache'&&b.id===r.holder.buildingId);if(site)z+=site.d/2+.6;}
   const key=`${x}:${z}`,slot=slots.get(key)||0;slots.set(key,slot+1);x+=(slot%4)*.45;z+=Math.floor(slot/4)*.4;position.set(x,g.travelHeight(x,z)+.12,z);this.mesh.setMatrixAt(i,matrix.compose(position,rotation,scale));});
  this.mesh.count=this.owners.length;this.mesh.visible=this.mesh.count>0;this.mesh.castShadow=this.mesh.receiveShadow=shadows&&quality!=='low';this.mesh.instanceMatrix.needsUpdate=true;
 }
 sources(){return new Map([[this.mesh,this.owners]]);}
 pick(ray:THREE.Raycaster,g:Game){if(this.disposed||!this.mesh.count)return null;this.mesh.computeBoundingSphere();this.mesh.updateMatrixWorld(true);for(const hit of ray.intersectObject(this.mesh,false)){const r=hit.instanceId===undefined?undefined:this.owners[hit.instanceId];if(r&&methodRecords(g).includes(r)&&methodRecordRecoverable(g,r,0)&&g.visibleAt(r.holder.x,r.holder.z))return r;}return null;}
 dispose(){if(this.disposed)return;this.disposed=true;this.scene.remove(this.mesh);this.mesh.dispose();this.geometry.dispose();this.owners=[];this.carriers.clear();this.slots.clear();}
}
