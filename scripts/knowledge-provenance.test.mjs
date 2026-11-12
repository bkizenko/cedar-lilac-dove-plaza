import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {knowledgeReport} from '../src/game/knowledge.ts';
import {beginProduction,productionAI,productionIssue,tickProduction} from '../src/game/production.ts';
import {beginProductionLesson,productionApprenticeAI,tickProductionLessons} from '../src/game/productionPractice.ts';
import {hasDeliveredMethod} from '../src/game/inheritedKnowledge.ts';
import {prepareOwnedHandover} from '../src/game/communityHandover.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
const topic=(g,id)=>{const t=knowledgeReport(g).topics.find(t=>t.id===id);assert.ok(t,`missing topic ${id}`);return t;};
function fixture(){
 // Finite controlled village isolates evidence ownership and paid production.
 // No native terrain/performance or earned opening techniques are claimed.
 const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.waterBodies=[];g.world.rivers=[];g.world.features=[];g.world.ecology=undefined;
 for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.units=[];g.state.buildings=[];g.state.time=100;g.state.autoWorkEnabled=false;g.state.conflict='quiet';g.state.weather='clear';g.state.campSites=[{team:0,x:0,z:30}];
 const hall=g.makeBld('townhall',0,30,0),site=g.makeBld('hearth',14,30,0),other=g.makeBld('townhall',70,30,1);g.state.buildings=[hall,site,other];
 const teacher=g.spawnUnit('worker',3,36,0),learner=g.spawnUnit('worker',4,36,0),foreign=g.spawnUnit('worker',74,36,1);
 for(const u of [teacher,learner,foreign]){u.order='hold';u.jobLock=false;}
 for(const team of [0,1]){Object.assign(g.tribe(team),{alive:true,food:300,foodLots:{provisions:300},wood:100,stone:50,items:{}});g.tribe(team).survival.waterLiters=100;}
 g.vision.fill(2);g.rebuildWalk();return {g,teacher,learner,foreign,site};
}
function drive(g,seconds,done=()=>false){for(let i=0;i<seconds*10&&!done();i++){g.state.time+=.1;g.navBudget=40;for(const u of g.state.units)productionAI(g,u,.1);for(const u of g.state.units)productionApprenticeAI(g,u,.1);tickProduction(g,.1);tickProductionLessons(g);} }
const history=(g,maker)=>({batches:2,failedBatches:0,usefulOutputs:8,firstAt:g.state.time-10,lastAt:g.state.time-2,makers:[maker.id]});

test('knowledge reads distinguish unknown and observed ingredients without creating a method, dates, goods, IDs or RNG draws',()=>{
 const {g}=fixture();assert.equal(topic(g,'production:pottery').knowledgeState,'unknown');
 // Goods represent a purchase/legacy stock, not proof of how they were made.
 Object.assign(g.tribe(0),{food:332,foodLots:{provisions:300,grain:32},items:{pottery:4,clay:8}});
 const before=JSON.stringify(g.state),id=g.state.nextId,random=Math.random;let draws=0;Math.random=()=>{draws++;return .5;};let report;
 try{for(let i=0;i<3;i++)report=knowledgeReport(g);}finally{Math.random=random;}
 assert.equal(JSON.stringify(g.state),before);assert.equal(g.state.nextId,id);assert.equal(draws,0);assert.equal(g.tribe(0).productionPractice,undefined);
 const milling=report.topics.find(t=>t.id==='production:milling'),pottery=report.topics.find(t=>t.id==='production:pottery');
 assert.equal(milling.knowledgeState,'partly');assert.equal(pottery.knowledgeState,'partly');
 for(const t of [milling,pottery]){assert.ok(t.provenance.some(p=>p.kind==='observed'));assert.ok(t.provenance.every(p=>!['taught','traded','captured','demonstrated'].includes(p.kind)));assert.ok(t.provenance.filter(p=>p.kind==='observed').every(p=>p.at===undefined),'undated stocks must not acquire a fabricated observation date');}
 assert.ok(report.topics.every(t=>['known','partly','unknown'].includes(t.knowledgeState)&&Array.isArray(t.provenance)));
});

