import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {surveyFieldTopography} from '../game/plotTopography';
import {terraceFrame,terraceHeightAt,fieldDownhill,type TerraceFrame} from '../game/terraceFarming';
import type {FieldSurface} from './fieldSurface';
import {painterCropGeometry,painterCropColor,painterCropScale,painterWeedGeometry,PAINTER_CROP_SEGMENT} from './painterCrops';
import {addPainterSway,painterSway} from './painterVegetationMaterial';
import {fieldNeighbourhood,EDGE,type FieldGroupInfo} from '../game/fieldSnap';
import {fieldEdgeDepth,fieldStage,STAGE_INDEX,boundaryKind,boundarySites,fieldSoilColour,fieldWeeds,fieldSeed,fieldDetailTier,hash01,calendarPhase,BOUNDARY_RULES,type BoundaryKind,type BoundarySite,type FieldStage} from '../game/fieldLook';
import {boundaryGeometry,BOUNDARY_COLOURS,BOUNDARY_CAPACITY,BOUNDARY_SCENE_BUDGET,BOUNDARY_LEN,type BoundaryMeshKind,type BoundaryDetail} from './fieldBoundaries';
import {geologyAt} from '../game/mapgen/geology/read';
import {ROCKS} from '../game/mapgen/geology/rocks';
export type FieldCrop='grain'|'pulses'|'tubers';
export const CROP_ART_RULES={maxPlantInstances:8192,maximumPlantsPerField:512,edgeMarginMetres:.45,maxDistanceMetres:320,
 rows:{grain:{rowMetres:.95,plantMetres:.82},pulses:{rowMetres:1.3,plantMetres:1.15},tubers:{rowMetres:1.45,plantMetres:1.3}}} as const;
/** `site.terrace` (terrain model v2): the field stands on level terrace strips, so crops sit on the treads, not on the hillside between them. */
export type RenderField={site?:{foundation?:string;terrace?:{k:string;n:number}};id:number;type:string;x:number;z:number;w:number;d:number;hp:number;team:number;build:number;plannedCost?:unknown;cropType?:FieldCrop;fallowYear?:number;fertility?:number;crop?:{kind?:FieldCrop;year?:number;water?:number;planted:number;tended:number;ripened:boolean;remaining:number}};
type FieldGround={world:{heights:Float32Array};state:{time:number;buildings:RenderField[]};height:(x:number,z:number)=>number;waterAt:(x:number,z:number)=>number;exploredAt:(x:number,z:number)=>boolean;navigationRevision?:()=>number};
export function fieldCropKind(field:RenderField):FieldCrop{return field.crop?.kind??field.cropType??'grain';}
export function fieldCropGrowth(field:RenderField){const c=field.crop;return c?.ripened?(c.remaining>0?1:.04):.04+.75*(c?.planted||0)+.2*(c?.tended||0);}
/** Rows use the measured contour tangent. Only interior plant roots rotate;
 * rectangle boundary and the heightfield never rotate or flatten. */
