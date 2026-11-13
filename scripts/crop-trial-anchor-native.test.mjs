import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {writeFileSync} from 'node:fs';import {isAbsolute} from 'node:path';
import {Game} from '../src/game/sim.ts';import {mulberry32} from '../src/game/rng.ts';
import {beginCropTrial,cropTrialWorkplace,cropTrialCache,cropStudyAI,CROP_TRIAL_RULES} from '../src/game/cultivation.ts';
import {supplyDrops} from '../src/game/campAnchor.ts';import {campRelocationIssue} from '../src/game/nomadicCamp.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';import {prepareOwnedHandover} from '../src/game/communityHandover.ts';
import {knowledgeReport} from '../src/game/knowledge.ts';import {farmingProgress} from '../src/game/farmingProgress.ts';
const terrain=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
function setup(){const random=Math.random;Math.random=mulberry32(42);try{const g=new Game();g.reset(42,21,{size:1040,layout:'pangaea'});g.enterIsland();
 // Explicit finite starting household; no completed player buildings, sample,
 // body, terrain, cargo or trial progress is created after execution begins.
 assert.equal(g.state.buildings.filter(b=>b.team===0).length,0);Object.assign(g.tribe(0),{food:160,foodLots:{provisions:160},wood:0,stone:0,copper:0,iron:0,seeds:0,cropSamples:{},cultivated:[]});g.tribe(0).survival.waterLiters=40;
 for(const u of g.state.units.filter(u=>u.team===0)){u.order='hold';u.jobLock=true;u.selected=false;}
 g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';g.raidT=g.seaT=g.calamityT=10000;g.state.raidT=g.state.birthT=10000;g.state.visitorTimer=900;for(const t of g.state.tribes)t.thinkT=10000;g.state.paused=false;
 return g;}finally{Math.random=random;}}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);}return until();}
const select=(g,u)=>{g.clearSelect();g.selectEntity(u);};
const exportSave=(name,g)=>{if(process.env[name]){assert.ok(isAbsolute(process.env[name]));writeFileSync(process.env[name],JSON.stringify(encodeGame(g)));}};
function earnSamples(g,u){
 const patch=g.state.forage.filter(p=>p.cropCandidate&&p.amount>=8&&g.workBoard.connected(g,u.x,u.z,p.x,p.z)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];assert.ok(patch,'actual generated harvestable crop sample');const kind=patch.cropCandidate;
 select(g,u);g.issueMove(patch.x,patch.z);assert.ok(drive(g,120,()=>g.visibleAt(patch.x,patch.z)),u.workReason);g.issueGather(patch);
 assert.ok(drive(g,360,()=>(g.tribe(0).cropSamples?.[kind]||0)>=4),JSON.stringify({reason:u.workReason,carry:u.carry,samples:g.tribe(0).cropSamples,patch:patch.amount}));
 return kind;
}
function legalHall(g,origin){for(let r=12;r<=84;r+=6)for(let i=0;i<24;i++){const x=origin.x+Math.sin(i*Math.PI/12)*r,z=origin.z+Math.cos(i*Math.PI/12)*r;if(g.placementIssue('townhall',x,z,0)===null&&g.workBoard.connected(g,origin.x,origin.z,x,z))return{x,z};}return null;}
let paidRelocated;
test('real wild samples fund one original seed plot retained through actual nomadic relocation, strict reload and cooperative work',()=>{
 let g=setup();const original=g.campOf(0),shape=terrain(g),u=g.state.units.find(u=>u.team===0&&u.type==='worker'&&!u.maturesAt),id=u.id;
 const kind=earnSamples(g,u);
 select(g,u);g.issueMove(original.x+2,original.z);drive(g,2);const samples=g.tribe(0).cropSamples[kind];exportSave('CROP_TRIAL_SAMPLE_SAVE',g);assert.ok(beginCropTrial(g,kind,0,false,id));const trial=g.tribe(0).cropTrial,anchor={...trial.anchor};assert.equal(g.tribe(0).cropSamples[kind],samples-4);exportSave('CROP_TRIAL_PAID_SAVE',g);
 assert.ok(drive(g,100,()=>trial.progress>1),u.workReason);assert.ok(trial.progress<trial.duration);select(g,u);g.issueMove(u.x+2,u.z);const progress=trial.progress;assert.equal(u.studyCrop,undefined);
 let destination;for(const radius of [18,24,30,36])for(let i=0;i<16&&!destination;i++){const x=original.x+Math.sin(i*Math.PI/8)*radius,z=original.z+Math.cos(i*Math.PI/8)*radius;if(g.walkable(x,z)&&g.height(x,z)>g.waterAt(x,z)+.3&&g.workBoard.connected(g,u.x,u.z,x,z))destination={x,z};}assert.ok(destination);
 g.issueMove(destination.x,destination.z);assert.ok(drive(g,90,()=>Math.hypot(u.x-destination.x,u.z-destination.z)<3));assert.equal(campRelocationIssue(g,destination.x,destination.z),null);assert.equal(g.relocateCamp(destination.x,destination.z),true);
 assert.ok(drive(g,600,()=>g.state.campMove?.phase==='complete'),g.state.campMove?.blockedReason);assert.equal(g.tribe(0).cropTrial.progress,progress);assert.deepEqual(g.tribe(0).cropTrial.anchor,anchor);assert.ok(Math.hypot(g.campOf(0).x-anchor.x,g.campOf(0).z-anchor.z)>=12);
 assert.equal(cropTrialWorkplace(g).x,anchor.x);assert.equal(cropTrialCache(g).x,g.campOf(0).x);assert.ok(!supplyDrops(g,0).some(p=>Math.hypot(p.x-anchor.x,p.z-anchor.z)<1),'original trial plot is NOT a communal cache');
 paidRelocated=encodeGame(g);exportSave('CROP_TRIAL_RELOCATED_SAVE',g);g=decodeGame(paidRelocated);const people=g.state.units.filter(p=>p.team===0&&p.type==='worker'&&!p.maturesAt);assert.ok(people.length>=3);
 for(const p of people.slice(0,3))assert.equal(beginCropTrial(g,kind,0,false,p.id),true);assert.equal(g.state.units.filter(p=>p.studyCrop===kind).length,CROP_TRIAL_RULES.maximumPeople);const p0=g.tribe(0).cropTrial.progress;drive(g,.2);assert.equal(g.tribe(0).cropTrial.progress,p0,'new-camp arrival gives no remote progress at old plot');
 assert.ok(drive(g,180,()=>g.tribe(0).cultivated.includes(kind)));assert.equal(g.tribe(0).cropSamples[kind],samples-4);assert.equal(g.tribe(0).cultivationEvidence[kind].actorIds.length,3);assert.equal(terrain(g),shape);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));exportSave('CROP_TRIAL_ANCHOR_EARNED_SAVE',g);
});
test('handover preserves original paid plot separately from current cache; optional strict anchor and legacy absence retain their meanings',()=>{
 assert.ok(paidRelocated,'genuine paid relocation opening required');const g=decodeGame(structuredClone(paidRelocated)),t=g.tribe(0),a=t.cropTrial.anchor,progress=t.cropTrial.progress,before=JSON.stringify(encodeGame(g)),plan=prepareOwnedHandover(g,0,1);assert.equal(plan.accepted,true,plan.reason);assert.equal(JSON.stringify(encodeGame(g)),before,'handover proposal is atomic/pure');
 const inherited=plan.state.tribes[1].inheritedCropTrials.find(q=>q.sourceTeam===0);assert.deepEqual(inherited.anchor,a);assert.equal(inherited.trial.progress,progress);assert.ok(Math.hypot(plan.record.cacheAnchor.x-a.x,plan.record.cacheAnchor.z-a.z)>=12,'goods stay with current communal cache, not old seed plot');assert.doesNotThrow(()=>validateGameSave({...paidRelocated,state:plan.state}));
 for(const mutate of [a=>a.x=Infinity,a=>a.kind='boat',a=>a.id=1,a=>a.extra='invented']){const bad=structuredClone(paidRelocated);mutate(bad.state.tribes[0].cropTrial.anchor);assert.throws(()=>decodeGame(bad));}
 const legacy=structuredClone(paidRelocated);delete legacy.state.tribes[0].cropTrial.anchor;const copy=decodeGame(legacy);assert.equal(copy.tribe(0).cropTrial.anchor,undefined);assert.equal(cropTrialWorkplace(copy).x,copy.campOf(0).x);assert.equal(copy.tribe(0).cropTrial.progress,progress);assert.equal(copy.tribe(0).cropSamples[t.cropTrial.kind],t.cropSamples[t.cropTrial.kind]);
});

