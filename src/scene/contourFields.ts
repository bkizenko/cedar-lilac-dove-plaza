import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {surveyFieldTopography} from '../game/plotTopography';
import type {FieldSurface} from './fieldSurface';
import {painterCropGeometry,painterCropColor,painterCropScale} from './painterCrops';
import {addPainterSway,painterSway} from './painterVegetationMaterial';
export type FieldCrop='grain'|'pulses'|'tubers';
export const CROP_ART_RULES={maxPlantInstances:8192,maximumPlantsPerField:512,edgeMarginMetres:.45,maxDistanceMetres:320,
 rows:{grain:{rowMetres:.95,plantMetres:.82},pulses:{rowMetres:1.3,plantMetres:1.15},tubers:{rowMetres:1.45,plantMetres:1.3}}} as const;
export type RenderField={id:number;type:string;x:number;z:number;w:number;d:number;hp:number;team:number;build:number;plannedCost?:unknown;cropType?:FieldCrop;fallowYear?:number;crop?:{kind?:FieldCrop;planted:number;tended:number;ripened:boolean;remaining:number}};
type FieldGround={world:{heights:Float32Array};state:{time:number;buildings:RenderField[]};height:(x:number,z:number)=>number;waterAt:(x:number,z:number)=>number;exploredAt:(x:number,z:number)=>boolean;navigationRevision?:()=>number};
export function fieldCropKind(field:RenderField):FieldCrop{return field.crop?.kind??field.cropType??'grain';}
export function fieldCropGrowth(field:RenderField){const c=field.crop;return c?.ripened?(c.remaining>0?1:.04):.04+.75*(c?.planted||0)+.2*(c?.tended||0);}
/** Rows use the measured contour tangent. Only interior plant roots rotate;
 * rectangle boundary and the heightfield never rotate or flatten. */
