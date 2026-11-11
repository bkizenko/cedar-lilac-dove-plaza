import type{Game}from'./sim';import type{Unit,Building}from'./types';
import{CEREAL_RULES,CEREAL_STORAGE_RULES,cerealWeatherIssue,isCerealRecipe,rawCerealField,storedCerealKinds}from'./cerealRules';
import{beginProduction,resumeProduction,startFloorCereal,productionIssue,doubleGrainBatchIssue,productionSlots,occupiedProductionSlots,exposedHarvestUnits,PRODUCTION_RECIPES,type ProductionRecipe}from'./production';
import{foodInventory}from'./pantry';
import{calendar,farmAvailable,isDependent,reserveSeconds}from'./settlement';import{hasTaskCommitment}from'./workCommitments';
import{isRivalTeam}from'./factions';import{rivalKnows}from'./rivalDevelopment';
import{supplyDrops,supplyApproach,supplyReached}from'./campAnchor';import{buildingCost}from'./construction';
const reviews=new WeakMap<Game,{state:Game['state'];teams:Map<number,number>}>();
function free(g:Game,u:Unit,projectId?:number){return u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&!isDependent(g,u)&&(!u.jobLock||projectId!==undefined&&u.productionProjectId===projectId)&&!u.buildOrder&&!u.recalled&&!u.emergency&&!u.resting&&!u.shelterId&&!u.expedition&&!u.envoy&&!u.visit&&!u.scout&&!u.foundingJourney&&!u.tributeJourney&&!u.trade&&u.drill==null&&!hasTaskCommitment(u,projectId!==undefined&&u.productionProjectId===projectId?'productionProjectId':undefined)&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&['idle','hold','gather'].includes(u.order);}
const atCache=(g:Game,u:Unit)=>supplyDrops(g,u.team).some(d=>{const p=supplyApproach(g,u,d);return p&&supplyReached(g,u,d,p);});
/** One real processing dispatch per society review. Direct locks and paused
 * player batches are preserved; a material total is never credited as food. */
