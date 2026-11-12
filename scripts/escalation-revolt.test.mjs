import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {secureVillage,tickOccupation,occupationActorAI,dominateOccupiedVillage,validConflictIntentState,CONFLICT_RULES} from '../src/game/conflictIntent.ts';
import {prisonerAI} from '../src/game/captivity.ts';
import {annexDominated,annexIssue,dominations,dominationStatus,releaseDomination,reinforceDomination,refoundSociety,validDominationState,DOMINATION_RULES} from '../src/game/domination.ts';
import {tickStolenCargo,droppedParcels} from '../src/game/stolenCargo.ts';

function fixture(){const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1),g.makeBld('hut',95,38,1),g.makeBld('townhall',200,38,1)];g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();
 const hall=g.state.buildings[1],hut=g.state.buildings[2];
 const residents=[0,1,2,3].map(i=>{const u=g.spawnUnit('worker',86+i,46,1);u.homeHall=hall.id;u.order='hold';return u;});
 return{g,hall,hut,residents};}
function drive(g,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units){if(u.hp<=0)continue;if(prisonerAI(g,u,.1))continue;occupationActorAI(g,u,.1);}tickOccupation(g,.1);tickStolenCargo(g,.1);}}
const reload=g=>{const c=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));c.world.heights.fill(4);c.vision.fill(2);c.rebuildWalk();return c;};
function dominated(terms='tribute'){const s=fixture();const {g,hall}=s;s.guards=[0,1].map(i=>{const u=g.spawnUnit('spearman',74+i,44,0);u.selected=true;return u;});
 assert.equal(secureVillage(g,hall.id).accepted,true);drive(g,CONFLICT_RULES.controlHoldSeconds+15);const control=g.state.occupations[0];assert.equal(control.phase,'held');
 const r=dominateOccupiedVillage(g,control.id,terms);assert.equal(r.accepted,true,r.reason);s.control=control;s.d=dominations(g)[0];return s;}
const wood=g=>g.state.tribes.reduce((n,t)=>n+(t.wood||0),0)+g.state.units.reduce((n,u)=>n+(u.hp>0&&u.carryType==='wood'?u.carry:0),0)+droppedParcels(g).filter(p=>p.kind==='wood').reduce((n,p)=>n+p.amount,0);

import {acceptPrisonerSurrender} from '../src/game/captivity.ts';
test('a loyal, paid-up puppet held long enough can be annexed intact; too early or in arrears it cannot',()=>{
 const {g,d,hall,hut,residents}=dominated('puppet');drive(g,3);
 assert.match(annexIssue(g,d.id,0),/longer/);
 g.state.time+=DOMINATION_RULES.annexAfterSeconds+1;drive(g,1);d.obligation.owed=50;assert.match(annexIssue(g,d.id,0),/arrears/);d.obligation.owed=0;
 assert.equal(annexIssue(g,d.id,0),null);const hp=hall.hp;const r=annexDominated(g,d.id,0);assert.equal(r.accepted,true,r.reason);
 const h=g.state.buildings.find(b=>b.id===hall.id);assert.equal(h.team,0);assert.equal(h.hp,hp);assert.equal(g.state.buildings.find(b=>b.id===hut.id).team,0);
 for(const u of residents)assert.equal(g.state.units.find(x=>x.id===u.id).team,0);assert.equal(dominations(g).find(x=>x.id===d.id).phase,'released');
});
test('captives who clearly outnumber their guards rise together; a pair does not',()=>{
 const run=(n,guards)=>{const {g}=fixture();const gs=Array.from({length:guards},(_,i)=>g.spawnUnit('spearman',72+i*.3,52,0));const cs=Array.from({length:n},(_,i)=>{const u=g.spawnUnit('worker',74+i*.3,52,1);assert.equal(acceptPrisonerSurrender(g,u,0).accepted,true);return u;});
  drive(g,60);for(const c of cs)assert.equal(c.prisoner?.phase,'custody');drive(g,70);return{g,cs,gs};};
 const big=run(4,2);assert.ok(big.cs.every(c=>c.prisoner?.phase==='released'||!c.prisoner&&c.team===1),'the group broke out together and went home');assert.ok(big.gs.every(u=>u.demobilizing||u.recalled),'guards with nobody left stand down');assert.ok(big.g.state.conflictJournal.totals['captive_revolt:0']>=4);
 const small=run(2,1);assert.ok(small.cs.every(c=>c.prisoner?.phase==='custody'),'two captives do not revolt');
});
