import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {rolldown} from 'rolldown';
import ts from 'typescript';
import {chromium} from 'playwright';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {decodeGame} from '../src/game/persistence.ts';
import {applyEngineReadQuery} from '../src/game/engineReadModels.ts';
import {applyEngineCommand} from '../src/game/engineDispatch.ts';
import {armorCombatDamage,wornArmor} from '../src/game/armor.ts';
import {supplyDrops} from '../src/game/campAnchor.ts';

// One actual ReactDOM browser, with explicit deferred transport acknowledgements.
// Native eligibility and command admission run on the separate Node owner Game.
// This is a UI/transport contract test, not actual Worker, WebGL or campaign proof.
const entry=`
import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ProductionControls} from '${fileURLToPath(new URL('../src/ui/ProductionControls.tsx',import.meta.url)).replaceAll('\\','/')}';
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
window.__startProductionUi=state=>{
 let display=freeze(state),reads=[],commands=[],hud=0,focus=0;
 const root=createRoot(document.getElementById('root'));
 const game=new Proxy({get state(){return display;},world:{size:1040,camps:[]},selectedBoat:null,selectedUnits(){return display.units.filter(u=>u.team===0&&u.hp>0&&u.selected);},tribe(team){return display.tribes.find(t=>t.id===team);},finished(b){return b.hp>0&&b.build>=1;}},{get(target,key){if(!(key in target))throw Error('Undeclared Game query on display: '+String(key));return Reflect.get(target,key);}});
 const engine={game,dispatchEpoch:1,disposed:false,canvas:{focus(){focus++;}},pushHud(){hud++;},readModel(query){return new Promise((resolve,reject)=>reads.push({query:structuredClone(query),epoch:engine.dispatchEpoch,resolve,reject}));},dispatch(command,selection){return new Promise((resolve,reject)=>commands.push({command:structuredClone(command),selection:structuredClone(selection),epoch:engine.dispatchEpoch,resolve,reject}));}};
 const render=()=>flushSync(()=>root.render(React.createElement(ProductionControls,{engine})));
 const api={render,engine,get reads(){return reads.map((r,i)=>({index:i,query:r.query,epoch:r.epoch,done:r.done||false}));},get commands(){return commands.map((r,i)=>({index:i,command:r.command,selection:r.selection,epoch:r.epoch,done:r.done||false}));},get counters(){return{hud,focus};},get state(){return display;},resolveRead(index,model){const r=reads[index];r.done=true;r.resolve({model,epoch:r.epoch,requestId:index+1,stateRevision:index,navigationRevision:1,cpuMilliseconds:0});},rejectRead(index){const r=reads[index];r.done=true;r.reject(Error('Owner query temporarily unavailable'));},resolveCommand(index,result){const r=commands[index];r.done=true;r.resolve({...result,epoch:r.epoch,sequence:index+1,stateRevision:index+1});},replaceDisplay(state){display=freeze(state);render();},newSession(){engine.dispatchEpoch++;render();},unmount(){engine.disposed=true;flushSync(()=>root.unmount());}};
 window.__productionUi=api;render();return true;
};
`;
async function uiBundle(){
 const bundle=await rolldown({input:'\0production-ui-contract',platform:'browser',define:{'process.env.NODE_ENV':'"development"'},resolve:{extensions:['.tsx','.ts','.js','.mjs','.json'],alias:{'@':resolve('src')}},plugins:[{name:'production-ui-contract',resolveId(id){if(id==='\0production-ui-contract')return id;},load(id){if(id==='\0production-ui-contract')return entry;},transform(code,id){if(!id.includes('node_modules')&&/\.tsx?$/.test(id))return{code:ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText};}}]});
 try{const built=await bundle.generate({format:'iife',inlineDynamicImports:true});return built.output.filter(o=>o.type==='chunk').map(o=>o.code).join('\n');}finally{await bundle.close();}
}
const clone=value=>JSON.parse(JSON.stringify(value));
test('actual React production controls fail closed on pending or missing owner facts, await native acknowledgements and ignore old-session replies',{timeout:60000},async()=>{
 const f=nativeDairyVillage(),owner=decodeGame(f.save);owner.enterIsland();owner.clearSelect();owner.state.selBld=owner.state.buildings.find(b=>b.id===f.hearth);
 const query={kind:'recipe-issues',workplaceId:f.hearth},ready=applyEngineReadQuery(owner,query);
 assert.equal(ready.issues.find(r=>r.recipe==='fermentMilk')?.issue,null,'native owner finds an actual available maker without a selected adult');
 assert.equal(owner.selectedUnits().length,0);
 const initial=clone(owner.state),initialBytes=JSON.stringify(initial),source=await uiBundle();
 let browser,context;const errors=[];
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><div id="root"></div>');await page.addScriptTag({content:source});await page.evaluate(state=>window.__startProductionUi(state),initial);
  const button=page.getByRole('button',{name:'Ferment milk in a vessel',exact:true});
  await page.waitForFunction(()=>window.__productionUi.reads.length>=1);assert.equal(await button.isDisabled(),true);assert.equal(await page.getByRole('status').count(),0);
  assert.deepEqual(await page.evaluate(()=>window.__productionUi.commands),[]);
  const missing={kind:'recipe-issues',workplaceId:f.hearth,issues:[]};await page.evaluate(model=>window.__productionUi.resolveRead(0,model),missing);
  await page.waitForFunction(()=>document.body.textContent.includes('Actual recipe availability is unavailable'));assert.equal(await button.isDisabled(),true);
  await page.waitForFunction(()=>window.__productionUi.reads.length>=2);await page.evaluate(()=>window.__productionUi.rejectRead(1));
  await page.waitForFunction(()=>document.body.textContent.includes('Owner query temporarily unavailable'));assert.equal(await button.isDisabled(),true);
  await page.waitForFunction(()=>window.__productionUi.reads.length>=3);await page.evaluate(model=>window.__productionUi.resolveRead(2,model),ready);await button.waitFor();await page.waitForFunction(()=>!document.querySelector('[aria-label="Ferment milk in a vessel"] button').disabled);
  await button.click();await page.waitForFunction(()=>window.__productionUi.commands.length===1);
  const first=await page.evaluate(()=>window.__productionUi.commands[0]);assert.deepEqual(first.command,{kind:'begin-production',recipe:'fermentMilk',workplaceId:f.hearth});assert.deepEqual(first.selection.selectedUnitIds,[]);assert.ok(!('unitId'in first.command));
  assert.deepEqual(await page.evaluate(()=>window.__productionUi.counters),{hud:0,focus:0});assert.equal(await page.getByRole('status').count(),0,'sending is not accepted feedback');
  const paid=applyEngineCommand(owner,first.command,first.selection);assert.equal(paid.accepted,true,paid.reason);assert.ok(paid.projectId);assert.equal(owner.tribe(0).foodLots.milk,0);assert.equal(owner.tribe(0).items.pottery,0);
  await page.evaluate(result=>window.__productionUi.resolveCommand(0,result),paid);await page.getByRole('status').getByText(paid.reason,{exact:true}).waitFor();assert.deepEqual(await page.evaluate(()=>window.__productionUi.counters),{hud:1,focus:1});
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__productionUi.state)),initialBytes,'read-only display never debits inventory or runs native admission');
  await page.evaluate(state=>window.__productionUi.replaceDisplay(state),clone(owner.state));
  const pause=page.getByRole('button',{name:'Pause paid work',exact:true});await pause.click();await page.waitForFunction(()=>window.__productionUi.commands.length===2);
  const second=await page.evaluate(()=>window.__productionUi.commands[1]);assert.equal(second.command.kind,'craft-site-control');assert.equal(second.command.projectId,paid.projectId);assert.equal(second.command.buildingId,f.hearth);assert.equal(second.command.action,'pause');assert.ok(Number.isSafeInteger(second.command.actorId));
  const paused=applyEngineCommand(owner,second.command,second.selection);assert.equal(paused.accepted,true,paused.reason);assert.equal(owner.state.production.projects.find(p=>p.id===paid.projectId).phase,'paused');
  await page.waitForFunction(()=>window.__productionUi.reads.some(r=>!r.done&&r.epoch===1));const beforeStale=await page.evaluate(()=>window.__productionUi.counters);await page.evaluate(()=>window.__productionUi.newSession());await page.evaluate(result=>window.__productionUi.resolveCommand(1,result),paused);
  await page.waitForTimeout(30);assert.deepEqual(await page.evaluate(()=>window.__productionUi.counters),beforeStale,'old epoch acknowledgement causes no HUD/focus update');assert.equal(await page.getByRole('status').getByText(paused.reason,{exact:true}).count(),0,'old-session reason is ignored');
  const reads=await page.evaluate(()=>window.__productionUi.reads),old=reads.find(r=>!r.done&&r.epoch===1);assert.ok(old,'an original owner request remains deferred');await page.evaluate(({index,model})=>window.__productionUi.resolveRead(index,model),{index:old.index,model:ready});
  assert.equal(await button.isDisabled(),true,'old-session permissive facts cannot enable the current recipe');
  await page.waitForFunction(()=>window.__productionUi.reads.some(r=>!r.done&&r.epoch===2));const current=await page.evaluate(()=>window.__productionUi.reads.find(r=>!r.done&&r.epoch===2));const blocked=applyEngineReadQuery(owner,query);assert.ok(blocked.issues.find(r=>r.recipe==='fermentMilk').issue);
  await page.evaluate(({index,model})=>window.__productionUi.resolveRead(index,model),{index:current.index,model:blocked});await page.waitForFunction(()=>!document.body.textContent.includes('Checking actual availability'));assert.equal(await button.isDisabled(),true,'current actual paid inventory has no vessel or milk for another batch');
  assert.equal(owner.state.production.projects.length,1);assert.equal(owner.state.production.metrics.foodInputsUsed.milk,4);assert.equal(owner.state.production.metrics.consumed.pottery,1);assert.deepEqual(errors,[]);
  await page.evaluate(()=>window.__productionUi.unmount());
  console.log(JSON.stringify({scope:'Actual ReactDOM in isolated headless Chromium, deferred transport; native query/admission on separate actual nativeV18 Game. Full-vision authored dairy opening; no Worker execution/WebGL/campaign credit.',passed:1,total:1,recipeMakerUnselected:true,actualPaidOnce:true,missingAndErrorFactsFailClosed:true,ackBeforeFeedback:true,oldEpochAckAndQueryIgnored:true,errors}));
 }finally{await context?.close();await browser?.close();}
});

