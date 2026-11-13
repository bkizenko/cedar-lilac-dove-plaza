/** PEOPLE LOOK (people v2): who a society's people ARE, as pure JSON-safe data and maths (no three.js, no clock).
 *
 *  A `PeopleLook` is the per-society layer under the shared character rig: body frame ranges, skin / hair / face ranges, hair and
 *  headwear families, clothing cut and layering by warmth, fibre and dye families, footwear, jewellery, original invented body-marking
 *  patterns, how the owned padded torso is built, helmet and shield families. One look exists per civ bible (LOOKS); any other skin
 *  (the extra registry skins, remix and free skins from the generator, a future SkinSpec) gets one from `lookForSkin`, which starts
 *  from the base civ's look and applies the skin's own `look` overrides, its garb (cut / headwear / colours) and, for generated
 *  skins, seeded mutations, so every skin reads as its own people with no new code.
 *
 *  Nothing here names or copies a real people. Frames, tones, hair, patterns and cuts are invented combinations; skin tones come from
 *  one shared nine-step ramp and each society uses a three-step band of it, assigned without following any real-world correlation.
 *
 *  `individualFor` turns (society, unit id) into one person: height and build jitter, skin/hair/face pick, age wear, dirt, marks,
 *  jewellery. It is a pure function of ids the save already stores (world seed and skin live in the culture key, unit id in the
 *  unit), so identity survives save/load with no new persisted fields. Discrete picks are quantised so a crowd shares geometry.
 *
 *  `roleOf` names a person's role from REAL unit state only (type, age class, owned farm tool, scouting, trading, live production
 *  recipe); it never invents work. */
import {hashSeed,seededRandom,type Rng} from './buildingParts';
import {CIVS,type CivId} from './civStyles';
import type {CivSkin} from './civSkin';
import type {BodyClass} from './characterRig';

export type Fibre='linen'|'wool'|'felt'|'hide'|'fur'|'cotton'|'bark'|'feather'|'silk'|'leather';
export type HairStyle='crop'|'bob'|'long'|'topknot'|'braids'|'bun'|'shaved'|'crest'|'locks'|'sideplait'|'curls'|'wrapped';
export type BeardStyle='none'|'stubble'|'short'|'full'|'braided'|'moustache';
export type HeadKind='none'|'turban'|'headcloth'|'feltcap'|'furcap'|'flapcap'|'cone'|'widebrim'|'plume'|'circlet'|'hood'|'fillet'|'kerchief'|'veilwrap';
export type Foot='bare'|'sandal'|'moccasin'|'boot'|'tallboot'|'wraps'|'clog';
export type Jewel='beads'|'collar'|'torc'|'earring'|'earspool'|'bangles'|'armlet'|'brooch'|'amulet'|'anklet'|'shells'|'browband';
export type MarkKind='none'|'paint'|'tattoo'|'scar';
export type MarkPattern='tideLines'|'knotBand'|'chevronChest'|'cheekDots'|'browStripe'|'spiralBrow'|'foreheadDot'|'tickRows'|'leafBand'|'eyeBand'|'handDots';
export type MarkSite='face'|'arms'|'chest'|'hands';
export type ArmorStyle='quilted'|'felt'|'hide'|'wicker'|'bark'|'linen'|'scale'|'lamellar'|'mail'|'plate';
export type HelmStyle='rounded'|'conical'|'kettle'|'crested'|'nasal'|'plumed'|'feltcap'|'horsehair';
export type ShieldShape='round'|'oval'|'kite'|'tower'|'wicker'|'buckler';
export type Cut={torso:'bare'|'vest'|'tunic'|'robe'|'deel'|'poncho'|'wrapchest'|'drape';/** hem height above the feet, metres in the unit frame */hem:number;sleeve:'none'|'short'|'long'|'wide';
 lower:'none'|'kilt'|'skirt'|'trousers'|'dhoti'|'leggings'|'wrapped';mantle:'none'|'cape'|'fur'|'shawl'|'feather'|'blanket'|'hood';belt:'none'|'cord'|'sash'|'wide'};
