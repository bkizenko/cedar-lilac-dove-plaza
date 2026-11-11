import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {tickOccupation,occupationActorAI,validConflictIntentState} from '../src/game/conflictIntent.ts';
import {prisonerAI} from '../src/game/captivity.ts';
import {chooseWarGoal,WAR_GOAL_RULES} from '../src/game/rivalWarGoals.ts';
import {declareSocietyHostility} from '../src/game/societyRelations.ts';
import {dominations} from '../src/game/domination.ts';

// Seed 123456 personalities: team 2 boldness 1.24 (holds), team 1 boldness 1.08 (presses for tribute).
function fixture(attacker,defender){const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 const hall=g.makeBld('townhall',80,38,defender),hut=g.makeBld('hut',95,38,defender);g.state.buildings=[g.makeBld('townhall',-200,38,0),hall,hut,g.makeBld('townhall',-80,38,attacker)];
 for(const b of g.state.buildings){b.build=1;b.hp=b.maxHp;}g.vision.fill(2);g.rebuildWalk();declareSocietyHostility(g,attacker,defender);
 for(const t of [attacker,defender])g.tribe(t).food=5000;
 const residents=[0,1,2,3,4,5].map(i=>{const u=g.spawnUnit('worker',86+i,46,defender);u.homeHall=hall.id;u.order='hold';return u;});
 const defenders=[0,1].map(i=>{const u=g.spawnUnit('spearman',82+i,46,defender);u.homeHall=hall.id;u.order='hold';return u;});
 const party=[0,1,2,3,4,5].map(i=>{const u=g.spawnUnit('spearman',60+i*.5,44,attacker);u.order='hold';return u;});
 return{g,hall,hut,residents,defenders,party};}
function drive(g,s){for(let i=0;i<s*10;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units){if(u.hp<=0)continue;if(prisonerAI(g,u,.1))continue;occupationActorAI(g,u,.1);}tickOccupation(g,.1);}}
const front=(g,a)=>g.state.capitulation.fronts.find(f=>f.attackerTeam===a);

test('a bold, dominant party switches in the field to holding the village intact and the surrender ends as an occupation',()=>{
 const {g,hall,hut,defenders,residents,party}=fixture(2,1);for(const u of party)assert.equal(u.conflictIntent,undefined,'no departure goal');
 drive(g,WAR_GOAL_RULES.reviewSeconds+2);assert.equal(front(g,2).goal,undefined,'not while local defenders keep the ratio down');
 for(const d of defenders)d.hp=0;drive(g,WAR_GOAL_RULES.reviewSeconds+2);const f=front(g,2);assert.equal(f.goal,'hold');
 const control=g.state.occupations.find(c=>c.controllerTeam===2&&c.hallId===hall.id);assert.ok(control);for(const u of party)assert.equal(u.conflictIntent,'occupy');
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));assert.equal(validConflictIntentState(raw.state),true);decodeGame(raw);
 residents[0].hp=0;residents[1].hp=0;drive(g,200);
 assert.ok(['accepted'].includes(f.phase),f.phase+': '+f.reason);assert.equal(f.outcome,'occupy');
 assert.equal(hall.team,1);assert.equal(hall.hp,hall.maxHp,'held intact, not burned');assert.equal(hut.hp,hut.maxHp);
});
test('a less bold, uncrowded society presses for tribute instead; a hungry one only wants loot',()=>{
 const {g,defenders,residents}=fixture(1,2);assert.equal(chooseWarGoal(g,1),'tribute');drive(g,2);for(const d of defenders)d.hp=0;drive(g,WAR_GOAL_RULES.reviewSeconds+2);
 const f=front(g,1);assert.equal(f.goal,'tribute');assert.equal((g.state.occupations||[]).filter(c=>c.controllerTeam===1).length,0,'no occupation for a tribute goal');
 residents[0].hp=0;residents[1].hp=0;residents[2].hp=0;drive(g,200);assert.equal(f.outcome,'tribute',f.reason+' '+JSON.stringify({s:f.score,t:f.threshold,c:f.casualties,l:f.lostArmed,u:f.unrelievedSeconds,r:f.ratio,n:f.residentIds.length,st:f.starvingSeconds}));assert.equal(dominations(g).length,1);
 const h=fixture(1,2);h.g.tribe(1).food=0;h.g.tribe(1).foodLots=undefined;assert.equal(chooseWarGoal(h.g,1),'loot');
});
