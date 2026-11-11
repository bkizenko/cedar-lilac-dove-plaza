import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {workerActivity} from '../src/game/workerActivity.ts';
const source=new URL('../src/ui/WorkerActivity.tsx',import.meta.url);
const hook=registerHooks({load(url,context,next){if(url===source.href)return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText};return next(url,context);}});
after(()=>hook.deregister());
const {WorkerActivity}=await import(source.href);
function fixture(){const resident={id:1,order:'hold',carry:0,itemCargo:{},stuckT:0,tx:12,tz:14,productionProjectId:9,workReason:'Obsolete: walking to berries'};const batch={id:9,team:0,actorId:1,recipe:'grindGrainStation',workplace:2,phase:'working',progress:6,started:20,blockedReason:''};const state={time:40,production:{projects:[batch]},buildings:[{id:2,type:'grindingStone',x:10,z:11}]};return{state,resident,batch};}
test('paid recipe has actual stage, work progress and workshop, never stale reason or invented ETA',()=>{
 const{state,resident,batch}=fixture(),before=JSON.stringify({state,resident});const a=workerActivity(state,resident);
 assert.equal(a.stage,'Working');assert.equal(a.recipe,'Grind grain at a stone');assert.equal(a.progress,.25);assert.equal(a.workSeconds,6);assert.equal(a.requiredWorkSeconds,24);assert.equal(a.batchAgeSeconds,20);assert.match(a.destination,/Grinding stone #2/);assert.equal(a.source,undefined);assert.equal(a.blocked,undefined);assert.deepEqual(a.cargo,[]);assert.deepEqual(a.batchCargo,[]);
 const html=renderToStaticMarkup(React.createElement(WorkerActivity,{state,resident}));assert.match(html,/value="0.25"/);assert.match(html,/Task details/);assert.match(html,/6\/24s work/);assert.doesNotMatch(html,/Obsolete|ETA|berries/);assert.equal(JSON.stringify({state,resident}),before);
 batch.phase='carrying';const loaded=workerActivity(state,resident);assert.deepEqual(loaded.batchCargo,['4 clean grain']);assert.deepEqual(loaded.cargo,[],'reserved batch is separate from loose inventory');
 batch.phase='returning';assert.deepEqual(workerActivity(state,resident).batchCargo,['4 flour']);
});
test('saved pickup source and blocked paid task stay explicit without mutating or inferring a cache',()=>{
 const{state,resident,batch}=fixture();batch.phase='collecting';batch.cacheAnchor={kind:'camp',x:7,z:8};batch.blockedReason='Pickup route blocked; the paid batch remains at its cache';const before=JSON.stringify({state,resident});const a=workerActivity(state,resident);assert.equal(a.source,'Paid cache · 7, 8');assert.equal(a.destination,'Current waypoint · 12, 14');assert.equal(a.blocked,batch.blockedReason);assert.deepEqual(a.batchCargo,[],'inputs still at the cache are not carried');assert.equal(JSON.stringify({state,resident}),before);
});
test('gathered cargo, actual node and movement blockage survive missing or mismatched production assignment',()=>{
 const{state,resident,batch}=fixture();batch.actorId=999;resident.order='gather';resident.node={id:8,kind:'fish',x:2,z:3};resident.carry=3;resident.carryFood='fish';resident.itemCargo={grainSheaves:12};resident.stuckT=4.8;resident.workReason='Warming up by the lit hearth';const a=workerActivity(state,resident);assert.equal(a.recipe,undefined);assert.equal(a.progress,undefined);assert.equal(a.stage,'Gathering');assert.equal(a.source,'fish #8 · 2, 3');assert.deepEqual(a.cargo,['3 fish','12 unthreshed cereal sheaves']);assert.equal(a.blocked,'Movement blocked · 4s');assert.equal(a.destination,undefined);
});
