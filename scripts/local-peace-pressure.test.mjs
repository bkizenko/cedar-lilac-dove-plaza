import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {localPeacePressure} from '../src/game/localPeacePressure.ts';
import {peaceIssue,tickPeace} from '../src/game/peace.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

// Declared flat two-community fixture for local policy, not native-map evidence.
function fixture(){
 const g=new Game();g.reset(345,10);g.enterIsland();g.world.heights.fill(4);g.world.waterBodies=[];g.world.waterHeights=undefined;
 g.state.units=[];g.state.buildings=[g.makeBld('townhall',220,0,0),g.makeBld('townhall',0,0,1)];
 for(const k of ['trees','stones','forage','copper','iron','fish','wildlife'])g.state[k]=[];
 g.state.autoWorkEnabled=false;g.state.conflict='quiet';g.state.growthPolicy='stable';g.state.birthT=1e6;g.state.raidT=1e6;g.state.weatherT=1e6;g.state.visitorTimer=900;g.state.scoutTimer=900;g.calamityT=1e6;g.seaT=1e6;
 for(const t of g.state.tribes){t.thinkT=1e6;t.food=1000;t.foodLots={provisions:1000};t.survival.waterLiters=1000;}
 g.tribe(1).hostile=true;g.vision.fill(2);g.state.contacts=[1];
 for(let i=0;i<5;i++){const u=g.spawnUnit('worker',8+i,10,1);u.order='hold';u.jobLock=true;}
 const u=g.spawnUnit('worker',210,0,0);u.order='hold';u.jobLock=true;const observer=g.spawnUnit('worker',-20,0,0);observer.order='hold';observer.jobLock=true;g.rebuildWalk();return g;
}
function army(g,x=30,z=10,n=8){return Array.from({length:n},(_,i)=>{const u=g.spawnUnit('spearman',x+i%3,z+Math.floor(i/3),0);u.order='hold';return u;});}
test('unseen remote military births, injuries and deaths cannot create a peace proposal or annexation leverage',()=>{
 const g=fixture();const before=localPeacePressure(g,1);const remote=army(g,220,20,80);
 assert.deepEqual(localPeacePressure(g,1),before);remote[0].hp=1;remote[1].hp=0;assert.deepEqual(localPeacePressure(g,1),before);
 tickPeace(g);assert.equal(g.state.diplomaticMessages?.some(m=>m.kind==='peaceOffer')||false,false);assert.match(peaceIssue(g,1,'annexation'),/witnessed military pressure/);
});
test('a locally witnessed armed force creates dated terms without remotely broadcasting them; strict saves preserve it',()=>{
 const g=fixture();army(g);const report=localPeacePressure(g,1);assert.equal(report.observedAttackers,8);assert.equal(report.localDefenders,5);assert.equal(report.defensePower,1.25);assert.equal(report.pressure,6.4);
 assert.equal(peaceIssue(g,1,'annexation'),null);tickPeace(g);const message=g.state.diplomaticMessages?.find(m=>m.kind==='peaceOffer');assert.ok(message);assert.equal(message.phase,'queued');assert.equal(g.tribe(1).peaceOffer,undefined);assert.equal(message.createdAt,g.state.time);
 const restored=decodeGame(encodeGame(g));assert.deepEqual(localPeacePressure(restored,1),report);assert.equal(restored.state.diplomaticMessages.find(m=>m.id===message.id).phase,'queued');
});
test('actual direct movement away removes current coercion without deleting already queued diplomatic history',()=>{
 const g=fixture(),force=army(g);tickPeace(g);const id=g.state.diplomaticMessages.find(m=>m.kind==='peaceOffer').id;
 g.clearSelect();for(const u of force)g.selectEntity(u,true);g.issueMove(220,35);
 for(let i=0;i<1200&&localPeacePressure(g,1).observedAttackers;i++){g.state.paused=false;g.step(.1);}
 assert.ok(force.every(u=>u.hp>0));assert.equal(localPeacePressure(g,1).pressure,0);assert.ok(force.every(u=>u.x>38),'the actual ordered bodies have walked away, rather than being deleted or reassigned');assert.ok(g.state.diplomaticMessages.some(m=>m.id===id));assert.match(peaceIssue(g,1,'annexation'),/witnessed military pressure/);
});
test('unarmed civilians and high remote cliffs do not count as an observed military threat',()=>{
 const g=fixture();for(let i=0;i<30;i++)g.spawnUnit('worker',30,10,0);assert.equal(localPeacePressure(g,1).pressure,0);
 const force=army(g);force.forEach(u=>u.y+=100);assert.equal(localPeacePressure(g,1).pressure,0);force.forEach(u=>{u.y-=100;u.hp=0;});assert.equal(localPeacePressure(g,1).pressure,0);
});
test('field encounters away from all communities and remote reinforcements do not change local leverage',()=>{
 const g=fixture(),remote=g.spawnUnit('worker',130,100,1);remote.order='hold';army(g,140,100);assert.equal(localPeacePressure(g,1).pressure,0);
 army(g);const local=localPeacePressure(g,1);for(let i=0;i<40;i++)g.spawnUnit('spearman',-200,-200,1);assert.deepEqual(localPeacePressure(g,1),local);
});
test('reading local pressure is a pure measured view, without simulation writes or random draws',()=>{
 const g=fixture();army(g);const before=JSON.stringify(encodeGame(g)),old=Math.random;let draws=0;
 try{Math.random=()=>{draws++;return .5;};for(let i=0;i<30;i++)assert.equal(localPeacePressure(g,1).pressure,6.4);}finally{Math.random=old;}
 assert.equal(draws,0);assert.equal(JSON.stringify(encodeGame(g)),before);
});
