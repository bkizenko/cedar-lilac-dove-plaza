import {BUILDINGS} from './constants';
import {towerPlatformSpec,validTowerPlatform} from './towerPlatforms';
import {queueConstruction} from './constructionQueue';
import type {Game} from './sim';
import type {Building,ResourceNode,Cost,Unit,BldType} from './types';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {releaseConstructionWorker} from './constructionOwnership';
import {reserveTreeWorker,releaseTreeWorker} from './workAllocation';
import {buildingCost} from './construction';
export const SITE_PREPARATION_RULES={version:1,footprintMarginMetres:.25,maximumLooseStoneStock:32,maximumResources:2048,maximumWorkers:4} as const;
export type PreparationKind='tree'|'stone'|'forage';
export type PreparationResource={id:number;kind:PreparationKind;x:number;z:number;maxAmt:number};
export type SitePreparation={version:1;createdAt:number;paused?:true;completedAt?:number;cancelledAt?:number;resources:PreparationResource[];site:{type:BldType;x:number;z:number;w:number;d:number;towerPlatform?:Building['towerPlatform']};quote:Cost;paid:Cost};
export type PreparedSite=Building&{sitePreparation?:SitePreparation};
const lists=(g:Game)=>[...g.state.trees,...g.state.stones,...g.state.forage];
export function insidePreparationFootprint(b:Pick<Building,'x'|'z'|'w'|'d'>,p:{x:number;z:number}){const margin=SITE_PREPARATION_RULES.footprintMarginMetres;return Math.abs(p.x-b.x)<b.w/2+margin&&Math.abs(p.z-b.z)<b.d/2+margin;}
/** This classifies observed resources only. The caller must independently keep
 * terrain, water, structures and full-footprint exploration checks in force. */
export function sitePreparationSurvey(g:Game,b:Building){
 const nodes=lists(g).filter(n=>n.amount>0&&insidePreparationFootprint(b,n));
 const unknown=nodes.filter(n=>!g.exploredAt(n.x,n.z));
 const hard=nodes.filter(n=>n.kind==='stone'&&n.maxAmt>SITE_PREPARATION_RULES.maximumLooseStoneStock);
 const clearable=nodes.filter(n=>!unknown.includes(n)&&!hard.includes(n));
 return{clearable,hard,unknown,issue:unknown.length?'Explore the whole site first':hard.length?'A substantial stone outcrop needs a different site or deliberate excavation':nodes.length>SITE_PREPARATION_RULES.maximumResources?'This clearing exceeds the bounded site plan':null};
}
/** Fresh-site receipt. Geometry remains the placement caller’s responsibility;
 * original dimensions, quote and finite source identities survive later upgrades.
 * Unpaid housing/blueprints retain their separate material-payment executor. */
