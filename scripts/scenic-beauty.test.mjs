import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {scenicSurvey,scenicStartReport,vistaAt} from '../src/game/scenicBeauty.ts';
function world(seed,layout){const g=new Game();g.reset(seed,18,{size:1040,layout});g.enterIsland();return g;}

test('native worlds: beauty is measured map-relative, the most scenic land sees more water and higher walls than the least, and a valid site near every start is above average',()=>{
  const starts=[];
  for(const [seed,layout] of [[1,'archipelago'],[4,'pangaea'],[7,'continents']]){const g=world(seed,layout),t=Date.now(),s=scenicSurvey(g),r=scenicStartReport(g,s);
    assert.ok(Date.now()-t<5000);assert.ok(s.points.length>300);
    const top=s.points.filter(p=>s.percentileOf(p.v)>=90),bot=s.points.filter(p=>s.percentileOf(p.v)<=10),mean=(a,k)=>a.reduce((x,p)=>x+p.v[k],0)/a.length;
    assert.ok(mean(top,'water')>mean(bot,'water')&&mean(top,'rise')>mean(bot,'rise'),`${layout} ${seed}`);
    assert.ok(r.start.percentile>=0&&r.start.percentile<=100);starts.push(r.start.percentile);
    assert.ok(r.bestNearby&&r.bestNearby.percentile>=60&&r.bestNearby.distanceMetres<=160,JSON.stringify(r.bestNearby));assert.equal(g.dryFoundation('townhall',r.bestNearby.x,r.bestNearby.z),true);
    // deterministic, terrain-only
    assert.deepEqual(vistaAt(g,r.start.x,r.start.z),r.start.vista);}
  console.log('start percentiles',starts.join(', '));
});