export type Warmth='light'|'mild'|'cold';
export type Body={/** mean height multiple of the shared adult frame */height:number;shoulder:number;chest:number;waist:number;hip:number;limb:number;head:number;neck:number;hand:number;/** waist line shift: + long torso / short legs, - long legs */torso:number};
export type PeopleLook={id:string;body:Body;
 /** three adjacent steps of SKIN_RAMP */skin:[number,number,number];
 hair:{colors:string[];styles:HairStyle[];beard:{p:number;styles:BeardStyle[]}};
 face:{nose:number;brow:number;jaw:number;ears:number};
 cuts:Record<Warmth,Cut>;
 /** which fibre each real garment item is made of here */fibre:{light:Fibre;skin:Fibre;leather:Fibre;hide:Fibre;wool:Fibre};
 /** local dye / fibre colour family: base cloth, second layer, trim, accent */dyes:{cloth:string[];under:string;trim:string;accent:string};
 head:{light:HeadKind;cold:HeadKind;rank:HeadKind};foot:{warm:Foot;cold:Foot};jewel:Jewel[];
 mark:{kind:MarkKind;pattern:MarkPattern;sites:MarkSite[];colour:string;p:number};
 /** how this society builds the padded torso the simulation can own, and the protection styles it knows for later assets */armor:{padded:ArmorStyle};helm:HelmStyle;shield:ShieldShape;
 /** idle character: weight shift sway (radians) and breathing depth multiples */gait:{sway:number;breath:number}};

// ---------------------------------------------------------------- shared data
/** One shared nine-step ramp. Each society takes a three-step band, assigned without following any real-world correlation. */
export const SKIN_RAMP=['#efd2b4','#e4bb98','#d4a37c','#c08963','#a77050','#8b583b','#6e432e','#553224','#3f261c'] as const;
export const HAIR_COLOURS={black:'#1d1714',ink:'#15171d',darkBrown:'#3a2a20',brown:'#5a3d2a',chestnut:'#7a4f30',auburn:'#8a4426',ginger:'#a8552a',sandy:'#a98a52',blond:'#c9a96a',ash:'#9a8f7e',grey:'#c9c5bb',white:'#e6e2da'} as const;
const H=HAIR_COLOURS;
export const ROLES=['child','elder','farmer','hunter','smith','priest','ruler','soldier','scout','merchant','worker'] as const;
export type Role=typeof ROLES[number];

const C=(torso:Cut['torso'],hem:number,sleeve:Cut['sleeve'],lower:Cut['lower'],mantle:Cut['mantle'],belt:Cut['belt']):Cut=>({torso,hem,sleeve,lower,mantle,belt});
const B=(height:number,shoulder:number,chest:number,waist:number,hip:number,limb:number,head:number,neck:number,hand:number,torso:number):Body=>({height,shoulder,chest,waist,hip,limb,head,neck,hand,torso});

