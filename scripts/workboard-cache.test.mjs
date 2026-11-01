import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkBoard } from '../src/game/settlement.ts';

function fixture() {
  const building = {id:1,type:'hut',x:0,z:0,w:10,d:10,hp:100,solid:true};
  const g = {world:{size:100},state:{time:0,buildings:[building],tribes:[]},solidBuilding:b=>b.solid&&b.hp>0};
  return {g,building,board:new WorkBoard()};
}
function refresh(g,board) { g.state.time+=1.1; board.refresh(g); }
function reference(labels,n,size,x,z) {
  const cx=Math.floor((x+size/2)/size*n),cz=Math.floor((z+size/2)/size*n);
  let best=0,distance=Infinity;
  for(let dz=-4;dz<=4;dz++)for(let dx=-4;dx<=4;dx++) {
    const ix=cx+dx,iz=cz+dz;
    if(ix<0||ix>=n||iz<0||iz>=n)continue;
    const label=labels[iz*n+ix],d=dx*dx+dz*dz;
    if(label&&d<distance){best=label;distance=d;}
  }
  return best;
}
test('component fastpath preserves original nearest-component and tie semantics',()=>{
  const board=new WorkBoard(),n=13,g={world:{size:100},walk:new Uint8Array(n*n)};
  board.labels=Int32Array.from({length:n*n},(_,i)=>i%7===0?0:(i%3)+1);
  for(let z=-60;z<=60;z+=2.5)for(let x=-60;x<=60;x+=2.5)
    assert.equal(board.component(g,x,z),reference(board.labels,n,100,x,z));
});
test('ordinary walkable center reads one label instead of scanning the neighborhood',()=>{
  const board=new WorkBoard(),g={world:{size:100},walk:new Uint8Array(100)};
  let reads=0;board.labels=new Proxy({55:3},{get:(target,key)=>{reads++;return target[key]||0;}});
  assert.equal(board.component(g,0,0),3);assert.equal(reads,1);
});
test('unchanged actual footprints reuse obstruction results across task refreshes',()=>{
  const {g,board}=fixture(),node={id:2,x:1,z:1,amount:20};
  refresh(g,board);assert.equal(board.blockedResource(node),true);
  const cached=board.obstructedResources.get(node);
  refresh(g,board);assert.equal(board.blockedResource(node),true);
  assert.equal(board.obstructedResources.get(node),cached);
  // HP/team/other state changes without changed solidity or footprint do not discard it.
  g.state.buildings[0].hp=80;g.state.buildings[0].team=2;
  refresh(g,board);assert.equal(board.obstructedResources.get(node),cached);
});
test('movement, size, solidity, insertion and removal invalidate exact obstruction outcomes',()=>{
  const {g,board,building}=fixture(),node={id:2,x:1,z:1,amount:20};
  refresh(g,board);assert.equal(board.blockedResource(node),true);
  building.x=20;refresh(g,board);assert.equal(board.blockedResource(node),false);
  building.w=100;refresh(g,board);assert.equal(board.blockedResource(node),true);
  building.solid=false;refresh(g,board);assert.equal(board.blockedResource(node),false);
  building.solid=true;refresh(g,board);assert.equal(board.blockedResource(node),true);
  g.state.buildings=[];refresh(g,board);assert.equal(board.blockedResource(node),false);
  g.state.buildings=[building];refresh(g,board);assert.equal(board.blockedResource(node),true);
});
test('world/state replacement, explicit reset and moved resource invalidate cached results',()=>{
  const {g,board}=fixture(),node={id:2,x:1,z:1,amount:20};
  refresh(g,board);assert.equal(board.blockedResource(node),true);
  let previous=board.obstructedResources;
  g.world={...g.world};refresh(g,board);assert.notEqual(board.obstructedResources,previous);
  board.blockedResource(node);previous=board.obstructedResources;
  g.state={...g.state,time:0};board.refresh(g);assert.notEqual(board.obstructedResources,previous);
  assert.equal(board.blockedResource(node),true);
  node.x=40;assert.equal(board.blockedResource(node),false);
  node.x=1;assert.equal(board.blockedResource(node),true);
  previous=board.obstructedResources;board.reset();refresh(g,board);
  assert.notEqual(board.obstructedResources,previous);assert.equal(board.blockedResource(node),true);
});
test('building and wildlife task eligibility and strict footprint edges retain old behavior',()=>{
  const {g,board}=fixture();refresh(g,board);
  assert.equal(board.blockedResource({type:'hut',x:0,z:0}),false);
  assert.equal(board.blockedResource({species:'deer',x:0,z:0}),false);
  assert.equal(board.blockedResource({x:4,z:0}),false);
  assert.equal(board.blockedResource({x:3.999,z:0}),true);
});
