import type {Game} from './sim';
import type {Building} from './types';
import {sampleSite,type SiteFootprint} from './siteSample';
import {sampleWorldHeight} from './worldgen';
import {EXCAVATION_RULES,cutAmount,cutBounds,excavationCuts,excavationDepth,excavationIssue,excavationHeightAt,setExcavationDepth,configureExcavation} from './excavation';

/** Wonder earthworks as real labour (Grok W-World, W5). A wonder cut is executed as
 * ordinary excavation digs on a lattice — the same trench buildings, the same
 * workers, the same `excavationWorkNeed` volume × 6 s/m³ and the same save records
 * and validators. Nothing here edits terrain directly and nothing is free:
 * - preview (`planWonderEarthwork`) and commit (`executeWonderEarthwork`) share
 *   `stageIssue`, and commit is all-or-nothing;
 * - fill is never conjured: material a design would need to add is reported as
 *   `fillCubicMetres` (unexecuted) — earth moving from cut to fill is a Codex hook;
 * - one dig lowers ground by at most 2 m (the excavation rule), so deeper designs
 *   report `unreachedMetres` instead of silently deepening. */
export const WONDER_EARTHWORK_RULES={version:1,latticeMetres:4,minimumDigMetres:.25,trenchLimit:56,integrationMetres:.5} as const;
export type EarthworkFamily='canyonCistern'|'assemblyCourt';
export type EarthworkStage={x:number;z:number;depth:number;needMetres:number;issue:string|null};
export type EarthworkPlan={version:1;family:EarthworkFamily;team:number;footprint:SiteFootprint;stages:EarthworkStage[];
 floorMetres:number;designCutCubicMetres:number;plannedCutCubicMetres:number;fillCubicMetres:number;workSeconds:number;
 unreachedMetres:number;residualMeanMetres:number;rake:number;issues:string[]};
const raw=(g:Game,x:number,z:number)=>sampleWorldHeight(g.world,x,z);
const allowed=EXCAVATION_RULES.depths;

/** The design surface: cistern = flat floor `depth` below the rim (mean ground);
 * court = bema at the centre with tiers raked uphill at `rake` m/m (as wonderTerrainCut). */
export function earthworkDesign(g:Game,family:EarthworkFamily,f:SiteFootprint,o:{depthMetres?:number;rake?:number}={}){
 const s=sampleSite(g,f),depth=o.depthMetres??2,up={x:-Math.sin(s.downhillRadians),z:-Math.cos(s.downhillRadians)};
 if(family==='canyonCistern'){const floor=s.meanHeightMetres-depth;return{floor,rake:0,at:()=>floor};}
 // executable court is cut-only (a sunken court): the orchestra is levelled to its own
 // lowest ground and the tiers rise from its edge at half the natural grade, so the
 // tiers are carved into the hillside rather than built up from fill nobody has.
 const r0=Math.min(f.w,f.d)/4,rake=o.rake??Math.min(.45,Math.max(.05,s.meanGrade/2));let floor=Infinity;
 for(let a=0;a<16;a++)for(const r of [0,r0/2,r0]){const x=f.x+Math.sin(a/16*Math.PI*2)*r,z=f.z+Math.cos(a/16*Math.PI*2)*r;floor=Math.min(floor,g.height(x,z));}
 return{floor,rake,at:(x:number,z:number)=>floor+Math.max(0,(x-f.x)*up.x+(z-f.z)*up.z-r0)*rake};
}
const quantise=(need:number)=>{if(need<WONDER_EARTHWORK_RULES.minimumDigMetres)return 0;let best=allowed[0];for(const d of allowed)if(Math.abs(d-need)<Math.abs(best-need))best=d;return best;};
const stub=(x:number,z:number,team:number)=>({id:-1,team,x,z,w:4,d:4});
/** Team 0 validation runs at the stage's own depth; the placement check reads the
 * player's chosen depth, so it is temporarily set and always restored. */
