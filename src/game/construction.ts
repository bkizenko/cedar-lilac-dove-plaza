import {expansionCost,plotArea,type PlotSize} from './plots';
import type {Game} from './sim';
import type {Building,BldType,Cost,ResKind,Unit} from './types';
import {BUILDINGS} from './constants';
import {foodDemand,isDependent} from './settlement';
import {bridgeApproach,bridgeCostScale,type BridgeSpan} from './transport';

export const BUILD_MATERIALS:ResKind[]=['food','wood','stone','copper','iron'];
export function buildingCost(type:BldType,g?:Game,team=0,size?:PlotSize,span?:BridgeSpan):Cost {
  const d=BUILDINGS[type];
  const cost:Cost=Object.fromEntries(BUILD_MATERIALS.map(k=>[k,d[k]||0]));
  if(type==='bridge'&&span){cost.wood=Math.ceil((cost.wood||0)*bridgeCostScale(span));cost.stone=Math.ceil((cost.stone||0)*bridgeCostScale(span));}
  if(type==='farm')cost.seeds=4;
  if(type==='townhall'&&g){
    const halls=g.state.buildings.filter(b=>b.team===team&&b.type==='townhall'&&b.hp>0).length;
    cost.wood=halls===0?(team===0?0:20):40+20*(halls-1);
  }
  if(size){const area=plotArea({type,...size});for(const key of Object.keys(cost) as (keyof Cost)[])cost[key]=Math.ceil((cost[key]||0)*area);}
  return cost;
}
/** Rebalance unpaid drawings only; never refund already-used construction materials. */
export function discountTownhallPlans(g:Game){
  const counts=new Map<number,number>();
  for(const b of g.state.buildings){
    if(b.type!=='townhall'||b.hp<=0)continue;
    const previous=counts.get(b.team)||0;counts.set(b.team,previous+1);
    if(b.plannedCost)b.plannedCost.wood=Math.min(b.plannedCost.wood||0,40+20*Math.max(0,previous-1));
  }
}
export function planMissing(g:Game,b:Building){
  const t=g.tribe(b.team);
  return [...BUILD_MATERIALS,'seeds' as const].map(kind=>({kind,amount:Math.max(0,Math.ceil((b.plannedCost?.[kind]||0)-(t?.[kind]||0)))})).filter(n=>n.amount>0);
}
export function constructionDemand(g:Game,team:number,kind:ResKind){
  return g.state.buildings.some(b=>b.team===team&&b.hp>0&&((b.plannedCost&&!b.planPaused&&(b.plannedCost[kind]||0)>g.tribe(team)[kind])||(b.expansion&&!b.expansion.paid&&kind==='wood'&&(expansionCost(b,b.expansion).wood||0)>g.tribe(team).wood)));
}
export function planStatus(g:Game,b:Building){
  if(!b.plannedCost)return g.finished(b)?'Complete':`Building ${Math.floor(b.build*100)}%`;
  if(b.planPaused)return 'Paused — materials remain available for other projects';
  const missing=planMissing(g,b);
  if(missing.length)return 'Waiting for '+missing.map(n=>`${n.amount} ${n.kind==='wood'?'logs':n.kind}`).join(' · ');
  if(g.state.weather==='storm')return 'Materials ready — waiting for the storm to pass';
  if(b.type!=='dock'&&b.type!=='bridge'&&!g.dryFoundation(b.type,b.x,b.z,0,b))return 'Waiting for the foundation to become dry again';
  if((b.plannedCost.food||0)>0&&g.tribe(b.team).food-(b.plannedCost.food||0)<foodDemand(g,b.team)*90)return 'Materials ready — preserving the village meal reserve';
  if(g.state.units.some(u=>u.hp>0&&Math.abs(u.x-b.x)<b.w*.5+u.r&&Math.abs(u.z-b.z)<b.d*.5+u.r))return 'Materials ready — clear people from the planned footprint';
  return 'Materials ready — waiting for a reachable, available adult';
}
/** Pay once, only from actual stores. Unfunded drawings grant no building benefits. */
export function fundConstructionPlans(g:Game,preferred?:Building){
  discountTownhallPlans(g);
  // Convert only unpaid old farm drawings. Completed farms keep their progress.
  for(const b of g.state.buildings)if(b.type==='farm'&&b.plannedCost){b.plannedCost.wood=0;b.plannedCost.seeds=Math.ceil(4*plotArea(b));}
  if(g.state.weather==='storm')return;
  for(const b of preferred?[preferred]:g.state.buildings){
    const cost=b.plannedCost;
    if(!cost||b.hp<=0||b.planPaused||!g.canAfford(b.team,cost))continue;
    if(b.type!=='dock'&&b.type!=='bridge'&&!g.dryFoundation(b.type,b.x,b.z,0,b))continue;
    if((cost.food||0)>0&&g.tribe(b.team).food-(cost.food||0)<foodDemand(g,b.team)*90)continue;
    if(g.state.units.some(u=>u.hp>0&&Math.abs(u.x-b.x)<b.w*.5+u.r&&Math.abs(u.z-b.z)<b.d*.5+u.r))continue;
    const available=g.state.units.some(u=>u.team===b.team&&u.type==='worker'&&u.hp>0&&!isDependent(g,u)&&u.carry===0&&
      !u.envoy&&!u.scout&&!u.expedition&&!u.foundingJourney&&!u.visit&&!u.recalled&&!u.studyCrop&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&
      ['idle','gather','build'].includes(u.order)&&
      (b.type==='bridge'?!!bridgeApproach(g,u,b):g.workBoard.connected(g,u.x,u.z,b.x,b.z)));
    if(!available)continue;
    g.spend(b.team,cost);b.plannedCost=undefined;b.planPaused=undefined;
    g.state.walkDirty=true;g.workBoard.reset();
    if(b.team===0){g.banner(`${BUILDINGS[b.type].name}: materials reserved — construction can begin`,3);g.onSfx('place');}
  }
}

