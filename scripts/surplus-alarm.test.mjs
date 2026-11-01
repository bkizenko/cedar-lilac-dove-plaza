import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {crop,emergencyResponse,farmWork} from '../src/game/settlement.ts';
import {fieldProductionReport} from '../src/game/productionReport.ts';
import {foodSpoilage} from '../src/game/pantry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {mulberry32} from '../src/game/rng.ts';
import {subsistenceWorkReport} from '../src/game/subsistenceBalance.ts';
import {carryingCapacity} from '../src/game/haulage.ts';
import {supplyDrops,supplyApproach,supplyReached} from '../src/game/campAnchor.ts';

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
function deterministic(fn){return()=>{const previous=Math.random;Math.random=mulberry32(123456);try{return fn();}finally{Math.random=previous;}};}
function patch(g){return {id:g.id(),kind:'forage',x:14,z:50,y:4,amount:1000,maxAmt:1000,regenT:0,scale:1,rich:1};}

test('full food stores keep focused gatherers working through repeated finite, physically delivered loads',deterministic(()=>{
 const g=fixture(),u=worker(g),n=patch(g);g.state.forage=[n];g.setLaborPriority('food');
 assert.equal(u.order,'gather');assert.equal(u.node,n);
 const capacity=carryingCapacity(u,'food'),rate=subsistenceWorkReport(g,'food',u.x,u.z);
 // Three modeled load periods plus approach/rest allowance; not the old 80s
 // throughput expectation from before the 4.5x gathering-labor adjustment.
 const deadline=Math.ceil(3*capacity*rate.baseWorkSecondsPerUnitBeforeTravel*g.campBonus(u,'food')+60);
 const deliveries=[];let lastSequence=0,startedSecondLoad=false;
 for(let i=0;i<deadline*10&&deliveries.length<2;i++){
  g.step(.1);
  for(const event of g.state.simulationEvents?.recent||[])if(event.sequence>lastSequence){
   lastSequence=Math.max(lastSequence,event.sequence);
   if(event.kind!=='cargo_delivered'||event.actorId!==u.id||event.resource!=='food')continue;
   deliveries.push(event);
   const drop=supplyDrops(g,0).find(drop=>{const spot=supplyApproach(g,u,drop);return spot&&supplyReached(g,u,drop,spot);});
   assert.ok(drop,'food is credited only after the resident physically reaches a cache');
   assert.equal(u.carry,0,'the delivered load leaves the carrier exactly once');
   assert.ok(g.tribe(0).food>g.stockCap(0),'each trip still finishes above protected capacity');
  }
  if(deliveries.length===1&&u.order==='gather'&&u.node===n&&u.carry>0)startedSecondLoad=true;
 }
 assert.equal(deliveries.length,2,`two real deliveries within modeled ${deadline}s budget`);
 assert.ok(startedSecondLoad,'the first full store does not halt the next gathering trip');
 assert.ok(deliveries.every(event=>event.amount>=capacity&&event.amount<=capacity+1),'loads match finite carrying capacity and at most one double-yield overflow');
 assert.ok(n.amount<1000,'both loads come from the finite patch');
 assert.ok(foodSpoilage(g)>0,'outdoor surplus still spoils');
 assert.deepEqual(g.simulationErrors,[]);
}));

test('manual food jobs and searches keep working above the old reserve target',()=>{
 const g=fixture(),u=worker(g);u.job='food';u.jobLock=true;g.findExploreTarget=()=>({x:50,z:50});
 g.workBoard.assign(g,u);assert.equal(u.order,'explore');assert.equal(u.searchJob,'food');
 g.state.forage=[patch(g)];u.order='idle';u.workCheckAt=0;g.workBoard.reset();g.workBoard.assign(g,u);assert.equal(u.order,'gather');
});

test('a hit immediately mobilizes tool defense and recalled carriers without remote equipment or duplicate damage',deterministic(()=>{
 const g=fixture(),u=worker(g),v=worker(g,14),far=worker(g,150),foe=g.spawnUnit('spearman',18,50,3);
 Object.assign(v,{recalled:true,order:'return',carry:7,carryType:'wood'});g.tribe(0).spears=1;
 const hp=u.hp,enemyHp=foe.hp,positions=[{x:u.x,z:u.z},{x:v.x,z:v.z}];g.applyCombatDamage(3,u,2);
 assert.equal(u.hp,hp-2);assert.equal(foe.hp,enemyHp,'alarm only changes orders, never deals recursive damage');
 assert.equal(u.order,'attack');assert.equal(v.order,'attack');assert.ok(u.emergency);assert.ok(v.emergency);assert.equal(v.emergency.defending,true);assert.equal(v.carry,7);
 assert.equal(far.emergency,undefined);
 assert.equal(g.tribe(0).spears,1,'the distant spear remains physically in the hall cache');
 assert.deepEqual([{x:u.x,z:u.z},{x:v.x,z:v.z}],positions,'the alarm does not teleport adults to equipment');
 assert.equal(u.militia,false);assert.equal(v.militia,false);
 g.step(.1);assert.ok(v.emergency);assert.doesNotMatch(v.workReason,/Recall/);assert.equal(v.carry,7);assert.equal(g.tribe(0).wood,0,'combat does not remotely deliver the recalled load');
 const restored=decodeGame(encodeGame(g));assert.equal(restored.state.units.find(p=>p.id===v.id).emergency.defending,true);
 for(let i=0;i<60&&foe.hp>=enemyHp;i++)g.step(.1);
 assert.ok(foe.hp<enemyHp,'mobilized adults actually fight with work tools while cache weapons are distant');
 assert.deepEqual(g.simulationErrors,[]);
}));

test('a rallying adult walks to the real cache, takes one finite spear and returns it once after standdown',deterministic(()=>{
 const g=fixture(),u=worker(g);g.tribe(0).spears=1;
 const drop=supplyDrops(g,0)[0],start={x:u.x,z:u.z};g.soundDefenseHorn();
 assert.equal(u.type,'worker');assert.equal(g.tribe(0).spears,1);assert.equal(u.emergency.autoArmed,false);
 let armed=false;
 for(let i=0;i<100&&!armed;i++){
  const before={x:u.x,z:u.z};g.step(.1);
  assert.ok(Math.hypot(u.x-before.x,u.z-before.z)<2,'arming moves by ordinary short steering steps');
  if(u.militia){const spot=supplyApproach(g,u,drop);assert.ok(spot&&supplyReached(g,u,drop,spot),'weapon is taken only at actual cache frontage');armed=true;}
  else assert.equal(g.tribe(0).spears,1,'travel alone does not debit a remote weapon');
 }
 assert.ok(armed,'a reachable spear is collected within ten seconds');
 assert.ok(Math.hypot(u.x-start.x,u.z-start.z)>1,'arming required physical travel');
 assert.equal(u.type,'spearman');assert.equal(g.tribe(0).spears,0);assert.equal(u.emergency.autoArmed,true);
 for(let i=0;i<600&&u.militia;i++){
  g.step(.1);
  if(g.tribe(0).spears===1){const spot=supplyApproach(g,u,drop);assert.ok(spot&&supplyReached(g,u,drop,spot),'returned spear is credited at real cache frontage');}
 }
 assert.equal(u.type,'worker');assert.equal(u.militia,false);assert.equal(g.tribe(0).spears,1,'standdown physically returns the borrowed spear');
 run(g,3);assert.equal(g.tribe(0).spears,1,'later ticks do not duplicate returned equipment');
 assert.deepEqual(g.simulationErrors,[]);
}));

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
