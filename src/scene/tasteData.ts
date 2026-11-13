/** TASTE ENVELOPE DATA (pure objects, no logic). Every number here is a DESIGN VALUE chosen for the game's look; real traditions are named only as
 *  inspiration for the kind of thing (a dye, a motif family), never copied. Nothing here was fetched from a source; see docs/TASTE_ENVELOPE.md [UNVERIFIED].
 *  Logic lives in tasteEnvelope.ts. To widen or narrow the look of every generated civ, edit this file only. */
import type {Material} from '../game/civGenerator';
import type {CivId,RoofForm} from './civStyles';

export type Climate='arid'|'temperate'|'cold'|'wet';
export const CLIMATES:Climate[]=['arid','temperate','cold','wet'];
export type Role='wall'|'wall2'|'roof'|'trim'|'accent'|'cloth'|'ground';
export const ROLES:Role[]=['wall','wall2','roof','trim','accent','cloth','ground'];
export const MADE_ROLES:Role[]=['wall','wall2','roof','trim','accent','cloth'];

// ------------------------------------------------------------------ (a) pigments: what a people of a given age and place can actually make
export type PigmentKind='neutral'|'earth'|'dye'|'mineral'|'rare';
export type Pigment={id:string;hex:string;kind:PigmentKind;/** first era (0 huts .. 5) a people can make it */minEra:number;/** relative pick weight */weight:number;climates:Climate[]|'all'};
const ALL='all' as const;
export const PIGMENTS:Pigment[]=[
 {id:'limeWhite',hex:'#e8dfc8',kind:'neutral',minEra:1,weight:3,climates:ALL},
 {id:'bleachedLinen',hex:'#ece4d0',kind:'neutral',minEra:2,weight:2,climates:['arid','temperate','wet']},
 {id:'undyedWool',hex:'#cbbd9f',kind:'neutral',minEra:0,weight:3,climates:['temperate','cold','arid']},
 {id:'brownWool',hex:'#7d6347',kind:'neutral',minEra:0,weight:2,climates:['temperate','cold']},
 {id:'ironGall',hex:'#34302d',kind:'neutral',minEra:2,weight:1,climates:ALL},
 {id:'yellowOchre',hex:'#c9a043',kind:'earth',minEra:0,weight:3,climates:ALL},
 {id:'redOchre',hex:'#a65a3c',kind:'earth',minEra:0,weight:3,climates:ALL},
 {id:'umber',hex:'#6b5139',kind:'earth',minEra:0,weight:2,climates:ALL},
 {id:'sienna',hex:'#b0703f',kind:'earth',minEra:0,weight:2,climates:['arid','temperate']},
 {id:'weld',hex:'#d2b23e',kind:'dye',minEra:2,weight:2,climates:['temperate','cold','wet']},
 {id:'madder',hex:'#a8412f',kind:'dye',minEra:2,weight:3,climates:ALL},
 {id:'woad',hex:'#4f6f93',kind:'dye',minEra:2,weight:3,climates:['temperate','cold','wet']},
 {id:'indigo',hex:'#2e4a73',kind:'dye',minEra:3,weight:3,climates:['arid','wet','temperate']},
 {id:'verdigris',hex:'#5f8672',kind:'mineral',minEra:2,weight:2,climates:['arid','wet','temperate']},
 {id:'dyersGreen',hex:'#5d7d45',kind:'dye',minEra:3,weight:2,climates:['temperate','wet','cold']},
 {id:'saffron',hex:'#d08a2c',kind:'dye',minEra:3,weight:2,climates:['arid','wet']},
 {id:'malachite',hex:'#3f8a64',kind:'mineral',minEra:3,weight:1,climates:['arid','wet']},
 {id:'crimson',hex:'#9c2f3a',kind:'rare',minEra:4,weight:.5,climates:ALL},
 {id:'lapis',hex:'#2b4f93',kind:'rare',minEra:4,weight:.5,climates:['arid','temperate']},
 {id:'tyrian',hex:'#6b3a64',kind:'rare',minEra:4,weight:.15,climates:ALL},
];
export const PIGMENT_BY_ID:Record<string,Pigment>=Object.fromEntries(PIGMENTS.map(p=>[p.id,p]));
/** The era-0 stand-in for a dye a people cannot make yet (what they wear and paint with instead). */
export const EARLY_FALLBACK:Record<PigmentKind,string>={neutral:'undyedWool',earth:'yellowOchre',dye:'redOchre',mineral:'yellowOchre',rare:'redOchre'};

