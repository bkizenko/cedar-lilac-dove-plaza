import * as THREE from 'three';
import {provinceAt,ecologicalConditionsAt,PROVINCE_KINDS,type EcologicalProvinceGrid,type ProvinceKind} from '../game/ecologicalProvinces';
import {BiomeVegetation,BiomeDressing,type ResourceTree,type DressingPoint,type VegetationContext} from './biomeVegetation';
import type {DressingForm} from './vegetationKit';
/** Read-only adapter contract. Integrator can pass Game directly after the
 * versioned ecology grid is attached to its generated world. */
export type BiomeSceneGame={chopMarks?:ReadonlySet<number>;world:{size:number};state:{seed:number;trees:ResourceTree[];buildings:{hp:number;x:number;z:number;w:number;d:number}[]};
 height:(x:number,z:number)=>number;waterAt:(x:number,z:number)=>number;exploredAt:(x:number,z:number)=>boolean;
 seasonMix:()=>{winter:number;autumn:number;snow:number}};
export const BIOME_SCENE_RULES={treeRefreshSeconds:.1,dressingRefreshSeconds:.5,dressingCellMetres:6,dressingRadiusMetres:65,
 dressingMaxCandidates:1024,dryClearanceMetres:.3,maximumDressingGrade:.65,bankSearchMetres:11,buildingMarginMetres:.7} as const;
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
export function biomeDressingCandidates(game:BiomeSceneGame,grid:EcologicalProvinceGrid,camera:{x:number;z:number},quality:VegetationContext['quality']){
 if(quality==='low')return [];
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
/** Drop-in integration layer, not automatically mounted by importing it.
 * Construct/dispose on WorldView rebuild; sync at normal render cadence. */
export class BiomeSceneLayer {
 private grid:EcologicalProvinceGrid;private trees:BiomeVegetation;private dressing:BiomeDressing;
 private treeIn=0;private dressingIn=0;private lastQuality='';
 constructor(scene:THREE.Scene,game:BiomeSceneGame,grid:EcologicalProvinceGrid){this.grid=grid;this.trees=new BiomeVegetation(scene,game.state.seed,(x,z)=>provinceAt(grid,x,z));this.dressing=new BiomeDressing(scene);}
 sync(game:BiomeSceneGame,camera:{x:number;z:number},quality:VegetationContext['quality'],dt:number){
  this.treeIn-=Math.max(0,dt);this.dressingIn-=Math.max(0,dt);const changed=quality!==this.lastQuality;this.lastQuality=quality;
  let treeReport:ReturnType<BiomeVegetation['sync']>|undefined,dressingCount:number|undefined;
  const context:VegetationContext={quality,camera,known:(x,z)=>game.exploredAt(x,z),marked:id=>game.chopMarks?.has(id)??false,...game.seasonMix()};
  if(this.treeIn<=0||changed){treeReport=this.trees.sync(game.state.trees,context);this.treeIn=BIOME_SCENE_RULES.treeRefreshSeconds;}
  if(this.dressingIn<=0||changed){const points=biomeDressingCandidates(game,this.grid,camera,quality);dressingCount=this.dressing.sync(points,context,(x,z)=>dressingGroundAllowed(game,x,z));this.dressingIn=BIOME_SCENE_RULES.dressingRefreshSeconds;}
  return {treeReport,dressingCount};
 }
 pickingSources(){return this.trees.pickingSources();}
 dispose(){this.trees.dispose();this.dressing.dispose();}
}
