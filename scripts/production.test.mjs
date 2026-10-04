import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {beginWeaponWork,weaponWorkAI} from '../src/game/warfare.ts';
import {fishingGrounds,fishingReport} from '../src/game/fishing.ts';import {mountainDeposit} from '../src/game/mining.ts';
import {decodeGame,encodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[];g.state.units=[];g.state.weather='clear';g.clockState=()=>({period:'Afternoon'});g.vision.fill(2);g.rebuildWalk();const u=g.spawnUnit('worker',0,38,0);return {g,u};}
test('hearth crafting is slower than a dedicated shelter and both require real labor',()=>{
 const {g,u}=fixture();const hall=g.makeBld('townhall',0,50,0),shop=g.makeBld('workshop',25,50,0);g.state.buildings.push(hall,shop);g.rebuildWalk();Object.assign(g.tribe(0),{wood:40,stone:10});
 assert.equal(beginWeaponWork(g,'spear',0,hall.id),true);assert.equal(u.weaponWork.duration,72);u.weaponWork=undefined;u.order='idle';
 assert.equal(beginWeaponWork(g,'spear',0,shop.id),true);assert.equal(u.weaponWork.duration,24);const stock=g.tribe(0).spears;
 for(let i=0;i<700&&u.weaponWork;i++){g.navBudget=10;g.state.time+=.1;weaponWorkAI(g,u,.1);}
 assert.equal(u.weaponWork,undefined);assert.equal(g.tribe(0).spears,stock+1);
});
test('dock fishing uses two labor slots and finite grounds; catches arrive as fish cargo',()=>{
 const {g,u}=fixture(),dock=g.makeBld('dock',0,38,0),ground={...g.state.fish[0],id:g.id(),x:4,z:38,amount:2,maxAmt:2,pressure:0};g.state.fish=[ground];g.state.buildings.push(dock);g.rebuildWalk();
 Object.assign(u,{order:'gather',node:dock,job:'food',carry:0,gatherT:100});const stock=g.tribe(0).food;
 g.workerAI(u,.1);assert.equal(ground.amount,1);assert.equal(u.carry,1);assert.equal(u.carryFood,'fish');assert.equal(g.tribe(0).food,stock);
 u.gatherT=100;g.workerAI(u,.1);assert.equal(ground.amount,0);assert.equal(u.carry,2);assert.equal(u.order,'return');assert.equal(fishingGrounds(g,dock).length,0);assert.match(fishingReport(g,dock),/\/2 fishers/);
 u.carry=0;u.order='gather';u.node=dock;u.gatherT=100;g.workerAI(u,.1);assert.equal(u.carry,0);
});
test('bare mountains allow finite excavation and progress survives a save',()=>{
 const {g,u}=fixture();g.world.heights.fill(14);g.state.trees=[];g.state.stones=[];g.state.forage=[];g.rebuildWalk();assert.equal(g.placementIssue('quarry',0,38),null);
 const quarry=g.makeBld('quarry',0,38,0);g.state.buildings.push(quarry);u.y=14;const d=mountainDeposit(g,quarry),before=d.remaining;
 Object.assign(u,{order:'gather',node:quarry,job:'stone',carry:0,gatherT:100});g.workerAI(u,.1);assert.ok(d.remaining<before);assert.equal(d.dug,u.carry);assert.equal(u.carryType,'stone');
 const loaded=decodeGame(encodeGame(g));assert.deepEqual(loaded.state.buildings[0].excavation,d);
 const raw=encodeGame(g);raw.state.buildings[0].excavation.remaining=-1;assert.throws(()=>decodeGame(raw));
});
test('spent lumber camps vanish and refund only once, including previously reclaimed saves',()=>{
 const {g}=fixture(),camp=g.makeBld('lumber',0,38,0);g.state.trees=[];g.state.buildings=[camp];const stock=g.tribe(0).wood;g.tickLumber();assert.equal(camp.hp,0);assert.equal(g.tribe(0).wood,stock+12);g.tickLumber();assert.equal(g.tribe(0).wood,stock+12);
 camp.hp=220;g.tickLumber();assert.equal(camp.hp,0);assert.equal(g.tribe(0).wood,stock+12);
});
test('assembled rival starting structures never enclose their residents',()=>{
 const g=new Game();g.reset(123456);g.enterIsland();for(const u of g.state.units)assert.equal(g.state.buildings.some(b=>g.solidBuilding(b)&&Math.abs(u.x-b.x)<b.w*.4+u.r&&Math.abs(u.z-b.z)<b.d*.4+u.r),false,`resident ${u.id}`);
});
