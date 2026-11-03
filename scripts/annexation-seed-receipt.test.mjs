import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {settlePeace,peaceIssue} from '../src/game/peace.ts';
import {gameSnapshot,decodeGame,validateGameSave} from '../src/game/persistence.ts';
const copy=x=>JSON.parse(JSON.stringify(x));
const terrain=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
function setup(seedEach,samples=true){
 let g=new Game();g.reset(345,14,{size:1040,layout:'pangaea'});g.enterIsland();const home={...g.campOf(1)},own={...g.campOf(0)};g.state.units=[];g.state.buildings=[];g.state.autoWorkEnabled=false;g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.birthT=10000;g.calamityT=10000;for(const t of g.state.tribes)t.thinkT=10000;
 // All endowments precede the first tick: two existing halls, one carrier
 // initially at a validated native delivery entrance with ten grain food and
 // optionally five samples, eight witnesses and finite stated seed stores.
 // Initial acquisition/building and the earlier walking leg are not claimed.
 const hall=g.makeBld('townhall',home.x,home.z,1),recipient=g.makeBld('townhall',own.x,own.z,0);g.state.buildings=[hall,recipient];
 const carrier=g.spawnUnit('worker',home.x+6,home.z,1);carrier.homeHall=hall.id;carrier.order='return';carrier.carry=10;carrier.carryType='food';carrier.carryFood='grain';if(samples)carrier.seedSamples={grain:5};
 for(let i=0;i<8;i++){const u=g.spawnUnit('spearman',home.x+16+i%2,home.z+10+Math.floor(i/2),0);u.order='hold';}
 for(const team of[0,1]){Object.assign(g.tribe(team),{seeds:seedEach,food:100,foodLots:{provisions:100},wood:20,stone:5,items:{}});g.tribe(team).survival.waterLiters=100;}
 g.rebuildWalk();g.vision.fill(2);const entrance=g.interactionSpot(carrier,hall);assert.ok(entrance,'actual native delivery entrance exists');Object.assign(carrier,{x:entrance.x,y:g.height(entrance.x,entrance.z),z:entrance.z,tx:entrance.x,tz:entrance.z});g.makeHostile(1);assert.equal(peaceIssue(g,1,'annexation'),null);validateGameSave(gameSnapshot(g));const hash=terrain(g),id=carrier.id;
 g.state.paused=true;assert.equal(settlePeace(g,1,'annexation'),true,g.state.banner);assert.equal(g.tribe(0).seeds,seedEach*2);const saved=copy(gameSnapshot(g));validateGameSave(saved);g=decodeGame(saved);assert.equal(terrain(g),hash);return{g,u:g.state.units.find(u=>u.id===id),hash};
}
function step(g){g.state.paused=false;const before=g.state.time;g.step(.2);assert.ok(g.state.time>before);assert.deepEqual(g.simulationErrors,[]);}
test('native returned crop samples after annexation add finite seeds without truncating inherited stock',()=>{
 const{g,u,hash}=setup(90000),end=g.state.time+15;while(g.state.time<end&&u.carry>0)step(g);
 assert.equal(u.carry,0,u.workReason);assert.equal(u.seedSamples,undefined);assert.equal(g.tribe(0).seeds,180005,'existing 180000 seeds plus the same physically delivered five samples');
 const once=g.tribe(0).seeds;for(let i=0;i<10;i++)step(g);assert.equal(g.tribe(0).seeds,once);assert.equal(terrain(g),hash);validateGameSave(gameSnapshot(g));
});
for(const samples of[true,false])test(`strict seed-bound receipt retains ${samples?'sample-bearing':'ordinary grain'} cargo and records no false delivery`,()=>{
 const{g,u,hash}=setup(5e11,samples),stock=copy(g.tribe(0).cropSamples||{}),oldSamples=copy(u.seedSamples||null),totals=copy(g.state.simulationEvents?.totals||{});
 for(let i=0;i<3;i++)step(g);
 assert.equal(g.tribe(0).seeds,1e12);assert.deepEqual(g.tribe(0).cropSamples||{},stock);assert.equal(u.carry,10);assert.equal(u.carryType,'food');assert.equal(u.carryFood,'grain');assert.deepEqual(u.seedSamples||null,oldSamples);assert.match(u.workReason,/Seed storage/);
 for(const key of['cargo_delivered:0:food','food_received:0:food'])assert.equal(g.state.simulationEvents?.totals[key]||0,totals[key]||0);
 assert.equal(terrain(g),hash);validateGameSave(gameSnapshot(g));
});
