import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {firstHourGoals,FIRST_HOUR_SECONDS} from '../src/ui/firstHourGoals.ts';
const fin=b=>b.build>=1,base=()=>({time:60,difficulty:'normal',buildings:[{type:'townhall',team:0,hp:10,build:1}],tribes:[{id:0},{id:1}]});
test('first-hour strip lists only goals still open, from live state, and hides when done or for experts',()=>{
 const s=base(),frozen=base(),fb=JSON.stringify(frozen);firstHourGoals(frozen,fin,()=>false);assert.equal(JSON.stringify(frozen),fb,'reading never mutates state');
 assert.equal(firstHourGoals(s,fin,()=>false).length,3);
 s.buildings.push({type:'hut',team:0,hp:10,build:.5});assert.equal(firstHourGoals(s,fin,()=>false).length,3,'unfinished hut is not a shelter yet');
 s.buildings[1].build=1;s.buildings.push({type:'warehouse',team:1,hp:10,build:1});
 assert.deepEqual(firstHourGoals(s,fin,()=>false),['Build a storehouse so food keeps — Build › Village','Find a neighbour — explore or send a scout'],'a rival storehouse does not count');
 s.buildings.push({type:'warehouse',team:0,hp:10,build:1});assert.deepEqual(firstHourGoals(s,fin,t=>t===1),[],'all done hides the strip');
 assert.deepEqual(firstHourGoals({...base(),difficulty:'hard'},fin,()=>false),[]);
 assert.deepEqual(firstHourGoals({...base(),time:FIRST_HOUR_SECONDS+1},fin,()=>false),[]);
 assert.deepEqual(firstHourGoals({...base(),tutorial:{active:true}},fin,()=>false),[],'tutorial mode keeps its own card');
});
test('strip is mounted on Hearth and Classic at 16px',()=>{
 assert.match(readFileSync(new URL('../src/ui/hearth/HudHearth.tsx',import.meta.url),'utf8'),/<FirstHourGoals engine=\{engine\}\/>/);
 assert.match(readFileSync(new URL('../src/ui/Hud.tsx',import.meta.url),'utf8'),/<FirstHourGoals engine=\{engine\} classic\/>/);
 assert.match(readFileSync(new URL('../src/ui/hearth/hearth.css',import.meta.url),'utf8'),/\.hw-goals\{[^}]*font-size:max\(16px/);
});
