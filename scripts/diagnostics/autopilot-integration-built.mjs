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
 if(process.env.PRESTIGE==='1'){
  stage='native prestige evidence and actual ledger breakdown';
  // Advance only this disposable village through ordinary Game.step. No food,
  // territory, terrain, reports or score facts are fabricated after import.
  let measured=false;
  for(let batch=0;batch<24&&!measured;batch++){
   const status=await page.evaluate(()=>{const e=window.__engine,g=e.game;g.state.paused=false;let steps=0;for(;steps<16;steps++){if(g.state.encounter)break;g.step(1/30);if(g.state.paused||g.state.ended)break;}g.state.paused=true;e.pushHud();return{measured:g.prestigeBreakdown().territoryMeasuredAt!==null,encounter:!!g.state.encounter,ended:g.state.ended,errors:[...g.simulationErrors]};});
   assert.equal(status.ended,null);assert.deepEqual(status.errors,[]);measured=status.measured;
   if(status.encounter){await page.getByRole('dialog').filter({has:page.getByRole('button',{name:'End conversation',exact:true})}).getByRole('button',{name:'End conversation',exact:true}).click();}
  }
  // The World influence painter may still be warming; incomplete evidence
  // must stay unavailable, never become a measured zero.
  if(!measured){await page.evaluate(()=>{const g=window.__engine.game;g.state.speed=1;g.state.paused=false;});await page.waitForTimeout(5000);await page.evaluate(()=>{window.__engine.game.state.paused=true;window.__engine.pushHud();});}
  await page.getByRole('button',{name:'Village',exact:true}).click();
  const prestige=page.getByRole('region',{name:'Prestige breakdown',exact:true});await prestige.waitFor();
  assert.equal(await prestige.getByRole('meter').count(),8);
  report.prestige=await page.evaluate(()=>{const e=window.__engine,g=e.game,v=g.prestigeBreakdown(),region=document.querySelector('[aria-label="Prestige breakdown"]');return{total:v.total,componentCount:v.components.length,sum:v.components.reduce((n,c)=>n+(c.points??0),0),measuredAt:v.territoryMeasuredAt,landAvailable:v.components.find(c=>c.component==='usableArea').available,warEvidenceAvailable:v.components.find(c=>c.component==='defendedWarAims').available,unknownNames:g.snapshot().prestigeRivals.filter(v=>v.knowledge==='unknown'&&!v.identityKnown).map(v=>g.tribe(v.subject).name),text:region.textContent,paused:g.state.paused,errors:[...g.simulationErrors]};});
  const r=report.prestige;assert.equal(r.componentCount,8);assert.ok(Number.isFinite(r.total));assert.ok(Math.abs(r.sum-r.total)<1e-8);if(r.measuredAt===null){assert.equal(r.landAvailable,false);assert.match(r.text,/Land survey updating/);}else assert.ok(r.landAvailable);assert.equal(r.warEvidenceAvailable,false);assert.ok(r.paused);assert.deepEqual(r.errors,[]);for(const name of r.unknownNames)assert.ok(!r.text.includes(name),'unknown community names stay hidden');assert.deepEqual(errors,[]);report.passed=report.total=2;
 }
 if(process.env.ERA_UPGRADE==='1'){
  stage='actual selected-building extension controls';
  const candidate=await page.evaluate(async()=>{
   const e=window.__engine,g=e.game;
   for(const b of g.state.buildings.filter(b=>b.team===0&&b.hp>0&&g.finished(b)&&['hearth','hut','house','dryrack','smokehouse','butcher','tanner','tailor','kiln'].includes(b.type)).slice(0,48)){
    const reply=await e.readModel({kind:'building-fabric',buildingId:b.id}),choice=reply.model.choices.find(c=>c.mode==='extend'&&!c.issue);
    if(!choice)continue;
    g.clearSelect();g.selectEntity(b);e.pushHud();return{id:b.id,side:choice.side,target:choice.target,hp:b.hp,maxHp:b.maxHp,wood:g.tribe(0).wood,stone:g.tribe(0).stone};
   }
   throw Error('No physically eligible existing native building; fixture must not be modified to fabricate one');
  });
  const controls=page.getByRole('region',{name:'Building upgrade',exact:true});await controls.waitFor();
  await controls.getByLabel('Extension side',{exact:true}).selectOption(candidate.side);
  const extend=controls.getByRole('button',{name:'Extend',exact:true});await extend.waitFor();await page.waitForFunction(()=>{const b=[...document.querySelectorAll('[aria-label="Building upgrade"] button')].find(b=>b.textContent==='Extend');return b&&!b.disabled;},{},{timeout:10000});await extend.click();
  await controls.getByRole('progressbar',{name:'Building upgrade progress',exact:true}).waitFor();
  report.eraUpgrade=await page.evaluate(({id,target,hp,maxHp,wood,stone})=>{
   const g=window.__engine.game,b=g.state.buildings.find(b=>b.id===id),p=b.renovation;
   return{id,mode:p?.mode,paid:p?.paid,progress:p?.progress,target:p?.eraChange?.target,hpUnchanged:b.hp===hp,maximumUnchanged:b.maxHp===maxHp,stockUnchanged:g.tribe(0).wood===wood&&g.tribe(0).stone===stone,paused:g.state.paused};
  },candidate);
  const r=report.eraUpgrade;assert.equal(r.mode,'extend');assert.equal(r.paid,false);assert.equal(r.progress,0);assert.deepEqual(r.target,candidate.target);assert.ok(r.hpUnchanged&&r.maximumUnchanged&&r.stockUnchanged&&r.paused);
  assert.equal((await page.evaluate(()=>window.__engine.saveNow())).saved,true);
  report.eraUpgrade.reload=await page.evaluate(async id=>{const e=window.__engine;await e.resumeSaved();const p=e.game.state.buildings.find(b=>b.id===id)?.renovation;return{mode:p?.mode,paid:p?.paid,progress:p?.progress,target:p?.eraChange?.target};},candidate.id);
  assert.equal(report.eraUpgrade.reload.mode,'extend');assert.equal(report.eraUpgrade.reload.paid,false);assert.equal(report.eraUpgrade.reload.progress,0);assert.deepEqual(report.eraUpgrade.reload.target,candidate.target);report.passed=report.total=2;
 }
 if(process.env.SAVE_FAILURE==='1'){
  stage='actual failed durable checkpoint refuses Test Lab';
  report.failedCheckpoint=await page.evaluate(async()=>{
   const e=window.__engine,g=e.game,original=e.originalGame;
   const content=()=>JSON.stringify({seed:g.state.seed,time:g.state.time,tribes:g.state.tribes,units:g.state.units,buildings:g.state.buildings,livestock:g.state.livestock,production:g.state.production,armor:g.state.armor,farmToolCargo:g.state.farmToolCargo,droppedWeaponCargo:g.state.droppedWeaponCargo});
   const slots=()=>JSON.stringify(Object.entries(localStorage).filter(([k])=>(k.startsWith('hearthwild')||k.startsWith('dawn-of-empire'))).sort(([a],[b])=>a.localeCompare(b)));
   const before=content(),durable=slots(),setter=Storage.prototype.setItem;let writes=0,entered;
   try{Storage.prototype.setItem=function(key,value){if((String(key).startsWith('hearthwild')||String(key).startsWith('dawn-of-empire'))){writes++;throw new DOMException('Controlled candidate storage quota failure','QuotaExceededError');}return setter.call(this,key,value);};entered=await e.startTestSession();}
   finally{Storage.prototype.setItem=setter;}
   return{writes,entered,sameOwner:e.game===g,sameOriginalOwner:e.originalGame===original,labEntered:e.game.testMode===true,gameplayUnchanged:content()===before,durableSlotsUnchanged:slots()===durable,paused:e.game.state.paused,errors:[...e.game.simulationErrors]};
  });
  const r=report.failedCheckpoint;assert.ok(r.writes>0,'Actual storage write must fail');assert.equal(r.entered,false);assert.equal(r.sameOwner,true);assert.equal(r.sameOriginalOwner,true);assert.equal(r.labEntered,false);assert.equal(r.gameplayUnchanged,true);assert.equal(r.durableSlotsUnchanged,true);assert.deepEqual(r.errors,[]);assert.deepEqual(errors,[]);report.passed=report.total=2;
 }
}
try{await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('90 second wall deadline')),90000);})]);}
catch(error){report.passed=0;report.total=1;report.failure={stage,message:error.message};process.exitCode=1;}
finally{clearTimeout(timer);await context?.close().catch(()=>{});await browser?.close().catch(()=>{});assert.equal(sha(readFileSync(fixture)),originalChecksum,'Private source bytes changed');report.errors=errors;report.elapsedMilliseconds=Date.now()-start;console.log(JSON.stringify(report,null,2));}