export function reviewCerealProcessing(g:Game,team:number,eventActorId?:number){
 const t=g.tribe(team);if(!t?.alive||team!==0&&!isRivalTeam(team))return false;
 const dedicatedOnly=team===0&&g.state.autoWorkEnabled===false;
 if(!g.state.cerealProcessing&&(t.items?.grainSheaves||0)<CEREAL_RULES.rawBatch&&(t.items?.roughGrain||0)<CEREAL_RULES.roughBatch)return false;
 let c=reviews.get(g);if(!c||c.state!==g.state){c={state:g.state,teams:new Map()};reviews.set(g,c);}const due=c.teams.get(team)??-Infinity;if(eventActorId===undefined&&due>g.state.time&&due<=g.state.time+CEREAL_RULES.reviewSeconds)return false;c.teams.set(team,g.state.time+CEREAL_RULES.reviewSeconds);
 const jobs=g.state.production?.projects.filter(p=>p.team===team&&isCerealRecipe(p.recipe)&&!['complete','lost'].includes(p.phase))||[];
 const paused=jobs.find(p=>['paused','stored'].includes(p.phase));if(paused&&team!==0){const p=paused;const retained=p.actorId===null?undefined:g.state.units.find(u=>u.id===p.actorId&&u.team===team&&free(g,u,p.id)),u=retained||g.state.units.find(u=>u.team===team&&free(g,u)&&atCache(g,u));return!!u&&resumeProduction(g,p.id,u.id);}
 const active=jobs.filter(p=>!['paused','stored'].includes(p.phase)).length;
 const limit=team===0?Math.min(12,Math.max(CEREAL_RULES.maximumAutomaticWorkers,
  Math.ceil(g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.prisoner).length/5))):CEREAL_RULES.maximumAutomaticWorkers;
 if(active>=limit)return false;
 const rough=(t.items?.roughGrain||0)>=CEREAL_RULES.roughBatch,raw=(t.items?.grainSheaves||0)>=CEREAL_RULES.rawBatch;
 if(!rough&&!raw)return false;
 // Perishable actual meat is a faster immediate meal; leave its real hearth
 // and workers to the existing kitchen plan before processing stored crops.
 if(team!==0&&(t.items?.rawMeat||0)>=4&&reserveSeconds(g,team)<CEREAL_RULES.foodTargetSeconds)return false;
 const urgent=reserveSeconds(g,team)<240;const candidates=g.state.units.filter(u=>u.team===team&&free(g,u)&&!(urgent&&u.order==='gather'&&u.job==='food'&&u.node&&!("type"in u.node&&rawCerealField(u.node as Building))));if(urgent&&active>0&&candidates.length<=1)return false;
 const workers=candidates.filter(u=>eventActorId===undefined||u.id===eventActorId);if(!workers.length)return false;
 const sites=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&!b.plannedCost&&(b.type==='threshingFloor'||!dedicatedOnly&&b.type==='hearth')),finished=sites.filter(b=>g.finished(b)).sort((a,b)=>Number(b.type==='threshingFloor')-Number(a.type==='threshingFloor'));
 if(!finished.length){
  if(team===0)return false;let site=sites.find(b=>b.type==='hearth');if(site&&g.state.units.some(u=>u.team===team&&u.hp>0&&u.order==='build'&&u.node?.id===site!.id))return false;
  const builder=workers.find(u=>!site||g.interactionSpot(u,site));if(!builder)return false;
  if(!site){const cost=buildingCost('hearth',g,team);if(!g.canAfford(team,cost))return false;const home=g.campOf(team),point=g.findOpenSpot(home.x,home.z,'hearth',team);if(!point||!rivalKnows(g,team,point.x,point.z))return false;if(!g.placeBuilding('hearth',point.x,point.z,team))return false;site=g.state.buildings.find(b=>b.team===team&&b.type==='hearth'&&b.x===point.x&&b.z===point.z&&!g.finished(b));if(!site)return false;}
  if(!g.interactionSpot(builder,site))return false;g.interruptMission(builder);builder.order='build';builder.node=site;builder.job=null;builder.jobLock=false;builder.target=null;builder.workReason='Building a real hearth to hand-process the cereal harvest';g.invalidateRoute(builder);g.workBoard.reset();return true;
 }
 const maker=workers.find(u=>atCache(g,u));
 if(maker){for(const b of finished){
  if(b.type==='threshingFloor'){if(startFloorCereal(g,b,maker,rough))return true;continue;}
  const recipe=rough?'winnowCerealHand':'threshCerealHand';
  if(!productionIssue(g,recipe,b.id,maker.id))return beginProduction(g,recipe,b.id,maker.id);
 }return false;}
 const carrier=workers.find(u=>supplyDrops(g,team).some(d=>supplyApproach(g,u,d)));if(!carrier)return false;g.interruptMission(carrier);carrier.recalled=true;carrier.order='return';carrier.node=null;carrier.target=null;carrier.job=null;carrier.workReason='Returning to load the actual unprocessed cereal batch';g.invalidateRoute(carrier);g.workBoard.reset();return true;
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
 const hand=g.state.autoWorkEnabled!==false&&hearth;
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
  if(!has('grindingStone')&&!hand&&!hearth)return alert('finish a grinding stone or cook grain at a hearth');
  recipes=[...grindingRecipes,'cookPorridge'];
 }else{
  if(!has('threshingFloor')&&!hand)return alert('finish a threshing floor to start processing');
  if(winnow&&cerealWeatherIssue(g,'winnowCerealFloor'))return alert('winnowing resumes in dry weather');
  recipes=winnow?['winnowCerealHand','winnowCerealFloor','winnowCerealFloorDouble']:['threshCerealHand','threshCerealFloor','threshCerealFloorDouble'];
 }
 const grainProjects=projects.filter(p=>recipes.includes(p.recipe));
 if(grainProjects.some(p=>!p.blockedReason&&p.actorId!==null&&p.phase!=='paused'&&p.phase!=='stored'))return recentRisk||exposed?alert('processing underway · check storage and workplace capacity'):null;
 if(grainProjects.some(p=>p.phase==='paused'||p.phase==='stored'))return alert('resume a paused grain batch at its workplace');
 if(bake||grind){
  const meal=grind&&hearth?PRODUCTION_RECIPES.cookPorridge:PRODUCTION_RECIPES.bakeBreadOven;
  if((t.survival?.waterLiters??0)<meal.water)return alert('collect drinking water for grain meals');
  if(t.wood<meal.wood)return alert('gather firewood for grain meals');
 }
 return alert('keep a worker and a clear route available');
}

