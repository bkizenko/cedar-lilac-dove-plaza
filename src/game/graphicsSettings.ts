/** Display settings: what the player chose, what is actually in force, and the one place that may change the second without the player.
 *
 * Three knobs, each 'auto' (default) or an explicit level:
 *   graphics   Low / Medium / High            pixel budget, bloom, shadows, grass         (src/game/graphics.ts)
 *   draw       Low / Medium / High / Ultra    how far the world is drawn                  (src/game/drawDistance.ts)
 *   trees      steps 1..5                     tree detail radius, tree draw distance, filler forest, leaf cards
 *
 * Rules (the owner bug: "I cannot select anything above Low"):
 *  - An explicit choice is never overridden by the adaptive governor. It is applied as chosen and persisted as chosen.
 *  - Only a knob left on Auto may be eased automatically, only after frame time stayed over budget for several seconds, and the screen says so
 *    ("Eased by Auto: ...") with a one-click Restore.
 *  - An automatic easing is NEVER written to storage. (Before this module the graphics tuner called the persisting setter, so one slow loading spell wrote
 *    'low' into localStorage for good and the next load started on Low with no way to tell why. The old storage key is therefore ignored.)
 *  - Safety fallbacks (lost GPU context, repeated render errors) are not choices either: they lower the effective tier, are not persisted, and use the same notice + Restore.
 * Pure: no three.js, no DOM except the storage object that is passed in or read defensively. */
import {GRAPHICS_RULES,type GraphicsQuality} from './graphics';
import {DRAW_DISTANCE_LEVELS,DRAW_DISTANCE_LABELS,DRAW_DISTANCE_RULES,drawBands,isDrawDistance,type DrawBands,type DrawDistance} from './drawDistance';

export type GraphicsChoice='auto'|GraphicsQuality;
export type DrawChoice='auto'|DrawDistance;
export type TreeStep=1|2|3|4|5;
export type TreeChoice='auto'|TreeStep;
export const GRAPHICS_CHOICES:readonly GraphicsChoice[]=['auto','low','med','high'];
export const GRAPHICS_LABELS:Record<GraphicsChoice,string>={auto:'Auto',low:'Low',med:'Medium',high:'High'};
export const DRAW_CHOICES:readonly DrawChoice[]=['auto',...DRAW_DISTANCE_LEVELS];
export const DRAW_LABELS:Record<DrawChoice,string>={auto:'Auto',...DRAW_DISTANCE_LABELS};
export const TREE_STEPS:readonly TreeStep[]=[1,2,3,4,5];
export const TREE_CHOICES:readonly TreeChoice[]=['auto',...TREE_STEPS];

/** What one tree-detail step changes. All render-only; none touches the simulation, resource ids, picking or saves.
 *  nearMetres    radius of full + mid botanical species meshes (full-detail inside 40% of it, mid-detail to 115%)  (legacy: Low 28, Medium 75, High 115)
 *  farScale      multiplier on the draw-distance band's tree draw distance (individual far crowns of sim trees and filler)
 *  fillerCap     multiplier on the cosmetic filler forest's tree and horizon-crown caps; 0 = no filler forest
 *  fillerDetail  multiplier on the radius out to which filler trees are drawn as individual crowns (beyond it: merged horizon crowns)
 *  cardScale     multiplier on leaf-card count of every botanical tree mesh (cores and trunks are unchanged) */
