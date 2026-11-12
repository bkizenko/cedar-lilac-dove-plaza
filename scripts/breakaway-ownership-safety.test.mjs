import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {mulberry32} from '../src/game/rng.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {foundSocietyFromBreakaway} from '../src/game/societyBreakaway.ts';
import {ensureSkins} from '../src/game/skinState.ts';
import {COMMITTED_TASKS} from '../src/game/workCommitments.ts';
function fixture(){
 const g=new Game();g.reset(5,10,{rulersVersion:2});g.enterIsland();
 const pt=g.tribe(1),home=g.state.buildings.find(b=>b.team===1&&b.type==='townhall')??g.makeBld('townhall',g.campOf(1).x,g.campOf(1).z,1);if(!g.state.buildings.includes(home))g.state.buildings.push(home);
 const hall=g.makeBld('townhall',home.x+160,home.z,1),house=g.makeBld('hut',hall.x+8,hall.z+8,1);g.state.buildings.push(hall,house);
 const people=Array.from({length:6},(_,i)=>{const u=g.spawnUnit('worker',hall.x+i,hall.z+3,1);u.homeHall=hall.id;u.order='hold';return u;});
 (g.state.communities??=[]).push({hall:hall.id,team:1,name:'Far Hearth',founded:0,emptySince:null,status:'thriving'});return{g,pt,hall,house,people};
}
test('breakaway leaves finite weapons/seeds at parent, drops untransferred provenance/obligations and preserves skin slots through strict reload',()=>{
 const random=Math.random;Math.random=mulberry32(0x5151);
 try{
  const{g,pt,hall}=fixture();Object.assign(pt,{food:10.5,foodLots:{bread:6.25,fish:4.25},spears:23,bows:13,blades:7,seeds:91,items:{pottery:4},potteryOrigins:[],basketOrigins:[],peaceTerm:'tribute',peaceOffer:{from:1,term:'whitePeace',expires:g.state.time+10},tributeUntil:g.state.time+20,tribute:{amount:3,remaining:6,next:g.state.time+2,owed:3,paid:0},nextPeaceOffer:g.state.time+10});
  const skins=ensureSkins(g.state),prior=structuredClone(skins.slots),n=g.state.tribes.length,stock={spears:pt.spears,bows:pt.bows,blades:pt.blades,seeds:pt.seeds};
  assert.equal(foundSocietyFromBreakaway(g,hall.id),n);const daughter=g.tribe(n);
  for(const[k,v]of Object.entries({bread:6.25,fish:4.25}))assert.ok(Math.abs((pt.foodLots[k]||0)+(daughter.foodLots[k]||0)-v)<1e-9);assert.equal(daughter.foodLots.provisions,0);assert.ok(Math.abs(pt.food+daughter.food-10.5)<1e-9);assert.ok(Math.abs(daughter.food-Object.values(daughter.foodLots).reduce((a,b)=>a+b,0))<1e-9);
  for(const[k,v]of Object.entries(stock)){assert.equal(pt[k],v);assert.equal(daughter[k],0);assert.equal(pt[k]+daughter[k],v);}
  for(const k of['items','potteryOrigins','basketOrigins','peaceOffer','peaceTerm','tributeUntil','tribute','nextPeaceOffer'])assert.equal(daughter[k],undefined,k);
  for(const[k,v]of Object.entries(prior))assert.deepEqual(g.state.skins.slots[k],v);
  const newSkin=g.state.skins.slots[String(n)];assert.ok(newSkin);assert.ok(!Object.values(prior).some(s=>s.id===newSkin.id));ensureSkins(g.state);assert.deepEqual(g.state.skins.slots[String(n)],newSkin);
  const saved=encodeGame(g);validateGameSave(saved);const back=decodeGame(saved);assert.equal(JSON.stringify(back.state.skins),JSON.stringify(g.state.skins));for(const[k,v]of Object.entries(stock))assert.equal(back.tribe(1)[k]+back.tribe(n)[k],v);
 }finally{Math.random=random;}
});
test('every selected actor commitment including paused work refuses breakaway before any mutation',()=>{
 const random=Math.random;Math.random=mulberry32(0x5151);
 try{
  const{g,hall,people}=fixture(),u=people[0];
  for(const key of COMMITTED_TASKS){const old=u[key];u[key]={paused:true,phase:'paused',workplace:hall.id};const before=JSON.stringify(g.state);assert.equal(foundSocietyFromBreakaway(g,hall.id),null,key);assert.equal(JSON.stringify(g.state),before,key+' refuses atomically');if(old===undefined)delete u[key];else u[key]=old;}
 }finally{Math.random=random;}
});
test('paid actorless workplace, owned assets, livestock, boats and prepared sites stay attached atomically',()=>{
 const random=Math.random;Math.random=mulberry32(0x5151);
 try{
  const{g,hall,people,house}=fixture();
  const checks=[
   ()=>{g.state.production={version:1,projects:[{id:900001,team:1,recipe:'cookMeat',workplace:hall.id,actorId:null,phase:'paused'}],metrics:{}};return()=>delete g.state.production;},
   ()=>{g.state.armor={version:1,assets:[{id:900002,team:1,holder:{kind:'unit',id:people[0].id}}]};return()=>delete g.state.armor;},
   ()=>{g.state.farmToolCargo={version:1,tools:[{team:1,holder:{kind:'cache',buildingId:hall.id}}]};return()=>delete g.state.farmToolCargo;},
   ()=>{g.state.livestock=[{team:1,pen:house.id,x:house.x,z:house.z}];return()=>delete g.state.livestock;},
   ()=>{g.state.boats=[{team:1,dock:hall.id,x:hall.x,z:hall.z}];return()=>delete g.state.boats;},
   ()=>{house.sitePreparation={version:1};return()=>delete house.sitePreparation;},
   ()=>{people[0].farmToolWork={paused:true,workplace:house.id};return()=>delete people[0].farmToolWork;},
  ];
  for(const setup of checks){const restore=setup(),before=JSON.stringify(g.state);assert.equal(foundSocietyFromBreakaway(g,hall.id),null);assert.equal(JSON.stringify(g.state),before);restore();}
 }finally{Math.random=random;}
});
