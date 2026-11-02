import {BUILDINGS} from './constants';
import type {Game} from './sim';
import type {Unit,Building} from './types';
import {isRivalTeam} from './factions';
import {isDependent,reserveSeconds} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {rivalKnows} from './rivalDevelopment';
import {buildingCost} from './construction';
import {beginProduction,resumeProduction,PRODUCTION_RECIPES} from './production';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';

export const RIVAL_FOOD_PROCESSING_RULES={version:1,reviewSeconds:5,targetMealSeconds:600,rawSpoilageRiskUnits:16,maximumSiteRadiusMeters:24,siteStepMeters:4,siteDirections:16} as const;
const reviews=new WeakMap<Game,{state:Game['state'];teams:Map<number,number>}>();
function eligible(g:Game,u:Unit,ownProjectId?:number){return u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&!isDependent(g,u)&&!u.jobLock&&!u.buildOrder&&!u.recalled&&!u.emergency&&!u.resting&&!u.shelterId&&!u.expedition&&!u.envoy&&!u.visit&&!u.scout&&!u.foundingJourney&&!u.tributeJourney&&!u.trade&&u.drill==null&&!hasTaskCommitment(u,ownProjectId!==undefined&&u.productionProjectId===ownProjectId?'productionProjectId':undefined)&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>n>0)&&['idle','hold','gather'].includes(u.order);}
const atCache=(g:Game,u:Unit)=>supplyDrops(g,u.team).some(d=>{const p=supplyApproach(g,u,d);return!!p&&supplyReached(g,u,d,p);});
/** Subsistence construction must not be cancelled by the generic food-shortage
 * reassignment that was written for discretionary buildings. No fake job flag. */
export function rivalFoodConstructionActive(g:Game,u:Unit){const b=u.order==='build'&&u.node&&'type'in u.node?u.node:null;return isRivalTeam(u.team)&&u.type==='worker'&&!u.prisoner&&!u.emergency&&!!b&&b.team===u.team&&b.type==='hearth'&&b.hp>0&&!g.finished(b)&&!b.plannedCost&&g.tribe(u.team)?.animalProcessingVersion===1&&(g.tribe(u.team).items?.rawMeat||0)>0;}
/** An ordinary local plan pays shared construction/production costs and uses
 * existing bodies, physical cache loading, work ownership and saved projects. */
export function reviewRivalFoodProcessing(g:Game,team:number){
 const t=g.tribe(team);if(!isRivalTeam(team)||!t?.alive||t.animalProcessingVersion!==1)return false;
 let c=reviews.get(g);if(!c||c.state!==g.state){c={state:g.state,teams:new Map()};reviews.set(g,c);}const due=c.teams.get(team)??-Infinity;if(due>g.state.time&&due<=g.state.time+RIVAL_FOOD_PROCESSING_RULES.reviewSeconds)return false;c.teams.set(team,g.state.time+RIVAL_FOOD_PROCESSING_RULES.reviewSeconds);
 const jobs=g.state.production?.projects.filter(p=>p.team===team&&p.recipe==='cookMeat'&&!['complete','lost'].includes(p.phase))||[];
 if(jobs.some(p=>!['paused','stored'].includes(p.phase)))return false;
 const workers=g.state.units.filter(u=>u.team===team&&eligible(g,u));
 if(jobs.length){const project=jobs[0],retained=project.actorId===null?undefined:g.state.units.find(u=>u.id===project.actorId&&u.team===team&&eligible(g,u,project.id));const candidate=project.actorId===null?workers.find(u=>atCache(g,u))?.id:retained?.id;return candidate!==undefined&&resumeProduction(g,project.id,candidate);}
 const raw=t.items?.rawMeat||0;if(raw<PRODUCTION_RECIPES.cookMeat.inputs.rawMeat!||reserveSeconds(g,team)>=RIVAL_FOOD_PROCESSING_RULES.targetMealSeconds&&raw<RIVAL_FOOD_PROCESSING_RULES.rawSpoilageRiskUnits)return false;
 const hearths=g.state.buildings.filter(b=>b.team===team&&b.type==='hearth'&&b.hp>0&&!b.plannedCost),hearth=hearths.find(b=>g.finished(b));
 if(!hearth){
  let site:Building|undefined=hearths[0];
  if(site&&g.state.units.some(u=>u.team===team&&u.hp>0&&u.order==='build'&&u.node?.id===site!.id))return false;
  const builder=workers.find(u=>!site||!!g.interactionSpot(u,site));if(!builder)return false;
  if(!site){const cost=buildingCost('hearth',g,team);if(t.wood<(cost.wood||0)+PRODUCTION_RECIPES.cookMeat.wood||t.stone<(cost.stone||0))return false;const home=g.campOf(team);let point:{x:number;z:number}|undefined;
   for(let r=8;r<=RIVAL_FOOD_PROCESSING_RULES.maximumSiteRadiusMeters&&!point;r+=RIVAL_FOOD_PROCESSING_RULES.siteStepMeters)for(let i=0;i<RIVAL_FOOD_PROCESSING_RULES.siteDirections&&!point;i++){const a=i*Math.PI*2/RIVAL_FOOD_PROCESSING_RULES.siteDirections,x=home.x+Math.cos(a)*r,z=home.z+Math.sin(a)*r;if(!rivalKnows(g,team,x,z)||g.state.units.some(u=>u.hp>0&&Math.hypot(u.x-x,u.z-z)<4)||!g.placementValid('hearth',x,z,team))continue;const spec=BUILDINGS.hearth,probe:Building={id:-1,kind:'building',type:'hearth',team,x,y:g.height(x,z),z,w:spec.w,d:spec.d,hp:spec.hp,maxHp:spec.hp,selected:false,queue:[],rally:null,cd:0,build:0,reclaimed:false};if(!g.interactionSpot(builder,probe))continue;point={x,z};}
   if(!point)return false;if(!g.placeBuilding('hearth',point.x,point.z,team))return false;site=g.state.buildings.find(b=>b.team===team&&b.type==='hearth'&&b.x===point!.x&&b.z===point!.z&&b.hp>0&&!g.finished(b));if(!site)return false;
  }
  g.interruptMission(builder);builder.order='build';builder.node=site;builder.job=null;builder.jobLock=false;builder.target=null;builder.workReason='Building a hearth to prepare the actual raw catch';g.invalidateRoute(builder);g.workBoard.reset();return true;
 }
 if(t.wood<PRODUCTION_RECIPES.cookMeat.wood)return false;
 const maker=workers.find(u=>atCache(g,u));if(maker)return beginProduction(g,'cookMeat',hearth.id,maker.id);
 const carrier=workers.find(u=>supplyDrops(g,team).some(d=>!!supplyApproach(g,u,d)));if(!carrier)return false;
 g.interruptMission(carrier);carrier.recalled=true;carrier.order='return';carrier.target=null;carrier.node=null;carrier.job=null;carrier.workReason='Returning to load a real cooking batch at camp';g.invalidateRoute(carrier);g.workBoard.reset();return true;
}
