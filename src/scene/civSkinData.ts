/** CivSkin DATA (pure objects, no logic): the extra registry skins, the generator's material swatches and the grammar affinity table.
 * To add a skin: append ONE SkinSpec to SKIN_SPECS (see civSkin.ts for the shape). Nothing else changes. */
import type {SkinSpec} from './civSkin';
import type {HallForm,SkinForms,WallStyle} from './buildingHelpers';
import type {CivId,Emblem,Prim,RoofForm,Swatch} from './civStyles';
import type {Material} from '../game/civGenerator';

const S=(hex:string,roughness:number,course?:Swatch['course']):Swatch=>({hex,roughness,...(course?{course}:{})});

/** Generator materials -> wall swatch (with the construction course the renderer keys grain on). */
export const MATERIAL_SWATCH:Record<Material,Swatch>={
 wood:S('#8f6a43',.9,'plank'),stone:S('#9c968a',.94,'ashlar'),brick:S('#a8613f',.95,'brick'),mudbrick:S('#c9a57a',.97,'rammed'),felt:S('#cfc6ae',1,'felt'),
 thatch:S('#b79a52',.95,'thatch'),turf:S('#6f7f4a',1,'turf'),bamboo:S('#c8b46a',.9,'weave'),plaster:S('#ece3cc',.9,'stucco'),timberFrame:S('#d9c9a0',.9,'timberPaper'),
};
/** Generator materials -> roof swatch when that material is the roof-bearing one. */
export const MATERIAL_ROOF:Record<Material,Swatch>={
 wood:S('#76665a',.88,'plank'),stone:S('#5d6670',.8,'tile'),brick:S('#b4573a',.8,'tile'),mudbrick:S('#a98862',.95,'earth'),felt:S('#efe9d8',1,'felt'),
 thatch:S('#b79a52',.95,'thatch'),turf:S('#6d7a48',1,'turf'),bamboo:S('#8a7640',.95,'thatch'),plaster:S('#c0623a',.8,'tile'),timberFrame:S('#46606f',.65,'tile'),
};

/** Which materials and plan silhouettes each grammar suits (generator `materials` and `silhouette`). Used to pick a free skin's grammar. */
export const AFFINITY:Record<CivId,{mat:Material[];sil:string[]}>={
 aureline:{mat:['plaster','stone'],sil:['courtyard','linear']},hanrei:{mat:['timberFrame','plaster'],sil:['linear','courtyard']},steppan:{mat:['felt','wood'],sil:['radial','scattered']},
 sandrill:{mat:['stone','mudbrick'],sil:['terraced','walled']},kaaltun:{mat:['plaster','thatch'],sil:['terraced','radial']},mekhari:{mat:['bamboo','thatch','wood'],sil:['stilted','scattered']},
 skoldar:{mat:['turf','stone','wood'],sil:['linear','clustered']},nilemark:{mat:['plaster','mudbrick'],sil:['linear','clustered']},tigrane:{mat:['brick','stone'],sil:['walled','courtyard']},
 rusvolt:{mat:['wood','timberFrame'],sil:['clustered','linear']},vedara:{mat:['stone','plaster','brick'],sil:['courtyard','terraced']},sahelan:{mat:['mudbrick','wood'],sil:['clustered','walled']},
 quillan:{mat:['stone','thatch'],sil:['terraced','scattered']},brythen:{mat:['thatch','wood','turf'],sil:['radial','scattered']},
};

const poly=(...p:number[]):Prim=>({k:'poly',pts:p.reduce<[number,number][]>((a,v,i)=>(i%2?(a[a.length-1][1]=v):a.push([v,0]),a),[])});
/** Banner emblems beyond the 14 civ bibles (selectable by remix/free skins and registry skins). */
export const EXTRA_EMBLEMS:Emblem[]=[
 {id:'crescentStar',prims:[{k:'circle',c:[.5,.45],r:.3},poly(.5,.12,.56,.3,.76,.3,.6,.42,.66,.6,.5,.5,.34,.6,.4,.42,.24,.3,.44,.3)],ink:'accent'},
 {id:'tripleSpire',prims:[poly(.2,.85,.28,.3,.36,.85),poly(.4,.85,.5,.12,.6,.85),poly(.64,.85,.72,.3,.8,.85)],ink:'trim'},
 {id:'anvilHammer',prims:[poly(.15,.5,.8,.5,.7,.62,.62,.62,.6,.8,.7,.84,.3,.84,.4,.8,.38,.62,.22,.62),poly(.62,.15,.82,.15,.82,.3,.62,.3)],ink:'accent'},
 {id:'oakLeaf',prims:[{k:'circle',c:[.5,.4],r:.26},{k:'circle',c:[.34,.58],r:.16},{k:'circle',c:[.66,.58],r:.16},poly(.46,.6,.54,.6,.54,.9,.46,.9)],ink:'trim'},
 {id:'twinWaves',prims:[{k:'line',w:.07,pts:Array.from({length:21},(_,i)=>[.1+i*.04,.34+Math.sin(i/20*Math.PI*4)*.07] as [number,number])},{k:'line',w:.07,pts:Array.from({length:21},(_,i)=>[.1+i*.04,.6+Math.sin(i/20*Math.PI*4)*.07] as [number,number])}],ink:'accent'},
];

