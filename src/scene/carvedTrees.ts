/** Option H carved trees and vegetation as pure specs (no three.js). Four
 * species silhouettes with rounded "lollipop" crowns, seeded structural
 * variants, three LOD tiers plus an impostor card, and instance transforms.
 * Geometry is shared per species x variant x LOD (VARIANTS_PER_SPECIES^1 per
 * species), so a forest of 1,000 trees is ~50 instanced draws, not 1,000.
 *
 * Species references: broadleaf = English/Atlantic oak and field maple (short
 * bole, wide domed crown); conifer = Scots pine / Norway spruce stacks;
 * cypress = Mediterranean Cupressus sempervirens (narrow flame); shrub =
 * hawthorn / juniper hedge-scrub (low rounded mounds, no bole).
 * Built from the same Part shapes as buildings, so carvedMesh.ts builds them
 * and tests measure them. Nothing here was rendered. */
import {far,hashSeed,part,partBounds,seededRandom,specBounds,specTriangles,floatingParts,range,type BuildingSpec,type Part,type RenderTier} from './buildingParts';
import type {Habitat} from './buildingStyleMap';
import type {CarvedMaterialId} from './carvedPalette';

export type TreeSpecies='broadleaf'|'conifer'|'cypress'|'shrub';
export const TREE_SPECIES:readonly TreeSpecies[]=['broadleaf','conifer','cypress','shrub'];
export const VARIANTS_PER_SPECIES=4;
/** Tree LOD distances in metres (trees are numerous, so they drop sooner than buildings). */
export const TREE_LOD_DISTANCES=[25,60,110] as const;
export function treeTierForDistance(m:number):RenderTier{return m<TREE_LOD_DISTANCES[0]?0:m<TREE_LOD_DISTANCES[1]?1:m<TREE_LOD_DISTANCES[2]?2:3;}
export const TREE_IMPOSTOR_TRIANGLES=4; // crossed quads

const REFERENCE:Record<TreeSpecies,string>={
 broadleaf:'Atlantic oak / field maple: short bole, wide domed crown of clustered lobes',
 conifer:'Scots pine / Norway spruce: straight bole, stacked tapering whorls',
 cypress:'Mediterranean cypress: narrow flame-shaped column, short bole',
 shrub:'Hawthorn and juniper scrub: low rounded mounds, no bole'};
const sph=(mat:CarvedMaterialId,d:number,h:number,x:number,y:number,z:number,lod:0|1|2):Part=>part('sphere',mat,[d,h,d],[x,y,z],lod);

