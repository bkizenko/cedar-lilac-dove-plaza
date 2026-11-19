import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Game} from '../src/game/sim.ts';
import {newcomerArrivals,nextWelcome} from '../src/ui/newcomerWelcome.ts';
const source=new URL('../src/ui/NewcomerWelcome.tsx',import.meta.url);
const compiled=new URL(`../src/ui/.newcomer-welcome-test-${process.pid}.mjs`,import.meta.url);
await writeFile(compiled,ts.transpileModule(await readFile(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText);
after(()=>unlink(compiled));
const {WelcomeLine}=await import(compiled.href);
function world(){const g=new Game();g.reset(42,10);g.enterIsland();g.revealMap=true;g.vision.fill(2);
 const hall=g.state.buildings.find(b=>b.team===0&&b.type==='townhall')??g.state.units.find(u=>u.team===0);return {g,hall};}
test('no arrivals means no welcome: nothing is invented',()=>{
 const {g}=world();assert.deepEqual(newcomerArrivals(g),[]);assert.equal(nextWelcome(g),null);
});
test('a waiting trader, a foreign envoy and a refugee family each get one real line, once',()=>{
 const {g,hall}=world();
 const t=g.spawnUnit('worker',hall.x+4,hall.z,1);Object.assign(t,{carry:24,carryType:'wood',visit:{phase:'waiting',wait:0,wanted:'food'},order:'hold'});
 const e=g.spawnUnit('worker',hall.x-4,hall.z,2);e.envoy={team:0,kind:'peace',phase:'outbound',talk:0};
 const r1=g.spawnUnit('worker',hall.x,hall.z+4,1),r2=g.spawnUnit('worker',hall.x,hall.z+5,1);for(const r of [r1,r2])r.refugee={home:1,phase:'waiting',year:0};
 const lines=newcomerArrivals(g).map(a=>a.line);
 assert.ok(lines.some(l=>/trader has arrived carrying 24 logs and hopes for food/.test(l)),lines.join('|'));
 assert.ok(lines.some(l=>/An envoy from .* is here to talk peace/.test(l)));
 assert.ok(lines.some(l=>/^2 hungry people from .* wait at your hall/.test(l)));
 const seen=[nextWelcome(g),nextWelcome(g),nextWelcome(g)].map(a=>a?.key);assert.equal(new Set(seen).size,3);assert.equal(nextWelcome(g),null,'each arrival is greeted once');
});
test('arrivals wait while the player is placing a building',()=>{
 const {g,hall}=world();const t=g.spawnUnit('worker',hall.x+4,hall.z,1);Object.assign(t,{carry:5,carryType:'stone',visit:{phase:'waiting',wait:0},order:'hold'});
 g.state.placing='hut';assert.equal(nextWelcome(g),null);g.state.placing=null;assert.match(nextWelcome(g).line,/trader has arrived/);
});
test('the line is 16px, fits a 390px phone and never takes the pointer',async()=>{
 const html=renderToStaticMarkup(React.createElement(WelcomeLine,{arrival:{key:'x',line:'A trader has arrived'}}));
 assert.match(html,/text-\[16px\]/);assert.match(html,/calc\(100vw-24px\)/);assert.match(html,/pointer-events-none/);
 assert.equal(renderToStaticMarkup(React.createElement(WelcomeLine,{arrival:null})),'');
 assert.match(await readFile(new URL('../src/ui/HudRoot.tsx',import.meta.url),'utf8'),/<NewcomerWelcome engine=\{engine\}\/>/);
});
