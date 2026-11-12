import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {Game} from '../src/game/sim.ts';
import {mulberry32} from '../src/game/rng.ts';
import {herdRules} from '../src/game/animalSpecies.ts';
import {packAnimalFrom} from '../src/game/packAnimalState.ts';
import {draftTractionReady,farmToolRate,farmToolCondition,beginFarmToolWork,beginFarmToolRepair,pauseFarmToolWork,resumeFarmToolWork,farmToolWorkAI,validFarmToolUnit,FARM_TOOLS,FARM_TOOL_MAINTENANCE} from '../src/game/farmTools.ts';
import {recordDraftTractionWork} from '../src/game/draftTraction.ts';
import {calendar,crop,farmWork,farmHarvestEstimate,YEAR_SECONDS} from '../src/game/settlement.ts';
import {fieldTerrain} from '../src/game/fieldTerrain.ts';
import {craftingQueue} from '../src/game/crafting.ts';
import {takeFarmTool,equipCarriedFarmTool,validFarmToolCargo} from '../src/game/farmToolCargo.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const terrainHash=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
const healthy=()=>({id:2,species:'horse',hp:4,maxHp:4,scale:1.2,sex:'male',born:-600,tamedAt:0,hunger:0,thirstSeconds:0});
const handler=()=>({id:1,team:0,type:'worker',hp:48,haulage:'pack',packAnimal:healthy(),farmTool:'woodenArd',farmToolCondition:1});

test('wooden ard traction needs the real living horse and spring work; practice, condition and welfare bound its rate',()=>{
 const u=handler();assert.equal(draftTractionReady(u),true);close(farmToolRate(u,0),1.4);
 assert.equal(recordDraftTractionWork(u,0,60),60);close(farmToolRate(u,0),1.8);assert.equal(recordDraftTractionWork(u,0,60),60);close(farmToolRate(u,0),2.2);
 for(const phase of[1,2,3]){const before=JSON.stringify(u);assert.equal(farmToolRate(u,phase),1);assert.equal(recordDraftTractionWork(u,phase,10),0);assert.equal(JSON.stringify(u),before);}
 for(const seconds of[0,-1,NaN,Infinity]){assert.equal(recordDraftTractionWork(u,0,seconds),0);assert.equal(u.draftPracticeSeconds,120);}
 u.farmToolCondition=.5;close(farmToolRate(u,0),1.6);u.farmToolCondition=0;close(farmToolRate(u,0),1);assert.equal(recordDraftTractionWork(u,0,5),0);
 const unavailable=[p=>delete p.packAnimal,p=>p.packAnimal.species='goat',p=>p.packAnimal.hp=0,p=>delete p.haulage,p=>p.boat={id:4,phase:'aboard'},p=>p.militia=true,p=>p.prisoner={},p=>p.hp=0,p=>delete p.farmTool,p=>p.farmToolWork={mode:'repair'},p=>p.packAnimal.hunger=100,p=>p.packAnimal.thirstSeconds=1000];
 for(const edit of unavailable){const a=handler();edit(a);assert.equal(farmToolRate(a,0),1);assert.equal(recordDraftTractionWork(a,0,12),0);assert.equal(a.draftPracticeSeconds,undefined);}
 const tired=handler();tired.draftPracticeSeconds=120;tired.packAnimal.hp=2;assert.ok(farmToolRate(tired,0)>1&&farmToolRate(tired,0)<2.2);const sameAnimal=JSON.stringify(tired.packAnimal);recordDraftTractionWork(tired,0,10);assert.equal(JSON.stringify(tired.packAnimal),sameAnimal,'practice never creates feed, water or animal health');
});

function benchFixture(){
 const b={id:10,type:'workshop',team:0,hp:100,build:1,x:0,z:0};
 const people=Array.from({length:4},(_,i)=>({...handler(),id:i+1,packAnimal:{...healthy(),id:20+i},farmToolCondition:.2,carry:0,order:'hold',x:0,y:4,z:0,stride:0,stuckT:0,draftPracticeSeconds:75}));
 const stock={wood:40,stone:20,copper:0,iron:0};
 const g={state:{time:0,units:people,buildings:[b],tribes:[stock],weather:'clear',nightWork:true},tribe:()=>stock,finished:()=>true,interactionSpot:()=>({x:0,z:0}),buildingWorkReached:()=>true,clockState:()=>({period:'Afternoon'}),workBoard:{reset(){}},banner(){},onSfx(){}};
 return{g,b,people,stock};
}

