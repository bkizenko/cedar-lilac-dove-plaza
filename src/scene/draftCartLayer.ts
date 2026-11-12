import * as THREE from 'three';
import type {Game} from '../game/sim';
import type {Unit} from '../game/types';
import type {LooseDraftCart} from '../game/draftCart';
import {haulageGeo} from './meshes';
import {ensureInstanceCapacity} from './instanceCapacity';
/** Placement only: same existing handcart, behind the same owned animal.
 * No welfare predicate removes an asset that the core still records. */
export const DRAFT_CART_RENDER={behindHandlerMetres:5.4,groundOffset:.04,deckHeight:.7,initialInstances:16} as const;
const p=new THREE.Vector3(),q=new THREE.Quaternion(),e=new THREE.Euler(),scale=new THREE.Vector3(1,1,1);
export function draftCartMatrix(g:Pick<Game,'travelHeight'>,x:number,z:number,facing:number,out=new THREE.Matrix4()){
 const dx=Math.sin(facing),dz=Math.cos(facing),pitch=-Math.atan2(g.travelHeight(x+dx*.8,z+dz*.8)-g.travelHeight(x-dx*.8,z-dz*.8),1.6),roll=Math.atan2(g.travelHeight(x+dz*.5,z-dx*.5)-g.travelHeight(x-dz*.5,z+dx*.5),1);
 p.set(x,g.travelHeight(x,z)+DRAFT_CART_RENDER.groundOffset,z);e.set(THREE.MathUtils.clamp(pitch,-.45,.45),facing,THREE.MathUtils.clamp(roll,-.4,.4));q.setFromEuler(e);return out.compose(p,q,scale);
}
/** Two shared draws, authoritative owners rebuilt on every sync (including
 * same-time save restoration). Materials are borrowed, geometry owned here. */
export class DraftCartLayer {
 private attached:THREE.InstancedMesh;
 private loose:THREE.InstancedMesh;
 private geometry=haulageGeo('cart');
 private owners:Unit[]=[];
 private looseOwners:LooseDraftCart[]=[];
 private matrices=new Map<Unit,THREE.Matrix4>();
 private disposed=false;
 private scene:THREE.Scene;
 constructor(scene:THREE.Scene,material:THREE.Material){
  this.scene=scene;
  this.attached=new THREE.InstancedMesh(this.geometry,material,DRAFT_CART_RENDER.initialInstances);this.loose=new THREE.InstancedMesh(this.geometry,material,DRAFT_CART_RENDER.initialInstances);
  this.attached.name='actual-attached-draft-carts';this.loose.name='actual-loose-draft-carts';
  for(const mesh of [this.attached,this.loose]){mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);}
 }
 sync(g:Game,quality:'low'|'med'|'high'='low',shadows=false){
  if(this.disposed)return;
  const previous=this.matrices;this.matrices=new Map();this.owners=[];this.looseOwners=[];
  for(const u of g.state.units)if(u.draftCart&&!u.boat&&!u.shelterId&&(u.team===0||g.visibleAt(u.x,u.z)))this.owners.push(u);
  for(const cart of g.state.looseDraftCarts||[])if(g.visibleAt(cart.x,cart.z))this.looseOwners.push(cart);
  this.attached=ensureInstanceCapacity(this.scene,this.attached,this.owners.length);this.loose=ensureInstanceCapacity(this.scene,this.loose,this.looseOwners.length);
  for(let i=0;i<this.owners.length;i++){const u=this.owners[i],x=u.x-Math.sin(u.facing)*DRAFT_CART_RENDER.behindHandlerMetres,z=u.z-Math.cos(u.facing)*DRAFT_CART_RENDER.behindHandlerMetres,m=draftCartMatrix(g,x,z,u.facing,previous.get(u)||new THREE.Matrix4());this.matrices.set(u,m);this.attached.setMatrixAt(i,m);}
  for(let i=0;i<this.looseOwners.length;i++){const cart=this.looseOwners[i];this.loose.setMatrixAt(i,draftCartMatrix(g,cart.x,cart.z,0));}
  for(const [mesh,count]of [[this.attached,this.owners.length],[this.loose,this.looseOwners.length]]as const){mesh.count=count;mesh.visible=count>0;mesh.castShadow=shadows&&quality!=='low';mesh.receiveShadow=shadows&&quality!=='low';mesh.instanceMatrix.needsUpdate=true;}
 }
 matrixFor(u:Unit){return this.matrices.get(u);}
 sources(){return new Map<THREE.InstancedMesh,Unit[]>([[this.attached,this.owners]]);}
 looseSources(){return new Map<THREE.InstancedMesh,LooseDraftCart[]>([[this.loose,this.looseOwners]]);}
 pickLoose(ray:THREE.Raycaster,g:Game){
  if(this.disposed||!this.loose.count)return null;this.loose.computeBoundingSphere();this.loose.updateMatrixWorld(true);
  for(const hit of ray.intersectObject(this.loose,false)){const cart=hit.instanceId===undefined?undefined:this.looseOwners[hit.instanceId];if(cart&&g.state.looseDraftCarts?.includes(cart)&&g.visibleAt(cart.x,cart.z))return cart;}return null;
 }
 dispose(){if(this.disposed)return;this.disposed=true;for(const mesh of [this.attached,this.loose]){this.scene.remove(mesh);mesh.dispose();}this.geometry.dispose();this.owners=[];this.looseOwners=[];this.matrices.clear();}
}