export function contourPlantSites(plot:{x:number;z:number;w:number;d:number},angle:number,kind:FieldCrop){
 const {rowMetres,plantMetres}=CROP_ART_RULES.rows[kind],margin=CROP_ART_RULES.edgeMarginMetres,halfW=Math.max(0,plot.w/2-margin),halfD=Math.max(0,plot.d/2-margin),ux=Math.cos(angle),uz=Math.sin(angle),nx=-uz,nz=ux;
 // Thin both axes, then sample the complete rectangle. Never stop at the first
 // 512 plants: that erased the far half of large fields.
 const density=Math.max(1,Math.sqrt(4*halfW*halfD/(rowMetres*plantMetres*CROP_ART_RULES.maximumPlantsPerField)));
 const rowSpacing=rowMetres*density,plantSpacing=plantMetres*density;
 const across=Math.abs(nx)*halfW+Math.abs(nz)*halfD,points:{x:number;z:number}[]=[];
 for(let row=Math.ceil(-across/rowSpacing);row<=Math.floor(across/rowSpacing);row++){
  const v=row*rowSpacing;let lo=-Infinity,hi=Infinity;
  for(const [axis,normal,bound]of [[ux,nx,halfW],[uz,nz,halfD]]){
   if(Math.abs(axis)<1e-8){if(Math.abs(normal*v)>bound){lo=1;hi=0;break;}continue;}
   const a=(-bound-normal*v)/axis,b=(bound-normal*v)/axis;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));
  }
  for(let col=Math.ceil(lo/plantSpacing);col<=Math.floor(hi/plantSpacing);col++){
   const u=col*plantSpacing;
   points.push({x:plot.x+ux*u+nx*v,z:plot.z+uz*u+nz*v});
  }
 }
 return points.length<=CROP_ART_RULES.maximumPlantsPerField?points:Array.from({length:CROP_ART_RULES.maximumPlantsPerField},(_,i)=>points[Math.floor((i+.5)*points.length/CROP_ART_RULES.maximumPlantsPerField)]);
}
function colored(g:THREE.BufferGeometry,color:string){const c=new THREE.Color(color),data=new Float32Array(g.attributes.position.count*3);for(let i=0;i<data.length;i+=3)data.set([c.r,c.g,c.b],i);g.setAttribute('color',new THREE.BufferAttribute(data,3));return g;}
function stem(x:number,y:number,z:number,r:number,height:number,color:string){const g=new THREE.CylinderGeometry(r,r*.9,height,4);g.translate(x,y+height*.5,z);return colored(g,color);}
function leaf(x:number,y:number,z:number,length:number,width:number,angle:number,color:string){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,length*.5,.07,width*.5,length,.025,0,length*.5,.07,-width*.5],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,.5,.5,1,1,.5,.5,0],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();g.rotateY(angle);g.translate(x,y,z);return colored(g,color);
}
export function cropPlantGeometry(kind:FieldCrop){
 const parts:THREE.BufferGeometry[]=[];
 if(kind==='grain')for(let i=0;i<3;i++){
  const x=(i-1)*.1,z=(i%2)*.08,h=.67+i*.07;parts.push(stem(x,.04,z,.016,h,'#92a86a'));
  const ear=new THREE.CylinderGeometry(.038,.055,.21,5);ear.translate(x,h+.11,z);parts.push(colored(ear,'#d0be7a'));
  parts.push(leaf(x,.3,z,.23,.05,i*2.1,'#6c984b'));
 }else if(kind==='pulses'){
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3,x=Math.cos(a)*.14,z=Math.sin(a)*.14;parts.push(stem(x,.04,z,.025,.42,'#668647'));
   for(let j=0;j<2;j++)parts.push(leaf(x,.21+j*.13,z,.25,.17,a+j*1.1,'#729a4d'));
   const pod=new THREE.CapsuleGeometry(.04,.15,2,4);pod.rotateZ(.35);pod.translate(x+.08,.34,z);parts.push(colored(pod,'#adc26b'));
  }
 }else{
  const mound=new THREE.IcosahedronGeometry(.19,0);mound.scale(1,.32,1);mound.translate(0,.055,0);parts.push(colored(mound,'#775b39'));
  for(let i=0;i<6;i++){const a=i*Math.PI/3;parts.push(leaf(0,.12,0,.32,.2,a,'#4d8544'));}
 }
 const flattened=parts.map(g=>{if(!g.index)return g;const n=g.toNonIndexed();g.dispose();return n;}),geo=mergeGeometries(flattened,false);for(const g of flattened)g.dispose();if(!geo)throw new Error('Crop geometry attributes differ');geo.computeBoundingBox();geo.computeBoundingSphere();return geo;
}
export class ContourFields {
 private style:'classic'|'painterly';private scene:THREE.Scene;private surface:FieldSurface;private meshes=new Map<FieldCrop,THREE.InstancedMesh>();
 private cache=new WeakMap<RenderField,{key:string;heights:Float32Array;revision:number;angle:number;sites:{x:number;z:number}[]}>();
 private position=new THREE.Vector3();private scale=new THREE.Vector3();private rotation=new THREE.Quaternion();private matrix=new THREE.Matrix4();private color=new THREE.Color();private up=new THREE.Vector3(0,1,0);private lastSurfaceRevision=-1;
 constructor(scene:THREE.Scene,surface:FieldSurface,style:'classic'|'painterly'='classic'){this.scene=scene;this.surface=surface;this.style=style;
  for(const kind of ['grain','pulses','tubers'] as const){const mat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.9,side:THREE.DoubleSide});surface.bind(mat);if(style==='painterly')addPainterSway(mat,painterSway(),`crop-${kind}`,.12);
   const mesh=new THREE.InstancedMesh(style==='painterly'?painterCropGeometry(kind):cropPlantGeometry(kind),mat,CROP_ART_RULES.maxPlantInstances);mesh.customDepthMaterial=surface.depth;mesh.name=`contour-crop-${kind}`;mesh.count=0;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.raycast=()=>{};scene.add(mesh);this.meshes.set(kind,mesh);}
 }
 orientation(ground:FieldGround,field:RenderField){
  const kind=fieldCropKind(field),key=`${field.x}/${field.z}/${field.w}/${field.d}/${kind}`,revision=ground.navigationRevision?.()??0,old=this.cache.get(field);
  if(old?.key===key&&old.heights===ground.world.heights&&old.revision===revision)return old;
  const survey=surveyFieldTopography(ground,field),angle=survey.contourAngleRadians,sites=contourPlantSites(field,angle,kind),result={key,heights:ground.world.heights,revision,angle,sites};this.cache.set(field,result);return result;
 }
 rows(ground:FieldGround,field:RenderField){const angle=this.orientation(ground,field).angle,nx=-Math.sin(angle),nz=Math.cos(angle);return {nx,nz,offset:-field.x*nx-field.z*nz,spacing:CROP_ART_RULES.rows[fieldCropKind(field)].rowMetres};}
 sync(ground:FieldGround,camera:{x:number;z:number}){
  const counts={grain:0,pulses:0,tubers:0};let total=0;
  const fields=ground.state.buildings.filter(b=>b.type==='farm'&&b.hp>0&&b.build>=1&&!b.plannedCost&&(b.team===0||ground.exploredAt(b.x,b.z))&&b.fallowYear!==Math.floor(ground.state.time/1800)&&Math.hypot(b.x-camera.x,b.z-camera.z)<CROP_ART_RULES.maxDistanceMetres).sort((a,b)=>Math.hypot(a.x-camera.x,a.z-camera.z)-Math.hypot(b.x-camera.x,b.z-camera.z));
  for(const field of fields){const kind=fieldCropKind(field),mesh=this.meshes.get(kind)!,plan=this.orientation(ground,field),growth=fieldCropGrowth(field);
   this.rotation.setFromAxisAngle(this.up,-plan.angle);
   this.color.set(kind==='grain'?(field.crop?.ripened?'#e2c15a':'#a8c17c'):kind==='pulses'?(field.crop?.ripened?'#bac183':'#9aba86'):'#91b887');
   const painter=this.style==='painterly',ps=painterCropScale(growth);
   for(const site of plan.sites){if(total>=CROP_ART_RULES.maxPlantInstances)break;this.position.set(site.x,ground.height(site.x,site.z),site.z);if(painter)this.scale.set(ps.xz,ps.y,ps.xz);else this.scale.set(1,Math.max(.025,growth),1);this.matrix.compose(this.position,this.rotation,this.scale);mesh.setMatrixAt(counts[kind],this.matrix);
    if(painter){const j=Math.abs(Math.sin(site.x*12.9898+site.z*78.233)*43758.5453)%1;painterCropColor(kind,field.crop,growth,j,this.color);}
    mesh.setColorAt(counts[kind]++,this.color);total++;}
  }
  for(const [kind,mesh]of this.meshes){mesh.count=counts[kind];mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  const revision=ground.navigationRevision?.()??0;if(this.lastSurfaceRevision!==revision){this.surface.texture.needsUpdate=true;this.lastSurfaceRevision=revision;}return {plants:total,...counts};
 }
 dispose(){for(const mesh of this.meshes.values()){this.scene.remove(mesh);mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();mesh.dispose();}this.meshes.clear();}
}
