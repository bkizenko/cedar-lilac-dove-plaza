// M2-15: measure rival growth, investment, plan completion and recovery on FIXED and HOLDOUT worlds, with the decision layer (rulersVersion 2) against the plain
// rulers lane (rulersVersion 1). The thresholds below were chosen on the fixed seeds; the holdout seeds were never looked at while tuning and must clear the same bars.
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import * as S from '../src/game/societyRuntime.ts';
import {reserveSeconds} from '../src/game/settlement.ts';
import {KINDS} from '../src/game/societyDecisions.ts';

const FIXED=[123456,20260101],HOLDOUT=[987654,55555],SECONDS=Number(process.env.SOCIETY_OUTCOME_SECONDS||360),FAMINE_AT=120,FAMINE=[1,4],RIVALS=[1,2,4,5];
function run(seed,version){
 const g=new Game();g.reset(seed,10,{rulersVersion:version});g.enterIsland();
 const pop0=Object.fromEntries(RIVALS.map(t=>[t,g.popNow(t)])),samples={};let next=30;
 for(const t of RIVALS)samples[t]=[];
 let hit=false;
 while(g.state.time<SECONDS){g.step(.34);
  if(!hit&&g.state.time>=FAMINE_AT){hit=true;for(const t of FAMINE)g.tribe(t).food=Math.min(g.tribe(t).food,25);} // the same shock in both variants: a failed store
  if(g.state.time>=next){next+=30;for(const t of RIVALS)samples[t].push(reserveSeconds(g,t));}}
 const rows=RIVALS.map(t=>{
  const tr=g.tribe(t),s=samples[t],starving=s.filter(v=>v<150).length,firstStarve=s.findIndex(v=>v<150),recovered=firstStarve>=0&&s.slice(firstStarve).some(v=>v>=450);
  const o=version===2?S.outcomesOf(g,t):undefined;
  return {team:t,alive:tr.alive,growth:g.popNow(t)-pop0[t],pop:g.popNow(t),buildings:g.state.buildings.filter(b=>b.team===t&&b.hp>0&&g.finished(b)).length,starvingShare:starving/Math.max(1,s.length),starved:firstStarve>=0,recovered,
   plans:o?.plans??0,completed:o?.completed??0,interrupted:o?.interrupted??0,switched:o?.switched??0,expired:o?.expired??0,abandoned:o?.abandoned??0,held:o?.held,last:S.lastDecisionOf(g,t),nan:![tr.food,tr.wood,tr.stone].every(Number.isFinite)};
 });
 return {g,rows};
}
const mean=(xs)=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const summarise=(runs)=>{const rows=runs.flatMap(r=>r.rows);return {n:rows.length,alive:mean(rows.map(r=>+r.alive)),growth:mean(rows.map(r=>r.growth)),buildings:mean(rows.map(r=>r.buildings)),starvingShare:mean(rows.map(r=>r.starvingShare)),
 starved:rows.filter(r=>r.starved).length,recovered:rows.filter(r=>r.recovered).length,plans:rows.reduce((t,r)=>t+r.plans,0),completed:rows.reduce((t,r)=>t+r.completed,0),interrupted:rows.reduce((t,r)=>t+r.interrupted,0),switched:rows.reduce((t,r)=>t+r.switched,0)};};
const results={};
for(const [name,seeds] of [['fixed',FIXED],['holdout',HOLDOUT]]){
 test(`M2-15 ${name} worlds (${seeds.join(', ')}): decision layer vs plain rulers, ${SECONDS} s`,()=>{
  const on=seeds.map(s=>run(s,2)),off=seeds.map(s=>run(s,1));
  const a=summarise(on),b=summarise(off);results[name]={on:a,off:b};
  console.log(`# ${name}: layer ${JSON.stringify(a)}\n# ${name}: plain ${JSON.stringify(b)}`);
  for(const r of on.flatMap(x=>x.rows)){
   assert.equal(r.nan,false,'no NaN stocks');assert.ok(r.alive,'society '+r.team+' survives');
   assert.ok(r.plans>=1,'every society committed to at least one plan');assert.ok(r.last&&r.last.alternatives.length===8,'and states eight scored alternatives');
   assert.ok(r.last.alternatives.every(x=>x.feasible||x.blocked),'blockers are stated');
   assert.ok(r.switched+r.interrupted<=Math.max(2,r.plans),'hysteresis: plans are not thrashed');
   if(FAMINE.includes(r.team))assert.ok(r.held.stockpile+r.held.trade>0,'a society whose store failed turned to food and trade (team '+r.team+')');
   const held=Object.values(r.held).reduce((t,v)=>t+v,0);assert.ok(held>=Math.floor(SECONDS/45)-2,'plans are held across reviews ('+held+')');
  }
  // outcomes: the layer must not cost growth, investment or food security against the plain lane (tolerances absorb the sim's own randomness)
  assert.ok(a.growth>=b.growth-1.5,`growth ${a.growth.toFixed(2)} vs ${b.growth.toFixed(2)}`);
  assert.ok(a.buildings>=b.buildings-2,`investment ${a.buildings.toFixed(2)} vs ${b.buildings.toFixed(2)}`);
  assert.ok(a.starvingShare<=b.starvingShare+.15,`starvation share ${a.starvingShare.toFixed(2)} vs ${b.starvingShare.toFixed(2)}`);
  if(a.starved)assert.ok(a.recovered/a.starved>=Math.min(.5,b.starved?b.recovered/b.starved:.5)-.01,'societies that ran short recover at least as often');
  assert.ok(a.alive>=b.alive);
  for(const k of KINDS)void k;
 });
}
test('M2-15: fixed and holdout worlds agree (the bars were not overfit to the fixed seeds)',()=>{
 const f=results.fixed,h=results.holdout;if(!f||!h)return;
 for(const key of ['growth','buildings','starvingShare']){
  const fd=f.on[key]-f.off[key],hd=h.on[key]-h.off[key];
  const tol=key==='starvingShare'?.25:key==='growth'?3:4;
  assert.ok(Math.abs(fd-hd)<=tol,`${key} layer-minus-plain: fixed ${fd.toFixed(2)} vs holdout ${hd.toFixed(2)}`);
 }
});
