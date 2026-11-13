import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
const file='/Users/boriskizenko/Downloads/hearthwild-village--1815620580-11394.json',bytes=readFileSync(file),hash=b=>createHash('sha256').update(b).digest('hex'),original=hash(bytes),profile=mkdtempSync(join(tmpdir(),'hearthwild-trade-compat-')),errors=[];
assert.equal(original,'61a2a13a1558c62857cba16b082a0e4a0fb85573ec2ee430d0e6a301dbd92cc6');let context;
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000},args:['--enable-unsafe-swiftshader']});const page=context.pages()[0];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));await page.goto('http://127.0.0.1:8103/',{waitUntil:'commit'});await page.waitForFunction(()=>window.__engine?.game,null,{timeout:60000});
 const imported=await page.evaluate(async text=>{const e=window.__engine,r=await e.importVillage(new File([text],'original53.json',{type:'application/json'}));e.setPaused(true);let last=-Infinity;e.view.renderer.setAnimationLoop(t=>{if(t-last>=160){last=t;e.frame(t);}});return r;},bytes.toString());assert.equal(imported.applied,true,imported.message);
 const inspect=()=>page.evaluate(()=>{const g=window.__engine.game;return{time:g.state.time,living:g.state.units.filter(u=>u.team===0&&u.hp>0).map(u=>u.id),cargo:g.state.units.filter(u=>u.team===0).map(u=>({id:u.id,carry:u.carry,type:u.carryType,food:u.carryFood,lots:u.carryFoodLots})),stocks:g.state.tribes.map(t=>({id:t.id,food:t.food,lots:t.foodLots,wood:t.wood,stone:t.stone}))};});const before=await inspect();assert.equal(before.living.length,53);
 await page.evaluate(()=>{const e=window.__engine,g=e.game,u=g.state.units.find(u=>u.id===12480);g.clearSelect();g.selectEntity(u);e.pushHud();});
 const more=page.getByRole('button',{name:'More orders',exact:true});if(await more.count()&&await more.getAttribute('aria-expanded')!=='true'&&await more.getAttribute('aria-pressed')!=='true')await more.click();
 await page.getByRole('button',{name:'Inventory & activity',exact:true}).click();await page.getByText('36 fresh fish',{exact:true}).waitFor();assert.deepEqual(await inspect(),before);
 const saved=await page.evaluate(()=>window.__engine.saveNow());assert.equal(saved.saved,true,saved.message);await page.evaluate(()=>window.__engine.resumeSaved());assert.deepEqual(await inspect(),before);assert.deepEqual(errors,[]);assert.equal(hash(readFileSync(file)),original);
 console.log(JSON.stringify({passed:1,total:1,scope:'Built public Inventory & activity renders existing36 fresh fish; read-only selection and durable save retain original53 IDs/stocks/cargo. No mixed-trade browser journey claim, screenshots, added goods or terrain/fog changes.',original53Unchanged:true,residents:53,errors},null,2));
}finally{await context?.close();rmSync(profile,{recursive:true,force:true});}
