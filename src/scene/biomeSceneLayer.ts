import * as THREE from 'three';
import {provinceAt,ecologicalConditionsAt,PROVINCE_KINDS,type EcologicalProvinceGrid,type ProvinceKind} from '../game/ecologicalProvinces';
import {BiomeVegetation,BiomeDressing,resourceTreeForm,BIOME_VEGETATION_RULES,type ResourceTree,type DressingPoint,type VegetationContext,type VegetationStyle} from './biomeVegetation';
import type {DressingForm} from './vegetationKit';
import {peekGeology} from './painterGeology';
import {BotanicalForest} from './botanicalForest';
import {loadTreeSet,type TreeSet} from './treeSet';
import type {TreeSite,BaseForm} from './botanicalSpecies';
/** Read-only adapter contract. Integrator can pass Game directly after the
 * versioned ecology grid is attached to its generated world. */
export type BiomeSceneGame={chopMarks?:ReadonlySet<number>;world:{size:number;mapgen?:{wind?:{x:number;z:number}}};state:{seed:number;trees:ResourceTree[];buildings:{hp:number;x:number;z:number;w:number;d:number}[]};
 height:(x:number,z:number)=>number;waterAt:(x:number,z:number)=>number;exploredAt:(x:number,z:number)=>boolean;
 seasonMix:()=>{winter:number;autumn:number;snow:number}};
export const BIOME_SCENE_RULES={treeRefreshSeconds:.1,dressingRefreshSeconds:.5,dressingCellMetres:6,dressingRadiusMetres:65,
 dressingMaxCandidates:1024,painterCellMetres:3.2,painterMaxCandidates:1500,dryClearanceMetres:.3,maximumDressingGrade:.65,bankSearchMetres:11,buildingMarginMetres:.7} as const;
/** All coefficients affect an actual surface channel, not an independent flat
 * biome paint layer. The active terrain shader is intentionally untouched here. */
export const BIOME_SURFACE_PROFILES:Record<ProvinceKind,{organic:number;litter:number;grit:number;damp:number;roughness:number;microHeightMetres:number;detailScaleMetres:number;tint:[number,number,number];dressingDensity:number}>={
 meadow:{organic:.90,litter:.08,grit:.08,damp:.20,roughness:.96,microHeightMetres:.035,detailScaleMetres:5,tint:[.32,.39,.18],dressingDensity:.86},
 'mixed-woodland':{organic:.60,litter:.64,grit:.12,damp:.38,roughness:.94,microHeightMetres:.06,detailScaleMetres:4,tint:[.24,.29,.15],dressingDensity:.62},
 'conifer-forest':{organic:.38,litter:.88,grit:.20,damp:.32,roughness:.95,microHeightMetres:.05,detailScaleMetres:3.5,tint:[.24,.25,.18],dressingDensity:.40},
 alpine:{organic:.15,litter:.08,grit:.85,damp:.12,roughness:.90,microHeightMetres:.09,detailScaleMetres:7,tint:[.44,.45,.43],dressingDensity:.21},
 wetland:{organic:.74,litter:.30,grit:.06,damp:.90,roughness:.79,microHeightMetres:.04,detailScaleMetres:4.5,tint:[.22,.30,.21],dressingDensity:.83},
 'dry-scrub':{organic:.30,litter:.20,grit:.64,damp:.08,roughness:.97,microHeightMetres:.08,detailScaleMetres:6,tint:[.42,.36,.23],dressingDensity:.37},
 arid:{organic:.06,litter:.02,grit:.95,damp:.01,roughness:.98,microHeightMetres:.055,detailScaleMetres:8,tint:[.61,.48,.29],dressingDensity:.16},
 'warm-coast':{organic:.68,litter:.32,grit:.22,damp:.44,roughness:.91,microHeightMetres:.045,detailScaleMetres:5.5,tint:[.34,.40,.21],dressingDensity:.53},
};
export function biomeSurfaceParametersAt(grid:EcologicalProvinceGrid,x:number,z:number){
 const gx=(x/grid.size+.5)*grid.width-.5,gz=(z/grid.size+.5)*grid.width-.5;
 const ix=Math.max(0,Math.min(grid.width-2,Math.floor(gx))),iz=Math.max(0,Math.min(grid.width-2,Math.floor(gz))),fx=Math.max(0,Math.min(1,gx-ix)),fz=Math.max(0,Math.min(1,gz-iz));
 const samples=[[ix,iz,(1-fx)*(1-fz)],[ix+1,iz,fx*(1-fz)],[ix,iz+1,(1-fx)*fz],[ix+1,iz+1,fx*fz]];
 const result={organic:0,litter:0,grit:0,damp:0,roughness:0,microHeightMetres:0,detailScaleMetres:0,tint:[0,0,0] as [number,number,number]};
 let total=0;
 for(const [cx,cz,weight] of samples){const kind=PROVINCE_KINDS[grid.kinds[cz*grid.width+cx]],profile=BIOME_SURFACE_PROFILES[kind];if(!profile||weight<=0)continue;total+=weight;
  for(const channel of ['organic','litter','grit','damp','roughness','microHeightMetres','detailScaleMetres'] as const)result[channel]+=profile[channel]*weight;
  for(let c=0;c<3;c++)result.tint[c]+=profile.tint[c]*weight;
 }
 if(!total){const p=BIOME_SURFACE_PROFILES[provinceAt(grid,x,z).kind];return {...p,tint:[...p.tint] as [number,number,number]};}
 for(const channel of ['organic','litter','grit','damp','roughness','microHeightMetres','detailScaleMetres'] as const)result[channel]/=total;
 for(let c=0;c<3;c++)result.tint[c]/=total;
 result.damp*=Math.max(0,Math.min(1,(ecologicalConditionsAt(grid,x,z).moisture-.15)/.75));return result;
}
/** Prepared vertex attributes for a later TerrainSurface bind. X/Z and all
 * existing heights stay untouched; organic/soil/roughness/normal channels blend. */
