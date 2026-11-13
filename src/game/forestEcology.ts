/** Forest ecology: stands instead of salt-and-pepper trees. Pure and deterministic (no Math.random, no Date.now, no three.js).
 *
 * Model (design values, see docs/FOREST_ECOLOGY.md):
 *  1. Niche. Every species has a tolerance trapezoid per site factor (temperature, moisture, soil depth, acidity, slope, distance to water, altitude, aspect).
 *     Fitness is the product of the tolerances; each province kind carries a prior table (which species are in play there at all).
 *  2. Continuum. Each species responds on its own to the gradients; trees are sampled per tree from the local suitability weights
 *     (prior x niche x its own correlated patch noise, patch scale 60 to 190 m), so woods are genuinely mixed with local dominance patches and gradual change.
 *     Hard rules only: climate-incompatible species never share a cell (at most the dominant climate group plus one ADJACENT group that is a real contender,
 *     tapering with its fitness ratio) and microsite filters (willow on wet ground, pine on poor soil, beech and oak on deep soil) come from the niche curves.
 *     Shade tolerance: old stands drift to tolerant species, tolerant species keep a suppressed young cohort, light-demanders regenerate in gaps.
 *  3. Disturbance. Glades (open ground), windthrow gaps (small, regenerate to pioneer birch and saplings), a stand age field
 *     (young pioneer stands, even-aged mature stands, old-growth with veterans and standing dead wood).
 *  4. Structure. Age gives size: saplings, young, mature, veterans, with a few percent natural variance inside a stand.
 *     Crown shyness: minimum spacing follows crown width, so broad crowns stand further apart than spires.
 *  5. Hooks. successionAt (cleared land regrows pioneers, then the climax stand), groveSpecies (planted groves are one species),
 *     thinningFactor (village wood-cutting thins stands), understoryBias (forest floor follows the canopy species).
 * Everything below is render/placement guidance; it never creates wood, collision or save state. */
import {BOTANICAL_SPECIES,SPECIES_BY_ID,type BaseForm,type TreeSite} from '../scene/botanicalSpecies';

export const FOREST_ECOLOGY_VERSION=1;
/** Tree site as the stand model reads it: the botanical site plus province kind, altitude above local water (m) and soil acidity (0 calcareous .. 1 acidic). */
export type StandSite=TreeSite&{kind:string;alt:number;acid:number};
export const STAND_RULES={
 /** stand cache cell (m): sites vary slowly (the province grid is 12 m) so one stand decision per cell */
 cellMetres:8,
 /** how strongly niche fitness counts against patch noise */nicheWeight:.85,noiseAmplitude:1.7,
 /** per-species patch noise strength (ln weight = A*(2n-1)): patchiness without monodominant blocks */
 minWeightShare:.02,
 
 gladeScale:90,gladeLo:.64,gladeHi:.8,
 gapCell:56,gapChance:.24,gapRadius:[6,16] as [number,number],
 ageScale:150,
 minSimSize:.55,minFillerSize:.3,
} as const;

// ---------- hashing and noise ----------------------------------------------------------------------------------
function hash(a:number,b:number,seed:number,salt:number){let n=Math.imul(a|0,0x1b873593)^Math.imul(b|0,0x85ebca6b)^Math.imul(seed|0,0xc2b2ae35)^Math.imul(salt|0,0x9e3779b1);n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;}
/** stable unit for (id,seed,salt); the same mixer the botanical forest uses for per-tree variation */
export function unitFor(id:number,seed:number,salt:number){let n=(id^seed^Math.imul(salt,0x9e3779b1))|0;n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;}
function vnoise(x:number,z:number,seed:number,salt:number){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz),a=hash(ix,iz,seed,salt),b=hash(ix+1,iz,seed,salt),c=hash(ix,iz+1,seed,salt),d=hash(ix+1,iz+1,seed,salt);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
/** two octaves, 0..1 (about .5 mean) */
function field(x:number,z:number,scale:number,seed:number,salt:number){return vnoise(x/scale,z/scale,seed,salt)*.72+vnoise(x/(scale*.37)+17.3,z/(scale*.37)-9.1,seed,salt+101)*.28;}
const clamp=(v:number,a=0,b=1)=>v<a?a:v>b?b:v;
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};

