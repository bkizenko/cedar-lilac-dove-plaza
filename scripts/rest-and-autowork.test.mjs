import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {routineRest} from '../src/game/journeys.ts';
import {KeyboardCommands} from '../src/game/keyboard.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function fixture(){
 const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);
 g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0)];
 g.state.forage=[];g.state.trees=[];g.state.stones=[];g.state.copper=[];g.state.iron=[];g.state.fish=[];g.state.wildlife=[];
 g.state.weather='clear';g.state.weatherT=10000;g.state.laborPolicy='balanced';g.vision.fill(2);g.rebuildWalk();
 const u=g.spawnUnit('worker',15,38,0);const n={id:g.id(),kind:'forage',x:15,z:38,y:4,amount:1000,maxAmt:1000,regenT:0,rich:1,scale:1};
 g.state.forage=[n];g.tribe(0).food=0;g.clockState=()=>({period:'Night'});
 return {g,u,n};
}
test('unselected idle adults start and deliver food at night without repeated commands',()=>{
 const {g,u,n}=fixture();const hp=u.hp;
 for(let i=0;i<600;i++)g.step(.1);
 assert.equal(u.selected,false);assert.ok(n.amount<990,'food harvested without selecting anyone');
 assert.ok(g.tribe(0).food>0,'real cargo returned to stores');assert.ok(u.hp>=hp);assert.equal(g.state.ended,null);
});
test('rest finishes before dawn and preserves the assigned workplace',()=>{
 const {g,u,n}=fixture();g.tribe(0).food=100;Object.assign(u,{order:'gather',job:'food',node:n,fatigue:.8});
 const at=g.interactionSpot(u,g.state.buildings[0]);u.x=at.x;u.z=at.z;
 assert.equal(routineRest(g,u,.1),true);
 for(let i=0;i<200&&u.resting;i++)routineRest(g,u,.1);
 assert.equal(u.resting,undefined);assert.equal(routineRest(g,u,.1),false);assert.equal(u.node,n);assert.equal(u.order,'gather');
});
test('Rest recovers then resumes automatically; explicit Halt still holds until Auto work',()=>{
 const {g,u}=fixture();g.clockState=()=>({period:'Afternoon'});u.selected=true;u.fatigue=.8;
 const at=g.interactionSpot(u,g.state.buildings[0]);u.x=at.x;u.z=at.z;g.assignJob('rest');
 assert.equal(u.resting,true);assert.equal(decodeGame(encodeGame(g)).state.units.find(p=>p.id===u.id).resting,true);
 for(let i=0;i<300;i++)g.step(.1);
 assert.equal(u.resting,undefined);assert.notEqual(u.order,'hold');
 g.haltSelected();g.step(.1);assert.equal(u.order,'hold');g.assignJob('auto');assert.equal(u.jobLock,false);assert.notEqual(u.order,'hold');
});
test('food orders cancel overriding missions, keep cargo and resume after deselection',()=>{
 const {g,u}=fixture();Object.assign(u,{selected:true,recalled:true,scout:{legs:2,returning:true},resting:true,carry:5,carryType:'wood'});
 g.assignJob('food');g.clearSelect();assert.equal(u.recalled,undefined);assert.equal(u.scout,undefined);assert.equal(u.resting,undefined);assert.equal(u.order,'return');assert.equal(u.carry,5);assert.equal(u.job,'food');assert.equal(u.jobLock,true);
});
test('balanced idle workers search for food when no known food remains',()=>{
 const {g,u}=fixture();g.state.forage=[];g.findExploreTarget=()=>({x:40,z:38});g.workBoard.assign(g,u);
 assert.equal(u.searchJob,'food');assert.equal(u.order,'explore');
});
test('click-toggle and Escape clear selection without changing work; shift removes only one person',()=>{
 const {g,u,n}=fixture();const v=g.spawnUnit('worker',18,38,0);Object.assign(u,{order:'gather',job:'food',node:n});
 g.selectEntity(u,false,true);g.selectEntity(u,false,true);assert.equal(u.selected,false);assert.equal(u.node,n);
 g.selectEntity(u);g.selectEntity(v,true);g.selectEntity(u,true,true);assert.equal(u.selected,false);assert.equal(v.selected,true);
 const e={game:g,canvas:{focus(){}},pushHud(){},moveMode:true,loggingMode:true};new KeyboardCommands(e).key({code:'Escape'});
 assert.equal(g.selectedUnits().length,0);assert.equal(e.moveMode,false);assert.equal(u.node,n);assert.equal(u.order,'gather');
});
