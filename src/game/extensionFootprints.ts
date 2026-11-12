import type {Game} from './sim';
import type {Building} from './types';
import {BUILDINGS} from './constants';
import {excavationConstructionIssue,EXCAVATION_RULES} from './excavation';

/** Terrain checks for eraMode extension footprints (Grok W-World, W6). The existing
 * footprint expansion (`b.expansion`, plotExpansion.ts) grows scalable plots
 * symmetrically. An era extension (a wing, a rebuilt larger hall) grows one side of
 * any building while the original stays put; this query checks only the terrain and
 * placement side — rules for when an upgrade is allowed, its cost and its gameplay
 * value stay with the eraMode owner. Preview and commit should call the same check.
 * A passing result can be committed through `b.expansion` (dimensions) plus the
 * centre shift reported here; that wiring is the owner's. */
export const EXTENSION_RULES={version:1,maximumGrowFactor:3,foundationStepMetres:1,clearanceMetres:.5,apronMetres:1.5,sampleMetres:1} as const;
export type ExtensionSide='north'|'south'|'east'|'west';
type Rect={x:number;z:number;w:number;d:number};

/** North = −z, south = +z, east = +x, west = −x (world axes). */
export function extensionFootprint(b:Pick<Building,'x'|'z'|'w'|'d'>,side:ExtensionSide,grow:number){
 const along=side==='east'||side==='west'?'w':'d',sign=side==='east'||side==='south'?1:-1;
 const full:Rect={x:b.x+(along==='w'?sign*grow/2:0),z:b.z+(along==='d'?sign*grow/2:0),w:b.w+(along==='w'?grow:0),d:b.d+(along==='d'?grow:0)};
 const added:Rect=along==='w'?{x:b.x+sign*(b.w+grow)/2,z:b.z,w:grow,d:b.d}:{x:b.x,z:b.z+sign*(b.d+grow)/2,w:b.w,d:grow};
 return{full,added};
}
const overlaps=(a:Rect,b:Rect,m=0)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+m&&Math.abs(a.z-b.z)<(a.d+b.d)/2+m;
function* points(r:Rect,step:number){const nx=Math.max(1,Math.ceil(r.w/step)),nz=Math.max(1,Math.ceil(r.d/step));for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++)yield{x:r.x-r.w/2+i*r.w/nx,z:r.z-r.d/2+j*r.d/nz};}

export function extensionTerrainCheck(g:Game,b:Building,side:ExtensionSide,options:{growMetres?:number;team?:number}={}){
 const R=EXTENSION_RULES,team=options.team??b.team,base=BUILDINGS[b.type],axis=side==='east'||side==='west'?'w':'d',grow=options.growMetres??base[axis],issues:string[]=[];
 const {full,added}=extensionFootprint(b,side,grow);
 if(b.hp<=0||!g.finished(b))issues.push('Finish the building before extending it');
 if(b.expansion)issues.push('An expansion is already under way');
 if(grow<=0)issues.push('Choose a size for the extension');
 if(full[axis]>base[axis]*R.maximumGrowFactor+1e-6)issues.push(`At most ${R.maximumGrowFactor}× the original ${axis==='w'?'width':'depth'}`);
 if(Math.max(Math.abs(full.x)+full.w/2,Math.abs(full.z)+full.d/2)>g.world.size/2-3)issues.push('The extension would reach the map edge');
 if(!g.dryFoundation(b.type,full.x,full.z,0,{w:full.w,d:full.d} as never))issues.push("Can't extend into water or below the flood line");
 const pts=[...points(added,R.sampleMetres)];
 if(team===0&&pts.some(p=>!g.exploredAt(p.x,p.z)))issues.push('Explore the extension ground first');
 // territory: the wing may not reach into another community's land
 const n=Math.round(Math.sqrt(g.territory.length)),cell=g.world.size/n,owner=(x:number,z:number)=>g.territory[Math.min(n-1,Math.max(0,Math.floor((z+g.world.size/2)/cell)))*n+Math.min(n-1,Math.max(0,Math.floor((x+g.world.size/2)/cell)))];
 if(pts.some(p=>{const o=owner(p.x,p.z);return o!==255&&o!==254&&o!==b.team;}))issues.push("The extension would reach into another community's land");
 for(const o of g.state.buildings){if(o.id===b.id||o.hp<=0)continue;const r={x:o.x,z:o.z,w:o.expansion?.w??o.w,d:o.expansion?.d??o.d};if(overlaps(added,r,R.clearanceMetres)){issues.push(`Too close to the ${BUILDINGS[o.type]?.name??o.type}`);break;}}
 const bank=excavationConstructionIssue(g,b.type,added.x,added.z,added.w,added.d);if(bank)issues.push(bank);
 for(const list of [g.state.trees,g.state.stones,g.state.forage,g.state.copper,g.state.iron])if(list.some(nd=>nd.amount>0&&overlaps(added,{x:nd.x,z:nd.z,w:0,d:0},R.clearanceMetres))){issues.push('Clear resources from the extension ground first');break;}
 // foundation: the wing shares the building's floor (b.y); measure the step and the levelling it would take
 let step=0,cut=0,fill=0;const cellArea=added.w*added.d/Math.max(1,pts.length);
 for(const p of pts){const dh=g.height(p.x,p.z)-b.y;step=Math.max(step,Math.abs(dh));if(dh>0)cut+=dh*cellArea;else fill-=dh*cellArea;}
 if(step>R.foundationStepMetres)issues.push(`The extension ground is ${step.toFixed(1)} m off the floor — level it first`);
 // access: at least one side of the whole new footprint keeps a clear, walkable apron
 const sides=[[1,0],[-1,0],[0,1],[0,-1]].filter(([sx,sz])=>{const samples=sx?[-.3,0,.3].map(t=>({x:full.x+sx*(full.w/2+R.apronMetres),z:full.z+t*full.d})):[-.3,0,.3].map(t=>({x:full.x+t*full.w,z:full.z+sz*(full.d/2+R.apronMetres)}));
  return samples.every(p=>g.walkable(p.x,p.z)&&!g.state.buildings.some(o=>o.id!==b.id&&o.hp>0&&g.solidBuilding(o)&&overlaps({x:p.x,z:p.z,w:0,d:0},o,.3)));}).length;
 if(sides===0)issues.push('The extension would close the last approach to the building');
 return{issues,side,growMetres:grow,footprint:full,added,centreShift:{x:+(full.x-b.x).toFixed(3),z:+(full.z-b.z).toFixed(3)},
  foundation:{stepMetres:+step.toFixed(2),cutCubicMetres:+cut.toFixed(1),fillCubicMetres:+fill.toFixed(1),levellingWorkSeconds:Math.round((cut+fill)*EXCAVATION_RULES.workSecondsPerCubicMeter)},openApproachSides:sides};
}
/** Every side a building could grow toward, best first (fewest issues, smallest step). */
export function extensionOptions(g:Game,b:Building,growMetres?:number,team=b.team){
 return (['north','south','east','west'] as ExtensionSide[]).map(s=>extensionTerrainCheck(g,b,s,{growMetres,team})).sort((a,c)=>a.issues.length-c.issues.length||a.foundation.stepMetres-c.foundation.stepMetres);
}
