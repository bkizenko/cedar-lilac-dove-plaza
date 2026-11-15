import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {sellCaptive,peoplePrice} from '../src/game/captiveDealings.ts';
import {applyPlayerTradeCommand} from '../src/game/playerTrade.ts';
import {isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(123456,3);g.enterIsland();
 const cap=g.spawnUnit('worker',30,30,0);cap.prisoner={originTeam:1,captorTeam:0,phase:'custody',food:0,waterLiters:0,unguardedSeconds:0};
 const buyer=g.spawnUnit('worker',32,30,2);buyer.carry=30;buyer.carryType='wood';buyer.order='hold';
 g.tribe(1).trust=.8;g.tribe(1).tension=0;g.tribe(2).hostile=false;g.tribe(2).aggro=0;return{g,cap,buyer};}
const people=g=>g.state.units.filter(u=>u.hp>0).length;
test('sale moves the person and the payment exactly once',()=>{
 const{g,cap,buyer}=fixture();if(g.isFoe(0,2))g.state.tribes[2].hostile=false;const n=people(g),wood=g.tribe(0).wood,load=buyer.carry,ids=g.state.units.map(u=>u.id);
 const r=sellCaptive(g,cap.id,buyer.id);assert.equal(r.accepted,true,r.reason);
 assert.equal(cap.team,2);assert.equal(cap.prisoner,undefined);assert.equal(people(g),n,'no person created or destroyed');assert.deepEqual(g.state.units.map(u=>u.id),ids);
 const price=peoplePrice('wood');assert.equal(g.tribe(0).wood,wood+price);assert.equal(buyer.carry,load-price);
 assert.equal(sellCaptive(g,cap.id,buyer.id).accepted,false,'cannot sell the same person twice');
 assert.ok(g.tribe(1).trust<.8&&g.tribe(1).tension>0,'origin society resents it');
 const copy=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(copy.state.units.find(u=>u.id===cap.id).team,2);
});
test('refused when not in custody, too far, buyer cannot pay, child or own society',()=>{
 let f=fixture();f.cap.prisoner.phase='escorting';assert.equal(sellCaptive(f.g,f.cap.id,f.buyer.id).accepted,false);
 f=fixture();f.buyer.x=200;assert.equal(sellCaptive(f.g,f.cap.id,f.buyer.id).accepted,false);
 f=fixture();f.buyer.carry=2;const r=sellCaptive(f.g,f.cap.id,f.buyer.id);assert.equal(r.accepted,false);assert.equal(f.cap.team,0);assert.equal(f.buyer.carry,2);
 f=fixture();f.buyer.carry=0;assert.equal(sellCaptive(f.g,f.cap.id,f.buyer.id).accepted,false);
 f=fixture();const own=f.g.spawnUnit('worker',31,30,0);own.carry=30;own.carryType='wood';assert.equal(sellCaptive(f.g,f.cap.id,own.id).accepted,false);
});
test('dispatch schema and command',()=>{
 assert.equal(isEngineDispatchCommand({kind:'sell-captive',prisonerId:3,buyerId:4}),true);assert.equal(isEngineDispatchCommand({kind:'sell-captive',prisonerId:3}),false);
 const{g,cap,buyer}=fixture();assert.equal(applyPlayerTradeCommand(g,{kind:'sell-captive',prisonerId:cap.id,buyerId:buyer.id}).accepted,true);
});
