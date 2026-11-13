import {finishTradeLoading} from './helpers/finish-trade-loading.mjs';
import {readFileSync} from 'node:fs';
import {endowSettlementSites} from './helpers/endowed-settlement-sites.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {eligibleTradeCarrier,tradeCarrier} from '../src/game/barter.ts';
import {emergencyResponse} from '../src/game/defense.ts';
import {reconcileTradeReservations} from '../src/game/tradeReservations.ts';
const deal={give:'food',giveAmt:20,get:'wood',getAmt:30};
function fixture(){
 const g=new Game();g.reset(345,2);g.enterIsland();g.world.heights.fill(4);g.state.time=100;g.vision.fill(2);
 g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1)];g.state.units=[];
 for(let i=0;i<4;i++)g.spawnUnit('worker',i*3,50,0);
 Object.assign(g.tribe(0),{food:240,wood:100});Object.assign(g.tribe(1),{food:30,wood:70,trust:1,hostile:false,alive:true});
 g.rebuildWalk();endowSettlementSites(g,0);return g;
}
// Immutable already-paid escrow saves captured from the completed previous
// runtime. This exercises legacy ownership; no new remote guarantee is created.
function legacyFixture(armed=false){const file=armed?'legacy-held-armed-trade-920952a.json':'legacy-held-trade-920952a.json';const g=decodeGame(JSON.parse(readFileSync(new URL('./fixtures/'+file,import.meta.url),'utf8')));g.world.heights.fill(4);g.rebuildWalk();return g;}
test('a loaded legacy paid guarantee retains finite escrow when new proposals depart and seller free stock is spent',()=>{
 const g=legacyFixture(),u=g.state.units[0];
 assert.equal(g.tribe(1).wood,40);assert.deepEqual(u.tradeReservation,{team:1,kind:'wood',amount:30});
 const loadingStock=g.tribe(0).food;assert.equal(g.dispatchTrade(g.state.units[1],{...deal,getAmt:1},1),true);finishTradeLoading(g,g.state.units[1],loadingStock);assert.equal(g.state.units[1].carry,20);assert.equal(g.state.units[1].tradeReservation,undefined);assert.equal(g.tribe(1).wood,40,'new unguaranteed proposals cannot consume the legacy escrow');
 g.tribe(1).wood=0;const hall=g.state.buildings[1],spot=g.interactionSpot(u,hall);u.x=spot.x;u.z=spot.z;
 g.tradeAI(u,.1);assert.equal(u.carryType,'wood');assert.equal(u.carry,30);assert.equal(u.tradeReservation,undefined);
 assert.equal(g.tribe(1).wood,0);assert.equal(g.tribe(1).food,50);assert.equal(g.tribe(0).wood,100,'goods still have to travel home');
 reconcileTradeReservations(g);assert.equal(g.tribe(1).wood,0,'completed shipment cannot be refunded');
});
test('recall, interruption, death, war and stolen payment release escrow once without inventing player goods',()=>{
 for(const action of ['recall','move','death','war','theft']){
  const g=legacyFixture(),u=g.state.units[0];u.selected=true;
  if(action==='recall')g.soundRecall();
  if(action==='move')g.issueMove(25,25);
  if(action==='death')u.hp=0;
  if(action==='war'){g.makeHostile(1);g.tradeAI(u,.1);}
  if(action==='theft'){u.carry=8;g.tradeAI(u,.1);}
  reconcileTradeReservations(g);reconcileTradeReservations(g);
  assert.equal(g.tribe(1).wood,70,action);assert.equal(g.tribe(0).food,220);assert.equal(u.tradeReservation,undefined);
  assert.equal(u.carry,action==='theft'?8:20);
 }
});
test('accepted contracts survive save/load; old offers remain negotiable; malformed reservations are rejected',()=>{
 const g=legacyFixture();
 const restored=decodeGame(encodeGame(g)),u=restored.state.units.find(u=>u.trade);
 assert.equal(restored.tribe(1).wood,40);assert.deepEqual(u.tradeReservation,{team:1,kind:'wood',amount:30});
 restored.interruptMission(u);assert.equal(restored.tribe(1).wood,70);
 const raw=encodeGame(g);raw.state.units.find(u=>u.trade).tradeReservation.amount=999;
 assert.throws(()=>decodeGame(raw),/damaged/);
 const legacy=encodeGame(g);delete legacy.state.units.find(u=>u.trade).tradeReservation;assert.doesNotThrow(()=>decodeGame(legacy));
});

 test('selected armed citizens can carry a contract without automatic routes taking stationed guards',()=>{
 const g=fixture(),u=g.state.units[0];u.selected=true;g.tribe(0).spears=1;g.tribe(0).bows=0;g.tribe(0).blades=0;
 const health=u.hp;assert.equal(g.callToArms(),1);assert.equal(u.type,'spearman');
 assert.equal(eligibleTradeCarrier(g,u),true);assert.equal(eligibleTradeCarrier(g,u,true),false);assert.equal(tradeCarrier(g),u);
 assert.equal(g.dispatchTrade(u,{...deal,getAmt:5},1),true);finishTradeLoading(g,u,240);assert.equal(u.hp,health);assert.equal(g.tribe(0).spears,0);
 const restored=decodeGame(encodeGame(g)),saved=restored.state.units.find(p=>p.id===u.id);assert.equal(saved.militia,true);assert.equal(saved.tradeReservation,undefined);assert.deepEqual(saved.procurement,{minimum:5});
 const hall=g.state.buildings[1],spot=g.interactionSpot(u,hall);u.x=spot.x;u.z=spot.z;
 // Exercise the real simulation dispatcher: military AI used to swallow the shipment.
 g.state.paused=false;g.step(.1);assert.equal(u.trade,null);assert.equal(u.carryType,'wood');assert.ok(u.carry>=5);const purchased=u.carry;assert.equal(u.type,'spearman');
 for(let i=0;i<1200&&u.carry;i++){g.navBudget=10;g.state.time+=.1;g.workerAI(u,.1);}
 assert.equal(u.carry,0);assert.equal(g.tribe(0).wood,100+purchased);assert.equal(u.militia,true);assert.equal(g.tribe(0).spears,0);
 g.standDown();assert.equal(u.type,'worker');assert.equal(g.tribe(0).spears,1);
 });

test('an armed carrier fights a nearby raider, then resumes the reserved shipment with the same weapon',()=>{
 const g=legacyFixture(true),u=g.state.units[0];u.selected=true;
 g.spawnUnit('spearman',u.x+3,u.z,3);const enemy=g.state.units.at(-1);g.vision.fill(2);
 assert.equal(emergencyResponse(g,u,.1),true);assert.equal(u.order,'attack');assert.equal(u.target,enemy);assert.equal(u.emergency.autoArmed,false);
 enemy.hp=0;g.state.time+=11;emergencyResponse(g,u,.1);
 assert.equal(u.order,'trade');assert.equal(u.militia,true);assert.equal(u.carry,20);assert.equal(u.carryType,'food');assert.equal(g.tribe(0).spears,0);assert.ok(u.tradeReservation);
});
