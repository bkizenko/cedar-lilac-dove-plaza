/** Anatomy data for every animal model (metres, kilograms in comments). All proportions come from published field measurements; the build
 * code (animalModels.ts) only turns these numbers into meshes. Faces +X, +Y up, torso frame origin = middle of the barrel.
 *
 * Leg chains follow the real skeleton. Fore limb: humerus (U) - radius/ulna (M) - metacarpus (C) - phalanges+hoof (H); hind limb: femur (U) -
 * tibia (M) - metatarsus (C) - phalanges+hoof (H); `abs` are standing absolute bone angles from vertical in degrees (+ = foot forward), which is
 * what gives the hock its zig-zag (femur forward, tibia back, metatarsus near vertical). Lengths are bone-to-bone joint spacing. */
import type {RGB} from './animalGeo';
import {hex} from './animalGeo';

export type SpeciesId='redDeer'|'fallowDeer'|'roeDeer'|'boar'|'wolf'|'fox'|'bear'|'aurochs'|'cattle'|'mouflon'|'sheep'|'ibex'|'goat'|'wildHorse'|'horse'|'donkey'|'hare'
 |'duck'|'goose'|'raptor'|'trout'|'carp'|'pike'|'eel';
export const QUAD_IDS=['redDeer','fallowDeer','roeDeer','boar','wolf','fox','bear','aurochs','cattle','mouflon','sheep','ibex','goat','wildHorse','horse','donkey','hare'] as const;
export const BIRD_IDS=['duck','goose','raptor'] as const;
export const FISH_IDS=['trout','carp','pike','eel'] as const;
export const ALL_SPECIES:readonly SpeciesId[]=[...QUAD_IDS,...BIRD_IDS,...FISH_IDS];
export type QuadId=typeof QUAD_IDS[number];
export type Foot='cloven'|'hoof'|'paw'|'plantigrade'|'hare';
export type Section=readonly [f:number,top:number,bot:number,halfW:number];
/** Head section: [s from occiput, centre-y, half-height, half-width]. */
export type HeadSec=readonly [s:number,u:number,ru:number,rv:number];
export type Coat={back:string;belly:string;flank?:string;legs:string;muzzle:string;rump?:string;hoof:string;eye:string;horn?:string;mane?:string;tail?:string;face?:string;
 /** winter palette multiplier hint: how grey the winter coat goes (0 none, 1 full) and how thick (fur tuft length factor) */winterGrey:number;thick:number;
 /** juvenile coat (spots/stripes) and how long (fraction of adulthood) it persists */young?:string;spots?:boolean};
