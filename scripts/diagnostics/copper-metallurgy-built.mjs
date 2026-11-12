// Earned native metallurgy readout and legacy-save continuity in an isolated profile.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const hash=b=>createHash('sha256').update(b).digest('hex');
const inputs=process.argv.slice(2).map(file=>({file,bytes:readFileSync(file)}));
assert.equal(inputs.length,2,'Pass earned metallurgy export and untouched original53');
for(const i of inputs)i.hash=hash(i.bytes);
const profile=mkdtempSync(join(tmpdir(),'hearthwild-copper-built-')),errors=[];
const report={passed:0,total:3,scope:'Actually earned ore/smelting/tool readouts and durable storage, plus original53 legacy copper preservation; authored native opening not a full campaign. No new full gate or performance credit.'};
let context,stage='launch';
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000},args:['--enable-unsafe-swiftshader']});
 const page=context.pages()[0];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|shader.*error|shader.*failed/i.test(m.text()))errors.push(m.text().slice(0,1000));});
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 await page.goto(process.env.HEARTHWILD_BUILT_URL||'http://127.0.0.1:8103/',{waitUntil:'commit'});
 await page.waitForFunction(()=>window.__engine?.game,null,{timeout:60000});
 const load=async input=>{const data=JSON.parse(input.bytes);data.state.paused=true;const r=await page.evaluate(async data=>window.__engine.importVillage(new File([JSON.stringify(data)],'private-village.json',{type:'application/json'})),data);assert.equal(r.applied,true,r.message);return data;};
 const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify({...window.__engine.game.state,banner:'',bannerT:0,particles:[],floaters:[],selBld:null,placing:null,pendingAge:false},(k,v)=>k==='selected'?false:['target','node'].includes(k)&&v&&typeof v==='object'&&'kind'in v&&'id'in v?{id:v.id,kind:v.kind}:v)));
 const assets=s=>({worldVersion:s.worldgenVersion,tribes:s.tribes.map(t=>({id:t.id,food:t.food,wood:t.wood,stone:t.stone,copper:t.copper,iron:t.iron,items:t.items??{},copperMetallurgyVersion:t.copperMetallurgyVersion})),units:s.units.map(u=>({id:u.id,team:u.team,hp:u.hp,x:u.x,y:u.y,z:u.z,carry:u.carry,carryType:u.carryType,itemCargo:u.itemCargo,farmTool:u.farmTool,farmToolCondition:u.farmToolCondition}))});
 const durable=async()=>{const r=await page.evaluate(()=>window.__engine.saveNow());assert.equal(r.saved,true,r.message);const before=await state();await page.evaluate(()=>window.__engine.resumeSaved());assert.deepEqual(await state(),before);};

 stage='earned ore and smelting knowledge';const earned=await load(inputs[0]);assert.deepEqual(assets(await state()),assets(earned.state));
 await page.getByRole('button',{name:'Ages',exact:true}).click();
 const topic=page.getByRole('article',{name:'Copper ore to usable metal',exact:true});await topic.waitFor();
 await topic.getByRole('button',{name:'Details: Copper ore to usable metal',exact:true}).click();
 assert.match(await topic.innerText(),/2 physically delivered smelting batches/);
 assert.match(await topic.innerText(),/8 ore \+ 2 charcoal; 90s base kiln work/);
 assert.equal(await topic.getByRole('button',{name:'Smelt copper ore',exact:true}).isDisabled(),true,'spent finite fuel cannot grant another batch');
 await page.getByRole('dialog').last().getByRole('button',{name:'Close',exact:true}).click();
 const actor=await page.evaluate(()=>{const e=window.__engine,g=e.game,u=g.state.units.find(u=>u.team===0&&u.farmTool==='copperTools');if(!u)throw Error('Native earned copper tool missing');g.clearSelect();g.selectEntity(u);e.pushHud();return{id:u.id,condition:u.farmToolCondition};});
 assert.ok(actor.condition>0&&actor.condition<1,'native field use must have worn actual tool');
 await page.getByRole('button',{name:'More orders',exact:true}).click();
 const inventory=page.getByRole('button',{name:'Inventory & activity',exact:true});if(await inventory.getAttribute('aria-expanded')!=='true')await inventory.click();
 await page.getByText(/Equipped · .*copper tools/).waitFor();
 report.earned={actor,smelts:2,finiteFuelGuard:true};report.passed++;

 stage='durable earned metallurgy and invalid import';await durable();const before=await state(),bad=JSON.parse(inputs[0].bytes);bad.state.tribes[0].copperMetallurgyVersion=2;
 const rejected=await page.evaluate(async data=>window.__engine.importVillage(new File([JSON.stringify(data)],'bad-version.json',{type:'application/json'})),bad);assert.equal(rejected.applied,false);assert.deepEqual(await state(),before);report.durable={restored:true,invalidVersionRejected:true};report.passed++;

 stage='untouched original53 legacy copper';const original=await load(inputs[1]);assert.equal(original.state.units.filter(u=>u.team===0&&u.hp>0).length,53);assert.deepEqual(assets(await state()),assets(original.state));await durable();
 const old=await state();assert.equal(old.tribes[0].copperMetallurgyVersion,undefined);assert.equal(old.tribes[0].copper,original.state.tribes[0].copper);assert.equal(old.tribes[0].items?.copperOre,undefined);
 await page.waitForFunction(()=>window.__engine.view.latestRenderMetrics?.calls>0,null,{timeout:30000});
 if(process.env.COPPER_QA_IMAGE)await page.screenshot({path:process.env.COPPER_QA_IMAGE});
 assert.deepEqual(errors,[]);report.legacy={population:53,copper:old.tribes[0].copper,notConverted:true};report.passed++;
}catch(e){report.failure={stage,message:e.message.slice(0,2400)};process.exitCode=1;}
finally{await context?.close();rmSync(profile,{recursive:true,force:true});report.inputFilesUnchanged=inputs.every(i=>hash(readFileSync(i.file))===i.hash);assert.ok(report.inputFilesUnchanged);report.errors=errors;console.log(JSON.stringify(report,null,2));}