/** The fourteen civ looks. Frames are deliberately spread (tall lean to short broad); every row differs in cut, headwear, fibre and dye family. */
export const LOOKS:Record<CivId,PeopleLook>={
 sandrill:{id:'sandrill',body:B(1.05,.93,.95,.9,.92,.94,.96,1.1,.96,-.01),skin:[3,4,5],hair:{colors:[H.black,H.darkBrown,H.ink],styles:['wrapped','topknot','crop'],beard:{p:.55,styles:['short','moustache','stubble']}},face:{nose:1.1,brow:1.05,jaw:.95,ears:1},
  cuts:{light:C('robe',.1,'wide','trousers','none','sash'),mild:C('robe',.08,'long','trousers','shawl','sash'),cold:C('robe',.08,'long','trousers','blanket','wide')},
  fibre:{light:'linen',skin:'hide',leather:'leather',hide:'hide',wool:'wool'},dyes:{cloth:['#c9803c','#e8dcc0','#8a3a2a'],under:'#e8dcc0',trim:'#5a2a1a',accent:'#2f6a78'},
  head:{light:'turban',cold:'turban',rank:'veilwrap'},foot:{warm:'sandal',cold:'boot'},jewel:['earring','beads','bangles'],mark:{kind:'paint',pattern:'eyeBand',sites:['face'],colour:'#2a2420',p:.45},armor:{padded:'linen'},helm:'conical',shield:'oval',gait:{sway:.035,breath:.8}},
 nilemark:{id:'nilemark',body:B(1.02,.98,.88,.82,.9,.9,.98,1.12,.92,-.02),skin:[4,5,6],hair:{colors:[H.black,H.ink,H.darkBrown],styles:['bob','crop','shaved'],beard:{p:.12,styles:['stubble','none']}},face:{nose:.95,brow:.9,jaw:.9,ears:1.05},
  cuts:{light:C('bare',.22,'none','kilt','none','sash'),mild:C('wrapchest',.2,'none','kilt','shawl','sash'),cold:C('tunic',.14,'short','kilt','blanket','sash')},
  fibre:{light:'linen',skin:'hide',leather:'leather',hide:'hide',wool:'wool'},dyes:{cloth:['#eee6d2','#e0d2ae','#9ec0d0'],under:'#e8dcc0',trim:'#3f78a8',accent:'#c9a23c'},
  head:{light:'fillet',cold:'headcloth',rank:'circlet'},foot:{warm:'sandal',cold:'sandal'},jewel:['collar','bangles','earring'],mark:{kind:'paint',pattern:'eyeBand',sites:['face'],colour:'#1f3a4a',p:.5},armor:{padded:'linen'},helm:'feltcap',shield:'tower',gait:{sway:.025,breath:.7}},
 tigrane:{id:'tigrane',body:B(1.0,1.04,1.06,.98,1.02,1.04,1.02,.98,1.04,.01),skin:[2,3,4],hair:{colors:[H.black,H.darkBrown,H.brown],styles:['long','curls','bob'],beard:{p:.78,styles:['full','braided']}},face:{nose:1.18,brow:1.12,jaw:1.08,ears:1},
  cuts:{light:C('robe',.14,'short','skirt','none','wide'),mild:C('robe',.1,'long','skirt','shawl','wide'),cold:C('robe',.1,'long','trousers','cape','wide')},
  fibre:{light:'linen',skin:'hide',leather:'leather',hide:'fur',wool:'wool'},dyes:{cloth:['#2f4f8a','#e2d6b8','#8a2e3a'],under:'#e2d6b8',trim:'#d1a43a',accent:'#2a8a8a'},
  head:{light:'headcloth',cold:'feltcap',rank:'circlet'},foot:{warm:'sandal',cold:'boot'},jewel:['bangles','earring','armlet'],mark:{kind:'none',pattern:'knotBand',sites:['arms'],colour:'#2a2420',p:0},armor:{padded:'felt'},helm:'conical',shield:'round',gait:{sway:.03,breath:1}},
 hanrei:{id:'hanrei',body:B(.97,.94,.94,.9,.94,.92,1.0,1.0,.94,.0),skin:[1,2,3],hair:{colors:[H.black,H.ink,H.darkBrown],styles:['topknot','bun','long'],beard:{p:.3,styles:['moustache','none','stubble']}},face:{nose:.9,brow:.92,jaw:.92,ears:1},
  cuts:{light:C('robe',.1,'wide','trousers','none','sash'),mild:C('robe',.08,'wide','trousers','none','sash'),cold:C('robe',.07,'long','trousers','cape','wide')},
  fibre:{light:'silk',skin:'hide',leather:'leather',hide:'fur',wool:'cotton'},dyes:{cloth:['#a63a3a','#efe4cc','#2f6a62'],under:'#efe4cc',trim:'#d4a64a',accent:'#2f6a62'},
  head:{light:'widebrim',cold:'furcap',rank:'plume'},foot:{warm:'clog',cold:'boot'},jewel:['amulet','browband','armlet'],mark:{kind:'none',pattern:'knotBand',sites:['arms'],colour:'#2a2420',p:0},armor:{padded:'quilted'},helm:'plumed',shield:'round',gait:{sway:.02,breath:.7}},
 vedara:{id:'vedara',body:B(.98,.94,.92,.88,.96,.92,.98,1.04,.94,-.02),skin:[5,6,7],hair:{colors:[H.black,H.ink,H.darkBrown],styles:['bun','long','braids'],beard:{p:.35,styles:['short','moustache']}},face:{nose:1.0,brow:.96,jaw:.94,ears:1.04},
  cuts:{light:C('drape',.18,'none','dhoti','none','cord'),mild:C('drape',.14,'short','dhoti','shawl','sash'),cold:C('tunic',.12,'long','dhoti','shawl','sash')},
  fibre:{light:'cotton',skin:'hide',leather:'leather',hide:'hide',wool:'wool'},dyes:{cloth:['#e0902a','#f0e4c8','#a63a5a'],under:'#f0e4c8',trim:'#c9a23c',accent:'#2f7a62'},
  head:{light:'none',cold:'headcloth',rank:'circlet'},foot:{warm:'bare',cold:'sandal'},jewel:['bangles','beads','earring'],mark:{kind:'paint',pattern:'foreheadDot',sites:['face','arms'],colour:'#b8402a',p:.7},armor:{padded:'quilted'},helm:'conical',shield:'buckler',gait:{sway:.03,breath:.8}},
 aureline:{id:'aureline',body:B(1.0,1.0,1.0,.94,.98,1.0,1.0,1.0,1.0,.0),skin:[2,3,4],hair:{colors:[H.darkBrown,H.brown,H.black,H.chestnut],styles:['curls','crop','bob'],beard:{p:.4,styles:['short','stubble','full']}},face:{nose:1.1,brow:1.0,jaw:1.0,ears:1},
  cuts:{light:C('tunic',.3,'none','none','none','cord'),mild:C('tunic',.26,'short','none','cape','cord'),cold:C('tunic',.2,'long','trousers','cape','wide')},
  fibre:{light:'linen',skin:'hide',leather:'leather',hide:'hide',wool:'wool'},dyes:{cloth:['#efe8da','#7a2c6a','#2a5a8a'],under:'#e8e0cc',trim:'#7a2c6a',accent:'#2a5a8a'},
  head:{light:'fillet',cold:'feltcap',rank:'circlet'},foot:{warm:'sandal',cold:'boot'},jewel:['brooch','armlet','earring'],mark:{kind:'none',pattern:'knotBand',sites:['arms'],colour:'#2a2420',p:0},armor:{padded:'linen'},helm:'crested',shield:'round',gait:{sway:.03,breath:.9}},
 sahelan:{id:'sahelan',body:B(1.07,.95,.9,.88,.9,.96,.94,1.1,.98,-.035),skin:[6,7,8],hair:{colors:[H.black,H.ink],styles:['shaved','crop','locks'],beard:{p:.3,styles:['stubble','short']}},face:{nose:.95,brow:.95,jaw:.96,ears:1},
  cuts:{light:C('poncho',.12,'wide','trousers','none','cord'),mild:C('poncho',.1,'wide','trousers','shawl','sash'),cold:C('poncho',.08,'long','trousers','blanket','sash')},
  fibre:{light:'cotton',skin:'hide',leather:'leather',hide:'hide',wool:'wool'},dyes:{cloth:['#2e3f7a','#e8dcc0','#b8452a'],under:'#e8dcc0',trim:'#e2c070',accent:'#b8452a'},
  head:{light:'veilwrap',cold:'turban',rank:'turban'},foot:{warm:'sandal',cold:'sandal'},jewel:['amulet','earring','bangles'],mark:{kind:'scar',pattern:'tickRows',sites:['face','arms'],colour:'#6a4a3a',p:.5},armor:{padded:'quilted'},helm:'feltcap',shield:'oval',gait:{sway:.04,breath:.8}},
 quillan:{id:'quillan',body:B(.95,1.07,1.14,1.02,1.0,1.06,1.04,.9,1.04,.035),skin:[3,4,5],hair:{colors:[H.black,H.darkBrown],styles:['braids','long','bob'],beard:{p:.1,styles:['none','stubble']}},face:{nose:1.12,brow:1.05,jaw:1.04,ears:1},
  cuts:{light:C('poncho',.3,'short','none','none','sash'),mild:C('poncho',.22,'short','leggings','shawl','sash'),cold:C('poncho',.16,'long','trousers','blanket','wide')},
  fibre:{light:'cotton',skin:'hide',leather:'leather',hide:'fur',wool:'wool'},dyes:{cloth:['#a8402e','#d9cdb0','#2f4a7c'],under:'#d9cdb0',trim:'#e0c050',accent:'#3f8a6a'},
  head:{light:'flapcap',cold:'flapcap',rank:'plume'},foot:{warm:'moccasin',cold:'moccasin'},jewel:['earspool','armlet','beads'],mark:{kind:'none',pattern:'knotBand',sites:['arms'],colour:'#2a2420',p:0},armor:{padded:'quilted'},helm:'conical',shield:'round',gait:{sway:.03,breath:1.1}},
 kaaltun:{id:'kaaltun',body:B(.97,1.0,1.0,.96,.98,1.0,1.04,.94,1.0,.0),skin:[4,5,6],hair:{colors:[H.black,H.ink,H.darkBrown],styles:['long','crest','braids'],beard:{p:.12,styles:['none','stubble']}},face:{nose:1.2,brow:1.1,jaw:1.0,ears:1.1},
  cuts:{light:C('bare',.26,'none','kilt','feather','wide'),mild:C('vest',.24,'short','kilt','feather','wide'),cold:C('poncho',.18,'short','kilt','blanket','wide')},
  fibre:{light:'bark',skin:'hide',leather:'leather',hide:'hide',wool:'cotton'},dyes:{cloth:['#3f8a6a','#e0d2a8','#b8402a'],under:'#e0d2a8',trim:'#d9c25a',accent:'#2a7fa8'},
  head:{light:'plume',cold:'plume',rank:'plume'},foot:{warm:'sandal',cold:'sandal'},jewel:['earspool','collar','bangles'],mark:{kind:'paint',pattern:'spiralBrow',sites:['face','arms'],colour:'#2a5a8a',p:.65},armor:{padded:'quilted'},helm:'plumed',shield:'round',gait:{sway:.03,breath:.9}},
 mekhari:{id:'mekhari',body:B(.96,.92,.9,.88,.92,.92,.98,1.0,.96,-.01),skin:[5,6,7],hair:{colors:[H.black,H.darkBrown,H.chestnut],styles:['bun','long','sideplait'],beard:{p:.15,styles:['none','stubble']}},face:{nose:.92,brow:.9,jaw:.92,ears:1},
  cuts:{light:C('bare',.2,'none','skirt','none','cord'),mild:C('wrapchest',.18,'none','skirt','shawl','sash'),cold:C('tunic',.14,'long','skirt','cape','sash')},
  fibre:{light:'bark',skin:'hide',leather:'leather',hide:'hide',wool:'cotton'},dyes:{cloth:['#8a6a2e','#d8c8a0','#3a8a8a'],under:'#d8c8a0',trim:'#3a8a8a',accent:'#c9a23c'},
  head:{light:'widebrim',cold:'widebrim',rank:'circlet'},foot:{warm:'bare',cold:'bare'},jewel:['shells','anklet','bangles'],mark:{kind:'tattoo',pattern:'tideLines',sites:['arms','chest'],colour:'#2a3548',p:.75},armor:{padded:'wicker'},helm:'conical',shield:'wicker',gait:{sway:.04,breath:.8}},
 brythen:{id:'brythen',body:B(1.04,1.05,1.03,.96,.98,1.04,1.0,1.02,1.04,.0),skin:[0,1,2],hair:{colors:[H.ginger,H.sandy,H.brown,H.auburn],styles:['braids','long','sideplait'],beard:{p:.7,styles:['moustache','full','braided']}},face:{nose:1.05,brow:1.05,jaw:1.04,ears:1},
  cuts:{light:C('tunic',.3,'short','trousers','none','wide'),mild:C('tunic',.28,'long','trousers','cape','wide'),cold:C('tunic',.24,'long','trousers','cape','wide')},
  fibre:{light:'linen',skin:'hide',leather:'leather',hide:'fur',wool:'wool'},dyes:{cloth:['#4a6a3a','#d8cfa8','#8a3a2e'],under:'#d8cfa8',trim:'#c9a23c',accent:'#2f5a9a'},
  head:{light:'none',cold:'hood',rank:'circlet'},foot:{warm:'moccasin',cold:'boot'},jewel:['torc','brooch','armlet'],mark:{kind:'paint',pattern:'knotBand',sites:['face','arms'],colour:'#2f5a9a',p:.55},armor:{padded:'hide'},helm:'nasal',shield:'oval',gait:{sway:.03,breath:1}},
 rusvolt:{id:'rusvolt',body:B(1.04,1.1,1.1,1.0,1.04,1.08,1.02,1.0,1.06,.01),skin:[0,1,2],hair:{colors:[H.blond,H.sandy,H.brown,H.ash],styles:['crop','bob','sideplait'],beard:{p:.85,styles:['full','short','braided']}},face:{nose:1.0,brow:1.08,jaw:1.08,ears:1},
  cuts:{light:C('tunic',.26,'long','trousers','none','wide'),mild:C('tunic',.22,'long','trousers','none','wide'),cold:C('deel',.14,'long','trousers','fur','wide')},
  fibre:{light:'linen',skin:'hide',leather:'leather',hide:'fur',wool:'felt'},dyes:{cloth:['#8a2e2e','#d8c8a0','#2f4a6a'],under:'#d8cfa8',trim:'#e8d8b0',accent:'#c0432b'},
  head:{light:'kerchief',cold:'furcap',rank:'furcap'},foot:{warm:'wraps',cold:'tallboot'},jewel:['amulet','brooch'],mark:{kind:'none',pattern:'knotBand',sites:['arms'],colour:'#2a2420',p:0},armor:{padded:'hide'},helm:'kettle',shield:'kite',gait:{sway:.03,breath:1}},
 steppan:{id:'steppan',body:B(.93,1.08,1.08,1.02,1.0,1.04,1.04,.92,1.0,.045),skin:[1,2,3],hair:{colors:[H.black,H.ink,H.darkBrown],styles:['braids','sideplait','shaved'],beard:{p:.4,styles:['moustache','stubble','short']}},face:{nose:.9,brow:.96,jaw:1.06,ears:1},
  cuts:{light:C('deel',.2,'long','trousers','none','wide'),mild:C('deel',.18,'long','trousers','none','wide'),cold:C('deel',.14,'long','trousers','fur','wide')},
  fibre:{light:'cotton',skin:'hide',leather:'leather',hide:'fur',wool:'felt'},dyes:{cloth:['#2a6a8a','#e2c68a','#c43a2a'],under:'#d8c8a0',trim:'#c43a2a',accent:'#e0b030'},
  head:{light:'feltcap',cold:'furcap',rank:'plume'},foot:{warm:'tallboot',cold:'tallboot'},jewel:['amulet','earring','armlet'],mark:{kind:'none',pattern:'tickRows',sites:['arms'],colour:'#2a2420',p:0},armor:{padded:'felt'},helm:'conical',shield:'buckler',gait:{sway:.04,breath:1.1}},
 skoldar:{id:'skoldar',body:B(1.07,1.1,1.08,.98,1.0,1.06,1.0,1.04,1.06,.0),skin:[1,2,3],hair:{colors:[H.blond,H.sandy,H.auburn,H.ash],styles:['braids','long','sideplait'],beard:{p:.85,styles:['braided','full','moustache']}},face:{nose:1.08,brow:1.1,jaw:1.06,ears:1},
  cuts:{light:C('tunic',.28,'short','trousers','none','wide'),mild:C('tunic',.24,'long','trousers','cape','wide'),cold:C('tunic',.2,'long','trousers','hood','wide')},
  fibre:{light:'linen',skin:'hide',leather:'leather',hide:'fur',wool:'wool'},dyes:{cloth:['#3a5a7a','#d8cfa8','#8a3a2e'],under:'#d8cfa8',trim:'#b98a4a',accent:'#c9a23c'},
  head:{light:'none',cold:'hood',rank:'circlet'},foot:{warm:'moccasin',cold:'tallboot'},jewel:['torc','shells','armlet'],mark:{kind:'paint',pattern:'chevronChest',sites:['chest','face'],colour:'#3a5a7a',p:.4},armor:{padded:'hide'},helm:'nasal',shield:'round',gait:{sway:.03,breath:1}},
};
/** 'vedara'-style extras not in the civ list are impossible: CivId is closed over the fourteen bibles above. */

