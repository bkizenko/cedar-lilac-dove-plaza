import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Game} from '../src/game/sim.ts';
import {newHarvestWatch,watchFirstHarvest} from '../src/ui/firstHarvest.ts';
const source=new URL('../src/ui/FirstHarvestMoment.tsx',import.meta.url);
const compiled=new URL(`../src/ui/.first-harvest-test-${process.pid}.mjs`,import.meta.url);
await writeFile(compiled,ts.transpileModule(await readFile(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText);
after(()=>unlink(compiled));
const {HarvestCard,daysPerFoodUnit}=await import(compiled.href);
function world(){const g=new Game();g.reset(42,10);g.enterIsland();const u=g.state.units.find(u=>u.team===0);
 const field=g.makeBld('farm',u.x+20,u.z,0);field.build=1;g.state.buildings.push(field);return {g,u,field};}
test('nothing fires without a real carrier from a field',()=>{
 const {g,u}=world(),w=newHarvestWatch();u.carry=6;u.carryFood='berries';u.node=null;
 assert.equal(watchFirstHarvest(g,w,.1),null);u.carry=0;assert.equal(watchFirstHarvest(g,w,.1),null,'berries from the bush are not a harvest');
});
test('the first sheaves carried from a field and set down at home fire once, naming the carrier and real days of food',()=>{
 const {g,u,field}=world(),w=newHarvestWatch();
 u.node=field;u.order='gather';u.itemCargo={grainSheaves:8};assert.equal(watchFirstHarvest(g,w,.5),null,'still carrying');
 u.node=null;u.order='return';u.x=field.x-30;assert.equal(watchFirstHarvest(g,w,.5),null);
 u.itemCargo={};const hit=watchFirstHarvest(g,w,.5);
 assert.ok(hit);assert.equal(hit.unitId,u.id);assert.equal(hit.fieldId,field.id);assert.equal(hit.amount,8);assert.equal(hit.days,4);
 assert.match(hit.line,/^First harvest! .+ brought in 8 sheaves from the field — about 4 days of food once threshed$/);
 u.node=field;u.itemCargo={grainSheaves:5};watchFirstHarvest(g,w,.5);u.node=null;u.itemCargo={};assert.equal(watchFirstHarvest(g,w,.5),null,'fires once');
});
test('days of food come from the real reserve and stock, and are left out when nobody eats',()=>{
 assert.equal(daysPerFoodUnit(100,10),.1);assert.equal(daysPerFoodUnit(0,10),null);assert.equal(daysPerFoodUnit(100,null),null);
 const {g,u,field}=world(),w=newHarvestWatch();u.node=field;u.carry=4;u.carryFood='grain';watchFirstHarvest(g,w,null);u.node=null;u.carry=0;u.x=field.x-30;
 assert.doesNotMatch(watchFirstHarvest(g,w,null).line,/days? of food/);
});
test('the harvest card is 16px, has a 44px See field button, fits 390px and is mounted once',async()=>{
 const html=renderToStaticMarkup(React.createElement(HarvestCard,{harvest:{line:'First harvest! Ena brought in 8 sheaves',x:0,z:0},onLook(){}}));
 assert.match(html,/text-\[16px\]/);assert.match(html,/min-h-11 min-w-11/);assert.match(html,/See field/);assert.match(html,/calc\(100vw-24px\)/);
 assert.equal(renderToStaticMarkup(React.createElement(HarvestCard,{harvest:null})),'');
 const src=await readFile(new URL('../src/ui/FirstHarvestMoment.tsx',import.meta.url),'utf8');assert.match(src,/localStorage\.setItem\(key\(g\.state\.seed\),'1'\)/);
 assert.match(await readFile(new URL('../src/ui/HudRoot.tsx',import.meta.url),'utf8'),/<FirstHarvestMoment engine=\{engine\}\/>/);
});
