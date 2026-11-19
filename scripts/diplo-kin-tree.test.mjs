import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {kinTree} from '../src/ui/council/kinTree.ts';
const {KinTreeView}=await import('../src/ui/council/KinTreeView.tsx');
test('kin tree per neighbour reads only the rulers model: ruler, regent, heir, wards, marriages with us',()=>{
 const n={team:2,court:{ruler:'Edda',rulerAge:44,house:'Reed',law:'eldest',heir:{name:'Ivo',age:9,adult:false,legit:true},regent:'Mara',extinct:false},wards:[{name:'Tam',age:12,kind:'foster',heldByUs:true,sinceYear:3,endsIn:2,effect:''},{name:'Lin',age:20,kind:'hostage',heldByUs:false,sinceYear:4,endsIn:5,effect:''}]};
 const news=[{time:1,kind:'marriage',with:2,text:'Our Ana wed their Ivo'},{time:2,kind:'pact',with:2,text:'Pact'},{time:3,kind:'marriage',with:3,text:'Other house'}];
 const before=JSON.stringify({n,news}),t=kinTree(n,news);
 assert.equal(t.label,'Edda, 44 · head of House Reed');
 assert.deepEqual(t.children.map(c=>c.label),['Mara · regent','Ivo, 9 · heir (a child)','Wards and hostages','Marriages with us']);
 assert.deepEqual(t.children[2].children.map(c=>c.label),['Tam, 12 · foster child in our hall','Lin, 20 · hostage in their hall']);
 assert.deepEqual(t.children[3].children.map(c=>c.label),['Our Ana wed their Ivo']);
 assert.equal(kinTree({team:5},[]),null,'old or unknown houses show nothing');
 assert.equal(JSON.stringify({n,news}),before);
 let centred=0;const html=renderToStaticMarkup(React.createElement(KinTreeView,{tree:t,onCentre:()=>centred++}));
 assert.match(html,/<details[^>]*data-kin-tree/);assert.match(html,/Centre on their hall/);assert.match(html,/text-base/);
});
test('kin tree is wired in Hearth neighbour cards and the Classic diplomacy sheet with tap-to-centre',()=>{
 const h=readFileSync(new URL('../src/ui/hearth/screens.tsx',import.meta.url),'utf8'),d=readFileSync(new URL('../src/ui/council/DiplomacySheet.tsx',import.meta.url),'utf8'),c=readFileSync(new URL('../src/ui/CouncilPanel.tsx',import.meta.url),'utf8');
 assert.match(h,/<KinTreeView tree=\{kinTree\(n,news\)\}/);assert.match(h,/onCentre=\{t=>focusKnownSettlement\(engine,t\)\}/);
 assert.match(d,/<KinTreeView tree=\{kinTree\(n,news\)\}/);assert.match(c,/news=\{c\.news\?\?\[\]\} onCentre=\{t=>focusKnownSettlement\(engine,t\)\}/);
});
