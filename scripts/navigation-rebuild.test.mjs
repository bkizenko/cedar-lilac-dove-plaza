import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {HALF} from '../src/game/constants.ts';import {inBounds} from '../src/game/worldgen.ts';
function reference(g){const WALK=Math.sqrt(g.walk.length),WALK_CLEARANCE=.12;const result=new Uint8Array(WALK*WALK),cell=HALF*2/WALK;
 for(let iz=0;iz<WALK;iz++)for(let ix=0;ix<WALK;ix++){
  const x=-HALF+(ix+.5)*cell,z=-HALF+(iz+.5)*cell,h=g.travelHeight(x,z);
  let ok=h>=g.world.waterY+WALK_CLEARANCE&&inBounds(x,z,1.5);
  if(ok&&(Math.abs(h-g.travelHeight(x+cell,z))>2.45||Math.abs(h-g.travelHeight(x,z+cell))>2.45))ok=false;
  if(ok)for(const b of g.state.buildings){if(!g.solidBuilding(b))continue;if(Math.abs(b.x-x)<b.w*.4+.75&&Math.abs(b.z-z)<b.d*.4+.75){ok=false;break;}}
  result[iz*WALK+ix]=ok?1:0;
 }return result;}
test('footprint rasterization matches the old navigation grid exactly across water, plans and gate changes',()=>{
 const g=new Game();g.reset(4,3);g.enterIsland();
 for(let i=0;i<80;i++){const b=g.makeBld(i%3?'hut':'gate',-300+i%10*60,-250+Math.floor(i/10)*60,i%2);if(i%7===0)b.plannedCost={wood:40};if(b.type==='gate')b.gateOpen=i%2===0;g.state.buildings.push(b);}
 for(const level of [g.world.waterY,g.world.waterY+.7]){g.world.waterY=level;const start=performance.now();g.rebuildWalk();const optimized=performance.now()-start,oldStart=performance.now(),expected=reference(g),oldMs=performance.now()-oldStart;assert.deepEqual(g.walk,expected);console.log(JSON.stringify({buildings:g.state.buildings.length,optimizedMs:optimized,referenceMs:oldMs}));}
});
