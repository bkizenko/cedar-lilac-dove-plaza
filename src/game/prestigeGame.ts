import type {Game} from './sim';
import {CIVIC_PRESTIGE_RULES,civicPrestige} from './civicPrestige';
import {LAND_VALUE_RULES} from './landValue';
import {soilQuality,riverDistance} from './ecology';
import {readyFoodStock} from './pantry';
import {foodDemand} from './settlement';
import {informationOwner} from './informationCustody';
import {ownPrestigeView,observedPrestigeView,usefulTradeCount,prestigeCellInfrastructure,type PrestigeFacts,type PrestigeView,type PrestigeObservation} from './prestigeScore';

/** Score pacing is calendar days (1800-second game year /365), not the
 * deliberately slowed visual daylight clock. These are gameplay coefficients. */
export const PRESTIGE_GAME_RULES={version:1,calendarDaySeconds:1800/365,territoryReviewSeconds:15,cellsPerTick:256,maximumUsefulGrade:.6} as const;
export type PrestigeTerritorySnapshot={measuredAt:number;usableArea:number;resourcesAndChokepoints:number};
export type GamePrestigeView=PrestigeView&{territoryMeasuredAt:number|null;territoryUpdating:boolean};
type Job={territory:Uint8Array;n:number;cell:number;next:number;started:number;area:number;resources:number;extra:Map<number,number>};
type Cache={state:Game['state'];world:Game['world'];nextReview:number;land?:PrestigeTerritorySnapshot;job?:Job};
const caches=new WeakMap<Game,Cache>();
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
function beginLand(g:Game):Job{
 const territory=g.territory.slice(),n=Math.round(Math.sqrt(territory.length)),cell=g.world.size/n,half=g.world.size/2,extra=new Map<number,number>(),resources=new Map<number,number>(),trails=new Map<number,number>(),crossings=new Map<number,number>();
 const index=(x:number,z:number)=>{const ix=Math.floor((x+half)/cell),iz=Math.floor((z+half)/cell);return ix<0||iz<0||ix>=n||iz>=n?-1:iz*n+ix;};
 for(const [kind,weight]of Object.entries(LAND_VALUE_RULES.resource))for(const p of (g.state as unknown as Record<string,{x:number;z:number;amount:number;maxAmt?:number}[]>)[kind]||[]){const i=index(p.x,p.z);if(i<0||territory[i]!==0||!(p.amount>0))continue;resources.set(i,(resources.get(i)||0)+weight*clamp(p.amount/Math.max(1,p.maxAmt??p.amount)));}
 for(const [i,value]of resources)extra.set(i,Math.min(LAND_VALUE_RULES.resourceCap,value));
 for(const t of g.state.trails||[]){if(t.x===undefined||t.z===undefined)continue;const i=index(t.x,t.z);if(i>=0&&territory[i]===0)trails.set(i,(trails.get(i)||0)+clamp(t.wear));}
 for(const b of g.state.buildings)if((b.type==='bridge'||b.type==='dock')&&b.hp>0&&g.finished(b)){const i=index(b.x,b.z);if(i>=0&&territory[i]===0)crossings.set(i,(crossings.get(i)||0)+1);}
 for(const i of new Set([...trails.keys(),...crossings.keys()]))extra.set(i,(extra.get(i)||0)+prestigeCellInfrastructure(trails.get(i)||0,crossings.get(i)||0,LAND_VALUE_RULES.trailWear,LAND_VALUE_RULES.crossing));
 return{territory,n,cell,next:0,started:g.state.time,area:0,resources:0,extra};
}
/** Simulation cadence only. Consumes already-painted ownership, never causes a
 * geographic influence query/repaint or invokes the HUD's observation helpers. */
