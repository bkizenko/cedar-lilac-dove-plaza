import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {nativeDairyVillage} from '../helpers/native-dairy-village.mjs';
const fixture=nativeDairyVillage();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 await page.goto(process.env.HEARTHWILD_TEST_URL||'http://127.0.0.1:8102',{waitUntil:'commit'});await page.waitForFunction(()=>window.__engine?.game);
 const imported=await page.evaluate(async fixture=>{const e=window.__engine;e.autosave.invalidate();return e.importVillage(new File([JSON.stringify(fixture.save)],'native-finite-dairy-test.json',{type:'application/json'}));},fixture);assert.equal(imported.applied,true,JSON.stringify(imported));
 const focus=async()=>page.evaluate(id=>{const e=window.__engine,g=e.game,b=g.state.buildings.find(b=>b.id===id);g.selectEntity(b);e.view.look.set(b.x,g.height(b.x,b.z),b.z);g.raidT=g.seaT=g.calamityT=10000;e.pushHud();},fixture.hearth);
 const hash=async()=>page.evaluate(async()=>{const g=window.__engine.game,value=JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features});return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');});
 await focus();assert.equal(await hash(),fixture.terrain);
 await page.getByRole('button',{name:'Ferment milk in a vessel',exact:true}).click();
 const paid=await page.evaluate(()=>{const g=window.__engine.game,p=g.state.production.projects.find(p=>p.recipe==='fermentMilk'),t=g.tribe(0);return {id:p?.id,phase:p?.phase,milk:t.foodLots.milk,pottery:t.items.pottery,origin:t.potteryOrigins[0].count,logs:t.wood,water:t.survival.waterLiters,start:g.state.time};});
 assert.ok(paid.id);assert.equal(paid.milk,0);assert.equal(paid.pottery,0);assert.equal(paid.origin,0);assert.equal(paid.logs,99);assert.equal(paid.water,299);
 const drive=async target=>page.evaluate(({id,start,target})=>{const e=window.__engine,g=e.game;let p=g.state.production.projects.find(p=>p.id===id);while(g.state.time-start<300&&!(target==='paused-ready'?p.phase==='paused'&&p.resumePhase==='ready':p.phase===target)){g.state.paused=false;g.step(.2);if(p.phase==='lost'||g.state.ended||g.simulationErrors.length)throw Error(JSON.stringify({phase:p.phase,reason:p.blockedReason,errors:g.simulationErrors}));}g.state.paused=true;e.pushHud();return {phase:p.phase,resumePhase:p.resumePhase,time:g.state.time-start,actor:p.actorId,dairy:p.dairy,pottery:g.tribe(0).items.pottery};},{id:paid.id,start:paid.start,target});
 const passive=await drive('curing');assert.equal(passive.phase,'curing');assert.equal(passive.actor,null);assert.equal(passive.pottery,0);
 const queue=page.getByRole('region',{name:'Selected workplace queue'});
 await queue.getByText('Fermenting in held vessel',{exact:true}).waitFor({state:'visible'});
 await queue.getByText('No adult occupied during fermentation',{exact:true}).waitFor({state:'visible'});
 const job=queue.getByRole('article',{name:'Ferment milk in a vessel',exact:true});await job.getByText('Details',{exact:true}).click();await job.getByText(/effective fermentation seconds/).waitFor({state:'visible'});
 const slot=await page.evaluate(id=>{const g=window.__engine.game;return g.state.production.projects.filter(p=>p.workplace===id&&!['complete','lost','returning','unloading','stored'].includes(p.phase)).length;},fixture.hearth);assert.equal(slot,1);
 await page.evaluate(()=>window.__engine.saveNow());await page.reload({waitUntil:'commit'});await page.waitForFunction(id=>window.__engine?.game?.state?.production?.projects.some(p=>p.id===id&&p.phase==='curing'),paid.id);await focus();assert.equal(await hash(),fixture.terrain);
 const restored=await page.evaluate(id=>window.__engine.game.state.production.projects.find(p=>p.id===id).dairy,paid.id);assert.deepEqual(restored,passive.dairy);
 // Pause pickup through the actual control so this short-lived ready state can be inspected. Native acceptance separately proves unpaused automatic pickup.
 await queue.getByRole('button',{name:'Pause paid work',exact:true}).click();const pausedReady=await drive('paused-ready');assert.equal(pausedReady.phase,'paused');assert.equal(pausedReady.resumePhase,'ready');assert.equal(pausedReady.pottery,0);await queue.getByRole('button',{name:'Resume paid work',exact:true}).click();const ready=await page.evaluate(id=>{const p=window.__engine.game.state.production.projects.find(p=>p.id===id);return {phase:p.phase,pottery:window.__engine.game.tribe(0).items.pottery};},paid.id);assert.equal(ready.phase,'ready');assert.equal(ready.pottery,0);await queue.getByText('Ready for physical pickup',{exact:true}).waitFor({state:'visible'});
 await queue.getByText('Workshop inventory',{exact:true}).click();await queue.getByText(/3 fermented milk.*awaiting pickup/).waitFor({state:'visible'});
 const returning=await drive('returning');assert.equal(returning.phase,'returning');const complete=await drive('complete');assert.equal(complete.phase,'complete');
 const result=await page.evaluate(id=>{const g=window.__engine.game,t=g.tribe(0),p=g.state.production.projects.find(p=>p.id===id);return {phase:p.phase,pottery:t.items.pottery,origin:t.potteryOrigins[0],food:t.foodLots.fermentedMilk,metrics:g.state.production.metrics,errors:g.simulationErrors};},paid.id);
 assert.equal(result.pottery,1);assert.equal(result.origin.count,1);assert.deepEqual(result.origin.origin,fixture.origin);assert.ok(result.food>2.9);assert.equal(result.metrics.foodInputsUsed.milk,4);assert.equal(result.metrics.edibleFoodProduced,3);assert.equal(result.metrics.waterUsedLiters,1);assert.equal(result.metrics.logsUsed,1);assert.deepEqual(result.errors,[]);
 await page.evaluate(()=>window.__engine.saveNow());await page.reload({waitUntil:'commit'});await page.waitForFunction(id=>window.__engine?.game?.state?.production?.projects.some(p=>p.id===id&&p.phase==='complete'),paid.id);assert.equal(await hash(),fixture.terrain);
 const after=await page.evaluate(()=>{const g=window.__engine.game;return {pottery:g.tribe(0).items.pottery,produced:g.state.production.metrics.edibleFoodProduced};});assert.deepEqual(after,{pottery:1,produced:3});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:1,total:1,scope:'Built desktop dairy UI; authored finite native V18 opening; no terrain/path/climate overrides; paid recipe, rendered incubation/progress/ready (manual pickup pause for inspection), physical pickup/delivery, mid/final reload and exactly-once vessel return; not live-public acceptance',paid,passive,pausedReady,ready,complete,result,after,errors}));await context.close();
}finally{await browser.close();}
