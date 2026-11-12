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

export type Part='hips'|'spine'|'head'|'armL'|'armR'|'legL'|'legR';
export const PARTS:readonly Part[]=['hips','spine','head','armL','armR','legL','legR'];
/** Rotations in radians [rx, ry, rz] per part, plus a root offset in metres [x,y,z]. */
export type Pose={parts:Record<Part,[number,number,number]>;root:[number,number,number]};
export type ClipId='idle'|'walk'|'carry'|'row'|'fight'|'thresh'|'winnow'|'grind'|'bake'|'tend'|'chop'|'quarry'|'plant'|'harvest'|'craft';
export type EffectKind='dust'|'chaff'|'smoke'|'steam';
type Deg=Partial<Record<Part|'root',number[]>>;
type Key={t:number;pose:Deg};
export type Clip={id:ClipId;/** seconds per cycle at jitter 1 (work clips) */period:number;/** metres of travel per cycle (walk, carry, row) */strideMetres?:number;
 keys:Key[];/** events fire when the phase crosses `at` (0..1) */events:{at:number;kind:EffectKind;count:number;needsFire?:boolean;needsDrySurface?:boolean;/** offset from the unit in metres, unit frame */at3:[number,number,number]}[]};
const k=(t:number,pose:Deg):Key=>({t,pose});
const d=Math.PI/180;
export const CLIPS:Record<ClipId,Clip>={
 idle:{id:'idle',period:4,events:[],keys:[k(0,{spine:[0,0,0],head:[0,0,0]}),k(.5,{spine:[-1.5,0,0],head:[1,0,0],root:[0,.006,0]}),k(1,{spine:[0,0,0],head:[0,0,0]})]},
 walk:{id:'walk',period:1,strideMetres:1.3,events:[{at:.0,kind:'dust',count:1,needsDrySurface:true,at3:[-.1,0,0]},{at:.5,kind:'dust',count:1,needsDrySurface:true,at3:[.1,0,0]}],keys:[
  k(0,{legL:[30,0,0],legR:[-30,0,0],armL:[-24,0,0],armR:[24,0,0],root:[0,0,0]}),k(.25,{legL:[0,0,0],legR:[0,0,0],armL:[0,0,0],armR:[0,0,0],root:[0,.03,0]}),
  k(.5,{legL:[-30,0,0],legR:[30,0,0],armL:[24,0,0],armR:[-24,0,0],root:[0,0,0]}),k(.75,{legL:[0,0,0],legR:[0,0,0],armL:[0,0,0],armR:[0,0,0],root:[0,.03,0]}),k(1,{legL:[30,0,0],legR:[-30,0,0],armL:[-24,0,0],armR:[24,0,0],root:[0,0,0]})]},
 carry:{id:'carry',period:1,strideMetres:1.1,events:[{at:0,kind:'dust',count:1,needsDrySurface:true,at3:[-.1,0,0]},{at:.5,kind:'dust',count:1,needsDrySurface:true,at3:[.1,0,0]}],keys:[
  k(0,{legL:[24,0,0],legR:[-24,0,0],armL:[-55,0,8],armR:[-55,0,-8],spine:[6,0,0],root:[0,0,0]}),k(.25,{legL:[0,0,0],legR:[0,0,0],armL:[-58,0,8],armR:[-58,0,-8],spine:[8,0,0],root:[0,.04,0]}),
  k(.5,{legL:[-24,0,0],legR:[24,0,0],armL:[-55,0,8],armR:[-55,0,-8],spine:[6,0,0],root:[0,0,0]}),k(.75,{legL:[0,0,0],legR:[0,0,0],armL:[-58,0,8],armR:[-58,0,-8],spine:[8,0,0],root:[0,.04,0]}),k(1,{legL:[24,0,0],legR:[-24,0,0],armL:[-55,0,8],armR:[-55,0,-8],spine:[6,0,0],root:[0,0,0]})]},
 row:{id:'row',period:2.4,strideMetres:2.6,events:[],keys:[
  k(0,{spine:[-18,0,0],armL:[-80,0,10],armR:[-80,0,-10],legL:[-40,0,0],legR:[-40,0,0],root:[0,0,.02]}),k(.45,{spine:[22,0,0],armL:[-20,0,25],armR:[-20,0,-25],legL:[-40,0,0],legR:[-40,0,0],root:[0,0,-.04]}),
  k(.6,{spine:[24,0,0],armL:[-10,0,30],armR:[-10,0,-30],legL:[-40,0,0],legR:[-40,0,0],root:[0,0,-.04]}),k(1,{spine:[-18,0,0],armL:[-80,0,10],armR:[-80,0,-10],legL:[-40,0,0],legR:[-40,0,0],root:[0,0,.02]})]},
 fight:{id:'fight',period:1.1,events:[{at:.4,kind:'dust',count:2,needsDrySurface:true,at3:[0,0,.3]}],keys:[
  k(0,{spine:[0,-10,0],armR:[-120,0,-10],armL:[-30,0,20],legL:[15,0,0],legR:[-15,0,0],root:[0,0,0]}),k(.4,{spine:[18,12,0],armR:[40,0,-5],armL:[-50,0,20],legL:[-20,0,0],legR:[25,0,0],root:[0,-.03,.12]}),
  k(.7,{spine:[6,0,0],armR:[-20,0,-10],armL:[-30,0,20],legL:[0,0,0],legR:[0,0,0],root:[0,0,.04]}),k(1,{spine:[0,-10,0],armR:[-120,0,-10],armL:[-30,0,20],legL:[15,0,0],legR:[-15,0,0],root:[0,0,0]})]},
 thresh:{id:'thresh',period:1.3,events:[{at:.45,kind:'chaff',count:3,at3:[0,0,.5]},{at:.45,kind:'dust',count:1,needsDrySurface:true,at3:[0,0,.5]}],keys:[
  k(0,{spine:[-8,0,0],armL:[-150,0,0],armR:[-150,0,0],legL:[8,0,0],legR:[-8,0,0],root:[0,0,0]}),k(.45,{spine:[28,0,0],armL:[-30,0,0],armR:[-30,0,0],legL:[-6,0,0],legR:[6,0,0],root:[0,-.04,.1]}),
  k(.7,{spine:[12,0,0],armL:[-70,0,0],armR:[-70,0,0],root:[0,0,.04]}),k(1,{spine:[-8,0,0],armL:[-150,0,0],armR:[-150,0,0],legL:[8,0,0],legR:[-8,0,0],root:[0,0,0]})]},
 winnow:{id:'winnow',period:1.8,events:[{at:.5,kind:'chaff',count:6,at3:[0,.9,.5]}],keys:[
  k(0,{spine:[10,0,0],armL:[-30,0,25],armR:[-30,0,-25],head:[8,0,0],root:[0,-.02,0]}),k(.35,{spine:[-6,0,0],armL:[-95,0,15],armR:[-95,0,-15],head:[-8,0,0],root:[0,.03,0]}),
  k(.6,{spine:[-4,0,0],armL:[-80,0,10],armR:[-80,0,-10],root:[0,.02,0]}),k(1,{spine:[10,0,0],armL:[-30,0,25],armR:[-30,0,-25],head:[8,0,0],root:[0,-.02,0]})]},
 grind:{id:'grind',period:1.6,events:[{at:.5,kind:'dust',count:1,at3:[0,.5,.4]}],keys:[
  k(0,{spine:[22,0,0],armL:[-55,0,0],armR:[-55,0,0],legL:[14,0,0],legR:[-14,0,0],root:[0,-.03,.06]}),k(.5,{spine:[34,0,0],armL:[-20,0,0],armR:[-20,0,0],legL:[-6,0,0],legR:[6,0,0],root:[0,-.05,.18]}),k(1,{spine:[22,0,0],armL:[-55,0,0],armR:[-55,0,0],legL:[14,0,0],legR:[-14,0,0],root:[0,-.03,.06]})]},
 bake:{id:'bake',period:2.2,events:[{at:.5,kind:'steam',count:1,needsFire:true,at3:[0,.9,.6]}],keys:[
  k(0,{spine:[12,0,0],armL:[-60,0,12],armR:[-60,0,-12],head:[10,0,0]}),k(.5,{spine:[24,0,0],armL:[-35,0,6],armR:[-35,0,-6],head:[16,0,0],root:[0,-.03,.04]}),k(1,{spine:[12,0,0],armL:[-60,0,12],armR:[-60,0,-12],head:[10,0,0]})]},
 tend:{id:'tend',period:3,events:[{at:.3,kind:'smoke',count:1,needsFire:true,at3:[0,.6,.6]},{at:.8,kind:'smoke',count:1,needsFire:true,at3:[0,.6,.6]}],keys:[
  k(0,{spine:[28,0,0],armR:[-50,0,0],armL:[-20,0,0],head:[18,0,0],legL:[-18,0,0],legR:[10,0,0],root:[0,-.1,.1]}),k(.4,{spine:[34,0,0],armR:[-25,0,-10],armL:[-20,0,0],head:[20,0,0],legL:[-18,0,0],legR:[10,0,0],root:[0,-.12,.12]}),k(1,{spine:[28,0,0],armR:[-50,0,0],armL:[-20,0,0],head:[18,0,0],legL:[-18,0,0],legR:[10,0,0],root:[0,-.1,.1]})]},
 chop:{id:'chop',period:1.5,events:[{at:.4,kind:'dust',count:1,needsDrySurface:true,at3:[0,0,.6]}],keys:[
  k(0,{spine:[-12,-15,0],armR:[-170,0,-10],armL:[-150,0,10],legL:[10,0,0],legR:[-10,0,0]}),k(.4,{spine:[34,10,0],armR:[10,0,-5],armL:[20,0,5],legL:[-8,0,0],legR:[8,0,0],root:[0,-.05,.1]}),k(.7,{spine:[14,0,0],armR:[-40,0,0],armL:[-30,0,0]}),k(1,{spine:[-12,-15,0],armR:[-170,0,-10],armL:[-150,0,10],legL:[10,0,0],legR:[-10,0,0]})]},
 quarry:{id:'quarry',period:1.7,events:[{at:.4,kind:'dust',count:2,at3:[0,.1,.6]}],keys:[
  k(0,{spine:[-6,0,0],armR:[-140,0,0],armL:[-100,0,0]}),k(.4,{spine:[26,0,0],armR:[15,0,0],armL:[10,0,0],root:[0,-.04,.08]}),k(1,{spine:[-6,0,0],armR:[-140,0,0],armL:[-100,0,0]})]},
 plant:{id:'plant',period:2.4,events:[],keys:[k(0,{spine:[8,0,0],armR:[-20,0,0],head:[10,0,0]}),k(.35,{spine:[55,0,0],armR:[40,0,0],armL:[10,0,0],head:[25,0,0],legL:[-10,0,0],legR:[14,0,0],root:[0,-.12,.15]}),k(.7,{spine:[50,0,0],armR:[60,0,0],legL:[-10,0,0],legR:[14,0,0],root:[0,-.12,.15]}),k(1,{spine:[8,0,0],armR:[-20,0,0],head:[10,0,0]})]},
 harvest:{id:'harvest',period:1.8,events:[{at:.5,kind:'chaff',count:1,at3:[0,.3,.4]}],keys:[k(0,{spine:[20,0,0],armR:[-60,0,0],armL:[-30,0,0]}),k(.4,{spine:[50,0,0],armR:[30,0,0],armL:[-10,0,0],root:[0,-.1,.12]}),k(.7,{spine:[30,0,0],armR:[-40,0,0],armL:[-20,0,0]}),k(1,{spine:[20,0,0],armR:[-60,0,0],armL:[-30,0,0]})]},
 craft:{id:'craft',period:2.6,events:[],keys:[k(0,{spine:[16,0,0],armL:[-60,0,10],armR:[-60,0,-10],head:[14,0,0]}),k(.5,{spine:[20,0,0],armL:[-48,0,6],armR:[-72,0,-6],head:[18,0,0]}),k(1,{spine:[16,0,0],armL:[-60,0,10],armR:[-60,0,-10],head:[14,0,0]})]},
};

