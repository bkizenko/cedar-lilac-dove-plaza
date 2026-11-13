import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {HORIZON_RULES,buildHorizon,horizonHeight,farHeight,ringOffsets,edgeDistance,horizonBudget,placeCanopies,horizonGround} from '../src/scene/horizonField.ts';
import {HorizonRing,continuationLookup} from '../src/scene/horizonRing.ts';
import {DRAW_DISTANCE_LEVELS,DRAW_DISTANCE_RULES,drawBands,drawDistanceBudget} from '../src/game/drawDistance.ts';
import {installPainterFog,PAINTER_FOG_RULES} from '../src/scene/painterFog.ts';
import {painterAtmosphere} from '../src/scene/painterAtmosphere.ts';

const SEA=.42,HALF=520;
/** Island: the playable edge is sea; a hill in the middle. */
const island=(x,z)=>Math.max(-3,12-Math.hypot(x,z)*.03);
/** Continent: the edge is land, 40 m high on the east side and sea on the west side. */
const edgeLand=(x,z)=>x>0?20+Math.min(60,x*.1):-3;
const base=(inner,over={})=>({seed:7,half:HALF,width:0,seaY:SEA,extent:1400,tier:'medium',inner,...over});

test('the ring is deterministic, finite and starts exactly on the map edge line',()=>{
 const a=buildHorizon(base(edgeLand)),b=buildHorizon(base(edgeLand));
 assert.deepEqual(Array.from(a.positions.slice(0,3000)),Array.from(b.positions.slice(0,3000)));
 assert.equal(a.indices.length,b.indices.length);
 for(const v of a.positions)assert.ok(Number.isFinite(v));
 const per=4*HORIZON_RULES.tiers.medium.side;
 for(let s=0;s<per;s++)assert.ok(Math.abs(Math.max(Math.abs(a.positions[s*3]),Math.abs(a.positions[s*3+2]))-HALF)<1e-3,'ring 0 sits on the edge line');
 const last=per*HORIZON_RULES.tiers.medium.rings;
 assert.ok(Math.abs(Math.max(Math.abs(a.positions[last*3]),Math.abs(a.positions[last*3+2]))-(HALF+1400))<1e-2,'outermost ring reaches the extent (the camera far plane)');
});
test('ring spacing is fine at the edge and coarse at the horizon, and the whole ring is up-facing',()=>{
 const o=ringOffsets(1400,26,1.15);assert.equal(o.length,27);assert.ok(Math.abs(o[26]-1400)<1e-6);
 assert.ok(o[1]-o[0]<6,'first step is a few metres');assert.ok(o[26]-o[25]>100);
 const g=buildHorizon(base(island)),p=g.positions,idx=g.indices;let down=0;
 for(let i=0;i<idx.length;i+=3){const a=idx[i]*3,b=idx[i+1]*3,c=idx[i+2]*3,ux=p[b]-p[a],uz=p[b+2]-p[a+2],vx=p[c]-p[a],vz=p[c+2]-p[a+2];if(uz*vx-ux*vz<=0)down++;}
 assert.equal(down,0,'every triangle faces up seen from above');
});
test('beyond the map the land does not end: an island edge becomes open sea to the horizon, a land edge continues as land that rises into ranges',()=>{
 const sea=buildHorizon(base(island));
 let seaV=0;for(const s of sea.sea)seaV+=s;assert.ok(seaV/sea.sea.length>.6,'an island edge is mostly sea beyond');
 for(let i=1;i<sea.positions.length;i+=3)if(sea.sea[(i-1)/3])assert.ok(Math.abs(sea.positions[i]-SEA)<1e-5,'sea vertices sit on the water line');
 const land=buildHorizon(base(edgeLand));
 let maxH=-1e9,landFar=0,n=0;const per=4*HORIZON_RULES.tiers.medium.side;
 for(let v=per*10;v<land.positions.length/3;v++){const x=land.positions[v*3];if(x<HALF)continue;n++;if(!land.sea[v])landFar++;maxH=Math.max(maxH,land.positions[v*3+1]);}
 assert.ok(landFar/n>.45,'land edge keeps land going for the first kilometre or more');
 assert.ok(maxH>SEA+60,'the far field has real relief');
 // heights are continuous across the blend: no cliff at the edge
 for(const z of [-300,0,260])assert.ok(Math.abs(horizonHeight(base(edgeLand),HALF+3,z)-horizonHeight(base(edgeLand),HALF,z))<3);
});
test('the continuation band joins the ring: its heights are used up to its outer edge and the ring lies under it',()=>{
 const width=160,inner=(x,z)=>edgeDistance(HALF,x,z)<=width?30:island(x,z);
 const inp=base(inner,{width});assert.equal(horizonHeight(inp,HALF+100,0),30);
 const g=buildHorizon(inp);let under=0,n=0;
 for(let v=0;v<g.positions.length/3;v++){const x=g.positions[v*3],z=g.positions[v*3+2];if(edgeDistance(HALF,x,z)>0&&edgeDistance(HALF,x,z)<=width&&!g.sea[v]){n++;if(g.positions[v*3+1]<30)under++;}}
 assert.ok(n>0&&under===n,'ring land under the transparent continuation is lower than it (no z-fight)');
 const pts=[];for(let r=0;r<=8;r++)for(let z=0;z<=100;z+=4)pts.push(HALF+r*20,10+r*5,z);const P=new Float32Array(pts);
 const look=continuationLookup({width:160,positions:P},HALF,()=>0);
 assert.ok(look(HALF+80,50)>9&&look(HALF+80,50)<51);assert.equal(look(0,0),0,'inside the square it is the world height');
});
test('forests: far canopies stand on forested lowland, grow with distance and respect the per-level cap',()=>{
 const inp=base(edgeLand,{extent:3000});
 const all=placeCanopies(inp,1e9);assert.ok(all.length>200,'a land edge has forest masses');
 for(const c of all){assert.ok(edgeDistance(HALF,c.x,c.z)>0,'never inside the playable map (the filler forest owns it)');assert.ok(c.y>SEA-3);}
 const near=all.filter(c=>edgeDistance(HALF,c.x,c.z)<250),far=all.filter(c=>edgeDistance(HALF,c.x,c.z)>1500);
 if(near.length&&far.length)assert.ok(far.reduce((s,c)=>s+c.r,0)/far.length>near.reduce((s,c)=>s+c.r,0)/near.length*2,'crowns grow with distance');
 assert.ok(placeCanopies(inp,150).length<=150);
 assert.equal(buildHorizon(base(edgeLand,{tier:'low'})).canopies.length,0,'Low draws no impostors');
});
test('draw-distance budget: ring + canopies stay within a fixed triangle and draw-call allowance per level',()=>{
 const allow={low:60000,medium:70000,high:100000,ultra:150000};
 for(const level of DRAW_DISTANCE_LEVELS){
  const b=horizonBudget(level),g=buildHorizon(base(edgeLand,{tier:level,extent:drawBands(level,1040).cameraFar}));
  assert.ok(b.triangles<=allow[level],`${level} budget ${b.triangles}`);
  assert.ok(g.stats.triangles+g.stats.canopyTriangles<=b.triangles,`${level} measured ${g.stats.triangles+g.stats.canopyTriangles} within the bound ${b.triangles}`);
  assert.ok(b.drawCalls<=2);
 }
 assert.ok(horizonBudget('low').triangles<horizonBudget('medium').triangles&&horizonBudget('medium').triangles<horizonBudget('high').triangles&&horizonBudget('high').triangles<horizonBudget('ultra').triangles);
});
test('the far field is never black or white: ground colours stay in a readable range, sea is blue-green',()=>{
 for(let x=-3000;x<=3000;x+=410)for(let z=-3000;z<=3000;z+=370){
  const h=farHeight(7,SEA,x,z,500,0),g=horizonGround(7,SEA,x,z,h,.3),l=(g.rgb[0]*.2+g.rgb[1]*.7+g.rgb[2]*.1);
  assert.ok(l>.04&&l<.92,`luminance ${l.toFixed(2)} at ${x},${z}`);
  if(g.sea)assert.ok(g.rgb[2]>g.rgb[0],'sea is blue-ish');
 }
});
test('ring view: two draw calls, never pickable, disposes everything',()=>{
 const scene=new THREE.Scene(),ring=new HorizonRing(scene);
 const world={size:1040,landContinuation:null,waterY:SEA};
 ring.build({world,state:{seed:3},height:island},'medium',drawBands('medium',1040));
 const c=ring.counts();assert.ok(c.drawCalls<=2&&c.triangles>20000);
 const hits=new THREE.Raycaster(new THREE.Vector3(700,500,0),new THREE.Vector3(0,-1,0)).intersectObjects(scene.children,true);assert.deepEqual(hits,[],'no picking surface');
 const before=ring.counts().triangles;ring.build({world,state:{seed:3},height:island},'low',drawBands('low',1040));
 assert.ok(ring.counts().triangles<before,'a lower level builds a cheaper ring');
 ring.dispose();assert.equal(scene.children.length,0);
});
test('aerial perspective: haze reaches the sky colour at the far plane, turns blue with distance, is thicker in the valley, and the horizon band is not flat white',()=>{
 installPainterFog();
 const frag=THREE.ShaderChunk.fog_fragment;
 assert.match(frag,/fogDensity < 0\.0/,'painter path is opt-in by the sign of the density');
 assert.match(frag,/exp\( - max\( fogMidY/,'valley mist decays exponentially with height');
 assert.match(frag,/fogFactor3/,'per-channel extinction');assert.ok(PAINTER_FOG_RULES.extinction[0]>PAINTER_FOG_RULES.extinction[2],'red is extinguished faster than blue');
 assert.ok(PAINTER_FOG_RULES.coolEndMetres>=1000&&PAINTER_FOG_RULES.coolEndMetres<=1400,'the blue shift keeps developing out to the far plane');
 for(const level of DRAW_DISTANCE_LEVELS.filter(l=>l!=='low')){const b=drawBands(level,1040),d=DRAW_DISTANCE_RULES.clearDensity*b.fogScale;assert.ok(1-Math.exp(-d*d*b.cameraFar*b.cameraFar)>=.949,`${level} far plane is hazed to the sky colour`);}
 const hex=h=>new THREE.Color(h),at=(o={})=>painterAtmosphere({elev:.9,dawn:0,dusk:0,night:false,weather:'clear',winter:0,autumn:0,spring:0,snow:0,day:3,...o});
 const noon=at(),f=hex(noon.fog),hz=hex(noon.skyHorizon),gnd=hex(noon.skyGround);
 assert.ok(f.b>f.r+.03,'clear-day haze is blue, not white');assert.ok(Math.abs(f.b-hz.b)<.08&&Math.abs(f.r-hz.r)<.08,'haze matches the horizon band of the sky');
 assert.ok(Math.abs(gnd.r-f.r)<.04&&Math.abs(gnd.b-f.b)<.04,'the dome below the horizon is the haze colour');
 for(const o of [{},{dusk:1,elev:.1},{dawn:1,elev:.1},{night:true},{weather:'storm'},{snow:1,winter:1}]){const p=at(o),c=hex(p.fog);assert.ok(c.r+c.g+c.b>.05,'haze never black');}
});
