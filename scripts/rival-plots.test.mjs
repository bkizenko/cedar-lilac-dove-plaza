import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {developRivalPlots,rivalCanInvest} from '../src/game/rivalDevelopment.ts';
import {BUILDINGS} from '../src/game/constants.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(type='warehouse'){
 const g=new Game();g.reset(123456,6);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 for(const kind of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[kind]=[];
 g.state.buildings=[g.makeBld('townhall',0,40,1)];g.state.weather='clear';g.state.time=200;
 Object.assign(g.tribe(1),{food:3000,wood:500,seeds:30,stone:40,cultivated:['grain']});
 for(let i=0;i<10;i++)g.spawnUnit('worker',8+i%3,45+Math.floor(i/3),1);
 const b=g.makeBld(type,30,40,1);g.state.buildings.push(b);g.rebuildWalk();return {g,b};
}
function finish(g,b){for(let i=0;i<3000&&b.expansion;i++){g.state.time+=.1;g.navBudget=10;for(const u of g.state.units)if(u.order==='build'&&u.node===b)g.buildAI(u,.1);}}
test('rival store expansions require actual payment and labor and retain their old capacity until complete',()=>{
 const {g,b}=fixture(),cap=g.stockCap(1),wood=g.tribe(1).wood;
 assert.equal(developRivalPlots(g,1),true);assert.ok(b.expansion);assert.equal(b.expansion.paid,false);
 assert.equal(g.stockCap(1),cap);assert.equal(g.tribe(1).wood,wood);assert.equal(rivalCanInvest(g,1,'warehouse'),false);
 assert.equal(developRivalPlots(g,1),false);finish(g,b);
 assert.equal(b.expansion,undefined);assert.equal(b.w,BUILDINGS.warehouse.w*2);assert.equal(g.tribe(1).wood,wood-60);assert.equal(g.stockCap(1),cap+200);
 const copy=decodeGame(encodeGame(g));assert.equal(copy.state.buildings.find(n=>n.id===b.id).w,b.w);
});
test('rival fields preserve their crop and farm seed reserve while enlarging',()=>{
 const {g,b}=fixture('farm');g.stockCap=()=>100000;b.crop={year:1,planted:1,tended:1,remaining:120,ripened:true};
 assert.equal(developRivalPlots(g,1),true);finish(g,b);assert.equal(b.expansion,undefined);
 assert.equal(b.w,BUILDINGS.farm.w*2);assert.equal(b.crop.remaining,120);assert.equal(b.crop.planted,.5);assert.equal(g.tribe(1).seeds,26);
});
test('rival expansions respect material shortages, obstruction and team ownership',()=>{
 const {g,b}=fixture();g.tribe(1).wood=0;assert.equal(developRivalPlots(g,1),false);
 g.tribe(1).wood=500;g.state.trees=[{id:g.id(),x:30,z:40,amount:20}];assert.equal(developRivalPlots(g,1),false);
 g.state.trees=[];assert.equal(developRivalPlots(g,0),false);assert.equal(b.expansion,undefined);
});
test('automatic builders cannot steal a paid copper trial or planting task',()=>{
 const {g,b}=fixture();for(const u of g.state.units.slice(2)){u.jobLock=true;u.order='gather';}const [a,c]=g.state.units;
 a.copperStudy={workplace:999,progress:10,paused:true};c.plantingWork={treeId:999,progress:1};
 assert.equal(developRivalPlots(g,1),true);assert.notEqual(a.order,'build');assert.notEqual(c.order,'build');
 assert.equal(a.copperStudy.progress,10);assert.equal(c.plantingWork.progress,1);
});
