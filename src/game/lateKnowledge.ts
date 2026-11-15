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
   result:`${done} steel batches physically delivered`,adoption:`Steel-edged blades (${R.steelBladeSteel} steel + ${R.steelBladeCharcoal} charcoal → ${R.steelBladeCount}) are taken first when arming and hit about 12% harder; nothing appears without bloom, charcoal and a smith.`,
   metrics:{bloomAtCache:bloom,steel,charcoal:t.items?.charcoal||0,batches:done},actions:[{id:'late:steel',label:'Carburize bloom into steel',blockedReason:p.reason},{id:'late:blades',label:'Forge steel-edged blades',blockedReason:proposal(g,'forgeSteelBlades','forge','Finish a forge').reason},...(!sites(g,'forge').length?[{id:'place:forge',label:'Choose a forge site',blockedReason:null}]:[])],limitation:'Needs iron processing adopted first; steel farm tools are not made yet.'});
 }
 if(age>=R.paperMinAge){
  const cloth=t.items?.cloth||0,paper=t.items?.paper||0,done=batches(g,'pressPaper'),p=proposal(g,'pressPaper','fibreWorkshop','Finish a fibre workshop to press paper');
  out.push({id:'late-paper',title:'Paper from rags',need:'Records on clay and cordage are heavy and slow to copy; light sheets could carry methods.',stage:done?'proven':paper||cloth?'observation':'need',
   observation:`${cloth} woven cloth home · ${paper} paper held`,experiment:`${R.paperClothPerBatch} cloth + ${R.paperWaterLiters} L water → ${R.paperPerBatch} paper · ${R.paperWorkSeconds}s at a fibre workshop.`,
   result:`${done} paper batches physically delivered`,adoption:`Books (${R.bookPaper} paper + ${R.bookWood} log each) speed practised work by ${(R.bookBonus*100).toFixed(1)}% each up to ${(R.bookCap*100).toFixed(0)}%, doubled with a finished university.`,
   metrics:{cloth,paper,books:t.items?.book||0,batches:done},actions:[{id:'late:paper',label:'Press paper from cloth',blockedReason:p.reason},{id:'late:book',label:'Copy and bind a book',blockedReason:proposal(g,'bindBook','fibreWorkshop','Finish a fibre workshop').reason},...(!sites(g,'fibreWorkshop').length?[{id:'place:fibreWorkshop',label:'Choose a fibre workshop site',blockedReason:null}]:[])],limitation:'Books are held stock and can be lost or taken; method-record copying on paper is not modelled.'});
 }
 if(age>=R.paperMinAge){
  const coal=t.items?.charcoal||0,straw=t.items?.straw||0,bone=t.items?.bone||0,powder=t.items?.gunpowder||0,done=batches(g,'grindGunpowder'),p=proposal(g,'grindGunpowder','kiln','Finish a kiln to grind powder');
  out.push({id:'late-powder',title:'Gunpowder',need:'Walls and pikes meet a weapon that kills at a distance; it needs a stock of powder.',stage:done?'proven':powder||coal?'observation':'need',
   observation:`${coal} charcoal · ${straw} straw · ${bone} bones · ${powder} powder held`,experiment:`${R.powderCharcoal} charcoal + ${R.powderStraw} straw + ${R.powderBone} bones → ${R.powderPerBatch} powder · ${R.powderSeconds}s at a kiln (stand-in for saltpetre and sulphur).`,
   result:`${done} powder batches physically delivered`,adoption:`Arquebusiers train at the barracks for ${R.powderPerSoldier} powder each plus food, wood and iron.`,
   metrics:{charcoal:coal,straw,bone,gunpowder:powder,batches:done},actions:[{id:'late:powder',label:'Grind gunpowder',blockedReason:p.reason}],limitation:'Saltpetre and sulphur sources are not modelled; the stand-in inputs are real stock.'});
 }
 return out;
}
export function runLateKnowledgeAction(g:Game,id:string):KnowledgeActionResult{
 const [recipe,type,why]:[ProductionRecipe,BldType,string]|[undefined,undefined,undefined]=id==='late:steel'?['carburizeSteel','forge','Finish a forge']:id==='late:blades'?['forgeSteelBlades','forge','Finish a forge']:id==='late:powder'?['grindGunpowder','kiln','Finish a kiln']:id==='late:book'?['bindBook','fibreWorkshop','Finish a fibre workshop']:id==='late:paper'?['pressPaper','fibreWorkshop','Finish a fibre workshop']:[undefined,undefined,undefined];
 if(!recipe)return{accepted:false,reason:'Unknown late-age action'};
 const p=proposal(g,recipe,type,why);if(!p.site||p.reason)return{accepted:false,reason:p.reason||'No available maker'};
 const accepted=beginProduction(g,recipe,p.site.id);
 return{accepted,reason:accepted?'Inputs paid; an adult carries the batch and returns its actual output.':'This paid batch is no longer available'};
}
