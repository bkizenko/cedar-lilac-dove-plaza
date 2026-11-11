import * as THREE from 'three';
/** Grow a shared draw only for actual admitted instances. Geometry/materials
 * remain shared; disposing the replaced mesh releases only its instance buffers. */
export function ensureInstanceCapacity(scene:THREE.Scene,old:THREE.InstancedMesh,needed:number){
 const capacity=old.instanceMatrix.count;
 if(needed<=capacity)return old;
 if(!Number.isSafeInteger(needed)||needed<0)throw new Error('Invalid actual instance count');
 const next=2**Math.ceil(Math.log2(Math.max(1,needed)));
 const mesh=new THREE.InstancedMesh(old.geometry,old.material,next);
 mesh.name=old.name;mesh.visible=old.visible;mesh.castShadow=old.castShadow;mesh.receiveShadow=old.receiveShadow;mesh.frustumCulled=old.frustumCulled;mesh.renderOrder=old.renderOrder;mesh.layers.mask=old.layers.mask;
 mesh.position.copy(old.position);mesh.quaternion.copy(old.quaternion);mesh.scale.copy(old.scale);mesh.matrix.copy(old.matrix);mesh.matrixWorld.copy(old.matrixWorld);mesh.matrixAutoUpdate=old.matrixAutoUpdate;mesh.matrixWorldAutoUpdate=old.matrixWorldAutoUpdate;
 mesh.customDepthMaterial=old.customDepthMaterial;mesh.customDistanceMaterial=old.customDistanceMaterial;mesh.raycast=old.raycast;mesh.userData={...old.userData};
 mesh.instanceMatrix.setUsage(old.instanceMatrix.usage);mesh.instanceMatrix.array.set(old.instanceMatrix.array);mesh.instanceMatrix.needsUpdate=true;
 if(old.instanceColor){mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(next*old.instanceColor.itemSize),old.instanceColor.itemSize,old.instanceColor.normalized);mesh.instanceColor.setUsage(old.instanceColor.usage);mesh.instanceColor.array.set(old.instanceColor.array);mesh.instanceColor.needsUpdate=true;}
 mesh.count=old.count;
 const parent=old.parent||scene;parent.remove(old);parent.add(mesh);old.dispose();return mesh;
}