test('actual paid work and a delivered practical lesson produce exact-method demonstration and taught evidence, not full firing knowledge',()=>{
 let {g,teacher,site}=fixture();g.tribe(0).items={clay:24};
 const batch=()=>{assert.equal(beginProduction(g,'formClayHand',site.id,teacher.id),true,productionIssue(g,'formClayHand',site.id));return g.state.production.projects.at(-1);};
 for(let i=0;i<3;i++){const p=batch();drive(g,220,()=>p.phase==='complete');assert.equal(p.phase,'complete',p.blockedReason);}
 let p=batch();drive(g,100,()=>p.phase==='working');assert.equal(p.phase,'working');const result=beginProductionLesson(g,p.id);assert.equal(result.accepted,true,result.reason);const student=g.state.units.find(u=>u.productionApprentice?.projectId===p.id);assert.ok(student);
 drive(g,240,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.equal(student.productionSkills.formClayHand.taughtBatches,1);
 const t=topic(g,'production:pottery');assert.equal(t.knowledgeState,'partly','forming pots has not demonstrated firing');assert.ok(t.provenance.some(p=>p.kind==='demonstrated'&&p.method==='formClayHand'));assert.ok(t.provenance.some(p=>p.kind==='taught'&&p.method==='formClayHand'));assert.ok(t.provenance.filter(p=>p.kind==='demonstrated').every(p=>p.at!==undefined&&p.at<=g.state.time));assert.ok(t.provenance.every(p=>!['traded','captured'].includes(p.kind)));
 const before=JSON.stringify(t.provenance),person=student.id;g=decodeGame(encodeGame(g));assert.equal(g.state.units.find(u=>u.id===person).productionSkills.formClayHand.taughtBatches,1);assert.equal(JSON.stringify(topic(g,'production:pottery').provenance),before);
 // Isolate the actual learned resident's ownership visibility after validating
 // the complete save above. No fabricated skill or new lesson is introduced.
 const learned=g.state.units.find(u=>u.id===person);delete g.tribe(0).productionPractice;
 for(const u of g.state.units)if(u.id!==person)delete u.productionSkills;
 learned.team=1;assert.equal(hasDeliveredMethod(g,0,'formClayHand'),false);assert.ok(!topic(g,'production:pottery').provenance.some(p=>p.kind==='taught'));
 learned.team=0;assert.equal(hasDeliveredMethod(g,0,'formClayHand'),true);assert.ok(topic(g,'production:pottery').provenance.some(p=>p.kind==='taught'&&p.method==='formClayHand'));
 learned.prisoner={phase:'custody'};assert.equal(hasDeliveredMethod(g,0,'formClayHand'),false);assert.ok(!topic(g,'production:pottery').provenance.some(p=>p.kind==='taught'));
 delete learned.prisoner;learned.enslavedFrom=1;assert.equal(hasDeliveredMethod(g,0,'formClayHand'),false);assert.ok(!topic(g,'production:pottery').provenance.some(p=>p.kind==='taught'));
});

test('actual community handover exposes frozen inherited methods without invented output, conquest labels or future former-owner knowledge',()=>{
 let {g,foreign}=fixture();
 // Explicit authored source history tests the real handover boundary, not earned
 // source production. The recipient starts without successful methods.
 g.tribe(1).productionPractice={formClayHand:history(g,foreign),fireClayHand:history(g,foreign)};
 foreign.productionSkills={formClayHand:{successfulBatches:2,taughtBatches:0,observedSeconds:0},fireClayHand:{successfulBatches:2,taughtBatches:0,observedSeconds:0}};
 const pre=JSON.stringify(g.state),plan=prepareOwnedHandover(g,1,0);assert.equal(plan.accepted,true,plan.reason);assert.equal(JSON.stringify(g.state),pre,'preflight is read-only');g.commitCommunityState(plan.state);
 const pottery=topic(g,'production:pottery');assert.equal(pottery.knowledgeState,'known');assert.equal(pottery.stage,'proven');assert.equal(g.tribe(0).productionPractice,undefined,'ownership must not fabricate recipient batches');
 const inherited=pottery.provenance.filter(p=>p.kind==='inherited');assert.ok(inherited.some(p=>p.method==='fireClayHand'&&p.sourceTeam===1&&p.sourceName&&p.at===plan.record.timeSeconds));assert.ok(pottery.provenance.every(p=>p.kind!=='captured'),'handover does not establish capture cause');
 // A later change to former-owner private work must not leak through snapshots.
 g.tribe(1).productionPractice.weaveCloth=history(g,foreign);const textiles=topic(g,'production:textiles');assert.notEqual(textiles.knowledgeState,'known');assert.ok(!textiles.provenance.some(p=>p.kind==='inherited'&&p.method==='weaveCloth'));
 g=decodeGame(encodeGame(g));assert.equal(topic(g,'production:pottery').knowledgeState,'known');assert.equal(g.tribe(0).productionPractice,undefined);
});

test('an inherited intermediate method leaves the finished chain only partly known',()=>{
 const {g,foreign}=fixture();g.tribe(1).productionPractice={formClayHand:history(g,foreign)};foreign.productionSkills={formClayHand:{successfulBatches:2,taughtBatches:0,observedSeconds:0}};
 const plan=prepareOwnedHandover(g,1,0);assert.equal(plan.accepted,true,plan.reason);g.commitCommunityState(plan.state);const t=topic(g,'production:pottery');assert.equal(t.knowledgeState,'partly');assert.ok(!['proven','adoption'].includes(t.stage));assert.ok(t.provenance.some(p=>p.kind==='inherited'&&p.method==='formClayHand'));assert.ok(!t.provenance.some(p=>p.method==='fireClayHand'));
});
