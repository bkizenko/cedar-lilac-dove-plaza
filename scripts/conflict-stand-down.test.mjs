import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {secureVillage,tickOccupation,occupationActorAI,integrateOccupiedVillage,tickConflictStandDown,CONFLICT_RULES} from '../src/game/conflictIntent.ts';
import {acceptPrisonerSurrender,prisonerAI,releasePrisoner} from '../src/game/captivity.ts';

function fixture(){const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1),g.makeBld('hut',95,38,1)];g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();
 return{g,hall:g.state.buildings[1]};}
function drive(g,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units){if(u.hp<=0)continue;if(prisonerAI(g,u,.1))continue;occupationActorAI(g,u,.1);}tickOccupation(g,.1);}}
const militia=(g,x,z)=>{const u=g.spawnUnit('worker',x,z,0);u.militia=true;u.range=1;u.dmg=6;return u;};

test('integrating a held village releases its garrison: militia stand down instead of holding forever',()=>{
 const {g,hall}=fixture();const guard=militia(g,74,44);guard.selected=true;assert.equal(secureVillage(g,hall.id).accepted,true);
 drive(g,CONFLICT_RULES.controlHoldSeconds+15);const control=g.state.occupations[0];assert.equal(control.phase,'held');
 assert.equal(integrateOccupiedVillage(g,control.id).accepted,true);
 const u=g.state.units.find(p=>p.id===guard.id);assert.equal(u.conflictIntent,undefined);assert.equal(u.demobilizing,true);assert.equal(u.recalled,true);
});
test('a prisoner guard stands down once the last person in their custody is released; ongoing custody keeps its guard',()=>{
 const {g}=fixture();const guard=militia(g,72,52),a=g.spawnUnit('worker',74,52,1),b=g.spawnUnit('worker',74.5,52,1);
 assert.equal(acceptPrisonerSurrender(g,a,0).accepted,true);assert.equal(acceptPrisonerSurrender(g,b,0).accepted,true);drive(g,60);
 assert.equal(a.prisoner.phase,'custody');releasePrisoner(g,a.id);drive(g,2);assert.notEqual(guard.demobilizing,true,'still guarding the second person');
 releasePrisoner(g,b.id);drive(g,2);assert.equal(guard.demobilizing,true,'duty over: back to work');
});
test('orphaned occupation or garrison marks are swept so soldiers return to useful work',()=>{
 const {g}=fixture();const a=militia(g,10,40),b=g.spawnUnit('spearman',12,40,0);a.conflictIntent='occupy';b.conflictIntent='dominate';g.state.occupations=[{id:g.id(),hallId:g.state.buildings[1].id,formerTeam:1,controllerTeam:0,buildingIds:[g.state.buildings[1].id],residentIds:[],guardIds:[a.id],phase:'withdrawn',holdSeconds:0,createdAt:0}];a.order='hold';b.order='hold';
 tickConflictStandDown(g);assert.equal(a.conflictIntent,undefined);assert.equal(b.conflictIntent,undefined);assert.equal(a.demobilizing,true);assert.equal(b.recalled,true);assert.equal(b.stationOnArrival,true,'professional soldiers report back to their station');
 assert.ok(g.state.conflictJournal.totals['stood_down:0']>=2);
});
