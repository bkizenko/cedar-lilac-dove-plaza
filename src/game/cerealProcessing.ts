import type{Game}from'./sim';import type{Unit,Building}from'./types';
import{CEREAL_RULES,isCerealRecipe,rawCerealField}from'./cerealRules';
import{beginProduction,resumeProduction,productionIssue,PRODUCTION_RECIPES,type ProductionRecipe}from'./production';
import{foodInventory}from'./pantry';
import{isDependent,reserveSeconds}from'./settlement';import{hasTaskCommitment}from'./workCommitments';
import{isRivalTeam}from'./factions';import{rivalKnows}from'./rivalDevelopment';
import{supplyDrops,supplyApproach,supplyReached}from'./campAnchor';import{buildingCost}from'./construction';
const reviews=new WeakMap<Game,{state:Game['state'];teams:Map<number,number>}>();
function free(g:Game,u:Unit,projectId?:number){return u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&!isDependent(g,u)&&(!u.jobLock||projectId!==undefined&&u.productionProjectId===projectId)&&!u.buildOrder&&!u.recalled&&!u.emergency&&!u.resting&&!u.shelterId&&!u.expedition&&!u.envoy&&!u.visit&&!u.scout&&!u.foundingJourney&&!u.tributeJourney&&!u.trade&&u.drill==null&&!hasTaskCommitment(u,projectId!==undefined&&u.productionProjectId===projectId?'productionProjectId':undefined)&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&['idle','hold','gather'].includes(u.order);}
const atCache=(g:Game,u:Unit)=>supplyDrops(g,u.team).some(d=>{const p=supplyApproach(g,u,d);return p&&supplyReached(g,u,d,p);});
/** One real processing dispatch per society review. Direct locks and paused
 * player batches are preserved; a material total is never credited as food. */
export function reviewCerealProcessing(g:Game,team:number,eventActorId?:number){
 const t=g.tribe(team);if(!t?.alive||team===0&&g.state.autoWorkEnabled===false||team!==0&&!isRivalTeam(team))return false;
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
 const sites=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&!b.plannedCost&&['hearth','threshingFloor'].includes(b.type)),finished=sites.filter(b=>g.finished(b)).sort((a,b)=>Number(b.type==='threshingFloor')-Number(a.type==='threshingFloor'));
 if(!finished.length){
  if(team===0)return false;let site=sites.find(b=>b.type==='hearth');if(site&&g.state.units.some(u=>u.team===team&&u.hp>0&&u.order==='build'&&u.node?.id===site!.id))return false;
  const builder=workers.find(u=>!site||g.interactionSpot(u,site));if(!builder)return false;
  if(!site){const cost=buildingCost('hearth',g,team);if(!g.canAfford(team,cost))return false;const home=g.campOf(team),point=g.findOpenSpot(home.x,home.z,'hearth',team);if(!point||!rivalKnows(g,team,point.x,point.z))return false;if(!g.placeBuilding('hearth',point.x,point.z,team))return false;site=g.state.buildings.find(b=>b.team===team&&b.type==='hearth'&&b.x===point.x&&b.z===point.z&&!g.finished(b));if(!site)return false;}
  if(!g.interactionSpot(builder,site))return false;g.interruptMission(builder);builder.order='build';builder.node=site;builder.job=null;builder.jobLock=false;builder.target=null;builder.workReason='Building a real hearth to hand-process the cereal harvest';g.invalidateRoute(builder);g.workBoard.reset();return true;
 }
 const maker=workers.find(u=>atCache(g,u));
 if(maker){for(const b of finished){const recipe=rough?(b.type==='threshingFloor'?'winnowCerealFloor':'winnowCerealHand'):(b.type==='threshingFloor'?'threshCerealFloor':'threshCerealHand');if(!productionIssue(g,recipe,b.id,maker.id))return beginProduction(g,recipe,b.id,maker.id);}return false;}
 const carrier=workers.find(u=>supplyDrops(g,team).some(d=>supplyApproach(g,u,d)));if(!carrier)return false;g.interruptMission(carrier);carrier.recalled=true;carrier.order='return';carrier.node=null;carrier.target=null;carrier.job=null;carrier.workReason='Returning to load the actual unprocessed cereal batch';g.invalidateRoute(carrier);g.workBoard.reset();return true;
}

