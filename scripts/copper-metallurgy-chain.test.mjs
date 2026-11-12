import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {beginProduction,productionIssue,pauseProductionProject,resumeProduction} from '../src/game/production.ts';
import {beginCopperStudy} from '../src/game/materialStudy.ts';
import {COPPER_METALLURGY_RULES as R,copperOreEnabled} from '../src/game/copperMetallurgy.ts';
import {knowledgeReport,runKnowledgeAction} from '../src/game/knowledge.ts';
import {farmToolRate} from '../src/game/farmTools.ts';
import {calendar,crop,YEAR_SECONDS} from '../src/game/settlement.ts';
const hash=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
let setupSave,workerId,kilnId,shopId,completedSave;
function legal(g,type,origin){for(let r=12;r<=84;r+=4)for(let i=0;i<24;i++){const x=origin.x+Math.cos(i*Math.PI/12)*r,z=origin.z+Math.sin(i*Math.PI/12)*r;if(g.placementIssue(type,x,z,0)===null&&g.workBoard.connected(g,origin.x,origin.z,x,z))return{x,z};}}
function drive(g,seconds,done){const end=g.state.time+seconds;while(!done()&&g.state.time<end){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);}assert.ok(done(),JSON.stringify({time:g.state.time,stock:g.tribe(0),workers:g.state.units.filter(u=>u.team===0).map(u=>({id:u.id,order:u.order,reason:u.workReason,cargo:u.itemCargo,carry:u.carry})),projects:g.state.production?.projects}));}
test.before(()=>{
 const f=nativeDairyVillage(),g=decodeGame(f.save),home=g.campOf(0);workerId=f.worker;
 for(const type of['kiln','workshop']){const p=legal(g,type,home);assert.ok(p,`native legal ${type}`);const b=g.makeBld(type,p.x,p.z,0);g.state.buildings.push(b);g.rebuildWalk();if(type==='kiln')kilnId=b.id;else shopId=b.id;}
 // Declared finite opening: legal completed workplaces and charcoal/fuel, not
 // any ore, usable copper, completed smelt or copper technique. Charcoal's own
 // timber/carbonisation/cooling chain is separately qualified, not re-claimed.
 Object.assign(g.tribe(0),{food:20000,foodLots:{provisions:20000},wood:200,stone:200,copper:0,items:{...g.tribe(0).items,charcoal:4}});g.tribe(0).survival.waterLiters=1000;setupSave=encodeGame(g);validateGameSave(setupSave);
});
test('native finite extraction yields ore, paid charcoal smelting physically delivers metal, and its prototype equips a productive wearing tool',()=>{
 let g=decodeGame(setupSave),u=g.state.units.find(u=>u.id===workerId),t=g.tribe(0);const terrain=hash(g);assert.equal(copperOreEnabled(g,0),true);assert.equal(t.copper,0);
 const original=new Map(g.state.copper.map(n=>[n.id,n.amount]));
 while((t.items?.copperOre||0)<16){const node=g.state.copper.filter(n=>n.amount>0&&g.workBoard.connected(g,u.x,u.z,n.x,n.z)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];assert.ok(node,'actual reachable generated copper deposit');const old=t.items?.copperOre||0;g.clearSelect();u.selected=true;g.issueGather(node);drive(g,300,()=>(t.items?.copperOre||0)>old);g.assignJob('hold');}
 const ore=t.items.copperOre,removed=g.state.copper.reduce((n,node)=>n+original.get(node.id)-node.amount,0);close(removed,ore+(u.itemCargo?.copperOre||0));assert.equal(t.copper,0,'mining cannot mint usable metal');
 if((u.itemCargo?.copperOre||0)>0){g.soundRecall();drive(g,120,()=>!u.itemCargo);}
 assert.ok(knowledgeReport(g).topics.find(x=>x.id==='copper-smelting').observation.includes('ore delivered'));
 const charcoal=t.items.charcoal;t.items.charcoal=0;const missing=JSON.stringify(g.state);assert.match(productionIssue(g,'smeltCopper',kilnId,workerId),/charcoal/);assert.equal(beginProduction(g,'smeltCopper',kilnId,workerId),false);assert.equal(g.tribe(0).copper,0);assert.equal(g.state.production?.projects?.length||0,0);t.items.charcoal=charcoal;
 for(let i=0;i<2;i++){
  assert.equal(beginProduction(g,'smeltCopper',kilnId,workerId),true,g.state.banner);const p=g.state.production.projects.at(-1),pid=p.id,paidOre=t.items.copperOre,paidFuel=t.items.charcoal;drive(g,120,()=>p.progress>2);assert.equal(t.copper,i*R.metalPerBatch,'no virtual output while working');
  if(i===0){assert.equal(pauseProductionProject(g,pid),true);const progress=p.progress,save=encodeGame(g);validateGameSave(save);g=decodeGame(save);u=g.state.units.find(x=>x.id===workerId);t=g.tribe(0);const q=g.state.production.projects.find(x=>x.id===pid);assert.equal(q.progress,progress);assert.equal(t.items.copperOre,paidOre);assert.equal(t.items.charcoal,paidFuel);for(let j=0;j<5;j++){g.state.paused=false;g.step(.2);}assert.equal(q.progress,progress,'manual pause stays paused');assert.equal(resumeProduction(g,pid,workerId),true);}
  drive(g,160,()=>g.state.production.projects.find(x=>x.id===pid).phase==='complete');assert.equal(t.copper,(i+1)*R.metalPerBatch);assert.equal(t.items.copperMetal,undefined,'metal enters one usable stock only after return');assert.equal(t.items.copperOre,paidOre);assert.equal(t.items.charcoal,paidFuel);
 }
 assert.equal(g.state.production.metrics.consumed.copperOre,16);assert.equal(g.state.production.metrics.consumed.charcoal,4);assert.equal(g.state.production.metrics.produced.copperMetal,8);assert.equal(t.productionPractice.smeltCopper.batches,2);
 assert.equal(beginCopperStudy(g,shopId,0,'logs'),true,g.state.banner);drive(g,140,()=>u.farmTool==='copperTools');assert.equal(t.copper,0);assert.equal(t.copperExperiment,true);assert.equal(u.farmToolCondition,1);assert.ok(farmToolRate(u,0)>1);
 const fieldPoint=legal(g,'farm',g.campOf(0));assert.ok(fieldPoint);t.cultivated=['grain'];t.seeds=20;const field=g.makeBld('farm',fieldPoint.x,fieldPoint.z,0);g.state.buildings.push(field);g.rebuildWalk();
 if(calendar(g).phase!==0||calendar(g).remaining<150)drive(g,YEAR_SECONDS+1,()=>calendar(g).phase===0&&calendar(g).remaining>200);crop(g,field);g.clearSelect();u.selected=true;g.issueGather(field);drive(g,100,()=>field.crop.planted>.01);assert.ok(u.farmToolCondition<1);assert.equal(hash(g),terrain);completedSave=encodeGame(g);validateGameSave(completedSave);assert.doesNotThrow(()=>decodeGame(completedSave));
 if(process.env.COPPER_METALLURGY_NATIVE_SAVE){assert.ok(isAbsolute(process.env.COPPER_METALLURGY_NATIVE_SAVE));writeFileSync(process.env.COPPER_METALLURGY_NATIVE_SAVE,JSON.stringify(completedSave));}
});
test('normal adoption preserves old usable copper and loaded cargo, and strict saves reject invalid ore rules/cargo',()=>{
 const g=decodeGame(setupSave),u=g.state.units.find(x=>x.id===workerId),t=g.tribe(0);delete t.copperMetallurgyVersion;t.copper=7;u.carry=3;u.carryType='copper';
 const before={stock:t.copper,carry:u.carry};assert.equal(runKnowledgeAction(g,'metallurgy:adopt').accepted,true);assert.equal(t.copper,before.stock);assert.equal(u.carry,before.carry);assert.equal(u.carryType,'copper');assert.equal(t.items.copperOre,undefined);g.soundRecall();drive(g,100,()=>u.carry===0);assert.equal(t.copper,10);assert.equal(t.items.copperOre,undefined);
 const good=encodeGame(g);validateGameSave(good);for(const version of[0,2,'1',null]){const bad=structuredClone(good);bad.state.tribes[0].copperMetallurgyVersion=version;assert.throws(()=>validateGameSave(bad));}
 for(const n of[-1,Infinity,NaN]){const bad=structuredClone(good);bad.state.units.find(x=>x.id===workerId).itemCargo={copperOre:n};assert.throws(()=>validateGameSave(bad));}
});
test('blocked smelting admission does not consume ore/fuel or allocate paid work',()=>{
 const g=decodeGame(setupSave),u=g.state.units.find(x=>x.id===workerId),t=g.tribe(0);t.items.copperOre=8;const before=JSON.stringify({stock:t,nextId:g.state.nextId,projects:g.state.production?.projects});const spot=g.interactionSpot;
 // A focused admission seam, not native terrain/reachability acceptance.
 g.interactionSpot=()=>null;assert.equal(beginProduction(g,'smeltCopper',kilnId,u.id),false);assert.equal(JSON.stringify({stock:t,nextId:g.state.nextId,projects:g.state.production?.projects}),before);g.interactionSpot=spot;
});
