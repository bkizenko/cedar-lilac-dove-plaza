import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {riverCurrentProfile,currentAt,currentPowerKw,driftAt,RIVER_CURRENT_RULES as R} from '../src/game/riverCurrents.ts';
function world(seed,layout){const g=new Game();g.reset(seed,18,{size:1040,layout});g.enterIsland();return g;}
const rank=a=>{const s=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]);const r=new Array(a.length);s.forEach(([,i],k)=>r[i]=k);return r;};
const spearman=(a,b)=>{const ra=rank(a),rb=rank(b),m=(a.length-1)/2;let n=0,x=0,y=0;for(let i=0;i<a.length;i++){n+=(ra[i]-m)*(rb[i]-m);x+=(ra[i]-m)**2;y+=(rb[i]-m)**2;}return n/Math.sqrt(x*y);};

test('native rivers: currents run downhill on the real water surface, speed follows the measured slope, still water has none',()=>{
  for(const [seed,layout] of [[4,'pangaea'],[2,'archipelago'],[7,'continents']]){const g=world(seed,layout),p=riverCurrentProfile(g,8);assert.ok(p.length>50);
    let down=0,n=0;for(const c of p){assert.ok(c.speed>=R.minSpeed-1e-9&&c.speed<=R.maxSpeed+1e-9);if(c.slope<.002)continue;n++;
      const ux=c.vx/c.speed,uz=c.vz/c.speed;if(g.waterAt(c.x+ux*4,c.z+uz*4)<=g.waterAt(c.x-ux*4,c.z-uz*4)+1e-6)down++;}
    assert.ok(n>=5&&down/n>=.85,`${layout} ${seed}: downstream ${down}/${n}`);
    assert.ok(spearman(p.map(c=>c.speed),p.map(c=>c.slope))>=.85,`${layout} ${seed}: speed follows slope`);
    for(const b of g.world.waterBodies||[])if(b.kind==='lake')assert.equal(currentAt(g,b.x,b.z),null,'lakes are still water');
    // off the rivers: no current, no drift, no current power
    assert.equal(currentAt(g,0,0)&&g.height(0,0)>=g.waterAt(0,0),null);const far=p[0];assert.deepEqual(driftAt(g,far.x+500,far.z+500),{x:0,z:0});
    const fast=p.reduce((a,c)=>c.speed>a.speed?c:a,p[0]),slow=p.reduce((a,c)=>c.speed<a.speed?c:a,p[0]);assert.ok(currentPowerKw(g,fast.x,fast.z)>currentPowerKw(g,slow.x,slow.z));}
});
