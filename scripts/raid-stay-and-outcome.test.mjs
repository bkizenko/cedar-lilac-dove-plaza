import test from'node:test';import assert from'node:assert/strict';import{Game}from'../src/game/sim.ts';import{classifyRaid}from'../src/game/raidReports.ts';
function fixture(){const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0)];g.state.campSites=[{team:0,x:0,z:38}];for(const k of['trees','forage','stones','copper','iron','fish','wildlife'])g.state[k]=[];g.state.autoWorkEnabled=false;g.state.weather='clear';g.state.weatherT=10000;g.state.visitorTimer=900;g.state.raidT=10000;g.state.conflict='quiet';g.state.encounter=undefined;g.vision.fill(2);
 const hall=g.makeBld('townhall',150,38,2);hall.build=1;hall.hp=hall.maxHp;g.state.buildings.push(hall);g.tribe(2).alive=true;
 g.state.walkDirty=true;g.rebuildWalk();
 const foes=[];for(let i=0;i<3;i++){const c=g.spawnUnit('worker',156+i*2,56,2);c.order='hold';foes.push(c);}
 const mine=[];for(let i=0;i<6;i++){const u=g.spawnUnit('spearman',120,36+i*2,0);u.militia=true;mine.push(u);}
 g.tribe(2).hostile=true;g.clearSelect();for(const u of mine)g.selectEntity(u,true);return{g,hall,foes,mine};}
const run=(g,s)=>{const end=g.state.time+s;while(g.state.time<end)g.step(.1);};
test('raiders keep fighting the raided people after the buildings are gone, and leave only on order',()=>{
 const{g,hall,foes,mine}=fixture();g.issueAttack(hall);
 let hallDownAt=null;for(let i=0;i<600&&!hallDownAt;i++){g.step(.1);if(hall.hp<=0)hallDownAt=g.state.time;}
 assert.ok(hallDownAt,'hall destroyed');
 // Nobody may stand down while one of the raided people is still visible nearby.
 let checked=0;for(let i=0;i<40;i++){run(g,1);for(const u of mine){if(u.hp<=0||u.pillage<0&&u.order!=='move')continue;}
  const near=foes.some(f=>f.hp>0&&g.visibleAt(f.x,f.z)&&mine.some(u=>u.hp>0&&Math.hypot(u.x-f.x,u.z-f.z)<40));
  if(near){checked++;assert.ok(mine.some(u=>u.hp>0&&u.pillage>=0),'raiders stay while villagers are in reach: '+JSON.stringify(mine.map(u=>[u.order,u.pillage,u.workReason])));}}
 assert.ok(checked>3,'villagers were in reach for a while');
});
test('a player order recalls raiders at once',()=>{
 const{g,hall,mine}=fixture();g.issueAttack(hall);run(g,20);g.issueMove(0,38);
 assert.ok(mine.every(u=>u.hp<=0||u.pillage<0),'any order clears the raid');
});
test('wounded raiders on the offensive keep fighting instead of seeking shelter',()=>{
 const{g,hall,foes,mine}=fixture();g.issueAttack(hall);for(const u of mine)u.hp=u.maxHp*.3;
 for(const f of foes){f.type='spearman';f.militia=true;f.order='attack';f.x=130;f.z=38;}
 run(g,5);
 assert.ok(mine.every(u=>u.hp<=0||!/shelter/i.test(u.workReason||'')),'no shelter flight: '+mine.map(u=>u.workReason));
});
test('raid outcome: heavy defender losses with no raider losses is an overrun, not repelled',()=>{
 const base={buildingsLost:0,carried:{},exposed:{},attackerIds:[1,2,3],attackerLost:0,defenderLost:17,retreated:3};
 assert.equal(classifyRaid(base,3),'overrun');
 assert.equal(classifyRaid({...base,attackerLost:5,defenderLost:2},3),'repelled');
 assert.equal(classifyRaid({...base,defenderLost:0},3),'repelled');
 assert.equal(classifyRaid({...base,defenderLost:0,retreated:0},3),'standoff');
 assert.equal(classifyRaid({...base,buildingsLost:1},3),'sacked');
 assert.equal(classifyRaid(base,0),'destroyed');
});
