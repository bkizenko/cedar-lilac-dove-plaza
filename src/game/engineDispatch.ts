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
export type EngineSelection={selectedUnitIds:readonly number[];selectedBuildingId?:number;selectedBoatId?:number};
export type EngineDispatchCommand=
 |{kind:'begin-era-upgrade';buildingId:number;mode:'rebuild'}
 |{kind:'begin-era-upgrade';buildingId:number;mode:'extend';side:ExtensionSide}
 |{kind:'era-upgrade-pause';buildingId:number;paused:boolean}
 |{kind:'cancel-interaction'}|{kind:'hold-selected';unitIds:number[]}
 |{kind:'pause';paused:boolean}|{kind:'speed';speed:1|2|4;resume?:boolean}
 |{kind:'move';unitIds:number[];x:number;z:number;attackMove?:boolean}
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
 |{kind:'equip-clothing';unitId:number;item:GarmentKind}
 |{kind:'set-auto-work';enabled:boolean}|{kind:'defense-horn'}|{kind:'recall'}
 |{kind:'production-control';projectId:number;action:'pause'|'resume'|'unload';unitId?:number}
 |{kind:'dairy-clean';projectId:number;unitId?:number}|{kind:'dairy-discard';projectId:number}
 |{kind:'marry-houses';team:number}|{kind:'foster-houses';team:number}|{kind:'exchange-hostages';team:number}
 |{kind:'accept-capitulation';frontId:number;outcome:CapitulationOutcome}|{kind:'refuse-capitulation';frontId:number}
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
   case 'accept-capitulation':return acceptCapitulation(g,command.frontId,command.outcome,0);
   case 'refuse-capitulation':{const ok=refuseCapitulation(g,command.frontId,0);return ok?{accepted:true,reason:'Terms refused; they will resist harder'}:no('No offer to refuse here');}
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
  'begin-production':{recipe:v=>typeof v==='string'&&Object.hasOwn(PRODUCTION_RECIPES,v),workplaceId:id,unitId:optionalId},
  'pause-production':{projectId:id},'resume-production':{projectId:id,unitId:optionalId},
  'equip-armor':{unitId:id,armorId:id},'unequip-armor':{unitId:id},
  'survey-fibre':{unitId:id},'return-fibre':{unitId:id},'equip-basket':{unitId:id},'survey-clay':{unitId:id},'equip-water-vessel':{unitId:id},'swap-clothing':{unitId:id},'gather-fibre':{unitId:id,patchId:id},'gather-clay':{unitId:id,depositId:id},'equip-clothing':{unitId:id,item:v=>GARMENT_KINDS.includes(v as GarmentKind)},
  'set-auto-work':{enabled:bool},'defense-horn':{},recall:{},
  'production-control':{projectId:id,action,unitId:optionalId},'dairy-clean':{projectId:id,unitId:optionalId},'dairy-discard':{projectId:id},
  'accept-capitulation':{frontId:id,outcome:v=>['occupy','annex','tribute','puppet','autonomy','loot','captives','raze'].includes(v as string)},'refuse-capitulation':{frontId:id},'boat-stop':{boatId:id},'marry-houses':{team:id},'foster-houses':{team:id},'exchange-hostages':{team:id},'construction-priority':{buildingId:id,priority:v=>v===0||v===1||v===2},
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
