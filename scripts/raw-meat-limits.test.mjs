// Raw meat must stay a bounded pile: hunters stop when it is high, delivery culls the overflow,.
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {PRODUCTION_RULES,rawMeatSaturated,deliverProductionCargo} from '../src/game/production.ts';

const world=()=>{const g=new Game();g.reset(20261115,undefined,{size:1040,layout:'continents'});g.enterIsland();g.setAutoWork(true);return g;};
const huntTasks=(g)=>{g.workBoard.invalidateTasks();g.workBoard.refresh(g);return (g.workBoard.tasks.get(0)||[]).filter(t=>t.node&&'species' in t.node).length;};

test('hunters stop offering hunts once raw meat reaches the stop level and resume below it',()=>{
 const g=world();g.tribe(0).items??={};
 g.state.time=30;
 const c=g.campOf(0);for(const a of g.state.wildlife.slice(0,3)){if(a.species!=='bird'){a.hp=a.maxHp;a.x=c.x+8;a.z=c.z+8;}}
 g.tribe(0).items.rawMeat=0;const open=huntTasks(g);assert.ok(open>0,'hunting tasks exist when raw meat is low');
 g.tribe(0).items.rawMeat=PRODUCTION_RULES.rawMeatHuntStopUnits;
 assert.ok(rawMeatSaturated(g,0));
 assert.equal(huntTasks(g),0,'no hunting task while raw meat is high');
 g.tribe(0).items.rawMeat=PRODUCTION_RULES.rawMeatHuntStopUnits-1;
 assert.equal(huntTasks(g),open,'hunting tasks return below the stop level');
});

test('delivering a catch culls raw meat above the cap as spoilage and never adds food',()=>{
 const g=world();const c=g.campOf(0),t=g.tribe(0);t.items??={};t.items.rawMeat=PRODUCTION_RULES.rawMeatStockCapUnits-5;
 const u=g.state.units.find(p=>p.team===0&&p.type==='worker'&&p.hp>0);
 Object.assign(u,{x:c.x,z:c.z,carry:12,carryType:'food',carryFood:'meat',rawHuntMeat:true,itemCargo:undefined});
 const food=t.food;deliverProductionCargo(g,u);
 assert.equal(t.items.rawMeat,PRODUCTION_RULES.rawMeatStockCapUnits);
 assert.equal(u.carry,0);assert.equal(t.food,food);
 assert.ok((g.state.production.metrics.spoiled.rawMeat||0)>=7-1e-9,'overflow counted as spoiled');
});
