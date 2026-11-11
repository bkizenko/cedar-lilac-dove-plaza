import test from 'node:test';import assert from 'node:assert/strict';
import {generateWonderPlan,segmentBlocked,WONDER_GENERATOR_VERSION} from '../src/scene/wonderPlans.ts';
import {specBounds,partBounds,floatingParts,structuralSignature} from '../src/scene/buildingParts.ts';
import {CARVED_MATERIALS} from '../src/scene/carvedPalette.ts';
import {buildCarvedMesh} from '../src/scene/carvedMesh.ts';
const FP={ringObservatory:{w:26,d:26},cascadeGarden:{w:22,d:18}};
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
