// Disposable frozen build only. Node24 --import ./scripts/game-loader.mjs
// scripts/diagnostics/pack-pasture-built.mjs [NATIVE_PASTURE.json] [NATIVE_REFIT.json]
// The source fixtures already earned actual pasture return and retained-harness
// refitting. Built checks cover their real UI, queued/canceled return intent and
// same-ID strict persistence; no screenshots, long simulation or new animal gifts.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {packCapacityMultiplier,PACK_HARNESS_RULES} from '../../src/game/packAnimalState.ts';
const hash=x=>createHash('sha256').update(x).digest('hex');
const files=[process.argv[2]||'/tmp/hearthwild-native-pasture.json',process.argv[3]||'/tmp/hearthwild-native-refit.json'].map(file=>{const bytes=readFileSync(file);return{file,bytes,hash:hash(bytes),data:JSON.parse(bytes)};});
const [pasture,refit]=files,animal=pasture.data.state.livestock.find(a=>a.hp>0&&a.packHarness),owner=refit.data.state.units.find(u=>u.hp>0&&u.haulage==='pack'&&u.packAnimal?.id===animal?.id);
assert.ok(animal&&owner,'Fixtures must contain the same already returned/refitted native animal');assert.equal(animal.species,'cattle');assert.deepEqual(owner.packAnimal.packHarness,animal.packHarness);
for(const key of ['id','species','sex','born','tamedAt','milk','pregnancy','lactatingUntil','adultScale'])assert.deepEqual(owner.packAnimal[key],animal[key],`Refit preserves ${key}`);
const pen=pasture.data.state.buildings.find(b=>b.id===animal.pen&&b.type==='pen'&&b.build>=1&&b.hp>0);assert.ok(pen);assert.ok(refit.data.state.buildings.some(b=>b.id===pen.id&&b.type==='pen'&&b.build>=1&&b.hp>0));
const errors=[],profile=mkdtempSync(join(tmpdir(),'hearthwild-pack-pasture-built-')),report={scope:'Two desktop built checks on source-earned native pasture/refit fixtures: actual retained-harness pen UI and same-ID pasture persistence; actual return-queue/cancel controls and strict owned-animal/harness/biological metadata persistence. Only disposable copies are paused. No additional return journey/refit completion, campaign, performance, historical balance or screenshot claim.',target:'http://127.0.0.1:8103/',passed:0,total:2,animalId:animal.id,handlerId:owner.id,sourceHashes:files.map(f=>({file:f.file,hash:f.hash}))};
let context,stage='launch';
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000},args:['--enable-unsafe-swiftshader']});
 const page=context.pages()[0]||await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 await page.goto(report.target,{waitUntil:'commit',timeout:20000});await page.waitForFunction(()=>window.__engine?.game,null,{timeout:45000});
 const importPaused=async fixture=>{const result=await page.evaluate(async source=>{const data=JSON.parse(source);data.state.paused=true;return window.__engine.importVillage(new File([JSON.stringify(data)],'native-pack-pasture-check.json',{type:'application/json'}));},fixture.bytes.toString('utf8'));assert.equal(result.applied,true,result.message);};
 const selectPen=async()=>{
  await page.evaluate(id=>{const e=window.__engine,g=e.game,b=g.state.buildings.find(b=>b.id===id);if(e.isWorkerSession)throw Error('Native owner mode required');g.clearSelect();e.view.look.set(b.x,b.y,b.z);e.view.dist=24;e.pushHud();},pen.id);
  let selection;for(let attempt=0;attempt<20&&!selection;attempt++){
   selection=await page.evaluate(id=>{const e=window.__engine,v=e.view;for(const [mesh,owners]of v.penFences?.pickingSources()||[]){mesh.geometry.computeBoundingBox();for(let i=0;i<owners.length;i++){if(owners[i]?.id!==id)continue;const m=mesh.matrix.clone();mesh.getMatrixAt(i,m);const c=v.look.clone();mesh.geometry.boundingBox.getCenter(c);c.applyMatrix4(m);const p=v.project(c.x,c.y,c.z);if(p.behind||p.x<340||p.x>1100||p.y<150||p.y>760||v.pickEntity(p.x,p.y,e.game)?.id!==id)continue;const r=v.renderer.domElement.getBoundingClientRect();if(document.elementFromPoint(p.x+r.left,p.y+r.top)!==v.renderer.domElement)continue;e.leftClick(p.x,p.y,false);e.pushHud();return{hit:id,selected:e.game.state.selBld?.id,nativeInput:true};}}return null;},pen.id);
   if(!selection)await page.waitForTimeout(100);
  }
  assert.ok(selection,'Actual pen fence must be pickable');assert.equal(selection.selected,pen.id);return selection;
 };
 const snapshot=()=>page.evaluate(({animalId,handlerId})=>{const e=window.__engine,g=e.game,herd=(g.state.livestock||[]).filter(a=>a.id===animalId),handlers=g.state.units.filter(u=>u.packAnimal?.id===animalId),u=g.state.units.find(u=>u.id===handlerId);return{herd,handlers:handlers.map(u=>({id:u.id,haulage:u.haulage,packAnimal:u.packAnimal})),wild:g.state.wildlife.filter(a=>a.id===animalId).length,order:u?.packPastureOrder??null,practice:g.state.units.map(u=>({id:u.id,value:u.draftPracticeSeconds})),errors:[...g.simulationErrors]};},{animalId:animal.id,handlerId:owner.id});
 const strictReload=async()=>{const result=await page.evaluate(async()=>{const e=window.__engine,result=await e.saveNow();if(!result.saved)throw Error(result.message);await e.resumeSaved();return{paused:e.game.state.paused};});assert.equal(result.paused,true);};
 stage='source-earned pasture retained-harness UI';await importPaused(pasture);report.pasturePen=await selectPen();
 const fit=page.getByRole('button',{name:/^Fit existing harness/});await fit.waitFor({state:'visible'});assert.equal(await fit.isEnabled(),true);assert.ok((await fit.innerText()).includes(`${PACK_HARNESS_RULES.refitSeconds}s · retained cattle harness · no new logs`));await page.getByRole('button',{name:/^Return working animal/}).waitFor({state:'visible'});
 const first=await snapshot();assert.equal(first.herd.length,1);assert.deepEqual(first.herd[0],animal);assert.equal(first.handlers.length,0);assert.equal(first.wild,0);assert.deepEqual(first.errors,[]);
 stage='same-ID pasture strict reload';await strictReload();const firstReload=await snapshot();assert.deepEqual(firstReload,first);report.pasture={id:animal.id,harness:firstReload.herd[0].packHarness,strictMetadataPreserved:true,visibleExistingHarnessFit:true};report.passed++;
 stage='source-earned refitted working animal';await importPaused(refit);await page.evaluate(id=>{const e=window.__engine,u=e.game.state.units.find(u=>u.id===id);e.game.selectEntity(u);e.view.look.set(u.x,u.y,u.z);e.view.dist=24;e.pushHud();},owner.id);
 const inventory=page.getByRole('button',{name:'Inventory & activity',exact:true});if(await inventory.getAttribute('aria-expanded')!=='true')await inventory.click();await page.getByText(/Cattle · Health/).waitFor({state:'visible'});assert.ok((await page.locator('body').innerText()).includes(`Pack cattle · capacity ×${packCapacityMultiplier(owner).toFixed(2)}`));
 report.refitPen=await selectPen();const returnButton=page.getByRole('button',{name:/^Return working animal/});assert.equal(await returnButton.isEnabled(),true);
 stage='actual queued return, without instantaneous transfer';await returnButton.click();await page.getByText('1 working animal returning',{exact:true}).waitFor({state:'visible'});
 const queued=await snapshot();assert.equal(queued.herd.length,0);assert.equal(queued.handlers.length,1);assert.equal(queued.handlers[0].id,owner.id);assert.deepEqual(queued.handlers[0].packAnimal,owner.packAnimal);assert.equal(queued.wild,0);assert.equal(queued.order.animal,animal.id);assert.equal(queued.order.pen,pen.id);assert.equal(queued.order.phase,'queued');assert.deepEqual(queued.errors,[]);
 stage='strict queued-return persistence';await strictReload();assert.deepEqual(await snapshot(),queued);await selectPen();
 stage='actual pending-return cancellation';await page.getByRole('button',{name:/^Cancel return/}).click();const canceled=await snapshot();assert.equal(canceled.order,null);assert.equal(canceled.herd.length,0);assert.equal(canceled.handlers.length,1);assert.deepEqual(canceled.handlers[0].packAnimal,owner.packAnimal);assert.equal(canceled.wild,0);assert.deepEqual(canceled.errors,[]);
 stage='strict refitted identity and biological metadata reload';await strictReload();const saved=await snapshot();assert.deepEqual(saved,canceled);assert.equal(packCapacityMultiplier({...owner,packAnimal:saved.handlers[0].packAnimal}),packCapacityMultiplier(owner));assert.deepEqual(errors,[]);report.refit={id:animal.id,handler:owner.id,harness:saved.handlers[0].packAnimal.packHarness,queuedAndCanceledThroughUI:true,strictMetadataAndPracticePreserved:true,actualCapacity:packCapacityMultiplier(owner)};report.passed++;
}catch(error){report.failure={stage,message:error.message.slice(0,1200)};process.exitCode=1;}finally{await context?.close();rmSync(profile,{recursive:true,force:true});report.originalsUnchanged=files.every(f=>hash(readFileSync(f.file))===f.hash);assert.equal(report.originalsUnchanged,true);report.errors=errors;console.log(JSON.stringify(report,null,2));}
