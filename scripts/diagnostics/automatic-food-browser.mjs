// Separate disposable browser profiles; never reads or changes a player's save.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {Game} from '../../src/game/sim.ts';
import {encodeGame} from '../../src/game/persistence.ts';
import {SAVE_KEY} from '../../src/game/constants.ts';
const g=new Game();g.reset(42,18,{size:1040,layout:'continents'});g.enterIsland();
g.state.autoWorkEnabled=false;g.state.paused=true;g.state.weather='clear';g.state.weatherT=100000;
g.state.raidT=100000;g.state.birthT=100000;g.state.visitorTimer=100000;g.state.conflict='quiet';g.state.growthPolicy='stable';
for(const t of g.state.tribes)t.thinkT=100000;
const home=g.campOf(0);
for(const type of ['warehouse','hearth']){
 const p=g.findOpenSpot(home.x,home.z,type,0);assert.ok(p,`native ${type} site`);
 const b=g.makeBld(type,p.x,p.z,0);b.build=0;g.state.buildings.push(b);g.rebuildWalk();
}
for(const u of g.state.units.filter(u=>u.team===0)){u.order='idle';u.jobLock=false;}
Object.assign(g.tribe(0),{wood:100,stone:100,food:1000,foodLots:{provisions:1000},items:{grainSheaves:16},seeds:12});
g.tribe(0).survival.waterLiters=100;
const save={...encodeGame(g),savedAt:Date.now()};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{for(const port of (process.env.PORTS||'8086,8101').split(',').map(Number)){
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:SAVE_KEY,save});
 await page.goto(`http://127.0.0.1:${port}`,{waitUntil:'commit',timeout:20000});
 await page.getByRole('button',{name:'Village',exact:true}).waitFor({timeout:60000});
 const before=await page.evaluate(()=>{const g=window.__engine.game;return {auto:g.state.autoWorkEnabled,raw:g.tribe(0).items.grainSheaves,version:g.state.worldgenVersion};});
 assert.equal(before.auto,false);assert.equal(before.raw,16);
 // Advance the ordinary simulation on native terrain, with no completion,
 // movement, inventory or worker-AI overrides. Render between short blocks.
 let result;
 for(let block=0;block<120;block++){
  result=await page.evaluate(()=>{const e=window.__engine,g=e.game;g.state.paused=false;for(let i=0;i<40;i++)g.step(.1);g.state.paused=true;e.pushHud();return {time:g.state.time,bread:g.tribe(0).foodLots?.bread||0,auto:g.state.autoWorkEnabled,errors:g.simulationErrors,projects:g.state.production?.projects.map(p=>({recipe:p.recipe,phase:p.phase,reason:p.blockedReason}))||[]};});
  if(result.projects.some(p=>p.recipe==='bakeBread'&&p.phase==='complete'))break;
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
 }
 assert.ok(result.projects.some(p=>p.recipe==='bakeBread'&&p.phase==='complete'),JSON.stringify(result));
 for(const recipe of ['threshCerealHand','winnowCerealHand','grindGrain','bakeBread'])assert.ok(result.projects.some(p=>p.recipe===recipe&&p.phase==='complete'),recipe);
 assert.equal(result.auto,false);assert.ok(result.bread>0);assert.deepEqual(result.errors,[]);assert.deepEqual(errors,[]);
 await page.evaluate(()=>window.__engine.saveNow());await page.reload({waitUntil:'commit'});
 await page.getByRole('button',{name:'Village',exact:true}).waitFor({timeout:60000});
 const restored=await page.evaluate(()=>({auto:window.__engine.game.state.autoWorkEnabled,bread:window.__engine.game.tribe(0).foodLots?.bread||0}));
 assert.equal(restored.auto,false);assert.ok(restored.bread>0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({port,before,result,restored,scope:'Native V18 terrain, automatic hand chain with Auto work off, rendered release and public Save/reload; controlled initial stocks and quiet conditions, not a full campaign balance gate'}));
 await context.close();
}}finally{await browser.close();}
