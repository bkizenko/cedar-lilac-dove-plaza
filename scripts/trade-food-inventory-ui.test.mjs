import test from'node:test';import assert from'node:assert/strict';import{registerHooks}from'node:module';import{readFileSync,existsSync}from'node:fs';import{fileURLToPath}from'node:url';import ts from'typescript';import React from'react';import{renderToStaticMarkup}from'react-dom/server';
registerHooks({resolve(s,c,next){let target=s.startsWith('@/')?new URL('../src/'+s.slice(2),import.meta.url).href:s;try{return next(target,c);}catch(e){if(target.startsWith('.')||target.startsWith('file:'))for(const ext of['.ts','.tsx']){const u=new URL(target+ext,c.parentURL);if(existsSync(u))return next(u.href,c);}throw e;}},load(url,c,next){if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText};return next(url,c);}});
const {ResidentInventory}=await import('../src/ui/ResidentInventory.tsx');
// Display-only fixture: exact physical trade acquisition is qualified separately.
const fixture=()=>({id:10,name:'Carrier',team:0,type:'worker',hp:100,maxHp:100,carry:6,carryType:'food',carryFoodLots:{bread:4,fish:2},itemCargo:{},stuckT:0});
test('resident inventory shows actual mixed cargo, not generic provisions, without changing it',()=>{
 const u=fixture(),before=JSON.stringify(u),html=renderToStaticMarkup(React.createElement(ResidentInventory,{residents:[u]})).replace(/<!--.*?-->/g,'');
 assert.match(html,/4 bread/);assert.match(html,/2 fresh fish/);assert.doesNotMatch(html,/6 provisions|6 food/);assert.equal(JSON.stringify(u),before);
});
test('resident inventory keeps legacy single-food and non-food cargo readable',()=>{
 const u=fixture();delete u.carryFoodLots;u.carryFood='berries';
 let html=renderToStaticMarkup(React.createElement(ResidentInventory,{residents:[u]})).replace(/<!--.*?-->/g,'');assert.match(html,/6 berries/);
 delete u.carryFood;u.carryType='wood';html=renderToStaticMarkup(React.createElement(ResidentInventory,{residents:[u]})).replace(/<!--.*?-->/g,'');assert.match(html,/6 wood/);
});
