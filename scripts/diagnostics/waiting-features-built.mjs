// One frozen-app acceptance case. No bundling, simulation shortcuts, or screenshots.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=new URL(process.env.BASE_URL||'http://127.0.0.1:8103');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname),'Disposable loopback server required');
assert.ok(!['8086','8101'].includes(base.port),'Live village servers must not be touched');
const began=Date.now(),errors=[],requests=[],report={scope:'Frozen built app, isolated fresh Chrome context; Test Lab native seed2 V18 full reveal; paused throughout. Actual DOM menu/checkbox/water buttons; Engine ground-point callback, not pointer raycast/hit-testing. No completion, campaign, performance, or hardware-FPS credit.'};
let browser,context,page,stage='launch',timer;
const check=(ok,message)=>assert.ok(ok,message);
async function run(){
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(10000);
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>requests.push({url:new URL(r.url()).pathname,error:r.failure()?.errorText}));
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 stage='boot';await page.goto(base.href,{waitUntil:'commit',timeout:20000});await page.waitForFunction(()=>window.__engine?.game,{},{timeout:45000});
 stage='protect original and enter Lab';
 report.entry=await page.evaluate(()=>{
  const e=window.__engine; e.setQuality('low');if(!e.game.started||e.game.awaitingStart)e.enterIsland();e.game.state.paused=true;e.pushHud();
  const slots=()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]));
  window.__waitingAcceptance={original:e.game,preEntry:slots(),stateBefore:JSON.stringify(e.game.state)};
  if(!e.startTestSession())throw Error('Actual startTestSession safeguard failed');
  const a=window.__waitingAcceptance;a.baseline=slots();a.originalState=JSON.stringify(a.original.state);
  const safeguardChanged=[...new Set([...Object.keys(a.preEntry),...Object.keys(a.baseline)])].filter(k=>a.preEntry[k]!==a.baseline[k]);
  const g=e.game;g.reset(2,18,{size:1040,layout:'archipelago'});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);g.state.paused=true;e.view.rebuild(g);e.pushHud();
  a.heights=Array.from(g.world.heights);a.buildings=g.state.buildings.map(b=>b.id);a.people=g.state.units.map(u=>({id:u.id,x:u.x,z:u.z}));a.time=g.state.time;a.cuts=JSON.stringify(g.state.excavations||[]);
  return{entered:g!==a.original&&g.testMode,quality:g.quality,safeguardChanged,originalStateChangedBySafeguard:a.stateBefore!==a.originalState,originalKeys:Object.keys(a.baseline)};
 });
 check(report.entry.entered,'Must enter actual independent Test Lab');assert.equal(report.entry.originalStateChangedBySafeguard,false,'Entering Lab must preserve original state');
 const menu=page.getByRole('button',{name:'Menu',exact:true});if(await menu.getAttribute('aria-expanded')!=='true')await menu.click();
 await page.getByRole('combobox',{name:'Graphics quality'}).selectOption('low');
 const world=page.locator('details').filter({has:page.locator('summary',{hasText:/^World systems$/})});await world.locator('summary').click();
 stage='world options and real sea mesh';
 const flow=page.getByRole('checkbox',{name:'Shared routes',exact:true}),tide=page.getByRole('checkbox',{name:'Sea tides',exact:true});
 const flags=()=>page.evaluate(()=>{const e=window.__engine,g=e.game;return{state:g.state.worldOptions,world:g.world.options,waterY:g.world.waterY,seaTideY:g.world.seaTideY||0,meshY:e.view.water.position.y,time:g.state.time};});
 await flow.uncheck();let f=await flags();check(!f.state.flowFieldVersion&&!f.world.flowFieldVersion,'Flow off must reach both native option owners');await flow.check();f=await flags();assert.equal(f.state.flowFieldVersion,1);assert.equal(f.world.flowFieldVersion,1);
 await tide.uncheck();await page.waitForFunction(()=>{const e=window.__engine,g=e.game;return Math.abs(e.view.water.position.y-(g.world.waterY+Math.sin(g.state.time*.6)*.03))<1e-5;});const off=await flags();
 await tide.check();await page.waitForFunction(()=>{const e=window.__engine,g=e.game;return g.world.options.tideVersion===2&&Math.abs(e.view.water.position.y-(g.world.waterY+(g.world.seaTideY||0)+Math.sin(g.state.time*.6)*.03))<1e-5;});const on=await flags();
 assert.equal(on.state.tideVersion,2);assert.equal(on.world.tideVersion,2);assert.equal(on.waterY,off.waterY,'Sea-only tide must not lift inland water');check(Math.abs(on.seaTideY)>0,'Actual tide offset required');check(Math.abs(on.meshY-off.meshY)>0.01,'Actual rendered sea mesh must follow tide');report.world={flowVersion:1,tideVersion:2,off:{waterY:off.waterY,meshY:off.meshY},on:{waterY:on.waterY,seaTideY:on.seaTideY,meshY:on.meshY}};
 stage='actual water controls and point callback';
 const works=page.getByRole('region',{name:'Water engineering',exact:true});
 await page.locator('details').filter({has:page.locator('summary',{hasText:/^Water engineering$/})}).locator('summary').click();
 const lay=works.getByRole('button',{name:'Lay out works',exact:true});check(await lay.isDisabled(),'No draft must disable commission');
 await works.getByRole('button',{name:'Canal',exact:true}).click();assert.equal(await page.evaluate(()=>window.__engine.waterEngineeringStatus().kind),'canal');
 await works.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.evaluate(()=>window.__engine.waterEngineeringStatus().kind),null);
 await works.getByRole('button',{name:'Aqueduct',exact:true}).click();check(await lay.isDisabled(),'A mode alone cannot commission');
 const chosen=await page.evaluate(()=>{const e=window.__engine;return[e.chooseWaterEngineeringPoint({x:49.6,z:265.6}),e.chooseWaterEngineeringPoint({x:-71.6,z:195.6})];});assert.deepEqual(chosen,[true,true]);
 const preview=await page.evaluate(()=>window.__engine.waterEngineeringStatus());assert.equal(preview.issue,null,JSON.stringify(preview));check(preview.canCommit,'Native preview required');check(!(await lay.isDisabled()),'Actual button must admit valid native plan');report.preview=preview;
 const facts=()=>page.evaluate(()=>{const e=window.__engine,g=e.game,a=window.__waitingAcceptance,added=g.state.buildings.filter(b=>!a.buildings.includes(b.id));return{time:g.state.time,paused:g.state.paused,quality:g.quality,added:added.map(b=>({id:b.id,type:b.type,build:b.build})),assigned:added.filter(b=>g.state.units.some(u=>u.hp>0&&u.constructionQueue?.sites.includes(b.id))).map(b=>b.id),plans:g.state.aqueductWorks?.length||0,heightsUnchanged:g.world.heights.every((v,i)=>v===a.heights[i]),cutsUnchanged:JSON.stringify(g.state.excavations||[])===a.cuts,peopleUnmoved:a.people.every(p=>g.state.units.some(u=>u.id===p.id&&u.x===p.x&&u.z===p.z)),errors:[...g.simulationErrors]};});
 assert.equal((await facts()).added.length,0,'Preview cannot create earthworks');await lay.click();
 report.commission=await facts();check(report.commission.added.length>0,'Commit must queue real digs');check(report.commission.added.every(b=>b.type==='trench'&&b.build<1),'No instant completed construction');assert.equal(report.commission.assigned.length,report.commission.added.length,'Every commissioned dig needs a real builder queue');assert.equal(report.commission.plans,1);check(report.commission.heightsUnchanged&&report.commission.cutsUnchanged&&report.commission.peopleUnmoved,'No instant terrain edits or teleports');assert.deepEqual(report.commission.errors,[]);assert.equal(report.commission.time,on.time);assert.equal(report.commission.paused,true);assert.equal(report.commission.quality,'low');
 stage='strict Test Lab save and reload';
 await page.evaluate(()=>window.__engine.saveNow());
 report.reload=await page.evaluate(()=>{const e=window.__engine,before=e.game,reason=e.loadTestSession();return{reason,replaced:e.game!==before,testMode:e.game.testMode,paused:e.game.state.paused};});
 assert.equal(report.reload.reason,'Test Lab run loaded.');check(report.reload.replaced&&report.reload.testMode&&report.reload.paused,'Strict decode must restore a separate paused Lab game');
 report.restored=await facts();assert.deepEqual(report.restored.added,report.commission.added);assert.deepEqual(report.restored.assigned,report.commission.assigned);assert.equal(report.restored.plans,1);check(report.restored.heightsUnchanged&&report.restored.cutsUnchanged&&report.restored.peopleUnmoved,'Strict reload preserves actual unpaid earthworks');assert.deepEqual(report.restored.errors,[]);
 stage='return original and verify all storage';
 report.return=await page.evaluate(async()=>{const e=window.__engine,a=window.__waitingAcceptance;e.endTestSession();const slots=Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),lab='dawn-of-empire-v17:test-lab',keys=[...new Set([...Object.keys(slots),...Object.keys(a.baseline)])],changed=keys.filter(k=>slots[k]!==a.baseline[k]),digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');return{originalIdentity:e.game===a.original,originalStateUnchanged:JSON.stringify(e.game.state)===a.originalState,nonLabSlotsUnchanged:changed.every(k=>k===lab),changedKeys:changed,labWritten:!!slots[lab],originalStateSHA256:await digest(a.originalState),allOriginalStorageSHA256:await digest(JSON.stringify(a.baseline))};});
 check(report.return.originalIdentity&&report.return.originalStateUnchanged&&report.return.nonLabSlotsUnchanged&&report.return.labWritten,'Return must restore original village and preserve every non-Lab slot after the deliberate entry safeguard');assert.deepEqual(errors,[]);report.passed=1;report.total=1;
}
try{await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('90 second wall deadline')),90000);})]);}
catch(error){report.passed=0;report.total=1;report.failure={stage,message:error.message};process.exitCode=1;}
finally{clearTimeout(timer);await context?.close().catch(()=>{});await browser?.close().catch(()=>{});report.elapsedMilliseconds=Date.now()-began;report.errors=errors;report.requestFailures=requests;console.log(JSON.stringify(report,null,2));}
