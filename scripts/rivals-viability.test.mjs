import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {isRivalTeam} from '../src/game/factions.ts';
import {answerEncounter} from '../src/game/encounters.ts';
const SECONDS=Number(process.env.VIABLE_SECONDS||2400),SEEDS=(process.env.VIABLE_SEEDS||'345,1,4').split(',').map(Number);
function run(seed,id){const old=Math.random;let n=seed*7+13;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 try{const g=new Game();g.reset(seed,14,{size:1040,layout:'pangaea',difficulty:id});g.enterAsBand();g.checkVictory=()=>{};
  const rivals=g.state.tribes.filter(t=>isRivalTeam(t.id)).map(t=>t.id),start=rivals.map(t=>g.popNow(t)),lowest=Object.fromEntries(rivals.map(t=>[t,99]));
  for(let i=0;i<SECONDS*3;i++){if(g.state.encounter)answerEncounter(g,'observe');g.step(1/3);if(i%150===0)for(const t of rivals)lowest[t]=Math.min(lowest[t],g.popNow(t));}
  return rivals.map((t,i)=>({team:t,start:start[i],pop:g.popNow(t),alive:g.tribe(t).alive,cultivated:g.tribe(t).cultivated||[]}));
 }finally{Math.random=old;}}
test(`no rival starves out within ${SECONDS}s at Normal on several seeds, and rivals take up farming`,{timeout:3000000},()=>{
 const out={};for(const seed of SEEDS)out[seed]=run(seed,'normal');console.log(JSON.stringify(out));
 for(const [seed,rows] of Object.entries(out))for(const r of rows){assert.ok(r.alive&&r.pop>=r.start,`seed ${seed} team ${r.team} survived and did not shrink: ${JSON.stringify(r)}`);}
});