test('actual React armor controls wait for owner facts, equip one real local asset, show wear and put away without mutating the projection',{timeout:60000},async()=>{
 const f=nativeDairyVillage(),owner=decodeGame(f.save),u=owner.state.units.find(u=>u.id===f.worker),drop=supplyDrops(owner,0).find(d=>d.kind==='camp');
 assert.ok(drop);owner.clearSelect();u.selected=true;owner.state.selBld=null;
 // One finite authored armor asset at the actual native cache; this checks UI/custody, not earned crafting.
 const asset={id:owner.id(),team:0,kind:'paddedTorso',condition:1,projectId:owner.id(),createdAt:owner.state.time,holder:{kind:'cache',x:drop.x,z:drop.z}};
 owner.state.armor={version:1,assets:[asset],metrics:{crafted:1,damagePrevented:0}};
 const query={kind:'armor-choice',unitId:u.id},ready=applyEngineReadQuery(owner,query);assert.equal(ready.availableArmorId,asset.id);
 const source=await uiBundle(),initial=clone(owner.state),bytes=JSON.stringify(initial),errors=[];let browser,context;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setContent('<!doctype html><div id="root"></div>');await page.addScriptTag({content:source});await page.evaluate(state=>window.__startProductionUi(state),initial);
  await page.waitForFunction(()=>window.__productionUi.reads.length>0);assert.equal(await page.getByRole('button',{name:/^Equip/}).count(),0,'pending owner facts never imply permission');
  await page.evaluate(model=>window.__productionUi.resolveRead(0,model),ready);await page.getByRole('button',{name:'Equip · 100%',exact:true}).click();await page.waitForFunction(()=>window.__productionUi.commands.length===1);
  const first=await page.evaluate(()=>window.__productionUi.commands[0]);assert.deepEqual(first.command,{kind:'equip-armor',unitId:u.id,armorId:asset.id});const equipped=applyEngineCommand(owner,first.command,first.selection);assert.equal(equipped.accepted,true,equipped.reason);assert.equal(wornArmor(owner,u).id,asset.id);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__productionUi.state)),bytes,'display never equips or debits by itself');
  armorCombatDamage(owner,u,25);assert.equal(asset.condition,.9);await page.evaluate(result=>window.__productionUi.resolveCommand(0,result),equipped);await page.evaluate(state=>window.__productionUi.replaceDisplay(state),clone(owner.state));
  await page.waitForFunction(()=>window.__productionUi.reads.some(r=>!r.done));const read=await page.evaluate(()=>window.__productionUi.reads.find(r=>!r.done));await page.evaluate(({index,model})=>window.__productionUi.resolveRead(index,model),{index:read.index,model:applyEngineReadQuery(owner,query)});
  const progress=page.getByRole('progressbar',{name:'Armor condition',exact:true});await progress.waitFor();assert.equal(await progress.getAttribute('value'),'0.9');assert.ok((await page.locator('[aria-label="Armor"]').innerText()).includes('90%'));
  await page.getByRole('button',{name:'Put away',exact:true}).click();await page.waitForFunction(()=>window.__productionUi.commands.length===2);const next=await page.evaluate(()=>window.__productionUi.commands[1]);assert.equal(next.command.kind,'unequip-armor');const stored=applyEngineCommand(owner,next.command,next.selection);assert.equal(stored.accepted,true,stored.reason);assert.equal(wornArmor(owner,u),undefined);assert.equal(asset.holder.kind,'cache');assert.equal(asset.condition,.9);assert.equal(owner.state.armor.assets.length,1);assert.deepEqual(errors,[]);await page.evaluate(()=>window.__productionUi.unmount());
 }finally{await context?.close();await browser?.close();}
});
