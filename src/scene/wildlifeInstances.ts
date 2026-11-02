import * as THREE from 'three';
import type {Critter} from '../game/types';
/** Actual animals only: compact visible instances, never ambient substitute prey. */
export function wildlifeInstanceAnimals(animals:readonly Critter[],species:string,visible:(x:number,z:number)=>boolean,explored:(x:number,z:number)=>boolean,available:(animal:Critter)=>boolean){
 return animals.filter(c=>c.species===species&&(c.hp>0?visible(c.x,c.z):available(c)&&explored(c.x,c.z)));
}
/** Keep one draw per species, growing only to actual population. Animated
 * instances have no stable bounding sphere; visibility is already simulation-gated. */
export function growWildlifeMesh(scene:THREE.Scene,old:THREE.InstancedMesh,needed:number){
 old.frustumCulled=false;
 if(needed<=old.instanceMatrix.count)return old;
 const mesh=new THREE.InstancedMesh(old.geometry,old.material,Math.max(needed,old.instanceMatrix.count*2));
 mesh.name=old.name;mesh.castShadow=old.castShadow;mesh.receiveShadow=old.receiveShadow;mesh.frustumCulled=false;
 mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.remove(old);old.dispose();scene.add(mesh);return mesh;
}
