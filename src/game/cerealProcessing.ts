import {productionFuelAvailable} from './mealFuel';
import {millIssue} from './millPower';
import type{Game}from'./sim';import type{Unit,Building}from'./types';
import{CEREAL_RULES,CEREAL_STORAGE_RULES,cerealWeatherIssue,isCerealRecipe,rawCerealField,storedCerealKinds}from'./cerealRules';
import{beginProduction,resumeProduction,startFloorCereal,productionIssue,grainBatchIssue,productionSlots,occupiedProductionSlots,productionFoodOutput,exposedHarvestUnits,PRODUCTION_RECIPES,type ProductionRecipe}from'./production';
import{foodInventory,FOOD_NOURISHMENT}from'./pantry';
import{calendar,farmAvailable,isDependent,reserveSeconds,foodDemand}from'./settlement';import{hasTaskCommitment}from'./workCommitments';
import{isRivalTeam}from'./factions';import{rivalKnows}from'./rivalDevelopment';
import{supplyDrops,supplyApproach,supplyReached}from'./campAnchor';import{buildingCost}from'./construction';
const reviews=new WeakMap<Game,{state:Game['state'];teams:Map<number,number>}>();
/** Resource-search orders belong to the food scheduler, unlike a player's
 * Explore, a goat search or an expedition. Existing task/lock checks still apply. */
const automaticFoodSearch=(u:Unit)=>u.order==='explore'&&u.searchJob==='food'&&u.goatSearchPen===undefined&&!u.huntOnly;
function nearestPickupFirst(workers:Unit[],drops:ReturnType<typeof supplyDrops>){
 const distance=(u:Unit)=>drops.reduce((best,d)=>Math.min(best,Math.hypot(d.x-u.x,d.z-u.z)),Infinity);
 return workers.slice().sort((a,b)=>distance(a)-distance(b));
}

function free(g:Game,u:Unit,projectId?:number){return u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&!isDependent(g,u)&&(!u.jobLock||u.foodRole===true&&!u.huntOnly||projectId!==undefined&&u.productionProjectId===projectId)&&!u.buildOrder&&!u.recalled&&!u.emergency&&!u.resting&&!u.shelterId&&!u.expedition&&!u.envoy&&!u.visit&&!u.scout&&!u.foundingJourney&&!u.tributeJourney&&!u.trade&&u.drill==null&&!hasTaskCommitment(u,projectId!==undefined&&u.productionProjectId===projectId?'productionProjectId':undefined)&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&(['idle','hold','gather'].includes(u.order)||automaticFoodSearch(u));}
const atCache=(g:Game,u:Unit)=>supplyDrops(g,u.team).some(d=>{const p=supplyApproach(g,u,d);return p&&supplyReached(g,u,d,p);});
const cerealPickupReason='Returning to load the actual unprocessed cereal batch';
const mealPickupReason='Returning to collect food processing inputs';
const rawFoodGatherer=(u:Unit)=>u.order==='gather'&&u.job==='food'&&!!u.node&&('kind'in u.node&&u.node.kind==='fish'||'type'in u.node&&rawCerealField(u.node as Building));
const forageFoodGatherer=(u:Unit)=>u.order==='gather'&&u.job==='food'&&!!u.node&&'kind'in u.node&&u.node.kind==='forage';
export const isCerealPickup=(u:Unit)=>u.order==='return'&&u.workReason===cerealPickupReason;
function activePickup(g:Game,team:number,reason:string){
 return g.state.units.some(u=>u.team===team&&u.hp>0&&u.order==='return'&&u.workReason===reason&&
  !u.carry&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&u.stuckT<=CEREAL_RULES.reviewSeconds);
}
function sendForInputs(g:Game,u:Unit,reason:string){
 const foodRole=u.foodRole===true;
 g.interruptMission(u);
 if(foodRole)u.foodRole=true;
 u.order='return';
 u.node=null;
 u.target=null;
 u.job=foodRole?'food':null;
 u.workReason=reason;
 g.invalidateRoute(u);
 g.workBoard.reset();
 return true;
}
/** One real processing dispatch per society review. Direct locks and paused
 * player batches are preserved; a material total is never credited as food. */
