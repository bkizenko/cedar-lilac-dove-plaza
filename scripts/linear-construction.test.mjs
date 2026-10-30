import test from 'node:test';import assert from 'node:assert/strict';
import {constructionLine,placeConstructionLine} from '../src/game/linearConstruction.ts';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
test('lines form bounded adjoining sections in either direction',()=>{
 for(const end of [{x:20,z:2},{x:-20,z:2},{x:2,z:20},{x:2,z:-20}]){
 const line=constructionLine({x:0,z:0},end);assert.equal(line.length,6);
 for(let i=1;i<line.length;i++)assert.equal(Math.hypot(line[i].x-line[i-1].x,line[i].z-line[i-1].z),4);
 }assert.equal(constructionLine({x:0,z:0},{x:1000,z:0}).length,32);
});
test('wall drag spends finite timber, leaves unpaid plans, and survives saves',()=>{
 const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[];g.state.units=[];g.state.trees=[];g.state.forage=[];g.vision.fill(2);g.tribe(0).wood=13;g.rebuildWalk();
 assert.equal(placeConstructionLine(g,'palisade',{x:0,z:0},{x:16,z:0}),5);
 assert.equal(g.tribe(0).wood,1);assert.equal(g.state.buildings.filter(b=>b.plannedCost).length,3);
 assert.equal(decodeGame(encodeGame(g)).state.buildings.length,5);
});
test('an obstruction stops the line instead of moving sections or leaving gaps',()=>{
 const placed=[];const g={placementValid:(_,x)=>x<8,placeBuilding:(_,x)=>{placed.push(x);return true},banner(){}};
 assert.equal(placeConstructionLine(g,'stonewall',{x:0,z:0},{x:20,z:0}),2);assert.deepEqual(placed,[0,4]);
});

test('diagonal drags follow both axes with full-edge joins and no duplicate cells',()=>{
 for(const end of [{x:20,z:20},{x:-20,z:12},{x:8,z:-20}]){
  const line=constructionLine({x:0,z:0},end);assert.deepEqual(line.at(-1),end);
  assert.equal(new Set(line.map(p=>`${p.x},${p.z}`)).size,line.length);
  for(let i=1;i<line.length;i++){
   const dx=Math.abs(line[i].x-line[i-1].x),dz=Math.abs(line[i].z-line[i-1].z);
   assert.equal(dx+dz,4);assert.equal(dx*dz,0);
  }
 }
 assert.deepEqual(constructionLine({x:0,z:0},{x:NaN,z:2}),[]);
 assert.equal(constructionLine({x:0,z:0},{x:1000,z:1000}).length,32);
});
test('bent palisades use real plans and keep every section in saved games',()=>{
 const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[];g.state.units=[];g.state.trees=[];g.state.forage=[];g.vision.fill(2);g.tribe(0).wood=100;g.rebuildWalk();
 const line=constructionLine({x:0,z:0},{x:12,z:12});
 assert.equal(placeConstructionLine(g,'palisade',{x:0,z:0},{x:12,z:12}),line.length);
 assert.equal(g.tribe(0).wood,100-line.length*6);
 assert.deepEqual(decodeGame(encodeGame(g)).state.buildings.map(b=>({x:b.x,z:b.z})),line);
});
