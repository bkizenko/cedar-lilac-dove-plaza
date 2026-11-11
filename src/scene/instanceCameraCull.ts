import * as THREE from 'three';
export type InstanceLodBands={readonly near:number;readonly mid:number};
export type InstanceLodResult={mainCameraVisible:boolean;distanceSquared:number;lodTier:0|1|2};
/** CPU submission filter for rigid instances. Terrain-displaced geometry and
 * off-camera shadow casters must retain their existing rendering paths. */
export class InstanceCameraCull {
 private readonly frustum=new THREE.Frustum();
 private readonly projection=new THREE.Matrix4();
 private readonly world=new THREE.Matrix4();
 private readonly sphere=new THREE.Sphere();
 private readonly cameraPosition=new THREE.Vector3();
 private cameraReady=false;
 metrics={tested:0,skipped:0};
 begin(camera:THREE.Camera){
  camera.updateWorldMatrix(true,false);
  this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  this.cameraPosition.setFromMatrixPosition(camera.matrixWorld);
  this.cameraReady=Number.isFinite(this.cameraPosition.x)&&Number.isFinite(this.cameraPosition.y)&&Number.isFinite(this.cameraPosition.z);
  this.metrics={tested:0,skipped:0};
 }
 private prepareSphere(mesh:THREE.InstancedMesh,instance:THREE.Matrix4,computeMissing:boolean){
  if(computeMissing&&!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();
  const bound=mesh.geometry.boundingSphere;
  if(!bound||!Number.isFinite(bound.radius)||bound.radius<0)return false;
  mesh.updateWorldMatrix(true,false);
  this.world.multiplyMatrices(mesh.matrixWorld,instance);
  this.sphere.copy(bound).applyMatrix4(this.world);
  const s=this.sphere;
  return Number.isFinite(s.radius)&&s.radius>=0&&Number.isFinite(s.center.x)&&Number.isFinite(s.center.y)&&Number.isFinite(s.center.z);
 }
 private sphereVisible(padding:number){
  // Unknown padding must never hide an instance. Overdraw includes artisan
  // deformations and motion between the existing 100ms structure reviews.
  if(!Number.isFinite(padding))return true;
  this.sphere.radius+=Math.max(0,padding);
  const visible=this.frustum.intersectsSphere(this.sphere);
  if(!visible)this.metrics.skipped++;
  return visible;
 }
 visible(mesh:THREE.InstancedMesh,instance:THREE.Matrix4,padding=8){
  this.metrics.tested++;
  return this.prepareSphere(mesh,instance,true)?this.sphereVisible(padding):true;
 }
 /** Allocation-free rigid-instance query. Prepare geometry.boundingSphere at
  * geometry creation; missing/invalid bounds retain full near detail instead of
  * allocating a bound in this hot path. Caller owns/reuses bands and out.
  * Distances are metres from camera to the transformed bound CENTRE; padding
  * affects main-camera admission only. Thresholds are explicit, independent of
  * quality or camera zoom: [0,near) -> 0, [near,mid) -> 1, [mid,infinity) -> 2.
  * This result does not decide whether an off-camera shadow caster is drawn. */
 query(mesh:THREE.InstancedMesh,instance:THREE.Matrix4,bands:InstanceLodBands,out:InstanceLodResult,padding=8):InstanceLodResult {
  if(!Number.isFinite(bands.near)||!Number.isFinite(bands.mid)||bands.near<0||bands.near>=bands.mid)throw new RangeError('LOD bands require finite 0 <= near < mid distances in metres');
  this.metrics.tested++;
  out.mainCameraVisible=true;out.distanceSquared=Infinity;out.lodTier=0;
  if(!this.cameraReady||!this.prepareSphere(mesh,instance,false))return out;
  const distanceSquared=this.sphere.center.distanceToSquared(this.cameraPosition);
  if(!Number.isFinite(distanceSquared))return out;
  out.distanceSquared=distanceSquared;
  out.lodTier=distanceSquared<bands.near*bands.near?0:distanceSquared<bands.mid*bands.mid?1:2;
  out.mainCameraVisible=this.sphereVisible(padding);
  return out;
 }
}
