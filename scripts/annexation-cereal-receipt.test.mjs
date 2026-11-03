import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {beginProduction,productionIssue,PRODUCTION_RECIPES} from '../src/game/production.ts';
import {settlePeace} from '../src/game/peace.ts';
import {gameSnapshot,decodeGame,validateGameSave} from '../src/game/persistence.ts';
const copy=x=>JSON.parse(JSON.stringify(x));
const terrain=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
function step(g){g.state.paused=false;const old=g.state.time;g.step(.2);assert.ok(g.state.time>old);assert.deepEqual(g.simulationErrors,[]);}
function drive(g,seconds,done){const end=g.state.time+seconds;while(g.state.time<end&&!done())step(g);assert.ok(done(),JSON.stringify(g.state.production));}
function setup(bound){
 let g=new Game();g.reset(345,14,{size:1040,layout:'pangaea'});g.enterIsland();const home={...g.campOf(1)},own={...g.campOf(0)};g.state.units=[];g.state.buildings=[];g.state.autoWorkEnabled=false;g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.birthT=10000;g.calamityT=10000;for(const t of g.state.tribes)t.thinkT=10000;
 // Finite authored existing halls/hearth, bodies and six rough grain portions.
 // Upstream planting/threshing/building is not claimed. No midrun grants.
 const hall=g.makeBld('townhall',home.x,home.z,1),recipient=g.makeBld('townhall',own.x,own.z,0),hearth=g.makeBld('hearth',home.x+12,home.z,1);g.state.buildings=[hall,recipient,hearth];
 const maker=g.spawnUnit('worker',home.x+6,home.z,1);maker.order='hold';maker.homeHall=hall.id;for(let i=0;i<8;i++){const u=g.spawnUnit('spearman',home.x+16+i%2,home.z+10+Math.floor(i/2),0);u.order='hold';}
 for(const team of[0,1]){Object.assign(g.tribe(team),{seeds:bound?(team===1?1e12:0):90000,food:2000,foodLots:{provisions:2000},wood:30,stone:10,items:team===1?{roughGrain:6}:{},hostile:false});g.tribe(team).survival.waterLiters=100;}
 g.vision.fill(2);g.rebuildWalk();const hash=terrain(g);assert.equal(beginProduction(g,'winnowCerealHand',hearth.id,maker.id),true,productionIssue(g,'winnowCerealHand',hearth.id,maker.id));let p=g.state.production.projects.at(-1);drive(g,60,()=>p.phase==='working'&&p.progress>1);const id=p.id,progress=p.progress;g.makeHostile(1);assert.equal(settlePeace(g,1,'annexation'),true,g.state.banner);g.state.paused=true;const saved=copy(gameSnapshot(g));validateGameSave(saved);g=decodeGame(saved);assert.equal(terrain(g),hash);p=g.state.production.projects.find(p=>p.id===id);assert.equal(p.progress,progress);return{g,p,hash};
}
test('native paid winnowing after annexation credits all grain/chaff/seed fractions once above the old100k target',()=>{
 const{g,p,hash}=setup(false);drive(g,90,()=>p.phase==='complete');const spec=PRODUCTION_RECIPES.winnowCerealHand;
 assert.ok(Math.abs(g.tribe(0).seeds-(180000+.32))<1e-9);assert.equal(g.state.cerealProcessing.seedsAllocated,.32);assert.equal(g.state.cerealProcessing.cleanedGrain,4);assert.equal(g.state.cerealProcessing.seedsLost,0);assert.equal(g.tribe(0).items.chaff,2);assert.equal(g.state.production.metrics.consumed.roughGrain,6);assert.equal(g.state.production.metrics.edibleFoodProduced,spec.food);
 const ledger=copy(g.state.cerealProcessing),produced=copy(g.state.production.metrics.produced);for(let i=0;i<5;i++)step(g);assert.deepEqual(g.state.cerealProcessing,ledger);assert.deepEqual(g.state.production.metrics.produced,produced);assert.equal(terrain(g),hash);validateGameSave(gameSnapshot(g));
});
test('strict seed bound holds same actual finished paid winnowing outputs through paused save with no partial credits',()=>{
 let{g,p,hash}=setup(true);drive(g,90,()=>p.blockedReason.includes('Seed storage'));assert.equal(p.phase,'returning');assert.equal(p.progress,PRODUCTION_RECIPES.winnowCerealHand.workSeconds);assert.equal(g.tribe(0).seeds,1e12);assert.equal(g.state.cerealProcessing.cleanedGrain,0);assert.equal(g.state.cerealProcessing.seedsAllocated,0);assert.equal(g.state.cerealProcessing.seedsLost,0);assert.equal(g.tribe(0).items.chaff||0,0);assert.equal(g.state.production.metrics.edibleFoodProduced||0,0);assert.equal(g.state.production.metrics.consumed.roughGrain,6);
 const id=p.id,actor=p.actorId,paid=copy(g.state.production.metrics);g.state.paused=true;const save=copy(gameSnapshot(g));validateGameSave(save);g=decodeGame(save);p=g.state.production.projects.find(p=>p.id===id);for(let i=0;i<5;i++)step(g);assert.equal(p.phase,'returning');assert.equal(p.actorId,actor);assert.equal(g.tribe(0).seeds,1e12);assert.deepEqual(g.state.production.metrics.consumed,paid.consumed);assert.deepEqual(g.state.production.metrics.produced,paid.produced);assert.equal(g.state.cerealProcessing.seedsLost,0);assert.equal(g.state.production.metrics.edibleFoodProduced||0,0);assert.equal(terrain(g),hash);validateGameSave(gameSnapshot(g));
});