export function tickPrestigeEvidence(g:Game){
 let c=caches.get(g);if(!c||c.state!==g.state||c.world!==g.world){c={state:g.state,world:g.world,nextReview:g.state.time};caches.set(g,c);}
 if(!c.job&&g.state.time>=c.nextReview)c.job=beginLand(g);
 const job=c.job;if(!job)return;const end=Math.min(job.territory.length,job.next+PRESTIGE_GAME_RULES.cellsPerTick),half=g.world.size/2;
 for(;job.next<end;job.next++){
  const i=job.next;if(job.territory[i]!==0)continue;
  const x=-half+(i%job.n+.5)*job.cell,z=-half+(Math.floor(i/job.n)+.5)*job.cell,h=g.height(x,z);
  if(h<g.waterAt(x,z)+.1)continue;
  const grade=Math.max(Math.abs(g.height(x+3,z)-h),Math.abs(g.height(x-3,z)-h),Math.abs(g.height(x,z+3)-h),Math.abs(g.height(x,z-3)-h))/3;
  if(grade>PRESTIGE_GAME_RULES.maximumUsefulGrade)continue;
  const useful=LAND_VALUE_RULES.soil*soilQuality(g,x,z)+LAND_VALUE_RULES.freshwater*Math.max(0,1-riverDistance(g,x,z)/LAND_VALUE_RULES.freshwaterMetres);
  job.area+=job.cell*job.cell;job.resources+=Math.max(0,useful)+(job.extra.get(i)||0);
 }
 if(job.next===job.territory.length){c.land={measuredAt:job.started,usableArea:job.area,resourcesAndChokepoints:job.resources};c.job=undefined;c.nextReview=g.state.time+PRESTIGE_GAME_RULES.territoryReviewSeconds;}
}
export function collectOwnPrestige(g:Game):PrestigeFacts{
 const t=g.tribe(0),c=caches.get(g),land=c?.state===g.state&&c.world===g.world?c.land:undefined;
 let healthyPopulation=0;for(const u of g.state.units)if(u.team===0&&u.hp>0&&!u.visit&&!u.prisoner&&(u.sickUntil??0)<=g.state.time)healthyPopulation+=clamp(u.hp/Math.max(1,u.maxHp));
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
function rivalObservation(g:Game,viewer:number,subject:number):PrestigeObservation[]{
 const reports=new Map<number,NonNullable<Game['state']['structureReports']>[number]>();
 for(const p of g.state.structureReports||[])if(informationOwner(p,p.observer)===viewer&&p.site.team===subject&&p.active&&p.observedAt<=g.state.time&&p.observedAt>=0&&p.site.hp>0){const old=reports.get(p.site.id);if(!old||old.observedAt<p.observedAt)reports.set(p.site.id,p);}
 const ownedReports=[...reports.values()];if(!ownedReports.length)return[];
 const groups=new Map<string,number[]>();for(const p of ownedReports){const weight=CIVIC_PRESTIGE_RULES.landmarkValue[p.site.type as keyof typeof CIVIC_PRESTIGE_RULES.landmarkValue];if(!weight)continue;const values=groups.get(p.site.type)||[];values.push(weight*clamp(p.site.hp/Math.max(1,p.site.maxHp)));groups.set(p.site.type,values);}
 // A non-landmark report establishes contact, not zero foreign civic works.
 const components:PrestigeObservation['components']={};if(groups.size)components.civicWorks=[...groups.values()].reduce((n,values)=>n+values.sort((a,b)=>b-a).reduce((sum,v,i)=>sum+v*CIVIC_PRESTIGE_RULES.duplicateMultiplier**i,0),0);
 return[{observer:viewer,subject,observedAt:Math.min(...ownedReports.map(p=>p.observedAt)),components}];
}
export function gamePrestigeView(g:Game,viewer=0,subject=0):GamePrestigeView{
 if(viewer!==0||subject!==0)return{...observedPrestigeView(viewer,subject,g.state.time,rivalObservation(g,viewer,subject)),territoryMeasuredAt:null,territoryUpdating:false};
 const c=caches.get(g),valid=c?.state===g.state&&c.world===g.world;
 return{...ownPrestigeView(0,collectOwnPrestige(g)),territoryMeasuredAt:valid?c.land?.measuredAt??null:null,territoryUpdating:valid?!!c.job:true};
}
