import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';import {canoeHeight,waterNavigation} from '../src/game/waterTravel.ts';
test('elevated lake is real water for walking, foundations, vessels, flood and exact saves',()=>{
 const g=new Game();g.reset(42,11,{size:1040,layout:'pangaea'});const lake=g.world.waterBodies.find(b=>b.kind==='lake');assert.ok(lake.surfaceY>g.world.baseWaterY+5);
 const surface=g.waterAt(lake.x,lake.z);assert.ok(g.height(lake.x,lake.z)<surface);assert.equal(g.walkable(lake.x,lake.z),false);assert.equal(g.dryFoundation('hut',lake.x,lake.z),false);
 const u=g.state.units.find(u=>u.team===0&&u.type==='worker');u.haulage='canoe';assert.ok(Math.abs(canoeHeight(g,u,lake.x,lake.z)-surface-.16)<1e-5);
 g.world.waterY+=.55;assert.ok(Math.abs(g.waterAt(lake.x,lake.z)-surface-.55)<1e-5);g.world.waterY-=.55;
 const copy=decodeGame(encodeGame(g));assert.deepEqual(copy.world.waterHeights,g.world.waterHeights);assert.deepEqual(copy.world.waterBodies,g.world.waterBodies);assert.equal(copy.waterAt(lake.x,lake.z),surface);
});
test('waterfall lips are real vessel barriers while old global-water saves retain their surface',()=>{
 const g=new Game();g.reset(42,11);const nav=waterNavigation(g,true),cell=g.world.size/nav.width;
 for(const f of g.world.waterfalls){const ix=Math.floor((f.x+g.world.size/2)/cell),iz=Math.floor((f.z+g.world.size/2)/cell);assert.equal(nav.grid[iz*nav.width+ix],0,'waterfall requires portage');}
 const old=new Game();old.reset(42,10);assert.equal(old.world.waterHeights,undefined);assert.equal(old.waterAt(0,0),old.world.waterY);
});
test('elevated lake shoreline supplies a physical water trip without an ocean-level dry-source rejection',async()=>{
 const {beginWaterCollection,waterCollectionAI}=await import('../src/game/survivalNeeds.ts');
 const g=new Game();g.reset(42,11,{size:1040,layout:'pangaea'});g.enterIsland();g.vision.fill(2);
 // Isolate the lake as the available freshwater source; keep its real geometry,
 // the camp, terrain, navigation and actor movement unchanged.
 g.world.rivers=[];g.world.features=g.world.features.filter(f=>f.kind==='lake');
 const before=g.tribe(0).survival.waterLiters,result=beginWaterCollection(g);
 assert.equal(result.accepted,true,result.reason);const u=g.state.units.find(u=>u.id===result.actorId);
 assert.ok(g.waterAt(u.waterWork.sourceX,u.waterWork.sourceZ)>g.world.waterY+5);
 let steps=0,loaded=false;while(u.waterWork&&steps++<5000){g.state.time+=.1;g.navBudget=10;waterCollectionAI(g,u,.1);loaded ||= (u.waterWork?.liters??0)>0;assert.notEqual(u.waterWork?.paused,true,u.workReason);}
 assert.ok(loaded,'water is physically collected before delivery');assert.equal(u.waterWork,undefined,'trip reaches the real camp');assert.equal(g.tribe(0).survival.waterLiters-before,24);
});
