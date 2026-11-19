import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Game} from '../src/game/sim.ts';
const source=new URL('../src/ui/WildAnimalCapture.tsx',import.meta.url);
const compiled=new URL(`../src/ui/.wild-animal-capture-test-${process.pid}.mjs`,import.meta.url);
await writeFile(compiled,ts.transpileModule(await readFile(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText);
after(()=>unlink(compiled));
const {WildAnimalCapture,wildCaptureOffer}=await import(compiled.href);
const setup=()=>{const g=new Game();g.reset(42,10);g.enterIsland();g.state.time=100;
 const w=g.state.units.find(u=>u.team===0&&u.type==='worker');
 const goat={id:g.id(),species:'goat',x:w.x+6,y:g.height(w.x+6,w.z),z:w.z,facing:0,vx:0,vz:0,wanderT:0,hp:20,maxHp:20,fly:0,scale:1};
 g.state.wildlife.push(goat);g.selectedCritter=goat;return {g,w,goat};};
const render=g=>renderToStaticMarkup(React.createElement(WildAnimalCapture,{engine:{game:g,dispatchEpoch:0,pushHud(){},dispatch:async()=>({accepted:true,reason:'',epoch:0})}}));
test('a selected wild goat without a pen explains the pen it needs',()=>{
 const {g,goat}=setup();
 const offer=wildCaptureOffer(g,goat);assert.match(offer.reason,/pasture pen/);
 assert.match(render(g),/Build a pasture pen first/);assert.doesNotMatch(render(g),/Capture this/);
});
test('a selected wild goat near a finished pen offers one real capture button',()=>{
 const {g,w,goat}=setup();const pen=g.makeBld('pen',w.x+10,w.z,0);g.state.buildings.push(pen);
 const offer=wildCaptureOffer(g,goat);assert.equal(offer.penId,pen.id);assert.equal(offer.species,'goat');
 const html=render(g);assert.match(html,/Capture this goat/);assert.match(html,/may refuse/);assert.match(html,/min-h-11/);
});
test('deer, wolves and carcasses are never offered for capture',()=>{
 const {g,w,goat}=setup();g.state.buildings.push(g.makeBld('pen',w.x+10,w.z,0));
 goat.species='deer';assert.match(wildCaptureOffer(g,goat).reason,/cannot be penned/);
 goat.species='goat';goat.hp=0;assert.equal(wildCaptureOffer(g,goat),null);
});
test('the 3D view draws a selection circle under a selected wild animal',async()=>{
 const src=await readFile(new URL('../src/scene/world.ts',import.meta.url),'utf8');
 assert.match(src,/const critter=game\.selectedCritter;/);assert.match(src,/\(game\.selectedCritter\?1:0\)/);
 const hud=await readFile(new URL('../src/ui/Hud.tsx',import.meta.url),'utf8');assert.match(hud,/<WildAnimalCapture engine=\{engine\}\/>/);
});
