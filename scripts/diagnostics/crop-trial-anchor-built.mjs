// Public Knowledge controls in a private built copy; never operates the user's tab.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
const earned=process.argv[2]||'/tmp/hearthwild-paid-trial-relocated.json';
const legacy=process.argv[3]||'/Users/boriskizenko/Downloads/hearthwild-village--1815620580-11394.json';
const files=[earned,legacy].map(path=>({path,bytes:readFileSync(path)}));
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const f of files)f.hash=hash(f.bytes);
const profile=mkdtempSync(join(tmpdir(),'hearthwild-trial-built-'));
const report={passed:0,total:2,scope:'Built public resume of a paid/physically relocated seed trial at its original plot, plus unchanged original53 legacy village durable save. CONTROLLED finite initial household and four delivered samples on generated terrain (sample acquisition not qualified); no new trial inputs, positions, terrain, knowledge or progress granted by this probe; no campaign/performance claim.'},errors=[];
let context,stage='launch';
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000},args:['--enable-unsafe-swiftshader']});
 const page=context.pages()[0];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 await page.goto(process.env.HEARTHWILD_BUILT_URL||'http://127.0.0.1:8103/',{waitUntil:'commit'});
 await page.waitForFunction(()=>window.__engine?.game,null,{timeout:60000});
 await page.evaluate(()=>{const e=window.__engine;let last=-Infinity;e.view.renderer.setAnimationLoop(t=>{if(t-last>=160){last=t;e.frame(t);}});});
 const load=async f=>{const r=await page.evaluate(async text=>{const e=window.__engine,r=await e.importVillage(new File([text],'private-trial.json',{type:'application/json'}));e.setPaused(true);return r;},f.bytes.toString());assert.equal(r.applied,true,r.message);};
 const snapshot=()=>page.evaluate(()=>JSON.parse(JSON.stringify({...window.__engine.game.state,banner:'',bannerT:0,particles:[],floaters:[],selBld:null,placing:null,pendingAge:false},(k,v)=>k==='selected'?false:['target','node'].includes(k)&&v&&typeof v==='object'&&'kind'in v&&'id'in v?{id:v.id,kind:v.kind}:v)));
 const durable=async()=>{const save=await page.evaluate(()=>window.__engine.saveNow());assert.equal(save.saved,true,save.message);const before=await snapshot();await page.evaluate(()=>window.__engine.resumeSaved());assert.deepEqual(await snapshot(),before);};
 const openKnowledge=async()=>{const old=page.getByRole('button',{name:'Knowledge',exact:true});if(await old.count())await old.click();else await page.getByRole('button',{name:'Ages',exact:true}).click();};
 stage='actual paid trial public resume';await load(files[0]);const before=await snapshot(),trial=before.tribes[0].cropTrial;assert.ok(trial?.anchor);const samples=before.tribes[0].cropSamples[trial.kind],anchor=trial.anchor;
 assert.ok(Math.hypot(before.campSites.find(c=>c.team===0).x-anchor.x,before.campSites.find(c=>c.team===0).z-anchor.z)>=12);
 await openKnowledge();const row=page.getByRole('article',{name:'Cultivate '+trial.kind,exact:true});await row.waitFor();
 await row.getByRole('button',{name:'Resume seed trial',exact:true}).click();
 await page.waitForFunction(kind=>window.__engine.game.state.units.some(u=>u.team===0&&u.studyCrop===kind),trial.kind);
 const admitted=await snapshot();assert.equal(admitted.tribes[0].cropSamples[trial.kind],samples);assert.deepEqual(admitted.tribes[0].cropTrial.anchor,anchor);assert.equal(admitted.tribes[0].cropTrial.progress,trial.progress);await durable();
 let outcome;for(let chunk=0;chunk<24;chunk++){
  outcome=await page.evaluate(kind=>{const e=window.__engine,g=e.game;g.state.paused=false;for(let i=0;i<50&&!g.tribe(0).cultivated.includes(kind);i++)g.step(.2);g.state.paused=true;e.pushHud();return{done:g.tribe(0).cultivated.includes(kind),trial:g.tribe(0).cropTrial,evidence:g.tribe(0).cultivationEvidence?.[kind],samples:g.tribe(0).cropSamples[kind],errors:g.simulationErrors,ended:g.state.ended};},trial.kind);
  assert.deepEqual(outcome.errors,[]);assert.ok(!outcome.ended);if(outcome.done)break;
 }
 assert.equal(outcome.done,true,JSON.stringify(outcome));assert.equal(outcome.samples,samples);assert.ok(outcome.evidence?.actorIds.length>0);await durable();report.trial={kind:trial.kind,originalAnchor:anchor,publicResume:true,samePayment:true,completedEvidence:outcome.evidence};report.passed++;
 stage='original53 unchanged legacy import and durable save';await load(files[1]);const old=await snapshot();assert.equal(old.units.filter(u=>u.team===0&&u.hp>0).length,53);await durable();assert.deepEqual(await snapshot(),old);report.legacy={residents:53,strictDurable:true};report.passed++;assert.deepEqual(errors,[]);
}catch(e){report.failure={stage,message:e.message.slice(0,3000)};process.exitCode=1;}
finally{await context?.close();rmSync(profile,{recursive:true,force:true});report.inputsUnchanged=files.every(f=>hash(readFileSync(f.path))===f.hash);assert.ok(report.inputsUnchanged);report.errors=errors;console.log(JSON.stringify(report,null,2));}
