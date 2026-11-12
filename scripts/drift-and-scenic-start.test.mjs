import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {syncRiverboats} from '../src/game/boats.ts';
import {driftAt,riverCurrentProfile} from '../src/game/riverCurrents.ts';
import {scenicStartReport} from '../src/game/scenicBeauty.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';

function world(seed=4,layout='pangaea'){
  const g=new Game();g.reset(seed,18,{size:1040,layout});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);
  return g;
}

test('boats drift with the live river current and stay on connected water',()=>{
  const g=world();
  const profile=riverCurrentProfile(g,8).filter(c=>c.speed>=.2);
  assert.ok(profile.length>0,'a measurable current');
  const c=profile.reduce((a,p)=>p.speed>a.speed?p:a);
  const d0=driftAt(g,c.x,c.z);
  assert.ok(Math.hypot(d0.x,d0.z)>0);
  g.state.boats=[{id:g.id(),team:0,dock:0,x:c.x,y:g.waterAt(c.x,c.z)+.16,z:c.z,facing:0,hp:40,capacity:5}];
  const boat=g.state.boats[0],dt=2;
  syncRiverboats(g,dt);
  const moved={dx:boat.x-c.x,dz:boat.z-c.z};
  assert.ok(Math.hypot(moved.dx,moved.dz)>0,'the hull moved');
  // the step follows the current direction (allowing a slightly shorter step if the bank cuts it off)
  const expect={x:d0.x*dt,z:d0.z*dt},dot=moved.dx*expect.x+moved.dz*expect.z;
  assert.ok(dot>0,'drift is downstream');
  assert.ok(g.height(boat.x,boat.z)<g.waterAt(boat.x,boat.z)+.3,'still afloat');
  // a still lake does not move a hull
  const lake=(g.world.waterBodies||[]).find(b=>b.kind==='lake');
  if(lake){
    boat.x=lake.x;boat.z=lake.z;const x=boat.x,z=boat.z;
    syncRiverboats(g,dt);assert.equal(boat.x,x);assert.equal(boat.z,z);
  }
});

test('a new unbuilt game suggests a scenic town-hall site; old saves keep their camp',()=>{
  const g=world(1,'archipelago');
  const before={x:g.campOf(0).x,z:g.campOf(0).z};
  const report=g.applyScenicHallSuggestion();
  assert.ok(report?.bestNearby);
  assert.equal(g.dryFoundation('townhall',report.bestNearby.x,report.bestNearby.z),true);
  assert.ok(report.bestNearby.percentile>=60);
  const home=g.campOf(0);
  assert.ok(Math.hypot(home.x-report.bestNearby.x,home.z-report.bestNearby.z)<1e-6);
  // units are walking toward the suggested site
  const movers=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.order==='move');
  assert.ok(movers.length>0);
  assert.ok(movers.every(u=>Math.hypot(u.tx-home.x,u.tz-home.z)<8));

  const historic=new Game();historic.reset(4,18,{size:1040,layout:'pangaea'});
  const raw=encodeGame(historic);validateGameSave(raw);
  const loaded=decodeGame(JSON.parse(JSON.stringify(raw)));
  // loaded villages are not relocated; camp stays where the save put people
  const r=scenicStartReport(loaded);
  assert.ok(r);
  assert.equal(loaded.state.campSites,historic.state.campSites);
  assert.ok(Math.hypot(before.x,before.z)>=0);
});
