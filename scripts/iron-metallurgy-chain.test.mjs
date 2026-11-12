import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {beginProduction,productionIssue,productionSlots,pauseProductionProject,resumeProduction} from '../src/game/production.ts';
import {IRON_METALLURGY_RULES as R,ironOreEnabled} from '../src/game/ironMetallurgy.ts';
import {knowledgeReport,runKnowledgeAction} from '../src/game/knowledge.ts';
import {ironKnowledgeTopic} from '../src/game/ironKnowledge.ts';
import {beginFarmToolWork,beginFarmToolRepair,farmToolRate,farmToolRequirement} from '../src/game/farmTools.ts';
import {calendar,crop,YEAR_SECONDS} from '../src/game/settlement.ts';
import {bindIronSmeltLoad,carriedLoadUnits} from '../src/game/carriedLoad.ts';
import {droppedParcels,claimParcel} from '../src/game/stolenCargo.ts';
const hash=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
let setupSave,workerId,forgeId,hearthId,fieldId,minedCarrierSave,completedSave;
function legal(g,type,origin){for(let r=12;r<=84;r+=4)for(let i=0;i<24;i++){const x=origin.x+Math.cos(i*Math.PI/12)*r,z=origin.z+Math.sin(i*Math.PI/12)*r;if(g.placementIssue(type,x,z,0)===null&&g.workBoard.connected(g,origin.x,origin.z,x,z))return{x,z};}}
function drive(g,seconds,done){const end=g.state.time+seconds;while(!done()&&g.state.time<end){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);}assert.ok(done(),JSON.stringify({time:g.state.time,iron:g.tribe(0).iron,items:g.tribe(0).items,workers:g.state.units.filter(u=>u.team===0).map(u=>({id:u.id,order:u.order,reason:u.workReason,cargo:u.itemCargo,carry:u.carry})),projects:g.state.production?.projects}));}
function strict(g){const raw=encodeGame(g);validateGameSave(raw);return decodeGame(raw);}
test.before(()=>{
 const f=nativeDairyVillage(),g=decodeGame(f.save),home=g.campOf(0);workerId=f.worker;hearthId=f.hearth;
 // Finite authored Age2 opening and surveyed ground, completed legal forge/field,
 // initial food/water/logs and seed knowledge. NO ore, bloom, usable iron,
 // charcoal, iron technique, successful metallurgy or equipped tools granted.
 const t=g.tribe(0);t.age=2;g.state.age=2;t.cultivated=['grain'];t.seeds=40;
 for(const type of ['forge','farm']){const p=legal(g,type,home);assert.ok(p,`native legal ${type}`);const b=g.makeBld(type,p.x,p.z,0);g.state.buildings.push(b);g.rebuildWalk();if(type==='forge')forgeId=b.id;else fieldId=b.id;}
 Object.assign(t,{food:20000,foodLots:{provisions:20000},wood:300,stone:200,copper:0,iron:0,items:{...t.items,charcoal:0}});t.survival.waterLiters=1500;
 setupSave=encodeGame(g);validateGameSave(setupSave);
});

