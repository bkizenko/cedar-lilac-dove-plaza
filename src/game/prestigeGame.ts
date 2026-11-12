import {simulationDaySeconds} from './calendarPacing';
import type {Game} from './sim';
import {CIVIC_PRESTIGE_RULES,civicPrestige} from './civicPrestige';
import {LAND_VALUE_RULES} from './landValue';
import {soilQuality,riverDistance} from './ecology';
import {readyFoodStock} from './pantry';
import {foodDemand} from './settlement';
import {informationOwner} from './informationCustody';
import {ownPrestigeView,observedPrestigeView,usefulTradeCount,type PrestigeFacts,type PrestigeView,type PrestigeObservation} from './prestigeScore';

/** Food reserves use the actual simulation day counter, not visual daylight. */
export const PRESTIGE_GAME_RULES={version:1,calendarDaySeconds:simulationDaySeconds,territoryReviewSeconds:15,cellsPerTick:256,maximumUsefulGrade:.6,qualityAreaSquareMetres:1000} as const;
export type PrestigeTerritorySnapshot={measuredAt:number;usableArea:number;resourcesAndChokepoints:number};
export type GamePrestigeView=PrestigeView&{territoryMeasuredAt:number|null;territoryUpdating:boolean;communityName?:string;identityKnown?:boolean};
type Node={x:number;z:number;amount:number;maxAmt?:number};
type Phase='land'|'nodes'|'trails'|'buildings';
type Job={territory:Uint8Array;size:number;n:number;cell:number;next:number;phase:Phase;kind:number;started:number;area:number;resources:number;useful:Set<number>;bonuses:Map<number,{nodes:number;trail:number;crossing:number}>;nodeLists:{nodes:Node[];length:number;weight:number}[];trails:Game['state']['trails'];trailLength:number;buildings:Game['state']['buildings'];buildingLength:number;lastWork:number;totalWork:number};
type Cache={state:Game['state'];world:Game['world'];territory:Uint8Array;size:number;nextReview:number;lastWork?:number;totalWork?:number;land?:PrestigeTerritorySnapshot;job?:Job};
const caches=new WeakMap<Game,Cache>();
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
function beginLand(g:Game):Job{
 // Constant-size setup only: no grid copy, entity scan, or spread of map keys.
 // Entity list lengths are frozen; values are sampled progressively, not an
 // atomic world snapshot. Completion publishes a dated result all at once.
 const territory=g.territory,n=Math.round(Math.sqrt(territory.length));
 const nodeLists=Object.entries(LAND_VALUE_RULES.resource).map(([kind,weight])=>{const nodes=(g.state as unknown as Record<string,Node[]>)[kind]||[];return{nodes,length:nodes.length,weight};});
 return{territory,size:g.world.size,n,cell:g.world.size/n,next:0,phase:'land',kind:0,started:g.state.time,area:0,resources:0,useful:new Set(),bonuses:new Map(),nodeLists,trails:g.state.trails,trailLength:g.state.trails?.length||0,buildings:g.state.buildings,buildingLength:g.state.buildings.length,lastWork:0,totalWork:0};
}
function landIndex(job:Job,x:number,z:number){
 if(!Number.isFinite(x)||!Number.isFinite(z))return -1;
 const ix=Math.floor((x+job.size/2)/job.cell),iz=Math.floor((z+job.size/2)/job.cell);
 return ix<0||iz<0||ix>=job.n||iz>=job.n?-1:iz*job.n+ix;
}
function landBonus(g:Game,job:Job,x:number,z:number,kind:'nodes'|'trail'|'crossing',value:number){
 const i=landIndex(job,x,z);
 if(i<0||!job.useful.has(i)||job.territory[i]!==0||!g.exploredAt(x,z)||!Number.isFinite(value)||value<=0)return;
 let row=job.bonuses.get(i);if(!row){row={nodes:0,trail:0,crossing:0};job.bonuses.set(i,row);}
 const cap=kind==='nodes'?LAND_VALUE_RULES.resourceCap:1,old=row[kind];row[kind]=Math.min(cap,old+value);
 job.resources+=(row[kind]-old)*(kind==='nodes'?1:kind==='trail'?LAND_VALUE_RULES.trailWear:LAND_VALUE_RULES.crossing);
}
/** Derived progress only; reads never start sampling. Initial land is unavailable;
 * a refresh retains its previous dated result and explicitly reports it stale.
 * Each work item is one land cell OR one node/trail/building, including rejects. */