export function biomeSurfaceAttributes(grid:EcologicalProvinceGrid,positions:THREE.BufferAttribute){
 const cover=new Float32Array(positions.count*4),material=new Float32Array(positions.count*4),tint=new Float32Array(positions.count*3);
 for(let i=0;i<positions.count;i++){const p=biomeSurfaceParametersAt(grid,positions.getX(i),positions.getZ(i));cover.set([p.organic,p.litter,p.grit,p.damp],i*4);material.set([p.roughness,p.microHeightMetres,p.detailScaleMetres,1],i*4);tint.set(p.tint,i*3);}
 return {cover,material,tint};
}
function hash(x:number,z:number,seed:number,salt=0){let n=Math.imul(x|0,73856093)^Math.imul(z|0,19349663)^seed^salt;n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;}
/** Boulders may rest on steep scree, but never in water or inside a building footprint. */
function screeGroundAllowed(game:BiomeSceneGame,x:number,z:number){
 const rules=BIOME_SCENE_RULES;
 if(Math.abs(x)>game.world.size*.49||Math.abs(z)>game.world.size*.49||game.height(x,z)<game.waterAt(x,z)+rules.dryClearanceMetres)return false;
 return !game.state.buildings.some(b=>b.hp>0&&Math.abs(x-b.x)<b.w*.5+rules.buildingMarginMetres&&Math.abs(z-b.z)<b.d*.5+rules.buildingMarginMetres);
}
export function dressingGroundAllowed(game:BiomeSceneGame,x:number,z:number){
 const rules=BIOME_SCENE_RULES,h=game.height(x,z);
 if(Math.abs(x)>game.world.size*.49||Math.abs(z)>game.world.size*.49||h<game.waterAt(x,z)+rules.dryClearanceMetres)return false;
 const grade=Math.max(Math.abs(game.height(x+2,z)-game.height(x-2,z)),Math.abs(game.height(x,z+2)-game.height(x,z-2)))/4;
 if(grade>rules.maximumDressingGrade)return false;
 return !game.state.buildings.some(b=>b.hp>0&&Math.abs(x-b.x)<b.w*.5+rules.buildingMarginMetres&&Math.abs(z-b.z)<b.d*.5+rules.buildingMarginMetres);
}
function dressingForm(kind:ProvinceKind,random:number,bank:boolean):DressingForm{
 if(kind==='wetland'&&bank)return 'reeds';
 if(kind==='alpine')return random<.75?'pebbles':'grass';
 if(kind==='arid')return random<.55?'pebbles':'scrub';
 if(kind==='dry-scrub')return random<.7?'scrub':'pebbles';
 if(kind==='meadow')return random<.16?'flowers':'grass';
 if(kind==='mixed-woodland')return random<.24?'scrub':'grass';
 if(kind==='conifer-forest')return random<.36?'scrub':'grass';
 return random<.2?'scrub':'grass';
}
/** Painterly undergrowth: a denser jittered grid, forms chosen per province and moisture, coloured flower patches, nearest-first so the
 * instance cap always keeps what is around the camera. Same eligibility rules as the classic scatter (dry, gentle, outside buildings). */
