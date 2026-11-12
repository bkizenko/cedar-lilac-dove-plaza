import {draftCartChoices} from './draftCart';
import {personName} from './people';
import {captiveGuardCoverage,presentPrisonerGuard,PRISONER_RULES} from './captivity';
import {armorRepairIssue} from './armorRepair';
import {copperStudyIssue} from './materialStudy';
import {teachingOffers,TRADED_TEACHING_RULES} from './tradedTeaching';
import {hasTaskCommitment} from './workCommitments';
import {isDependent} from './settlement';
import type {ResKind} from './types';
import {garmentRepairIssue} from './garmentRepair';
import {fabricContext,eraUpgradeBenefits,eraUpgradeIssue,planEraChange,supportsEraUpgrade,ERA_UPGRADE_RULES,type FabricRect,type EraUpgradeMode} from './buildingFabric';
import type {ExtensionSide} from './extensionFootprints';
import type {HousingMaterials} from './housingTypes';
import {planStatus} from './construction';
import type {Game} from './sim';
import {PRODUCTION_RECIPES,productionIssue,type ProductionRecipe} from './production';
import {fibreGatherIssue} from './fibre';
import {clayIssue} from './pottery';
import {councilModel} from './rulersView';
import {civicModel,type CivicModel} from './societyCivicRuntime';
import {societyDecisionsModel,type SocietyDecisionsModel} from './societyView';
import {combatModel,matchupModel,type CombatModel} from './combatView';
import {armorEquipIssue,wornArmor} from './armor';
import {capitulationOffers} from './capitulation';

export const ENGINE_READ_MODEL_RULES={maximumSources:128,maximumCacheEntries:256,cacheMilliseconds:500,maximumMeasurements:240} as const;
export type EngineReadQuery=
 |{kind:'draft-cart-choices';unitId:number}
 |{kind:'traded-teaching-offers';teacherId:number;learnerIds:number[]}
 |{kind:'copper-study-issues';workplaceId:number}
 |{kind:'building-fabric';buildingId:number}
 |{kind:'construction-status';buildingIds:number[]}
 |{kind:'recipe-issues';workplaceId:number}
 |{kind:'fibre-issues';unitId:number;patchIds:number[]}
 |{kind:'clay-issues';unitId:number;depositIds:number[]}
 |{kind:'garment-repair-issues';unitId:number;workplaceId?:number}
 |{kind:'armor-repair-issue';unitId:number;workplaceId?:number}
 |{kind:'armor-choice';unitId:number}
 |{kind:'rulers-council'}
 |{kind:'society-decisions'}
 |{kind:'society-civic'}
 |{kind:'combat-doctrine'}
 |{kind:'combat-matchup';attackerId:number;targetId:number}
 |{kind:'capitulation-offers'}
 |{kind:'captives'};
export type FabricUpgradeChoice={mode:EraUpgradeMode;side?:ExtensionSide;issue:string|null;quote:HousingMaterials;workSeconds:number;target?:FabricRect};
export type EngineReadModel=
 |({kind:'draft-cart-choices';unitId:number}&ReturnType<typeof draftCartChoices>)
 |{kind:'traded-teaching-offers';teacherId:number;offers:ReturnType<typeof teachingOffers>;learner:{id:number;good:ResKind}|null;issue:string|null}
 |{kind:'copper-study-issues';workplaceId:number;logs:string|null;charcoal:string|null}
 |{kind:'building-fabric';buildingId:number;context:ReturnType<typeof fabricContext>;benefits:ReturnType<typeof eraUpgradeBenefits>;work?:{mode:EraUpgradeMode;phase:string;progress:number;duration:number;paid:boolean;paused:boolean;blockedReason?:string};choices:FabricUpgradeChoice[]}
 |{kind:'construction-status';statuses:{buildingId:number;status:string}[]}
 |{kind:'recipe-issues';workplaceId:number;issues:{recipe:ProductionRecipe;issue:string|null}[]}
 |{kind:'fibre-issues';unitId:number;issues:{patchId:number;issue:string|null}[]}
 |{kind:'clay-issues';unitId:number;issues:{depositId:number;issue:string|null}[]}
 |{kind:'garment-repair-issues';unitId:number;worn:string|null;spare:string|null}
 |{kind:'armor-repair-issue';unitId:number;issue:string|null}
 |{kind:'armor-choice';unitId:number;wornArmorId?:number;availableArmorId?:number;issue:string|null}
 |{kind:'rulers-council';council:import('./rulersView').CouncilModel}
 |{kind:'society-decisions';societies:SocietyDecisionsModel}
 |{kind:'society-civic';civic:CivicModel}
 |{kind:'combat-doctrine';combat:CombatModel}
 |{kind:'combat-matchup';attackerId:number;targetId:number;multiplier:number;reasons:string[]}
 |{kind:'capitulation-offers';offers:(ReturnType<typeof capitulationOffers>[number]&{defenderName:string})[]}
 |{kind:'captives';captives:{id:number;name:string;fromTeam:number;fromName:string;resistance:number;guarded:boolean;canEscort:boolean;custody?:'escorting'|'custody';food?:number;waterLiters?:number}[]};