// ---------- niche ---------------------------------------------------------------------------------------------
type Trap=readonly [number,number,number,number];
type Niche={T?:Trap;M?:Trap;S?:Trap;A?:Trap;Sl?:Trap;W?:Trap;Alt?:Trap;Asp?:Trap};
const trap=(v:number,t:Trap)=>{const [a,b,c,d]=t;if(v<=a||v>=d)return v>=b&&v<=c?1:0;return v<b?(v-a)/(b-a):v<=c?1:(d-v)/(d-c);};
const NICHE_FLOOR=.03;
const ANY:Trap=[-99,-98,98,99];
/** Niche per species (design values from general silvics; see docs/FOREST_ECOLOGY.md). T: temperature offset from the temperate norm (C), M: moisture 0..1, S: soil depth 0..1,
 * A: acidity 0 (limestone) .. 1 (granite, sandstone, sand), Sl: slope (rise/run), W: distance to fresh water (m), Alt: metres above local water, Asp: -1 shaded .. +1 sun-baked. */
export const SPECIES_NICHE:Record<string,Niche>={
 oak:{T:[-5,-2,5,8],M:[.22,.38,.72,.92],S:[.25,.5,1,1],A:[-.1,0,.75,1.1],Sl:[-1,0,.25,.6],Alt:[-1,0,60,115]},
 beech:{T:[-5,-2,3,6],M:[.4,.55,.85,1.1],S:[.3,.55,1,1],A:[-.1,0,.8,1.1],Sl:[-1,0,.35,.75],Alt:[-1,0,70,115],Asp:[-1.1,-.6,.3,1.1]},
 birch:{T:[-10,-8,6,8.5],M:[.1,.3,.85,1.1],S:[-.1,0,1,1.1],A:[-.1,.15,1,1.1],Sl:[-1,0,.5,.95]},
 maple:{T:[-4,-1,4,7],M:[.3,.45,.78,.95],S:[.3,.5,1,1.1],A:[-.1,0,.6,1],Sl:[-1,0,.3,.7],Alt:[-1,0,60,115]},
 poplar:{T:[-6,-3,5,7.5],M:[.45,.62,1,1.1],S:[.2,.45,1,1.1],W:[-1,0,45,130]},
 willow:{T:[-7,-4,5,8],M:[.5,.68,1,1.1],S:[-.1,0,1,1.1],W:[-1,0,30,95]},
 hawthorn:{T:[-6,-3,5,8],M:[.15,.3,.7,.95],S:[.15,.3,1,1.1],A:[-.1,0,.6,1],Sl:[-1,0,.5,.9]},
 scotsPine:{T:[-9,-6,5,7.5],M:[.08,.2,.62,.88],S:[-.1,0,.55,.95],A:[-.1,.3,1,1.1],Alt:[-1,0,95,115]},
 stonePine:{T:[0,2.5,7,9],M:[.08,.2,.55,.8],S:[.1,.3,1,1.1],A:[-.1,.2,1,1.1]},
 spruce:{T:[-11,-9,1.5,4.5],M:[.4,.55,1,1.1],S:[.2,.4,1,1.1],A:[-.1,.4,1,1.1],Alt:[-1,5,115,120]},
 fir:{T:[-9,-6,1.5,4.5],M:[.5,.65,1,1.1],S:[.35,.55,1,1.1],A:[-.1,0,.85,1.1],Asp:[-1.1,-.7,.2,1.1],Sl:[-1,0,.5,.9]},
 cedar:{T:[-1,1.5,6,8],M:[.15,.3,.65,.85],S:[.1,.3,1,1.1],A:[-.1,0,.5,1],Sl:[.05,.18,.7,.95]},
 cypress:{T:[0,2,7,9],M:[.1,.2,.6,.8],S:[.05,.2,1,1.1],A:[-.1,0,.5,1]},
 juniper:{T:[-10,-7,7,9],M:[-.1,0,.5,.8],S:[-.1,0,.6,1],A:[-.1,0,.6,1.1]},
 krummholz:{T:[-14,-12,-4,0],Alt:[55,80,125,130]},
 coconutPalm:{T:[2,4,7,9],M:[.4,.55,1,1.1],W:[-1,0,70,220]},
 datePalm:{T:[1,3,7,9],M:[-.1,0,.42,.7],W:[-1,0,60,400]},
 acacia:{T:[1,3,7,9],M:[-.1,.05,.45,.7],S:[.05,.2,.9,1.1]},
 baobab:{T:[3,5,7,9],M:[-.1,.05,.35,.6],S:[.2,.4,1,1.1]},
 mangrove:{T:[2,4,7,9],M:[.6,.8,1,1.1],W:[-1,0,15,50],Alt:[-5,-1,3,12]},
 tamarisk:{T:[0,2,7,9],M:[-.1,0,.45,.7],W:[-1,0,50,160]},
 olive:{T:[0,2,7,9],M:[.1,.2,.5,.7],S:[.1,.3,.9,1.1],A:[-.1,0,.5,1]},
 eucalyptus:{T:[1,3,7,9],M:[.15,.25,.6,.8],S:[.3,.5,1,1.1],A:[.1,.4,1,1.1]},
};
const FACTORS:[keyof Niche,(s:StandSite)=>number][]=[['T',s=>s.temp],['M',s=>s.moisture],['S',s=>s.soil],['A',s=>s.acid],['Sl',s=>s.slope],['W',s=>s.waterDist],['Alt',s=>s.alt],['Asp',s=>s.aspect]];
/** ln fitness of a species on a site: sum of ln(floor + (1-floor) tolerance) over the factors it declares. */
export function nicheLog(species:string,site:StandSite){
 const n=SPECIES_NICHE[species];if(!n)return -20;let s=0;
 for(const [k,get] of FACTORS){const t=n[k];if(!t)continue;s+=Math.log(NICHE_FLOOR+(1-NICHE_FLOOR)*trap(get(site),t));}
 return s;
}
/** Shade tolerance 0 (needs full light: pioneers, regenerates in gaps) .. 1 (regenerates under closed canopy). Design values from standard silvics. */
export const SHADE_TOLERANCE:Record<string,number>={beech:.9,fir:.85,spruce:.7,maple:.7,hawthorn:.55,cypress:.4,cedar:.35,oak:.35,olive:.4,juniper:.3,stonePine:.25,scotsPine:.2,willow:.2,poplar:.15,birch:.1,acacia:.2,tamarisk:.15,eucalyptus:.25,krummholz:.3,coconutPalm:.5,datePalm:.3,mangrove:.4,baobab:.3};
export const shadeTolerance=(id:string)=>SHADE_TOLERANCE[id]??.4;
export const nicheFitness=(species:string,site:StandSite)=>Math.exp(nicheLog(species,site));

