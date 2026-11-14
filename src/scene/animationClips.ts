/** Data-driven animation for real actions: keyframe pose tables per body part, selected from REAL
 * task state and phased by REAL progress. Pure data and maths; no three.js, no clock, no drawing state.
 *
 *  - clip selection (`clipForActivity`) reads the same state names the sim already exposes: Unit.order,
 *    ProductionProject.phase and recipe id (src/game/production.ts), node kind, boat phase, carried load;
 *  - phase comes from progress: seconds of real work done (project.progress), metres actually walked, or
 *    metres rowed; a paused task keeps its progress, so the pose freezes instead of looping on;
 *  - effects (dust, chaff, smoke, steam) come from clip events and are capped by a fixed pool;
 *    fire-born effects (smoke, steam) need a REAL lit fire, so nothing burns on screen that is not burning;
 *  - variation is a phase offset, speed and amplitude jitter per unit id: one shared rig, no unique meshes;
 *  - LOD: far = no animation (neutral pose, no effects), mid = trunk, legs and tool arm only. */
import {hashSeed,seededRandom} from './buildingParts';
import {carryPose,type CarryStyleId} from './carryStyles';

export type Part='hips'|'spine'|'head'|'armL'|'armR'|'legL'|'legR';
export const PARTS:readonly Part[]=['hips','spine','head','armL','armR','legL','legR'];
/** Rotations in radians [rx, ry, rz] per part, plus a root offset in metres [x,y,z]. */
export type Pose={parts:Record<Part,[number,number,number]>;root:[number,number,number];
 /** whole-body rotation about the feet (rx,ry,rz): only the death clips use it */rootRot:[number,number,number];
 /** held-item rotation relative to the TORSO (not the arm), so a spear stays a spear while the arm swings: main hand / off hand */itemR:[number,number,number];itemL:[number,number,number]};
export type ClipId='idle'|'walk'|'carry'|'row'|'fight'|'thresh'|'winnow'|'grind'|'bake'|'tend'|'chop'|'quarry'|'plant'|'harvest'|'craft'|'build'|'haul'|'fish'|'till'|'thrust'|'shoot'|'slash'|'run'|'spin'|'weave'|'scrape'|'knead'|'stir'|'hang';
export type EffectKind='dust'|'chaff'|'smoke'|'steam';
type Deg=Partial<Record<Part|'root'|'rootRot'|'itemR'|'itemL',number[]>>;
type Key={t:number;pose:Deg};
export type Clip={id:ClipId;/** 0..1: how much of the height a planted foot loses to leg splay/angle is taken off the hips (see samplePose); rigid legs, so this is what bends the knees */lock?:number;/** seconds per cycle at jitter 1 (work clips) */period:number;/** metres of travel per cycle (walk, carry, row) */strideMetres?:number;
 keys:Key[];/** events fire when the phase crosses `at` (0..1) */events:{at:number;kind:EffectKind;count:number;needsFire?:boolean;needsDrySurface?:boolean;/** offset from the unit in metres, unit frame */at3:[number,number,number]}[]};
const k=(t:number,pose:Deg):Key=>({t,pose});
const d=Math.PI/180;
/** Both feet planted at once, in a fore-aft stagger. The rig's legs are single rigid bones (no knee joint), so a bent-knee stance is faked the
 * way a rigid leg can: the legs pitch (rx, negative = forward) by the SAME amount in opposite directions, so both feet stay on the ground, and
 * `lock` (see samplePose) drops the hips by exactly the height the planted feet lose. The stance never opens sideways: `s` (the old splay, kept
 * so every call site still reads as "how wide / deep") now only sets a tiny outward toe-out, STANCE_SPLAY_MAX_DEG at most, so feet stay within
 * STANCE_WIDTH_MAX x the hip width (checked in scripts/people-carry.test.mjs). Owner playtest 11-13: splayed legs read as an A-stance. */