export type TreeDetail={step:TreeStep;label:string;nearMetres:number;farScale:number;fillerCap:number;fillerDetail:number;cardScale:number};
export const TREE_DETAIL:Record<TreeStep,TreeDetail>={
 1:{step:1,label:'Sparse',nearMetres:20,farScale:.45,fillerCap:0,fillerDetail:0,cardScale:.55},
 /** step 2 is the new Low: cheaper than the old Low (which drew every card out to 28 m with no filler) */
 2:{step:2,label:'Light',nearMetres:28,farScale:.6,fillerCap:.25,fillerDetail:.6,cardScale:.75},
 /** the default for Auto: the middle of Low and Medium */
 3:{step:3,label:'Balanced',nearMetres:46,farScale:.8,fillerCap:.6,fillerDetail:.8,cardScale:.88},
 /** step 4 equals the old Medium */
 4:{step:4,label:'Rich',nearMetres:75,farScale:1,fillerCap:1,fillerDetail:1,cardScale:1},
 /** step 5 equals the old High */
 5:{step:5,label:'Full',nearMetres:115,farScale:1,fillerCap:1,fillerDetail:1,cardScale:1},
};
export const isTreeStep=(v:unknown):v is TreeStep=>v===1||v===2||v===3||v===4||v===5;
export const isGraphicsChoice=(v:unknown):v is GraphicsChoice=>v==='auto'||v==='low'||v==='med'||v==='high';
export const isDrawChoice=(v:unknown):v is DrawChoice=>v==='auto'||isDrawDistance(v);
export const isTreeChoice=(v:unknown):v is TreeChoice=>v==='auto'||isTreeStep(v);

export const SETTINGS_RULES={
 /** v2 keys: the v1 graphics key was written by the automatic tuner as well as by the menu, so a stored 'low' cannot be told from a choice and is ignored. */
 keys:{graphics:'hearthwild:graphics-choice-v2',draw:'hearthwild:draw-choice-v2',trees:'hearthwild:tree-detail-v2'},
 /** the pre-v2 draw-distance key was only ever written by the menu, so a valid value there is a real choice and carries over */
 legacyDrawKey:DRAW_DISTANCE_RULES.key,
 /** what 'auto' starts at (graphics, draw distance, tree step): 8 GB M1 safe, trees in the middle of Low and Medium */
 autoStart:{graphics:'med' as GraphicsQuality,draw:'medium' as DrawDistance,trees:3 as TreeStep},
 /** with an explicit graphics tier and trees on Auto, trees follow the tier (Low is cheaper than before, Medium and High are exactly as before) */
 treesForGraphics:{low:2,med:4,high:5} as Record<GraphicsQuality,TreeStep>,
 /** Auto eases only when the mean frame time stays over `budgetMs` for `overSeconds`. 40 ms = 25 fps: slower than that for six seconds is not a hiccup. */
 budgetMs:40,overSeconds:6,hitchMs:250,
 /** after load, a rebuild or any change, frames are not judged for this long (shader compiles, chunk generation, a hidden tab coming back) */
 settleSeconds:10,
} as const;

export type Choices={graphics:GraphicsChoice;draw:DrawChoice;trees:TreeChoice};
export type Effective={graphics:GraphicsQuality;draw:DrawDistance;trees:TreeStep};
export type Knob=keyof Choices;
export const DEFAULT_CHOICES:Choices={graphics:'auto',draw:'auto',trees:'auto'};

/** Resolve choices into the effective tiers with nothing eased. Explicit always wins; Auto starts at SETTINGS_RULES.autoStart. */
export function resolveChoices(c:Choices):Effective{
 const graphics=c.graphics==='auto'?SETTINGS_RULES.autoStart.graphics:c.graphics;
 const draw=c.draw==='auto'?SETTINGS_RULES.autoStart.draw:c.draw;
 const trees=c.trees!=='auto'?c.trees:c.graphics==='auto'?SETTINGS_RULES.autoStart.trees:SETTINGS_RULES.treesForGraphics[c.graphics];
 return {graphics,draw,trees};
}

/** Everything the renderer reads, from effective tiers. This is the "engine config" the tests check each selection against. */
export type RenderConfig={quality:GraphicsQuality;graphicsProfile:typeof GRAPHICS_RULES.profiles[GraphicsQuality];draw:DrawDistance;bands:DrawBands;trees:TreeDetail};
export function renderConfig(e:Effective,worldSize=1040):RenderConfig{
 return {quality:e.graphics,graphicsProfile:GRAPHICS_RULES.profiles[e.graphics],draw:e.draw,bands:drawBands(e.draw,worldSize),trees:TREE_DETAIL[e.trees]};
}

