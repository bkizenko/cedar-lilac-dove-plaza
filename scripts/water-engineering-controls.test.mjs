import test,{after}from'node:test';
import assert from'node:assert/strict';
import{registerHooks}from'node:module';
import{readFileSync,existsSync}from'node:fs';
import{fileURLToPath}from'node:url';
import{resolve}from'node:path';
import{rolldown}from'rolldown';
import{chromium}from'playwright';
import ts from'typescript';
import React from'react';
import{renderToStaticMarkup}from'react-dom/server';
import{Game}from'../src/game/sim.ts';
import{nearestFreshWater}from'../src/game/waterWorks.ts';
import{planAqueductWorks}from'../src/game/waterLineWorks.ts';
const hook=registerHooks({resolve(specifier,context,next){const target=specifier.startsWith('@/')?new URL('../src/'+specifier.slice(2),import.meta.url).href:specifier;try{return next(target,context);}catch(error){if(target.startsWith('.')||target.startsWith('file:'))for(const suffix of['.ts','.tsx']){const url=new URL(target+suffix,context.parentURL);if(existsSync(url))return next(url.href,context);}throw error;}},load(url,context,next){if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText};return next(url,context);}});
after(()=>hook.deregister());
const{WaterEngineeringControls}=await import('../src/ui/WaterEngineeringControls.tsx');
function render(status){const before=JSON.stringify(status),engine={waterEngineeringStatus:()=>status,beginWaterEngineering(){assert.fail('Rendering cannot choose world points');},cancelWaterEngineering(){assert.fail('Rendering cannot cancel work');},commitWaterEngineering(){assert.fail('Rendering cannot commission work');}},html=renderToStaticMarkup(React.createElement(WaterEngineeringControls,{engine}));assert.equal(JSON.stringify(status),before);return html;}
const commitButton=html=>html.match(/<button[^>]*>Lay out works<\/button>/)?.[0];
test('waterworks controls expose compact modes and keep commissioning disabled before an actual preview',()=>{
 const html=render(Object.freeze({kind:null,source:null,issue:null,summary:'Choose a canal or aqueduct, then select two world points.',canCommit:false}));assert.match(html,/>Canal<\/button>/);assert.match(html,/>Aqueduct<\/button>/);assert.match(html,/>Cancel<\/button>/);assert.match(commitButton(html),/disabled=""/);assert.doesNotMatch(html,/<details/);assert.match(html,/select two world points/);
});
test('the exact native blocker remains inspectable and overrides a stale permissive commit flag',()=>{
 const issue='The source and destination have no connected observed route',html=render({kind:'canal',source:{x:8,z:12},issue,summary:'Choose another destination.',canCommit:true});assert.match(commitButton(html),/disabled=""/);assert.ok(html.includes(`data-tooltip-description="${issue}"`));assert.match(html,/<summary>Plan details<\/summary>/);assert.ok(html.includes(`<p>${issue}</p>`));
});
function nativeAqueduct(){
 const g=new Game();g.reset(2,18,{size:1040,layout:'archipelago'});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);
 const source=nearestFreshWater(g,49.6,265.6,60);assert.ok(source);const target={x:-71.6,z:195.6},plan=planAqueductWorks(g,source,target);assert.deepEqual(plan.issues,[]);assert.ok(plan.stages.length>0);
 return{g,source,target,plan};
}
test('a real native aqueduct preview enables layout without creating digs or changing original ground',()=>{
 const{g,source,plan}=nativeAqueduct(),before={height:Array.from(g.world.heights),buildings:g.state.buildings.length,wood:g.tribe(0).wood},summary=`${plan.stages.length} digs · ${plan.workSeconds} work seconds`,html=render({kind:'aqueduct',source:{x:source.x,z:source.z},issue:plan.issues[0]||null,summary,canCommit:plan.issues.length===0&&plan.stages.length>0});assert.doesNotMatch(commitButton(html),/\sdisabled(?:=|\s|>)/);assert.match(html,/aria-pressed="true"[^>]*>Aqueduct/);assert.ok(html.includes(summary));assert.deepEqual(Array.from(g.world.heights),before.height);assert.equal(g.state.buildings.length,before.buildings);assert.equal(g.tribe(0).wood,before.wood);
});


