import type {Game} from './sim';
import type {Building,GameState,BldType} from './types';
import type {HousingMaterials,HousingRenovation} from './housingTypes';
import {BUILDINGS} from './constants';
import {extensionFootprint,extensionTerrainCheck,type ExtensionSide} from './extensionFootprints';
export const ERA_UPGRADE_RULES={version:1,maximumCompletions:2,durabilityFraction:.15,rebuild:{wood:24,stone:8,plantFibre:0,workSeconds:48},extend:{wood:48,stone:16,plantFibre:0,workSeconds:96},clearanceMetres:.5} as const;
/** Plots, ports, defences and landscape works keep their own upgrade contracts. */
export const ERA_UPGRADE_TYPES=['hut','house','townhall','barracks','hearth','dryrack','smokehouse','butcher','tanner','tailor','kiln'] as const satisfies readonly BldType[];
export type EraUpgradeMode='rebuild'|'extend';
export type FabricRect={x:number;z:number;w:number;d:number};
export type EraChange={version:1;type:BldType;targetEra:number;original:FabricRect;target:FabricRect;side?:ExtensionSide;growMetres?:number};
export type FabricCompletion=EraChange&{mode:EraUpgradeMode;paidBy:number;materials:HousingMaterials;workSeconds:number;completedAt:number;makerId:number};
export type BuildingFabric={version:1;built:{era:number;wealth:number;legacy?:true};baseMaxHp:number;upgrades:FabricCompletion[]};
export const supportsEraUpgrade=(type:BldType)=>(ERA_UPGRADE_TYPES as readonly BldType[]).includes(type);
export function newBuildingFabric(era:number,maxHp:number,legacy=false):BuildingFabric{return{version:1,built:{era,wealth:0,...(legacy?{legacy:true as const}:{})},baseMaxHp:maxHp,upgrades:[]};}
export function ensureBuildingFabric(g:Game,b:Building){return b.fabric??=(newBuildingFabric(g.tribe(b.team)?.age??g.state.age,b.maxHp,true));}
export function fabricMaximumHp(f:BuildingFabric){return f.baseMaxHp*(1+f.upgrades.length*ERA_UPGRADE_RULES.durabilityFraction);}
/** Plain presentation data only; no runtime scene dependency, mutation or migration. */
export function fabricContext(b:Building){const f=b.fabric;if(!f)return undefined;let built={era:f.built.era,wealth:f.built.wealth};let extensions:{era:number}[]=[];for(const u of f.upgrades){if(u.mode==='rebuild'){built={era:u.targetEra,wealth:built.wealth};extensions=[];}else extensions.push({era:u.targetEra});}return{eraMode:'fixed' as const,built,extensions};}
export function eraUpgradeBenefits(b:Building){return{completed:b.fabric?.upgrades.length??0,repairableMaximumHp:b.maxHp,currentHp:b.hp,durabilityFraction:(b.fabric?.upgrades.length??0)*ERA_UPGRADE_RULES.durabilityFraction};}
export function reservedBuildingFootprint(b:Building):FabricRect{return b.renovation?.mode==='extend'&&b.renovation.eraChange?b.renovation.eraChange.target:{x:b.x,z:b.z,w:b.expansion?.w??b.w,d:b.expansion?.d??b.d};}
export function rectanglesOverlap(a:FabricRect,b:FabricRect,clearance=0){return Math.abs(a.x-b.x)<(a.w+b.w)/2+clearance&&Math.abs(a.z-b.z)<(a.d+b.d)/2+clearance;}
const rect=(b:Building):FabricRect=>({x:b.x,z:b.z,w:b.w,d:b.d});
const sameRect=(a:FabricRect,b:FabricRect)=>['x','z','w','d'].every(k=>Math.abs(a[k as keyof FabricRect]-b[k as keyof FabricRect])<1e-7);
const sideValid=(s:unknown):s is ExtensionSide=>['north','south','east','west'].includes(String(s));
export function eraUpgradeIssue(g:Game,id:number,mode:EraUpgradeMode,side?:ExtensionSide,team=0){
 const b=g.state.buildings.find(b=>b.id===id&&b.team===team);
 if(!b)return 'Choose an owned standing building';
 if(mode!=='rebuild'&&mode!=='extend')return 'Choose rebuild or extension';
 if(!supportsEraUpgrade(b.type))return 'This building uses its own plot, port, defence or landscape upgrade rules';
 if(g.state.ended||!g.finished(b))return 'Finish the standing building first';
 if(b.renovation||b.expansion||b.repair||g.state.retainedBuildingRepairs?.some(p=>p.buildingId===b.id)||b.plannedCost||b.sitePreparation&&b.sitePreparation.completedAt===undefined&&b.sitePreparation.cancelledAt===undefined)return 'Finish the existing building work first';
 if((b.fabric?.upgrades.length??0)>=ERA_UPGRADE_RULES.maximumCompletions)return 'Two paid fabric upgrades already completed';
 const currentEra=fabricContext(b)?.built.era??g.tribe(team).age;
 if(mode==='rebuild'&&g.tribe(team).age<=currentEra)return 'A rebuild needs newer local building techniques';
 if(mode==='extend'&&!sideValid(side))return 'Choose a real side for the extension';
 if(!g.dryFoundation(b.type,b.x,b.z,0,b))return 'The original building foundation must remain dry';
 if(mode==='extend')return extensionIssue(g,b,side!);
 return null;
}
function extensionIssue(g:Game,b:Building,side:ExtensionSide){
 const grow=BUILDINGS[b.type][side==='east'||side==='west'?'w':'d'];
 // Native finite base dimensions bound World sampling. Never pass arbitrary user sizes.
 const report=extensionTerrainCheck(g,b,side,{growMetres:grow,team:b.team});
 if(report.issues.length)return report.issues[0];
 for(const other of g.state.buildings){if(other.id===b.id||other.hp<=0)continue;if(rectanglesOverlap(report.footprint,reservedBuildingFootprint(other),ERA_UPGRADE_RULES.clearanceMetres))return 'Another building or reserved wing occupies the full extension footprint';}
 return null;
}
export function planEraChange(g:Game,b:Building,mode:EraUpgradeMode,side?:ExtensionSide):EraChange{
 const original=rect(b),grow=mode==='extend'?BUILDINGS[b.type][side==='east'||side==='west'?'w':'d']:undefined;
 return{version:1,type:b.type,targetEra:g.tribe(b.team).age,original,target:mode==='extend'?extensionFootprint(b,side!,grow!).full:{...original},...(mode==='extend'?{side,growMetres:grow}:{})};
}
export function eraUpgradeCommitIssue(g:Game,b:Building,p:HousingRenovation){
 const c=p.eraChange;if(!c)return 'Missing paid fabric upgrade intent';
 if(!sameRect(rect(b),c.original))return 'The original building footprint changed; paid work remains held';
 if((b.fabric?.upgrades.length??0)>=ERA_UPGRADE_RULES.maximumCompletions)return 'Fabric upgrade limit reached; paid work remains held';
 if(!g.dryFoundation(b.type,b.x,b.z,0,b))return 'The original foundation is no longer dry';
 if(p.mode==='extend'){
  const issue=extensionIssue(g,b,c.side!);if(issue)return issue;
  if(g.state.units.some(u=>u.hp>0&&Math.abs(u.x-c.target.x)<c.target.w/2+u.r&&Math.abs(u.z-c.target.z)<c.target.d/2+u.r))return 'Clear living people from the completed full wing footprint';
 }
 return null;
}
/** Caller has delivered the entire paid packet and completed the real labour. */
export function commitEraUpgrade(g:Game,b:Building,p:HousingRenovation,makerId:number){
 const maker=g.state.units.find(u=>u.id===makerId&&u.team===b.team&&u.hp>0&&!u.prisoner);
 if(b.renovation!==p||p.actorId!==makerId||!maker||!validEraRenovation(p,g.state))return 'The actual paid project and its living builder must own completion';
 const issue=eraUpgradeCommitIssue(g,b,p);if(issue)return issue;
 if(!['rebuild','extend'].includes(p.mode)||!p.paid||p.progress+1e-8<p.duration||!p.eraChange||!['wood','stone','plantFibre'].every(k=>Math.abs(p.delivered[k as keyof HousingMaterials]-p.quote[k as keyof HousingMaterials])<1e-7))return 'Actual paid materials and labour must finish first';
 const f=ensureBuildingFabric(g,b),c=p.eraChange;
 f.upgrades.push({...c,mode:p.mode as EraUpgradeMode,paidBy:p.paidBy,materials:{...p.quote},workSeconds:p.duration,completedAt:g.state.time,makerId});
 b.x=c.target.x;b.z=c.target.z;b.w=c.target.w;b.d=c.target.d;b.maxHp=fabricMaximumHp(f);delete b.renovation; // Current damage is retained, not healed.
 g.state.walkDirty=true;g.rebuildWalk();g.workBoard.reset();return null;
}
const obj=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const only=(v:object,keys:string[])=>Object.keys(v).every(k=>keys.includes(k));
const number=(v:unknown,min=0,max=1e6):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const era=(v:unknown):v is number=>Number.isInteger(v)&&number(v,0,5);
const validRect=(v:unknown,half:number):v is FabricRect=>obj(v)&&only(v,['x','z','w','d'])&&number(v.x,-half,half)&&number(v.z,-half,half)&&number(v.w,.1,240)&&number(v.d,.1,240)&&Math.abs(v.x)+v.w/2<=half&&Math.abs(v.z)+v.d/2<=half;
function validChange(c:unknown,mode:EraUpgradeMode,type:BldType,half:number){
 if(!obj(c)||!only(c,['version','type','targetEra','original','target','side','growMetres'])||c.version!==1||c.type!==type||!supportsEraUpgrade(type)||!era(c.targetEra)||!validRect(c.original,half)||!validRect(c.target,half))return false;
 if(mode==='rebuild')return c.side===undefined&&c.growMetres===undefined&&sameRect(c.original,c.target);
 if(!sideValid(c.side))return false;const axis=c.side==='east'||c.side==='west'?'w':'d',grow=BUILDINGS[type][axis];
 return c.growMetres===grow&&c.target[axis]<=grow*3+1e-7&&sameRect(c.target,extensionFootprint(c.original,c.side,grow).full);
}
/** Strict optional schema: legacy absence never grants receipts or extra durability. */
export function validFabricState(s:GameState){
 const half=(s.worldOptions?.size??1560)/2,team=(n:number)=>Number.isInteger(n)&&!!s.tribes[n];
 for(const b of s.buildings){
  const f=b.fabric;
  if(f!==undefined){
   if(!supportsEraUpgrade(b.type)||!obj(f)||!only(f,['version','built','baseMaxHp','upgrades'])||f.version!==1||!obj(f.built)||!only(f.built,['era','wealth','legacy'])||!era(f.built.era)||!number(f.built.wealth,0,1)||f.built.legacy!==undefined&&f.built.legacy!==true||!number(f.baseMaxHp,1)||!Array.isArray(f.upgrades)||f.upgrades.length>2)return false;
   let previous:FabricRect|undefined,at=0,builtEra=f.built.era;
   for(const r of f.upgrades){
    if(!obj(r)||!only(r,['version','type','targetEra','original','target','side','growMetres','mode','paidBy','materials','workSeconds','completedAt','makerId'])||!['rebuild','extend'].includes(r.mode))return false;
    const {mode,paidBy,materials,workSeconds,completedAt,makerId,...c}=r,q=ERA_UPGRADE_RULES[mode as EraUpgradeMode];
    if(!validChange(c,mode,c.type,half)||!team(paidBy)||!obj(materials)||!only(materials,['wood','stone','plantFibre'])||materials.wood!==q.wood||materials.stone!==q.stone||materials.plantFibre!==q.plantFibre||workSeconds!==q.workSeconds||!number(completedAt,at,s.time)||!Number.isSafeInteger(makerId)||makerId<1||makerId>=s.nextId||previous&&!sameRect(previous,c.original)||mode==='rebuild'&&c.targetEra<=builtEra)return false;
    previous=c.target;at=completedAt;if(mode==='rebuild')builtEra=c.targetEra;
   }
   if(previous&&!sameRect(previous,rect(b))||Math.abs(b.maxHp-fabricMaximumHp(f))>1e-6)return false;
  }
  const p=b.renovation;if(!p)continue;
  if(p.mode==='rebuild'||p.mode==='extend'){
   const q=ERA_UPGRADE_RULES[p.mode];
   if(b.build!==1||b.expansion||b.repair||b.plannedCost||!supportsEraUpgrade(b.type)||!f||!validEraRenovation(p,s)||!validChange(p.eraChange,p.mode,b.type,half)||!sameRect(p.eraChange!.original,rect(b))||p.duration!==q.workSeconds||p.quote.wood!==q.wood||p.quote.stone!==q.stone||p.quote.plantFibre!==q.plantFibre||f.upgrades.length>=2)return false;
  }else if(p.eraChange!==undefined)return false;
 }
 return true;
}

/** Retained failed/destroyed targets keep a fully validated paid intent, not a new receipt. */
export function validEraRenovation(p:HousingRenovation,s:GameState){
 if(p.mode!=='rebuild'&&p.mode!=='extend')return p.eraChange===undefined;
 const c=p.eraChange,q=ERA_UPGRADE_RULES[p.mode];
 return !!c&&validChange(c,p.mode,c.type,(s.worldOptions?.size??1560)/2)&&p.duration===q.workSeconds&&p.quote.wood===q.wood&&p.quote.stone===q.stone&&p.quote.plantFibre===q.plantFibre;
}
