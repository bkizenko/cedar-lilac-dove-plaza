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
test('first-ten-minutes steps add collect and first child from real state, show at most three, and stay done',async()=>{
 const {firstSteps,FIRST_GOALS_SHOWN}=await import('../src/ui/firstHourGoals.ts');
 const s=base(),open={gathered:false,child:false};
 const all=firstHourGoals(s,fin,()=>false,open);assert.equal(all.length,FIRST_GOALS_SHOWN);assert.match(all[0],/^Collect food and wood/);
 s.buildings.push({type:'hut',team:0,hp:10,build:1},{type:'warehouse',team:0,hp:10,build:1});
 assert.deepEqual(firstHourGoals(s,fin,t=>t===1,open),['Raise a first child — a sheltered, fed couple at the hearth'],'a finished hut means the village has gathered');
 assert.deepEqual(firstHourGoals(s,fin,t=>t===1,{gathered:true,child:true}),[]);
 const state={},units=[{team:0,hp:10,carry:0,order:'move'}];
 assert.deepEqual(firstSteps(state,units),{gathered:false,child:false});
 units[0].carry=2;assert.equal(firstSteps(state,units).gathered,true);
 units[0].carry=0;assert.equal(firstSteps(state,units).gathered,true,'a step done once stays done');
 units.push({team:1,hp:10,parents:[4,5]});assert.equal(firstSteps(state,units).child,false,'a rival child is not ours');
 units.push({team:0,hp:10,parents:[4,5]});assert.equal(firstSteps(state,units).child,true);
});
test('the guide can be dismissed with a 44px Hide button and never blocks play',()=>{
 const src=readFileSync(new URL('../src/ui/FirstHourGoals.tsx',import.meta.url),'utf8');
 assert.match(src,/Hide the first steps guide/);assert.match(src,/localStorage\.setItem\(HIDE_KEY,'1'\)/);
 assert.match(readFileSync(new URL('../src/ui/hearth/hearth.css',import.meta.url),'utf8'),/\.hw-goals-hide\{[^}]*min-height:44px;min-width:44px/);
});