export type FloorSite={cover:number;edge:number;soil:number;slope:number};
const NO_SITE:FloorSite={cover:0,edge:0,soil:.8,slope:0};
export function painterForm(kind:ProvinceKind,r:number,bank:boolean,moisture:number,site:FloorSite=NO_SITE):DressingPoint['kind']{
 const pick=(table:[DressingPoint['kind'],number][])=>{let t=0;for(const [,w] of table)t+=w;let v=r*t;for(const [k,w] of table){v-=w;if(v<0)return k;}return table[0][0];};
 if(bank&&(kind==='wetland'||moisture>.6))return pick([['cattail',3],['reeds',4],['tallgrass',2],['grass',1]]);
 if(site.soil<.22)return pick([['pebbles',30],['rocks',12],['cushion',kind==='alpine'?14:4],['drygrass',16],['grass',8],['bush',2]]);
 if(site.cover>.3){ // under canopy: a forest floor of ferns, moss, fungi and deadwood, drier kinds keep grass and bushes
  const dry=kind==='dry-scrub'||kind==='arid',wet=moisture>.45&&!dry;
  return dry?pick([['drygrass',24],['bush',12],['deadwood',10],['pebbles',14],['rocks',6],['stump',2],['sapling',3]]):pick([['fern',22],['bracken',wet?12:3],['moss',wet?2:0],['mushroom',wet?8:3],['deadwood',7],['log',3.6],['stump',2.4],['grass',8],['bush',5],['sapling',11],['pinelet',kind==='conifer-forest'||kind==='alpine'?14:4],['rocks',3]]);
 }
 if(site.cover>.07||site.edge>.25)return kind==='dry-scrub'||kind==='arid'?pick([['bush',14],['drygrass',22],['pebbles',10],['rocks',4]]):pick([['bush',15],['tallgrass',16],['bracken',moisture>.45?9:3],['flowers',10],['grass',24],['fern',8],['stump',1.5],['sapling',7],['rocks',2]]);
 switch(kind){
  case 'meadow':return pick([['grass',50],['tallgrass',14],['flowers',22],['shrub',3],['pebbles',3],['rocks',1.2]]);
  case 'mixed-woodland':return pick([['grass',36],['fern',22],['shrub',12],['tallgrass',8],['flowers',6],['log',2.4],['rocks',2.6],['pebbles',3]]);
  case 'conifer-forest':return pick([['fern',24],['grass',24],['shrub',7],['log',3.4],['rocks',5],['pebbles',4]]);
  case 'alpine':return pick([['pebbles',30],['rocks',14],['cushion',12],['grass',22],['tallgrass',6],['flowers',5]]);
  case 'wetland':return pick([['tallgrass',26],['grass',22],['flowers',9],['reeds',10],['cattail',9],['fern',6]]);
  case 'dry-scrub':return pick([['scrub',26],['drygrass',22],['tallgrass',10],['pebbles',16],['rocks',7],['agave',4],['grass',10],['shrub',5]]);
  case 'arid':return pick([['pebbles',34],['scrub',20],['rocks',14],['agave',9],['drygrass',9]]);
  default:return pick([['grass',38],['shrub',16],['flowers',12],['fern',8],['tallgrass',12],['pebbles',5],['rocks',2]]);
 }
}
function painterCandidates(game:BiomeSceneGame,grid:EcologicalProvinceGrid,camera:{x:number;z:number},floor?:{cover:(x:number,z:number)=>number}){
 const rules=BIOME_SCENE_RULES,cell=rules.painterCellMetres,cx=Math.floor(camera.x/cell),cz=Math.floor(camera.z/cell),radius=Math.ceil(rules.dressingRadiusMetres/cell),points:DressingPoint[]=[];
 for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
  const ix=cx+dx,iz=cz+dz,x=(ix+.12+hash(ix,iz,game.state.seed,7)*.76)*cell,z=(iz+.12+hash(ix,iz,game.state.seed,61)*.76)*cell,d=Math.hypot(x-camera.x,z-camera.z);
  if(d>rules.dressingRadiusMetres||!game.exploredAt(x,z))continue;
  // geology: boulders and rubble lie where scree aprons run out below cliffs (even on grades too steep for grass dressing), in the local rock's colour
  const geo=peekGeology(game.world as never),gq=geo?geo.rockAt(x,z):null,allowed=dressingGroundAllowed(game,x,z);
  if(gq&&gq.scree>.3&&hash(ix,iz,game.state.seed,521)<gq.scree*.62&&screeGroundAllowed(game,x,z)){
   points.push({x,y:game.height(x,z)-.06,z,kind:'rocks',scale:.9+hash(ix,iz,game.state.seed,533)*1.5*(.5+gq.scree*.6),tone:.3,hue:hash(ix,iz,game.state.seed,541),rockTint:gq.tint,steep:true});continue;
  }
  if(!allowed)continue;
  const profile=provinceAt(grid,x,z),art=BIOME_SURFACE_PROFILES[profile.kind],cond=ecologicalConditionsAt(grid,x,z);
  // density falls with distance so the far ring thins out instead of ending on a hard line
  let site:FloorSite=NO_SITE;
  if(floor){const cover=floor.cover(x,z),around=[floor.cover(x+9,z),floor.cover(x-9,z),floor.cover(x,z+9),floor.cover(x,z-9)];
   site={cover,edge:Math.max(...around,cover)-Math.min(...around,cover),soil:gq?Math.max(0,Math.min(1,gq.soil)):Math.max(0,Math.min(1,cond.soil)),slope:0};}
  const density=Math.min(1,art.dressingDensity*(site.cover>.3?1.75:1.1))*(1-.55*Math.pow(d/rules.dressingRadiusMetres,2))*(floor?.35+.65*Math.min(1,site.soil*1.4):1);
  if(hash(ix,iz,game.state.seed,103)>density)continue;
  let bank=false;
  if(cond.moisture>.45)for(const [ax,az] of [[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,-.7]]){const px=x+ax*rules.bankSearchMetres*.6,pz=z+az*rules.bankSearchMetres*.6;if(game.height(px,pz)<game.waterAt(px,pz)+.12){bank=true;break;}}
  const patch=hash(Math.floor(x/11),Math.floor(z/11),game.state.seed,977);
  const form=painterForm(profile.kind,hash(ix,iz,game.state.seed,157),bank,cond.moisture,site);
  points.push({x,y:game.height(x,z),z,kind:form,rockTint:gq&&(form==='rocks'||form==='pebbles')?gq.tint:undefined,scale:.72+hash(ix,iz,game.state.seed,211)*.5,tone:Math.pow(Math.max(0,Math.min(1,.95-cond.moisture*1.5+(hash(ix,iz,game.state.seed,331)-.5)*.3)),1.4),hue:patch*.82+hash(ix,iz,game.state.seed,401)*.18});
 }
 return points.sort((a,b)=>Math.hypot(a.x-camera.x,a.z-camera.z)-Math.hypot(b.x-camera.x,b.z-camera.z)).slice(0,rules.painterMaxCandidates);
}
export function biomeDressingCandidates(game:BiomeSceneGame,grid:EcologicalProvinceGrid,camera:{x:number;z:number},quality:VegetationContext['quality'],style:VegetationStyle='classic',floor?:{cover:(x:number,z:number)=>number}){
 if(quality==='low')return [];
 if(style==='painterly')return painterCandidates(game,grid,camera,floor);
 const rules=BIOME_SCENE_RULES,cell=rules.dressingCellMetres,cx=Math.floor(camera.x/cell),cz=Math.floor(camera.z/cell),radius=Math.ceil(rules.dressingRadiusMetres/cell),points:DressingPoint[]=[];
 for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
  if(points.length>=rules.dressingMaxCandidates)return points;
  const ix=cx+dx,iz=cz+dz,x=(ix+.16+hash(ix,iz,game.state.seed)*.68)*cell,z=(iz+.16+hash(ix,iz,game.state.seed,59)*.68)*cell;
  if(Math.hypot(x-camera.x,z-camera.z)>rules.dressingRadiusMetres||!game.exploredAt(x,z)||!dressingGroundAllowed(game,x,z))continue;
  const profile=provinceAt(grid,x,z),art=BIOME_SURFACE_PROFILES[profile.kind];if(hash(ix,iz,game.state.seed,103)>art.dressingDensity)continue;
  let bank=false;
  if(profile.kind==='wetland')for(const [ax,az] of [[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,-.7]]){
   const px=x+ax*rules.bankSearchMetres,pz=z+az*rules.bankSearchMetres;if(game.height(px,pz)<game.waterAt(px,pz)+.12){bank=true;break;}
  }
  points.push({x,y:game.height(x,z),z,kind:dressingForm(profile.kind,hash(ix,iz,game.state.seed,157),bank),scale:.72+hash(ix,iz,game.state.seed,211)*.42});
 }
 return points;
}
/** Canopy cover from the living trees, 6 m cells, smoothed: 0 open ground .. 1 closed canopy. Drives the forest floor (ferns, moss, fungi, deadwood under canopy,
 * grass and flowers in clearings, bushes on the edge). Rebuilt only when the living-tree set changes. */