export function reserveSitePreparation(g:Game,b:PreparedSite,mode:'fresh'|'paid'|'unpaid'='fresh',paidCost?:Cost){
 if(b.sitePreparation)return validSitePreparation(b.sitePreparation,b);
 if(g.state.ended||b.team!==0||b.hp<=0||g.state.buildings.includes(b)||(mode==='fresh'&&b.plannedCost)||b.expansion||(b.renovation&&b.renovation.mode!=='new')||(b.crop?.planted||0)>0)return false;
 const survey=sitePreparationSurvey(g,b);if(survey.issue||!survey.clearable.length)return false;
 const cost=paidCost??(mode==='unpaid'?{}:buildingCost(b.type,g,b.team,{w:b.w,d:b.d}));if(mode==='fresh'&&!g.canAfford(b.team,cost))return false;
 const resources=survey.clearable.map(n=>({id:n.id,kind:n.kind as PreparationKind,x:n.x,z:n.z,maxAmt:n.maxAmt}));
 const receipt:SitePreparation={version:1,createdAt:g.state.time,resources,site:{type:b.type,x:b.x,z:b.z,w:b.w,d:b.d,...(b.towerPlatform?{towerPlatform:{...b.towerPlatform}}:{})},quote:{...cost},paid:{...cost}};if(!validSitePreparation(receipt,b))return false;
 if(mode==='fresh')g.spend(b.team,cost);b.sitePreparation=receipt;b.build=0;b.hp=Math.max(16,Math.floor(b.maxHp*.14));return true;
}
export function sitePreparationStatus(g:Game,b:PreparedSite){
 const p=b.sitePreparation;if(!p)return{phase:'none' as const,remaining:[] as ResourceNode[],issue:null as string|null};
 if(p.completedAt!==undefined)return{phase:'complete' as const,remaining:[] as ResourceNode[],issue:null};
 if(p.cancelledAt!==undefined)return{phase:'cancelled' as const,remaining:[] as ResourceNode[],issue:null};
 const nodes=new Map(lists(g).map(n=>[n.id,n]));let missing=false;
 const remaining=p.resources.flatMap(ref=>{const n=nodes.get(ref.id);if(!n||n.kind!==ref.kind||n.x!==ref.x||n.z!==ref.z||n.maxAmt!==ref.maxAmt){missing=true;return [];}return n.amount>0?[n]:[];});
 if(p.paused||b.planPaused)return{phase:'paused' as const,remaining,issue:'Site preparation paused'};
 if(missing)return{phase:'blocked' as const,remaining,issue:'A recorded clearing source changed or is missing'};
 if(remaining.length)return{phase:'clearing' as const,remaining,issue:null};
 // Do not raise a solid unfinished building around its last loaded cutter.
 const occupied=b.type!=='farm'&&g.state.units.some(u=>u.hp>0&&insidePreparationFootprint({x:b.x,z:b.z,w:b.w+u.r*2,d:b.d+u.r*2},u));
 return{phase:occupied?'waiting-for-exit' as const:'ready' as const,remaining,issue:occupied?'Clear people from the prepared footprint':null};
}
/** Strict saved receipt shape, usable by the canonical payload validator. */
export function validSitePreparation(value:unknown,b:Building):value is SitePreparation{
 if(!value||typeof value!=='object')return false;const p=value as SitePreparation;
 if(Object.keys(p).some(k=>!['version','createdAt','paused','completedAt','cancelledAt','resources','site','quote','paid'].includes(k))||p.version!==1||!Number.isFinite(p.createdAt)||p.createdAt<0||p.paused!==undefined&&p.paused!==true||!Array.isArray(p.resources)||!p.resources.length||p.resources.length>SITE_PREPARATION_RULES.maximumResources)return false;
 if(p.completedAt!==undefined&&(!Number.isFinite(p.completedAt)||p.completedAt<p.createdAt)||p.cancelledAt!==undefined&&(!Number.isFinite(p.cancelledAt)||p.cancelledAt<p.createdAt)||p.completedAt!==undefined&&p.cancelledAt!==undefined)return false;
 if(!p.site||typeof p.site!=='object'||Object.keys(p.site).some(k=>!['type','x','z','w','d','towerPlatform'].includes(k))||!Object.hasOwn(BUILDINGS,p.site.type)||![p.site.x,p.site.z,p.site.w,p.site.d].every(Number.isFinite)||p.site.w<=0||p.site.d<=0||p.site.w>256||p.site.d>256)return false;
 if(p.site.towerPlatform!==undefined&&(p.site.type!=='watchtower'||!validTowerPlatform(p.site.towerPlatform)))return false;
 const original={...b,...p.site};
 const ids=new Set<number>();for(const r of p.resources){if(!r||Object.keys(r).some(k=>!['id','kind','x','z','maxAmt'].includes(k))||!Number.isSafeInteger(r.id)||r.id<1||ids.has(r.id)||!['tree','stone','forage'].includes(r.kind)||![r.x,r.z,r.maxAmt].every(Number.isFinite)||r.maxAmt<=0||!insidePreparationFootprint(original,r)||r.kind==='stone'&&r.maxAmt>SITE_PREPARATION_RULES.maximumLooseStoneStock)return false;ids.add(r.id);}
 if(!p.quote||typeof p.quote!=='object'||Array.isArray(p.quote)||Object.keys(p.quote).some(k=>!['food','wood','stone','copper','iron','seeds'].includes(k))||!Object.values(p.quote).every(n=>Number.isFinite(n)&&n>=0&&n<=1e12))return false;
 if(!p.paid||typeof p.paid!=='object'||Array.isArray(p.paid)||Object.keys(p.paid).some(k=>!['food','wood','stone','copper','iron','seeds'].includes(k)))return false;
 if(!Object.values(p.paid).every(n=>Number.isFinite(n)&&n>=0&&n<=1e12))return false;
 const keys=['food','wood','stone','copper','iron','seeds'] as const;
 if(p.cancelledAt!==undefined&&keys.some(k=>(p.paid[k]||0)>0))return false;
 if(keys.some(k=>(p.quote[k]||0)>0)){
  const quote=buildingCost(original.type,undefined,b.team,{w:original.w,d:original.d});
  if(original.type==='watchtower')Object.assign(quote,towerPlatformSpec(original.towerPlatform).cost);
  if(original.type==='townhall'){const wood=p.quote.wood||0;if(wood!==0&&(wood<40||wood>1120||wood%20!==0))return false;quote.wood=wood;}
  if(keys.some(k=>(p.quote[k]||0)!==(quote[k]||0)))return false;
 }
 if(keys.some(k=>(p.paid[k]||0)>0)&&keys.some(k=>(p.paid[k]||0)!==(p.quote[k]||0)))return false;
 return true;
}