export function reviewCerealProcessing(g:Game,team:number,eventActorId?:number,floorsOnly=false){
 const t=g.tribe(team);if(!t?.alive||team!==0&&!isRivalTeam(team))return false;
 if(!g.state.cerealProcessing&&(t.items?.grainSheaves||0)<CEREAL_RULES.rawBatch&&(t.items?.roughGrain||0)<CEREAL_RULES.roughBatch)return false;
 let c=reviews.get(g);if(!c||c.state!==g.state){c={state:g.state,teams:new Map()};reviews.set(g,c);}const due=c.teams.get(team)??-Infinity;if(eventActorId===undefined&&due>g.state.time&&due<=g.state.time+CEREAL_RULES.reviewSeconds)return false;c.teams.set(team,g.state.time+CEREAL_RULES.reviewSeconds);
 const jobs=g.state.production?.projects.filter(p=>p.team===team&&isCerealRecipe(p.recipe)&&!['complete','lost'].includes(p.phase))||[];
 const paused=jobs.find(p=>['paused','stored'].includes(p.phase));if(paused&&team!==0){const p=paused;const retained=p.actorId===null?undefined:g.state.units.find(u=>u.id===p.actorId&&u.team===team&&free(g,u,p.id)),u=retained||g.state.units.find(u=>u.team===team&&free(g,u)&&atCache(g,u));return!!u&&resumeProduction(g,p.id,u.id);}
 const active=jobs.filter(p=>!['paused','stored'].includes(p.phase)).length;
 const limit=team===0?Math.min(12,Math.max(CEREAL_RULES.maximumAutomaticWorkers,
  Math.ceil(g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.prisoner).length/5))):CEREAL_RULES.maximumAutomaticWorkers;
 if(active>=limit)return false;
 const rough=(t.items?.roughGrain||0)>=CEREAL_RULES.roughBatch,raw=(t.items?.grainSheaves||0)>=CEREAL_RULES.rawBatch;
 const winnow=rough&&!cerealWeatherIssue(g,'winnowCerealFloor');
 if(!winnow&&!raw)return false;
 // Perishable actual meat is a faster immediate meal; leave its real hearth
 // and workers to the existing kitchen plan before processing stored crops.
 if(team!==0&&(t.items?.rawMeat||0)>=4&&reserveSeconds(g,team)<CEREAL_RULES.foodTargetSeconds)return false;
 const urgent=reserveSeconds(g,team)<240;const candidates=g.state.units.filter(u=>u.team===team&&free(g,u)&&!(urgent&&u.order==='gather'&&u.job==='food'&&!u.foodRole&&u.node&&!("type"in u.node&&rawCerealField(u.node as Building))&&!(team===0&&(g.state.laborPolicy==='food'||urgent)&&forageFoodGatherer(u))));if(team!==0&&urgent&&active>0&&candidates.length<=1)return false;
 const workers=candidates.filter(u=>eventActorId===undefined||u.id===eventActorId);if(!workers.length)return false;
 const sites=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&!b.plannedCost&&(b.type==='threshingFloor'||!floorsOnly&&b.type==='hearth')),finished=sites.filter(b=>g.finished(b)).sort((a,b)=>Number(b.type==='threshingFloor')-Number(a.type==='threshingFloor'));
 if(!finished.length){
  if(team===0)return false;let site=sites.find(b=>b.type==='hearth');if(site&&g.state.units.some(u=>u.team===team&&u.hp>0&&u.order==='build'&&u.node?.id===site!.id))return false;
  const builder=workers.find(u=>!site||g.interactionSpot(u,site));if(!builder)return false;
  if(!site){const cost=buildingCost('hearth',g,team);if(!g.canAfford(team,cost))return false;const home=g.campOf(team),point=g.findOpenSpot(home.x,home.z,'hearth',team);if(!point||!rivalKnows(g,team,point.x,point.z))return false;if(!g.placeBuilding('hearth',point.x,point.z,team))return false;site=g.state.buildings.find(b=>b.team===team&&b.type==='hearth'&&b.x===point.x&&b.z===point.z&&!g.finished(b));if(!site)return false;}
  if(!g.interactionSpot(builder,site))return false;g.interruptMission(builder);builder.order='build';builder.node=site;builder.job=null;builder.jobLock=false;builder.target=null;builder.workReason='Building a real hearth to hand-process the cereal harvest';g.invalidateRoute(builder);g.workBoard.reset();return true;
 }
 const recipe=winnow?'winnowCerealHand':'threshCerealHand';
 const eligible=finished.filter(b=>occupiedProductionSlots(g,b)<productionSlots(b));
 if(!eligible.length)return false;
 for(const maker of workers){
  if(!atCache(g,maker))continue;
  for(const b of eligible){
   if(b.type==='threshingFloor'){if(startFloorCereal(g,b,maker,winnow))return true;continue;}
   if(!productionIssue(g,recipe,b.id,maker.id))return beginProduction(g,recipe,b.id,maker.id);
  }
 }
 if(eventActorId!==undefined||activePickup(g,team,cerealPickupReason))return false;
 const drops=supplyDrops(g,team);
 const carrier=nearestPickupFirst(workers,drops).find(u=>(u.order!=='gather'||u.foodRole===true||(team===0&&g.state.laborPolicy==='food'||urgent)&&u.job!=='food'||team===0&&(g.state.laborPolicy==='food'||urgent)&&forageFoodGatherer(u))&&(!atCache(g,u)||automaticFoodSearch(u))&&
  drops.some(d=>supplyApproach(g,u,d))&&eligible.some(b=>g.interactionSpot(u,b)));
 return !!carrier&&sendForInputs(g,carrier,cerealPickupReason);
}