export class CanopyCover{
 private cells=new Map<number,number>();private key='';readonly cell=6;
 private idx(ix:number,iz:number){return (ix+4096)*8192+(iz+4096);}
 update(trees:readonly {x:number;z:number;amount:number;scale:number;planted?:boolean}[]){
  let alive=0,sum=0;for(const t of trees)if(t.amount>0||t.planted){alive++;sum+=t.x*.37+t.z*.73;}
  const key=`${trees.length}|${alive}|${Math.round(sum)}`;if(key===this.key)return;this.key=key;this.cells.clear();
  const c=this.cell;
  for(const t of trees){if(t.amount<=0&&!t.planted)continue;const r=3.4*t.scale*(t.planted?.5:1),cx=Math.floor(t.x/c),cz=Math.floor(t.z/c),span=Math.ceil(r/c);
   for(let dz=-span;dz<=span;dz++)for(let dx=-span;dx<=span;dx++){const px=(cx+dx+.5)*c,pz=(cz+dz+.5)*c,d=Math.hypot(px-t.x,pz-t.z);if(d>r+c*.5)continue;const k=this.idx(cx+dx,cz+dz);this.cells.set(k,Math.min(1,(this.cells.get(k)??0)+(1-Math.max(0,d-r*.4)/(r+c*.6))*.55));}}
 }
 cover=(x:number,z:number)=>{const ix=Math.floor(x/this.cell),iz=Math.floor(z/this.cell);let s=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)s+=(this.cells.get(this.idx(ix+dx,iz+dz))??0)*(dx||dz?.7:1.6);return Math.min(1,s/4.4);};
}
/** Where a tree grows, as the botanical forest reads it: ecological moisture and temperature, slope, soil depth (geology when the map has it: thin soil and scree
 * stunt and thin the stand), aspect and distance to water. */
