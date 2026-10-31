import {Game} from '../../src/game/sim.ts';import {mulberry32} from '../../src/game/rng.ts';
import {foodDemand} from '../../src/game/settlement.ts';import {consumeAndSpoilFood} from '../../src/game/pantry.ts';
import {subsistenceLaborMultiplier,subsistenceWorkReport} from '../../src/game/subsistenceBalance.ts';
import {tickSurvival} from '../../src/game/survivalNeeds.ts';
/** Controlled five-adult rate audit: actual workerAI steering/cargo/delivery and
 * actual consumption/spoilage/needs. Other world systems are held outside this
 * measurement; it is not a full campaign, raid or first-winter qualification.
 * The per-instance campBonus wrapper applies/cancels the algebraically exact
 * proposed period hook so baseline remains reproducible before and after wiring. */
export function householdAudit(seed,tuned=false,seconds=300){const original=Math.random;Math.random=mulberry32(seed^0x521e31);
 try{const g=new Game();g.reset(seed,13,{size:1040,layout:'continents'});g.enterIsland();g.state.difficulty='normal';g.setAutoWork(false);
 const resourcesBefore={trees:g.state.trees.length,wildlife:g.state.wildlife.length},residents=g.state.units.filter(u=>u.team===0&&u.type==='worker'&&u.hp>0),initial={food:g.tribe(0).food,wood:g.tribe(0).wood},roles=new Map(residents.map((u,i)=>[u.id,i===0?'food':i===1?'wood':'reserve'])),delivered=new Map(residents.map(u=>[u.id,{food:0,wood:0,workingSeconds:0,overheadSeconds:0}]));let lastSequence=0,consumed=0,spoiled=0,minimumFood=g.tribe(0).food,emptySeconds=0;
 const hookAlreadyIntegrated=g.workerAI.toString().includes('subsistenceLaborMultiplier'),oldBonus=g.campBonus.bind(g);g.campBonus=(u,kind)=>{const factor=subsistenceLaborMultiplier(g,kind,u.x,u.z);return oldBonus(u,kind)*(tuned?factor:1)/(hookAlreadyIntegrated?factor:1);};
 const order=(u,kind)=>{if(u.carry>0)return;const list=kind==='food'?g.state.forage:g.state.trees;const target=list.filter(n=>n.amount>=1&&g.exploredAt(n.x,n.z)&&g.workBoard.connected(g,u.x,u.z,n.x,n.z)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];if(!target)return;g.clearSelect();u.selected=true;g.issueGather(target);g.clearSelect();};
 g.updateVision(.1);for(const u of residents){const role=roles.get(u.id);if(role!=='reserve')order(u,role);}
 for(let step=0;step<seconds*10;step++){g.state.time+=.1;g.navBudget=20;if(step%5===0)g.updateVision(.5);
  for(const u of residents){const role=roles.get(u.id),expected=role==='food'?'forage':'tree';if(role==='reserve'&&!u.waterWork)continue;
   if(role!=='reserve'&&u.carry===0&&(u.order==='idle'||u.order==='hold'||u.order==='gather'&&u.node?.kind!==expected))order(u,role);
   const m=delivered.get(u.id),onSite=u.order==='gather'&&u.node?.kind===expected&&Math.hypot(u.x-u.node.x,u.z-u.node.z)<=(expected==='tree'?3.2:1.22);if(role!=='reserve'){if(onSite)m.workingSeconds+=.1;else m.overheadSeconds+=.1;}
   g.workerAI(u,.1);
  }
  const need=foodDemand(g),before=g.tribe(0).food;consumeAndSpoilFood(g,0,need,.1);consumed+=need*.1;spoiled+=Math.max(0,before-g.tribe(0).food-need*.1);tickSurvival(g,.1);
  for(const event of g.state.simulationEvents?.recent??[])if(event.sequence>lastSequence){if(event.kind==='cargo_delivered'&&event.team===0&&delivered.has(event.actorId)&&['food','wood'].includes(event.resource))delivered.get(event.actorId)[event.resource]+=event.amount;lastSequence=Math.max(lastSequence,event.sequence);}
  minimumFood=Math.min(minimumFood,g.tribe(0).food);if(g.tribe(0).food<=0)emptySeconds+=.1;
 }
 const home=g.campOf(0);return{seed,tuned,seconds,hookAlreadyIntegrated,resourcesBefore,resourcesAfter:{trees:g.state.trees.length,wildlife:g.state.wildlife.length},worldgenVersion:13,difficulty:'normal',manual:!g.state.autoWorkEnabled,population:residents.length,initial,final:{food:g.tribe(0).food,wood:g.tribe(0).wood},minimumFood,emptySeconds,foodConsumed:consumed,foodSpoiled:spoiled,allResidentsAlive:residents.every(u=>u.hp>0),delivered:[...delivered].map(([id,m])=>({id,role:roles.get(id),...m,deliveredFoodPerMinute:m.food/seconds*60,deliveredLogsPerMinute:m.wood/seconds*60})),proposedFoodReport:subsistenceWorkReport(g,'food',home.x,home.z),proposedWoodReport:subsistenceWorkReport(g,'wood',home.x,home.z)};
 }finally{Math.random=original;}}
if(process.argv[1]?.endsWith('subsistence-labor.mjs'))for(const seed of[42,123456])for(const tuned of[false,true])console.log(JSON.stringify(householdAudit(seed,tuned)));