/** One stable instruction for the most urgent processing backlog. The alert
 * disappears as the stock clears, while ordinary progress stays in the ledger. */
export function harvestBacklogAlert(g:Game){
 const t=g.tribe(0),items=t.items;
 const sheaves=items?.grainSheaves??0,rough=items?.roughGrain??0;
 const flour=items?.flour??0,grain=t.foodLots?.grain?foodInventory(t).grain:0;
 const thresh=sheaves>=CEREAL_RULES.rawBatch,winnow=rough>=CEREAL_RULES.roughBatch;
 const grind=grain>=PRODUCTION_RECIPES.grindGrainStation.grain,bake=flour>=(PRODUCTION_RECIPES.bakeBreadOven.inputs.flour??4);
 if(!thresh&&!winnow&&!grind&&!bake)return null;
 const recentRisk=storedCerealKinds.some(kind=>(items?.[kind]??0)>0&&t.itemFreshness?.[kind]!==undefined&&
  g.state.time-t.itemFreshness[kind]!>=CEREAL_STORAGE_RULES[kind].coveredGraceSeconds-CEREAL_STORAGE_RULES.spoilageWarningLeadSeconds);
 const exposed=(thresh||winnow)&&exposedHarvestUnits(g,0)>=CEREAL_RULES.rawBatch;
 if(!recentRisk&&!exposed&&sheaves<32&&rough<24&&reserveSeconds(g)>=CEREAL_STORAGE_RULES.urgentReserveSeconds)return null;
 const sites=g.state.buildings.filter(b=>b.team===0&&g.finished(b));
 const has=(kind:Building['type'])=>sites.some(b=>b.type===kind);
 const hearth=has('hearth');
 const hand=hearth;
 const oven=has('oven');
 const projects=g.state.production?.projects.filter(p=>p.team===0&&p.phase!=='complete'&&p.phase!=='lost')??[];
 const prefix=recentRisk||exposed?'Harvest at risk':'Harvest backlog';
 const alert=(action:string)=>`${prefix} · ${action}`;
 let recipes:readonly ProductionRecipe[];
 if(bake){
  if(!oven&&!hand)return alert('finish a bread oven to bake the stored flour');
  recipes=breadRecipes;
 }else if(grind){
  if(!oven&&!hand&&!hearth)return alert('finish a cooking hearth or bread oven');
  if(!has('grindingStone')&&!has('watermill')&&!has('windmill')&&!hand&&!hearth)return alert('finish a grinding stone or cook grain at a hearth');
  recipes=[...grindingRecipes,'cookPorridge'];
 }else{
  if(!has('threshingFloor')&&!hand)return alert('finish a threshing floor to start processing');
  if(winnow&&cerealWeatherIssue(g,'winnowCerealFloor'))return alert('winnowing resumes in dry weather');
  recipes=winnow?['winnowCerealHand','winnowCerealFloor','winnowCerealFloorDouble','winnowCerealFloorBulk']:['threshCerealHand','threshCerealFloor','threshCerealFloorDouble','threshCerealFloorBulk'];
 }
 const grainProjects=projects.filter(p=>recipes.includes(p.recipe));
 if(grainProjects.some(p=>!p.blockedReason&&p.actorId!==null&&p.phase!=='paused'&&p.phase!=='stored'))return recentRisk||exposed?alert('processing underway · check storage and workplace capacity'):null;
 if(grainProjects.some(p=>p.phase==='paused'||p.phase==='stored'))return alert('resume a paused grain batch at its workplace');
 if(bake||grind){
  const meal=grind&&hearth?PRODUCTION_RECIPES.cookPorridge:PRODUCTION_RECIPES.bakeBreadOven;
  if((t.survival?.waterLiters??0)<meal.water)return alert('collect drinking water for grain meals');
  if(!productionFuelAvailable(g,0,'cookPorridge',meal.wood))return alert('gather firewood or use delivered cereal residues for meals');
 }
 return alert('keep a worker and a clear route available');
}