const mealReviews = new WeakMap<Game, {state: Game['state']; next: number}>();
const meatRecipes: ProductionRecipe[] = ['cookMeat', 'smokeMeat'];
const breadRecipes: ProductionRecipe[] = ['bakeBreadOven', 'bakeBread'];
const grindingRecipes: ProductionRecipe[] = ['grindGrainStation', 'grindGrain'];

/** Dispatch one existing paid recipe after a delivery or during the normal review. */
export function reviewAutomaticFoodProcessing(g: Game, team: number, eventActorId?: number) {
 if (team === 0 && g.state.autoWorkEnabled !== false && reviewPlayerMeals(g, eventActorId)) return true;
 return reviewCerealProcessing(g, team, eventActorId);
}

function reviewPlayerMeals(g: Game, eventActorId?: number) {
 const tribe = g.tribe(0);
 if (!tribe?.alive) return false;
 const raw = tribe.items?.rawMeat ?? 0;
 const flour = tribe.items?.flour ?? 0;
 const grain = tribe.foodLots?.grain ?? 0;
 if (raw < 4 && flour < 4 && grain < 4) return false;
 const previous = mealReviews.get(g);
 if (eventActorId === undefined && previous?.state === g.state && previous.next > g.state.time) return false;
 mealReviews.set(g, {state: g.state, next: g.state.time + CEREAL_RULES.reviewSeconds});

 const active = g.state.production?.projects.filter(p => p.team === 0 && p.phase !== 'complete' && p.phase !== 'lost') ?? [];
 const sites = g.state.buildings.filter(b => b.team === 0 && b.hp > 0 && !b.plannedCost && g.finished(b));
 const canPay = (recipe: ProductionRecipe) => {
  const spec = PRODUCTION_RECIPES[recipe];
  return tribe.wood >= spec.wood && (tribe.survival?.waterLiters ?? 0) >= spec.water;
 };
 const urgent = reserveSeconds(g, 0) < CEREAL_RULES.foodTargetSeconds;
 const recipes: ProductionRecipe[] = [];
 if (raw >= 4 && !active.some(p => meatRecipes.includes(p.recipe) || p.recipe === 'manualSmokeMeat' || p.recipe === 'airDryMeat')) {
  recipes.push(...(urgent ? meatRecipes : ['smokeMeat', 'cookMeat'] as const));
 }
 const canBake = breadRecipes.some(r => canPay(r) && sites.some(b => b.type === PRODUCTION_RECIPES[r].workplace));
 if (canBake && !active.some(p => breadRecipes.includes(p.recipe) || grindingRecipes.includes(p.recipe))) {
  if (flour >= 4) recipes.push(...breadRecipes);
  else if (foodInventory(tribe).grain >= 4) recipes.push(...grindingRecipes);
 }
 const options = recipes.filter(canPay).flatMap(recipe => sites
  .filter(site => site.type === PRODUCTION_RECIPES[recipe].workplace)
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
 // Let a returning villager finish the trip before sending another to load.
 if (eventActorId !== undefined || g.state.units.some(u => u.team === 0 && u.hp > 0 && u.order === 'return')) return false;
 const carrier = workers.find(u => u.order !== 'gather' && !atCache(g, u) &&
  supplyDrops(g, 0).some(drop => !!supplyApproach(g, u, drop)) &&
  options.some(({site}) => !!g.interactionSpot(u, site)));
 if (!carrier) return false;
 g.interruptMission(carrier);
 carrier.order = 'return';
 carrier.node = null;
 carrier.target = null;
 carrier.job = null;
 carrier.workReason = 'Returning to collect food processing inputs';
 g.invalidateRoute(carrier);
 g.workBoard.reset();
 return true;
}