export const HIP_WIDTH=.17,STANCE_WIDTH_MAX=1.2,STANCE_SPLAY_MAX_DEG=1.8;
const plant=(xL:number,xR:number,s:number):Deg=>{
 const m=(Math.abs(xL)+Math.abs(xR))/2,front=Math.abs(xL)>=Math.abs(xR)?-1:1,out=Math.min(STANCE_SPLAY_MAX_DEG,s*.08);
 return {legL:[front*m,0,-out],legR:[-front*m,0,out]};
};
/** Feet-under-the-hips adduction in degrees (rz, legL positive = toward the midline): foot centres end up ~0.08 apart (hip joints are 0.17), a natural narrow step width. */
export const GAIT_ADD=5.2,RUN_ADD=4;
const J=(...parts:Deg[]):Deg=>Object.assign({},...parts);
const S2=(a:number,b:number)=>({spine:[a,b,0]});
export const CLIPS:Record<ClipId,Clip>={
 idle:{id:'idle',period:4,events:[],keys:[k(0,{spine:[0,0,0],head:[0,0,0]}),k(.5,{spine:[-1.5,0,0],head:[1,0,0],root:[0,.006,0]}),k(1,{spine:[0,0,0],head:[0,0,0]})]},
 // Walk: hips and shoulders counter-rotate, the planted foot sets the hip height (lock), no flight.
 walk:{id:'walk',period:1,strideMetres:1.6,lock:1,events:[{at:.0,kind:'dust',count:1,needsDrySurface:true,at3:[-.1,0,0]},{at:.5,kind:'dust',count:1,needsDrySurface:true,at3:[.1,0,0]}],keys:[
  k(0,{legL:[26,0,GAIT_ADD],legR:[-26,0,-GAIT_ADD],armL:[-22,0,3],armR:[22,0,-3],hips:[0,-5,0],spine:[2,5,0]}),k(.25,{legL:[0,0,GAIT_ADD],legR:[0,0,-GAIT_ADD],armL:[0,0,0],armR:[0,0,0],hips:[0,0,0],spine:[3,0,0]}),
  k(.5,{legL:[-26,0,GAIT_ADD],legR:[26,0,-GAIT_ADD],armL:[22,0,3],armR:[-22,0,-3],hips:[0,5,0],spine:[2,-5,0]}),k(.75,{legL:[0,0,GAIT_ADD],legR:[0,0,-GAIT_ADD],armL:[0,0,0],armR:[0,0,0],hips:[0,0,0],spine:[3,0,0]}),k(1,{legL:[26,0,GAIT_ADD],legR:[-26,0,-GAIT_ADD],armL:[-22,0,3],armR:[22,0,-3],hips:[0,-5,0],spine:[2,5,0]})]},
 // Run: forward lean, longer stride, high front knee (the forward leg swings further than the trailing one), bent-arm pump, hips/shoulder twist,
 // and a flight phase (root rises twice a cycle while both feet are off the ground). Phase from distance like the walk; blended by speed (see gaitBlend).
 run:{id:'run',period:1,strideMetres:2.6,lock:1,events:[{at:.0,kind:'dust',count:1,needsDrySurface:true,at3:[-.1,0,0]},{at:.5,kind:'dust',count:1,needsDrySurface:true,at3:[.1,0,0]}],keys:[
  k(0,{legL:[-42,0,RUN_ADD],legR:[34,0,-RUN_ADD],armR:[-64,0,-12],armL:[42,0,10],hips:[0,-9,0],spine:[14,9,0],head:[-9,0,0],root:[0,0,0]}),
  k(.25,{legL:[18,0,RUN_ADD],legR:[-68,0,-RUN_ADD],armR:[-14,0,-10],armL:[-14,0,10],hips:[0,0,0],spine:[15,0,0],head:[-9,0,0],root:[0,.12,.02]}),
  k(.5,{legL:[34,0,RUN_ADD],legR:[-42,0,-RUN_ADD],armL:[-64,0,12],armR:[42,0,-10],hips:[0,9,0],spine:[14,-9,0],head:[-9,0,0],root:[0,0,0]}),
  k(.75,{legL:[-68,0,RUN_ADD],legR:[18,0,-RUN_ADD],armR:[-14,0,-10],armL:[-14,0,10],hips:[0,0,0],spine:[15,0,0],head:[-9,0,0],root:[0,.12,.02]}),
  k(1,{legL:[-42,0,RUN_ADD],legR:[34,0,-RUN_ADD],armR:[-64,0,-12],armL:[42,0,10],hips:[0,-9,0],spine:[14,9,0],head:[-9,0,0],root:[0,0,0]})]},
 carry:{id:'carry',period:1,strideMetres:1.1,lock:1,events:[{at:0,kind:'dust',count:1,needsDrySurface:true,at3:[-.1,0,0]},{at:.5,kind:'dust',count:1,needsDrySurface:true,at3:[.1,0,0]}],keys:[
  k(0,{legL:[20,0,GAIT_ADD],legR:[-20,0,-GAIT_ADD],armL:[-55,0,8],armR:[-55,0,-8],spine:[4,0,0],root:[0,0,0]}),k(.25,{legL:[0,0,GAIT_ADD],legR:[0,0,-GAIT_ADD],armL:[-58,0,8],armR:[-58,0,-8],spine:[5,0,0],root:[0,.02,0]}),
  k(.5,{legL:[-20,0,GAIT_ADD],legR:[20,0,-GAIT_ADD],armL:[-55,0,8],armR:[-55,0,-8],spine:[4,0,0],root:[0,0,0]}),k(.75,{legL:[0,0,GAIT_ADD],legR:[0,0,-GAIT_ADD],armL:[-58,0,8],armR:[-58,0,-8],spine:[5,0,0],root:[0,.02,0]}),k(1,{legL:[20,0,GAIT_ADD],legR:[-20,0,-GAIT_ADD],armL:[-55,0,8],armR:[-55,0,-8],spine:[4,0,0],root:[0,0,0]})]},
 row:{id:'row',period:2.4,strideMetres:2.6,events:[],keys:[
  k(0,{spine:[-14,0,0],armL:[-80,0,10],armR:[-80,0,-10],legL:[-40,0,0],legR:[-40,0,0],root:[0,0,.02]}),k(.45,{spine:[16,0,0],armL:[-20,0,25],armR:[-20,0,-25],legL:[-40,0,0],legR:[-40,0,0],root:[0,0,-.04]}),
  k(.6,{spine:[17,0,0],armL:[-10,0,30],armR:[-10,0,-30],legL:[-40,0,0],legR:[-40,0,0],root:[0,0,-.04]}),k(1,{spine:[-14,0,0],armL:[-80,0,10],armR:[-80,0,-10],legL:[-40,0,0],legR:[-40,0,0],root:[0,0,.02]})]},
 fight:{id:'fight',period:1.1,lock:1,events:[{at:.4,kind:'dust',count:2,needsDrySurface:true,at3:[0,0,.3]}],keys:[
  k(0,J(S2(2,-10),{armR:[-120,0,-10],armL:[-30,0,20],root:[0,0,0]},plant(-16,14,14))),k(.4,J(S2(12,12),{armR:[40,0,-5],armL:[-50,0,20],root:[0,0,.12]},plant(-28,22,16))),
  k(.7,J(S2(6,0),{armR:[-20,0,-10],armL:[-30,0,20],root:[0,0,.04]},plant(-12,12,14))),k(1,J(S2(2,-10),{armR:[-120,0,-10],armL:[-30,0,20],root:[0,0,0]},plant(-16,14,14)))]},
 thresh:{id:'thresh',period:1.3,lock:1,events:[{at:.45,kind:'chaff',count:3,at3:[0,0,.5]},{at:.45,kind:'dust',count:1,needsDrySurface:true,at3:[0,0,.5]}],keys:[
  k(0,J(S2(-6,0),{armL:[-150,0,0],armR:[-150,0,0],head:[2,0,0],root:[0,0,0]},plant(-6,10,12))),k(.45,J(S2(14,0),{armL:[-30,0,0],armR:[-30,0,0],head:[-6,0,0],root:[0,0,.08]},plant(-30,18,14))),
  k(.7,J(S2(8,0),{armL:[-70,0,0],armR:[-70,0,0],root:[0,0,.03]},plant(-14,10,12))),k(1,J(S2(-6,0),{armL:[-150,0,0],armR:[-150,0,0],head:[2,0,0],root:[0,0,0]},plant(-6,10,12)))]},
 winnow:{id:'winnow',period:1.8,lock:1,events:[{at:.5,kind:'chaff',count:6,at3:[0,.9,.5]}],keys:[
  k(0,J(S2(6,0),{armL:[-30,0,25],armR:[-30,0,-25],head:[4,0,0]},plant(-8,8,12))),k(.35,J(S2(-4,0),{armL:[-95,0,15],armR:[-95,0,-15],head:[-6,0,0]},plant(-6,6,10))),
  k(.6,J(S2(-2,0),{armL:[-80,0,10],armR:[-80,0,-10]},plant(-6,6,10))),k(1,J(S2(6,0),{armL:[-30,0,25],armR:[-30,0,-25],head:[4,0,0]},plant(-8,8,12)))]},
 grind:{id:'grind',period:1.6,lock:1,events:[{at:.5,kind:'dust',count:1,at3:[0,.5,.4]}],keys:[
  k(0,J(S2(12,0),{armL:[-55,0,0],armR:[-55,0,0],head:[2,0,0],root:[0,0,.05]},plant(-24,18,12))),k(.5,J(S2(16,0),{armL:[-20,0,0],armR:[-20,0,0],head:[0,0,0],root:[0,0,.12]},plant(-30,22,14))),k(1,J(S2(12,0),{armL:[-55,0,0],armR:[-55,0,0],head:[2,0,0],root:[0,0,.05]},plant(-24,18,12)))]},
 bake:{id:'bake',period:2.2,lock:1,events:[{at:.5,kind:'steam',count:1,needsFire:true,at3:[0,.9,.6]}],keys:[
  k(0,J(S2(8,0),{armL:[-60,0,12],armR:[-60,0,-12],head:[6,0,0]},plant(-8,8,10))),k(.5,J(S2(14,0),{armL:[-35,0,6],armR:[-35,0,-6],head:[8,0,0],root:[0,0,.04]},plant(-12,8,10))),k(1,J(S2(8,0),{armL:[-60,0,12],armR:[-60,0,-12],head:[6,0,0]},plant(-8,8,10)))]},
 // Tending a fire: a shallow stagger, torso mostly upright, head up toward the flame.
 tend:{id:'tend',period:3,lock:1,events:[{at:.3,kind:'smoke',count:1,needsFire:true,at3:[0,.6,.6]},{at:.8,kind:'smoke',count:1,needsFire:true,at3:[0,.6,.6]}],keys:[
  k(0,J(S2(14,0),{armR:[-50,0,0],armL:[-20,0,0],head:[-6,0,0],root:[0,0,.06]},plant(-24,-24,32))),k(.4,J(S2(17,0),{armR:[-25,0,-10],armL:[-20,0,0],head:[-9,0,0],root:[0,0,.08]},plant(-26,-26,36))),k(1,J(S2(14,0),{armR:[-50,0,0],armL:[-20,0,0],head:[-6,0,0],root:[0,0,.06]},plant(-22,-22,32)))]},
 // Chop: weight goes from the back foot to the front foot as the shoulders and arms bring the axe down; the spine stays within ~14 degrees.
 chop:{id:'chop',period:1.5,lock:1,events:[{at:.4,kind:'dust',count:1,needsDrySurface:true,at3:[0,0,.6]}],keys:[
  k(0,J(S2(-6,-14),{hips:[0,8,0],head:[2,0,0],armR:[-168,0,-10],armL:[-150,0,10],root:[0,0,-.04],itemR:[-30,0,0]},plant(-8,14,12))),
  k(.4,J(S2(14,10),{hips:[0,-8,0],head:[-6,0,0],armR:[-38,0,-5],armL:[-30,0,6],root:[0,0,.12],itemR:[125,0,0]},plant(-30,16,14))),
  k(.7,J(S2(8,0),{hips:[0,-2,0],head:[-2,0,0],armR:[-60,0,0],armL:[-52,0,0],root:[0,0,.05],itemR:[60,0,0]},plant(-18,14,12))),
  k(1,J(S2(-6,-14),{hips:[0,8,0],head:[2,0,0],armR:[-168,0,-10],armL:[-150,0,10],root:[0,0,-.04],itemR:[-30,0,0]},plant(-8,14,12)))]},
 quarry:{id:'quarry',period:1.7,lock:1,events:[{at:.4,kind:'dust',count:2,at3:[0,.1,.6]}],keys:[
  k(0,J(S2(-4,-12),{hips:[0,6,0],head:[2,0,0],armR:[-140,0,-8],armL:[-100,0,8],root:[0,0,-.03],itemR:[-20,0,0]},plant(-10,14,14))),
  k(.4,J(S2(12,8),{hips:[0,-6,0],head:[-6,0,0],armR:[-24,0,-4],armL:[-18,0,4],root:[0,0,.1],itemR:[115,0,0]},plant(-28,16,16))),
  k(1,J(S2(-4,-12),{hips:[0,6,0],head:[2,0,0],armR:[-140,0,-8],armL:[-100,0,8],root:[0,0,-.03],itemR:[-20,0,0]},plant(-10,14,14)))]},
 // Forage and farm-gather clips: the only deep stances. A shallow fore-aft stagger (legs pitched about +-24 degrees, never splayed sideways), hips drop ~0.12, torso ~16 degrees, head held up.
 plant:{id:'plant',period:2.4,lock:1,events:[],keys:[
  k(0,J(S2(6,0),{armR:[-20,0,0],armL:[-8,0,0],head:[-2,0,0]},plant(-8,-8,10))),
  k(.35,J(S2(16,0),{armR:[-30,0,-6],armL:[-20,0,6],head:[-12,0,0],root:[0,0,.06]},plant(-24,-24,38))),
  k(.7,J(S2(18,0),{armR:[-38,0,-6],armL:[-22,0,6],head:[-12,0,0],root:[0,0,.06]},plant(-24,-24,38))),
  k(1,J(S2(6,0),{armR:[-20,0,0],armL:[-8,0,0],head:[-2,0,0]},plant(-8,-8,10)))]},
 harvest:{id:'harvest',period:1.8,lock:1,events:[{at:.5,kind:'chaff',count:1,at3:[0,.3,.4]}],keys:[
  k(0,J(S2(6,0),{armR:[-50,0,0],armL:[-30,0,0],head:[-4,0,0]},plant(-14,-14,26))),
  k(.4,J(S2(16,0),{armR:[-24,0,-4],armL:[-14,0,4],head:[-12,0,0],root:[0,0,.06]},plant(-24,-24,38))),
  k(.7,J(S2(10,0),{armR:[-45,0,0],armL:[-24,0,0],head:[-8,0,0]},plant(-20,-20,32))),
  k(1,J(S2(6,0),{armR:[-50,0,0],armL:[-30,0,0],head:[-4,0,0]},plant(-14,-14,26)))]},
 craft:{id:'craft',period:2.6,lock:1,events:[],keys:[k(0,J(S2(6,0),{armL:[-60,0,10],armR:[-60,0,-10],head:[12,0,0]},plant(-4,4,8))),k(.5,J(S2(8,0),{armL:[-48,0,6],armR:[-72,0,-6],head:[14,0,0]},plant(-4,4,8))),k(1,J(S2(6,0),{armL:[-60,0,10],armR:[-60,0,-10],head:[12,0,0]},plant(-4,4,8)))]},
 // ---- Job and weapon clips (ASTRA-12). Loop seamlessly; `itemR`/`itemL` are torso-relative item angles.
 build:{id:'build',period:1.8,lock:1,events:[{at:.4,kind:'dust',count:1,needsDrySurface:true,at3:[0,.1,.5]}],keys:[
  k(0,J(S2(4,-8),{hips:[0,6,0],head:[2,0,0],armR:[-100,0,-8],armL:[-50,0,10],itemR:[-20,0,0]},plant(-12,12,12))),
  k(.4,J(S2(12,6),{hips:[0,-5,0],head:[-2,0,0],armR:[-30,0,-5],armL:[-46,0,10],root:[0,0,.06],itemR:[70,0,0]},plant(-24,18,14))),
  k(.7,J(S2(8,0),{head:[0,0,0],armR:[-55,0,-6],armL:[-48,0,10],itemR:[20,0,0]},plant(-18,14,14))),
  k(1,J(S2(4,-8),{hips:[0,6,0],head:[2,0,0],armR:[-100,0,-8],armL:[-50,0,10],itemR:[-20,0,0]},plant(-12,12,12)))]},
 haul:{id:'haul',period:1,strideMetres:1.0,lock:1,events:[{at:0,kind:'dust',count:1,needsDrySurface:true,at3:[-.1,0,0]},{at:.5,kind:'dust',count:1,needsDrySurface:true,at3:[.1,0,0]}],keys:[
  k(0,{legL:[24,0,GAIT_ADD],legR:[-24,0,-GAIT_ADD],armL:[-38,0,8],armR:[-38,0,-8],spine:[12,0,0],head:[-6,0,0],root:[0,0,.03]}),k(.25,{legL:[0,0,GAIT_ADD],legR:[0,0,-GAIT_ADD],armL:[-40,0,8],armR:[-40,0,-8],spine:[13,0,0],head:[-6,0,0],root:[0,.015,.03]}),
  k(.5,{legL:[-24,0,GAIT_ADD],legR:[24,0,-GAIT_ADD],armL:[-38,0,8],armR:[-38,0,-8],spine:[12,0,0],head:[-6,0,0],root:[0,0,.03]}),k(.75,{legL:[0,0,GAIT_ADD],legR:[0,0,-GAIT_ADD],armL:[-40,0,8],armR:[-40,0,-8],spine:[13,0,0],head:[-6,0,0],root:[0,.015,.03]}),k(1,{legL:[24,0,GAIT_ADD],legR:[-24,0,-GAIT_ADD],armL:[-38,0,8],armR:[-38,0,-8],spine:[12,0,0],head:[-6,0,0],root:[0,0,.03]})]},
 fish:{id:'fish',period:3.2,lock:1,events:[],keys:[
  k(0,J(S2(2,0),{armR:[-35,0,-10],armL:[-25,0,8],head:[4,0,0],itemR:[40,0,0]},plant(-6,6,10))),
  k(.3,J(S2(-8,0),{armR:[-150,0,-8],armL:[-40,0,8],head:[-2,0,0],itemR:[110,0,0]},plant(-4,10,10))),
  k(.5,J(S2(8,0),{armR:[-40,0,-8],armL:[-30,0,8],head:[4,0,0],root:[0,0,.04],itemR:[20,0,0]},plant(-14,8,10))),
  k(1,J(S2(2,0),{armR:[-35,0,-10],armL:[-25,0,8],head:[4,0,0],itemR:[40,0,0]},plant(-6,6,10)))]},
 // Trade clips: each family of paid work reads differently at a glance. Stance stays a shallow stagger; the arms and head do the work.
 // Spin / twist: the left hand holds the fibre at the chest, the right draws it out to the side and back.
 spin:{id:'spin',period:1.4,lock:1,events:[],keys:[
  k(0,J(S2(8,0),{armL:[-85,0,12],armR:[-45,0,-12],head:[9,0,0]},plant(-6,6,8))),k(.5,J(S2(10,0),{armL:[-85,0,12],armR:[-75,0,-58],head:[9,0,0]},plant(-6,6,8))),k(1,J(S2(8,0),{armL:[-85,0,12],armR:[-45,0,-12],head:[9,0,0]},plant(-6,6,8)))]},
 // Weave / felt / sew: both hands low and busy, alternating a pass left to right, head bent to the work.
 weave:{id:'weave',period:1.3,lock:1,events:[],keys:[
  k(0,J(S2(10,4),{armL:[-70,0,8],armR:[-40,0,-8],head:[9,0,0]},plant(-5,5,8))),k(.5,J(S2(10,-4),{armL:[-40,0,8],armR:[-70,0,-8],head:[9,0,0]},plant(-5,5,8))),k(1,J(S2(10,4),{armL:[-70,0,8],armR:[-40,0,-8],head:[9,0,0]},plant(-5,5,8)))]},
 // Scrape / flesh / wash: a long two-handed push away and pull back, weight carried over the front foot.
 scrape:{id:'scrape',period:1.5,lock:1,events:[{at:.5,kind:'dust',count:1,needsDrySurface:true,at3:[0,.1,.6]}],keys:[
  k(0,J(S2(11,0),{armL:[-60,0,6],armR:[-60,0,-6],head:[8,0,0],root:[0,0,.02]},plant(-14,14,10))),k(.5,J(S2(11,0),{armL:[-105,0,6],armR:[-105,0,-6],head:[9,0,0],root:[0,0,.1]},plant(-20,20,12))),k(1,J(S2(11,0),{armL:[-60,0,6],armR:[-60,0,-6],head:[8,0,0],root:[0,0,.02]},plant(-14,14,10)))]},
 // Knead / form clay: both hands press down and fold, back bent over the work.
 knead:{id:'knead',period:1.6,lock:1,events:[],keys:[
  k(0,J(S2(11,0),{armL:[-70,0,10],armR:[-70,0,-10],head:[9,0,0],root:[0,0,.04]},plant(-12,12,10))),k(.35,J(S2(11,0),{armL:[-100,0,4],armR:[-100,0,-4],head:[9,0,0],root:[0,0,.08]},plant(-14,14,10))),k(.7,J(S2(11,0),{armL:[-80,0,14],armR:[-80,0,-14],head:[9,0,0],root:[0,0,.05]},plant(-12,12,10))),k(1,J(S2(11,0),{armL:[-70,0,10],armR:[-70,0,-10],head:[9,0,0],root:[0,0,.04]},plant(-12,12,10)))]},
 // Stir / brew / strain: the left hand steadies the vessel, the right circles a paddle.
 stir:{id:'stir',period:1.6,lock:1,events:[{at:.5,kind:'steam',count:1,needsFire:true,at3:[0,.9,.5]}],keys:[
  k(0,J(S2(10,0),{armL:[-60,0,12],armR:[-80,0,-18],head:[9,0,0]},plant(-8,8,8))),k(.25,J(S2(10,3),{armL:[-60,0,12],armR:[-65,0,8],head:[9,0,0]},plant(-8,8,8))),k(.5,J(S2(10,0),{armL:[-60,0,12],armR:[-50,0,22],head:[9,0,0]},plant(-8,8,8))),k(.75,J(S2(10,-3),{armL:[-60,0,12],armR:[-65,0,6],head:[9,0,0]},plant(-8,8,8))),k(1,J(S2(10,0),{armL:[-60,0,12],armR:[-80,0,-18],head:[9,0,0]},plant(-8,8,8)))]},
 // Hang / rack: reach up, lay the item over the rack, lower the hands, again.
 hang:{id:'hang',period:2.4,lock:1,events:[],keys:[
  k(0,J(S2(4,0),{armL:[-60,0,10],armR:[-60,0,-10],head:[4,0,0]},plant(-6,6,8))),k(.45,J(S2(-6,0),{armL:[-150,0,12],armR:[-150,0,-12],head:[-8,0,0]},plant(-6,6,8))),k(.65,J(S2(-4,0),{armL:[-135,0,14],armR:[-135,0,-14],head:[-6,0,0]},plant(-6,6,8))),k(1,J(S2(4,0),{armL:[-60,0,10],armR:[-60,0,-10],head:[4,0,0]},plant(-6,6,8)))]},
 // Dig/till: wide lunge, torso ~18 degrees at the bite, hoe pulled back with the arms.
 till:{id:'till',period:2,lock:1,events:[{at:.45,kind:'dust',count:1,needsDrySurface:true,at3:[0,.05,.6]}],keys:[
  k(0,J(S2(8,-8),{hips:[0,6,0],head:[0,0,0],armR:[-110,0,-6],armL:[-92,0,6],root:[0,0,-.02],itemR:[-10,0,0]},plant(-12,16,18))),
  k(.45,J(S2(18,6),{hips:[0,-6,0],head:[-6,0,0],armR:[-18,0,-4],armL:[-8,0,4],root:[0,0,.1],itemR:[80,0,0]},plant(-34,18,20))),
  k(.75,J(S2(14,0),{head:[-4,0,0],armR:[-40,0,-4],armL:[-34,0,4],root:[0,0,.05],itemR:[50,0,0]},plant(-26,18,20))),
  k(1,J(S2(8,-8),{hips:[0,6,0],head:[0,0,0],armR:[-110,0,-6],armL:[-92,0,6],root:[0,0,-.02],itemR:[-10,0,0]},plant(-12,16,18)))]},
 thrust:{id:'thrust',period:1.1,lock:1,events:[{at:.45,kind:'dust',count:1,needsDrySurface:true,at3:[0,0,.4]}],keys:[
  k(0,J(S2(0,-18),{armR:[-55,0,-10],armL:[-40,0,15],itemR:[30,0,0]},plant(-14,14,14))),k(.3,J(S2(-4,-26),{armR:[-30,0,-12],armL:[-45,0,15],root:[0,0,-.03],itemR:[55,0,0]},plant(-8,16,16))),
  k(.45,J(S2(10,8),{armR:[-92,0,-4],armL:[-72,0,10],root:[0,0,.14],itemR:[84,0,0]},plant(-30,26,18))),k(.75,J(S2(4,-6),{armR:[-60,0,-8],armL:[-45,0,12],root:[0,0,.04],itemR:[45,0,0]},plant(-10,10,14))),
  k(1,J(S2(0,-18),{armR:[-55,0,-10],armL:[-40,0,15],itemR:[30,0,0]},plant(-14,14,14)))]},
 shoot:{id:'shoot',period:2,lock:1,events:[],keys:[
  k(0,J(S2(0,-34),{armL:[-86,0,6],armR:[-60,0,-30],head:[0,24,0],itemL:[0,0,0]},plant(10,-10,16))),k(.55,J(S2(0,-38),{armL:[-88,0,6],armR:[-30,0,-62],head:[0,26,0],itemL:[0,0,0]},plant(10,-10,16))),
  k(.62,J(S2(0,-30),{armL:[-84,0,6],armR:[-58,0,-24],head:[0,22,0],root:[0,0,-.02],itemL:[0,0,0]},plant(10,-10,16))),k(1,J(S2(0,-34),{armL:[-86,0,6],armR:[-60,0,-30],head:[0,24,0],itemL:[0,0,0]},plant(10,-10,16)))]},
 slash:{id:'slash',period:1,lock:1,events:[{at:.4,kind:'dust',count:1,needsDrySurface:true,at3:[0,0,.4]}],keys:[
  k(0,J(S2(-2,-14),{armR:[-150,0,-20],armL:[-30,0,22],itemR:[160,0,0]},plant(-10,14,14))),k(.38,J(S2(12,16),{armR:[-20,0,10],armL:[-45,0,20],root:[0,0,.12],itemR:[20,0,0]},plant(-28,24,16))),
  k(.7,J(S2(6,2),{armR:[-50,0,0],armL:[-30,0,20],root:[0,0,.04],itemR:[60,0,0]},plant(-10,10,14))),k(1,J(S2(-2,-14),{armR:[-150,0,-20],armL:[-30,0,22],itemR:[160,0,0]},plant(-10,14,14)))]},
};

