import * as THREE from 'three';
import {TREE_FORMS,treeKit,dressingKit,type TreeForm,type DressingForm} from './vegetationKit';
import {contactShadowGeometry,radialShadowTexture,painterTreeKit,painterFarRound,painterFarNeedle,painterDressing,PAINTER_FORMS,type PainterForm,type PainterDressing} from './painterTrees';
import {makePainterFoliage,makePainterBark,makePainterGrass,makePainterProp,painterSway,type PainterSway} from './painterVegetationMaterial';
export const VEGETATION_BIOMES=['meadow','mixed-woodland','conifer-forest','alpine','wetland','dry-scrub','arid','warm-coast'] as const;
export type VegetationBiome=typeof VEGETATION_BIOMES[number];
export type VegetationProfile={kind:VegetationBiome;treeForms?:Partial<Record<TreeForm,number>>};
export type ResourceTree={id:number;x:number;y:number;z:number;amount:number;scale:number;regenT:number;planted?:boolean};
export const BIOME_VEGETATION_RULES={version:1,nearMetres:{low:28,med:75,high:115},farMetres:700,lowFarMetres:420,stumpHeightScale:.075,
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
export type VegetationStyle='classic'|'painterly';
type AnyForm=TreeForm|'birch'|'cypress';
const TREE_SHADOW_RADIUS:Record<AnyForm,number>={broadleaf:2.5,conifer:1.8,willow:2.6,acacia:2.7,palm:1.7,stunted:1.3,scrub:1.1,birch:1.7,cypress:1.1};
type TreeBatch={trunk:THREE.InstancedMesh;canopy:THREE.InstancedMesh;capacity:number;crownCenter:THREE.Vector3;crownHalf:THREE.Vector3;ids:Record<Part,number[]>};
const AUTUMN_LEAVES=['#d9962f','#c9702a','#b84a2a','#e2bb3c','#9aa83c','#cf8a30'].map(h=>new THREE.Color(h));
const painterLeafColors:Record<AnyForm,string>={broadleaf:'#6f9c3f',conifer:'#3f6e4c',willow:'#7ba046',acacia:'#8a9446',palm:'#5e9440',stunted:'#587a60',scrub:'#8c8a4c',birch:'#86ac3d',cypress:'#4b6e48'};
const leafColors:Record<TreeForm,string>={broadleaf:'#668947',conifer:'#375f49',willow:'#718b4c',acacia:'#738052',palm:'#577747',stunted:'#536d61',scrub:'#838065'};
/** Renderer adapter only. Every tree instance comes from an existing resource
 * ID, position and amount; no extra wood or collision is created by this kit. */
export class BiomeVegetation {
 private scene:THREE.Scene;private seed:number;private profileAt:(x:number,z:number)=>VegetationProfile;
 private style:VegetationStyle;private sway:PainterSway|null=null;private shadows:THREE.InstancedMesh|null=null;private shadowMat:THREE.MeshBasicMaterial|null=null;private sunAz=new THREE.Vector2(-.6,.8);private sunElev=.8;private shadowOpacity=.34;private forms:readonly AnyForm[]=TREE_FORMS;private batches=new Map<AnyForm,TreeBatch>();private far:THREE.InstancedMesh[];private farIds:number[][]=[[],[]];private farTrunk:THREE.InstancedMesh;private farTrunkIds:number[]=[];
 private cache=new Map<number,AnyForm>();private matrix=new THREE.Matrix4();private pos=new THREE.Vector3();private scale=new THREE.Vector3();private rotation=new THREE.Quaternion();private euler=new THREE.Euler();private color=new THREE.Color();
 private autumnColors={broadleaf:new THREE.Color('#a77942'),willow:new THREE.Color('#a39b53')};private snowColor=new THREE.Color('#d4e0dd');
 private bark:THREE.MeshStandardMaterial;private leaves:THREE.MeshStandardMaterial;private farMaterial:THREE.MeshStandardMaterial;
 constructor(scene:THREE.Scene,seed:number,profileAt:(x:number,z:number)=>VegetationProfile,capacity=1,style:VegetationStyle='classic'){
  this.scene=scene;this.seed=seed;this.profileAt=profileAt;this.style=style;
  if(style==='painterly'){this.sway=painterSway();this.forms=PAINTER_FORMS as readonly AnyForm[];this.bark=makePainterBark(this.sway);this.leaves=makePainterFoliage(this.sway);this.farMaterial=makePainterFoliage(this.sway,true);}
  else{this.bark=new THREE.MeshStandardMaterial({color:'#655444',roughness:.96});this.leaves=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.88,vertexColors:true,side:THREE.DoubleSide});this.farMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95});}
  for(const form of this.forms){const kit=style==='painterly'?painterTreeKit(form as PainterForm):treeKit(form as TreeForm),trunk=new THREE.InstancedMesh(kit.trunk,this.bark,Math.max(1,capacity)),canopy=new THREE.InstancedMesh(kit.canopy,this.leaves,Math.max(1,capacity));
   trunk.name=`resource-${form}-trunk`;canopy.name=`resource-${form}-canopy`;trunk.count=canopy.count=0;trunk.frustumCulled=canopy.frustumCulled=false;trunk.receiveShadow=canopy.receiveShadow=true;scene.add(trunk,canopy);this.batches.set(form,{trunk,canopy,capacity:Math.max(1,capacity),crownCenter:kit.canopy.boundingBox!.getCenter(new THREE.Vector3()),crownHalf:kit.canopy.boundingBox!.getSize(new THREE.Vector3()).multiplyScalar(.5),ids:{trunk:[],canopy:[]}});}
  const farGeo=new THREE.CylinderGeometry(1,1,1,5).translate(0,.5,0);if(style==='painterly')farGeo.setAttribute('color',new THREE.BufferAttribute((()=>{const a=new Float32Array(farGeo.attributes.position.count*3);for(let i=0;i<a.length;i+=3)a.set([.2,.12,.07],i);return a;})(),3));
  this.farTrunk=new THREE.InstancedMesh(farGeo,this.bark,Math.max(1,capacity));this.farTrunk.name='resource-far-rooted-trunk';this.farTrunk.count=0;this.farTrunk.frustumCulled=false;scene.add(this.farTrunk);
  const unit=(g:THREE.BufferGeometry)=>{g.computeBoundingBox();const b=g.boundingBox!,c=b.getCenter(new THREE.Vector3()),h=b.getSize(new THREE.Vector3()).multiplyScalar(.5);g.translate(-c.x,-c.y,-c.z);g.scale(1/h.x,1/h.y,1/h.z);g.computeBoundingBox();return g;};
  const round=style==='painterly'?unit(painterFarRound()):new THREE.IcosahedronGeometry(1,0),needle=style==='painterly'?unit(painterFarNeedle()):new THREE.ConeGeometry(1,2,6);this.far=[round,needle].map((geo,i)=>{const mesh=new THREE.InstancedMesh(geo,this.farMaterial,Math.max(1,capacity));mesh.name=i?'resource-far-needle':'resource-far-crown';mesh.count=0;mesh.frustumCulled=false;scene.add(mesh);return mesh;});
  if(style==='painterly'){const tex=radialShadowTexture();this.shadowMat=new THREE.MeshBasicMaterial({color:0x10140a,map:null,alphaMap:tex,transparent:true,opacity:this.shadowOpacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
   this.shadows=new THREE.InstancedMesh(contactShadowGeometry(),this.shadowMat,Math.max(1,capacity));this.shadows.name='resource-contact-shadows';this.shadows.count=0;this.shadows.frustumCulled=false;this.shadows.renderOrder=1;this.shadows.raycast=()=>{};scene.add(this.shadows);}
 }
 private grow(form:AnyForm,needed:number){const b=this.batches.get(form)!;if(needed<=b.capacity)return;const capacity=Math.max(needed,b.capacity*2);
  for(const part of ['trunk','canopy'] as const){const old=b[part],mesh=new THREE.InstancedMesh(old.geometry,old.material,capacity);mesh.name=old.name;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.instanceMatrix.array.set(old.instanceMatrix.array);
   if(old.instanceColor){mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);mesh.instanceColor.array.set(old.instanceColor.array);}
   this.scene.remove(old);old.dispose();this.scene.add(mesh);b[part]=mesh;}
  b.capacity=capacity;
 }
 private growFar(index:number,needed:number){const old=this.far[index];if(needed<=old.instanceMatrix.count)return;const mesh=new THREE.InstancedMesh(old.geometry,old.material,Math.max(needed,old.instanceMatrix.count*2));mesh.name=old.name;mesh.frustumCulled=false;mesh.instanceMatrix.array.set(old.instanceMatrix.array);
  if(old.instanceColor){mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count*3),3);mesh.instanceColor.array.set(old.instanceColor.array);}
  this.scene.remove(old);old.dispose();this.scene.add(mesh);this.far[index]=mesh;}
 /** Painterly-only: hue wander per tree plus a few species variants so a forest never reads as one clone. */
 private tint(c:THREE.Color,id:number,form:AnyForm){const u=stableUnit(id+5,this.seed),v=stableUnit(id+29,this.seed);const hsl={h:0,s:0,l:0};c.getHSL(hsl);c.setHSL(hsl.h+(u-.5)*.05,Math.min(1,hsl.s*(.88+v*.28)),hsl.l*(.9+stableUnit(id+53,this.seed)*.2));void form;}
 private variant(base:TreeForm,kind:VegetationBiome,id:number):AnyForm{const u=stableUnit(id+313,this.seed);if(base==='broadleaf'&&(kind==='mixed-woodland'||kind==='meadow'||kind==='alpine'))return u<(kind==='mixed-woodland'?.34:.16)?'birch':base;if(base==='acacia'&&u<.4)return 'cypress';if(base==='conifer'&&kind==='mixed-woodland'&&u<.1)return 'cypress';return base;}
 setTime(t:number){if(this.sway)this.sway.uTime.value=t;}
 /** Painterly tree shadows are soft ground blobs stretched away from the sun (the real shadow map is off by default). */
 setSun(dir:THREE.Vector3,strength:number,realShadows=false){const h=Math.max(.12,dir.y);this.sunElev=h;this.sunAz.set(-dir.x,-dir.z).normalize();this.shadowOpacity=(realShadows?.12:.36)*Math.max(0,Math.min(1,strength));if(this.shadowMat)this.shadowMat.opacity=this.shadowOpacity;}
 private blob(node:ResourceTree,s:number,form:AnyForm,i:number){const m=this.shadows!;if(i>=m.instanceMatrix.count){const old=m,mesh=new THREE.InstancedMesh(old.geometry,old.material,old.instanceMatrix.count*2);mesh.name=old.name;mesh.frustumCulled=false;mesh.renderOrder=1;mesh.raycast=()=>{};this.scene.remove(old);old.dispose();this.scene.add(mesh);this.shadows=mesh;}
  const r=TREE_SHADOW_RADIUS[form]*s,len=1+Math.min(2.4,.9/this.sunElev),angle=Math.atan2(this.sunAz.x,this.sunAz.y),off=r*(len-1)*.7;
  this.pos.set(node.x+this.sunAz.x*off,node.y+.22,node.z+this.sunAz.y*off);this.euler.set(0,angle,0);this.rotation.setFromEuler(this.euler);this.scale.set(r,1,r*len);this.matrix.compose(this.pos,this.rotation,this.scale);this.shadows!.setMatrixAt(i,this.matrix);return i+1;}
 setWind(strength:number){if(this.sway)this.sway.uWind.value=strength;}
 resourceId(form:AnyForm,part:Part,index:number){return this.batches.get(form)?.ids[part][index];}
 farResourceId(style:0|1,index:number){return this.farIds[style][index];}
 pickingSources(){
  const sources:{mesh:THREE.InstancedMesh;resourceIds:readonly number[]}[]=[];
  for(const b of this.batches.values())for(const part of ['trunk','canopy'] as const)sources.push({mesh:b[part],resourceIds:b.ids[part]});
  sources.push({mesh:this.farTrunk,resourceIds:this.farTrunkIds});
  for(let i=0;i<2;i++)sources.push({mesh:this.far[i],resourceIds:this.farIds[i]});return sources;
 }
 sync(nodes:readonly ResourceTree[],context:VegetationContext){
  const counts=new Map<AnyForm,{trunk:number;canopy:number}>();for(const form of this.forms){counts.set(form,{trunk:0,canopy:0});const b=this.batches.get(form)!;b.ids.trunk.length=b.ids.canopy.length=0;}
  let farTrunks=0,blobs=0;this.farTrunkIds.length=0;
  const farCounts=[0,0];this.farIds[0].length=this.farIds[1].length=0;
  const near=BIOME_VEGETATION_RULES.nearMetres[context.quality];
  for(const node of nodes){
   if(!context.known(node.x,node.z))continue;
   const distance=Math.hypot(node.x-context.camera.x,node.z-context.camera.z);if(distance>(context.quality==='low'?BIOME_VEGETATION_RULES.lowFarMetres:BIOME_VEGETATION_RULES.farMetres))continue;
   let form=this.cache.get(node.id);if(!form){const profile=this.profileAt(node.x,node.z),base=resourceTreeForm(node.id,profile,this.seed);form=this.style==='painterly'?this.variant(base,profile.kind,node.id):base;this.cache.set(node.id,form);}
   const stump=node.amount<=0&&!node.planted,growth=node.planted?.18+.6*Math.max(0,1-node.regenT/120):1,s=node.scale*growth;
   const deciduous=form==='broadleaf'||form==='willow'||form==='birch',bare=deciduous&&context.winter>.8&&context.snow<.4;
   this.color.set(this.style==='painterly'?painterLeafColors[form]:leafColors[form as TreeForm]);
   if(this.style==='painterly')this.tint(this.color,node.id,form);
   if(deciduous&&context.autumn>.1){if(this.style==='painterly')this.color.lerp(AUTUMN_LEAVES[Math.floor(stableUnit(node.id+91,this.seed)*AUTUMN_LEAVES.length*.999)],Math.min(.94,context.autumn*(.75+.25*stableUnit(node.id+7,this.seed))));else this.color.lerp(this.autumnColors[form==='birch'?'willow':form as 'broadleaf'|'willow'],Math.min(.8,context.autumn));}
   if(context.snow>.2)this.color.lerp(this.snowColor,context.snow*.8);
   this.color.multiplyScalar(this.style==='painterly'?.86+stableUnit(node.id+17,this.seed)*.26:.90+stableUnit(node.id+17,this.seed)*.16);
   if(context.marked?.(node.id))this.color.set('#c58e43');
   this.euler.set(0,stableUnit(node.id,this.seed)*Math.PI*2,0);this.rotation.setFromEuler(this.euler);
   if(this.shadows&&!stump&&distance<=near*2.2){blobs=this.blob(node,s,form,blobs);this.euler.set(0,stableUnit(node.id,this.seed)*Math.PI*2,0);this.rotation.setFromEuler(this.euler);}
   if(distance<=near){
    const count=counts.get(form)!;this.grow(form,Math.max(count.trunk,count.canopy)+1);const b=this.batches.get(form)!;
    this.pos.set(node.x,node.y,node.z);this.scale.set(s*(stump?.65:1),s*(stump?BIOME_VEGETATION_RULES.stumpHeightScale:1),s*(stump?.65:1));this.matrix.compose(this.pos,this.rotation,this.scale);b.trunk.setMatrixAt(count.trunk++,this.matrix);b.ids.trunk.push(node.id);
    if(!stump&&!bare){this.scale.setScalar(s);this.matrix.compose(this.pos,this.rotation,this.scale);b.canopy.setMatrixAt(count.canopy,this.matrix);b.canopy.setColorAt(count.canopy++,this.color);b.ids.canopy.push(node.id);}
   }else if(!stump){
    if(farTrunks>=this.farTrunk.instanceMatrix.count){const old=this.farTrunk,mesh=new THREE.InstancedMesh(old.geometry,old.material,old.instanceMatrix.count*2);mesh.name=old.name;mesh.frustumCulled=false;mesh.instanceMatrix.array.set(old.instanceMatrix.array);this.scene.remove(old);old.dispose();this.scene.add(mesh);this.farTrunk=mesh;}
    const bounds=this.batches.get(form)!;
    this.pos.set(node.x,node.y,node.z);this.scale.set((this.style==='painterly'?.2:.14)*s,Math.max(.6,bounds.crownCenter.y)*s,(this.style==='painterly'?.2:.14)*s);this.matrix.compose(this.pos,this.rotation,this.scale);this.farTrunk.setMatrixAt(farTrunks++,this.matrix);this.farTrunkIds.push(node.id);
    if(bare)continue;
    const style=form==='conifer'||form==='stunted'||form==='cypress'?1:0,i=farCounts[style]++;this.growFar(style,i+1);const mesh=this.far[style];
    this.pos.copy(bounds.crownCenter).applyQuaternion(this.rotation).multiplyScalar(s);this.pos.x+=node.x;this.pos.y+=node.y;this.pos.z+=node.z;
    this.scale.copy(bounds.crownHalf).multiplyScalar(s);this.matrix.compose(this.pos,this.rotation,this.scale);mesh.setMatrixAt(i,this.matrix);mesh.setColorAt(i,this.color);this.farIds[style].push(node.id);
   }
  }
  for(const form of this.forms){const b=this.batches.get(form)!,count=counts.get(form)!;for(const part of ['trunk','canopy'] as const){const mesh=b[part];mesh.count=count[part];mesh.castShadow=context.quality!=='low';mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}}
  if(this.shadows){this.shadows.count=blobs;this.shadows.instanceMatrix.needsUpdate=true;}
  this.farTrunk.count=farTrunks;this.farTrunk.instanceMatrix.needsUpdate=true;
  for(let i=0;i<2;i++){const mesh=this.far[i];mesh.count=farCounts[i];mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  return {nearTrees:[...counts.values()].reduce((n,c)=>n+c.trunk,0),nearCanopies:[...counts.values()].reduce((n,c)=>n+c.canopy,0),farCanopies:farCounts[0]+farCounts[1],resourceCount:nodes.length};
 }
 dispose(){for(const batch of this.batches.values())for(const part of ['trunk','canopy'] as const){const mesh=batch[part];this.scene.remove(mesh);mesh.geometry.dispose();mesh.dispose();}for(const mesh of this.far){this.scene.remove(mesh);mesh.geometry.dispose();mesh.dispose();}this.scene.remove(this.farTrunk);this.farTrunk.geometry.dispose();this.farTrunk.dispose();this.bark.dispose();this.leaves.dispose();this.farMaterial.dispose();if(this.shadows){this.scene.remove(this.shadows);this.shadows.geometry.dispose();this.shadows.dispose();this.shadowMat?.map?.dispose();this.shadowMat?.alphaMap?.dispose();this.shadowMat?.dispose();}this.cache.clear();}
}
export type DressingPoint={x:number;y:number;z:number;kind:DressingForm|PainterDressing;scale?:number;/** painterly: 0 wet/lush .. 1 dry/straw */tone?:number;/** painterly: stable 0..1 hue pick (flower colour, tuft variety) */hue?:number;/** painterly: rock colour multiplier from the local geology (rocks, pebbles) */rockTint?:readonly [number,number,number];/** scree boulder: allowed on steep ground (the caller already checked water and buildings) */steep?:boolean};
const DRESSING_BLOOMS=['#f4d54a','#f7f3e8','#b98ad8','#e98a6a','#f1a7c4'];
/** Tiny nonblocking dressing: no ResourceNode, navigation obstacle, free product
 * or clickable harvest target. Caller supplies actual dry-ground eligibility.
 * 'painterly' adds tufts, tall grass, coloured flower heads, ferns, shrubs, outcrops and logs, wind-swayed on the GPU. */
