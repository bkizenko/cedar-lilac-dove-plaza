/** Drives the shared rig from REAL unit state (ASTRA-12): pure, no three.js, no clock of its own.
 *
 *  - `activityFor` reads the fields the simulation already keeps (Unit.order, node kind, crop state, plantingWork, haulage,
 *    boat, cooldown, carry, the live ProductionProject) and returns the Activity animationClips.clipForActivity selects from;
 *  - `Animator` turns it into a phase from real progress: metres actually moved for walking/carrying/hauling/rowing, the live
 *    project's own `progress` seconds for production, the weapon cooldown for a swing, otherwise simulated seconds spent in
 *    the task (the sim clock stops when the game is paused, so the pose freezes);
 *  - `DeathTracker` notices a unit that really died (it leaves the simulation, or sits at hp<=0) and plays the fall from its
 *    last real position, facing and momentum, then leaves a bounded number of bodies that sink away.
 * Nothing here scripts a performance: no unit animates a job it is not doing. */
import {CLIPS,clipForActivity,phaseFor,samplePose,blendPoses,gaitBlend,gaitStride,unitVariation,gaitFor,sampleDeath,deathClipFor,DEATH_SECONDS,stancePose,type Activity,type ClipId,type DeathClipId,type Pose,type Variation} from './animationClips';
import {TOOL_FOR_CLIP,type ItemId} from './characterRig';

/** The Unit fields read (all optional so tests and the archive can build partial units). */
export type UnitLike={id:number;type:string;team:number;x:number;y:number;z:number;vx:number;vz:number;facing:number;hp:number;order:string;r?:number;range?:number;cd?:number;rof?:number;carry?:number;militia?:boolean;
 node?:unknown;target?:{x:number;z:number;r?:number}|null;plantingWork?:unknown;haulage?:string;boat?:{phase?:string};warming?:boolean;/** Unit.workReason: the sim's own 'Warming up by the lit hearth' marks a unit warming at a lit fire */workReason?:string;stride?:number;maturesAt?:number;ageT?:number;
 copperStudy?:{paused?:boolean}|null;husbandryWork?:unknown;weaponWork?:{paused?:boolean}|null;farmToolWork?:unknown;tamingWork?:unknown;haulageWork?:unknown;shelterId?:number};
export type ProjectLike={phase:string;recipe:string;progress:number;blockedReason?:string};
export type AnimContext={time:number;project?:ProjectLike;fireLit?:boolean;/** carried amount over capacity, 0..1 */load:number;/** the farm building the unit works, from its real crop record */farm?:{ripened?:boolean;planted?:number;tended?:number}|null};
const WEAPON:Record<string,'spear'|'bow'|'blade'|undefined>={spearman:'spear',archer:'bow',ranger:'bow',swordsman:'blade'};
export const weaponOf=(type:string)=>WEAPON[type];
const isFish=(n:unknown)=>!!n&&typeof n==='object'&&(n as {kind?:string}).kind==='fish';
const nodeKind=(n:unknown)=>n&&typeof n==='object'?String((n as {kind?:string;type?:string;species?:string}).kind??(n as {type?:string}).type??(n as {species?:string}).species??''):'';
/** What the unit is really doing. `moving` is its actual speed, not its order. */
export function activityFor(u:UnitLike,ctx:AnimContext):Activity{
 const speed=Math.hypot(u.vx,u.vz),moving=speed>.35,a:Activity={order:u.order,moving,load:ctx.load,weapon:WEAPON[u.type]};
 if(u.boat?.phase==='aboard')a.rowing=speed>.2;
 if(ctx.project&&ctx.project.phase!=='lost'&&ctx.project.phase!=='complete'&&!ctx.project.blockedReason){a.productionPhase=ctx.project.phase;a.recipe=ctx.project.recipe;}
 if(u.order==='attack'||u.order==='attackmove'){
  const t=u.target;a.inRange=!!t&&Math.hypot(t.x-u.x,t.z-u.z)<=(u.range??1.6)+(t.r??0)+(u.r??.4)+.6;
 }
 if(u.haulage&&u.haulage!=='canoe')a.hauling=true;
 if(u.order==='gather'){
  a.nodeKind=nodeKind(u.node);if(isFish(u.node))a.fishing=true;
  if(u.plantingWork)a.fieldAction='plant';
  else if(a.nodeKind==='farm'){const f=ctx.farm;a.fieldAction=!f?'till':f.ripened?'harvest':(f.planted??0)<=0?'till':(f.tended??0)<(f.planted??0)?'till':'plant';}
 }
 a.warming=(!!u.warming||u.workReason==='Warming up by the lit hearth')&&!moving;a.fireLit=ctx.fireLit;
 return a;
}
export type AnimState={x:number;z:number;dist:number;/** walk cycles accumulated at the speed-blended stride (continuous phase through walk->run) */gait:number;/** smoothed 0..1 walk->run blend */run:number;work:number;time:number;variation:Variation;clip:ClipId;seen:number};
export const newAnimState=(u:UnitLike,time:number):AnimState=>({x:u.x,z:u.z,dist:0,gait:0,run:0,work:0,time,variation:unitVariation(u.id),clip:'idle',seen:time});
export type AnimFrame={clip:ClipId;phase:number;pose:Pose;load:number;reason:string;itemR?:ItemId;itemL?:ItemId};
/** Advance one unit's animation from real state. `moved` clamps teleports (a unit placed elsewhere does not slide its feet). */
export function stepAnimator(st:AnimState,u:UnitLike,ctx:AnimContext):AnimFrame{
 const act=activityFor(u,ctx),sel=clipForActivity(act),clip=CLIPS[sel.clip],dt=Math.max(0,Math.min(1,ctx.time-st.time)),moved=Math.min(3,Math.hypot(u.x-st.x,u.z-st.z));
 st.dist+=moved;st.x=u.x;st.z=u.z;st.time=ctx.time;st.seen=ctx.time;
 if(sel.clip!==st.clip){st.clip=sel.clip;st.work=0;}
 let work=st.work;
 if(act.productionPhase==='working'&&ctx.project)work=ctx.project.progress;
 else if((sel.clip==='thrust'||sel.clip==='shoot'||sel.clip==='slash'||sel.clip==='fight')&&(u.rof??0)>0&&(u.cd??-1)>=0)work=(1-Math.min(1,Math.max(0,(u.cd??0)/(u.rof as number))))*clip.period/st.variation.speed;
 else{st.work+=dt;work=st.work;}
 let phase=phaseFor(clip,{workSeconds:work,distanceMetres:st.dist,timeSeconds:ctx.time},st.variation,sel.load),pose:Pose;
 if(sel.clip==='walk'){
  // walk -> run by the unit's real speed; the blend eases with sim time (dt), the phase advances with metres moved at the blended stride
  const target=gaitBlend(Math.hypot(u.vx,u.vz));
  st.run+=(target-st.run)*Math.min(1,dt*6);if(Math.abs(target-st.run)<1e-4)st.run=target;
  st.gait+=moved/gaitStride(st.run);const ph=st.gait+st.variation.phaseOffset;phase=ph-Math.floor(ph);
  pose=st.run>.001?blendPoses(samplePose(CLIPS.walk,phase,st.variation,sel.load),samplePose(CLIPS.run,phase,st.variation,sel.load),st.run):samplePose(clip,phase,st.variation,sel.load);
 }else{st.run=0;pose=samplePose(clip,phase,st.variation,sel.load);}
 pose=stancePose(pose,sel.clip,WEAPON[u.type]);
 return {clip:sel.clip,phase,pose,load:sel.load,reason:sel.reason,itemR:TOOL_FOR_CLIP[sel.clip]};
}
export {gaitFor};