// ---- Selecting a clip from real state.
export type Activity={order?:string;/** ProductionProject.phase of the unit's live project, if any */productionPhase?:string;/** ProductionProject.recipe */recipe?:string;
 /** node kind being worked ('tree','rock','berries','field'...) when order==='gather' */nodeKind?:string;/** Unit.boat?.phase==='aboard' while the boat moves */rowing?:boolean;
 inRange?:boolean;moving?:boolean;/** what the unit actually wields (its real type), picks the fight clip */weapon?:'spear'|'bow'|'blade';
 /** u.node is a fish node while gathering */fishing?:boolean;/** field task read from the real crop: 'till' (soil or tending), 'plant', 'harvest' */fieldAction?:'plant'|'harvest'|'till';
 /** pulling a sled or cart (Unit.haulage) */hauling?:boolean;/** carried amount over capacity (Unit.carry / carryingCapacity) or held items over capacity */load?:number;warming?:boolean;fireLit?:boolean};
const RECIPE_CLIP:[RegExp,ClipId][]=[[/^thresh/,'thresh'],[/^winnow/,'winnow'],[/^grind/,'grind'],[/^bake/,'bake'],[/^(spin|twistCordage|authorCordage|studyCordage)/,'spin'],[/^(weave|felt|sew)/,'weave'],[/^(fleshHide|tanHide|extractTannin|washWool)/,'scrape'],[/^formClay/,'knead'],[/^(cookPorridge|brew|sproutGrain|strainCulturedCurd|fermentMilk)/,'stir'],[/^(airDry|dryClay|drySkin)/,'hang'],[/^consolidate/,'build'],[/^(cook|manualSmoke|smoke|fireClay|ferment|smelt|makeCharcoal)/,'tend']];
export function clipForActivity(a:Activity):{clip:ClipId;load:number;reason:string}{
 const load=Math.max(0,Math.min(1,Number.isFinite(a.load)?a.load!:0));
 if(a.rowing)return {clip:'row',load:0,reason:'aboard a moving boat'};
 if(a.order==='attack'||a.order==='attackmove')return a.inRange?{clip:a.weapon==='spear'?'thrust':a.weapon==='bow'?'shoot':a.weapon==='blade'?'slash':'fight',load:0,reason:'target in reach'}:{clip:'walk',load:0,reason:'closing on target'};
 const ph=a.productionPhase;
 if(ph==='working'&&a.recipe){const hit=RECIPE_CLIP.find(([re])=>re.test(a.recipe!));return {clip:hit?hit[1]:'craft',load:0,reason:'working '+a.recipe};}
 if(ph==='curing'||ph==='paused')return {clip:'idle',load:0,reason:ph==='paused'?'work paused':'waiting while the batch cures'};
 if(ph==='carrying'||ph==='collecting'||ph==='returning'||ph==='unloading')return {clip:load>0?'carry':a.moving===false?'idle':'walk',load,reason:'moving a batch'};
 if(a.warming)return {clip:a.moving?'walk':'tend',load:0,reason:'warming at a fire'};
 if(a.hauling&&a.moving!==false)return {clip:'haul',load,reason:'pulling a sled or cart'};
 if(a.order==='gather'&&a.moving===false){
  if(a.fieldAction)return {clip:a.fieldAction,load:0,reason:'field work'};
  if(a.fishing)return {clip:'fish',load:0,reason:'fishing'};
  const n=a.nodeKind||'';return {clip:/tree|wood/.test(n)?'chop':/fish/.test(n)?'fish':/rock|stone|ore|copper|iron/.test(n)?'quarry':/field|crop|berr|plant|bush/.test(n)?'harvest':'harvest',load:0,reason:'gathering '+n};}
 if(a.order==='build'&&a.moving===false)return {clip:'build',load:0,reason:'building'};
 if(a.moving===false||a.order==='idle'||a.order==='hold')return {clip:'idle',load:0,reason:'standing'};
 return {clip:load>0?'carry':'walk',load,reason:load>0?'carrying a load':'walking'};
}

