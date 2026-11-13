/** The wonder registry: one data row per wonder (no game access, no randomness). Everything a wonder IS lives here:
 *   site        ground it needs (terrain, geology, water, altitude), checked by wonderSites.siteIssues
 *   cost        real goods (wood, stone, food, copper, iron) plus crew labour seconds, paid in four stages
 *   minAge      era gate; hall and crew gates are in wonderFounding
 *   affinity    civ traits that lean toward it (suggest mode and rival planner)
 *   effects     rows from the effect library (wonderEffects.ts), each tied to an EXISTING system
 *   hooks       effects that need a system the game does not have yet (listed in docs/WONDERS_REGISTRY.md, prestige only for now)
 *   kit         recipe for the modular kit (scene/wonderRecipes.ts for the new ones; the six originals keep the built-in recipe)
 * Adding a wonder = adding a row here (and a recipe if it needs a new core). Historical analogues are NOT verified unless `source` is set. */
import {recipeOf,type WonderRecipe} from '../scene/wonderRecipes';
import type {WonderKind} from '../scene/wonderKit';
import type {Ecology} from './polityModel';

export type WonderId=WonderKind;
export type EffectId='prestige'|'knowledge'|'storage'|'concord'|'defence'|'portCapacity';
export type WonderEffect={id:EffectId;/** strength; meaning per effect id (see wonderEffects.ts) */amount:number;/** metres, for area effects (defence) */radius?:number;/** player-facing words */words:string};
export type Good='wood'|'stone'|'food'|'copper'|'iron';
export type WonderCost={wood:number;stone:number;food:number;copper?:number;iron?:number;/** crew labour seconds */labour:number};
export type RockName='none'|'granite'|'basalt'|'sandstone'|'limestone'|'shale'|'volcanic'|'sediment';
/** Ground requirement. Unset fields do not constrain. `water`: dry = no water under the footprint; bank = dry with a river within `riverWithin`;
 * shore = touches water; deepShore = shore with water 2.5 m deep at the face. */
export type SiteReq={water:'dry'|'bank'|'shore'|'deepShore';riverWithin?:number;riverMinWidth?:number;grade?:{min?:number;max?:number};/** height range across the footprint, m */relief?:number;
 /** footprint height above the ring of ground 30 m around, m */prominence?:number;/** mean ground height above the water level, m */altitude?:{min?:number;max?:number};rock?:RockName[];
 /** a slope above that drains toward the site */catchment?:boolean;/** open, gentle ground in front of a hillside */openGround?:boolean;/** metres from the town hall */hallWithin?:{min?:number;max?:number};
 /** short words for the picker when this requirement is the one that fails */why:string};
export type Affinity={ecology:Partial<Record<keyof Ecology,number>>;faith?:string[];ambitions?:string[]};
export type WonderDefinition={id:WonderId;label:string;/** one line of what it is */blurb:string;inspiration:{name:string;/** URL when verified against a source */source?:string;verified:boolean};
 /** legacy site family (wonderSites.wonderSiteRules) for the six originals; new rows use `site` only */legacySite?:'ringObservatory'|'cascadeGarden'|'crescentHarbor'|'millMarket'|'canyonCistern'|'assemblyCourt';
 site:SiteReq;cost:WonderCost;crew:{min:number;max:number};minAge:number;affinity:Affinity;effects:WonderEffect[];hooks:string[];kit:WonderRecipe|null;/** how far its fame travels (fame.ts magnitude, 20..60) */fame:number;
 /** falls to ruin without its people: years to a collapsed wreck (see ruinsWorld.ts) */ruinYears:number;/** needs earthworks the game cannot dig yet: listed, not foundable */earthworks?:boolean};

/** Four construction stages, shared by every wonder: the share of labour and of goods each one takes. */
export const WONDER_STAGES=[{id:'foundation',label:'Foundation',labour:.25,goods:.3},{id:'raising',label:'Raising the mass',labour:.35,goods:.35},{id:'crowning',label:'Crown and flanks',labour:.25,goods:.2},{id:'finishing',label:'Finishing',labour:.15,goods:.15}] as const;
export const STAGE_COUNT=WONDER_STAGES.length;
const base:WonderCost={wood:70,stone:110,food:120,labour:1500};
const C=(o:Partial<WonderCost>):WonderCost=>({...base,...o});
const S=(water:SiteReq['water'],why:string,o:Partial<SiteReq>={}):SiteReq=>({water,why,...o});
const D=(d:Omit<WonderDefinition,'kit'|'effects'|'hooks'|'ruinYears'|'fame'>&{effects?:WonderEffect[];hooks?:string[];ruinYears?:number;fame?:number}):WonderDefinition=>({effects:[],hooks:[],ruinYears:30,fame:40,...d,kit:recipeOf(d.id)??null});
const un=(name:string):WonderDefinition['inspiration']=>({name:`${name} [UNVERIFIED]`,verified:false});
const pres=(amount:number,words='Adds to the renown of your people'):WonderEffect=>({id:'prestige',amount,words});

