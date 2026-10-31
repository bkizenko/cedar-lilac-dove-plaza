import {provinceAt,ecologicalConditionsAt} from './ecologicalProvinces';
import type {ResourceNode} from "./types";
import type { Game } from "./sim";
export const HABITATS = {
  plains: { name: "Grassland", crops: 1.2, forage: 1, timber: 0.85, winterFood: 1.08, advice: "Open fertile ground favors fields. Store the autumn harvest; timber is slower to collect." },
  forest: { name: "Woodland", crops: 0.8, forage: 1.2, timber: 1.2, winterFood: 1, advice: "Woodland supports gathering and timber. Smaller harvests make a mixed food supply valuable." },
  hills: { name: "Uplands", crops: 0.7, forage: 0.85, timber: 0.9, winterFood: 1.2, advice: "Thin soils give smaller harvests. Exposed winters need more food; prepare stores and trade for grain." },
} as const;
export function habitatAt(g: Game, x: number, z: number) {
  if(g.world.ecology)return provinceAt(g.world.ecology,x,z);
  let kind: keyof typeof HABITATS = "plains", distance = Infinity;
  for (const biome of g.world.biomes || []) {
    const d = (biome.x-x)**2 + (biome.z-z)**2;
    if (d < distance) { distance = d; kind = biome.kind; }
  }
  return HABITATS[kind];
}

/** Compatibility family supports old discovery/cultivation rules without
 * comparing dynamic ecological profiles to three legacy singleton objects. */
export function habitatKindAt(g:Game,x:number,z:number):'plains'|'forest'|'hills'{
 if(g.world.ecology)return provinceAt(g.world.ecology,x,z).baseHabitat;
 const habitat=habitatAt(g,x,z);return habitat===HABITATS.forest?'forest':habitat===HABITATS.hills?'hills':'plains';
}