export type EngineReadReply={model:EngineReadModel;epoch:number;requestId:number;stateRevision:number;navigationRevision:number;cpuMilliseconds:number};
export type EngineReadReplyFor<Q extends EngineReadQuery>=Omit<EngineReadReply,'model'>&{model:Extract<EngineReadModel,{kind:Q['kind']}>};
const id=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
export function isEngineReadQuery(value:unknown):value is EngineReadQuery{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const q=value as Record<string,unknown>,list=(v:unknown)=>Array.isArray(v)&&v.length<=ENGINE_READ_MODEL_RULES.maximumSources&&Array.from(v).every(id)&&new Set(v).size===v.length;
 if(q.kind==='combat-matchup')return Object.keys(q).every(k=>['kind','attackerId','targetId'].includes(k))&&id(q.attackerId)&&id(q.targetId);
 if(q.kind==='rulers-council'||q.kind==='society-decisions'||q.kind==='society-civic'||q.kind==='combat-doctrine'||q.kind==='capitulation-offers'||q.kind==='captives')return Object.keys(q).length===1;
 if(q.kind==='traded-teaching-offers')return Object.keys(q).every(k=>['kind','teacherId','learnerIds'].includes(k))&&id(q.teacherId)&&list(q.learnerIds);
 if(q.kind==='copper-study-issues')return Object.keys(q).every(k=>['kind','workplaceId'].includes(k))&&id(q.workplaceId);
 if(q.kind==='building-fabric')return Object.keys(q).every(k=>['kind','buildingId'].includes(k))&&id(q.buildingId);
 if(q.kind==='construction-status')return Object.keys(q).every(k=>['kind','buildingIds'].includes(k))&&list(q.buildingIds);
 if(q.kind==='recipe-issues')return Object.keys(q).every(k=>['kind','workplaceId'].includes(k))&&id(q.workplaceId);
 if(q.kind==='garment-repair-issues')return Object.keys(q).every(k=>['kind','unitId','workplaceId'].includes(k))&&id(q.unitId)&&(q.workplaceId===undefined||id(q.workplaceId));
 if(q.kind==='armor-repair-issue')return Object.keys(q).every(k=>['kind','unitId','workplaceId'].includes(k))&&id(q.unitId)&&(q.workplaceId===undefined||id(q.workplaceId));
 if(q.kind==='draft-cart-choices')return Object.keys(q).every(k=>['kind','unitId'].includes(k))&&id(q.unitId);
 if(q.kind==='armor-choice')return Object.keys(q).every(k=>['kind','unitId'].includes(k))&&id(q.unitId);
 if(q.kind==='fibre-issues')return Object.keys(q).every(k=>['kind','unitId','patchIds'].includes(k))&&id(q.unitId)&&list(q.patchIds);
 if(q.kind==='clay-issues')return Object.keys(q).every(k=>['kind','unitId','depositIds'].includes(k))&&id(q.unitId)&&list(q.depositIds);
 return false;
}
/** Authoritative native read model. Routing/ownership caches never initialize on the display copy. */
export function applyEngineReadQuery(g:Game,query:EngineReadQuery):EngineReadModel{
 if(!isEngineReadQuery(query))throw new Error('Unsupported or malformed owner read query');
 if(query.kind==='copper-study-issues')return{kind:query.kind,workplaceId:query.workplaceId,logs:copperStudyIssue(g,query.workplaceId,0,'logs'),charcoal:copperStudyIssue(g,query.workplaceId,0,'charcoal')};
 if(query.kind==='traded-teaching-offers'){
  const teacher=g.state.units.find(u=>u.id===query.teacherId&&u.hp>0),owned=g.state.units.filter(u=>u.team===0&&u.hp>0);
  const preferred=query.learnerIds.flatMap(id=>{const u=owned.find(u=>u.id===id);return u?[u]:[];});
  const nearby=teacher?owned.filter(u=>Math.hypot(u.x-teacher.x,u.z-teacher.z)<=TRADED_TEACHING_RULES.contactMeters).sort((a,b)=>Math.hypot(a.x-teacher.x,a.z-teacher.z)-Math.hypot(b.x-teacher.x,b.z-teacher.z)||a.id-b.id):[];
  const candidates=[...new Map([...preferred,...nearby].map(u=>[u.id,u])).values()];
  const carriers=candidates.filter(u=>teacher&&Math.hypot(u.x-teacher.x,u.z-teacher.z)<=TRADED_TEACHING_RULES.contactMeters&&u.carry>=1&&u.carryType&&['food','wood','stone','copper','iron'].includes(u.carryType));
  const learner=carriers.find(u=>u.type==='worker'&&!u.militia&&!u.prisoner&&u.enslavedFrom===undefined&&!isDependent(g,u)&&!u.boat&&!u.emergency&&!u.recalled&&!hasTaskCommitment(u)&&['idle','hold','gather'].includes(u.order));
  return{kind:query.kind,teacherId:query.teacherId,offers:teachingOffers(g,query.teacherId),learner:learner?{id:learner.id,good:learner.carryType!}:null,issue:learner?null:!carriers.length?'Bring your adult carrying payment within 26 metres of this artisan':'Nearby payment carriers must finish their current duty before learning'};
 }
 if(query.kind==='rulers-council')return{kind:query.kind,council:councilModel(g)};
 if(query.kind==='combat-doctrine')return{kind:query.kind,combat:combatModel(g)};
 if(query.kind==='combat-matchup')return{kind:query.kind,attackerId:query.attackerId,targetId:query.targetId,...matchupModel(g,query.attackerId,query.targetId)};
 if(query.kind==='society-decisions')return{kind:query.kind,societies:societyDecisionsModel(g)};
 if(query.kind==='society-civic')return{kind:query.kind,civic:civicModel(g)};
 if(query.kind==='captives'){const guards=captiveGuardCoverage(g);return{kind:query.kind,captives:g.state.units.filter(u=>u.team===0&&u.hp>0&&(u.enslavedFrom!==undefined||u.prisoner?.captorTeam===0&&u.prisoner.phase!=='released')).map(u=>{const p=u.prisoner,from=p?.originTeam??u.enslavedFrom!;return{id:u.id,name:personName(u),fromTeam:from,fromName:g.tribe(from)?.name||'a former settlement',resistance:p?Math.min(100,Math.round(p.unguardedSeconds/PRISONER_RULES.unguardedEscapeSeconds*100)):Math.round(u.captivityUnrest||0),guarded:p?!!presentPrisonerGuard(g,u):guards.has(u.id),canEscort:p?true:!!u.recalled,...(p&&p.phase!=='released'?{custody:p.phase,food:p.food,waterLiters:p.waterLiters}:{})};})};}
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
 if(query.kind==='draft-cart-choices')return{kind:query.kind,unitId:u.id,...draftCartChoices(g,u.id)};
 if(query.kind==='armor-repair-issue')return{kind:query.kind,unitId:u.id,issue:armorRepairIssue(g,u.id,query.workplaceId)};
 if(query.kind==='garment-repair-issues')return{kind:query.kind,unitId:u.id,worn:garmentRepairIssue(g,u.id,'worn',query.workplaceId),spare:garmentRepairIssue(g,u.id,'spare',query.workplaceId)};
 const worn=wornArmor(g,u);
 const candidates=(g.state.armor?.assets||[]).filter(a=>a.holder.kind!=='unit'&&(a.holder.kind==='ground'?g.visibleAt(a.holder.x,a.holder.z):a.team===u.team)&&Math.hypot(a.holder.x-u.x,a.holder.z-u.z)<=24);
 // Compute each native issue once, preserving the existing UI sort order and tie behavior.
 const choices=candidates.map(asset=>({asset,issue:armorEquipIssue(g,u.id,asset.id)})).sort((a,b)=>Number(!!a.issue)-Number(!!b.issue)||b.asset.condition-a.asset.condition);
 const available=choices[0];
 return{kind:'armor-choice',unitId:u.id,wornArmorId:worn?.id,availableArmorId:available?.asset.id,issue:available?available.issue:'No actual armor is available nearby'};
}
