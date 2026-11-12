import * as THREE from 'three';
import type {Game} from '../game/sim';
import {methodRecords,type MethodRecord} from '../game/methodRecords';
import {cargoGeo} from './meshes';
import {ensureInstanceCapacity} from './instanceCapacity';
/** Existing stone cargo geometry is a simple marker for a real owned clay record.
 * Display offsets never change its saved holder or the physical pickup point. */
export class MethodRecordLayer {
 private mesh:THREE.InstancedMesh;
 private geometry=cargoGeo('stone');
 private owners:MethodRecord[]=[];
 private disposed=false;
 private scene:THREE.Scene;
 constructor(scene:THREE.Scene,material:THREE.Material){this.scene=scene;this.mesh=new THREE.InstancedMesh(this.geometry,material,64);this.mesh.name='owned-physical-method-records';this.mesh.count=0;this.mesh.visible=false;this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);}
 sync(g:Game,quality:'low'|'med'|'high'='low',shadows=false){
  if(this.disposed)return;this.owners=[];const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(.65,.28,.65),position=new THREE.Vector3(),slots=new Map<string,number>();
  for(const r of methodRecords(g))if(r.team===0&&r.holder.kind!=='carrier'&&g.visibleAt(r.holder.x,r.holder.z))this.owners.push(r);
  this.mesh=ensureInstanceCapacity(this.scene,this.mesh,this.owners.length);
  this.owners.forEach((r,i)=>{let{x,z}=r.holder;if(r.holder.kind==='cache'&&r.holder.buildingId!==undefined){const site=g.state.buildings.find(b=>r.holder.kind==='cache'&&b.id===r.holder.buildingId);if(site)z+=site.d/2+.6;}
   const key=`${x}:${z}`,slot=slots.get(key)||0;slots.set(key,slot+1);x+=(slot%4)*.45;z+=Math.floor(slot/4)*.4;position.set(x,g.travelHeight(x,z)+.12,z);this.mesh.setMatrixAt(i,matrix.compose(position,rotation,scale));});
  this.mesh.count=this.owners.length;this.mesh.visible=this.mesh.count>0;this.mesh.castShadow=this.mesh.receiveShadow=shadows&&quality!=='low';this.mesh.instanceMatrix.needsUpdate=true;
 }
 sources(){return new Map([[this.mesh,this.owners]]);}
 pick(ray:THREE.Raycaster,g:Game){if(this.disposed||!this.mesh.count)return null;this.mesh.computeBoundingSphere();this.mesh.updateMatrixWorld(true);for(const hit of ray.intersectObject(this.mesh,false)){const r=hit.instanceId===undefined?undefined:this.owners[hit.instanceId];if(r&&methodRecords(g).includes(r)&&r.team===0&&r.holder.kind!=='carrier'&&g.visibleAt(r.holder.x,r.holder.z))return r;}return null;}
 dispose(){if(this.disposed)return;this.disposed=true;this.scene.remove(this.mesh);this.mesh.dispose();this.geometry.dispose();this.owners=[];}
}