test('a genuinely paid building trial stays blocked at its destroyed original hall instead of adopting a standing replacement',()=>{
 const g=setup(),home=g.campOf(0),point=legalHall(g,home);assert.ok(point);const hall=g.makeBld('townhall',point.x,point.z,0);g.state.buildings.push(hall);g.rebuildWalk();const other=legalHall(g,home);assert.ok(other);const replacement=g.makeBld('townhall',other.x,other.z,0);g.state.buildings.push(replacement);g.rebuildWalk();
 // Both legal halls are explicit initial infrastructure. Inputs below come
 // from actual generated wild harvest and physical cache delivery.
 const u=g.state.units.find(u=>u.team===0&&u.type==='worker'&&!u.maturesAt),kind=earnSamples(g,u);select(g,u);g.issueMove(u.x+1,u.z);drive(g,1);assert.equal(beginCropTrial(g,kind,0,false,u.id),true);const trial=g.tribe(0).cropTrial;assert.equal(trial.anchor.kind,'building');const site=g.state.buildings.find(b=>b.id===trial.anchor.id);assert.ok(drive(g,100,()=>trial.progress>1));const progress=trial.progress,paid=g.tribe(0).cropSamples[kind],a={...trial.anchor};
 // Explicit asset-removal callback scope, not a claimed naturally won raid.
 g.state.buildings=g.state.buildings.filter(b=>b.id!==site.id);g.rebuildWalk();drive(g,1);assert.equal(trial.progress,progress);assert.deepEqual(trial.anchor,a);assert.match(u.workReason,/original paid building/);assert.equal(cropTrialWorkplace(g),null);assert.ok(cropTrialCache(g),'a different standing hall exists but cannot take this paid trial');assert.equal(g.tribe(0).cropSamples[kind],paid);assert.match(farmingProgress(g).detail,/original paid seed-trial building/);const topic=knowledgeReport(g).topics.find(t=>t.id==='crop:'+kind);assert.match(topic.actions.find(a=>a.id==='trial:'+kind).blockedReason,/original paid seed-trial building/);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
