import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {Game} from '../../src/game/sim.ts';
import {mulberry32} from '../../src/game/rng.ts';
import {SimulationPhaseProfile} from '../../src/game/simulationPhaseProfile.ts';

// Actual headless Game.step costs on unchanged generated terrain. The optional
// 80-resident load is a declared diagnostic endowment, never survival evidence.
// No browser, renderer, player save or gameplay sampling method is replaced.
const quantiles = values => {
  const sorted = [...values].sort((a,b) => a-b);
  return {samples:values.length,meanMs:values.reduce((a,b)=>a+b,0)/values.length,
    p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1)};
};
const sha = value => createHash('sha256').update(value).digest('hex');
const source = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const changedPaths = execFileSync('git',['diff','--name-only','HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const results = [];
const originalRandom = Math.random;
try {
  for (const kind of ['native-opening','declared-80-resident-load']) {
    Math.random = mulberry32(0x60dfba2);
    const g = new Game();
    g.reset(0,17,{size:1040,layout:'continents'});
    g.enterIsland();
    if (kind === 'declared-80-resident-load') {
      const home = g.campOf(0);
      Object.assign(g.tribe(0),{food:10000,foodLots:{provisions:10000}});
      for (let i=g.popNow(0);i<80;i++)
        g.spawnUnit('worker',home.x+(i%9-4)*1.2,home.z+(Math.floor(i/9)-4)*1.2,0);
      g.setAutoWork(true);
    }
    const terrainBefore = sha(Buffer.from(g.world.heights.buffer));
    g.state.speed=1;g.state.paused=false;
    const founder=g.state.units.find(u=>u.team===0&&u.type==='worker');
    g.selectEntity(founder);g.issueMove(-162,-298);
    for(let i=0;i<20;i++)g.step(1/30);
    const profile=new SimulationPhaseProfile();profile.enabled=true;
    const times=[],start=g.state.time;
    for(let i=0;i<240;i++){
      const before=performance.now();g.step(1/30,profile);times.push(performance.now()-before);
      if(g.simulationErrors.length)throw new Error(JSON.stringify(g.simulationErrors));
    }
    const terrainAfter=sha(Buffer.from(g.world.heights.buffer));
    if(terrainAfter!==terrainBefore)throw new Error('Diagnostic unexpectedly changed terrain');
    const phases=profile.report().phases.sort((a,b)=>b.meanMs-a.meanMs);
    results.push({kind,playerResidents:g.popNow(0),totalLivingUnits:g.state.units.filter(u=>u.hp>0).length,
      warmupSteps:20,measuredSteps:240,simulationSeconds:g.state.time-start,step:quantiles(times),phases,
      unchangedTerrain:terrainAfter,simulationErrors:[...g.simulationErrors]});
  }
} finally {Math.random=originalRandom;}
const report={source,changedPaths,runtime:process.version,measuredAt:new Date().toISOString(),
  scope:'Actual headless Game.step phase timing only; diagnostic endowments explicitly labeled. No built FPS, renderer, real-player-village or campaign acceptance claim. Ambient RNG isolation is benchmark setup, not persistent simulation replay.',results};
const output=process.env.HEARTHWILD_LOGIC_PROFILE_OUTPUT;
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
for(const row of results)console.log(JSON.stringify({kind:row.kind,playerResidents:row.playerResidents,
  totalLivingUnits:row.totalLivingUnits,step:row.step,topPhases:row.phases.slice(0,5),errors:row.simulationErrors}));
