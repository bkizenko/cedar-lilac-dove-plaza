import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {extensionOptions,extensionTerrainCheck,extensionFootprint,EXTENSION_RULES} from '../src/game/extensionFootprints.ts';

function settled(){const g=new Game();g.reset(7,18,{size:1040,layout:'continents'});g.enterIsland();g.testMode=true;g.revealMap=true;Object.assign(g.state,{raidT:1e6});
  for(let t=0;t<900;t+=1){g.state.paused=false;g.step(1);}g.updateVision(0);return g;}
const g=settled();
const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.z-b.z)<(a.d+b.d)/2;

test('native settled villages: passing extensions keep the building reachable, overlap nothing and sit within one step of the floor',()=>{
  const buildings=g.state.buildings.filter(b=>b.hp>0&&g.finished(b)&&b.type!=='trench');assert.ok(buildings.length>=20);
  let pass=0,refused=0;
  for(const b of buildings)for(const r of extensionOptions(g,b)){if(r.issues.length){refused++;continue;}pass++;
    assert.ok(r.foundation.stepMetres<=EXTENSION_RULES.foundationStepMetres);assert.ok(r.openApproachSides>=1);
    // the original footprint is kept inside the new one
    assert.ok(Math.abs(r.footprint.x-b.x)+b.w/2<=r.footprint.w/2+1e-9&&Math.abs(r.footprint.z-b.z)+b.d/2<=r.footprint.d/2+1e-9);
    for(const o of g.state.buildings)if(o.id!==b.id&&o.hp>0)assert.ok(!overlap(r.added,{x:o.x,z:o.z,w:o.w,d:o.d}),`${b.type} wing overlaps ${o.type}`);
    // apply for real, rebuild navigation: a resident can still reach the building
    const saved={x:b.x,z:b.z,w:b.w,d:b.d};Object.assign(b,{x:r.footprint.x,z:r.footprint.z,w:r.footprint.w,d:r.footprint.d});g.rebuildWalk();
    const u=g.state.units.find(u=>u.team===b.team&&u.hp>0);if(u)assert.ok(g.interactionSpot(u,b),`${b.type} still has an approach`);
    Object.assign(b,saved);g.rebuildWalk();}
  console.log(`extension options: ${pass} pass, ${refused} refused`);assert.ok(pass>10&&refused>10);
});

test('refusals: a neighbouring building, resources, a pending expansion and an oversize wing each block the side they affect',()=>{
  const b=g.state.buildings.find(b=>b.hp>0&&g.finished(b)&&b.type==='warehouse');assert.ok(b);
  const side=extensionOptions(g,b).find(r=>!r.issues.length);assert.ok(side,'a free side');
  const {added}=extensionFootprint(b,side.side,side.growMetres);
  const blocker=g.makeBld('hut',added.x,added.z,b.team);g.state.buildings.push(blocker);
  assert.ok(extensionTerrainCheck(g,b,side.side).issues.some(i=>i.startsWith('Too close')));g.state.buildings.pop();
  g.state.trees.push({x:added.x,z:added.z,y:g.height(added.x,added.z),amount:30,max:30,kind:'oak'});
  assert.ok(extensionTerrainCheck(g,b,side.side).issues.includes('Clear resources from the extension ground first'));g.state.trees.pop();
  b.expansion={w:b.w,d:b.d,progress:0,paid:false};assert.ok(extensionTerrainCheck(g,b,side.side).issues.includes('An expansion is already under way'));b.expansion=undefined;
  assert.deepEqual(extensionTerrainCheck(g,b,side.side).issues,[]);
  assert.ok(extensionTerrainCheck(g,b,side.side,{growMetres:b.w*5+b.d*5}).issues.some(i=>i.startsWith('At most')));
});
