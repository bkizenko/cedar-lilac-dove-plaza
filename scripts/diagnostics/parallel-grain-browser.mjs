// Native release acceptance in disposable browser profiles only. Never touches
// a player's browser/save, terrain, routing, AI, production timing or completion.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {Game} from '../../src/game/sim.ts';
import {encodeGame,decodeGame} from '../../src/game/persistence.ts';
import {SAVE_KEY} from '../../src/game/constants.ts';

const g=new Game();g.reset(42,18,{size:1040,layout:'continents'});g.enterIsland();
g.state.autoWorkEnabled=false;g.state.paused=true;g.state.weather='clear';g.state.weatherT=100000;g.state.raidT=100000;g.state.birthT=100000;g.state.visitorTimer=900;g.state.conflict='quiet';g.state.growthPolicy='stable';g.state.laborPolicy='food';
for(const t of g.state.tribes)t.thinkT=100000;
const home=g.campOf(0),nativeHeights=new Float32Array(g.world.heights),placed=[];
for(const type of ['warehouse','hearth','hearth','hearth','hearth','grindingStone','grindingStone','oven','oven']){
 const at=g.findOpenSpot(home.x,home.z,type,0);assert.ok(at,`native unobstructed ${type} site`);
 const b=g.makeBld(type,at.x,at.z,0);g.state.buildings.push(b);placed.push({id:b.id,type,x:b.x,z:b.z});g.rebuildWalk();
}
while(g.state.units.filter(u=>u.team===0&&u.type==='worker').length<12)g.spawnUnit('worker',home.x+1,home.z+1,0);
for(const u of g.state.units.filter(u=>u.team===0)){u.order='hold';u.jobLock=false;}
Object.assign(g.tribe(0),{food:880,foodLots:{provisions:80,fish:400,grain:400},wood:300,stone:100,items:{},seeds:12});g.tribe(0).survival.waterLiters=150;
assert.deepEqual(g.world.heights,nativeHeights);
let berryTrial;
if(process.env.BERRY==='1'){
 const actor=g.state.units.find(u=>u.team===0&&u.type==='worker'&&u.hp>0&&!u.jobLock);
 const node=g.state.forage.filter(n=>n.amount>0&&!n.cropCandidate&&Math.hypot(n.x-home.x,n.z-home.z)>=60&&Math.hypot(n.x-home.x,n.z-home.z)<=100).find(n=>{
  const at=g.nearestWalk(actor,n.x,n.z);return !!at&&Math.hypot(at.x-n.x,at.z-n.z)<=1.22&&g.workBoard.connected(g,actor.x,actor.z,at.x,at.z);
 });
 assert.ok(node,'native seed has no actual reachable berry patch60–100m from camp; no substitute resource is created');
 actor.order='gather';actor.job='food';actor.jobLock=false;actor.node=node;actor.tx=node.x;actor.tz=node.z;
 berryTrial={actorId:actor.id,nodeId:node.id,distance:Math.hypot(node.x-home.x,node.z-home.z),amount:node.amount,x:node.x,z:node.z};
}
const baseSave={...encodeGame(g),savedAt:Date.now()};decodeGame(baseSave);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{for(const port of(process.env.PORTS||'8102').split(','))for(const auto of[false,true]){
 const save=structuredClone(baseSave);save.state.autoWorkEnabled=auto;
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),pageErrors=[];
 page.on('pageerror',e=>pageErrors.push(e.message));await page.addInitScript(({key,save})=>{localStorage.setItem(key,JSON.stringify(save));localStorage.setItem('hearthwild:graphics-quality','low');},{key:SAVE_KEY,save});
 await page.goto(`http://127.0.0.1:${port}`,{waitUntil:'commit',timeout:20000});await page.getByRole('button',{name:'Village',exact:true}).waitFor({timeout:120000});
 const before=await page.evaluate(()=>{const e=window.__engine,g=e.game;return{auto:g.state.autoWorkEnabled,version:g.state.worldgenVersion,time:g.state.time,food:g.tribe(0).foodLots,people:g.state.units.filter(u=>u.team===0).map(u=>u.id),terrain:Array.from(g.world.heights),pixels:e.canvas.width*e.canvas.height};});
 assert.equal(before.auto,auto);assert.equal(before.version,18);assert.ok(before.pixels<=801000);assert.deepEqual(before.terrain,Array.from(nativeHeights));
 let result,parallel=false,berryDiversion=null,berryCollectedFirst=false;
 for(let block=0;block<105;block++){
  result=await page.evaluate(berry=>{const e=window.__engine,g=e.game;let diversion=null,collectedFirst=false;g.state.paused=false;for(let i=0;i<40;i++){g.step(.1);if(berry&&!diversion){const u=g.state.units.find(u=>u.id===berry.actorId),p=u?.productionProjectId===undefined?undefined:g.state.production?.projects.find(p=>p.id===u.productionProjectId);if(p||u?.order==='return'&&u.workReason==='Returning to collect food processing inputs')diversion={time:g.state.time,project:p?.recipe||'input pickup',distanceFromBerry:Math.hypot(u.x-berry.x,u.z-berry.z)};else if(u?.carry>0&&u.carryFood==='berries')collectedFirst=true;}}g.state.paused=true;e.pushHud();const t=g.tribe(0),jobs=g.state.production?.projects||[];return{berryDiversion:diversion,berryCollectedFirst:collectedFirst,time:g.state.time,auto:g.state.autoWorkEnabled,fish:t.foodLots?.fish||0,cookedFish:t.foodLots?.cookedFish||0,bread:t.foodLots?.bread||0,grain:t.foodLots?.grain||0,flour:t.items?.flour||0,metrics:g.state.production?.metrics,people:g.state.units.filter(u=>u.team===0).map(u=>u.id),errors:g.simulationErrors,projects:jobs.map(p=>({id:p.id,recipe:p.recipe,phase:p.phase,actor:p.actorId,reason:p.blockedReason})),workers:g.state.units.filter(u=>u.team===0).map(u=>({id:u.id,order:u.order,reason:u.workReason,project:u.productionProjectId}))};},berryTrial);
  if(!berryDiversion){berryCollectedFirst ||= result.berryCollectedFirst;berryDiversion=result.berryDiversion;}
  const active=result.projects.filter(p=>!['complete','lost','paused','stored'].includes(p.phase));parallel ||= active.some(p=>p.recipe==='cookFish')&&active.some(p=>p.recipe.startsWith('grindGrain')||p.recipe.startsWith('bakeBread'));
  assert.deepEqual(result.errors,[]);assert.deepEqual(result.people,before.people,'pipeline cannot lose residents or create replacements');assert.equal(result.auto,auto);
  if(result.cookedFish>0&&result.bread>0&&result.fish>4&&result.projects.some(p=>p.recipe==='cookFish'&&p.phase==='complete')&&result.projects.some(p=>p.recipe.startsWith('bakeBread')&&p.phase==='complete'))break;
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
 }
 if(berryTrial){assert.ok(berryDiversion,JSON.stringify({berryTrial,result}));assert.equal(berryCollectedFirst,false,'the distant berry trip must not complete before reassignment');assert.ok(berryDiversion.distanceFromBerry>10,'actual processing/pickup wins before reaching the distant patch');}
 assert.ok(parallel,'a real dedicated grain stage must overlap fish cooking');assert.ok(result.cookedFish>0&&result.bread>0&&result.fish>4,JSON.stringify(result));assert.ok(result.metrics.foodInputsUsed.fish>0&&result.metrics.grainUsed>0&&result.metrics.produced.flour>0&&result.metrics.consumed.flour>0);assert.deepEqual(pageErrors,[]);
 const terrainUnchanged=await page.evaluate(heights=>window.__engine.game.world.heights.every((h,i)=>h===heights[i]),before.terrain);assert.equal(terrainUnchanged,true);
 await page.evaluate(()=>window.__engine.saveNow());await page.reload({waitUntil:'commit'});await page.getByRole('button',{name:'Village',exact:true}).waitFor({timeout:120000});
 const restored=await page.evaluate(()=>{const g=window.__engine.game;return{auto:g.state.autoWorkEnabled,cookedFish:g.tribe(0).foodLots?.cookedFish||0,bread:g.tribe(0).foodLots?.bread||0,fish:g.tribe(0).foodLots?.fish||0,people:g.state.units.filter(u=>u.team===0).map(u=>u.id)};});
 assert.equal(restored.auto,auto);assert.ok(restored.cookedFish>0&&restored.bread>0&&restored.fish>4);assert.deepEqual(restored.people,before.people);assert.deepEqual(pageErrors,[]);
 console.log(JSON.stringify({port,auto,nativeSeed:42,version:18,simulationSeconds:result.time-before.time,parallel,berryTrial,berryDiversion,placed,cookedFish:result.cookedFish,bread:result.bread,rawFishRemaining:result.fish,grainUsed:result.metrics.grainUsed,flourProduced:result.metrics.produced.flour,flourConsumed:result.metrics.consumed.flour,paidFish:result.metrics.foodInputsUsed.fish,restored,pageErrors,scope:'Controlled finite starting stock, twelve adults and completed native workplaces; rendered Low release, ordinary simulation with Auto off/on, real cooking and dedicated milling/baking/delivery, public Save/reload. No throughput, winter-campaign, terrain-generation or naval gate claim.'}));
 await context.close();
}}finally{await browser.close();}
