import {detailScale,getDetailLevel,DETAIL_RULES} from '../game/detailLevel';
import * as THREE from 'three';
import {BOTANICAL_SPECIES,DEFAULT_SITE,VARIANTS_PER_SPECIES,pickSpecies,pickVariant,stableUnit,type BaseForm,type BotanicalSpecies,type TreeSite} from './botanicalSpecies';
import {botanicalTree,botanicalStump,type TreeGeometry} from './treeBotany';
import {makeBotanicalMaterial,makeBotanicalFarMaterial,makeFarFade} from './botanicalMaterial';
import {FillerLayer} from './fillerLayer';
import type {FillerBlob} from './fillerForest';
import {painterFarClustered,painterFarNeedle,contactShadowGeometry,radialShadowTexture} from './painterTrees';
import {painterSway,type PainterSway} from './painterVegetationMaterial';
/** Instanced botanical forest (the painterly default). One mesh per (species, variant, LOD tier), all sharing one material: tier 0 full leaf-card
 * trees, tier 1 mid trees (same skeleton, cores plus sparse cards), then far crowns and rooted far trunks. Each living tree is a real resource node; nothing here
 * adds wood, collision or clicks. Per-tree seeded variation: species and age class by site, height/width, lean (wind, slope), hue, autumn colour, leaf-fall timing. */
/** Cosmetic filler for one frame (see fillerForest.ts): individual trees (negative ids, `filler: true`, never resources) and merged horizon crowns, with the radii the budget really reached. */
export type ForestFiller={trees:readonly ForestNode[];blobs:readonly FillerBlob[];detailEff:number;farEff:number};
export type ForestContext={marked?:(id:number)=>boolean;quality:'low'|'med'|'high';/** tree detail step: full/mid radius and leaf-card scale (absent = per-quality radii, all cards) */detail?:{nearMetres:number;cardScale:number};camera:{x:number;z:number};known:(x:number,z:number)=>boolean;winter:number;autumn:number;snow:number;
 /** draw-distance bands (src/game/drawDistance.ts): sim trees are culled beyond this (graphics Low scales it down as before); absent = the original 700/420 m */
 farMetres?:number;/** screen-door fade span ahead of the cut-offs (0/absent = hard edge) */fadeMetres?:number;/** conservative frustum test (x,z,radius) for far-tier trees; absent = draw all */inView?:(x:number,z:number,r:number)=>boolean;filler?:ForestFiller|null};