// ---------- per-biome priors (the per-biome species table) ------------------------------------------------------------
/** Which species are in play in each province kind and how common they are before the site decides (design values). Species absent from a row are excluded there. */
export const BIOME_PRIORS:Record<string,Record<string,number>>={
 meadow:{oak:1,hawthorn:.8,birch:.7,maple:.4,poplar:.3,willow:.2,beech:.2,scotsPine:.25,juniper:.3,olive:.15,spruce:.05},
 'mixed-woodland':{oak:1,beech:1,birch:.6,maple:.6,spruce:.5,scotsPine:.5,fir:.4,poplar:.3,hawthorn:.15,willow:.15,cedar:.1,stonePine:.1,cypress:.04},
 'conifer-forest':{spruce:1,scotsPine:.9,fir:.7,birch:.4,cedar:.25,stonePine:.2,juniper:.2,krummholz:.1,beech:.1,poplar:.1,willow:.05,oak:.05},
 alpine:{krummholz:1,juniper:.6,spruce:.35,scotsPine:.3,birch:.3,fir:.15,cedar:.1},
 wetland:{willow:1,poplar:.7,birch:.4,oak:.15,hawthorn:.1,mangrove:.8,tamarisk:.1,spruce:.1},
 'dry-scrub':{olive:.8,acacia:.8,juniper:.7,hawthorn:.5,tamarisk:.5,cypress:.5,stonePine:.5,eucalyptus:.3,scotsPine:.3,cedar:.2,oak:.2,datePalm:.15,baobab:.15},
 arid:{acacia:1,tamarisk:.7,datePalm:.5,juniper:.3,baobab:.3,olive:.2,cypress:.1},
 'warm-coast':{coconutPalm:1,mangrove:.8,acacia:.4,datePalm:.3,eucalyptus:.3,stonePine:.3,tamarisk:.3,olive:.2,cypress:.2,poplar:.1,willow:.1,baobab:.1},
};
/** patch scale (m) of each species' own noise field: pioneers and riparian species form small patches, spruce, beech and pines big ones */
const PATCH_SCALE:Record<string,number>={beech:170,spruce:190,fir:150,oak:140,maple:110,scotsPine:160,stonePine:140,cedar:130,cypress:100,juniper:110,krummholz:120,birch:70,poplar:75,willow:80,hawthorn:60,
 coconutPalm:130,datePalm:90,acacia:130,baobab:90,mangrove:90,tamarisk:70,olive:110,eucalyptus:120};
