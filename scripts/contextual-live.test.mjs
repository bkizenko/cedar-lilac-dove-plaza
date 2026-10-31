import {mulberry32} from '../src/game/rng.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {initializeSurvival,beginWaterCollection,tickSurvival} from '../src/game/survivalNeeds.ts';
import {PRISONER_RULES} from '../src/game/captivity.ts';
import {CONFLICT_RULES} from '../src/game/conflictIntent.ts';
const originalRandom=Math.random;test.beforeEach(()=>{Math.random=mulberry32(0x13579);});test.afterEach(()=>{Math.random=originalRandom;});
function ground(g){g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.state.weather='clear';g.state.weatherT=10000;g.vision.fill(2);g.rebuildWalk();}
function fixture(){const g=new Game();g.reset(123456,11);g.enterIsland();g.state.conflict='quiet';g.state.units=[];g.state.buildings=[];for(const key of ['trees','stones','copper','iron','forage','fish','wildlife'])g.state[key]=[];ground(g);g.state.autoWorkEnabled=false;g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1),g.makeBld('hut',95,38,1),g.makeBld('townhall',200,38,1)];g.rebuildWalk();return {g,home:g.state.buildings[0],hall:g.state.buildings[1],hut:g.state.buildings[2],far:g.state.buildings[3]};}
function drive(g,seconds,until=()=>false){const goal=g.state.time+seconds;let steps=0;while(g.state.time<goal&&!until()&&steps++<10000){g.state.paused=false;g.step(.1);}assert.deepEqual(g.simulationErrors,[]);}
function roundtrip(g){const next=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));ground(next);next.state.paused=false;return next;}
test('live capture walks, saves mid-approach, obtains neutral surrender, escorts to custody and refuses forced work',()=>{
 let {g}=fixture(),guard=g.spawnUnit('spearman',5,52,0),person=g.spawnUnit('worker',70,52,1);person.hp=17;person.parents=[40,41];person.carry=3;person.carryType='wood';guard.selected=true;
 const id=person.id,guardId=guard.id,count=g.state.units.length;assert.equal(g.capturePerson(id).accepted,true);drive(g,3);assert.equal(person.team,1);const moved=guard.x;assert.ok(moved>5);
 g=roundtrip(g);person=g.state.units.find(u=>u.id===id);guard=g.state.units.find(u=>u.id===guardId);
 drive(g,100,()=>!!person.prisoner);assert.ok(person.prisoner,'the party must obtain actual surrender');const possessionsAtSurrender=person.carry;drive(g,70,()=>person.prisoner?.phase==='custody');assert.equal(person.prisoner.phase,'custody');assert.equal(person.enslavedFrom,undefined);assert.equal(person.id,id);assert.deepEqual(person.parents,[40,41]);assert.equal(person.carry,possessionsAtSurrender);assert.equal(g.state.units.filter(u=>u.id===id).length,1);assert.equal(new Set(g.state.units.map(u=>u.id)).size,g.state.units.length);
 const task=person.prisoner;g.clearSelect();person.selected=true;g.assignJob('wood');assert.equal(person.prisoner,task);assert.equal(person.job,null);g.setAutoWork(true);g.setLaborPriority('wood');drive(g,3);assert.equal(person.order,'hold');assert.equal(person.job,null);
 const copy=roundtrip(g);assert.equal(copy.state.units.find(u=>u.id===id).prisoner.phase,'custody');
});
test('live occupation holds an intact village, revalidates surrender and transfers only local bodies/buildings after save',()=>{
 // One critically wounded noncombatant stays below the existing emergency-fighting threshold; a healthy local defender still resists and a distant child remains outside the battle.
 let {g,hall,hut,far}=fixture(),guard=g.spawnUnit('spearman',5,52,0),resident=g.spawnUnit('worker',90,52,1),remote=g.spawnUnit('worker',205,52,1);resident.name='Nara';resident.parents=[41,42];resident.hp=11;resident.homeHall=hall.id;remote.homeHall=far.id;remote.maturesAt=10000;g.spawnUnit('spearman',90,55,1);guard.selected=true;for(const offset of [-2,2]){const supporter=g.spawnUnit('spearman',5+offset,56,0);supporter.selected=true;}
 const localId=resident.id,remoteId=remote.id,hallId=hall.id,hutId=hut.id,farId=far.id,hp=hall.hp,hutHp=hut.hp;
 assert.equal(g.secureVillage(hall.id).accepted,true);let control=g.state.occupations[0];drive(g,5);assert.notEqual(control.phase,'held');g=roundtrip(g);control=g.state.occupations[0];
 drive(g,140,()=>control.phase==='held');assert.equal(control.phase,'held',JSON.stringify({control,status:g.occupationStatus(control.id),units:g.state.units.map(u=>({id:u.id,team:u.team,type:u.type,hp:u.hp,x:u.x,z:u.z,intent:u.conflictIntent,militia:u.militia,order:u.order,reason:u.workReason,prisoner:u.prisoner,emergency:!!u.emergency}))}));assert.ok(control.holdSeconds>=CONFLICT_RULES.controlHoldSeconds);assert.equal(g.state.buildings.find(b=>b.id===hallId).hp,hp);assert.equal(g.state.buildings.find(b=>b.id===hutId).hp,hutHp);
 assert.ok(g.state.units.find(u=>u.id===localId),JSON.stringify({missingLocal:localId,units:g.state.units.map(u=>({id:u.id,team:u.team,type:u.type,hp:u.hp,hunger:u.hunger,reason:u.workReason})),journal:g.state.conflictJournal}));
 const ownFood=g.tribe(0).food,enemyFood=g.tribe(1).food,ownWood=g.tribe(0).wood,enemyWood=g.tribe(1).wood;
 assert.equal(g.integrateVillage(control.id).accepted,true);assert.equal(g.state.buildings.find(b=>b.id===hallId).team,0);assert.equal(g.state.buildings.find(b=>b.id===hutId).team,0);assert.equal(g.state.buildings.find(b=>b.id===farId).team,1);
 resident=g.state.units.find(u=>u.id===localId);assert.equal(resident.team,0);assert.equal(resident.name,'Nara');assert.deepEqual(resident.parents,[41,42]);assert.ok(resident.hp>=11);assert.equal(resident.enslavedFrom,undefined);assert.equal(g.state.units.find(u=>u.id===remoteId).team,1);assert.equal(g.tribe(1).alive,true);
 assert.equal(g.tribe(0).food,ownFood);assert.equal(g.tribe(1).food,enemyFood);assert.equal(g.tribe(0).wood,ownWood);assert.equal(g.tribe(1).wood,enemyWood);assert.equal(g.integrateVillage(control.id).accepted,false);
 const copy=roundtrip(g);assert.equal(copy.state.buildings.find(b=>b.id===hallId).team,0);assert.equal(copy.state.occupations[0].phase,'integrated');
});
test('cached building targets and arrows cannot burn an occupation hall after intent changes, including a midflight save',()=>{
 let {g,hall}=fixture(),archer=g.spawnUnit('archer',65,50,0);const hp=hall.hp;g.makeHostile(1);g.fireArrow(archer,hall);assert.equal(g.state.projectiles.length,1);archer.selected=true;assert.equal(g.secureVillage(hall.id).accepted,true);
 archer.target=hall;archer.order='attack';g.combatAI(archer,.1);assert.equal(hall.hp,hp);g=roundtrip(g);hall=g.state.buildings.find(b=>b.id===hall.id);g.updateProjectiles(5);assert.equal(hall.hp,hp);assert.equal(g.state.projectiles.length,0);
 const bad=encodeGame(g);bad.state.occupations[0].holdSeconds=-1;assert.throws(()=>decodeGame(bad));
});
test('manual work prevents resource seeking but direct orders and explicit Auto work remain functional',()=>{
 const {g}=fixture(),u=g.spawnUnit('worker',0,60,0);assert.equal(u.order,'hold');g.state.trees=[{id:g.id(),kind:'tree',x:8,z:65,y:4,amount:40,maxAmt:40,regenT:0,scale:1,rich:1}];
 drive(g,2);assert.equal(u.node,null);assert.equal(u.job,null);u.selected=true;g.issueGather(g.state.trees[0]);assert.equal(u.node,g.state.trees[0]);assert.equal(u.jobLock,true);drive(g,3);assert.ok(['gather','return'].includes(u.order));
 g.assignJob('auto');assert.equal(u.jobLock,false);drive(g,1);assert.ok(['hold','return'].includes(u.order));g.setAutoWork(true);assert.notEqual(u.order,'hold');
 const loaded=roundtrip(g);assert.equal(loaded.state.autoWorkEnabled,true);const invalid=encodeGame(g);invalid.state.autoWorkEnabled='yes';assert.throws(()=>decodeGame(invalid));
});

