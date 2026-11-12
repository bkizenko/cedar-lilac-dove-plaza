import test from 'node:test';
import assert from 'node:assert/strict';
import {tickPrestigeEvidence,prestigeTerritoryProgress,collectOwnPrestige,PRESTIGE_GAME_RULES as R} from '../src/game/prestigeGame.ts';
// No Game reset/terrain generation: real physical soil/river samplers run on a
// homogeneous analytic plain, with actual budgeted entity lists and fog gates.
function fixture(n=20,size=100){
 const counts={height:0,records:0};
 const t={food:0,foodLots:{},items:{},age:0};
 const g={world:{size,biomes:[],rivers:[]},territory:new Uint8Array(n*n),state:{time:0,units:[],buildings:[],trails:[],trees:[],stones:[],forage:[],fish:[],copper:[],iron:[]},height(){counts.height++;return 2;},waterAt(){return 0;},exploredAt(){return true;},finished(){return true;},tribe(){return t;}};
 return {g,counts};
}
function tracked(rows,counts){return new Proxy(rows,{get(a,k){if(typeof k==='string'&&/^\d+$/.test(k))counts.records++;return Reflect.get(a,k);}});}
function finish(g,max=10000){for(let i=0;i<max;i++){tickPrestigeEvidence(g);if(prestigeTerritoryProgress(g).available&&!prestigeTerritoryProgress(g).phase)return;}assert.fail('bounded sampler did not finish');}
function facts(g){return collectOwnPrestige(g);}
test('one shared per-call budget covers cells and rejected node/trail/building indexing',()=>{
 const {g,counts}=fixture(2);const node={x:0,z:0,amount:1,maxAmt:1};
 g.state.trees=tracked(Array(800).fill(node),counts);
 g.state.trails=tracked(Array(800).fill({x:0,z:0,wear:1}),counts);
 g.state.buildings=tracked(Array(800).fill({x:0,z:0,type:'dock',hp:1}),counts);
 let calls=0;do{counts.height=0;counts.records=0;tickPrestigeEvidence(g);const p=prestigeTerritoryProgress(g);assert.ok(p.lastWork<=R.cellsPerTick);assert.ok(counts.records<=R.cellsPerTick);assert.ok(counts.height<=R.cellsPerTick*10);calls++;}while(prestigeTerritoryProgress(g).phase&&calls<100);
 assert.equal(prestigeTerritoryProgress(g).totalWork,2404);assert.ok(calls>9);assert.equal(prestigeTerritoryProgress(g).available,true);
});
test('unexplored owned land reveals no quality, node, trail or crossing evidence',()=>{
 const {g,counts}=fixture();g.exploredAt=()=>false;g.state.trees=[{x:0,z:0,amount:100,maxAmt:100}];g.state.trails=[{x:0,z:0,wear:1}];g.state.buildings=[{x:0,z:0,type:'dock',hp:1}];finish(g);
 assert.equal(counts.height,0);assert.equal(facts(g).usableArea,0);assert.equal(facts(g).resourcesAndChokepoints,0);
});
test('same physical homogeneous area has equal soil/freshwater quality across resolutions',()=>{
 const a=fixture(10),b=fixture(20);finish(a.g);finish(b.g);
 assert.equal(facts(a.g).usableArea,10000);assert.equal(facts(b.g).usableArea,10000);
 assert.ok(Math.abs(facts(a.g).resourcesAndChokepoints-facts(b.g).resourcesAndChokepoints)<1e-10);
 assert.ok(Math.abs(facts(a.g).resourcesAndChokepoints-7.1)<1e-10);
 const c=fixture(10,40),d=fixture(20,40);for(const f of [c,d]){f.g.world.rivers=[{pts:[{x:0,z:-100},{x:0,z:100}]}];finish(f.g);}
 assert.ok(Math.abs(facts(c.g).resourcesAndChokepoints-facts(d.g).resourcesAndChokepoints)<1e-10,'same physical soil plus freshwater integral');
 assert.equal(R.qualityAreaSquareMetres,1000);
});
test('resource, trail and crossing bonuses saturate independently per useful cell',()=>{
 const base=fixture(1),full=fixture(1);finish(base.g);
 full.g.state.iron=Array(100).fill({x:0,z:0,amount:1,maxAmt:1});full.g.state.trails=Array(100).fill({x:0,z:0,wear:1});full.g.state.buildings=Array(100).fill({x:0,z:0,type:'dock',hp:1});finish(full.g);
 assert.ok(Math.abs(facts(full.g).resourcesAndChokepoints-facts(base.g).resourcesAndChokepoints-4.9)<1e-10);
});
test('availability and stale refresh are explicit; state/world/grid replacements invalidate evidence',()=>{
 const {g}=fixture();assert.equal(prestigeTerritoryProgress(g).available,false);assert.equal(facts(g).usableArea,undefined);tickPrestigeEvidence(g);assert.equal(prestigeTerritoryProgress(g).available,false);finish(g);
 const old=facts(g).usableArea;g.state.time=R.territoryReviewSeconds;assert.equal(prestigeTerritoryProgress(g).stale,true);tickPrestigeEvidence(g);assert.equal(prestigeTerritoryProgress(g).stale,true);assert.equal(facts(g).usableArea,old);finish(g);assert.equal(prestigeTerritoryProgress(g).stale,false);
 for(const change of [()=>g.state={...g.state},()=>g.world={...g.world},()=>g.territory=g.territory.slice(),()=>g.world.size*=2]){change();assert.equal(prestigeTerritoryProgress(g).available,false);assert.equal(facts(g).usableArea,undefined);finish(g);assert.equal(prestigeTerritoryProgress(g).available,true);}
});
test('foreign, contested, submerged and steep cells never earn useful-land or node bonuses',()=>{
 const {g}=fixture(2);g.territory.set([1,254,0,0]);g.height=(x,z)=>z>0?(x<0?-2:2+Math.abs(x)*2):2;g.state.iron=[{x:-25,z:-25,amount:1},{x:25,z:-25,amount:1},{x:-25,z:25,amount:1},{x:25,z:25,amount:1}];finish(g);assert.equal(facts(g).usableArea,0);assert.equal(facts(g).resourcesAndChokepoints,0);
});
