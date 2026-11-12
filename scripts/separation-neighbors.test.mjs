import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSeparationNeighbors} from '../src/game/separationNeighbors.ts';
import {Game} from '../src/game/sim.ts';
import {canoeHeight} from '../src/game/waterTravel.ts';
// Frozen original method oracle: changes to iteration order alter exact outcomes.
function originalSeparate(dt) {
    // Query nearby buckets instead of comparing every pair across the island.
    const us = this.state.units;
    // Paid carriers retain a hold order so the ordinary work board cannot
    // steal them. They still yield while travelling; actual makers stay put.
    const productionTravel=new Map((this.state.production?.projects||[])
      .filter(p=>p.actorId!==null&&['collecting','carrying','returning','unloading'].includes(p.phase))
      .map(p=>[p.actorId,p]));
    const canYield=(u)=>u.order!=="hold"||
      productionTravel.get(u.id)?.id===u.productionProjectId&&productionTravel.get(u.id)?.team===u.team;
    const cell = Math.max(2, ...us.map((u) => u.r * 2));
    const buckets = new Map();
    for (let i = 0; i < us.length; i++) {
      const u = us[i];
      if (u.hp <= 0||u.boat?.phase==='aboard') continue;
      const key = `${Math.floor(u.x / cell)},${Math.floor(u.z / cell)}`;
      const bucket = buckets.get(key) || [];
      bucket.push(i);
      buckets.set(key, bucket);
    }
    for (let i = 0; i < us.length; i++) {
      const a = us[i];
      if (a.hp <= 0||a.boat?.phase==='aboard') continue;
      const cx = Math.floor(a.x / cell),
        cz = Math.floor(a.z / cell);
      for (let z = cz - 1; z <= cz + 1; z++)
        for (let x = cx - 1; x <= cx + 1; x++) {
          for (const j of buckets.get(`${x},${z}`) || []) {
            if (j <= i) continue;
            const b = us[j];
            const dx = a.x - b.x,
              dz = a.z - b.z;
            const min = a.r + b.r,
              d2 = dx * dx + dz * dz;
            if (d2 >= min * min) continue;
            const d = Math.sqrt(d2);
            // Coincident spawns need a deterministic direction, too.
            const nx = d > 0.0001 ? dx / d : 1;
            const nz = d > 0.0001 ? dz / d : 0;
            const push = (min - d) * 0.5 * Math.min(1, dt * 8);
            if (canYield(a) && this.canStep(a, a.x + nx * push, a.z + nz * push)) {
              a.x += nx * push;
              a.z += nz * push;
              a.y = canoeHeight(this,a,a.x,a.z);
            }
            if (canYield(b) && this.canStep(b, b.x - nx * push, b.z - nz * push)) {
              b.x -= nx * push;
              b.z -= nz * push;
              b.y = canoeHeight(this,b,b.x,b.z);
            }
          }
        }
    }
  }