/** Colour limits per profile. 'generated' is what a freshly generated civ must satisfy. 'exemplar' is widened just enough to contain the 14 approved
 *  presets and the registry skins (measured by scripts/taste-envelope.test.mjs), so presets are exemplar points of the same model. */
export type Limits={satCap:Record<Role,number>;lBand:Record<Role,[number,number]>;maxFamilies:number;meanSatCap:number;floorL:number;ceilL:number;darkBrownL:number;
 contrast:{wallRoof:number;wallTrim:number;wallAccent:number;clothTrim:number};purple:{maxRoles:number;satCap:number;lMax:number};complementGap:[number,number];analogGap:number;minCoherence:number};
export const LIMITS:Record<'generated'|'exemplar',Limits>={
 generated:{satCap:{wall:.50,wall2:.50,roof:.52,trim:.58,accent:.68,cloth:.64,ground:.50},lBand:{wall:[.42,.92],wall2:[.28,.88],roof:[.22,.88],trim:[.2,.9],accent:[.3,.72],cloth:[.22,.92],ground:[.3,.8]},
  maxFamilies:3,meanSatCap:.44,floorL:.14,ceilL:.95,darkBrownL:.34,contrast:{wallRoof:.09,wallTrim:.1,wallAccent:.1,clothTrim:.06},purple:{maxRoles:1,satCap:.5,lMax:.42},complementGap:[140,220],analogGap:50,minCoherence:.05},
 exemplar:{satCap:{wall:.74,wall2:.60,roof:.62,trim:.70,accent:.78,cloth:.78,ground:.55},lBand:{wall:[.34,.92],wall2:[.24,.88],roof:[.2,.92],trim:[.22,.9],accent:[.28,.72],cloth:[.2,.92],ground:[.28,.8]},
  maxFamilies:3,meanSatCap:.62,floorL:.12,ceilL:.97,darkBrownL:.26,contrast:{wallRoof:.05,wallTrim:.05,wallAccent:.06,clothTrim:.03},purple:{maxRoles:1,satCap:.6,lMax:.42},complementGap:[130,230],analogGap:60,minCoherence:.1},
};
/** Hues (deg) treated as ONE 'earth' family (ochre, sienna, umber, madder-red, terracotta): they coexist freely in real built environments. */
export const EARTH_HUES:[number,number]=[0,58];
/** Tyrian-like purple/magenta band. */
export const PURPLE_HUES:[number,number]=[262,345];

// ------------------------------------------------------------------ (c) materials: availability by biome and compatibility
export const MATERIAL_ERA:Record<Material,number>={thatch:0,wood:0,turf:0,felt:0,bamboo:0,mudbrick:0,stone:1,plaster:2,brick:2,timberFrame:2};
/** What a place can supply (timber vs stone vs mud vs reed vs hide). weight 0 = not available. */
export const MATERIAL_BY_CLIMATE:Record<Climate,Partial<Record<Material,number>>>={
 arid:{mudbrick:3,stone:3,brick:2,plaster:3,felt:1,thatch:.5},
 temperate:{wood:3,stone:2,brick:2,timberFrame:2,thatch:2,plaster:1.5,mudbrick:.7,turf:.4},
 cold:{wood:3,stone:2,turf:3,felt:2,thatch:1,timberFrame:1},
 wet:{bamboo:3,thatch:3,wood:2,timberFrame:1.5,plaster:.8,stone:.6},
};
/** The hut a people builds before they own their signature wall (era 0-1). */
export const HUT_MATERIAL:Record<Climate,Material>={arid:'mudbrick',temperate:'wood',cold:'turf',wet:'bamboo'};
/** Unordered pairs that never share one building (the wall/roof pairings that read as an error). */
export const FORBIDDEN_PAIRS:[Material,Material][]=[['felt','brick'],['felt','stone'],['felt','plaster'],['felt','timberFrame'],['felt','mudbrick'],['bamboo','brick'],['bamboo','stone'],['bamboo','mudbrick'],['bamboo','plaster'],['turf','plaster'],['turf','brick'],['turf','bamboo'],['turf','timberFrame'],['mudbrick','timberFrame'],['thatch','brick']];
/** Roof form -> wall/roof materials it can sit on (structure and weather logic). */
export const ROOF_MATERIALS:Record<RoofForm,Material[]>={
 flatParapet:['mudbrick','stone','brick','plaster'],flatPalm:['mudbrick','stone','brick','plaster','thatch'],flatSpiked:['mudbrick','stone','brick','plaster'],vault:['mudbrick','stone','brick','plaster'],
 upturnedHip:['timberFrame','wood','plaster','bamboo','stone'],chhatri:['stone','plaster','brick'],terracottaGable:['brick','plaster','stone','timberFrame','wood'],
 conicalThatch:['thatch','wood','mudbrick','bamboo','stone'],steepThatch:['thatch','wood','turf','timberFrame','stone'],palmGable:['thatch','bamboo','wood','timberFrame'],roundCone:['thatch','wood','mudbrick','stone','timberFrame'],
 saddle:['wood','bamboo','thatch','timberFrame'],plankGable:['wood','timberFrame','stone'],feltDome:['felt','wood'],turfLow:['turf','stone','wood'],
};
export const ROOFS_BY_CLIMATE:Record<Climate,RoofForm[]>={arid:['flatParapet','flatPalm','vault','flatSpiked'],temperate:['terracottaGable','roundCone','saddle','conicalThatch'],cold:['plankGable','turfLow','steepThatch','feltDome'],wet:['upturnedHip','palmGable','chhatri','saddle']};
/** Roof form -> the grammar families that draw it well, nominal pitch (degrees from horizontal), and the material the roofing reads as. */
export const ROOF_PITCH:Record<RoofForm,number>={flatParapet:2,flatPalm:2,flatSpiked:2,vault:18,upturnedHip:38,chhatri:25,terracottaGable:30,conicalThatch:50,steepThatch:55,palmGable:40,roundCone:45,saddle:35,plankGable:38,feltDome:30,turfLow:16};
export const ROOF_PITCH_TOL=9;

