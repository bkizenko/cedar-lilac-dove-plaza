import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {crop,emergencyResponse,farmWork} from '../src/game/settlement.ts';
import {fieldProductionReport} from '../src/game/productionReport.ts';
import {foodSpoilage} from '../src/game/pantry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function fixture(){
 const g=new Game();g.reset(123456,2);g.enterIsland();g.world.heights.fill(4);
 g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0)];
 for(const key of ['trees','forage','stones','copper','iron','fish','wildlife'])g.state[key]=[];
 g.state.encounter=undefined;g.state.contacts=[];g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';g.state.paused=false;
 g.dayPhase=()=>.5;g.vision.fill(2);g.rebuildWalk();Object.assign(g.tribe(0),{food:1200,wood:0,stone:10,spears:0,bows:0});
 return g;
}
function worker(g,x=12){return g.spawnUnit('worker',x,50,0);}
function run(g,seconds){for(let i=0;i<seconds*10;i++)g.step(.1);}
function patch(g){return {id:g.id(),kind:'forage',x:14,z:50,y:4,amount:1000,maxAmt:1000,regenT:0,scale:1,rich:1};}

test('full food stores no longer stop focused gatherers; finite harvests are still carried home',()=>{
 const g=fixture(),u=worker(g),n=patch(g);g.state.forage=[n];g.setLaborPriority('food');
 assert.equal(u.order,'gather');assert.equal(u.node,n);const deliveries=[];
 g.onSfx=name=>{if(name==='drop')deliveries.push(g.tribe(0).food);};run(g,80);
 assert.ok(deliveries.length>=2,'continues making trips after protected storage is full');assert.ok(n.amount<1000);assert.ok(g.tribe(0).food>g.stockCap(0));
 assert.ok(foodSpoilage(g)>0,'outdoor surplus still spoils');
});

test('manual food jobs and searches keep working above the old reserve target',()=>{
 const g=fixture(),u=worker(g);u.job='food';u.jobLock=true;g.findExploreTarget=()=>({x:50,z:50});
 g.workBoard.assign(g,u);assert.equal(u.order,'explore');assert.equal(u.searchJob,'food');
 g.state.forage=[patch(g)];u.order='idle';u.workCheckAt=0;g.workBoard.reset();g.workBoard.assign(g,u);assert.equal(u.order,'gather');
});

test('a hit mobilizes nearby adults immediately, including recalled carriers, without duplicating damage',()=>{
 const g=fixture(),u=worker(g),v=worker(g,14),far=worker(g,150),foe=g.spawnUnit('spearman',18,50,3);
 Object.assign(v,{recalled:true,order:'return',carry:7,carryType:'wood'});g.tribe(0).spears=1;
 const hp=u.hp,enemyHp=foe.hp;g.applyCombatDamage(3,u,2);
 assert.equal(u.hp,hp-2);assert.equal(foe.hp,enemyHp,'alarm only changes orders, never deals recursive damage');
 assert.equal(u.order,'attack');assert.equal(v.order,'attack');assert.ok(u.emergency);assert.ok(v.emergency);assert.equal(v.emergency.defending,true);assert.equal(v.carry,7);
 assert.equal(far.emergency,undefined);assert.equal(g.tribe(0).spears,0);
 g.step(.1);assert.ok(v.emergency);assert.doesNotMatch(v.workReason,/Recall/);
 const restored=decodeGame(encodeGame(g));assert.equal(restored.state.units.find(p=>p.id===v.id).emergency.defending,true);
});

test('healthy adults defend with work tools when equipment is gone; children and wounded shelter',()=>{
 const g=fixture(),adult=worker(g),child=worker(g,13),hurt=worker(g,14),foe=g.spawnUnit('spearman',15,50,3);
 child.maturesAt=g.state.time+100;hurt.hp=5;foe.hp=2;foe.order='hold';
 g.applyCombatDamage(3,g.state.buildings[0],1);
 assert.equal(adult.order,'attack');assert.equal(child.emergency.defending,false);assert.equal(hurt.emergency.defending,false);
 assert.notEqual(child.order,'attack');assert.notEqual(hurt.order,'attack');
 run(g,6);assert.ok(foe.hp<=0,'work tools deal real combat damage');assert.equal(adult.militia,false);
});

test('outbound trade resumes its physical paid shipment after an alarm',()=>{
 const g=fixture(),u=worker(g),foe=g.spawnUnit('spearman',16,50,3);
 Object.assign(u,{order:'trade',tradeTeam:1,trade:{give:'wood',giveAmt:6,get:'stone',getAmt:4},carry:6,carryType:'wood',tx:90,tz:50});
 g.applyCombatDamage(3,u,1);assert.equal(u.emergency.resume.order,'trade');foe.hp=0;g.state.time=u.emergency.until+1;
 emergencyResponse(g,u,.1);assert.equal(u.order,'trade');assert.equal(u.carry,6);assert.equal(u.tradeTeam,1);assert.equal(u.tx,90);
});

test('an unseen distant attacker does not reveal their position through an alarm',()=>{
 const g=fixture(),u=worker(g),foe=g.spawnUnit('archer',55,50,3);g.vision.fill(0);g.applyCombatDamage(3,u,1);
 assert.ok(u.emergency);assert.equal(u.target,null);assert.equal(g.visibleAt(foe.x,foe.z),false);
});

test('field forecasts match actual ripening, report remaining labor and do not mutate crops',()=>{
 const g=fixture(),b=g.makeBld('farm',25,50,0),u=worker(g);g.state.buildings.push(b);
 g.state.time=100;b.crop={year:0,planted:.5,tended:.4,remaining:0,ripened:false,kind:'grain',water:.8};
 const before=JSON.stringify(b),spring=fieldProductionReport(g,b);assert.equal(JSON.stringify(b),before);assert.equal(spring.workSeconds,23);assert.ok(spring.potential>spring.projected);
 g.state.time=1000;assert.equal(crop(g,b).remaining,spring.projected);assert.equal(fieldProductionReport(g,b).projected,spring.projected);
 Object.assign(u,{node:b,order:'gather',carry:0,gatherT:0});assert.equal(fieldProductionReport(g,b).staff,1);
 farmWork(g,u,b,1);assert.equal(fieldProductionReport(g,b).projected+u.carry,spring.projected,'harvesting reduces forecast, not stores');
 b.fallowYear=0;assert.equal(fieldProductionReport(g,b).projected,0);assert.equal(fieldProductionReport(g,b).stage,'Fallow');
});