const mealReviews = new WeakMap<Game, {state: Game['state']; next: number}>();
const meatRecipes: ProductionRecipe[] = ['cookMeat', 'smokeMeat'];
const fishRecipes: ProductionRecipe[] = ['cookFish', 'smokeFish', 'airDryFish', 'manualSmokeFish'];
export const breadRecipes: ProductionRecipe[] = ['bakeBreadBulk','bakeBreadDouble','bakeBreadOven', 'bakeBread'];
export const grindingRecipes: ProductionRecipe[] = ['grindGrainWatermill','grindGrainWindmill','grindGrainBulk','grindGrainDouble','grindGrainStation', 'grindGrain'];

/** Dispatch one existing paid recipe after a delivery or during the normal review. */
export function reviewAutomaticFoodProcessing(g: Game, team: number, eventActorId?: number) {
 // Ready meals take the next free hands and kitchen slots before restoring
 // slower upstream work. Existing paid batches retain every input and actor.
 if(team===0&&urgentReadyMealInputs(g)){
  // Reserve all currently usable urgent kitchen batches before this same
  // simulation step consumes emergency raw rations. Only follow-up admissions
  // bypass the normal review timer, and the shared worker cap bounds the loop.
  let dispatched=false;const limit=mealWorkerLimit(g);
  for(let i=0;i<limit;i++){
   if(!reviewPlayerMeals(g,i===0?eventActorId:undefined,i>0))break;
   dispatched=true;
  }
  if(dispatched)return true;
  if(reviewInterruptedFoodProcessing(g,team,eventActorId,activeFoodWorkers(g)<mealWorkerLimit(g)))return true;
  // A full kitchen must not freeze separate threshing floors. Keep their
  // independent workforce bound, and reserve hearths for the waiting meals.
  if(reviewCerealProcessing(g,team,eventActorId,true))return true;
  return eventActorId===undefined&&reviewPlantedGrain(g);
 }
 if (reviewInterruptedFoodProcessing(g,team,eventActorId)) return true;
 if (team === 0 && reviewPlayerMeals(g, eventActorId)) return true;
 if (reviewCerealProcessing(g, team, eventActorId)) return true;
 return team === 0 && eventActorId === undefined && reviewPlantedGrain(g);
}

function mealWorkerLimit(g:Game){const adults=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&!isDependent(g,u)).length;return Math.min(CEREAL_RULES.maximumAutomaticMealJobs,Math.max(1,Math.ceil(adults/CEREAL_RULES.adultsPerAutomaticMealJob)));}
function activeFoodWorkers(g:Game){return(g.state.production?.projects||[]).filter(p=>p.team===0&&p.actorId!==null&&!['paused','stored','complete','lost'].includes(p.phase)&&
 !isCerealRecipe(p.recipe)&&!['grindingStone','oven'].includes(PRODUCTION_RECIPES[p.recipe].workplace)&&(productionFoodOutput(p)>0||PRODUCTION_RECIPES[p.recipe].grain>0||!!PRODUCTION_RECIPES[p.recipe].outputs.flour)).length;}