const SPECIES_ORDER=Object.keys(SPECIES_NICHE);
const SALT:Record<string,number>=Object.fromEntries(SPECIES_ORDER.map((id,i)=>[id,1000+i*37]));
const RIPARIAN=new Set(['willow','poplar']);
const GLOBAL_PRIOR:Record<string,number>={};for(const row of Object.values(BIOME_PRIORS))for(const [id,p] of Object.entries(row))GLOBAL_PRIOR[id]=Math.max(GLOBAL_PRIOR[id]??0,p);
/** Climate groups. Species of different groups never share a stand except in a genuine ecotone between ADJACENT groups (boreal-temperate-mediterranean-arid-tropical along the warmth axis),
 * where the secondary group's share tapers with its fitness ratio. A palm never stands with a boreal conifer; an oak never with a desert acacia. */
export type ClimateGroup='boreal'|'temperate'|'mediterranean'|'arid'|'tropical';
export const CLIMATE_GROUPS:ClimateGroup[]=['boreal','temperate','mediterranean','arid','tropical'];
export const CLIMATE_OF:Record<string,ClimateGroup>={spruce:'boreal',fir:'boreal',krummholz:'boreal',scotsPine:'boreal',
 oak:'temperate',beech:'temperate',maple:'temperate',poplar:'temperate',willow:'temperate',hawthorn:'temperate',birch:'temperate',
 stonePine:'mediterranean',cypress:'mediterranean',olive:'mediterranean',cedar:'mediterranean',juniper:'mediterranean',
 acacia:'arid',tamarisk:'arid',datePalm:'arid',baobab:'arid',eucalyptus:'arid',coconutPalm:'tropical',mangrove:'tropical',snag:'temperate'};
const ADJACENT:Record<ClimateGroup,ClimateGroup[]>={boreal:['temperate'],temperate:['boreal','mediterranean'],mediterranean:['temperate','arid','tropical'],arid:['mediterranean','tropical'],tropical:['mediterranean','arid']};
export const climateOf=(id:string):ClimateGroup=>CLIMATE_OF[id]??'temperate';
/** Two species may stand within one neighbourhood only if their groups are equal or adjacent. */
export const climateCompatible=(a:string,b:string)=>{if(a==='snag'||b==='snag')return true;const ga=climateOf(a),gb=climateOf(b);return ga===gb||ADJACENT[ga].includes(gb);};
/** pioneer species of disturbed ground, in order of preference by site: birch (acid, cold, thin), poplar (wet; the alder niche, no alder model exists), hawthorn/juniper (dry) */
export function pioneerFor(site:StandSite,allowed?:(id:string)=>boolean){
 const ok=allowed??(()=>true);
 const cands:[string,number][]=[['birch',nicheFitness('birch',site)*(.9+.2*(1-site.acid))],['poplar',nicheFitness('poplar',site)*1.1],['hawthorn',nicheFitness('hawthorn',site)*.5],['juniper',nicheFitness('juniper',site)*.45],['tamarisk',nicheFitness('tamarisk',site)*.4],['acacia',nicheFitness('acacia',site)*.5]];
 let best='birch',bv=-1;for(const [id,v] of cands){if(ok(id)&&v>bv){bv=v;best=id;}}return best;
}

// ---------- stand ---------------------------------------------------------------------------------------------------------
export type Stand={primary:string;secondary:string|null;/** chance a tree is the secondary species (ecotone and companion) */pMix:number;/** margin of the best score over the second, ln units */margin:number;
 /** stand age 0 (fresh pioneer stand) .. 1 (old growth) */age:number;kind:string;group:BaseForm;/** cumulative local species weights (continuum): trees are sampled from this */cum:[string,number][];/** climate groups present in this cell (at most two, adjacent) */groups:ClimateGroup[];richness:number};
