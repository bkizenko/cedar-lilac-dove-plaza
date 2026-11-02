import * as THREE from 'three';
import {TREE_FORMS,treeKit,dressingKit,type TreeForm,type DressingForm} from './vegetationKit';
export const VEGETATION_BIOMES=['meadow','mixed-woodland','conifer-forest','alpine','wetland','dry-scrub','arid','warm-coast'] as const;
export type VegetationBiome=typeof VEGETATION_BIOMES[number];
export type VegetationProfile={kind:VegetationBiome;treeForms?:Partial<Record<TreeForm,number>>};
export type ResourceTree={id:number;x:number;y:number;z:number;amount:number;scale:number;regenT:number;planted?:boolean};
export const BIOME_VEGETATION_RULES={version:1,nearMetres:{low:38,med:75,high:115},farMetres:700,stumpHeightScale:.075,
 dressingMaxInstances:{low:0,med:512,high:1024},dressingDistanceMetres:65} as const;
const defaults:Record<VegetationBiome,Partial<Record<TreeForm,number>>>={
 meadow:{broadleaf:1},'mixed-woodland':{broadleaf:.8,conifer:.2},'conifer-forest':{conifer:1},alpine:{stunted:1},wetland:{willow:.85,broadleaf:.15},'dry-scrub':{scrub:.7,acacia:.3},arid:{scrub:.6,acacia:.4},'warm-coast':{palm:.6,acacia:.4},
};
function stableUnit(id:number,seed:number){let n=(id^seed^0x4bc73a9)|0;n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;}
export function resourceTreeForm(id:number,profile:VegetationProfile,seed:number):TreeForm{
 const weights=profile.treeForms??defaults[profile.kind],total=TREE_FORMS.reduce((sum,key)=>sum+Math.max(0,weights[key]??0),0);
 let value=stableUnit(id,seed)*total;
 for(const form of TREE_FORMS){value-=Math.max(0,weights[form]??0);if(value<0)return form;}
 return Object.keys(defaults[profile.kind])[0] as TreeForm;
}
export type VegetationContext={marked?:(id:number)=>boolean;quality:'low'|'med'|'high';camera:{x:number;z:number};known:(x:number,z:number)=>boolean;winter:number;autumn:number;snow:number};
type Part='trunk'|'canopy';
type TreeBatch={trunk:THREE.InstancedMesh;canopy:THREE.InstancedMesh;capacity:number;crownCenter:THREE.Vector3;crownHalf:THREE.Vector3;ids:Record<Part,number[]>};
const leafColors:Record<TreeForm,string>={broadleaf:'#668947',conifer:'#375f49',willow:'#718b4c',acacia:'#738052',palm:'#577747',stunted:'#536d61',scrub:'#838065'};
/** Renderer adapter only. Every tree instance comes from an existing resource
 * ID, position and amount; no extra wood or collision is created by this kit. */