export type PreparationWorker=Unit&{sitePreparationId?:number};
/** Temporary saved actor intent uses the ordinary finite resource executor. */
export function assignSitePreparation(g:Game,u:PreparationWorker,b:PreparedSite){
 if(!b.sitePreparation||b.sitePreparation.paused||b.hp<=0||u.team!==b.team||u.hp<=0||u.type!=='worker'||isDependent(g,u)||u.militia||u.prisoner||u.emergency||u.recalled||u.resting||u.shelterId||u.scout||u.expedition||u.envoy||u.visit||u.foundingJourney||u.tributeJourney||u.trade||u.drill!=null||u.stationOnArrival||u.sitePreparationId!==undefined&&u.sitePreparationId!==b.id||u.buildOrder!==undefined&&u.buildOrder!==b.id||hasTaskCommitment(u,'sitePreparationId'))return false;
 const loaded=u.carry>0||Object.values(u.itemCargo||{}).some(n=>(n||0)>0);
 if(loaded){if(u.sitePreparationId!==b.id)return false;u.order='return';u.node=null;u.workReason='Delivering materials from the prepared site';return true;}
 const status=sitePreparationStatus(g,b);if(status.phase!=='clearing')return false;
 if(u.sitePreparationId===b.id&&u.order==='gather'&&u.node&&status.remaining.some(n=>n===u.node))return true;
 const owners=g.state.units.filter(other=>other.hp>0&&(other as PreparationWorker).sitePreparationId===b.id);
 if(!owners.includes(u)&&owners.length>=SITE_PREPARATION_RULES.maximumWorkers)return false;
 for(const n of [...status.remaining].sort((a,c)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(c.x-u.x,c.z-u.z))){
  const peers=g.state.units.filter(other=>other!==u&&other.hp>0&&other.order==='gather'&&other.node===n).length;
  if(peers>=2)continue;
  const at=g.nearestWalk(u,n.x,n.z);if(!at||Math.hypot(at.x-n.x,at.z-n.z)>(n.kind==='tree'||n.kind==='stone'?3.2:1.22)||!g.workBoard.connected(g,u.x,u.z,at.x,at.z))continue;
  releaseConstructionWorker(g,u);if(n.kind==='tree'&&!reserveTreeWorker(g,n,u))continue;
  u.sitePreparationId=b.id;u.buildOrder=undefined;u.order='gather';u.node=n;u.target=null;u.job=n.kind==='tree'?'wood':n.kind==='stone'?'stone':'food';u.jobLock=false;u.huntOnly=false;u.tx=at.x;u.tz=at.z;u.workReason='Clearing the reserved site before construction or planting';return true;
 }
 return false;
}
export function releaseSitePreparationWorker(g:Game,u:PreparationWorker){releaseTreeWorker(g,u);u.sitePreparationId=undefined;u.node=null;if(u.carry>0||Object.values(u.itemCargo||{}).some(n=>(n||0)>0)){u.order='return';u.node=null;}else if(['gather','build','hold'].includes(u.order))u.order=g.state.autoWorkEnabled===false?'hold':'idle';}

