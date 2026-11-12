import {fabricContext,eraUpgradeBenefits,eraUpgradeIssue,planEraChange,supportsEraUpgrade,ERA_UPGRADE_RULES,type FabricRect,type EraUpgradeMode} from './buildingFabric';
import type {ExtensionSide} from './extensionFootprints';
import type {HousingMaterials} from './housingTypes';
import {planStatus} from './construction';
import type {Game} from './sim';
import {PRODUCTION_RECIPES,productionIssue,type ProductionRecipe} from './production';
import {fibreGatherIssue} from './fibre';
import {clayIssue} from './pottery';
import {councilModel} from './rulersView';
import {armorEquipIssue,wornArmor} from './armor';
import {capitulationOffers} from './capitulation';

export const ENGINE_READ_MODEL_RULES={maximumSources:128,maximumCacheEntries:256,cacheMilliseconds:500,maximumMeasurements:240} as const;
export type EngineReadQuery=
 |{kind:'building-fabric';buildingId:number}
 |{kind:'construction-status';buildingIds:number[]}
 |{kind:'recipe-issues';workplaceId:number}
 |{kind:'fibre-issues';unitId:number;patchIds:number[]}
 |{kind:'clay-issues';unitId:number;depositIds:number[]}
 |{kind:'armor-choice';unitId:number}
 |{kind:'rulers-council'}
 |{kind:'capitulation-offers'};
export type FabricUpgradeChoice={mode:EraUpgradeMode;side?:ExtensionSide;issue:string|null;quote:HousingMaterials;workSeconds:number;target?:FabricRect};
export type EngineReadModel=
 |{kind:'building-fabric';buildingId:number;context:ReturnType<typeof fabricContext>;benefits:ReturnType<typeof eraUpgradeBenefits>;work?:{mode:EraUpgradeMode;phase:string;progress:number;duration:number;paid:boolean;paused:boolean;blockedReason?:string};choices:FabricUpgradeChoice[]}
 |{kind:'construction-status';statuses:{buildingId:number;status:string}[]}
 |{kind:'recipe-issues';workplaceId:number;issues:{recipe:ProductionRecipe;issue:string|null}[]}
 |{kind:'fibre-issues';unitId:number;issues:{patchId:number;issue:string|null}[]}
 |{kind:'clay-issues';unitId:number;issues:{depositId:number;issue:string|null}[]}
 |{kind:'armor-choice';unitId:number;wornArmorId?:number;availableArmorId?:number;issue:string|null}
 |{kind:'rulers-council';council:import('./rulersView').CouncilModel}
 |{kind:'capitulation-offers';offers:(ReturnType<typeof capitulationOffers>[number]&{defenderName:string})[]};