/** Extra registry skins: each is ONE data object over a civ grammar (omitted fields inherit from `base`). Not part of the approved ten; they exist so a game can open with a look nobody has seen. */
export const SKIN_SPECS:SkinSpec[]=[
 {id:'ember-basalt',name:'Emberfall',base:'sandrill',palette:{wall:'#6b6268',wall2:'#524a50',roof:'#3f383d',trim:'#a8968a',accent:'#d2542a',cloth:'#b8402a'},banner:'hanging',emblem:'anvilHammer',dress:{body:'#3b3338',trim:'#d2542a'},look:{body:{height:.98,shoulder:1.1,chest:1.1,limb:1.08,neck:.92,torso:.03},skin:[5,6,7],hair:{styles:['shaved','crest','topknot'],beard:{p:.6,styles:['full','short']}},cuts:{mild:{torso:'vest',hem:.2,sleeve:'short',lower:'trousers',mantle:'none',belt:'wide'},cold:{torso:'vest',hem:.16,sleeve:'long',lower:'trousers',mantle:'blanket',belt:'wide'}},head:{light:'headcloth',cold:'headcloth'},fibre:{light:'cotton'},mark:{kind:'scar',pattern:'tickRows',sites:['arms','hands'],colour:'#8a5a4a',p:.7},armor:{padded:'hide'},helm:'kettle',shield:'buckler'},note:'basalt cliff-cut city lit by forge ember'},
 {id:'frost-slate',name:'Frostmere',base:'skoldar',palette:{wall:'#8f9aa0',wall2:'#6d7a82',roof:'#dfe6ea',trim:'#c9d3d8',accent:'#3d6f96',cloth:'#3d6f96',ground:'#a9b8bd'},banner:'pennant',emblem:'twinWaves',dress:{body:'#5d7f9a',trim:'#e2eaee'},look:{body:{height:1.1,shoulder:.98,chest:.96,waist:.92,limb:.96,neck:1.06},skin:[0,1,1],hair:{colors:['#e6e2da','#c9c5bb','#c9a96a'],styles:['long','braids','sideplait'],beard:{p:.6,styles:['braided','full']}},head:{cold:'hood'},fibre:{wool:'felt'},mark:{kind:'paint',pattern:'tideLines',sites:['face','arms'],colour:'#3d6f96',p:.6},jewel:['torc','shells','beads'],helm:'horsehair',shield:'kite'},note:'pale-stone coast under snow roofs'},
 {id:'verdant-thatch',name:'Verdance',base:'brythen',palette:{wall:'#d1bf8a',wall2:'#b3a06a',roof:'#6f8a45',trim:'#6a4f30',accent:'#4a7a3a',cloth:'#5a8a3f'},banner:'streamers',emblem:'oakLeaf',dress:{body:'#5a8a3f',trim:'#d9c25a'},look:{body:{height:.97,shoulder:.94,chest:.92,waist:.9,limb:.94},skin:[3,4,5],hair:{styles:['locks','curls','braids'],beard:{p:.2,styles:['none','stubble']}},cuts:{light:{torso:'bare',hem:.28,sleeve:'none',lower:'kilt',mantle:'feather',belt:'cord'},mild:{torso:'vest',hem:.26,sleeve:'short',lower:'kilt',mantle:'feather',belt:'cord'}},fibre:{light:'bark',wool:'cotton'},head:{light:'circlet',cold:'hood'},foot:{warm:'bare'},mark:{kind:'paint',pattern:'leafBand',sites:['face','arms'],colour:'#2f6a42',p:.7},jewel:['shells','browband','anklet'],armor:{padded:'bark'},helm:'rounded',shield:'wicker'},note:'ochre roundhouses under living green thatch'},
 {id:'cobalt-dome',name:'Cobalt Reach',base:'aureline',palette:{wall:'#f0e8d4',wall2:'#dcd0b4',roof:'#2e5f9a',trim:'#c9a85a',accent:'#2e7fb0',cloth:'#2e5f9a'},banner:'swallow',emblem:'crescentStar',dress:{body:'#2e5f9a',trim:'#e8d08a'},look:{body:{height:1.06,shoulder:.96,chest:.94,waist:.88,limb:.94,neck:1.08},skin:[3,4,5],hair:{styles:['wrapped','bun','crop'],beard:{p:.5,styles:['short','full','moustache']}},cuts:{light:{torso:'robe',hem:.1,sleeve:'long',lower:'trousers',mantle:'none',belt:'sash'},mild:{torso:'robe',hem:.08,sleeve:'long',lower:'trousers',mantle:'shawl',belt:'sash'}},head:{light:'veilwrap',cold:'turban'},jewel:['collar','browband','earring'],mark:{kind:'paint',pattern:'handDots',sites:['hands'],colour:'#2e5f9a',p:.4},armor:{padded:'linen'},helm:'conical',shield:'kite'},note:'limewashed courts with cobalt roofs'},
 {id:'jade-tile',name:'Jaderoof',base:'hanrei',palette:{wall:'#e6dcb8',wall2:'#b8453a',roof:'#3f8a72',trim:'#b8453a',accent:'#e0b84a',cloth:'#2f7a62'},banner:'twin',emblem:'tripleSpire',dress:{body:'#2f7a62',trim:'#e0b84a'},look:{body:{height:1.0,shoulder:.9,chest:.9,waist:.86,limb:.9,head:1.02},skin:[0,1,2],hair:{styles:['bun','topknot','long'],beard:{p:.2,styles:['moustache','none']}},cuts:{light:{torso:'tunic',hem:.16,sleeve:'wide',lower:'trousers',mantle:'none',belt:'sash'}},head:{light:'cone',cold:'furcap'},jewel:['amulet','earring','browband'],armor:{padded:'quilted'},helm:'plumed',shield:'tower'},note:'cream walls, vermilion posts, green glazed tile'},
 {id:'ochre-felt',name:'Ochre Steppe',base:'steppan',palette:{wall:'#c9a66a',wall2:'#8a5f36',roof:'#e2c68a',trim:'#6a3a22',accent:'#b8452a',cloth:'#b8452a'},banner:'streamers',emblem:'horsetail',dress:{body:'#b8452a',trim:'#f0d9a0'},look:{body:{height:.9,shoulder:1.1,chest:1.1,limb:1.06,torso:.05},skin:[2,3,4],hair:{styles:['crest','shaved','braids'],beard:{p:.5,styles:['moustache','short']}},head:{light:'plume',cold:'furcap'},mark:{kind:'paint',pattern:'chevronChest',sites:['chest','face'],colour:'#b8452a',p:.55},jewel:['earring','amulet','armlet'],armor:{padded:'hide'},helm:'horsehair',shield:'round'},note:'sun-dyed ochre felt, red standards'},
 {id:'turquoise-brick',name:'Glazed Plain',base:'tigrane',palette:{wall:'#b97d52',wall2:'#7a4f30',roof:'#8a6a48',trim:'#2a8a8a',accent:'#e0b030',cloth:'#2a8a8a'},banner:'pennant',emblem:'stepStar',dress:{body:'#2a8a8a',trim:'#e0b030'},look:{body:{height:1.06,shoulder:.96,chest:.96,waist:.9,limb:.94},skin:[4,5,6],hair:{styles:['curls','long','locks'],beard:{p:.7,styles:['braided','full']}},cuts:{light:{torso:'drape',hem:.16,sleeve:'short',lower:'skirt',mantle:'none',belt:'wide'},mild:{torso:'drape',hem:.12,sleeve:'long',lower:'skirt',mantle:'shawl',belt:'wide'}},head:{light:'headcloth',cold:'turban'},jewel:['collar','bangles','armlet'],mark:{kind:'tattoo',pattern:'handDots',sites:['hands','arms'],colour:'#1f4a5a',p:.5},armor:{padded:'felt'},helm:'crested',shield:'oval'},note:'baked brick with turquoise glazed bands'},
 {id:'saffron-lime',name:'Saffron Delta',base:'nilemark',palette:{wall:'#efd9a0',wall2:'#d6b86a',roof:'#a58a55',trim:'#c0542a',accent:'#2e7a6a',cloth:'#e0902a'},banner:'swallow',emblem:'sunDisc',dress:{body:'#f0e0b0',trim:'#c0542a'},look:{body:{height:1.0,shoulder:1.04,chest:.98,waist:.9,limb:.98,neck:1.08},skin:[2,3,4],hair:{styles:['wrapped','bob','crop'],beard:{p:.2,styles:['stubble','none']}},head:{light:'headcloth',cold:'headcloth'},jewel:['collar','amulet','bangles'],mark:{kind:'paint',pattern:'foreheadDot',sites:['face'],colour:'#c0542a',p:.6},armor:{padded:'linen'},helm:'feltcap',shield:'tower'},note:'saffron-washed mudbrick with madder trim'},
];

