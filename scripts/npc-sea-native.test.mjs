import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {nativeBoatVillage} from './helpers/native-boat-village.mjs';
import {launchRiverboat,BOAT_COST} from '../src/game/boats.ts';
import {waterNavigation} from '../src/game/waterTravel.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

const LIMITS={simulationSeconds:500,wallMilliseconds:30000};
function terrainHash(g){const hash=createHash('sha256');for(const array of [g.world.heights,g.world.waterHeights])if(array)hash.update(Buffer.from(array.buffer,array.byteOffset,array.byteLength));return hash.digest('hex');}

// Prepared for the integrator: this test has NOT been executed by its author.
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
 const playerHome=g.world.camps.find(c=>c.team===0);
 assert.ok(playerHome,'native player camp exists');
 g.state.campSites=[{team,...home},{team:0,x:playerHome.x,z:playerHome.z}];
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
 const startTime=g.state.time,phases=new Set();
 let voyage,observedAboard=false,captureWritten=false;
 while(g.state.time-startTime<LIMITS.simulationSeconds){
  assert.ok(performance.now()-wallStart<LIMITS.wallMilliseconds,'native mission exceeded30s wall bound');
  assert.equal(g.state.ended,null,'ordinary game must remain active');
  g.step(.1);assert.deepEqual(g.simulationErrors,[]);
  voyage=g.state.seaExploration.voyages.find(v=>v.team===team);
  if(!voyage)continue;phases.add(voyage.phase);
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
 assert.ok(voyage,'a normal Game.step admitted the mission');
 assert.equal(voyage.phase,'complete',JSON.stringify({phase:voyage.phase,reason:voyage.reason,phases:[...phases],metrics:voyage.metrics}));
 for(const phase of ['mustering','outbound','returning','landing','unloading','complete'])assert.ok(phases.has(phase),'physically visited '+phase);
 assert.ok(observedAboard,'a moving NPC shared hull carried its actual crew');
 assert.ok(!voyage.crew.includes(injured.id),'injured personal-canoe owner neither crews nor blocks the hull');
 assert.equal(voyage.boatId,hullId);assert.equal(g.state.boats.length,1);assert.equal(hull.team,team);
 assert.ok(voyage.metrics.hullReused===1&&voyage.metrics.hullPayments===0,'existing paid hull reused');
 assert.ok(voyage.metrics.sailMeters>16&&voyage.metrics.foodLoaded>0&&voyage.metrics.foodReturned>0);
 for(const kind of ['food','water']){const m=voyage.metrics;assert.ok(Math.abs(m[kind+'Loaded']-(m[kind+'Returned']+m[kind+'Used']+m[kind+'Lost']+m[kind+'WithPeople']))<1e-6,kind+' voyage conservation');}
 assert.equal(voyage.home.length,voyage.crew.length);
 for(const id of voyage.crew){const u=g.state.units.find(u=>u.id===id);assert.ok(u&&!u.boat&&!u.haulage&&!u.scoutProvisions&&u.seaExplorationId===undefined);assert.ok(Math.hypot(u.x-home.x,u.z-home.z)<=5,'report carrier reached the real communal cache');}
 assert.equal(voyage.reportCommitted,true);assert.ok(voyage.metrics.cellsCommitted>0);
 const memory=new Set(g.state.rivalKnowledge.find(row=>row.team===team).cells);assert.ok(voyage.report.cells.every(cell=>memory.has(cell)));
 assert.equal(terrainHash(g),originalTerrain,'original height/water arrays unchanged');assert.equal(g.height,height);assert.equal(g.waterAt,waterAt);assert.equal(g.steer,steer);
 const copy=decodeGame(encodeGame(g));assert.equal(terrainHash(copy),originalTerrain);assert.equal(copy.state.boats[0].id,hullId);assert.equal(copy.state.seaExploration.voyages.find(v=>v.id===voyage.id).reportCommitted,true);
 console.log(JSON.stringify({scope:'authored finite team1 society on unchanged seed1/V14 native coast;ordinaryGame.step;not organic multi-AI/browser/latest-map acceptance',limits:LIMITS,terrainSha256:originalTerrain,simulationSeconds:g.state.time-startTime,wallMilliseconds:performance.now()-wallStart,phases:[...phases],hullId,crew: voyage.crew.length,injuredOwnerExcluded:true,reportCommitted: true,metrics:voyage.metrics,captureWritten}));
});
