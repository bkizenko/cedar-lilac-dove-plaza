import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ownPrestigeView,observedPrestigeView} from '../src/game/prestigeScore.ts';
const hook=registerHooks({load(url,context,next){if(url.endsWith('/src/ui/PrestigeReadout.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText};return next(url,context);}});
after(()=>hook.deregister());
const {PrestigeReadout}=await import('../src/ui/PrestigeReadout.tsx');
const owner=()=>({...ownPrestigeView(0,{usableArea:1000,resourcesAndChokepoints:3,healthyPopulation:20,foodSecurity:8,demonstratedPractices:['bake'],usefulTrade:2,civicWorks:14}),territoryMeasuredAt:10,territoryUpdating:false});
test('compact prestige shows eight contribution meters, actual units and explicit unavailable evidence without mutating facts',()=>{
 const view=owner(),before=JSON.stringify(view),html=renderToStaticMarkup(React.createElement(PrestigeReadout,{view}));
 assert.equal((html.match(/<meter /g)||[]).length,8);assert.match(html,/Food security prestige/);assert.match(html,/simulation days of actual edible reserve/);assert.match(html,/No verified objective outcome recorded/);assert.match(html,/aria-label="Your prestige"/);assert.equal(JSON.stringify(view),before);
});
test('unknown rivals hide even an injected name and total; observed rivals show only dated partial evidence',()=>{
 const unknown={...observedPrestigeView(0,1,1000,[]),communityName:'SecretName',total:998877,territoryMeasuredAt:null,territoryUpdating:false};
 const observed={...observedPrestigeView(0,2,1000,[{observer:0,subject:2,observedAt:500,components:{civicWorks:20}}]),communityName:'Arana',total:887766,territoryMeasuredAt:null,territoryUpdating:false};
 const props={view:owner(),rivals:[unknown,observed]},before=JSON.stringify(props),html=renderToStaticMarkup(React.createElement(PrestigeReadout,props));
 assert.match(html,/Unknown community/);assert.doesNotMatch(html,/SecretName|998877|887766/);assert.match(html,/Arana/);assert.match(html,/Summer/);assert.match(html,/Year 1/);assert.match(html,/observed/);assert.equal(JSON.stringify(props),before);
 const named=renderToStaticMarkup(React.createElement(PrestigeReadout,{view:owner(),rivals:[{...unknown,identityKnown:true,communityName:'Known visitor home'}]}));assert.match(named,/Known visitor home/);assert.doesNotMatch(named,/998877/);
});
