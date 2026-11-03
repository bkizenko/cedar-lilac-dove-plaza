import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginProduction,pauseProduction,resumeProduction} from '../src/game/production.ts';
import {settlePeace,peaceIssue} from '../src/game/peace.ts';
import {prepareSocietyHandover} from '../src/game/communityHandover.ts';
import {gameSnapshot,encodeGame,decodeGame} from '../src/game/persistence.ts';
import {foodInventory} from '../src/game/pantry.ts';
import {workRuntime} from '../src/game/workRuntime.ts';

// Finite controlled ownership fixture, NOT native generation or building proof.
// All scalar/body/building endowments are declared before paid work begins.
function fixture(native=false){
 const g=new Game();g.reset(345,native?14:10,native?{size:1040,layout:"pangaea"}:undefined);g.enterIsland();
 if(!native){g.world.heights.fill(4);g.world.waterHeights=undefined;g.world.waterBodies=[];}
 g.state.units=[];g.state.buildings=[];g.state.autoWorkEnabled=false;
 g.state.paused=false;g.state.conflict='quiet';g.state.weather='clear';
 g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.birthT=10000;g.calamityT=10000;
 for(const t of g.state.tribes)t.thinkT=10000;
 const home=native?g.campOf(1):{x:0,z:0},other=native?g.campOf(0):{x:100,z:0};
 const hall=g.makeBld('townhall',home.x,home.z,1),hearth=g.makeBld('hearth',home.x+12,home.z,1),recipient=g.makeBld('townhall',other.x,other.z,0);
 g.state.buildings=[hall,hearth,recipient];g.vision.fill(2);
 const maker=g.spawnUnit('worker',home.x+6,home.z,1);maker.order='hold';maker.homeHall=hall.id;
 for(let i=0;i<8;i++){const u=g.spawnUnit('spearman',home.x+16+i%2,home.z+10+Math.floor(i/2),0);u.order='hold';u.homeHall=recipient.id;}
 Object.assign(g.tribe(1),{items:{rawMeat:12,clay:3,flour:2,rawHide:1},itemFreshness:{flour:0,rawHide:0},wood:70,stone:11,seeds:9,food:100,foodLots:{grain:30,berries:20,smokedMeat:50},hostile:true});
 Object.assign(g.tribe(0),{items:{clay:2,flour:1},itemFreshness:{flour:0},wood:40,stone:4,seeds:3,food:80,foodLots:{bread:40,provisions:40}});
 g.rebuildWalk();return{g,maker,hearth,hall};
}
const copy=v=>JSON.parse(JSON.stringify(v));
const raw=g=>copy(gameSnapshot(g));
function aggregate(g){const a=g.tribe(0),b=g.tribe(1);return{food:a.food+b.food,lots:Object.fromEntries(Object.keys(foodInventory(a)).map(k=>[k,foodInventory(a)[k]+foodInventory(b)[k]])),wood:a.wood+b.wood,stone:a.stone+b.stone,seeds:a.seeds+b.seeds,items:Object.fromEntries([...new Set([...Object.keys(a.items||{}),...Object.keys(b.items||{})])].map(k=>[k,(a.items?.[k]||0)+(b.items?.[k]||0)]))};}
function strict(g){const x=raw(g);assert.doesNotThrow(()=>decodeGame(x));return x;}
function drive(g,seconds,done){const end=g.state.time+seconds;while(g.state.time<end&&!done()){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);}assert.ok(done(),JSON.stringify({time:g.state.time,banner:g.state.banner,projects:g.state.production?.projects,people:g.state.units.map(u=>({id:u.id,team:u.team,order:u.order,work:u.workReason,x:u.x,z:u.z}))}));}