export type QuadSpec={
 id:QuadId;label:string;ref:string;kind:'ungulate'|'carnivore'|'lagomorph';foot:Foot;
 /** real reference: shoulder (withers) height of a typical adult, trunk length (point of shoulder to point of buttock), mass kg */real:{shoulder:number;trunk:number;kg:number};
 T:readonly Section[];
 neck:{len:number;pivot:readonly [number,number];abs:number;r0:readonly [number,number];r1:readonly [number,number]};
 head:{abs:number;len:number;sec:readonly HeadSec[];eye:readonly [number,number];earAt:readonly [number,number];ear:{len:number;w:number;pitch:number;splay:number}};
 fore:{pivot:readonly [number,number];z:number;len:readonly [number,number,number,number];abs:readonly [number,number,number,number];r:readonly [number,number]};
 hind:{pivot:readonly [number,number];z:number;len:readonly [number,number,number,number];abs:readonly [number,number,number,number];r:readonly [number,number]};
 tail:{kind:'short'|'brush'|'whip'|'switch'|'curl'|'scut'|'stub'|'horsehair';len:number;r:number;abs:number};
 coat:Coat;
 /** gait data: speeds (m/s) at which the walk becomes a trot, trot a gallop; stride length per cycle (m) at walk/trot/gallop */
 gait:{walkMax:number;trotMax:number;stride:readonly [number,number,number];amp:readonly [number,number,number]};
 /** juvenile proportions: relative size, head scale, leg length scale */
 young:{size:number;head:number;leg:number};sexSize:number;
 /** allowed ratio bounds of the leg segments from the real skeleton: M/U, C/M, H/C (fore); tests enforce these */
 bounds:{mu:readonly [number,number];cm:readonly [number,number];hc:readonly [number,number]};
 /** instances in the world are scaled by this factor relative to `real` */
};
const C=hex;
const ungulateBounds={mu:[1,2.4] as const,cm:[.7,1.35] as const,hc:[.18,.6] as const};
export const QUADS:Record<QuadId,QuadSpec>={
 redDeer:{id:'redDeer',label:'Red deer (Cervus elaphus)',ref:'Stag 1.20-1.40 m at the shoulder, 200 kg; antlers: brow, bez, trez and a three-point crown; pale rump patch, short tail; red-brown summer, grey-brown thick winter coat',
  kind:'ungulate',foot:'cloven',real:{shoulder:1.30,trunk:1.30,kg:200},
  T:[[-.5,.16,-.08,.10],[-.42,.25,-.18,.17],[-.25,.27,-.25,.19],[-.05,.27,-.30,.20],[.15,.29,-.32,.20],[.35,.34,-.30,.17],[.5,.30,-.22,.11]],
  neck:{len:.62,pivot:[.40,.27],abs:42,r0:[.17,.13],r1:[.085,.065]},
  head:{abs:-8,len:.44,sec:[[0,.0,.085,.07],[.12,-.005,.09,.072],[.24,-.03,.065,.05],[.34,-.05,.045,.036],[.44,-.06,.038,.032]],eye:[.15,.045],earAt:[.05,.07],ear:{len:.2,w:.055,pitch:55,splay:34}},
  fore:{pivot:[.37,-.06],z:.105,len:[.30,.36,.31,.14],abs:[-32,0,0,24],r:[.055,.034]},
  hind:{pivot:[-.4,-.02],z:.115,len:[.40,.40,.36,.14],abs:[34,-42,6,24],r:[.07,.036]},
  tail:{kind:'short',len:.14,r:.03,abs:-60},
  coat:{back:'#8d5f3b',belly:'#d8c8a8',flank:'#9a6b44',legs:'#6b4a33',muzzle:'#3a2c24',rump:'#e3d3b0',hoof:'#2a2420',eye:'#17120e',face:'#7a5538',winterGrey:.55,thick:1,young:'#a8703e',spots:true},
  gait:{walkMax:1.5,trotMax:3.4,stride:[1.5,2.6,4.6],amp:[20,28,44]},young:{size:.5,head:1.3,leg:1.12},sexSize:1.15,bounds:ungulateBounds},
 fallowDeer:{id:'fallowDeer',label:'Fallow deer (Dama dama)',ref:'Buck 0.90-1.00 m at the shoulder, 80 kg; palmate antlers with brow tine, spellers; white-spotted summer coat, long black-and-white tail; grey-brown winter coat',
  kind:'ungulate',foot:'cloven',real:{shoulder:.95,trunk:.95,kg:80},
  T:[[-.5,.12,-.06,.08],[-.42,.19,-.13,.13],[-.25,.21,-.19,.15],[-.05,.21,-.22,.155],[.15,.22,-.24,.155],[.35,.26,-.23,.13],[.5,.23,-.17,.085]],
  neck:{len:.44,pivot:[.30,.21],abs:40,r0:[.12,.09],r1:[.065,.05]},
  head:{abs:-8,len:.32,sec:[[0,.0,.065,.052],[.09,-.004,.068,.054],[.18,-.022,.048,.038],[.26,-.038,.034,.028],[.32,-.046,.029,.024]],eye:[.11,.035],earAt:[.04,.05],ear:{len:.15,w:.04,pitch:50,splay:36}},
  fore:{pivot:[.28,-.05],z:.08,len:[.22,.27,.23,.10],abs:[-32,0,0,24],r:[.04,.025]},
  hind:{pivot:[-.3,-.02],z:.088,len:[.30,.30,.27,.10],abs:[34,-42,6,24],r:[.05,.027]},
  tail:{kind:'whip',len:.22,r:.02,abs:-50},
  coat:{back:'#a46a3c',belly:'#efe6d2',flank:'#b4793f',legs:'#6f4d32',muzzle:'#3b2f27',rump:'#f1e9d5',hoof:'#2a2420',eye:'#17120e',face:'#8a5c38',winterGrey:.62,thick:1,young:'#b5793f',spots:true},
  gait:{walkMax:1.3,trotMax:3,stride:[1.2,2.1,3.8],amp:[20,28,44]},young:{size:.5,head:1.3,leg:1.12},sexSize:1.2,bounds:ungulateBounds},
 roeDeer:{id:'roeDeer',label:'Roe deer (Capreolus capreolus)',ref:'0.65-0.75 m at the shoulder, 25 kg; hind legs longer than fore (rump higher than withers); small upright three-point antlers; no visible tail, white rump patch; red summer, grey winter',
  kind:'ungulate',foot:'cloven',real:{shoulder:.70,trunk:.82,kg:25},
  T:[[-.5,.15,-.05,.07],[-.42,.22,-.10,.115],[-.25,.20,-.15,.125],[-.05,.18,-.18,.125],[.15,.18,-.20,.125],[.35,.20,-.18,.105],[.5,.17,-.12,.07]],
  neck:{len:.34,pivot:[.30,.17],abs:48,r0:[.10,.075],r1:[.055,.045]},
  head:{abs:-10,len:.24,sec:[[0,.0,.055,.045],[.07,-.003,.058,.047],[.14,-.016,.04,.032],[.2,-.027,.03,.024],[.24,-.032,.026,.021]],eye:[.08,.03],earAt:[.03,.045],ear:{len:.115,w:.037,pitch:45,splay:38}},
  fore:{pivot:[.28,-.03],z:.06,len:[.17,.24,.2,.09],abs:[-28,0,0,22],r:[.032,.02]},
  hind:{pivot:[-.33,.0],z:.07,len:[.27,.29,.25,.09],abs:[36,-46,7,22],r:[.042,.022]},
  tail:{kind:'stub',len:.03,r:.02,abs:-60},
  coat:{back:'#a8643a',belly:'#e4d7be',flank:'#b06d3f',legs:'#7a5434',muzzle:'#2c2420',rump:'#f0e8d6',hoof:'#25201c',eye:'#15100c',face:'#9a6d4a',winterGrey:.7,thick:1,young:'#b87a48',spots:true},
  gait:{walkMax:1.1,trotMax:2.6,stride:[.95,1.7,3.2],amp:[22,30,46]},young:{size:.5,head:1.3,leg:1.12},sexSize:1.05,bounds:ungulateBounds},
 boar:{id:'boar',label:'Wild boar (Sus scrofa)',ref:'0.80-0.95 m at the shoulder (high, heavy forequarters, low rump), 130 kg; long wedge head and tusks, dorsal bristle crest, short cloven legs, thin tufted tail; dark grizzled coat, striped piglets',
  kind:'ungulate',foot:'cloven',real:{shoulder:.88,trunk:1.1,kg:130},
  T:[[-.5,.17,-.08,.09],[-.42,.20,-.17,.15],[-.25,.21,-.21,.17],[-.05,.23,-.24,.18],[.15,.27,-.25,.19],[.35,.31,-.24,.185],[.5,.26,-.16,.11]],
  neck:{len:.24,pivot:[.40,.27],abs:10,r0:[.2,.17],r1:[.15,.13]},
  head:{abs:-28,len:.5,sec:[[0,.02,.14,.12],[.14,0,.12,.1],[.28,-.04,.08,.065],[.4,-.06,.062,.05],[.5,-.065,.05,.045]],eye:[.14,.07],earAt:[.04,.12],ear:{len:.13,w:.055,pitch:20,splay:25}},
  fore:{pivot:[.36,-.06],z:.13,len:[.20,.22,.14,.09],abs:[-26,2,0,26],r:[.058,.032]},
  hind:{pivot:[-.38,-.04],z:.14,len:[.26,.26,.15,.09],abs:[32,-38,6,24],r:[.07,.034]},
  tail:{kind:'whip',len:.3,r:.016,abs:-80},
  coat:{back:'#5c4b3d',belly:'#7a6654',flank:'#64513f',legs:'#2e2620',muzzle:'#2a221d',hoof:'#1c1814',eye:'#120e0b',horn:'#e8e0c8',mane:'#30251d',winterGrey:.25,thick:1.5,young:'#8a6a48',spots:false},
  gait:{walkMax:1.3,trotMax:3.2,stride:[1,1.8,3.2],amp:[22,30,44]},young:{size:.35,head:1.35,leg:1},sexSize:1.12,bounds:{mu:[.9,1.6],cm:[.45,1.1],hc:[.4,.9]}},
 wolf:{id:'wolf',label:'Grey wolf (Canis lupus)',ref:'0.70-0.85 m at the shoulder, 40 kg; narrow deep chest, digitigrade long legs, elbows turned in, large paws, bushy drooping tail; grey-buff with darker saddle, pale face and belly',
  kind:'carnivore',foot:'paw',real:{shoulder:.78,trunk:.95,kg:40},
  T:[[-.5,.11,-.06,.07],[-.42,.16,-.10,.11],[-.25,.15,-.15,.115],[-.05,.15,-.20,.12],[.15,.17,-.24,.125],[.35,.21,-.26,.12],[.5,.17,-.2,.085]],
  neck:{len:.32,pivot:[.38,.19],abs:30,r0:[.12,.1],r1:[.085,.07]},
  head:{abs:-12,len:.26,sec:[[0,.01,.075,.065],[.08,.0,.07,.062],[.15,-.01,.045,.04],[.21,-.016,.034,.03],[.26,-.018,.028,.025]],eye:[.1,.03],earAt:[.04,.065],ear:{len:.1,w:.04,pitch:8,splay:14}},
  fore:{pivot:[.34,-.1],z:.075,len:[.26,.26,.2,.11],abs:[-20,6,-4,14],r:[.045,.028]},
  hind:{pivot:[-.38,-.04],z:.09,len:[.28,.28,.2,.11],abs:[40,-40,10,8],r:[.06,.03]},
  tail:{kind:'brush',len:.42,r:.05,abs:-70},
  coat:{back:'#7f776a',belly:'#d9d0bd',flank:'#8a8172',legs:'#9a8f7a',muzzle:'#2b2622',hoof:'#1f1b18',eye:'#c79a3a',face:'#b8ab94',mane:'#5c554c',winterGrey:.3,thick:1.6,young:'#5c5148'},
  gait:{walkMax:1.6,trotMax:4,stride:[1.2,2.2,4.2],amp:[22,30,46]},young:{size:.4,head:1.35,leg:1},sexSize:1.1,bounds:{mu:[.8,1.3],cm:[.7,1.2],hc:[.35,.8]}},
 fox:{id:'fox',label:'Red fox (Vulpes vulpes)',ref:'0.35-0.40 m at the shoulder, 6 kg; slender, pointed muzzle, large erect ears with black backs, black socks, long bushy white-tipped brush',
  kind:'carnivore',foot:'paw',real:{shoulder:.38,trunk:.62,kg:6},
  T:[[-.5,.07,-.03,.045],[-.42,.10,-.06,.065],[-.25,.095,-.09,.07],[-.05,.095,-.115,.075],[.15,.105,-.125,.075],[.35,.125,-.13,.07],[.5,.10,-.09,.05]],
  neck:{len:.16,pivot:[.36,.12],abs:34,r0:[.065,.055],r1:[.05,.042]},
  head:{abs:-14,len:.16,sec:[[0,.005,.045,.04],[.05,.0,.043,.038],[.1,-.008,.028,.024],[.135,-.012,.02,.017],[.16,-.014,.016,.014]],eye:[.07,.02],earAt:[.025,.04],ear:{len:.075,w:.032,pitch:4,splay:10}},
  fore:{pivot:[.34,-.06],z:.04,len:[.1,.11,.1,.06],abs:[-20,6,-4,10],r:[.024,.016]},
  hind:{pivot:[-.36,-.03],z:.048,len:[.12,.13,.1,.06],abs:[38,-40,10,8],r:[.03,.017]},
  tail:{kind:'brush',len:.4,r:.06,abs:-65},
  coat:{back:'#b8622d',belly:'#efe8da',flank:'#c06a32',legs:'#26201c',muzzle:'#d9d0c0',hoof:'#1a1613',eye:'#c79a3a',face:'#c06a32',tail:'#f0ebe0',winterGrey:.15,thick:1.5,young:'#6f5f55'},
  gait:{walkMax:1,trotMax:3,stride:[.6,1.1,2],amp:[24,32,48]},young:{size:.45,head:1.3,leg:1},sexSize:1.05,bounds:{mu:[.8,1.5],cm:[.7,1.3],hc:[.4,.9]}},
 bear:{id:'bear',label:'Brown bear (Ursus arctos)',ref:'1.00-1.20 m at the shoulder hump, 250 kg; plantigrade, muscular shoulder hump over the long-clawed forefeet, dished broad head with small round ears, stub tail; brown, grizzled',
  kind:'carnivore',foot:'plantigrade',real:{shoulder:1.1,trunk:1.5,kg:250},
  T:[[-.5,.2,-.1,.14],[-.42,.28,-.2,.23],[-.25,.28,-.3,.26],[-.05,.31,-.36,.27],[.15,.38,-.38,.27],[.35,.48,-.34,.25],[.5,.36,-.22,.16]],
  neck:{len:.3,pivot:[.38,.36],abs:20,r0:[.24,.2],r1:[.16,.15]},
  head:{abs:-18,len:.36,sec:[[0,.02,.15,.14],[.1,.01,.145,.135],[.2,-.02,.1,.09],[.3,-.04,.07,.065],[.36,-.045,.06,.055]],eye:[.15,.07],earAt:[.06,.14],ear:{len:.07,w:.05,pitch:3,splay:20}},
  fore:{pivot:[.34,-.08],z:.16,len:[.34,.34,.08,.3],abs:[-12,4,0,0],r:[.1,.075]},
  hind:{pivot:[-.38,-.08],z:.17,len:[.38,.34,.08,.3],abs:[30,-26,4,0],r:[.11,.08]},
  tail:{kind:'stub',len:.07,r:.04,abs:-40},
  coat:{back:'#7a583b',belly:'#6a4c34',flank:'#85603f',legs:'#3c2b20',muzzle:'#4a3a2f',hoof:'#d8d0bd',eye:'#17100c',face:'#6a5040',mane:'#6e5240',winterGrey:.15,thick:1.7,young:'#6b5240'},
  gait:{walkMax:1.5,trotMax:3.5,stride:[1.3,2.2,4.2],amp:[20,26,38]},young:{size:.3,head:1.4,leg:.9},sexSize:1.25,bounds:{mu:[.8,1.3],cm:[.12,.4],hc:[.6,1.3]}},
 aurochs:{id:'aurochs',label:'Aurochs (Bos primigenius)',ref:'Bull 1.55-1.80 m at the shoulder, 900 kg; huge forward-curving lyre horns (to 80 cm), long legs, pale saddle-stripe on a black bull; cows and calves red-brown; tufted tail',
  kind:'ungulate',foot:'cloven',real:{shoulder:1.65,trunk:1.9,kg:900},
  T:[[-.5,.20,-.12,.13],[-.42,.31,-.26,.25],[-.25,.30,-.34,.28],[-.05,.31,-.40,.30],[.15,.37,-.44,.30],[.35,.46,-.42,.27],[.5,.36,-.28,.17]],
  neck:{len:.62,pivot:[.38,.38],abs:18,r0:[.27,.22],r1:[.15,.13]},
  head:{abs:-34,len:.56,sec:[[0,.02,.14,.12],[.14,0,.145,.12],[.3,-.04,.1,.082],[.45,-.08,.082,.075],[.56,-.1,.078,.075]],eye:[.18,.07],earAt:[.04,.1],ear:{len:.17,w:.075,pitch:3,splay:-2}},
  fore:{pivot:[.34,-.12],z:.15,len:[.34,.42,.34,.15],abs:[-28,0,0,22],r:[.09,.055]},
  hind:{pivot:[-.38,-.06],z:.17,len:[.44,.44,.4,.15],abs:[32,-42,6,22],r:[.11,.058]},
  tail:{kind:'switch',len:.9,r:.025,abs:-4},
  coat:{back:'#4d3d31',belly:'#62503f',flank:'#58463a',legs:'#2e251f',muzzle:'#d8cdb6',hoof:'#1c1814',eye:'#15100c',horn:'#d8cfb4',face:'#2f261f',mane:'#2a211b',winterGrey:.15,thick:1.5,young:'#8a5a38'},
  gait:{walkMax:1.4,trotMax:3.2,stride:[1.8,3,5],amp:[18,24,38]},young:{size:.4,head:1.3,leg:1.12},sexSize:1.2,bounds:ungulateBounds},
 cattle:{id:'cattle',label:'Domestic cattle (Bos taurus, small Neolithic/Iron Age type)',ref:'1.10-1.30 m at the shoulder, 350 kg; short-horned small-framed landrace cattle; red-brown or dun, light muzzle, udder on the cow',
  kind:'ungulate',foot:'cloven',real:{shoulder:1.2,trunk:1.5,kg:350},
  T:[[-.5,.19,-.1,.12],[-.42,.28,-.21,.2],[-.25,.27,-.3,.235],[-.05,.27,-.35,.25],[.15,.3,-.37,.25],[.35,.34,-.35,.22],[.5,.28,-.24,.14]],
  neck:{len:.5,pivot:[.38,.3],abs:12,r0:[.22,.18],r1:[.13,.11]},
  head:{abs:-40,len:.5,sec:[[0,.02,.125,.105],[.12,0,.125,.105],[.27,-.04,.09,.075],[.4,-.075,.075,.068],[.5,-.09,.072,.068]],eye:[.16,.06],earAt:[.04,.09],ear:{len:.15,w:.065,pitch:3,splay:-2}},
  fore:{pivot:[.34,-.1],z:.13,len:[.26,.33,.26,.13],abs:[-28,0,0,22],r:[.075,.045]},
  hind:{pivot:[-.38,-.05],z:.15,len:[.34,.35,.3,.13],abs:[32,-42,6,22],r:[.09,.048]},
  tail:{kind:'switch',len:.62,r:.02,abs:-4},
  coat:{back:'#7a5238',belly:'#8b6648',flank:'#845840',legs:'#5d3e2a',muzzle:'#cdb89c',hoof:'#1f1a17',eye:'#17110d',horn:'#cfc4a6',face:'#7a5238',winterGrey:.2,thick:1.4,young:'#95623e'},
  gait:{walkMax:1.3,trotMax:3,stride:[1.5,2.6,4.4],amp:[18,24,38]},young:{size:.4,head:1.3,leg:1.12},sexSize:1.15,bounds:ungulateBounds},
 mouflon:{id:'mouflon',label:'Mouflon (Ovis gmelini), wild sheep',ref:'0.65-0.75 m at the shoulder, 35 kg; ram with heavy spiral horns (to 80 cm), short chestnut hair coat, pale saddle patch and belly, thin tail; ewes hornless',
  kind:'ungulate',foot:'cloven',real:{shoulder:.72,trunk:.82,kg:35},
  T:[[-.5,.13,-.06,.08],[-.42,.19,-.12,.125],[-.25,.19,-.17,.14],[-.05,.19,-.20,.145],[.15,.2,-.22,.145],[.35,.23,-.21,.125],[.5,.19,-.15,.08]],
  neck:{len:.28,pivot:[.30,.19],abs:34,r0:[.115,.09],r1:[.07,.055]},
  head:{abs:-14,len:.25,sec:[[0,.0,.062,.05],[.08,-.004,.065,.052],[.16,-.02,.048,.036],[.22,-.032,.036,.029],[.25,-.04,.033,.027]],eye:[.09,.035],earAt:[.035,.05],ear:{len:.07,w:.03,pitch:12,splay:22}},
  fore:{pivot:[.28,-.04],z:.065,len:[.17,.22,.18,.09],abs:[-30,0,0,22],r:[.036,.022]},
  hind:{pivot:[-.32,-.02],z:.075,len:[.24,.25,.2,.09],abs:[34,-42,6,22],r:[.048,.024]},
  tail:{kind:'short',len:.12,r:.025,abs:-50},
  coat:{back:'#7a4a2c',belly:'#e4dac6',flank:'#8a5632',legs:'#6a4228',muzzle:'#e0d6c2',rump:'#e8dfcc',hoof:'#25201c',eye:'#17120e',horn:'#b8a888',face:'#5a3a24',winterGrey:.3,thick:1.2,young:'#9a7048'},
  gait:{walkMax:1.2,trotMax:3,stride:[1,1.8,3.4],amp:[20,28,44]},young:{size:.45,head:1.3,leg:1.1},sexSize:1.2,bounds:ungulateBounds},
 sheep:{id:'sheep',label:'Domestic sheep (Ovis aries, primitive fleeced type)',ref:'0.60-0.70 m at the shoulder, 45 kg; round woolly body on thin legs, dark bare face and legs (Soay/Shetland type), short tail; fleece grows with the sim fleece stock',
  kind:'ungulate',foot:'cloven',real:{shoulder:.66,trunk:.78,kg:45},
  T:[[-.5,.14,-.06,.09],[-.42,.22,-.12,.14],[-.25,.23,-.18,.165],[-.05,.23,-.21,.17],[.15,.23,-.22,.165],[.35,.24,-.2,.14],[.5,.19,-.14,.09]],
  neck:{len:.24,pivot:[.30,.2],abs:34,r0:[.13,.11],r1:[.075,.06]},
  head:{abs:-14,len:.23,sec:[[0,.0,.06,.048],[.07,-.004,.062,.05],[.14,-.02,.046,.034],[.2,-.03,.035,.028],[.23,-.036,.032,.026]],eye:[.085,.032],earAt:[.03,.045],ear:{len:.075,w:.032,pitch:-4,splay:42}},
  fore:{pivot:[.28,-.07],z:.065,len:[.16,.2,.17,.08],abs:[-30,0,0,22],r:[.032,.02]},
  hind:{pivot:[-.32,-.04],z:.075,len:[.2,.22,.19,.08],abs:[34,-42,6,22],r:[.04,.022]},
  tail:{kind:'short',len:.18,r:.03,abs:-60},
  coat:{back:'#dbd3bb',belly:'#cfc6ae',flank:'#d6cdb5',legs:'#5a5044',muzzle:'#4a4238',hoof:'#25201c',eye:'#17120e',face:'#554b40',winterGrey:.1,thick:2,young:'#e6dfca'},
  gait:{walkMax:1.2,trotMax:2.8,stride:[.9,1.6,3],amp:[22,30,44]},young:{size:.45,head:1.3,leg:1.1},sexSize:1.1,bounds:ungulateBounds},
 ibex:{id:'ibex',label:'Alpine ibex (Capra ibex), wild goat',ref:'0.80-0.90 m at the shoulder, 90 kg; male with huge ridged scimitar horns (to 1 m), beard, stocky short legs with broad hooves; grey-brown, paler belly; female short horns',
  kind:'ungulate',foot:'cloven',real:{shoulder:.85,trunk:.95,kg:90},
  T:[[-.5,.14,-.07,.09],[-.42,.2,-.14,.14],[-.25,.21,-.19,.155],[-.05,.21,-.23,.16],[.15,.23,-.25,.16],[.35,.27,-.24,.14],[.5,.22,-.17,.09]],
  neck:{len:.3,pivot:[.34,.22],abs:28,r0:[.135,.105],r1:[.08,.065]},
  head:{abs:-16,len:.27,sec:[[0,.0,.065,.05],[.08,-.004,.068,.052],[.17,-.02,.05,.038],[.23,-.034,.04,.03],[.27,-.04,.036,.028]],eye:[.1,.04],earAt:[.035,.055],ear:{len:.085,w:.035,pitch:10,splay:30}},
  fore:{pivot:[.32,-.05],z:.075,len:[.19,.25,.2,.1],abs:[-28,0,0,22],r:[.044,.029]},
  hind:{pivot:[-.34,-.02],z:.085,len:[.26,.27,.22,.1],abs:[34,-42,6,22],r:[.054,.03]},
  tail:{kind:'short',len:.13,r:.025,abs:-50},
  coat:{back:'#8a7a66',belly:'#cfc4ae',flank:'#94836d',legs:'#5d5043',muzzle:'#d4c9b3',hoof:'#25201c',eye:'#17120e',horn:'#a89878',face:'#74675a',winterGrey:.4,thick:1.5,young:'#9a8a74'},
  gait:{walkMax:1.2,trotMax:3,stride:[1,1.8,3.4],amp:[20,28,42]},young:{size:.45,head:1.3,leg:1.1},sexSize:1.4,bounds:ungulateBounds},
 goat:{id:'goat',label:'Domestic goat (Capra hircus)',ref:'0.60-0.75 m at the shoulder, 45 kg; lean, straight-backed, scimitar horns, small beard, upright short tail, rectangular pupil; mixed black, brown and white coats',
  kind:'ungulate',foot:'cloven',real:{shoulder:.68,trunk:.8,kg:45},
  T:[[-.5,.12,-.06,.075],[-.42,.17,-.12,.115],[-.25,.18,-.16,.125],[-.05,.18,-.19,.13],[.15,.19,-.21,.13],[.35,.22,-.2,.11],[.5,.18,-.14,.075]],
  neck:{len:.28,pivot:[.30,.19],abs:34,r0:[.105,.08],r1:[.065,.05]},
  head:{abs:-14,len:.24,sec:[[0,.0,.055,.044],[.07,-.004,.058,.046],[.15,-.018,.042,.032],[.2,-.03,.034,.026],[.24,-.036,.03,.023]],eye:[.09,.035],earAt:[.03,.045],ear:{len:.09,w:.034,pitch:-8,splay:50}},
  fore:{pivot:[.28,-.05],z:.06,len:[.18,.23,.19,.09],abs:[-28,0,0,22],r:[.036,.022]},
  hind:{pivot:[-.32,-.02],z:.07,len:[.24,.26,.2,.09],abs:[34,-42,6,22],r:[.044,.024]},
  tail:{kind:'short',len:.12,r:.022,abs:20},
  coat:{back:'#5a4636',belly:'#8a7662',flank:'#66503e',legs:'#3e3026',muzzle:'#2a221d',hoof:'#22201c',eye:'#c79a3a',face:'#4c3b2e',winterGrey:.15,thick:1.3,young:'#78604a'},
  gait:{walkMax:1.2,trotMax:3,stride:[.95,1.7,3.2],amp:[22,30,44]},young:{size:.45,head:1.3,leg:1.1},sexSize:1.15,bounds:ungulateBounds},
 wildHorse:{id:'wildHorse',label:'Wild horse (tarpan / Przewalski type, Equus ferus)',ref:'1.25-1.35 m at the withers, 300 kg; heavy head, stiff upright mane without forelock, dun coat with dorsal stripe and zebra-barred legs, pale muzzle, tail with long hair from mid-length',
  kind:'ungulate',foot:'hoof',real:{shoulder:1.30,trunk:1.45,kg:300},
  T:[[-.5,.19,-.1,.11],[-.42,.26,-.2,.19],[-.25,.25,-.27,.205],[-.05,.25,-.33,.205],[.15,.28,-.35,.2],[.35,.33,-.32,.17],[.5,.28,-.22,.115]],
  neck:{len:.6,pivot:[.38,.27],abs:48,r0:[.19,.12],r1:[.1,.075]},
  head:{abs:-28,len:.54,sec:[[0,.0,.115,.085],[.14,-.01,.11,.082],[.3,-.05,.075,.06],[.44,-.085,.06,.055],[.54,-.1,.058,.056]],eye:[.15,.06],earAt:[.04,.1],ear:{len:.14,w:.045,pitch:6,splay:-4}},
  fore:{pivot:[.36,-.1],z:.1,len:[.28,.36,.31,.15],abs:[-28,0,0,30],r:[.062,.04]},
  hind:{pivot:[-.4,-.04],z:.11,len:[.36,.4,.36,.15],abs:[34,-44,6,30],r:[.085,.042]},
  tail:{kind:'horsehair',len:.7,r:.04,abs:-50},
  coat:{back:'#a8895c',belly:'#d8c9a8',flank:'#b4956a',legs:'#3e3226',muzzle:'#e0d5bb',hoof:'#2a2420',eye:'#17110d',face:'#9a7c54',mane:'#2c241c',tail:'#2c241c',winterGrey:.3,thick:1.5,young:'#a8895c'},
  gait:{walkMax:1.6,trotMax:4.2,stride:[1.6,3.2,6],amp:[20,28,44]},young:{size:.5,head:1.3,leg:1.2},sexSize:1.05,bounds:{mu:[1,2.3],cm:[.8,1.3],hc:[.25,.6]}},
 horse:{id:'horse',label:'Domestic horse (Equus caballus, light riding/draught pony type)',ref:'1.35-1.50 m at the withers, 400 kg; refined head, flowing mane and forelock, long tail, solid hoof; bay, chestnut, grey',
  kind:'ungulate',foot:'hoof',real:{shoulder:1.42,trunk:1.55,kg:400},
  T:[[-.5,.19,-.1,.11],[-.42,.27,-.2,.19],[-.25,.26,-.27,.205],[-.05,.26,-.34,.205],[.15,.28,-.36,.2],[.35,.34,-.33,.17],[.5,.29,-.22,.115]],
  neck:{len:.66,pivot:[.38,.28],abs:52,r0:[.2,.12],r1:[.1,.075]},
  head:{abs:-34,len:.56,sec:[[0,.0,.115,.082],[.14,-.01,.11,.08],[.31,-.05,.072,.056],[.45,-.085,.056,.05],[.56,-.1,.054,.052]],eye:[.15,.06],earAt:[.04,.1],ear:{len:.15,w:.045,pitch:6,splay:-4}},
  fore:{pivot:[.36,-.1],z:.1,len:[.3,.4,.34,.16],abs:[-28,0,0,30],r:[.062,.04]},
  hind:{pivot:[-.4,-.04],z:.11,len:[.38,.43,.38,.16],abs:[34,-44,6,30],r:[.085,.042]},
  tail:{kind:'horsehair',len:.8,r:.04,abs:-50},
  coat:{back:'#7b4a2a',belly:'#8a5a38',flank:'#7f4e2e',legs:'#2c2018',muzzle:'#3a2a20',hoof:'#2a2420',eye:'#17110d',face:'#74452a',mane:'#231a14',tail:'#231a14',winterGrey:.1,thick:1.3,young:'#7b4a2a'},
  gait:{walkMax:1.7,trotMax:4.5,stride:[1.7,3.4,6.4],amp:[20,28,44]},young:{size:.5,head:1.3,leg:1.2},sexSize:1.04,bounds:{mu:[1,2.3],cm:[.8,1.3],hc:[.25,.6]}},
 donkey:{id:'donkey',label:'Donkey (Equus africanus asinus)',ref:'1.05-1.25 m at the withers, 250 kg; long ears, upright short mane without forelock, cross-marked shoulders, tufted tail, small narrow hooves; grey-brown with pale muzzle and belly',
  kind:'ungulate',foot:'hoof',real:{shoulder:1.15,trunk:1.2,kg:250},
  T:[[-.5,.16,-.08,.1],[-.42,.22,-.17,.16],[-.25,.22,-.23,.175],[-.05,.22,-.28,.175],[.15,.24,-.3,.17],[.35,.28,-.27,.15],[.5,.24,-.19,.1]],
  neck:{len:.5,pivot:[.38,.23],abs:40,r0:[.16,.105],r1:[.09,.07]},
  head:{abs:-32,len:.5,sec:[[0,.0,.1,.075],[.13,-.01,.1,.075],[.28,-.045,.068,.054],[.4,-.075,.056,.05],[.5,-.09,.054,.05]],eye:[.14,.055],earAt:[.04,.09],ear:{len:.26,w:.045,pitch:12,splay:12}},
  fore:{pivot:[.36,-.07],z:.085,len:[.24,.31,.27,.12],abs:[-26,0,0,28],r:[.052,.034]},
  hind:{pivot:[-.4,-.03],z:.095,len:[.3,.34,.3,.12],abs:[32,-42,6,28],r:[.07,.036]},
  tail:{kind:'switch',len:.7,r:.025,abs:-8},
  coat:{back:'#7d7468',belly:'#d7cdbb',flank:'#857b6d',legs:'#6a6155',muzzle:'#d9cfbd',hoof:'#2a2420',eye:'#17110d',face:'#756c60',mane:'#3d362e',tail:'#3d362e',winterGrey:.2,thick:1.5,young:'#857b6d'},
  gait:{walkMax:1.4,trotMax:3.6,stride:[1.3,2.7,5],amp:[20,28,44]},young:{size:.5,head:1.3,leg:1.2},sexSize:1.04,bounds:{mu:[1,2.3],cm:[.8,1.3],hc:[.25,.6]}},
 hare:{id:'hare',label:'European brown hare (Lepus europaeus)',ref:'0.25-0.30 m at the shoulder (rump higher), 4 kg; hind legs far longer than fore, long black-tipped ears, large eyes set high, short upturned scut; sandy-brown, white belly',
  kind:'lagomorph',foot:'hare',real:{shoulder:.27,trunk:.45,kg:4},
  T:[[-.5,.1,-.04,.045],[-.42,.17,-.06,.075],[-.25,.17,-.09,.075],[-.05,.15,-.11,.07],[.15,.14,-.11,.065],[.35,.14,-.1,.058],[.5,.11,-.07,.04]],
  neck:{len:.09,pivot:[.38,.12],abs:20,r0:[.05,.045],r1:[.045,.04]},
  head:{abs:-8,len:.11,sec:[[0,.0,.04,.035],[.04,.0,.042,.037],[.08,-.01,.03,.026],[.105,-.014,.022,.019],[.115,-.016,.019,.016]],eye:[.04,.028],earAt:[.025,.035],ear:{len:.11,w:.022,pitch:20,splay:12}},
  fore:{pivot:[.34,-.04],z:.035,len:[.06,.09,.08,.05],abs:[-20,6,-4,10],r:[.016,.012]},
  hind:{pivot:[-.38,-.01],z:.05,len:[.13,.15,.11,.1],abs:[48,-56,14,2],r:[.036,.016]},
  tail:{kind:'scut',len:.07,r:.025,abs:40},
  coat:{back:'#a67c4e',belly:'#efe6d6',flank:'#b58a58',legs:'#c2a070',muzzle:'#d2b88e',hoof:'#3a2f26',eye:'#3a2410',face:'#a67c4e',winterGrey:.35,thick:1.2,young:'#a67c4e'},
  gait:{walkMax:.8,trotMax:2.4,stride:[.4,.9,2],amp:[26,34,52]},young:{size:.45,head:1.3,leg:1},sexSize:1.04,bounds:{mu:[.7,1.6],cm:[.7,1.6],hc:[.5,1.2]}},
};
export const rgb=(h:string):RGB=>C(h);
/** Reference sizes of the game's own critter scale: Critter.scale is divided by these so a "typical" animal renders at real size. */
export const TYPICAL_SCALE:Record<string,number>={deer:1.15,boar:1.05,goat:.95,sheep:1,horse:1.175,cattle:1.275,bird:.7};
