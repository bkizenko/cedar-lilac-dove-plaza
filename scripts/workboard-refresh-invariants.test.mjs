import test from'node:test';import assert from'node:assert/strict';import{Game}from'../src/game/sim.ts';import{gameSnapshot,decodeGame}from'../src/game/persistence.ts';import{refreshBefore}from'./helpers/workboard-refresh-before-62a122e.ts';
test('native per-team task order/priority/slots and query side effects equal frozen refresh across seasons, reserves, ages and dock surveys',()=>{
 const oldRandom=Math.random;let seed=19;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 try{const initial=new Game();initial.reset(1,18,{size:1040,layout:'continents'});initial.enterIsland();const data=gameSnapshot(initial),scenarios=[{time:0,food:1,weather:'clear'},{time:450,food:30,weather:'rain'},{time:990,food:10000,weather:'clear'},{time:1650,food:30,weather:'drought'}];
 for(const scenario of scenarios){const results=[];for(const reference of[true,false]){seed=97;const g=decodeGame(structuredClone(data));g.state.time=scenario.time;g.state.weather=scenario.weather;for(const t of g.state.tribes){t.food=scenario.food;t.wood=31;t.stone=17;t.copper=11;t.iron=7;t.age=2;}
 const home=g.campOf(0),farm=g.makeBld('farm',home.x+25,home.z,0),unfinished=g.makeBld('hut',home.x-25,home.z,0);unfinished.build=.4;g.state.buildings.push(farm,unfinished);const site=g.world.dockSites?.[0];if(site){g.state.buildings.push(g.makeBld('dock',site.x,site.z,0));g.stampVision(site.x,site.z,48,1);}
 const camps=g.campOf;let campReads=0;g.campOf=function(...a){campReads++;return Reflect.apply(camps,this,a);};
 if(reference)refreshBefore.call(g.workBoard,g);else g.workBoard.refresh(g);g.campOf=camps;
 const tasks=[...g.workBoard.tasks].map(([team,rows])=>[team,rows.map(t=>[t.node.id,t.kind,t.slots,t.priority])]);results.push({tasks,state:gameSnapshot(g),campReads});}
 assert.deepEqual(results[1].tasks,results[0].tasks,JSON.stringify(scenario));assert.deepEqual(results[1].state,results[0].state);assert.ok(results[1].campReads<results[0].campReads,'one camp lookup per participating society replaces per-stone duplicate reads');}
 }finally{Math.random=oldRandom;}
});
