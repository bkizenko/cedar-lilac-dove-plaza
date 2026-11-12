import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginProduction} from '../src/game/production.ts';
import {queueConstruction} from '../src/game/constructionQueue.ts';
import {acceptPrisonerSurrender} from '../src/game/captivity.ts';
import {prepareOwnedHandover} from '../src/game/communityHandover.ts';
import {encodeGame,decodeGame,gameSnapshot,validateGameSave} from '../src/game/persistence.ts';
// Declared finite controlled village; this tests a synchronous ownership boundary,
// not native terrain, construction completion, or diplomatic UI admission.
function fixture(){
 const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.waterBodies=[];g.world.rivers=[];g.world.features=[];g.world.ecology=undefined;
 for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.units=[];g.state.buildings=[];g.state.time=100;g.state.weather='clear';g.state.campSites=[{team:0,x:0,z:30}];
 const hall=g.makeBld('townhall',0,30,0),hearth=g.makeBld('hearth',14,30,0),site=g.makeBld('hearth',30,30,0);site.build=.2;
 g.state.buildings=[hall,hearth,site,g.makeBld('townhall',80,30,1)];
 for(const team of [0,1]){const t=g.tribe(team);Object.assign(t,{alive:true,food:100,foodLots:{provisions:100},wood:100,stone:50,items:{rawMeat:8}});t.survival.waterLiters=100;}
 const maker=g.spawnUnit('worker',2,36,0),guard=g.spawnUnit('spearman',40,40,0),prisoner=g.spawnUnit('worker',42,40,2);
 for(const u of [maker,guard,prisoner]){u.order='hold';u.jobLock=false;}
 g.vision.fill(2);g.rebuildWalk();assert.equal(acceptPrisonerSurrender(g,prisoner,0).accepted,true);
 return {g,maker,guard,prisoner,hearth,site};
}
test('player-to-NPC handover discards only unpaid queue intent after preserving paid batch and guarded third-party custody',()=>{
 const {g,maker,guard,prisoner,hearth,site}=fixture();
 assert.equal(beginProduction(g,'cookMeat',hearth.id,maker.id),true,g.state.banner);
 const paid=g.state.production.projects.at(-1);assert.equal(paid.phase,'carrying');assert.equal(paid.actorId,maker.id);assert.equal(maker.productionProjectId,paid.id);
 assert.equal(queueConstruction(g,site,[maker]).accepted,true);assert.deepEqual(maker.constructionQueue,{sites:[site.id]});
 assert.doesNotThrow(()=>validateGameSave(gameSnapshot(g)),'original player queue and paid work are valid');
 const before=JSON.stringify(gameSnapshot(g)),originalPaid=JSON.parse(JSON.stringify(paid)),metrics=structuredClone(g.state.production.metrics),where=g.state.units.map(u=>({id:u.id,x:u.x,y:u.y,z:u.z})),custody=JSON.parse(JSON.stringify(prisoner.prisoner));
 const stocks=()=>[0,1].map(i=>g.tribe(i)).reduce((s,t)=>({wood:s.wood+t.wood,stone:s.stone+t.stone,food:s.food+t.food,rawMeat:s.rawMeat+(t.items?.rawMeat||0)}),{wood:0,stone:0,food:0,rawMeat:0});const totals=stocks();
 const result=prepareOwnedHandover(g,0,1);assert.equal(result.accepted,true,result.reason);assert.equal(JSON.stringify(gameSnapshot(g)),before,'preflight edits draft only');
 g.commitCommunityState(result.state);
 const same=g.state.units.find(u=>u.id===maker.id),sameGuard=g.state.units.find(u=>u.id===guard.id),sameCaptive=g.state.units.find(u=>u.id===prisoner.id),batch=g.state.production.projects.find(p=>p.id===paid.id);
 assert.equal(same.team,1);assert.equal(same.constructionQueue,undefined);assert.equal(same.productionProjectId,paid.id);
 assert.deepEqual(JSON.parse(JSON.stringify(batch)),{...originalPaid,team:1,originTeam:0,handoverId:result.record.id},'same paid phase, actor, inputs and progress survive');
 assert.equal(g.state.buildings.find(b=>b.id===hearth.id).team,1);assert.equal(g.state.buildings.find(b=>b.id===site.id).build,.2,'queue removal cannot complete an unpaid site');
 assert.deepEqual(g.state.production.metrics,metrics);assert.deepEqual(stocks(),totals);assert.deepEqual(g.state.units.map(u=>({id:u.id,x:u.x,y:u.y,z:u.z})),where);
 assert.equal(sameGuard.team,1);assert.equal(sameGuard.escortId,sameCaptive.id);assert.deepEqual(JSON.parse(JSON.stringify(sameCaptive.prisoner)),{...custody,captorTeam:1});assert.equal(sameCaptive.prisoner.originTeam,2);
 assert.doesNotThrow(()=>validateGameSave(gameSnapshot(g)));const loaded=decodeGame(encodeGame(g));
 assert.equal(loaded.state.units.find(u=>u.id===maker.id).constructionQueue,undefined);assert.equal(loaded.state.units.find(u=>u.id===maker.id).productionProjectId,paid.id);
 assert.deepEqual(JSON.parse(JSON.stringify(loaded.state.production.projects.find(p=>p.id===paid.id))),JSON.parse(JSON.stringify(batch)));
 assert.equal(loaded.state.units.find(u=>u.id===prisoner.id).prisoner.guardId,guard.id);
});
