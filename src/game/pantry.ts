import{FOOD_KINDS}from'./foodKinds';
export{FOOD_KINDS}from'./foodKinds';
import {recordSimulationEvent} from './simulationEvents';
import {difficulty} from './difficulty';
import {AGE_COST} from "./constants";
import { hasTradition } from "./discovery";
import type { Game } from "./sim";
import type { Building, Unit, FoodKind, Tribe } from "./types";
import { calendar, foodDemand, reserveSeconds, isDependent, FOOD_PER_PERSON_SECOND } from "./settlement";
import { predisposition } from "./people";
import { habitatAt } from "./ecology";

/** Growth must cover children becoming adults before the next harvest, not
 * merely today's smaller appetites. No future harvest is credited in advance. */
export function growthFoodNeed(g:Game,team:number) {
  const {phase,remaining}=calendar(g);
  const untilHarvest=phase===0?remaining+450:phase===1?remaining:phase===2?remaining+1350:remaining+900;
  const horizon=Math.max(600,untilHarvest+180);
  const people=g.state.units.filter(u=>u.team===team&&u.hp>0&&!u.expedition);
  let food=16;
  for(let at=0;at<horizon;at+=30){
    const dt=Math.min(30,horizon-at),time=g.state.time+at+dt/2;
    const winter=Math.floor((time%1800)/450)===3;
    const mouths=people.reduce((n,u)=>n+(u.maturesAt!==undefined&&time<u.maturesAt?0.5:1)*predisposition(u).appetite*(winter?habitatAt(g,u.x,u.z).winterFood:1),0);
    food+=(mouths+(at<360?.5:1))*FOOD_PER_PERSON_SECOND*dt;
  }
  return Math.ceil(food*1.12*(team===0?difficulty(g).food:1)+20);
}
import { climateAt } from "./ecology";

export function storehouses(g: Game, team: number) {
  return g.state.buildings.filter(b => b.team === team && b.type === "warehouse" && g.finished(b));
}
/** Game-balance nourishment knob; physical food counts and recorded eaten units remain separate. */
export const FOOD_NOURISHMENT:Partial<Record<FoodKind,number>>={bread:1.2};

