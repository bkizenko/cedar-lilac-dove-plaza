// Regression: a village with a ripe field and no storehouse must put the harvest down at its camp, not stall every picker
// holding 40 sheaves ("Material cache full; keeping the carried materials") while the village starves through its first winter.
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {answerEncounter} from '../src/game/encounters.ts';
import {planFieldArea,placeFieldArea} from '../src/game/fieldArea.ts';
import {testAction} from '../src/game/testing.ts';

test('first winter: bare Auto work with a field and no warehouse keeps food above zero and the population alive',{timeout:240000},()=>{
 const realRandom=Math.random;let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 try{
  const g=new Game();g.reset(20261115,undefined,{size:1040,layout:'continents'});g.enterIsland();g.state.conflict=g.state.conflict||'quiet';g.setAutoWork(true);
  const run=(to)=>{while(g.state.time<to&&!g.state.ended){if(g.state.encounter)answerEncounter(g,'greet');g.step(.34);}};
  run(60);const home=g.campOf(0);for(let x=-200;x<=200;x+=10)for(let z=-200;z<=200;z+=10)g.exploreAt?.(x+home.x,z+home.z,14);
  g.testMode=true;testAction(g,'cultivation');g.tribe(0).seeds=500;let placed=0;
  for(let r=18;r<160&&!placed;r+=6)for(let k=0;k<12&&!placed;k++){const a={x:home.x+Math.cos(k/12*6.283)*r,z:home.z+Math.sin(k/12*6.283)*r};const plan=planFieldArea(g,a,{x:a.x+12,z:a.z+12});if(plan.valid>0)placed+=placeFieldArea(g,plan).length;}
  g.testMode=false;assert.ok(placed>0,'a field was placed');
  assert.ok(!g.state.buildings.some(b=>b.team===0&&b.type==='warehouse'),'no warehouse in this scenario');
  let minFood=Infinity,stalled=0;
  for(let t=900;t<=1790;t+=10){run(t);const my=g.state.units.filter(u=>u.team===0&&u.hp>0);
   if(t>=1300)minFood=Math.min(minFood,g.tribe(0).food);
   if(t>=1000&&my.length&&my.filter(u=>u.order==='return'&&(u.itemCargo?.grainSheaves||0)>=20&&/cache full/i.test(u.workReason||'')).length>=my.length*.6)stalled++;}
  const pop=g.state.units.filter(u=>u.team===0&&u.hp>0).length;
  assert.ok(pop>=10,`population survives the first winter (pop ${pop})`);
  assert.ok(minFood>0,`food stays above zero through winter (min ${Math.round(minFood)})`);
  assert.ok(stalled<5,`pickers are not stalled holding harvest at a full cache (${stalled} samples)`);
 }finally{Math.random=realRandom;}
});
