import type {Game} from './sim';
import {TRAIL_GRID,pathPace,type Trail} from './trails';

/** GW-12 smooth, less pronounced trails (Grok W-World, W7). Pure query, no save
 * state and no change to `wearTrail` / `pathPace`. Claude opts in by drawing
 * these ribbons instead of one instanced ellipse per 4 m cell.
 *
 * Adjacent worn cells are chained by position and heading, then Chaikin-smoothed.
 * Display wear is scaled down so packed earth reads as a narrow path, not a
 * wide tile stamp. Gameplay speed along the trail is unchanged. */
export const TRAIL_RIBBON_RULES={version:1,minWear:.25,linkMetres:6,headingLimit:.7,chaikinPasses:2,displayScale:.45,minDisplayWear:.08,maxWidthMetres:1.15,cellWidthFactor:.65} as const;

export type TrailRibbonPoint={x:number;z:number;wear:number;displayWear:number;angle:number};
export type TrailRibbon={points:TrailRibbonPoint[];lengthMetres:number;widthMetres:number};

type Located=Trail&{x:number;z:number};

export function trailDisplayWear(wear:number){const R=TRAIL_RIBBON_RULES;return wear<=0?0:Math.min(1,Math.max(R.minDisplayWear,wear*R.displayScale));}

function locate(t:Trail,size:number):Located|null{
 const cell=size/TRAIL_GRID,ix=t.cell%TRAIL_GRID,iz=Math.floor(t.cell/TRAIL_GRID),cx=(ix+.5)*cell-size/2,cz=(iz+.5)*cell-size/2;
 const x=t.x??cx,z=t.z??cz;if(!Number.isFinite(x)||!Number.isFinite(z))return null;return{...t,x,z};}

function chaikin(pts:TrailRibbonPoint[],passes:number){let cur=pts;for(let p=0;p<passes;p++){if(cur.length<3)break;const next=[cur[0]];for(let i=0;i<cur.length-1;i++){const a=cur[i],b=cur[i+1];
  const mix=(t:number):TrailRibbonPoint=>{const ang=a.angle+Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle))*t;return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,wear:a.wear+(b.wear-a.wear)*t,displayWear:trailDisplayWear(a.wear+(b.wear-a.wear)*t),angle:Math.atan2(Math.sin(ang),Math.cos(ang))};};
  next.push(mix(.25),mix(.75));}next.push(cur.at(-1)!);cur=next;}return cur;}

function compatible(a:Located,b:Located){const R=TRAIL_RIBBON_RULES,d=Math.hypot(b.x-a.x,b.z-a.z);if(d>R.linkMetres||d<1e-4)return false;
 const path=Math.atan2(b.x-a.x,b.z-a.z),delta=(h:number)=>Math.abs(Math.atan2(Math.sin(h),Math.cos(h)));
 return Math.min(delta(path-a.angle),delta(path-a.angle-Math.PI),delta(path-b.angle),delta(path-b.angle-Math.PI))<=R.headingLimit;}

function extend(used:Set<Trail>,from:Located,all:Located[],dir:1|-1){const out:Located[]=[];let cur=from;
 for(;;){let best:Located|null=null,bd=Infinity;for(const t of all){if(used.has(t)||t===cur)continue;if(!compatible(cur,t))continue;const d=Math.hypot(t.x-cur.x,t.z-cur.z);if(d<bd){bd=d;best=t;}}
  if(!best)break;used.add(best);if(dir>0)out.push(best);else out.unshift(best);cur=best;}return out;}

function asPoint(t:Located):TrailRibbonPoint{return{x:t.x,z:t.z,wear:t.wear,displayWear:trailDisplayWear(t.wear),angle:t.angle};}
function lengthOf(pts:readonly {x:number;z:number}[]){let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z);return L;}

/** Continuous, fainter ribbons from the saved trail cells. Does not write state. */
export function trailRibbons(g:Pick<Game,'state'|'world'>):TrailRibbon[]{
 const R=TRAIL_RIBBON_RULES,size=g.world.size??1040,all=(g.state.trails||[]).map(t=>locate(t,size)).filter((t):t is Located=>!!t&&t.wear>=R.minWear);
 const used=new Set<Trail>(),ribbons:TrailRibbon[]=[];
 const ordered=all.slice().sort((a,b)=>b.wear-a.wear||a.cell-b.cell);
 for(const seed of ordered){if(used.has(seed))continue;used.add(seed);
  const chain=[...extend(used,seed,all,-1),seed,...extend(used,seed,all,1)];
  const raw=chain.map(asPoint),points=chaikin(raw,R.chaikinPasses),wear=points.reduce((a,p)=>a+p.wear,0)/Math.max(1,points.length);
  const cell=size/TRAIL_GRID,width=Math.min(R.maxWidthMetres,cell*R.cellWidthFactor*(.55+trailDisplayWear(wear)*.45));
  ribbons.push({points,lengthMetres:+lengthOf(points).toFixed(2),widthMetres:+width.toFixed(3)});}
 return ribbons;
}

/** Sanity helper for tests: gameplay pace is untouched by building ribbons. */
export function trailPaceUnchanged(g:Game,x:number,z:number){const before=pathPace(g,x,z);trailRibbons(g);return pathPace(g,x,z)===before?before:NaN;}