test('public annexation preserves paid cook plus exact mixed inventory in immediate paused strict save',()=>{
 const {g,maker,hearth}=fixture();assert.equal(beginProduction(g,'cookMeat',hearth.id,maker.id),true);
 const p=g.state.production.projects.at(-1),before=copy(p),totals=aggregate(g),state=g.state,person=maker;
 strict(g);assert.equal(peaceIssue(g,1,'annexation'),null);
 g.state.paused=true;assert.equal(settlePeace(g,1,'annexation'),true,g.state.banner);
 assert.notEqual(g.state,state);const now=g.state.production.projects.find(x=>x.id===p.id),u=g.state.units.find(x=>x.id===maker.id);
 assert.notEqual(u,person);assert.equal(u.team,0);assert.equal(now.team,0);assert.equal(now.originTeam,1);assert.equal(now.actorId,before.actorId);assert.equal(now.workplace,before.workplace);assert.equal(now.phase,before.phase);assert.equal(now.progress,before.progress);
 assert.deepEqual(aggregate(g),totals);assert.equal(g.tribe(1).food,0);assert.equal(g.tribe(1).seeds,0);assert.deepEqual(g.tribe(1).items,{});assert.equal(g.tribe(0).foodLots.berries,20);assert.equal(g.tribe(0).foodLots.smokedMeat,50);assert.equal(g.tribe(0).itemFreshness.flour,0);
 const saved=strict(g);assert.equal(saved.state.paused,true);const restored=decodeGame(saved);assert.deepEqual(aggregate(restored),totals);
 assert.equal(workRuntime(g).activeJob(u.id)?.owner,0,'fresh coordinator belongs to recipient');
 const metrics=copy(g.state.production.metrics);assert.equal(settlePeace(g,1,'annexation'),false);assert.deepEqual(g.state.production.metrics,metrics);assert.deepEqual(aggregate(g),totals);
});

test('pure preflight changes no nested live state and rejected public pressure changes only banner',()=>{
 const {g,maker,hearth}=fixture();assert.equal(beginProduction(g,'cookMeat',hearth.id,maker.id),true);
 const before=JSON.stringify(g.state),seq=g.state.nextId,coordinator=workRuntime(g),job=coordinator.activeJob(maker.id);
 const plan=prepareSocietyHandover(g,1);assert.equal(plan.accepted,true,plan.reason);assert.equal(JSON.stringify(g.state),before);assert.equal(g.state.nextId,seq);assert.equal(workRuntime(g),coordinator);assert.deepEqual(coordinator.activeJob(maker.id),job);
 plan.state.tribes[0].items.clay=999;assert.equal(g.tribe(0).items.clay,2,'draft nested inventory detached');
 for(const u of g.state.units)if(u.team===0){u.x=300;u.z=300;u.y=4;}
 const rejected=copy(g.state);assert.equal(settlePeace(g,1,'annexation'),false);const after=copy(g.state);for(const k of ['banner','bannerT']){delete rejected[k];delete after[k];}assert.deepEqual(after,rejected);strict(g);
});

test('paused paid cook survives restore and ordinary completion without paying inputs twice',()=>{
 let {g,maker,hearth}=fixture(true);assert.equal(beginProduction(g,'cookMeat',hearth.id,maker.id),true);assert.equal(pauseProduction(g,maker),true);
 const id=g.state.production.projects.at(-1).id,paid=copy(g.state.production.metrics),stock=aggregate(g);
 assert.equal(settlePeace(g,1,'annexation'),true,g.state.banner);g=decodeGame(strict(g));
 const p=g.state.production.projects.find(p=>p.id===id);maker=g.state.units.find(u=>u.id===p.actorId);
 assert.equal(p.phase,'paused');assert.equal(resumeProduction(g,id,maker.id),true);assert.deepEqual(g.state.production.metrics.consumed,paid.consumed);assert.equal(g.state.production.metrics.logsUsed,paid.logsUsed);
 drive(g,180,()=>p.phase==='complete');assert.equal(g.state.production.metrics.completed,paid.completed+1);assert.deepEqual(g.state.production.metrics.consumed,paid.consumed);assert.equal(g.state.production.metrics.logsUsed,paid.logsUsed);assert.equal(g.state.production.metrics.edibleFoodProduced,4);assert.ok(aggregate(g).wood<=stock.wood);strict(g);
});

test('strict save rejects forged provenance links and wrong asset membership',()=>{
 const {g,maker,hearth}=fixture();assert.equal(beginProduction(g,'cookMeat',hearth.id,maker.id),true);assert.equal(settlePeace(g,1,'annexation'),true,g.state.banner);const good=strict(g);
 for(const change of [s=>s.production.projects[0].handoverId=s.nextId+2,s=>s.production.projects[0].originTeam=2,s=>s.communityHandovers[0].productionIds=[],s=>s.communityHandovers[0].toTeam=2,s=>s.communityHandovers[0].timeSeconds=s.time+1]){const bad=structuredClone(good);change(bad.state);assert.throws(()=>decodeGame(bad));}
});