// ---- Death.
export type Corpse={id:number;type:string;team:number;x:number;y:number;z:number;facing:number;clip:DeathClipId;diedAt:number;scale:number;outfitKey:string;bodyClass:string;snap:unknown};
export const CORPSE_RULES={seconds:11,sinkSeconds:1.6,max:40,/** more than this many units vanishing in one frame is a load or a reset, not combat */massVanish:24,sinkMetres:.55} as const;
export class DeathTracker{
 private last=new Map<number,{u:UnitLike;snap:unknown;scale:number;outfitKey:string;bodyClass:string;time:number}>();corpses:Corpse[]=[];private lastTime=-1;
 /** Remember a live, drawn unit. Called by the layer for every unit it writes. */
 see(u:UnitLike,time:number,scale:number,outfitKey:string,bodyClass:string,snap:unknown=null){
  const e=this.last.get(u.id);if(e){e.u=u;e.time=time;e.scale=scale;e.outfitKey=outfitKey;e.bodyClass=bodyClass;e.snap=snap;}else this.last.set(u.id,{u,snap,scale,outfitKey,bodyClass,time});
 }
 /** Reconcile with the simulation: `alive` is the set of ids still present with hp>0. Returns the ids that died this call. */
 sweep(alive:ReadonlySet<number>,time:number):number[]{
  const died:number[]=[];
  if(this.lastTime>=0&&time<this.lastTime-.5){this.last.clear();this.corpses.length=0;}
  const gone:number[]=[];for(const id of this.last.keys())if(!alive.has(id))gone.push(id);
  const fresh=gone.filter(id=>time-this.last.get(id)!.time<=2.5);
  if(fresh.length<=CORPSE_RULES.massVanish)for(const id of fresh){const e=this.last.get(id)!,u=e.u;
   this.corpses.push({id,type:u.type,team:u.team,x:u.x,y:u.y,z:u.z,facing:u.facing,clip:deathClipFor(u.facing,u.vx,u.vz,id),diedAt:time,scale:e.scale,outfitKey:e.outfitKey,bodyClass:e.bodyClass,snap:e.snap});died.push(id);}
  for(const id of gone)this.last.delete(id);
  const keep=this.corpses.filter(c=>time-c.diedAt<DEATH_SECONDS+CORPSE_RULES.seconds+CORPSE_RULES.sinkSeconds);
  this.corpses=keep.length>CORPSE_RULES.max?keep.slice(keep.length-CORPSE_RULES.max):keep;this.lastTime=time;return died;
 }
 /** Pose and ground sink for a corpse at `time`. */
 pose(c:Corpse,time:number){
  const age=time-c.diedAt,pose=sampleDeath(c.clip,age),over=age-DEATH_SECONDS-CORPSE_RULES.seconds,sink=over>0?Math.min(1,over/CORPSE_RULES.sinkSeconds)*CORPSE_RULES.sinkMetres:0;
  return {pose,sink,age,lying:age>=DEATH_SECONDS};
 }
 get tracked(){return this.last.size;}
}
