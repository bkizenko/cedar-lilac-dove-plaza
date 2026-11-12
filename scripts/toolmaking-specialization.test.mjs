import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {mulberry32} from '../src/game/rng.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {craftingEffort,toolmakingEffort,toolmakingPracticeRate,recordToolmakingCompletion,validCraftingPractice,TOOLMAKING_PRACTICE_RULES} from '../src/game/crafting.ts';
import {beginFarmToolWork,beginFarmToolRepair,pauseFarmToolWork,resumeFarmToolWork,farmToolWorkAI} from '../src/game/farmTools.ts';
const shop={id:10,type:'workshop',team:0,x:0,z:0,hp:100,build:1};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('toolmaking needs its own productive work and actual completion; general XP is retained and rates stay bounded',()=>{
 const u={craftingXP:1200};assert.equal(toolmakingPracticeRate(u),1);craftingEffort(u,30,shop);assert.equal(u.craftingPractice,undefined);
 const xp=u.craftingXP;toolmakingEffort(u,10,shop,1000,1);assert.equal(u.craftingXP,xp+10);assert.equal(u.craftingPractice.toolmaking.workSeconds,10);assert.equal(toolmakingPracticeRate(u),1,'unfinished work is not a demonstrated method');recordToolmakingCompletion(u,false);assert.ok(toolmakingPracticeRate(u)>1);
 const other={craftingXP:u.craftingXP};close(craftingEffort(other,1,shop),craftingEffort(u,1,shop));
 u.craftingPractice.toolmaking.workSeconds=36000;close(toolmakingPracticeRate(u),1.2);toolmakingEffort(u,100,shop,1000,1);assert.equal(u.craftingPractice.toolmaking.workSeconds,36000);
 const before=JSON.stringify(u);for(const dt of[0,-1,NaN,Infinity])assert.equal(toolmakingEffort(u,dt,shop,10,1),0);assert.equal(JSON.stringify(u),before);
});

test('finishing a tiny remainder earns only productive wall time and completion counts are separate',()=>{
 const u={craftingXP:0};close(toolmakingEffort(u,100,shop,.125,1),.125);close(u.craftingPractice.toolmaking.workSeconds,.1);close(u.craftingXP,.1);
 recordToolmakingCompletion(u,false);recordToolmakingCompletion(u,true);assert.deepEqual(u.craftingPractice.toolmaking,{workSeconds:.1,completedTools:1,completedRepairs:1});
 u.craftingPractice.toolmaking.completedRepairs=TOOLMAKING_PRACTICE_RULES.maximumCompletions;recordToolmakingCompletion(u,true);assert.equal(u.craftingPractice.toolmaking.completedRepairs,1000000);
 assert.equal(validCraftingPractice(undefined),true);assert.equal(validCraftingPractice({}),true);
 for(const bad of[{toolmaking:{workSeconds:-1,completedTools:0,completedRepairs:0}},{toolmaking:{workSeconds:1,completedTools:.5,completedRepairs:0}},{toolmaking:{workSeconds:1,completedTools:1}},{toolmaking:{workSeconds:Infinity,completedTools:0,completedRepairs:0}},{other:{}}])assert.equal(validCraftingPractice(bad),false);
});

test('queued, travelling, interrupted and cancelled tool work cannot earn bench practice or completion',()=>{
 const people=Array.from({length:4},(_,i)=>({id:i+1,type:'worker',team:0,hp:50,x:0,z:0,carry:0,order:'hold',stuckT:0,stride:0,farmToolWork:{kind:'stoneHoe',progress:0,duration:24,workplace:10}}));
 let reached=true;const g={state:{time:0,units:people,buildings:[shop],tribes:[{}],weather:'clear',nightWork:true},tribe:()=>({}),finished:()=>true,interactionSpot:()=>({x:0,z:0}),buildingWorkReached:()=>reached,clockState:()=>({period:'Afternoon'}),workBoard:{reset(){}},steer(){},banner(){},onSfx(){}};
 const waiting=people[3];farmToolWorkAI(g,waiting,5);assert.equal(waiting.craftingPractice,undefined);assert.equal(waiting.craftingXP,undefined);
 pauseFarmToolWork(people[0],g);reached=false;farmToolWorkAI(g,waiting,5);assert.equal(waiting.craftingPractice,undefined);reached=true;farmToolWorkAI(g,waiting,1);assert.equal(waiting.craftingPractice.toolmaking.completedTools,0);
 pauseFarmToolWork(waiting,g);const before=JSON.stringify(waiting.craftingPractice);farmToolWorkAI(g,waiting,50);assert.equal(JSON.stringify(waiting.craftingPractice),before);delete waiting.farmToolWork;farmToolWorkAI(g,waiting,50);assert.equal(JSON.stringify(waiting.craftingPractice),before);
});