test('native finite ore and actual charcoal become delivered bloom then usable iron, equipping a working and repaired owned tool',()=>{
 let g=decodeGame(setupSave),u=g.state.units.find(u=>u.id===workerId),t=g.tribe(0);let activeId=workerId;const terrain=hash(g);assert.equal(ironOreEnabled(g,0),false);
 const before=JSON.stringify(g.state);assert.ok(ironKnowledgeTopic(g).actions.some(a=>a.id==='iron:adopt'));assert.equal(JSON.stringify(g.state),before,'read-only topic creates no stock, adoption or receipts');
 assert.equal(runKnowledgeAction(g,'iron:adopt').accepted,true);
 const original=new Map(g.state.iron.map(n=>[n.id,n.amount]));
 while((t.items.ironOre||0)<R.orePerBatch*2){const node=g.state.iron.filter(n=>n.amount>0&&g.workBoard.connected(g,u.x,u.z,n.x,n.z)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];assert.ok(node,'actual reachable generated iron deposit');const old=t.items.ironOre||0;g.clearSelect();u.selected=true;g.issueGather(node);
  if(!minedCarrierSave){drive(g,450,()=>(u.itemCargo?.ironOre||0)>0);minedCarrierSave=structuredClone(encodeGame(g));}
  drive(g,450,()=>(t.items.ironOre||0)>old);g.assignJob('hold');
 }
 if((u.itemCargo?.ironOre||0)>0){g.soundRecall();drive(g,160,()=>!u.itemCargo);}
 const removed=g.state.iron.reduce((n,node)=>n+original.get(node.id)-node.amount,0);close(removed,t.items.ironOre+(u.itemCargo?.ironOre||0));assert.equal(t.iron,0,'mining cannot mint usable metal');
 assert.match(productionIssue(g,'smeltIron',forgeId,workerId),/charcoal/);assert.equal(beginProduction(g,'smeltIron',forgeId,workerId),false);assert.equal(g.state.production?.projects.filter(p=>p.recipe==='smeltIron').length||0,0);assert.equal(t.iron,0);
 for(let i=0;i<5;i++){assert.equal(beginProduction(g,'makeCharcoal',hearthId,workerId),true,g.state.banner);const id=g.state.production.projects.at(-1).id;drive(g,400,()=>g.state.production.projects.find(p=>p.id===id).phase==='complete');assert.equal(t.items.charcoal,(i+1)*2);}
 assert.equal(g.state.production.metrics.logsUsed,40,'all ten charcoal units came from actual paid timber');
 for(let i=0;i<2;i++)for(const recipe of ['smeltIron','consolidateIron']){
  const oldMetal=t.iron,oldOre=t.items.ironOre,oldCharcoal=t.items.charcoal;
  const begun=i===0?runKnowledgeAction(g,recipe==='smeltIron'?'iron:smelt':'iron:consolidate'):{accepted:beginProduction(g,recipe,forgeId,activeId)};assert.equal(begun.accepted,true,begun.reason||g.state.banner);
  const p=g.state.production.projects.at(-1),id=p.id;let actorId=p.actorId;u=g.state.units.find(x=>x.id===actorId);assert.ok(carriedLoadUnits(u)>0,'original paid input packet burdens its actor');
  drive(g,160,()=>p.progress>2);assert.equal(t.iron,oldMetal,'work alone does not deposit output');
  if(i===0&&recipe==='smeltIron'){assert.equal(pauseProductionProject(g,id),true);const progress=p.progress;g=strict(g);t=g.tribe(0);u=g.state.units.find(x=>x.id===actorId);const held=g.state.production.projects.find(q=>q.id===id);for(let j=0;j<5;j++){g.state.paused=false;g.step(.2);}assert.equal(held.progress,progress);const paidOre=t.items.ironOre,paidFuel=t.items.charcoal;assert.equal(resumeProduction(g,id,actorId),true);assert.equal(t.items.ironOre,paidOre);assert.equal(t.items.charcoal,paidFuel);
   // The material/work already at the real forge survives its maker's death.
   u.hp=0;drive(g,2,()=>held.actorId===null&&held.phase==='paused');
   const replacement=g.state.units.find(a=>a.team===0&&a.hp>0&&a.type==='worker'&&!a.maturesAt&&a.id!==actorId&&!a.productionProjectId&&!a.waterWork);assert.ok(replacement);replacement.jobLock=false;
   const paidBefore=JSON.stringify(t.items),workBefore=held.progress;assert.equal(resumeProduction(g,id,replacement.id),true);assert.equal(JSON.stringify(t.items),paidBefore);assert.equal(held.progress,workBefore);actorId=replacement.id;activeId=actorId;u=replacement;
  }
  drive(g,200,()=>g.state.production.projects.find(q=>q.id===id).phase==='returning');assert.ok(carriedLoadUnits(u)>0);g=strict(g);t=g.tribe(0);u=g.state.units.find(x=>x.id===actorId);assert.ok(carriedLoadUnits(u)>0,'strict reload binds original output packet');
  drive(g,180,()=>g.state.production.projects.find(q=>q.id===id).phase==='complete');assert.equal(t.items.ironMetal,undefined,'only the legacy usable iron treasury receives delivered metal');
  if(recipe==='smeltIron'){assert.equal(t.iron,oldMetal);assert.equal(t.items.ironOre,oldOre-R.orePerBatch);assert.equal(t.items.charcoal,oldCharcoal-R.smeltingCharcoalPerBatch);assert.equal(t.items.ironBloom,R.bloomPerBatch);}else{assert.equal(t.iron,oldMetal+R.metalPerBatch);assert.equal(t.items.ironBloom,0);assert.equal(t.items.charcoal,oldCharcoal-R.forgingCharcoalPerBatch);}
 }
 assert.equal(t.iron,8);assert.equal(t.items.charcoal,0);assert.equal(t.productionPractice.smeltIron.batches,2);assert.equal(t.productionPractice.consolidateIron.batches,2);
 assert.equal(g.state.production.metrics.consumed.ironOre,16);assert.equal(g.state.production.metrics.consumed.ironBloom,8);assert.equal(g.state.production.metrics.produced.ironMetal,8);
 u=g.state.units.find(x=>x.id===activeId);assert.equal(beginFarmToolWork(g,'ironTools',0,forgeId,activeId),true,g.state.banner);drive(g,180,()=>u.farmTool==='ironTools');assert.equal(t.iron,4);assert.equal(u.farmToolCondition,1);assert.ok(farmToolRate(u,0)>1);
 if(calendar(g).phase!==0||calendar(g).remaining<200)drive(g,YEAR_SECONDS+1,()=>calendar(g).phase===0&&calendar(g).remaining>200);
 const field=g.state.buildings.find(b=>b.id===fieldId);crop(g,field);g.clearSelect();u.selected=true;g.issueGather(field);drive(g,160,()=>field.crop.planted>.01);assert.ok(u.farmToolCondition<1,'productive field work wears the actual owned set');
 drive(g,220,()=>u.farmToolCondition<.9);g.assignJob('hold');assert.equal(beginFarmToolRepair(g,u.id,forgeId),true,g.state.banner);assert.equal(t.iron,3);drive(g,120,()=>!u.farmToolWork&&u.farmToolCondition===1);
 assert.equal(hash(g),terrain);completedSave=encodeGame(g);validateGameSave(completedSave);assert.equal(decodeGame(completedSave).tribe(0).iron,3);
 if(process.env.IRON_METALLURGY_NATIVE_SAVE){assert.ok(isAbsolute(process.env.IRON_METALLURGY_NATIVE_SAVE));writeFileSync(process.env.IRON_METALLURGY_NATIVE_SAVE,JSON.stringify(completedSave));console.log(JSON.stringify({ironFixture:process.env.IRON_METALLURGY_NATIVE_SAVE,workerId:u.id,forgeId,fieldId,usableIron:t.iron,sourceSeed:42,sourceVersion:18,initialAge:2}));}
});