const mealReviews = new WeakMap<Game, {state: Game['state']; next: number}>();
const mealPickup = new WeakMap<Game['state'], Unit>();
const mealPickupReason = 'Returning to collect food processing inputs';
const meatRecipes: ProductionRecipe[] = ['cookMeat', 'smokeMeat'];
const fishRecipes: ProductionRecipe[] = ['cookFish', 'smokeFish', 'airDryFish', 'manualSmokeFish'];
const breadRecipes: ProductionRecipe[] = ['bakeBreadDouble','bakeBreadOven', 'bakeBread'];
const grindingRecipes: ProductionRecipe[] = ['grindGrainDouble','grindGrainStation', 'grindGrain'];

/** Dispatch one existing paid recipe after a delivery or during the normal review. */
export function reviewAutomaticFoodProcessing(g: Game, team: number, eventActorId?: number) {
 if (team === 0 && reviewPlayerMeals(g, eventActorId)) return true;
 if (reviewCerealProcessing(g, team, eventActorId)) return true;
 return team === 0 && eventActorId === undefined && reviewPlantedGrain(g);
}

const harvestReviews = new WeakMap<Game, {state: Game['state']; next: number}>();
function reviewPlantedGrain(g: Game) {
 if (g.state.autoWorkEnabled !== false || calendar(g).phase !== 2) return false;
 const previous = harvestReviews.get(g);
 if (previous?.state === g.state && previous.next > g.state.time) return false;
 harvestReviews.set(g, {state: g.state, next: g.state.time + CEREAL_RULES.reviewSeconds});
 const floors = g.state.buildings.filter(b => b.team === 0 && b.type === 'threshingFloor' && g.finished(b));
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

function reviewPlayerMeals(g: Game, eventActorId?: number) {
 const tribe = g.tribe(0);
 if (!tribe?.alive) return false;
 const raw = tribe.items?.rawMeat ?? 0;
 const fish = tribe.foodLots?.fish ?? 0;
 const flour = tribe.items?.flour ?? 0;
 const grain = tribe.foodLots?.grain ?? 0;
 if (raw < 4 && fish < 4 && flour < 4 && grain < 4) return false;
 const previous = mealReviews.get(g);
 if (eventActorId === undefined && previous?.state === g.state && previous.next > g.state.time) return false;
 mealReviews.set(g, {state: g.state, next: g.state.time + CEREAL_RULES.reviewSeconds});

 const active = g.state.production?.projects.filter(p => p.team === 0 && p.phase !== 'complete' && p.phase !== 'lost') ?? [];
 const dedicatedOnly = g.state.autoWorkEnabled === false;
 const sites = g.state.buildings.filter(b => b.team === 0 && b.hp > 0 && !b.plannedCost && g.finished(b));
 const canPay = (recipe: ProductionRecipe) => {
  const spec = PRODUCTION_RECIPES[recipe];
  return !doubleGrainBatchIssue(g,0,recipe) && tribe.wood >= spec.wood && (tribe.survival?.waterLiters ?? 0) >= spec.water;
 };
 const urgent = reserveSeconds(g, 0) < CEREAL_RULES.foodTargetSeconds;
 const recipes: ProductionRecipe[] = [];
 if (raw >= 4 && !active.some(p => meatRecipes.includes(p.recipe) || p.recipe === 'manualSmokeMeat' || p.recipe === 'airDryMeat')) {
  recipes.push(...(urgent ? meatRecipes : ['smokeMeat', 'cookMeat'] as const));
 }
 if (fish >= 4 && !active.some(p => fishRecipes.includes(p.recipe))) {
  recipes.push(...(urgent ? fishRecipes : ['smokeFish', 'airDryFish', 'cookFish'] as const));
 }
 const baking = dedicatedOnly ? breadRecipes.filter(recipe=>recipe!=='bakeBread') : breadRecipes;
 const grinding = dedicatedOnly ? grindingRecipes.filter(recipe=>recipe!=='grindGrain') : grindingRecipes;
 const canBake = baking.some(r => canPay(r) && sites.some(b => b.type === PRODUCTION_RECIPES[r].workplace));
 const cleanGrain=grain>=4&&foodInventory(tribe).grain>=4;
 const canGrind=grinding.some(r=>sites.some(b=>b.type===PRODUCTION_RECIPES[r].workplace));
 const grainJobs=active.filter(p=>breadRecipes.includes(p.recipe)||grindingRecipes.includes(p.recipe)||p.recipe==='cookPorridge');
 const adults=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&!isDependent(g,u)).length;
 const grainLimit=Math.min(CEREAL_RULES.maximumAutomaticMealJobs,Math.max(1,Math.ceil(adults/CEREAL_RULES.adultsPerAutomaticMealJob)));
 const assignedGrainJobs=grainJobs.filter(p=>p.actorId!==null&&p.phase!=='paused').length;
 if (assignedGrainJobs<grainLimit) {
  if (canBake && flour >= 4) recipes.push(...baking.filter(recipe=>flour>=(PRODUCTION_RECIPES[recipe].inputs.flour??0)));
  if (cleanGrain) {
   if ((urgent || !canBake || !canGrind)&&!grainJobs.some(p=>p.recipe==='cookPorridge')) recipes.push('cookPorridge');
   if (canBake && canGrind) recipes.push(...grinding.filter(recipe=>grain>=PRODUCTION_RECIPES[recipe].grain));
  }
 }
 const options = recipes.filter(canPay).flatMap(recipe => sites
  .filter(site => site.type === PRODUCTION_RECIPES[recipe].workplace&&occupiedProductionSlots(g,site)<productionSlots(site))
  .map(site => ({recipe, site})));
 if (!options.length) return false;
 const workers = g.state.units.filter(u => u.team === 0 && free(g, u) &&
  (eventActorId === undefined || u.id === eventActorId) &&
  (u.order !== 'gather' || !urgent || u.job !== 'food'));
 for (const {recipe, site} of options) {
  for (const worker of workers) {
   if (!productionIssue(g, recipe, site.id, worker.id)) return beginProduction(g, recipe, site.id, worker.id);
  }
 }
 // Only an active food pickup reserves this dispatch. Other deliveries
 // can stall independently and may be on another landmass.
 const pickup = mealPickup.get(g.state);
 if (eventActorId !== undefined || (pickup && pickup.hp > 0 && pickup.order === 'return' &&
  pickup.workReason === mealPickupReason &&
  pickup.stuckT <= CEREAL_RULES.reviewSeconds)) return false;
 const carrier = workers.find(u => u.order !== 'gather' && !atCache(g, u) &&
  supplyDrops(g, 0).some(drop => !!supplyApproach(g, u, drop)) &&
  options.some(({site}) => !!g.interactionSpot(u, site)));
 if (!carrier) return false;
 g.interruptMission(carrier);
 carrier.order = 'return';
 carrier.node = null;
 carrier.target = null;
 carrier.job = null;
 carrier.workReason = mealPickupReason;
 mealPickup.set(g.state, carrier);
 g.invalidateRoute(carrier);
 g.workBoard.reset();
 return true;
}
