import type {Game} from './sim';
import type {Unit} from './types';
import {carcassAvailable,type HuntableCritter} from './hunting';
import {personName} from './people';
import {WILD_RECIPES,WILD_RECIPE_IDS,WILD_STATION_SLOTS,BUTCHERY_PARTS,HUNT_METHOD_ICON,wildIssue,beginWildWork,collectWildBatch,stationsFor,wildAdult,wildCraftEnabled,type WildRecipeId} from './wildCraft';
/** Typed owner commands and a read model for starting wild-craft work and collecting a finished batch.
 * Nothing here changes a rule: every refusal comes from wildIssue/beginWildWork/collectWildBatch, and the
 * read model never initialises or mutates state. Absent on saves without wild-craft. */
export type WildBeginCommand={kind:'wild-begin';recipe:string;unitId?:number;stationId?:number;critterId?:number;x?:number;z?:number};
export type WildCollectCommand={kind:'wild-collect';unitId?:number;projectId?:number};
export type WildPlanRecipe={id:WildRecipeId;icon:string;name:string;station:string;issue:string|null;stations:{id:number;free:number}[]};
export type WildPlan={enabled:boolean;hands:string[];recipes:WildPlanRecipe[];carcasses:{id:number;icon:string;species:string;parts:number}[];trails:{id:number;icon:string;species:string}[];ready:{projectId:number;icon:string;name:string}[]};
/** Recipes started from a building (not a carcass, trail or free ground). */
const STATION_RECIPES=WILD_RECIPE_IDS.filter(id=>!['carcass','field','trail'].includes(WILD_RECIPES[id].station));
const freeHands=(g:Game)=>g.state.units.filter(u=>u.team===0&&wildAdult(g,u)&&u.wildWorkId===undefined);
const CARCASS_RADIUS=60;
export function wildPlan(g:Game):WildPlan{
 const w=g.state.wildCraft;if(!w)return{enabled:false,hands:[],recipes:[],carcasses:[],trails:[],ready:[]};
 const camp=g.campOf(0),used=(id:number)=>w.projects.filter(p=>p.stationId===id&&p.phase!=='back').length;
 const recipes=STATION_RECIPES.map(id=>{const r=WILD_RECIPES[id];return{id,icon:r.icon,name:r.name,station:r.station,issue:wildIssue(g,0,id),stations:stationsFor(g,0,r.station as never).map(b=>({id:b.id,free:Math.max(0,WILD_STATION_SLOTS-used(b.id))}))};});
 const carcasses:WildPlan['carcasses']=[];
 for(const c of g.state.wildlife as HuntableCritter[]){
  if(c.hp>0||!c.carcass?.prepared||!carcassAvailable(g,c)||Math.hypot(c.x-camp.x,c.z-camp.z)>CARCASS_RADIUS||!g.visibleAt(c.x,c.z)||w.projects.some(p=>p.critterId===c.id))continue;
  const left=w.parts[c.id]??BUTCHERY_PARTS[c.species],n=left.fat+left.sinew+left.brain+left.horn;if(n>0)carcasses.push({id:c.id,icon:'🔪',species:c.species,parts:n});}
 const trails:WildPlan['trails']=[];
 for(const[id,wd]of Object.entries(w.wounds)){const c=g.state.wildlife.find(c=>String(c.id)===id);if(c&&c.hp>0&&wd.trail.length>=2&&g.visibleAt(c.x,c.z)&&!w.projects.some(p=>p.critterId===c.id))trails.push({id:c.id,icon:'🩸',species:c.species});}
 const ready=w.projects.filter(p=>p.team===0&&p.phase==='ready'&&p.actorId===0).map(p=>({projectId:p.id,icon:WILD_RECIPES[p.recipe].icon,name:WILD_RECIPES[p.recipe].name}));
 return{enabled:true,hands:freeHands(g).slice(0,8).map(personName),recipes,carcasses:carcasses.slice(0,6),trails:trails.slice(0,4),ready};
}
/** Hands in order of preference: explicitly named, then selected, then idle, then nearest to the work. */
function candidates(g:Game,explicit:number|undefined,selected:readonly number[],at:{x:number;z:number}):Unit[]{
 const pool=freeHands(g);if(explicit!==undefined){const u=pool.find(u=>u.id===explicit);return u?[u]:[];}
 const rank=(u:Unit)=>(selected.includes(u.id)?0:1e6)+(u.order==='idle'?0:5e5)+Math.hypot(u.x-at.x,u.z-at.z);
 return pool.sort((a,b)=>rank(a)-rank(b)||a.id-b.id).slice(0,6);
}
export function applyWildCommand(g:Game,command:WildBeginCommand|WildCollectCommand,selected:readonly number[]=[]):{accepted:boolean;reason:string}{
 if(!wildCraftEnabled(g))return{accepted:false,reason:'Detailed hunting and hide work is not on in this world'};
 const camp=g.campOf(0);
 if(command.kind==='wild-collect'){
  const p=g.state.wildCraft!.projects.find(p=>p.team===0&&p.phase==='ready'&&p.actorId===0&&(command.projectId===undefined||p.id===command.projectId));
  const b=p&&p.stationId!==undefined?g.state.buildings.find(b=>b.id===p.stationId):undefined,at=b??camp;
  let reason=p?'No free adult can collect it':'Nothing is ready to collect';
  for(const u of candidates(g,command.unitId,selected,at)){const r=collectWildBatch(g,u.id,p?.id);if(r.accepted)return r;reason=r.reason;}
  return{accepted:false,reason};
 }
 if(!Object.hasOwn(WILD_RECIPES,command.recipe))return{accepted:false,reason:'Choose an actual wild-craft method'};
 const id=command.recipe as WildRecipeId,r=WILD_RECIPES[id];
 const st=command.stationId!==undefined?g.state.buildings.find(b=>b.id===command.stationId&&b.team===0):undefined;
 if(command.stationId!==undefined&&(!st||st.type!==r.station))return{accepted:false,reason:'That is not a working place for this method'};
 const issue=wildIssue(g,0,id,{stationId:command.stationId,critterId:command.critterId});if(issue)return{accepted:false,reason:issue};
 let reason='No free adult is available';
 for(const u of candidates(g,command.unitId,selected,st??camp)){const res=beginWildWork(g,u.id,id,{stationId:command.stationId,critterId:command.critterId,x:command.x,z:command.z});if(res.accepted)return res;reason=res.reason;}
 return{accepted:false,reason};
}
export const WILD_METHOD_ICONS=HUNT_METHOD_ICON;
/** One world pin for the Hearth glance layer: a visible bleeding animal to follow, else a finished batch waiting on its rack. Pure; null without wild-craft. */
export function wildAlert(g:Game):{count:number;tip:string;x:number;z:number}|null{
 const w=g.state.wildCraft;if(!w)return null;const camp=g.campOf(0);
 const bleeding=Object.keys(w.wounds).map(id=>g.state.wildlife.find(c=>String(c.id)===id)).filter(c=>!!c&&c.hp>0&&g.visibleAt(c.x,c.z)&&!w.projects.some(p=>p.critterId===c.id)).sort((a,b)=>Math.hypot(a!.x-camp.x,a!.z-camp.z)-Math.hypot(b!.x-camp.x,b!.z-camp.z));
 if(bleeding.length)return{count:bleeding.length,tip:`${bleeding.length} wounded animal${bleeding.length===1?'':'s'} leaving a blood trail`,x:bleeding[0]!.x,z:bleeding[0]!.z};
 const ready=w.projects.filter(p=>p.team===0&&p.phase==='ready'&&p.actorId===0);
 for(const p of ready){const b=g.state.buildings.find(b=>b.id===p.stationId);if(b)return{count:ready.length,tip:`${ready.length} finished batch${ready.length===1?'':'es'} waiting to be collected`,x:b.x,z:b.z};}
 return null;
}
