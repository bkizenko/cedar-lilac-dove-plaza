import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionRecap} from '../src/ui/sessionRecap.ts';
const H=[
 {team:0,time:5,text:'Old Ana was born'},
 {team:0,time:120,text:'Bo was born'},{team:0,time:130,text:'Cy was born'},
 {team:0,time:140,text:'4 hungry people from Reedfolk are taken in, with their own kin and skills'},
 {team:0,time:150,text:'The last master of weaving is gone'},
 {team:0,time:160,text:'A pottery guild forms'},
 {team:0,time:170,text:'Trade: shipment spoiled on the road'},
 {team:1,time:171,text:'Rival child was born'},
 {team:0,time:172,text:'Envoys exchanged greetings'},
];
test('recap tallies only recorded chronicle lines for our village inside the window',()=>{
 const before=JSON.stringify(H);const r=sessionRecap(H,100);
 assert.equal(r.summary,'2 births · 1 death · 1 arrival · 1 finished work · 1 loss of goods');
 assert.deepEqual(r.latest,['The last master of weaving is gone','A pottery guild forms','Trade: shipment spoiled on the road']);
 assert.equal(sessionRecap(H,1000).summary,'','nothing recorded, nothing minted');
 assert.equal(sessionRecap(undefined,0).summary,'','old saves without a chronicle give an empty recap');
 assert.equal(JSON.stringify(H),before);
});
test('recap card is wired on Hearth and Classic, readable and dismissible',()=>{
 const card=readFileSync(new URL('../src/ui/hearth/PreviouslyCard.tsx',import.meta.url),'utf8'),classic=readFileSync(new URL('../src/ui/Hud.tsx',import.meta.url),'utf8'),css=readFileSync(new URL('../src/ui/hearth/hearth.css',import.meta.url),'utf8');
 assert.match(card,/sessionRecap\(st\.lifeHistory/);assert.match(card,/seenBefore\(key\)/,'first visit shows no recap');assert.match(card,/Dismiss recap/);assert.match(card,/data-recap-tally/);
 assert.match(classic,/<PreviouslyCard engine=\{engine\} classic\/>/);
 assert.match(css,/\.hw-prev-tally\{[^}]*font-size:max\(16px/);
});