function legalPoint(g,origin){for(let r=10;r<=72;r+=4)for(let i=0;i<24;i++){const x=origin.x+Math.sin(i*Math.PI/12)*r,z=origin.z+Math.cos(i*Math.PI/12)*r;if(g.placementIssue('workshop',x,z,0)===null&&g.workBoard.connected(g,origin.x,origin.z,x,z))return{x,z};}}
function drive(g,seconds,until){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.step(.2);assert.deepEqual(g.simulationErrors,[]);}assert.ok(until(),g.state.units.filter(u=>u.team===0).map(u=>u.workReason).join('; '));}
test('native paid tool and repair retain the same maker evidence through strict reload; output and completion happen once',()=>{
 const random=Math.random;Math.random=mulberry32(42);
 try{
  let g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();g.vision.fill(2);g.state.autoWorkEnabled=false;g.state.paused=false;g.state.nightWork=true;
  for(const p of g.state.units.filter(u=>u.team===0)){p.order='hold';p.job=null;p.jobLock=false;}
  let u=g.state.units.find(u=>u.team===0&&u.type==='worker');const uid=u.id;const point=legalPoint(g,g.campOf(0));assert.ok(point);const b=g.makeBld('workshop',point.x,point.z,0);g.state.buildings.push(b);g.rebuildWalk();
  Object.assign(g.tribe(0),{wood:100,stone:100,food:1000,foodLots:{provisions:1000}});const wood=g.tribe(0).wood,stone=g.tribe(0).stone;
  assert.equal(beginFarmToolWork(g,'stoneHoe',0,b.id,uid),true,g.state.banner);assert.equal(u.craftingPractice,undefined);
  drive(g,120,()=>u.farmToolWork?.progress>2);assert.ok(u.craftingPractice.toolmaking.workSeconds>0);assert.equal(u.craftingPractice.toolmaking.completedTools,0);
  pauseFarmToolWork(u,g);const progress=u.farmToolWork.progress,practice=structuredClone(u.craftingPractice),xp=u.craftingXP;const save=encodeGame(g);validateGameSave(save);g=decodeGame(save);g.state.paused=false;u=g.state.units.find(p=>p.id===uid);assert.deepEqual(u.craftingPractice,practice);assert.equal(u.craftingXP,xp);assert.equal(u.farmToolWork.progress,progress);assert.equal(resumeFarmToolWork(g,u,b.id),true);
  drive(g,120,()=>u.farmTool==='stoneHoe');assert.equal(u.craftingPractice.toolmaking.completedTools,1);assert.equal(u.craftingPractice.toolmaking.completedRepairs,0);assert.equal(g.tribe(0).wood,wood-3);assert.equal(g.tribe(0).stone,stone-2);
  u.farmToolCondition=.2;assert.equal(beginFarmToolRepair(g,uid,b.id),true,g.state.banner);drive(g,120,()=>!u.farmToolWork);assert.equal(u.farmToolCondition,1);assert.equal(u.craftingPractice.toolmaking.completedTools,1);assert.equal(u.craftingPractice.toolmaking.completedRepairs,1);
  const finished=encodeGame(g),earned=structuredClone(u.craftingPractice);g=decodeGame(finished);g.state.paused=false;u=g.state.units.find(p=>p.id===uid);for(let i=0;i<10;i++)g.step(.2);assert.deepEqual(u.craftingPractice,earned);
  const legacy=structuredClone(finished);delete legacy.state.units.find(p=>p.id===uid).craftingPractice;validateGameSave(legacy);const noHistory=decodeGame(legacy).state.units.find(p=>p.id===uid);assert.equal(noHistory.craftingPractice,undefined);assert.equal(noHistory.craftingXP,u.craftingXP);
  for(const value of[-1,NaN,Infinity,36001]){const corrupt=structuredClone(finished);corrupt.state.units.find(p=>p.id===uid).craftingPractice.toolmaking.workSeconds=value;assert.throws(()=>validateGameSave(corrupt));}
 }finally{Math.random=random;}
});