export function treeSiteAt(game:BiomeSceneGame,grid:EcologicalProvinceGrid,x:number,z:number):TreeSite{
 const cond=ecologicalConditionsAt(grid,x,z),gx=(game.height(x+3,z)-game.height(x-3,z))/6,gz=(game.height(x,z+3)-game.height(x,z-3))/6,slope=Math.hypot(gx,gz),geo=peekGeology(game.world as never),gq=geo?geo.rockAt(x,z):null;
 const soil=gq?Math.max(0,Math.min(1,gq.soil*(1-.7*gq.scree))):Math.max(0,Math.min(1,cond.soil));
 // aspect: slopes facing the sun (south, +z in this world) bake dry; the far side stays cool and damp
 const aspect=slope>.02?Math.max(-1,Math.min(1,gz/Math.max(slope,.05)*Math.min(1,slope*4)*-1)):0;
 return {moisture:cond.moisture,temp:cond.temperatureOffsetCelsius,slope,soil,aspect,waterDist:cond.freshwaterDistanceMeters};
}
function toBaseForm(f:string):BaseForm{return (f==='broadleaf'||f==='conifer'||f==='willow'||f==='acacia'||f==='palm'||f==='stunted'||f==='scrub'?f:'broadleaf') as BaseForm;}
/** Drop-in integration layer, not automatically mounted by importing it.
 * Construct/dispose on WorldView rebuild; sync at normal render cadence. */
