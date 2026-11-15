import type {Game} from './sim';
import type {KnowledgeTopic,KnowledgeActionResult} from './knowledge';
import {productionIssue,beginProduction,type ProductionRecipe} from './production';
import {LATE_AGE_RULES as R} from './lateAgeRules';
import type {BldType} from './types';
/** Medieval steel and Renaissance paper: topics report only physical evidence (stock, delivered batches). Reading grants nothing. */
const sites=(g:Game,type:BldType)=>g.state.buildings.filter(b=>b.team===0&&b.hp>0&&b.type===type&&g.finished(b));
function proposal(g:Game,recipe:ProductionRecipe,type:BldType,missing:string){
 const list=sites(g,type),site=list.find(b=>!productionIssue(g,recipe,b.id));
 return{site,reason:site?null:list.length?productionIssue(g,recipe,list[0].id):missing};
}
const batches=(g:Game,recipe:string)=>g.tribe(0).productionPractice?.[recipe as 'smeltIron']?.batches||0;
export function lateKnowledgeTopics(g:Game):KnowledgeTopic[]{
 const t=g.tribe(0);if(!t)return[];const out:KnowledgeTopic[]=[],age=t.age;
 if(age>=R.steelMinAge){
  const bloom=t.items?.ironBloom||0,steel=t.items?.steel||0,done=batches(g,'carburizeSteel'),p=proposal(g,'carburizeSteel','forge','Finish a forge to carburize bloom');
  out.push({id:'late-steel',title:'Steel from bloom',need:'Iron edges and tools dull and bend; charcoal-soaked bloom can be made harder.',stage:done?'proven':steel||bloom?'observation':'need',
   observation:`${bloom} bloom home · ${t.items?.charcoal||0} charcoal · ${steel} steel held`,experiment:`${R.steelBloomPerBatch} bloom + ${R.steelCharcoalPerBatch} charcoal → ${R.steelPerBatch} steel · ${R.steelWorkSeconds}s at a forge.`,
   result:`${done} steel batches physically delivered`,adoption:'Steel is a held good for trade and for later edge tools; nothing appears without bloom, charcoal and a smith.',
   metrics:{bloomAtCache:bloom,steel,charcoal:t.items?.charcoal||0,batches:done},actions:[{id:'late:steel',label:'Carburize bloom into steel',blockedReason:p.reason},...(!sites(g,'forge').length?[{id:'place:forge',label:'Choose a forge site',blockedReason:null}]:[])],limitation:'Needs iron processing adopted first; steel tools and weapons are not yet crafted from it.'});
 }
 if(age>=R.paperMinAge){
  const cloth=t.items?.cloth||0,paper=t.items?.paper||0,done=batches(g,'pressPaper'),p=proposal(g,'pressPaper','workshop','Finish a crafting shelter to press paper');
  out.push({id:'late-paper',title:'Paper from rags',need:'Records on clay and cordage are heavy and slow to copy; light sheets could carry methods.',stage:done?'proven':paper||cloth?'observation':'need',
   observation:`${cloth} woven cloth home · ${paper} paper held`,experiment:`${R.paperClothPerBatch} cloth + ${R.paperWaterLiters} L water → ${R.paperPerBatch} paper · ${R.paperWorkSeconds}s at a workshop.`,
   result:`${done} paper batches physically delivered`,adoption:'Paper is a held good; it is not yet used for method records.',
   metrics:{cloth,paper,batches:done},actions:[{id:'late:paper',label:'Press paper from cloth',blockedReason:p.reason},...(!sites(g,'workshop').length?[{id:'place:workshop',label:'Choose a workshop site',blockedReason:null}]:[])],limitation:'Does not yet feed method records or teaching.'});
 }
 return out;
}
export function runLateKnowledgeAction(g:Game,id:string):KnowledgeActionResult{
 const [recipe,type,why]:[ProductionRecipe,BldType,string]|[undefined,undefined,undefined]=id==='late:steel'?['carburizeSteel','forge','Finish a forge']:id==='late:paper'?['pressPaper','workshop','Finish a crafting shelter']:[undefined,undefined,undefined];
 if(!recipe)return{accepted:false,reason:'Unknown late-age action'};
 const p=proposal(g,recipe,type,why);if(!p.site||p.reason)return{accepted:false,reason:p.reason||'No available maker'};
 const accepted=beginProduction(g,recipe,p.site.id);
 return{accepted,reason:accepted?'Inputs paid; an adult carries the batch and returns its actual output.':'This paid batch is no longer available'};
}