export class BiomeDressing {
 private scene:THREE.Scene;private batches=new Map<string,THREE.InstancedMesh>();private matrix=new THREE.Matrix4();private pos=new THREE.Vector3();private scale=new THREE.Vector3();private rotation=new THREE.Quaternion();private euler=new THREE.Euler();private color=new THREE.Color();private style:VegetationStyle;private sway:PainterSway|null=null;private shadows:THREE.InstancedMesh|null=null;private shadowMat:THREE.MeshBasicMaterial|null=null;private sunAz=new THREE.Vector2(-.6,.8);private sunElev=.8;private shadowOpacity=.34;private materials:THREE.Material[]=[];
 constructor(scene:THREE.Scene,style:VegetationStyle='classic'){this.scene=scene;this.style=style;
  if(style==='painterly'){
   this.sway=painterSway();const grass=makePainterGrass(this.sway),still=makePainterGrass(this.sway,false),prop=makePainterProp();this.materials.push(grass,still,prop);
   const kinds:[string,THREE.BufferGeometry,THREE.Material][]=[['grass',painterDressing('grass'),grass],['tallgrass',painterDressing('tallgrass'),grass],['flowers',painterDressing('flowers'),grass],['bloom',painterDressing('bloom'),grass],['fern',painterDressing('fern'),grass],['reeds',painterDressing('reeds'),grass],['scrub',painterDressing('scrub'),still],['shrub',painterDressing('shrub'),still],['pebbles',painterDressing('pebbles'),prop],['rocks',painterDressing('rocks'),prop],['log',painterDressing('log'),prop],['cattail',painterDressing('cattail'),grass],['agave',painterDressing('agave'),still],['drygrass',painterDressing('drygrass'),grass],['cushion',painterDressing('cushion'),still]];
   for(const [kind,geo,mat] of kinds)this.add(kind,geo,mat);return;
  }
  const colors:Record<DressingForm,string>={grass:'#7e8c58',flowers:'#c9b989',reeds:'#8d8a53',scrub:'#858367',pebbles:'#89877a'};
  for(const kind of ['grass','flowers','reeds','scrub','pebbles'] as const)this.add(kind,dressingKit(kind),new THREE.MeshStandardMaterial({color:colors[kind],roughness:1,side:THREE.DoubleSide}));}
 private add(kind:string,geo:THREE.BufferGeometry,mat:THREE.Material){const mesh=new THREE.InstancedMesh(geo,mat,BIOME_VEGETATION_RULES.dressingMaxInstances.high);mesh.name=`nonblocking-${kind}`;mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.raycast=()=>{};this.scene.add(mesh);this.batches.set(kind,mesh);if(this.style==='painterly')mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(BIOME_VEGETATION_RULES.dressingMaxInstances.high*3).fill(1),3);}
 setTime(t:number){if(this.sway)this.sway.uTime.value=t;}
 private tone(point:DressingPoint,context:Partial<Pick<VegetationContext,'winter'|'autumn'|'snow'>>|undefined,kind:string){
  const c=this.color,dry=point.tone??.3,hue=point.hue??.5;
  if(kind==='rocks'||kind==='pebbles'||kind==='log'){const t=point.rockTint&&kind!=='log'?point.rockTint:null,v=.9+hue*.2;if(t)c.setRGB(t[0]*v,t[1]*v,t[2]*v);else c.setRGB(.9+hue*.2,.9+hue*.15,.88+hue*.1);return c;}
  c.setRGB(.9+hue*.2,.95+(1-hue)*.08,.8+hue*.15);c.lerp(new THREE.Color(1.15,.95,.62),Math.min(1,dry*.8));
  const winter=context?.winter??0,autumn=context?.autumn??0,snow=context?.snow??0;
  if(autumn>.05)c.lerp(new THREE.Color(1.1,.86,.5),Math.min(.7,autumn*.6));
  if(winter>.05)c.lerp(new THREE.Color(.82,.76,.62),Math.min(.8,winter*.7));
  if(snow>.15)c.lerp(new THREE.Color(1.5,1.55,1.6),Math.min(.85,snow));
  return c;
 }
 sync(points:readonly DressingPoint[],context:Pick<VegetationContext,'quality'|'camera'|'known'>&Partial<Pick<VegetationContext,'winter'|'autumn'|'snow'>>,isDry:(x:number,z:number)=>boolean){
  const cap=BIOME_VEGETATION_RULES.dressingMaxInstances[context.quality],counts=new Map<string,number>();let total=0;
  const painterly=this.style==='painterly',off=(context.winter??0)>.5||(context.snow??0)>.3;
  for(const point of points){if(total>=cap)break;if(!context.known(point.x,point.z)||!point.steep&&!isDry(point.x,point.z)||Math.hypot(point.x-context.camera.x,point.z-context.camera.z)>BIOME_VEGETATION_RULES.dressingDistanceMetres)continue;
   const rock=point.kind==='rocks'||point.kind==='log'||point.kind==='pebbles',fade=Math.max(0,Math.min(1,(BIOME_VEGETATION_RULES.dressingDistanceMetres-Math.hypot(point.x-context.camera.x,point.z-context.camera.z))/18));
   const kinds=painterly&&point.kind==='flowers'?['flowers','bloom']:[point.kind as string];
   for(const kind of kinds){const mesh=this.batches.get(kind);if(!mesh)continue;
    const index=counts.get(kind)??0;if(index>=BIOME_VEGETATION_RULES.dressingMaxInstances.high)continue;
    const bloomHidden=kind==='bloom'&&(off||(context.autumn??0)>.55);
    const base=Math.max(.1,Math.min(point.kind==='rocks'?2.6:1.3,point.scale??1))*(painterly&&!rock?.55+.45*fade:1);
    this.pos.set(point.x,point.y,point.z);this.scale.setScalar(bloomHidden?.0001:base*(painterly?(point.kind==='rocks'?.9:point.kind==='grass'||point.kind==='tallgrass'||kind==='bloom'||point.kind==='flowers'?1.3:1):1));
    if(painterly){this.euler.set(0,((point.hue??.5)*97.3)%1*Math.PI*2,0);this.rotation.setFromEuler(this.euler);}
    this.matrix.compose(this.pos,this.rotation,this.scale);mesh.setMatrixAt(index,this.matrix);
    if(painterly){const c=kind==='bloom'?this.color.set(DRESSING_BLOOMS[Math.floor((point.hue??.5)*DRESSING_BLOOMS.length*.999)%DRESSING_BLOOMS.length]):this.tone(point,context,kind);mesh.setColorAt(index,c);}
    counts.set(kind,index+1);}
   total++;
  }
  for(const [kind,mesh]of this.batches){mesh.count=counts.get(kind)??0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}return total;
 }
 dispose(){for(const mesh of this.batches.values()){this.scene.remove(mesh);mesh.geometry.dispose();if(!this.materials.length)(mesh.material as THREE.Material).dispose();mesh.dispose();}for(const m of this.materials)m.dispose();this.materials.length=0;this.batches.clear();}
}
