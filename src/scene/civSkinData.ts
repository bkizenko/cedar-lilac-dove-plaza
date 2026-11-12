/** CivSkin DATA (pure objects, no logic): the extra registry skins, the generator's material swatches and the grammar affinity table.
 * To add a skin: append ONE SkinSpec to SKIN_SPECS (see civSkin.ts for the shape). Nothing else changes. */
import type {SkinSpec} from './civSkin';
import type {CivId,Emblem,Prim,Swatch} from './civStyles';
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
 {id:'ember-basalt',name:'Emberfall',base:'sandrill',palette:{wall:'#4a4348',wall2:'#352f33',roof:'#2f2a2e',trim:'#8a7a70',accent:'#d2542a',cloth:'#b8402a'},banner:'hanging',emblem:'anvilHammer',dress:{body:'#3b3338',trim:'#d2542a'},note:'basalt cliff-cut city lit by forge ember'},
 {id:'frost-slate',name:'Frostmere',base:'skoldar',palette:{wall:'#8f9aa0',wall2:'#6d7a82',roof:'#dfe6ea',trim:'#c9d3d8',accent:'#3d6f96',cloth:'#3d6f96',ground:'#a9b8bd'},banner:'pennant',emblem:'twinWaves',dress:{body:'#5d7f9a',trim:'#e2eaee'},note:'pale-stone coast under snow roofs'},
 {id:'verdant-thatch',name:'Verdance',base:'brythen',palette:{wall:'#d1bf8a',wall2:'#b3a06a',roof:'#6f8a45',trim:'#6a4f30',accent:'#4a7a3a',cloth:'#5a8a3f'},banner:'streamers',emblem:'oakLeaf',dress:{body:'#5a8a3f',trim:'#d9c25a'},note:'ochre roundhouses under living green thatch'},
 {id:'cobalt-dome',name:'Cobalt Reach',base:'aureline',palette:{wall:'#f0e8d4',wall2:'#dcd0b4',roof:'#2e5f9a',trim:'#c9a85a',accent:'#2e7fb0',cloth:'#2e5f9a'},banner:'swallow',emblem:'crescentStar',dress:{body:'#2e5f9a',trim:'#e8d08a'},note:'limewashed courts with cobalt roofs'},
 {id:'jade-tile',name:'Jaderoof',base:'hanrei',palette:{wall:'#e6dcb8',wall2:'#b8453a',roof:'#3f8a72',trim:'#b8453a',accent:'#e0b84a',cloth:'#2f7a62'},banner:'twin',emblem:'tripleSpire',dress:{body:'#2f7a62',trim:'#e0b84a'},note:'cream walls, vermilion posts, green glazed tile'},
 {id:'ochre-felt',name:'Ochre Steppe',base:'steppan',palette:{wall:'#c9a66a',wall2:'#8a5f36',roof:'#e2c68a',trim:'#6a3a22',accent:'#b8452a',cloth:'#b8452a'},banner:'streamers',emblem:'horsetail',dress:{body:'#b8452a',trim:'#f0d9a0'},note:'sun-dyed ochre felt, red standards'},
 {id:'turquoise-brick',name:'Glazed Plain',base:'tigrane',palette:{wall:'#b97d52',wall2:'#7a4f30',roof:'#8a6a48',trim:'#2a8a8a',accent:'#e0b030',cloth:'#2a8a8a'},banner:'pennant',emblem:'stepStar',dress:{body:'#2a8a8a',trim:'#e0b030'},note:'baked brick with turquoise glazed bands'},
 {id:'saffron-lime',name:'Saffron Delta',base:'nilemark',palette:{wall:'#efd9a0',wall2:'#d6b86a',roof:'#a58a55',trim:'#c0542a',accent:'#2e7a6a',cloth:'#e0902a'},banner:'swallow',emblem:'sunDisc',dress:{body:'#f0e0b0',trim:'#c0542a'},note:'saffron-washed mudbrick with madder trim'},
];