export class BiomeVegetation {
 private scene:THREE.Scene;private seed:number;private profileAt:(x:number,z:number)=>VegetationProfile;
 private batches=new Map<TreeForm,TreeBatch>();private far:THREE.InstancedMesh[];private farIds:number[][]=[[],[]];private farTrunk:THREE.InstancedMesh;private farTrunkIds:number[]=[];
 private cache=new Map<number,TreeForm>();private matrix=new THREE.Matrix4();private pos=new THREE.Vector3();private scale=new THREE.Vector3();private rotation=new THREE.Quaternion();private euler=new THREE.Euler();private color=new THREE.Color();
 private autumnColors={broadleaf:new THREE.Color('#a77942'),willow:new THREE.Color('#a39b53')};private snowColor=new THREE.Color('#d4e0dd');
 private bark=new THREE.MeshStandardMaterial({color:'#655444',roughness:.96});
 private leaves=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.88,vertexColors:true,side:THREE.DoubleSide});
 private farMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95});
 constructor(scene:THREE.Scene,seed:number,profileAt:(x:number,z:number)=>VegetationProfile,capacity=1){
  this.scene=scene;this.seed=seed;this.profileAt=profileAt;
  for(const form of TREE_FORMS){const kit=treeKit(form),trunk=new THREE.InstancedMesh(kit.trunk,this.bark,Math.max(1,capacity)),canopy=new THREE.InstancedMesh(kit.canopy,this.leaves,Math.max(1,capacity));
   trunk.name=`resource-${form}-trunk`;canopy.name=`resource-${form}-canopy`;trunk.count=canopy.count=0;trunk.frustumCulled=canopy.frustumCulled=false;trunk.receiveShadow=canopy.receiveShadow=true;scene.add(trunk,canopy);this.batches.set(form,{trunk,canopy,capacity:Math.max(1,capacity),crownCenter:kit.canopy.boundingBox!.getCenter(new THREE.Vector3()),crownHalf:kit.canopy.boundingBox!.getSize(new THREE.Vector3()).multiplyScalar(.5),ids:{trunk:[],canopy:[]}});}
  this.farTrunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,5).translate(0,.5,0),this.bark,Math.max(1,capacity));this.farTrunk.name='resource-far-rooted-trunk';this.farTrunk.count=0;this.farTrunk.frustumCulled=false;scene.add(this.farTrunk);
  const round=new THREE.IcosahedronGeometry(1,0),needle=new THREE.ConeGeometry(1,2,6);this.far=[round,needle].map((geo,i)=>{const mesh=new THREE.InstancedMesh(geo,this.farMaterial,Math.max(1,capacity));mesh.name=i?'resource-far-needle':'resource-far-crown';mesh.count=0;mesh.frustumCulled=false;scene.add(mesh);return mesh;});
 }
 private grow(form:TreeForm,needed:number){const b=this.batches.get(form)!;if(needed<=b.capacity)return;const capacity=Math.max(needed,b.capacity*2);
  for(const part of ['trunk','canopy'] as const){const old=b[part],mesh=new THREE.InstancedMesh(old.geometry,old.material,capacity);mesh.name=old.name;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.instanceMatrix.array.set(old.instanceMatrix.array);
   if(old.instanceColor){mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);mesh.instanceColor.array.set(old.instanceColor.array);}
   this.scene.remove(old);old.dispose();this.scene.add(mesh);b[part]=mesh;}
  b.capacity=capacity;
 }
 private growFar(index:number,needed:number){const old=this.far[index];if(needed<=old.instanceMatrix.count)return;const mesh=new THREE.InstancedMesh(old.geometry,old.material,Math.max(needed,old.instanceMatrix.count*2));mesh.name=old.name;mesh.frustumCulled=false;mesh.instanceMatrix.array.set(old.instanceMatrix.array);
  if(old.instanceColor){mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count*3),3);mesh.instanceColor.array.set(old.instanceColor.array);}
  this.scene.remove(old);old.dispose();this.scene.add(mesh);this.far[index]=mesh;}
 resourceId(form:TreeForm,part:Part,index:number){return this.batches.get(form)?.ids[part][index];}
 farResourceId(style:0|1,index:number){return this.farIds[style][index];}
 pickingSources(){
  const sources:{mesh:THREE.InstancedMesh;resourceIds:readonly number[]}[]=[];
  for(const b of this.batches.values())for(const part of ['trunk','canopy'] as const)sources.push({mesh:b[part],resourceIds:b.ids[part]});
  sources.push({mesh:this.farTrunk,resourceIds:this.farTrunkIds});
  for(let i=0;i<2;i++)sources.push({mesh:this.far[i],resourceIds:this.farIds[i]});return sources;
 }
 sync(nodes:readonly ResourceTree[],context:VegetationContext){
  const counts=new Map<TreeForm,{trunk:number;canopy:number}>();for(const form of TREE_FORMS){counts.set(form,{trunk:0,canopy:0});const b=this.batches.get(form)!;b.ids.trunk.length=b.ids.canopy.length=0;}
  let farTrunks=0;this.farTrunkIds.length=0;
  const farCounts=[0,0];this.farIds[0].length=this.farIds[1].length=0;
  const near=BIOME_VEGETATION_RULES.nearMetres[context.quality];
  for(const node of nodes){
   if(!context.known(node.x,node.z))continue;
   const distance=Math.hypot(node.x-context.camera.x,node.z-context.camera.z);if(distance>BIOME_VEGETATION_RULES.farMetres)continue;
   let form=this.cache.get(node.id);if(!form){form=resourceTreeForm(node.id,this.profileAt(node.x,node.z),this.seed);this.cache.set(node.id,form);}
   const stump=node.amount<=0&&!node.planted,growth=node.planted?.18+.6*Math.max(0,1-node.regenT/120):1,s=node.scale*growth;
   const deciduous=form==='broadleaf'||form==='willow',bare=deciduous&&context.winter>.8&&context.snow<.4;
   this.color.set(leafColors[form]);
   if(deciduous&&context.autumn>.1)this.color.lerp(this.autumnColors[form as 'broadleaf'|'willow'],Math.min(.8,context.autumn));
   if(context.snow>.2)this.color.lerp(this.snowColor,context.snow*.8);
   this.color.multiplyScalar(.90+stableUnit(node.id+17,this.seed)*.16);
   if(context.marked?.(node.id))this.color.set('#c58e43');
   this.euler.set(0,stableUnit(node.id,this.seed)*Math.PI*2,0);this.rotation.setFromEuler(this.euler);
   if(distance<=near){
    const count=counts.get(form)!;this.grow(form,Math.max(count.trunk,count.canopy)+1);const b=this.batches.get(form)!;
    this.pos.set(node.x,node.y,node.z);this.scale.set(s*(stump?.65:1),s*(stump?BIOME_VEGETATION_RULES.stumpHeightScale:1),s*(stump?.65:1));this.matrix.compose(this.pos,this.rotation,this.scale);b.trunk.setMatrixAt(count.trunk++,this.matrix);b.ids.trunk.push(node.id);
    if(!stump&&!bare){this.scale.setScalar(s);this.matrix.compose(this.pos,this.rotation,this.scale);b.canopy.setMatrixAt(count.canopy,this.matrix);b.canopy.setColorAt(count.canopy++,this.color);b.ids.canopy.push(node.id);}
   }else if(!stump){
    if(farTrunks>=this.farTrunk.instanceMatrix.count){const old=this.farTrunk,mesh=new THREE.InstancedMesh(old.geometry,old.material,old.instanceMatrix.count*2);mesh.name=old.name;mesh.frustumCulled=false;mesh.instanceMatrix.array.set(old.instanceMatrix.array);this.scene.remove(old);old.dispose();this.scene.add(mesh);this.farTrunk=mesh;}
    const bounds=this.batches.get(form)!;
    this.pos.set(node.x,node.y,node.z);this.scale.set(.14*s,Math.max(.6,bounds.crownCenter.y)*s,.14*s);this.matrix.compose(this.pos,this.rotation,this.scale);this.farTrunk.setMatrixAt(farTrunks++,this.matrix);this.farTrunkIds.push(node.id);
    if(bare)continue;
    const style=form==='conifer'||form==='stunted'?1:0,i=farCounts[style]++;this.growFar(style,i+1);const mesh=this.far[style];
    this.pos.copy(bounds.crownCenter).applyQuaternion(this.rotation).multiplyScalar(s);this.pos.x+=node.x;this.pos.y+=node.y;this.pos.z+=node.z;
    this.scale.copy(bounds.crownHalf).multiplyScalar(s);this.matrix.compose(this.pos,this.rotation,this.scale);mesh.setMatrixAt(i,this.matrix);mesh.setColorAt(i,this.color);this.farIds[style].push(node.id);
   }
  }
  for(const form of TREE_FORMS){const b=this.batches.get(form)!,count=counts.get(form)!;for(const part of ['trunk','canopy'] as const){const mesh=b[part];mesh.count=count[part];mesh.castShadow=context.quality!=='low';mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}}
  this.farTrunk.count=farTrunks;this.farTrunk.instanceMatrix.needsUpdate=true;
  for(let i=0;i<2;i++){const mesh=this.far[i];mesh.count=farCounts[i];mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  return {nearTrees:[...counts.values()].reduce((n,c)=>n+c.trunk,0),nearCanopies:[...counts.values()].reduce((n,c)=>n+c.canopy,0),farCanopies:farCounts[0]+farCounts[1],resourceCount:nodes.length};
 }
 dispose(){for(const batch of this.batches.values())for(const part of ['trunk','canopy'] as const){const mesh=batch[part];this.scene.remove(mesh);mesh.geometry.dispose();mesh.dispose();}for(const mesh of this.far){this.scene.remove(mesh);mesh.geometry.dispose();mesh.dispose();}this.scene.remove(this.farTrunk);this.farTrunk.geometry.dispose();this.farTrunk.dispose();this.bark.dispose();this.leaves.dispose();this.farMaterial.dispose();this.cache.clear();}
}
export type DressingPoint={x:number;y:number;z:number;kind:DressingForm;scale?:number};
/** Tiny nonblocking dressing: no ResourceNode, navigation obstacle, free product
 * or clickable harvest target. Caller supplies actual dry-ground eligibility. */