test('legacy iron, loaded metal and paid tool jobs survive adoption; strict flags/cargo and the existing Iron Age tool gate remain enforced',()=>{
 let g=decodeGame(setupSave),t=g.tribe(0),u=g.state.units.find(x=>x.id===workerId),carrier=g.state.units.find(x=>x.team===0&&x.id!==workerId&&x.type==='worker');t.iron=7;carrier.carry=3;carrier.carryType='iron';
 assert.equal(beginFarmToolWork(g,'ironTools',0,forgeId,workerId),true);const paid=structuredClone(u.farmToolWork),stock=t.iron;
 assert.equal(runKnowledgeAction(g,'iron:adopt').accepted,true);assert.equal(t.iron,stock);assert.equal(carrier.carry,3);assert.equal(carrier.carryType,'iron');assert.deepEqual(u.farmToolWork,paid);assert.equal(t.items.ironOre,undefined);
 const good=encodeGame(g);validateGameSave(good);g=decodeGame(good);assert.deepEqual(g.state.units.find(x=>x.id===workerId).farmToolWork,paid);
 for(const version of [0,2,'1',null]){const bad=structuredClone(good);bad.state.tribes[0].ironMetallurgyVersion=version;assert.throws(()=>validateGameSave(bad));}
 for(const amount of [-1,Infinity,NaN]){const bad=structuredClone(good);bad.state.units.find(x=>x.id===workerId).itemCargo={ironOre:amount};assert.throws(()=>validateGameSave(bad));}
 g.tribe(0).age=1;assert.match(farmToolRequirement(g,'ironTools'),/Iron Age/,'a delivered-method flag never bypasses the original tool era requirement');
 const report=knowledgeReport(g).topics.find(x=>x.id==='iron-smelting');assert.ok(report.actions.some(a=>a.id==='iron:smelt'));assert.equal(report.metrics.successfulConsolidations,0);
});

