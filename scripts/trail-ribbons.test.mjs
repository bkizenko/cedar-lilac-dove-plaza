import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {wearTrail,pathPace,TRAIL_GRID} from '../src/game/trails.ts';
import {TRAIL_RIBBON_RULES as R,trailRibbons,trailDisplayWear,trailPaceUnchanged} from '../src/game/trailRibbons.ts';

function fresh(){const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});g.enterIsland();g.state.trails=[];return g;}
function walk(g,points,step=.4){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(len/step));
  for(let k=0;k<n;k++){const t=k/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,dx=(b.x-a.x)/n,dz=(b.z-a.z)/n;wearTrail(g,x,z,dx,dz);}}}

test('display wear is strictly fainter than the saved wear, and ribbons do not change path pace',()=>{
  assert.ok(trailDisplayWear(.8)<.8&&trailDisplayWear(1)<1&&trailDisplayWear(.8)>0);
  const g=fresh();for(let i=0;i<4;i++)walk(g,[{x:0,z:0},{x:40,z:0}]);
  const mid=g.state.trails.find(t=>Math.abs((t.x??0)-20)<6);assert.ok(mid&&mid.wear>0.4);
  const pace=pathPace(g,mid.x,mid.z);assert.equal(trailPaceUnchanged(g,mid.x,mid.z),pace);
  const r=trailRibbons(g);assert.ok(r.length>=1);assert.ok(r.every(b=>b.points.every(p=>p.displayWear<=p.wear+1e-9&&p.displayWear<=trailDisplayWear(1))));
  const cell=g.world.size/TRAIL_GRID;assert.ok(r.every(b=>b.widthMetres<=Math.min(R.maxWidthMetres,cell*R.cellWidthFactor)+1e-9));
});

test('a blocky staircase walk becomes one smoother ribbon that stays on the worn cells',()=>{
  const g=fresh(),stair=[{x:-24,z:-24}];
  for(let i=0;i<8;i++){stair.push({x:stair.at(-1).x+6,z:stair.at(-1).z});stair.push({x:stair.at(-1).x,z:stair.at(-1).z+6});}
  walk(g,stair,.35);
  assert.ok((g.state.trails||[]).length>=8);
  const ribbons=trailRibbons(g),main=ribbons.reduce((a,b)=>b.lengthMetres>a.lengthMetres?b:a);
  assert.ok(main.points.length>=6,JSON.stringify({n:ribbons.length,len:main.lengthMetres,pts:main.points.length}));
  // every ribbon point stays close to some worn cell (no invented shortcuts off the path)
  const cells=g.state.trails;let far=0;for(const p of main.points){const d=Math.min(...cells.map(t=>Math.hypot(p.x-(t.x??0),p.z-(t.z??0))));if(d>R.linkMetres+.5)far++;}
  assert.equal(far,0,'ribbon stays on the worn ground');
  // smoother: fewer axis-aligned corners than the raw cell path of the same trail
  const axis=pts=>{let n=0,ax=0;for(let i=1;i<pts.length;i++){const dx=pts[i].x-pts[i-1].x,dz=pts[i].z-pts[i-1].z,h=Math.atan2(dz,dx);if(Math.hypot(dx,dz)<.15)continue;n++;const w=a=>Math.abs(Math.atan2(Math.sin(a),Math.cos(a)));if(Math.min(w(h),w(h-Math.PI/2),w(h-Math.PI),w(h+Math.PI/2))<.09)ax++;}return n?ax/n:0;};
  const raw=cells.map(t=>({x:t.x,z:t.z})).sort((a,b)=>a.x+a.z-(b.x+b.z));
  assert.ok(axis(main.points)<axis(raw)+1e-6||axis(main.points)<.85,`axis ${axis(main.points)} vs raw ${axis(raw)}`);
  console.log('GW-12 trails',JSON.stringify({cells:cells.length,ribbons:ribbons.length,main:main.lengthMetres,width:main.widthMetres,axisSmooth:+axis(main.points).toFixed(3),axisRaw:+axis(raw).toFixed(3)}));
});