// ---------------------------------------------------------------- cut / headwear templates (a skin's own garb overrides these)
const CUT_OF:Record<string,Cut>={wrap:C('wrapchest',.2,'none','skirt','none','sash'),tunic:C('tunic',.26,'long','trousers','none','wide'),poncho:C('poncho',.18,'short','leggings','shawl','sash'),robe:C('robe',.1,'long','trousers','none','sash'),
 kilt:C('vest',.24,'short','kilt','none','wide'),cape:C('tunic',.26,'long','trousers','cape','wide'),trousers:C('deel',.16,'long','trousers','none','wide')};
const HEAD_OF:Record<string,HeadKind>={none:'none',wrap:'turban',cap:'feltcap',hood:'hood',brim:'widebrim',band:'fillet',braids:'none'};

// ---------------------------------------------------------------- look for any skin
const cache=new Map<string,PeopleLook>();
const jit=(r:Rng,v:number,a:number)=>+(v*(1+(r()-.5)*2*a)).toFixed(3);
const pickOf=<T,>(r:Rng,a:readonly T[]):T=>a[Math.min(a.length-1,Math.floor(r()*a.length))];
export type LookOverride=Partial<Omit<PeopleLook,'id'|'body'|'hair'|'face'|'cuts'|'fibre'|'dyes'|'head'|'foot'|'mark'|'armor'|'gait'>>&{body?:Partial<Body>;hair?:Partial<PeopleLook['hair']>;face?:Partial<PeopleLook['face']>;cuts?:Partial<Record<Warmth,Cut>>;fibre?:Partial<PeopleLook['fibre']>;dyes?:Partial<PeopleLook['dyes']>;
 head?:Partial<PeopleLook['head']>;foot?:Partial<PeopleLook['foot']>;mark?:Partial<PeopleLook['mark']>;armor?:Partial<PeopleLook['armor']>;gait?:Partial<PeopleLook['gait']>};
