import assert from'node:assert/strict';import{createHash}from'node:crypto';import{writeFileSync}from'node:fs';import{registerHooks}from'node:module';import{pathToFileURL}from'node:url';
const A=process.argv[2],B=process.argv[3],reportPath=process.argv[4];assert.ok(A&&B&&reportPath,'Provide baseline root, candidate root and aggregate output path');registerHooks({resolve(s,c,next){if(s.startsWith('@/'))return next(pathToFileURL((c.parentURL?.startsWith(pathToFileURL(B).href)?B:A)+'/src/'+s.slice(2)+'.ts').href,c);try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/.test(s))return next(s+'.ts',c);throw e;}}});
const entries={A:{...await import(pathToFileURL(A+'/src/game/persistence.ts')),...await import(pathToFileURL(A+'/src/game/sim.ts'))},B:{...await import(pathToFileURL(B+'/src/game/persistence.ts')),...await import(pathToFileURL(B+'/src/game/sim.ts'))}},clock=await import(pathToFileURL(A+'/src/game/daylight.ts')),food=await import(pathToFileURL(A+'/src/game/settlement.ts'));const sha=v=>createHash('sha256').update(v).digest('hex'),prior=Math.random,rows=[];let calls=0,state=0;function reset(){state=123456;calls=0;Math.random=()=>{calls++;state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
function timeFor(night){for(let t=0;t<10000;t+=10){const h=clock.pacedSolarHour(t,86400*32/1800);if(night?h<2:h>12&&h<14)return t;}throw Error('no actual clock phase');}
try {
 reset(); const initial=new entries.A.Game(); initial.reset(123456,2);initial.enterIsland();
 Object.assign(initial.state,{time:timeFor(false),autoWorkEnabled:true,conflict:'quiet',weather:'clear',weatherT:10000,raidT:10000,birthT:10000,visitorTimer:900});
 for(const t of initial.state.tribes)t.thinkT=10000;
 const raw=JSON.parse(JSON.stringify(entries.A.encodeGame(initial)));
 for(const c of ['storage completion/loss/owner/resize','living mouths/death/dependency/team','food thresholds/job lock/policy']) {
  const variants=[];
  for(const variant of ['A','B']) {
   reset();const g=entries[variant].decodeGame(structuredClone(raw));g.state.paused=false;
   const actors=g.state.units.filter(u=>u.team===(c.startsWith('food')?0:1)&&u.type==='worker');assert.ok(actors.length>1);
   const warehouse=g.makeBld('warehouse',actors[0].x,actors[0].z,1);warehouse.build=.5;g.state.buildings.push(warehouse);
   const hashes=[];
   for(let i=0;i<5;i++) {
    // Deliberate live-state changes validate fresh per-assignment observations;
    // these are equivalence probes, not a campaign survival/production proof.
    if(c.startsWith('storage')){warehouse.build=i===0?.5:1;warehouse.hp=i===2?0:300;warehouse.team=i===3?0:1;warehouse.w=i===4?18:6;}
    if(c.startsWith('living')){const u=actors[1];u.hp=i===1?0:40;u.maturesAt=i===2?g.state.time+100:undefined;u.team=i===3?2:1;}
    if(c.startsWith('food')){g.tribe(0).food=[89.99,90,239.99,240,1][i]*Math.max(.055,food.foodDemand(g,0));actors[0].jobLock=i%2===0;actors[0].job='food';actors[0].huntOnly=i===1||i===2;g.state.laborPolicy=i===0?'wood':'food';}
    for(const u of actors){u.workCheckAt=0;if(u.hp>0){u.order='idle';u.node=null;}}
    const before=g.state.time;g.step(1/30);assert.ok(g.state.time>before||g.state.ended);assert.deepEqual(g.simulationErrors,[]);
    hashes.push(sha(JSON.stringify(entries[variant].encodeGame(g))));
   }
   variants.push({variant,hashes,rng:{calls,state}});
  }
  assert.deepEqual(variants[0].hashes,variants[1].hashes,c+' full encoded state');assert.deepEqual(variants[0].rng,variants[1].rng,c+' exact external random draws');
  rows.push({case:c,steps:5,dt:1/30,fullStateMatches:true,rngMatches:true,finalEncodedSha256:variants[0].hashes.at(-1),externalRng:variants[0].rng});
 }
} finally {Math.random=prior;writeFileSync(reportPath,JSON.stringify({scope:'Public native terrain equivalence probes; deliberately authored live changes before actual Game.step, not campaign qualification',cases:rows,qualified:rows.length===3},null,2)+'\n');}
console.log(JSON.stringify(rows));
