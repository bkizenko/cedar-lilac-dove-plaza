import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Game} from '../src/game/sim.ts';
import{applyEngineReadQuery}from'../src/game/engineReadModels.ts';
import{applyEngineCommand}from'../src/game/engineDispatch.ts';
import{reserveSitePreparation,sitePreparationSurvey}from'../src/game/sitePreparation.ts';
import{buildingCost}from'../src/game/construction.ts';
import{fileURLToPath}from'node:url';
import{resolve}from'node:path';
import{rolldown}from'rolldown';
import{chromium}from'playwright';
const source=new URL('../src/ui/ConstructionQueueControls.tsx',import.meta.url);
// Transpile the actual component in memory; never replace its imports with mocks
// or write generated files into the application's source tree.
const hook=registerHooks({load(url,context,next){if(url===source.href)return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText};return next(url,context);}});
after(()=>hook.deregister());
const {ConstructionSiteControls,BuilderQueueControls}=await import(source.href);
function fixture(){
 const g=new Game();g.reset(345,2);g.enterIsland();g.clearSelect();const home=g.campOf(0),u=g.state.units.find(u=>u.team===0&&u.type==='worker');
 const sites=['hut','gate','farm','warehouse'].map((type,i)=>g.makeBld(type,home.x+20+i*12,home.z,0));sites[0].build=.25;sites[1].build=.1;for(const b of sites.slice(2)){b.build=0;b.plannedCost={food:0,wood:100000,stone:0,copper:0,iron:0};}sites[2].planPaused=true;
 g.state.buildings.push(...sites);u.selected=true;u.buildOrder=sites[0].id;u.order='build';u.node=sites[0];u.constructionQueue={sites:sites.map(b=>b.id)};
 const engine={game:g,dispatchEpoch:1,pushHud(){assert.fail('static rendering must not dispatch a UI update');}};return{g,u,sites,engine};
}
function renderWithoutMutation(Component,props,g){const before=JSON.stringify(g.state),html=renderToStaticMarkup(React.createElement(Component,props));assert.equal(JSON.stringify(g.state),before,'rendering must preserve orders, stores, paid progress and pending intent');return html;}
test('actual site control renders High/Normal/Low, selected priority, queue action and modifier instructions without mutation',()=>{
 const{g,sites,engine}=fixture();for(const[priority,label]of [[2,'High'],[1,'Normal'],[0,'Low']]){sites[0].constructionPriority=priority;const html=renderWithoutMutation(ConstructionSiteControls,{engine,buildingId:sites[0].id},g);assert.match(html,/Construction priority/);for(const option of ['High','Normal','Low'])assert.ok(html.includes(`>${option}</option>`));assert.ok(html.includes(`<option value="${priority}" selected="">${label}</option>`));assert.match(html,/Queue for nearest builders/);assert.match(html,/Shift-right-click sites to queue several/);}
});
test('actual builder panel shows current, queued, paused and material-waiting states with real edit actions',()=>{
 const{g,u,sites,engine}=fixture();let html=renderWithoutMutation(BuilderQueueControls,{engine},g);assert.match(html,/Builder queues/);assert.match(html,/Hut · current/);assert.match(html,/Timber gate · queued/);assert.match(html,/Farm · paused/);assert.match(html,/Checking actual availability/);const ownerStatus=applyEngineReadQuery(g,{kind:'construction-status',buildingIds:[sites[3].id]});assert.ok(ownerStatus.statuses[0].status.includes(`Waiting for ${Math.max(0,Math.ceil(100000-g.tribe(0).wood))} logs`),'native owner retains exact material-waiting status; SSR never runs foundation checks on the display');assert.match(html,/>Pause queue</);assert.match(html,/aria-label="up Hut" disabled=""/);assert.match(html,/aria-label="down Storehouse" disabled=""/);assert.match(html,/>Remove</);assert.match(html,/aria-label="up Timber gate"/);
 u.constructionQueue.paused=true;html=renderWithoutMutation(BuilderQueueControls,{engine},g);assert.match(html,/· paused/);assert.match(html,/>Resume queue</);assert.doesNotMatch(html,/>Pause queue</);assert.deepEqual(u.constructionQueue.sites,sites.map(b=>b.id));
});
test('empty builder selections and foreign or completed sites are hidden; a real pending extension remains actionable',()=>{
 const{g,u,sites,engine}=fixture();u.constructionQueue=undefined;assert.equal(renderWithoutMutation(BuilderQueueControls,{engine},g),'');u.constructionQueue={sites:[sites[0].id]};u.selected=false;assert.equal(renderWithoutMutation(BuilderQueueControls,{engine},g),'');
 sites[0].team=1;assert.equal(renderWithoutMutation(ConstructionSiteControls,{engine,buildingId:sites[0].id},g),'');sites[0].team=0;sites[0].build=1;assert.equal(renderWithoutMutation(ConstructionSiteControls,{engine,buildingId:sites[0].id},g),'');assert.equal(renderWithoutMutation(ConstructionSiteControls,{engine,buildingId:g.state.nextId+1000},g),'');
 const store=sites[3];store.build=1;store.plannedCost=undefined;store.expansion={w:store.w*2,d:store.d,progress:.1,paid:true};const html=renderWithoutMutation(ConstructionSiteControls,{engine,buildingId:store.id},g);assert.match(html,/Queue for nearest builders/);assert.match(html,/>Build now</);
});

