import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {testAction} from '../src/game/testing.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {snapFieldRect,snapFieldPoint,touchingSides,fieldNeighbourhood,EDGE,FIELD_SNAP_RULES} from '../src/game/fieldSnap.ts';
import {planFieldArea,placeFieldArea} from '../src/game/fieldArea.ts';
function world(){const g=new Game();g.reset(345);g.enterIsland();g.testMode=true;g.revealMap=true;g.height=()=>4;g.waterAt=()=>-50;g.world.biomes=[{kind:'plains',x:0,z:0}];g.world.rivers=[];testAction(g,'cultivation');testAction(g,'supplies');g.tribe(0).seeds=500;g.updateVision(0);return g;}
const base=BUILDINGS.farm;
const put=(g,x,z,w=base.w,d=base.d)=>{const b=g.makeBld('farm',x,z,0);b.w=w;b.d=d;b.build=1;if(!g.state.buildings.includes(b))g.state.buildings.push(b);return b;};
test('a plot near a neighbour snaps edge to edge and lines up its side edge',()=>{
 const g=world(),a=put(g,0,0),w=base.w,d=base.d;
 const r=snapFieldRect(g,{x:w+1.5,z:1.2,w,d},0);
 assert.equal(r.snapped,true);assert.equal(r.rect.x,w);assert.equal(r.rect.z,0);assert.ok(r.mask&EDGE.W);assert.equal(r.edges[0].side,'W');assert.equal(r.edges[0].neighbourId,a.id);
 const far=snapFieldRect(g,{x:w+FIELD_SNAP_RULES.thresholdMetres+3,z:0,w,d},0);assert.equal(far.snapped,false);
});
test('abutting same-team fields are valid placements (no headland needed); overlap still refused',()=>{
 const g=world(),a=put(g,0,0),w=base.w,d=base.d;
 assert.equal(g.placementIssue('farm',w,0,0),null);
 assert.match(g.placementIssue('farm',w-1,0,0)||'',/close/);
});
test('drag anchor snaps to a neighbour corner or edge',()=>{
 const g=world(),a=put(g,0,0),w=base.w,d=base.d;
 const p=snapFieldPoint(g,{x:w/2+1,z:d/2+.8},0);assert.deepEqual([p.x,p.z,p.snapped],[w/2,d/2,true]);
 assert.equal(snapFieldPoint(g,{x:80,z:80},0).snapped,false);
});
test('merged drag lays plots edge to edge in a row with no gaps and all place',()=>{
 const g=world();const start={x:-30,z:-10},end={x:start.x+base.w*7,z:start.z+base.d};
 const plan=planFieldArea(g,start,end,0,{merge:true});assert.ok(plan.tiles.length>=3);
 const rows=plan.tiles.filter(t=>t.z===plan.tiles[0].z).sort((a,b)=>a.x-b.x);
 for(let i=1;i<rows.length;i++)assert.ok(Math.abs((rows[i].x-rows[i].w/2)-(rows[i-1].x+rows[i-1].w/2))<1e-6);
 const placed=placeFieldArea(g,plan,0);assert.equal(placed.length,plan.valid);
 const info=fieldNeighbourhood(g.state.buildings),mine=placed.map(t=>g.state.buildings.find(b=>b.type==='farm'&&Math.abs(b.x-t.x)<1e-6&&Math.abs(b.z-t.z)<1e-6));
 assert.equal(mine.every(Boolean),true);assert.equal(new Set(mine.map(b=>info.get(b.id).anchor)).size,1);
});
test('legacy drag (no merge) still leaves a headland',()=>{
 const g=world();const plan=planFieldArea(g,{x:-30,z:-10},{x:-30+base.w*7,z:-10+base.d},0);const rows=plan.tiles.filter(t=>t.z===plan.tiles[0].z).sort((a,b)=>a.x-b.x);
 assert.ok(rows[1].x-rows[1].w/2-(rows[0].x+rows[0].w/2)>.5);
});
test('neighbourhood masks and row groups',()=>{
 const g=world(),a=put(g,0,0),b=put(g,base.w,0),c=put(g,base.w*2,0),far=put(g,100,100);
 const m=fieldNeighbourhood(g.state.buildings);
 assert.equal(m.get(a.id).mask,EDGE.E);assert.equal(m.get(b.id).mask,EDGE.E|EDGE.W);assert.equal(m.get(c.id).mask,EDGE.W);assert.equal(m.get(far.id).mask,0);
 assert.equal(m.get(c.id).anchor,Math.min(a.id,b.id,c.id));assert.equal(m.get(far.id).anchor,far.id);
 assert.equal(touchingSides({x:0,z:0,w:10,d:10},{x:10,z:6,w:10,d:10}),EDGE.E);assert.equal(touchingSides({x:0,z:0,w:10,d:10},{x:10,z:12,w:10,d:10}),0);
});
