import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {biasReportsToStops,raidersTargetStops,setRaidersTargetStops,setWaystationsEnabled,validWaystations,waystationsEnabled} from '../src/game/waystations.ts';
import {routesEnabled} from '../src/game/routeWear.ts';

const fresh=()=>{const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});g.enterIsland();return g;};
const stop=(g,x,z,stage=2)=>{const w=(g.state.waystations??={version:1,enabled:true,raidBias:true,nextId:1,stations:[],sustain:{},clock:{plan:0,work:0,use:0}});
 w.stations.push({id:w.nextId++,team:0,corridor:1,x,z,stage,form:'timber',hp:1,built:0,store:{food:10,wood:0},water:false,visits:0,nights:0,sheltered:0,income:0,raided:0,lastRaidAt:0});};
const rep=(siteId,x,z)=>({version:1,campId:1,siteId,team:0,x,z,observedAt:0});

test('no stops: reports keep their observed order',()=>{
 const g=fresh();const r=[rep(1,0,0),rep(2,50,50)];assert.deepEqual(biasReportsToStops(g,r),r);
});
test('a report beside a built stop is raided first; unbuilt sites do not count; order is deterministic',()=>{
 const g=fresh();stop(g,200,200);stop(g,-300,0,0);
 const r=[rep(1,0,0),rep(2,-290,0),rep(3,220,210)];
 const a=biasReportsToStops(g,r).map(x=>x.siteId),b=biasReportsToStops(g,r).map(x=>x.siteId);
 assert.deepEqual(a,[3,1,2]);assert.deepEqual(a,b);
});
test('switches: off by default for saves without raidBias, off when waystations are off',()=>{
 const g=fresh();stop(g,200,200);const r=[rep(1,0,0),rep(3,220,210)];
 assert.equal(raidersTargetStops(g),true);
 g.state.waystations.raidBias=undefined;assert.equal(raidersTargetStops(g),false);assert.deepEqual(biasReportsToStops(g,r),r);
 setRaidersTargetStops(g,true);setWaystationsEnabled(g,false);assert.deepEqual(biasReportsToStops(g,r),r);
 assert.equal(validWaystations({waystations:{...g.state.waystations,raidBias:'yes'}}),false);
 assert.equal(validWaystations(g.state),true);
});
test('Menu command flips the real switches and is schema-valid',()=>{
 const g=fresh();stop(g,1,1);
 const c={kind:'set-route-switches',routes:true,waystations:false,raiders:false};assert.equal(isEngineDispatchCommand(c),true);
 assert.equal(isEngineDispatchCommand({kind:'set-route-switches',routes:'x'}),false);
 assert.equal(applyEngineCommand(g,c,{selectedUnitIds:[]}).accepted,true);
 assert.equal(waystationsEnabled(g),false);assert.equal(g.state.waystations.raidBias,false);assert.equal(routesEnabled(g),true);
 applyEngineCommand(g,{kind:'set-route-switches',routes:false},{selectedUnitIds:[]});assert.equal(routesEnabled(g),false);
});
