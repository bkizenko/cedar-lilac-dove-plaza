import test,{after} from 'node:test';import assert from 'node:assert/strict';import {readFile,writeFile,unlink} from 'node:fs/promises';import ts from 'typescript';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {Game} from '../src/game/sim.ts';import {visitorIntroduced,visitorAI} from '../src/game/visitors.ts';import {performContactAction} from '../src/game/encounters.ts';import {supplyApproach} from '../src/game/campAnchor.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
const source=new URL('../src/ui/VisitingTrader.tsx',import.meta.url),compiled=new URL(`../src/ui/.visiting-trader-test-${process.pid}.mjs`,import.meta.url);await writeFile(compiled,ts.transpileModule(await readFile(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText.replace(/from ['"]\.\/hearth\/fold['"]/,`from 'data:text/javascript,export const FoldHandle=()=>null,FoldMin=()=>null,useFold=()=>({showPanel:true,cls:""});'`));after(()=>unlink(compiled));const{VisitingTrader,traderCardMode}=await import(compiled.href);
function fixture(){
 const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.waterBodies=[];g.world.waterHeights=undefined;g.world.ecology=undefined;
 g.state.units=[];g.state.buildings=[];for(const k of['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.campSites=[{team:0,x:0,z:38}];g.state.buildings.push(g.makeBld('townhall',0,38,0),g.makeBld('warehouse',100,38,0),g.makeBld('townhall',200,38,1));
 for(const t of g.state.tribes)Object.assign(t,{hostile:false,food:200,foodLots:{provisions:200},wood:100,stone:80,copper:80,iron:80,age:2});
 g.vision.fill(2);g.rebuildWalk();const stranger=g.spawnUnit('worker',110,38,1),own=g.spawnUnit('worker',109,38,0);const at=supplyApproach(g,stranger,g.state.buildings[1]);
 g.spend(1,{wood:24});Object.assign(stranger,{x:at.x,z:at.z,carry:24,carryType:'wood',visit:{phase:'waiting',wait:0},order:'hold'});Object.assign(own,{x:at.x+1,z:at.z,order:'hold',selected:true});
 return {g,stranger,own};
}
// The Hearth fold chrome is stubbed (renders the plain card); the card logic is the real module.
const render=g=>renderToStaticMarkup(React.createElement(VisitingTrader,{engine:{game:g,pushHud(){}}}));
test('an unintroduced waiting trader gets only a small first-visit alert, never auto-opened purchase choices',()=>{const{g,stranger}=fixture();
 assert.equal(visitorIntroduced(g,1),false);assert.equal(traderCardMode(g,stranger,null),'alert');assert.equal(traderCardMode(g,stranger,stranger.id),'introduction','opening the alert shows an introduction, not payment buttons');
 const html=render(g);assert.match(html,/first visit/);assert.doesNotMatch(html,/Pay \d|quick trade/);});
test('an in-person first trade completes the introduction; later traders from that society offer quick trades, and it survives save/load',()=>{const{g,stranger,own}=fixture();
 assert.equal(performContactAction(g,'trade',stranger.id,own.id,'visitor:food').accepted,true);assert.equal(visitorIntroduced(g,1),true);
 const next=g.spawnUnit('worker',stranger.x,stranger.z,1);g.spend(1,{stone:10});Object.assign(next,{carry:10,carryType:'stone',visit:{phase:'waiting',wait:0},order:'hold'});
 assert.equal(traderCardMode(g,next,null),'alert');assert.equal(traderCardMode(g,next,next.id),'choices');assert.match(render(g),/quick trade/);
 const restored=decodeGame(structuredClone(encodeGame(g)));assert.equal(visitorIntroduced(restored,1),true);});
test('a visit that waits out at the village also completes the introduction; other societies stay unintroduced',()=>{const{g,stranger}=fixture();Object.assign(stranger,{x:8,z:38});stranger.visit.wait=119.95;visitorAI(g,stranger,.1);assert.equal(stranger.visit.phase,'return');assert.equal(visitorIntroduced(g,1),true);assert.equal(visitorIntroduced(g,2),false);});
