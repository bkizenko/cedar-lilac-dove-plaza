/** Explicit INITIAL historical site-knowledge endowment for economic fixtures.
 * This is not runtime observation, and must never be called after a scenario
 * starts. Dedicated causality tests obtain facts through real walking people. */
export function endowSettlementSites(g,observer,partner){
 const witness=g.state.units.find(u=>u.team===observer&&u.hp>0);if(!witness)throw Error('Initial site endowment needs a historical witness ID');
 for(const h of g.state.buildings.filter(b=>b.type==='townhall'&&g.finished(b)&&b.team!==observer&&b.team!==3&&(partner===undefined||b.team===partner))){
  const fact={version:1,observer,owner:h.team,siteId:h.id,x:h.x,z:h.z,observedAt:g.state.time,witnessId:witness.id,active:true};
  g.state.observedSettlements=(g.state.observedSettlements||[]).filter(m=>!(m.observer===observer&&m.siteId===h.id));g.state.observedSettlements.push(fact);
 }
}