// ---- Phase from progress.
export type Variation={phaseOffset:number;speed:number;amplitude:number};
export function unitVariation(seed:number):Variation{const r=seededRandom(hashSeed(seed,'anim'));return {phaseOffset:r(),speed:.92+r()*.16,amplitude:.95+r()*.1};}
export type Progress={/** seconds of real work done (ProductionProject.progress), for work clips */workSeconds?:number;/** metres actually moved, for walk, carry and row */distanceMetres?:number;/** seconds of simulated time, for idle only */timeSeconds?:number};
export function phaseFor(clip:Clip,p:Progress,v:Variation,load=0):number{
 const gait=gaitFor(load);
 const raw=clip.strideMetres?(p.distanceMetres??0)/(clip.strideMetres*(clip.id==='carry'?gait.strideScale:1)):clip.id==='idle'?(p.timeSeconds??0)/clip.period:(p.workSeconds??0)/clip.period*v.speed;
 const ph=raw+v.phaseOffset;return ph-Math.floor(ph);
}
/** Load-dependent gait: loaded walkers take shorter, slower, bouncier steps and lean into the load. */
export function gaitFor(load:number){const l=Math.max(0,Math.min(1,load));return {strideScale:1-.3*l,bobScale:1+.8*l,leanDeg:14*l,armsHold:l>0,speedHint:1-.25*l};}

