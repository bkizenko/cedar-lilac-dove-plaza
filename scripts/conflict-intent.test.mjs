import {syncHaulageProjects,validHaulageProjects} from '../src/game/haulage.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {validConflictJournal} from '../src/game/conflictMetrics.ts';
import {captureTarget,captureIntentAI,secureVillage,tickOccupation,occupationActorAI,withdrawOccupation,missionMayTargetBuilding,missionMayTargetCivilian,integrateOccupiedVillage,occupationStatus,validConflictIntentState,releaseConflictAssignment,CONFLICT_RULES} from '../src/game/conflictIntent.ts';
import {acceptPrisonerSurrender,prisonerAI,provisionPrisoner,releasePrisoner,prisonerIndependentNeeds,validPrisonerState,assignPrisonerGuard,PRISONER_RULES} from '../src/game/captivity.ts';
function fixture(){const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1),g.makeBld('hut',95,38,1),g.makeBld('townhall',200,38,1)];g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();return {g,home:g.state.buildings[0],hall:g.state.buildings[1],hut:g.state.buildings[2],distant:g.state.buildings[3]};}
function drive(g,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units){if(prisonerAI(g,u,.1))continue;captureIntentAI(g,u,.1);occupationActorAI(g,u,.1);}tickOccupation(g,.1);}}
test('contextual capture physically approaches a living adult and preserves identity, wounds and belongings without forced labor',()=>{
 const {g}=fixture(),guard=g.spawnUnit('spearman',5,52,0),target=g.spawnUnit('worker',70,52,1);guard.selected=true;target.hp=17;target.parents=[41,42];target.carry=3;target.carryType='wood';
 const people=g.state.units.length,originFood=g.tribe(1).food,ours=g.tribe(0).food;
 assert.equal(captureTarget(g,target.id).accepted,true);captureIntentAI(g,guard,.1);assert.equal(target.team,1,'distant order does not capture remotely');
 drive(g,35);assert.equal(target.team,0);assert.equal(target.enslavedFrom,undefined);assert.equal(target.prisoner.originTeam,1);
 assert.equal(target.hp,17);assert.deepEqual(target.parents,[41,42]);assert.equal(target.carry,3);assert.equal(g.state.units.length,people);
 assert.equal(g.tribe(1).food,originFood);assert.equal(g.tribe(0).food,ours,'escort does not consume either distant store');
 drive(g,45);assert.equal(target.prisoner.phase,'custody');prisonerAI(g,target,10);assert.equal(target.order,'hold');assert.equal(target.job,null);
});
test('surrender requires nearby force and finite guard capacity, not a lethal hit or global army ratio',()=>{
 const {g}=fixture(),guard=g.spawnUnit('spearman',72,52,0),targets=[0,1,2,3].map(i=>g.spawnUnit('worker',74+i*.1,52,1));
 for(const target of targets.slice(0,PRISONER_RULES.guardCapacity))assert.equal(acceptPrisonerSurrender(g,target).accepted,true);
 assert.equal(acceptPrisonerSurrender(g,targets[3]).accepted,false);assert.equal(targets[3].team,1);
 const far=g.spawnUnit('worker',200,52,1);assert.equal(acceptPrisonerSurrender(g,far).accepted,false);
 guard.hp=0;drive(g,31);assert.equal(targets[0].team,1);assert.equal(targets[0].prisoner.phase,'released');assert.equal(targets[0].enslavedFrom,undefined);
});
test('only physically carried food and water provision escort; release retains remaining supplies for the walk home',()=>{
 const {g}=fixture(),guard=g.spawnUnit('spearman',72,52,0),target=g.spawnUnit('worker',74,52,1);g.state.survivalVersion=1;
 for(const tribe of g.state.tribes)tribe.survival={waterLiters:50,waterConsumedLiters:0,waterDeliveredLiters:0,waterLostLiters:0,fuelBurnedWood:0,waterShortageSeconds:0,coldExposurePersonSeconds:0};
 assert.equal(acceptPrisonerSurrender(g,target).accepted,true);guard.carry=6;guard.carryType='food';guard.waterWork={sourceX:72,sourceZ:52,bankX:72,bankZ:52,phase:'returning',progressSeconds:0,liters:2};
 const ours=g.tribe(0).food,theirs=g.tribe(1).food;
 assert.equal(provisionPrisoner(g,target.id,guard.id),true);assert.equal(guard.carry,0);assert.equal(guard.waterWork.liters,0);assert.equal(target.prisoner.food,6);assert.equal(target.prisoner.waterLiters,2);
 assert.equal(releasePrisoner(g,target.id),true);assert.equal(target.prisoner.phase,'released');assert.equal(target.team,1);assert.equal(prisonerIndependentNeeds(target),true);
 drive(g,30);assert.equal(target.prisoner,undefined);assert.ok(g.tribe(1).food>theirs);assert.equal(g.tribe(0).food,ours);assert.equal(g.state.units.length,2);
});
test('secure-village control requires real arrival and hold while preserving local and distant assets, residents and stocks',()=>{
 const {g,hall,hut,distant}=fixture(),guard=g.spawnUnit('spearman',0,52,0),resident=g.spawnUnit('worker',90,52,1),farResident=g.spawnUnit('worker',205,52,1);guard.selected=true;resident.homeHall=hall.id;farResident.homeHall=distant.id;
 const hp=hall.hp,hutHp=hut.hp,wood=g.tribe(1).wood,food=g.tribe(0).food;
 assert.equal(secureVillage(g,hall.id).accepted,true);tickOccupation(g,CONFLICT_RULES.controlHoldSeconds+1);const control=g.state.occupations[0];assert.notEqual(control.phase,'held','remote troops confer no control');
 assert.equal(missionMayTargetBuilding(g,guard,hall),false);assert.equal(missionMayTargetBuilding(g,guard,hut),false);assert.equal(missionMayTargetCivilian(g,guard,resident),false);
 drive(g,90);assert.equal(control.phase,'held');assert.equal(hall.hp,hp);assert.equal(hut.hp,hutHp);assert.equal(hall.team,1,'control is distinct from legal annexation');assert.equal(g.tribe(1).alive,true);
 assert.equal(g.tribe(1).wood,wood);assert.equal(g.tribe(0).food,food);assert.equal(resident.team,1);assert.equal(farResident.team,1);
 assert.equal(control.buildingIds.includes(distant.id),false);assert.equal(control.residentIds.includes(farResident.id),false);
 assert.equal(withdrawOccupation(g,control.id),true);tickOccupation(g,50);assert.equal(control.phase,'withdrawn');assert.equal(guard.order,'return');assert.equal(hall.hp,hp);
});
test('local defenders contest control and a departed garrison loses its held status',()=>{
 const {g,hall}=fixture(),guard=g.spawnUnit('spearman',72,50,0),defender=g.spawnUnit('spearman',85,50,1);guard.selected=true;assert.equal(secureVillage(g,hall.id).accepted,true);
 tickOccupation(g,50);const control=g.state.occupations[0];assert.equal(control.phase,'contested');assert.match(control.blockedReason,/defenders/);
 defender.hp=0;tickOccupation(g,CONFLICT_RULES.controlHoldSeconds);assert.equal(control.phase,'held');guard.x=0;tickOccupation(g,1);assert.equal(control.phase,'contested');assert.equal(control.holdSeconds,0);
});

