import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {settleRiverInflows} from '../src/game/riverProfiles.ts';
import {landformCoherence} from '../src/game/landformCoherence.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

test('only rivers that end inside a lake are raised to its surface, without mutating the input',()=>{
  const lake={kind:'lake',id:'l',x:0,z:0,rx:20,rz:20,surfaceY:10};
  const inflow={kind:'river',id:'in',width:5,pts:[{x:-60,z:0,y:10.6},{x:-30,z:0,y:10.2},{x:-10,z:0,y:9.8}]};
  const outflow={kind:'river',id:'out',width:5,pts:[{x:0,z:0,y:10},{x:30,z:0,y:9.6}]};
  const far={kind:'river',id:'far',width:5,pts:[{x:0,z:90,y:3},{x:0,z:120,y:1}]};
  const input=[lake,inflow,outflow,far],copy=JSON.parse(JSON.stringify(input));
  const {bodies,raised}=settleRiverInflows(input);
  assert.deepEqual(input,copy);assert.equal(raised,1);
  assert.deepEqual(bodies[1].pts.map(p=>p.y),[10.6,10.2,10]);assert.equal(bodies[2],outflow);assert.equal(bodies[3],far);
  const ys=bodies[1].pts.map(p=>p.y);for(let i=1;i<ys.length;i++)assert.ok(ys[i]<=ys[i-1]);
});

const world=(seed,layout,flag)=>{const g=new Game();g.reset(seed,18,{size:1040,layout,...(flag?{riverProfileVersion:2}:{})});return g;};

test('flagged worlds have no rising or dead-end rivers where the historic world had one',()=>{
  for(const [seed,layout] of [[3,'pangaea'],[4,'archipelago'],[2,'continents']]){
    const old=landformCoherence(world(seed,layout,false).world).rivers,now=landformCoherence(world(seed,layout,true).world).rivers;
    assert.ok(old.some(r=>r.rises>0),`${layout} ${seed} historic defect present (preserved for old saves)`);
    for(const r of now){assert.equal(r.rises,0,`${layout} ${seed} r${r.index}`);assert.notEqual(r.mouth,'dead-end');}
  }
});

test('the flag is saved with the world and old saves without it load the historic world unchanged',()=>{
  const flagged=world(3,'pangaea',true);assert.equal(flagged.state.worldOptions.riverProfileVersion,2);
  const back=decodeGame(JSON.parse(JSON.stringify(encodeGame(flagged))));
  assert.equal(back.world.options.riverProfileVersion,2);assert.deepEqual(back.world.waterBodies,flagged.world.waterBodies);
  const plain=world(3,'pangaea',false),plainBack=decodeGame(JSON.parse(JSON.stringify(encodeGame(plain))));
  assert.equal(plainBack.world.options.riverProfileVersion,undefined);assert.deepEqual(plainBack.world.waterBodies,plain.world.waterBodies);
  assert.deepEqual(Array.from(plainBack.world.heights),Array.from(plain.world.heights));
  assert.notDeepEqual(plain.world.waterBodies,flagged.world.waterBodies);
});