function urgentReadyMealInputs(g:Game){
 if(reserveSeconds(g,0)>=CEREAL_RULES.foodTargetSeconds)return false;
 const t=g.tribe(0),food=foodInventory(t);
 return (['cookFish','cookMeat','cookPorridge',...breadRecipes,'smokeFish','smokeMeat']as ProductionRecipe[]).some(recipe=>{
  const r=PRODUCTION_RECIPES[recipe];return productionFuelAvailable(g,0,recipe,r.wood)&&(t.survival?.waterLiters??0)>=r.water&&food.grain>=r.grain&&
   Object.entries(r.foodInputs).every(([kind,n])=>(food[kind as keyof typeof food]||0)>=(n||0))&&Object.entries(r.inputs).every(([kind,n])=>((t.items as Record<string,number>|undefined)?.[kind]||0)>=(n||0))&&
   g.state.buildings.some(b=>b.team===0&&g.finished(b)&&!b.plannedCost&&b.type===r.workplace&&!grainBatchIssue(g,0,recipe,b));
 });
}

const recoveryReviews=new WeakMap<Game,{state:Game['state'];teams:Map<number,number>}>();
/** Resume incidental interruptions, never a player's explicit Pause or Unload.
 * Legacy saves used text for every pause, so recognize only known incidental
 * reasons and retain that classification before a failed retry changes it. */
function reviewInterruptedFoodProcessing(g:Game,team:number,eventActorId?:number,allowKitchen=true){
 const projects=g.state.production?.projects;if(!projects?.length)return false;
 let review=recoveryReviews.get(g);if(!review||review.state!==g.state){review={state:g.state,teams:new Map()};recoveryReviews.set(g,review);}
 const due=review.teams.get(team)??-Infinity;if(eventActorId===undefined&&due>g.state.time&&due<=g.state.time+CEREAL_RULES.reviewSeconds)return false;
 review.teams.set(team,g.state.time+CEREAL_RULES.reviewSeconds);
 for(const p of projects){
  if(p.team!==team||!['paused','stored'].includes(p.phase)||p.pauseCause==='manual'||!allowKitchen&&!isCerealRecipe(p.recipe)&&!['grindingStone','oven'].includes(PRODUCTION_RECIPES[p.recipe].workplace))continue;
  const spec=PRODUCTION_RECIPES[p.recipe];
  if(!isCerealRecipe(p.recipe)&&!spec.grain&&!productionFoodOutput(p)&&!spec.outputs.flour)continue;
  if(p.pauseCause!=='interrupted'&&!/^(Direct order paused paid work|Maker lost;|Pickup paused; paid inputs|Pickup adult lost;|Pickup route blocked;|No route to the workshop;)/.test(p.blockedReason))continue;
  p.pauseCause='interrupted';
  if(p.actorId===null)for(const maker of p.practiceWorkers||[]){
   const u=g.state.units.find(u=>u.id===maker.id&&u.team===team);
   // Older releases removed the project link but left the maker locked. Only
   // repair a recorded former maker with no new job or stationed order.
   if(!u||!u.jobLock||u.productionProjectId!==undefined||u.job||u.node||u.target||u.stationOnArrival||!['idle','hold'].includes(u.order))continue;
   u.jobLock=false;if(!free(g,u)){u.jobLock=true;continue;}
   u.workReason='Available again after an interrupted paid food batch';
  }
  if(p.resumePhase==='curing'){if(resumeProduction(g,p.id))return true;continue;}
  const workers=g.state.units.filter(u=>u.team===team&&(eventActorId===undefined||u.id===eventActorId)&&
   (p.actorId===null||p.actorId===u.id)&&free(g,u,p.id));
  for(const u of workers)if(resumeProduction(g,p.id,u.id))return true;
 }
 return false;
}