// ---- Sampling.
const rad=(v:number[]|undefined):[number,number,number]=>[(v?.[0]??0)*d,(v?.[1]??0)*d,(v?.[2]??0)*d];
const smooth=(t:number)=>t*t*(3-2*t);
function blank():Pose{return {parts:{hips:[0,0,0],spine:[0,0,0],head:[0,0,0],armL:[0,0,0],armR:[0,0,0],legL:[0,0,0],legR:[0,0,0]},root:[0,0,0],rootRot:[0,0,0],itemR:[0,0,0],itemL:[0,0,0]};}
export const NEUTRAL_POSE:Pose=blank();
/** `style` is the carry style of a loaded walker (carryStyles.ts): it replaces the generic box-in-front carry posture. */
export function samplePose(clip:Clip,phase:number,v:Variation={phaseOffset:0,speed:1,amplitude:1},load=0,style?:{id:CarryStyleId;mass:number}):Pose{
 const ph=phase-Math.floor(phase),ks=clip.keys;let i=0;while(i<ks.length-2&&ph>=ks[i+1].t)i++;
 const a=ks[i],b=ks[i+1],t=smooth(Math.max(0,Math.min(1,(ph-a.t)/Math.max(1e-6,b.t-a.t)))),out=blank(),g=gaitFor(load);
 const lerp=(x:number,y:number)=>x+(y-x)*t;
 for(const p of PARTS){const A=rad(a.pose[p]),B=rad(b.pose[p]);out.parts[p]=[lerp(A[0],B[0])*v.amplitude,lerp(A[1],B[1])*v.amplitude,lerp(A[2],B[2])*v.amplitude];}
 for(let c=0;c<3;c++)out.root[c]=lerp((a.pose.root?.[c]??0),(b.pose.root?.[c]??0))*v.amplitude;
 for(const x of['itemR','itemL','rootRot'] as const){const A=rad(a.pose[x]),B=rad(b.pose[x]);out[x]=[lerp(A[0],B[0]),lerp(A[1],B[1]),lerp(A[2],B[2])];}
 if(clip.id==='carry'){
  if(style)carryPose(out,style.id,style.mass,ph,v.amplitude);
  else{for(const p of['legL','legR'] as Part[])out.parts[p][0]*=g.strideScale;out.root[1]*=g.bobScale;out.parts.spine[0]+=g.leanDeg*d;}
 }
 if(clip.lock){const lo=Math.min(legRaise(out.parts.legL),legRaise(out.parts.legR));if(lo>0)out.root[1]-=lo*clip.lock;}
 return out;
}
/** How far a rigid leg's foot rises above the ground when the leg is rotated (rx forward/back, rz splay); leg length .5. */
export const LEG_LENGTH=.5;
const legRaise=(r:readonly number[])=>LEG_LENGTH*(1-Math.cos(r[0])*Math.cos(r[2]));
/** Walk-to-run by real speed (metres/s of actual movement; sim workers cover ~4-6 on open ground, loaded or climbing walkers less). 0 = walk, 1 = run. */
export const GAIT_SPEEDS={walkBelow:3.4,runAbove:5.0} as const;
export const gaitBlend=(speed:number)=>{const t=Math.max(0,Math.min(1,(speed-GAIT_SPEEDS.walkBelow)/(GAIT_SPEEDS.runAbove-GAIT_SPEEDS.walkBelow)));return t*t*(3-2*t);};
/** Metres per cycle while blending walk to run, so the phase advance (and therefore the feet) stays continuous with speed. */
export const gaitStride=(b:number)=>CLIPS.walk.strideMetres!+(CLIPS.run.strideMetres!-CLIPS.walk.strideMetres!)*b;
/** Linear blend of two poses (a at 0, b at 1). Allocates one Pose. */
export function blendPoses(a:Pose,b:Pose,t:number):Pose{
 const o=blank(),m=(x:number,y:number)=>x+(y-x)*t,v3=(x:readonly number[],y:readonly number[]):[number,number,number]=>[m(x[0],y[0]),m(x[1],y[1]),m(x[2],y[2])];
 for(const p of PARTS)o.parts[p]=v3(a.parts[p],b.parts[p]);o.root=v3(a.root,b.root);o.rootRot=v3(a.rootRot,b.rootRot);o.itemR=v3(a.itemR,b.itemR);o.itemL=v3(a.itemL,b.itemL);return o;
}
export type AnimTier=0|1|2;
/** Distance rule: near full, mid reduced, far none. */
export const ANIMATION_DISTANCES_METRES={near:35,mid:70} as const;
export const animationTier=(distance:number):AnimTier=>distance<ANIMATION_DISTANCES_METRES.near?0:distance<ANIMATION_DISTANCES_METRES.mid?1:2;
export function poseAtTier(p:Pose,tier:AnimTier):Pose{
 if(tier===0)return p;if(tier===2){const f=blank();f.rootRot=[...p.rootRot];f.root=[0,p.rootRot.some(Math.abs)?p.root[1]:0,0];return f;}
 const o=blank();for(const part of['spine','armR','legL','legR'] as Part[])o.parts[part]=[...p.parts[part]];o.root=[0,p.root[1],0];o.rootRot=[...p.rootRot];o.itemR=[...p.itemR];return o;
}