export function prestigeTerritoryProgress(g:Game){
 const c=caches.get(g),valid=c?.state===g.state&&c.world===g.world&&c.territory===g.territory&&c.size===g.world.size;
 const job=valid?c.job:undefined;
 return{available:!!(valid&&c.land),stale:!!(valid&&c.land&&(job||g.state.time>=c.nextReview)),phase:job?.phase??null,lastWork:valid?c.lastWork??0:0,totalWork:valid?c.totalWork??0:0,startedAt:job?.started??null,measuredAt:valid?c.land?.measuredAt??null:null};
}
/** Simulation cadence only. One shared budget covers setup indexing AND physical
 * land sampling. Uses painted ownership and explored cells, never paints land. */
export function tickPrestigeEvidence(g:Game,territoryReady=true){
 let c=caches.get(g);if(!c||c.state!==g.state||c.world!==g.world||c.territory!==g.territory||c.size!==g.world.size){c={state:g.state,world:g.world,territory:g.territory,size:g.world.size,nextReview:g.state.time};caches.set(g,c);}
 if(!c.job&&g.state.time>=c.nextReview){if(!territoryReady){c.lastWork=0;return;}c.job=beginLand(g);}
 c.lastWork=0;const job=c.job;if(!job)return;job.lastWork=0;
 while(job.lastWork<PRESTIGE_GAME_RULES.cellsPerTick){
  if(job.phase==='land'){
   if(job.next===job.territory.length){job.phase='nodes';job.next=0;continue;}
   const i=job.next++;job.lastWork++;job.totalWork++;
   if(job.territory[i]!==0)continue;
   const x=-job.size/2+(i%job.n+.5)*job.cell,z=-job.size/2+(Math.floor(i/job.n)+.5)*job.cell;
   if(!g.exploredAt(x,z))continue;
   const h=g.height(x,z);if(h<g.waterAt(x,z)+.1)continue;
   const grade=Math.max(Math.abs(g.height(x+3,z)-h),Math.abs(g.height(x-3,z)-h),Math.abs(g.height(x,z+3)-h),Math.abs(g.height(x,z-3)-h))/3;
   if(grade>PRESTIGE_GAME_RULES.maximumUsefulGrade)continue;
   const useful=LAND_VALUE_RULES.soil*soilQuality(g,x,z)+LAND_VALUE_RULES.freshwater*Math.max(0,1-riverDistance(g,x,z)/LAND_VALUE_RULES.freshwaterMetres);
   if(!Number.isFinite(useful)||!Number.isFinite(h)||!Number.isFinite(grade))continue;
   const area=job.cell*job.cell;job.area+=area;job.resources+=Math.max(0,useful)*area/PRESTIGE_GAME_RULES.qualityAreaSquareMetres;job.useful.add(i);
  }else if(job.phase==='nodes'){
   const list=job.nodeLists[job.kind];
   if(!list){job.phase='trails';job.next=0;continue;}
   if(job.next===list.length){job.kind++;job.next=0;continue;}
   const p=list.nodes[job.next++];job.lastWork++;job.totalWork++;
   if(p&&p.amount>0)landBonus(g,job,p.x,p.z,'nodes',list.weight*clamp(p.amount/Math.max(1,p.maxAmt??p.amount)));
  }else if(job.phase==='trails'){
   if(job.next===job.trailLength){job.phase='buildings';job.next=0;continue;}
   const t=job.trails?.[job.next++];job.lastWork++;job.totalWork++;
   if(t&&t.x!==undefined&&t.z!==undefined)landBonus(g,job,t.x,t.z,'trail',clamp(t.wear));
  }else{
   if(job.next===job.buildingLength){c.land={measuredAt:job.started,usableArea:job.area,resourcesAndChokepoints:job.resources};c.job=undefined;c.nextReview=g.state.time+PRESTIGE_GAME_RULES.territoryReviewSeconds;c.lastWork=job.lastWork;c.totalWork=job.totalWork;return;}
   const b=job.buildings[job.next++];job.lastWork++;job.totalWork++;
   if(b&&(b.type==='bridge'||b.type==='dock')&&b.hp>0&&g.finished(b))landBonus(g,job,b.x,b.z,'crossing',1);
  }
 }
 c.lastWork=job.lastWork;c.totalWork=job.totalWork;
}
export function collectOwnPrestige(g:Game):PrestigeFacts{
 const t=g.tribe(0),c=caches.get(g),land=c?.state===g.state&&c.world===g.world&&c.territory===g.territory&&c.size===g.world.size?c.land:undefined;
 let healthyPopulation=0;for(const u of g.state.units)if(u.team===0&&u.hp>0&&!u.visit&&(!u.prisoner||u.prisoner.phase==='released')&&(u.sickUntil??0)<=g.state.time)healthyPopulation+=clamp(u.hp/Math.max(1,u.maxHp));
 const demonstratedPractices=Object.entries(t.productionPractice||{}).filter(([,p])=>p&&p.batches>0&&p.usefulOutputs>0).map(([id])=>id.replace(/(Double|Bulk)$/,''));
 const boat=t.boatPractice;
 if(boat&&boat.deliveredGoods>0&&boat.lastDeliveryAt!==undefined&&boat.lastDeliveryAt<=g.state.time){
  demonstratedPractices.push('water-cargo-delivery');
  for(const kind of ['scoutCanoe','freightPunt']as const){const at=boat.demonstratedAt?.[kind]??boat.lastDeliveryAt;if(boat.proven[kind]&&at>=0&&at<=g.state.time)demonstratedPractices.push(`hull:${kind}`);}
 }
 const sailed=boat?.sailing;if(sailed&&sailed.deliveredGoods>0&&sailed.demonstratedAt!==undefined&&sailed.demonstratedAt>=0&&sailed.demonstratedAt<=g.state.time)demonstratedPractices.push('sailed-cargo-delivery');
 const demand=foodDemand(g,0),reserve=demand>0?readyFoodStock(t).nourishment/demand:0;
 return{usableArea:land?.usableArea,resourcesAndChokepoints:land?.resourcesAndChokepoints,healthyPopulation,foodSecurity:reserve/PRESTIGE_GAME_RULES.calendarDaySeconds,demonstratedPractices,usefulTrade:usefulTradeCount(g.state.tradeNeeds?.receipts||[],0,g.state.tradeNeeds?.offers||[]),civicWorks:civicPrestige(g,0).total};
}
/** Public retained reports only; no live foreign entity/stock lookup. Report
 * custody honors actual community handover without silently revealing originals. */
