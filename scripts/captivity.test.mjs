import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {captiveGuardCoverage,tickCaptivity} from '../src/game/captivity.ts';
import {freePeople} from '../src/game/peace.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(345);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1)];g.state.weather='clear';g.clockState=()=>({period:'Afternoon'});g.vision.fill(2);Object.assign(g.tribe(1),{alive:true,hostile:false});g.rebuildWalk();const u=g.spawnUnit('worker',8,50,0);u.enslavedFrom=1;u.captivityUnrest=25;u.order='idle';return {g,u};}
test('stationed armed guards have a finite three-person nearby capacity and do not cover distant workers',()=>{
 const {g,u}=fixture();for(let i=0;i<3;i++){const c=g.spawnUnit('worker',10+i,50,0);c.enslavedFrom=1;}
 const guard=g.spawnUnit('spearman',10,52,0);guard.order='hold';assert.equal(captiveGuardCoverage(g).size,3);
 guard.order='move';assert.equal(captiveGuardCoverage(g).size,0);guard.order='hold';guard.x=100;assert.equal(captiveGuardCoverage(g).size,0);
 guard.x=10;guard.resting=true;assert.equal(captiveGuardCoverage(g).size,0);guard.resting=undefined;
 guard.hp=0;assert.equal(captiveGuardCoverage(g).size,0);guard.hp=40;guard.type='swordsman';assert.equal(captiveGuardCoverage(g).size,3);
});
test('forced work and hunger raise resistance while nearby guards reduce it for fed residents',()=>{
 const {g,u}=fixture();u.order='gather';tickCaptivity(g,100);assert.ok(u.captivityUnrest>25);
 const guard=g.spawnUnit('spearman',10,52,0);guard.order='hold';const high=u.captivityUnrest;tickCaptivity(g,100);assert.ok(u.captivityUnrest<high);
 u.hunger=60;const before=u.captivityUnrest;tickCaptivity(g,100);assert.ok(u.captivityUnrest>before,'guards cannot erase starvation pressure');
});
test('an escape transfers the same person and cargo in place and only delivers after walking home',()=>{
 const {g,u}=fixture();u.captivityUnrest=99.99;u.carry=9;u.carryType='wood';const id=u.id,x=u.x,z=u.z,total=g.state.units.length,stock=g.tribe(1).wood;
 tickCaptivity(g,1);assert.equal(u.id,id);assert.equal(g.state.units.length,total);assert.equal(u.team,1);assert.equal(u.x,x);assert.equal(u.z,z);assert.equal(u.enslavedFrom,undefined);assert.equal(u.carry,9);assert.equal(g.tribe(1).wood,stock);
 for(let i=0;i<1500&&u.recalled;i++){g.state.time+=.1;g.navBudget=10;g.workerAI(u,.1);}
 assert.equal(u.recalled,undefined);assert.equal(u.carry,0);assert.equal(g.tribe(1).wood,stock+9);assert.ok(g.buildingWorkReached(u,g.state.buildings[1]));
});
test('emancipation clears resistance and a fallen homeland cannot create a phantom faction',()=>{
 const {g,u}=fixture();freePeople(g,1);assert.equal(u.enslavedFrom,undefined);assert.equal(u.captivityUnrest,undefined);
 u.enslavedFrom=1;u.captivityUnrest=100;g.tribe(1).alive=false;tickCaptivity(g,1);assert.equal(u.team,0);assert.equal(u.enslavedFrom,undefined);assert.equal(g.tribe(1).alive,false);
});
test('resistance persists across saves; old captives remain valid and malformed resistance fails',()=>{
 const {g,u}=fixture();const raw=encodeGame(g);assert.equal(decodeGame(raw).state.units[0].captivityUnrest,25);
 const old=structuredClone(raw);delete old.state.units[0].captivityUnrest;assert.ok(decodeGame(old));
 for(const value of [-1,101,NaN]){const bad=structuredClone(raw);bad.state.units[0].captivityUnrest=value;assert.throws(()=>decodeGame(bad));}
 const bad=structuredClone(raw);delete bad.state.units[0].enslavedFrom;assert.throws(()=>decodeGame(bad));
});

test('the live simulation applies resistance and preserves an escape across a save',()=>{
 const {g,u}=fixture();delete g.clockState;g.checkVictory=()=>{};u.captivityUnrest=99.999;u.order='hold';g.state.paused=false;g.step(1/3);
 assert.equal(u.team,1);assert.equal(u.enslavedFrom,undefined);assert.equal(u.recalled,true);
 assert.deepEqual(Object.entries(g.blank()).filter(([key,value])=>typeof value==='number'&&!Number.isFinite(g.state[key])).map(([key])=>key),[]);
 const loaded=decodeGame(encodeGame(g)),person=loaded.state.units.find(p=>p.id===u.id);
 assert.equal(person.team,1);assert.equal(person.recalled,true);assert.equal(person.captivityUnrest,undefined);assert.deepEqual(g.simulationErrors,[]);
});