export function contourPlantSites(plot:{x:number;z:number;w:number;d:number},angle:number,kind:FieldCrop,origin?:{x:number;z:number}){
 const {rowMetres,plantMetres}=CROP_ART_RULES.rows[kind],margin=CROP_ART_RULES.edgeMarginMetres,halfW=Math.max(0,plot.w/2-margin),halfD=Math.max(0,plot.d/2-margin),ux=Math.cos(angle),uz=Math.sin(angle),nx=-uz,nz=ux;
 // Thin both axes, then sample the complete rectangle. Never stop at the first
 // 512 plants: that erased the far half of large fields.
 const density=Math.max(1,Math.sqrt(4*halfW*halfD/(rowMetres*plantMetres*CROP_ART_RULES.maximumPlantsPerField)));
 const rowSpacing=rowMetres*density,plantSpacing=plantMetres*density;
 const across=Math.abs(nx)*halfW+Math.abs(nz)*halfD,points:{x:number;z:number}[]=[];
 // Rows and plants sit on a lattice anchored at `origin` (the first plot of a merged group), so rows run straight across a shared seam. Default origin is the plot centre.
 const ov=origin?(plot.x-origin.x)*nx+(plot.z-origin.z)*nz:0,ou=origin?(plot.x-origin.x)*ux+(plot.z-origin.z)*uz:0;
 for(let row=Math.ceil((-across+ov)/rowSpacing);row<=Math.floor((across+ov)/rowSpacing);row++){
  const v=row*rowSpacing-ov;let lo=-Infinity,hi=Infinity;
  for(const [axis,normal,bound]of [[ux,nx,halfW],[uz,nz,halfD]]){
   if(Math.abs(axis)<1e-8){if(Math.abs(normal*v)>bound){lo=1;hi=0;break;}continue;}
   const a=(-bound-normal*v)/axis,b=(bound-normal*v)/axis;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));
  }
  for(let col=Math.ceil((lo+ou)/plantSpacing);col<=Math.floor((hi+ou)/plantSpacing);col++){
   const u=col*plantSpacing-ou;
   points.push({x:plot.x+ux*u+nx*v,z:plot.z+uz*u+nz*v});
  }
 }
 return points.length<=CROP_ART_RULES.maximumPlantsPerField?points:Array.from({length:CROP_ART_RULES.maximumPlantsPerField},(_,i)=>points[Math.floor((i+.5)*points.length/CROP_ART_RULES.maximumPlantsPerField)]);
}
/** Row and plant spacing contourPlantSites() actually uses for this plot (large plots thin both axes to stay under the per-field plant cap). */
export function contourPlantSpacing(plot:{w:number;d:number},kind:FieldCrop){
 const {rowMetres,plantMetres}=CROP_ART_RULES.rows[kind],margin=CROP_ART_RULES.edgeMarginMetres,halfW=Math.max(0,plot.w/2-margin),halfD=Math.max(0,plot.d/2-margin);
 const density=Math.max(1,Math.sqrt(4*halfW*halfD/(rowMetres*plantMetres*CROP_ART_RULES.maximumPlantsPerField)));
 return{row:rowMetres*density,plant:plantMetres*density};
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
type Survey=ReturnType<typeof surveyFieldTopography>;
export type FieldStyleOf=(field:RenderField)=>{era:number;variant:number};
export interface FieldLookData{edges:[number,number,number,number];look:[number,number,number,number];soil:[number,number,number,number];stage:FieldStage}
type FieldInstances={serial:number;key:string;plan:unknown;n:number;mat:Float32Array;col:Float32Array};
type BoundaryItem={mesh:string;mat:Float32Array;col:[number,number,number]};
/** Seasonal multipliers (phase 0 spring .. 3 winter) on the instance colour of hedges, banks, wattle, gates and weeds. */
const SEASON_TINT:Record<'hedge'|'bank'|'wood'|'weed',[number,number,number][]>={hedge:[[1.05,1.12,.9],[1,1,1],[1.2,.98,.72],[.86,.8,.74]],bank:[[1.05,1.1,.95],[1,1,1],[1.05,.97,.85],[.9,.88,.82]],wood:[[1,1,1],[1,1,1],[1,.98,.95],[.93,.92,.9]],weed:[[1,1.05,.95],[1,1,1],[1.15,.95,.7],[.8,.74,.66]]};
const STONE_DEFAULT=new THREE.Color('#85807a');
/** Muted local-rock colour for a wall: the rock under the piece (geologyAt) with its saturation pulled down, never near-black or glaring white. */
function stoneColour(world:unknown,x:number,z:number,tint:number,out:THREE.Color){
 const g=geologyAt(world as never,x,z),rock=g&&g.rock>0?ROCKS[g.rock]:null;
 if(rock)out.setRGB(rock.color[0]/255,rock.color[1]/255,rock.color[2]/255,THREE.SRGBColorSpace);else out.copy(STONE_DEFAULT);
 const hsl={h:0,s:0,l:0};out.getHSL(hsl);out.setHSL(hsl.h,Math.min(.4,hsl.s*.55),Math.max(.3,Math.min(.68,hsl.l*(.86+.28*tint))));return out;
}
export class ContourFields {
 private style:'classic'|'painterly';private scene:THREE.Scene;private surface:FieldSurface;private meshes=new Map<FieldCrop,THREE.InstancedMesh>();
 private cache=new WeakMap<RenderField,{key:string;heights:Float32Array;revision:number;angle:number;origin:{x:number;z:number};grade:number;sites:{x:number;z:number}[]}>();
 private surveys=new WeakMap<RenderField,{key:string;heights:Float32Array;revision:number;survey:Survey}>();
 private terraces=new WeakMap<RenderField,{key:string;heights:Float32Array;revision:number;frame:TerraceFrame|null}>();
 /** Ground height for plants of a field: the level tread on a terraced field, the hillside otherwise. */
 private plantY(ground:FieldGround,field:RenderField,x:number,z:number){
  const t=field.site?.terrace;if(!t||t.k==='none'||field.site?.foundation!=='strips')return ground.height(x,z);
  const key=`${field.x}/${field.z}/${field.w}/${field.d}/${t.n}`,revision=ground.navigationRevision?.()??0;let old=this.terraces.get(field);
  if(!old||old.key!==key||old.heights!==ground.world.heights||old.revision!==revision){const h=(px:number,pz:number)=>ground.height(px,pz),plot={x:field.x,z:field.z,w:field.w,d:field.d};old={key,heights:ground.world.heights,revision,frame:terraceFrame(h,plot,t.n,fieldDownhill(h,plot))};this.terraces.set(field,old);}
  return terraceHeightAt((px,pz)=>ground.height(px,pz),{x:field.x,z:field.z,w:field.w,d:field.d},old.frame!,x,z)+.03;
 }
 /** Painterly only: boundary meshes by `${kind}:${variant|lo}`, weed tufts, and per-field instance caches (rebuilt only when the field, terrain, stage, season or detail tier changes). */
 private bounds=new Map<string,THREE.InstancedMesh>();private weedMesh?:THREE.InstancedMesh;
 private cropCache=new WeakMap<RenderField,FieldInstances>();private weedCache=new WeakMap<RenderField,FieldInstances>();private boundCache=new WeakMap<RenderField,{serial:number;key:string;plan:unknown;items:BoundaryItem[]}>();
 private tiers=new WeakMap<RenderField,number>();private serial=1;private lastSig='';private crossings:{at:number;pts:{x:number;z:number}[]}={at:-1e9,pts:[]};
 private hoodCache:{buildings:RenderField[];count:number;at:number;map:Map<number,FieldGroupInfo>;byId:Map<number,RenderField>}|null=null;
 private position=new THREE.Vector3();private scale=new THREE.Vector3();private rotation=new THREE.Quaternion();private matrix=new THREE.Matrix4();private color=new THREE.Color();private up=new THREE.Vector3(0,1,0);private lastSurfaceRevision=-1;
 private zAxis=new THREE.Vector3(0,0,1);private pitchQ=new THREE.Quaternion();
 constructor(scene:THREE.Scene,surface:FieldSurface,style:'classic'|'painterly'='classic'){this.scene=scene;this.surface=surface;this.style=style;
  const instanced=(geo:THREE.BufferGeometry,mat:THREE.Material,cap:number,name:string,shadow:boolean)=>{const mesh=new THREE.InstancedMesh(geo,mat,cap);mesh.customDepthMaterial=surface.depth;mesh.name=name;mesh.count=0;mesh.castShadow=shadow;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.raycast=()=>{};mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(cap*3),3);scene.add(mesh);return mesh;};
  for(const kind of ['grain','pulses','tubers'] as const){const mat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.9,side:THREE.DoubleSide});surface.bind(mat);if(style==='painterly')addPainterSway(mat,painterSway(),`crop-${kind}`,.2,6);
   const mesh=new THREE.InstancedMesh(style==='painterly'?painterCropGeometry(kind):cropPlantGeometry(kind),mat,CROP_ART_RULES.maxPlantInstances);mesh.customDepthMaterial=surface.depth;mesh.name=`contour-crop-${kind}`;mesh.count=0;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.raycast=()=>{};if(style==='painterly')mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(CROP_ART_RULES.maxPlantInstances*3),3);scene.add(mesh);this.meshes.set(kind,mesh);}
  if(style==='painterly'){
   const mats=new Map<BoundaryMeshKind,THREE.MeshStandardMaterial>();
   const matFor=(kind:BoundaryMeshKind)=>{let m=mats.get(kind);if(!m){m=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.96,metalness:0,side:kind==='bank'||kind==='hedge'?THREE.DoubleSide:THREE.FrontSide});surface.bind(m);mats.set(kind,m);}return m;};
   for(const kind of ['bank','wattle','hedge','stone'] as const){
    const details:BoundaryDetail[]=[...Array(BOUNDARY_RULES.variants[kind]).keys(),'lo'];
    for(const d of details)this.bounds.set(`${kind}:${d}`,instanced(boundaryGeometry(kind,d),matFor(kind),BOUNDARY_CAPACITY[kind],`field-boundary-${kind}-${d}`,(kind==='hedge'||kind==='stone')&&d!=='lo'));
   }
   this.bounds.set('gate:0',instanced(boundaryGeometry('gate',0),matFor('gate'),BOUNDARY_CAPACITY.gate,'field-boundary-gate',false));
   const wm=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.95,side:THREE.DoubleSide});surface.bind(wm);addPainterSway(wm,painterSway(),'weed',.14,5);
   this.weedMesh=instanced(painterWeedGeometry(),wm,3000,'field-weeds',false);
  }
 }
 /** Edge masks and row groups of every field, refreshed a few times a second (fields change rarely). */
 hood(ground:FieldGround){
  const now=typeof performance!=='undefined'?performance.now():0,b=ground.state.buildings,old=this.hoodCache;
  if(old&&old.buildings===b&&old.count===b.length&&now-old.at<400)return old;
  const map=fieldNeighbourhood(b as never),byId=new Map<number,RenderField>();for(const f of b)if(f.type==='farm')byId.set(f.id,f);
  return this.hoodCache={buildings:b,count:b.length,at:now,map,byId};
 }
 private survey(ground:FieldGround,field:RenderField){
  const key=`${field.x}/${field.z}/${field.w}/${field.d}`,revision=ground.navigationRevision?.()??0,old=this.surveys.get(field);
  if(old?.key===key&&old.heights===ground.world.heights&&old.revision===revision)return old.survey;
  const survey=surveyFieldTopography(ground,field);this.surveys.set(field,{key,heights:ground.world.heights,revision,survey});return survey;
 }
 orientation(ground:FieldGround,field:RenderField){
  const kind=fieldCropKind(field),hood=this.hood(ground),info=hood.map.get(field.id),anchor=info&&info.anchor!==field.id?(hood.byId.get(info.anchor)??field):field;
  const key=`${field.x}/${field.z}/${field.w}/${field.d}/${kind}/${anchor.x}/${anchor.z}/${anchor.w}/${anchor.d}/${info?.mask??0}`,revision=ground.navigationRevision?.()??0,old=this.cache.get(field);
  if(old?.key===key&&old.heights===ground.world.heights&&old.revision===revision)return old;
  const own=this.survey(ground,field),shared=anchor===field?own:this.survey(ground,anchor),angle=shared.contourAngleRadians,origin={x:anchor.x,z:anchor.z};
  const mask=info?.mask??0,all=contourPlantSites(field,angle,kind,anchor===field?undefined:origin),result={key,heights:ground.world.heights,revision,angle,origin,grade:Math.hypot(own.meanGradientX,own.meanGradientZ),
   // Plants stay inside the drawn (irregular) soil edge.
   sites:this.style==='painterly'?all.filter(p=>fieldEdgeDepth(field,mask,p.x,p.z)>=.5):all};this.cache.set(field,result);return result;
 }
 rows(ground:FieldGround,field:RenderField){const plan=this.orientation(ground,field),angle=plan.angle,nx=-Math.sin(angle),nz=Math.cos(angle);return {nx,nz,offset:-plan.origin.x*nx-plan.origin.z*nz,spacing:CROP_ART_RULES.rows[fieldCropKind(field)].rowMetres};}
 /** Per-plot shader inputs: merged edges, stage, water state (0 unknown, 1 dry, 2 irrigated), slope, tilled-soil colour, weeds. */
 look(ground:FieldGround,field:RenderField,water=0):FieldLookData{
  const info=this.hood(ground).map.get(field.id),m=info?.mask??0,stage=fieldStage(field as never,ground.state.time),plan=this.orientation(ground,field),
   moisture=field.crop?.water??1,soil=fieldSoilColour(field.fertility??1,moisture,field.id);
  return{edges:[m&EDGE.W?1:0,m&EDGE.E?1:0,m&EDGE.N?1:0,m&EDGE.S?1:0],look:[STAGE_INDEX[stage],water,fieldSeed(field.id),Math.min(1.2,plan.grade)],soil:[soil[0],soil[1],soil[2],fieldWeeds(stage,field.crop?.tended??0)],stage};
 }