function rivalObservation(g:Game,viewer:number,subject:number,source=g.state.structureReports||[]):PrestigeObservation[]{
 const reports=new Map<number,NonNullable<Game['state']['structureReports']>[number]>();
 for(const p of source)if(informationOwner(p,p.observer)===viewer&&p.site.team===subject&&p.active&&p.observedAt<=g.state.time&&p.observedAt>=0&&p.site.hp>0){const old=reports.get(p.site.id);if(!old||old.observedAt<p.observedAt)reports.set(p.site.id,p);}
 const ownedReports=[...reports.values()];if(!ownedReports.length)return[];
 const groups=new Map<string,number[]>();for(const p of ownedReports){const weight=CIVIC_PRESTIGE_RULES.landmarkValue[p.site.type as keyof typeof CIVIC_PRESTIGE_RULES.landmarkValue];if(!weight)continue;const values=groups.get(p.site.type)||[];values.push(weight*clamp(p.site.hp/Math.max(1,p.site.maxHp)));groups.set(p.site.type,values);}
 // A non-landmark report establishes contact, not zero foreign civic works.
 const components:PrestigeObservation['components']={};if(groups.size)components.civicWorks=[...groups.values()].reduce((n,values)=>n+values.sort((a,b)=>b-a).reduce((sum,v,i)=>sum+v*CIVIC_PRESTIGE_RULES.duplicateMultiplier**i,0),0);
 return[{observer:viewer,subject,observedAt:Math.min(...ownedReports.map(p=>p.observedAt)),components}];
}
export function gamePrestigeView(g:Game,viewer=0,subject=0):GamePrestigeView{
 if(viewer!==0||subject!==0)return reportedPrestigeView(g,viewer,subject);
 const c=caches.get(g),valid=c?.state===g.state&&c.world===g.world&&c.territory===g.territory&&c.size===g.world.size;
 return{...ownPrestigeView(0,collectOwnPrestige(g)),communityName:g.tribe(0).name,territoryMeasuredAt:valid?c.land?.measuredAt??null:null,territoryUpdating:valid?!!c.job||!c.land||g.state.time>=c.nextReview:true};
}

function reportedPrestigeView(g:Game,viewer:number,subject:number,source?:NonNullable<Game['state']['structureReports']>):GamePrestigeView{
 const view=observedPrestigeView(viewer,subject,g.state.time,rivalObservation(g,viewer,subject,source));
 const identityKnown=view.knowledge==='observed'||viewer===0&&!!g.state.contacts?.includes(subject);
 return{...view,identityKnown,...(identityKnown?{communityName:g.tribe(subject)?.name}:{}),territoryMeasuredAt:null,territoryUpdating:false};
}
/** One pass over retained reports for the whole HUD, not one per rival. */
export function gamePrestigeRivals(g:Game,viewer=0){
 const bySubject=new Map<number,NonNullable<Game['state']['structureReports']>>();
 for(const report of g.state.structureReports||[]){if(informationOwner(report,report.observer)!==viewer)continue;const list=bySubject.get(report.site.team)||[];list.push(report);bySubject.set(report.site.team,list);}
 return g.state.tribes.filter(t=>t.id!==viewer&&t.id!==3).map(t=>reportedPrestigeView(g,viewer,t.id,bySubject.get(t.id)||[]));
}