// ---- One-shot death clips (ASTRA-12). Not in CLIPS: they do not loop, and they end lying down.
export type DeathClipId='fallBack'|'fallForward'|'fallLeft'|'fallRight';
export const DEATH_SECONDS=1.25;
const dk=k;
const sprawl=(rx:number,rz:number,armL:number[],armR:number[],legL:number[],legR:number[],head:number[],y:number,z:number):Deg=>({rootRot:[rx,0,rz],root:[0,y+.1,z],armL,armR,legL,legR,head,spine:[0,0,0]});
export const DEATH_CLIPS:Record<DeathClipId,Clip>={
 fallBack:{id:'idle',period:DEATH_SECONDS,events:[{at:.7,kind:'dust',count:3,needsDrySurface:true,at3:[0,0,-.5]}],keys:[dk(0,{}),dk(.12,{spine:[-12,0,0],head:[-16,0,0],armL:[-40,0,20],armR:[-60,0,-20]}),
  dk(.4,{rootRot:[-36,0,0],root:[0,-.04,-.04],spine:[-10,0,0],head:[-22,0,0],armL:[-72,0,30],armR:[-82,0,-30],legL:[18,0,0],legR:[-6,0,0]}),
  dk(.72,sprawl(-90,0,[-30,0,42],[-40,0,-46],[10,0,6],[-6,0,-8],[-14,0,8],.1,-.1)),dk(.86,sprawl(-80,0,[-18,0,46],[-30,0,-50],[8,0,8],[-8,0,-10],[-10,0,8],.1,-.08)),dk(1,sprawl(-88,0,[-10,0,48],[-24,0,-52],[6,0,9],[-8,0,-11],[-8,0,7],.09,-.06))]},
 fallForward:{id:'idle',period:DEATH_SECONDS,events:[{at:.7,kind:'dust',count:3,needsDrySurface:true,at3:[0,0,.5]}],keys:[dk(0,{}),dk(.12,{spine:[18,0,0],head:[12,0,0],armL:[-30,0,18],armR:[-26,0,-18]}),
  dk(.45,{rootRot:[36,0,0],root:[0,-.1,.04],spine:[16,0,0],head:[10,0,0],armL:[-80,0,20],armR:[-88,0,-20],legL:[-26,0,0],legR:[-38,0,0]}),
  dk(.74,sprawl(90,0,[-150,0,22],[-158,0,-22],[-6,0,6],[8,0,-6],[20,0,10],.1,.1)),dk(.88,sprawl(82,0,[-140,0,26],[-150,0,-26],[-4,0,7],[6,0,-7],[16,0,10],.1,.08)),dk(1,sprawl(88,0,[-146,0,24],[-154,0,-24],[-5,0,7],[7,0,-7],[18,0,10],.09,.06))]},
 fallLeft:{id:'idle',period:DEATH_SECONDS,events:[{at:.7,kind:'dust',count:2,needsDrySurface:true,at3:[.4,0,0]}],keys:[dk(0,{}),dk(.14,{spine:[0,0,10],head:[0,0,14],armL:[-30,0,30],armR:[-40,0,-10]}),
  dk(.45,{rootRot:[0,0,34],root:[0,-.06,0],spine:[0,0,12],head:[0,0,16],armL:[-50,0,60],armR:[-60,0,-30],legL:[10,0,10],legR:[-14,0,0]}),
  dk(.74,sprawl(0,90,[-40,0,40],[-70,0,-20],[12,0,8],[-12,0,-8],[0,0,16],.1,0)),dk(.88,sprawl(0,82,[-34,0,44],[-62,0,-24],[10,0,8],[-10,0,-8],[0,0,14],.1,0)),dk(1,sprawl(0,88,[-36,0,42],[-66,0,-22],[11,0,8],[-11,0,-8],[0,0,15],.09,0))]},
 fallRight:{id:'idle',period:DEATH_SECONDS,events:[{at:.7,kind:'dust',count:2,needsDrySurface:true,at3:[-.4,0,0]}],keys:[dk(0,{}),dk(.14,{spine:[0,0,-10],head:[0,0,-14],armR:[-30,0,-30],armL:[-40,0,10]}),
  dk(.45,{rootRot:[0,0,-34],root:[0,-.06,0],spine:[0,0,-12],head:[0,0,-16],armR:[-50,0,-60],armL:[-60,0,30],legR:[10,0,-10],legL:[-14,0,0]}),
  dk(.74,sprawl(0,-90,[-70,0,20],[-40,0,-40],[-12,0,8],[12,0,-8],[0,0,-16],.1,0)),dk(.88,sprawl(0,-82,[-62,0,24],[-34,0,-44],[-10,0,8],[10,0,-8],[0,0,-14],.1,0)),dk(1,sprawl(0,-88,[-66,0,22],[-36,0,-42],[-11,0,8],[11,0,-8],[0,0,-15],.09,0))]},
};
/** Which fall: momentum decides. Running forward falls forward, being driven back falls back, otherwise a stable per-unit side. */
export function deathClipFor(facing:number,vx:number,vz:number,seed:number):DeathClipId{
 const sp=Math.hypot(vx,vz),along=sp>.35?(vx*Math.sin(facing)+vz*Math.cos(facing))/sp:0;
 if(along>.5)return 'fallForward';if(along<-.5)return 'fallBack';const r=seededRandom(hashSeed(seed,'fall'))();return r<.34?'fallBack':r<.67?'fallLeft':'fallRight';
}
/** Pose at `age` seconds after death; holds the lying pose afterwards. */
export function sampleDeath(id:DeathClipId,age:number):Pose{return samplePose(DEATH_CLIPS[id],Math.min(.999999,Math.max(0,age/DEATH_SECONDS)));}
/** Equipment stance for armed people while they only stand or walk; work and fight clips carry their own item angles. */
export function stancePose(p:Pose,clip:ClipId,weapon?:'spear'|'bow'|'blade'):Pose{
 if(!weapon||(clip!=='idle'&&clip!=='walk'))return p;const o:Pose={...p,parts:{...p.parts},itemR:[...p.itemR],itemL:[...p.itemL]};
 if(weapon==='spear'){o.parts.armR=[-24*d+p.parts.armR[0]*.25,0,-6*d];o.itemR=[0,0,0];}
 else if(weapon==='blade'){o.parts.armR=[-12*d+p.parts.armR[0]*.4,0,-8*d];o.itemR=[38*d,0,0];}
 else{o.parts.armL=[-34*d+p.parts.armL[0]*.3,0,8*d];o.itemL=[0,0,0];}
 return o;
}

