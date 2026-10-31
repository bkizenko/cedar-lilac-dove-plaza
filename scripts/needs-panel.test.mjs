import test,{after} from 'node:test';import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import ts from 'typescript';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {Game} from '../src/game/sim.ts';import {initializeSurvival} from '../src/game/survivalNeeds.ts';
// Exercise the real React view with real simulation data; Node's strip-types
// loader handles game modules while TypeScript lowers this one JSX entrypoint.
const source=new URL('../src/ui/NeedsPanel.tsx',import.meta.url),compiled=new URL(`../src/ui/.needs-panel-test-${process.pid}.mjs`,import.meta.url);
await writeFile(compiled,ts.transpileModule(await readFile(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText);
after(async()=>{await unlink(compiled);});
const {NeedsPanel,reserveLabel}=await import(compiled.href);
function fixture(){
 const g=new Game();g.reset(42,10);g.enterIsland();g.state.units=g.state.units.filter(u=>u.team===0);
 g.world.rivers=[];g.world.features=[];g.clockState=()=>({weather:'Clear · 18°C'});initializeSurvival(g);
 return {game:g,pushHud(){}};
}
test('water and warmth show real stores and a specific disabled collection reason',()=>{
 const engine=fixture(),g=engine.game;g.tribe(0).survival.waterLiters=7;g.tribe(0).wood=3;
 const html=renderToStaticMarkup(React.createElement(NeedsPanel,{engine,expanded:true}));
 assert.match(html,/7 L/);assert.match(html,/3 logs/);assert.match(html,/Drinking water low/);
 assert.match(html,/Explore a freshwater bank reachable by land before collecting water/);
 assert.match(html,/<button[^>]*disabled=""[^>]*>[\s\S]*?Collect water/);
 assert.match(html,/Timber focus may reduce food gathering/);assert.match(html,/Water delivered 0.0 L/);
 assert.equal(g.tribe(0).survival.waterLiters,7,'rendering never credits resources');
});
test('compact survival warning is visible without opening or scanning freshwater routes',()=>{
 const engine=fixture();engine.game.tribe(0).survival.waterLiters=0;
 Object.defineProperty(engine.game.world,'rivers',{get(){throw new Error('collapsed HUD must not run path searches');}});
 const html=renderToStaticMarkup(React.createElement(NeedsPanel,{engine}));
 assert.match(html,/<summary[\s\S]*?Drinking water empty[\s\S]*?<\/summary>/);
});
test('legacy villages remain on their existing survival rules and reserve labels do not invent deadlines',()=>{
 const engine=fixture();engine.game.state.survivalVersion=undefined;
 assert.equal(renderToStaticMarkup(React.createElement(NeedsPanel,{engine})), '');
 assert.equal(reserveLabel(Infinity),'No current demand');assert.equal(reserveLabel(0),'Empty');assert.equal(reserveLabel(65),'1m 5s left');
});
