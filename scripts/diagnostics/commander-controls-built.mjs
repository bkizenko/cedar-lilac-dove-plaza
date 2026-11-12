// Only private imports and genuine owner buttons; no generated goods, practice or XP.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const hash=b=>createHash('sha256').update(b).digest('hex');
const inputs=process.argv.slice(2).map(file=>({file,bytes:readFileSync(file)}));
assert.ok(inputs.length===2||inputs.length===3,'Pass earned commander export, untouched original53, and optional genuinely earned pre-promotion export');
for(const i of inputs)i.hash=hash(i.bytes);
const profile=mkdtempSync(join(tmpdir(),'hearthwild-commanders-built-')),errors=[];
const report={passed:0,total:inputs.length===3?4:3,scope:'Actual earned native commander readout; real release/reassign and durable save; original53 pure reads and paid first appointment only if actually eligible. No invented XP/goods, campaign, performance or full-gate credit.'};
let context,stage='launch';
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000},args:['--enable-unsafe-swiftshader']});
 const page=context.pages()[0];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 await page.goto(process.env.HEARTHWILD_BUILT_URL||'http://127.0.0.1:8103/',{waitUntil:'commit'});
 await page.waitForFunction(()=>window.__engine?.game,null,{timeout:60000});
 const load=async input=>{const data=JSON.parse(input.bytes);data.state.paused=true;const r=await page.evaluate(async data=>window.__engine.importVillage(new File([JSON.stringify(data)],'private-village.json',{type:'application/json'})),data);assert.equal(r.applied,true,r.message);return data;};
 const snapshot=()=>page.evaluate(()=>{const s=window.__engine.game.state;return JSON.parse(JSON.stringify({seed:s.seed,time:s.time,commanders:s.commanders,tribes:s.tribes,units:s.units.map(({selected,target,node,...u})=>u),buildings:s.buildings,boats:s.boats}));});
 const select=async ids=>page.evaluate(ids=>{const e=window.__engine,g=e.game;g.clearSelect();for(const id of ids){const u=g.state.units.find(u=>u.id===id&&u.team===0);if(!u)throw Error('Missing actual owned selected person');u.selected=true;}e.pushHud();},ids);
 // section has an accessible name but no explicit role, so use its actual label.
 const panel=page.locator('section[aria-label="Commanders"]');
 const open=async()=>{const more=page.getByRole('button',{name:'More orders',exact:true});if(await more.count())await more.click();const command=page.getByRole('button',{name:'Command',exact:true});await command.waitFor();if(await command.getAttribute('aria-expanded')!=='true')await command.click();await panel.waitFor();await panel.getByText(/commands · Standards cost/).waitFor();};
 const durable=async()=>{const r=await page.evaluate(()=>window.__engine.saveNow());assert.equal(r.saved,true,r.message);const before=await snapshot();await page.evaluate(()=>window.__engine.resumeSaved());assert.deepEqual(await snapshot(),before);};

 stage='earned native commander readout via actual More orders';const earned=await load(inputs[0]);
 const native=earned.state.commanders.roster.find(c=>c.team===0&&c.status==='serving'&&c.promotions.includes('drill'));
 assert.ok(native&&native.level>=2&&native.xp>=40&&native.memberIds.length,'Expected actual paid-drill earned native commander');
 await select([native.unitId,native.memberIds[0]]);const before=await snapshot();await open();
 await panel.getByText(/Rank 2 · XP/).waitFor();await panel.getByText(/Drillmaster/).waitFor();
 assert.match(await panel.innerText(),/within \d+ m/);assert.deepEqual(await snapshot(),before,'Opening commander readout is pure');
 report.earned={commanderId:native.id,personId:native.unitId,xp:native.xp,rank:native.level,promotions:native.promotions};report.passed++;

 stage='real release and reassignment keep earned XP; save and reload';const member=native.memberIds[0];
 await panel.getByRole('button',{name:'Release selected (1)',exact:true}).click();
 await page.waitForFunction(({id,member})=>!window.__engine.game.state.commanders.roster.find(c=>c.id===id).memberIds.includes(member),{id:native.id,member});
 const assign=panel.getByRole('button',{name:'Assign selected (1)',exact:true});await assign.waitFor();await assign.click();
 await page.waitForFunction(({id,member})=>window.__engine.game.state.commanders.roster.find(c=>c.id===id).memberIds.includes(member),{id:native.id,member});
 const after=await snapshot();assert.deepEqual(after.commanders,before.commanders);assert.deepEqual(after.tribes,before.tribes);await durable();
 await select([native.unitId]);await open();await panel.getByText(/Drillmaster/).waitFor();
 report.membership={releasedAndReassigned:member,xpUnchanged:true,durable:true};report.passed++;

 if(inputs[2]){
  stage='actual earned promotion selection';const pre=await load(inputs[2]),c=pre.state.commanders.roster.find(c=>c.team===0&&c.promotionPoints>0&&!c.promotions.includes('drill'));assert.ok(c&&c.level>=2&&c.xp>=40);await select([c.unitId]);await open();await panel.getByRole('combobox',{name:'Earned commander promotion',exact:true}).selectOption('drill');await page.waitForFunction(id=>window.__engine.game.state.commanders.roster.find(c=>c.id===id).promotions.includes('drill'),c.id);const promoted=(await snapshot()).commanders.roster.find(p=>p.id===c.id);assert.equal(promoted.xp,c.xp);assert.equal(promoted.promotionPoints,c.promotionPoints-1);await panel.getByText(/Drillmaster/).waitFor();await durable();report.promotion={commanderId:c.id,xp:c.xp,realEarnedPointSpent:true};report.passed++;
 }

 stage='original53 pure commander reads and actual paid adoption when admitted';const original=await load(inputs[1]);assert.equal(original.state.units.filter(u=>u.team===0&&u.hp>0).length,53);
 const legacyBefore=await snapshot();
 const eligible=await page.evaluate(async()=>{const e=window.__engine;for(const u of e.game.state.units.filter(u=>u.team===0&&u.hp>0)){const r=await e.readModel({kind:'commander-controls',unitIds:[u.id],boatIds:[]});if(r.model.candidate&&!r.model.candidate.armyIssue)return u.id;}return null;});
 assert.deepEqual(await snapshot(),legacyBefore,'Querying actual owner availability must not enable or alter the original village');
 const chosen=eligible??original.state.units.find(u=>u.team===0&&u.hp>0).id;await select([chosen]);await open();assert.deepEqual(await snapshot(),legacyBefore,'Opening legacy controls is pure');
 const appointment=panel.getByRole('button',{name:/^(Organize field command|Appoint field commander) · 6 timber$/});
 if(eligible!==null){assert.equal(await appointment.isEnabled(),true);await appointment.click();await page.waitForFunction(id=>window.__engine.game.state.commanders?.roster.some(c=>c.unitId===id&&c.team===0),eligible);const next=await snapshot(),c=next.commanders.roster.find(c=>c.unitId===eligible&&c.team===0);assert.equal(next.tribes[0].wood,legacyBefore.tribes[0].wood-6);assert.equal(c.xp,0);assert.deepEqual(c.memberIds,[]);assert.deepEqual(c.promotions,[]);report.legacy={population:53,pureRead:true,paidAppointment:eligible,woodDebit:6};}
 else{assert.equal(await appointment.isDisabled(),true);report.legacy={population:53,pureRead:true,paidAppointment:null,reason:await appointment.getAttribute('title')};}
 await durable();assert.deepEqual(errors,[]);report.passed++;
}catch(e){report.failure={stage,message:e.message.slice(0,2400)};process.exitCode=1;}
finally{await context?.close();rmSync(profile,{recursive:true,force:true});report.inputFilesUnchanged=inputs.every(i=>hash(readFileSync(i.file))===i.hash);assert.ok(report.inputFilesUnchanged);report.errors=errors;console.log(JSON.stringify(report,null,2));}
