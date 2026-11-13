/** Maps stable building type IDs (src/game/types.ts BldType, footprints from
 * src/game/constants.ts BUILDINGS) onto Option H families, and derives the
 * seeded context. Pure: the same building ID always yields the same family,
 * variant and geometry; footprints are read, never changed.
 *
 * Geometry is shared per variant (family x era bucket x material x climate x
 * variant index) so instancing stays possible: a village of 60 houses draws a
 * handful of distinct cottages, not 60 unique meshes. */
import {hashSeed,type BuildingSpec} from './buildingParts';
import {getBuildingMute} from './buildingDetail';
import {generateCivBuilding,type CivContext,type CivRole} from './civBuildings';
import {heraldryKey,BANNER_ORDER,type Heraldry} from './villageIdentity';
import {formsOf,lookOf,roleForType,skinSignature,villageRetint,type CivSkin} from './civSkin';
import type {CivId} from './civStyles';
import {generateFamily,getBuildingGrammar,type BuildMaterial,type Climate,type FamilyContext,type FamilyId,type Trade,type Tradition,type WallAxis} from './buildingFamilies';

export type Habitat='plains'|'forest'|'hills'|'desert'|'tundra'|'wetland';
export type CarvedBuildingInput={worldSeed:number;type:string;id:number;era:number;habitat?:Habitat;footprint:{w:number;d:number};
 waterSide?:'+x'|'-x'|'+z'|'-z';wallAxis?:WallAxis;
 /** Tiled cells (walls, gate, trench, moat, canal, aqueduct): which of the four neighbours the cell touches (JOIN bits in buildingHelpers). Wins over wallAxis. */join?:number;
 /** Gate leaves swung open (the gate is unlocked and nothing hostile is near). */gateOpen?:boolean;
 /** Stable settlement identity (e.g. founding town-hall id or team). Gives the
  * village its own building tradition; omitted means one world-wide tradition. */
 settlementSeed?:number;
 /** Actual household/civic prosperity 0..1 from simulation state, when known.
  * Quantised into three tiers so the variant pool stays bounded. */
 prosperity?:number;
 /** Review-only decorative powered watermill. The live game keeps grindingStone a
  * hand quern: nearby water alone never creates a mill, flume or mechanism. */
 reviewWatermill?:boolean;
 /** Actual state: is the fire burning (hearth, forge, kiln, oven, smokehouse)? Live
  * callers must pass real state; omitted means lit (review/preview only). */
 lit?:boolean;
 /** The society's CivSkin (civSkin.ts): its grammar draws houses, halls and markets, its palette repaints every other family. Absent/neutral = the plain Village grammar. */
 skin?:CivSkin|null;
 /** This village's heraldry (villageIdentity.ts): finial, rim trim and banner cut that tell same-colour villages apart. Skin grammars only. */
 heraldry?:Heraldry;
 /** A ruler has just died: this society's banners hang at half-mast (skin grammars only). */
 mourning?:boolean;
 /** Building condition 0..1 (hp/maxHp); quantised to three wear tiers for skin grammars. */
 condition?:number};
/** Distinct dwelling/granary geometries a skinned society keeps resident (id-keyed, so two huts in one village never match). */
export const SKIN_DWELLING_VARIANTS=64;
type Mapping={family:FamilyId;trade?:Trade;scale?:'small'|'large'};

/** Variants per family: distinct geometries kept resident per era/material bucket. */
export const VARIANTS_PER_FAMILY:Record<FamilyId,number>={roundhouse:4,cottage:5,longhouse:3,granary:4,storehouse:3,watermill:3,quernShelter:2,
 workshop:3,palisade:3,gate:2,tower:3,church:3,marketStalls:3,hearth:3,
 fieldPlot:4,pen:3,pier:3,bridge:3,keep:3,stables:3,college:3,quarry:3,cairn:3,grove:4,outpost:3,threshing:3,stoneWall:3,trench:3,moat:3,well:3,cistern:3,millHouse:3,windmill:3,aqueduct:3,canal:3};

