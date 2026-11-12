// Disposable private browser: never touches the player's browser or save file.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const nativeFile=process.argv[3],originalFile=process.argv[2],original=readFileSync(originalFile),hash=b=>createHash('sha256').update(b).digest('hex'),beforeHash=hash(original),profile=mkdtempSync(join(tmpdir(),'hearthwild-integration-'));
const report={passed:0,total:nativeFile?2:1,scope:'Built merged release renders, imports original village and durably restores identical state; no full campaign, performance or visual-style acceptance claim.'},errors=[];let context;
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000},args:['--enable-unsafe-swiftshader']});
 const page=context.pages()[0];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 await page.goto(process.env.HEARTHWILD_BUILT_URL||'http://127.0.0.1:8103/',{waitUntil:'commit'});
 await page.waitForFunction(()=>window.__engine?.game,null,{timeout:45000});
 if(nativeFile){
  const r=await page.evaluate(async text=>window.__engine.importVillage(new File([text],'native-meal.json',{type:'application/json'})),readFileSync(nativeFile,'utf8'));assert.equal(r.applied,true,r.message);
  await page.evaluate(()=>{const e=window.__engine,g=e.game;g.selectEntity(g.state.buildings.find(b=>b.team===0&&b.type==='hearth'));e.pushHud();});
  const cook=page.getByRole('button',{name:'Cook meat',exact:true});await cook.waitFor({state:'visible'});await cook.click();
  await page.waitForFunction(()=>window.__engine.game.state.production?.projects.some(p=>p.recipe==='cookMeat'));
  const facts=()=>page.evaluate(()=>{const g=window.__engine.game;return JSON.parse(JSON.stringify({items:g.tribe(0).items,wood:g.tribe(0).wood,residue:g.tribe(0).survival.residueFuel,production:g.state.production}));});
  const paid=await facts();assert.equal(paid.wood,0);assert.equal(paid.items.chaff,0);assert.equal(paid.production.metrics.consumed.chaff,8);assert.equal(paid.production.metrics.logsUsed,0);
  await page.evaluate(async()=>{const e=window.__engine,r=await e.saveNow();if(!r.saved)throw Error(r.message);await e.resumeSaved();});assert.deepEqual(await facts(),paid);
  report.mealResidues={chaffPaid:8,logsPaid:0,paidBatchRestored:true};report.passed++;
 }
 const r=await page.evaluate(async text=>window.__engine.importVillage(new File([text],'existing-village.json',{type:'application/json'})),original.toString('utf8'));
 assert.equal(r.applied,true,r.message);
 const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify({...window.__engine.game.state,banner:'',bannerT:0})));
 const before=await state();report.population=before.units.filter(u=>u.team===0&&u.hp>0).length;
 await page.evaluate(async()=>{const e=window.__engine,r=await e.saveNow();if(!r.saved)throw Error(r.message);await e.resumeSaved();});
 assert.deepEqual(await state(),before);
 await page.locator('canvas').first().waitFor({state:'visible'});
 await page.screenshot({path:'/tmp/hearthwild-integration-review.png'});
 assert.deepEqual(errors,[]);report.passed++;
}catch(e){report.failure=e.message.slice(0,1400);process.exitCode=1;}
finally{await context?.close();rmSync(profile,{recursive:true,force:true});report.originalUnchanged=hash(readFileSync(originalFile))===beforeHash;assert.equal(report.originalUnchanged,true);report.errors=errors;console.log(JSON.stringify(report,null,2));}