function oldBuckets(units,cell){const buckets=new Map();for(let i=0;i<units.length;i++){const u=units[i];if(u.hp<=0||u.boat?.phase==='aboard')continue;const key=`${Math.floor(u.x/cell)},${Math.floor(u.z/cell)}`;const bucket=buckets.get(key)||[];bucket.push(i);buckets.set(key,bucket);}return buckets;}
function queries(rows,x,z,cell){const list=[],cx=Math.floor(x/cell),cz=Math.floor(z/cell);for(let iz=cz-1;iz<=cz+1;iz++)for(let ix=cx-1;ix<=cx+1;ix++)for(const j of rows.get(iz)?.get(ix)||[])list.push(j);return list;}
function oldQueries(rows,x,z,cell){const list=[],cx=Math.floor(x/cell),cz=Math.floor(z/cell);for(let iz=cz-1;iz<=cz+1;iz++)for(let ix=cx-1;ix<=cx+1;ix++)for(const j of rows.get(`${ix},${iz}`)||[])list.push(j);return list;}
const unit=(id,x,z,extra={})=>({id,x,z,y:0,r:.8,hp:100,team:0,order:'move',...extra});
const native=Game.prototype.separate;
function pair(units,{dt=.05,projects=[],canStep=(u,x,z)=>x*x+z*z<100,passes=1}={}){
 const run=method=>{const state={units:structuredClone(units),production:{projects:structuredClone(projects)}};const checks=[];const g={state,canStep(u,x,z){checks.push([u.id,x,z]);return canStep(u,x,z);},travelHeight:(x,z)=>x*.03-z*.02,waterAt:()=>.5};for(let i=0;i<passes;i++)method.call(g,dt);return{state,checks};};
 const expected=run(originalSeparate),actual=run(native);assert.deepEqual(actual,expected);return actual;
}
test('numeric rows preserve signed boundary bucket sequence and original ordinals',()=>{const units=[];for(let z=-4;z<=4;z++)for(let x=-4;x<=4;x++)units.push(unit(units.length,x*2-.00001,z*2+.00001));const rows=buildSeparationNeighbors(units,2),old=oldBuckets(units,2);for(let z=-10;z<=10;z+=.73)for(let x=-10;x<=10;x+=.67)assert.deepEqual(queries(rows,x,z,2),oldQueries(old,x,z,2));});
test('dead and aboard exclusions match exactly without pruning other orders or teams',()=>{const units=[unit(1,0,0),unit(2,0,0,{hp:0}),unit(3,0,0,{boat:{phase:'aboard'}}),unit(4,0,0,{order:'hold',team:3}),unit(5,0,0,{boat:{phase:'boarding'}})];assert.deepEqual(queries(buildSeparationNeighbors(units,2),0,0,2),[0,3,4]);});
test('membership freezes before yielding while later actor query uses live coordinates',()=>{const units=[unit(1,0,0),unit(2,0,0)];const rows=buildSeparationNeighbors(units,2);units[1].x=20;assert.deepEqual(queries(rows,0,0,2),[0,1]);assert.deepEqual(queries(rows,20,0,2),[]);});
test('sparse extreme coordinates and empty passes retain no stale buckets',()=>{const units=[unit(1,-1e12,1e12),unit(2,1e12,-1e12)];const rows=buildSeparationNeighbors(units,2);assert.equal(rows.size,2);assert.deepEqual(queries(rows,-1e12,1e12,2),[0]);assert.equal(buildSeparationNeighbors([],2).size,0);assert.equal(buildSeparationNeighbors([unit(1,0,0,{hp:0})],2).size,0);});
test('storage is bounded by current membership and input objects stay unchanged',()=>{const units=Array.from({length:1500},(_,i)=>Object.freeze(unit(i,i*4,-i*4)));const rows=buildSeparationNeighbors(Object.freeze(units),2);let cells=0,count=0;for(const row of rows.values())for(const bucket of row.values()){cells++;count+=bucket.length;}assert.equal(count,units.length);assert.ok(rows.size<=units.length);assert.ok(cells<=units.length);});
test('actual separate matches original coincident, fractional and mixed-radius contacts exactly',()=>{pair([unit(1,0,0),unit(2,0,0),unit(3,.13,-.22,{r:1.3}),unit(4,-.3,.7,{r:.35}),unit(5,1.99,-2.01)],{passes:8});});
test('actual separate preserves hold/carrier production exceptions and canStep calls',()=>{const units=[unit(1,0,0,{order:'hold',productionProjectId:90}),unit(2,.1,0,{order:'hold'}),unit(3,.2,0,{order:'hold',productionProjectId:91,team:2}),unit(4,.3,0,{order:'hold',productionProjectId:92})];const projects=[{id:90,actorId:1,team:0,phase:'carrying'},{id:91,actorId:3,team:1,phase:'collecting'},{id:92,actorId:4,team:0,phase:'working'}];const result=pair(units,{projects,passes:3});assert.ok(result.checks.some(c=>c[0]===1));assert.ok(result.checks.every(c=>c[0]===1));});
test('actual separate preserves obstacle refusal, canoe heights, aboard exclusion and pass order',()=>{pair([unit(1,-.2,0,{haulage:'canoe'}),unit(2,.1,0),unit(3,.2,0,{boat:{phase:'aboard'}}),unit(4,.4,0,{hp:0}),unit(5,-.3,-.1)],{canStep:(u,x,z)=>x<=0&&z<=.2,passes:6});});
test('actual separate matches original deterministic dense passes without consuming RNG',()=>{const units=Array.from({length:80},(_,i)=>unit(i,(i%10)*.41-2,Math.floor(i/10)*.39-1.5,{r:.4+(i%4)*.13,order:i%5?'move':'hold'}));const random=Math.random;Math.random=()=>{throw Error('separation must not consume RNG');};try{pair(units,{passes:4,dt:1/30});}finally{Math.random=random;}});
