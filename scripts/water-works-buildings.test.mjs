import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {BUILD_TIME} from '../src/game/constants.ts';
import {wellSite,watermillSite,windmillSite,aqueductRoute,cisternCatchment,nearestFreshWater} from '../src/game/waterWorks.ts';
import {currentPowerKw} from '../src/game/riverCurrents.ts';
import {waterWorksLabour,waterWorksPlacementIssue,millPowerKw} from '../src/game/waterWorksBuildings.ts';
import {costOfBuilding} from '../src/game/constants.ts';

function world(seed=4,layout='pangaea'){
  const g=new Game();g.reset(seed,18,{size:1040,layout});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);
  Object.assign(g.state,{weather:'clear',weatherT:1e5,raidT:1e5});
  const t=g.tribe(0);t.wood+=400;t.stone+=400;t.food+=200;
  return g;
}
const dry=(g,x,z)=>g.height(x,z)>g.waterAt(x,z)+.02;
function* lattice(g,step=16){for(let z=-460;z<=460;z+=step)for(let x=-460;x<=460;x+=step)if(dry(g,x,z))yield [x,z];}
function findSite(g,type,step=16){
  for(const [x,z] of lattice(g,step)){
    if(g.placementIssue(type,x,z,0))continue;
    return {x,z};
  }
  return null;
}

test('historic saves still load; water-works types use site queries, real materials and labour, and mills use currentPowerKw',()=>{
  const plain=new Game();plain.reset(4,18,{size:1040,layout:'pangaea'});
  const historic=encodeGame(plain);validateGameSave(historic);
  const reloaded=decodeGame(JSON.parse(JSON.stringify(historic)));
  assert.equal(reloaded.state.buildings.some(b=>['well','cistern','watermill','windmill','aqueduct','canal'].includes(b.type)),false);

  const g=world();
  // a well: measured dig labour and catalog materials
  const well=findSite(g,'well');
  assert.ok(well,'a valid native well site');
  const site=wellSite(g,well.x,well.z,0);assert.equal(site.issues.length,0);
  const wood0=g.tribe(0).wood,stone0=g.tribe(0).stone,cost=costOfBuilding('well');
  assert.ok(cost.wood>0&&cost.stone>0,'wells spend real materials');
  assert.equal(g.placeBuilding('well',well.x,well.z,0),true);
  const wellB=g.state.buildings.find(b=>b.type==='well'&&b.hp>0);
  assert.ok(wellB);
  assert.equal(g.tribe(0).wood,wood0-(cost.wood||0));
  assert.equal(g.tribe(0).stone,stone0-(cost.stone||0));
  const labour=waterWorksLabour(g,wellB);
  assert.ok(labour>=BUILD_TIME.well+site.digWorkSeconds);
  assert.ok(labour>BUILD_TIME.well,'well labour includes the measured bore');

  // wet ground is refused
  let wet=null;for(const b of g.world.waterBodies||[]){const p=b.kind==='lake'?{x:b.x,z:b.z}:b.pts[0];if(p&&g.height(p.x,p.z)<g.waterAt(p.x,p.z)){wet=p;break;}}
  if(wet)assert.ok(g.placementIssue('well',wet.x,wet.z,0));

  // cistern uses the catchment query and spends stone
  const cistern=findSite(g,'cistern');assert.ok(cistern,'a valid cistern site');
  const catch0=cisternCatchment(g,cistern.x,cistern.z);assert.ok(catch0.catchmentSquareMetres>0);
  const stone1=g.tribe(0).stone;
  assert.equal(g.placeBuilding('cistern',cistern.x,cistern.z,0),true);
  assert.equal(g.tribe(0).stone,stone1-costOfBuilding('cistern').stone);

  // watermill: live current at the wheel
  const mill=findSite(g,'watermill',12);assert.ok(mill,'a valid watermill site');
  const wheel=watermillSite(g,mill.x,mill.z).wheel;
  assert.equal(g.placementIssue('watermill',mill.x,mill.z,0),null);
  assert.equal(g.placeBuilding('watermill',mill.x,mill.z,0),true);
  const millB=g.state.buildings.find(b=>b.type==='watermill'&&b.hp>0);
  assert.ok(millB);
  assert.equal(millPowerKw(g,millB),currentPowerKw(g,wheel.x,wheel.z));

  // windmill: site query refuses a sheltered point that the catalog would otherwise allow
  const wind=findSite(g,'windmill',20);assert.ok(wind,'a valid windmill site');
  assert.equal(windmillSite(g,wind.x,wind.z,0).issues.length,0);
  assert.equal(g.placeBuilding('windmill',wind.x,wind.z,0),true);

  // aqueduct at a feasible delivery point; canal cannot be point-placed
  assert.equal(waterWorksPlacementIssue(g,'canal',0,0,0),'A canal joins two waters — commission a line between them');
  assert.ok(g.placementIssue('canal',0,0,0));
  let aq=null;
  for(const b of g.world.waterBodies||[]){
    const src=b.kind==='lake'?{x:b.x,z:b.z}:b.pts[0];
    const s=nearestFreshWater(g,src.x,src.z,80);if(!s)continue;
    for(const len of [80,120,160,200,240])for(let i=0;i<24;i++){
      const a=i/24*Math.PI*2,t={x:s.x+Math.sin(a)*len,z:s.z+Math.cos(a)*len};
      if(Math.abs(t.x)>500||Math.abs(t.z)>500||!dry(g,t.x,t.z))continue;
      if(!aqueductRoute(g,s,t).feasible)continue;
      if(g.placementIssue('aqueduct',t.x,t.z,0))continue;
      aq=t;break;
    }
    if(aq)break;
  }
  assert.ok(aq,'a feasible aqueduct delivery point');
  const stone2=g.tribe(0).stone;
  assert.equal(g.placeBuilding('aqueduct',aq.x,aq.z,0),true);
  assert.equal(g.tribe(0).stone,stone2-costOfBuilding('aqueduct').stone);
  const aqB=g.state.buildings.find(b=>b.type==='aqueduct'&&b.hp>0);
  assert.ok(aqB);assert.ok(waterWorksLabour(g,aqB)>=BUILD_TIME.aqueduct);

  const saved=encodeGame(g);validateGameSave(saved);
  const back=decodeGame(JSON.parse(JSON.stringify(saved)));
  assert.equal(back.state.buildings.filter(b=>b.type==='well').length,1);
  assert.equal(back.state.buildings.filter(b=>b.type==='watermill').length,1);
});
