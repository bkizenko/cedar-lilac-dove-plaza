import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';import {SimulationPhaseProfile} from '../src/game/simulationPhaseProfile.ts';import {RuntimeProfile} from '../src/game/runtimeProfile.ts';import {Game} from '../src/game/sim.ts';import {gameSnapshot,decodeGame} from '../src/game/persistence.ts';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
test('disabled profiler reads no clock; enabled contiguous phases are bounded and reset independently',()=>{
 let clock=0,reads=0;const p=new SimulationPhaseProfile(()=>{reads++;return clock;});assert.equal(p.begin(),undefined);assert.equal(reads,0);
 p.enabled=true;const s=p.begin();clock=3;s.mark('navigation');clock=8;s.mark('people');clock=15;s.end();s.end();
 assert.deepEqual(p.report().phases.map(x=>[x.phase,x.meanMs]),[['preparation',3],['navigation',5],['people',7]]);
 for(let i=0;i<300;i++){const sample=p.begin();clock++;sample.end();}assert.equal(p.report().phases.find(x=>x.phase==='preparation').samples,240);
 p.reset();assert.equal(p.enabled,true);assert.deepEqual(p.report().phases,[]);
 const runtime=new RuntimeProfile(()=>clock);runtime.simulationPhases.enabled=true;const step=runtime.simulationPhases.begin();clock++;step.end();runtime.reset();assert.deepEqual(runtime.report().simulationPhases,{enabled:true,phases:[]});
});
function compare(data,steps){const original=Math.random,runs=[];try{for(const mode of['absent','disabled','enabled','enabled','absent']){
 let seed=71,draws=0;Math.random=()=>{draws++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const g=decodeGame(structuredClone(data));g.quality='low';g.state.paused=false;g.state.speed=1;
 const p=new SimulationPhaseProfile();p.enabled=mode==='enabled';const initial=hash(gameSnapshot(g));const marks=[];
 for(let i=1;i<=steps;i++){g.step(1/30,mode==='absent'?undefined:p);if(i%30===0)marks.push([i,hash(gameSnapshot(g)),seed,draws]);}
 assert.ok(g.state.time>=data.state.time+steps/30-.001);assert.deepEqual(g.simulationErrors,[]);
 if(p.enabled)assert.ok(p.report().phases.some(r=>r.phase==='people'&&r.samples>0));else assert.deepEqual(p.report().phases,[]);
 runs.push({initial,marks,final:hash(gameSnapshot(g)),seed,draws});
 }for(const run of runs.slice(1))assert.deepEqual(run,runs[0],'full encoded native state and external random stream must match');}finally{Math.random=original;}}
test('actual native Game.step enabled/disabled/absent complete snapshot and RNG parity',()=>{
 const old=Math.random;let n=109;try{Math.random=()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296);const g=new Game();g.reset(1,18,{size:1040,layout:'continents'});g.enterIsland();compare(gameSnapshot(g),90);}finally{Math.random=old;}
});
const fixture='/tmp/hearthwild-owned-UI-V18-100-residents-60-buildings.json';
test('owned native100/60 stress Game.step full-state/RNG parity (explicit optional authored setup)',{skip:!existsSync(fixture)},()=>{const data=JSON.parse(readFileSync(fixture,'utf8'));assert.equal(data.state.units.filter(u=>u.team===0&&u.hp>0).length,100);assert.equal(data.state.buildings.filter(b=>b.team===0&&b.hp>0).length,60);compare(data,180);});
