import {fishingBank,fishRecoveryEstimateSeconds,fishHabitatCell,FISHERY_RULES} from './fishing';
import {mulberry32} from './rng';
import {lakeContains} from './localWater';
import {beginClayGather,clayIssue,clayWorkerAvailable,POTTERY_RULES,surveyClay} from './pottery';
import type {Game} from './sim';

type Point = {x:number;z:number};
export type WaterReach = Point & {kind:'river'|'lake'};
export const WATER_REACH_RULES = {radius:24,wetStep:2,bankTolerance:7,habitatCell:FISHERY_RULES.habitatCell,minimumFish:36,fishCapacityRange:24} as const;

const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const wet=(g:Game,x:number,z:number)=>g.height(x,z)<=g.waterAt(x,z)+.04;

export function waterReachAt(g:Game,point:Point):WaterReach|null{
 if(!g.exploredAt(point.x,point.z)||!wet(g,point.x,point.z))return null;
 for(const body of g.world.waterBodies??[]){
  if(body.kind==='lake'&&lakeContains(body,point.x,point.z))return {...point,kind:'lake'};
 }
 for(const river of g.world.rivers){
  for(let i=1;i<river.pts.length;i++){
   const a=river.pts[i-1],b=river.pts[i],dx=b.x-a.x,dz=b.z-a.z;
   const t=Math.min(1,Math.max(0,((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz||1)));
   if(distance(point,{x:a.x+t*dx,z:a.z+t*dz})<=river.w*.5+2)return {...point,kind:'river'};
  }
 }
 return null;
}

/** Bank nodes in older worlds can be a few metres above the waterline. */
function sameWater(g:Game,reach:WaterReach,point:Point,bankTolerance=0){
 const span=distance(reach,point);
 if(span>WATER_REACH_RULES.radius||!g.exploredAt(point.x,point.z))return false;
 const count=Math.max(1,Math.ceil(span/WATER_REACH_RULES.wetStep));
 for(let step=0;step<=count;step++){
  const t=step/count;
  if((1-t)*span<=bankTolerance)break;
  if(!wet(g,reach.x+(point.x-reach.x)*t,reach.z+(point.z-reach.z)*t))return false;
 }
 return bankTolerance>0||wet(g,point.x,point.z);
}

/** Survey deterministic habitat cells once. A depleted saved node still
 * occupies its cell, including when a dock has already surveyed that water. */
export function surveyReachFish(g:Game,reach:WaterReach){
 const {radius,habitatCell:cell,minimumFish,fishCapacityRange}=WATER_REACH_RULES;
 const knownCells=new Set(g.state.fish.map(node=>fishHabitatCell(node.x,node.z)));
 for(let cz=Math.floor((reach.z-radius)/cell);cz<=Math.floor((reach.z+radius)/cell);cz++){
  for(let cx=Math.floor((reach.x-radius)/cell);cx<=Math.floor((reach.x+radius)/cell);cx++){
   if(knownCells.has(`${cx}:${cz}`))continue;
   const center={x:(cx+.5)*cell,z:(cz+.5)*cell};
   let bank:Point|undefined;
   for(const offset of [0,-2,2,-4,4]){
    for(const other of [0,-2,2,-4,4]){
     const p={x:center.x+offset,z:center.z+other};
     if(!sameWater(g,reach,p)||![[4,0],[-4,0],[0,4],[0,-4]].some(([dx,dz])=>g.walkable(p.x+dx,p.z+dz)))continue;
     bank=p;break;
    }
    if(bank)break;
   }
   if(!bank)continue;
   const random=mulberry32(g.state.seed^Math.imul(cx,73856093)^Math.imul(cz,19349663));
   const capacity=minimumFish+Math.floor(random()*fishCapacityRange);
   g.state.fish.push({id:g.id(),kind:'fish',...bank,y:g.waterAt(bank.x,bank.z)+.1,
    amount:capacity,maxAmt:capacity,regenT:0,pressure:0,scale:1,rich:1});
  }
 }
}

export function waterReachReport(g:Game,reach:WaterReach){
 const fish=g.state.fish.filter(node=>sameWater(g,reach,node,wet(g,node.x,node.z)?0:WATER_REACH_RULES.bankTolerance));
 const clay=(g.state.clay?.deposits??[]).filter(deposit=>deposit.surveyedBy.includes(0)&&
  sameWater(g,reach,{x:deposit.sourceX,z:deposit.sourceZ}));
 const workers=g.idleWorkers();
 const grounds=fish.filter(node=>node.amount>=1);
 const fisher=grounds.flatMap(node=>{
  const assigned=g.state.units.filter(u=>u.hp>0&&u.order==='gather'&&u.node===node).length;
  if(assigned>=2)return [];
  const person=workers.find(u=>!!fishingBank(g,u,node));
  return person?[{node,person}]:[];
 })[0];
 const clayWorkers=g.state.units.filter(u=>clayWorkerAvailable(g,u)&&(!u.jobLock||u.foodRole===true||!!u.clayWork))
  .sort((a,b)=>Number(b.selected)-Number(a.selected)||distance(a,reach)-distance(b,reach));
 const digger=clay.flatMap(deposit=>{
  const person=clayWorkers.find(u=>!clayIssue(g,u.id,deposit.id));
  return person?[{deposit,person}]:[];
 })[0];
 const surveyor=clayWorkers.filter(u=>distance(u,reach)<=POTTERY_RULES.surveyRadius+8).sort((a,b)=>distance(a,reach)-distance(b,reach))[0];
 return {
  clayIssue:digger?null:!clay.length?'Survey this bank first':clay.every(d=>d.remaining<POTTERY_RULES.clayBatch)?'Clay bank exhausted':!clayWorkers.length?'Needs an available empty-handed adult':clayIssue(g,clayWorkers[0].id,clay[0].id),
  surveyIssue:surveyor?null:!clayWorkers.length?'Needs an available empty-handed adult':`Bring an adult within ${POTTERY_RULES.surveyRadius} m of this bank`,
  fishCount:fish.reduce((sum,node)=>sum+node.amount,0),
  fishCapacity:fish.reduce((sum,node)=>sum+node.maxAmt,0),
  fishRecovery:fish.length&&!grounds.length?Math.min(...fish.map(node=>fishRecoveryEstimateSeconds(g,node))):0,
  clayCount:clay.reduce((sum,deposit)=>sum+deposit.remaining,0),
  clayCapacity:clay.reduce((sum,deposit)=>sum+deposit.initial,0),
  fisher,digger,surveyor,
 };
}

export function fishWaterReach(g:Game,reach:WaterReach){
 const available=waterReachReport(g,reach).fisher;
 if(!available)return false;
 const {node,person}=available;
 g.clearSelect();
 person.selected=true;
 g.issueGather(node);
 person.selected=false;
 g.selectedWaterReach=reach;
 return person.node===node&&person.order==='gather';
}

export function workReachClay(g:Game,reach:WaterReach,survey:boolean){
 const {digger,surveyor}=waterReachReport(g,reach);
 if(survey)return !!surveyor&&surveyClay(g,surveyor.id,point=>sameWater(g,reach,point));
 return !!digger&&beginClayGather(g,digger.person.id,digger.deposit.id);
}
