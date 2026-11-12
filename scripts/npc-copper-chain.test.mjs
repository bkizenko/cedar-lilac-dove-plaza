import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {Game} from '../src/game/sim.ts';
import {mulberry32} from '../src/game/rng.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {developRivalCopper,rivalCopperChainStatus,RIVAL_COPPER_CHAIN_RULES} from '../src/game/materialStudy.ts';
import {copperIndustrySupply} from '../src/game/copperIndustrySupply.ts';
import {rivalMaterialPriority} from '../src/game/rivalDevelopment.ts';
import {isDependent,calendar,YEAR_SECONDS} from '../src/game/settlement.ts';
const team=1,hash=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
let opening,makerId,siteIds;
function legal(g,type,home,owner=team){for(let r=12;r<=80;r+=4)for(let i=0;i<24;i++){const x=home.x+Math.cos(i*Math.PI/12)*r,z=home.z+Math.sin(i*Math.PI/12)*r;if(!g.placementIssue(type,x,z,owner)&&g.workBoard.connected(g,home.x,home.z,x,z))return{x,z};}}
function drive(g,seconds,done,industry=true){const end=g.state.time+seconds;let steps=0;while(g.state.time<end&&!done()&&steps++<seconds*100+1000){if(industry)developRivalCopper(g,team);g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);}assert.ok(done(),JSON.stringify({time:g.state.time,status:rivalCopperChainStatus(g,team),supply:copperIndustrySupply(g,team),stock:g.tribe(team),workers:g.state.units.filter(u=>u.team===team).map(u=>({id:u.id,order:u.order,job:u.job,lock:u.jobLock,node:u.node?.id,reason:u.workReason,cargo:u.itemCargo,carry:u.carry,study:u.copperStudy})),projects:g.state.production?.projects}));}
test.before(()=>{
 const random=Math.random;Math.random=mulberry32(42);
 try{
  const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();g.vision.fill(2);g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';g.state.raidT=g.state.birthT=10000;g.state.visitorTimer=900;g.raidT=g.seaT=g.calamityT=10000;
  for(const t of g.state.tribes)t.thinkT=10000;for(const u of g.state.units){u.order='hold';u.jobLock=true;u.job=null;}
  const player=g.tribe(0);Object.assign(player,{food:20000,foodLots:{provisions:20000},wood:200});player.survival.waterLiters=2000;const warmPoint=legal(g,'hearth',g.campOf(0),0);assert.ok(warmPoint);g.state.buildings.push(g.makeBld('hearth',warmPoint.x,warmPoint.z,0));g.rebuildWalk();
  const t=g.tribe(team),home=g.campOf(team),maker=g.state.units.find(u=>u.team===team&&u.type==='worker'&&!isDependent(g,u));assert.ok(maker);makerId=maker.id;maker.jobLock=false;
  Object.assign(t,{age:0,food:20000,foodLots:{provisions:20000},wood:0,stone:100,copper:0,items:{},cultivated:['grain'],seeds:20});delete t.copperMetallurgyVersion;delete t.copperExperiment;t.survival.waterLiters=2000;
  // Controlled established native opening: actual generated residents/resources,
  // completed legally sited infrastructure and finite provisions. No timber,
  // ore, charcoal, usable copper or method is pre-completed. Known ground is an
  // explicit opening survey, not a claim of autonomous exploration.
  (g.state.rivalKnowledge??=[]).push({team,cells:Array.from({length:1024},(_,i)=>i)});siteIds={};
  for(const type of['hearth','kiln','workshop']){const point=legal(g,type,home);assert.ok(point,`legal native ${type}`);const b=g.makeBld(type,point.x,point.z,team);g.state.buildings.push(b);siteIds[type]=b.id;g.rebuildWalk();}
  opening=structuredClone(encodeGame(g));validateGameSave(opening);
 }finally{Math.random=random;}
});
test('NPC actual finite timber and ore become paid charcoal, delivered metal and a wearing owned tool; in-flight reload preserves all custody',()=>{
 let g=decodeGame(opening),t=g.tribe(team),maker=g.state.units.find(u=>u.id===makerId);const terrain=hash(g),trees=new Map(g.state.trees.map(n=>[n.id,n.amount])),ore=new Map(g.state.copper.map(n=>[n.id,n.amount]));
 assert.equal(developRivalCopper(g,team),true);assert.equal(t.copperMetallurgyVersion,1);assert.equal(t.copper,0);assert.equal(t.wood,0);
 drive(g,300,()=>g.state.units.some(u=>u.team===team&&(u.itemCargo?.copperOre||0)>0));const held=g.state.units.find(u=>u.team===team&&(u.itemCargo?.copperOre||0)>0),transit=structuredClone(held.itemCargo);assert.equal(t.copper,0);const saved=structuredClone(encodeGame(g));validateGameSave(saved);g=decodeGame(saved);t=g.tribe(team);maker=g.state.units.find(u=>u.id===makerId);assert.deepEqual(g.state.units.find(u=>u.id===held.id).itemCargo,transit);
 let maxProjects=0,steps=0;const end=g.state.time+1500;
 while(!t.copperExperiment&&g.state.time<end&&steps++<64000){developRivalCopper(g,team);g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended,g.state.endReason);const active=(g.state.production?.projects||[]).filter(p=>p.team===team&&['makeCharcoal','smeltCopper'].includes(p.recipe)&&!['complete','lost'].includes(p.phase));maxProjects=Math.max(maxProjects,active.length);assert.ok(active.length<=1,'one paid copper-chain batch per owner');}
 assert.equal(t.copperExperiment,true,JSON.stringify({status:rivalCopperChainStatus(g,team),stock:t,workers:g.state.units.filter(u=>u.team===team).map(u=>({id:u.id,order:u.order,reason:u.workReason,job:u.job,lock:u.jobLock,study:u.copperStudy,cargo:u.itemCargo})),projects:g.state.production?.projects}));assert.equal(maxProjects,1);
 const toolMaker=g.state.units.find(u=>u.team===team&&u.farmTool==='copperTools');assert.ok(toolMaker);assert.equal(toolMaker.farmToolCondition,1);assert.ok(g.state.trees.some(n=>n.amount<trees.get(n.id)));assert.ok(g.state.copper.some(n=>n.amount<ore.get(n.id)));assert.equal(t.productionPractice.smeltCopper.batches,2);assert.equal(t.productionPractice.makeCharcoal.batches,2);assert.equal(g.state.copperTrials.copperAllocated,8);assert.equal(g.state.copperTrials.woodAllocated,4);assert.equal(t.copper,0);
 const consumed=g.state.production.metrics.consumed;assert.equal(consumed.copperOre,16);assert.equal(consumed.charcoal,4);assert.equal(g.state.production.metrics.produced.copperMetal,8);assert.equal(hash(g),terrain);
 const minedBefore=g.state.copper.reduce((n,p)=>n+ore.get(p.id)-p.amount,0);const restEnd=g.state.time+30;drive(g,31,()=>g.state.time>=restEnd);assert.equal(g.state.copper.reduce((n,p)=>n+ore.get(p.id)-p.amount,0),minedBefore,'satisfied owner does not mine another redundant copper load');
 if(calendar(g).phase!==0||calendar(g).remaining<150)drive(g,YEAR_SECONDS+1,()=>calendar(g).phase===0&&calendar(g).remaining>200);
 const point=legal(g,'farm',g.campOf(team));assert.ok(point);const seeds=t.seeds;assert.equal(g.placeBuilding('farm',point.x,point.z,team),true);const field=g.state.buildings.at(-1);assert.equal(t.seeds,seeds-4);

 // A controlled own farming order exercises the existing NPC movement/field
 // executor; strategic field selection is not claimed by this production test.
 toolMaker.order='gather';toolMaker.job='food';toolMaker.jobLock=true;toolMaker.node=field;toolMaker.tx=field.x;toolMaker.tz=field.z;drive(g,100,()=>field.crop.planted>.01&&toolMaker.farmToolCondition<1,false);assert.ok(toolMaker.farmToolCondition<1,'the newly owned tool wears only through actual field labor');assert.equal(hash(g),terrain);const final=encodeGame(g);validateGameSave(final);assert.doesNotThrow(()=>decodeGame(final));
 if(process.env.NPC_COPPER_NATIVE_SAVE){assert.ok(isAbsolute(process.env.NPC_COPPER_NATIVE_SAVE));writeFileSync(process.env.NPC_COPPER_NATIVE_SAVE,JSON.stringify(final));}
});
test('food, actor and infrastructure admission never creates goods or free buildings',()=>{
 for(const mode of['food','actor','infrastructure','no-known-inputs']){const g=decodeGame(opening),t=g.tribe(team);if(mode==='food'){t.food=0;t.foodLots={provisions:0};}if(mode==='actor')for(const u of g.state.units.filter(u=>u.team===team))u.jobLock=true;if(mode==='infrastructure')g.state.buildings=g.state.buildings.filter(b=>b.id!==siteIds.kiln);if(mode==='no-known-inputs'){g.state.copper=[];g.state.trees=[];}
  const stock={copper:t.copper,wood:t.wood,items:structuredClone(t.items)},buildings=g.state.buildings.length;developRivalCopper(g,team);assert.deepEqual({copper:t.copper,wood:t.wood,items:t.items},stock);assert.equal(g.state.buildings.length,buildings);assert.equal(g.state.production?.projects?.length||0,0);if(mode!=='no-known-inputs')assert.equal(t.copperMetallurgyVersion,undefined);assert.ok(rivalCopperChainStatus(g,team));}
});
test('stored, transit and already paid ore/metal meet demand once and suppress redundant extraction',()=>{
 const g=decodeGame(opening),t=g.tribe(team),u=g.state.units.find(p=>p.id===makerId);t.copperMetallurgyVersion=1;t.age=1;t.copper=4;t.items.copperOre=8;u.itemCargo={copperOre:4};u.carry=3;u.carryType='copper';g.state.production={projects:[{team,recipe:'smeltCopper',phase:'working'},{team,recipe:'smeltCopper',phase:'complete'}]};
 const s=copperIndustrySupply(g,team);assert.deepEqual(s,{oreAtCache:8,oreInTransit:4,legacyMetalInTransit:3,paidMetal:4,ore:12,usable:4,effectiveMetal:15});assert.equal(rivalMaterialPriority(g,u,'copper',{wood:0,stone:0,copper:15,iron:0}),0);assert.equal(rivalMaterialPriority(g,u,'copper',{wood:0,stone:0,copper:14,iron:0}),0);
 assert.ok(RIVAL_COPPER_CHAIN_RULES.reviewSeconds>0);assert.equal(rivalCopperChainStatus(g,team),null);
});