test('ard repair pays exact materials, retains one worn tool and practice through queue, pause and completion',()=>{
 const{g,b,people,stock}=benchFixture();assert.equal(FARM_TOOLS.woodenArd.wood,10);assert.equal(FARM_TOOLS.woodenArd.stone,2);assert.equal(FARM_TOOLS.woodenArd.seconds,60);assert.equal(FARM_TOOL_MAINTENANCE.lifeWorkSeconds.woodenArd,900);
 for(const u of people)assert.equal(beginFarmToolRepair(g,u.id,b.id),true);assert.equal(stock.wood,28);assert.equal(stock.stone,16);assert.equal(craftingQueue(g,b).length,4);
 const u=people[3];assert.equal(u.farmToolWork.duration,30);assert.deepEqual(u.farmToolWork.paid,{wood:3,stone:1,copper:0,iron:0});farmToolWorkAI(g,u,1);assert.equal(u.farmToolWork.progress,0,'fourth real bench claimant waits');assert.equal(farmToolRate(u,0),1);assert.equal(u.draftPracticeSeconds,75);
 pauseFarmToolWork(people[0],g);farmToolWorkAI(g,u,1);assert.ok(u.farmToolWork.progress>0);const progress=u.farmToolWork.progress;pauseFarmToolWork(u,g);assert.equal(farmToolCondition(u),.2);assert.equal(resumeFarmToolWork(g,u,b.id),true);assert.equal(u.farmToolWork.progress,progress);
 for(let i=0;i<200&&u.farmToolWork;i++)farmToolWorkAI(g,u,.2);
 assert.equal(u.farmToolWork,undefined);assert.equal(u.farmTool,'woodenArd');assert.equal(u.farmToolCondition,1);assert.equal(u.draftPracticeSeconds,75);assert.equal(stock.wood,28);assert.equal(stock.stone,16);assert.equal(validFarmToolUnit(u),true);
});

function legalPoint(g,type,origin,accept=()=>true){
 for(let r=10;r<=72;r+=4)for(let i=0;i<24;i++){const x=origin.x+Math.sin(i*Math.PI/12)*r,z=origin.z+Math.cos(i*Math.PI/12)*r;if(g.placementIssue(type,x,z,0)===null&&accept(x,z))return{x,z};}
}
function drive(g,seconds,until){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.equal(g.state.ended,null);}assert.ok(until(),JSON.stringify({time:g.state.time,phase:calendar(g).phase,units:g.state.units.filter(u=>u.team===0).map(u=>({id:u.id,order:u.order,reason:u.workReason,tool:u.farmTool,work:u.farmToolWork,practice:u.draftPracticeSeconds}))}));}

