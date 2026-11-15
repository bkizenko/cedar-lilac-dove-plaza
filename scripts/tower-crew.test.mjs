import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {enableCombatDoctrine} from '../src/game/combatDoctrine.ts';
import {assignTowerGuard,guardDutyAI,tickGuardDuties,towerCrew,towerRateMultiplier,validGuardDuties} from '../src/game/guardDuty.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function world(){
 const g=new Game();g.reset(4242,3);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.buildings=[g.makeBld('townhall',0,0,0),g.makeBld('watchtower',20,0,0)];g.state.conflict='quiet';g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();enableCombatDoctrine(g);
 for(const b of g.state.buildings){b.done=true;b.progress=b.progress??1;}
 return g;
}
const armed=(g,x,z)=>{const u=g.spawnUnit('spearman',x,z,0);u.militia=true;u.y=4;return u;};
const tower=g=>g.state.buildings.find(b=>b.type==='watchtower');
function drive(g,n,fn){for(let i=0;i<n;i++){g.state.time+=.1;g.navBudget=50;for(const u of g.state.units)if(u.militia){guardDutyAI(g,u,.1);g.combatAI(u,.1);}fn?.();}}
test('armed adults man a watchtower, a fourth is refused, and crew speed its fire',()=>{
 const g=world(),t=tower(g);assert.ok(g.finished(t),'fixture tower is finished');
 const crew=[armed(g,18,6),armed(g,22,6),armed(g,20,8)],extra=armed(g,26,6);
 for(const u of crew)assert.equal(assignTowerGuard(g,u.id,t.id).accepted,true);
 const r=assignTowerGuard(g,extra.id,t.id);assert.equal(r.accepted,false);assert.match(r.reason,/full crew/);
 assert.equal(towerCrew(g,t),0,'nobody is at the tower yet');
 drive(g,400);assert.equal(towerCrew(g,t),3,'all three reached the tower and stay');assert.ok(crew.every(u=>u.workReason==='Manning a watchtower'));
 assert.ok(towerRateMultiplier(3)>towerRateMultiplier(0));
 assert.equal(assignTowerGuard(g,crew[0].id,t.id).accepted,true,'re-assigning your own post is allowed');
});
test('crew survive save and load; destroyed tower releases them; non-militia cannot man',()=>{
 const g=world(),t=tower(g),a=armed(g,18,6),w=g.spawnUnit('worker',19,6,0);
 assert.equal(assignTowerGuard(g,w.id,t.id).accepted,false);assert.equal(assignTowerGuard(g,a.id,t.id).accepted,true);
 const r=decodeGame(encodeGame(g));assert.equal(r.state.guardDuties[0].kind,'tower');assert.equal(r.state.guardDuties[0].buildingId,t.id);assert.ok(validGuardDuties(r.state));
 t.hp=0;g.state.buildings=g.state.buildings.filter(b=>b!==t);tickGuardDuties(g);assert.equal(g.state.guardDuties.length,0);
});
test('manned tower shoots sooner than an unmanned one against the same foe',()=>{
 const run=(manned)=>{const g=world(),t=tower(g);if(manned){for(const p of [[18,6],[22,6]]){const u=armed(g,p[0],p[1]);assignTowerGuard(g,u.id,t.id);}drive(g,300);}
  const foe=g.spawnUnit('spearman',20,-10,3);foe.y=4;foe.order='hold';foe.hp=foe.maxHp=1e6;let shots=0;const f=g.fireArrow.bind(g);g.fireArrow=(a,b)=>{if(a===t)shots++;return f(a,b);};
  t.cd=0;for(let i=0;i<150;i++){g.state.time+=.1;g.updateTowers(.1);}return shots;};
 assert.ok(run(true)>run(false),'crew raise fire rate');
});