function withDepth<T>(g:Game,team:number,depth:number,fn:()=>T):T{if(team!==0)return fn();const before=excavationDepth(g);setExcavationDepth(g,depth);try{return fn();}finally{setExcavationDepth(g,before);}}
export function stageIssue(g:Game,s:Pick<EarthworkStage,'x'|'z'|'depth'>,team=0){
 return withDepth(g,team,s.depth,()=>excavationIssue(g,stub(s.x,s.z,team),s.depth)??g.placementIssue('trench',s.x,s.z,team));
}
function lattice(f:SiteFootprint,step:number){const out:{x:number;z:number}[]=[],rot=f.rotation??0,c=Math.cos(rot),sn=Math.sin(rot),nu=Math.max(1,Math.round(f.w/step)),nv=Math.max(1,Math.round(f.d/step));
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const u=(i-(nu-1)/2)*step,v=(j-(nv-1)/2)*step;out.push({x:f.x+u*c+v*sn,z:f.z-u*sn+v*c});}return out;}
/** Union of stage cuts (max, as the terrain applies them) over existing excavations. */
function cutField(g:Game,stages:Pick<EarthworkStage,'x'|'z'|'depth'>[]){
 const cuts=stages.map(s=>({...stub(s.x,s.z,0),depth:s.depth}));
 return{cuts,lowering:(x:number,z:number)=>{let a=0;for(const c of cuts)a=Math.max(a,cutAmount(c,x,z));const h=raw(g,x,z),existing=h-excavationHeightAt(g,x,z,h);return Math.max(0,a-existing);}};
}
export function planWonderEarthwork(g:Game,family:EarthworkFamily,f:SiteFootprint,o:{depthMetres?:number;rake?:number;team?:number}={}):EarthworkPlan{
 const R=WONDER_EARTHWORK_RULES,team=o.team??0,design=earthworkDesign(g,family,f,o),issues:string[]=[];let unreached=0;
 const stages:EarthworkStage[]=[];
 // each dig takes the deepest allowed depth up to its need that validates (a shallower
 // dig has narrower banks, so it can stand nearer a steep catchment); the shortfall
 // is part of the residual, never hidden
 for(const p of lattice(f,R.latticeMetres)){const need=g.height(p.x,p.z)-design.at(p.x,p.z),want=quantise(need);unreached=Math.max(unreached,need-allowed[allowed.length-1]);if(!want)continue;
  let chosen:EarthworkStage|null=null;for(const depth of allowed.filter(d=>d<=want).reverse()){const st={x:p.x,z:p.z,depth,needMetres:+need.toFixed(2),issue:null as string|null};st.issue=stageIssue(g,st,team);if(!chosen)chosen=st;if(!st.issue){chosen=st;break;}}
  if(chosen)stages.push(chosen);}
 const existing=g.state.buildings.filter(b=>b.team===team&&b.type==='trench'&&b.hp>0).length;
 if(!stages.length)issues.push('The ground already meets the design — nothing to dig');
 if(existing+stages.length>R.trenchLimit)issues.push(`Needs ${stages.length} digs; the community can hold ${R.trenchLimit-existing} more excavations`);
 const blocked=new Map<string,number>();for(const s of stages)if(s.issue)blocked.set(s.issue,(blocked.get(s.issue)||0)+1);for(const [k,n] of blocked)issues.push(`${n} dig${n>1?'s':''}: ${k}`);
 if(unreached>.25)issues.push(`The design is ${unreached.toFixed(1)} m deeper than one dig can reach (2 m)`);
 // volumes on the real terrain at 0.5 m
 const field=cutField(g,stages),step=R.integrationMetres,cell=step*step;let planned=0,designCut=0,fill=0,res=0,n=0;
 const rot=f.rotation??0,c=Math.cos(rot),sn=Math.sin(rot);
 for(let v=-f.d/2+step/2;v<f.d/2;v+=step)for(let u=-f.w/2+step/2;u<f.w/2;u+=step){const x=f.x+u*c+v*sn,z=f.z-u*sn+v*c,h=g.height(x,z),d=h-design.at(x,z);if(d>0)designCut+=d*cell;else fill-=d*cell;res+=Math.abs(h-field.lowering(x,z)-Math.min(h,design.at(x,z)));n++;}
 if(field.cuts.length){let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const k of field.cuts){const b=cutBounds(k);x0=Math.min(x0,b.x0);x1=Math.max(x1,b.x1);z0=Math.min(z0,b.z0);z1=Math.max(z1,b.z1);}
  for(let x=x0+step/2;x<x1;x+=step)for(let z=z0+step/2;z<z1;z+=step)planned+=field.lowering(x,z)*cell;}
 const work=Math.max(stages.length*EXCAVATION_RULES.minimumWorkSeconds,planned*EXCAVATION_RULES.workSecondsPerCubicMeter);
 return{version:1,family,team,footprint:{...f},stages,floorMetres:+design.floor.toFixed(2),designCutCubicMetres:+designCut.toFixed(1),plannedCutCubicMetres:+planned.toFixed(1),
  fillCubicMetres:+fill.toFixed(1),workSeconds:Math.round(work),unreachedMetres:+Math.max(0,unreached).toFixed(2),residualMeanMetres:+(res/Math.max(1,n)).toFixed(3),rake:design.rake,issues};
}
const blocking=(p:EarthworkPlan)=>p.issues.filter(i=>!i.startsWith('The design is'));
type Dig=Building&{excavationDepth?:number;excavationVolume?:number;excavationWorkSeconds?:number};
const overlaps=(a:ReturnType<typeof cutBounds>,b:ReturnType<typeof cutBounds>)=>Math.max(a.x0,b.x0)<Math.min(a.x1,b.x1)&&Math.max(a.z0,b.z0)<Math.min(a.z1,b.z1);
const boundsOf=(s:Pick<EarthworkStage,'x'|'z'|'depth'>)=>cutBounds({...stub(s.x,s.z,0),depth:s.depth});
const digAt=(g:Game,team:number,s:Pick<EarthworkStage,'x'|'z'>)=>g.state.buildings.find(b=>b.type==='trench'&&b.team===team&&b.hp>0&&Math.abs(b.x-s.x)<.01&&Math.abs(b.z-s.z)<.01) as Dig|undefined;
/** Overlapping banks dug at the same time would each be charged for the shared soil,
 * so digs are laid out in batches whose banks do not overlap any unfinished dig:
 * each later dig is charged only the soil that is left (the union volume). */
