// Run only on a frozen disposable built candidate:
// node --import ./scripts/game-loader.mjs scripts/diagnostics/curd-built-acceptance.mjs
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {nativeDairyVillage} from '../helpers/native-dairy-village.mjs';
const target=new URL(process.env.CURD_TEST_URL||process.env.BASE_URL||'http://127.0.0.1:8103');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(target.hostname));
assert.equal(target.port,'8103','Disposable built candidate only; never a public/live village port');
const report={scope:'Actual built desktop curd controls on an authored finite native V18 opening: imported cultured-milk sample, two fired vessels and one cloth. Normal sanitation, strict reload, physical food/tool return. No earned campaign/milking/pottery claim; no Worker activation, dirty-tool recovery, performance or publication credit.',target:target.href,passed:0,total:1},errors=[];
let browser,context,page,timer,stage='fixture';const started=Date.now();
async function run(){
 const f=nativeDairyVillage(),save=structuredClone(f.save),t=save.state.tribes[0];
 // Finite opening authored before import/clock. Never replenish after payment.
 Object.assign(t,{food:303,foodLots:{provisions:300,fermentedMilk:3},items:{pottery:2,cloth:1},potteryOrigins:[{origin:structuredClone(f.origin),count:2}]});
 save.state.paused=true;
 const source=JSON.stringify(save),checksum=()=>createHash('sha256').update(JSON.stringify(save)).digest('hex'),initialChecksum=checksum();
 report.opening={terrain:f.terrain,hearthId:f.hearth,workerId:f.worker,fermentedMilk:3,pottery:2,cloth:1,vesselOrigin:f.origin,fixtureChecksum:initialChecksum};
 stage='launch';browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 stage='boot';await page.goto(target.href,{waitUntil:'commit',timeout:20000});await page.waitForFunction(()=>window.__engine?.game,null,{timeout:30000});
 stage='actual strict import';const imported=await page.evaluate(async source=>window.__engine.importVillage(new File([source],'authored-native-curd.json',{type:'application/json'})),source);assert.equal(imported.applied,true,imported.message);assert.equal(imported.saved,true,imported.message);
 const focus=async()=>{
  await page.evaluate(id=>{const e=window.__engine,g=e.game,b=g.state.buildings.find(b=>b.id===id);if(e.isWorkerSession)throw Error('This acceptance requires the published native owner mode');if(!b||!g.finished(b)||b.team!==0)throw Error('Original native hearth missing');g.clearSelect();g.selectEntity(b);e.view.look.set(b.x,g.height(b.x,b.z),b.z);e.pushHud();},f.hearth);
  const menu=page.getByRole('button',{name:'Menu',exact:true});if(await menu.getAttribute('aria-expanded')!=='true')await menu.click();
 };
 const terrainHash=()=>page.evaluate(async()=>{const g=window.__engine.game,text=JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features});return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('');});
 await focus();assert.equal(await terrainHash(),f.terrain);
 stage='owner facts and real recipe click';const availability=await page.evaluate(async id=>{const e=window.__engine,r=await e.readModel({kind:'recipe-issues',workplaceId:id});if(r.epoch!==e.dispatchEpoch)throw Error('Stale owner facts');return r;},f.hearth);
 assert.equal(availability.model.kind,'recipe-issues');assert.equal(availability.model.issues.find(r=>r.recipe==='strainCulturedCurd')?.issue,null);
 const production=page.getByRole('region',{name:'Physical production',exact:true}),queue=page.getByRole('region',{name:'Selected workplace queue',exact:true});await production.waitFor();
 const button=production.getByRole('button',{name:'Set and strain cultured curd',exact:true});await button.waitFor();await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Set and strain cultured curd'&&!b.disabled));await button.click();
 await page.waitForFunction(()=>window.__engine.game.state.production?.projects.some(p=>p.recipe==='strainCulturedCurd'));
 const opening=await page.evaluate(()=>{const g=window.__engine.game,p=g.state.production.projects.find(p=>p.recipe==='strainCulturedCurd'),t=g.tribe(0);return{id:p.id,start:g.state.time,phase:p.phase,food:t.food,milk:t.foodLots.fermentedMilk??0,pottery:t.items.pottery,cloth:t.items.cloth,originCount:t.potteryOrigins[0].count,waterUsed:g.state.production.metrics.waterUsedLiters};});
 assert.equal(opening.food,300);assert.equal(opening.milk,0);assert.equal(opening.pottery,0);assert.equal(opening.cloth,0);assert.equal(opening.originCount,0);assert.equal(opening.waterUsed,4);report.paid=opening;
 const snapshot=()=>page.evaluate(({id,hearth})=>{const e=window.__engine,g=e.game,p=g.state.production.projects.find(p=>p.id===id),t=g.tribe(0);return{time:g.state.time,phase:p.phase,resumePhase:p.resumePhase,actor:p.actorId,curds:p.curds,pottery:t.items.pottery,cloth:t.items.cloth,origins:t.potteryOrigins,foodLots:t.foodLots,metrics:g.state.production.metrics,slots:g.state.production.projects.filter(q=>q.workplace===hearth&&!['complete','lost','returning','unloading','stored'].includes(q.phase)&&!(q.phase==='paused'&&['returning','unloading'].includes(q.resumePhase))).length,drawCalls:e.view.renderer.info.render.calls,errors:[...g.simulationErrors]};},{id:opening.id,hearth:f.hearth});
 // Each chunk runs ordinary actual Game.step. Pause between chunks for UI inspection;
 // no project/actor/terrain/climate/progress fields or methods are replaced.
 const drive=async wanted=>{
  let result;
  for(let chunk=0;chunk<100;chunk++){
   result=await page.evaluate(({id,start,wanted})=>{
    const e=window.__engine,g=e.game;const current=()=>g.state.production.projects.find(p=>p.id===id);
    const done=()=>{const p=current();return wanted==='paused-ready'?p.phase==='paused'&&p.resumePhase==='ready':wanted==='sanitizing'?p.phase==='working'&&p.curds?.washSeconds>0&&p.curds.washSeconds<10:p.phase===wanted;};
    try{for(let i=0;i<20&&!done()&&g.state.time-start<300;i++){
     if(g.state.encounter)throw Error('Unexpected native encounter needs an explicit scenario response');g.state.paused=false;
     const before=g.state.time;g.step(.2);const p=current();if(g.state.time<=before||g.state.ended||p.phase==='lost'||p.curds?.recovery||g.simulationErrors.length)throw Error(JSON.stringify({wanted,time:g.state.time-start,phase:p.phase,reason:p.blockedReason,ended:g.state.ended,errors:g.simulationErrors}));
    }}finally{g.state.paused=true;e.pushHud();}
    return{done:done(),elapsed:g.state.time-start,phase:current().phase};
   },{...opening,wanted});
   if(result.done)return snapshot();if(result.elapsed>=300)break;
  }
  throw Error('Bounded native phase was not reached: '+JSON.stringify({wanted,result}));
 };
 stage='physical preparation and rendered drainage';const passive=await drive('curing');assert.equal(passive.actor,null);assert.equal(passive.pottery,0);assert.equal(passive.cloth,0);assert.equal(passive.slots,1);report.passive=passive;
 const job=queue.getByRole('article',{name:'Set and strain cultured curd',exact:true});await job.getByText('Draining cultured curd',{exact:true}).waitFor();await job.getByText('No adult occupied during drainage',{exact:true}).waitFor();
 const progress=job.getByRole('progressbar',{name:'Set and strain cultured curd work progress',exact:true});assert.equal(await progress.getAttribute('max'),'90');
 await job.getByRole('button',{name:'Pause paid work',exact:true}).click();await page.waitForFunction(id=>window.__engine.game.state.production.projects.find(p=>p.id===id).phase==='paused',opening.id);
 stage='paid paused drainage and strict reload';const ready=await drive('paused-ready');assert.equal(ready.pottery,0);assert.equal(ready.cloth,0);assert.equal(ready.curds.washSeconds,0);assert.deepEqual(ready.curds.foodLots,{freshCurd:1,whey:1});report.ready=ready;
 const persist=async()=>{const saved=await page.evaluate(()=>window.__engine.saveNow());assert.equal(saved.saved,true,saved.message);return saved;};
 report.midSave=await persist();await page.reload({waitUntil:'commit'});await page.waitForFunction(id=>window.__engine?.game?.state?.production?.projects.some(p=>p.id===id&&p.phase==='paused'&&p.resumePhase==='ready'),opening.id);await focus();assert.equal(await terrainHash(),f.terrain);
 const restored=await snapshot();assert.deepEqual(restored.curds,ready.curds);assert.equal(restored.pottery,0);assert.equal(restored.cloth,0);report.restored=restored;
 stage='actual resume and sanitation progress';await job.getByRole('button',{name:'Resume paid work',exact:true}).click();await page.waitForFunction(id=>window.__engine.game.state.production.projects.find(p=>p.id===id).phase!=='paused',opening.id);
 const cleaning=await drive('sanitizing');assert.equal(cleaning.pottery,0);assert.equal(cleaning.cloth,0);await job.getByText('Sanitizing held curd tools',{exact:true}).waitFor();assert.equal(await progress.getAttribute('max'),'10');assert.ok(Number(await progress.getAttribute('value'))>0);report.cleaning=cleaning;
 stage='physical return';const returning=await drive('returning');assert.equal(returning.pottery,0);assert.equal(returning.cloth,0);assert.equal(returning.curds.washSeconds,10);await job.getByText('Delivering finished batch',{exact:true}).waitFor();report.returning=returning;
 const complete=await drive('complete'),m=complete.metrics;assert.equal(complete.pottery,2);assert.equal(complete.cloth,1);assert.equal(complete.origins.reduce((n,o)=>n+o.count,0),2);assert.equal(complete.origins.find(o=>o.count>0).count,2);assert.deepEqual(complete.origins.find(o=>o.count>0).origin,f.origin);
 assert.equal(m.foodInputsUsed.fermentedMilk,3);const energy=lots=>(lots?.freshCurd??0)*2+(lots?.whey??0);assert.ok(Math.abs(energy(m.foodOutputsProduced)+energy(m.foodOutputsLost)-3)<1e-8);assert.ok((m.foodOutputsProduced.freshCurd??0)>0);assert.ok((m.foodOutputsProduced.whey??0)>0);assert.ok((complete.foodLots.freshCurd??0)>0);assert.ok((complete.foodLots.whey??0)>0);assert.equal(complete.slots,0);assert.ok(complete.drawCalls>0);assert.deepEqual(complete.errors,[]);report.complete=complete;
 stage='strict final reload and exactly-once stability';report.finalSave=await persist();await page.reload({waitUntil:'commit'});await page.waitForFunction(id=>window.__engine?.game?.state?.production?.projects.some(p=>p.id===id&&p.phase==='complete'),opening.id);assert.equal(await terrainHash(),f.terrain);
 await page.evaluate(()=>{const g=window.__engine.game;for(let i=0;i<5;i++){g.state.paused=false;g.step(.2);}g.state.paused=true;window.__engine.pushHud();});const stable=await snapshot();assert.equal(stable.pottery,2);assert.equal(stable.cloth,1);assert.equal(stable.origins.reduce((n,o)=>n+o.count,0),2);assert.deepEqual(stable.metrics.foodOutputsProduced,m.foodOutputsProduced);assert.deepEqual(stable.errors,[]);assert.deepEqual(errors,[]);assert.equal(checksum(),initialChecksum);assert.equal(await terrainHash(),f.terrain);report.final=stable;report.passed=1;
}
const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('90 second total wall deadline')),90000);});
try{await Promise.race([run(),deadline]);}
catch(error){report.failure={stage,message:error instanceof Error?error.message:String(error)};process.exitCode=1;}
finally{clearTimeout(timer);await context?.close().catch(()=>{});await browser?.close().catch(()=>{});report.errors=errors;report.elapsedMilliseconds=Date.now()-started;console.log(JSON.stringify(report,null,2));}
