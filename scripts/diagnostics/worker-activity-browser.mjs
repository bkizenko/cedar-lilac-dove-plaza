// Read-only UI acceptance on a disposable copy of a real exported village.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {SAVE_KEY} from '../../src/game/constants.ts';
import {workerActivity} from '../../src/game/workerActivity.ts';
const path=process.env.VILLAGE_EXPORT||'/Users/boriskizenko/Downloads/hearthwild-village--1815620580-11394.json',base=process.env.BASE_URL||'http://127.0.0.1:8102';
const original=readFileSync(path,'utf8'),raw=JSON.parse(original),save={...raw,state:{...raw.state,paused:true},savedAt:Date.now()};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const watchdog=setTimeout(()=>browser.close().catch(()=>{}),120000);
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,save})=>{localStorage.setItem(key,JSON.stringify(save));localStorage.setItem('hearthwild:graphics-quality','low');},{key:SAVE_KEY,save});
 await page.goto(base,{waitUntil:'commit',timeout:20000});await page.waitForFunction(()=>window.__engine?.game?.state?.units?.length,undefined,{timeout:90000});
 const snapshot=await page.evaluate(()=>{
  const e=window.__engine,g=e.game;g.state.paused=true;e.keys.clear();
  const p=g.state.production?.projects.find(p=>p.team===0&&p.actorId!==null&&p.phase==='working'&&g.state.units.some(u=>u.id===p.actorId&&u.hp>0));if(!p)throw Error('No real active paid actor in exported village; no substitute is created');
  const u=g.state.units.find(u=>u.id===p.actorId);g.selectEntity(u);e.pushHud();return{resident:u,state:{time:g.state.time,production:g.state.production,buildings:g.state.buildings},fingerprint:JSON.stringify(g.state),people:g.state.units.filter(u=>u.team===0&&u.hp>0).length,version:g.state.worldgenVersion};
 });
 const expected=workerActivity(snapshot.state,snapshot.resident);
 await page.getByRole('button',{name:'Inventory & activity',exact:true}).click();
 await page.getByText(`${expected.recipe} · ${expected.stage}`,{exact:true}).waitFor();
 const details=page.locator('details').filter({has:page.locator('summary',{hasText:'Task details'})});await details.locator('summary').click();
 const text=await details.innerText();assert.ok(text.includes(expected.destination));assert.ok(text.includes(`${Math.floor(expected.workSeconds)}/${expected.requiredWorkSeconds}s work`));assert.ok(text.includes(expected.cargo.join(' · ')||'Empty hands'));
 const bar=page.getByRole('progressbar',{name:'Batch work completed'});assert.ok(Math.abs(Number(await bar.getAttribute('value'))-expected.progress)<1e-10);
 const after=await page.evaluate(before=>{const state=window.__engine.game.state,old=JSON.parse(before);return{changed:Object.keys(old).filter(k=>k!=='bannerT'&&JSON.stringify(old[k])!==JSON.stringify(state[k])),errors:window.__engine.game.simulationErrors};},snapshot.fingerprint);assert.deepEqual(after.changed,[],'opening task details must not change stocks, assignments, routes, clocks or progress');assert.deepEqual(after.errors,[]);assert.deepEqual(errors,[]);assert.equal(readFileSync(path,'utf8'),original);
 console.log(JSON.stringify({base,passed:1,total:1,people:snapshot.people,version:snapshot.version,actor:snapshot.resident.id,project:expected.projectId,recipe:expected.recipe,stage:expected.stage,progress:expected.progress,destination:expected.destination,carried:expected.cargo,simulationUnchanged:true,uiBannerCountdownExcluded:true,originalExportUnchanged:true,pageErrors:errors,scope:'Rendered Low release, real saved active paid actor, actual Inventory & activity disclosure and task details; no simulation or save edits, screenshots, grants or replacement actors.'}));
 await context.close();
}finally{clearTimeout(watchdog);await browser.close();}
