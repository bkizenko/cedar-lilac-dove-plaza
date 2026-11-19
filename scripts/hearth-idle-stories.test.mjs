import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Game} from '../src/game/sim.ts';
import {hearthStories,hearthStoryAt,hearthIsQuiet} from '../src/ui/hearthStories.ts';
const source=new URL('../src/ui/HearthIdleStory.tsx',import.meta.url);
const compiled=new URL(`../src/ui/.hearth-idle-story-test-${process.pid}.mjs`,import.meta.url);
await writeFile(compiled,ts.transpileModule(await readFile(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText);
after(()=>unlink(compiled));
const {StoryLine}=await import(compiled.href);
function world(){const g=new Game();g.reset(42,10);g.enterIsland();g.state.banner='';g.state.bannerT=0;for(const u of g.state.units){u.selected=false;u.workReason=undefined;}g.state.lifeHistory=[];return g;}
test('stories come only from real residents and fresh village life events',()=>{
 const g=world();assert.deepEqual(hearthStories(g),[],'nothing happening, nothing told');
 const [a,b]=g.state.units.filter(u=>u.team===0);a.workReason='Mending the storehouse roof';b.workReason='Idle — no job open';
 g.state.lifeHistory.push({team:0,text:'A daughter was born to Ena',time:g.state.time},{team:1,text:'Rival news',time:g.state.time},{team:0,text:'Old news',time:g.state.time-5000});
 const lines=hearthStories(g);
 assert.ok(lines.includes('A daughter was born to Ena'));assert.ok(lines.some(l=>/ · mending the storehouse roof$/.test(l)));
 assert.ok(!lines.some(l=>/Rival news|Old news|no job open/i.test(l)),lines.join('|'));
});
test('the line rotates only while nothing needs the player',()=>{
 const g=world();const u=g.state.units.find(u=>u.team===0);u.workReason='Chopping logs for the hut';g.state.lifeHistory.push({team:0,text:'Ena and Tor were wed',time:g.state.time});
 assert.equal(hearthIsQuiet(g),true);const s0=hearthStoryAt(g,0),s1=hearthStoryAt(g,1);assert.ok(s0&&s1);assert.notEqual(s0,s1);
 g.banner('Raiders sighted',4);assert.equal(hearthStoryAt(g,0),null,'a real warning is never covered');g.state.bannerT=0;
 u.selected=true;assert.equal(hearthStoryAt(g,0),null,'quiet while the player is giving orders');u.selected=false;
 g.state.placing='hut';assert.equal(hearthStoryAt(g,0),null);g.state.placing=null;
});
test('the story line is 16px, pointer-free, one line on a 390px phone, and mounted',async()=>{
 const html=renderToStaticMarkup(React.createElement(StoryLine,{line:'Ena · mending the roof'}));
 assert.match(html,/text-\[16px\]/);assert.match(html,/pointer-events-none/);assert.match(html,/truncate/);assert.match(html,/calc\(100vw-24px\)/);
 assert.equal(renderToStaticMarkup(React.createElement(StoryLine,{line:null})),'');
 assert.match(await readFile(new URL('../src/ui/HudRoot.tsx',import.meta.url),'utf8'),/<HearthIdleStory engine=\{engine\} season=\{hud\.season\}\/>/);
});
test('barks: a named resident speaks up when a real need starts to bite, before it is an alert',()=>{
 const g=world();const [a,b]=g.state.units.filter(u=>u.team===0);
 assert.ok(!hearthStories(g).some(l=>/“/.test(l)),'no needs, no barks');
 a.hunger=40;b.coldSeconds=100;const lines=hearthStories(g);
 assert.ok(lines.some(l=>/: “My belly is empty/.test(l)));assert.ok(lines.some(l=>/: “The wind bites/.test(l)));
 a.hunger=70;assert.ok(!hearthStories(g).some(l=>/belly/.test(l)),'a starving person is an alert, not a bark');
});