// ------------------------------------------------------------------ (b) proportion envelopes by climate (ratios, not metres)
export type Proportions={/** house width : height to the ridge */widthHeight:number;/** roof pitch, degrees */pitch:number;/** eave overhang as a fraction of wall height */overhang:number;/** wall thickness as a fraction of house width */wallThick:number;/** door height as a fraction of wall height */door:number;/** window area as a fraction of the front wall */window:number};
export type Range=[number,number];
export const PROPORTIONS:Record<Climate,Record<keyof Proportions,Range>>={
 arid:{widthHeight:[.9,2.2],pitch:[0,30],overhang:[0,.12],wallThick:[.06,.2],door:[.45,.75],window:[.005,.06]},
 temperate:{widthHeight:[.8,1.7],pitch:[14,52],overhang:[.1,.35],wallThick:[.03,.14],door:[.5,.78],window:[.03,.14]},
 cold:{widthHeight:[.9,2.3],pitch:[14,58],overhang:[.06,.3],wallThick:[.05,.18],door:[.45,.72],window:[.015,.1]},
 wet:{widthHeight:[.7,1.6],pitch:[24,60],overhang:[.18,.5],wallThick:[.02,.1],door:[.5,.8],window:[.05,.18]},
};
/** Measured silhouette envelope of the real generated buildings (footprint's longer side over total height), calibrated on the 14 grammars: house 1.06-2.21, civic 0.90-2.63 [measured 2026-11-13]. */
export const MEASURED_RATIO={house:[.8,2.4] as Range,civic:[.8,2.8] as Range};
/** Walls thick by construction: a thin-walled material cannot carry a thick-wall ratio and vice versa (fraction of house width). */
export const WALL_THICK_BY_MATERIAL:Record<Material,Range>={stone:[.08,.2],mudbrick:[.08,.2],brick:[.06,.14],plaster:[.05,.16],turf:[.1,.2],wood:[.02,.08],timberFrame:[.03,.09],bamboo:[.02,.06],thatch:[.03,.1],felt:[.015,.05]};