export function pendingSitePreparation(b:Building){return !!b.sitePreparation&&b.sitePreparation.completedAt===undefined&&b.sitePreparation.cancelledAt===undefined;}
function canPrepare(g:Game,u:Unit,b:Building){return u.team===b.team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.prisoner&&!u.militia&&!u.emergency&&!u.recalled&&!u.resting&&!u.shelterId&&!u.jobLock&&!u.buildOrder&&(!u.constructionQueue||!u.constructionQueue.paused&&u.constructionQueue.sites.includes(b.id))&&!u.stationOnArrival&&!u.scout&&!u.expedition&&!u.envoy&&!u.visit&&!u.trade&&!u.foundingJourney&&!u.tributeJourney&&u.drill==null&&u.escortId===undefined&&!hasTaskCommitment(u)&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>n>0)&&['idle','hold','gather'].includes(u.order);}
function leaveFootprint(g:Game,u:Unit,b:Building,dt:number){if(!insidePreparationFootprint({x:b.x,z:b.z,w:b.w+u.r*2,d:b.d+u.r*2},u))return false;const exits=Array.from({length:32},(_,i)=>{const a=i*Math.PI/16,sx=Math.sin(a),sz=Math.cos(a),r=Math.min((b.w/2+u.r+1.5)/(Math.abs(sx)||1e-6),(b.d/2+u.r+1.5)/(Math.abs(sz)||1e-6));return{x:b.x+sx*r,z:b.z+sz*r};}).filter(p=>g.walkable(p.x,p.z)&&g.workBoard.connected(g,u.x,u.z,p.x,p.z)).sort((a,c)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(c.x-u.x,c.z-u.z));const exit=exits[0];if(exit){u.tx=exit.x;u.tz=exit.z;g.steer(u,dt);}u.workReason=exit?'Leaving the cleared footprint before construction':'No clear exit from the prepared site';return true;}
/** Explicit preparation owns no second resource executor or cargo inventory. */
export function sitePreparationAI(g:Game,u:Unit,dt:number){if(u.sitePreparationId===undefined)return false;const b=g.state.buildings.find(b=>b.id===u.sitePreparationId&&b.team===u.team&&b.hp>0);if(!b||!pendingSitePreparation(b)){releaseSitePreparationWorker(g,u);return false;}const status=sitePreparationStatus(g,b);if(u.carry>0||Object.values(u.itemCargo||{}).some(n=>n>0)){u.order='return';u.node=null;g.workerAI(u,dt);return true;}if(status.phase==='paused'||status.phase==='blocked'){u.order='hold';u.node=null;u.workReason=status.issue||'Site clearing blocked';return true;}if(status.phase==='waiting-for-exit'||status.phase==='ready'){if(leaveFootprint(g,u,b,dt))return true;u.order='hold';u.node=null;return true;}if(assignSitePreparation(g,u,b)){g.workerAI(u,dt);return true;}u.order='hold';u.node=null;u.workReason='Waiting for a reachable clearing source';return true;}
const preparationClocks=new WeakMap<Game,{state:Game['state'];next:number}>();
export function reviewSitePreparations(g:Game,force=false){const clock=preparationClocks.get(g);if(!force&&clock?.state===g.state&&clock.next>g.state.time)return;preparationClocks.set(g,{state:g.state,next:g.state.time+1});for(const u of g.state.units)if(u.sitePreparationId!==undefined&&(u.hp<=0||!g.state.buildings.some(b=>b.id===u.sitePreparationId&&b.team===u.team&&b.hp>0&&pendingSitePreparation(b))))releaseSitePreparationWorker(g,u);for(const b of g.state.buildings){if(!pendingSitePreparation(b)||b.hp<=0)continue;const status=sitePreparationStatus(g,b);if(status.phase==='paused'||status.phase==='blocked')continue;if(status.phase==='ready'){b.sitePreparation!.completedAt=g.state.time;if(b.type==='farm'){b.build=1;b.hp=b.maxHp;}for(const u of g.state.units)if(u.sitePreparationId===b.id)releaseSitePreparationWorker(g,u);g.state.walkDirty=true;g.workBoard.reset();continue;}const candidates=g.state.units.filter(u=>canPrepare(g,u,b)).sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z));for(const u of candidates){if(status.phase==='waiting-for-exit'){if(insidePreparationFootprint(b,u))u.sitePreparationId=b.id;}else if(assignSitePreparation(g,u,b))queueConstruction(g,b,[u]);}}}
export function cancelSitePreparation(g:Game,b:Building){if(!pendingSitePreparation(b))return false;const p=b.sitePreparation!;for(const k of ['food','wood','stone','copper','iron','seeds'] as const)g.tribe(b.team)[k]=(g.tribe(b.team)[k]||0)+(p.paid[k]||0);p.paid={};p.cancelledAt=g.state.time;for(const u of g.state.units)if(u.sitePreparationId===b.id)releaseSitePreparationWorker(g,u);b.hp=0;g.state.walkDirty=true;g.workBoard.reset();return true;}
export function validSitePreparationState(s:import('./types').GameState){const nodes=new Map([...s.trees,...s.stones,...s.forage].map(n=>[n.id,n])),reserved=new Set<number>();for(const b of s.buildings){const p=b.sitePreparation;if(!p)continue;if(!validSitePreparation(p,b)||p.createdAt>s.time||p.completedAt!==undefined&&p.completedAt>s.time||p.cancelledAt!==undefined&&p.cancelledAt>s.time||p.cancelledAt!==undefined&&b.hp>0||p.completedAt===undefined&&b.build>0||p.completedAt===undefined&&((b.crop?.planted||0)>0||b.renovation?.paid))return false;for(const ref of p.resources){const n=nodes.get(ref.id);if(!n||n.kind!==ref.kind||n.x!==ref.x||n.z!==ref.z||n.maxAmt!==ref.maxAmt||ref.id>=s.nextId)return false;if(b.hp>0){if(reserved.has(ref.id)||p.completedAt!==undefined&&n.amount>0)return false;reserved.add(ref.id);}}}for(const u of s.units){if(u.sitePreparationId===undefined)continue;if(!Number.isSafeInteger(u.sitePreparationId)||!s.buildings.some(b=>b.id===u.sitePreparationId&&b.team===u.team&&b.hp>0&&pendingSitePreparation(b))||hasTaskCommitment(u,'sitePreparationId'))return false;}return true;}

