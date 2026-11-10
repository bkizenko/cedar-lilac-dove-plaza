import{GARMENT_KINDS,type GarmentKind}from'../game/textiles';
import * as THREE from 'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import type{Game}from'../game/sim';import type{Unit,UnitType}from'../game/types';
export const WORN_GARMENT_RULES=Object.freeze({instancesPerKind:2048,minimumCondition:0,skinColor:'#a88b61',leatherColor:'#70462f',skinRoughness:1,leatherRoughness:.82,wornBrightness:.64});
type Kind=GarmentKind;
type Batch={mesh:THREE.InstancedMesh;owners:Unit[];count:number};
function paint(g:THREE.BufferGeometry,color:string){const c=new THREE.Color(color),colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(colors,3));return g;}
function box(w:number,h:number,d:number,x:number,y:number,z:number,color:string){const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y+h/2,z);return paint(g,color);}
function shell(rt:number,rb:number,h:number,y:number,color:string,backOnly=false){const g=new THREE.CylinderGeometry(rt,rb,h,10,1,true,backOnly?Math.PI/2:0,backOnly?Math.PI:Math.PI*2);g.scale(1.08,1,.90);g.translate(0,y+h/2,0);return paint(g,color);}
function ring(radius:number,tube:number,y:number,color:string){const g=new THREE.TorusGeometry(radius,tube,3,12);g.rotateX(Math.PI/2);g.scale(1.08,1,.90);g.translate(0,y,0);return paint(g,color);}
function joinGarment(parts:THREE.BufferGeometry[]){
 const plain=parts.map(g=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();return n;});
 const joined=mergeGeometries(plain)!;
 plain.forEach(g=>g.dispose());
 joined.computeBoundingBox();
 joined.computeBoundingSphere();
 return joined;
}
export function wornGarmentGeometry(kind:Kind){
 if(kind==='lightClothes'){
  const parts=[shell(.19,.255,.52,.30,'#d6c4a0'),ring(.185,.012,.82,'#ebddbd'),shell(.22,.22,.035,.48,'#79664b')];
  for(const x of[-.24,.24])parts.push(box(.16,.14,.23,x-.08,.70,-.11,'#c4b28f'));
  for(const x of[-.13,0,.13])parts.push(box(.012,.38,.014,x,.32,.224,'#ead9b6'));
  return joinGarment(parts);
 }
 if(kind==='hideCoat'){
  const parts=[shell(.223,.26,.64,.24,'#654735'),ring(.199,.032,.849,'#e1c697'),
   shell(.253,.253,.06,.25,'#d1b28a'),shell(.236,.236,.044,.48,'#35271f'),
   box(.028,.51,.018,-.014,.29,.231,'#ddbb8c')];
  for(const x of[-.277,.147]){
   parts.push(box(.13,.29,.24,x,.48,-.12,'#76513b'));
   parts.push(box(.134,.051,.244,x-.002,.48,-.122,'#d1b28a'));
  }
  return joinGarment(parts);
 }
 const skin=kind==='skinClothes',base=skin?WORN_GARMENT_RULES.skinColor:WORN_GARMENT_RULES.leatherColor,parts:THREE.BufferGeometry[]=[];
 parts.push(shell(skin?.19:.185,skin?.245:.205,skin?.57:.50,skin?.30:.34,base));
 for(const x of[-.10,.10]){const leg=new THREE.CylinderGeometry(.067,.061,.32,6);leg.translate(x,.26,.04);parts.push(paint(leg,skin?'#806a4c':'#523a2d'));}
 if(skin){parts.push(shell(.215,.27,.48,.31,'#c2a675',true),ring(.185,.028,.865,'#ddc99c'));for(let i=0;i<10;i++){const a=i*Math.PI/5,g=new THREE.ConeGeometry(.038,.085,3);g.rotateZ(Math.PI);g.translate(Math.sin(a)*.245,.282,Math.cos(a)*.22);parts.push(paint(g,'#c6ac7a'));}}
 else{parts.push(ring(.19,.013,.845,'#aa835b'),shell(.211,.211,.045,.48,'#342b24'),box(.012,.43,.015,0,.36,.184,'#c4a77b'));for(const y of[.57,.63,.69,.75])parts.push(box(.065,.012,.017,0,y,.19,'#b29365'));}
 return joinGarment(parts);
}
/** Fit the existing rider/leader/fighter body; motion itself comes from its
 * already-computed instance matrix, never a second animation approximation. */
export function wornGarmentFit(type:UnitType,target:THREE.Matrix4){
 target.identity();if(type==='cavalry'){target.makeScale(1,.72,1);target.setPosition(0,.68,0);}else if(type==='leader')target.makeScale(1.65,1,1.65);else if(type==='swordsman')target.makeScale(1.25,1,1.25);return target;
}
export class WornGarmentLayer{
 private scene:THREE.Scene;private batches=new Map<Kind,Batch>();private picking=new Map<THREE.InstancedMesh,Unit[]>();private fit=new THREE.Matrix4();private matrix=new THREE.Matrix4();private color=new THREE.Color();private disposed=false;
 constructor(scene:THREE.Scene){this.scene=scene;for(const kind of GARMENT_KINDS){const geometry=wornGarmentGeometry(kind),material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:kind==='skinClothes'||kind==='hideCoat'?WORN_GARMENT_RULES.skinRoughness:WORN_GARMENT_RULES.leatherRoughness,metalness:0,side:THREE.DoubleSide}),mesh=new THREE.InstancedMesh(geometry,material,WORN_GARMENT_RULES.instancesPerKind),owners:Unit[]=[];mesh.name=`worn-${kind}`;mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(WORN_GARMENT_RULES.instancesPerKind*3),3);mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);this.batches.set(kind,{mesh,owners,count:0});this.picking.set(mesh,owners);}}
 beginFrame(quality:'low'|'med'|'high',shadows=false){for(const batch of this.batches.values()){batch.count=0;batch.owners.length=0;batch.mesh.castShadow=shadows&&quality!=='low';}}
 write(g:Pick<Game,'visibleAt'>,u:Unit,bodyMatrix:THREE.Matrix4){
  const garment=u.garment;if(this.disposed||u.hp<=0||u.shelterId||!garment||!(garment.condition>WORN_GARMENT_RULES.minimumCondition)||u.team!==0&&!g.visibleAt(u.x,u.z))return false;
  const batch=this.batches.get(garment.item);if(!batch||batch.count>=WORN_GARMENT_RULES.instancesPerKind)return false;
  wornGarmentFit(u.type,this.fit);this.matrix.copy(bodyMatrix).multiply(this.fit);batch.mesh.setMatrixAt(batch.count,this.matrix);this.color.setScalar(WORN_GARMENT_RULES.wornBrightness+(1-WORN_GARMENT_RULES.wornBrightness)*Math.min(1,garment.condition));batch.mesh.setColorAt(batch.count,this.color);batch.owners.push(u);batch.count++;return true;
 }
 endFrame(){for(const batch of this.batches.values()){batch.mesh.count=batch.count;batch.mesh.visible=batch.count>0;if(batch.count){batch.mesh.instanceMatrix.needsUpdate=true;if(batch.mesh.instanceColor)batch.mesh.instanceColor.needsUpdate=true;}}}
 sources(){return this.picking;}
 dispose(){if(this.disposed)return;this.disposed=true;for(const {mesh}of this.batches.values()){this.scene.remove(mesh);mesh.dispose();mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}this.batches.clear();this.picking.clear();}
}
