import * as THREE from 'three';
import type {Game} from '../game/sim';
import {survivalFireActive} from '../game/survivalNeeds';

/** Each bundle represents up to 20 stored units, maximum eight per resource.
 * These are inventory indicators at an unbuilt camp, never extra goods or fuel. */
export const CAMP_VISUAL_RULES={unitsPerBundle:20,maxBundles:8,refreshSeconds:.1,embersPerCamp:6,emberEmissiveIntensity:1.8} as const;
export function campStockBundles(amount:number){return Math.min(CAMP_VISUAL_RULES.maxBundles,Math.ceil(Math.max(0,amount)/CAMP_VISUAL_RULES.unitsPerBundle));}
export class CampVisual {
 private meshes:THREE.InstancedMesh[];
 private embers:THREE.InstancedMesh;
 private matrix=new THREE.Matrix4();private position=new THREE.Vector3();private rotation=new THREE.Quaternion();private scale=new THREE.Vector3();
 private scene:THREE.Scene;
 constructor(scene:THREE.Scene,campCapacity:number){
  this.scene=scene;
  const geometry=new THREE.BoxGeometry(1,1,1);
  this.meshes=['#b39b64','#795438','#92938a'].map(color=>{
   const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1}),Math.max(1,campCapacity)*CAMP_VISUAL_RULES.maxBundles);
   mesh.count=0;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;scene.add(mesh);return mesh;
  });
  this.embers=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color:'#9d4220',emissive:'#f06b20',emissiveIntensity:CAMP_VISUAL_RULES.emberEmissiveIntensity,roughness:1}),Math.max(1,campCapacity)*CAMP_VISUAL_RULES.embersPerCamp);
  this.embers.name='camp-embers';this.embers.count=0;this.embers.frustumCulled=false;scene.add(this.embers);
 }
 sync(game:Game){
  const kinds=['food','wood','stone'] as const,counts=[0,0,0];let emberCount=0;
  for(const camp of game.world.camps){
   if(!game.tribe(camp.team).alive||!(camp.team===0?game.exploredAt(camp.x,camp.z):game.visibleAt(camp.x,camp.z))||game.state.buildings.some(b=>b.team===camp.team&&b.type==='townhall'&&game.finished(b)))continue;
   // Read actual combustion recorded by the last simulation tick. No wood use,
   // no glow; loading a save cannot invent an already burning fire.
   if(game.state.survivalVersion===1&&survivalFireActive(game,camp.team)){
    const home=game.campOf(camp.team);
    for(let i=0;i<CAMP_VISUAL_RULES.embersPerCamp&&emberCount<this.embers.instanceMatrix.count;i++){
     const a=i*Math.PI*2/CAMP_VISUAL_RULES.embersPerCamp,x=home.x+Math.cos(a)*.4,z=home.z-.8+Math.sin(a)*.4,y=game.height(x,z);
     if(y<game.world.waterY+.3||game.state.buildings.some(b=>game.solidBuilding(b)&&Math.abs(x-b.x)<b.w*.4&&Math.abs(z-b.z)<b.d*.4))continue;
     this.position.set(x,y+.1,z);this.scale.set(.28,.18,.28);this.matrix.compose(this.position,this.rotation,this.scale);
     this.embers.setMatrixAt(emberCount++,this.matrix);
    }
   }
   for(let kind=0;kind<kinds.length;kind++){
    const quantity=campStockBundles(game.tribe(camp.team)[kinds[kind]]),mesh=this.meshes[kind];
    for(let i=0;i<quantity&&counts[kind]<mesh.instanceMatrix.count;i++){
     const x=camp.x+(kind-1)*1.5+(i%2)*.48,z=camp.z+1.1+Math.floor(i/2)*.46;
     const y=game.height(x,z);if(y<game.world.waterY+.3)continue;
     this.position.set(x,y+.22,z);this.scale.set(kind===1?.75:.4,kind===2?.28:.42,.36);
     this.matrix.compose(this.position,this.rotation,this.scale);mesh.setMatrixAt(counts[kind]++,this.matrix);
    }
   }
  }
  for(let i=0;i<3;i++){this.meshes[i].count=counts[i];this.meshes[i].instanceMatrix.needsUpdate=true;}
  this.embers.count=emberCount;this.embers.instanceMatrix.needsUpdate=true;
 }
 dispose(){
  this.meshes[0].geometry.dispose();
  for(const mesh of [...this.meshes,this.embers]){this.scene.remove(mesh);(mesh.material as THREE.Material).dispose();mesh.dispose();}
 }
}
