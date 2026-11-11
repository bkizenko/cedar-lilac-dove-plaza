import test from 'node:test';import assert from 'node:assert/strict';
import {societyKnownCells} from '../src/game/seaExploration.ts';
const cell=(x,z)=>Math.floor((z+520)/32.5)*32+Math.floor((x+520)/32.5);
function fixture(){let heightReads=0;const g={world:{size:1040},state:{rivalKnowledge:[],units:[],buildings:[{id:1,type:'dock',team:1,hp:100,build:1,x:416,z:-284}],boats:[{id:2,team:1,hp:300,x:419,z:-292.66}]},finished:b=>b.build===1,height:()=>{heightReads++;return 0;},waterAt:()=>1};return {g,reads:()=>heightReads};}
test('a real finished own dock witnesses its hull across the dry/water knowledge-cell boundary',()=>{
 const {g}=fixture(),before=JSON.stringify(g.state),dockCell=cell(416,-284),hullCell=cell(419,-292.66);assert.notEqual(dockCell,hullCell);
 const known=societyKnownCells(g,1);assert.ok(known.has(dockCell));assert.ok(known.has(hullCell));assert.equal(known.size,2,'only actual observed point cells;no neighboring unknown destination cells');assert.equal(JSON.stringify(g.state),before,'knowledge query is read-only');
});
test('own hull ownership alone,foreign witnesses and unfinished docks grant no remote water knowledge',()=>{
 const {g,reads}=fixture();g.state.boats[0].x=200;g.state.boats[0].z=200;g.state.units=[{team:2,hp:100,x:200,z:200},{team:1,hp:0,x:200,z:200}];
 assert.equal(societyKnownCells(g,1).has(cell(200,200)),false);assert.equal(reads(),0,'unwitnessed hull does not sample hidden terrain');
 Object.assign(g.state.buildings[0],{x:200,z:200,build:0});assert.equal(societyKnownCells(g,1).has(cell(200,200)),false);
});
test('a nearby living own observer can witness an afloat hull without a dock;dry or lost hulls grant nothing extra',()=>{
 const {g}=fixture();g.state.buildings=[];g.state.units=[{team:1,hp:100,x:416,z:-284}];const hullCell=cell(419,-292.66);
 assert.ok(societyKnownCells(g,1).has(hullCell));g.height=()=>2;assert.equal(societyKnownCells(g,1).has(hullCell),false);g.height=()=>0;g.state.boats[0].hp=0;assert.equal(societyKnownCells(g,1).has(hullCell),false);
});