// ------------------------------------------------------------------ (d) ornament families: motif source families, zones, density and repeat caps
export type OrnamentFamily='geometricWeave'|'carvedLintel'|'paintedBand'|'mosaic'|'inlay'|'incised';
export type Zone='lintel'|'dado'|'frieze'|'eave'|'doorJamb'|'banner'|'hem'|'neckline'|'potRim'|'potBelly'|'shieldField';
export type Symmetry='bilateral'|'radial'|'translational';
export type FamilySpec={/** inspiration only (kind of tradition), no cultural copy */note:string;motifs:string[];materials:Material[];zones:Zone[];symmetry:Symmetry[];repeat:Range;era:number};
export const ORNAMENT:Record<OrnamentFamily,FamilySpec>={
 geometricWeave:{note:'loom and plait geometry (bands of diamonds, steps, zigzags)',motifs:['stepped','lozenge','zigzag','chevron','lattice'],materials:['felt','bamboo','thatch','wood','turf','timberFrame'],zones:['hem','neckline','banner','potRim','shieldField','eave'],symmetry:['translational','bilateral'],repeat:[4,24],era:0},
 carvedLintel:{note:'relief on door heads and posts (knots, spirals, leaf bands)',motifs:['knot','spiral','meander','wave'],materials:['wood','stone','timberFrame','mudbrick'],zones:['lintel','doorJamb','frieze','eave'],symmetry:['bilateral','radial'],repeat:[2,12],era:1},
 paintedBand:{note:'one or two painted bands at dado or frieze height in earth or dye colour',motifs:['stepped','wave','meander','zigzag','chevron'],materials:['plaster','mudbrick','wood','brick','stone'],zones:['dado','frieze','doorJamb','potBelly','potRim'],symmetry:['translational'],repeat:[6,28],era:1},
 mosaic:{note:'small tessera or tile fields around a doorway or a floor',motifs:['lozenge','stepped','lattice','meander'],materials:['stone','brick','plaster'],zones:['dado','doorJamb','frieze','lintel'],symmetry:['radial','bilateral','translational'],repeat:[6,30],era:3},
 inlay:{note:'light stone or metal set into a darker ground (lines, rosettes)',motifs:['lozenge','spiral','knot','lattice','wave'],materials:['wood','stone','timberFrame','brick'],zones:['lintel','frieze','shieldField','doorJamb'],symmetry:['bilateral','radial'],repeat:[3,16],era:3},
 incised:{note:'scratched lines and dots on clay, bone and plank',motifs:['zigzag','chevron','stepped','wave','lozenge'],materials:['mudbrick','wood','stone','turf','felt','bamboo','plaster'],zones:['potRim','potBelly','shieldField','doorJamb','dado'],symmetry:['translational'],repeat:[5,20],era:0},
};
export const MOTIFS=['stepped','lozenge','meander','wave','zigzag','spiral','knot','lattice','chevron'];
export const ORNAMENT_MAX_DENSITY_BY_ERA=[.1,.16,.28,.4,.54,.68];
export const ORNAMENT_MAX_ZONES=3;
export const ORNAMENT_MAX_MOTIFS=2;
export const SATURATION_CAP_BY_ERA=[.32,.38,.46,.55,.62,.72];

// ------------------------------------------------------------------ (e) people garb envelopes by climate
export type Cut='wrap'|'tunic'|'poncho'|'robe'|'kilt'|'cape'|'trousers';
export type Head='none'|'wrap'|'cap'|'hood'|'brim'|'band'|'braids';
export type Fibre='linen'|'wool'|'felt'|'hide'|'fur'|'cotton'|'bark'|'feather'|'silk'|'leather';
export const GARB:Record<Climate,{cuts:Cut[];heads:Head[];fibres:Fibre[]}>={
 arid:{cuts:['robe','kilt','wrap','tunic'],heads:['wrap','band','cap','brim','none'],fibres:['linen','cotton','wool','leather']},
 temperate:{cuts:['tunic','trousers','cape','kilt','robe','wrap'],heads:['cap','band','braids','none','wrap'],fibres:['wool','linen','leather']},
 cold:{cuts:['cape','trousers','tunic','poncho'],heads:['hood','cap','braids','none'],fibres:['wool','felt','hide','fur','leather']},
 wet:{cuts:['wrap','tunic','kilt','robe'],heads:['brim','band','wrap','none','braids'],fibres:['cotton','linen','bark','feather','silk']},
};
export const GARB_MAX_HUES=2;

// ------------------------------------------------------------------ era progression
export const ERA_NAMES=['huts','camp','village','town','city','empire'];
/** The grammar families a climate's civ may borrow (grammar id -> climate of the bible it comes from): derived at runtime from CIVS, listed here only as the minimum distance rules. */
export const DISTANCE={weights:{palette:.45,silhouette:.3,ornament:.25},/** a game's civs must be at least this far apart overall */minPair:.3,minPalette:.18,minForm:.22,/** and this far from every preset */minFromPreset:.12,paletteScale:.2};
export type GrammarOf=CivId;