function layBatch(g:Game,plan:EarthworkPlan,validate:boolean){
 const team=plan.team,cut=new Set(excavationCuts(g).map(c=>c.buildingId)),busy:ReturnType<typeof cutBounds>[]=[],ids:number[]=[];
 for(const s of plan.stages){const b=digAt(g,team,s);if(b&&!cut.has(b.id))busy.push(boundsOf(s));}
 const todo=plan.stages.filter(s=>!digAt(g,team,s)).sort((a,b)=>b.needMetres-a.needMetres);
 for(const s of todo){const bb=boundsOf(s);if(busy.some(o=>overlaps(o,bb)))continue;
  if(validate&&stageIssue(g,s,team))continue;
  const before=g.state.buildings.length,ok=withDepth(g,team,s.depth,()=>g.placeBuilding('trench',s.x,s.z,team));
  const b=ok&&g.state.buildings.length>before?g.state.buildings[g.state.buildings.length-1] as Dig:null;if(!b)continue;
  if(b.excavationDepth!==s.depth){b.excavationDepth=s.depth;b.excavationVolume=undefined;b.excavationWorkSeconds=undefined;configureExcavation(g,b);}
  busy.push(bb);ids.push(b.id);}
 return ids;
}
/** All-or-nothing commission: every stage must pass the preview's own check now
 * (resources cleared, banks clear, no water); then the first batch is laid out. */
export function executeWonderEarthwork(g:Game,plan:EarthworkPlan):{ok:boolean;reason?:string;buildingIds:number[]}{
 const fresh=replan(g,plan),block=blocking(fresh);if(block.length)return{ok:false,reason:block[0],buildingIds:[]};
 const ids=layBatch(g,fresh,false);return ids.length?{ok:true,buildingIds:ids}:{ok:false,reason:'A dig could not be laid out',buildingIds:[]};
}
function replan(g:Game,plan:EarthworkPlan){return planWonderEarthwork(g,plan.family,plan.footprint,{team:plan.team,depthMetres:plan.family==='canyonCistern'?sampleSite(g,plan.footprint).meanHeightMetres-plan.floorMetres:undefined,rake:plan.rake});}
/** Called by the owner of the wonder (its tick or UI) to lay out the next batch once
 * earlier digs are committed. Each new dig is validated with the same check first.
 * Derived from the live digs, so it needs no extra save state. */
export function continueWonderEarthwork(g:Game,plan:EarthworkPlan){return layBatch(g,plan,true);}
/** Progress from the live digs: stages laid/dug, labour paid vs needed so far, and
 * how far the real ground is from the design (cut-only) inside the footprint. */
export function wonderEarthworkProgress(g:Game,plan:EarthworkPlan){
 const cut=new Set(excavationCuts(g).map(c=>c.buildingId)),digs=plan.stages.map(s=>digAt(g,plan.team,s)).filter(Boolean) as Dig[];
 let paid=0,need=0;for(const b of digs){const w=b.excavationWorkSeconds??EXCAVATION_RULES.minimumWorkSeconds;need+=w;paid+=Math.min(1,b.build)*w;}
 const dug=digs.filter(b=>cut.has(b.id)).length;
 return{stages:plan.stages.length,laid:digs.length,dug,paidWorkSeconds:Math.round(paid),neededWorkSeconds:Math.round(need),complete:dug===plan.stages.length,buildingIds:digs.map(b=>b.id)};
}
