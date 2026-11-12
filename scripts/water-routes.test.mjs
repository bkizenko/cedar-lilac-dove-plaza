import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {aqueductRoute,canalRoute,nearestFreshWater,WATER_WORKS_RULES as R} from '../src/game/waterWorks.ts';
import {routeAqueduct,routeCanal,measureAqueduct,measureCanal} from '../src/game/waterRoutes.ts';

function world(seed,layout){const g=new Game();g.reset(seed,18,{size:1040,layout});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);return g;}
const worlds=[world(2,'archipelago'),world(7,'continents'),world(4,'pangaea')];
const dry=(g,x,z)=>g.height(x,z)>g.waterAt(x,z)+.02;

test('native aqueducts routed around terrain: more routes are feasible than straight lines, and every routed line meets the channel limits on the real ground',()=>{
  let straight=0,routed=0,tried=0;
  for(const g of worlds)for(const b of g.world.waterBodies||[]){const src=b.kind==='lake'?{x:b.x,z:b.z}:b.pts[0];
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2,t={x:src.x+Math.sin(a)*200,z:src.z+Math.cos(a)*200};if(Math.abs(t.x)>500||Math.abs(t.z)>500||!dry(g,t.x,t.z))continue;
      const s=nearestFreshWater(g,src.x,src.z,60);if(!s)continue;tried++;if(aqueductRoute(g,s,t).feasible)straight++;const r=routeAqueduct(g,s,t);if(!r.feasible)continue;routed++;
      assert.ok(r.maxCutMetres<=R.aqueduct.maxCutMetres+1e-6&&r.maxArcadeMetres<=R.aqueduct.maxArcadeMetres+1e-6);assert.ok(r.fallMetres>=r.lengthMetres*R.aqueduct.minGrade);
      assert.ok(r.lengthMetres>=Math.hypot(t.x-r.source.x,t.z-r.source.z)-1,'never shorter than the straight line');
      const again=measureAqueduct(g,r.line,r.source.surfaceMetres,0,r.grade);assert.equal(again.feasible,true);assert.deepEqual(r.line[r.line.length-1],t);
      if(r.cutLengthMetres>0)assert.ok(r.cutWorkSeconds>0);}}
  console.log(`aqueducts: ${tried} tried, straight ${straight}, routed ${routed}`);
  assert.ok(routed>straight,`routed ${routed} vs straight ${straight}`);
});

test('native canals routed around terrain: more water pairs can be joined (or are found already joined by water) than with straight cuts, within one dig and without embankments',()=>{
  let pairs=0,straight=0,routed=0,joined=0;
  for(const g of worlds.slice(0,2))for(let z=-460;z<=460;z+=20)for(let x=-460;x<=380;x+=20){if(dry(g,x,z))continue;
    for(let L=16;L<=80;L+=8){const bx=x+L;if(dry(g,bx,z))continue;let land=0;for(let k=4;k<L;k+=4)if(dry(g,x+k,z))land++;if(land<2)continue;
      pairs++;const s=canalRoute(g,{x,z},{x:bx,z});if(s.feasible)straight++;const r=routeCanal(g,{x,z},{x:bx,z});
      if(r.feasible&&r.alreadyJoinedByWater){joined++;assert.equal(r.digCubicMetres,0);}
      else if(r.feasible){routed++;assert.ok(r.landMetres>0);assert.ok(r.maxDigMetres<=R.canal.maxDigMetres+1e-6);assert.equal(measureCanal(g,r.line).feasible,true);assert.ok(Math.abs(r.digWorkSeconds-r.digCubicMetres*6)<1);}
      break;}}
  console.log(`canals: ${pairs} water pairs across land, straight ${straight}, routed canals ${routed}, already joined by water ${joined}`);
  assert.ok(pairs>20);assert.ok(routed>0);assert.ok(routed+joined>straight,`routed ${routed}+${joined} vs straight ${straight}`);
});

test('the router refuses what no route can do, and never routes through unexplored ground for the player',()=>{
  const g=world(2,'archipelago'),b=(g.world.waterBodies||[]).find(b=>b.kind==='lake');const s=nearestFreshWater(g,b.x,b.z,60);
  // a target far above the source cannot be fed by gravity
  let high=null;for(let z=-480;z<=480&&!high;z+=20)for(let x=-480;x<=480;x+=20)if(dry(g,x,z)&&g.height(x,z)>s.y+5&&Math.hypot(x-s.x,z-s.z)<300){high={x,z};break;}
  if(high)assert.equal(routeAqueduct(g,s,high).feasible,false);
  const fog=new Game();fog.reset(2,18,{size:1040,layout:'archipelago'});fog.enterIsland();fog.updateVision(0);
  const r=routeAqueduct(fog,s,{x:s.x+180,z:s.z});if(r.feasible)for(const p of r.line)assert.ok(fog.exploredAt(p.x,p.z));
});
