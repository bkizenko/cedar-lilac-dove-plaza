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
  return Math.ceil(food*1.12+20);
}
import { climateAt } from "./ecology";

export function storehouses(g: Game, team: number) {
  return g.state.buildings.filter(b => b.team === team && b.type === "warehouse" && g.finished(b));
}
export const FOOD_KINDS: FoodKind[]=["provisions","berries","fish","meat","grain","pulses","tubers"];
/** The existing food total remains the save/trade facade; lots refine its contents. */
export function foodInventory(t:Tribe) {
  const lots=Object.fromEntries(FOOD_KINDS.map(k=>[k,Math.max(0,t.foodLots?.[k]||0)])) as Record<FoodKind,number>;
  const total=FOOD_KINDS.reduce((n,k)=>n+lots[k],0);
  if(total>t.food&&total>0)for(const k of FOOD_KINDS)lots[k]*=t.food/total;
  else lots.provisions+=Math.max(0,t.food-total);
  return lots;
}
export function receiveFood(g:Game,team:number,amount:number,kind:FoodKind="provisions") {
  const t=g.tribe(team),lots=foodInventory(t);lots[kind]+=amount;t.food+=amount;t.foodLots=lots;
}
function lossRates(g:Game,team:number,food:number,phase:number,includeOverflow:boolean) {
  const stores=storehouses(g,team),indoor=Math.min(1,stores.length*160/Math.max(1,food));
  const prepared=Math.min(indoor,stores.reduce((n,b)=>n+(b.storeCare||0)*160,0)/Math.max(1,food));
  const home=g.campOf(team),time=phase===calendar(g).phase?g.state.time:Math.floor(g.state.time/1800)*1800+phase*450+225;
  const {temperature,humidity}=climateAt(g,home.x,home.z,time);
  const climate=Math.max(.12,Math.min(2.8,Math.pow(2,(temperature-12)/12)*(.65+humidity*.7)));
  const protectedRate=(1-indoor)+(indoor-prepared)*.25+prepared*.05;
  const knowledge=(team===0&&g.state.agePicks[0]==="econ"?.35:1)*(team===0&&hasTradition(g,"winter-stores")?.75:1);
  const base:Record<FoodKind,number>={provisions:.00012,berries:.00024,fish:.00055,meat:.0004,grain:.00006,pulses:.00007,tubers:.00013};
  const outside=includeOverflow?Math.max(0,food-g.stockCap(team))/Math.max(1,food):0;
  return Object.fromEntries(FOOD_KINDS.map(k=>[k,(base[k]*protectedRate+outside*.0005)*climate*knowledge])) as Record<FoodKind,number>;
}
export function foodSpoilage(g: Game, team = 0, food = g.tribe(team).food, phase = calendar(g).phase, includeOverflow = true) {
  const t=g.tribe(team),lots=foodInventory(t),rates=lossRates(g,team,food,phase,includeOverflow);
  if(t.food<=0)return food*rates.provisions;
  const total=Math.max(1,t.food);
  return FOOD_KINDS.reduce((n,k)=>n+food*lots[k]/total*rates[k],0);
}
export function consumeAndSpoilFood(g:Game,team:number,demand:number,dt:number) {
  const t=g.tribe(team),lots=foodInventory(t),rates=lossRates(g,team,t.food,calendar(g).phase,true);
  for(const k of FOOD_KINDS)lots[k]*=Math.max(0,1-rates[k]*dt);
  const left=FOOD_KINDS.reduce((n,k)=>n+lots[k],0),share=Math.max(0,1-demand*dt/Math.max(.0001,left));
  for(const k of FOOD_KINDS)lots[k]*=share;
  t.food=FOOD_KINDS.reduce((n,k)=>n+lots[k],0);t.foodLots=lots;
}
export function preservationAvailable(g: Game, b: Building) {
  return b.type === "warehouse" && g.finished(b) && (b.storeCare || 0) < 0.95 &&
    g.tribe(b.team).wood >= 1 && reserveSeconds(g, b.team) >= 240;
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