export type ForestNode={id:number;x:number;y:number;z:number;amount:number;scale:number;regenT:number;planted?:boolean;/** cosmetic filler tree: never a resource, never picked */filler?:true};
export type ForestOptions={seed:number;siteAt:(x:number,z:number)=>TreeSite;baseFormAt:(id:number,x:number,z:number)=>{base:BaseForm;kind:string};/** unit wind vector the trees lean along */wind?:[number,number];nearMetres:Record<'low'|'med'|'high',number>;farMetres:number;lowFarMetres:number;stumpHeightScale:number};
export const FOREST_LOD={fullFraction:.4,midFraction:1.15} as const;
type Rec={sp:number;v:number;sx:number;sy:number;lean:[number,number];yaw:number;hue:[number,number,number];autumn:number;timing:number};
type Batch={mesh:THREE.InstancedMesh;state:THREE.InstancedBufferAttribute;ids:number[];capacity:number;n:number;name:string};
const AUTUMN_CACHE=new Map<string,THREE.Color>();const autumnColor=(hex:string)=>{let c=AUTUMN_CACHE.get(hex);if(!c){c=new THREE.Color(hex);AUTUMN_CACHE.set(hex,c);}return c;};
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export class BotanicalForest{
 private scene:THREE.Scene;private o:ForestOptions;private sway:PainterSway=painterSway();private mat:THREE.MeshStandardMaterial;private farMat:THREE.MeshStandardMaterial;
 private batches=new Map<number,Batch>();private stumps:Batch|null=null;private recs=new Map<number,Rec>();private info=new Map<number,TreeGeometry>();
 private farTrunk:THREE.InstancedMesh;private farTrunkIds:number[]=[];private far:THREE.InstancedMesh[];private farIds:number[][]=[[],[]];
 private shadows:THREE.InstancedMesh|null=null;private shadowMat:THREE.MeshBasicMaterial;private sunAz=new THREE.Vector2(-.6,.8);private sunElev=.8;private shadowOpacity=.34;
 private matrix=new THREE.Matrix4();private pos=new THREE.Vector3();private scale=new THREE.Vector3();private quat=new THREE.Quaternion();private euler=new THREE.Euler(0,0,0,'XZY');private color=new THREE.Color();private hsl={h:0,s:0,l:0};private snowColor=new THREE.Color('#d4e0dd');
 private wind:[number,number];private simFade=makeFarFade();private fill:FillerLayer;private cheapIds:number[][]=[[],[]];
 constructor(scene:THREE.Scene,o:ForestOptions){
  this.scene=scene;this.o=o;this.wind=o.wind??[.7,.7];this.mat=makeBotanicalMaterial(this.sway);this.farMat=makeBotanicalFarMaterial(this.simFade);this.fill=new FillerLayer(scene);
  const farGeo=new THREE.CylinderGeometry(1,1,1,5).translate(0,.5,0),a=new Float32Array(farGeo.attributes.position.count*3);for(let i=0;i<a.length;i+=3)a.set([.2,.12,.07],i);farGeo.setAttribute('color',new THREE.BufferAttribute(a,3));
  this.farTrunk=new THREE.InstancedMesh(farGeo,this.farMat,1);this.farTrunk.name='resource-far-rooted-trunk';this.farTrunk.count=0;this.farTrunk.frustumCulled=false;scene.add(this.farTrunk);
  const unit=(g:THREE.BufferGeometry)=>{g.computeBoundingBox();const b=g.boundingBox!,c=b.getCenter(new THREE.Vector3()),h=b.getSize(new THREE.Vector3()).multiplyScalar(.5);g.translate(-c.x,-c.y,-c.z);g.scale(1/h.x,1/h.y,1/h.z);g.computeBoundingBox();return g;};
  this.far=[unit(painterFarClustered()),unit(painterFarNeedle())].map((geo,i)=>{const m=new THREE.InstancedMesh(geo,this.farMat,1);m.name=i?'resource-far-needle':'resource-far-crown';m.count=0;m.frustumCulled=false;scene.add(m);return m;});
  this.shadowMat=new THREE.MeshBasicMaterial({color:0x10140a,map:null,alphaMap:radialShadowTexture(),transparent:true,opacity:this.shadowOpacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  this.shadows=this.makeShadows(1);
 }
 private makeShadows(cap:number){const m=new THREE.InstancedMesh(contactShadowGeometry(),this.shadowMat,cap);m.name='resource-contact-shadows';m.count=0;m.frustumCulled=false;m.renderOrder=1;m.raycast=()=>{};this.scene.add(m);return m;}
 setTime(t:number){this.sway.uTime.value=t;}
 setWind(strength:number){this.sway.uWind.value=strength;}
 setSun(dir:THREE.Vector3,strength:number,realShadows=false){const h=Math.max(.12,dir.y);this.sunElev=h;this.sunAz.set(-dir.x,-dir.z).normalize();this.shadowOpacity=(realShadows?.12:.36)*Math.max(0,Math.min(1,strength));this.shadowMat.opacity=this.shadowOpacity;}
 farResourceId(style:0|1,index:number){return this.farIds[style][index];}
 resourceId(){return undefined;}
 pickingSources(){
  const out:{mesh:THREE.InstancedMesh;resourceIds:readonly number[]}[]=[];
  for(const b of this.batches.values())out.push({mesh:b.mesh,resourceIds:b.ids});
  if(this.stumps)out.push({mesh:this.stumps.mesh,resourceIds:this.stumps.ids});
  out.push({mesh:this.farTrunk,resourceIds:this.farTrunkIds});for(let i=0;i<2;i++)out.push({mesh:this.far[i],resourceIds:this.farIds[i]});
  // cheap far crowns of sim trees come first in their pool; instances after them are cosmetic filler (no id: never picked)
  for(let i=0;i<2;i++)if(this.cheapIds[i].length)out.push({mesh:this.fill.blobMesh(i),resourceIds:this.cheapIds[i]});return out;
 }
 private rec(node:ForestNode):Rec{
  let r=this.recs.get(node.id);if(r)return r;
  const seed=this.o.seed,{base,kind}=this.o.baseFormAt(node.id,node.x,node.z),site=this.o.siteAt(node.x,node.z)??DEFAULT_SITE;
  const id=pickSpecies(base,kind,site,stableUnit(node.id,seed,41)),idx=Math.max(0,BOTANICAL_SPECIES.findIndex(s=>s.id===id)),sp=BOTANICAL_SPECIES[idx];
  const v=pickVariant(node.scale*(node.planted?.6:1),site,stableUnit(node.id,seed,43)),u=(k:number)=>stableUnit(node.id,seed,k);
  // lean: with the wind, plus a drift off steep slopes; exposed species (mountain pine, palms, olive) lean harder
  const exposure=Math.min(1,site.slope*1.4+(kind==='alpine'?.55:0)+(kind==='warm-coast'?.3:0)+sp.lean*1.6),wl=(.012+exposure*.1)*(.7+.6*u(47)),la=Math.atan2(this.wind[1],this.wind[0])+(u(49)-.5)*.9;
  const lean:[number,number]=[Math.cos(la)*wl+(u(51)-.5)*.05,Math.sin(la)*wl+(u(53)-.5)*.05];
  const thin=Math.max(0,Math.min(1,site.soil)),stunt=.8+.2*thin;
  r={sp:idx,v,sx:(.86+.3*u(55))*(1.02-.1*(site.moisture-.5))*stunt,sy:(.9+.2*u(57))*stunt,lean,yaw:u(59)*Math.PI*2,hue:[(u(61)-.5)*.05,.88+u(63)*.28,.9+u(65)*.2],autumn:Math.floor(u(67)*sp.autumn.length*.999),timing:u(69)};
  this.recs.set(node.id,r);return r;
 }
 /** Leaf-card scale of the species meshes: a change drops the batches (the next sync rebuilds them from the cached geometry for that scale). Cores, trunks and cheap far crowns are unaffected. */
 private cardScale=1;
 private setCardScale(k:number){if(Math.abs(k-this.cardScale)<1e-6)return;this.cardScale=k;for(const b of this.batches.values()){this.scene.remove(b.mesh);b.mesh.dispose();}this.batches.clear();}
 private geometryInfo(spIdx:number){let i=this.info.get(spIdx);if(!i){i=botanicalTree(BOTANICAL_SPECIES[spIdx].id,0,1);this.info.set(spIdx,i);}return i;}
 private batch(sp:number,v:number,tier:0|1|2,needed:number){
  const key=(sp*VARIANTS_PER_SPECIES+v)*3+tier;let b=this.batches.get(key);
  if(!b){b=this.makeBatch(botanicalTree(BOTANICAL_SPECIES[sp].id,v,tier,this.cardScale).geometry,`resource-${BOTANICAL_SPECIES[sp].id}-v${v}-t${tier}`,Math.max(8,needed));this.batches.set(key,b);}
  else if(needed>b.capacity){const old=b,nb=this.makeBatch(old.mesh.geometry,old.name,Math.max(needed,old.capacity*2),old);this.scene.remove(old.mesh);old.mesh.dispose();b=nb;this.batches.set(key,b);}
  return b;
 }
 private makeBatch(shared:THREE.BufferGeometry,name:string,capacity:number,from?:Batch):Batch{
  const geo=new THREE.BufferGeometry();for(const k of Object.keys(shared.attributes))if(k!=='iState')geo.setAttribute(k,shared.attributes[k]);if(shared.index)geo.setIndex(shared.index);geo.boundingBox=shared.boundingBox;geo.boundingSphere=shared.boundingSphere;
  const state=new THREE.InstancedBufferAttribute(new Float32Array(capacity*2),2);state.setUsage(THREE.DynamicDrawUsage);geo.setAttribute('iState',state);
  const mesh=new THREE.InstancedMesh(geo,this.mat,capacity);mesh.name=name;mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);
  if(from){mesh.instanceMatrix.array.set(from.mesh.instanceMatrix.array);(mesh.instanceColor.array as Float32Array).set(from.mesh.instanceColor!.array as Float32Array);state.array.set(from.state.array);}
  this.scene.add(mesh);return {mesh,state,ids:from?from.ids:[],capacity,n:from?from.n:0,name};
 }
 private stumpBatch(needed:number){
  if(!this.stumps)this.stumps=this.makeBatch(botanicalStump(),'resource-stumps',Math.max(8,needed));
  else if(needed>this.stumps.capacity){const old=this.stumps,nb=this.makeBatch(old.mesh.geometry,old.name,Math.max(needed,old.capacity*2),old);this.scene.remove(old.mesh);old.mesh.dispose();this.stumps=nb;}
  return this.stumps;
 }
 private blob(node:ForestNode,s:number,radius:number,i:number){
  let m=this.shadows!;if(i>=m.instanceMatrix.count){const old=m;m=this.makeShadows(old.instanceMatrix.count*2);this.scene.remove(old);old.dispose();this.shadows=m;}
  const r=radius*s,len=1+Math.min(2.4,.9/this.sunElev),angle=Math.atan2(this.sunAz.x,this.sunAz.y),off=r*(len-1)*.7,e=new THREE.Euler(0,angle,0);
  this.pos.set(node.x+this.sunAz.x*off,node.y+.22,node.z+this.sunAz.y*off);this.quat.setFromEuler(e);this.scale.set(r,1,r*len);this.matrix.compose(this.pos,this.quat,this.scale);m.setMatrixAt(i,this.matrix);return i+1;
 }
 sync(nodes:readonly ForestNode[],ctx:ForestContext){
  for(const b of this.batches.values()){b.n=0;b.ids.length=0;}
  if(this.stumps){this.stumps.n=0;this.stumps.ids.length=0;}
  this.setCardScale(ctx.detail?.cardScale??1);const near=(ctx.detail?ctx.detail.nearMetres:this.o.nearMetres[ctx.quality])*detailScale();let d0=near*FOREST_LOD.fullFraction;const d1=near*FOREST_LOD.midFraction,cullFar=ctx.farMetres!==undefined?ctx.farMetres*(ctx.quality==='low'&&!ctx.detail?this.o.lowFarMetres/this.o.farMetres:1):ctx.quality==='low'?this.o.lowFarMetres:this.o.farMetres,fadeM=Math.max(0,ctx.fadeMetres??0);
  // Detail: at most `maxFullTrees` are drawn at the full tier, nearest first (the M1 triangle budget); the rest of the ring uses the mid tier
  {const cap=DETAIL_RULES.maxFullTrees[getDetailLevel()],ds:number[]=[];for(const node of nodes){if(node.amount<=0&&!node.planted)continue;const q=Math.hypot(node.x-ctx.camera.x,node.z-ctx.camera.z);if(q<=d0&&ctx.known(node.x,node.z))ds.push(q);}
   if(ds.length>cap){ds.sort((a,b)=>a-b);d0=Math.min(d0,ds[cap-1]);}}
  // HERO tier: the nearest maxHeroTrees real trees inside heroTreeMetres draw the enriched near geometry (treeBotany lod 2); never more, so the triangle budget is bounded
  let heroD=Math.min(d0,DETAIL_RULES.heroTreeMetres[getDetailLevel()]);
  {const cap=DETAIL_RULES.maxHeroTrees[getDetailLevel()],ds:number[]=[];for(const node of nodes){if(node.amount<=0&&!node.planted)continue;const q=Math.hypot(node.x-ctx.camera.x,node.z-ctx.camera.z);if(q<=heroD&&ctx.known(node.x,node.z))ds.push(q);}
   if(ds.length>cap){ds.sort((x,y)=>x-y);heroD=ds[cap-1];}}
  // with the cosmetic filler on, sim trees beyond the individual-detail radius draw as one cheap low-poly crown (hand-over is a dithered cross-fade); the budget's real reach bounds both
  const detailEff=ctx.filler?ctx.filler.detailEff:Infinity;this.cheapIds[0].length=this.cheapIds[1].length=0;
  const reach=ctx.filler?Math.min(cullFar,ctx.filler.farEff):cullFar;
  if(fadeM>0)this.simFade.value.set((ctx.filler?detailEff:cullFar)-fadeM,ctx.filler?detailEff:cullFar,-2,-1);else this.simFade.value.set(1e9,1e9+1,-2,-1);
  const fillerCounts={trees:0,far:0,blobs:0,cheap:0};this.fill.begin();
  const farCounts=[0,0];let farTrunks=0,blobs=0,midTrees=0,fullTrees=0,heroTrees=0,leafy=0;this.farTrunkIds.length=0;this.farIds[0].length=this.farIds[1].length=0;
  // two passes would let batches size exactly; instead capacity doubles on demand
  const tally=new Map<number,number>();
  for(const list of [nodes,ctx.filler?.trees??[]])for(const node of list){
   if(!ctx.known(node.x,node.z))continue;
   const dx=node.x-ctx.camera.x,dz=node.z-ctx.camera.z,distance=Math.hypot(dx,dz);if(distance>reach)continue;
   const rec=this.rec(node),sp=BOTANICAL_SPECIES[rec.sp],stump=node.amount<=0&&!node.planted,growth=node.planted?.18+.6*Math.max(0,1-node.regenT/120):1,s=node.scale*growth;
   const tier:0|1|2=node.filler?2:distance<=d0?0:distance<=d1?1:2,heroTier:0|1|2=tier===0&&distance<=heroD&&!node.filler?2:tier; // cosmetic filler never uses the pickable individual tiers
   if(tier===2&&ctx.inView&&!ctx.inView(node.x,node.z,10))continue;
   if(node.filler)fillerCounts.trees++;
   if(stump){
    if(distance>d1)continue;
    const b=this.stumpBatch(b0(this.stumps)+1);const i=b.n++;b.ids.push(node.id);
    this.pos.set(node.x,node.y,node.z);this.euler.set(0,rec.yaw,0);this.quat.setFromEuler(this.euler);const r=Math.max(.14,sp.r0*s*(rec.v===2?1.15:1)*rec.sx);this.scale.set(r,s*(.8+.5*rec.timing)*.5,r);this.matrix.compose(this.pos,this.quat,this.scale);b.mesh.setMatrixAt(i,this.matrix);
    this.color.setRGB(1,1,1);b.mesh.setColorAt(i,this.color);b.state.setXY(i,0,0);continue;
   }
   // colour and seasonal state
   const dec=!sp.evergreen;
   this.color.set(sp.leaf);this.color.getHSL(this.hsl);this.color.setHSL(this.hsl.h+rec.hue[0],Math.min(1,this.hsl.s*rec.hue[1]),this.hsl.l*rec.hue[2]);
   let density=1;
   if(dec){
    if(ctx.autumn>.1&&sp.autumn.length)this.color.lerp(autumnColor(sp.autumn[rec.autumn]),Math.min(.95,ctx.autumn*(.72+.28*rec.timing)));
    density=1-Math.min(1,ctx.winter*1.25)-smooth(.55,1.05,ctx.autumn*(.55+.45*rec.timing))*.85;density=Math.max(0,Math.min(1,density));
   }
   const snow=ctx.snow>.15?Math.min(1,ctx.snow*(sp.evergreen?1.05:.9)):0;if(snow>0&&density>.3)this.color.lerp(this.snowColor,snow*.25);
   this.color.multiplyScalar(1.04+.2*rec.hue[2]);
   if(ctx.marked?.(node.id))this.color.set('#c58e43');
   if(distance<=Math.min(near*2.2,165)&&!stump){blobs=this.blob(node,s,sp.crownR*rec.sx*(sp.arch==='palm'?.5:.85),blobs);}
   if(tier!==2){
    const key=(rec.sp*VARIANTS_PER_SPECIES+rec.v)*3+heroTier,need=(tally.get(key)??0)+1;tally.set(key,need);
    const b=this.batch(rec.sp,rec.v,heroTier as 0|1|2,need),i=b.n++;b.ids.push(node.id);
    this.pos.set(node.x,node.y,node.z);this.euler.set(rec.lean[1],rec.yaw,-rec.lean[0]);this.quat.setFromEuler(this.euler);this.scale.set(s*rec.sx,s*rec.sy,s*rec.sx);this.matrix.compose(this.pos,this.quat,this.scale);
    b.mesh.setMatrixAt(i,this.matrix);b.mesh.setColorAt(i,this.color);b.state.setXY(i,density,snow);
    if(tier===0)fullTrees++;else midTrees++;if(heroTier===2)heroTrees++;if(density>.05||sp.evergreen)leafy++;
   }else{
    const g=this.geometryInfo(rec.sp),fl=node.filler===true;
    if(distance>detailEff-fadeM){
     // beyond the individual-detail radius: one cheap crown (no trunk), pickable like the far crown it replaces. Inside the last `fade` metres both are drawn (complementary dither = cross-fade).
     if(density<=.05&&dec){if(distance>detailEff)continue;}else{
     const style=sp.group==='conifer'&&sp.arch!=='umbrella'&&sp.arch!=='decurrent'||sp.group==='stunted'&&sp.id==='juniper'?1:0;
     this.euler.set(rec.lean[1],rec.yaw,-rec.lean[0]);this.quat.setFromEuler(this.euler);
     this.pos.set(g.crownCenter[0]*s*rec.sx,g.crownCenter[1]*s*rec.sy,g.crownCenter[2]*s*rec.sx).applyQuaternion(this.quat);this.pos.x+=node.x;this.pos.y+=node.y;this.pos.z+=node.z;
     this.scale.set(g.crownHalf[0]*s*rec.sx*.96,g.crownHalf[1]*s*rec.sy*.96,g.crownHalf[2]*s*rec.sx*.96);this.matrix.compose(this.pos,this.quat,this.scale);
     const c=CHEAP_TMP.copy(this.color);if(snow>0)c.lerp(this.snowColor,snow*.55);this.fill.addBlob(style===1,this.matrix,c);
     if(!fl)this.cheapIds[style].push(node.id);fillerCounts.cheap++;if(distance>detailEff)continue;}
    }
    if(!fl&&farTrunks>=this.farTrunk.instanceMatrix.count){const old=this.farTrunk,mesh=new THREE.InstancedMesh(old.geometry,old.material,old.instanceMatrix.count*2);mesh.name=old.name;mesh.frustumCulled=false;mesh.instanceMatrix.array.set(old.instanceMatrix.array);this.scene.remove(old);old.dispose();this.scene.add(mesh);this.farTrunk=mesh;}
    this.pos.set(node.x,node.y,node.z);this.euler.set(rec.lean[1],rec.yaw,-rec.lean[0]);this.quat.setFromEuler(this.euler);
    const tr=Math.max(.12,sp.r0*.7)*s*rec.sx;this.scale.set(tr,Math.max(.6,g.crownCenter[1])*s*rec.sy,tr);this.matrix.compose(this.pos,this.quat,this.scale);if(fl)this.fill.addTrunk(this.matrix);else{this.farTrunk.setMatrixAt(farTrunks++,this.matrix);this.farTrunkIds.push(node.id);}
    if(density<=.05&&dec)continue;
    const style=sp.group==='conifer'&&sp.arch!=='umbrella'&&sp.arch!=='decurrent'||sp.group==='stunted'&&sp.id==='juniper'?1:0,i=fl?0:farCounts[style]++;if(!fl)this.growFar(style,i+1);const mesh=this.far[style];
    this.pos.set(g.crownCenter[0]*s*rec.sx,g.crownCenter[1]*s*rec.sy,g.crownCenter[2]*s*rec.sx).applyQuaternion(this.quat);this.pos.x+=node.x;this.pos.y+=node.y;this.pos.z+=node.z;
    this.scale.set(g.crownHalf[0]*s*rec.sx*.96,g.crownHalf[1]*s*rec.sy,g.crownHalf[2]*s*rec.sx*.96);this.matrix.compose(this.pos,this.quat,this.scale);
    const c=this.color;if(snow>0)c.lerp(this.snowColor,snow*.55);
    if(fl){this.fill.addCrown(style===1,this.matrix,c);fillerCounts.far++;}else{mesh.setMatrixAt(i,this.matrix);mesh.setColorAt(i,c);this.farIds[style].push(node.id);}
   }
  }
  if(ctx.filler){
   const f=ctx.filler;this.fill.setFades(f.detailEff,f.farEff,fadeM);
   for(const b of f.blobs){
    if(!ctx.known(b.x,b.z))continue;
    const needle=b.needle>.5,bare=b.dec*Math.min(1,ctx.winter*1.25)*(ctx.snow>.4?.6:1),aut=b.dec*Math.min(.9,ctx.autumn*.85);
    this.color.setRGB(b.cr,b.cg,b.cb);if(aut>.02)this.color.lerp(BLOB_AUTUMN,aut);if(bare>.02)this.color.lerp(BLOB_BARE,Math.min(.85,bare));if(ctx.snow>.15)this.color.lerp(this.snowColor,Math.min(.55,ctx.snow*.5));
    this.color.multiplyScalar(.96+.2*(Math.abs(Math.sin(b.x*12.9898+b.z*78.233)*43758.5453)%1));
    this.euler.set(0,((b.x*.73+b.z*1.31)%6.28),0,'XZY');this.quat.setFromEuler(this.euler);this.pos.set(b.x,b.y,b.z);this.scale.set(b.r*(needle?.62:1),b.h*(1-.18*bare),b.r*(needle?.62:1));
    this.matrix.compose(this.pos,this.quat,this.scale);this.fill.addBlob(needle,this.matrix,this.color);fillerCounts.blobs++;
   }
  }
  this.fill.finish();
  for(const b of [...this.batches.values(),...(this.stumps?[this.stumps]:[])]){const m=b.mesh;m.count=b.n;m.visible=b.n>0;m.castShadow=ctx.quality!=='low'&&b.n>0;m.instanceMatrix.needsUpdate=true;m.instanceMatrix.clearUpdateRanges?.();if(m.instanceColor)m.instanceColor.needsUpdate=true;b.state.needsUpdate=true;}
  if(this.shadows){this.shadows.count=blobs;this.shadows.instanceMatrix.needsUpdate=true;}
  this.farTrunk.count=farTrunks;this.farTrunk.instanceMatrix.needsUpdate=true;
  for(let i=0;i<2;i++){const m=this.far[i];m.count=farCounts[i];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
  return {nearTrees:fullTrees+midTrees,nearCanopies:leafy,farCanopies:farCounts[0]+farCounts[1],resourceCount:nodes.length,fullTrees,midTrees,heroTrees,filler:{...fillerCounts,...this.fill.stats()}};
 }
 /** Meshes of the cosmetic filler layer (for tests and the measurement harness). */
 fillerMeshes(){return this.fill.meshes();}
 private growFar(index:number,needed:number){const old=this.far[index];if(needed<=old.instanceMatrix.count)return;const mesh=new THREE.InstancedMesh(old.geometry,old.material,Math.max(needed,old.instanceMatrix.count*2));mesh.name=old.name;mesh.frustumCulled=false;mesh.instanceMatrix.array.set(old.instanceMatrix.array);
  mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count*3),3);if(old.instanceColor)mesh.instanceColor.array.set(old.instanceColor.array);this.scene.remove(old);old.dispose();this.scene.add(mesh);this.far[index]=mesh;}
 /** Species and age class chosen for a resource node (for tests and debug overlays). */
 describe(node:ForestNode){const r=this.rec(node);return {species:BOTANICAL_SPECIES[r.sp].id,variant:r.v,sx:r.sx,sy:r.sy,lean:r.lean};}
 dispose(){
  for(const b of this.batches.values()){this.scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.dispose();}this.batches.clear();
  if(this.stumps){this.scene.remove(this.stumps.mesh);this.stumps.mesh.geometry.dispose();this.stumps.mesh.dispose();}
  for(const m of this.far){this.scene.remove(m);m.geometry.dispose();m.dispose();}this.scene.remove(this.farTrunk);this.farTrunk.geometry.dispose();this.farTrunk.dispose();
  if(this.shadows){this.scene.remove(this.shadows);this.shadows.dispose();}this.shadowMat.dispose();this.fill.dispose();this.mat.dispose();this.farMat.dispose();
 }
}
const b0=(b:Batch|null)=>b?b.n:0;
const CHEAP_TMP=new THREE.Color();
const BLOB_AUTUMN=new THREE.Color('#b8793a'),BLOB_BARE=new THREE.Color('#756a58');
export type {BotanicalSpecies};