/** One structural variant of a species. Same (species, variant) always gives the same parts. */
export function treeSpec(species:TreeSpecies,variant:number):BuildingSpec{
 const v=((variant%VARIANTS_PER_SPECIES)+VARIANTS_PER_SPECIES)%VARIANTS_PER_SPECIES,r=seededRandom(hashSeed('tree',species,v)),parts:Part[]=[];
 let half=1.6;
 if(species==='broadleaf'){
  const bole=range(r,1.4,2.2),crown=range(r,3,3.9),ch=crown*range(r,.72,.86),td=range(r,.3,.4);half=crown/2+.9;
  parts.push(part('cylinder','trunk',[td*1.5,.35,td*1.4],[0,0,0],0,undefined,6),part('cylinder','trunk',[td,bole+.2,td*.7],[0,0,0],2,undefined,5));
  // Main lobe sits on the bole; satellites overlap it so the crown reads as one lollipop mass.
  const top=bole-.15;parts.push(sph('foliage',crown,ch,0,top,0,1),far(part('cone','foliage',[crown,ch*.9,crown],[0,top,0],2,undefined,8)));
  const lobes=2+(v%3);for(let i=0;i<lobes;i++){const a=i/lobes*Math.PI*2+range(r,0,1),rad=crown*range(r,.28,.34),sd=crown*range(r,.52,.62);
   parts.push(sph(i%2?'foliageDark':'foliage',sd,sd*.8,Math.cos(a)*rad,top+ch*range(r,.15,.35),Math.sin(a)*rad,0));}
  parts.push(part('cylinder','trunk',[td*.45,bole*.5,td*.4],[td*.5,bole*.4,0],0,[0,0,-.7],5)); // limb
 }else if(species==='conifer'){
  const bole=range(r,.9,1.5),tiers=3+(v%2),base=range(r,2.2,3),td=range(r,.28,.36),h0=range(r,1.5,2);half=base/2+.6;
  parts.push(part('cylinder','trunk',[td,bole+h0*.6,td*.6],[0,0,0],2,undefined,5));
  for(let i=0;i<tiers;i++){const k=1-i*.24,d=base*k,y=bole+i*h0*.62,mat:CarvedMaterialId=i%2?'foliage':'foliageDark';
   // Whorls are rounded cones; the far tier keeps only the lowest and the top.
   parts.push(part('cone',mat,[d,h0*range(r,1.05,1.25),d],[0,y,0],i<=1?1:0,undefined,8));}
  // Drooping skirt: a wide shallow lower whorl so spruce/pine read as layered boughs rather than stacked party hats (mid + near only).
  parts.push(part('cone','foliageDark',[base*1.18,h0*.55,base*1.18],[0,bole-.08,0],1,undefined,8));
  parts.push(far(part('cone','foliageDark',[base,(tiers-1)*h0*.62+h0*1.1,base*.9],[0,bole,0],2,undefined,8)));
 }else if(species==='cypress'){
  const h=range(r,4.6,6.4),w=range(r,1.1,1.5),bole=.6;half=w/2+.5;
  parts.push(part('cylinder','trunk',[.28,bole+.4,.2],[0,0,0],2,undefined,5));
  parts.push(part('sphere',v%2?'foliageDark':'foliage',[w,h,w],[0,bole,0],1),far(part('cone','foliageDark',[w,h,w],[0,bole,0],2,undefined,6)));
  parts.push(sph('foliage',w*.8,h*.45,w*.1,bole+h*.5,0,0));
  parts.push(part('cone','foliageDark',[w*.5,h*.22,w*.5],[0,bole+h*.88,0],1,undefined,6));
 }else{
  const n=2+(v%3),d=range(r,.9,1.3);half=d*1.2;
  parts.push(sph('foliageDark',d,d*.75,0,0,0,1),far(part('cone','foliageDark',[d*1.1,d*.75,d*1.1],[0,0,0],2,undefined,6)));
  for(let i=1;i<n;i++){const a=i/n*Math.PI*2+range(r,0,1);parts.push(sph(i%2?'foliage':'foliageDark',d*range(r,.6,.85),d*.5,Math.cos(a)*d*.5,0,Math.sin(a)*d*.5,0));}
 }
 const size=Math.min(2*half,6);
 return {family:'tree:'+species,variantKey:`tree|${species}|${v}`,footprint:{w:size,d:size},parts,notes:{reference:REFERENCE[species]}};
}
/** Crossed-quad impostor beyond the last LOD distance (2 quads = 4 triangles). */
export function treeImpostor(spec:BuildingSpec){
 const b=specBounds(spec);return {width:Math.max(b.maxX-b.minX,b.maxZ-b.minZ),height:b.maxY,crownBase:Math.min(b.maxY*.3,1.6),colour:spec.family.endsWith('conifer')||spec.family.endsWith('cypress')?'foliageDark':'foliage' as CarvedMaterialId};
}

