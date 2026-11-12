// Disposable private browser: never touches the player's browser or save file.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const originalFile=process.argv[2],original=readFileSync(originalFile),hash=b=>createHash('sha256').update(b).digest('hex'),beforeHash=hash(original),profile=mkdtempSync(join(tmpdir(),'hearthwild-integration-'));
const report={passed:0,total:1,scope:'Built merged release renders, imports original village and durably restores identical state; no full campaign, performance or visual-style acceptance claim.'},errors=[];let context;
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000},args:['--enable-unsafe-swiftshader']});
 const page=context.pages()[0];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 await page.goto(process.env.HEARTHWILD_BUILT_URL||'http://127.0.0.1:8103/',{waitUntil:'commit'});
 await page.waitForFunction(()=>window.__engine?.game,null,{timeout:45000});
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
