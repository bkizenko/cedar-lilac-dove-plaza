import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {addGrudge,grudgeOf,fadeGrudges,ensureRulers,GRUDGE_FADE,GRUDGE_HEIR} from '../src/game/rulersRuntime.ts';
import {rulersOf} from '../src/game/rulersState.ts';
const fixture=()=>{const g=new Game();g.reset(123456,10);g.enterIsland();ensureRulers(g);return g;};
test('house grudge: stored, directed, renewed, fades, weakens at succession, round-trips, old saves load',()=>{
 const g=fixture();assert.equal(grudgeOf(g,1,2),0,'old saves/fresh games start with none');
 addGrudge(g,1,2,.6,'custody');assert.equal(grudgeOf(g,1,2),.6);assert.equal(grudgeOf(g,2,1),0,'directed: the wronged house remembers');
 addGrudge(g,1,2,.6,'claim');assert.equal(grudgeOf(g,1,2),1,'renewal adds, capped at 1');
 const gen={};for(const k of Object.keys(g.state.rulers.societies))gen[k]=g.state.rulers.societies[k].dynasty.generation;
 fadeGrudges(g,gen);assert.ok(Math.abs(grudgeOf(g,1,2)-GRUDGE_FADE)<.002,'plain year only fades');
 const before=grudgeOf(g,1,2);gen['1']-=1; // pretend house 1 changed ruler this year
 fadeGrudges(g,gen);assert.ok(Math.abs(grudgeOf(g,1,2)-before*GRUDGE_FADE*GRUDGE_HEIR)<.002,'heir inherits a weaker grudge');
 const copy=JSON.parse(JSON.stringify(g.state.rulers));assert.ok(rulersOf({rulers:copy}),'valid after JSON round trip');
 assert.equal(rulersOf({rulers:{...copy,grudges:[{holder:'1',target:'1',w:.5,since:0,cause:'claim'}]}}),null,'self grudge rejected');
 for(let i=0;i<60;i++)fadeGrudges(g,gen);assert.equal(grudgeOf(g,1,2),0,'unrenewed grudges fade out');
 delete g.state.rulers.grudges;assert.ok(rulersOf(g.state),'save without field still valid');
});
