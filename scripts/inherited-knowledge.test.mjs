import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {captureCommunityKnowledge,inheritedKnowledgeProofs,hasDeliveredMethod,validCommunityKnowledgeSnapshot} from '../src/game/inheritedKnowledge.ts';
import {textileRecipeIssue} from '../src/game/textiles.ts';
import {threshingFloorIssue} from '../src/game/cerealRules.ts';
import {inheritedTrialWorkplace,beginCropTrial,beginInheritedCropTrial,cropStudyAI} from '../src/game/cultivation.ts';
import {knowledgeReport} from '../src/game/knowledge.ts';
import {PRODUCTION_RECIPES} from '../src/game/production.ts';
function fixture(){const g=new Game();g.reset(7,14,{size:1040,layout:'archipelago'});g.enterIsland();g.state.autoWorkEnabled=false;return g;}
function record(g,from=1,to=0){return{version:1,id:g.state.nextId++,fromTeam:from,toTeam:to,timeSeconds:g.state.time,scope:'society',hallIds:[],residentIds:g.state.units.filter(u=>u.team===from).map(u=>u.id),siteIds:[],boatIds:[],productionIds:[],haulageProjectIds:[],livestockIds:[],coastalVoyageIds:[],societyMissionIds:[],coastalCommissionIds:[]};}
const history=(maker)=>({batches:2,failedBatches:0,usefulOutputs:8,firstAt:0,lastAt:0,makers:[maker]});
test('frozen delivered methods unlock inherited practice without crediting new output or learning future offscreen methods',()=>{
 const g=fixture(),maker=g.state.units.find(u=>u.team===1);g.tribe(1).productionPractice={spinYarnHand:history(maker.id),threshCerealHand:history(maker.id)};
 const r=record(g);r.knowledge=captureCommunityKnowledge(g,r);g.state.communityHandovers=[r];
 assert.equal(textileRecipeIssue(g,0,'weaveCloth'),null);assert.equal(threshingFloorIssue(g,0),null);assert.equal(g.tribe(0).productionPractice,undefined);
 g.tribe(1).productionPractice.weaveCloth=history(maker.id);assert.equal(hasDeliveredMethod(g,0,'weaveCloth'),false);assert.match(textileRecipeIssue(g,0,'sewLightClothes'),/woven/);
 const before=JSON.stringify(g.state);knowledgeReport(g);inheritedKnowledgeProofs(g.state,0);assert.equal(JSON.stringify(g.state),before);
 assert.equal(validCommunityKnowledgeSnapshot(g.state,r,k=>Object.hasOwn(PRODUCTION_RECIPES,k)),true);
 const bad=structuredClone(r);bad.knowledge.proofs[0].recipes.push('windmill');assert.equal(validCommunityKnowledgeSnapshot(g.state,bad,k=>Object.hasOwn(PRODUCTION_RECIPES,k)),false);
});
test('local adoption only carries demonstrated methods of actual adopted makers; remote global proof stays private',()=>{
 const g=fixture(),makers=g.state.units.filter(u=>u.team===1),m=makers[0];m.productionSkills={spinYarnHand:{successfulBatches:2,taughtBatches:0,observedSeconds:0}};
 g.tribe(1).productionPractice={spinYarnHand:history(m.id),weaveCloth:history(makers[1].id)};g.tribe(1).cultivated=['grain'];g.tribe(1).boatPractice={version:1,waterMeters:10000,loadedMeters:1000,deliveredGoods:100,built:{},proven:{},firstObservedAt:0};
 const r=record(g);r.scope='community';r.residentIds=[m.id];const k=captureCommunityKnowledge(g,r);assert.deepEqual(k.proofs[0].recipes,['spinYarnHand']);assert.deepEqual(k.proofs[0].cultivated,[]);assert.equal(k.proofs[0].boat.waterMeters,0);assert.equal(k.proofs[0].boat.deliveredGoods,0);
});
test('nested whole-community transfers preserve one original frozen source and never double-count methods',()=>{
 const g=fixture(),m=g.state.units.find(u=>u.team===1);g.tribe(1).productionPractice={spinYarnHand:history(m.id)};
 const first=record(g,1,2);first.knowledge=captureCommunityKnowledge(g,first);g.state.communityHandovers=[first];
 const second=record(g,2,0);second.knowledge=captureCommunityKnowledge(g,second);g.state.communityHandovers.push(second);
 assert.equal(inheritedKnowledgeProofs(g.state,0).filter(p=>p.sourceTeam===1).length,1);assert.equal(hasDeliveredMethod(g,0,'spinYarnHand'),true);assert.equal(inheritedKnowledgeProofs(g.state,2).length,0);
});
test('inherited seed trials work at their original anchor in parallel with the recipient trial and retain paid progress',()=>{
 const g=fixture(),workers=g.state.units.filter(u=>u.team===0&&u.type==='worker'),camp=g.campOf(0),a=workers[0],b=workers[1];
 // Declared flat reachable seed-patch fixture isolates parallel paid-trial
 // accounting; no crop unlock or completed work is endowed.
 g.height=()=>2;g.walkable=()=>true;g.workBoard.connected=()=>true;g.state.buildings=[];g.tribe(0).food=1000;g.tribe(0).foodLots={provisions:1000};g.tribe(0).cultivated=[];
 for(const u of [a,b]){g.interruptMission(u);u.x=camp.x;u.z=camp.z;u.y=2;u.order='hold';u.carry=0;u.seedSamples=undefined;}
 g.tribe(0).cropTrial={kind:'grain',progress:7,duration:30};a.studyCrop='grain';
 const q={sourceTeam:1,handoverId:900,trial:{kind:'pulses',progress:11,duration:30},actorIds:[],anchor:{kind:'camp',x:camp.x,y:2,z:camp.z}};g.tribe(0).inheritedCropTrials=[q];
 assert.ok(inheritedTrialWorkplace(g,0,q));const samples=JSON.stringify(g.tribe(0).cropSamples);assert.equal(beginInheritedCropTrial(g,900,b.id),true);assert.equal(JSON.stringify(g.tribe(0).cropSamples),samples);
 cropStudyAI(g,a,1);cropStudyAI(g,b,1);assert.equal(g.tribe(0).cropTrial.progress,8);assert.equal(q.trial.progress,12);
 g.interruptMission(b);b.order='hold';assert.equal(beginCropTrial(g,'grain',0,false,b.id),true);assert.equal(q.actorIds.includes(b.id),false,'a resident cannot remain claimed by the old trial after joining another');g.interruptMission(b);b.order='hold';assert.equal(beginInheritedCropTrial(g,900,b.id),true);
 cropStudyAI(g,b,18);assert.deepEqual(g.tribe(0).cultivated,['pulses']);assert.equal(g.tribe(0).cropTrial.progress,8);assert.equal(a.studyCrop,'grain');assert.equal(b.studyCrop,undefined);assert.equal(g.tribe(0).inheritedCropTrials.length,0);
});
test('cart and copper method evidence stays dated and separate from newly credited work',async()=>{
 const {inheritedHaulageEvidence}=await import('../src/game/inheritedKnowledge.ts');const {haulageRequirement}=await import('../src/game/haulage.ts');
 const g=fixture();g.tribe(1).copperExperiment=true;g.tribe(1).haulagePractice=60;const r=record(g);r.knowledge=captureCommunityKnowledge(g,r);g.state.communityHandovers=[r];assert.equal(r.knowledge.proofs[0].copperPrototype,true);assert.equal(inheritedHaulageEvidence(g.state,0).sledDeliveries,60);assert.equal(g.tribe(0).haulagePractice,undefined);assert.doesNotMatch(haulageRequirement(g,'cart',0)||'',/First deliver/);assert.equal(validCommunityKnowledgeSnapshot(g.state,r,k=>Object.hasOwn(PRODUCTION_RECIPES,k)),true);
 const forged=structuredClone(r);forged.knowledge.proofs[0].sledDeliveries=61;assert.equal(validCommunityKnowledgeSnapshot(g.state,forged),false);
});
