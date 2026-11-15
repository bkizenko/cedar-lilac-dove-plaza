import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {enableCombatDoctrine,mayFormUp} from '../src/game/combatDoctrine.ts';
import {engagedFighter,explicitArmedOrder} from '../src/game/defense.ts';
function fx(type='spearman',n=6){const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0)];g.vision.fill(2);g.rebuildWalk();g.clockState=()=>({period:'Afternoon'});
 enableCombatDoctrine(g);const us=Array.from({length:n},(_,i)=>g.spawnUnit(type,10+i,38,0));return{g,us};}
test('trained groups form up; untrained workers, raiding parties and groups surprised at night do not',()=>{
 const{g,us}=fx();assert.equal(mayFormUp(g,us),true,'trained soldiers form up');
 assert.equal(mayFormUp(g,us,true),false,'a raiding party never forms up');
 for(const u of us)u.pillage=2;assert.equal(mayFormUp(g,us),false,'units on a raid never form up');for(const u of us)u.pillage=-1;
 g.clockState=()=>({period:'Night'});g.spawnUnit('spearman',30,38,2);g.tribe(2).hostile=true;
 assert.equal(mayFormUp(g,us),false,'caught by an enemy at night');
 g.clockState=()=>({period:'Afternoon'});assert.equal(mayFormUp(g,us),true);
 const w=fx('worker');assert.equal(mayFormUp(w.g,w.us),false,'untrained villagers do not');
});
test('issueMove forms up only when allowed, and a raid march passes no formation',()=>{
 const{g,us}=fx();g.clearSelect();for(const u of us)g.selectEntity(u,true);
 g.issueMove(40,38);assert.ok((g.state.formations||[]).length>0,'trained group formed');
 g.state.formations=[];const camp=g.makeBld('hut',60,38,2);camp.build=1;camp.hp=camp.maxHp;g.state.buildings.push(camp);g.tribe(2).hostile=true;g.state.walkDirty=true;
 g.clearSelect();for(const u of us)g.selectEntity(u,true);g.issuePillage(camp);assert.equal((g.state.formations||[]).length,0,'raiding party is not a formation');
});
test('engaged armed adults never flee when hurt; only an order withdraws them',()=>{
 const{g,us}=fx();const u=us[0];u.hp=u.maxHp*.2;const foe=g.spawnUnit('spearman',u.x+5,u.z,2);
 assert.equal(engagedFighter(u,[foe]),true);
 const far=g.spawnUnit('spearman',u.x+60,u.z,2);assert.equal(engagedFighter(u,[far]),false);
 const w=g.spawnUnit('worker',12,40,0);assert.equal(engagedFighter(w,[foe]),false,'unarmed civilians may still shelter');
});
