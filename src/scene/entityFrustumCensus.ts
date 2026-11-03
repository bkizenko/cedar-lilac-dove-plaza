import * as THREE from 'three';
export type CensusOwner={id:number;team:number;hp:number};
export type CensusSource={mesh:THREE.InstancedMesh;owners:readonly CensusOwner[];admitted?:(owner:CensusOwner)=>boolean};
export type EntityCount={total:number;represented:number;inFrustum:number};
/** On-demand rendered body/model bounds, not occlusion or pixel visibility.
 * Sources must be the renderer's actual instance-to-owner mapping. */
export function countEntityFrustum(camera:THREE.Camera,sources:Iterable<CensusSource>,totals:readonly CensusOwner[]):EntityCount{
 const total=new Set(totals.filter(o=>o.team===0&&o.hp>0).map(o=>o.id));
 const represented=new Set<number>(),inside=new Set<number>();
 camera.updateWorldMatrix(true,false);
 const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 const instance=new THREE.Matrix4(),world=new THREE.Matrix4(),box=new THREE.Box3(),scale=new THREE.Vector3();
 for(const {mesh,owners,admitted}of sources){
  let visible=true;for(let p:THREE.Object3D|null=mesh;p;p=p.parent)if(!p.visible){visible=false;break;}
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  if(!visible||!camera.layers.test(mesh.layers)||!materials.some(m=>m.visible&&(!m.transparent||m.opacity>0))||mesh.geometry.drawRange.count===0||!mesh.geometry.getAttribute('position')?.count)continue;
  mesh.updateWorldMatrix(true,false);if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  if(!mesh.geometry.boundingBox||mesh.geometry.boundingBox.isEmpty())continue;
  const art=mesh.geometry.getAttribute('buildingArt');
  for(let i=0;i<Math.min(mesh.count,owners.length,mesh.instanceMatrix.count);i++){
   const owner=owners[i];if(!total.has(owner.id)||admitted&&!admitted(owner))continue;
   mesh.getMatrixAt(i,instance);scale.setFromMatrixScale(instance);
   // Renderer uses a .001 dummy scale for hidden bodies and unfinished roofs.
   if(Math.max(scale.x,scale.y,scale.z)<=.0011)continue;
   box.copy(mesh.geometry.boundingBox);
   // Conservative bound includes the shader's per-instance artisan deformation.
   if(art&&i<art.count){const dx=Math.abs(art.getX(i))+Math.abs(art.getZ(i)),dy=Math.abs(art.getW(i)),dz=Math.abs(art.getY(i));box.min.add(new THREE.Vector3(-dx,-dy,-dz));box.max.add(new THREE.Vector3(dx,dy,dz));}
   world.multiplyMatrices(mesh.matrixWorld,instance);box.applyMatrix4(world);represented.add(owner.id);
   if(frustum.intersectsBox(box))inside.add(owner.id);
  }
 }
 return{total:total.size,represented:represented.size,inFrustum:inside.size};
}