/** Tree-related numbers the scene reads for a tier: bands scaled by the step. Filler caps and radii are what BiomeSceneLayer hands to the filler forest. */
export function treeBudget(bands:DrawBands,step:TreeStep){
 const d=TREE_DETAIL[step],filler=bands.fillerFar>0&&d.fillerCap>0;
 return {treeFar:bands.treeFar*d.farScale,fillerFar:filler?bands.fillerFar*d.farScale:0,fillerDetail:filler?bands.fillerDetail*d.fillerDetail:0,
  fillerMaxTrees:filler?Math.floor(bands.fillerMaxTrees*d.fillerCap):0,fillerMaxBlobs:filler?Math.floor(bands.fillerMaxBlobs*d.fillerCap):0};
}

// ----- persistence (every storage access guarded) -----
type StorageLike={getItem(k:string):string|null;setItem(k:string,v:string):void};
function defaultStorage():StorageLike|null{try{return typeof localStorage!=='undefined'?localStorage:null;}catch{return null;}}
const read=(s:StorageLike|null,k:string)=>{try{return s?s.getItem(k):null;}catch{return null;}};
const write=(s:StorageLike|null,k:string,v:string)=>{try{s?.setItem(k,v);return true;}catch{return false;}};
export function loadChoices(storage:StorageLike|null=defaultStorage()):Choices{
 const g=read(storage,SETTINGS_RULES.keys.graphics),d=read(storage,SETTINGS_RULES.keys.draw)??read(storage,SETTINGS_RULES.legacyDrawKey),t=read(storage,SETTINGS_RULES.keys.trees);
 const tn=t===null?null:Number(t);
 return {graphics:isGraphicsChoice(g)?g:'auto',draw:isDrawChoice(d)?d:'auto',trees:t==='auto'?'auto':isTreeStep(tn)?tn:'auto'};
}
export function rememberChoice(knob:Knob,value:GraphicsChoice|DrawChoice|TreeChoice,storage:StorageLike|null=defaultStorage()):boolean{
 const ok=knob==='graphics'?isGraphicsChoice(value):knob==='draw'?isDrawChoice(value):isTreeChoice(value);
 return ok&&write(storage,SETTINGS_RULES.keys[knob],String(value));
}
/** Effective tiers at start-up, before any controller exists (the renderer builds with these). */
export const initialEffective=(storage:StorageLike|null=defaultStorage()):Effective=>resolveChoices(loadChoices(storage));

// ----- the notice -----
export type EaseNotice={kind:'auto'|'safety';knob:Knob;from:string;to:string;reason:string;/** one line for the screen */text:string};
const labelOf=(knob:Knob,v:string|number)=>knob==='graphics'?GRAPHICS_LABELS[v as GraphicsChoice]:knob==='draw'?DRAW_LABELS[v as DrawChoice]:`${TREE_DETAIL[v as TreeStep].label} (${v}/5)`;
export const KNOB_NAMES:Record<Knob,string>={graphics:'Graphics',draw:'Draw distance',trees:'Tree detail'};

/** The ease ladder for knobs left on Auto, cheapest look-loss first: lighter trees, then resolution/bloom, then draw distance, then the sparsest trees. */
const LADDER:readonly {knob:Knob;floor:number}[]=[{knob:'trees',floor:2},{knob:'graphics',floor:0},{knob:'draw',floor:0},{knob:'trees',floor:1}];
const GQ:readonly GraphicsQuality[]=['low','med','high'];