test('generation twelve opens every player resident on manual HOLD and preserves that state on save',()=>{
 const g=new Game();g.reset(42,12,{size:1040,layout:'pangaea'});assert.equal(g.state.autoWorkEnabled,false);const people=g.state.units.filter(u=>u.team===0);assert.ok(people.length>0);for(const u of people){assert.equal(u.order,'hold');assert.equal(u.job,null);assert.equal(u.node,null);}
 const loaded=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(loaded.state.autoWorkEnabled,false);for(const u of loaded.state.units.filter(u=>u.team===0))assert.equal(u.order,'hold');
});

test('manual opening still automatically fetches finite drinking water along a real discovered-bank route',()=>{
 const g=new Game();g.reset(42,12,{size:1040,layout:'pangaea'});g.enterIsland();g.state.conflict='quiet';g.exploredAt=()=>true;const stock=g.tribe(0).survival;assert.equal(g.state.autoWorkEnabled,false);const initial=stock.waterLiters;let physicalTravel=0,prior=new Map();
 for(let i=0;i<7500&&stock.waterDeliveredLiters===0;i++){for(const u of g.state.units.filter(u=>u.team===0&&u.waterWork)){const last=prior.get(u.id);if(last)physicalTravel+=Math.hypot(u.x-last.x,u.z-last.z);prior.set(u.id,{x:u.x,z:u.z});}g.state.paused=false;g.step(.1);}
 assert.deepEqual(g.simulationErrors,[]);assert.ok(stock.waterDeliveredLiters>0,JSON.stringify({initial,stock,workers:g.state.units.filter(u=>u.team===0).map(u=>({order:u.order,work:u.waterWork,reason:u.workReason}))}));assert.ok(physicalTravel>2,'the carrier must physically travel, not receive remote water');assert.equal(g.state.autoWorkEnabled,false);assert.ok(Math.abs(initial+stock.waterDeliveredLiters-stock.waterConsumedLiters-stock.waterLiters-stock.waterLostLiters)<1e-6);
});
