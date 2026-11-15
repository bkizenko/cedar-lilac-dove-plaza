globalThis.__legacyCereal=true;
import test from'node:test';import assert from'node:assert/strict';
import{Game}from'../src/game/sim.ts';import{beginProduction,productionAI}from'../src/game/production.ts';
import {supplyDrops} from '../src/game/campAnchor.ts';
function fixture(){const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.state.units=[];g.state.buildings=[];for(const k of['trees','stones','forage','fish','copper','iron','wildlife'])g.state[k]=[];g.state.autoWorkEnabled=false;g.state.conflict='quiet';g.state.time=950;g.state.weather='clear';g.state.weatherT=10000;g.state.visitorTimer=900;g.state.raidT=10000;g.state.encounter=undefined;for(const t of g.state.tribes)t.thinkT=10000;g.state.campSites=[{team:0,x:0,z:30}];Object.assign(g.tribe(0),{food:1000,foodLots:{provisions:1000},wood:100,stone:100,items:{straw:4000,chaff:4000}});g.tribe(0).survival.waterLiters=100;g.state.buildings=[g.makeBld('townhall',0,30,0),g.makeBld('warehouse',-16,30,0)];for(const b of g.state.buildings)b.y=4;g.rebuildWalk();g.vision.fill(2);const people=[];for(let i=0;i<5;i++){const u=g.spawnUnit('worker',i*.15,36,0);u.order='hold';u.jobLock=false;u.y=4;people.push(u);}return{g,people};}
function addSite(g,type,x,z){const b=g.makeBld(type,x,z,0);b.y=4;g.state.buildings.push(b);g.rebuildWalk();return b;}
function advancePaid(g,u,p,until){for(let i=0;i<3000&&!until();i++){g.state.time+=.1;g.navBudget=4;productionAI(g,u,.1);}assert.ok(until(),JSON.stringify({p,u:{x:u.x,z:u.z,reason:u.workReason}}));}
test('a carrier with no reachable cache sets finished goods down after a grace period instead of standing forever',()=>{
 const{g,people}=fixture();g.tribe(0).items.plantFibre=4;const b=addSite(g,'hearth',12,30),u=people[0];
 assert.equal(beginProduction(g,'twistCordageHand',b.id,u.id),true);const p=g.state.production.projects.at(-1);
 advancePaid(g,u,p,()=>p.phase==='returning');
 g.state.buildings=g.state.buildings.filter(x=>x.id===b.id);g.state.campSites=[];g.rebuildWalk();
 g.interactionSpot=()=>null;
 assert.equal(supplyDrops(g,0).filter(d=>g.interactionSpot(u,d)).length,0);
 const before=g.tribe(0).items.cordage||0;
 advancePaid(g,u,p,()=>p.phase==='complete');
 assert.equal((g.tribe(0).items.cordage||0)-before,4);
});
