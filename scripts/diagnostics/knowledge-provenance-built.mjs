// Read-only knowledge acceptance against a copied private native village.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const file=process.argv[2],bytes=readFileSync(file),hash=b=>createHash('sha256').update(b).digest('hex'),original=hash(bytes),data=JSON.parse(bytes);data.state.paused=true;
let browser;const errors=[],report={scope:'Built native53 copied-save import, compact knowledge states and disclosed actual learning sources, read purity and strict restore. No new techniques, campaign or performance claim.',passed:0,total:1};
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 await page.goto('http://127.0.0.1:8103/',{waitUntil:'commit',timeout:20000});await page.waitForFunction(()=>window.__engine?.game,null,{timeout:45000});
 const imported=await page.evaluate(async save=>window.__engine.importVillage(new File([JSON.stringify(save)],'private-knowledge.json',{type:'application/json'})),data);assert.equal(imported.applied,true,imported.message);
 const before=await page.evaluate(()=>JSON.stringify(window.__engine.game.state));await page.getByRole('button',{name:'Knowledge',exact:true}).click();const panel=page.getByRole('region',{name:'Knowledge through practice'});
 await panel.getByPlaceholder('Find a skill…').waitFor();assert.equal(await panel.getByRole('list',{name:'Learning sources'}).count(),0,'sources stay closed until requested');
 const rows=panel.locator('article');report.topics=await rows.count();assert.ok(report.topics>10);
 const known=rows.filter({hasText:'Demonstrated'}).first();await known.waitFor();assert.match(await known.innerText(),/Known|Partly known/);assert.ok((await known.innerText()).length<350,'collapsed row stays compact');
 await known.getByRole('button',{name:/^Details:/}).click();const sources=known.getByRole('list',{name:'Learning sources'});await sources.waitFor();assert.match(await sources.innerText(),/Demonstrated/);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__engine.game.state)),before,'reading does not alter goods, knowledge, time, or RNG');
 const saved=await page.evaluate(()=>window.__engine.saveNow());assert.equal(saved.saved,true,saved.message);
 report.restore=await page.evaluate(async()=>{const e=window.__engine,before=JSON.stringify(e.game.state);await e.resumeSaved();return {sameState:JSON.stringify(e.game.state)===before,paused:e.game.state.paused,errors:[...e.game.simulationErrors]};});assert.equal(report.restore.sameState,true);assert.equal(report.restore.paused,true);assert.deepEqual(report.restore.errors,[]);assert.deepEqual(errors,[]);report.passed=1;
}catch(e){report.failure=e.message;process.exitCode=1;}finally{await browser?.close();assert.equal(hash(readFileSync(file)),original);report.errors=errors;console.log(JSON.stringify(report,null,2));}