export type Apply=(effective:Effective,changed:readonly Knob[])=>void;
export class GraphicsSettings{
 choices:Choices;effective:Effective;notice:EaseNotice|null=null;
 private storage:StorageLike|null;private apply:Apply;private over=0;private sum=0;private count=0;private settle=SETTINGS_RULES.settleSeconds;
 constructor(apply:Apply,storage:StorageLike|null=defaultStorage(),choices?:Choices){
  this.apply=apply;this.storage=storage;this.choices=choices??loadChoices(storage);this.effective=resolveChoices(this.choices);
 }
 /** Apply the current effective tiers (call once after the renderer exists). */
 start(){this.apply(this.effective,['graphics','draw','trees']);}
 /** Is any knob on Auto (so the governor may act)? */
 get adaptive(){return this.choices.graphics==='auto'||this.choices.draw==='auto'||this.choices.trees==='auto';}
 get eased(){return this.notice!==null;}
 /** The player picks a level (or Auto) for one knob. Persisted; clears any easing for every knob, because the player's picture of "my settings" just changed. */
 choose(knob:Knob,value:GraphicsChoice|DrawChoice|TreeChoice):boolean{
  const valid=knob==='graphics'?isGraphicsChoice(value):knob==='draw'?isDrawChoice(value):isTreeChoice(value);if(!valid)return false;
  (this.choices as Record<Knob,unknown>)[knob]=value;rememberChoice(knob,value,this.storage);
  this.commit(resolveChoices(this.choices));return true;
 }
 /** One click: undo every automatic and safety change and go back to what the player chose (or to the Auto starting point). */
 restore(){this.commit(resolveChoices(this.choices));}
 private commit(next:Effective){
  const changed=(['graphics','draw','trees'] as Knob[]).filter(k=>next[k]!==this.effective[k]);
  this.effective=next;this.notice=null;this.over=this.sum=this.count=0;this.settle=SETTINGS_RULES.settleSeconds;
  this.apply(this.effective,changed);
 }
 /** Frames are about to stall for a known reason (world rebuild, load): do not judge them. */
 hold(seconds:number=SETTINGS_RULES.settleSeconds){this.settle=Math.max(this.settle,seconds);this.over=this.sum=this.count=0;}
 /** Feed one frame gap (ms). Returns the notice when this frame eased something. Never touches an explicit knob. */
 observe(frameMs:number):EaseNotice|null{
  if(!Number.isFinite(frameMs)||frameMs<=0||frameMs>SETTINGS_RULES.hitchMs)return null;
  const dt=frameMs/1000;
  if(this.settle>0){this.settle=Math.max(0,this.settle-dt);return null;}
  if(!this.adaptive)return null;
  this.sum+=frameMs;this.count++;this.over+=dt;
  if(this.over<SETTINGS_RULES.overSeconds)return null;
  const mean=this.sum/Math.max(1,this.count);this.over=this.sum=this.count=0;
  if(mean<=SETTINGS_RULES.budgetMs)return null;
  return this.easeOne(`frames averaged ${Math.round(mean)} ms (${Math.round(1000/mean)} fps) for ${SETTINGS_RULES.overSeconds} s`,'auto');
 }
 private easeOne(reason:string,kind:'auto'|'safety'):EaseNotice|null{
  for(const rung of LADDER){
   if(this.choices[rung.knob]!=='auto')continue;
   const e=this.effective;let to:Effective|null=null;
   if(rung.knob==='trees'&&e.trees>rung.floor)to={...e,trees:(e.trees-1) as TreeStep};
   else if(rung.knob==='graphics'&&GQ.indexOf(e.graphics)>rung.floor)to={...e,graphics:GQ[GQ.indexOf(e.graphics)-1]};
   else if(rung.knob==='draw'&&DRAW_DISTANCE_LEVELS.indexOf(e.draw)>rung.floor)to={...e,draw:DRAW_DISTANCE_LEVELS[DRAW_DISTANCE_LEVELS.indexOf(e.draw)-1]};
   if(!to)continue;
   return this.ease(rung.knob,to,reason,kind);
  }
  return null;
 }
 private ease(knob:Knob,to:Effective,reason:string,kind:'auto'|'safety'){
  const from=this.effective[knob],now=to[knob];this.effective=to;this.over=this.sum=this.count=0;this.settle=SETTINGS_RULES.settleSeconds;
  const text=`${kind==='auto'?'Eased by Auto':'Lowered for safety'}: ${KNOB_NAMES[knob]} ${labelOf(knob,from)} to ${labelOf(knob,now)} (${reason}).`;
  this.notice={kind,knob,from:String(from),to:String(now),reason,text};this.apply(this.effective,[knob]);return this.notice;
 }
 /** GPU context lost or repeated render errors: lower the effective graphics tier one step even on an explicit choice, say so, never persist it, and offer Restore. */
 safetyDowngrade(reason:string):EaseNotice|null{
  const g=GQ.indexOf(this.effective.graphics);if(g<=0)return null;
  return this.ease('graphics',{...this.effective,graphics:GQ[g-1]},reason,'safety');
 }
}
