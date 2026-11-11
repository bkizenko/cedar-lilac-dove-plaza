import test from 'node:test';import assert from 'node:assert/strict';
import {sailRigPhysicalIssue,beginSailRig} from '../src/game/boatSailing.ts';
import {hullServicePhysicalIssue,beginBoatService,boardRiverboat} from '../src/game/boats.ts';
import {SEA_EXPLORATION_ACTIVE_HULL_PHASES,seaExplorationOwnsBoat} from '../src/game/seaExplorationReservations.ts';
import {seaExplorationOwnsBoat as publicOwnsBoat} from '../src/game/seaExploration.ts';
function fixture(){const dock={id:4,team:1,type:'dock',x:0,z:0,hp:100,build:1},boat={id:7,team:1,dock:4,x:0,z:0,hp:200,hullClass:'freightPunt',capacity:8},crew={id:9,team:1,type:'worker',hp:100,x:8,z:0,order:'move',carry:0,seaExplorationId:13},stock={wood:100,stone:20,items:{cloth:20,cordage:20}},v={id:13,team:1,boatId:7,phase:'mustering'},messages=[];
 const g={state:{time:10,boats:[boat],units:[crew],buildings:[dock],haulageProjects:[],seaExploration:{version:1,teams:[],voyages:[v]},stock},finished:()=>true,tribe:()=>stock,banner:text=>messages.push(text),invalidateRoute(){},workBoard:{reset(){}}};return {g,dock,boat,crew,v,messages};}
test('walking sea crews reserve their actual hull against both paid service and rig admission',()=>{
 const f=fixture();assert.equal(f.crew.boat,undefined);const before=JSON.stringify(f.g.state);
 assert.match(sailRigPhysicalIssue(f.g,7,f.dock,1),/sea exploration/);assert.match(hullServicePhysicalIssue(f.g,7,f.dock,1),/sea exploration/);
 assert.equal(beginSailRig(f.g,7,4,1),false);assert.equal(beginBoatService(f.g,7,4,1),false);assert.equal(JSON.stringify(f.g.state),before,'rejection neither charges nor changes crew,hull,inventory or projects');
});
test('one shared active-phase predicate releases terminal and nonreserved hulls',()=>{
 const f=fixture();assert.equal(publicOwnsBoat,seaExplorationOwnsBoat,'public orchestration export is the same leaf function');
 for(const phase of SEA_EXPLORATION_ACTIVE_HULL_PHASES){f.v.phase=phase;assert.equal(seaExplorationOwnsBoat(f.g,7),true);assert.equal(seaExplorationOwnsBoat(f.g,999),false);}
 for(const phase of ['commission','ready','complete','failed','lost']){f.v.phase=phase;assert.equal(seaExplorationOwnsBoat(f.g,7),false);assert.equal(sailRigPhysicalIssue(f.g,7,f.dock,1),null);assert.equal(hullServicePhysicalIssue(f.g,7,f.dock,1),null);}
});
test('the reserved mission can still physically board its own nearby hull',()=>{
 const f=fixture();assert.equal(boardRiverboat(f.g,7,[f.crew],1,true),1);assert.deepEqual(f.crew.boat,{id:7,phase:'boarding'});assert.equal(f.crew.seaExplorationId,13);assert.equal(f.v.phase,'mustering');assert.equal(f.g.state.boats[0],f.boat);assert.equal(f.g.state.haulageProjects.length,0);
});