test('accepting held local surrender transfers only that village intact and preserves paid work, people and distant stores',()=>{
 const {g,hall,hut,distant}=fixture(),guard=g.spawnUnit('spearman',72,50,0),resident=g.spawnUnit('worker',90,52,1),farResident=g.spawnUnit('worker',205,52,1);guard.selected=true;resident.homeHall=hall.id;farResident.homeHall=distant.id;resident.name='Nara';resident.parents=[41,42];resident.hp=19;resident.carry=7;resident.carryType='wood';
 resident.haulageWork={kind:'sled',progress:17,duration:90,workplace:hall.id,paused:true};syncHaulageProjects(g);const project=g.state.haulageProjects[0],projectId=project.id;
 const ours=g.tribe(0).wood,theirs=g.tribe(1).wood,food=g.tribe(0).food,hp=hall.hp;
 assert.equal(secureVillage(g,hall.id).accepted,true);assert.equal(integrateOccupiedVillage(g,g.state.occupations[0].id).accepted,false);
 tickOccupation(g,CONFLICT_RULES.controlHoldSeconds);const control=g.state.occupations[0];assert.equal(occupationStatus(g,control.id).accepted,true);
 assert.equal(integrateOccupiedVillage(g,control.id).accepted,true);assert.equal(control.phase,'integrated');assert.equal(hall.team,0);assert.equal(hut.team,0);assert.equal(hall.hp,hp);assert.equal(distant.team,1);
 assert.equal(resident.team,0);assert.equal(resident.name,'Nara');assert.deepEqual(resident.parents,[41,42]);assert.equal(resident.hp,19);assert.equal(resident.carry,7);assert.equal(resident.enslavedFrom,undefined);assert.equal(farResident.team,1);assert.equal(g.tribe(1).alive,true);
 assert.equal(project.team,0);assert.equal(project.id,projectId);assert.equal(project.work.progress,17);assert.equal(project.actorId,null);assert.equal(project.work.paused,true);
 assert.equal(g.tribe(0).wood,ours);assert.equal(g.tribe(1).wood,theirs);assert.equal(g.tribe(0).food,food);
 assert.equal(integrateOccupiedVillage(g,control.id).accepted,false,'cannot transfer twice');assert.equal(validHaulageProjects(g.state),true);
 const copy=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(copy.state.haulageProjects[0].team,0);assert.equal(copy.state.units.find(u=>u.id===resident.id).name,'Nara');
});
test('occupying troops can defend against an actively attacking worker while protecting uninvolved civilians',()=>{
 const {g,hall}=fixture(),guard=g.spawnUnit('spearman',72,50,0),worker=g.spawnUnit('worker',75,50,1);guard.selected=true;secureVillage(g,hall.id);
 assert.equal(missionMayTargetCivilian(g,guard,worker),false);worker.order='attack';worker.target=guard;
 assert.equal(missionMayTargetCivilian(g,guard,worker),true);assert.equal(missionMayTargetBuilding(g,guard,hall),false);
 worker.order='return';assert.equal(missionMayTargetCivilian(g,guard,worker),false);
});
test('custody, contextual intent and local control survive JSON with separate corruption validation',()=>{
 const {g,hall}=fixture(),guard=g.spawnUnit('spearman',72,50,0),target=g.spawnUnit('worker',74,52,1),garrison=g.spawnUnit('spearman',70,50,0);
 assert.equal(acceptPrisonerSurrender(g,target).accepted,true);garrison.selected=true;secureVillage(g,hall.id);tickOccupation(g,10);
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));assert.equal(validPrisonerState(raw.state),true);assert.equal(validConflictIntentState(raw.state),true);assert.equal(validConflictJournal(raw.state.conflictJournal),true);
 const copy=decodeGame(raw),prisoner=copy.state.units.find(u=>u.id===target.id);assert.equal(prisoner.prisoner.originTeam,1);assert.equal(prisoner.prisoner.guardId,guard.id);assert.equal(copy.state.occupations[0].hallId,hall.id);assert.equal(copy.state.occupations[0].holdSeconds,10);
 const bad=structuredClone(raw.state);bad.units.find(u=>u.id===target.id).prisoner.food=-1;assert.equal(validPrisonerState(bad),false);
 const duplicate=structuredClone(raw.state);duplicate.occupations.push({...duplicate.occupations[0],id:99999});assert.equal(validConflictIntentState(duplicate),false);
 const journal=structuredClone(raw.state.conflictJournal);journal.totals['context_order:0:garbage']=1;assert.equal(validConflictJournal(journal),false);
});
test('a new explicit guard order releases custody assignment instead of being stolen back; replacement guard joins physically',()=>{
 const {g}=fixture(),guard=g.spawnUnit('spearman',72,50,0),target=g.spawnUnit('worker',74,52,1),replacement=g.spawnUnit('spearman',0,52,0);
 assert.equal(acceptPrisonerSurrender(g,target).accepted,true);releaseConflictAssignment(g,guard);guard.escortId=undefined;guard.order='move';guard.tx=0;guard.tz=52;
 assert.equal(prisonerAI(g,guard,.1),false);assert.equal(target.prisoner.guardId,undefined);
 assert.equal(assignPrisonerGuard(g,target.id,replacement.id).accepted,true);assert.equal(target.prisoner.guardId,replacement.id);assert.ok(Math.hypot(target.x-replacement.x,target.z-replacement.z)>18);
 prisonerAI(g,target,1);assert.equal(target.prisoner.unguardedSeconds,1,'distant designation does not provide remote protection');
});
test('custody protection prevents the parties attacking their own surrendered person without global invulnerability',()=>{
 const {g}=fixture(),guard=g.spawnUnit('spearman',72,50,0),target=g.spawnUnit('worker',74,52,1),rescuer=g.spawnUnit('spearman',90,52,1),thirdParty=g.spawnUnit('spearman',100,52,3);
 rescuer.x=200;assert.equal(acceptPrisonerSurrender(g,target).accepted,true);
 assert.equal(missionMayTargetCivilian(g,guard,target),false);assert.equal(missionMayTargetCivilian(g,rescuer,target),false);assert.equal(missionMayTargetCivilian(g,thirdParty,target),true);
});
test('Auto work toggles and labor proposals preserve occupying militia and custody guards',()=>{
 const {g,hall}=fixture(),garrison=g.spawnUnit('worker',72,50,0),escort=g.spawnUnit('spearman',65,52,0),person=g.spawnUnit('worker',67,52,1);garrison.militia=true;garrison.selected=true;assert.equal(secureVillage(g,hall.id).accepted,true);tickOccupation(g,CONFLICT_RULES.controlHoldSeconds);
 assert.equal(acceptPrisonerSurrender(g,person).accepted,true);const guard=g.state.units.find(u=>u.id===person.prisoner.guardId);const before={intent:garrison.conflictIntent,order:garrison.order,node:garrison.node,guardId:person.prisoner.guardId,escortId:guard.escortId,guardOrder:guard.order};
 g.setAutoWork(true);g.setAutoWork(false);g.workBoard.assign(g,garrison);g.workBoard.assign(g,guard);
 assert.deepEqual({intent:garrison.conflictIntent,order:garrison.order,node:garrison.node,guardId:person.prisoner.guardId,escortId:guard.escortId,guardOrder:guard.order},before);assert.equal(g.state.occupations[0].phase,'held');
});

test('concealed wounded non-defenders cannot indefinitely project hall control; healthy shelter defenders still contest',()=>{
 const {g,hall}=fixture(),guard=g.spawnUnit('spearman',70,45,0),defender=g.spawnUnit('spearman',80,45,1);guard.selected=true;assert.equal(secureVillage(g,hall.id).accepted,true);const c=g.state.occupations[0];
 defender.hp=defender.maxHp*.2;defender.shelterId=hall.id;defender.emergency={until:100,defending:false,autoArmed:false,job:null,jobLock:false};defender.order='hold';const spot=g.interactionSpot(defender,hall);assert.ok(spot);defender.x=spot.x;defender.z=spot.z;
 tickOccupation(g,31);assert.equal(c.phase,'held');defender.hp=defender.maxHp*.5;tickOccupation(g,1);assert.equal(c.phase,'contested');defender.hp=defender.maxHp*.2;defender.order='attack';defender.target=guard;tickOccupation(g,1);assert.equal(c.phase,'contested');
});