/** Stable building type -> family. Every BldType is mapped (batch 2 added farm,
 * pen, dock, bridge, keep, stables, university, quarry, cairn, grove,
 * cornerstone, threshing floor, stone wall, trench, moat); an unknown future
 * type still returns null and keeps the classic renderer. */
export function familyForType(type:string,era:number,climate:Climate,waterSide?:string):Mapping|null{
 switch(type){
  case 'hut':return era<=1?{family:'roundhouse'}:{family:'cottage',scale:'small'};
  case 'house':return climate==='cold'||climate==='wet'?(era<=2?{family:'longhouse'}:{family:'cottage',scale:'large'}):{family:'cottage',scale:'large'};
  case 'townhall':return {family:'longhouse',scale:'large'};
  case 'barracks':return {family:'longhouse',scale:'large'};
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
  case 'farm':return {family:'fieldPlot'};
  case 'pen':return {family:'pen'};
  case 'dock':return {family:'pier'};
  case 'bridge':return {family:'bridge'};
  case 'keep':return {family:'keep'};
  case 'stables':return {family:'stables'};
  case 'university':return {family:'college'};
  case 'quarry':return {family:'quarry'};
  case 'cairn':return {family:'cairn'};
  case 'grove':return {family:'grove'};
  case 'cornerstone':return {family:'outpost'};
  case 'threshingFloor':return {family:'threshing'};
  case 'stonewall':return {family:'stoneWall'};
  case 'trench':return {family:'trench'};
  case 'moat':return {family:'moat'};
  case 'well':return {family:'well'};
  case 'cistern':return {family:'cistern'};
  case 'watermill':return {family:'millHouse'};
  case 'windmill':return {family:'windmill'};
  case 'aqueduct':return {family:'aqueduct'};
  case 'canal':return {family:'canal'};
  default:return null;
 }
}
export const CARVED_TYPES=['hut','house','townhall','barracks','warehouse','grindingStone','workshop','forge','kiln','potter','fibreWorkshop','tailor','tanner','butcher','dryrack','lumber','smokehouse','oven','palisade','gate','watchtower','temple','market','hearth','farm','pen','dock','bridge','keep','stables','university','quarry','cairn','grove','cornerstone','threshingFloor','stonewall','trench','moat','well','cistern','watermill','windmill','aqueduct','canal'] as const;

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

/** Cache-key fragment for the skin-dependent inputs of a building (empty without a skin). */
export function skinKeyPart(b:Pick<CarvedBuildingInput,'skin'|'mourning'|'condition'|'type'|'heraldry'>){
 const k=b.skin&&b.skin.grammar?skinSignature(b.skin):'';
 return k?`${k}:${b.mourning?'m':''}:${b.condition===undefined||b.condition>=.7?0:b.condition>=.4?1:2}${heraldryKey(b.heraldry)}`:'';
}
export type CarvedVariantKey={key:string;family:FamilyId;ctx:FamilyContext;
 /** Skin grammar variant: drawn by generateCivBuilding instead of the Village family. */civ?:{grammar:CivId;role:CivRole;ctx:CivContext};
 /** Skin repaint of the Village family's materials. */tint?:ReturnType<typeof villageRetint>};
