// The input is the native physical-relief scenario emitted by war-prestige.test.
// This is not an earned-army, complete campaign, or performance acceptance claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const file=process.argv[2],bytes=readFileSync(file),hash=b=>createHash('sha256').update(b).digest('hex'),original=hash(bytes),data=JSON.parse(bytes);data.state.paused=true;
let browser;const errors=[],report={scope:'Built native player-hall relief receipt -> actual prestige meter -> durable save/reload; rival war values stay unknown. Finite authored opening hall/attacker; original native terrain and ordinary retreat steering.',passed:0,total:1};
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 await page.goto('http://127.0.0.1:8103/',{waitUntil:'commit',timeout:20000});await page.waitForFunction(()=>window.__engine?.game,null,{timeout:45000});
 const imported=await page.evaluate(async save=>window.__engine.importVillage(new File([JSON.stringify(save)],'native-war-relief.json',{type:'application/json'})),data);assert.equal(imported.applied,true,imported.message);
 const inspect=()=>{const e=window.__engine,g=e.game,war=g.prestigeBreakdown().components.find(r=>r.component==='defendedWarAims');return {value:war.value,points:war.points,available:war.available,heldFronts:g.state.capitulation.fronts.filter(f=>f.defenderTeam===0&&f.phase==='relieved').map(f=>f.id),privateRivalValuesHidden:g.snapshot().prestigeRivals.every(v=>{const r=v.components.find(r=>r.component==='defendedWarAims');return r.points===null&&!r.available;}),errors:[...g.simulationErrors]};};
 report.before=await page.evaluate(inspect);assert.equal(report.before.value,1);assert.equal(report.before.points,30);assert.equal(report.before.available,true);assert.equal(report.before.heldFronts.length,1);assert.equal(report.before.privateRivalValuesHidden,true);
 await page.getByRole('button',{name:'Village',exact:true}).click();const region=page.getByRole('region',{name:'Prestige breakdown',exact:true});await region.waitFor();const meter=region.getByRole('meter',{name:'War aims prestige',exact:true});await meter.waitFor();assert.equal(await meter.getAttribute('value'),'30');assert.match(await meter.getAttribute('title'),/1 weighted settled war aims/);
 const save=await page.evaluate(()=>window.__engine.saveNow());assert.equal(save.saved,true,save.message);await page.evaluate(()=>window.__engine.resumeSaved());report.after=await page.evaluate(inspect);assert.deepEqual(report.after,report.before);assert.deepEqual(errors,[]);report.passed=1;
}catch(e){report.failure=e.message.slice(0,1500);process.exitCode=1;}finally{await browser?.close();assert.equal(hash(readFileSync(file)),original);report.errors=errors;console.log(JSON.stringify(report,null,2));}
