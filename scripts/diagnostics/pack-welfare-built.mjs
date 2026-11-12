// Disposable built acceptance. Finite authored custody of one original native goat;
// not an earned taming, campaign, performance, or historical-balance claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const file=process.argv[2],bytes=readFileSync(file),hash=x=>createHash('sha256').update(x).digest('hex'),original=hash(bytes),data=JSON.parse(bytes),s=data.state;
const goat=s.wildlife.find(a=>a.species==='goat'&&a.hp>0),u=s.units.find(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.haulage&&!u.tamingWork&&!u.haulageWork&&!u.boat);assert.ok(goat&&u);
s.wildlife=s.wildlife.filter(a=>a.id!==goat.id);u.haulage='pack';u.packAnimal={id:goat.id,hp:goat.hp,maxHp:goat.maxHp,scale:goat.scale,species:'goat',hunger:60,thirstSeconds:200,foodConsumed:0,waterConsumedLiters:0};s.paused=true;
let browser;const errors=[],report={scope:'Built owner inventory, ordinary simulation care dispatch and strict save/reload. One original native goat assigned in finite authored opening; original file untouched.',passed:0,total:1};
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 await page.goto('http://127.0.0.1:8103/',{waitUntil:'commit',timeout:20000});await page.waitForFunction(()=>window.__engine?.game,{timeout:45000});
 const result=await page.evaluate(async data=>window.__engine.importVillage(new File([JSON.stringify(data)],'private-pack-opening.json',{type:'application/json'})),data);assert.equal(result.applied,true,result.message);
 report.dispatch=await page.evaluate(id=>{const e=window.__engine,g=e.game,u=g.state.units.find(u=>u.id===id),terrain=Array.from(g.world.heights),before=u.packAnimal.hunger;g.state.paused=false;for(let n=0;n<10;n++)g.step(.1);g.state.paused=true;g.selectEntity(u);e.pushHud();return {before,after:u.packAnimal.hunger,id:u.packAnimal.id,errors:[...g.simulationErrors],terrainUnchanged:terrain.every((h,i)=>h===g.world.heights[i])};},u.id);
 assert.ok(report.dispatch.after!==report.dispatch.before);assert.equal(report.dispatch.id,goat.id);assert.deepEqual(report.dispatch.errors,[]);assert.equal(report.dispatch.terrainUnchanged,true);
 const inventory=page.getByRole('button',{name:'Inventory & activity',exact:true});await inventory.click();await page.getByText(/Goat · Health/).waitFor();assert.match(await page.locator('body').innerText(),/Pack goat · capacity ×/);
 const saved=await page.evaluate(async id=>{const e=window.__engine;await e.saveNow();const before=JSON.stringify(e.game.state.units.find(u=>u.id===id).packAnimal);await e.resumeSaved();return before===JSON.stringify(e.game.state.units.find(u=>u.id===id).packAnimal);},u.id);assert.equal(saved,true);assert.deepEqual(errors,[]);report.passed=1;
}catch(e){report.failure=e.message;process.exitCode=1;}finally{await browser?.close();assert.equal(hash(readFileSync(file)),original);report.errors=errors;console.log(JSON.stringify(report,null,2));}
