/** Draw distance: how far the visible world extends. Pure rules, no three.js and no simulation state, so tests and the settings UI can read them.
 *
 * The world is drawn in four distance bands from the camera eye (horizontal metres):
 *   near     0 .. treeNear         full-detail trees, ground dressing, contact shadows, animated people (existing per-quality radii)
 *   mid      .. treeMid            mid-detail trees (existing)
 *   far      .. detailFar          individual far crowns plus rooted trunks (sim trees and cosmetic filler trees)
 *   horizon  .. farthest           merged low-poly clustered crowns (one blob per 16/32/64 m cell), terrain, buildings as cards, people as silhouettes
 * Haze (exponential-squared fog) is thinned per level but still reaches >= 95% at the camera far plane, and the outer edge of every cut-off fades in
 * with a screen-door dither, so nothing visibly pops at the limit.
 *
 * 'low' is the behaviour before this system existed (camera far 860, original fog, no filler). It stays selectable. 'medium' is the default.
 * Render-only: nothing here touches heights, collision, resources, saves or simulation. */
export type DrawDistance='low'|'medium'|'high'|'ultra';
export const DRAW_DISTANCE_LEVELS:readonly DrawDistance[]=['low','medium','high','ultra'];
export const DRAW_DISTANCE_LABELS:Record<DrawDistance,string>={low:'Low',medium:'Medium',high:'High',ultra:'Ultra'};
export type DrawBands={
 /** camera far plane (metres); clamped by the world diagonal for the levels that reach the world edge */
 cameraFar:number;
 /** multiplier on the weather's fog density (1 = original haze); < 1 lets the air be clearer */
 fogScale:number;
 /** sim trees and cosmetic filler are drawn out to this horizontal distance (graphics Low scales it down as before) */
 treeFar:number;
 /** cosmetic filler trees: draw radius (0 = none), individual-tree range, and how many may be drawn */
 fillerFar:number;fillerDetail:number;fillerMaxTrees:number;fillerMaxBlobs:number;
 /** screen-door fade span (metres) ahead of every outer cut-off and across the detail->horizon hand-over */
 fadeMetres:number;
 /** people beyond this are not drawn (selected people always are); Infinity = never hide */
 peopleFar:number;
};
export const DRAW_DISTANCE_RULES={
 /** clear-day painterly fog density, and sqrt(-ln 0.05): density*distance at which exp-squared fog is 95% */
 clearDensity:.0015,hazeK:1.731,
 key:'hearthwild:draw-distance',defaultLevel:'medium' as DrawDistance,
 /** the original numbers (camera far 860, fog scale 1, sim trees to 700 m) */
 legacy:{cameraFar:860,treeFar:700},
 levels:{
  low:{cameraFar:860,fogScale:1,treeFar:700,fillerFar:0,fillerDetail:0,fillerMaxTrees:0,fillerMaxBlobs:0,fadeMetres:0,peopleFar:Infinity},
  medium:{cameraFar:1400,fogScale:.82,treeFar:1100,fillerFar:1100,fillerDetail:260,fillerMaxTrees:450,fillerMaxBlobs:2200,fadeMetres:70,peopleFar:900},
  high:{cameraFar:2000,fogScale:.6,treeFar:1600,fillerFar:1600,fillerDetail:340,fillerMaxTrees:800,fillerMaxBlobs:3600,fadeMetres:110,peopleFar:1400},
  ultra:{cameraFar:3200,fogScale:.4,treeFar:2600,fillerFar:2600,fillerDetail:440,fillerMaxTrees:1300,fillerMaxBlobs:6500,fadeMetres:160,peopleFar:2400},
 } as Record<DrawDistance,DrawBands>,
 /** cluster cell sizes (metres) used for the horizon band, by distance from the camera */
 blobCells:[{from:0,size:16},{from:520,size:32},{from:1000,size:64}] as readonly {from:number;size:number}[],
 /** a filler tree is only generated this far (metres) from every camp, then thins in over `fillerBlendMetres` so the edge of the sim-tree area is a gradient, not a ring */
 simTreeRadiusMetres:150,fillerBlendMetres:110,
 /** cosmetic filler is never placed within this many metres of a building */
 buildingClearMetres:12,
 /** per-level frame-cost budget: extra triangles and draw calls the distance bands may add on top of the Low frame (estimates from geometry counts; see drawDistanceBudget) */
 budgets:{
  low:{extraTriangles:0,extraDrawCalls:0},
  medium:{extraTriangles:200000,extraDrawCalls:6},
  high:{extraTriangles:320000,extraDrawCalls:6},
  ultra:{extraTriangles:520000,extraDrawCalls:6},
 } as Record<DrawDistance,{extraTriangles:number;extraDrawCalls:number}>,
 /** triangle cost of each far primitive (measured from the geometry: far crown 240/92, rooted trunk 48, horizon blob 20/12) */
 triangles:{farCrown:240,farNeedle:92,trunk:48,blobRound:20,blobNeedle:12},
} as const;
export function isDrawDistance(value:unknown):value is DrawDistance{return value==='low'||value==='medium'||value==='high'||value==='ultra';}
export function loadDrawDistance():DrawDistance{
 try{const q=localStorage.getItem(DRAW_DISTANCE_RULES.key);return isDrawDistance(q)?q:DRAW_DISTANCE_RULES.defaultLevel;}catch{return DRAW_DISTANCE_RULES.defaultLevel;}
}
export function rememberDrawDistance(level:DrawDistance):void{
 if(!isDrawDistance(level))return;
 try{localStorage.setItem(DRAW_DISTANCE_RULES.key,level);}catch{/* the choice still applies for this session when storage is unavailable */}
}
/** Bands for a level on a world of this size. Levels above Low reach the world edge (diagonal) when that is nearer than their own far plane. */
export function drawBands(level:DrawDistance,worldSize=1040):DrawBands{
 const base=DRAW_DISTANCE_RULES.levels[level]??DRAW_DISTANCE_RULES.levels[DRAW_DISTANCE_RULES.defaultLevel];
 if(level==='low'||!Number.isFinite(worldSize)||worldSize<=0)return base;
 const diagonal=Math.hypot(worldSize,worldSize)*1.04,far=Math.max(DRAW_DISTANCE_RULES.legacy.cameraFar,Math.min(base.cameraFar,diagonal));
 const k=far/base.cameraFar,
  // the haze must still be >= 95% at the (possibly shortened) far plane on a clear day, so a small world gets thicker air than the level's own scale
  fogScale=Math.min(1,Math.max(base.fogScale,DRAW_DISTANCE_RULES.hazeK/(DRAW_DISTANCE_RULES.clearDensity*far)));
 return {...base,cameraFar:far,fogScale,treeFar:Math.max(DRAW_DISTANCE_RULES.legacy.treeFar,base.treeFar*k),fillerFar:base.fillerFar*k};
}
/** Worst-case extra triangles and draw calls the bands may add over Low, from the caps and the primitive costs (an upper bound: culled instances are not counted). */
export function drawDistanceBudget(level:DrawDistance){
 const b=DRAW_DISTANCE_RULES.levels[level],t=DRAW_DISTANCE_RULES.triangles;
 const trees=b.fillerMaxTrees*(t.farCrown+t.trunk),blobs=b.fillerMaxBlobs*t.blobRound;
 return {extraTriangles:level==='low'?0:trees+blobs,extraDrawCalls:level==='low'?0:4};
}
/** One step less far; Low is the floor. */
export function easeDrawDistance(level:DrawDistance):DrawDistance{const i=DRAW_DISTANCE_LEVELS.indexOf(level);return DRAW_DISTANCE_LEVELS[Math.max(0,i-1)];}
export const ADAPTIVE_RULES={
 /** mean frame time (ms) above this for `overSeconds` seconds eases the draw distance one level (about 38 fps: above the Medium p95 budget of 22 ms with margin) */
 budgetMs:26,overSeconds:5,
 /** frame gaps longer than this are hitches or a hidden tab, not sustained load */
 hitchMs:250,
 /** after an easing, wait this long before judging again so the new level settles */
 settleSeconds:8,
} as const;
/** Automatic reduction when frame time stays over budget. Pure and clocked by the frame gaps it is fed, so it is deterministic and testable.
 * It only ever eases (never raises) and never goes below Low; choosing a level in the menu resets it. */