/** Distance to the continuous river course, not just its control points. */
export function riverDistance(g:Game,x:number,z:number){
  if(g.world.ecology)return ecologicalConditionsAt(g.world.ecology,x,z).freshwaterDistanceMeters;
  let distance = Infinity;
  for (const river of g.world.rivers || []) for (let i=1;i<river.pts.length;i++) {
    const a=river.pts[i-1], b=river.pts[i], dx=b.x-a.x, dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    distance=Math.min(distance,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
  }
  return distance;
}

/** Site potential, separate from a field's fertility loss through repeated cropping. */
export function soilQuality(g: Game, x: number, z: number) {
  const h = g.height(x,z);
  const slope = Math.max(Math.abs(g.height(x+3,z)-h), Math.abs(g.height(x-3,z)-h),
    Math.abs(g.height(x,z+3)-h), Math.abs(g.height(x,z-3)-h));
  const distance=riverDistance(g,x,z);
  if(g.world.ecology)return Math.max(.15,Math.min(1,ecologicalConditionsAt(g.world.ecology,x,z).soil-Math.max(0,slope-1)*.06));
  return Math.max(0.25,Math.min(1,0.35+habitatAt(g,x,z).crops*0.3 +
    Math.max(0,1-distance/40)*0.3 - slope*0.08));
}

/** Rain-fed cultivation remains possible; drought penalizes ground far from water. */
export function cropWater(g:Game,x:number,z:number) {
  if(g.state.weather!=="drought")return 1;
  return droughtWaterPotential(g,x,z);
}

export function droughtWaterPotential(g:Game,x:number,z:number){
 if(g.world.ecology){const e=ecologicalConditionsAt(g.world.ecology,x,z);return Math.max(.25,Math.min(.95,.2+e.moisture*.65+(e.freshwaterDistanceMeters<24?.15:0)));}
 return riverDistance(g,x,z)<24?.8:.4;
}

/** Local weather drives real spoilage, not merely the calendar label. */
export function climateAt(g:Game,x:number,z:number,time=g.state.time,weather=g.state.weather) {
  const habitat=habitatAt(g,x,z),phase=(time%1800)/1800;
  let temperature=11+15*Math.sin((phase-.07)*Math.PI*2)-Math.max(0,g.height(x,z)-4)*.18;
  let humidity=habitat===HABITATS.forest?.76:habitat===HABITATS.hills?.47:.6;
  if(g.world.ecology){const e=ecologicalConditionsAt(g.world.ecology,x,z);temperature+=e.temperatureOffsetCelsius;humidity=e.moisture;}
  if(weather==="rain"||weather==="storm"||weather==="flood")humidity+=.2;
  if(weather==="mist")humidity+=.1;
  if(weather==="drought"){temperature+=5;humidity-=.28;}
  if(weather==="frost")temperature-=5;
  return {temperature,humidity:Math.max(.15,Math.min(1,humidity))};
}

/** One ordinary seasonal harvest stresses a patch; repeated stripping can exhaust it. */
export function applyForagePressure(node:ResourceNode,amount=1){
  node.pressure=Math.min(1,(node.pressure||0)+.3*Math.max(0,amount)/Math.max(1,node.maxAmt||8));
}

export const WILD_PLANT_RULES=Object.freeze({version:1,yearSeconds:1800,maximumIntegrationStepSeconds:30,pressureRecoverySeconds:7200,
 pressureYieldReduction:.7,ripeDecayPerSecond:.00012,winterBerryDecayPerSecond:.009,senescentGreensDecayPerSecond:.012,
 drySeedDecayPerSecond:.0012,buriedRootDecayPerSecond:.00025});
export const WILD_PLANT_SPECIES=['spring-greens','summer-berries','autumn-berries','wild-grain','wild-pulses','wild-tubers'] as const;
export type WildPlantSpecies=typeof WILD_PLANT_SPECIES[number];
export type WildPlantState={version:1;species:WildPlantSpecies;year:number;initialFood:number;producedThisYear:number;grownTotal:number;harvestedTotal:number;lostTotal:number;lastTimeSeconds:number};
type SeasonalNode=ResourceNode&{wildPlant?:WildPlantState};
type SeasonalGame=Game['state']&{wildPlantVersion?:1};
export const WILD_PLANT_PROFILES:Record<WildPlantSpecies,{name:string;releaseStart:number;releaseEnd:number;leafStart:number;leafFull:number;leafFall:number;leafGone:number;initialStandingFraction:number;yieldFactor:number;leafColor:string;ripeColor:string}>={
 'spring-greens':{name:'Spring greens',releaseStart:0,releaseEnd:.20,leafStart:0,leafFull:.12,leafFall:.28,leafGone:.45,initialStandingFraction:.12,yieldFactor:1,leafColor:'#78984b',ripeColor:'#b0c85c'},
 'summer-berries':{name:'Summer berries',releaseStart:.25,releaseEnd:.48,leafStart:.03,leafFull:.22,leafFall:.70,leafGone:.86,initialStandingFraction:0,yieldFactor:1,leafColor:'#557641',ripeColor:'#bd536c'},
 'autumn-berries':{name:'Autumn berries',releaseStart:.48,releaseEnd:.70,leafStart:.06,leafFull:.28,leafFall:.74,leafGone:.91,initialStandingFraction:0,yieldFactor:1,leafColor:'#587445',ripeColor:'#7863a4'},
 'wild-grain':{name:'Wild grain',releaseStart:.44,releaseEnd:.65,leafStart:.03,leafFull:.35,leafFall:.69,leafGone:.90,initialStandingFraction:0,yieldFactor:1,leafColor:'#91a75e',ripeColor:'#d9bb67'},
 'wild-pulses':{name:'Wild pulses',releaseStart:.37,releaseEnd:.59,leafStart:.02,leafFull:.27,leafFall:.65,leafGone:.86,initialStandingFraction:0,yieldFactor:1,leafColor:'#71964d',ripeColor:'#b6a864'},
 'wild-tubers':{name:'Wild tubers',releaseStart:.25,releaseEnd:.70,leafStart:.04,leafFull:.24,leafFall:.69,leafGone:.85,initialStandingFraction:.30,yieldFactor:1,leafColor:'#668448',ripeColor:'#99734e'},
};
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function wildPlantsEnabled(g:Game){return(g.state as SeasonalGame).wildPlantVersion===1;}
export function wildPlantSpecies(g:Game,n:ResourceNode):WildPlantSpecies{
 if(n.cropCandidate)return n.cropCandidate==='grain'?'wild-grain':n.cropCandidate==='pulses'?'wild-pulses':'wild-tubers';
 const hash=(Math.imul(n.id^g.state.seed,0x45d9f3b)>>>0),habitat=habitatKindAt(g,n.x,n.z);
 // Edible leaf patches are genuinely spring producers, rather than every wild
 // plant behaving as a berry bush. Seed-candidate identity remains unchanged.
 return hash%3===0?'spring-greens':habitat==='hills'||hash%2===0?'autumn-berries':'summer-berries';
}
export function wildPlantCapacity(g:Game,n:ResourceNode,species:WildPlantSpecies=wildPlantSpecies(g,n)){
 return Math.max(0,n.maxAmt)*WILD_PLANT_PROFILES[species].yieldFactor*habitatAt(g,n.x,n.z).forage;
}
/** Called for new worlds only; loading legacy saves must not erase or grant food. */
export function initializeWildPlants(g:Game){
 if(wildPlantsEnabled(g))return;
 (g.state as SeasonalGame).wildPlantVersion=1;
 for(const n of g.state.forage){const species=wildPlantSpecies(g,n),initial=wildPlantCapacity(g,n,species)*WILD_PLANT_PROFILES[species].initialStandingFraction;
  n.amount=initial;n.regenT=0;(n as SeasonalNode).wildPlant={version:1,species,year:Math.floor(g.state.time/WILD_PLANT_RULES.yearSeconds),initialFood:initial,producedThisYear:0,grownTotal:0,harvestedTotal:0,lostTotal:0,lastTimeSeconds:g.state.time};
 }
}
function wildPlantWeatherYield(g:Game,n:ResourceNode){return g.state.weather==='drought'?.35+.6*droughtWaterPotential(g,n.x,n.z):g.state.weather==='frost'?.55:g.state.weather==='flood'?.7:g.state.weather==='storm'?.85:1;}
function wildPlantDecay(species:WildPlantSpecies,phase:number){
 const r=WILD_PLANT_RULES,p=WILD_PLANT_PROFILES[species];
 return species==='wild-tubers'?r.buriedRootDecayPerSecond:
 species==='wild-grain'||species==='wild-pulses'?(phase>p.releaseEnd?r.drySeedDecayPerSecond:r.ripeDecayPerSecond):
 species==='spring-greens'&&phase>p.leafFall?r.senescentGreensDecayPerSecond:
 phase>.75?r.winterBerryDecayPerSecond:r.ripeDecayPerSecond;
}
/** Returns true only for the opt-in system, so the caller skips legacy random
 * refill/winter loss. Actual elapsed simulation time grows each seasonal quota
 * once; duplicate calls and paused clocks cannot generate more harvest. */
export function tickWildPlant(g:Game,node:ResourceNode,dt:number):boolean{
 if(node.kind!=='forage'||!wildPlantsEnabled(g))return false;
 const n=node as SeasonalNode,w=n.wildPlant;if(!w||dt<=0)return true;
 const now=g.state.time,elapsed=Math.min(Math.max(0,dt),Math.max(0,now-w.lastTimeSeconds));if(elapsed<=0)return true;
 const r=WILD_PLANT_RULES,p=WILD_PLANT_PROFILES[w.species],capacity=wildPlantCapacity(g,n,w.species);
 if(n.pressure&&!g.state.units.some(u=>u.hp>0&&u.order==='gather'&&u.node===n))n.pressure=Math.max(0,n.pressure-elapsed/r.pressureRecoverySeconds);
 let cursor=now-elapsed;
 while(cursor<now-1e-8){const year=Math.floor(cursor/r.yearSeconds),end=Math.min(now,cursor+r.maximumIntegrationStepSeconds,(year+1)*r.yearSeconds),seconds=end-cursor;
  if(w.year!==year){w.year=year;w.producedThisYear=0;}
  const startPhase=(cursor-year*r.yearSeconds)/r.yearSeconds,endPhase=(end-year*r.yearSeconds)/r.yearSeconds;
  const growth=Math.max(0,smooth(p.releaseStart,p.releaseEnd,endPhase)-smooth(p.releaseStart,p.releaseEnd,startPhase))*capacity*wildPlantWeatherYield(g,n)*(1-(n.pressure||0)*r.pressureYieldReduction);
  const before=Math.max(0,n.amount),available=before+growth,standing=Math.min(capacity,available*Math.exp(-wildPlantDecay(w.species,(startPhase+endPhase)*.5)*seconds));
  w.grownTotal+=growth;w.producedThisYear+=growth;w.lostTotal+=Math.max(0,available-standing);n.amount=standing;cursor=end;
 }
 const currentYear=Math.floor(now/r.yearSeconds);if(w.year!==currentYear){w.year=currentYear;w.producedThisYear=0;}
 w.lastTimeSeconds=now;n.regenT=0;return true;
}
/** The amount returned is the exact amount removed from the standing crop.
 * Call before adding cargo; the legacy one-unit decrement must then be skipped. */
export function harvestWildPlant(g:Game,node:ResourceNode,requested:number):number{
 if(!wildPlantsEnabled(g)||node.kind!=='forage')return Math.max(0,Math.min(node.amount,requested));
 const n=node as SeasonalNode,w=n.wildPlant;if(!w||!Number.isFinite(requested)||requested<=0)return 0;
 const taken=Math.min(Math.max(0,n.amount),requested);n.amount=Math.max(0,n.amount-taken);w.harvestedTotal+=taken;applyForagePressure(n,taken);return taken;
}
export function wildPlantVisual(g:Game,node:ResourceNode){
 const w=(node as SeasonalNode).wildPlant,species=w?.species??wildPlantSpecies(g,node),p=WILD_PLANT_PROFILES[species],capacity=wildPlantCapacity(g,node,species),phase=((g.state.time%WILD_PLANT_RULES.yearSeconds)+WILD_PLANT_RULES.yearSeconds)%WILD_PLANT_RULES.yearSeconds/WILD_PLANT_RULES.yearSeconds;
 const enabled=wildPlantsEnabled(g)&&!!w,growth=enabled?smooth(p.leafStart,p.leafFull,phase)*(1-smooth(p.leafFall,p.leafGone,phase)):1,food=Math.max(0,node.amount),fraction=Math.max(0,Math.min(1,food/Math.max(.001,capacity)));
 const stage=!enabled?'legacy':phase>=p.leafGone?'dormant':food>1e-8?'ripe':phase<p.releaseStart?'growing':phase<p.releaseEnd?'ripening':'spent';
 return{enabled,species,name:p.name,stage,growth,leafScale:enabled?.18+.82*growth:food>0?1:0,fruitScale:food>1e-8?Math.cbrt(fraction):0,leafColor:phase>p.leafFall&&enabled?'#81724f':p.leafColor,ripeColor:p.ripeColor,harvestableFood:food,annualPotentialFood:capacity,producedThisYear:w?.producedThisYear??null,grownTotal:w?.grownTotal??null,harvestedTotal:w?.harvestedTotal??null,lostTotal:w?.lostTotal??null};
}
export function validWildPlantState(state:Game['state']):boolean{
 const marker=(state as SeasonalGame).wildPlantVersion;if(marker!==undefined&&marker!==1)return false;
 const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e12;
 for(const node of state.forage){const w=(node as SeasonalNode).wildPlant;if(w===undefined){if(marker===1)return false;continue;}
  if(marker!==1||!w||w.version!==1||!WILD_PLANT_SPECIES.includes(w.species)||!Number.isInteger(w.year)||w.year<0)return false;
  for(const key of['initialFood','producedThisYear','grownTotal','harvestedTotal','lostTotal','lastTimeSeconds'] as const)if(!finite(w[key]))return false;
  if(!finite(node.amount)||!finite(node.maxAmt)||w.lastTimeSeconds>state.time+1e-6||w.year!==Math.floor(w.lastTimeSeconds/WILD_PLANT_RULES.yearSeconds)||w.producedThisYear>w.grownTotal+1e-6)return false;
  if(Math.abs(w.initialFood+w.grownTotal-w.harvestedTotal-w.lostTotal-node.amount)>1e-4*Math.max(1,w.initialFood+w.grownTotal))return false;
 }
 return true;
}