export function mergeLook(base:PeopleLook,o:LookOverride|undefined,id=base.id):PeopleLook{
 if(!o)return {...base,id};
 return {...base,...o as object,id,body:{...base.body,...o.body},hair:{...base.hair,...o.hair},face:{...base.face,...o.face},cuts:{...base.cuts,...o.cuts},fibre:{...base.fibre,...o.fibre},dyes:{...base.dyes,...o.dyes},head:{...base.head,...o.head},foot:{...base.foot,...o.foot},mark:{...base.mark,...o.mark},armor:{...base.armor,...o.armor},gait:{...base.gait,...o.gait}} as PeopleLook;
}
const sameAsBible=(skin:CivSkin,civ:CivId)=>{const d=CIVS[civ].dress,g=skin.garb;return g.cut===d.cut&&g.headwear===d.headwear;};
/** The look a skin's people wear. Preset skins are their civ's look (plus any `skin.look` override); remix and free skins start from the grammar civ's look, take their own
 *  garb cut and headwear, and are mutated by a seeded generator so kin reads as kin and a new people reads as a new people. Deterministic and cached. */
export function lookForSkin(skin:CivSkin|null|undefined):PeopleLook{
 const civ=((skin?.preset??skin?.grammar)||'aureline') as CivId,base=LOOKS[civ]??LOOKS.aureline;
 if(!skin||!skin.grammar)return base;
 const key=skin.id+'|'+skin.garb.body+skin.garb.trim+skin.garb.cut+skin.garb.headwear+(skin.palette?.cloth.hex??'')+JSON.stringify((skin as {look?:unknown}).look??0);
 const hit=cache.get(key);if(hit)return hit;
 let look=mergeLook(base,(skin as {look?:LookOverride}).look,skin.id);
 const dyed:Partial<PeopleLook['dyes']>={cloth:[skin.garb.body,...look.dyes.cloth.slice(1,3)],trim:skin.garb.trim};
 look=mergeLook(look,{dyes:dyed});
 if(!sameAsBible(skin,civ)){
  const k=CUT_OF[skin.garb.cut];
  if(k)look=mergeLook(look,{cuts:{light:{...k,sleeve:k.sleeve==='long'?'short':k.sleeve,mantle:'none',hem:k.hem+.04},mild:k,cold:{...k,mantle:k.mantle==='none'?'cape':k.mantle,hem:Math.max(.06,k.hem-.06),sleeve:'long'}},
   head:{light:HEAD_OF[skin.garb.headwear]??look.head.light,cold:skin.garb.headwear==='none'||skin.garb.headwear==='braids'?'hood':HEAD_OF[skin.garb.headwear]??look.head.cold}});
 }
 if(skin.mode==='remix'||skin.mode==='free'||skin.mode==='generated'){
  const r=seededRandom(hashSeed('people-look',skin.id)),b=look.body;
  const tone=Math.max(0,Math.min(6,look.skin[0]+(r()<.5?-1:1)*(r()<.7?1:2)));
  look=mergeLook(look,{body:{height:jit(r,b.height,.05),shoulder:jit(r,b.shoulder,.07),chest:jit(r,b.chest,.07),waist:jit(r,b.waist,.06),hip:jit(r,b.hip,.06),limb:jit(r,b.limb,.06),head:jit(r,b.head,.05),neck:jit(r,b.neck,.06),hand:jit(r,b.hand,.05),torso:+(b.torso+(r()-.5)*.05).toFixed(3)},
   skin:[tone,tone+1,tone+2] as [number,number,number],hair:{styles:[pickOf(r,STYLES),pickOf(r,STYLES),look.hair.styles[0]],beard:{p:Math.max(0,Math.min(.9,look.hair.beard.p+(r()-.5)*.4)),styles:look.hair.beard.styles}},face:{nose:jit(r,look.face.nose,.1),brow:jit(r,look.face.brow,.1),jaw:jit(r,look.face.jaw,.08),ears:jit(r,look.face.ears,.08)},
   jewel:[pickOf(r,JEWELS),pickOf(r,JEWELS),look.jewel[0]],mark:{pattern:pickOf(r,PATTERNS),kind:r()<.55?pickOf(r,['paint','tattoo','scar'] as const):'none',sites:[pickOf(r,['face','arms','chest','hands'] as const),'arms'],colour:pickOf(r,MARK_COLOURS),p:.25+r()*.4},
   gait:{sway:+(.02+r()*.03).toFixed(3),breath:+(.7+r()*.5).toFixed(2)},fibre:{wool:pickOf(r,['wool','felt'] as const)},foot:{warm:pickOf(r,FEET_WARM),cold:pickOf(r,FEET_COLD)},helm:pickOf(r,HELMS),shield:pickOf(r,SHIELDS)});
 }
 look.skin=look.skin.map(i=>Math.max(0,Math.min(SKIN_RAMP.length-1,i))) as [number,number,number];
 cache.set(key,look);return look;
}
const STYLES:HairStyle[]=['crop','bob','long','topknot','braids','bun','shaved','crest','locks','sideplait','curls','wrapped'];
const JEWELS:Jewel[]=['beads','collar','torc','earring','earspool','bangles','armlet','brooch','amulet','anklet','shells','browband'];
const PATTERNS:MarkPattern[]=['tideLines','knotBand','chevronChest','cheekDots','browStripe','spiralBrow','foreheadDot','tickRows','leafBand','eyeBand','handDots'];
const MARK_COLOURS=['#2a3548','#b8402a','#3a5a7a','#2f6a62','#e8e0cc','#6a3a2a'];
const FEET_WARM:Foot[]=['bare','sandal','moccasin','wraps'],FEET_COLD:Foot[]=['boot','tallboot','moccasin','wraps'],HELMS:HelmStyle[]=['rounded','conical','kettle','crested','nasal','plumed','feltcap','horsehair'],SHIELDS:ShieldShape[]=['round','oval','kite','tower','wicker','buckler'];

