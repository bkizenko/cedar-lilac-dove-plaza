/** Controlled sea-raid playthroughs on real terrain. No grants, healing or
 * replacement residents between waves. Quiet disables unrelated random raids;
 * historical wave numbers 1/5/25 exercise the opening, ramp and plateau. */
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {answerEncounter} from '../src/game/encounters.ts';
for(const seed of [123456,98765]){
 let random=seed;const original=Math.random;
 Math.random=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 try{
  const g=new Game();g.reset(seed,2);g.enterIsland();g.state.conflict='quiet';g.setLaborPriority('food');
  const initial=g.state.units.filter(u=>u.team===0).map(u=>u.id);
  const advance=()=>{if(g.state.encounter)answerEncounter(g,'observe');g.step(.2);};
  for(const wave of [1,5,25]){
   const manuallyArmed=g.callToArms();
   g.state.raidWave=wave-1;g.spawnRaid();
   const band=g.state.units.filter(u=>u.team===3&&u.hp>0&&u.seaRaid);
   assert.ok(band.length>0,'a physical band must land');
   for(let i=0;i<4500&&band.some(u=>u.hp>0)&&!g.state.ended;i++)advance();
   assert.ok(band.every(u=>u.hp<=0),`seed ${seed}, wave ${wave}: raid must resolve`);
   assert.ok(g.popNow(0)>0&&g.state.ended!=='lose',`seed ${seed}, wave ${wave}: village must survive`);
   for(let i=0;i<2400&&!g.state.ended;i++)advance();
   assert.deepEqual(g.simulationErrors,[]);
   const armed=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.militia).length;
   assert.equal(armed,0,'surviving civilian militia return to work without a stand-down command');
   console.log(JSON.stringify({seed,wave,manuallyArmed,attackers:band.length,time:Math.round(g.state.time),population:g.popNow(0),originalSurvivors:initial.filter(id=>g.state.units.some(u=>u.id===id&&u.hp>0)).length,food:Math.round(g.tribe(0).food),armed,errors:g.simulationErrors}));
  }
 }finally{Math.random=original;}
}
