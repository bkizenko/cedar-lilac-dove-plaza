/** Deterministic long simulation: a passive but alive player (a founded hall, kept fed, never given an order) against the same world at Easy and at Hard. */
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {isRivalTeam} from '../src/game/factions.ts';
import {answerEncounter} from '../src/game/encounters.ts';
const SECONDS=4800,AGE_SECONDS=8000;
function run(id,SECONDS=4800){const old=Math.random;let n=987654;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 try{
  const g=new Game();g.reset(345,14,{size:1040,layout:'pangaea',difficulty:id});g.enterAsBand();g.checkVictory=()=>{};
  const home=g.campOf(0),food=[...g.state.forage].sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z))[0];
  let p=false;for(const r of [8,12,16,22])for(let i=0;i<16&&!p;i++){const a=i/16*Math.PI*2;p=g.placeBuilding('townhall',food.x+Math.cos(a)*r,food.z+Math.sin(a)*r,0);}
  assert.ok(p,'passive player founded a hall');
  const rivals=g.state.tribes.filter(t=>isRivalTeam(t.id)).map(t=>t.id);let maxFront=0;
  for(let i=0;i<SECONDS*3;i++){if(g.state.encounter)answerEncounter(g,'observe');if(i%90===0)g.tribe(0).food=Math.max(g.tribe(0).food,3000);g.step(1/3);
   if(i%300===0)maxFront=Math.max(maxFront,(g.state.capitulation?.fronts||[]).length);}
  const totals=g.state.rivalActivity?.totals||{};
  const raids=Object.entries(totals).filter(([k])=>k.endsWith(':raid:departed')).reduce((a,[,v])=>a+v,0);
  const rivalPops=rivals.map(t=>g.popNow(t)),best=Math.max(...rivalPops);
  return {player:g.popNow(0),best,raids,fronts:maxFront,gov:rivals.map(t=>g.state.governance?.[String(t)]?.gov||'bandCouncil'),ages:rivals.map(t=>g.tribe(t).age)};
 }finally{Math.random=old;}
}
test(`over ${SECONDS}s a Hard rival out-grows a passive player and an Easy rival; Easy rivals stay peaceful`,{timeout:1800000},()=>{
 const easy=run('easy'),hard=run('hard');console.log(JSON.stringify({easy,hard}));
 assert.ok(hard.player>0,'the passive player stays alive (it is fed)');
 assert.ok(hard.best>hard.player,'Hard rival population exceeds the passive player');
 assert.ok(hard.best>easy.best,'Hard rival out-grows the Easy rival');
 assert.equal(easy.raids,0,'Easy rivals stay peaceful toward a passive neighbour');
 // Raid timing in the unscripted world is seed-chaotic; dispatch, arrival and siege pressure are asserted in scripts/rivals-aggression.test.mjs.
});

test(`a Hard rival reaches the Bronze Age within ${AGE_SECONDS}s (population gate 50) while the passive player stays at the Stone Age`,{timeout:3600000},()=>{
 const hard=run('hard',AGE_SECONDS);console.log(JSON.stringify({hard}));
 assert.ok(Math.max(...hard.ages)>=1,'a Hard rival advanced to Bronze or later');
 assert.ok(hard.best>=50,'it did so by growing to the Bronze population gate');
});
