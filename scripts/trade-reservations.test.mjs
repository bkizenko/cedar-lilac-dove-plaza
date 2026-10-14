import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {reconcileTradeReservations} from '../src/game/tradeReservations.ts';
const deal={give:'food',giveAmt:20,get:'wood',getAmt:30};
function fixture(){
 const g=new Game();g.reset(345,2);g.enterIsland();g.world.heights.fill(4);g.state.time=100;g.vision.fill(2);
 g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1)];g.state.units=[];
 for(let i=0;i<4;i++)g.spawnUnit('worker',i*3,50,0);
 Object.assign(g.tribe(0),{food:240,wood:100});Object.assign(g.tribe(1),{food:30,wood:70,trust:1,hostile:false,alive:true});
 g.rebuildWalk();return g;
}
test('acceptance sets aside a finite shipment, prevents overselling and honors it after the seller spends free stock',()=>{
 const g=fixture(),u=g.state.units[0];assert.equal(g.dispatchTrade(u,deal,1),true);
 assert.equal(g.tribe(1).wood,40);assert.deepEqual(u.tradeReservation,{team:1,kind:'wood',amount:30});
 assert.equal(g.dispatchTrade(g.state.units[1],deal,1),false);assert.equal(g.state.units[1].carry,0);
 g.tribe(1).wood=0;const hall=g.state.buildings[1],spot=g.interactionSpot(u,hall);u.x=spot.x;u.z=spot.z;
 g.tradeAI(u,.1);assert.equal(u.carryType,'wood');assert.equal(u.carry,30);assert.equal(u.tradeReservation,undefined);
 assert.equal(g.tribe(1).wood,0);assert.equal(g.tribe(1).food,50);assert.equal(g.tribe(0).wood,100,'goods still have to travel home');
 reconcileTradeReservations(g);assert.equal(g.tribe(1).wood,0,'completed shipment cannot be refunded');
});
test('recall, interruption, death, war and stolen payment release escrow once without inventing player goods',()=>{
 for(const action of ['recall','move','death','war','theft']){
  const g=fixture(),u=g.state.units[0];g.dispatchTrade(u,deal,1);u.selected=true;
  if(action==='recall')g.soundRecall();
  if(action==='move')g.issueMove(25,25);
  if(action==='death')u.hp=0;
  if(action==='war'){g.tribe(1).hostile=true;g.tradeAI(u,.1);}
  if(action==='theft'){u.carry=8;g.tradeAI(u,.1);}
  reconcileTradeReservations(g);reconcileTradeReservations(g);
  assert.equal(g.tribe(1).wood,70,action);assert.equal(g.tribe(0).food,220);assert.equal(u.tradeReservation,undefined);
  assert.equal(u.carry,action==='theft'?8:20);
 }
});
test('accepted contracts survive save/load; old offers remain negotiable; malformed reservations are rejected',()=>{
 const g=fixture();g.dispatchTrade(g.state.units[0],deal,1);
 const restored=decodeGame(encodeGame(g)),u=restored.state.units.find(u=>u.trade);
 assert.equal(restored.tribe(1).wood,40);assert.deepEqual(u.tradeReservation,{team:1,kind:'wood',amount:30});
 restored.interruptMission(u);assert.equal(restored.tribe(1).wood,70);
 const raw=encodeGame(g);raw.state.units.find(u=>u.trade).tradeReservation.amount=999;
 assert.throws(()=>decodeGame(raw),/damaged/);
 const legacy=encodeGame(g);delete legacy.state.units.find(u=>u.trade).tradeReservation;assert.doesNotThrow(()=>decodeGame(legacy));
});