export type TreePlan={species:string;group:BaseForm;ageClass:0|1|2|3;/** 0 mature, 1 young, 2 old/gnarled (botanical variant index) */variant:0|1|2;/** height scale 1 = a mature tree of the species */size:number;snag:boolean;standSpecies:string;pioneer:boolean};
export const AGE_NAMES=['sapling','young','mature','veteran'] as const;
const sizeOfAge=(a:number)=>.34+.92*smooth(0,.9,a);
const ageClassOf=(a:number):0|1|2|3=>a<.18?0:a<.45?1:a<.82?2:3;

/** Glade field 0..1: open ground (clearings, meadows in the woods), with soft edges so the stand thins into it. */
export function openAt(seed:number,x:number,z:number,thin=0){return smooth(STAND_RULES.gladeLo-.08*thin,STAND_RULES.gladeHi-.08*thin,field(x,z,STAND_RULES.gladeScale,seed,211));}
/** Windthrow / old-growth gap influence 0..1 at a point: jittered lattice, a gap in about a quarter of the cells, radius 6 to 16 m, soft edge. */
export function gapAt(seed:number,x:number,z:number){
 const R=STAND_RULES,c=R.gapCell,ix=Math.floor(x/c),iz=Math.floor(z/c);let g=0;
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
  const jx=ix+dx,jz=iz+dz;if(hash(jx,jz,seed,311)>=R.gapChance)continue;
  const cx=(jx+.15+.7*hash(jx,jz,seed,313))*c,cz=(jz+.15+.7*hash(jx,jz,seed,317))*c,r=R.gapRadius[0]+(R.gapRadius[1]-R.gapRadius[0])*hash(jx,jz,seed,331),d=Math.hypot(x-cx,z-cz);
  if(d<r*1.2)g=Math.max(g,smooth(r*1.2,r*.35,d));
 }
 return g;
}
/** Density multiplier 0..1: glades and gaps carry few trees. Shared by the filler forest and the simulation's tree placement. */
export function standDensityMul(seed:number,x:number,z:number,thin=0){return (1-.92*openAt(seed,x,z,thin))*(1-.9*gapAt(seed,x,z));}
export function ageFieldAt(seed:number,x:number,z:number){return field(x,z,STAND_RULES.ageScale,seed,411);}
/** Stand age 0..1 from the age field: the lowest tail is fresh pioneer ground, the highest tail old growth. */
export function standAgeAt(seed:number,x:number,z:number){return clamp((ageFieldAt(seed,x,z)-.12)/.62);}
/** Minimum spacing between two trees (m): crown shyness, from the species' crown radius at its size, kept in a band the simulation's own density can live with. */
export function crownSpacing(species:string,size:number){const sp=SPECIES_BY_ID[species],r=sp?sp.crownR:3;return clamp(.8*r*Math.min(1.2,Math.max(.6,size)),2.9,4.6);}

