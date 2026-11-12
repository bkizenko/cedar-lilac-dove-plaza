// Source-only prepared acceptance: run only on the disposable frozen candidate.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const target=new URL(process.env.BASE_URL||'http://127.0.0.1:8103');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(target.hostname));
assert.equal(target.port,'8103','Only disposable candidate port8103 is allowed');
const fixture=process.argv[2];assert.ok(fixture,'Provide an existing private native village export with a finished production workplace');
const bytes=readFileSync(fixture),sha=b=>createHash('sha256').update(b).digest('hex'),originalChecksum=sha(bytes),data=JSON.parse(bytes.toString('utf8'));
assert.ok(data.state&&Array.isArray(data.state.buildings),'Strict native save input required');
data.state.paused=true; // Paused import copy only; original private bytes are never written.
const report={scope:'Frozen-app import/render/Menu/existing workplace queue and actual owner recipe query/strict saved restore. Fresh private Chrome context, paused native fixture; no production actions, simulation steps, screenshots, performance or campaign claim.',originalChecksum},errors=[];
let browser,context,page,timer,stage='launch';const start=Date.now();
async function run(){
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 stage='boot';await page.goto(target.href,{waitUntil:'commit',timeout:20000});await page.waitForFunction(()=>window.__engine?.game,{},{timeout:45000});
 stage='strict import';const imported=await page.evaluate(async save=>window.__engine.importVillage(new File([JSON.stringify(save)],'private-native-acceptance.json',{type:'application/json'})),data);assert.equal(imported.applied,true,imported.message);assert.equal(imported.saved,true,imported.message);
 const opening=await page.evaluate(()=>{const e=window.__engine,g=e.game;e.setQuality('low');if(!g.state.paused)throw Error('Fixture must load paused');const b=g.state.buildings.find(b=>b.team===0&&b.hp>0&&g.finished(b)&&['hearth','dryrack','smokehouse','kiln'].includes(b.type));if(!b)throw Error('Private native fixture has no existing finished production workplace; no building will be fabricated');g.selectEntity(b);e.pushHud();const a={id:b.id,type:b.type,time:g.state.time,residents:g.state.units.filter(u=>u.team===0&&u.hp>0).length};window.__autopilotOpening=a;return a;});report.opening=opening;
 stage='actual menu and queue';const menu=page.getByRole('button',{name:'Menu',exact:true});if(await menu.getAttribute('aria-expanded')!=='true')await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');
 const production=page.getByRole('region',{name:'Physical production',exact:true}),queue=page.getByRole('region',{name:'Selected workplace queue',exact:true});await production.waitFor();await queue.waitFor();
 stage='owner recipe availability';
 report.query=await page.evaluate(async id=>{const e=window.__engine,epoch=e.dispatchEpoch,r=await e.readModel({kind:'recipe-issues',workplaceId:id});if(r.epoch!==epoch||e.dispatchEpoch!==epoch||r.model.kind!=='recipe-issues'||r.model.workplaceId!==id||!r.model.issues.length)throw Error('Missing or stale actual owner recipe facts');return{recipeRows:r.model.issues.length,epoch:r.epoch,stateRevision:r.stateRevision,requestId:r.requestId};},opening.id);
 await page.waitForFunction(()=>{const p=document.querySelector('[aria-label="Physical production"]');return !!p&&!!p.querySelector('[aria-label="Workplace recipes"]')&&!p.textContent.includes('Checking actual availability')&&!p.textContent.includes('Actual recipe availability is unavailable');},{},{timeout:10000});
 report.render=await page.evaluate(()=>{const e=window.__engine,v=e.view;return{canvas:!!document.querySelector('canvas'),drawCalls:v.renderer.info.render.calls,simulationErrors:[...e.game.simulationErrors],paused:e.game.state.paused,time:e.game.state.time,quality:e.game.quality};});assert.ok(report.render.canvas);assert.ok(report.render.drawCalls>0,'Actual renderer must submit scene draws');assert.deepEqual(report.render.simulationErrors,[]);assert.equal(report.render.paused,true);assert.equal(report.render.time,opening.time);assert.equal(report.render.quality,'low');
 stage='actual checkpoint and strict restore';
 report.save=await page.evaluate(()=>window.__engine.saveNow());assert.equal(report.save.saved,true,report.save.message);
 report.restore=await page.evaluate(async()=>{const e=window.__engine,old=e.game,a=window.__autopilotOpening;await e.resumeSaved();const g=e.game;return{replaced:g!==old,paused:g.state.paused,time:g.state.time,residents:g.state.units.filter(u=>u.team===0&&u.hp>0).length,workplacePresent:g.state.buildings.some(b=>b.id===a.id&&b.type===a.type),errors:[...g.simulationErrors]};});assert.equal(report.restore.replaced,true);assert.equal(report.restore.paused,true);assert.equal(report.restore.time,opening.time);assert.equal(report.restore.residents,opening.residents);assert.equal(report.restore.workplacePresent,true);assert.deepEqual(report.restore.errors,[]);assert.deepEqual(errors,[]);report.passed=1;report.total=1;
}
try{await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('90 second wall deadline')),90000);})]);}
catch(error){report.passed=0;report.total=1;report.failure={stage,message:error.message};process.exitCode=1;}
finally{clearTimeout(timer);await context?.close().catch(()=>{});await browser?.close().catch(()=>{});assert.equal(sha(readFileSync(fixture)),originalChecksum,'Private source bytes changed');report.errors=errors;report.elapsedMilliseconds=Date.now()-start;console.log(JSON.stringify(report,null,2));}