/** A direct RTS order supersedes ordinary jobs while retaining carried/paid goods. */
export function orderConstruction(g:Game,b:Building,workers:Unit[]=g.selectedUnits()){
  if(b.team!==0||b.hp<=0||(g.finished(b)&&!b.expansion))return false;
  const chosen=(workers.length?workers:g.state.units.filter(u=>u.team===0&&u.type==='worker'&&u.hp>0&&!isDependent(g,u)&&!u.emergency)
    .sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z)).slice(0,2))
    .filter(u=>u.team===0&&u.type==='worker'&&u.hp>0&&!isDependent(g,u));
  if(!chosen.length){g.banner('Select adult residents to build this project.',3);return false;}
  b.planPaused=b.plannedCost?false:undefined;
  for(const u of chosen){
    g.interruptMission(u);u.buildOrder=b.id;u.job=null;u.jobLock=false;u.huntOnly=false;
    u.order=u.carry>0?'return':'build';u.node=u.carry>0?null:b;u.workReason=u.carry>0?'Delivering cargo, then building':'Assigned to this construction';
  }
  g.workBoard.reset();g.banner(`${chosen.length} builders assigned to ${BUILDINGS[b.type].name}. ${planStatus(g,b)}`,4);return true;
}
export function directedConstruction(g:Game,u:Unit,dt:number){
  if(u.buildOrder===undefined||u.emergency)return false;
  const b=g.state.buildings.find(b=>b.id===u.buildOrder&&b.team===u.team&&b.hp>0);
  if(!b||(g.finished(b)&&!b.expansion)){u.buildOrder=undefined;u.node=null;u.order=u.carry>0?'return':'idle';return false;}
  if(u.carry>0){u.order='return';u.node=null;return false;}
  u.order='build';u.node=b;
  if(b.planPaused){u.workReason='Construction plan paused';return true;}
  if(b.plannedCost){
    // Walk outside the footprint first, so funding cannot turn a drawing into
    // a solid obstacle around the very person ordered to build it.
    if(Math.abs(u.x-b.x)<b.w*.5+u.r&&Math.abs(u.z-b.z)<b.d*.5+u.r){
      const exits=Array.from({length:32},(_,i)=>{const a=i*Math.PI/16,sx=Math.sin(a),sz=Math.cos(a),r=Math.min((b.w*.5+u.r+1.2)/(Math.abs(sx)||1e-6),(b.d*.5+u.r+1.2)/(Math.abs(sz)||1e-6));return {x:b.x+sx*r,z:b.z+sz*r};})
        .filter(p=>g.walkable(p.x,p.z)&&g.workBoard.connected(g,u.x,u.z,p.x,p.z)&&g.canStep(u,p.x,p.z))
        .sort((a,c)=>Math.hypot(u.x-a.x,u.z-a.z)-Math.hypot(u.x-c.x,u.z-c.z));
      const at=exits[0];if(at){u.tx=at.x;u.tz=at.z;g.steer(u,dt);}u.workReason='Clearing the planned footprint';return true;
    }
    fundConstructionPlans(g,b);
    if(b.plannedCost){u.workReason=planStatus(g,b);return true;}
  }
  g.buildAI(u,dt);return true;
}
