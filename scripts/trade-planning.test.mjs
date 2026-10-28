import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {sendProcurement,tradeCarrier,quoteShipment} from '../src/game/barter.ts';
import {tickTradeFocus} from '../src/game/tradePlanning.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {predisposition} from '../src/game/people.ts';
import {foodDemand} from '../src/game/settlement.ts';

function setup(){
  const g=new Game();g.reset(345,2);g.enterIsland();g.world.heights.fill(4);
  g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1)];
  g.state.units=[];for(let i=0;i<5;i++)g.spawnUnit('worker',3+i*2,49,0);
  g.state.forage=[];g.state.fish=[];g.state.trees=[];g.state.stones=[];g.state.wildlife=[];
  Object.assign(g.tribe(0),{food:240,wood:100,stone:0});
  Object.assign(g.tribe(1),{food:30,wood:200,stone:150,hostile:false,tradeCd:0,trust:.5,tension:0});
  g.state.time=100;g.vision.fill(2);g.rebuildWalk();return g;
}
function toMeeting(g,u){const h=g.state.buildings.find(b=>b.team===1);const p=g.interactionSpot(u,h);assert.ok(p);u.x=p.x;u.z=p.z;}
function walkHome(g,u){
  for(let i=0;i<2200&&u.carry>0;i++){g.state.time+=.1;g.navBudget=4;g.workerAI(u,.1);}
  assert.equal(u.carry,0,'the shipment actually reached storage');u.order='hold';
}

test('procurement learns terms at arrival and physically returns finite goods',()=>{
  const g=setup(),ours=g.tribe(0).food,theirs=g.tribe(1).wood;
  assert.equal(sendProcurement(g,1,'food','wood',20,5),true);
  const u=g.state.units.find(u=>u.procurement);assert.ok(u);
  assert.equal(g.tribe(0).food,ours-20);assert.equal(u.carry,20);
  assert.equal(g.tribe(1).wood,theirs);assert.equal(g.state.tradeReports,undefined,'no remote terms');
  toMeeting(g,u);const quote=quoteShipment(g,1,'food','wood',20,u).deal;assert.ok(quote);
  g.tradeAI(u,.1);assert.equal(u.carry,quote.getAmt);assert.equal(u.carryType,'wood');
  assert.equal(g.tribe(0).wood,100);assert.equal(g.tribe(1).wood+u.carry,theirs);
  assert.equal(g.state.tradeReports[0].time,g.state.time);assert.equal(u.procurement,undefined);
  const bought=u.carry;walkHome(g,u);assert.equal(g.tribe(0).wood,100+bought);
  g.workerAI(u,1);assert.equal(g.tribe(0).wood,100+bought,'delivered only once');
});

test('a minimum return is binding and a refused budget travels home without a remote refund',()=>{
  const g=setup(),before=g.tribe(0).food,theirs=g.tribe(1).wood;
  assert.equal(sendProcurement(g,1,'food','wood',20,200),true);
  const u=g.state.units.find(u=>u.procurement);toMeeting(g,u);g.tradeAI(u,.1);
  assert.equal(u.order,'return');assert.equal(u.carryType,'food');assert.equal(u.carry,20);
  assert.equal(g.tribe(0).food,before-20);assert.equal(g.tribe(1).wood,theirs);
  walkHome(g,u);assert.equal(g.tribe(0).food,before);
});

test('changed local needs, conflict and stolen budgets prevent the planned purchase',()=>{
  for(const failure of ['shortage','war','theft']){
    const g=setup();sendProcurement(g,1,'food','wood',20,5);const u=g.state.units.find(u=>u.procurement);
    if(failure==='shortage')g.tribe(1).wood=24;
    if(failure==='war')g.tribe(1).hostile=true;
    if(failure==='theft')u.carry=12;
    toMeeting(g,u);g.tradeAI(u,.1);assert.equal(u.order,'return');assert.equal(u.carryType,'food');
    assert.equal(u.carry,failure==='theft'?12:20);assert.equal(g.tribe(0).wood,100);
    walkHome(g,u);assert.equal(g.tribe(0).food,failure==='theft'?232:240);
  }
});

test('saved procurement preserves its budget and minimum; recall cancels the purchase and returns cargo',()=>{
  const g=setup();sendProcurement(g,1,'food','wood',20,12);
  const saved=decodeGame(encodeGame(g)),u=saved.state.units.find(u=>u.procurement);
  assert.deepEqual(u.procurement,{minimum:12});assert.equal(u.carry,20);assert.equal(saved.tribe(0).food,220);
  // Saves regenerate terrain from the seed; restore this fixture's artificial flat map.
  saved.world.heights.fill(4);saved.rebuildWalk();
  saved.soundRecall();assert.equal(u.procurement,undefined);assert.equal(u.recalled,true);
  walkHome(saved,u);assert.equal(saved.tribe(0).food,240);
  const invalid=encodeGame(g);invalid.state.units.find(u=>u.procurement).procurement.minimum=-1;
  assert.throws(()=>decodeGame(invalid),/damaged/);
});

