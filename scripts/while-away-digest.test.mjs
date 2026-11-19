import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {awayDigest,sessionRecap} from '../src/ui/sessionRecap.ts';
const H=[{team:0,time:10,text:'Ana was born'},{team:0,time:60,text:'Bo was born'},{team:0,time:70,text:'Reedfolk raided the east fields'},{team:0,time:80,text:'Peace treaty sealed with Reedfolk'},{team:0,time:90,text:'The barley harvest is in'}];
test('while-away digest counts only chronicle lines recorded after the viewer left, and only after a real absence',()=>{
 const before=JSON.stringify(H);
 assert.equal(awayDigest(H,50,10*60_000).summary,'1 birth · 1 harvest · 1 raid · 1 treaty');
 assert.equal(awayDigest(H,50,60_000),null,'a short glance away shows nothing');
 assert.equal(awayDigest(H,95,10*60_000),null,'nothing recorded meanwhile, nothing minted');
 assert.equal(awayDigest(undefined,0,10*60_000),null);
 assert.equal(sessionRecap(H,0).counts.births,2);
 assert.equal(JSON.stringify(H),before);
});
test('digest is mounted in Hearth and Classic and is dismissible',()=>{
 const c=readFileSync(new URL('../src/ui/WhileAwayDigest.tsx',import.meta.url),'utf8');
 assert.match(c,/visibilitychange/);assert.match(c,/Dismiss digest/);assert.match(c,/hw-prev-tally/);assert.doesNotMatch(c,/state\.[a-zA-Z]+\s*=[^=]/,'never writes game state');
 assert.match(readFileSync(new URL('../src/ui/hearth/HudHearth.tsx',import.meta.url),'utf8'),/<WhileAwayDigest engine=\{engine\}\/>/);
 assert.match(readFileSync(new URL('../src/ui/Hud.tsx',import.meta.url),'utf8'),/<WhileAwayDigest engine=\{engine\} classic\/>/);
});
