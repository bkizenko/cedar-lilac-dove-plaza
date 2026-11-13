/** HOW PEOPLE CARRY THINGS (owner playtest 11-13: "the NPC packs don't look real"). Pure data and maths, no three.js, no clock, no random.
 *
 * A load is carried the way real people carried it, chosen from the society (look id / civ), the real cargo kind (Unit.carryType) and how full
 * the load is, plus a stable per-unit seed:
 *   shoulderLog     one to three logs or poles on one shoulder, near hand steadying them (everywhere with timber)
 *   poleFront/Rear  one long log between two bearers, each on a shoulder (data for pairs; the sim has no pair carry yet)
 *   bundleBack      firewood / poles bound with cordage and carried on the back with shoulder loops, hands on the loops
 *   tumplineBasket  woven basket on the back with a strap across the forehead (Andean, Mesoamerican, Himalayan, Native American porters)
 *   headLoad        jar or basket balanced on a cloth pad on the head, one hand steadying (Africa, India, Mediterranean, Egypt)
 *   yoke            shoulder pole with a basket or bundle at each end, both hands on the pole (East Asia, medieval Europe)
 *   sackBack        sack or skin bag slung on the back, hand on its neck (nomads, northern peoples, ore bags)
 *   stoneFrame      lashed back frame carrying cut or rough stone (quarry carriers)
 * Heavy loads lean the torso forward in proportion to load MASS (fraction of capacity x the cargo's density), shorten the stride and lower the
 * head; a head load stays upright and only shortens the step. `carryPose` writes this over the carry clip; geometry is in carryLoads.ts. */
import type {Part as Bone,Pose} from './animationClips';
import {hashSeed,seededRandom} from './buildingParts';

export type CarryStyleId='shoulderLog'|'poleFront'|'poleRear'|'bundleBack'|'tumplineBasket'|'headLoad'|'yoke'|'sackBack'|'stoneFrame';
export const CARRY_STYLE_IDS:readonly CarryStyleId[]=['shoulderLog','poleFront','poleRear','bundleBack','tumplineBasket','headLoad','yoke','sackBack','stoneFrame'];
export type CarryKind='food'|'wood'|'stone'|'copper'|'iron';
export const CARRY_KINDS:readonly CarryKind[]=['food','wood','stone','copper','iron'];
/** Relative weight per unit of capacity: stone and ore drag harder than grain or timber. */
export const CARRY_DENSITY:Record<CarryKind,number>={food:.75,wood:.85,stone:1.15,copper:1.1,iron:1.15};
export const carryMass=(kind:CarryKind|string|undefined,load:number)=>Math.max(0,Math.min(1,(Number.isFinite(load)?load:0)*(CARRY_DENSITY[kind as CarryKind]??1)));

export type ArmSpec={/** pitch, degrees (negative = forward and up) */rx:number;/** extra pitch per unit of mass */rxMass?:number;/** roll (armL positive = toward the midline; armR negative = toward the midline) */rz:number;ry?:number;/** walking swing amplitude in degrees (opposite to the same-side leg) */swing:number};
export type StyleSpec={id:CarryStyleId;label:string;origin:string;
 /** the bone the load is mounted on (geometry is cut in that bone's frame) */attach:Bone;
 /** spine pitch in degrees: [empty, extra at full mass] */spine:readonly [number,number];/** head pitch (relative to the spine) [empty, extra at full mass] */head:readonly [number,number];
 armL:ArmSpec;armR:ArmSpec;/** step length multiplier at mass 0, and how much of it a full load takes away */stride:readonly [number,number];/** vertical bob multiplier */bob:number;/** side-to-side hip sway in metres at full mass */sway:number;
 /** hip yaw multiplier (head loads keep the shoulders still) */hipYaw:number;/** shoulder counter-twist multiplier */spineTwist:number;/** cargo kinds this can carry */kinds:readonly CarryKind[]};