export const FOOD_NAMES:Record<FoodKind,string>={provisions:'provisions',berries:'berries',fish:'fresh fish',meat:'cooked meat',grain:'grain',pulses:'pulses',tubers:'tubers',milk:'milk',bread:'bread',driedMeat:'dried meat',driedFish:'dried fish',smokedMeat:'smoked meat',smokedFish:'smoked fish',cookedFish:'cooked fish',porridge:'porridge'};
/** The existing food total remains the save/trade facade; lots refine its contents. */
export function foodInventory(t:Tribe) {
  const lots=Object.fromEntries(FOOD_KINDS.map(k=>[k,Math.max(0,t.foodLots?.[k]||0)])) as Record<FoodKind,number>;
  const total=FOOD_KINDS.reduce((n,k)=>n+lots[k],0);
  if(total>t.food&&total>0)for(const k of FOOD_KINDS)lots[k]*=t.food/total;
  else lots.provisions+=Math.max(0,t.food-total);
  return lots;
}
const playerReadyKinds = FOOD_KINDS.filter(kind => kind !== 'grain' && kind !== 'fish');
function nourishmentOf(lots: Record<FoodKind,number>, kinds: readonly FoodKind[]) {
  return kinds.reduce((total, kind) => total + lots[kind] * (FOOD_NOURISHMENT[kind] ?? 1), 0);
}
export function readyFoodStock(tribe: Tribe) {
  const lots=foodInventory(tribe);
  return {units:playerReadyKinds.reduce((total,kind)=>total+lots[kind],0),nourishment:nourishmentOf(lots,playerReadyKinds)};
}
export function readyNourishment(tribe: Tribe, team: number) {
  const lots = tribe.foodLots;
  if (!lots?.bread && (team !== 0 || (!lots?.fish && !lots?.grain))) return tribe.food;
  return nourishmentOf(foodInventory(tribe), team === 0 ? playerReadyKinds : FOOD_KINDS);
}
/** Remove one identified edible lot and the legacy food facade together, once. */
export function takeFoodLot(g:Game,team:number,kind:FoodKind,amount:number){
 if(!Number.isFinite(amount)||amount<0)return false;const t=g.tribe(team),lots=foodInventory(t);if(lots[kind]+1e-9<amount)return false;
 lots[kind]=Math.max(0,lots[kind]-amount);t.food=Math.max(0,t.food-amount);t.foodLots=lots;return true;
}
export function receiveFood(g:Game,team:number,amount:number,kind:FoodKind="provisions",source:'receipt'|'production'='receipt') {
  recordSimulationEvent(g,'food_received',team,'food',amount);
  if(kind!=='grain'&&kind!=='fish'){
    recordSimulationEvent(g,'ready_food_received',team,'food',amount);
    recordSimulationEvent(g,'ready_nourishment_received',team,'food',amount*(FOOD_NOURISHMENT[kind]??1));
    if(source==='production'){recordSimulationEvent(g,'ready_food_produced',team,'food',amount);recordSimulationEvent(g,'ready_nourishment_produced',team,'food',amount*(FOOD_NOURISHMENT[kind]??1));}
  }
  const t=g.tribe(team),lots=foodInventory(t);lots[kind]+=amount;t.food+=amount;t.foodLots=lots;
}
function lossRates(g:Game,team:number,food:number,phase:number,includeOverflow:boolean) {
  const stores=storehouses(g,team),indoor=Math.min(1,stores.length*200/Math.max(1,food));
  const prepared=Math.min(indoor,stores.reduce((n,b)=>n+(b.storeCare||0)*200,0)/Math.max(1,food));
  const home=g.campOf(team),time=phase===calendar(g).phase?g.state.time:Math.floor(g.state.time/1800)*1800+phase*450+225;
  const {temperature,humidity}=climateAt(g,home.x,home.z,time);
  const climate=Math.max(.12,Math.min(2.8,Math.pow(2,(temperature-12)/12)*(.65+humidity*.7)));
  const protectedRate=(1-indoor)+(indoor-prepared)*.25+prepared*.05;
  const knowledge=(team===0&&g.state.agePicks[0]==="econ"?.35:1)*(team===0&&hasTradition(g,"winter-stores")?.75:1);
  const base:Record<FoodKind,number>={provisions:.00012,berries:.00024,fish:.00055,meat:.0004,grain:.00006,pulses:.00007,tubers:.00013,milk:.00065,bread:.00018,driedMeat:.000045,driedFish:.000045,smokedMeat:.000065,smokedFish:.000065,cookedFish:.0004,porridge:.0005};
  const outside=includeOverflow?Math.max(0,food-g.stockCap(team))/Math.max(1,food):0;
  return Object.fromEntries(FOOD_KINDS.map(k=>[k,(base[k]*protectedRate+outside*.0005)*climate*knowledge*(team===0?difficulty(g).spoil:1)])) as Record<FoodKind,number>;
}
export function foodSpoilage(g: Game, team = 0, food = g.tribe(team).food, phase = calendar(g).phase, includeOverflow = true) {
  const t=g.tribe(team),lots=foodInventory(t),rates=lossRates(g,team,food,phase,includeOverflow);
  if(t.food<=0)return food*rates.provisions;
  const total=Math.max(1,t.food);
  return FOOD_KINDS.reduce((n,k)=>n+food*lots[k]/total*rates[k],0);
}
export const EMERGENCY_RATIONS = {nourishment: 0.1, illnessPerRawUnit: 0.025, illnessSeconds: 120};

