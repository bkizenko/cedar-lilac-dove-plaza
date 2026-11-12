import {armorRepairIssue,beginArmorRepair,pauseArmorRepair,resumeArmorRepair,cancelArmorRepair} from './armorRepair';
import {beginCopperStudy,copperStudyIssue} from './materialStudy';
import {beginTradedTeaching,cancelTradedTeaching,TRADED_TEACHING_RULES} from './tradedTeaching';
import type {ResKind} from './types';
import {beginGarmentRepair,garmentRepairIssue,pauseGarmentRepair,resumeGarmentRepair,cancelGarmentRepair,type GarmentSlot} from './garmentRepair';
import {beginEraUpgrade,setHousingPaused} from './housing';
import type {ExtensionSide} from './extensionFootprints';
import {equipArmor,unequipArmor} from './armor';
import {surveyFibre,beginFibreGather,returnFibreLoad,equipBasket} from './fibre';
import {surveyClay,beginClayGather,equipWaterVessel} from './pottery';
import {GARMENT_KINDS,type GarmentKind} from './textiles';
import type {Game} from './sim';
import type {ProductionRecipe} from './production';
import {PRODUCTION_RECIPES,beginProduction,pauseProductionProject,resumeProduction,productionIssue,unloadProductionProject,queueDairyVesselCleaning,discardDairyProject,equipClothing,swapClothing} from './production';
import {craftSiteReport,controlCraftSiteJob,type CraftSiteJob} from './craftSiteReport';
import {queueConstruction,setConstructionPriority,pauseConstructionQueue,resumeConstructionQueue,editConstructionQueue} from './constructionQueue';
import {setSitePreparationPaused} from './sitePreparation';
import {orderConstruction} from './construction';
import {acceptCapitulation,refuseCapitulation,type CapitulationOutcome} from './capitulation';
import {marryHouses,fosterHouses,exchangeHostages} from './rulersRuntime';
import {setPreferredFormation} from './combatDoctrine';
import {validFormationKind,type FormationKind} from './formations';
import {beginPortWork,resumePortWork,resupplyVessel} from './navalPorts';
import {commissionVessel,beginBoarding,boardNearest} from './navalFleet';
import {PORT_WORK_IDS,DESIGN_IDS,type PortWork} from './navalClasses';
import {appointCommander,assignToCommander,releaseFromCommander,promoteCommander,commandersOf} from './commanders';
import {assignGuardDuty,releaseGuardDuty,type GuardDutyKind} from './guardDuty';
export type EngineSelection={selectedUnitIds:readonly number[];selectedBuildingId?:number;selectedBoatId?:number};
export type EngineDispatchCommand=
 |{kind:'begin-era-upgrade';buildingId:number;mode:'rebuild'}
 |{kind:'begin-era-upgrade';buildingId:number;mode:'extend';side:ExtensionSide}
 |{kind:'era-upgrade-pause';buildingId:number;paused:boolean}
 |{kind:'cancel-interaction'}|{kind:'hold-selected';unitIds:number[]}
 |{kind:'pause';paused:boolean}|{kind:'speed';speed:1|2|4;resume?:boolean}
 |{kind:'move';unitIds:number[];x:number;z:number;attackMove?:boolean}
 |{kind:'begin-traded-teaching';learnerId:number;teacherId:number;siteId:number;methodId:ProductionRecipe;good:ResKind;qty:number}
 |{kind:'cancel-traded-teaching';learnerId:number}
 |{kind:'begin-copper-study';workplaceId:number;fuel:'logs'|'charcoal'}
 |{kind:'begin-production';recipe:ProductionRecipe;workplaceId:number;unitId?:number}
 |{kind:'pause-production';projectId:number}|{kind:'resume-production';projectId:number;unitId?:number}
 |{kind:'survey-fibre';unitId:number}
 |{kind:'return-fibre';unitId:number}
 |{kind:'equip-basket';unitId:number}
 |{kind:'survey-clay';unitId:number}
 |{kind:'equip-water-vessel';unitId:number}
 |{kind:'swap-clothing';unitId:number}
 |{kind:'gather-fibre';unitId:number;patchId:number}|{kind:'gather-clay';unitId:number;depositId:number}
 |{kind:'equip-armor';unitId:number;armorId:number}|{kind:'unequip-armor';unitId:number}
 |{kind:'armor-repair';unitId:number;workplaceId?:number}
 |{kind:'armor-repair-control';unitId:number;action:'pause'|'resume'|'cancel'}
 |{kind:'garment-repair';unitId:number;slot:GarmentSlot;workplaceId?:number}
 |{kind:'garment-repair-control';unitId:number;action:'pause'|'resume'|'cancel'}
 |{kind:'equip-clothing';unitId:number;item:GarmentKind}
 |{kind:'set-auto-work';enabled:boolean}|{kind:'defense-horn'}|{kind:'recall'}
 |{kind:'production-control';projectId:number;action:'pause'|'resume'|'unload';unitId?:number}
 |{kind:'dairy-clean';projectId:number;unitId?:number}|{kind:'dairy-discard';projectId:number}
 |{kind:'marry-houses';team:number}|{kind:'foster-houses';team:number}|{kind:'exchange-hostages';team:number}
 |{kind:'set-formation';formation:FormationKind}|{kind:'guard-duty';unitId:number;duty:GuardDutyKind}|{kind:'release-guard';unitId:number}
 |{kind:'accept-capitulation';frontId:number;outcome:CapitulationOutcome}|{kind:'refuse-capitulation';frontId:number}
 |{kind:'commander-order';action:'appoint'|'replace'|'assign'|'release'|'promote';unitId?:number;commanderId?:number;commandKind?:'army'|'fleet';ids?:number[];promotionId?:string;replacesId?:number}
 |{kind:'naval-order';action:'port-work'|'resume-port-work'|'commission'|'board'|'resupply';dockId?:number;work?:PortWork;design?:string;builderId?:number;projectId?:number;boatId?:number;targetBoatId?:number;food?:number;missileLoads?:number}
 |{kind:'boat-stop';boatId:number}
 |{kind:'construction-priority';buildingId:number;priority:0|1|2}
 |{kind:'site-preparation-pause';buildingId:number;paused:boolean}
 |{kind:'paused-plan';buildingId:number;paused:boolean}
 |{kind:'queue-construction';buildingId:number}|{kind:'order-construction';buildingId:number}
 |{kind:'construction-queue-control';unitId:number;action:'pause'|'resume'|'up'|'down'|'remove';siteId?:number}
 |{kind:'craft-site-control';buildingId:number;jobKind:CraftSiteJob['kind'];projectId?:number;actorId:number|null;action:'pause'|'resume'|'unload'};