export class StandField{
 readonly seed:number;private siteAt:(x:number,z:number)=>StandSite;private cache=new Map<number,Stand>();stats={hits:0,misses:0};
 constructor(seed:number,siteAt:(x:number,z:number)=>StandSite){this.seed=seed;this.siteAt=siteAt;}
 private key(ix:number,iz:number){return (ix+16384)*32768+(iz+16384);}
 /** Stand at a point: decided once per 8 m cell at the cell centre. */
 at(x:number,z:number):Stand{
  const C=STAND_RULES.cellMetres,ix=Math.floor(x/C),iz=Math.floor(z/C),k=this.key(ix,iz),hit=this.cache.get(k);
  if(hit){this.stats.hits++;return hit;}
  this.stats.misses++;if(this.cache.size>400000)this.cache.clear();
  const s=this.compute((ix+.5)*C,(iz+.5)*C);this.cache.set(k,s);return s;
 }
 /** Climate group of a site from warmth and wetness only (kind-independent, so it cannot jump at a province border): boreal below -3 C, temperate to +2 C, then a Mediterranean buffer to +4 C,
  * beyond which dry ground is arid, wet ground tropical and the rest Mediterranean. Every boundary joins ADJACENT groups, so a cell never sees an incompatible pair. */
 static climateGroupOf(temp:number,moisture:number):ClimateGroup{
  if(temp<-3)return 'boreal';if(temp<2)return 'temperate';if(temp<4)return 'mediterranean';
  return moisture<.3?'arid':moisture>.6?'tropical':'mediterranean';
 }
 /** Dominant group plus, near a boundary, the neighbouring group and its share (0 at 1 boundary-width away, .5 on the boundary): the ecotone gradient. */
 static climateMix(temp:number,moisture:number):{g0:ClimateGroup;g1:ClimateGroup|null;share:number}{
  const g0=StandField.climateGroupOf(temp,moisture);let best:{g:ClimateGroup;d:number}|null=null;
  for(const t of [.25,.5,.75,1])for(const [dw,dm] of [[.7,0],[-.7,0],[0,.1],[0,-.1]]){const g=StandField.climateGroupOf(temp+dw*t,moisture+dm*t);if(g!==g0&&ADJACENT[g0].includes(g)&&(!best||t<best.d))best={g,d:t};}
  return best&&best.d<1?{g0,g1:best.g,share:.5*(1-best.d)}:{g0,g1:null,share:0};
 }
 /** Local species suitability weights: continuum model. Every compatible species responds on its own to the gradients (niche), scaled by its prior in the province and by its own
  * spatially correlated noise (patch scale 60 to 190 m, so some species form large patches and others small ones). Shade-tolerance dynamics shift old stands toward tolerant species. */
 private weights(x:number,z:number,site:StandSite,age:number){
  const R=STAND_RULES,prior=BIOME_PRIORS[site.kind]??BIOME_PRIORS.meadow,rip=clamp(1-site.waterDist/40)*clamp((site.moisture-.35)/.3);
  const {g0,g1,share}=StandField.climateMix(site.temp,site.moisture);
  // a province prior that names nothing of the cell's climate group (kind and climate disagree) falls back to the group's union prior
  const has=(g:ClimateGroup)=>SPECIES_ORDER.some(id=>climateOf(id)===g&&(prior[id]??0)>0);
  const pr=(id:string)=>{const g=climateOf(id);let p=prior[id]??0;if(RIPARIAN.has(id)&&rip>0)p=Math.max(p,.9*rip);if(p<=0&&!has(g))p=.35*(GLOBAL_PRIOR[id]??0);return p;};
  const out:[string,number][]=[];let total=0;
  for(const id of SPECIES_ORDER){
   const p=pr(id);if(p<=0)continue;
   const g=climateOf(id);if(g!==g0&&g!==g1)continue;
   const noise=field(x,z,PATCH_SCALE[id]??120,this.seed,SALT[id]);
   let w=p*nicheFitness(id,site)*Math.exp(R.noiseAmplitude*(2*noise-1));
   w*=1+age*(shadeTolerance(id)-.4)*1.2; // succession: old stands drift to shade-tolerant species
   if(w>1e-6){out.push([id,w]);total+=w;}
  }
  // the neighbouring climate group holds exactly its gradient share of the cell
  if(g1&&share>0){let w0=0,w1=0;for(const [id,w] of out){if(climateOf(id)===g0)w0+=w;else w1+=w;}if(w1>0&&w0>0){const k=share/(1-share)*w0/w1;for(const e of out)if(climateOf(e[0])!==g0){e[1]*=k;}}else if(w0===0&&w1>0){/* nothing of the dominant group fits: the neighbour group is all there is */}}
  else if(g1===null){/* single group */}
  total=out.reduce((t,e)=>t+e[1],0);
  out.sort((a,b)=>b[1]-a[1]);
  const kept:[string,number][]=[];let t2=0;for(const e of out){if(e[1]<total*R.minWeightShare)break;kept.push(e);t2+=e[1];}
  if(!kept.length){const fb=SPECIES_ORDER.filter(id=>climateOf(id)===g0).sort((a,b)=>(GLOBAL_PRIOR[b]??0)-(GLOBAL_PRIOR[a]??0))[0]??'oak';kept.push([fb,1]);t2=1;}
  let c=0;const cum:[string,number][]=kept.map(([id,w])=>[id,c+=w/t2]);
  return {cum,groups:[g0,...(g1?[g1]:[])] as ClimateGroup[]};
 }
 private compute(x:number,z:number):Stand{
  const site=this.siteAt(x,z),age=standAgeAt(this.seed,x,z),{cum,groups}=this.weights(x,z,site,age);
  const share=(i:number)=>cum[i]?cum[i][1]-(i?cum[i-1][1]:0):0,p1=cum[0][0],sec=cum.length>1?cum[1][0]:null;
  return {primary:p1,secondary:sec,pMix:1-share(0),margin:Math.log(Math.max(1e-6,share(0))/Math.max(1e-6,share(1)||1e-6)),age:age*(p1==='krummholz'?.7:1),kind:site.kind,group:SPECIES_BY_ID[p1]?.group??'broadleaf',cum,groups,richness:cum.length};
 }
 /** Per-tree decision: species sampled from the local suitability weights, age cohort by shade tolerance, gap pioneers, size and variant. */
 plan(id:number,x:number,z:number,opts?:{planted?:boolean;filler?:boolean}):TreePlan{
  const stand=this.at(x,z),R=STAND_RULES,seed=this.seed,u1=unitFor(id,seed,41),u2=unitFor(id,seed,201),u3=unitFor(id,seed,203),u4=unitFor(id,seed,205),gap=gapAt(seed,x,z);
  const minSize=opts?.filler?R.minFillerSize:R.minSimSize,inStand=(g:string)=>stand.groups.includes(climateOf(g));
  let species=stand.cum.find(e=>u1<=e[1])?.[0]??stand.primary,pioneer=false,age=clamp(stand.age+(u2-.5)*.22);
  const tol=shadeTolerance(species);
  if(opts?.planted){
   const site=this.siteAt(x,z);species=groveSpecies(seed,x,z,site,inStand);age=clamp(.55+(u2-.5)*.1);
  }else if(gap>.2&&u3<.65*gap){
   // gap: light-demanding pioneers (birch, poplar, ...) and saplings of whatever is nearby
   const site=this.siteAt(x,z);species=pioneerFor(site,id2=>inStand(id2)&&((BIOME_PRIORS[site.kind]?.[id2]??0)>0||id2==='birch'));if(!inStand(species))species=stand.primary;pioneer=true;age=clamp(.08+.2*u2);
  }else if(gap>.2){age=clamp(age*.5);}
  else{
   // shade-tolerance dynamics: under a closed old canopy tolerant species keep a suppressed younger cohort, intolerant ones are the older canopy cohort that grew up after a disturbance
   if(stand.age>.45&&unitFor(id,seed,209)<tol*.5*stand.age)age=clamp(.1+.3*u2);
   else if(tol<.3)age=clamp(Math.max(age,.4+.4*u2));
  }
  const sp=SPECIES_BY_ID[species];
  const snag=!opts?.planted&&!pioneer&&stand.age>.8&&u4<.035;
  const useId=snag?'snag':species,use=SPECIES_BY_ID[useId]??sp;
  const ageClass=ageClassOf(age),size=Math.max(minSize,sizeOfAge(age)*(.95+.1*unitFor(id,seed,207)));
  const variant=ageClass<=1?1:ageClass===3?2:0;
  return {species:useId,group:use?.group??'broadleaf',ageClass,variant:variant as 0|1|2,size,snag,standSpecies:stand.primary,pioneer};
 }
}