const harvestReviews = new WeakMap<Game, {state: Game['state']; next: number}>();
function reviewPlantedGrain(g: Game) {
 if (g.state.autoWorkEnabled !== false || calendar(g).phase !== 2) return false;
 const previous = harvestReviews.get(g);
 if (previous?.state === g.state && previous.next > g.state.time) return false;
 harvestReviews.set(g, {state: g.state, next: g.state.time + CEREAL_RULES.reviewSeconds});
 const floors = g.state.buildings.filter(b => b.team === 0 && (b.type === 'threshingFloor'||b.type==='hearth') && g.finished(b));
 if (!floors.length) return false;
 const fields = g.state.buildings.filter(b => b.team === 0 && g.finished(b) && rawCerealField(b) && farmAvailable(g,b) &&
  !g.state.units.some(u => u.hp > 0 && u.order === 'gather' && u.node === b));
 for (const field of fields) {
  const worker = g.state.units.find(u => u.team === 0 && u.order !== 'gather' && free(g,u) &&
   !!g.interactionSpot(u,field) && floors.some(floor => g.workBoard.connected(g,field.x,field.z,floor.x,floor.z) || !!g.interactionSpot(u,floor)));
  if (!worker) continue;
  worker.node = field;
  worker.order = 'gather';
  worker.job = 'food';
  worker.gatherT = 0;
  worker.workReason = 'Harvesting a ripe field for the threshing floor';
  g.invalidateRoute(worker);
  g.workBoard.reset();
  return true;
 }
 return false;
}