/** Resolve a building to its shared variant key and generation context. */
export function carvedVariantFor(input:CarvedBuildingInput):CarvedVariantKey|null{
 const era=eraBucket(input.era),habitat=input.habitat??'plains',climate=climateFor(habitat),map=familyForType(input.type,era,climate,input.reviewWatermill?input.waterSide:undefined);
 if(!map)return null;
 const material=materialFor(era,habitat),skinned=!!(input.skin&&input.skin.grammar),roleHere=skinned?roleForType(input.type):null,
  // A society's dwellings and granaries are each their own building: the variant is the building id, not a handful of shared meshes.
  count=roleHere==='house'||roleHere==='granary'?SKIN_DWELLING_VARIANTS:VARIANTS_PER_FAMILY[map.family],index=variantIndexFor(input.worldSeed,input.id,count);
 // Wealth is a property of the variant (spread across the pool), so richer and
 // poorer houses coexist in one village without unique meshes per building.
 const spread=count>1?index/(count-1):.5,tier=prosperityTier(input.prosperity);
 // Actual prosperity dominates when the simulation supplies it; the variant
 // spread keeps neighbours in one tier from being identical.
 const wealth=tier<0?spread:Math.min(1,tier*.4+spread*.2);
 const tradition=traditionFor(input.worldSeed,input.settlementSeed);
 const fw=Math.round(input.footprint.w*100)/100,fd=Math.round(input.footprint.d*100)/100;
 const skin=input.skin&&input.skin.grammar?input.skin:null,role=skin?roleForType(input.type):null,wearTier=input.condition===undefined||input.condition>=.7?0:input.condition>=.4?1:2,mourn=!!(skin&&input.mourning);
 const key=[input.type,map.family,map.trade??'',map.scale??'',era,material,climate,index,input.reviewWatermill||input.type!=='grindingStone'?input.waterSide??'':'',input.wallAxis??'',input.join??'',input.gateOpen?'open':'',input.lit===false?'cold':'lit',fw,fd,input.settlementSeed??'',tier,getBuildingGrammar(),getBuildingMute()?'mute':'',...(skin?['skin',skinSignature(skin),role??'-',wearTier,mourn?'mourn':'',...(input.heraldry?[heraldryKey(input.heraldry)]:[])]:[])].join('|');
 const ctx:FamilyContext={seed:hashSeed(input.worldSeed,key),era,material,climate,wealth,tradition,footprint:{w:fw,d:fd},
  ...(map.trade?{trade:map.trade}:{}),...(map.scale?{scale:map.scale}:{}),...(input.waterSide&&(input.reviewWatermill||input.type!=='grindingStone')?{waterSide:input.waterSide}:{}),...(input.wallAxis?{wallAxis:input.wallAxis}:{}),...(input.join!==undefined?{join:input.join}:{}),...(input.gateOpen?{gateOpen:true}:{}),...(skin?{form:formsOf(skin)}:{}),...(input.lit===false?{lit:false}:{})};
 if(skin&&role){
  const look=lookOf(skin),cctx:CivContext={seed:ctx.seed,era,wealth,wear:[.1,.35,.6][wearTier],footprint:{w:fw,d:fd},eraMode:'fixed',built:{era,wealth},...(input.lit===false?{lit:false}:{}),...(mourn?{mourning:true}:{}),...(input.heraldry?{heraldry:input.heraldry}:{}),...(look||input.heraldry?{look:{...(look||{}),...(input.heraldry?{banner:BANNER_ORDER[input.heraldry.banner%BANNER_ORDER.length]}:{})}}:{})};
  return {key,family:map.family,ctx,civ:{grammar:skin.grammar!,role,ctx:cctx}};
 }
 return skin?{key,family:map.family,ctx,tint:villageRetint(skin)}:{key,family:map.family,ctx};
}
/** The spec for a resolved variant: the skin's civ grammar, or the Village family (repainted from the skin when one is worn). */
export function variantSpec(v:CarvedVariantKey):BuildingSpec{
 if(v.civ)return generateCivBuilding(v.civ.grammar,v.civ.role,v.civ.ctx,v.key) as BuildingSpec;
 const spec=generateFamily(v.family,v.ctx,v.key);return v.tint?{...spec,materials:v.tint}:spec;
}
export function carvedBuildingSpec(input:CarvedBuildingInput):BuildingSpec|null{
 const v=carvedVariantFor(input);return v?variantSpec(v):null;
}
