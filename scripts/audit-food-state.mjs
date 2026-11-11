// Read-only saved-state diagnosis. No simulation steps, browser, grants or writes.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeGame} from '../src/game/persistence.ts';
import {readyFoodStock,foodInventory,FOOD_NOURISHMENT} from '../src/game/pantry.ts';
import {foodDemand} from '../src/game/settlement.ts';
import {PRODUCTION_RECIPES,productionSlots,occupiedProductionSlots} from '../src/game/production.ts';
const file=process.argv[2];
if(!file){console.error('Usage: node --import ./scripts/game-loader.mjs scripts/audit-food-state.mjs EXPORTED_VILLAGE.json');process.exit(2);}
const start=performance.now(),bytes=readFileSync(file),hash=b=>createHash('sha256').update(b).digest('hex'),before=hash(bytes),g=decodeGame(JSON.parse(bytes)),team=0,t=g.tribe(team),home=g.campOf(team);
const active=(g.state.production?.projects||[]).filter(p=>p.team===team&&!['complete','lost'].includes(p.phase));
const types=['hearth','threshingFloor','grindingStone','oven','smokehouse','dryrack','butcher'];
const workplaces=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&b.build>=1&&!b.plannedCost&&types.includes(b.type)).map(b=>{
 const projects=active.filter(p=>p.workplace===b.id),occupied=occupiedProductionSlots(g,b);
 return {id:b.id,type:b.type,slots:productionSlots(b),occupied,projects:projects.map(p=>({id:p.id,recipe:p.recipe,phase:p.phase,actorId:p.actorId,workSeconds:p.progress,requiredWorkSeconds:PRODUCTION_RECIPES[p.recipe].workSeconds,blocked:p.blockedReason||null}))};
});
const food=foodInventory(t),ready=readyFoodStock(t),demand=foodDemand(g),fish=g.state.fish,near=fish.filter(n=>Math.hypot(n.x-home.x,n.z-home.z)<=100);
const count=rows=>({nodes:rows.length,remaining:rows.reduce((n,p)=>n+p.amount,0),capacity:rows.reduce((n,p)=>n+(p.maxAmt||0),0)});
const mills=workplaces.filter(b=>b.type==='grindingStone'),slots=mills.reduce((n,b)=>n+b.slots,0),methods=['grindGrainStation','grindGrainDouble','grindGrainBulk'].map(id=>{const r=PRODUCTION_RECIPES[id],flour=slots*(r.outputs.flour||0)/r.workSeconds;return {recipe:id,nominalFlourPerSecond:flour,possibleBreadNourishmentPerSecond:flour*(FOOD_NOURISHMENT.bread||1),demandFraction:demand?flour*(FOOD_NOURISHMENT.bread||1)/demand:null};});
if(hash(readFileSync(file))!==before)throw Error('Input export changed during read-only audit');
console.log(JSON.stringify({scope:'Saved-state facts and nominal recipe capacity only; no simulation, routing trials or automatic balance verdict. Recipe methods may require adoption/expanded workplaces. Travel, aptitude and real batching modify throughput.',sourceUnchanged:true,inputSha256:before,time:g.state.time,population:g.state.units.filter(u=>u.team===team&&u.hp>0).length,autoWork:g.state.autoWorkEnabled,ready,readySeconds:demand?ready.nourishment/demand:null,demandPerSecond:demand,food,rawItems:{grainSheaves:t.items?.grainSheaves||0,roughGrain:t.items?.roughGrain||0,flour:t.items?.flour||0,rawMeat:t.items?.rawMeat||0},workplaces,millingCapacity:{slots,methods},fish:{all:count(fish),within100mOfCamp:count(near)},auditWallSeconds:(performance.now()-start)/1000},null,2));
