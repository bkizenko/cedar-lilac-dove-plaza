import test from 'node:test';import assert from 'node:assert/strict';
import {sampleSite,SITE_SAMPLE_RULES as R} from '../src/game/siteSample.ts';
import {Game} from '../src/game/sim.ts';
const plane=(ax,az,c=10,water=0)=>({height:(x,z)=>c+ax*x+az*z,waterAt:()=>water});
test('a level dry site has no foundation, no grade and no wet samples',()=>{
 const s=sampleSite(plane(0,0),{x:3,z:-4,w:6,d:4});assert.equal(s.version,1);assert.equal(s.columns,4);assert.equal(s.rows,3);assert.equal(s.heights.length,12);
 assert.equal(s.foundationDepthMetres,0);assert.equal(s.maxGrade,0);assert.equal(s.wetFraction,0);assert.equal(s.biome,null);assert.equal(s.minimumDryClearanceMetres,10);
});
test('a slope reports footprint-true heights, grade, downhill direction and plinth depth without editing terrain',()=>{
 const g=plane(.25,0);const s=sampleSite(g,{x:0,z:0,w:8,d:4});
 assert.ok(Math.abs(s.foundationDepthMetres-2)<1e-6);assert.ok(Math.abs(s.maxGrade-.25)<1e-6);assert.ok(Math.abs(s.meanGrade-.25)<1e-6);
 assert.ok(Math.abs(Math.atan2(Math.sin(s.downhillRadians),Math.cos(s.downhillRadians))-(-Math.PI/2))<1e-6,'downhill is toward -X');
 assert.ok(Math.abs(s.heights[0]-9)<1e-6&&Math.abs(s.heights[s.columns-1]-11)<1e-6,'row-major from local -X to +X');
});
test('rotation turns the lattice with the footprint; the world-frame downhill direction stays fixed',()=>{
 const g=plane(.25,0),a=sampleSite(g,{x:0,z:0,w:8,d:2}),b=sampleSite(g,{x:0,z:0,w:8,d:2,rotation:Math.PI/2});
 assert.ok(Math.abs(b.foundationDepthMetres-.5)<1e-6,'long axis now runs along Z, short axis across the slope');assert.ok(Math.abs(a.foundationDepthMetres-2)<1e-6);
 assert.ok(Math.abs(Math.cos(b.downhillRadians)-Math.cos(a.downhillRadians))<1e-6&&Math.abs(Math.sin(b.downhillRadians)-Math.sin(a.downhillRadians))<1e-6);
});
test('wet samples and bounded lattice size',()=>{
 const s=sampleSite(plane(.25,0,0,0),{x:0,z:0,w:4,d:4});assert.ok(s.wetFraction>0&&s.wetFraction<1);assert.ok(s.minimumDryClearanceMetres<0);
 const big=sampleSite(plane(0,0),{x:0,z:0,w:500,d:500});assert.equal(big.columns,R.maximumSamplesPerAxis+1);assert.equal(big.rows,R.maximumSamplesPerAxis+1);
});
test('native world: biome comes from the ecological province grid and the query is pure',()=>{
 const g=new Game();g.reset(345,18);g.enterIsland();const home=g.campOf(0),before=g.world.heights.slice();
 const s=sampleSite(g,{x:home.x+12,z:home.z,w:6,d:6});assert.ok(s.biome);const total=Object.values(s.biomeShares).reduce((a,b)=>a+b,0);assert.ok(Math.abs(total-1)<1e-9);
 assert.deepEqual(g.world.heights,before,'sampling never edits terrain');assert.ok(Number.isFinite(s.maxGrade)&&s.heights.every(Number.isFinite));
});