// ---------- hooks ---------------------------------------------------------------------------------------------------------
const GROVE_CANDIDATES=['oak','maple','olive','stonePine','scotsPine','poplar','birch','cypress','willow','datePalm','coconutPalm'];
/** A planted grove or orchard is one species per 48 m plot (rows of one tree), chosen as the best-fitting useful species for the plot's centre. */
export function groveSpecies(seed:number,x:number,z:number,site:StandSite,allowed?:(id:string)=>boolean){
 const C=48,ix=Math.floor(x/C),iz=Math.floor(z/C);let best=GROVE_CANDIDATES.find(id=>!allowed||allowed(id))??'oak',bv=-1;
 for(const id of GROVE_CANDIDATES){if(allowed&&!allowed(id))continue;const v=nicheFitness(id,site)*((BIOME_PRIORS[site.kind]?.[id]??.1)+.2)*(.9+.2*hash(ix,iz,seed+SPECIES_ORDER.indexOf(id),601));if(v>bv){bv=v;best=id;}}
 return best;
}
/** Succession on cleared ground. Years since clearing (game years): 0..3 herbs and bramble (no tree), 3..12 pioneer thicket, 12..45 pioneer canopy with climax saplings underneath, 45+ the climax stand. */
export const SUCCESSION_RULES={herbYears:3,thicketYears:12,pioneerCanopyYears:45} as const;
export function successionAt(field:StandField,id:number,x:number,z:number,site:StandSite,years:number):TreePlan|null{
 const S=SUCCESSION_RULES,climax=field.plan(id,x,z),u=unitFor(id,field.seed,801);
 if(years<S.herbYears)return null;
 const pio=pioneerFor(site),pioSp=SPECIES_BY_ID[pio];
 const mk=(species:string,age:number,pioneer:boolean):TreePlan=>{const ac=ageClassOf(age),sp=SPECIES_BY_ID[species];return {species,group:sp?.group??'broadleaf',ageClass:ac,variant:(ac<=1?1:ac===3?2:0) as 0|1|2,size:Math.max(STAND_RULES.minFillerSize,sizeOfAge(age)),snag:false,standSpecies:climax.standSpecies,pioneer};};
 if(years<S.thicketYears)return mk(pio,.05+.3*(years-S.herbYears)/(S.thicketYears-S.herbYears),true);
 if(years<S.pioneerCanopyYears){const t=(years-S.thicketYears)/(S.pioneerCanopyYears-S.thicketYears),pPio=.85-.65*t;return u<pPio&&pioSp?mk(pio,.35+.4*t,true):mk(climax.species,.15+.3*t,false);}
 return climax;
}
/** Village wood-cutting thins stands: fraction of the original trees that remain given felled stumps per hectare within the working radius. Never below 15%. */
export function thinningFactor(stumpsPerHectare:number){return clamp(1-stumpsPerHectare/60,.15,1);}
/** Forest-floor bias by canopy species: multipliers on the painterly understory kinds. Shade-casting beech and spruce keep a sparse floor of moss, fungi and litter; pines and birch let bracken and bushes in;
 * oak and edges carry shrubs and saplings; open ground carries grass and flowers. Kinds not listed keep weight 1. */
