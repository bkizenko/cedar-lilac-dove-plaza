import test from'node:test';import assert from'node:assert/strict';
import{Game}from'../src/game/sim.ts';import{beginProduction,productionAI,tickProduction,productionIssue,itemCapacity,storedItemUnits,stockpileByKind}from'../src/game/production.ts';
function fixture(){const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.state.units=[];g.state.buildings=[];for(const k of['trees','stones','forage','fish','copper','iron','wildlife'])g.state[k]=[];g.state.autoWorkEnabled=false;g.state.conflict='quiet';g.state.time=950;g.state.weather='clear';g.state.weatherT=10000;g.state.visitorTimer=900;g.state.raidT=10000;g.state.encounter=undefined;for(const t of g.state.tribes)t.thinkT=10000;g.state.campSites=[{team:0,x:0,z:30}];Object.assign(g.tribe(0),{food:1000,foodLots:{provisions:1000},wood:100,stone:100,items:{}});g.tribe(0).survival.waterLiters=100;g.state.buildings=[g.makeBld('townhall',0,30,0),g.makeBld('warehouse',-16,30,0)];for(const b of g.state.buildings)b.y=4;g.rebuildWalk();g.vision.fill(2);const u=g.spawnUnit('worker',0,36,0);u.order='hold';u.jobLock=false;u.y=4;return{g,u};}
test('finished non-food goods are left beside a full store instead of stalling, and show as a ground stockpile',()=>{
 const{g,u}=fixture();const hearth=g.makeBld('hearth',12,30,0);hearth.y=4;g.state.buildings.push(hearth);g.rebuildWalk();
 const cap=itemCapacity(g,0);g.tribe(0).items.clay=cap*40;// packed volume well past covered space
 assert.ok(storedItemUnits(g,0)>cap);
 assert.equal(productionIssue(g,'makeCharcoal',hearth.id,u.id),null,'a full store no longer blocks starting a finished-goods batch');
 assert.equal(beginProduction(g,'makeCharcoal',hearth.id,u.id),true);const p=g.state.production.projects.at(-1);
 for(let i=0;i<40000&&p.phase!=='complete'&&p.phase!=='stored';i++){g.state.time+=.5;g.navBudget=4;tickProduction(g,.5);productionAI(g,u,.5);}
 assert.ok(g.tribe(0).items.charcoal>0,JSON.stringify({phase:p.phase,why:p.blockedReason}));
 const pile=stockpileByKind(g,0);assert.ok(Object.values(pile).reduce((a,b)=>a+b,0)>0,'overflow is reported as a ground pile');
 for(const[k,n]of Object.entries(pile))assert.ok(n<=g.tribe(0).items[k]+1e-9,'pile never exceeds stock');
 g.tribe(0).items={};assert.deepEqual(stockpileByKind(g,0),{},'when space frees the pile is gone (goods are under cover again)');
});