export function setSitePreparationPaused(g:Game,b:Building,paused:boolean){if(!pendingSitePreparation(b))return false;if(paused){b.sitePreparation!.paused=true;for(const u of g.state.units)if(u.sitePreparationId===b.id)releaseSitePreparationWorker(g,u);}else delete b.sitePreparation!.paused;preparationClocks.delete(g);return true;}
export function reconcileSitePreparationWorkers(g:Game){for(const u of g.state.units){if(u.sitePreparationId!==undefined&&u.team!==0)u.constructionQueue=undefined;if(u.sitePreparationId!==undefined&&(u.hp<=0||!g.state.buildings.some(b=>b.id===u.sitePreparationId&&b.team===u.team&&b.hp>0&&pendingSitePreparation(b))))releaseSitePreparationWorker(g,u);}}
const regrowthIndexes=new WeakMap<Game,{state:Game['state'];time:number;buildings:Building[];count:number;cells:Map<string,Building[]>}>();
export function siteBlocksRegrowth(g:Game,n:ResourceNode){if(n.kind!=='tree'&&n.kind!=='forage')return false;let index=regrowthIndexes.get(g);if(!index||index.state!==g.state||index.time!==g.state.time||index.buildings!==g.state.buildings||index.count!==g.state.buildings.length){const cells=new Map<string,Building[]>();for(const b of g.state.buildings){if(b.hp<=0||!b.sitePreparation||b.sitePreparation.cancelledAt!==undefined)continue;for(let z=Math.floor((b.z-b.d/2-.25)/32);z<=Math.floor((b.z+b.d/2+.25)/32);z++)for(let x=Math.floor((b.x-b.w/2-.25)/32);x<=Math.floor((b.x+b.w/2+.25)/32);x++){const key=`${x}:${z}`,list=cells.get(key)||[];list.push(b);cells.set(key,list);}}index={state:g.state,time:g.state.time,buildings:g.state.buildings,count:g.state.buildings.length,cells};regrowthIndexes.set(g,index);}return index.cells.get(`${Math.floor(n.x/32)}:${Math.floor(n.z/32)}`)?.some(b=>b.hp>0&&insidePreparationFootprint(b,n))??false;}
