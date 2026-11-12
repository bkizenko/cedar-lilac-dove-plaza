import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {collectOwnPrestige,gamePrestigeView,tickPrestigeEvidence,PRESTIGE_GAME_RULES} from '../src/game/prestigeGame.ts';
import {scorePrestige} from '../src/game/prestigeScore.ts';
import {readyFoodStock} from '../src/game/pantry.ts';
import {foodDemand} from '../src/game/settlement.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();g.state.paused=true;return g;}
test('real Game owner score uses ready nourishment, body health and successful distinct methods rather than age flags or raw hoards',()=>{
 const g=fixture(),t=g.tribe(0);t.food=100;t.foodLots={grain:100};t.items={grainSheaves:10000,rawMeat:10000};
 const raw=collectOwnPrestige(g);assert.equal(raw.foodSecurity,0);assert.equal(raw.demonstratedPractices.length,0);assert.equal(raw.defendedWarAims,undefined);
 t.foodLots={bread:100};const cooked=collectOwnPrestige(g);assert.equal(cooked.foodSecurity,readyFoodStock(t).nourishment/foodDemand(g,0)/PRESTIGE_GAME_RULES.calendarDaySeconds);assert.ok(cooked.foodSecurity>0);
 const before=g.prestige();t.age=3;for(const r of g.state.regions)r.owner=0;for(const tr of g.state.tribes)tr.ally=true;assert.equal(g.prestige(),before,'age/region/alliance flags earn no points');
 const row={batches:1,failedBatches:0,usefulOutputs:4,firstAt:0,lastAt:0,makers:[]};t.productionPractice={grindGrainDouble:{...row},grindGrainBulk:{...row},sewHideCoat:{...row,batches:0,failedBatches:9,usefulOutputs:0}};
 assert.deepEqual(collectOwnPrestige(g).demonstratedPractices,['grindGrain','grindGrain']);assert.equal(scorePrestige(collectOwnPrestige(g)).components.find(r=>r.component==='demonstratedPractices').value,1);
 const u=g.state.units.find(u=>u.team===0&&u.hp>0&&!u.visit&&!u.prisoner),healthy=collectOwnPrestige(g).healthyPopulation;u.hp/=2;assert.ok(collectOwnPrestige(g).healthyPopulation<healthy);
});
test('score reads do not paint territory, refresh memories or mutate state; bounded simulation cache is explicit and old saves need no new field',()=>{
 const g=fixture(),state=JSON.stringify(g.state),territory=g.territory.slice();for(let i=0;i<3;i++){const v=g.prestigeBreakdown();assert.equal(v.territoryMeasuredAt,null);assert.equal(v.components.find(r=>r.component==='usableArea').available,false);assert.equal(g.prestige(),Math.round(v.total));}
 assert.equal(JSON.stringify(g.state),state);assert.deepEqual(g.territory,territory);
 for(let i=0;i<Math.ceil(g.territory.length/PRESTIGE_GAME_RULES.cellsPerTick);i++)tickPrestigeEvidence(g);
 const v=g.prestigeBreakdown();assert.equal(v.territoryMeasuredAt,g.state.time);assert.equal(v.territoryUpdating,false);assert.equal(v.components.find(r=>r.component==='usableArea').available,true);assert.equal(JSON.stringify(g.state),state);assert.deepEqual(g.territory,territory);
 const hud=g.snapshot();assert.equal(hud.prestige,g.prestige());assert.equal(hud.prestigeBreakdown.total,g.prestigeBreakdown().total);assert.ok(hud.prestigeRivals.every(r=>r.total===null));
 const loaded=decodeGame(encodeGame(g));assert.equal(loaded.prestigeBreakdown().territoryMeasuredAt,null,'cache is rebuilt, never fabricated in old save payload');
});
test('actual retained landmark report exposes a dated partial rival component while secret stocks and unseen buildings never change it',()=>{
 const g=fixture();g.state.time=100;const rival=g.tribe(1),b=g.state.buildings.find(b=>b.team===1&&b.type==='townhall');assert.ok(b);
 g.state.structureReports=[{version:1,observer:0,witnessId:g.state.units.find(u=>u.team===0).id,observedAt:20,receivedAt:25,active:true,site:{id:b.id,type:'temple',team:1,x:b.x,y:b.y,z:b.z,w:b.w,d:b.d,hp:100,maxHp:200},defenders:0,defensePower:0}];
 const state=JSON.stringify(g.state),before=gamePrestigeView(g,0,1);assert.equal(before.knowledge,'observed');assert.equal(before.observedAt,20);assert.equal(before.total,null);assert.equal(before.components.find(r=>r.component==='foodSecurity').points,null);assert.ok(before.knownSubtotal>0);assert.equal(JSON.stringify(g.state),state);
 rival.food=1e9;rival.wood=1e9;rival.productionPractice={};g.state.buildings.push(g.makeBld('temple',b.x+20,b.z+20,1));assert.deepEqual(gamePrestigeView(g,0,1),before,'private authority cannot update a dated report');
 assert.equal(gamePrestigeView(g,2,1).knowledge,'unknown');g.state.structureReports[0].holderTeam=2;assert.equal(gamePrestigeView(g,0,1).knowledge,'unknown');assert.equal(gamePrestigeView(g,2,1).knowledge,'observed');
});
test('own useful trade requires both paid and delivered native receipts and never counts cargo still loading',()=>{
 const g=fixture();g.state.tradeNeeds={version:1,teams:[],offers:[],cooldowns:[],receipts:[{id:1,offerId:2,time:0,stage:'loaded',team:0,kind:'wood',amount:10},{id:3,offerId:2,time:0,stage:'paid',team:1,kind:'wood',amount:10}]};assert.equal(collectOwnPrestige(g).usefulTrade,0);
 g.state.tradeNeeds.receipts.push({id:4,offerId:2,time:0,stage:'delivered',team:0,kind:'food',amount:10});assert.equal(collectOwnPrestige(g).usefulTrade,1);g.state.tradeNeeds.receipts.push({id:5,offerId:2,time:0,stage:'delivered',team:0,kind:'food',amount:10});assert.equal(collectOwnPrestige(g).usefulTrade,1);
});

test('real boat-practice delivery evidence earns distinct methods while built hulls and stationary sailing fittings do not',()=>{
 const g=fixture(),t=g.tribe(0);g.state.time=100;
 t.boatPractice={version:1,waterMeters:100,loadedMeters:100,deliveredGoods:0,built:{scoutCanoe:1,freightPunt:1},proven:{},firstObservedAt:0,sailing:{version:1,fitted:1,sailMeters:200,deliveredGoods:0}};
 assert.deepEqual(collectOwnPrestige(g).demonstratedPractices,[]);
 const p=t.boatPractice;p.deliveredGoods=8;p.lastDeliveryAt=90;p.proven.scoutCanoe=true;p.demonstratedAt={scoutCanoe:90};
 assert.deepEqual(collectOwnPrestige(g).demonstratedPractices,['water-cargo-delivery','hull:scoutCanoe']);
 p.sailing.deliveredGoods=8;p.sailing.demonstratedAt=95;assert.ok(collectOwnPrestige(g).demonstratedPractices.includes('sailed-cargo-delivery'));
 p.sailing.demonstratedAt=101;assert.ok(!collectOwnPrestige(g).demonstratedPractices.includes('sailed-cargo-delivery'));p.lastDeliveryAt=101;assert.ok(!collectOwnPrestige(g).demonstratedPractices.includes('water-cargo-delivery'));
});
