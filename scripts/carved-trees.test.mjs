import test from 'node:test';import assert from 'node:assert/strict';
import {TREE_SPECIES,VARIANTS_PER_SPECIES,treeSpec,treeImpostor,treeInstance,speciesMix,seasonTint,treeBudget,treeTierForDistance,TREE_IMPOSTOR_TRIANGLES} from '../src/scene/carvedTrees.ts';
import {specBounds,partsAtLod,floatingParts,specTriangles,partBounds,structuralSignature} from '../src/scene/buildingParts.ts';
import {buildCarvedMesh} from '../src/scene/carvedMesh.ts';
import {CARVED_MATERIALS} from '../src/scene/carvedPalette.ts';
const all=function*(){for(const sp of TREE_SPECIES)for(let v=0;v<VARIANTS_PER_SPECIES;v++)yield {sp,v,spec:treeSpec(sp,v)};};

test('tree specs are deterministic, grounded, known materials, supported at every LOD tier',()=>{
 for(const {sp,v,spec} of all()){assert.deepEqual(spec,treeSpec(sp,v));assert.ok(spec.notes.reference.length>20);
  const b=specBounds(spec);assert.ok(b.minY>=-1e-6,sp);
  for(const p of spec.parts)assert.ok(CARVED_MATERIALS[p.mat]);
  for(const t of[0,1,2]){const sub={...spec,parts:partsAtLod(spec,t)};assert.ok(sub.parts.length>0);assert.deepEqual(floatingParts(sub),[],`${sp}${v}@${t} floating`);}
  for(const t of[0,1,2]){const m=buildCarvedMesh(spec,t);assert.equal(m.triangles,specTriangles(spec,t));}}
 assert.equal(treeSpec('broadleaf',VARIANTS_PER_SPECIES+1).variantKey,treeSpec('broadleaf',1).variantKey);
});
test('four distinct silhouettes with rounded lollipop crowns',()=>{
 const dim=sp=>{const b=specBounds(treeSpec(sp,0));return {w:Math.max(b.maxX-b.minX,b.maxZ-b.minZ),h:b.maxY};};
 assert.ok(dim('cypress').h/dim('cypress').w>3,'cypress is a narrow column');assert.ok(dim('shrub').h<1.7&&dim('shrub').h>.5,'shrub is low');
 assert.ok(dim('broadleaf').w>2.8&&dim('broadleaf').h>4&&dim('broadleaf').w/dim('broadleaf').h>.5,'broadleaf is a wide dome');
 assert.ok(dim('conifer').h>4.5&&dim('conifer').w/dim('conifer').h<.7,'conifer is tall and tapering');
 for(let v=0;v<VARIANTS_PER_SPECIES;v++){const s=treeSpec('broadleaf',v),crown=s.parts.filter(p=>p.shape==='sphere'),bole=s.parts.find(p=>p.shape==='cylinder'&&p.mat==='trunk'&&p.lod===2);
  assert.ok(crown.length>=3,'lobed crown');assert.ok(Math.max(...crown.map(p=>p.size[0]))>3,'crown dominates');assert.ok(partBounds(crown[0]).minY<bole.size[1]+.1,'crown sits on bole');}
 assert.ok(treeSpec('conifer',0).parts.some(p=>p.shape==='cone'));
 const sigs=new Set();for(const sp of TREE_SPECIES)for(let v=0;v<VARIANTS_PER_SPECIES;v++)sigs.add(structuralSignature(treeSpec(sp,v)));assert.ok(sigs.size>=13,'structural variants '+sigs.size);
});
test('LOD triangle budgets: near/mid/far and impostor stay tiny and monotone',()=>{
 const caps=[520,150,40];
 for(const {sp,v,spec} of all()){const n=[0,1,2].map(t=>specTriangles(spec,t));
  assert.ok(n[0]>=n[1]&&n[1]>=n[2]&&n[2]>0,`${sp}${v} ${n}`);assert.ok(n[0]>n[2],'far drops detail '+sp);
  for(let t=0;t<3;t++)assert.ok(n[t]<=caps[t],`${sp}${v}@${t} ${n[t]} > ${caps[t]}`);
  const c=treeImpostor(spec);assert.ok(c.width>0&&c.height>0);}
 assert.equal(treeTierForDistance(10),0);assert.equal(treeTierForDistance(40),1);assert.equal(treeTierForDistance(90),2);assert.equal(treeTierForDistance(200),3);
});
test('instances: deterministic, shared geometry keys, bounded pool, seeded variation, habitat mix',()=>{
 assert.deepEqual(treeInstance({worldSeed:1,id:7,habitat:'forest'}),treeInstance({worldSeed:1,id:7,habitat:'forest'}));
 const keys=new Set(),scales=new Set(),yaws=new Set(),species={};
 for(let id=0;id<2000;id++){const t=treeInstance({worldSeed:5,id,habitat:'forest'});keys.add(t.key);scales.add(t.scale);yaws.add(t.yaw.toFixed(2));species[t.species]=(species[t.species]??0)+1;assert.ok(t.scale>.4&&t.scale<1.3);}
 assert.ok(keys.size<=TREE_SPECIES.length*VARIANTS_PER_SPECIES,'geometry pool bounded '+keys.size);assert.ok(scales.size>20&&yaws.size>100);
 assert.ok(species.broadleaf>600&&species.conifer>500&&!species.cypress,JSON.stringify(species));
 const desert={};for(let id=0;id<1000;id++){const s=treeInstance({worldSeed:5,id,habitat:'desert'}).species;desert[s]=(desert[s]??0)+1;}assert.ok(desert.cypress>200&&desert.shrub>500&&!desert.broadleaf&&!desert.conifer);
 for(const h of['plains','forest','hills','desert','tundra','wetland'])assert.ok(Math.abs(Object.values(speciesMix(h)).reduce((a,b)=>a+b,0)-1)<1e-9);
 assert.ok(treeInstance({worldSeed:1,id:3,growth:.3}).scale<treeInstance({worldSeed:1,id:3,growth:1}).scale,'saplings are smaller');
});
test('seasons tint deciduous trees only; winter broadleaf crowns are flagged bare-state',()=>{
 assert.deepEqual(seasonTint('conifer','autumn'),seasonTint('conifer','summer'));assert.ok(seasonTint('broadleaf','autumn')[0]>seasonTint('broadleaf','autumn')[2]*1.8,'autumn is orange');
 assert.equal(treeInstance({worldSeed:1,id:2,habitat:'forest',season:'winter'}).visibleCrown||treeInstance({worldSeed:1,id:2,habitat:'forest',season:'winter'}).species!=='broadleaf',true);
});
test('budget per 1,000 trees is a handful of draws and tens of thousands of triangles at most',()=>{
 const b=treeBudget(1000);console.log('trees/1000',JSON.stringify(b));
 assert.ok(b.drawCalls<=TREE_SPECIES.length*(VARIANTS_PER_SPECIES*3+1)&&b.drawCalls>0);assert.ok(b.triangles<60000,'tris '+b.triangles);assert.ok(b.residentGeometryBytes<1024*1024);
 const dense=treeBudget(1000,undefined,[.3,.3,.3,.1]);assert.ok(dense.triangles>b.triangles);assert.ok(dense.triangles<250000);assert.equal(TREE_IMPOSTOR_TRIANGLES,4);
});
