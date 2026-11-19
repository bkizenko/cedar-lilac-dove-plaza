import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {yearReview,sessionRecap} from '../src/ui/sessionRecap.ts';
const Y=100,H=[{team:0,time:50,text:'Ana was born'},{team:0,time:120,text:'Bo was born'},{team:0,time:150,text:'The barley harvest is in'},{team:0,time:199,text:'Peace treaty sealed with Reedfolk'},{team:0,time:210,text:'Cy was born'},{team:1,time:130,text:'Rival child was born'}];
test('year review counts only the chronicle lines of the year that just ended',()=>{
 const before=JSON.stringify(H),r=yearReview(H,1,Y);
 assert.equal(r.year,2);assert.equal(r.summary,'1 birth · 1 harvest · 1 treaty');
 assert.equal(yearReview(H,0,Y).summary,'1 birth');assert.equal(yearReview(H,5,Y),null,'quiet year shows no card');
 assert.equal(sessionRecap(H,0,0,150).counts.births,2,'until bound is inclusive');assert.equal(JSON.stringify(H),before);
});
test('review card fires on the year turn only, can be switched off, and is mounted on Hearth and Classic',()=>{
 const c=readFileSync(new URL('../src/ui/YearEndReview.tsx',import.meta.url),'utf8');
 assert.match(c,/year!==prev\.year\+1/);assert.match(c,/Don't show yearly reviews/);assert.match(c,/hearthwild\.ui\.yearReview/);assert.match(c,/<details>/);
 assert.match(readFileSync(new URL('../src/ui/hearth/HudHearth.tsx',import.meta.url),'utf8'),/<YearEndReview engine=\{engine\}\/>/);
 assert.match(readFileSync(new URL('../src/ui/Hud.tsx',import.meta.url),'utf8'),/<YearEndReview engine=\{engine\} classic\/>/);
});
