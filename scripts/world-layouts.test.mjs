import test from 'node:test';import assert from 'node:assert/strict';
import {landforms} from '../src/game/landforms.ts';
import {generateWorld,sampleHeight} from '../src/game/worldgen.ts';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {trailCell,wearTrail,pathPace} from '../src/game/trails.ts';
function components(land,size){const n=128,grid=new Uint8Array(n*n),sizes=[];
 for(let z=0;z<n;z++)for(let x=0;x<n;x++)grid[z*n+x]=Number(land.distance((x/n-.5)*size,(z/n-.5)*size)>8);
 for(let i=0;i<grid.length;i++){if(!grid[i])continue;const q=[i];grid[i]=0;let k=0;
 while(k<q.length){const a=q[k++],x=a%n,z=Math.floor(a/n);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,j=zz*n+xx;if(xx<0||zz<0||xx>=n||zz>=n||!grid[j])continue;grid[j]=0;q.push(j);}}
 if(q.length>50)sizes.push(q.length);}return sizes.sort((a,b)=>b-a);}
test('landmass families have different topology rather than variations of one circular island',()=>{
 for(const seed of [123456,42,9876]){
  const p=components(landforms(seed,{layout:'pangaea',size:1560}),1560),c=components(landforms(seed,{layout:'continents',size:1560}),1560),a=components(landforms(seed,{layout:'archipelago',size:1560}),1560);
  assert.equal(p.length,1,`${seed} pangaea`);assert.equal(c.length,2,`${seed} continents`);assert.ok(a.length>=6,`${seed} archipelago ${a.length}`);
 }
});
test('new world generation is deterministic, densely wooded and gives every rival an actual dry site',()=>{
 for(const layout of ['pangaea','continents','archipelago']){
  const w=generateWorld(123456,7,{layout,size:1560}),copy=generateWorld(123456,7,{layout,size:1560});
  assert.deepEqual(copy.heights,w.heights);assert.deepEqual(copy.trees,w.trees);assert.equal(w.options.layout,layout);assert.equal(w.size,1560);
  assert.ok(w.trees.length>3000&&w.trees.length<5000);assert.ok(w.camps.length>=3&&w.camps.length<=5);assert.ok(w.heights.every(Number.isFinite));
  for(const c of w.camps){assert.ok(sampleHeight(w.heights,c.x,c.z,w.size)>w.waterY+.5);assert.ok(Math.abs(c.x)<w.size/2-20&&Math.abs(c.z)<w.size/2-20);}
  assert.equal(new Set(w.trees.map(t=>t.id)).size,w.trees.length);
 }
});
test('saved large worlds keep their dimensions, exact terrain, forests and outer-map navigation',()=>{
 const g=new Game();g.reset(42,7,{layout:'continents',size:2080});g.enterIsland();
 assert.equal(g.world.size,2080);assert.ok(g.state.units.some(u=>Math.abs(u.x)>520||Math.abs(u.z)>520));
 const own=g.state.units.find(u=>u.team===0);g.stampVision(own.x,own.z,30);assert.equal(g.exploredAt(own.x,own.z),true);assert.equal(g.canStep(own,own.x,own.z),true);
 const raw=encodeGame(g),copy=decodeGame(raw);assert.equal(copy.world.size,2080);assert.deepEqual(copy.world.options,g.world.options);assert.deepEqual(copy.world.heights,g.world.heights);assert.deepEqual(copy.state.trees,g.state.trees);
 assert.equal(copy.world.size**2/1040**2,4);raw.state.worldOptions.size=99999;assert.throws(()=>decodeGame(raw));
 const invalid=encodeGame(g);invalid.state.worldOptions.layout='circle';assert.throws(()=>decodeGame(invalid));
});
test('trails and work connectivity use the larger world coordinates',()=>{
 const g=new Game();g.reset(123456,7,{layout:'pangaea',size:1560});g.enterIsland();
 const c=g.campOf(0);assert.ok(g.workBoard.connected(g,c.x,c.z,c.x+8,c.z));
 assert.notEqual(trailCell(700,0,1560),-1);assert.equal(trailCell(700,0),-1);
 for(let i=0;i<40;i++)wearTrail(g,700,0,1,0);assert.ok(pathPace(g,700,0)>1);
});

test('new terrain contains actual highlands, a level plateau, a wet lake and sea inlets',()=>{
 for(const layout of ['pangaea','continents','archipelago']){
  const w=generateWorld(123456,7,{layout,size:1560}),feature=kind=>w.features.find(f=>f.kind===kind),height=p=>sampleHeight(w.heights,p.x,p.z,w.size);
  assert.equal(new Set(w.features.map(f=>f.kind)).size,6);
  assert.ok(height(feature('lake'))<w.waterY);assert.ok(height(feature('bay'))<w.waterY);assert.ok(height(feature('cove'))<w.waterY);
  const shelf=feature('plateau');assert.ok(height(shelf)>12);assert.ok(Math.abs(height(shelf)-height({x:shelf.x+8,z:shelf.z}))<2);
  const peak=feature('mountain-range');let max=0;
  for(let z=-peak.radius;z<=peak.radius;z+=8)for(let x=-peak.radius;x<=peak.radius;x+=8)max=Math.max(max,height({x:peak.x+x,z:peak.z+z}));
  assert.ok(max>25);assert.ok(height(feature('valley'))<max);
  for(const p of w.rivers[0].pts)assert.ok(height(p)<w.waterY+.15,'outlet channel remains water instead of a raised ford block');
 }
});