// ---- Effects with hard caps.
export const EFFECT_CAPS={dust:96,chaff:96,smoke:48,steam:32} as const;
export const EFFECT_RULES={perSourceMax:6,globalPerSecond:{dust:60,chaff:60,smoke:12,steam:12},life:{dust:.9,chaff:1.4,smoke:3.2,steam:1.6},rise:{dust:.15,chaff:-.35,smoke:.6,steam:.8}} as const;
export type Particle={kind:EffectKind;x:number;y:number;z:number;age:number;life:number;vx:number;vy:number;vz:number;source:number;alive:boolean};
export class EffectPool{
 private pools:Record<EffectKind,Particle[]>={dust:[],chaff:[],smoke:[],steam:[]};private tokens:Record<EffectKind,number>={dust:EFFECT_RULES.globalPerSecond.dust,chaff:EFFECT_RULES.globalPerSecond.chaff,smoke:EFFECT_RULES.globalPerSecond.smoke,steam:EFFECT_RULES.globalPerSecond.steam};
 private serial=0;dropped=0;
 constructor(){for(const kind of Object.keys(EFFECT_CAPS) as EffectKind[])for(let i=0;i<EFFECT_CAPS[kind];i++)this.pools[kind].push({kind,x:0,y:0,z:0,age:0,life:0,vx:0,vy:0,vz:0,source:-1,alive:false});}
 /** Returns false (and counts a drop) when a cap, a per-source limit or the spawn rate stops it. Memory never grows. */
 spawn(kind:EffectKind,x:number,y:number,z:number,source:number,seed=0):boolean{
  const pool=this.pools[kind];let free:Particle|undefined,mine=0;for(const p of pool){if(p.alive){if(p.source===source)mine++;}else if(!free)free=p;}
  if(!free||mine>=EFFECT_RULES.perSourceMax||this.tokens[kind]<1){this.dropped++;return false;}
  this.tokens[kind]--;const r=seededRandom(hashSeed(seed,this.serial++,kind));
  Object.assign(free,{x,y,z,age:0,life:EFFECT_RULES.life[kind]*(.8+r()*.4),vx:(r()-.5)*.3,vy:EFFECT_RULES.rise[kind],vz:(r()-.5)*.3,source,alive:true});return true;
 }
 step(dt:number){
  for(const kind of Object.keys(this.pools) as EffectKind[]){this.tokens[kind]=Math.min(EFFECT_RULES.globalPerSecond[kind],this.tokens[kind]+EFFECT_RULES.globalPerSecond[kind]*dt);
   for(const p of this.pools[kind]){if(!p.alive)continue;p.age+=dt;if(p.age>=p.life){p.alive=false;continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}}
 }
 count(kind?:EffectKind):number{return kind?this.pools[kind].filter(p=>p.alive).length:(Object.keys(this.pools) as EffectKind[]).reduce((n,k)=>n+this.count(k),0);}
 get capacity(){return Object.values(EFFECT_CAPS).reduce((a,b)=>a+b,0);}
 alive(){return (Object.keys(this.pools) as EffectKind[]).flatMap(k=>this.pools[k].filter(p=>p.alive));}
}
/** Events crossed when the phase advances from `from` to `to` (handles wrap). Fire-born effects need a real lit fire; dust needs dry ground; far tier emits nothing. */
export function eventsBetween(clip:Clip,from:number,to:number,ctx:{fireLit?:boolean;dry?:boolean;tier?:AnimTier}){
 if((ctx.tier??0)>=2)return [];
 const adv=to-from,wrapped=adv<0,out:Clip['events']=[];
 for(const e of clip.events){const hit=wrapped?(e.at>from||e.at<=to):(e.at>from&&e.at<=to);if(!hit)continue;if(e.needsFire&&!ctx.fireLit)continue;if(e.needsDrySurface&&!ctx.dry)continue;if((ctx.tier??0)===1&&e.kind==='dust')continue;out.push(e);}
 return out;
}