export const CARRY_STYLES:Record<CarryStyleId,StyleSpec>={
 shoulderLog:{id:'shoulderLog',label:'log on the shoulder',origin:'everywhere timber was moved on foot',attach:'spine',spine:[3,9],head:[0,-2],armR:{rx:-112,rz:-10,swing:0},armL:{rx:0,rz:2,swing:20},stride:[.9,.28],bob:1.1,sway:.012,hipYaw:.8,spineTwist:.3,kinds:['wood']},
 poleFront:{id:'poleFront',label:'long log, front bearer',origin:'two people carrying a heavy beam or tree trunk',attach:'spine',spine:[3,8],head:[0,-2],armR:{rx:-112,rz:-10,swing:0},armL:{rx:0,rz:2,swing:20},stride:[.85,.25],bob:1.1,sway:.01,hipYaw:.7,spineTwist:.3,kinds:['wood','stone']},
 poleRear:{id:'poleRear',label:'long log, rear bearer',origin:'two people carrying a heavy beam or tree trunk',attach:'spine',spine:[3,8],head:[0,-2],armR:{rx:-112,rz:-10,swing:0},armL:{rx:0,rz:2,swing:20},stride:[.85,.25],bob:1.1,sway:.01,hipYaw:.7,spineTwist:.3,kinds:['wood','stone']},
 bundleBack:{id:'bundleBack',label:'bound bundle on the back',origin:'firewood, brushwood and poles bound with cordage and carried on the back (Europe, Asia, the Americas)',attach:'spine',spine:[6,17],head:[-3,-6],armR:{rx:-34,rz:-16,swing:4},armL:{rx:-34,rz:16,swing:4},stride:[.88,.38],bob:.9,sway:.016,hipYaw:.75,spineTwist:.4,kinds:['wood','food','copper','iron']},
 tumplineBasket:{id:'tumplineBasket',label:'basket on the back with a forehead strap',origin:'Andean, Mesoamerican, Himalayan and Native American porters used a tumpline across the forehead',attach:'spine',spine:[8,15],head:[-6,-7],armR:{rx:-26,rz:-14,swing:5},armL:{rx:-26,rz:14,swing:5},stride:[.86,.36],bob:.85,sway:.015,hipYaw:.7,spineTwist:.35,kinds:['food','stone','copper','iron','wood']},
 headLoad:{id:'headLoad',label:'load balanced on the head',origin:'jars and baskets on the head: Africa, India, the Mediterranean, Egypt, the Near East',attach:'head',spine:[0,2.5],head:[0,0],armR:{rx:-152,rz:-20,swing:0},armL:{rx:0,rz:3,swing:14},stride:[.82,.3],bob:.5,sway:.028,hipYaw:.55,spineTwist:.2,kinds:['food','stone','copper','iron','wood']},
 yoke:{id:'yoke',label:'shoulder yoke with a load at each end',origin:'China, Japan, South-East Asia and medieval Europe: two baskets or bundles on a carrying pole',attach:'spine',spine:[2,7],head:[0,-1],armR:{rx:-6,rz:-76,swing:0},armL:{rx:-6,rz:76,swing:0},stride:[.8,.3],bob:1.4,sway:.02,hipYaw:.45,spineTwist:.15,kinds:['food','stone','copper','iron','wood']},
 sackBack:{id:'sackBack',label:'sack or skin bag on the back',origin:'hide bags, grain sacks and ore bags: steppe nomads, northern peoples, miners',attach:'spine',spine:[7,16],head:[-3,-7],armR:{rx:-44,rz:-22,swing:6},armL:{rx:-24,rz:12,swing:10},stride:[.88,.36],bob:.95,sway:.016,hipYaw:.75,spineTwist:.4,kinds:['food','copper','iron','stone']},
 stoneFrame:{id:'stoneFrame',label:'stone on a lashed back frame',origin:'carrying frames and hods for quarry stone and ore',attach:'spine',spine:[8,16],head:[-6,-8],armR:{rx:-30,rz:-16,swing:4},armL:{rx:-30,rz:16,swing:4},stride:[.82,.4],bob:.8,sway:.018,hipYaw:.7,spineTwist:.3,kinds:['stone','copper','iron']},
};