// One real ReactDOM browser and the existing controlled queue fixture. Owner
// queries/admission use the actual native Game; display methods stay read-only.
const constructionUiEntry=`
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{ConstructionSiteControls,BuilderQueueControls}from'${fileURLToPath(source).replaceAll('\\','/')}';
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const child of Object.values(v))freeze(child);}return v;};
window.__startConstructionUi=(state,site,prepared)=>{
 let display=freeze(state),reads=[],commands=[],hud=0;const root=createRoot(document.getElementById('root'));
 const game=new Proxy({get state(){return display;},selectedBoat:null,selectedUnits(){return display.units.filter(u=>u.selected&&u.team===0&&u.hp>0);},tribe(id){return display.tribes.find(t=>t.id===id);},finished(b){return b.hp>0&&b.build>=1;}},{get(target,key){if(!(key in target))throw Error('Unsafe display Game query: '+String(key));return Reflect.get(target,key);}});
 const engine={game,dispatchEpoch:1,disposed:false,pushHud(){hud++;},readModel(query){return new Promise((resolve,reject)=>reads.push({query:structuredClone(query),epoch:engine.dispatchEpoch,resolve,reject}));},dispatch(command,selection){return new Promise(resolve=>commands.push({command:structuredClone(command),selection:structuredClone(selection),epoch:engine.dispatchEpoch,resolve}));}};
 const render=()=>flushSync(()=>root.render(React.createElement(React.Fragment,null,React.createElement('section',{id:'main-site'},React.createElement(ConstructionSiteControls,{engine,buildingId:site})),React.createElement('section',{id:'clearing-site'},React.createElement(ConstructionSiteControls,{engine,buildingId:prepared})),React.createElement(BuilderQueueControls,{engine}))));
 window.__constructionUi={render,get reads(){return reads.map((r,i)=>({index:i,query:r.query,epoch:r.epoch,done:r.done||false}));},get commands(){return commands.map((r,i)=>({index:i,command:r.command,selection:r.selection,epoch:r.epoch,done:r.done||false}));},get hud(){return hud;},get state(){return display;},resolveRead(index,model){const r=reads[index];r.done=true;r.resolve({model,epoch:r.epoch,requestId:index+1,stateRevision:1,navigationRevision:1,cpuMilliseconds:0});},resolveCommand(index,result){const r=commands[index];r.done=true;r.resolve({...result,epoch:r.epoch,sequence:index+1,stateRevision:index+1});},replace(state){display=freeze(state);render();},newSession(){engine.dispatchEpoch++;render();},unmount(){engine.disposed=true;flushSync(()=>root.unmount());}};render();
};`;
async function constructionUiBundle(){
 const bundle=await rolldown({input:'\0construction-ui-contract',platform:'browser',resolve:{extensions:['.tsx','.ts','.js','.mjs','.json'],alias:{'@':resolve('src')}},plugins:[{name:'construction-ui-contract',resolveId(id){if(id==='\0construction-ui-contract')return id;},load(id){if(id==='\0construction-ui-contract')return constructionUiEntry;},transform(code,id){if(!id.includes('node_modules')&&/\.tsx?$/.test(id))return{code:ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText};}}]});
 try{const result=await bundle.generate({format:'iife',codeSplitting:false});return result.output.filter(f=>f.type==='chunk').map(f=>f.code).join('\n');}finally{await bundle.close();}
}
const queueClone=v=>JSON.parse(JSON.stringify(v));
test('actual React construction controls await native stable-ID commands, preserve paid queues and reject stale session results',{timeout:60000},async()=>{
 const{g,u,sites}=fixture(),stock=g.tribe(0).wood,progress=sites.map(b=>b.build);
 // An actual finite observed resource receipt supplies the clearing controls.
 let prepared;for(const n of g.state.trees){if(!n.amount||!g.exploredAt(n.x,n.z))continue;const b=g.makeBld('hut',n.x,n.z,0);b.plannedCost=buildingCost('hut',g);const survey=sitePreparationSurvey(g,b);if(survey.issue||!survey.clearable.length)continue;if(reserveSitePreparation(g,b,'unpaid')){prepared=b;g.state.buildings.push(b);break;}}
 assert.ok(prepared,'a real recorded clearing source is available in this controlled fixture');
 const before=JSON.stringify(g.state),code=await constructionUiBundle();let browser,context;const errors=[];
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setContent('<!doctype html><div id="root"></div>');await page.addScriptTag({content:code});await page.evaluate(({state,site,prepared})=>window.__startConstructionUi(state,site,prepared),{state:queueClone(g.state),site:sites[0].id,prepared:prepared.id});
  await page.waitForFunction(()=>window.__constructionUi.reads.length>0);assert.match(await page.locator('body').innerText(),/Checking actual availability/);assert.equal(await page.evaluate(()=>window.__constructionUi.hud),0);
  const request=await page.evaluate(()=>window.__constructionUi.reads[0]);const statuses=applyEngineReadQuery(g,request.query);await page.evaluate(({index,model})=>window.__constructionUi.resolveRead(index,model),{index:request.index,model:statuses});await page.getByText(`Waiting for ${Math.max(0,Math.ceil(100000-stock))} logs`,{exact:false}).waitFor();assert.equal(JSON.stringify(g.state),before,'owner status queries preserve stores/progress/queue intent');
  const acknowledge=async(index,expected)=>{await page.waitForFunction(n=>window.__constructionUi.commands.length>n,index);const request=await page.evaluate(n=>window.__constructionUi.commands[n],index);assert.deepEqual(request.command,expected);const oldHud=await page.evaluate(()=>window.__constructionUi.hud),result=applyEngineCommand(g,request.command,request.selection);assert.equal(result.accepted,true,result.reason);assert.equal(await page.evaluate(()=>window.__constructionUi.hud),oldHud);await page.evaluate(({index,result})=>window.__constructionUi.resolveCommand(index,result),{index,result});await page.waitForFunction(n=>window.__constructionUi.hud===n,oldHud+1);await page.evaluate(state=>window.__constructionUi.replace(state),queueClone(g.state));return request;};
  await page.locator('#main-site').getByRole('combobox',{name:'Construction priority'}).selectOption('2');await page.waitForFunction(()=>window.__constructionUi.commands.length===1);assert.equal(sites[0].constructionPriority,undefined,'main UI does not optimistically write owner priority');await acknowledge(0,{kind:'construction-priority',buildingId:sites[0].id,priority:2});assert.equal(sites[0].constructionPriority,2);
  await page.locator('#main-site').getByRole('button',{name:'Queue for nearest builders',exact:true}).click();const queued=await acknowledge(1,{kind:'queue-construction',buildingId:sites[0].id});assert.deepEqual(queued.selection.selectedUnitIds,[u.id]);assert.deepEqual(u.constructionQueue.sites,sites.map(b=>b.id));
  await page.getByRole('button',{name:'up Timber gate',exact:true}).click();await acknowledge(2,{kind:'construction-queue-control',unitId:u.id,siteId:sites[1].id,action:'up'});assert.deepEqual(u.constructionQueue.sites,[sites[1].id,sites[0].id,sites[2].id,sites[3].id]);
  await page.getByRole('button',{name:'Pause queue',exact:true}).click();await acknowledge(3,{kind:'construction-queue-control',unitId:u.id,action:'pause'});assert.equal(u.constructionQueue.paused,true);assert.deepEqual(sites.map(b=>b.build),progress);assert.equal(g.tribe(0).wood,stock);
  await page.getByRole('button',{name:'Resume queue',exact:true}).click();await acknowledge(4,{kind:'construction-queue-control',unitId:u.id,action:'resume'});assert.equal(u.constructionQueue.paused,undefined);
  await page.locator('#clearing-site').getByRole('button',{name:'Pause',exact:true}).click();await acknowledge(5,{kind:'site-preparation-pause',buildingId:prepared.id,paused:true});assert.equal(prepared.sitePreparation.paused,true);
  await page.locator('#clearing-site').getByRole('button',{name:'Resume',exact:true}).click();await acknowledge(6,{kind:'site-preparation-pause',buildingId:prepared.id,paused:false});assert.equal(prepared.sitePreparation.paused,undefined);
  await page.getByRole('button',{name:'remove Timber gate',exact:true}).click();await acknowledge(7,{kind:'construction-queue-control',unitId:u.id,siteId:sites[1].id,action:'remove'});assert.equal(u.constructionQueue.sites.includes(sites[1].id),false);assert.equal(sites[1].build,progress[1]);
  await page.getByRole('button',{name:'Pause queue',exact:true}).click();await page.waitForFunction(()=>window.__constructionUi.commands.length===9);const stale=await page.evaluate(()=>window.__constructionUi.commands[8]),result=applyEngineCommand(g,stale.command,stale.selection);assert.equal(result.accepted,true);const hud=await page.evaluate(()=>window.__constructionUi.hud);await page.evaluate(()=>window.__constructionUi.newSession());await page.evaluate(result=>window.__constructionUi.resolveCommand(8,result),result);await page.waitForTimeout(30);assert.equal(await page.evaluate(()=>window.__constructionUi.hud),hud,'old-session acknowledgement does not refresh the replacement session');
  assert.deepEqual(sites.map(b=>b.build),progress);assert.equal(g.tribe(0).wood,stock);assert.ok(prepared.sitePreparation.resources.every(ref=>g.state.trees.some(n=>n.id===ref.id&&n.amount>0)||g.state.stones.some(n=>n.id===ref.id&&n.amount>0)||g.state.forage.some(n=>n.id===ref.id&&n.amount>0)),'no UI command creates free clearing');assert.deepEqual(errors,[]);await page.evaluate(()=>window.__constructionUi.unmount());
 }finally{await context?.close();await browser?.close();}
});