/** CULTURAL FORMS per civ bible: how walls, gates and the great hall are built, not just coloured. One row per civ; a SkinSpec may override any field with `forms`.
 *  wall: palisade (log stockade) / dry stone / mud brick (rammed earth, adobe) / ashlar. The wall style is the society's HEAVY wall (stone wall type);
 *  the light palisade type takes a lighter cousin of it (hurdle-topped dyke, thorn-topped adobe, stone-footed stockade).
 *  gate: stockade towers / round arch / trabeated lintel / battered pylon / tiled gate pavilion. hall: the roof form of town halls and barracks. */
export const CIV_FORMS:Record<CivId,SkinForms>={
 aureline:{wall:'ashlar',gate:'arch',hall:'gable',cap:'plain'},
 hanrei:{wall:'mudbrick',gate:'pavilion',hall:'upturned',cap:'tile'},
 steppan:{wall:'log',gate:'stockade',hall:'felt',cap:'plain'},
 sandrill:{wall:'drystone',gate:'lintel',hall:'terrace',cap:'plain'},
 kaaltun:{wall:'drystone',gate:'lintel',hall:'vault',cap:'plain'},
 mekhari:{wall:'log',gate:'stockade',hall:'saddle',cap:'thatch'},
 skoldar:{wall:'drystone',gate:'stockade',hall:'turf',cap:'turf'},
 nilemark:{wall:'mudbrick',gate:'pylon',hall:'terrace',cap:'plain'},
 tigrane:{wall:'mudbrick',gate:'arch',hall:'vault',cap:'plain'},
 rusvolt:{wall:'log',gate:'stockade',hall:'stave',cap:'plain'},
 vedara:{wall:'ashlar',gate:'pylon',hall:'upturned',cap:'plain'},
 sahelan:{wall:'mudbrick',gate:'pylon',hall:'terrace',cap:'plain'},
 quillan:{wall:'drystone',gate:'lintel',hall:'thatchHip',cap:'thatch'},
 brythen:{wall:'drystone',gate:'stockade',hall:'thatchHip',cap:'thatch'},
};
/** Hall roof form implied by a roof form (remix and free skins that changed their roof keep a matching hall). */
export const HALL_OF_ROOF:Record<RoofForm,HallForm>={
 flatParapet:'terrace',flatPalm:'terrace',flatSpiked:'terrace',vault:'vault',upturnedHip:'upturned',chhatri:'upturned',terracottaGable:'gable',
 conicalThatch:'thatchHip',steepThatch:'thatchHip',palmGable:'thatchHip',roundCone:'thatchHip',saddle:'saddle',plankGable:'stave',feltDome:'felt',turfLow:'turf',
};
/** Wall style implied by a wall swatch's construction course (free skins build their walls from the generator's materials). */
export const WALL_OF_COURSE:Record<string,WallStyle>={
 ashlar:'ashlar',laterite:'ashlar',polygonal:'drystone',stucco:'drystone',rockcut:'drystone',turf:'drystone',rubble:'drystone',
 rammed:'mudbrick',brick:'mudbrick',smooth:'mudbrick',earth:'mudbrick',timberPaper:'mudbrick',
 log:'log',plank:'log',weave:'log',wattle:'log',felt:'log',thatch:'log',beam:'log',cloth:'log',
};