export type Season='spring'|'summer'|'autumn'|'winter';
export type TreeInput={worldSeed:number;id:number;habitat?:Habitat;/** wetness 0..1 from Grok's biome map, when known */moisture?:number;season?:Season;/** 0..1 age/growth from simulation, default mature */growth?:number};
export type TreeInstance={species:TreeSpecies;variant:number;key:string;scale:number;yaw:number;lean:[number,number];tint:[number,number,number];visibleCrown:boolean};
/** Species weights per habitat (sum 1). Hot/dry favours cypress and shrub, cold conifer. */
export function speciesMix(habitat:Habitat='plains',moisture=.5):Record<TreeSpecies,number>{
 const m:Record<Habitat,[number,number,number,number]>={plains:[.62,.08,.04,.26],forest:[.5,.38,.0,.12],hills:[.22,.44,.04,.30],desert:[.0,.0,.34,.66],tundra:[.04,.74,0,.22],wetland:[.7,.1,0,.2]};
 let [b,c,y,s]=m[habitat];const wet=(moisture-.5)*.2;b=Math.max(0,b+wet);s=Math.max(0,s-wet);const t=b+c+y+s;
 return {broadleaf:b/t,conifer:c/t,cypress:y/t,shrub:s/t};
}
/** Foliage tint multiplier by season (deciduous only turns; evergreens stay). */
export function seasonTint(species:TreeSpecies,season:Season='summer',shade=0):[number,number,number]{
 const s=.94+shade*.06,evergreen=species==='conifer'||species==='cypress';
 if(evergreen||season==='summer')return [s,s,s];
 if(season==='spring')return [s*1.02,s*1.06,s*.92];
 if(season==='autumn')return [s*1.32,s*.86,s*.62];
 return [s*.9,s*.82,s*.78];
}
/** Deterministic placement variation; geometry stays shared via `key`. */
export function treeInstance(i:TreeInput):TreeInstance{
 const h=hashSeed(i.worldSeed,'treeinst',i.id),f=(k:number)=>((h>>>(k*5))&255)/255,mix=speciesMix(i.habitat,i.moisture);
 let acc=0,pick:TreeSpecies=TREE_SPECIES.reduce((a,b)=>mix[b]>mix[a]?b:a);const u=f(0);for(const sp of TREE_SPECIES){acc+=mix[sp];if(u<acc){pick=sp;break;}}
 const variant=Math.floor(f(1)*VARIANTS_PER_SPECIES)%VARIANTS_PER_SPECIES,growth=Math.max(.35,Math.min(1,i.growth??1));
 const scale=(.82+f(2)*.4)*(.5+.5*growth),lean=(pick==='shrub'?0:.05);
 return {species:pick,variant,key:`tree|${pick}|${variant}`,scale:Math.round(scale*100)/100,yaw:f(3)*Math.PI*2,lean:[(f(4)-.5)*lean,(f(5)-.5)*lean],
  tint:seasonTint(pick,i.season,f(6)),visibleCrown:!(pick==='broadleaf'&&i.season==='winter')};
}

export type TreeBudget={trees:number;triangles:number;drawCalls:number;residentGeometryBytes:number;perTier:[number,number,number,number];trianglesPerTree:number};
/** Estimate per N trees given the fraction at near/mid/far/impostor (default: a typical
 * third-person RTS view where most trees are mid-to-far). ESTIMATE, unmeasured. */
export function treeBudget(count=1000,mix:Record<TreeSpecies,number>={broadleaf:.45,conifer:.3,cypress:.05,shrub:.2},tiers:[number,number,number,number]=[.05,.2,.4,.35]):TreeBudget{
 let tris=0;const buckets=new Set<string>();let bytes=0;
 for(const sp of TREE_SPECIES){const share=mix[sp];if(!share)continue;
  for(let v=0;v<VARIANTS_PER_SPECIES;v++){const spec=treeSpec(sp,v);
   for(const t of[0,1,2] as const){const n=specTriangles(spec,t),per=count*share*tiers[t]/VARIANTS_PER_SPECIES;tris+=n*per;if(per>=.5){buckets.add(`${sp}${v}#${t}`);}bytes+=n*3*48;}}
  tris+=TREE_IMPOSTOR_TRIANGLES*count*share*tiers[3];if(tiers[3]>0)buckets.add(sp+'#card');}
 return {trees:count,triangles:Math.round(tris),drawCalls:buckets.size,residentGeometryBytes:bytes,perTier:tiers.map(t=>Math.round(t*count)) as [number,number,number,number],trianglesPerTree:Math.round(tris/count)};
}
export {floatingParts,partBounds};