export type EngineCommandOutcome={accepted:boolean;reason:string;projectId?:number};
export type EngineDispatchResult=EngineCommandOutcome&{sequence:number;stateRevision:number;epoch:number};
export type EngineDispatch=(command:EngineDispatchCommand,selection?:EngineSelection)=>Promise<EngineDispatchResult>;
const integer=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>0;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const R={maximumActorsPerCommand:128};
function selectedOwnedPeople(g:Game,s:EngineSelection){return s.selectedUnitIds.map(id=>g.state.units.find(u=>u.id===id&&u.team===0&&u.hp>0)).filter((u):u is NonNullable<typeof u>=>!!u);}
/** Shared native executor. Only authoritative WorkerGame or main-mode Game may call this. */
export function applyEngineCommand(g:Game,command:EngineDispatchCommand,selection:EngineSelection={selectedUnitIds:[]}):EngineCommandOutcome{
  const no=(reason:string)=>({accepted:false,reason});if(!isEngineDispatchCommand(command)||!isEngineSelection(selection))return no('Unsupported or malformed command payload');
  if('unitId' in command&&command.unitId!==undefined&&!g.state.units.some(u=>u.id===command.unitId&&u.team===0&&u.hp>0))return no('Original owned person unavailable');
  switch(command.kind){
   case 'begin-copper-study':{const issue=copperStudyIssue(g,command.workplaceId,0,command.fuel);if(issue)return no(issue);const accepted=beginCopperStudy(g,command.workplaceId,0,command.fuel);return{accepted,reason:accepted?'Copper trial assigned; materials load at storage, original payment retained on resume':copperStudyIssue(g,command.workplaceId,0,command.fuel)||'Copper trial unavailable'};}
   case 'begin-traded-teaching':{
    if(!g.state.units.some(u=>u.id===command.learnerId&&u.team===0&&u.hp>0))return no('Original owned learner unavailable');
    return beginTradedTeaching(g,{learnerId:command.learnerId,teacherId:command.teacherId,siteId:command.siteId,methodId:command.methodId,good:command.good,qty:command.qty});
   }
   case 'cancel-traded-teaching':{
    if(!g.state.units.some(u=>u.id===command.learnerId&&u.team===0&&u.hp>0))return no('Original owned learner unavailable');
    const accepted=cancelTradedTeaching(g,command.learnerId);return{accepted,reason:accepted?'Lesson cancelled; undelivered cargo retained, delivered payment not refunded':'No active paid lesson belongs to this learner'};
   }
   case 'begin-era-upgrade':{
    if(selectedOwnedPeople(g,selection).length!==selection.selectedUnitIds.length)return no('An explicitly selected original resident is unavailable');
    applyEngineSelection(g,selection);
    return beginEraUpgrade(g,command.buildingId,command.mode,command.mode==='extend'?command.side:undefined);
   }
   case 'era-upgrade-pause':{
    const b=g.state.buildings.find(b=>b.id===command.buildingId&&b.team===0&&b.hp>0);
    if(!b?.renovation||!['rebuild','extend'].includes(b.renovation.mode))return no('Original owned fabric upgrade unavailable');
    const accepted=setHousingPaused(g,b.id,command.paused);return{accepted,reason:accepted?'Paid fabric work updated; physical inputs retained':'Fabric work cannot make that transition'};
   }
   case 'cancel-interaction':g.state.placing=null;g.state.pendingAge=false;g.clearSelect();return{accepted:true,reason:'Interaction cancelled'};
   case 'hold-selected':{
    const people=command.unitIds.map(id=>g.state.units.find(u=>u.id===id&&u.team===0&&u.hp>0));if(people.some(u=>!u))return no('An original selected resident is unavailable');
    for(const u of people){u!.order='hold';u!.pillage=-1;u!.target=null;u!.attackDestination=null;}return{accepted:true,reason:'Selected residents holding'};
   }
   case 'pause':if(typeof command.paused!=='boolean')return no('Invalid pause value');g.state.paused=command.paused;return{accepted:true,reason:'Pause applied'};
   case 'speed':if(![1,2,4].includes(command.speed))return no('Invalid simulation speed');g.state.speed=command.speed;if(command.resume===true)g.state.paused=false;return{accepted:true,reason:'Speed applied'};
   case 'move':{
    if(!Array.isArray(command.unitIds)||!command.unitIds.length||command.unitIds.length>R.maximumActorsPerCommand||command.unitIds.some(id=>!integer(id))||new Set(command.unitIds).size!==command.unitIds.length)return no('Choose distinct existing residents');
    if(!Number.isFinite(command.x)||!Number.isFinite(command.z)||Math.abs(command.x)>g.world.size/2-1||Math.abs(command.z)>g.world.size/2-1||command.attackMove!==undefined&&typeof command.attackMove!=='boolean')return no('Invalid destination');
    const units=command.unitIds.map(id=>g.state.units.find(u=>u.id===id&&u.team===0&&u.hp>0&&!u.prisoner&&!u.boat));if(units.some(u=>!u))return no('An original land resident is unavailable; this core does not implement hull orders');
    g.clearSelect();for(const u of units)g.selectEntity(u!,true);g.issueMove(command.x,command.z,command.attackMove===true);return{accepted:true,reason:'Move issued to original residents'};
   }
   case 'begin-production':{
    if(!integer(command.workplaceId)||(command.unitId!==undefined&&!integer(command.unitId))||typeof command.recipe!=='string'||!Object.hasOwn(PRODUCTION_RECIPES,command.recipe))return no('Invalid recipe or original actor/workplace ID');
    const b=g.state.buildings.find(b=>b.id===command.workplaceId&&b.team===0&&b.hp>0),u=command.unitId===undefined?undefined:g.state.units.find(u=>u.id===command.unitId&&u.team===0&&u.hp>0);if(!b||command.unitId!==undefined&&!u)return no('The original owned workplace or person is unavailable');
    const issue=productionIssue(g,command.recipe,b.id,command.unitId);if(issue)return no(issue);
    const before=new Set(g.state.production?.projects.map(p=>p.id)||[]);
    if(!beginProduction(g,command.recipe,b.id,command.unitId))return no(g.state.banner||'Paid production admission failed');
    return{accepted:true,reason:'Actual inputs paid once; original person begins work',projectId:g.state.production?.projects.find(p=>!before.has(p.id)&&p.workplace===b.id&&p.recipe===command.recipe)?.id};
   }
   case 'pause-production':case 'resume-production':{
    if(!integer(command.projectId)||!g.state.production?.projects.some(p=>p.id===command.projectId&&p.team===0))return no('The original owned project is unavailable');
    if(command.kind==='resume-production'&&command.unitId!==undefined&&(!integer(command.unitId)||!g.state.units.some(u=>u.id===command.unitId&&u.team===0&&u.hp>0)))return no('The original owned person is unavailable');
    const accepted=command.kind==='pause-production'?pauseProductionProject(g,command.projectId):resumeProduction(g,command.projectId,command.unitId);return{accepted,reason:accepted?'Original paid project updated':'Original paid project cannot make that transition'};
   }
   case 'armor-repair':{const issue=armorRepairIssue(g,command.unitId,command.workplaceId);if(issue)return no(issue);const accepted=beginArmorRepair(g,command.unitId,command.workplaceId);return{accepted,reason:accepted?'Armor repair paid; same armor carried to tailor':g.state.banner||'Armor repair unavailable'};}
   case 'armor-repair-control':{const u=g.state.units.find(u=>u.id===command.unitId&&u.team===0);if(!u)return no('Original owned person unavailable');const accepted=command.action==='pause'?pauseArmorRepair(g,u):command.action==='resume'?resumeArmorRepair(g,u.id):cancelArmorRepair(g,u.id);return{accepted,reason:accepted?'Original armor repair updated':'Armor repair waits for its owner and tailor'};}
   case 'garment-repair':{const issue=garmentRepairIssue(g,command.unitId,command.slot,command.workplaceId);if(issue)return no(issue);const accepted=beginGarmentRepair(g,command.unitId,command.slot,command.workplaceId);return{accepted,reason:accepted?'Repair paid; original garment carried to sewing shelter':g.state.banner||'Repair unavailable'};}
   case 'garment-repair-control':{const u=g.state.units.find(u=>u.id===command.unitId&&u.team===0);if(!u)return no('Original owned person unavailable');const accepted=command.action==='pause'?pauseGarmentRepair(g,u):command.action==='resume'?resumeGarmentRepair(g,u.id):cancelGarmentRepair(g,u.id);return{accepted,reason:accepted?'Original garment repair updated':'Repair waits for an available owner and sewing shelter'};}
   case 'equip-armor':return equipArmor(g,command.unitId,command.armorId);
   case 'unequip-armor':return unequipArmor(g,command.unitId);
   case 'survey-fibre':case 'return-fibre':case 'equip-basket':case 'survey-clay':case 'equip-water-vessel':case 'swap-clothing':case 'gather-fibre':case 'gather-clay':case 'equip-clothing':{
    const accepted=command.kind==='survey-fibre'?surveyFibre(g,command.unitId):command.kind==='return-fibre'?returnFibreLoad(g,command.unitId):command.kind==='equip-basket'?equipBasket(g,command.unitId):command.kind==='survey-clay'?surveyClay(g,command.unitId):command.kind==='equip-water-vessel'?equipWaterVessel(g,command.unitId):command.kind==='swap-clothing'?swapClothing(g,command.unitId):command.kind==='gather-fibre'?beginFibreGather(g,command.unitId,command.patchId):command.kind==='gather-clay'?beginClayGather(g,command.unitId,command.depositId):equipClothing(g,command.unitId,command.item);
    return{accepted,reason:accepted?'Original resident and goods updated':g.state.banner||'Physical request refused'};
   }
   case 'set-auto-work':g.setAutoWork(command.enabled);return{accepted:true,reason:'Auto work updated'};
   case 'defense-horn':g.soundDefenseHorn();return{accepted:true,reason:g.state.banner||'Defense horn sounded'};
   case 'recall':g.soundRecall();return{accepted:true,reason:g.state.banner||'Recall issued'};
   case 'production-control':{
    const project=g.state.production?.projects.find(p=>p.id===command.projectId&&p.team===0);if(!project)return no('Original paid project unavailable');
    const accepted=command.action==='unload'?unloadProductionProject(g,project.id):command.action==='pause'?pauseProductionProject(g,project.id):resumeProduction(g,project.id,command.unitId);
    return{accepted,reason:accepted?'Original paid project updated':g.state.banner||'Project cannot make that transition',projectId:project.id};
   }
   case 'dairy-clean':case 'dairy-discard':{
    const project=g.state.production?.projects.find(p=>p.id===command.projectId&&p.team===0);if(!project)return no('Original vessel project unavailable');
    const accepted=command.kind==='dairy-clean'?queueDairyVesselCleaning(g,project.id,command.unitId):discardDairyProject(g,project.id);return{accepted,reason:accepted?'Original held vessel updated':g.state.banner||'Vessel request refused',projectId:project.id};
   }
   case 'marry-houses':{
    const other=g.tribe(command.team);if(!other||command.team===0||command.team===3)return no('That society is not known');
    const r=marryHouses(g,0,command.team);return r?{accepted:true,reason:`A marriage binds the houses (${r.why[0]})`}:no('No suitable match, or a house is too small to exchange spouses');
   }
   case 'foster-houses':case 'exchange-hostages':{
    const other=g.tribe(command.team);if(!other||command.team===0||command.team===3)return no('That society is not known');
    const fos=command.kind==='foster-houses',r=(fos?fosterHouses:exchangeHostages)(g,0,command.team);
    return r?{accepted:true,reason:`${fos?'Children are fostered':'Hostages are exchanged'} (${r.why[0]})`}:no(fos?'No child to foster, or a house is too small, or you are at war':'No kinsman to send, or a house is too small, or you are at war');
   }
   case 'set-formation':return setPreferredFormation(g,command.formation)?{accepted:true,reason:'Groups of four or more will form up this way when ordered to move'}:no('Combat doctrine is not enabled for this save');
   case 'guard-duty':{
    const u=g.state.units.find(u=>u.id===command.unitId&&u.team===0&&u.hp>0&&!u.prisoner);if(!u)return no('Original owned person unavailable');
    const r=assignGuardDuty(g,u.id,command.duty,u.x,u.z);return r.accepted?{accepted:true,reason:command.duty==='patrol'?'On patrol':'Standing watch'}:no(r.reason);
   }
   case 'release-guard':{const u=g.state.units.find(u=>u.id===command.unitId&&u.team===0);if(!u)return no('Original owned person unavailable');return releaseGuardDuty(g,u.id)?{accepted:true,reason:'Back to ordinary work'}:no('That person is not on duty');}
   case 'accept-capitulation':return acceptCapitulation(g,command.frontId,command.outcome,0);
   case 'refuse-capitulation':{const ok=refuseCapitulation(g,command.frontId,0);return ok?{accepted:true,reason:'Terms refused; they will resist harder'}:no('No offer to refuse here');}
   case 'commander-order':{
    const c=command;
    if(c.action==='appoint'||c.action==='replace'){if(c.unitId===undefined||!c.commandKind||c.action==='replace'&&c.replacesId===undefined)return no('Appoint needs a person and a command kind');return appointCommander(g,c.unitId,c.commandKind,{team:0,replaces:c.action==='replace'?c.replacesId:undefined});}
    const mine=c.commanderId!==undefined?commandersOf(g,0).find(x=>x.id===c.commanderId):undefined;if(!mine)return no('Not one of your commanders');
    if(c.action==='assign')return assignToCommander(g,mine.id,c.ids??[]);
    if(c.action==='release')return releaseFromCommander(g,mine.id,c.ids??[]);
    return c.promotionId?promoteCommander(g,mine.id,c.promotionId):no('Choose a promotion');
   }
   case 'naval-order':{
    const c=command;
    if(c.action==='port-work')return c.dockId!==undefined&&c.work&&c.builderId!==undefined?beginPortWork(g,c.dockId,c.work,c.builderId,0):no('Port work needs a dock, a work and a builder');
    if(c.action==='resume-port-work')return c.projectId!==undefined&&c.builderId!==undefined?resumePortWork(g,c.projectId,c.builderId):no('Choose the paused work and a new builder');
    if(c.action==='commission')return c.dockId!==undefined&&c.design&&c.builderId!==undefined?commissionVessel(g,c.dockId,c.design,c.builderId,0):no('A hull needs a dock, a design and a shipwright');
    if(c.action==='board')return c.boatId===undefined?no('Choose your hull'):c.targetBoatId!==undefined?beginBoarding(g,c.boatId,c.targetBoatId,0):boardNearest(g,c.boatId,0);
    return c.boatId!==undefined?resupplyVessel(g,c.boatId,{food:c.food,missileLoads:c.missileLoads},0):no('Choose the hull to resupply');
   }
   case 'boat-stop':{
    const boat=g.state.boats?.find(b=>b.id===command.boatId&&b.team===0&&b.hp>0);if(!boat)return no('Original owned boat unavailable');
    const captain=g.state.units.find(u=>u.id===boat.captain&&u.hp>0&&u.team===boat.team&&u.boat?.id===boat.id&&u.boat.phase==='aboard');if(!captain)return no('Original aboard captain unavailable');
    delete boat.exploration;captain.order='hold';g.invalidateRoute(captain);return{accepted:true,reason:'Actual boat stopped'};
   }
   case 'construction-priority':case 'site-preparation-pause':case 'paused-plan':case 'queue-construction':case 'order-construction':case 'craft-site-control':{
    const b=g.state.buildings.find(b=>b.id===command.buildingId&&b.team===0&&b.hp>0);if(!b)return no('Original owned building unavailable');
    if((command.kind==='queue-construction'||command.kind==='order-construction')&&selectedOwnedPeople(g,selection).length!==selection.selectedUnitIds.length)return no('An explicitly selected original resident is unavailable');let accepted=false;
    if(command.kind==='construction-priority')accepted=setConstructionPriority(g,b,command.priority);
    else if(command.kind==='site-preparation-pause')accepted=setSitePreparationPaused(g,b,command.paused);
    else if(command.kind==='paused-plan'){if(!b.plannedCost)return no('This building has no paid construction plan');b.planPaused=command.paused;accepted=true;}
    else if(command.kind==='queue-construction'){const result=queueConstruction(g,b,selectedOwnedPeople(g,selection));accepted=result.accepted;g.banner(result.reason,3);}
    else if(command.kind==='order-construction')accepted=orderConstruction(g,b,selectedOwnedPeople(g,selection));
    else{const job=craftSiteReport(g,b)?.jobs.find(j=>j.kind===command.jobKind&&j.projectId===command.projectId&&j.actorId===command.actorId);if(!job)return no('Original workplace task unavailable');accepted=controlCraftSiteJob(g,b,job,command.action);}
    return{accepted,reason:accepted?'Original building/task updated':g.state.banner||'Building request refused'};
   }
   case 'construction-queue-control':{
    const u=g.state.units.find(u=>u.id===command.unitId&&u.team===0&&u.hp>0);if(!u)return no('Original owned builder unavailable');
    const accepted=command.action==='pause'?pauseConstructionQueue(g,u):command.action==='resume'?resumeConstructionQueue(g,u):command.siteId!==undefined&&editConstructionQueue(g,u,command.siteId,command.action);
    return{accepted:!!accepted,reason:accepted?'Original builder queue updated':'Queue request refused'};
   }
   default:return no('This gameplay command is not implemented');
  }
}