export class DrawDistanceGovernor{
 level:DrawDistance;chosen:DrawDistance;
 private over=0;private settle=0;private sum=0;private count=0;
 constructor(level:DrawDistance=DRAW_DISTANCE_RULES.defaultLevel){this.level=this.chosen=isDrawDistance(level)?level:DRAW_DISTANCE_RULES.defaultLevel;}
 choose(level:DrawDistance){this.level=this.chosen=isDrawDistance(level)?level:this.chosen;this.over=this.settle=this.sum=this.count=0;}
 get eased(){return this.level!==this.chosen;}
 /** Feed one frame gap (ms). Returns the new level when this frame eased it, otherwise null. */
 observe(frameMs:number):DrawDistance|null{
  if(!Number.isFinite(frameMs)||frameMs<=0||frameMs>ADAPTIVE_RULES.hitchMs)return null;
  const dt=frameMs/1000;
  if(this.settle>0){this.settle=Math.max(0,this.settle-dt);return null;}
  if(this.level==='low'){this.over=this.sum=this.count=0;return null;}
  this.sum+=frameMs;this.count++;this.over+=dt;
  if(this.over<ADAPTIVE_RULES.overSeconds)return null;
  const mean=this.sum/Math.max(1,this.count);this.over=this.sum=this.count=0;
  if(mean<=ADAPTIVE_RULES.budgetMs)return null;
  this.level=easeDrawDistance(this.level);this.settle=ADAPTIVE_RULES.settleSeconds;return this.level;
 }
}