test('trader selection favors skill but never steals an expedition, study, recall or crafting order',()=>{
  const g=setup();const ranked=[...g.state.units].sort((a,b)=>predisposition(b).trading-predisposition(a).trading);
  assert.equal(tradeCarrier(g,true),ranked[0]);
  ranked[0].expedition={food:10,forage:0,returning:false};ranked[1].studyCrop='grain';ranked[2].recalled=true;ranked[3].weaponWork={kind:'spear',progress:0,duration:20,workplace:g.state.buildings[0].id};
  assert.equal(tradeCarrier(g,true),ranked[4]);ranked[4].order='hold';assert.equal(tradeCarrier(g,true),undefined);
  ranked[4].selected=true;assert.equal(tradeCarrier(g),ranked[4],'an explicitly selected resting adult may be sent');
});

test('trade priority refreshes known offers with one real envoy, protects food and never buys unapproved goods',()=>{
  const g=setup();g.setLaborPriority('trade');const before=g.tribe(0).wood;
  tickTradeFocus(g);const envoys=g.state.units.filter(u=>u.envoy);assert.equal(envoys.length,1);
  assert.equal(g.state.tradeReports,undefined);assert.equal(g.tribe(0).wood,before);
  g.state.time+=21;tickTradeFocus(g);assert.equal(g.state.units.filter(u=>u.envoy).length,1);
  const u=envoys[0];toMeeting(g,u);g.workerAI(u,20);assert.ok(g.state.tradeReports[0]);
  assert.equal(g.tribe(0).wood,before);assert.equal(u.carry,0);
  const copy=decodeGame(encodeGame(g));assert.equal(copy.state.laborPolicy,'trade');
  const hungry=setup();hungry.tribe(0).food=5;hungry.setLaborPriority('trade');tickTradeFocus(hungry);assert.equal(hungry.state.units.some(u=>u.envoy),false);
  const unknown=setup();unknown.vision.fill(0);unknown.setLaborPriority('trade');tickTradeFocus(unknown);assert.equal(unknown.state.units.some(u=>u.envoy),false);
});

test('trading priority advances only approved route departures and retains paused routes',()=>{
  const g=setup();g.state.routes=[{id:1,team:1,rival:'Known community',give:'food',giveAmt:20,get:'wood',getAmt:8,interval:100,t:80},
    {id:2,team:1,rival:'Known community',give:'food',giveAmt:20,get:'wood',getAmt:8,interval:100,t:80,paused:true}];
  g.setLaborPriority('trade');assert.equal(g.state.routes[0].t,1);assert.equal(g.state.routes[1].t,80);
  g.tickRoutes(2);assert.ok(g.state.routes[0].workerId);assert.equal(g.state.routes[1].workerId,undefined);
});

test('loading a fully stolen current shipment cannot regenerate its budget',()=>{
  const g=setup();sendProcurement(g,1,'food','wood',4,1);const u=g.state.units.find(u=>u.procurement);
  u.carry=0;u.carryType=null;
  const raw=encodeGame(g);assert.equal(raw.cargoVersion,1);
  for(const marker of [true,false]){
    const copy=structuredClone(raw);if(!marker)delete copy.cargoVersion;
    const restored=decodeGame(copy),carrier=restored.state.units.find(p=>p.id===u.id);
    assert.equal(carrier.carry,0,'modern physical-cargo saves preserve the lost load even before the marker');
    restored.tradeAI(carrier,.1);assert.equal(carrier.carry,0);assert.equal(restored.tribe(0).food,236);
  }
});

test('legacy HUD trading and direct dispatch preserve an active expedition',()=>{
  const g=setup(),scout=g.state.units[0];scout.selected=true;scout.order='explore';
  scout.expedition={food:10,forage:0,returning:false};g.tradeTeam=1;
  const deal={give:'food',giveAmt:20,get:'wood',getAmt:8};
  assert.equal(g.dispatchTrade(scout,deal,1),false);
  g.tryTrade(deal);assert.equal(scout.order,'explore');assert.equal(scout.carry,0);assert.ok(scout.expedition);
  assert.ok(g.state.units.some(u=>u!==scout&&u.order==='trade'));
});

test('all automatic departures retain three home adults and the promised post-payment reserve',()=>{
  const g=setup();g.state.units.pop();
  const route=id=>({id,team:1,rival:'Known community',give:'food',giveAmt:20,get:'wood',getAmt:8,interval:100,t:0});
  g.state.routes=[route(1),route(2)];g.tickRoutes(1);
  assert.equal(g.state.units.filter(u=>u.order==='trade').length,1);
  const low=setup();low.state.units.pop();low.tribe(0).food=foodDemand(low)*415;
  low.state.routes=[route(1)];low.tickRoutes(1);
  assert.equal(low.state.units.some(u=>u.order==='trade'),false);
  assert.match(low.state.routes[0].status,/six minutes/);
});

test('a delegation walks to a real entrance, reports at its meeting, and returns home',()=>{
  const g=setup();assert.equal(g.sendDelegation(1,'trade'),true);
  const u=g.state.units.find(u=>u.envoy),home=g.state.buildings[0],foreign=g.state.buildings[1];
  let reported=false;
  for(let i=0;i<3000&&u.envoy;i++){
    g.state.time+=.1;g.navBudget=4;g.workerAI(u,.1);
    if(!reported&&g.state.tradeReports?.length){assert.ok(g.buildingWorkReached(u,foreign));reported=true;}
  }
  assert.equal(reported,true);assert.equal(u.envoy,undefined);assert.ok(g.buildingWorkReached(u,home));
});
