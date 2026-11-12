import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {CHANNEL_SMOOTH_RULES as R,riverBankSamples,channelMetrics,smoothRiverDisplay,smoothRivers} from '../src/game/channelSmoothness.ts';

function stairGame(){
  // Wet 4 m grid cells in a manhattan staircase (horizontal then vertical), so the
  // physical banks are axis-aligned sawteeth. Water at y=1, bed at 0, banks at 10.
  const river={kind:'river',id:'stair',width:8,pts:Array.from({length:13},(_,i)=>({x:i*4+2,z:i*4+2,y:1,w:8}))};
  const wetAt=(x,z)=>{const ix=Math.floor(x/4),iz=Math.floor(z/4);return ix>=0&&iz>=0&&ix<=12&&iz<=12&&(iz===ix||iz===ix-1);};
  return{world:{size:200,waterBodies:[river],waterY:1,baseWaterY:1},height:(x,z)=>wetAt(x,z)?0:10,waterAt:()=>1,river};
}

test('a synthetic staircase channel is measured as blocky, then the display banks are smoother and stay on the physical waterline',()=>{
  const g=stairGame(),raw=channelMetrics(riverBankSamples(g,g.river));
  assert.ok(raw.wetSamples>20,JSON.stringify(raw));
  assert.ok(raw.staircaseFraction>=.15&&raw.meanBankJitterMetres>=.15,JSON.stringify(raw));
  const d=smoothRiverDisplay(g,g.river);
  assert.ok(d.center.length>=10&&d.left.length===d.right.length);
  assert.ok(d.maxBankDeviationMetres<=R.maxDisplayDeviationMetres+1e-6,`dev ${d.maxBankDeviationMetres}`);
  assert.ok(d.smooth.staircaseFraction<raw.staircaseFraction,`smooth ${d.smooth.staircaseFraction} vs raw ${raw.staircaseFraction}`);
  assert.ok(d.smooth.meanBankJitterMetres<raw.meanBankJitterMetres,`jitter ${d.smooth.meanBankJitterMetres} vs ${raw.meanBankJitterMetres}`);
  // visible water stays consistent: every display centre is wet, and a point just outside the smoothed bank is dry or at the edge
  let wetC=0;for(const p of d.center)if(g.height(p.x,p.z)<g.waterAt(p.x,p.z)+R.wetDepthMetres)wetC++;
  assert.ok(wetC/d.center.length>=.9,`wet centres ${wetC}/${d.center.length}`);
  // physics is untouched (the query never writes)
  assert.equal(g.height(2,0),0);assert.equal(g.height(20,0),10);
});

function world(seed,layout,version=18){const g=new Game();g.reset(seed,version,{size:1040,layout});g.enterIsland();return g;}

test('native rivers: smoothed banks stay within 0.75 m of the real waterline, centres stay wet, width is more continuous, terrain is unchanged',()=>{
  const evidence=[];
  for(const [seed,layout,version] of [[4,'pangaea',18],[2,'archipelago',18],[7,'continents',19]]){
    const g=world(seed,layout,version),h0=g.world.heights.slice(),rivers=smoothRivers(g);
    assert.ok(rivers.length>0,`${layout} ${seed}`);
    let jumpsRaw=0,jumpsSmooth=0,jitterRaw=0,jitterSmooth=0,n=0;
    for(const r of rivers){
      assert.ok(r.center.length>=2);
      assert.ok(r.maxBankDeviationMetres<=R.maxDisplayDeviationMetres+1e-6,`${r.id} dev ${r.maxBankDeviationMetres}`);
      if(r.raw.wetSamples>=8){let wet=0;for(const p of r.center)if(g.height(p.x,p.z)<g.waterAt(p.x,p.z)+.15)wet++;
        assert.ok(wet/r.center.length>=.85,`${r.id} wet ${wet}/${r.center.length}`);
        jumpsRaw+=r.raw.widthJumps;jumpsSmooth+=r.smooth.widthJumps;jitterRaw+=r.raw.meanBankJitterMetres;jitterSmooth+=r.smooth.meanBankJitterMetres;n++;}
    }
    assert.ok(n>0);
    assert.ok(jumpsSmooth<=jumpsRaw,`${layout}: width jumps ${jumpsSmooth} vs ${jumpsRaw}`);
    assert.ok(jitterSmooth<=jitterRaw+1e-6,`${layout}: jitter ${jitterSmooth} vs ${jitterRaw}`);
    assert.deepEqual(Array.from(g.world.heights),Array.from(h0),'terrain unchanged');
    evidence.push({layout,seed,version,rivers:rivers.length,jumpsRaw,jumpsSmooth,jitterRaw:+(jitterRaw/n).toFixed(3),jitterSmooth:+(jitterSmooth/n).toFixed(3),maxDev:Math.max(...rivers.map(r=>r.maxBankDeviationMetres))});
  }
  console.log('GW-12 rivers',JSON.stringify(evidence));
});
