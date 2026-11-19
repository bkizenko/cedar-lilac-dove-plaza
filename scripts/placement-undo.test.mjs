import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Game} from '../src/game/sim.ts';
import {stockSnapshot,stockSpent,undoPlacement,undoIssue,UNDO_WINDOW_SECONDS} from '../src/ui/commandUndo.ts';
const source=new URL('../src/ui/PlacementUndoChip.tsx',import.meta.url);
const compiled=new URL(`../src/ui/.placement-undo-test-${process.pid}.mjs`,import.meta.url);
await writeFile(compiled,ts.transpileModule(await readFile(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText);
after(()=>unlink(compiled));
const {PlacementUndoChip}=await import(compiled.href);
function world(){const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);
 Object.assign(g.state,{weather:'clear',weatherT:1e5,raidT:1e5});const t=g.tribe(0);t.wood+=400;t.stone+=400;t.food+=200;return g;}
function place(g,type){const hall=g.state.buildings.find(b=>b.team===0&&b.type==='townhall')??{x:0,z:0};
 for(let r=12;r<120;r+=4)for(let a=0;a<16;a++){const x=hall.x+Math.cos(a/16*Math.PI*2)*r,z=hall.z+Math.sin(a/16*Math.PI*2)*r;if(g.placementIssue(type,x,z,0))continue;
  const before=new Set(g.state.buildings.map(b=>b.id)),stock=stockSnapshot(g);if(!g.placeBuilding(type,x,z,0))continue;
  const site=g.state.buildings.find(b=>!before.has(b.id)&&b.team===0);return {stock,undo:{buildingId:site.id,spent:stockSpent(stock,stockSnapshot(g)),placedAt:0},site};}
 return null;}
test('undo right after placing refunds exactly what the placement took and removes the site',()=>{
 const g=world(),p=place(g,'well')??place(g,'hut');assert.ok(p,'a native site was placed');
 assert.ok(Object.values(p.undo.spent).some(n=>n>0)||p.site.plannedCost||p.site.sitePreparation,'placement drew real stock or reserved it');
 assert.equal(undoIssue(g,p.undo),null);
 const r=undoPlacement(g,p.undo);assert.equal(r.accepted,true,r.reason);
 assert.deepEqual(stockSnapshot(g),p.stock,'stock is back to exactly what it was');
 assert.equal(p.site.hp,0);
 assert.equal(undoPlacement(g,p.undo).accepted,false,'a second undo cannot refund twice');
});
test('once building work has started the undo is refused and nothing is refunded',()=>{
 const g=world(),p=place(g,'well')??place(g,'hut');assert.ok(p);
 p.site.sitePreparation=undefined;p.site.build=.2;const now=stockSnapshot(g);
 assert.match(undoIssue(g,p.undo),/work has started/);assert.equal(undoPlacement(g,p.undo).accepted,false);
 assert.deepEqual(stockSnapshot(g),now);assert.ok(p.site.hp>0);
});
test('the undo chip is touch-sized, counts down and hides after the window',()=>{
 const g=world(),p=place(g,'well')??place(g,'hut');assert.ok(p);
 const engine={game:g,lastPlacement:p.undo,undoLastPlacement(){}};
 const html=renderToStaticMarkup(React.createElement(PlacementUndoChip,{engine,now:1000}));
 assert.match(html,/Undo placement/);assert.match(html,/min-h-11/);assert.match(html,/4s/);
 assert.equal(renderToStaticMarkup(React.createElement(PlacementUndoChip,{engine,now:(UNDO_WINDOW_SECONDS+.1)*1000})),'');
 assert.equal(renderToStaticMarkup(React.createElement(PlacementUndoChip,{engine:{...engine,lastPlacement:null},now:0})),'');
});
