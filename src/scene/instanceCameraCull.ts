import * as THREE from 'three';
/** CPU submission filter for rigid instances. Terrain-displaced geometry and
 * off-camera shadow casters must retain their existing rendering paths. */
export class InstanceCameraCull {
 private readonly frustum=new THREE.Frustum();
 private readonly projection=new THREE.Matrix4();
 private readonly world=new THREE.Matrix4();
 private readonly sphere=new THREE.Sphere();
 metrics={tested:0,skipped:0};
 begin(camera:THREE.Camera){
  camera.updateWorldMatrix(true,false);
  this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  this.metrics={tested:0,skipped:0};
 }
 visible(mesh:THREE.InstancedMesh,instance:THREE.Matrix4,padding=8){
  this.metrics.tested++;
  if(!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();
  const bound=mesh.geometry.boundingSphere;
  if(!bound||!Number.isFinite(bound.radius))return true;
  mesh.updateWorldMatrix(true,false);
  this.world.multiplyMatrices(mesh.matrixWorld,instance);
  this.sphere.copy(bound).applyMatrix4(this.world);
  // Overdraw at the border is intentional: include artisan deformations and
  // camera motion between the renderer's existing 100ms structure reviews.
  this.sphere.radius+=Math.max(0,padding);
  const visible=this.frustum.intersectsSphere(this.sphere);
  if(!visible)this.metrics.skipped++;
  return visible;
 }
}
