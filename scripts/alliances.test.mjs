import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {tickOccupation,occupationActorAI,validConflictIntentState} from '../src/game/conflictIntent.ts';
import {prisonerAI} from '../src/game/captivity.ts';
import {activePact,alliesOf,validAllianceState,ALLIANCE_RULES} from '../src/game/alliances.ts';
import {declareSocietyHostility,agreeSocietyTruce} from '../src/game/societyRelations.ts';

function fixture({enemyKnown=true}={}){const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 g.state.buildings=[g.makeBld('townhall',-200,38,0),g.makeBld('townhall',80,38,1),g.makeBld('townhall',0,38,2),g.makeBld('townhall',200,-100,4)];g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();
 agreeSocietyTruce(g,1,2);for(const r of g.state.societyRelations){if((r.from===1&&r.to===2)||(r.from===2&&r.to===1)){r.known=true;r.trust=.7;}}
 declareSocietyHostility(g,1,4);if(enemyKnown)declareSocietyHostility(g,2,4);else{declareSocietyHostility(g,2,5);}
 for(let i=0;i<4;i++){const u=g.spawnUnit('worker',84+i,46,1);u.order='hold';u.homeHall=g.state.buildings[1].id;}
 const guards=[0,1,2,3].map(i=>{const u=g.spawnUnit('spearman',2+i,46,2);u.order='hold';return u;});
 g.state.time=ALLIANCE_RULES.reviewSeconds+1;return{g,hall:g.state.buildings[1],guards};}
function drive(g,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units){if(u.hp<=0)continue;if(prisonerAI(g,u,.1))continue;if(occupationActorAI(g,u,.1))continue;}tickOccupation(g,.1);}}

test('a pact forms only from mutual trust and a shared enemy each side already knows',()=>{
 const {g}=fixture();drive(g,2);assert.ok(activePact(g,1,2),'trusting partners at war with the same enemy ally');assert.deepEqual(alliesOf(g,1),[2]);
 const other=fixture({enemyKnown:false});drive(other.g,2);assert.equal(activePact(other.g,1,2),undefined,'no shared enemy: no pact');
});
test('when an ally community is entered by armed enemies the partner sends real relief that walks there, keeping a home guard',()=>{
 const {g,hall,guards}=fixture();drive(g,2);
 const raiders=[0,1,2].map(i=>{const u=g.spawnUnit('spearman',78+i,40,4);u.order='hold';return u;});
 drive(g,2);const pact=activePact(g,1,2);assert.ok(pact.relief.length>=1&&pact.relief.length<=guards.length-ALLIANCE_RULES.homeGuard,'relief keeps a home guard');
 const marcher=g.state.units.find(u=>u.id===pact.relief[0].unitId);const start=Math.hypot(marcher.x-hall.x,marcher.z-hall.z);
 drive(g,25);const now=Math.hypot(marcher.x-hall.x,marcher.z-hall.z);assert.ok(now<start-20,`relief physically marched (${start.toFixed(0)}→${now.toFixed(0)})`);
 const front=g.state.capitulation.fronts.find(f=>f.hallId===hall.id&&f.attackerTeam===4);assert.ok(front,'the community is under pressure');
 assert.ok(front.unrelievedSeconds<25,'allied relief is measured as relief');
 void raiders;
});
test('allies join the war against the attacker of their partner',()=>{
 const {g}=fixture();drive(g,2);g.spawnUnit('spearman',79,40,5).order='hold';declareSocietyHostility(g,5,1);drive(g,2);
 assert.equal(g.isFoe(2,5),true,'partner declared on the attacker');
});
test('a pact breaks on hostility between partners; relief stands down; saves validate and old saves load',()=>{
 const {g}=fixture();drive(g,2);for(let i=0;i<2;i++)g.spawnUnit('spearman',78+i,40,4).order='hold';drive(g,2);
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));assert.equal(validAllianceState(raw.state),true);assert.equal(validConflictIntentState(raw.state),true);
 const copy=decodeGame(raw);assert.ok(activePact(copy,1,2));
 const pact=activePact(g,1,2),ids=pact.relief.map(r=>r.unitId);declareSocietyHostility(g,1,2);g.state.alliances.nextReviewAt=0;drive(g,2);
 assert.equal(pact.phase,'broken');assert.deepEqual(pact.relief,[]);for(const id of ids)assert.equal(g.state.units.find(u=>u.id===id).recalled,true);
 const bad=structuredClone(raw.state);bad.alliances.pacts.push({...bad.alliances.pacts[0],id:999999});assert.equal(validAllianceState(bad),false);
 const old=structuredClone(raw.state);delete old.alliances;assert.equal(validAllianceState(old),true);
});
