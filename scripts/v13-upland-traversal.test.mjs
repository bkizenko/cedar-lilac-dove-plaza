import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/game/sim.ts';
for(const seed of [42,1])test(`v13 resident physically reaches own-mainland uplands ${seed}`,()=>{
 const g=new Game();g.reset(seed,13,{size:1040,layout:'pangaea'});g.enterIsland();
 const resident=g.state.units.find(u=>u.team===0&&u.type==='worker'&&!u.maturesAt),w=g.world;
 const nearest=w.landscape.regions.map((c,i)=>({c,i,d:Math.hypot(c.x-resident.x,c.z-resident.z)})).sort((a,b)=>a.d-b.d)[0];
 const lake=w.waterBodies.find(b=>b.id===`land-${nearest.i}-primary-lake`),fall=w.waterfalls[nearest.i],c=nearest.c;
 const r=Math.hypot(lake.x-c.x,lake.z-c.z)/Math.hypot(.52,.26),len=Math.hypot(fall.dx,fall.dz),cs=fall.dx/len,sn=fall.dz/len;
 const endpoint={x:c.x+r*.70*cs+r*.72*sn,z:c.z+r*.70*sn-r*.72*cs};
 // A 4m navigation raster can place the algebraic ramp end on a cliff edge.
 // Search only its small high shelf neighborhood, retaining actual terrain.
 const candidates=[];for(let dx=-12;dx<=12;dx+=2)for(let dz=-12;dz<=12;dz+=2){const x=endpoint.x+dx,z=endpoint.z+dz;if(g.walkable(x,z)&&g.height(x,z)>resident.y+5)candidates.push({x,z,d:Math.hypot(dx,dz)});}
 const target=candidates.sort((a,b)=>a.d-b.d)[0];assert.ok(target,'a real high shelf destination exists by the ramp');
 const startingElevation=resident.y,start={x:resident.x,z:resident.z};resident.selected=true;g.issueMove(target.x,target.z);
 let traveled=0,maxStepHeight=0,steps=0,reissues=0;
 while(Math.hypot(resident.x-target.x,resident.z-target.z)>4&&steps++<20000){
  const x=resident.x,z=resident.z,y=resident.y;g.state.time+=.1;g.navBudget=10;g.workerAI(resident,.1);
  const moved=Math.hypot(resident.x-x,resident.z-z);assert.ok(moved<1,'actual walking without position jumps');traveled+=moved;maxStepHeight=Math.max(maxStepHeight,Math.abs(resident.y-y));
  // An actual archaeological pickup may physically deliver home. Resume only
  // after that real order completes; never mark finds collected or teleport.
  if(resident.order==='idle'&&Math.hypot(resident.x-target.x,resident.z-target.z)>4){g.issueMove(target.x,target.z);reissues++;}
 }
 console.log(JSON.stringify({seed,start,target,region:nearest.i,end:{x:resident.x,z:resident.z,y:resident.y},reason:resident.workReason,order:resident.order,tx:resident.tx,tz:resident.tz}));
 assert.ok(Math.hypot(resident.x-target.x,resident.z-target.z)<=4,`${seed}: ${resident.workReason}, remaining ${Math.hypot(resident.x-target.x,resident.z-target.z)}`);
 assert.ok(traveled>=Math.hypot(target.x-start.x,target.z-start.z)-4);assert.ok(maxStepHeight<=2.55);
 assert.ok(resident.y>startingElevation+5,'destination genuinely higher than starting basin');
 console.log(JSON.stringify({seed,region:nearest.i,travelSeconds:steps*.1,traveledMeters:traveled,heightGainMeters:resident.y-startingElevation,maxStepHeightMeters:maxStepHeight,ordersResumed:reissues,rampEndpointOffsetMeters:target.d}));
});
