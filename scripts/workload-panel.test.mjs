import test,{after} from 'node:test';import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';import ts from 'typescript';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {Game} from '../src/game/sim.ts';import {BUILDINGS} from '../src/game/constants.ts';
const source=new URL('../src/ui/WorkloadPanel.tsx',import.meta.url),compiled=new URL(`../src/ui/.workload-panel-test-${process.pid}.mjs`,import.meta.url);
await writeFile(compiled,ts.transpileModule(await readFile(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText);after(()=>unlink(compiled));
const{WorkloadPanel}=await import(compiled.href);
test('real React workload disclosure shows overload, real capacity, priorities and no invented penalty or assignment',()=>{
 const g=new Game();g.reset(42,13,{size:1040,layout:'continents'});g.enterIsland();g.state.units=g.state.units.filter(u=>u.team===0);g.state.buildings=[];
 for(let i=0;i<3;i++){const b=g.makeBld('farm',i*30,0,0);b.w=BUILDINGS.farm.w*3;b.d=BUILDINGS.farm.d*3;g.state.buildings.push(b);}
 g.workBoard.assign=()=>{throw new Error('workload view must not schedule actors');};g.workBoard.reset=()=>{throw new Error('workload view must not reset jobs');};const before=JSON.stringify(g.state);
 const html=renderToStaticMarkup(React.createElement(WorkloadPanel,{engine:{game:g},expanded:true}));assert.match(html,/Village workload · ~[1-9][0-9]{2,}%/);assert.match(html,/Sow field/);assert.match(html,/5 civilian adults/);assert.match(html,/Manual work is on/);assert.match(html,/Above 100% forecasts a backlog/);assert.equal(JSON.stringify(g.state),before);
});
