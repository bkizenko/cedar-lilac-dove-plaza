import assert from 'node:assert/strict';
import {supplyDrops,supplyApproach,supplyReached} from '../../src/game/campAnchor.ts';
/** Exercise the real unpaid pickup executor before tests isolate a foreign
 * meeting. No teleport, grants, clock/AI overrides or fake paid cargo. */
export function finishTradeLoading(g,u,expectedAvailable){
 const deal={...u.trade};assert.ok(deal.give&&deal.giveAmt>0,'an actual proposal exists');
 const before=g.tribe(0)[deal.give],seller=g.tribe(u.tradeTeam),sellerStock=seller[deal.get];
 if(u.tradeLoading){
  if(expectedAvailable!==undefined)assert.equal(before,expectedAvailable,'remote request has not withdrawn its budget');
  assert.equal(u.carry,0,'unpaid request does not materialize carried payment');
  for(let i=0;i<2000&&u.tradeLoading;i++){
   g.state.time+=.1;g.navBudget=8;g.tradeAI(u,.1);
   if(u.tradeLoading){assert.equal(g.tribe(0)[deal.give],before,'walking cannot debit remote stores');assert.equal(u.carry,0);}
   assert.equal(seller[deal.get],sellerStock,'loading does not buy or escrow seller goods');
  }
  assert.equal(u.tradeLoading,undefined,'the real carrier reaches an actual home cache');
  assert.equal(g.tribe(0)[deal.give],before-deal.giveAmt,'payment is withdrawn once at pickup');
 }
 assert.equal(u.order,'trade');assert.equal(u.carry,deal.giveAmt);assert.equal(u.carryType,deal.give);
 assert.ok(supplyDrops(g,0).some(drop=>{const at=supplyApproach(g,u,drop);return at&&supplyReached(g,u,drop,at);}), 'the loaded carrier is physically at a real cache');
 assert.equal(seller[deal.get],sellerStock);
}