/** Explicit flat registry: no arbitrary Game method names or executable closures. */
export function isEngineDispatchCommand(value:unknown):value is EngineDispatchCommand{
 if(!object(value)||typeof value.kind!=='string')return false;
 const bool=(v:unknown)=>typeof v==='boolean',id=(v:unknown)=>integer(v),optionalId=(v:unknown)=>v===undefined||id(v);
 const action=(v:unknown)=>v==='pause'||v==='resume'||v==='unload';
 const schema:Record<string,Record<string,(v:unknown)=>boolean>>={
  'begin-era-upgrade':{buildingId:id,mode:v=>v==='rebuild'||v==='extend',side:v=>v===undefined||['north','south','east','west'].includes(v as string)},
  'era-upgrade-pause':{buildingId:id,paused:bool},
  'cancel-interaction':{},'hold-selected':{unitIds:v=>Array.isArray(v)&&v.length<=128&&Array.from(v).every(id)&&new Set(v).size===v.length},
  pause:{paused:bool},speed:{speed:v=>v===1||v===2||v===4,resume:v=>v===undefined||bool(v)},
  move:{unitIds:v=>Array.isArray(v)&&v.length>0&&v.length<=128&&Array.from(v).every(id)&&new Set(v).size===v.length,x:v=>typeof v==='number'&&Number.isFinite(v),z:v=>typeof v==='number'&&Number.isFinite(v),attackMove:v=>v===undefined||bool(v)},
  'begin-copper-study':{workplaceId:id,fuel:v=>v==='logs'||v==='charcoal'},
  'begin-traded-teaching':{learnerId:id,teacherId:id,siteId:id,methodId:v=>typeof v==='string'&&Object.hasOwn(PRODUCTION_RECIPES,v),good:v=>['food','wood','stone','copper','iron'].includes(v as string),qty:v=>Number.isSafeInteger(v)&&Number(v)>=1&&Number(v)<=TRADED_TEACHING_RULES.maximumPayment},
  'cancel-traded-teaching':{learnerId:id},
  'begin-production':{recipe:v=>typeof v==='string'&&Object.hasOwn(PRODUCTION_RECIPES,v),workplaceId:id,unitId:optionalId},
  'pause-production':{projectId:id},'resume-production':{projectId:id,unitId:optionalId},
  'armor-repair':{unitId:id,workplaceId:optionalId},'armor-repair-control':{unitId:id,action:v=>v==='pause'||v==='resume'||v==='cancel'},
  'garment-repair':{unitId:id,slot:v=>v==='worn'||v==='spare',workplaceId:optionalId},'garment-repair-control':{unitId:id,action:v=>v==='pause'||v==='resume'||v==='cancel'},
  'equip-armor':{unitId:id,armorId:id},'unequip-armor':{unitId:id},
  'survey-fibre':{unitId:id},'return-fibre':{unitId:id},'equip-basket':{unitId:id},'survey-clay':{unitId:id},'equip-water-vessel':{unitId:id},'swap-clothing':{unitId:id},'gather-fibre':{unitId:id,patchId:id},'gather-clay':{unitId:id,depositId:id},'equip-clothing':{unitId:id,item:v=>GARMENT_KINDS.includes(v as GarmentKind)},
  'set-auto-work':{enabled:bool},'defense-horn':{},recall:{},
  'production-control':{projectId:id,action,unitId:optionalId},'dairy-clean':{projectId:id,unitId:optionalId},'dairy-discard':{projectId:id},
  'set-formation':{formation:v=>validFormationKind(v)},'guard-duty':{unitId:id,duty:v=>v==='post'||v==='patrol'},'release-guard':{unitId:id},
  'accept-capitulation':{frontId:id,outcome:v=>['occupy','annex','tribute','puppet','autonomy','loot','captives','raze'].includes(v as string)},'refuse-capitulation':{frontId:id},'boat-stop':{boatId:id},'naval-order':{action:v=>['port-work','resume-port-work','commission','board','resupply'].includes(v as string),dockId:optionalId,work:v=>v===undefined||PORT_WORK_IDS.includes(v as PortWork),design:v=>v===undefined||DESIGN_IDS.includes(v as string),builderId:optionalId,projectId:optionalId,boatId:optionalId,targetBoatId:optionalId,food:v=>v===undefined||typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1000,missileLoads:v=>v===undefined||typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100},'commander-order':{action:v=>['appoint','replace','assign','release','promote'].includes(v as string),unitId:optionalId,commanderId:optionalId,commandKind:v=>v===undefined||v==='army'||v==='fleet',ids:v=>v===undefined||Array.isArray(v)&&v.length<=32&&v.every(id)&&new Set(v).size===v.length,promotionId:v=>v===undefined||typeof v==='string'&&v.length<=32,replacesId:optionalId},'marry-houses':{team:id},'foster-houses':{team:id},'exchange-hostages':{team:id},'construction-priority':{buildingId:id,priority:v=>v===0||v===1||v===2},
  'site-preparation-pause':{buildingId:id,paused:bool},'paused-plan':{buildingId:id,paused:bool},
  'queue-construction':{buildingId:id},'order-construction':{buildingId:id},
  'construction-queue-control':{unitId:id,action:v=>v==='pause'||v==='resume'||v==='up'||v==='down'||v==='remove',siteId:optionalId},
  'craft-site-control':{buildingId:id,jobKind:v=>['production','haulage','weapon','tool','copper','helper'].includes(v as string),projectId:optionalId,actorId:v=>v===null||id(v),action},
 };
 if(value.kind==='begin-era-upgrade'&&(value.mode==='extend'&&value.side===undefined||value.mode==='rebuild'&&value.side!==undefined))return false;
 const fields=Object.hasOwn(schema,value.kind)?schema[value.kind]:undefined;
 return !!fields&&Object.keys(value).every(k=>k==='kind'||Object.hasOwn(fields,k))&&Object.entries(fields).every(([k,validate])=>validate(value[k]));
}
export function isEngineSelection(value:unknown):value is EngineSelection{
 if(!object(value)||Object.keys(value).some(k=>!['selectedUnitIds','selectedBuildingId','selectedBoatId'].includes(k)))return false;
 const ids=value.selectedUnitIds;
 return Array.isArray(ids)&&ids.length<=128&&Array.from(ids).every(integer)&&new Set(ids).size===ids.length&&(value.selectedBuildingId===undefined||integer(value.selectedBuildingId))&&(value.selectedBoatId===undefined||integer(value.selectedBoatId));
}

/** Selection is an ordered simulation input: native work/transport eligibility reads it. */
export function applyEngineSelection(g:Game,selection:EngineSelection){
 if(!isEngineSelection(selection))throw new Error('Invalid selection digest');
 g.clearSelect();
 for(const id of selection.selectedUnitIds){const u=g.state.units.find(u=>u.id===id&&u.team===0&&u.hp>0);if(u)g.selectEntity(u,true);}
 const b=g.state.buildings.find(b=>b.id===selection.selectedBuildingId&&b.hp>0);if(b)g.selectEntity(b,true);
 if(selection.selectedBoatId!==undefined)g.selectBoat(selection.selectedBoatId);
}
