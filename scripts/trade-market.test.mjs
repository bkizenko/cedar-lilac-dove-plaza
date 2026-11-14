import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {marketPrices,scarcity,tickTradeParties,tradeParties,openTradeOffers,acceptTradeOffer,declineTradeOffer,arrivalChance,tradeReputation,recordTradeAttack,reviewForeignArrivals,TRADE_PARTY_RULES,dispatchTradeExpedition,validTradePartyState} from '../src/game/tradeParties.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {endowSettlementSites} from './helpers/endowed-settlement-sites.mjs';
function fixture(){const g=new Game();g.reset(123456,3);g.enterIsland();g.state.units=[];g.state.buildings=[];
 for(const [team,z] of [[0,-60],[1,60]]){g.state.buildings.push(g.makeBld('townhall',0,z,team));g.spawnUnit('worker',4,z,team);}
 for(const b of g.state.buildings)b.build=1;
 Object.assign(g.tribe(0),{wood:100,food:100,stone:30});Object.assign(g.tribe(1),{food:100,wood:5,stone:90,trust:.5,hostile:false});
 endowSettlementSites(g,0,1);return g;}
function arrive(g){const p=reviewForeignArrivals;let q;for(let i=0;i<80&&!q;i++){g.state.time=i*TRADE_PARTY_RULES.arrivalReviewSeconds;q=p(g);}
 g.state.tradeArrivalSlot=Math.floor(g.state.time/TRADE_PARTY_RULES.arrivalReviewSeconds);for(let t=0;t<q.travel+2&&q.phase==='outbound';t++)tickTradeParties(g,1);return q;}
test('prices follow local scarcity',()=>{
 assert.ok(scarcity(0,'wood')>scarcity(200,'wood'));
 const g=fixture(),p=marketPrices(g,1);assert.ok(p.wood>p.stone*0.6&&p.wood/1.2>p.stone/2.2,'scarce wood dearer than surplus stone');
 g.tribe(1).stone=0;assert.ok(marketPrices(g,1).stone>p.stone);
});
test('visiting traders offer surplus goods, finite stock, accept moves goods physically',()=>{
 const g=fixture(),stone1=g.tribe(1).stone,q=arrive(g);
 assert.equal(q.phase,'trading');assert.ok(q.offer&&q.offer.status==='open');assert.equal(q.offer.sell,'stone');
 assert.equal(g.tribe(1).stone,stone1-q.offer.sellAmt,'goods carried by the party leave the society');
 const o=q.offer,w=g.tribe(0)[o.buy],s=g.tribe(0)[o.sell],rep=tradeReputation(g,1);
 assert.equal(acceptTradeOffer(g,q.id).accepted,true);
 assert.equal(g.tribe(0)[o.buy],w-o.buyAmt);assert.ok(g.tribe(0)[o.sell]>=s+o.sellAmt-0);
 assert.ok(tradeReputation(g,1)>rep);assert.equal(openTradeOffers(g).length,0);
 const before=g.tribe(1)[o.buy];for(let t=0;t<TRADE_PARTY_RULES.tradeSeconds+q.travel+5;t++)tickTradeParties(g,1);
 assert.equal(g.tribe(1)[o.buy],before+o.buyAmt,'payment reaches them only when the party is home');
});
test('decline and expiry return the goods',()=>{
 for(const act of ['decline','expire']){const g=fixture(),stone1=g.tribe(1).stone,q=arrive(g);
  if(act==='decline')assert.ok(declineTradeOffer(g,q.id));
  for(let t=0;t<TRADE_PARTY_RULES.offerSeconds+q.travel*2+10&&tradeParties(g).includes(q);t++)tickTradeParties(g,1);
  assert.equal(g.tribe(1).stone,stone1);assert.equal(q.offer.status,act==='decline'?'declined':'expired');}
});
test('frequency rises with surplus and port; attack costs reputation and withdraws offers',()=>{
 const g=fixture();g.tribe(1).stone=30;g.tribe(1).food=100;const base=arrivalChance(g,[1]);g.tribe(1).stone=400;assert.ok(arrivalChance(g,[1])>base);
 const b2=arrivalChance(g,[1]);g.state.buildings.push(Object.assign(g.makeBld('dock',10,-50,0),{build:1}));assert.ok(arrivalChance(g,[1])>b2);
 const h=fixture(),q=arrive(h);acceptTradeOffer(h,q.id);const r=tradeReputation(h,1);recordTradeAttack(h,1);assert.ok(tradeReputation(h,1)<r);
 const k=fixture(),q2=arrive(k);recordTradeAttack(k,1);assert.equal(q2.offer.status,'declined');assert.ok(tradeReputation(k,1)<0);
 k.tribe(1).hostile=false;
});
test('fair expedition raises reputation; old and new saves load',()=>{
 const g=fixture();assert.equal(dispatchTradeExpedition(g,1,'land','wood',20,'stone').accepted,true);
 for(let t=0;t<2000&&tradeParties(g).length;t++)tickTradeParties(g,1);assert.ok(tradeReputation(g,1)>0);
 const g2=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(tradeReputation(g2,1),tradeReputation(g,1));
 const old=JSON.parse(JSON.stringify(encodeGame(fixture())));delete old.state?.tradeRep;assert.ok(decodeGame(old));
 const bad=fixture();bad.state.tradeRep={1:5};assert.equal(validTradePartyState(bad.state),false);
 bad.state.tradeRep={1:.5};bad.state.tradeParties=[{version:1,id:1,kind:'foreign',mode:'land',team:1,x0:0,z0:0,x1:1,z1:1,phase:'trading',progress:0,travel:5,dwell:0,offer:{sell:'wood',sellAmt:1.5,buy:'food',buyAmt:1,status:'open'}}];
 assert.equal(validTradePartyState(bad.state),false);
});
