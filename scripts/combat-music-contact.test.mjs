import {prepareFiniteRaid,destructiveFixtureIntent} from './finite-raid-fixture.mjs';
import test from'node:test';import assert from'node:assert/strict';import{Game}from'../src/game/sim.ts';import{combatMusicMood}from'../src/game/combatMusic.ts';
function fixture(){const g=new Game();g.reset(42,10);g.enterIsland();g.state.units=[];g.state.buildings=[];g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.state.campSites=[{team:0,x:0,z:30}];g.rebuildWalk();g.vision.fill(2);const u=g.spawnUnit('spearman',0,36,0),foe=g.spawnUnit('spearman',8,36,3);return{g,u,foe};}
test('nearby stationary guards, outbound orders, retreating bands and unseen fights cannot announce a battle',()=>{
 const{g,u,foe}=fixture();foe.homeCamp=999;foe.order='hold';assert.equal(combatMusicMood(g),'peace');u.order='attackmove';u.pillage=1;u.attackDestination={x:200,z:30};assert.equal(combatMusicMood(g),'peace');foe.homeCamp=undefined;foe.seaRaid={phase:'retreat',x:8,z:36,goalX:0,goalZ:30,thinkAt:0,departAt:1000};assert.equal(combatMusicMood(g),'peace');foe.order='attack';foe.target=u;foe.x=1;g.vision.fill(0);assert.equal(combatMusicMood(g),'peace');
});
test('visible weapon contact switches defense and offense, and the read-only mood returns to peace without despawning anyone',()=>{
 const{g,u,foe}=fixture();const count=g.state.units.length;foe.order='attack';foe.target=u;foe.x=1;let before=JSON.stringify(g.state);assert.equal(combatMusicMood(g),'raid');assert.equal(JSON.stringify(g.state),before);foe.target=null;foe.order='hold';u.x=100;foe.x=101;u.order='attack';u.target=foe;assert.equal(combatMusicMood(g),'pillage');u.order='hold';u.target=null;assert.equal(combatMusicMood(g),'peace');assert.equal(g.state.units.length,count);assert.ok(foe.hp>0);
});
test('a target beyond weapon reach and other societies fighting each other do not start the player battle music',()=>{
 const{g,u,foe}=fixture();foe.order='attack';foe.target=u;foe.x=18;assert.equal(combatMusicMood(g),'peace');const rival=g.spawnUnit('spearman',19,36,1);rival.order='attack';rival.target=foe;g.tribe(1).hostile=true;foe.target=rival;assert.equal(combatMusicMood(g),'peace');
});

test('a finite V18 camp raid physically crosses native terrain and delivers an attack before battle music starts',()=>{
 const g=new Game();g.reset(42,18,{size:1040,layout:'continents'});g.enterIsland();const home=g.campOf(0),site=g.findOpenSpot(home.x+12,home.z,'warehouse',0);assert.ok(site);g.state.buildings.push(g.makeBld('warehouse',site.x,site.z,0));for(let i=0;i<32;i++)g.spawnUnit('worker',home.x+i%4,home.z+Math.floor(i/4),0);g.rebuildWalk();
 prepareFiniteRaid(g,g.state.buildings.find(b=>b.team===0&&b.type==='warehouse'));const terrain=new Float32Array(g.world.heights),existing=new Set(g.state.units.map(u=>u.id));g.state.time=1600;g.state.raidWave=4;const random=Math.random;try{Math.random=()=>.5;g.spawnRaid();}finally{Math.random=random;}
 const attackers=g.state.units.filter(u=>existing.has(u.id)&&u.team===3&&u.seaRaid);assert.ok(attackers.length>0);destructiveFixtureIntent(attackers);assert.ok(Math.hypot(attackers[0].x-home.x,attackers[0].z-home.z)>30);assert.equal(combatMusicMood(g),'peace','dispatch and a distant shore landing are not a battle');
 // Controlled journey qualification: preserve the native terrain and existing
 // player targets; run only the dispatched band, not unrelated society planners.
 const targets=g.state.buildings.filter(b=>b.team===0),hp=targets.reduce((n,b)=>n+b.hp,0);let hit=false,closest=Infinity;
 for(let i=0;i<3000&&!hit;i++){g.state.time+=.2;g.navBudget=4;for(const u of attackers){if(u.hp<=0)continue;const start={x:u.x,z:u.z};g.barbarianAI(u,.2);assert.ok(Math.hypot(u.x-start.x,u.z-start.z)<2,'The raid walks rather than teleporting');closest=Math.min(closest,Math.hypot(u.x-home.x,u.z-home.z));}g.updateProjectiles(.2);hit=targets.reduce((n,b)=>n+b.hp,0)<hp||g.state.units.some(u=>u.team===0&&u.hp<u.maxHp);}
 assert.ok(hit,'An actual village target receives damage');assert.ok(closest<15);assert.equal(combatMusicMood(g),'raid');assert.deepEqual(g.world.heights,terrain);assert.deepEqual(new Set(g.state.units.map(u=>u.id)),existing,'All original residents remain; no replacement raiders are manufactured');
});
