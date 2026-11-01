import type {Game} from './sim';
import type {KnowledgeTopic,KnowledgeActionResult} from './knowledge';
import {fibreReport,surveyFibre,fibreGatherIssue,beginFibreGather,returnFibreLoad,equipBasket,FIBRE_RULES} from './fibre';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
/** Read-only observations: no surveying, growth, allocation or route queries. */
export function fibreKnowledgeTopics(g:Game):KnowledgeTopic[]{
 const report=fibreReport(g),people=g.state.units.filter(u=>u.team===0&&u.hp>0&&!u.prisoner&&!isDependent(g,u)),sorted=[...people].sort((a,b)=>Number(b.selected)-Number(a.selected)||a.id-b.id),observer=sorted[0],available=sorted.filter(u=>u.type==='worker'&&!u.militia&&!u.carry&&!Object.values(u.itemCargo||{}).some(Boolean)&&!u.buildOrder&&!hasTaskCommitment(u)&&['idle','hold','gather'].includes(u.order)),workers=people.filter(u=>u.fibreWork),harvested=report.metrics?.harvested||0,delivered=report.metrics?.delivered||0;
 const actions:KnowledgeTopic['actions']=observer?[{id:`fibre:survey:${observer.id}`,label:`Inspect woodland near ${observer.name||'this resident'}`,blockedReason:null}]:[];
 for(const p of report.patches.filter(p=>p.sourceAlive&&p.remaining>=FIBRE_RULES.batch).slice(0,4)){const u=[...available].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];actions.push({id:`fibre:gather:${u?.id||0}:${p.id}`,label:`Gather from observed bast patch ${p.id}`,blockedReason:u?null:'Need an available adult without another committed load or job'});}
 for(const u of workers.filter(u=>u.fibreWork!.loaded>0&&u.fibreWork!.paused))actions.push({id:`fibre:return:${u.id}`,label:`Bring ${u.name||'resident'}’s actual fibre load home`,blockedReason:null});
 for(const u of sorted.filter(u=>!u.basket&&u.type==='worker'&&!u.militia).slice(0,2))actions.push({id:`fibre:equip:${u.id}`,label:`Collect a basket: ${u.name||'resident'}`,blockedReason:report.storedBaskets>0?null:'Weave and deliver a real basket first; collection requires arrival at the cache'});
 return[{id:'production:fibre-source',title:'Find and prepare useful plant fibre',need:'Bindings and containers need physical fibres from encountered living trees, preparation work and delivery.',stage:delivered>0?'proven':harvested>0||workers.length?'experiment':report.patches.length?'observation':'need',observation:`${report.patches.length} observed bast patches · ${report.patches.reduce((n,p)=>n+p.remaining,0).toFixed(1)} finite available fibre units`,experiment:`${workers.length} residents assigned to physical stripping and carrying · ${harvested.toFixed(1)} units actually harvested`,result:`${delivered.toFixed(1)} fibre delivered · ${report.storedFibre.toFixed(1)} available fibre · ${report.storedCordage.toFixed(1)} cordage`,adoption:`${report.basketCount} residents own baskets · ${report.metrics?.basketDeliveries||0} recorded loaded basket deliveries`,metrics:{knownPatches:report.patches.length,harvestedFibre:harvested,deliveredFibre:delivered,storedFibre:report.storedFibre,storedCordage:report.storedCordage,ownedBaskets:report.basketCount,basketDeliveries:report.metrics?.basketDeliveries||0},actions,limitation:'An observation only records encountered sources. Gathering needs an actual reachable adult, labor and finite bark stock. Harvesting consumes standing wood potential; winter regrowth stops and felled sources cannot regrow. Reading this panel grants no materials or skill.'}];
}
export function runFibreKnowledgeAction(g:Game,id:string):KnowledgeActionResult{
 const parts=id.split(':'),kind=parts[1],actor=Number(parts[2]),patch=Number(parts[3]);if(parts[0]!=='fibre'||!Number.isSafeInteger(actor)||actor<1)return{accepted:false,reason:'Choose an actual resident'};
 let accepted=false;
 if(kind==='survey')accepted=surveyFibre(g,actor);
 else if(kind==='gather'){if(!Number.isSafeInteger(patch)||patch<1)return{accepted:false,reason:'Choose an observed source'};const issue=fibreGatherIssue(g,actor,patch);if(issue)return{accepted:false,reason:issue};accepted=beginFibreGather(g,actor,patch);}
 else if(kind==='return')accepted=returnFibreLoad(g,actor);
 else if(kind==='equip')accepted=equipBasket(g,actor);
 else return{accepted:false,reason:'Unknown fibre work action'};
 return{accepted,reason:accepted?(kind==='survey'?'Nearby actual sources were inspected; fibres still require physical gathering':kind==='gather'?'A real resident is walking to prepare and carry finite bast fibre':kind==='return'?'The same loaded resident is returning the actual fibre to storage':'One delivered basket now belongs to this resident'):g.state.banner||'The physical action is currently unavailable'};
}