export class BiomeDressing {
 private scene:THREE.Scene;private batches=new Map<DressingForm,THREE.InstancedMesh>();private matrix=new THREE.Matrix4();private pos=new THREE.Vector3();private scale=new THREE.Vector3();private rotation=new THREE.Quaternion();
 constructor(scene:THREE.Scene){this.scene=scene;const colors:Record<DressingForm,string>={grass:'#7e8c58',flowers:'#c9b989',reeds:'#8d8a53',scrub:'#858367',pebbles:'#89877a'};
  for(const kind of ['grass','flowers','reeds','scrub','pebbles'] as const){const mesh=new THREE.InstancedMesh(dressingKit(kind),new THREE.MeshStandardMaterial({color:colors[kind],roughness:1,side:THREE.DoubleSide}),BIOME_VEGETATION_RULES.dressingMaxInstances.high);mesh.name=`nonblocking-${kind}`;mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.raycast=()=>{};scene.add(mesh);this.batches.set(kind,mesh);}}
 sync(points:readonly DressingPoint[],context:Pick<VegetationContext,'quality'|'camera'|'known'>,isDry:(x:number,z:number)=>boolean){
  const cap=BIOME_VEGETATION_RULES.dressingMaxInstances[context.quality],counts=new Map<DressingForm,number>();let total=0;
  for(const point of points){if(total>=cap)break;if(!context.known(point.x,point.z)||!isDry(point.x,point.z)||Math.hypot(point.x-context.camera.x,point.z-context.camera.z)>BIOME_VEGETATION_RULES.dressingDistanceMetres)continue;
   const mesh=this.batches.get(point.kind)!;const index=counts.get(point.kind)??0;this.pos.set(point.x,point.y,point.z);this.scale.setScalar(Math.max(.1,Math.min(1.3,point.scale??1)));this.matrix.compose(this.pos,this.rotation,this.scale);mesh.setMatrixAt(index,this.matrix);counts.set(point.kind,index+1);total++;
  }
  for(const [kind,mesh]of this.batches){mesh.count=counts.get(kind)??0;mesh.instanceMatrix.needsUpdate=true;}return total;
 }
 dispose(){for(const mesh of this.batches.values()){this.scene.remove(mesh);mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();mesh.dispose();}this.batches.clear();}
}