/** `opts.quality` picks the draw-distance tiers (full detail, low-poly boundaries and thinned crops, then soil texture only) for the painterly style. */
 sync(ground:FieldGround,camera:{x:number;z:number;y?:number},styleOf?:FieldStyleOf,opts:{quality?:'low'|'med'|'high'}={}){
  if(this.style==='painterly')return this.syncPainter(ground,camera,styleOf,opts.quality??'med');
  const counts={grain:0,pulses:0,tubers:0};let total=0;const year=Math.floor(ground.state.time/1800);
  const visible=ground.state.buildings.filter(b=>b.type==='farm'&&b.hp>0&&b.build>=1&&!b.plannedCost&&(b.team===0||ground.exploredAt(b.x,b.z))&&Math.hypot(b.x-camera.x,b.z-camera.z)<CROP_ART_RULES.maxDistanceMetres).sort((a,b)=>Math.hypot(a.x-camera.x,a.z-camera.z)-Math.hypot(b.x-camera.x,b.z-camera.z));
  for(const field of visible){
   // Classic look keeps its old rule (a resting field draws nothing).
   const stage=field.fallowYear===year?'fallow':'growing';
   if(stage==='fallow')continue;
   const kind=fieldCropKind(field),mesh=this.meshes.get(kind)!,plan=this.orientation(ground,field);
   const growth=fieldCropGrowth(field);
   this.rotation.setFromAxisAngle(this.up,-plan.angle);
   this.color.set(kind==='grain'?(field.crop?.ripened?'#e2c15a':'#a8c17c'):kind==='pulses'?(field.crop?.ripened?'#bac183':'#9aba86'):'#91b887');
   for(const site of plan.sites){if(total>=CROP_ART_RULES.maxPlantInstances)break;this.position.set(site.x,this.plantY(ground,field,site.x,site.z),site.z);this.scale.set(1,Math.max(.025,growth),1);this.matrix.compose(this.position,this.rotation,this.scale);mesh.setMatrixAt(counts[kind],this.matrix);
    mesh.setColorAt(counts[kind]++,this.color);total++;}
  }
  for(const [kind,mesh]of this.meshes){mesh.count=counts[kind];mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  const revision=ground.navigationRevision?.()??0;if(this.lastSurfaceRevision!==revision){this.surface.texture.needsUpdate=true;this.lastSurfaceRevision=revision;}return {plants:total,...counts};
 }
 private tierOf(field:RenderField,distance:number,quality:'low'|'med'|'high'){
  // A little hysteresis so a field on a tier edge does not rebuild every frame as the camera drifts.
  const old=this.tiers.get(field),t=fieldDetailTier(quality,distance);let tier:number=t;
  if(old!==undefined&&old!==t&&fieldDetailTier(quality,distance+(old>t?6:-6))===old)tier=old;
  this.tiers.set(field,tier);return tier;
 }
 /** Trail points near fields, refreshed every couple of seconds: a boundary opens (gap or gate) where a worn trail crosses it. */
 private trailPoints(ground:FieldGround){
  const now=typeof performance!=='undefined'?performance.now():0;if(now-this.crossings.at<2000)return this.crossings.pts;
  const trails=(ground.state as unknown as {trails?:{x?:number;z?:number;wear:number}[]}).trails,pts:{x:number;z:number}[]=[];
  if(trails)for(const t of trails)if(t.x!==undefined&&t.z!==undefined&&t.wear>=.3)pts.push({x:t.x,z:t.z});
  this.crossings={at:now,pts};return pts;
 }
 private syncPainter(ground:FieldGround,camera:{x:number;z:number;y?:number},styleOf:FieldStyleOf|undefined,quality:'low'|'med'|'high'){
  const time=ground.state.time,season=calendarPhase(time).phase,counts={grain:0,pulses:0,tubers:0};let total=0,weedN=0,boundN=0;
  const hood=this.hood(ground),trails=this.trailPoints(ground),used=new Map<string,number>(),sig:number[]=[];
  const dist=(b:RenderField)=>Math.hypot(b.x-camera.x,b.z-camera.z,camera.y===undefined?0:Math.max(0,camera.y-ground.height(b.x,b.z)));
  const visible=ground.state.buildings.filter(b=>b.type==='farm'&&b.hp>0&&b.build>=1&&!b.plannedCost&&(b.team===0||ground.exploredAt(b.x,b.z))).map(b=>({b,d:dist(b)})).sort((a,b)=>a.d-b.d);
  const cropArr=(kind:FieldCrop)=>this.meshes.get(kind)!;
  for(const {b:field,d} of visible){
   const tier=this.tierOf(field,d,quality);if(tier>=2)continue;
   const stage=fieldStage(field as never,time),kind=fieldCropKind(field),plan=this.orientation(ground,field),mask=hood.map.get(field.id)?.mask??0,revision=ground.navigationRevision?.()??0;
   // ---- crops (bare tilth and fallow draw none; the soil shader carries those)
   if(stage!=='fallow'&&stage!=='bare'){
    const planted=field.crop?.planted??0,growth=stage==='sprouting'?.06+.2*planted:stage==='stubble'?.05:stage==='ripe'?1:fieldCropGrowth(field);
    const key=`${plan.key}|${stage}|${growth.toFixed(3)}|${field.crop?.ripened?1:0}|${tier}|${revision}`;
    let c=this.cropCache.get(field);
    if(!c||c.key!==key||c.plan!==plan){
     const sp=contourPlantSpacing(field,kind),thin=tier===1?2:1,sites=thin===1?plan.sites:plan.sites.filter((_,i)=>i%2===0),ratio=sp.plant*thin/PAINTER_CROP_SEGMENT[kind];
     const ps=painterCropScale(growth),crop=stage==='stubble'?{...field.crop!,ripened:true,remaining:0}:field.crop,mat=new Float32Array(sites.length*16),col=new Float32Array(sites.length*3),ux=Math.cos(plan.angle),uz=Math.sin(plan.angle);
     sites.forEach((site,i)=>{
      const h1=hash01(site.x,site.z,3),h2=hash01(site.x,site.z,5),h3=hash01(site.x,site.z,7),h4=hash01(site.x,site.z,11),along=(h1-.5)*.16,across=(h2-.5)*.08,x=site.x+ux*along-uz*across,z=site.z+uz*along+ux*across;
      this.position.set(x,this.plantY(ground,field,x,z),z);this.rotation.setFromAxisAngle(this.up,-plan.angle+(h3-.5)*.2);this.scale.set(ratio,ps.y*(.86+.28*h4),ps.xz*(.88+.24*h1));this.matrix.compose(this.position,this.rotation,this.scale);this.matrix.toArray(mat,i*16);
      painterCropColor(kind,crop,growth,Math.abs(Math.sin(site.x*12.9898+site.z*78.233)*43758.5453)%1,this.color);col[i*3]=this.color.r;col[i*3+1]=this.color.g;col[i*3+2]=this.color.b;
     });
     c={serial:this.serial++,key,plan,n:sites.length,mat,col};this.cropCache.set(field,c);
    }
    const mesh=cropArr(kind),room=Math.min(c.n,CROP_ART_RULES.maxPlantInstances-total,mesh.instanceMatrix.count-counts[kind]);
    if(room>0){mesh.instanceMatrix.array.set(room===c.n?c.mat:c.mat.subarray(0,room*16),counts[kind]*16);mesh.instanceColor!.array.set(room===c.n?c.col:c.col.subarray(0,room*3),counts[kind]*3);counts[kind]+=room;total+=room;sig.push(c.serial);}
   }
   // ---- weeds (near tier only): clumps between and beside the rows, more on resting and neglected ground
   if(tier===0&&this.weedMesh){
    const wf=fieldWeeds(stage,field.crop?.tended??0),count=Math.min(110,Math.round(wf*field.w*field.d*.16)),key=`${field.x}/${field.z}/${field.w}/${field.d}/${mask}/${count}/${stage}/${season}/${revision}`;
    let w=this.weedCache.get(field);
    if(!w||w.key!==key||w.plan!==plan){
     const mat=new Float32Array(count*16),col=new Float32Array(count*3),T=SEASON_TINT.weed[season];let n=0;
     for(let i=0;i<count;i++){
      const cx=(hash01(field.id,i>>2,201)-.5)*(field.w-1.6),cz=(hash01(field.id,i>>2,203)-.5)*(field.d-1.6),x=field.x+cx+(hash01(field.id,i,205)-.5)*1.4,z=field.z+cz+(hash01(field.id,i,207)-.5)*1.4;
      if(fieldEdgeDepth(field,mask,x,z)<.5)continue;
      const s=.55+.9*hash01(field.id,i,209)*(stage==='ripe'||stage==='growing'?1.2:1),k=.85+.3*hash01(field.id,i,211);
      this.position.set(x,this.plantY(ground,field,x,z)-.01,z);this.rotation.setFromAxisAngle(this.up,hash01(field.id,i,213)*6.28);this.scale.set(s,s*(.8+.5*hash01(field.id,i,215)),s);this.matrix.compose(this.position,this.rotation,this.scale);this.matrix.toArray(mat,n*16);
      col[n*3]=Math.min(1.3,T[0]*k);col[n*3+1]=Math.min(1.3,T[1]*k);col[n*3+2]=Math.min(1.3,T[2]*k);n++;
     }
     w={serial:this.serial++,key,plan,n,mat,col};this.weedCache.set(field,w);
    }
    const room=Math.min(w.n,this.weedMesh.instanceMatrix.count-weedN);
    if(room>0){this.weedMesh.instanceMatrix.array.set(room===w.n?w.mat:w.mat.subarray(0,room*16),weedN*16);this.weedMesh.instanceColor!.array.set(room===w.n?w.col:w.col.subarray(0,room*3),weedN*3);weedN+=room;sig.push(w.serial);}
   }
   // ---- boundaries
   const st=styleOf?.(field)??{era:0,variant:0},bkind=boundaryKind(st.era,st.variant,plan.grade);
   const near=trails.length?trails.filter(t=>Math.abs(t.x-field.x)<field.w/2+3&&Math.abs(t.z-field.z)<field.d/2+3):[];
   const bkey=`${field.x}/${field.z}/${field.w}/${field.d}/${mask}/${bkind}/${tier}/${season}/${revision}/${near.map(t=>`${Math.round(t.x)},${Math.round(t.z)}`).join(';')}`;
   let bc=this.boundCache.get(field);
   if(!bc||bc.key!==bkey||bc.plan!==plan)bc={serial:this.serial++,key:bkey,plan,items:this.boundaryItems(ground,field,mask,bkind,tier,season,near)},this.boundCache.set(field,bc);
   if(boundN+bc.items.length<=BOUNDARY_SCENE_BUDGET){
    for(const it of bc.items){const mesh=this.bounds.get(it.mesh)!,n=used.get(it.mesh)??0;if(n>=mesh.instanceMatrix.count)continue;
     mesh.instanceMatrix.array.set(it.mat,n*16);(mesh.instanceColor!.array as Float32Array).set(it.col,n*3);used.set(it.mesh,n+1);}
    boundN+=bc.items.length;sig.push(bc.serial);
   }
  }
  const signature=`${sig.join(',')}|${counts.grain},${counts.pulses},${counts.tubers},${weedN}|${[...used].map(([k,v])=>k+v).join(',')}`;
  if(signature!==this.lastSig){
   this.lastSig=signature;
   for(const [kind,mesh]of this.meshes){mesh.count=counts[kind];mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
   if(this.weedMesh){this.weedMesh.count=weedN;this.weedMesh.visible=weedN>0;this.weedMesh.instanceMatrix.needsUpdate=true;this.weedMesh.instanceColor!.needsUpdate=true;}
   for(const [k,mesh]of this.bounds){mesh.count=used.get(k)??0;mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor!.needsUpdate=true;}
  }
  const revision=ground.navigationRevision?.()??0;if(this.lastSurfaceRevision!==revision){this.surface.texture.needsUpdate=true;this.lastSurfaceRevision=revision;}return {plants:total,...counts};
 }
 /** Instance data for one field's boundary: pieces follow the slope (pitch from the ground at both ends), run corner to corner, and carry local rock colour (stone) or season (the rest). */
 private boundaryItems(ground:FieldGround,field:RenderField,mask:number,kind:BoundaryKind,tier:number,season:number,crossings:{x:number;z:number}[]){
  const sites=boundarySites(field,mask,kind,{crossings}),items:BoundaryItem[]=[],c=new THREE.Color(),pale=new THREE.Color();
  for(const site of sites){
   const cs=Math.cos(site.yaw),sn=-Math.sin(site.yaw),half=site.len/2,h0=ground.height(site.x-cs*half,site.z-sn*half),h1=ground.height(site.x+cs*half,site.z+sn*half),pitch=Math.atan2(h1-h0,site.len);
   const meshKey=site.gate?'gate:0':`${kind}:${tier===1?'lo':site.variant}`;
   this.position.set(site.x,(h0+h1)/2-.03,site.z);this.rotation.setFromAxisAngle(this.up,site.yaw);this.pitchQ.setFromAxisAngle(this.zAxis,pitch);this.rotation.multiply(this.pitchQ);
   this.scale.set(site.len/Math.cos(pitch)/BOUNDARY_LEN,site.gate?1:site.scale,site.gate?1:site.thick);this.matrix.compose(this.position,this.rotation,this.scale);
   const mat=new Float32Array(16);this.matrix.toArray(mat);
   if(site.gate){const [a,b]=BOUNDARY_COLOURS.gate;c.set(a);pale.set(b);c.lerp(pale,site.tint);const T=SEASON_TINT.wood[season];c.r*=T[0];c.g*=T[1];c.b*=T[2];}
   else if(kind==='stone')stoneColour(ground.world,site.x,site.z,site.tint,c);
   else{const [a,b]=BOUNDARY_COLOURS[kind];c.set(a);pale.set(b);c.lerp(pale,site.tint);const T=SEASON_TINT[kind==='hedge'?'hedge':kind==='bank'?'bank':'wood'][season];c.r*=T[0];c.g*=T[1];c.b*=T[2];}
   items.push({mesh:meshKey,mat,col:[c.r,c.g,c.b]});
  }
  return items;
 }
 dispose(){for(const mesh of [...this.meshes.values(),...this.bounds.values(),...(this.weedMesh?[this.weedMesh]:[])]){this.scene.remove(mesh);mesh.geometry.dispose();const m=mesh.material as THREE.Material;m.dispose();mesh.dispose();}this.meshes.clear();this.bounds.clear();this.weedMesh=undefined;}
}