export const WONDER_DEFS:readonly WonderDefinition[]=[
 // ---- the six originals (cistern and assembly court need earthworks and stay listed, not foundable)
 D({id:'observatory',label:'ring observatory',blurb:'A ring of standing sight-stones on a high point, for tracking the sun and the seasons.',inspiration:un('Stone circles and Jantar Mantar'),legacySite:'ringObservatory',site:S('dry','a high point with open sky',{prominence:6,grade:{max:.35}}),
  cost:C({stone:140}),crew:{min:3,max:4},minAge:2,affinity:{ecology:{sacred:.7,surplus:.3},faith:['sky','fire'],ambitions:['knowledge','legacyBuilding']},effects:[pres(30),{id:'knowledge',amount:.1,words:'Teaching and practice about 10% faster'}],hooks:['calendar events (sowing, flood and frost warnings)'],fame:45}),
 D({id:'terraceGarden',label:'terrace garden',blurb:'Watered terraces climbing a slope, green in the dry months.',inspiration:un('Hanging gardens'),legacySite:'cascadeGarden',site:S('bank','a slope with a drop of 3 m and a river within 40 m',{relief:3,riverWithin:40}),
  cost:C({food:160}),crew:{min:3,max:4},minAge:2,affinity:{ecology:{surplus:.8,sacred:.3},faith:['earth'],ambitions:['wealth','legacyBuilding']},effects:[pres(34),{id:'storage',amount:.12,words:'Winter stores spoil about 12% slower'}],hooks:['fibre and food yield in radius (settlement gather rates)'],fame:50}),
 D({id:'harbor',label:'great harbour',blurb:'A quayed basin that lets many hulls load at once.',inspiration:un('Great harbours of the ancient Mediterranean'),legacySite:'crescentHarbor',site:S('deepShore','a shore with water 2.5 m deep at the face'),
  cost:C({wood:110}),crew:{min:3,max:4},minAge:2,affinity:{ecology:{trade:1},faith:['sea','trade'],ambitions:['wealth']},effects:[pres(30),{id:'portCapacity',amount:.3,words:'Ships carry about 30% more stores'}],hooks:['berths and docking queue (navalPorts)'],fame:45}),
 D({id:'millMarket',label:'mill market',blurb:'Water-wheels and a covered market on a river bank.',inspiration:un('River mills and market halls'),legacySite:'millMarket',site:S('bank','a river at least 6 m wide within 25 m',{riverWithin:25,riverMinWidth:6}),
  cost:C({wood:100}),crew:{min:3,max:4},minAge:2,affinity:{ecology:{trade:.7,surplus:.6},faith:['trade'],ambitions:['wealth']},effects:[pres(28)],hooks:['craft speed for grain and fibre (production rate)','market tax (polityModel fiscal)'],fame:35}),
 D({id:'cistern',label:'cistern',blurb:'A roofed water store dug where a slope drains toward it.',inspiration:un('Cisterns of dry coasts'),legacySite:'canyonCistern',site:S('dry','a catchment slope draining toward the pit',{catchment:true}),
  cost:C({}),crew:{min:3,max:4},minAge:2,affinity:{ecology:{pastoral:.5,surplus:.3},ambitions:['security']},effects:[],hooks:['carry-time reduction and drought buffer (waterReach)'],earthworks:true}),
 D({id:'assembly',label:'assembly court',blurb:'Raked tiers on a hillside where the people hear and decide.',inspiration:un('Hillside assemblies of the ancient Greek world'),legacySite:'assemblyCourt',site:S('dry','a hillside facing open ground',{grade:{min:.12,max:.5},openGround:true}),
  cost:C({}),crew:{min:3,max:4},minAge:2,affinity:{ecology:{scale:.6},ambitions:['reform']},effects:[],hooks:['unrest and legitimacy (concord)'],earthworks:true}),
 // ---- new families
 D({id:'ziggurat',label:'stepped temple',blurb:'A stepped brick mountain with a shrine on top, raised by the river.',inspiration:un('Mesopotamian ziggurats'),site:S('bank','flat ground within 100 m of a river',{riverWithin:100,grade:{max:.12}}),
  cost:C({stone:150,food:150,labour:1800}),crew:{min:3,max:5},minAge:1,affinity:{ecology:{sacred:1,surplus:.4},faith:['sky','fire','earth'],ambitions:['faith','legacyBuilding']},effects:[pres(36),{id:'concord',amount:6,words:'The people trust the house: +6 standing'}],hooks:['priesthood offices (clergy)'],fame:50,ruinYears:40}),
 D({id:'library',label:'great archive',blurb:'A hall of tablets and scrolls where methods are kept and taught.',inspiration:un('Alexandria-type libraries'),site:S('dry','level ground in the town',{grade:{max:.15},hallWithin:{max:140}}),
  cost:C({stone:130,wood:90,copper:6,labour:1700}),crew:{min:3,max:5},minAge:3,affinity:{ecology:{surplus:.6,trade:.4,sacred:.3},faith:['law','sky'],ambitions:['knowledge']},effects:[pres(32),{id:'knowledge',amount:.15,words:'Teaching and practice about 15% faster'}],hooks:['method records kept safe from loss (methodRecords)'],fame:50,ruinYears:25}),
 D({id:'lighthouse',label:'lighthouse',blurb:'A tall fire-tower on a headland that guides hulls home.',inspiration:un('The Pharos of Alexandria'),site:S('deepShore','a headland with deep water within reach',{prominence:2,altitude:{min:2}}),
  cost:C({stone:140,wood:80,copper:12}),crew:{min:3,max:5},minAge:3,affinity:{ecology:{trade:1},faith:['sea','fire'],ambitions:['wealth','security']},effects:[pres(30),{id:'portCapacity',amount:.2,words:'Ships carry about 20% more stores'}],hooks:['sea-storm turnback chance (seaStorms)','sight radius over water (sightRadii)'],fame:45}),
 D({id:'aqueduct',label:'aqueduct',blurb:'A long arcade carrying water across a valley to the town.',inspiration:un('Roman aqueducts'),site:S('bank','a valley with a river and a real drop',{riverWithin:60,relief:4,grade:{max:.5}}),
  cost:C({stone:180,wood:60,labour:2000}),crew:{min:3,max:5},minAge:3,affinity:{ecology:{surplus:.7,scale:.7},ambitions:['legacyBuilding','reform']},effects:[pres(34)],hooks:['water carry reduction across the town (waterReach, waterWorks)'],fame:40}),
 D({id:'greatWall',label:'great wall',blurb:'A wall with towers along a ridge on the edge of the territory.',inspiration:un('Frontier walls such as the limes and the Great Wall'),site:S('dry','a ridge or rise away from the hall',{relief:2,grade:{max:.5},hallWithin:{min:90}}),
  cost:C({stone:200,wood:50,labour:1900}),crew:{min:3,max:5},minAge:2,affinity:{ecology:{threat:1},ambitions:['security','conquest']},effects:[pres(28),{id:'defence',amount:.22,radius:120,words:'Buildings and people within 120 m take 22% less damage'}],hooks:['border markers and toll (polityModel fiscal)'],fame:40}),
 D({id:'mausoleum',label:'great tomb',blurb:'A mound or stepped tomb for the founding house, on high dry ground.',inspiration:un('Pyramids and tholos tombs'),site:S('dry','a high dry rise',{prominence:2.5,grade:{max:.25}}),
  cost:C({stone:190,food:100,labour:2000}),crew:{min:3,max:5},minAge:2,affinity:{ecology:{sacred:.8,scale:.4},faith:['ancestors','sky'],ambitions:['dynasty','legacyBuilding','glory']},effects:[pres(38),{id:'concord',amount:8,words:'The house stands taller: +8 standing'}],hooks:['dynastic legitimacy per heir (rulersState)'],fame:55,ruinYears:50}),
 D({id:'colossus',label:'colossal statue',blurb:'A giant figure that every traveller sees from a day away.',inspiration:un('Colossus of Rhodes'),site:S('bank','level ground near water',{riverWithin:120,grade:{max:.2},hallWithin:{max:200}}),
  cost:C({stone:160,wood:60,copper:20,labour:1900}),crew:{min:3,max:5},minAge:3,affinity:{ecology:{scale:.6,trade:.4,threat:.3},ambitions:['glory','legacyBuilding']},effects:[pres(50,'A landmark the whole world names you by')],hooks:['visibility from far away (sightRadii)'],fame:60}),
 D({id:'stoneCircle',label:'standing stones',blurb:'Great upright stones in a ring, set on a hill of hard rock.',inspiration:un('Megalithic stone circles'),site:S('dry','a hilltop of hard rock',{prominence:4,grade:{max:.25},rock:['granite','basalt','limestone','sandstone']}),
  cost:C({stone:160,wood:30,food:100,labour:1600}),crew:{min:3,max:5},minAge:1,affinity:{ecology:{sacred:.8,pastoral:.5},faith:['sky','ancestors','earth'],ambitions:['faith','knowledge']},effects:[pres(26),{id:'knowledge',amount:.08,words:'Teaching and practice about 8% faster'}],hooks:['calendar events (seasonal markers)'],fame:35,ruinYears:80}),
 D({id:'causeway',label:'great road',blurb:'A paved raised road with milestones that links the town to the world.',inspiration:un('Imperial paved roads'),site:S('dry','firm ground away from the hall',{grade:{max:.3},hallWithin:{min:100}}),
  cost:C({stone:170,wood:50,labour:1700}),crew:{min:3,max:5},minAge:2,affinity:{ecology:{trade:.9,scale:.5},ambitions:['wealth','legacyBuilding']},effects:[pres(30)],hooks:['route wear and travel speed (routeWear)','toll income (fiscal)'],fame:35}),
 D({id:'amphitheatre',label:'amphitheatre',blurb:'An oval of tiered seats for games, plays and public feasts.',inspiration:un('Roman amphitheatres and hippodromes'),site:S('dry','a hillside facing open ground',{grade:{min:.05,max:.4},openGround:true}),
  cost:C({stone:170,wood:70,labour:1800}),crew:{min:3,max:5},minAge:3,affinity:{ecology:{scale:.7,surplus:.4},ambitions:['glory','reform']},effects:[pres(30),{id:'concord',amount:6,words:'Games ease the mood: +6 standing'}],hooks:['festival events (gatherings)'],fame:40}),
 D({id:'iceHouse',label:'ice house',blurb:'A deep earth-covered store that keeps food cold through summer.',inspiration:un('Yakhchal and ice houses'),site:S('bank','shaded rock ground near water',{riverWithin:90,grade:{max:.3},rock:['granite','limestone','shale','basalt','sandstone']}),
  cost:C({stone:90,wood:60,food:60,labour:1100}),crew:{min:3,max:4},minAge:1,affinity:{ecology:{surplus:.6,pastoral:.5},ambitions:['security']},effects:[pres(14),{id:'storage',amount:.18,words:'Stored food spoils about 18% slower'}],hooks:['ice trade good (goods)'],fame:25}),
 D({id:'citadel',label:'fortress citadel',blurb:'A towered keep on a height, last refuge of the people.',inspiration:un('Hill-fort citadels'),site:S('dry','a defensible height',{prominence:5,grade:{max:.3},hallWithin:{max:200}}),
  cost:C({stone:190,wood:80,iron:10,labour:1900}),crew:{min:3,max:5},minAge:3,affinity:{ecology:{threat:1,scale:.3},ambitions:['security','conquest']},effects:[pres(30),{id:'defence',amount:.3,radius:100,words:'Buildings and people within 100 m take 30% less damage'}],hooks:['garrison and siege rules (fortifications)'],fame:40,ruinYears:35}),
 D({id:'pilgrimShrine',label:'pilgrim shrine',blurb:'A stair of terraces climbing to a shrine on a remote height.',inspiration:un('Mountain pilgrimage shrines'),site:S('dry','a remote high point',{prominence:6,altitude:{min:6},grade:{max:.4},hallWithin:{min:100}}),
  cost:C({stone:150,wood:50,food:140,labour:1700}),crew:{min:3,max:5},minAge:2,affinity:{ecology:{sacred:1},faith:['sky','earth','ancestors'],ambitions:['faith']},effects:[pres(32),{id:'concord',amount:6,words:'Faith steadies the house: +6 standing'}],hooks:['pilgrim visitors and gifts (faith pilgrimage doctrine)'],fame:50,ruinYears:60}),
 D({id:'granary',label:'great granary',blurb:'Rows of raised dry store-houses for the state grain.',inspiration:{name:'State horrea and the Cura annonae',source:'https://en.wikipedia.org/wiki/Cura_annonae',verified:true},site:S('dry','dry flat ground close to the hall',{grade:{max:.1},hallWithin:{max:110}}),
  cost:C({stone:90,wood:140,labour:1300}),crew:{min:3,max:4},minAge:1,affinity:{ecology:{pastoral:.7,surplus:.8},ambitions:['security','wealth']},effects:[pres(16),{id:'storage',amount:.25,words:'Stored food spoils about 25% slower'}],hooks:['stock cap (pantry capacity)'],fame:25}),
 D({id:'harbourMole',label:'harbour mole',blurb:'A long stone arm into the sea with a light at its end.',inspiration:un('Breakwater moles'),site:S('deepShore','a shore with deep water at the face',{altitude:{max:12}}),
  cost:C({stone:170,wood:90,labour:1800}),crew:{min:3,max:5},minAge:3,affinity:{ecology:{trade:1,threat:.2},faith:['sea'],ambitions:['wealth','security']},effects:[pres(26),{id:'portCapacity',amount:.25,words:'Ships carry about 25% more stores'}],hooks:['storm shelter for moored hulls (seaStorms)'],fame:40}),
 D({id:'caravanserai',label:'caravan court',blurb:'A walled court with stalls, a well and a gate for traders on the road.',inspiration:{name:'Old Assyrian karum trade posts',source:'https://en.wikipedia.org/wiki/Karum_(trade_post)',verified:true},site:S('dry','flat ground a walk from the hall',{grade:{max:.12},hallWithin:{min:60,max:250}}),
  cost:C({stone:110,wood:110,labour:1400}),crew:{min:3,max:4},minAge:2,affinity:{ecology:{trade:1,pastoral:.4},faith:['trade'],ambitions:['wealth']},effects:[pres(24)],hooks:['route safety and rest (waystations stage 3)','toll income (fiscal)'],fame:35}),
 D({id:'bathhouse',label:'public baths',blurb:'A domed hall of pools fed from a stream.',inspiration:un('Roman thermae'),site:S('bank','flat ground within 80 m of a river',{riverWithin:80,grade:{max:.15},hallWithin:{max:160}}),
  cost:C({stone:130,wood:100,labour:1500}),crew:{min:3,max:4},minAge:3,affinity:{ecology:{surplus:.7,scale:.4},ambitions:['reform','glory']},effects:[pres(22),{id:'concord',amount:5,words:'Bathing eases tempers: +5 standing'}],hooks:['illness recovery (health)'],fame:30}),
 D({id:'stepwell',label:'stepwell',blurb:'A stepped well that reaches the water table; shade and shrine at the top.',inspiration:un('Indian stepwells'),site:S('dry','a catchment slope on porous rock',{catchment:true,grade:{max:.3},rock:['sandstone','limestone','sediment','shale']}),
  cost:C({stone:150,wood:40,labour:1700}),crew:{min:3,max:4},minAge:2,affinity:{ecology:{sacred:.5,pastoral:.4},faith:['earth'],ambitions:['security','faith']},effects:[pres(26)],hooks:['dry-season water source (waterReach, hydrology depth)'],fame:30}),
 D({id:'beaconTower',label:'beacon tower',blurb:'A high fire-tower that passes warning along the hills.',inspiration:un('Beacon chains'),site:S('dry','a high point with a long view',{prominence:7,grade:{max:.35},hallWithin:{max:280}}),
  cost:C({stone:90,wood:80,labour:1000}),crew:{min:3,max:4},minAge:1,affinity:{ecology:{threat:.9,pastoral:.3},ambitions:['security']},effects:[pres(14),{id:'defence',amount:.12,radius:90,words:'Warned in time: buildings and people within 90 m take 12% less damage'}],hooks:['raid warning radius (guardDuty, sightRadii)'],fame:25}),
 D({id:'arsenal',label:'ship slips',blurb:'Covered slips on a sheltered shore where hulls are built and refitted.',inspiration:un('The Venice Arsenal'),site:S('deepShore','a sheltered shore with deep water',{altitude:{max:10}}),
  cost:C({stone:120,wood:180,iron:8,labour:1700}),crew:{min:3,max:5},minAge:3,affinity:{ecology:{trade:.6,threat:.6},faith:['sea'],ambitions:['wealth','conquest']},effects:[pres(26),{id:'portCapacity',amount:.15,words:'Ships carry about 15% more stores'}],hooks:['hull build speed (boatClasses, crafting)'],fame:35}),
];
const BY_ID=new Map<string,WonderDefinition>(WONDER_DEFS.map(d=>[d.id,d]));
export const WONDER_IDS:readonly WonderId[]=WONDER_DEFS.map(d=>d.id);
export const wonderDef=(id:string):WonderDefinition|undefined=>BY_ID.get(id);
export const isWonderId=(id:unknown):id is WonderId=>typeof id==='string'&&BY_ID.has(id);
export const wonderLabel=(id:string)=>BY_ID.get(id)?.label??id;
/** Foundable now (earthworks wonders are listed but refused). */
export const foundableDefs=()=>WONDER_DEFS.filter(d=>!d.earthworks);
export const stageGoodsFraction=(stage:number)=>WONDER_STAGES[Math.max(0,Math.min(STAGE_COUNT-1,stage))].goods;
/** Goods of one stage: rounded shares, the last stage takes the remainder so the stages add up exactly to the cost. */
export function stageGoods(id:string,stage:number):Record<Good,number>{
 const d=BY_ID.get(id),out={wood:0,stone:0,food:0,copper:0,iron:0};if(!d)return out;
 for(const k of Object.keys(out) as Good[]){const total=d.cost[k]??0;let before=0;for(let i=0;i<stage;i++)before+=Math.round(total*WONDER_STAGES[i].goods);out[k]=stage>=STAGE_COUNT-1?total-before:Math.round(total*WONDER_STAGES[stage].goods);}
 return out;
}
/** Cumulative labour share at the end of each stage (1 at the last). */
export const stageEnds=WONDER_STAGES.reduce<number[]>((a,s)=>[...a,(a[a.length-1]??0)+s.labour],[]);
export const stageOfLabour=(labour:number,need:number)=>{const f=need>0?labour/need:1;let n=0;for(const e of stageEnds)if(f>=e-1e-9)n++;return Math.min(STAGE_COUNT,n);};
export function validRegistry(){
 const issues:string[]=[],seen=new Set<string>();
 const sum=(k:'labour'|'goods')=>WONDER_STAGES.reduce((n,s)=>n+s[k],0);
 if(Math.abs(sum('labour')-1)>1e-9)issues.push('stage labour shares do not sum to 1');if(Math.abs(sum('goods')-1)>1e-9)issues.push('stage goods shares do not sum to 1');
 for(const d of WONDER_DEFS){
  if(seen.has(d.id))issues.push(`duplicate ${d.id}`);seen.add(d.id);
  if(!d.label||!d.blurb)issues.push(`${d.id}: words`);
  if(!d.inspiration.verified&&!d.inspiration.name.includes('[UNVERIFIED]'))issues.push(`${d.id}: unsourced analogue must say [UNVERIFIED]`);
  if(d.inspiration.verified&&!d.inspiration.source)issues.push(`${d.id}: verified analogue needs a source`);
  for(const k of ['wood','stone','food','labour'] as const)if(!(d.cost[k]>0))issues.push(`${d.id}: cost ${k}`);
  if(d.crew.min<1||d.crew.max<d.crew.min||d.crew.max>8)issues.push(`${d.id}: crew`);
  if(!Number.isInteger(d.minAge)||d.minAge<0||d.minAge>5)issues.push(`${d.id}: minAge`);
  if(d.fame<20||d.fame>60)issues.push(`${d.id}: fame`);
  if(!d.effects.some(e=>e.id==='prestige')&&!d.earthworks)issues.push(`${d.id}: every wonder gives prestige`);
  if(!d.effects.length&&!d.hooks.length)issues.push(`${d.id}: no effect and no hook`);
  for(const e of d.effects)if(!(e.amount>0)||!e.words)issues.push(`${d.id}: effect ${e.id}`);
  if(d.effects.some(e=>e.id==='defence'&&!(e.radius&&e.radius>0)))issues.push(`${d.id}: defence needs a radius`);
  if(!d.legacySite&&!d.kit)issues.push(`${d.id}: needs a kit recipe`);
  if(d.kit&&d.kit.ornaments.length<1)issues.push(`${d.id}: recipe ornaments`);
  const s=d.site;if(s.grade&&s.grade.min!==undefined&&s.grade.max!==undefined&&s.grade.min>s.grade.max)issues.push(`${d.id}: grade range`);
 }
 return issues;
}
