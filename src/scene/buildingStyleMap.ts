/** Maps stable building type IDs (src/game/types.ts BldType, footprints from
 * src/game/constants.ts BUILDINGS) onto Option H families, and derives the
 * seeded context. Pure: the same building ID always yields the same family,
 * variant and geometry; footprints are read, never changed.
 *
 * Geometry is shared per variant (family x era bucket x material x climate x
 * variant index) so instancing stays possible: a village of 60 houses draws a
 * handful of distinct cottages, not 60 unique meshes. */
import {hashSeed,type BuildingSpec} from './buildingParts';
import {generateFamily,type BuildMaterial,type Climate,type FamilyContext,type FamilyId,type Trade,type Tradition,type WallAxis} from './buildingFamilies';

export type Habitat='plains'|'forest'|'hills'|'desert'|'tundra'|'wetland';
export type CarvedBuildingInput={worldSeed:number;type:string;id:number;era:number;habitat?:Habitat;footprint:{w:number;d:number};
 waterSide?:'+x'|'-x'|'+z'|'-z';wallAxis?:WallAxis;
 /** Stable settlement identity (e.g. founding town-hall id or team). Gives the
  * village its own building tradition; omitted means one world-wide tradition. */
 settlementSeed?:number;
 /** Actual household/civic prosperity 0..1 from simulation state, when known.
  * Quantised into three tiers so the variant pool stays bounded. */
 prosperity?:number};
type Mapping={family:FamilyId;trade?:Trade;scale?:'small'|'large'};

/** Variants per family: distinct geometries kept resident per era/material bucket. */
export const VARIANTS_PER_FAMILY:Record<FamilyId,number>={roundhouse:4,cottage:5,longhouse:3,granary:4,storehouse:3,watermill:3,quernShelter:2,
 workshop:3,palisade:3,gate:2,tower:3,church:3,marketStalls:3,hearth:3};

/** Stable building type -> family. Types not listed keep the classic renderer
 * even when the carved style is enabled (farm, pen, dock, bridge, earthworks,
 * keep, stables, university, cairn, grove, cornerstone, stonewall, threshing
 * floor are deliberately left for a later batch). */
export function familyForType(type:string,era:number,climate:Climate,waterSide?:string):Mapping|null{
 switch(type){
  case 'hut':return era<=1?{family:'roundhouse'}:{family:'cottage',scale:'small'};
  case 'house':return climate==='cold'||climate==='wet'?(era<=2?{family:'longhouse'}:{family:'cottage',scale:'large'}):{family:'cottage',scale:'large'};
  case 'townhall':return {family:'longhouse',scale:'large'};
  case 'barracks':return {family:'longhouse'};
  case 'warehouse':return era<=2?{family:'granary'}:{family:'storehouse'};
  case 'grindingStone':return waterSide?{family:'watermill'}:{family:'quernShelter'};
  case 'workshop':return {family:'workshop',trade:'bench'};
  case 'forge':return {family:'workshop',trade:'forge'};
  case 'kiln':return {family:'workshop',trade:'kiln'};
  case 'potter':return {family:'workshop',trade:'pottery'};
  case 'fibreWorkshop':return {family:'workshop',trade:'loom'};
  case 'tailor':return {family:'workshop',trade:'bench'};
  case 'tanner':case 'butcher':case 'dryrack':return {family:'workshop',trade:'rack'};
  case 'lumber':return {family:'workshop',trade:'saw'};
  case 'smokehouse':return {family:'workshop',trade:'smoke'};
  case 'oven':return {family:'workshop',trade:'oven'};
  case 'palisade':return {family:'palisade'};
  case 'gate':return {family:'gate'};
  case 'watchtower':return {family:'tower'};
  case 'temple':return {family:'church'};
  case 'market':return {family:'marketStalls'};
  case 'hearth':return {family:'hearth'};
  default:return null;
 }
}
export const CARVED_TYPES=['hut','house','townhall','barracks','warehouse','grindingStone','workshop','forge','kiln','potter','fibreWorkshop','tailor','tanner','butcher','dryrack','lumber','smokehouse','oven','palisade','gate','watchtower','temple','market','hearth'] as const;