// ---- Selecting a clip from real state.
export type Activity={order?:string;/** ProductionProject.phase of the unit's live project, if any */productionPhase?:string;/** ProductionProject.recipe */recipe?:string;
 /** node kind being worked ('tree','rock','berries','field'...) when order==='gather' */nodeKind?:string;fieldAction?:'plant'|'harvest';/** Unit.boat?.phase==='aboard' while the boat moves */rowing?:boolean;
 inRange?:boolean;moving?:boolean;/** carried amount over capacity (Unit.carry / carryingCapacity) or held items over capacity */load?:number;warming?:boolean;fireLit?:boolean};
const RECIPE_CLIP:[RegExp,ClipId][]=[[/^thresh/,'thresh'],[/^winnow/,'winnow'],[/^grind/,'grind'],[/^bake/,'bake'],[/^(cook|manualSmoke|smoke|fireClay|ferment)/,'tend'],[/^(airDry|dryClay|drySkin)/,'craft']];
export function clipForActivity(a:Activity):{clip:ClipId;load:number;reason:string}{
 const load=Math.max(0,Math.min(1,Number.isFinite(a.load)?a.load!:0));
 if(a.rowing)return {clip:'row',load:0,reason:'aboard a moving boat'};
 if(a.order==='attack'||a.order==='attackmove')return a.inRange?{clip:'fight',load:0,reason:'target in reach'}:{clip:'walk',load:0,reason:'closing on target'};
 const ph=a.productionPhase;
 if(ph==='working'&&a.recipe){const hit=RECIPE_CLIP.find(([re])=>re.test(a.recipe!));return {clip:hit?hit[1]:'craft',load:0,reason:'working '+a.recipe};}
 if(ph==='curing'||ph==='paused')return {clip:'idle',load:0,reason:ph==='paused'?'work paused':'waiting while the batch cures'};
 if(ph==='carrying'||ph==='collecting'||ph==='returning'||ph==='unloading')return {clip:load>0?'carry':a.moving===false?'idle':'walk',load,reason:'moving a batch'};
 if(a.warming)return {clip:a.moving?'walk':'tend',load:0,reason:'warming at a fire'};
 if(a.order==='gather'&&a.moving===false){
  if(a.fieldAction)return {clip:a.fieldAction,load:0,reason:'field work'};
  const n=a.nodeKind||'';return {clip:/tree|wood/.test(n)?'chop':/rock|stone|ore|copper|iron/.test(n)?'quarry':/field|crop|berr|plant|bush/.test(n)?'harvest':'harvest',load:0,reason:'gathering '+n};}
 if(a.order==='build'&&a.moving===false)return {clip:'craft',load:0,reason:'building'};
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
function blank():Pose{return {parts:{hips:[0,0,0],spine:[0,0,0],head:[0,0,0],armL:[0,0,0],armR:[0,0,0],legL:[0,0,0],legR:[0,0,0]},root:[0,0,0]};}
export const NEUTRAL_POSE:Pose=blank();
export function samplePose(clip:Clip,phase:number,v:Variation={phaseOffset:0,speed:1,amplitude:1},load=0):Pose{
 const ph=phase-Math.floor(phase),ks=clip.keys;let i=0;while(i<ks.length-2&&ph>=ks[i+1].t)i++;
 const a=ks[i],b=ks[i+1],t=smooth(Math.max(0,Math.min(1,(ph-a.t)/Math.max(1e-6,b.t-a.t)))),out=blank(),g=gaitFor(load);
 const lerp=(x:number,y:number)=>x+(y-x)*t;
 for(const p of PARTS){const A=rad(a.pose[p]),B=rad(b.pose[p]);out.parts[p]=[lerp(A[0],B[0])*v.amplitude,lerp(A[1],B[1])*v.amplitude,lerp(A[2],B[2])*v.amplitude];}
 const ra=rad(a.pose.root),rb=rad(b.pose.root);for(let c=0;c<3;c++)out.root[c]=lerp((a.pose.root?.[c]??0),(b.pose.root?.[c]??0))*v.amplitude;void ra;void rb;
 if(clip.id==='carry'){for(const p of['legL','legR'] as Part[])out.parts[p][0]*=g.strideScale;out.root[1]*=g.bobScale;out.parts.spine[0]+=g.leanDeg*d;}
 return out;
}
export type AnimTier=0|1|2;
/** Distance rule: near full, mid reduced, far none. */
export const ANIMATION_DISTANCES_METRES={near:35,mid:70} as const;
export const animationTier=(distance:number):AnimTier=>distance<ANIMATION_DISTANCES_METRES.near?0:distance<ANIMATION_DISTANCES_METRES.mid?1:2;
export function poseAtTier(p:Pose,tier:AnimTier):Pose{
 if(tier===0)return p;if(tier===2)return blank();
 const o=blank();for(const part of['spine','armR','legL','legR'] as Part[])o.parts[part]=[...p.parts[part]];o.root=[0,p.root[1],0];return o;
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
 count(kind?:EffectKind){return kind?this.pools[kind].filter(p=>p.alive).length:(Object.keys(this.pools) as EffectKind[]).reduce((n,k)=>n+this.count(k),0);}
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
