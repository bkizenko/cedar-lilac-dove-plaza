import assert from 'node:assert/strict';
/** Explicit scenario starting assets/history, before the dispatch under test.
 * Does not flatten terrain, move a dispatched actor, invent a raid boat or
 * intercept executors. Camp reports represent the fixture's prior patrol. */
export function prepareFiniteRaid(g,target=g.state.buildings.find(b=>b.team===0&&g.finished(b)&&['warehouse','townhall'].includes(b.type))){
 if(!target){const home=g.campOf(0),site=g.findDryFoundation('warehouse',home.x+12,home.z,30);assert.ok(site,'native player store foundation');target=g.makeBld('warehouse',site.x,site.z,0);g.state.buildings.push(target);g.rebuildWalk();}
 g.state.time=Math.max(1500,g.state.time);g.state.conflict='balanced';
 const walker=g.state.units.find(u=>u.team===0&&u.hp>0);assert.ok(walker);
 let spot;
 for(const r of [48,56,64,40])for(let i=0;i<24&&!spot;i++){
  const a=i*Math.PI/12;
  spot=g.findDryFoundation('hut',target.x+Math.cos(a)*r,target.z+Math.sin(a)*r,5,(x,z)=>g.walkable(x,z)&&g.workBoard.connected(g,walker.x,walker.z,x,z));
 }
 assert.ok(spot,'native connected camp foundation');
 const camp=g.makeBld('hut',spot.x,spot.z,3);camp.raiderCamp=true;g.state.buildings.push(camp);g.rebuildWalk();
 const crew=[];
 for(const angle of [0,Math.PI]){
  const at=g.interactionSpot(walker,camp);assert.ok(at,'real camp frontage');
  const u=g.spawnUnit('spearman',at.x,at.z,3);u.homeCamp=camp.id;u.order='hold';crew.push(u);
 }
 Object.assign(g.tribe(3),{food:100,foodLots:{provisions:100}});if(g.tribe(3).survival)g.tribe(3).survival.waterLiters=30;
 camp.campEconomy={version:1,knownSites:[{version:1,campId:camp.id,siteId:target.id,team:0,x:target.x,z:target.z,observedAt:g.state.time}],lastDispatchAt:g.state.time-121,departures:0,returns:0,lost:0,foodPaid:0,waterPaid:0,foodUsed:0,waterUsed:0};
 return {camp,crew,target};
}
export function destructiveFixtureIntent(party){for(const u of party){u.seaRaid.plan.intent='destructive';u.seaRaid.plan.selectedIntent='destructive';u.seaRaid.plan.reason='Explicit destructive raid executor scenario';}}
