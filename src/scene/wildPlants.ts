import * as THREE from 'three';
import type {Game} from '../game/sim';
import {wildPlantsEnabled,wildPlantVisual,WILD_PLANT_SPECIES,type WildPlantSpecies} from '../game/ecology';
function foliage(species:WildPlantSpecies){
 if(species==='wild-grain')return new THREE.ConeGeometry(.32,1.7,5).translate(0,.85,0);
 const g=new THREE.IcosahedronGeometry(species.includes('berries')?.8:.6,species.includes('berries')?1:0);
 return g.scale(1,species.includes('berries')?.7:species==='wild-pulses'?.6:.3,1).translate(0,species.includes('berries')?.55:species==='wild-pulses'?.35:.18,0);
}
function produce(species:WildPlantSpecies){
 if(species==='wild-grain')return new THREE.ConeGeometry(.13,.45,5);
 if(species==='wild-pulses')return new THREE.CapsuleGeometry(.1,.3,2,5);
 if(species==='wild-tubers')return new THREE.SphereGeometry(.24,5,4).scale(1,.5,.7);
 if(species==='spring-greens')return new THREE.IcosahedronGeometry(.32,0).scale(1,.4,1);
 return new THREE.IcosahedronGeometry(.24,0);
}
/** Bounded instances represent the actual saved resource patches. Leaves can
 * remain when a patch is dormant or harvested; visible produce follows the same
 * mature-food quantity consumed by the collection executor. */
export class WildPlantLayer{
 private group=new THREE.Group();
 private meshes=new Map<WildPlantSpecies,{leaf:THREE.InstancedMesh;food:THREE.InstancedMesh}>();
 private at=-1;private revision=-1;private scene:THREE.Scene;private ids=new Map<WildPlantSpecies,number[]>();
 constructor(scene:THREE.Scene,g:Game){
  this.scene=scene;
  const capacity=Math.max(1,g.state.forage.length+32);
  this.group.name='seasonal-wild-plants';
  for(const species of WILD_PLANT_SPECIES){
   const leaf=new THREE.InstancedMesh(foliage(species),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true}),capacity),food=new THREE.InstancedMesh(produce(species),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85,flatShading:true}),capacity);
   leaf.name=`wild-plant-${species}`;food.name=`ripe-produce-${species}`;leaf.count=food.count=0;leaf.frustumCulled=food.frustumCulled=false;leaf.castShadow=true;leaf.receiveShadow=true;food.raycast=()=>{};this.meshes.set(species,{leaf,food});this.group.add(leaf,food);
  }
  scene.add(this.group);this.sync(g);
 }
 sync(g:Game){
  const at=Math.floor(g.state.time*2),revision=g.navigationRevision();if(at===this.at&&revision===this.revision)return;this.at=at;this.revision=revision;
  this.ids.clear();const counts=new Map(WILD_PLANT_SPECIES.map(s=>[s,{leaf:0,food:0}])),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),scale=new THREE.Vector3(),color=new THREE.Color();
  if(wildPlantsEnabled(g))for(const n of g.state.forage){
   if(!g.exploredAt(n.x,n.z))continue;const v=wildPlantVisual(g,n),pair=this.meshes.get(v.species)!,count=counts.get(v.species)!;
   if(count.leaf>=pair.leaf.instanceMatrix.count)continue;p.set(n.x,g.height(n.x,n.z),n.z);q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,(n.id*.61803398875)%(Math.PI*2));
   scale.setScalar(n.scale*v.leafScale);matrix.compose(p,q,scale);pair.leaf.setMatrixAt(count.leaf,matrix);pair.leaf.setColorAt(count.leaf++,color.set(v.leafColor));const ids=this.ids.get(v.species)??[];ids.push(n.id);this.ids.set(v.species,ids);
   if(v.fruitScale>0&&count.food<pair.food.instanceMatrix.count){const height=v.species==='wild-grain'?1.65:v.species==='wild-pulses'?.55:v.species==='wild-tubers'?.08:v.species==='spring-greens'?.34:.9;p.y+=height*n.scale*v.leafScale;scale.setScalar(n.scale*v.fruitScale);matrix.compose(p,q,scale);pair.food.setMatrixAt(count.food,matrix);pair.food.setColorAt(count.food++,color.set(v.ripeColor));}
  }
  for(const [species,pair]of this.meshes){const count=counts.get(species)!;for(const key of['leaf','food'] as const){const mesh=pair[key];mesh.count=count[key];mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}}
 }
 pickingSources(){return[...this.ids].map(([species,resourceIds])=>({mesh:this.meshes.get(species)!.leaf,resourceIds}));}
 dispose(){this.scene.remove(this.group);for(const pair of this.meshes.values())for(const mesh of[pair.leaf,pair.food]){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}this.meshes.clear();}
}
