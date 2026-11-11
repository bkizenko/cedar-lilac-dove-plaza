import test from 'node:test';import assert from 'node:assert/strict';
import {generateWonderPlan,segmentBlocked,WONDER_GENERATOR_VERSION,HULL_SEATS,hullSize} from '../src/scene/wonderPlans.ts';
import {specBounds,partBounds,floatingParts,structuralSignature} from '../src/scene/buildingParts.ts';
import {CARVED_MATERIALS} from '../src/scene/carvedPalette.ts';
import {BOAT_CLASSES} from '../src/game/boatClasses.ts';
import {buildCarvedMesh} from '../src/scene/carvedMesh.ts';
const FP={ringObservatory:{w:26,d:26},cascadeGarden:{w:22,d:18},crescentHarbor:{w:48,d:40},millMarket:{w:34,d:28}};
const plans=function*(){for(const f of Object.keys(FP))for(let site=1;site<=25;site++)yield generateWonderPlan(f,4242,site,FP[f]);};
const asSpec=p=>({family:p.family,variantKey:p.family+p.seed,footprint:p.footprint,parts:p.parts,notes:{reference:''}});

test('wonder plans are deterministic and versioned',()=>{
 for(const f of Object.keys(FP)){assert.deepEqual(generateWonderPlan(f,1,9,FP[f]),generateWonderPlan(f,1,9,FP[f]));assert.equal(generateWonderPlan(f,1,9,FP[f]).version,WONDER_GENERATOR_VERSION);}
});
test('wonders stay in their footprint, above ground, with no floating parts and known materials',()=>{
 for(const p of plans()){const b=specBounds(asSpec(p)),label=p.family+p.seed;
  assert.ok(b.minX>=-p.footprint.w/2-1e-6&&b.maxX<=p.footprint.w/2+1e-6&&b.minZ>=-p.footprint.d/2-1e-6&&b.maxZ<=p.footprint.d/2+1e-6,label+' footprint');
  for(const q of p.parts){assert.ok(partBounds(q).minY>=-1e-6,label+' below ground');assert.ok(CARVED_MATERIALS[q.mat],q.mat);}
  assert.deepEqual(floatingParts(asSpec(p)),[],label+' floating');
  const m=buildCarvedMesh(asSpec(p),0);assert.ok(m.triangles>0&&m.triangles<12000,label+' tris '+m.triangles);}
});
test('construction stages cover every part exactly once with physical quantities, structure first',()=>{
 for(const p of plans()){const seen=new Array(p.parts.length).fill(0);for(const s of p.stages)for(const i of s.partIndices)seen[i]++;
  assert.ok(seen.every(n=>n===1),p.family+' stage coverage');
  assert.ok(p.stages[0].volumeM3.stone>0,'first stage is masonry');
  for(const s of p.stages)for(const v of Object.values(s.volumeM3))assert.ok(v>0&&Number.isFinite(v));
  const planting=p.stages.findIndex(s=>s.id==='planting');if(planting>=0)assert.ok(planting>p.stages.findIndex(s=>s.id==='groundworks'));
  assert.ok(p.spaces.length>=2&&p.spaces.every(s=>s.areaM2>0&&s.purpose.length>10));}
});
test('ring observatory: open entry path to the court and an unobstructed sight slot',()=>{
 for(const p of plans()){if(p.family!=='ringObservatory')continue;
  const e=p.circulation.entrances[0],eye=1.5+.5;assert.ok(e.width>1.2);
  const notCentre=q=>Math.hypot(q.pos[0],q.pos[2])<1.2||q.mat==='cloth';
  assert.ok(!segmentBlocked(p,[e.x,e.z],[Math.cos(e.facing)*1.5,Math.sin(e.facing)*1.5],eye,notCentre),'entry blocked '+p.seed);
  const a=p.sightAzimuth,R=p.footprint.w;assert.ok(!segmentBlocked(p,[Math.cos(a)*1.3,Math.sin(a)*1.3],[Math.cos(a)*R/2,Math.sin(a)*R/2],eye,notCentre),'sight slot blocked '+p.seed);
  const s=p.circulation.stairs[0];assert.ok(s.riseM<=.2&&s.treadM>=.28,'comfortable entry steps');}
});
test('cascade garden: every terrace is reached by a stair; water drops exactly the wall heights',()=>{
 for(const p of plans()){if(p.family!=='cascadeGarden')continue;
  const L=p.levels;assert.ok(L.length>=2&&L[0]===0);for(let i=1;i<L.length;i++)assert.ok(L[i]>L[i-1]);
  for(let i=1;i<L.length;i++){const s=p.circulation.stairs.find(s=>Math.abs(s.fromLevel-L[i-1])<1e-6&&Math.abs(s.toLevel-L[i])<1e-6);assert.ok(s,'stair to terrace '+i);
   assert.ok(s.riseM<=.2&&s.treadM>=.28&&s.width>=1.2,'stair comfort');assert.ok(Math.abs(s.x)+s.width/2<=p.footprint.w/2);}
  const falls=p.parts.filter(q=>q.mat==='water'&&q.size[1]>.5).map(q=>q.size[1]).sort();const drops=L.slice(1).map((y,i)=>y-L[i]).sort();
  assert.equal(falls.length,drops.length);falls.forEach((f,i)=>assert.ok(Math.abs(f-drops[i])<.02,'cascade height matches wall'));}
});
test('seeds vary structure, not paint',()=>{
 for(const f of Object.keys(FP)){const sigs=new Set();for(let site=1;site<=25;site++)sigs.add(structuralSignature(asSpec(generateWonderPlan(f,4242,site,FP[f]))));assert.ok(sigs.size>=20,f+' '+sigs.size);}
 const terraces=new Set();for(let site=1;site<=25;site++)terraces.add(generateWonderPlan('cascadeGarden',4242,site,FP.cascadeGarden).levels.length);assert.ok(terraces.size>=2);
});
test('cascade stair lanes are clear of beds, trees and channels',()=>{
 for(const p of plans()){if(p.family!=='cascadeGarden')continue;
  for(const s of p.circulation.stairs){const x0=s.x-s.width/2,x1=s.x+s.width/2,z0=Math.min(s.zTop,s.zBottom),z1=Math.max(s.zTop,s.zBottom);
   for(const q of p.parts){if(!['foliage','trunk','water'].includes(q.mat)&&!(q.mat==='stoneDark'&&q.size[1]<.5))continue;const b=partBounds(q);
    assert.ok(b.maxX<=x0||b.minX>=x1||b.maxZ<=z0||b.minZ>=z1,`${p.seed} ${q.mat} blocks stair at ${s.x.toFixed(1)}`);}}}
});

