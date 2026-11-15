import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {beginProduction,productionIssue} from '../src/game/production.ts';
import {LATE_AGE_RULES as R} from '../src/game/lateAgeRules.ts';
import {knowledgeReport,runKnowledgeAction} from '../src/game/knowledge.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {sitePreparationSurvey} from '../src/game/sitePreparation.ts';
function legal(g,type,origin){for(let r=12;r<=84;r+=4)for(let i=0;i<24;i++){const x=origin.x+Math.cos(i*Math.PI/12)*r,z=origin.z+Math.sin(i*Math.PI/12)*r;if(g.placementIssue(type,x,z,0)===null&&g.workBoard.connected(g,origin.x,origin.z,x,z)&&!sitePreparationSurvey(g,{x,z,w:BUILDINGS[type].w,d:BUILDINGS[type].d}).clearable.length)return{x,z};}}
function setup(){
  const f=nativeDairyVillage(),g=decodeGame(f.save),home=g.campOf(0),t=g.tribe(0),ids={};
  for(const type of ['forge','workshop']){const p=legal(g,type,home);assert.ok(p,type);const b=g.makeBld(type,p.x,p.z,0);g.state.buildings.push(b);ids[type]=b.id;g.rebuildWalk();}
  t.ironMetallurgyVersion=1;t.food=20000;t.foodLots={provisions:20000};t.wood=300;t.stone=200;t.survival.waterLiters=500;
  return {g,t,worker:f.worker,ids};
}
function drive(g,seconds,done){const end=g.state.time+seconds;while(!done()&&g.state.time<end){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);}return done();}
test('steel and paper are age gated and refuse without real inputs', () => {
  const {g,t,worker,ids}=setup();
  t.age=g.state.age=3;t.items={...t.items,ironBloom:20,charcoal:30,cloth:20};
  assert.match(productionIssue(g,'carburizeSteel',ids.forge,worker),/advanced age/);
  assert.match(productionIssue(g,'pressPaper',ids.workshop,worker),/advanced age/);
  assert.equal(knowledgeReport(g).topics.some(x=>x.id==='late-steel'||x.id==='late-paper'),false);
  t.age=g.state.age=4;t.items={...t.items,ironBloom:0};
  assert.notEqual(productionIssue(g,'carburizeSteel',ids.forge,worker),null,'no bloom, no steel');
  assert.match(productionIssue(g,'pressPaper',ids.workshop,worker),/advanced age/,'paper waits for Renaissance');
});
test('steel is made from paid bloom and charcoal by a forge maker and survives a save', () => {
  const {g,t,worker,ids}=setup();
  t.age=g.state.age=4;t.items={...t.items,ironBloom:R.steelBloomPerBatch*2,charcoal:R.steelCharcoalPerBatch*2};
  const topic=knowledgeReport(g).topics.find(x=>x.id==='late-steel');assert.ok(topic,'topic appears in Medieval');
  const before={bloom:t.items.ironBloom,coal:t.items.charcoal,steel:t.items.steel||0};
  assert.equal(runKnowledgeAction(g,'late:steel').accepted,true,g.state.banner);
  assert.equal(t.items.ironBloom,before.bloom-R.steelBloomPerBatch,'bloom paid up front');
  assert.equal(t.items.charcoal,before.coal-R.steelCharcoalPerBatch,'charcoal paid up front');
  assert.equal(t.items.steel||0,before.steel,'no steel until the batch is delivered');
  const p=g.state.production.projects.at(-1);
  assert.ok(drive(g,900,()=>p.phase==='complete'),JSON.stringify({phase:p.phase,progress:p.progress,reason:p.blockedReason}));
  assert.equal(t.items.steel,R.steelPerBatch);
  assert.ok(R.steelPerBatch<R.steelBloomPerBatch,'carburizing loses metal; nothing is minted');
  const raw=encodeGame(g);validateGameSave(raw);const g2=decodeGame(raw);assert.equal(g2.tribe(0).items.steel,R.steelPerBatch);
});
test('paper is pressed from rags and water at a Renaissance workshop', () => {
  const {g,t,ids,worker}=setup();
  t.age=g.state.age=5;t.items={...t.items,cloth:R.paperClothPerBatch};t.survival.waterLiters=50;
  const w0=t.survival.waterLiters;
  const why=productionIssue(g,'pressPaper',ids.workshop,worker);
  const ran=runKnowledgeAction(g,'late:paper');assert.equal(ran.accepted,true,String(why)+' | '+ran.reason);
  assert.equal(t.items.cloth||0,0,'cloth consumed');
  assert.ok(t.survival.waterLiters<=w0-R.paperWaterLiters+1e-9||g.state.production.projects.at(-1).phase!=='complete','water is paid');
  const p=g.state.production.projects.at(-1);
  assert.ok(drive(g,900,()=>p.phase==='complete'),JSON.stringify({phase:p.phase,reason:p.blockedReason}));
  assert.equal(t.items.paper,R.paperPerBatch);
  assert.ok(ids.workshop>=0);
});
