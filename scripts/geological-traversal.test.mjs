import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/game/sim.ts';
test('residents physically walk from the starting basin onto uplands across three seeds',()=>{
 for(const seed of [42,9876,123456]){
  const g=new Game();g.reset(seed,11,{size:1040,layout:'pangaea'});g.enterIsland();
  // Ancient finds deliberately replace move orders with a delivery home. Mark
  // those finds visited so this check isolates the physical upland route.
  for(let i=0;i<g.world.megaliths.length;i++)g.looted.add(i);
  const w=g.world,r=w.landscape.primaryRadiusMeters,c=w.landscape.regions[0],fall=w.waterfalls[0],len=Math.hypot(fall.dx,fall.dz),cs=fall.dx/len,sn=fall.dz/len;
  const u=r*.70,v=-r*.72,target={x:c.x+u*cs-v*sn,z:c.z+u*sn+v*cs};
  const resident=g.state.units.find(u=>u.team===0&&u.type==='worker');resident.selected=true;
  assert.ok(g.walkable(target.x,target.z),'actual upland destination walkable');
  const start={x:resident.x,z:resident.z},startTime=g.state.time;
  g.issueMove(target.x,target.z);let steps=0,traveled=0,maxStepHeight=0;
  while(Math.hypot(resident.x-target.x,resident.z-target.z)>4&&steps++<20000){
   const x=resident.x,z=resident.z,y=resident.y;g.state.time+=.1;g.navBudget=10;g.workerAI(resident,.1);
   const moved=Math.hypot(resident.x-x,resident.z-z);assert.ok(moved<1,'movement remains physical, without a positional jump');
   traveled+=moved;maxStepHeight=Math.max(maxStepHeight,Math.abs(resident.y-y));
  }
  assert.ok(Math.hypot(resident.x-target.x,resident.z-target.z)<=4,`${seed}: ${resident.workReason}, distance ${Math.hypot(resident.x-target.x,resident.z-target.z)}`);
  assert.ok(traveled>=Math.hypot(target.x-start.x,target.z-start.z)-4);assert.ok(maxStepHeight<=2.55);
  console.log(JSON.stringify({seed,travelSeconds:g.state.time-startTime,traveledMeters:traveled,maxStepHeightMeters:maxStepHeight,maxApproachGrade:w.landscape.geometry.uplandApproachMaxGrade,gentleDesignTargetMet:w.landscape.geometry.uplandApproachGentleTargetMet}));
 }
});