function reviewPlayerMeals(g: Game, eventActorId?: number, urgentFollowup=false) {
 const tribe = g.tribe(0);
 if (!tribe?.alive) return false;
 const raw = tribe.items?.rawMeat ?? 0;
 const fish = tribe.foodLots?.fish ?? 0;
 const flour = tribe.items?.flour ?? 0;
 const grain = tribe.foodLots?.grain ?? 0;
 if (raw < 4 && fish < 4 && flour < 4 && grain < 4) return false;
 const previous = mealReviews.get(g);
 if (!urgentFollowup&&eventActorId === undefined && previous?.state === g.state && previous.next > g.state.time) return false;
 mealReviews.set(g, {state: g.state, next: g.state.time + CEREAL_RULES.reviewSeconds});

 const active = g.state.production?.projects.filter(p => p.team === 0 && p.phase !== 'complete' && p.phase !== 'lost') ?? [];
 const sites = g.state.buildings.filter(b => b.team === 0 && b.hp > 0 && !b.plannedCost && g.finished(b));
 const canPay = (recipe: ProductionRecipe) => {
  const spec = PRODUCTION_RECIPES[recipe];
  return !grainBatchIssue(g,0,recipe) && productionFuelAvailable(g,0,recipe,spec.wood) && (tribe.survival?.waterLiters ?? 0) >= spec.water;
 };
 const urgent = reserveSeconds(g, 0) < CEREAL_RULES.foodTargetSeconds;
 const quickMeals=urgent&&urgentReadyMealInputs(g);
 const kitchenOpen=!urgent||activeFoodWorkers(g)<mealWorkerLimit(g);
 const recipes: ProductionRecipe[] = [];
 if (kitchenOpen && raw >= 4 && (urgent || !active.some(p => meatRecipes.includes(p.recipe) || p.recipe === 'manualSmokeMeat' || p.recipe === 'airDryMeat'))) {
  recipes.push(...(urgent ? meatRecipes : ['smokeMeat', 'cookMeat'] as const));
 }
 if (kitchenOpen && fish >= 4 && (urgent || !active.some(p => fishRecipes.includes(p.recipe)))) {
  recipes.push(...(urgent ? fishRecipes : ['smokeFish', 'airDryFish', 'cookFish'] as const));
 }
 const baking = breadRecipes;
 const grinding = grindingRecipes;
 const canBake = baking.some(r => canPay(r) && sites.some(b => b.type === PRODUCTION_RECIPES[r].workplace));
 const cleanGrain=grain>=4&&foodInventory(tribe).grain>=4;
 const canGrind=grinding.some(r=>sites.some(b=>b.type===PRODUCTION_RECIPES[r].workplace));
 const grainJobs=active.filter(p=>breadRecipes.includes(p.recipe)||grindingRecipes.includes(p.recipe)||p.recipe==='cookPorridge');
 const grainLimit=mealWorkerLimit(g);
 const assignedGrainJobs=grainJobs.filter(p=>p.actorId!==null&&p.phase!=='paused'&&PRODUCTION_RECIPES[p.recipe].workplace==='hearth').length;
 const dedicatedOvens=sites.filter(b=>b.type==='oven');
 // Flour is a short working buffer, not the whole grain harvest. Count paid
 // milling outputs too so independent stations cannot each reserve the same
 // apparent shortage. Existing reserved inputs and batches remain untouched.
 const futureFlour=flour+active.reduce((n,p)=>n+(PRODUCTION_RECIPES[p.recipe].outputs.flour||0),0);
 const flourTarget=Math.max(4,foodDemand(g,0)*CEREAL_RULES.flourBufferSeconds/(FOOD_NOURISHMENT.bread??1),
  dedicatedOvens.reduce((n,b)=>n+productionSlots(b),0)*4*CEREAL_RULES.flourBatchesPerOvenSlot);
 if (canBake && flour >= 4) recipes.push(...baking.filter(recipe=>
  flour>=(PRODUCTION_RECIPES[recipe].inputs.flour??0)&&
  (PRODUCTION_RECIPES[recipe].workplace==='oven'||kitchenOpen&&assignedGrainJobs<grainLimit)));
 if(cleanGrain){
  if(kitchenOpen&&assignedGrainJobs<grainLimit&&(urgent||!canBake||!canGrind)&&(urgent||!grainJobs.some(p=>p.recipe==='cookPorridge')))recipes.push('cookPorridge');
  if(canBake&&canGrind&&futureFlour<flourTarget)recipes.push(...grinding.filter(recipe=>
   grain>=PRODUCTION_RECIPES[recipe].grain&&
   (['grindingStone','watermill','windmill'].includes(PRODUCTION_RECIPES[recipe].workplace)&&(!quickMeals||dedicatedOvens.length>0)||
    !quickMeals&&kitchenOpen&&assignedGrainJobs<grainLimit)));
 }
 if(urgent)recipes.sort((a,b)=>{const x=PRODUCTION_RECIPES[a],y=PRODUCTION_RECIPES[b];
  if(x.workplace===y.workplace&&['grindingStone','oven'].includes(x.workplace))return (x.workSeconds+x.exposureSeconds)/(x.food||x.outputs.flour||1)-(y.workSeconds+y.exposureSeconds)/(y.food||y.outputs.flour||1);
  return x.workSeconds+x.exposureSeconds-y.workSeconds-y.exposureSeconds;
 });
 const options = recipes.filter(canPay).flatMap(recipe => sites
  .filter(site => site.type === PRODUCTION_RECIPES[recipe].workplace&&!grainBatchIssue(g,0,recipe,site)&&!millIssue(g,site)&&occupiedProductionSlots(g,site)<productionSlots(site))
  .map(site => ({recipe, site})));
 if (!options.length) return false;
 const workers = g.state.units.filter(u => u.team === 0 && free(g, u) &&
  (eventActorId === undefined || u.id === eventActorId) &&
  (u.order !== 'gather' || u.foodRole===true || !urgent || u.job !== 'food'||rawFoodGatherer(u)||(g.state.laborPolicy==='food'||urgent)&&forageFoodGatherer(u)));
 for (const {recipe, site} of options) {
  for (const worker of workers) {
   if (!productionIssue(g, recipe, site.id, worker.id)) return beginProduction(g, recipe, site.id, worker.id);
  }
 }
 // Only an active food pickup reserves this dispatch. Other deliveries
 // can stall independently and may be on another landmass.
 if (eventActorId !== undefined || activePickup(g,0,mealPickupReason)) return false;
 const drops = supplyDrops(g,0);
 const carrier = nearestPickupFirst(workers,drops).find(u => (u.order !== 'gather' || u.foodRole===true || (g.state.laborPolicy === 'food' || urgent) && u.job !== 'food'||urgent&&rawFoodGatherer(u)||(g.state.laborPolicy==='food'||urgent)&&forageFoodGatherer(u)) && (!atCache(g, u)||automaticFoodSearch(u)) &&
  drops.some(drop => !!supplyApproach(g, u, drop)) &&
  options.some(({site}) => !!g.interactionSpot(u, site)));
 return !!carrier && sendForInputs(g,carrier,mealPickupReason);
}
