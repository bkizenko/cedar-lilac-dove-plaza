/** Instanced cut logs lying beside felled trees (see src/game/fellLogs.ts). One draw call, capped, refreshed with the tree sync. */
import * as THREE from 'three';
import {visibleLogs,type FellTree} from '../game/fellLogs';
const CAP=300,_m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_p=new THREE.Vector3(),_s=new THREE.Vector3();
export class FellLogLayer{
 private mesh:THREE.InstancedMesh;
 private scene:THREE.Scene;
 constructor(scene:THREE.Scene){
  this.scene=scene;
  const geo=new THREE.CylinderGeometry(1,1,1,7);geo.rotateX(Math.PI/2);
  this.mesh=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({color:'#6b4a2c',roughness:.95}),CAP);
  this.mesh.name='felled-logs';this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.castShadow=false;scene.add(this.mesh);
 }
 sync(trees:readonly FellTree[],cam:{x:number;z:number}){
  const logs=visibleLogs(trees,cam,CAP);
  logs.forEach((l,i)=>{_e.set(0,l.yaw,0);_q.setFromEuler(_e);_p.set(l.x,l.y,l.z);_s.set(l.radius,l.radius,l.length);_m.compose(_p,_q,_s);this.mesh.setMatrixAt(i,_m);});
  this.mesh.count=logs.length;this.mesh.instanceMatrix.needsUpdate=true;
 }
 dispose(){this.scene.remove(this.mesh);this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();}
}