// Real component + Engine mode/point/commission methods. Only raycast input,
// view ghost drawing and HUD notification are presentation stubs; no Game.step.
const waterUiEntry=`
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{WaterEngineeringControls}from'${fileURLToPath(new URL('../src/ui/WaterEngineeringControls.tsx',import.meta.url)).replaceAll('\\','/')}';
import{Engine}from'${fileURLToPath(new URL('../src/game/engine.ts',import.meta.url)).replaceAll('\\','/')}';
import{Game}from'${fileURLToPath(new URL('../src/game/sim.ts',import.meta.url)).replaceAll('\\','/')}';
import{nearestFreshWater}from'${fileURLToPath(new URL('../src/game/waterWorks.ts',import.meta.url)).replaceAll('\\','/')}';
import{excavationCuts}from'${fileURLToPath(new URL('../src/game/excavation.ts',import.meta.url)).replaceAll('\\','/')}';
window.__startWaterUi=()=>{
 const g=new Game();g.reset(2,18,{size:1040,layout:'archipelago'});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);
 const source=nearestFreshWater(g,49.6,265.6,60),target={x:-71.6,z:195.6};if(!source)throw Error('Native freshwater source missing');
 const beforeHeights=g.world.heights.slice(),beforeBuildings=new Set(g.state.buildings.map(b=>b.id)),beforePeople=g.state.units.map(u=>({id:u.id,x:u.x,z:u.z}));
 const e=Object.create(Engine.prototype);e.game=g;e.waterDraft=null;let point=null,hudUpdates=0,renderReady=false;const root=createRoot(document.getElementById('root'));
 const render=()=>flushSync(()=>root.render(React.createElement(WaterEngineeringControls,{engine:e})));
 e.view={groundAt:()=>point};e.updateGhost=()=>{};e.pushHud=()=>{hudUpdates++;if(renderReady)queueMicrotask(render);};
 window.__waterUi={clickGround(which){point=which==='source'?{x:source.x,z:source.z}:target;Engine.prototype.leftClick.call(e,20,20,false);},status(){return e.waterEngineeringStatus();},facts(){const added=g.state.buildings.filter(b=>!beforeBuildings.has(b.id));return{hudUpdates,newBuildings:added.length,ordinaryUnfinishedDigs:added.every(b=>b.type==='trench'&&b.build<1),completedCuts:excavationCuts(g).length,aqueductPlans:g.state.aqueductWorks?.length||0,terrainUnchanged:g.world.heights.every((n,i)=>n===beforeHeights[i]),peopleNotMoved:beforePeople.every(p=>{const u=g.state.units.find(u=>u.id===p.id);return u&&u.x===p.x&&u.z===p.z;}),simulationErrors:[...g.simulationErrors]};},close(){flushSync(()=>root.unmount());}};
 renderReady=true;render();
};`;
async function waterUiBundle(){
 const bundle=await rolldown({input:'\0water-ui-native-contract',platform:'browser',resolve:{extensions:['.tsx','.ts','.js','.mjs','.json'],alias:{'@':resolve('src')}},transform:{jsx:'react-jsx'},plugins:[{name:'water-ui-native-contract',resolveId(id){if(id==='\0water-ui-native-contract')return id;},load(id){if(id==='\0water-ui-native-contract')return waterUiEntry;}}]});
 try{const result=await bundle.generate({format:'iife',codeSplitting:false});return result.output.filter(f=>f.type==='chunk').map(f=>f.code).join('\n');}finally{await bundle.close();}
}
test('actual DOM buttons and Engine world-point clicks commission native aqueduct earthworks without instant construction',{timeout:60000},async()=>{
 const code=await waterUiBundle();let browser,context;const errors=[];
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setContent('<!doctype html><div id="root"></div>');await page.addScriptTag({content:code});await page.evaluate(()=>window.__startWaterUi());
  const commit=page.getByRole('button',{name:'Lay out works',exact:true});assert.equal(await commit.isDisabled(),true);
  await page.getByRole('button',{name:'Canal',exact:true}).click();assert.equal((await page.evaluate(()=>window.__waterUi.status())).kind,'canal');await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal((await page.evaluate(()=>window.__waterUi.status())).kind,null);
  await page.getByRole('button',{name:'Aqueduct',exact:true}).click();assert.equal((await page.evaluate(()=>window.__waterUi.status())).source,null);assert.equal(await commit.isDisabled(),true);
  await page.evaluate(()=>window.__waterUi.clickGround('source'));await page.getByRole('status').getByText('Click the destination.',{exact:true}).waitFor();assert.equal(await commit.isDisabled(),true);
  await page.evaluate(()=>window.__waterUi.clickGround('target'));await page.waitForFunction(()=>window.__waterUi.status().canCommit);const preview=await page.evaluate(()=>window.__waterUi.status());assert.equal(preview.issue,null);assert.match(preview.summary,/channel earthworks only/);assert.equal((await page.evaluate(()=>window.__waterUi.facts())).newBuildings,0,'preview creates no construction');
  await commit.click();await page.getByRole('status').getByText('Works laid out; excavation still needs builders.',{exact:true}).waitFor();const after=await page.evaluate(()=>window.__waterUi.facts());assert.ok(after.newBuildings>0);assert.equal(after.ordinaryUnfinishedDigs,true);assert.equal(after.completedCuts,0);assert.equal(after.aqueductPlans,1);assert.equal(after.terrainUnchanged,true);assert.equal(after.peopleNotMoved,true);assert.deepEqual(after.simulationErrors,[]);assert.equal((await page.evaluate(()=>window.__waterUi.status())).kind,null);assert.equal(await commit.isDisabled(),true);assert.deepEqual(errors,[]);await page.evaluate(()=>window.__waterUi.close());
  console.log(JSON.stringify({scope:'Real ReactDOM buttons, actual Engine mode/leftClick point/commission methods, nativeV18 aqueduct planner and queued digs; raycast/ghost/HUD presentation stubs, TestLab full-reveal fixture; no simulation steps, renderer acceptance or campaign qualification.',passed:1,total:1,preview,after,errors}));
 }finally{await context?.close();await browser?.close();}
});