test('iron recipes have finite forge slots and failed admission cannot charge materials; load views retain one original paid packet',()=>{
 const g=decodeGame(setupSave),t=g.tribe(0);assert.equal(runKnowledgeAction(g,'iron:adopt').accepted,true);t.items.ironOre=16;t.items.charcoal=8;assert.equal(productionSlots(g.state.buildings.find(b=>b.id===forgeId)),1);
 assert.equal(beginProduction(g,'smeltIron',forgeId,workerId),true);const old=JSON.stringify({items:t.items,projects:g.state.production.projects,nextId:g.state.nextId});assert.match(productionIssue(g,'smeltIron',forgeId),/slots/);assert.equal(beginProduction(g,'smeltIron',forgeId),false);assert.equal(JSON.stringify({items:t.items,projects:g.state.production.projects,nextId:g.state.nextId}),old);
 const u={id:7,team:0,carry:0},p={id:10,recipe:'smeltIron',actorId:7,team:0,phase:'carrying',resumePhase:'carrying'};bindIronSmeltLoad(u,p);close(carriedLoadUnits(u),12/40);p.phase='paused';close(carriedLoadUnits(u),12/40);p.resumePhase='returning';close(carriedLoadUnits(u),4/40);p.phase='stored';p.actorId=null;close(carriedLoadUnits(u),0);assert.equal(u.itemCargo,undefined);
});

test('actual mined iron ore falls at the dead carrier and returns physically as ore once, never as usable iron',()=>{
 assert.ok(minedCarrierSave);let g=decodeGame(minedCarrierSave),miner=g.state.units.find(x=>x.id===workerId);const ore=miner.itemCargo.ironOre,stock=g.tribe(0).items.ironOre||0;
 miner.hp=0;g.state.paused=false;g.step(.2);let parcel=droppedParcels(g).find(p=>p.kind==='ironOre');assert.ok(parcel);close(parcel.amount,ore);assert.equal(parcel.x,miner.x);assert.equal(parcel.z,miner.z);
 g=strict(g);parcel=droppedParcels(g).find(p=>p.kind==='ironOre');const runner=g.state.units.find(x=>x.team===0&&x.hp>0&&x.type==='worker');runner.jobLock=false;runner.order='hold';assert.equal(claimParcel(g,runner,parcel.id),true);
 drive(g,500,()=>!droppedParcels(g).some(p=>p.kind==='ironOre')&&!g.state.droppedCargo.trips.length);close(g.tribe(0).items.ironOre,stock+ore);assert.equal(g.tribe(0).iron,0);assert.deepEqual([g.state.droppedCargo.ledger.dropped,g.state.droppedCargo.ledger.pickedUp,g.state.droppedCargo.ledger.deposited],[ore,ore,ore]);
 const restored=strict(g);close(restored.tribe(0).items.ironOre,stock+ore);assert.equal(restored.tribe(0).iron,0);
});
