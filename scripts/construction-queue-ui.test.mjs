import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Game} from '../src/game/sim.ts';
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
 const engine={game:g,pushHud(){assert.fail('static rendering must not dispatch a UI update');}};return{g,u,sites,engine};
}
function renderWithoutMutation(Component,props,g){const before=JSON.stringify(g.state),html=renderToStaticMarkup(React.createElement(Component,props));assert.equal(JSON.stringify(g.state),before,'rendering must preserve orders, stores, paid progress and pending intent');return html;}
test('actual site control renders High/Normal/Low, selected priority, queue action and modifier instructions without mutation',()=>{
 const{g,sites,engine}=fixture();for(const[priority,label]of [[2,'High'],[1,'Normal'],[0,'Low']]){sites[0].constructionPriority=priority;const html=renderWithoutMutation(ConstructionSiteControls,{engine,buildingId:sites[0].id},g);assert.match(html,/Construction priority/);for(const option of ['High','Normal','Low'])assert.ok(html.includes(`>${option}</option>`));assert.ok(html.includes(`<option value="${priority}" selected="">${label}</option>`));assert.match(html,/Queue for nearest builders/);assert.match(html,/Shift-right-click sites to queue several/);}
});
test('actual builder panel shows current, queued, paused and material-waiting states with real edit actions',()=>{
 const{g,u,sites,engine}=fixture();let html=renderWithoutMutation(BuilderQueueControls,{engine},g);assert.match(html,/Builder queues/);assert.match(html,/Hut · current/);assert.match(html,/Timber gate · queued/);assert.match(html,/Farm · paused/);assert.ok(html.includes(`Waiting for ${Math.max(0,Math.ceil(100000-g.tribe(0).wood))} logs`));assert.match(html,/>Pause queue</);assert.match(html,/aria-label="up Hut" disabled=""/);assert.match(html,/aria-label="down Storehouse" disabled=""/);assert.match(html,/>Remove</);assert.match(html,/aria-label="up Timber gate"/);
 u.constructionQueue.paused=true;html=renderWithoutMutation(BuilderQueueControls,{engine},g);assert.match(html,/· paused/);assert.match(html,/>Resume queue</);assert.doesNotMatch(html,/>Pause queue</);assert.deepEqual(u.constructionQueue.sites,sites.map(b=>b.id));
});
test('empty builder selections and foreign or completed sites are hidden; a real pending extension remains actionable',()=>{
 const{g,u,sites,engine}=fixture();u.constructionQueue=undefined;assert.equal(renderWithoutMutation(BuilderQueueControls,{engine},g),'');u.constructionQueue={sites:[sites[0].id]};u.selected=false;assert.equal(renderWithoutMutation(BuilderQueueControls,{engine},g),'');
 sites[0].team=1;assert.equal(renderWithoutMutation(ConstructionSiteControls,{engine,buildingId:sites[0].id},g),'');sites[0].team=0;sites[0].build=1;assert.equal(renderWithoutMutation(ConstructionSiteControls,{engine,buildingId:sites[0].id},g),'');assert.equal(renderWithoutMutation(ConstructionSiteControls,{engine,buildingId:g.state.nextId+1000},g),'');
 const store=sites[3];store.build=1;store.plannedCost=undefined;store.expansion={w:store.w*2,d:store.d,progress:.1,paid:true};const html=renderWithoutMutation(ConstructionSiteControls,{engine,buildingId:store.id},g);assert.match(html,/Queue for nearest builders/);assert.match(html,/>Build now</);
});