export function climateFor(habitat:Habitat='plains'):Climate{
 return habitat==='hills'||habitat==='tundra'?'cold':habitat==='forest'||habitat==='wetland'?'wet':habitat==='desert'?'arid':'temperate';
}
/** Local construction material by era and habitat (wood-rich forest keeps
 * timber longer; hills move to stone early; deserts build mudbrick). */
export function materialFor(era:number,habitat:Habitat='plains'):BuildMaterial{
 if(habitat==='desert')return era<=0?'wattle':'mudbrick';
 if(era<=0)return 'wattle';
 if(habitat==='hills')return era>=2?'stone':'timber';
 if(habitat==='forest'||habitat==='wetland')return era>=4?'stone':'timber';
 return era>=3?'stone':'timber';
}
/** Era buckets that change structure (0 early, 1 established, 2 classical, 3 late, 5 imperial). */
export function eraBucket(era:number){const e=Math.max(0,Math.min(5,Math.floor(era)));return e>=5?5:e>=3?3:e;}

/** Settlement building tradition derived from a stable seed (G3). */
export function traditionFor(worldSeed:number,settlementSeed:number|undefined):Tradition{
 if(settlementSeed===undefined)return {pitchBiasDeg:0,annexBias:0,proportion:1,porchBias:0};
 const h=hashSeed(worldSeed,'tradition',settlementSeed),f=(k:number)=>((h>>>(k*8))&255)/255;
 return {pitchBiasDeg:Math.round((f(0)-.5)*10),annexBias:Math.round((f(1)-.5)*40)/100,proportion:Math.round((.9+f(2)*.2)*100)/100,porchBias:Math.round((f(3)-.5)*40)/100};
}
export function prosperityTier(p:number|undefined){return p===undefined?-1:p<.34?0:p<.67?1:2;}
export function variantIndexFor(worldSeed:number,id:number,count:number){return hashSeed(worldSeed,'variant',id)%count;}

export type CarvedVariantKey={key:string;family:FamilyId;ctx:FamilyContext};
/** Resolve a building to its shared variant key and generation context. */
export function carvedVariantFor(input:CarvedBuildingInput):CarvedVariantKey|null{
 const era=eraBucket(input.era),habitat=input.habitat??'plains',climate=climateFor(habitat),map=familyForType(input.type,era,climate,input.waterSide);
 if(!map)return null;
 const material=materialFor(era,habitat),count=VARIANTS_PER_FAMILY[map.family],index=variantIndexFor(input.worldSeed,input.id,count);
 // Wealth is a property of the variant (spread across the pool), so richer and
 // poorer houses coexist in one village without unique meshes per building.
 const spread=count>1?index/(count-1):.5,tier=prosperityTier(input.prosperity);
 // Actual prosperity dominates when the simulation supplies it; the variant
 // spread keeps neighbours in one tier from being identical.
 const wealth=tier<0?spread:Math.min(1,tier*.4+spread*.2);
 const tradition=traditionFor(input.worldSeed,input.settlementSeed);
 const fw=Math.round(input.footprint.w*100)/100,fd=Math.round(input.footprint.d*100)/100;
 const key=[input.type,map.family,map.trade??'',map.scale??'',era,material,climate,index,input.waterSide??'',input.wallAxis??'',fw,fd,input.settlementSeed??'',tier].join('|');
 const ctx:FamilyContext={seed:hashSeed(input.worldSeed,key),era,material,climate,wealth,tradition,footprint:{w:fw,d:fd},
  ...(map.trade?{trade:map.trade}:{}),...(map.scale?{scale:map.scale}:{}),...(input.waterSide?{waterSide:input.waterSide}:{}),...(input.wallAxis?{wallAxis:input.wallAxis}:{})};
 return {key,family:map.family,ctx};
}
export function carvedBuildingSpec(input:CarvedBuildingInput):BuildingSpec|null{
 const v=carvedVariantFor(input);return v?generateFamily(v.family,v.ctx,v.key):null;
}