/** Which societies carry how (look id or civ id). The tags are the real traditions of the peoples each society draws on. */
const TRADITION:Record<string,{food:CarryStyleId[];stone:CarryStyleId[];ore:CarryStyleId[];wood:CarryStyleId[]}>={
 quillan:{food:['tumplineBasket','tumplineBasket','sackBack'],stone:['tumplineBasket','stoneFrame'],ore:['tumplineBasket','sackBack'],wood:['bundleBack','shoulderLog']},
 kaaltun:{food:['tumplineBasket','tumplineBasket','headLoad'],stone:['tumplineBasket','stoneFrame'],ore:['tumplineBasket'],wood:['bundleBack','shoulderLog']},
 hanrei:{food:['yoke','yoke','sackBack'],stone:['yoke','stoneFrame'],ore:['yoke','sackBack'],wood:['yoke','bundleBack','shoulderLog']},
 vedara:{food:['headLoad','headLoad','yoke'],stone:['headLoad','stoneFrame'],ore:['headLoad','sackBack'],wood:['headLoad','bundleBack','shoulderLog']},
 sahelan:{food:['headLoad','headLoad','sackBack'],stone:['headLoad','stoneFrame'],ore:['headLoad','sackBack'],wood:['headLoad','bundleBack','shoulderLog']},
 nilemark:{food:['headLoad','headLoad','yoke'],stone:['stoneFrame','headLoad'],ore:['sackBack','headLoad'],wood:['bundleBack','shoulderLog']},
 aureline:{food:['headLoad','headLoad','sackBack'],stone:['stoneFrame','headLoad'],ore:['sackBack','headLoad'],wood:['shoulderLog','bundleBack']},
 tigrane:{food:['headLoad','sackBack','yoke'],stone:['stoneFrame','headLoad'],ore:['sackBack','headLoad'],wood:['shoulderLog','bundleBack']},
 sandrill:{food:['headLoad','sackBack','tumplineBasket'],stone:['stoneFrame','tumplineBasket'],ore:['sackBack','tumplineBasket'],wood:['bundleBack','shoulderLog']},
 mekhari:{food:['yoke','headLoad','tumplineBasket'],stone:['yoke','tumplineBasket'],ore:['yoke','sackBack'],wood:['yoke','bundleBack','shoulderLog']},
 brythen:{food:['sackBack','tumplineBasket','yoke'],stone:['stoneFrame','sackBack'],ore:['sackBack','tumplineBasket'],wood:['bundleBack','shoulderLog']},
 rusvolt:{food:['sackBack','yoke','sackBack'],stone:['stoneFrame','sackBack'],ore:['sackBack','yoke'],wood:['shoulderLog','bundleBack']},
 steppan:{food:['sackBack','sackBack','headLoad'],stone:['sackBack','stoneFrame'],ore:['sackBack'],wood:['bundleBack','shoulderLog']},
 skoldar:{food:['sackBack','yoke'],stone:['stoneFrame','stoneFrame','sackBack'],ore:['sackBack','stoneFrame'],wood:['shoulderLog','bundleBack']},
};
const TRADITION_IDS=Object.keys(TRADITION);
/** A society with no entry (a custom skin) takes a stable tradition from its key, so different societies still carry differently. */
const traditionOf=(society:string|undefined)=>society?TRADITION[society]??TRADITION[TRADITION_IDS[(hashSeed(society,'tradition')>>>0)%TRADITION_IDS.length]]:TRADITION.brythen;
export type CarryChoice={style:CarryStyleId;kind:CarryKind;/** 0..1 of capacity */load:number;/** 0..1 weight */mass:number;/** how many separate pieces (logs, stones) at this fill, 1..7 */pieces:number;/** stable 0..1 per unit, for variety inside a style */variety:number};
/** The carry style for one person: pure and stable per (society, cargo, unit id); a fuller load moves wood from a lone shoulder log to a bound bundle. */
export function carryStyleFor(a:{society?:string;kind:CarryKind|string;load:number;seed:number}):CarryChoice{
 const kind=(CARRY_KINDS as readonly string[]).includes(a.kind)?a.kind as CarryKind:'food',load=Math.max(0,Math.min(1,Number.isFinite(a.load)?a.load:0)),mass=carryMass(kind,load);
 const r=seededRandom(hashSeed(a.seed,'carry',kind)),t=traditionOf(a.society),pool=kind==='food'?t.food:kind==='stone'?t.stone:kind==='wood'?t.wood:t.ore;
 let style=pool[Math.floor(r()*pool.length)%pool.length];
 // a heavy timber load is bound into a bundle; a light one is a log or two on the shoulder
 if(kind==='wood'&&style==='shoulderLog'&&load>.62)style=pool.includes('bundleBack')?'bundleBack':'shoulderLog';
 if(kind==='wood'&&style==='bundleBack'&&load<.28&&pool.includes('shoulderLog'))style='shoulderLog';
 return {style,kind,load,mass,pieces:piecesFor(style,load),variety:r()};
}
/** How many logs, poles or stones at a fill. */
export const piecesFor=(style:CarryStyleId,load:number)=>style==='shoulderLog'?1+Math.round(load*2):style==='bundleBack'?3+Math.round(load*3):style==='stoneFrame'?2+Math.round(load*3):1;
/** Geometry is shared between people: fill in quarters and variety in thirds, so a crowd of carriers reuses a handful of meshes (pose still uses the exact mass). */
export function quantizeChoice(c:CarryChoice):CarryChoice{const load=Math.max(.25,Math.min(1,Math.ceil(c.load*4)/4));return {...c,load,pieces:piecesFor(c.style,load),variety:(Math.min(2,Math.floor(c.variety*3))+.5)/3};}

// ---- Pose.
const d=Math.PI/180;
/** Write the style's posture over a sampled carry pose. `ph` is the carry cycle 0..1 (leg left forward at 0); `mass` 0..1. Returns the same pose. */
export function carryPose(pose:Pose,style:CarryStyleId,mass:number,ph:number,amplitude=1):Pose{
 const S=CARRY_STYLES[style],m=Math.max(0,Math.min(1,mass)),sw=Math.cos(ph*Math.PI*2);
 pose.parts.spine[0]=(S.spine[0]+S.spine[1]*m)*d;
 pose.parts.head[0]=(S.head[0]+S.head[1]*m)*d;
 for(const [part,A,sd] of [['armL',S.armL,1],['armR',S.armR,-1]] as const){
  pose.parts[part]=[(A.rx+(A.rxMass??0)*m+(-sd*A.swing*sw)*amplitude)*d*1,(A.ry??0)*d,A.rz*d];
 }
 // step length shrinks with load; the legs keep their feet-under-the-hips adduction
 const k=S.stride[0]-S.stride[1]*m;
 pose.parts.legL[0]*=k;pose.parts.legR[0]*=k;
 pose.parts.hips[1]*=S.hipYaw;pose.parts.spine[1]*=S.spineTwist;
 pose.root[1]*=S.bob;pose.root[0]=Math.sin(ph*Math.PI*2)*S.sway*(.4+.6*m);
 // the swing of the shoulders counters the hips, so the load rocks a little instead of staying frozen
 pose.parts.spine[2]=-Math.sin(ph*Math.PI*2)*.018*(.5+m);
 return pose;
}
