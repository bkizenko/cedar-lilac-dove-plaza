import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {secureVillage,tickOccupation,occupationActorAI,dominateOccupiedVillage,validConflictIntentState,CONFLICT_RULES} from '../src/game/conflictIntent.ts';
import {prisonerAI} from '../src/game/captivity.ts';
import {dominations,dominationStatus,releaseDomination,reinforceDomination,refoundSociety,validDominationState,DOMINATION_RULES} from '../src/game/domination.ts';
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

test('holding a village as a tributary keeps its buildings, residents and ownership; guards become its garrison',()=>{
 const {g,hall,hut,residents,control,d,guards}=dominated();
 assert.equal(control.phase,'dominated');assert.equal(hall.team,1);assert.equal(hut.team,1);assert.equal(hall.hp,hall.maxHp);for(const u of residents)assert.equal(u.team,1);
 for(const u of guards)assert.equal(u.conflictIntent,'dominate');assert.equal(d.phase,'active');assert.equal(g.tribe(1).hostile,false,'terms bring a truce');
 drive(g,5);assert.ok(dominationStatus(g,d.id).leverage>=1,'present garrison is the leverage');
 assert.equal(dominateOccupiedVillage(g,control.id,'tribute').accepted,false,'cannot be dominated twice');
});
test('obligations accrue and a subject resident carries real wood to the overlord; conserved through save/reload',()=>{
 let {g,d}=dominated();g.tribe(1).wood=30;const total=wood(g),ours=g.tribe(0).wood;
 drive(g,DOMINATION_RULES.terms.tribute.intervalSeconds+2);d=dominations(g)[0];assert.ok(d.obligation.owed+d.obligation.paid>=10);assert.equal(wood(g),total);
 for(let i=0;i<60&&dominations(g)[0].carry?.phase!=='deliver';i++)drive(g,1);
 assert.equal(dominations(g)[0].carry.phase,'deliver');const carrier=g.state.units.find(u=>u.id===dominations(g)[0].carry.unitId);assert.equal(carrier.team,1);assert.equal(carrier.carryType,'wood');
 g=reload(g);assert.equal(wood(g),total,'in transit across save/reload');assert.equal(validDominationState(JSON.parse(JSON.stringify(encodeGame(g))).state),true);
 for(let i=0;i<120&&dominations(g)[0].obligation.paid<10;i++)drive(g,1);
 d=dominations(g)[0];assert.equal(d.obligation.paid,10);assert.equal(g.tribe(0).wood,ours+10);assert.equal(wood(g),total);
});
test('tribute lapses without leverage: obligations forgiven, garrison stands down, village untouched',()=>{
 const {g,d,guards,hall}=dominated();guards[0].militia=true;guards[0].type='worker';
 for(const u of guards){u.x=-200;u.z=0;}drive(g,DOMINATION_RULES.lapseSeconds/2);
 for(const u of guards){u.x=-200;u.z=0;}
 assert.equal(d.phase,'active');assert.ok(d.leverageLowSeconds>0);
 for(let i=0;i<DOMINATION_RULES.lapseSeconds;i++){for(const u of guards){u.x=-200;u.z=0;}drive(g,1);if(d.phase!=='active')break;}
 assert.equal(d.phase,'lapsed',d.reason);assert.equal(d.obligation.owed,0);assert.deepEqual(d.garrisonIds,[]);
 assert.equal(guards[0].conflictIntent,undefined);assert.equal(guards[0].demobilizing,true,'militia return weapons and go back to work');assert.equal(hall.team,1);assert.equal(hall.hp,hall.maxHp);
});
test('reinforcing restores leverage before the lapse',()=>{
 const {g,d,guards}=dominated();for(const u of guards)u.hp=0;drive(g,30);assert.ok(d.leverageLowSeconds>=29);
 const fresh=[0,1].map(i=>g.spawnUnit('spearman',80+i,42,0));assert.equal(reinforceDomination(g,d.id,fresh.map(u=>u.id)),2);drive(g,40);assert.equal(d.leverageLowSeconds,0);assert.equal(d.phase,'active');
});
test('unanswered threats and defaults with an absent overlord end in rebellion; a wiped-out society refounds from it',()=>{
 const {g,d,guards}=dominated();g.tribe(1).wood=0;for(const u of guards)u.hp=0;
 const raiders=[0,1].map(i=>{const u=g.spawnUnit('spearman',84+i,30,3);u.order='hold';return u;});
 g.tribe(1).alive=false;// its other communities are gone; this one still stands
 for(let i=0;i<DOMINATION_RULES.lapseSeconds&&d.phase==='active';i++)drive(g,1);
 assert.equal(d.phase,'rebelled',d.reason);assert.equal(g.tribe(1).hostile,true);assert.equal(g.tribe(1).alive,true,'refounded');void raiders;
});
test('autonomy needs no garrison; release ends obligations; corrupted or old saves handled',()=>{
 const {g,d,guards}=dominated('autonomy');assert.deepEqual(d.garrisonIds,[]);for(const u of guards)assert.equal(u.conflictIntent,undefined);
 assert.equal(releaseDomination(g,d.id),true);assert.equal(d.phase,'released');assert.equal(releaseDomination(g,d.id),false);
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));assert.equal(validConflictIntentState(raw.state),true);
 const bad=structuredClone(raw.state);bad.dominations.list[0].resistance=101;assert.equal(validDominationState(bad),false);
 const bad2=structuredClone(raw.state);bad2.dominations.list[0].obligation.owed=5;assert.equal(validDominationState(bad2),false,'ended arrangements owe nothing');
 const old=structuredClone(raw.state);delete old.dominations;assert.equal(validDominationState(old),true);
});
test('G5: no living rivals does not end the game; a society only refounds from real surviving members',()=>{
 const {g}=fixture();for(const u of g.state.units)u.hp=0;g.state.units=g.state.units.filter(u=>u.team===0);
 for(const t of g.state.tribes)if(t.id!==0&&t.id!==3){t.alive=false;t.fallenT=0;}
 assert.equal(refoundSociety(g,1,'test'),false,'nobody left to refound');
 g.spawnUnit('worker',4,30,0);g.started=true;g.seaT=1e9;for(let i=0;i<50;i++)g.step(.1);assert.deepEqual(g.simulationErrors??[],[]);assert.ok(g.state.time>=4.9,'simulation continues');
 g.spawnUnit('worker',90,40,1);assert.equal(refoundSociety(g,1,'survivors gathered'),true);assert.equal(g.tribe(1).alive,true);
});