test('nearby superior force captures an adult in place without healing, duplicating people or remotely depositing cargo',()=>{
 const {g}=fixture();g.state.units=[];const captive=g.spawnUnit('worker',25,50,1),guard=g.spawnUnit('spearman',23,50,0);
 captive.hp=7;captive.carry=8;captive.carryType='wood';const stock=g.tribe(0).wood,id=captive.id;
 g.applyCombatDamage(0,captive,20);
 assert.equal(captive.team,0);assert.equal(captive.id,id);assert.equal(g.state.units.length,2);assert.ok(captive.hp>0&&captive.hp<=7);
 assert.equal(captive.enslavedFrom,1);assert.equal(captive.captivityUnrest,40);assert.equal(captive.x,25);assert.equal(captive.carry,8);assert.equal(g.tribe(0).wood,stock);
 for(let i=0;i<1500&&captive.recalled;i++){g.state.time+=.1;g.navBudget=10;g.workerAI(captive,.1);}
 assert.equal(captive.carry,0);assert.equal(g.tribe(0).wood,stock+8);assert.equal(captive.recalled,undefined);
 assert.equal(decodeGame(encodeGame(g)).state.units.find(u=>u.id===id).enslavedFrom,1);
});
test('remote fire, children and protected civilians cannot become magically healed captives',()=>{
 for(const situation of ['remote','child','protected','soldier']){
  const {g}=fixture();g.state.units=[];const target=g.spawnUnit(situation==='soldier'?'spearman':'worker',25,50,1);
  g.spawnUnit('spearman',situation==='remote'?100:23,50,0);if(situation==='child')target.maturesAt=1000;
  if(situation==='protected')g.spawnUnit('spearman',26,50,1);
  target.hp=5;g.applyCombatDamage(0,target,10);assert.equal(target.team,1,situation);assert.equal(target.hp,0);assert.equal(target.enslavedFrom,undefined);
 }
});
test('surrender preserves paid projects rather than deleting their materials and labor',()=>{
 const {g}=fixture();g.state.units=[];const target=g.spawnUnit('worker',25,50,1);g.spawnUnit('spearman',23,50,0);
 target.hp=5;target.weaponWork={kind:'spear',progress:10,duration:72,workplace:g.state.buildings[1].id};target.order='hold';
 g.applyCombatDamage(0,target,10);assert.equal(target.team,0);assert.equal(target.weaponWork.progress,10);assert.equal(target.weaponWork.paused,true);
});

test('a captive and assigned guard rendezvous, walk home with cargo and end escort duty',async()=>{
 const {sendCaptiveEscort,escortAI}=await import('../src/game/caravans.ts');
 const {g,u}=fixture();u.x=50;u.recalled=true;u.order='return';u.stationOnArrival=false;u.carry=7;u.carryType='wood';
 const guard=g.spawnUnit('spearman',10,50,0);guard.militia=true;guard.order='hold';
 const before=g.tribe(0).wood;assert.equal(sendCaptiveEscort(g,u.id),true);
 g.workerAI(u,.1);assert.equal(u.x,50,'wait for nearby assigned escort');assert.equal(g.tribe(0).wood,before);
 const loaded=decodeGame(encodeGame(g));assert.equal(loaded.state.units.find(p=>p.id===guard.id).escortId,u.id);
 for(let i=0;i<1600&&u.recalled;i++){g.state.time+=.1;g.navBudget=10;escortAI(g,guard,.1);g.workerAI(u,.1);}
 assert.equal(u.recalled,undefined);assert.equal(u.carry,0);assert.equal(g.tribe(0).wood,before+7);
 escortAI(g,guard,.1);assert.equal(guard.escortId,undefined);assert.equal(guard.recalled,true);
});

test('moving captive escorts guard only their charge and emancipation ends the assignment',async()=>{
 const {sendCaptiveEscort,escortAI}=await import('../src/game/caravans.ts');const {g,u}=fixture();
 u.recalled=true;const guard=g.spawnUnit('spearman',10,52,0);guard.militia=true;guard.order='hold';
 const other=g.spawnUnit('worker',11,50,0);other.enslavedFrom=1;
 assert.equal(sendCaptiveEscort(g,u.id),true);guard.order='move';
 assert.ok(captiveGuardCoverage(g).has(u.id));assert.equal(captiveGuardCoverage(g).has(other.id),false);
 freePeople(g,1);escortAI(g,guard,.1);assert.equal(guard.escortId,undefined);assert.equal(guard.recalled,true);
});