export class BiomeSceneLayer {
 private grid:EcologicalProvinceGrid;private trees:BiomeVegetation|BotanicalForest;private dressing:BiomeDressing;private treeSet:TreeSet;private canopy=new CanopyCover();
 private treeIn=0;private dressingIn=0;private lastQuality='';
 private style:VegetationStyle;
 constructor(scene:THREE.Scene,game:BiomeSceneGame,grid:EcologicalProvinceGrid,style:VegetationStyle='classic',treeSet:TreeSet=loadTreeSet()){
  this.grid=grid;this.style=style;this.treeSet=treeSet;const seed=game.state.seed,profileAt=(x:number,z:number)=>provinceAt(grid,x,z);
  if(style==='painterly'&&treeSet==='botanical'){const w=game.world.mapgen?.wind,wl=w?Math.hypot(w.x,w.z)||1:0;
   this.trees=new BotanicalForest(scene,{seed,siteAt:(x,z)=>treeSiteAt(game,grid,x,z),baseFormAt:(id,x,z)=>{const p=profileAt(x,z);return {base:toBaseForm(resourceTreeForm(id,p,seed)),kind:p.kind};},wind:w?[w.x/wl,w.z/wl]:undefined,
    nearMetres:BIOME_VEGETATION_RULES.nearMetres,farMetres:BIOME_VEGETATION_RULES.farMetres,lowFarMetres:BIOME_VEGETATION_RULES.lowFarMetres,stumpHeightScale:BIOME_VEGETATION_RULES.stumpHeightScale});}
  else this.trees=new BiomeVegetation(scene,seed,profileAt,1,style);
  this.dressing=new BiomeDressing(scene,style,treeSet);
 }
 setTime(t:number){this.trees.setTime(t);this.dressing.setTime(t);}
 setSun(dir:THREE.Vector3,strength:number,realShadows=false){this.trees.setSun(dir,strength,realShadows);}
 sync(game:BiomeSceneGame,camera:{x:number;z:number},quality:VegetationContext['quality'],dt:number){
  this.treeIn-=Math.max(0,dt);this.dressingIn-=Math.max(0,dt);const changed=quality!==this.lastQuality;this.lastQuality=quality;
  let treeReport:ReturnType<BiomeVegetation['sync']>|undefined,dressingCount:number|undefined;
  const context:VegetationContext={quality,camera,known:(x,z)=>game.exploredAt(x,z),marked:id=>game.chopMarks?.has(id)??false,...game.seasonMix()};
  if(this.treeIn<=0||changed){treeReport=this.trees.sync(game.state.trees,context);this.treeIn=BIOME_SCENE_RULES.treeRefreshSeconds;}
  if(this.dressingIn<=0||changed){let floor:{cover:(x:number,z:number)=>number}|undefined;if(this.style==='painterly'&&this.treeSet==='botanical'){this.canopy.update(game.state.trees);floor=this.canopy;}
   const points=biomeDressingCandidates(game,this.grid,camera,quality,this.style,floor);dressingCount=this.dressing.sync(points,context,(x,z)=>dressingGroundAllowed(game,x,z));this.dressingIn=BIOME_SCENE_RULES.dressingRefreshSeconds;}
  return {treeReport,dressingCount};
 }
 pickingSources(){return this.trees.pickingSources();}
 dispose(){this.trees.dispose();this.dressing.dispose();}
}
