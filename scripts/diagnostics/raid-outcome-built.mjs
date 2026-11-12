// Input: an actual passed native raid recovery save emitted by
// RAID_PRESTIGE_NATIVE_SAVE or RAID_PRESTIGE_CAPTURE_SAVE. No campaign credit
// for the fixture's explicitly authored opening assets; the receipt is earned
// by its separately qualified physical raid/recovery executor scenario.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const file=process.argv[2];
if(!file)throw new Error('Pass an actual native recovered-raid village JSON file');
const bytes=readFileSync(file),hash=b=>createHash('sha256').update(b).digest('hex'),originalHash=hash(bytes),data=JSON.parse(bytes);
data.state.paused=true; // Freeze the already-earned state; do not advance it.
const profile=mkdtempSync(join(tmpdir(),'hearthwild-raid-outcome-built-'));
const errors=[],expectedValue=.5,expectedPoints=120*expectedValue/(3+expectedValue);
const report={scope:'Actual native raid recovery receipt -> built existing War aims meter -> durable save/reload. No simulation steps, visibility edits, goods grants, original village or private rival totals.',passed:0,total:1};
let context,stage='launch';
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000},args:['--enable-unsafe-swiftshader']});
 const page=context.pages()[0];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 await page.goto(process.env.HEARTHWILD_BUILT_URL||'http://127.0.0.1:8103/',{waitUntil:'commit',timeout:20000});
 await page.waitForFunction(()=>window.__engine?.game,null,{timeout:45000});
 stage='import actual native receipt';
 const imported=await page.evaluate(async save=>window.__engine.importVillage(new File([JSON.stringify(save)],'native-raid-recovery.json',{type:'application/json'})),data);
 assert.equal(imported.applied,true,imported.message);
 const inspect=()=>{
  const g=window.__engine.game,view=g.prestigeBreakdown(),war=view.components.find(r=>r.component==='defendedWarAims'),rivals=g.snapshot().prestigeRivals;
  return{value:war.value,points:war.points,available:war.available,time:g.state.time,paused:g.state.paused,receipts:JSON.parse(JSON.stringify(g.state.raidDefense||null)),wood:g.state.tribes.map(t=>t.wood),people:g.state.units.map(u=>({id:u.id,team:u.team,carry:u.carry,carryType:u.carryType})),rivalCount:rivals.length,privateRivalValuesHidden:rivals.every(v=>{const r=v.components.find(r=>r.component==='defendedWarAims');return r.points===null&&!r.available;}),errors:[...g.simulationErrors]};
 };
 const before=await page.evaluate(inspect);report.before={value:before.value,points:before.points,receiptCount:before.receipts?.bands.length,people:before.people.length,privateRivalValuesHidden:before.privateRivalValuesHidden};
 assert.equal(before.value,expectedValue);assert.ok(Math.abs(before.points-expectedPoints)<1e-8);assert.equal(before.available,true);assert.equal(before.paused,true);
 assert.ok(before.receipts.bands.some(b=>b.outcome==='held'&&b.settledAt!==undefined));assert.ok(before.rivalCount>0);assert.equal(before.privateRivalValuesHidden,true);assert.deepEqual(before.errors,[]);
 stage='existing village ledger meter';
 await page.getByRole('button',{name:'Village',exact:true}).click();
 const region=page.getByRole('region',{name:'Prestige breakdown',exact:true});await region.waitFor();
 const meter=region.getByRole('meter',{name:'War aims prestige',exact:true});await meter.waitFor();
 // Wait on the actual HUD snapshot, never a synthetic DOM value or engine tick.
 await page.waitForFunction(expected=>{const meter=document.querySelector('meter[aria-label="War aims prestige"]');return meter&&Math.abs(Number(meter.getAttribute('value'))-expected)<1e-8;},expectedPoints);
 assert.ok(Math.abs(Number(await meter.getAttribute('value'))-expectedPoints)<1e-8);assert.match(await meter.getAttribute('title'),/0\.5 weighted settled war aims/);
 report.meter={value:Number(await meter.getAttribute('value')),title:await meter.getAttribute('title')};
 stage='durable save and reload';
 const saved=await page.evaluate(()=>window.__engine.saveNow());assert.equal(saved.saved,true,saved.message);
 await page.evaluate(()=>window.__engine.resumeSaved());const after=await page.evaluate(inspect);assert.deepEqual(after,before);report.after={value:after.value,points:after.points,receiptCount:after.receipts.bands.length,people:after.people.length,privateRivalValuesHidden:after.privateRivalValuesHidden};assert.deepEqual(errors,[]);report.passed=1;
}catch(error){report.failure={stage,message:String(error?.message||error).slice(0,2000)};process.exitCode=1;}
finally{await context?.close();rmSync(profile,{recursive:true,force:true});report.inputUnchanged=hash(readFileSync(file))===originalHash;assert.equal(report.inputUnchanged,true);report.errors=errors;console.log(JSON.stringify(report,null,2));}
