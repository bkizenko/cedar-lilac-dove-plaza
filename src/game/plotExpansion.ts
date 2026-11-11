import type {Game} from './sim';
import type {Building,Unit} from './types';
import {BUILDINGS,BUILD_TIME} from './constants';
import {expandablePlot,expansionCost,plotArea,validPlot} from './plots';
import {compactGrainWorkplace} from './cerealRules';
import {DOUBLE_GRAIN_BATCH_RULES} from './production';

export function grainExpansionPracticeIssue(g:Game,b:Building){
 const recipe=b.type==='threshingFloor'?'threshCerealFloor':b.type==='grindingStone'?'grindGrainStation':b.type==='oven'?'bakeBreadOven':null;
 if(!recipe)return null;
 const practice=g.tribe(b.team).productionPractice;
 const batches=(practice?.[recipe]?.batches??0)+(b.type==='threshingFloor'?(practice?.winnowCerealFloor?.batches??0):0);
 const required=DOUBLE_GRAIN_BATCH_RULES.minimumDemonstrations;
 return batches<required?`Complete ${required} standard batches at this kind of workplace (${batches}/${required})`:null;
}
export function expansionStatus(g:Game,b:Building){
 const e=b.expansion;if(!e)return '';
 if(!e.paid){
  const cost=expansionCost(b,e),tribe=g.tribe(b.team);
  const missing=(['wood','stone','seeds'] as const).flatMap(kind=>{
   const amount=Math.ceil((cost[kind]||0)-(tribe[kind]||0));
   return amount>0?[`${amount} ${kind==='wood'?'logs':kind} missing`]:[];
  });
  return missing.length?missing.join(' · '):'Materials ready';
 }
 return e.progress>=1?'Clear people from the extension':`Expanding ${Math.floor(e.progress*100)}%`;
}
export function planExpansion(g:Game,b:Building,axis:'w'|'d',team=0){
 if(g.state.ended||b.team!==team||!g.finished(b)||!expandablePlot(b.type)||b.expansion)return false;
 const practiceIssue=grainExpansionPracticeIssue(g,b);
 if(practiceIssue){if(team===0)g.banner(practiceIssue,4);return false;}
 const size={w:b.w,d:b.d};size[axis]=Math.min(BUILDINGS[b.type][axis]*3,size[axis]+BUILDINGS[b.type][axis]);
 if(size[axis]<=b[axis]+1e-6||!validPlot(b.type,size))return false;
 const issue=g.placementIssue(b.type,b.x,b.z,b.team,size,b.id);if(issue){if(team===0)g.banner(issue,4);return false;}
 if(b.type==='farm'){
  const cost=expansionCost(b,size);
  if(!g.canAfford(b.team,cost)){if(team===0)g.banner(`Need ${Math.max(0,(cost.seeds||0)-(g.tribe(b.team).seeds||0))} more seeds to mark the extension`,4);return false;}
  const oldArea=plotArea(b),newArea=plotArea({...b,...size});g.spend(b.team,cost);
  if(b.crop){b.crop.planted*=oldArea/newArea;b.crop.tended*=oldArea/newArea;}
  b.w=size.w;b.d=size.d;g.state.walkDirty=true;g.workBoard.reset();
  if(team===0)g.banner('Field extended — new ground still needs sowing',3);return true;
 }
 b.expansion={...size,progress:0,paid:false};g.workBoard.reset();g.assignBuilders(b);
 if(team===0)g.banner('Extension planned — original area stays open',3);return true;
}
export function expansionWork(g:Game,u:Unit,b:Building,dt:number){
 const e=b.expansion;if(!e)return false;
 if(b.hp<=0||u.team!==b.team){u.node=null;u.order='idle';return true;}
 const issue=g.placementIssue(b.type,b.x,b.z,b.team,e,b.id);
 if(issue||g.state.weather==='storm'){u.workReason=issue||'Extension waits for the storm';return true;}
 const target={...b,w:e.w,d:e.d};
 const approach=g.interactionSpot(u,target);
 if(!approach){u.workReason='Extension needs a clear approach';u.node=null;u.order='idle';return true;}
 const grainSite=compactGrainWorkplace(b.type);
 if(Math.hypot(u.x-approach.x,u.z-approach.z)>(grainSite ? .55 : 1.2)) {u.tx=approach.x;u.tz=approach.z;g.steer(u,dt);return true;}
 const cost=expansionCost(b,e);
 if(!e.paid){if(!g.canAfford(b.team,cost)){u.workReason=expansionStatus(g,b);u.node=null;u.order='idle';return true;}g.spend(b.team,cost);e.paid=true;}
 u.vx=0;u.vz=0;u.stride+=dt*8;u.facing=Math.atan2(b.x-u.x,b.z-u.z);u.workReason='Building the extension';
 const oldArea=plotArea(b),newArea=plotArea(target);
 e.progress=Math.min(1,e.progress+dt/((BUILD_TIME[b.type]||16)*(newArea-oldArea)));
 if(e.progress<1)return true;
 if(b.type==='warehouse'&&g.state.units.some(p=>p.hp>0&&Math.abs(p.x-b.x)<e.w/2+p.r&&Math.abs(p.z-b.z)<e.d/2+p.r)){
   u.workReason='Clear people from the new store footprint';return true;
 }
 if(grainSite&&g.solidBuilding(b)&&g.state.units.some(p=>p.hp>0&&Math.abs(p.x-b.x)<e.w*.4+p.r+.15&&Math.abs(p.z-b.z)<e.d*.4+p.r+.15)){
   u.workReason='Clear people from the workshop extension';return true;
 }
 // New ground is unsown. Preserve absolute planted area and any existing harvest.
 if(b.crop)b.crop.planted*=oldArea/newArea;
 b.w=e.w;b.d=e.d;b.expansion=undefined;g.state.walkDirty=true;g.workBoard.reset();
 u.node=null;u.order='idle';u.buildOrder=undefined;if(b.team===0)g.banner(`${BUILDINGS[b.type].name} expanded`,3);return true;
}