export function consumeAndSpoilFood(g:Game,team:number,demand:number,dt:number) {
  const t=g.tribe(team),lots=foodInventory(t),rates=lossRates(g,team,t.food,calendar(g).phase,true),before=t.food;
  const rawRules=team===0;
  const normalKinds=rawRules?playerReadyKinds:FOOD_KINDS;
  for(const k of FOOD_KINDS)lots[k]*=Math.max(0,1-rates[k]*dt);
  const left=FOOD_KINDS.reduce((n,k)=>n+lots[k],0);
  const nourishment=nourishmentOf(lots,normalKinds);
  const required=demand*dt,share=Math.max(0,1-required/Math.max(.0001,nourishment));
  for(const k of normalKinds)lots[k]*=share;
  let deficit=Math.max(0,required-nourishment),risky=0,emergencyUnits=0;
  const consumeEmergency=(available:number,nutrition:number,unsafe=false)=>{
    const eaten=Math.min(available,deficit/nutrition);
    deficit=Math.max(0,deficit-eaten*nutrition);
    if(unsafe)risky+=eaten;
    return eaten;
  };
  if(rawRules&&deficit>0){
    lots.grain-=consumeEmergency(lots.grain,EMERGENCY_RATIONS.nourishment);
    for(const kind of ['roughGrain','grainSheaves'] as const){
      if(t.items?.[kind]){const eaten=consumeEmergency(t.items[kind]!,EMERGENCY_RATIONS.nourishment*(kind==='grainSheaves'?.5:1));t.items[kind]!-=eaten;emergencyUnits+=eaten;}
    }
    lots.fish-=consumeEmergency(lots.fish,EMERGENCY_RATIONS.nourishment,true);
    if(t.items?.rawMeat){const eaten=consumeEmergency(t.items.rawMeat,EMERGENCY_RATIONS.nourishment,true);t.items.rawMeat-=eaten;emergencyUnits+=eaten;}
  }
  if(risky>0&&Math.random()<1-Math.exp(-risky*EMERGENCY_RATIONS.illnessPerRawUnit)){
    const resident=g.state.units.find(u=>u.team===team&&u.hp>0&&!u.sickUntil&&!u.expedition&&!u.prisoner&&!u.visit);
    if(resident){
      resident.sickUntil=g.state.time+EMERGENCY_RATIONS.illnessSeconds;
      resident.hp=Math.max(1,resident.hp-resident.maxHp*.12);
      g.banner('A resident fell ill after eating raw meat or fish',4);
    }
  }
  t.food=FOOD_KINDS.reduce((n,k)=>n+lots[k],0);t.foodLots=lots;
  recordSimulationEvent(g,'food_spoiled',team,'food',Math.max(0,before-left));
  recordSimulationEvent(g,'food_consumed',team,'food',Math.max(0,left-t.food)+emergencyUnits);
  return required>0?Math.min(1,deficit/required):0;
}
export function preservationTimberReserve(g:Game,team:number){return Math.max(16,AGE_COST[g.tribe(team).age+1]?.wood||0);}
export function preservationAvailable(g: Game, b: Building) {
  return b.type === "warehouse" && g.finished(b) && (b.storeCare || 0) < 0.95 &&
    g.tribe(b.team).wood >= preservationTimberReserve(g,b.team)+1 && reserveSeconds(g, b.team) >= 240;
}
export function preserveFood(g: Game, u: Unit, b: Building, dt: number) {
  if (isDependent(g, u) || !preservationAvailable(g, b)) {
    u.order = "idle"; u.node = null; u.gatherT = 0; return;
  }
  u.workReason = "Drying and smoking stored food · uses timber";
  u.gatherT += dt;
  if (u.gatherT >= 8) {
    u.gatherT = 0;
    g.tribe(b.team).wood -= 1;
    b.storeCare = Math.min(1, (b.storeCare || 0) + 0.2);
  }
}
export function winterOutlook(g: Game, team = 0) {
  const phase = calendar(g).phase;
  const seconds = phase === 3 ? calendar(g).remaining : 450;
  const demand = foodDemand(g, team, 3);
  // Estimate a no-income winter using current people, weather and maintained stores.
  const survives = (starting: number) => {
    let food = starting;
    for (let t = 0; t < seconds; t += 5) {
      food -= (demand + foodSpoilage(g, team, food, 3, false)) * Math.min(5, seconds - t);
      if (food < 0) return false;
    }
    return true;
  };
  let low = 0, high = Math.max(1, demand * seconds * 2);
  while (!survives(high) && high < 100000) high *= 2;
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    if (survives(mid)) high = mid; else low = mid;
  }
  const needed = Math.ceil(high);
  return { needed, shortage: Math.max(0, Math.ceil(needed - g.tribe(team).food)),
    capacityShortfall: Math.max(0, needed - g.stockCap(team)), seconds };
}
