import test from 'node:test';
import assert from 'node:assert/strict';
import {emergencyResponse} from '../src/game/defense.ts';
import {Game} from '../src/game/sim.ts';
function unit(id,x,z,team=3){return {id,kind:'unit',type:'spearman',team,x,z,hp:100,maxHp:100,order:'hold',target:null,range:3};}
function fixture(enemies){const u=unit(1,0,0,0);u.emergency={until:20,defending:true};u.job='wood';const g={state:{time:1,units:[u,...enemies],buildings:[]},isFoe:(a,b)=>a!==b,visibleAt:()=>true,finished:()=>true,combatAI:()=>{},tribe:()=>({spears:0,bows:0,blades:0})};return {g,u};}
function withHypotCounter(fn){const original=Math.hypot;let calls=0;Math.hypot=(...args)=>{calls++;return original(...args);};try{return {value:fn(),calls};}finally{Math.hypot=original;}}
test('same-team isFoe invariant rejects before touching any diplomacy state',()=>{
 for(const team of [0,1,2,3,4,5,100])assert.equal(Game.prototype.isFoe.call({tribe:()=>{throw new Error('not needed');}},team,team),false);
});
test('own residents avoid every circular-distance calculation',()=>{
 const residents=Array.from({length:200},(_,i)=>unit(i+10,i*.01,0,0)),{g,u}=fixture(residents);
 const result=withHypotCounter(()=>emergencyResponse(g,u,.1));assert.equal(result.value,true);assert.equal(u.order,'hold');
 assert.equal(result.calls,0);
});
test('original exact 17m,45m,65m circle boundaries and existing-target continuation remain',()=>{
 for(const [distance,expected] of [[16.999,true],[17,false],[44.999,false],[45,false],[64.999,false],[65,false]]){
  const enemy=unit(2,distance,0),{g,u}=fixture([enemy]);emergencyResponse(g,u,.1);assert.equal(u.target===enemy,expected,`personal ${distance}`);
 }
 for(const distance of [17,44.999,45,64.999,65]){
  const enemy=unit(2,distance,0),{g,u}=fixture([enemy]);u.target=enemy;let attacks=0;g.combatAI=()=>attacks++;
  emergencyResponse(g,u,.1);assert.equal(attacks,distance<65?1:0,`existing pursuit ${distance}`);
 }
 // Inside the broadphase square but outside the exact circle is still rejected.
 const enemy=unit(2,60,60),{g,u}=fixture([enemy]);u.target=enemy;let attacks=0;g.combatAI=()=>attacks++;
 emergencyResponse(g,u,.1);assert.equal(attacks,0);
});
test('same-time relocation, removal, insertion and team/visibility changes use current state',()=>{
 const enemy=unit(2,100,0),{g,u}=fixture([enemy]);emergencyResponse(g,u,.1);assert.equal(u.order,'hold');
 enemy.x=8;emergencyResponse(g,u,.1);assert.equal(u.target,enemy);
 enemy.x=100;u.target=null;emergencyResponse(g,u,.1);assert.equal(u.order,'hold');
 enemy.x=8;enemy.team=0;emergencyResponse(g,u,.1);assert.equal(u.order,'hold');
 enemy.team=3;g.visibleAt=()=>false;emergencyResponse(g,u,.1);assert.equal(u.order,'hold');
 g.visibleAt=()=>true;g.state.units=[u];emergencyResponse(g,u,.1);assert.equal(u.order,'hold');
 g.state.units.push(enemy);emergencyResponse(g,u,.1);assert.equal(u.target,enemy);
});
test('array order preserves equal-distance target choice, sheltered/dead/protected residents excluded',()=>{
 const a=unit(2,-8,0),b=unit(3,8,0),{g,u}=fixture([b,a]);
 emergencyResponse(g,u,.1);assert.equal(u.target,b);
 u.target=null;b.shelterId=7;emergencyResponse(g,u,.1);assert.equal(u.target,a);
 u.target=null;b.shelterId=undefined;b.hp=0;a.contactSurrender={team:0,until:50};emergencyResponse(g,u,.1);assert.equal(u.order,'hold');
 a.contactSurrender=undefined;a.prisoner={phase:'held',captorTeam:0,originTeam:3};emergencyResponse(g,u,.1);assert.equal(u.order,'hold');
});
test('nearby workplace alarm still requires all original 40m/20m distance tests',()=>{
 const enemy=unit(2,30,0),{g,u}=fixture([enemy]);g.state.buildings=[{team:0,x:20,z:0}];
 emergencyResponse(g,u,.1);assert.equal(u.target,enemy);
 u.target=null;g.state.buildings[0].x=10;emergencyResponse(g,u,.1);assert.equal(u.order,'hold','exact20m edge excluded');
});