export type EngineReadReply={model:EngineReadModel;epoch:number;requestId:number;stateRevision:number;navigationRevision:number;cpuMilliseconds:number};
export type EngineReadReplyFor<Q extends EngineReadQuery>=Omit<EngineReadReply,'model'>&{model:Extract<EngineReadModel,{kind:Q['kind']}>};
const id=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
export function isEngineReadQuery(value:unknown):value is EngineReadQuery{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const q=value as Record<string,unknown>,list=(v:unknown)=>Array.isArray(v)&&v.length<=ENGINE_READ_MODEL_RULES.maximumSources&&Array.from(v).every(id)&&new Set(v).size===v.length;
 if(q.kind==='rulers-council'||q.kind==='capitulation-offers')return Object.keys(q).length===1;
 if(q.kind==='building-fabric')return Object.keys(q).every(k=>['kind','buildingId'].includes(k))&&id(q.buildingId);
 if(q.kind==='construction-status')return Object.keys(q).every(k=>['kind','buildingIds'].includes(k))&&list(q.buildingIds);
 if(q.kind==='recipe-issues')return Object.keys(q).every(k=>['kind','workplaceId'].includes(k))&&id(q.workplaceId);
 if(q.kind==='armor-choice')return Object.keys(q).every(k=>['kind','unitId'].includes(k))&&id(q.unitId);
 if(q.kind==='fibre-issues')return Object.keys(q).every(k=>['kind','unitId','patchIds'].includes(k))&&id(q.unitId)&&list(q.patchIds);
 if(q.kind==='clay-issues')return Object.keys(q).every(k=>['kind','unitId','depositIds'].includes(k))&&id(q.unitId)&&list(q.depositIds);
 return false;
}
/** Authoritative native read model. Routing/ownership caches never initialize on the display copy. */
export function applyEngineReadQuery(g:Game,query:EngineReadQuery):EngineReadModel{
 if(!isEngineReadQuery(query))throw new Error('Unsupported or malformed owner read query');
 if(query.kind==='rulers-council')return{kind:query.kind,council:councilModel(g)};
 if(query.kind==='capitulation-offers')return{kind:query.kind,offers:capitulationOffers(g).map(o=>({...o,defenderName:g.tribe(o.defenderTeam)?.name??'A community'}))};
 if(query.kind==='building-fabric'){
  const b=g.state.buildings.find(b=>b.id===query.buildingId&&b.team===0&&b.hp>0);if(!b)throw new Error('Original owned building is unavailable');
  // One open building, exactly five choices; no population/source cross product.
  const intents:Pick<FabricUpgradeChoice,'mode'|'side'>[]=[{mode:'rebuild'},...(['north','south','east','west'] as const).map(side=>({mode:'extend' as const,side}))];
  const choices=intents.map(({mode,side})=>{const q=ERA_UPGRADE_RULES[mode],issue=eraUpgradeIssue(g,b.id,mode,side);return{mode,...(side?{side}:{}),issue,quote:{wood:q.wood,stone:q.stone,plantFibre:q.plantFibre},workSeconds:q.workSeconds,...(!issue&&supportsEraUpgrade(b.type)?{target:planEraChange(g,b,mode,side).target}:{})};});
  const p=b.renovation,work=p&&(p.mode==='rebuild'||p.mode==='extend')?{mode:p.mode,phase:p.phase,progress:p.progress,duration:p.duration,paid:p.paid,paused:b.planPaused===true,...(p.blockedReason?{blockedReason:p.blockedReason}:{})}:undefined;
  return{kind:query.kind,buildingId:b.id,context:fabricContext(b),benefits:eraUpgradeBenefits(b),...(work?{work}:{}),choices};
 }
 if(query.kind==='construction-status'){return{kind:query.kind,statuses:query.buildingIds.flatMap(buildingId=>{const b=g.state.buildings.find(b=>b.id===buildingId&&b.team===0&&b.hp>0);return b?[{buildingId,status:planStatus(g,b)}]:[];})};}
 if(query.kind==='recipe-issues'){
  const b=g.state.buildings.find(b=>b.id===query.workplaceId&&b.team===0&&g.finished(b));
  if(!b)throw new Error('Original owned finished workplace is unavailable');
  const recipes=(Object.entries(PRODUCTION_RECIPES) as [ProductionRecipe,typeof PRODUCTION_RECIPES[ProductionRecipe]][]).filter(([,r])=>r.workplace===b.type);
  return{kind:query.kind,workplaceId:b.id,issues:recipes.map(([recipe])=>({recipe,issue:productionIssue(g,recipe,b.id)}))};
 }
 const u=g.state.units.find(u=>u.id===query.unitId&&u.team===0&&u.hp>0&&!u.prisoner);
 if(!u)throw new Error('Original owned resident is unavailable');
 if(query.kind==='fibre-issues'){
  // Only already witnessed sources are returned. Unknown requested IDs are omitted, never allowed.
  const known=new Set(g.state.fibre?.patches.filter(p=>p.knownTeams.includes(0)).map(p=>p.id));
  return{kind:query.kind,unitId:u.id,issues:query.patchIds.filter(id=>known.has(id)).map(patchId=>({patchId,issue:fibreGatherIssue(g,u.id,patchId)}))};
 }
 if(query.kind==='clay-issues'){
  const known=new Set(g.state.clay?.deposits.filter(d=>d.surveyedBy.includes(0)).map(d=>d.id));
  return{kind:query.kind,unitId:u.id,issues:query.depositIds.filter(id=>known.has(id)).map(depositId=>({depositId,issue:clayIssue(g,u.id,depositId)}))};
 }
 const worn=wornArmor(g,u);
 const candidates=(g.state.armor?.assets||[]).filter(a=>a.holder.kind!=='unit'&&(a.holder.kind==='ground'?g.visibleAt(a.holder.x,a.holder.z):a.team===u.team)&&Math.hypot(a.holder.x-u.x,a.holder.z-u.z)<=24);
 // Compute each native issue once, preserving the existing UI sort order and tie behavior.
 const choices=candidates.map(asset=>({asset,issue:armorEquipIssue(g,u.id,asset.id)})).sort((a,b)=>Number(!!a.issue)-Number(!!b.issue)||b.asset.condition-a.asset.condition);
 const available=choices[0];
 return{kind:'armor-choice',unitId:u.id,wornArmorId:worn?.id,availableArmorId:available?.asset.id,issue:available?available.issue:'No actual armor is available nearby'};
}
