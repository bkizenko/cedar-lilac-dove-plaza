import type {Game} from './sim';
import type {Building,BldType,Cost,ResKind} from './types';
import {BUILDINGS} from './constants';
import {foodDemand,isDependent} from './settlement';
import {bridgeApproach} from './transport';

export const BUILD_MATERIALS:ResKind[]=['food','wood','stone','copper','iron'];
export function buildingCost(type:BldType):Cost {
  const d=BUILDINGS[type];
  return Object.fromEntries(BUILD_MATERIALS.map(k=>[k,d[k]||0]));
}
export function planMissing(g:Game,b:Building){
  const t=g.tribe(b.team);
  return BUILD_MATERIALS.map(kind=>({kind,amount:Math.max(0,Math.ceil((b.plannedCost?.[kind]||0)-(t?.[kind]||0)))})).filter(n=>n.amount>0);
}
export function constructionDemand(g:Game,team:number,kind:ResKind){
  return g.state.buildings.some(b=>b.team===team&&b.hp>0&&b.plannedCost&&!b.planPaused&&(b.plannedCost[kind]||0)>g.tribe(team)[kind]);
}
export function planStatus(g:Game,b:Building){
  if(!b.plannedCost)return g.finished(b)?'Complete':`Building ${Math.floor(b.build*100)}%`;
  if(b.planPaused)return 'Paused — materials remain available for other projects';
  const missing=planMissing(g,b);
  if(missing.length)return 'Waiting for '+missing.map(n=>`${n.amount} ${n.kind==='wood'?'logs':n.kind}`).join(' · ');
  if(g.state.weather==='storm')return 'Materials ready — waiting for the storm to pass';
  if(b.type!=='dock'&&b.type!=='bridge'&&!g.dryFoundation(b.type,b.x,b.z))return 'Waiting for the foundation to become dry again';
  if((b.plannedCost.food||0)>0&&g.tribe(b.team).food-(b.plannedCost.food||0)<foodDemand(g,b.team)*90)return 'Materials ready — preserving the village meal reserve';
  if(g.state.units.some(u=>u.hp>0&&Math.abs(u.x-b.x)<b.w*.5+u.r&&Math.abs(u.z-b.z)<b.d*.5+u.r))return 'Materials ready — clear people from the planned footprint';
  return 'Materials ready — waiting for a reachable, available adult';
}
/** Pay once, only from actual stores. Unfunded drawings grant no building benefits. */
export function fundConstructionPlans(g:Game){
  if(g.state.weather==='storm')return;
  for(const b of g.state.buildings){
    const cost=b.plannedCost;
    if(!cost||b.hp<=0||b.planPaused||!g.canAfford(b.team,cost))continue;
    if(b.type!=='dock'&&b.type!=='bridge'&&!g.dryFoundation(b.type,b.x,b.z))continue;
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
