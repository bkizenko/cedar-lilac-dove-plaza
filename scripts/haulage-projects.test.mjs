import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginHaulageWork,haulageWorkAI,pauseHaulageWork,resumeHaulageWork,resumeHaulageProject,syncHaulageProjects,reconcileHaulageProjects,haulageProjectDiagnostics,validHaulageProjects,WHEEL_PRACTICE} from '../src/game/haulage.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {workRuntime} from '../src/game/workRuntime.ts';
function fixture(){
 const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.weather='clear';g.clockState=()=>({period:'Afternoon'});
 g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('workshop',35,38,0)];g.state.units=[];
 const u=g.spawnUnit('worker',0,62,0),replacement=g.spawnUnit('worker',25,62,0);
 Object.assign(g.tribe(0),{wood:100,stone:50});g.vision.fill(2);g.rebuildWalk();return {g,u,replacement,hall:g.state.buildings[0],shop:g.state.buildings[1]};
}
function work(g,u,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=10;haulageWorkAI(g,u,.1);}}
const roundtrip=g=>decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
test('direct reassignment releases former resident; replacement walks and completes paid project after JSON save',()=>{
 let {g,u,replacement,hall}=fixture();assert.equal(beginHaulageWork(g,'sled',0,hall.id,u.id),true);work(g,u,25);
 const id=u.haulageWork.projectId,progress=u.haulageWork.progress,wood=g.tribe(0).wood,stone=g.tribe(0).stone;
 u.selected=true;g.assignJob('wood');
 assert.equal(u.haulageWork,undefined);assert.equal(g.state.haulageProjects[0].actorId,null);assert.equal(g.state.haulageProjects[0].work.progress,progress);
 assert.equal(workRuntime(g).activeJob(u.id)?.kind==='craft:haulage',false);
 g=roundtrip(g);u=g.state.units.find(p=>p.id===u.id);replacement=g.state.units.find(p=>p.id===replacement.id);
 g.world.heights.fill(4);g.rebuildWalk();g.clockState=()=>({period:'Afternoon'});
 assert.equal(beginHaulageWork(g,'sled',0,hall.id,replacement.id),true,'same craft action resumes paid work first');
 assert.equal(g.state.haulageProjects.length,1);assert.equal(replacement.haulageWork.projectId,id);assert.equal(replacement.haulageWork.progress,progress);
 work(g,replacement,.1);assert.equal(replacement.haulageWork.progress,progress,'walking does not fabricate crafting progress');
 work(g,replacement,150);assert.equal(replacement.haulage,'sled');assert.equal(u.haulage,undefined);assert.equal(g.state.haulageProjects.length,0);
 assert.equal(g.tribe(0).wood,wood);assert.equal(g.tribe(0).stone,stone);assert.equal(haulageProjectDiagnostics(g).coordinator.completed,1);
});
test('death in the real simulation preserves work independently of removed resident',()=>{
 const {g,u,replacement,shop}=fixture();assert.equal(beginHaulageWork(g,'sled',0,shop.id,u.id),true);work(g,u,25);
 const id=u.haulageWork.projectId,progress=u.haulageWork.progress,wood=g.tribe(0).wood;
 u.hp=0;g.step(.1);assert.equal(g.state.units.some(p=>p.id===u.id),false);
 assert.equal(g.state.haulageProjects[0].actorId,null);assert.equal(g.state.haulageProjects[0].work.progress,progress);
 assert.equal(resumeHaulageProject(g,id,replacement.id),true);work(g,replacement,100);
 assert.equal(replacement.haulage,'sled');assert.equal(g.tribe(0).wood,wood);assert.equal(g.state.haulageProjects.length,0);
});
test('interrupted handcart upgrade transfers its one real sled input without duplication or repayment',()=>{
 let {g,u,replacement,shop}=fixture();u.haulage='sled';g.tribe(0).haulagePractice=WHEEL_PRACTICE;
 assert.equal(beginHaulageWork(g,'cart',0,shop.id,u.id),true);work(g,u,25);
 const id=u.haulageWork.projectId,wood=g.tribe(0).wood,stone=g.tribe(0).stone;
 pauseHaulageWork(u,g);assert.equal(u.haulage,undefined);assert.equal(g.state.haulageProjects[0].inputHaulage,'sled');
 g=roundtrip(g);u=g.state.units.find(p=>p.id===u.id);replacement=g.state.units.find(p=>p.id===replacement.id);g.world.heights.fill(4);g.rebuildWalk();g.clockState=()=>({period:'Afternoon'});
 assert.equal(resumeHaulageProject(g,id,replacement.id),true);assert.equal(replacement.haulage,undefined,'input stays with unfinished project');
 assert.equal(validHaulageProjects(g.state),true);g=roundtrip(g);replacement=g.state.units.find(p=>p.id===replacement.id);g.world.heights.fill(4);g.rebuildWalk();g.clockState=()=>({period:'Afternoon'});
 work(g,replacement,150);assert.equal(replacement.haulage,'cart');assert.equal(g.state.units.filter(p=>p.haulage).length,1);
 assert.equal(g.tribe(0).wood,wood);assert.equal(g.tribe(0).stone,stone);
});
test('bench admission is atomic and failed requests do not consume materials',()=>{
 const {g,u,replacement,hall}=fixture();assert.equal(beginHaulageWork(g,'sled',0,hall.id,u.id),true);const wood=g.tribe(0).wood,stone=g.tribe(0).stone;
 assert.equal(beginHaulageWork(g,'sled',0,hall.id,replacement.id),false);assert.equal(replacement.haulageWork,undefined);
 assert.equal(g.state.haulageProjects.length,1);assert.equal(g.tribe(0).wood,wood);assert.equal(g.tribe(0).stone,stone);
 pauseHaulageWork(u,g);assert.equal(resumeHaulageProject(g,g.state.haulageProjects[0].id,replacement.id),true);
});
test('save rejects corrupt progress, detached facades and duplicate actor/project claims; legacy work adopts once',()=>{
 const {g,u,hall}=fixture();assert.equal(beginHaulageWork(g,'sled',0,hall.id,u.id),true);
 const save=JSON.parse(JSON.stringify(encodeGame(g)));assert.equal(validHaulageProjects(save.state),true);
 const corrupt=structuredClone(save);corrupt.state.haulageProjects[0].work.progress=1;assert.equal(validHaulageProjects(corrupt.state),false);assert.throws(()=>decodeGame(corrupt));
 const duplicate=structuredClone(save);duplicate.state.haulageProjects.push({...duplicate.state.haulageProjects[0],id:99999});assert.equal(validHaulageProjects(duplicate.state),false);
 const missing=structuredClone(save);missing.state.haulageProjects=[];assert.equal(validHaulageProjects(missing.state),false);
 const legacy=structuredClone(save);delete legacy.state.haulageProjects;delete legacy.state.units.find(p=>p.id===u.id).haulageWork.projectId;
 const restored=decodeGame(legacy),wood=restored.tribe(0).wood;syncHaulageProjects(restored);syncHaulageProjects(restored);
 assert.equal(restored.state.haulageProjects.length,1);assert.equal(restored.tribe(0).wood,wood);
});
test('resume click gives a fresh concrete adult, route or bench reason without charging',()=>{
 const {g,u,replacement,hall}=fixture();assert.equal(beginHaulageWork(g,'sled',0,hall.id,u.id),true);const id=u.haulageWork.projectId;pauseHaulageWork(u,g);
 u.carry=1;replacement.carry=1;assert.equal(resumeHaulageProject(g,id,replacement.id,hall.id),false);assert.match(g.state.haulageProjects[0].blockedReason,/available adult/);
 u.carry=0;replacement.carry=0;const spot=g.interactionSpot;g.interactionSpot=()=>null;
 assert.equal(resumeHaulageProject(g,id,replacement.id,hall.id),false);assert.match(g.state.haulageProjects[0].blockedReason,/reachable/);g.interactionSpot=spot;
 assert.equal(g.craftWeapon('spear',hall.id),true);const wood=g.tribe(0).wood;
 assert.equal(resumeHaulageProject(g,id,replacement.id,hall.id),false);assert.match(g.state.haulageProjects[0].blockedReason,/benches.*occupied/);
 assert.equal(g.tribe(0).wood,wood);assert.equal(replacement.haulageWork,undefined);
 hall.hp=0;assert.equal(resumeHaulageProject(g,id,replacement.id,hall.id),false);assert.match(g.state.haulageProjects[0].blockedReason,/Complete a compatible/);
});
test('legacy resident resume adapter remembers the former actor after JSON and refuses ambiguous projects',()=>{
 let {g,u,hall}=fixture();assert.equal(beginHaulageWork(g,'sled',0,hall.id,u.id),true);const first=u.haulageWork.projectId;
 pauseHaulageWork(u,g);g=roundtrip(g);u=g.state.units.find(p=>p.id===u.id);g.world.heights.fill(4);g.rebuildWalk();
 assert.equal(g.state.haulageProjects[0].lastActorId,u.id);
 const dock=g.makeBld('dock',0,15,0);g.state.buildings.push(dock);g.rebuildWalk();
 assert.equal(beginHaulageWork(g,'canoe',0,dock.id,u.id),true);const second=u.haulageWork.projectId;pauseHaulageWork(u,g);
 const wood=g.tribe(0).wood,stone=g.tribe(0).stone;
 assert.equal(resumeHaulageWork(g,u),false,'two unrelated paid projects must not be guessed');
 assert.equal(g.state.haulageProjects.every(p=>p.actorId===null),true);
 assert.equal(resumeHaulageWork(g,u,hall.id),true);assert.equal(u.haulageWork.projectId,first);
 assert.equal(g.state.haulageProjects.find(p=>p.id===second).actorId,null);
 assert.equal(g.tribe(0).wood,wood);assert.equal(g.tribe(0).stone,stone);
});