// ---------- Crescent Harbor and Mill Market ----------
const segDist=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);};
const polyDist=(p,poly)=>Math.min(...poly.slice(1).map((q,i)=>segDist(p,poly[i],q)));
const hullCorners=b=>{const c=Math.cos(b.yaw),s=Math.sin(b.yaw),out=[];for(const lx of[-b.beam/2,b.beam/2])for(const lz of[-b.length/2,b.length/2])out.push([b.x+lx*c-lz*s*0+(-lz*0),0]);return out;};
// Berth yaw follows the box convention (local x = tangent); hull length runs along local x.
const hullPoly=b=>{const c=Math.cos(b.yaw),s=Math.sin(b.yaw),pts=[];for(const lx of[-b.length/2,b.length/2])for(const lz of[-b.beam/2,b.beam/2])pts.push([b.x+lx*c+lz*s,b.z-lx*s+lz*c]);return pts;};
const harbours=function*(){for(let site=1;site<=25;site++)yield generateWonderPlan('crescentHarbor',77,site,FP.crescentHarbor,{tidalRangeM:site%4,exposed:site%2===0});};
test('hull dimensions cover every real hull class in boatClasses.ts',()=>{
 assert.deepEqual(Object.keys(HULL_SEATS).sort(),Object.keys(BOAT_CLASSES).sort());for(const [k,v] of Object.entries(BOAT_CLASSES))assert.equal(HULL_SEATS[k],v.seats);
 assert.ok(hullSize(2).length<hullSize(5).length&&hullSize(5).length<hullSize(8).length);
});
test('harbour: berths use real hull classes and sizes, lie in the basin, clear of each other and of the water stairs',()=>{
 for(const p of harbours()){assert.ok(p.berths.length>=2,'berths '+p.seed+' '+p.berths.length);const {cx,cz,r}=p.basin;
  p.berths.forEach((b,i)=>{assert.equal(b.seats,BOAT_CLASSES[b.hullClass].seats);const h=hullSize(b.seats);assert.ok(b.length===h.length&&b.beam===h.beam);
   for(const c of hullPoly(b))assert.ok(Math.hypot(c[0]-cx,c[1]-cz)<=r-.1,`hull corner outside basin ${b.id} ${Math.hypot(c[0]-cx,c[1]-cz).toFixed(2)} vs ${r.toFixed(2)}`);
   for(const o of p.berths.slice(i+1))assert.ok(Math.hypot(o.x-b.x,o.z-b.z)>(o.length+b.length)/2*.8,'hulls overlap '+b.id+' '+o.id);
   for(const s of p.circulation.stairs.slice(1))for(const c of hullPoly(b))assert.ok(Math.hypot(c[0]-s.bottom[0],c[1]-s.bottom[1])>.3,'hull on a water stair');});}
});
test('harbour: every mooring is reachable by quay walk; stairs reach the water; street reaches the quay unobstructed',()=>{
 for(const p of harbours()){const [street,walk]=p.circulation.paths,{cx,cz,r}=p.basin,qy=p.quayTopY;
  for(const b of p.berths){assert.equal(b.bollards.length,2);for(const bl of b.bollards){const rad=Math.hypot(bl.x-cx,bl.z-cz);assert.ok(rad>=r&&rad<=r+3.4,'bollard on the quay');assert.ok(polyDist([bl.x,bl.z],walk)<=1.7,'bollard off the quay walk '+b.id);
    const near=Math.min(...hullPoly(b).map(c=>Math.hypot(c[0]-bl.x,c[1]-bl.z)));assert.ok(near<=3.2,'mooring line too long '+near.toFixed(2));}
   assert.ok(polyDist(b.boarding,walk)<=1.7,'boarding point reachable');
   const gap=Math.min(...hullPoly(b).map(c=>r-Math.hypot(c[0]-cx,c[1]-cz)));assert.ok(gap>=.05);}
  const stairs=p.circulation.stairs;assert.ok(stairs.length>=2);
  for(const s of stairs){assert.ok(s.riseM<=.2&&s.treadM>=.28&&s.width>=1.4,'stair comfort');}
  for(const s of stairs.slice(1)){assert.ok(polyDist(s.top,walk)<=1.7,'water stair joins the walk');assert.ok(s.riseM<=.2,'last step to water is a comfortable rise');}
  assert.ok(polyDist(street[street.length-1],walk)<=.3,'street joins the quay walk');
  const e=p.circulation.entrances[0];assert.ok(!segmentBlocked(p,[e.x,e.z],street[2],qy+1,q=>q.mat==='stone'&&q.size[1]<=qy+.01||q.mat==='stoneDark'&&q.size[1]<=qy+.01||q.mat==='water'),'street blocked by a warehouse');
  // Walkway beside the arcade columns stays wide enough for people with loads.
  const cols=p.parts.filter(q=>q.shape==='cylinder'&&q.mat==='stone'&&q.size[1]===2.5);for(const c of cols){const rad=Math.hypot(c.pos[0]-cx,c.pos[2]-cz);assert.ok(rad-.2-(r+.4)>=1.3,'arcade leaves a 1.3 m walk '+(rad-.2-(r+.4)).toFixed(2));}}
});
test('harbour: warehouses stand on plinths exactly their own size, never wider; tidal sites raise the quay',()=>{
 for(const p of harbours()){const walls=p.parts.filter(q=>q.shape==='box'&&q.mat==='woodMid'&&q.size[1]>2.9),plinths=p.parts.filter(q=>q.shape==='box'&&q.mat==='stoneDark'&&Math.abs(q.size[1]-p.quayTopY)<1e-6&&q.size[2]>3.5);
  assert.ok(walls.length>=3,'warehouses');assert.equal(walls.length,plinths.length);walls.forEach((w,i)=>{assert.ok(Math.abs(plinths[i].size[0]-w.size[0])<1e-9&&Math.abs(plinths[i].size[2]-w.size[2])<1e-9);});}
 const q=t=>generateWonderPlan('crescentHarbor',9,3,FP.crescentHarbor,{tidalRangeM:t}).quayTopY;assert.ok(q(3)>q(0)+.5,'tides raise the quay');
 const exposed=generateWonderPlan('crescentHarbor',9,3,FP.crescentHarbor,{exposed:true}),sheltered=generateWonderPlan('crescentHarbor',9,3,FP.crescentHarbor,{exposed:false});
 assert.ok(exposed.parts.some(q=>q.mat==='iron'&&q.shape==='box')&&!sheltered.parts.some(q=>q.mat==='iron'&&q.shape==='box'&&q.size[1]===.9),'exposed coast gets a harbour light');
});
const markets=function*(){for(let site=1;site<=25;site++)yield generateWonderPlan('millMarket',55,site,FP.millMarket,{flowDir:site%2?1:-1,flowSpeedMps:site%3?1:2,bankHeightM:.7+(site%4)*.2});};
test('mill market: the wheel stands in the water, inside the channel, with every part above ground',()=>{
 for(const p of markets()){const w=p.wheel,c=p.channel;assert.ok(w.bottomY<p.waterSurfaceY&&w.immersionM>=.1&&w.immersionM<=.5,'wheel immersion '+w.immersionM);
  assert.ok(w.z0>=c.z0&&w.z1<=c.z1&&Math.abs(w.x)+w.radius<p.footprint.w/2,'wheel inside the channel');assert.ok(w.bottomY>=0);
  const rim=p.parts.find(q=>q.shape==='cylinder'&&q.mat==='woodDark'&&q.sides===12),b=partBounds(rim);assert.ok(Math.abs(b.minY-w.bottomY)<1e-6&&b.minZ>=c.z0-1e-6&&b.maxZ<=c.z1+1e-6);
  const mill=p.parts.find(q=>q.shape==='box'&&q.size[1]>2.9&&q.size[2]<5&&Math.abs(partBounds(q).maxZ-c.z0)<.05);assert.ok(mill,'mill house stands on the channel edge');
  assert.ok(Math.abs(w.x-mill.pos[0])<mill.size[0]/2,'wheel is beside the mill house');}
});
test('mill market: arched bridge crosses the channel, clears the water and joins both courts by comfortable steps',()=>{
 for(const p of markets()){const br=p.bridge,c=p.channel;assert.ok(br.spanZ0===c.z0&&br.spanZ1===c.z1&&br.deckY>=p.courtY+1.2);
  const ring=p.parts.filter(q=>q.shape==='box'&&q.mat==='stone'&&!!q.rot&&q.size[0]===br.width&&q.size[1]===.35);assert.ok(ring.length>=9,'voussoir ring');
  const crown=Math.max(...ring.map(q=>q.pos[1]));assert.ok(crown>=p.waterSurfaceY+.8,'headroom over water');
  for(const q of ring){const b=partBounds(q);assert.ok(b.minZ>=c.z0-3.2&&b.maxZ<=c.z1+3.2);}
  const bs=p.circulation.stairs.filter(s=>s.fromLevel===p.courtY);assert.equal(bs.length,2);for(const s of bs){assert.ok(s.riseM<=.2&&s.treadM>=.28&&s.width>=2.4);assert.ok(Math.abs(s.toLevel-br.deckY)<1e-6);}
  const ent=p.circulation.stairs.filter(s=>s.fromLevel===0);assert.equal(ent.length,2);for(const s of ent)assert.ok(s.riseM<=.2&&s.treadM>=.28&&Math.abs(s.toLevel-p.courtY)<1e-6);}
});
test('mill market: stalls open on a clear aisle; mill door, bridge and both entrances connect; courts stay under 45% of the site',()=>{
 for(const p of markets()){const [north,cross,aisle,millWalk]=p.circulation.paths,y=p.courtY+1,ign=q=>q.mat==='water'||q.mat==='cloth'||q.mat==='woodLight'&&q.shape==='wedge';
  assert.ok(p.stalls.length>=2,'stalls '+p.stalls.length);
  for(const s of p.stalls){assert.ok(polyDist(s.access,aisle)<=p.aisleHalfWidth,'stall access off the aisle');assert.ok(!segmentBlocked(p,s.access,[s.access[0],aisle[0][1]],y,ign),'stall front blocked '+s.id);}
  for(let i=1;i<aisle.length;i++)assert.ok(!segmentBlocked(p,aisle[i-1],aisle[i],y,ign),'aisle blocked');
  for(let i=1;i<millWalk.length;i++)assert.ok(!segmentBlocked(p,millWalk[i-1],millWalk[i],y,ign),'mill door unreachable');
  const door=p.parts.find(q=>q.mat==='woodEdge'&&q.size[1]===2&&q.size[0]===.9);assert.ok(Math.hypot(millWalk[2][0]-door.pos[0],millWalk[2][1]-door.pos[2])<=1,'mill walk ends at the door');
  assert.ok(Math.hypot(north[north.length-1][0]-aisle[0][0],north[north.length-1][1]-aisle[0][1])<.1,'entry steps join the aisle');
  assert.ok(Math.hypot(cross[0][0]-aisle[0][0],cross[0][1]-aisle[0][1])<.1,'bridge path starts at the aisle');
  const courts=p.parts.filter(q=>q.shape==='box'&&q.mat==='stone'&&Math.abs(q.size[1]-p.courtY)<1e-6&&q.size[0]>10);assert.ok(courts.length===2);
  assert.ok(courts.reduce((a,q)=>a+q.size[0]*q.size[2],0)<p.footprint.w*p.footprint.d*.45,'courts are the market, not a platform');
  assert.equal(p.circulation.entrances.length,2);}
});
test('mill market site variants: bank height and flow change the plan; fast water adds a sluice weir; flow side flips mill and stalls',()=>{
 const a=generateWonderPlan('millMarket',3,1,FP.millMarket,{bankHeightM:.7,flowDir:1,flowSpeedMps:.5}),b=generateWonderPlan('millMarket',3,1,FP.millMarket,{bankHeightM:1.4,flowDir:-1,flowSpeedMps:2.5});
 assert.ok(b.courtY>a.courtY+.5);assert.ok(b.parts.length>a.parts.length-5&&b.parts.some(q=>q.mat==='stone'&&q.size[2]===b.channel.z1-b.channel.z0),'sluice weir at fast water');
 assert.ok(Math.sign(a.wheel.x)!==Math.sign(b.wheel.x),'mill moves with flow direction');
});