for(const species of ['horse','cattle'])test(`native ${species} traction: paid ard crafting reloads once, walks to spring rows and changes labor rather than soil or finite yield`,()=>{
 const randomBefore=Math.random;Math.random=mulberry32(42);
 try{
  let g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();g.vision.fill(2);
  g.state.paused=false;g.state.autoWorkEnabled=false;g.state.conflict='quiet';g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.birthT=10000;g.state.nightWork=true;g.calamityT=10000;for(const t of g.state.tribes)t.thinkT=10000;
  for(const u of g.state.units.filter(u=>u.team===0)){u.order='hold';u.jobLock=true;}
  let u=g.state.units.find(u=>u.team===0&&u.type==='worker');assert.ok(u);u.jobLock=false;const uid=u.id;
  const horse=g.state.wildlife.find(a=>a.species===species&&a.hp>0);assert.ok(horse,`actual seed42 generated ${species} identity`);
  // Explicit bounded opening: the native individual is already trained, as
  // independently qualified by horse-native.test.mjs. This does not claim a
  // second capture/training journey. Residents and terrain stay where generated.
  u.packAnimal=packAnimalFrom({...horse,sex:'male',born:-herdRules(species).maturity,tamedAt:0,hunger:0,thirstSeconds:0});u.haulage='pack';const horseMetadata=structuredClone(u.packAnimal);g.state.wildlife=g.state.wildlife.filter(a=>a.id!==horse.id);
  Object.assign(g.tribe(0),{wood:300,stone:120,food:2000,foodLots:{provisions:2000},seeds:50,cultivated:['grain']});g.tribe(0).survival.waterLiters=400;
  const originalTerrain=terrainHash(g),home=g.campOf(0),shopPoint=legalPoint(g,'workshop',home,(x,z)=>g.workBoard.connected(g,u.x,u.z,x,z));assert.ok(shopPoint);
  // Completed legally sited workshop/field and finite stock are declared opening
  // assets. Only the ard's paid bench labor and row journey are under test.
  let shop=g.makeBld('workshop',shopPoint.x,shopPoint.z,0);g.state.buildings.push(shop);g.rebuildWalk();
  const fieldPoint=legalPoint(g,'farm',home,(x,z)=>g.workBoard.connected(g,u.x,u.z,x,z));assert.ok(fieldPoint);let field=g.makeBld('farm',fieldPoint.x,fieldPoint.z,0);g.state.buildings.push(field);g.rebuildWalk();
  const sid=shop.id,fid=field.id,wood=g.tribe(0).wood,stone=g.tribe(0).stone;
  assert.equal(beginFarmToolWork(g,'woodenArd',0,sid,uid),true,g.state.banner);assert.equal(g.tribe(0).wood,wood-10);assert.equal(g.tribe(0).stone,stone-2);assert.equal(u.farmToolWork.duration,60);assert.equal(u.farmTool,undefined);
  const start={x:u.x,z:u.z};drive(g,120,()=>u.farmToolWork?.progress>=2);assert.ok(Math.hypot(u.x-start.x,u.z-start.z)>1,'maker physically walked to the legal workshop');assert.ok(g.buildingWorkReached(u,shop));const paidProgress=u.farmToolWork.progress;
  pauseFarmToolWork(u,g);u.order='hold';const paid=encodeGame(g);g=decodeGame(paid);g.state.paused=false;u=g.state.units.find(p=>p.id===uid);shop=g.state.buildings.find(b=>b.id===sid);field=g.state.buildings.find(b=>b.id===fid);assert.equal(u.farmToolWork.progress,paidProgress);assert.equal(u.packAnimal.id,horseMetadata.id);assert.equal(g.tribe(0).wood,wood-10);assert.equal(resumeFarmToolWork(g,u,sid),true);
  drive(g,120,()=>u.farmTool==='woodenArd');assert.equal(u.farmToolCondition,1);assert.equal(g.tribe(0).wood,wood-10);assert.equal(g.tribe(0).stone,stone-2);assert.equal(calendar(g).phase,0);
  crop(g,field);g.clearSelect();g.selectEntity(u);g.issueGather(field);const unworkedPractice=u.draftPracticeSeconds??0,conditionBefore=u.farmToolCondition;
  while(!field.crop.planted){const practice=u.draftPracticeSeconds,condition=u.farmToolCondition;g.step(.2);assert.deepEqual(g.simulationErrors,[]);if(!field.crop.planted){assert.equal(u.draftPracticeSeconds,practice,'travel is not traction practice');assert.equal(u.farmToolCondition,condition,'travel does not wear the ard');}assert.ok(g.state.time<YEAR_SECONDS/4,'native maker must reach spring rows before summer');}
  assert.equal(u.order,'gather');assert.equal(u.node,field);assert.ok((u.draftPracticeSeconds??0)>unworkedPractice);assert.ok(u.farmToolCondition<conditionBefore);assert.equal(terrainHash(g),originalTerrain);assert.equal(u.packAnimal.id,horseMetadata.id);assert.equal(u.packAnimal.maxHp,horseMetadata.maxHp);assert.equal(u.packAnimal.scale,horseMetadata.scale);
  const exportPath=species==='horse'?process.env.HORSE_TRACTION_SAVE:process.env.CATTLE_TRACTION_SAVE;if(exportPath){assert.ok(isAbsolute(exportPath));writeFileSync(exportPath,JSON.stringify(encodeGame(g)));}
  const soil=JSON.stringify(fieldTerrain(g,field)),yieldBefore=farmHarvestEstimate(g,field,1,1,1),baseCrop=structuredClone(field.crop),baseUnit={...u,packAnimal:structuredClone(u.packAnimal)},beforePlant=field.crop.planted;
  u.draftPracticeSeconds=120;u.farmToolCondition=1;const rate=farmToolRate(u,0);assert.ok(rate>1);farmWork(g,u,field,1);const draftedGain=field.crop.planted-beforePlant;
  field.crop=structuredClone(baseCrop);const hand={...baseUnit,farmTool:undefined,farmToolCondition:undefined,draftPracticeSeconds:0};farmWork(g,hand,field,1);const handGain=field.crop.planted-beforePlant;close(draftedGain/handGain,rate);assert.equal(hand.draftPracticeSeconds,0);assert.equal(JSON.stringify(fieldTerrain(g,field)),soil);assert.equal(farmHarvestEstimate(g,field,1,1,1),yieldBefore);
  // A nearly completed plot grants only remaining productive time, even when
  // the requested slice is long. The existing field API owns this cap.
  field.crop={...baseCrop,planted:1-1e-8};u.draftPracticeSeconds=0;u.farmToolCondition=1;const tinyCondition=u.farmToolCondition;farmWork(g,u,field,100);assert.equal(field.crop.planted,1);assert.ok(u.draftPracticeSeconds>0&&u.draftPracticeSeconds<.001);close(tinyCondition-u.farmToolCondition,u.draftPracticeSeconds/900);const cappedPractice=u.draftPracticeSeconds;farmWork(g,u,field,100);assert.equal(u.draftPracticeSeconds,cappedPractice);
  const springTime=g.state.time;
  for(const phase of[1,2,3]){
   g.state.time=Math.floor(springTime/YEAR_SECONDS)*YEAR_SECONDS+phase*YEAR_SECONDS/4+1;
   field.crop={...baseCrop,year:calendar(g).year,planted:.5,tended:0,remaining:10,ripened:phase===2};u.gatherT=0;
   const condition=u.farmToolCondition,practice=u.draftPracticeSeconds;farmWork(g,u,field,.1);
   assert.equal(u.farmToolCondition,condition,'summer, harvest and winter cannot wear a cultivation-only ard');assert.equal(u.draftPracticeSeconds,practice);
  }
  g.state.time=springTime;field.crop={...baseCrop,planted:1};
  // Unit practice stays with its farmer; actual tool cargo preserves condition
  // and never smuggles an XP field onto the transferable asset.
  u.node=null;u.order='hold';const practice=u.draftPracticeSeconds,toolCondition=u.farmToolCondition;const transfer=takeFarmTool(g,uid,uid);assert.equal(transfer.accepted,true,transfer.reason);const asset=g.state.farmToolCargo.tools.find(a=>a.id===transfer.toolId);assert.equal(asset.kind,'woodenArd');assert.equal(asset.condition,toolCondition);assert.equal(Object.hasOwn(asset,'draftPracticeSeconds'),false);assert.equal(u.draftPracticeSeconds,practice);assert.equal(validFarmToolCargo(g.state),true);const cargoSave=encodeGame(g);validateGameSave(cargoSave);
  const back=decodeGame(cargoSave),owner=back.state.units.find(p=>p.id===uid);assert.equal(owner.draftPracticeSeconds,practice);assert.equal(back.state.farmToolCargo.tools[0].condition,toolCondition);assert.equal(equipCarriedFarmTool(back,uid,uid).accepted,true);assert.equal(owner.farmTool,'woodenArd');assert.equal(owner.farmToolCondition,toolCondition);assert.equal(owner.draftPracticeSeconds,practice);assert.equal(terrainHash(back),originalTerrain);
  for(const invalid of[-1,NaN,Infinity,1e12+1]){const corrupt=structuredClone(cargoSave);corrupt.state.units.find(p=>p.id===uid).draftPracticeSeconds=invalid;assert.throws(()=>validateGameSave(corrupt));}
 }finally{Math.random=randomBefore;}
});
