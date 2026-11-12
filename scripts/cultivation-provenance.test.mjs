import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginCropTrial,cropStudyAI,initializeCultivation,validCultivationEvidence} from '../src/game/cultivation.ts';
import {prepareOwnedHandover} from '../src/game/communityHandover.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){
 // Declared finite food/sample endowment, on unmodified seed42 native terrain.
 // Actual generated residents, camps, buildings, collision and paths are kept.
 const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();g.state.autoWorkEnabled=false;g.state.weather='clear';
 for(const u of g.state.units){g.interruptMission(u);u.order='hold';u.jobLock=false;}
 const actors=g.state.units.filter(u=>u.team===0&&u.type==='worker'&&u.maturesAt===undefined).slice(0,3),foreign=g.state.units.find(u=>u.team===1&&u.type==='worker'&&u.maturesAt===undefined);
 assert.equal(actors.length,3);assert.ok(foreign);
 for(const team of [0,1])Object.assign(g.tribe(team),{alive:true,food:300,foodLots:{provisions:300},cultivated:[],cropSamples:team===0?{grain:4}:{pulses:4}});
 g.rebuildWalk();return {g,actors,foreign};
}
function work(g,ids,until,seconds=120){for(let i=0;i<seconds*10&&!until();i++){g.state.time+=.1;g.navBudget=40;for(const id of ids){const u=g.state.units.find(u=>u.id===id);assert.ok(u);cropStudyAI(g,u,.1);}}assert.ok(until(),`paid crop trial should make actual staffed progress: ${JSON.stringify({trial:g.tribe(0).cropTrial,inherited:g.tribe(0).inheritedCropTrials,actors:g.state.units.filter(u=>ids.includes(u.id)).map(u=>({id:u.id,team:u.team,x:u.x,z:u.z,order:u.order,study:u.studyCrop,reason:u.workReason}))})}`);}

test('paid crop trials record only actual positive-work contributors across strict reload; assigned observers earn no receipt',()=>{
 let {g,actors}=fixture();const ids=actors.map(u=>u.id),samples=g.tribe(0).cropSamples.grain;
 for(const u of actors)assert.equal(beginCropTrial(g,'grain',0,false,u.id),true);
 assert.equal(g.tribe(0).cropSamples.grain,samples-4);assert.equal(g.tribe(0).cultivationEvidence,undefined);
 // The third assigned person is never stepped; merely being assigned must not
 // earn a historical result. The first two physically reach the workplace.
 work(g,ids.slice(0,2),()=>g.tribe(0).cropTrial.progress>5);assert.deepEqual([...g.tribe(0).cropTrial.workActorIds].sort((a,b)=>a-b),ids.slice(0,2));
 const progress=g.tribe(0).cropTrial.progress;g=decodeGame(encodeGame(g));g.state.paused=false;assert.equal(g.tribe(0).cropTrial.progress,progress);
 work(g,ids.slice(0,2),()=>!g.tribe(0).cropTrial);const receipt=g.tribe(0).cultivationEvidence.grain;
 assert.equal(receipt.demonstratedAt,g.state.time);assert.deepEqual([...receipt.actorIds].sort((a,b)=>a-b),ids.slice(0,2));assert.equal(receipt.inheritedSourceTeam,undefined);assert.ok(!receipt.actorIds.includes(ids[2]));assert.equal(g.tribe(0).cropSamples.grain,0);assert.ok(g.tribe(0).cultivated.includes('grain'));
 const saved=decodeGame(encodeGame(g));assert.deepEqual(saved.tribe(0).cultivationEvidence, g.tribe(0).cultivationEvidence);
 const before=JSON.stringify(g.tribe(0).cultivationEvidence);assert.equal(beginCropTrial(g,'grain'),false);initializeCultivation(g,true);assert.equal(JSON.stringify(g.tribe(0).cultivationEvidence),before);
});

test('an actual paid partial trial inherited through community handover retains contributors and earns its source on completion',()=>{
 let {g,foreign}=fixture();assert.equal(beginCropTrial(g,'pulses',1,false,foreign.id),true);assert.equal(g.tribe(1).cropSamples.pulses,0);work(g,[foreign.id],()=>g.tribe(1).cropTrial.progress>3);
 const progress=g.tribe(1).cropTrial.progress,actorId=foreign.id;const plan=prepareOwnedHandover(g,1,0);assert.equal(plan.accepted,true,plan.reason);g.commitCommunityState(plan.state);
 assert.equal(g.tribe(0).cultivationEvidence,undefined);assert.equal(g.tribe(0).inheritedCropTrials[0].trial.progress,progress);assert.deepEqual(g.tribe(0).inheritedCropTrials[0].trial.workActorIds,[actorId]);
 g=decodeGame(encodeGame(g));g.state.paused=false;work(g,[actorId],()=>g.tribe(0).cultivated.includes('pulses'));
 const receipt=g.tribe(0).cultivationEvidence.pulses;assert.deepEqual(receipt.actorIds,[actorId]);assert.equal(receipt.inheritedSourceTeam,1);assert.equal(receipt.demonstratedAt,g.state.time);assert.equal(g.tribe(0).inheritedCropTrials.length,0);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('legacy cultivated flags gain no invented receipt; malformed optional crop history and contributor IDs fail strict validation',()=>{
 const {g,actors}=fixture();g.tribe(0).cultivated=['grain'];initializeCultivation(g,true);assert.equal(g.tribe(0).cultivationEvidence,undefined);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 g.tribe(0).cultivationEvidence={grain:{demonstratedAt:g.state.time,actorIds:[actors[0].id]}};assert.equal(validCultivationEvidence(g.state),true);const raw=encodeGame(g);
 for(const mutate of [
  s=>{s.tribes[0].cultivationEvidence.grain.demonstratedAt=s.time+1;},
  s=>{s.tribes[0].cultivationEvidence.grain.actorIds=[actors[0].id,actors[0].id];},
  s=>{s.tribes[0].cultivationEvidence.grain.actorIds=[s.nextId];},
  s=>{s.tribes[0].cultivationEvidence.grain.actorIds=[];},
  s=>{s.tribes[0].cultivationEvidence.grain.inheritedSourceTeam=s.tribes.length;},
  s=>{s.tribes[0].cultivationEvidence.pulses={demonstratedAt:s.time,actorIds:[actors[0].id]};},
  s=>{s.tribes[0].cropTrial={kind:'pulses',progress:1,duration:30,workActorIds:[s.nextId]};},
 ]){const bad=structuredClone(raw);mutate(bad.state);assert.equal(validCultivationEvidence(bad.state),false);assert.throws(()=>decodeGame(bad));}
});