export function understoryBias(species:string,open:number,moisture:number):Record<string,number>{
 const sp=SPECIES_BY_ID[species],out:Record<string,number>={};
 const mul=(k:string,v:number)=>{out[k]=(out[k]??1)*v;};
 if(!sp)return out;
 if(sp.id==='beech'){mul('fern',.45);mul('grass',.4);mul('bush',.3);mul('sapling',.5);mul('mushroom',1.8);mul('moss',1.4);mul('log',1.3);}
 else if(sp.id==='spruce'||sp.id==='fir'){mul('fern',.55);mul('grass',.35);mul('bush',.3);mul('moss',moisture>.45?3:1.6);mul('mushroom',1.5);mul('pinelet',2);mul('sapling',.7);}
 else if(sp.id==='scotsPine'||sp.id==='stonePine'||sp.id==='juniper'){mul('bracken',3);mul('fern',.5);mul('grass',1.3);mul('pinelet',1.6);mul('moss',.4);mul('bush',1.3);}
 else if(sp.id==='birch'){mul('bracken',2.4);mul('grass',1.5);mul('sapling',1.4);mul('flowers',1.4);}
 else if(sp.id==='oak'||sp.id==='maple'){mul('bush',1.8);mul('sapling',1.8);mul('grass',1.2);mul('fern',.8);}
 else if(sp.id==='willow'||sp.id==='poplar'||sp.id==='mangrove'){mul('tallgrass',1.8);mul('reeds',1.8);mul('fern',1.4);mul('moss',1.4);mul('cattail',1.6);}
 else if(sp.group==='acacia'||sp.group==='scrub'||sp.id==='olive'||sp.id==='cypress'){mul('drygrass',1.6);mul('rocks',1.4);mul('fern',.2);mul('moss',.1);}
 if(open>.35){mul('grass',1+open);mul('flowers',1+1.5*open);mul('sapling',1+open);mul('fern',1-.5*open);mul('mushroom',1-.6*open);}
 return out;
}
export const ALL_STAND_SPECIES=SPECIES_ORDER;
export {BOTANICAL_SPECIES};
