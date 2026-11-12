import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {wellSite,watermillSite,windmillSite,aqueductRoute,canalRoute,cisternCatchment,nearestFreshWater,WATER_WORKS_RULES as R} from '../src/game/waterWorks.ts';

function world(seed,layout){const g=new Game();g.reset(seed,18,{size:1040,layout});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);return g;}
const worlds=[world(4,'pangaea'),world(2,'archipelago'),world(7,'continents')];
const dry=(g,x,z)=>g.height(x,z)>g.waterAt(x,z)+.02;
function* lattice(g,step=20){for(let z=-480;z<=480;z+=step)for(let x=-480;x<=480;x+=step)if(dry(g,x,z))yield [x,z];}

test('native wells: every world has fresh hand-dug sites; the dig reaches the dry-season table, which never stands above the ground; brackish coasts and deep uplands are refused',()=>{
  for(const g of worlds){let ok=0,deep=0,salt=0;
    for(const [x,z] of lattice(g)){const w=wellSite(g,x,z);
      if(!w.issues.length){ok++;assert.ok(w.fresh&&w.depthMetres<=R.well.maxDepthMetres);assert.ok(w.tableMetres<=g.height(x,z)+.01,'the table is under the ground');assert.ok(w.depthMetres>=R.well.minDepthMetres);
        assert.ok(Math.abs(Math.max(R.well.minDepthMetres,g.height(x,z)-w.tableMetres+.18)-w.depthMetres)<.02);assert.ok(w.digWorkSeconds>=18);}
      if(w.issues.some(i=>i.includes('deeper')))deep++;if(!w.fresh)salt++;}
    assert.ok(ok>100,`wells ${ok}`);assert.ok(deep>0&&salt>0);}
});

test('native watermills: the wheel stands in the river, the house on dry bank; overshot wheels have a real fall',()=>{
  for(const g of worlds){let ok=0,inWater=0,over=0;
    for(const [x,z] of lattice(g)){const m=watermillSite(g,x,z);if(m.issues.length)continue;ok++;
      if(g.height(m.wheel.x,m.wheel.z)<g.waterAt(m.wheel.x,m.wheel.z))inWater++;
      if(m.wheelType==='overshot'){over++;assert.ok(m.headMetres>=R.watermill.overshotHeadMetres);}else assert.ok(m.widthMetres>=R.watermill.minWidthMetres);
      assert.ok(m.wheel.distanceMetres<=R.watermill.searchMetres);}
    assert.ok(ok>50,`mills ${ok}`);assert.ok(inWater/ok>.9,`wheel in water ${inWater}/${ok}`);assert.ok(over>0);}
});

test('native windmills: exposed rises with an open horizon exist on every world, and sheltered hollows are refused',()=>{
  for(const g of worlds){let ok=0,sheltered=0;
    for(const [x,z] of lattice(g)){const w=windmillSite(g,x,z);if(!w.issues.length){ok++;assert.ok(w.exposureMetres>=R.windmill.minExposureMetres&&w.horizonRadians<=R.windmill.maxHorizonRadians);}else if(w.issues.includes('Higher ground shelters the sails'))sheltered++;}
    assert.ok(ok>=3,`windmills ${ok}`);assert.ok(sheltered>ok);}
});

test('native aqueducts and canals: feasibility follows the real profile; cuts and arcades are measured, labour is never free',()=>{
  let feasible=0,tried=0;
  for(const g of worlds)for(const b of g.world.waterBodies||[]){const src=b.kind==='lake'?{x:b.x,z:b.z}:b.pts[0];
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2,t={x:src.x+Math.sin(a)*200,z:src.z+Math.cos(a)*200};if(Math.abs(t.x)>500||Math.abs(t.z)>500||!dry(g,t.x,t.z))continue;
      const s=nearestFreshWater(g,src.x,src.z,60);if(!s)continue;const r=aqueductRoute(g,s,t);tried++;
      if(r.feasible){feasible++;assert.ok(r.fallMetres>=r.lengthMetres*R.aqueduct.minGrade);assert.ok(r.maxCutMetres<=R.aqueduct.maxCutMetres&&r.maxArcadeMetres<=R.aqueduct.maxArcadeMetres);}
      else assert.ok(r.issues.length>0);
      if(r.cutLengthMetres>0)assert.ok(r.cutWorkSeconds>0);}}
  assert.ok(tried>40&&feasible>0,`aqueducts ${feasible}/${tried}`);
  // a canal across a strip of land between two waters on the archipelago
  const g=worlds[1];let canal=null;
  outer:for(let z=-460;z<=460;z+=10)for(let x=-460;x<=420;x+=10){if(dry(g,x,z))continue;for(let L=12;L<=40;L+=4){if(dry(g,x+L,z))continue;let land=0;for(let k=4;k<L;k+=4)if(dry(g,x+k,z))land++;if(land>=2){const r=canalRoute(g,{x,z},{x:x+L,z});if(r.feasible&&r.landMetres>0){canal=r;break outer;}}}}
  assert.ok(canal,'a feasible native canal');assert.ok(canal.digWorkSeconds>0&&Math.abs(canal.digWorkSeconds-canal.digCubicMetres*6)<1);assert.ok(Math.abs(canal.locks-Math.ceil(Math.max(0,canal.levelDifferenceMetres-R.canal.levelToleranceMetres)/R.canal.lockRiseMetres))<=1);
  const onLand=[...lattice(g)][0];assert.equal(canalRoute(g,{x:onLand[0],z:onLand[1]},{x:onLand[0]+30,z:onLand[1]}).feasible,false,'a canal must start in water');
});

test('native cistern catchment: a hollow gathers more runoff than a summit',()=>{
  const g=worlds[0];let top=null,low=null;
  for(const [x,z] of lattice(g,40)){const h=g.height(x,z);if(!top||h>top.h)top={x,z,h};}
  const summit=cisternCatchment(g,top.x,top.z);assert.ok(summit.cells<=9,`summit gathers ${summit.cells} cells`);
  for(const [x,z] of lattice(g,40)){const c=cisternCatchment(g,x,z);if(!low||c.cells>low.cells)low={x,z,...c};if(low.cells>60)break;}
  assert.ok(low.cells>summit.cells*4);assert.equal(low.seasonalLitres,low.catchmentSquareMetres*R.cistern.runoffLitresPerSquareMetreSeason);
});
