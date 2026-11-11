import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {nativeBoatVillage} from './helpers/native-boat-village.mjs';
import {launchRiverboat,BOAT_COST} from '../src/game/boats.ts';
import {waterNavigation} from '../src/game/waterTravel.ts';
import {supplyDrops,supplyApproach,supplyReached} from '../src/game/campAnchor.ts';
import {buildingCost} from '../src/game/construction.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

const LIMITS={simulationSeconds:500,wallMilliseconds:30000};
function terrainHash(g){const hash=createHash('sha256');for(const array of [g.world.heights,g.world.waterHeights])if(array)hash.update(Buffer.from(array.buffer,array.byteOffset,array.byteLength));return hash.digest('hex');}

// Bounded native-geometry acceptance; authored setup and remaining limits are explicit.
// Authored finite actors/stocks/dock/paid existing hull on the helper's unchanged
// seed1/V14/pangaea1040 coast. This is native geometry + ordinary executors,
// not organic settlement growth, multi-AI autonomy, browser or latest-map proof.
test('NPC native unchanged coast: existing paid hull physically explores, returns, unloads and reports',{timeout:LIMITS.wallMilliseconds},()=>{
 const wallStart=performance.now();
 const {g,dock,home,people}=nativeBoatVillage(7,90);
 const originalTerrain=terrainHash(g),height=g.height,waterAt=g.waterAt,steer=g.steer;
 const team=1,injured=people[0],healthy=people.slice(1),crewIds=new Set(people.map(u=>u.id));
 for(const u of people){u.team=team;u.order='hold';}
 injured.hp=injured.maxHp*.3;assert.equal(injured.haulage,'canoe');assert.equal(healthy.length,6);
 dock.team=team;
 // Move the finite helper endowment with its authored residents; do not create
 // stocks during the mission. The injured canoe owner's20wood stays carried.
 const stock=g.tribe(0),npc=g.tribe(team);
 Object.assign(npc,{alive:true,wood:stock.wood,stone:stock.stone,food:stock.food,foodLots:structuredClone(stock.foodLots),items:structuredClone(stock.items)});
 npc.survival.waterLiters=200;
 // The first camp-only scenario was superseded by ordinary NPC refounding at
 // its original inland site. This fixture instead declares a paid completed
 // shore hall as the real cache,at an actually admissible clear native site.
 let hallSite;const def=BUILDINGS.townhall;
 for(let radius=12;radius<=44&&!hallSite;radius+=4)for(let i=0;i<24;i++){
  const a=i*Math.PI/12,x=home.x+Math.cos(a)*radius,z=home.z+Math.sin(a)*radius;
  if(Math.hypot(x-dock.x,z-dock.z)>55||g.placementIssue('townhall',x,z,team)!==null)continue;
  if([...g.state.trees,...g.state.stones,...g.state.forage].some(n=>n.amount>0&&Math.abs(n.x-x)<def.w/2+.25&&Math.abs(n.z-z)<def.d/2+.25))continue;
  const probe={...people[1],x,z,y:g.height(x,z)};
  if(!g.workBoard.connected(g,home.x,home.z,x,z)||!g.walkable(probe.x,probe.z))continue;
  hallSite={x,z};break;
 }
 assert.ok(hallSite,'an admissible clear shore hall within real crew/cache reach exists');
 const hallCost=buildingCost('townhall',g,team);assert.ok(g.canAfford(team,hallCost));g.spend(team,hallCost);
 const hall=g.makeBld('townhall',hallSite.x,hallSite.z,team);g.state.buildings.push(hall);g.rebuildWalk();
 const hallApproach=g.interactionSpot(people[1],hall);assert.ok(hallApproach,'real hall entrance remains reachable');
 // Actor positions are authored here before the first step only. Leave the
 // footprint clear and put each person on a real reachable native standing point.
 for(let i=0;i<people.length;i++){const u=people[i],p=g.nearestWalk(u,hallApproach.x+(i%3)*1.2,hallApproach.z+Math.floor(i/3)*1.2);assert.ok(g.walkable(p.x,p.z));u.x=p.x;u.z=p.z;u.y=g.height(p.x,p.z);}

 const playerHome=g.world.camps.find(c=>c.team===0);
 assert.ok(playerHome,'native player camp exists');
 // campSites is the existing player-only relocation field; NPC home is the real hall.
 g.state.campSites=[{team:0,x:playerHome.x,z:playerHome.z}];
 // One declared independent player observer prevents the ordinary no-player
 // defeat rule. Its separate finite200food/50water are outside voyage metrics.
 Object.assign(stock,{wood:0,stone:0,food:200,foodLots:{provisions:200},items:{}});stock.survival.waterLiters=50;
 const observer=g.spawnUnit('worker',playerHome.x,playerHome.z,0);observer.order='hold';observer.jobLock=true;
 g.state.rivalKnowledge=[];g.state.scoutTimer=1000;g.state.coastalTradeReviewAt=1e8;
 g.state.seaExploration={version:1,teams:g.state.tribes.filter(t=>t.id>0&&t.id!==3).map(t=>({team:t.id,nextReviewAt:t.id===team?0:1e9,reviews:0,lastReason:'',reasons:{}})),voyages:[]};
 const beforePayment={wood:npc.wood,stone:npc.stone};
 npc.wood-=BOAT_COST.wood;npc.stone-=BOAT_COST.stone;
 assert.equal(launchRiverboat(g,dock),true);const hull=g.state.boats.at(-1),hullId=hull.id;
 assert.equal(npc.wood,beforePayment.wood-40);assert.equal(npc.stone,beforePayment.stone-4);
 // Existing helper/navigation contract: prime the connected water graph only.
 // No height, water, collision, path, steering or clock function is overridden.
 waterNavigation(g,true);g.state.paused=false;g.state.speed=1;
 const startTime=g.state.time,phases=new Set(),deliveredAtCache=new Set();
 let voyage,observedAboard=false,captureWritten=false;
 while(g.state.time-startTime<LIMITS.simulationSeconds){
  assert.ok(performance.now()-wallStart<LIMITS.wallMilliseconds,'native mission exceeded30s wall bound');
  assert.equal(g.state.ended,null,'ordinary game must remain active');
  const beforeReach=new Map(),returnedBefore=voyage?{food:voyage.metrics.foodReturned,water:voyage.metrics.waterReturned}:undefined;
  const eventSequence=g.state.simulationEvents?.nextSequence??1;
  const waterBefore={total:npc.survival.waterLiters+g.state.units.filter(u=>u.team===team).reduce((n,u)=>n+(u.scoutProvisions?.water??0),0),consumed:npc.survival.waterConsumedLiters,delivered:npc.survival.waterDeliveredLiters,lost:npc.survival.waterLostLiters};
  if(voyage?.phase==='unloading')for(const id of voyage.crew){const u=g.state.units.find(u=>u.id===id);if(!u)continue;
   const row=supplyDrops(g,u.team).map(d=>({d,p:supplyApproach(g,u,d)})).filter(r=>r.p).sort((a,b)=>Math.hypot(u.x-a.p.x,u.z-a.p.z)-Math.hypot(u.x-b.p.x,u.z-b.p.z))[0];
   beforeReach.set(id,{reached:!!row&&supplyReached(g,u,row.d,row.p),cacheId:row?.d.id,x:u.x,z:u.z,approach:row?.p,pack:u.scoutProvisions&&{...u.scoutProvisions}});
  }
  g.step(.1);assert.deepEqual(g.simulationErrors,[]);
  voyage=g.state.seaExploration.voyages.find(v=>v.team===team);
  if(!voyage)continue;phases.add(voyage.phase);
  // The delivery executes before later work/separation. Require the SAME
  // pre-step supply query/entrance,then match removed packs to real receipt
  // events and the exact once-only voyage return totals.
  let returnedFood=0,returnedWater=0;const matchedReceipts=new Set();
  for(const id of voyage.home)if(!deliveredAtCache.has(id)){
   const u=g.state.units.find(u=>u.id===id),before=beforeReach.get(id);
   assert.ok(before?.reached&&before.cacheId===hall.id,JSON.stringify({reason:'delivery must start within the actual cache entrance',unit:id,before}));
   assert.ok(before.pack&&u&&!u.boat&&!u.haulage&&!u.scoutProvisions&&u.seaExplorationId===undefined);
   const receipt=g.state.simulationEvents.recent.find(e=>e.sequence>=eventSequence&&!matchedReceipts.has(e.sequence)&&e.kind==='food_received'&&e.team===team&&Math.abs(e.amount-before.pack.food)<1e-6);
   assert.ok(receipt,'removed pack food is physically received into the cache exactly once');matchedReceipts.add(receipt.sequence);
   returnedFood+=before.pack.food;returnedWater+=before.pack.water;deliveredAtCache.add(id);
  }
  if(returnedFood||returnedWater){
   assert.ok(Math.abs(voyage.metrics.foodReturned-returnedBefore.food-returnedFood)<1e-6);
   assert.ok(Math.abs(voyage.metrics.waterReturned-returnedBefore.water-returnedWater)<1e-6);
   const waterAfter=npc.survival.waterLiters+g.state.units.filter(u=>u.team===team).reduce((n,u)=>n+(u.scoutProvisions?.water??0),0);
   const expectedWater=waterBefore.total+(npc.survival.waterDeliveredLiters-waterBefore.delivered)-(npc.survival.waterConsumedLiters-waterBefore.consumed)-(npc.survival.waterLostLiters-waterBefore.lost);
   assert.ok(Math.abs(waterAfter-expectedWater)<1e-6,'pack water transfers into the real stock with no duplication or loss,after ordinary consumption/collection');
  }
  if(voyage.phase==='outbound'&&voyage.metrics.sailMeters>8){
   assert.equal(voyage.reportCommitted,false,'observations remain with crew until actual home delivery');
   assert.ok(voyage.crew.every(id=>{const u=g.state.units.find(u=>u.id===id);return u&&crewIds.has(id)&&u.boat?.id===hullId&&u.boat.phase==='aboard';}));
   assert.equal(g.state.boats.find(b=>b.id===hullId),hull,'NPC crew rides the actual shared hull');observedAboard=true;
   if(process.env.NPC_SEA_CAPTURE_PATH&&!captureWritten){
    const save=encodeGame(g);save.state.paused=true;decodeGame(save);
    writeFileSync(process.env.NPC_SEA_CAPTURE_PATH,JSON.stringify(save));captureWritten=true;
   }
  }
  if(['complete','failed','lost'].includes(voyage.phase))break;
 }
 assert.ok(voyage,JSON.stringify({reason:'a normal Game.step did not admit the mission',time:g.state.time,teams:g.state.seaExploration.teams,boat:g.state.boats,people:people.map(u=>({id:u.id,hp:u.hp,order:u.order,boat:u.boat,why:u.workReason,jobLock:u.jobLock,haulage:u.haulage})),cache:g.campOf(team)}));
 assert.equal(voyage.phase,'complete',JSON.stringify({phase:voyage.phase,reason:voyage.reason,phases:[...phases],metrics:voyage.metrics}));
 for(const phase of ['mustering','outbound','returning','landing','unloading','complete'])assert.ok(phases.has(phase),'physically visited '+phase);
 assert.ok(observedAboard,'a moving NPC shared hull carried its actual crew');
 assert.ok(!voyage.crew.includes(injured.id),'injured personal-canoe owner neither crews nor blocks the hull');
 assert.equal(voyage.boatId,hullId);assert.equal(g.state.boats.length,1);assert.equal(hull.team,team);
 assert.ok(voyage.metrics.hullReused===1&&voyage.metrics.hullPayments===0,'existing paid hull reused');
 assert.ok(voyage.metrics.sailMeters>16&&voyage.metrics.foodLoaded>0&&voyage.metrics.foodReturned>0);
 for(const kind of ['food','water']){const m=voyage.metrics;assert.ok(Math.abs(m[kind+'Loaded']-(m[kind+'Returned']+m[kind+'Used']+m[kind+'Lost']+m[kind+'WithPeople']))<1e-6,kind+' voyage conservation');}
 assert.equal(voyage.home.length,voyage.crew.length);
 assert.equal(deliveredAtCache.size,voyage.crew.length,'every crew member physically unloaded before returning to ordinary work');
 for(const id of voyage.crew){const u=g.state.units.find(u=>u.id===id);assert.ok(u&&!u.boat&&!u.scoutProvisions&&u.seaExplorationId===undefined);}
 assert.equal(voyage.reportCommitted,true);assert.ok(voyage.metrics.cellsCommitted>0);
 const memory=new Set(g.state.rivalKnowledge.find(row=>row.team===team).cells);assert.ok(voyage.report.cells.every(cell=>memory.has(cell)));
 assert.equal(terrainHash(g),originalTerrain,'original height/water arrays unchanged');assert.equal(g.height,height);assert.equal(g.waterAt,waterAt);assert.equal(g.steer,steer);
 const copy=decodeGame(encodeGame(g));assert.equal(terrainHash(copy),originalTerrain);assert.equal(copy.state.boats[0].id,hullId);assert.equal(copy.state.seaExploration.voyages.find(v=>v.id===voyage.id).reportCommitted,true);
 console.log(JSON.stringify({hallCost,scope:'authored finite team1 society on unchanged seed1/V14 native coast;ordinaryGame.step;not organic multi-AI/browser/latest-map acceptance',limits:LIMITS,terrainSha256:originalTerrain,simulationSeconds:g.state.time-startTime,wallMilliseconds:performance.now()-wallStart,phases:[...phases],hullId,crew: voyage.crew.length,injuredOwnerExcluded:true,reportCommitted: true,metrics:voyage.metrics,captureWritten}));
});