// ---------------------------------------------------------------- individuals
export type Individual={/** discrete picks, quantised so a crowd shares geometry */skinTone:0|1|2;hairColour:number;hair:HairStyle;beard:BeardStyle;head:HeadKind;jewel:Jewel[];mark:{kind:MarkKind;pattern:MarkPattern;sites:MarkSite[]}|null;patches:0|1|2|3;
 /** instance-level (no geometry): multiples of the class height and width */height:number;build:number;/** 0..1 */age:number;/** 0..1 darkening of dirt/wear */dirt:number;/** which of four cut variants (hem, sash, drape side) */variant:number;/** hand preference: 1 right, -1 left */hand:1|-1};
export const hairGreys=(cls:BodyClass)=>cls==='elder';
/** One person from ids the save already stores. `key` is the society key (world seed and skin live in it); `unitId` the unit id; `stature` the sim's own Unit.stature (.86-1.16) when known. */
export function individualFor(look:PeopleLook,key:string,unitId:number,cls:BodyClass,stature=1):Individual{
 const r=seededRandom(hashSeed('person',key,unitId));
 const skinTone=(Math.min(2,Math.floor(r()*3))) as 0|1|2,hairColour=Math.floor(r()*look.hair.colors.length),hair=pickOf(r,look.hair.styles),bq=r();
 const beard:BeardStyle=cls==='child'?'none':r()<look.hair.beard.p*(cls==='elder'?1.15:1)?pickOf(r,look.hair.beard.styles):'none';
 const head=bq<.15&&look.head.light!=='none'?look.head.light:look.head.light;
 const jn=Math.min(look.jewel.length,Math.floor(r()*3)),jewel:Jewel[]=[];for(let i=0;i<look.jewel.length&&jewel.length<jn;i++){const j=look.jewel[(i+Math.floor(r()*look.jewel.length))%look.jewel.length];if(!jewel.includes(j))jewel.push(j);}
 const marked=look.mark.kind!=='none'&&r()<look.mark.p,mark=marked?{kind:look.mark.kind,pattern:look.mark.pattern,sites:look.mark.sites.filter(()=>r()<.75).slice(0,2)}:null;
 const h=stature,age=cls==='child'?.1:cls==='elder'?.85+r()*.15:cls==='leader'?.45+r()*.2:r()*.7;
 return {skinTone,hairColour,hair,beard,head,jewel,mark:mark&&mark.sites.length?mark:null,patches:Math.min(3,Math.floor(r()*4)) as 0|1|2|3,height:+Math.max(.85,Math.min(1.2,h*(.97+r()*.06))).toFixed(3),build:+(.94+r()*.12).toFixed(3),age:+age.toFixed(3),dirt:+(r()*.08).toFixed(3),variant:Math.floor(r()*4),hand:r()<.88?1:-1};
}
/** The sim's heat classes: which cut a real garment item is worn as. */
export const warmthOf=(item:string):Warmth=>item==='lightClothes'?'light':item==='skinClothes'||item==='leatherClothes'?'mild':'cold';
export const fibreOf=(look:PeopleLook,item:string):Fibre=>item==='lightClothes'?look.fibre.light:item==='skinClothes'?look.fibre.skin:item==='leatherClothes'?look.fibre.leather:item==='hideCoat'?look.fibre.hide:look.fibre.wool;
export const skinColour=(look:PeopleLook,tone:number)=>SKIN_RAMP[Math.min(SKIN_RAMP.length-1,Math.max(0,look.skin[tone]))];

// ---------------------------------------------------------------- roles from real state
export type RoleInput={type:string;bodyClass:BodyClass;/** Unit.farmTool is set (owned) or the unit is gathering from a farm */farming?:boolean;hunting?:boolean;/** live production recipe id */recipe?:string;scouting?:boolean;trading?:boolean};
const SMITH=/^(smelt|forge|smith|cast|bloom|temper|sharpen|repair|makeTool|makeWeapon|forgeTool|weapon)/i;
/** Role for kit and silhouette. Every branch reads a real field; there is no priest signal in the simulation yet, so `priest` is produced only by explicit preview input. */
export function roleOf(i:RoleInput):Role{
 if(i.bodyClass==='child')return 'child';if(i.type==='leader'||i.bodyClass==='leader')return 'ruler';
 if(i.type==='spearman'||i.type==='swordsman'||i.type==='warden')return 'soldier';
 if(i.scouting||i.type==='ranger')return 'scout';if(i.trading)return 'merchant';if(i.type==='archer'||i.hunting)return 'hunter';
 if(i.recipe&&SMITH.test(i.recipe))return 'smith';if(i.farming)return 'farmer';if(i.bodyClass==='elder')return 'elder';return 'worker';
}
