import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {FOW} from '../src/game/constants.ts';
import {attributeReveals} from '../src/game/fogProvenance.ts';
import {unitSightRadius} from '../src/game/sightRadii.ts';

const fresh=()=>{const g=new Game();g.reset(0,undefined,{size:1040,layout:'continents'});g.state.conflict='quiet';g.enterIsland();for(const u of g.state.units)if(u.team===0)u.hp=0;g.state.buildings=g.state.buildings.filter(b=>b.team!==0);g.vision.fill(0);return g;};
const centre=(g,i)=>{const c=g.world.size/FOW;return{x:-g.world.size/2+(i%FOW+.5)*c,z:-g.world.size/2+((i/FOW|0)+.5)*c};};

test('G10 exact radius: one observer is credited exactly the cells whose centres lie inside its sight radius',()=>{
 const g=fresh(),home=g.campOf(0),u=g.spawnUnit('worker',home.x+200,home.z+200,0),r=unitSightRadius(u),before=g.vision.slice();
 g.updateVision(0);const tick=attributeReveals(g,before);
 const inside=[];for(let i=0;i<g.vision.length;i++){const c=centre(g,i),d2=(c.x-u.x)**2+(c.z-u.z)**2;if(d2<=r*r)inside.push(i);else assert.equal(g.vision[i],0,'no cell outside the radius is revealed');}
 assert.ok(inside.length>8);assert.equal(tick.revealed,inside.length);assert.equal(tick.unattributed.length,0);
 const credited=[...tick.bySource.values()];assert.equal(credited.length,1);assert.equal(credited[0].cells,inside.length);assert.equal(credited[0].source.unitId,u.id);
});

test('G10 exact radius: overlapping observers split every shared cell to exactly one, the nearest unit',()=>{
 const g=fresh(),home=g.campOf(0),a=g.spawnUnit('worker',home.x+200,home.z+200,0),b=g.spawnUnit('worker',home.x+206,home.z+200,0),before=g.vision.slice();
 g.updateVision(0);const tick=attributeReveals(g,before),total=[...tick.bySource.values()].reduce((s,e)=>s+e.cells,0);
 assert.equal(total,tick.revealed,'no cell is double counted or dropped');assert.equal(tick.unattributed.length,0);
 const r=unitSightRadius(a);let expectA=0;
 for(let i=0;i<g.vision.length;i++){if(!g.vision[i])continue;const c=centre(g,i),da=Math.hypot(c.x-a.x,c.z-a.z),db=Math.hypot(c.x-b.x,c.z-b.z);if(da<=r&&da<=db)expectA++;}
 const byId=id=>[...tick.bySource.values()].find(e=>e.source.unitId===id)?.cells??0;
 assert.equal(byId(a.id),expectA,'cells go to the nearer observer');
});

test('G10 exact radius: a unit that dies this step stops being credited and its cells fall to unattributed',()=>{
 const g=fresh(),home=g.campOf(0),u=g.spawnUnit('worker',home.x+200,home.z+200,0),before=g.vision.slice();
 g.updateVision(0);u.hp=0;const tick=attributeReveals(g,before);
 assert.equal(tick.bySource.size,0);assert.equal(tick.unattributed.length,tick.revealed);
});
