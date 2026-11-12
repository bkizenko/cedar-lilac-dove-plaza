import {PROVINCE_KINDS,provinceAt,type EcologicalProvinceGrid,type ProvinceKind} from './ecologicalProvinces';
import {PLOT_TOPOGRAPHY_RULES,surveyFieldTopography} from './plotTopography';
/** Terrain-to-building grounding contract (W-World → A-Experience renderer).
 * Pure and read-only: never edits terrain, never flattens, never advances work.
 * Units: metres, world XZ coordinates, heights in world Y, grade = rise/run.
 * Footprint is axis-aligned at (x,z) with width w (X) and depth d (Z); an
 * optional rotation (radians about +Y) rotates the sample lattice with it. */
export const SITE_SAMPLE_RULES={version:1,sampleSpacingMetres:PLOT_TOPOGRAPHY_RULES.sampleSpacingMeters,maximumSamplesPerAxis:24,dryClearanceMetres:PLOT_TOPOGRAPHY_RULES.dryClearanceMeters} as const;
export type SiteGround={height(x:number,z:number):number;waterAt(x:number,z:number):number;world?:{ecology?:EcologicalProvinceGrid}};
export type SiteFootprint={x:number;z:number;w:number;d:number;rotation?:number};
export type SiteSample={
 version:1;
 /** Row-major (columns along local X, rows along local Z) terrain heights at the lattice. */
 columns:number;rows:number;heights:Float32Array;
 minHeightMetres:number;maxHeightMetres:number;meanHeightMetres:number;heightRangeMetres:number;
 /** Steepest sampled grade inside the footprint and the mean downhill direction (radians, atan2(x,z)). */
 maxGrade:number;meanGrade:number;downhillRadians:number;
 /** Fraction of lattice points below water + dry clearance; any >0 means the base touches water. */
 wetFraction:number;minimumDryClearanceMetres:number;
 /** Province at the centre and the share of lattice points per province kind. */
 biome:ProvinceKind|null;biomeShares:Partial<Record<ProvinceKind,number>>;
 /** Depth from the highest to the lowest ground corner: the visible foundation/plinth a level floor
  * at maxHeight needs on the downhill side. Rendering only; it is not a terrain edit. */
 foundationDepthMetres:number;
};
export function sampleSite(ground:SiteGround,f:SiteFootprint):SiteSample{
 const R=SITE_SAMPLE_RULES,columns=Math.min(R.maximumSamplesPerAxis,Math.max(1,Math.ceil(f.w/R.sampleSpacingMetres)))+1,rows=Math.min(R.maximumSamplesPerAxis,Math.max(1,Math.ceil(f.d/R.sampleSpacingMetres)))+1;
 const c=Math.cos(f.rotation??0),s=Math.sin(f.rotation??0),heights=new Float32Array(columns*rows),shares:Partial<Record<ProvinceKind,number>>={};
 let min=Infinity,max=-Infinity,sum=0,wet=0,dry=Infinity;
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
  const lx=(i/(columns-1)-.5)*f.w,lz=(j/(rows-1)-.5)*f.d,x=f.x+lx*c+lz*s,z=f.z-lx*s+lz*c,h=ground.height(x,z),clearance=h-ground.waterAt(x,z);
  heights[j*columns+i]=h;min=Math.min(min,h);max=Math.max(max,h);sum+=h;dry=Math.min(dry,clearance);if(clearance<R.dryClearanceMetres)wet++;
  const grid=ground.world?.ecology;if(grid){const k=provinceAt(grid,x,z).kind;shares[k]=(shares[k]||0)+1;}
 }
 const n=columns*rows;for(const k of PROVINCE_KINDS)if(shares[k])shares[k]=shares[k]!/n;
 // Grade uses the same in-footprint survey as field placement so a cliff
 // beyond the edge does not make a level site look steep.
 const local=(rotation:number)=>rotation?{height:(x:number,z:number)=>{const dx=x-f.x,dz=z-f.z;return ground.height(f.x+dx*c+dz*s,f.z-dx*s+dz*c);},waterAt:(x:number,z:number)=>{const dx=x-f.x,dz=z-f.z;return ground.waterAt(f.x+dx*c+dz*s,f.z-dx*s+dz*c);}}:ground;
 const survey=surveyFieldTopography(local(f.rotation??0),{x:f.x,z:f.z,w:f.w,d:f.d});
 const lgx=survey.meanGradientX,lgz=survey.meanGradientZ,gx=lgx*c+lgz*s,gz=-lgx*s+lgz*c;
 const grid=ground.world?.ecology;
 return {version:1,columns,rows,heights,minHeightMetres:min,maxHeightMetres:max,meanHeightMetres:sum/n,heightRangeMetres:max-min,
  maxGrade:survey.maxGrade,meanGrade:Math.hypot(gx,gz),downhillRadians:Math.atan2(-gx,-gz),wetFraction:wet/n,minimumDryClearanceMetres:dry,
  biome:grid?provinceAt(grid,f.x,f.z).kind:null,biomeShares:shares,foundationDepthMetres:max-min};
}
