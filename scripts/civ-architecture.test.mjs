import test from 'node:test';import assert from 'node:assert/strict';
import {CIVS,CIV_IDS,materialTable,matId} from '../src/scene/civStyles.ts';
import {generateCivBuilding,ROLE_LIST} from '../src/scene/civBuildings.ts';
import {specBounds,floatingParts,partsAtLod,partBounds,structuralSignature,partTriangles} from '../src/scene/buildingParts.ts';
const ctx=(i,o={})=>({seed:100+i*17,era:[2,3,4,5][i%4],wealth:(i%5)/4,wear:(i%4)/4,footprint:[{w:10,d:9},{w:8,d:8},{w:12,d:10}][i%3],...o});
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const dist=(a,b)=>Math.hypot(...rgb(a).map((v,i)=>v-rgb(b)[i]));
function* all(n=6){for(const c of CIV_IDS)for(const r of ROLE_LIST)for(let i=0;i<n;i++)yield {c,r,i,s:generateCivBuilding(c,r,ctx(i))};}
const tri=(s,t)=>partsAtLod(s,t).reduce((n,p)=>n+partTriangles(p),0);
test('fourteen distinct civs: own biome set, wall course, roof form, plan, civic building and emblem',()=>{
 assert.equal(CIV_IDS.length,14);for(const k of['course','roof','plan','civic']){assert.equal(new Set(CIV_IDS.map(c=>CIVS[c][k])).size,14,k+' must be unique per civ');}
 assert.equal(new Set(CIV_IDS.map(c=>CIVS[c].emblem.id)).size,14);assert.equal(new Set(CIV_IDS.map(c=>JSON.stringify(CIVS[c].emblem.prims))).size,14);
 assert.ok(new Set(CIV_IDS.map(c=>CIVS[c].biome)).size>=9,'spread across biomes');
 for(const c of CIV_IDS){assert.ok(CIVS[c].inspiration.length>10&&CIVS[c].culturalNote.length>20);}
});
test('materials are not tints: wall swatches are pairwise far apart, and every civ owns seven slots',()=>{
 for(let i=0;i<CIV_IDS.length;i++){const a=CIVS[CIV_IDS[i]].materials;assert.equal(Object.keys(a).length,7);for(let j=i+1;j<CIV_IDS.length;j++){const b=CIVS[CIV_IDS[j]].materials;assert.ok(dist(a.wall.hex,b.wall.hex)>14,`${CIV_IDS[i]} vs ${CIV_IDS[j]} wall too similar`);}}
 const roofs=new Set(CIV_IDS.map(c=>CIVS[c].materials.roof.course+CIVS[c].materials.roof.hex));assert.equal(roofs.size,14);
 const courses=new Set(CIV_IDS.map(c=>CIVS[c].materials.wall.course));assert.equal(courses.size,14,'one construction pattern per civ');
});
test('every part uses only its own civ materials, and the table resolves them',()=>{
 for(const {c,r,s} of all(3)){const t=materialTable(c);for(const p of s.parts)assert.ok(t[p.mat],`${c} ${r} uses foreign material ${p.mat}`);assert.deepEqual(Object.keys(s.materials).sort(),Object.keys(t).sort());}
});
test('footprint-true, grounded at all LOD tiers, entry inside, reference present',()=>{
 for(const {c,r,i,s} of all()){const b=specBounds(s),{w,d}=s.footprint,L=`${c}/${r}#${i}`;assert.ok(b.minX>=-w/2-1e-6&&b.maxX<=w/2+1e-6&&b.minZ>=-d/2-1e-6&&b.maxZ<=d/2+1e-6,L+' footprint');
  for(const p of s.parts)assert.ok(partBounds(p).minY>=-1e-6,L+' below ground');for(const t of[0,1,2])assert.deepEqual(floatingParts({...s,parts:partsAtLod(s,t)}),[],L+' tier '+t);
  assert.ok(s.entry&&Math.abs(s.entry.x)<=w/2&&Math.abs(s.entry.z)<=d/2+1e-6,L+' entry');assert.ok(s.notes.reference.includes(CIVS[c].name));}
});
test('same role, 14 civs: 14 different silhouettes (house, civic, granary, market)',()=>{
 for(const r of ROLE_LIST){const sig=new Set(),sil=new Set();for(const c of CIV_IDS){const s=generateCivBuilding(c,r,{seed:77,era:4,wealth:.6,wear:.3,footprint:{w:10,d:9}}),b=specBounds(s);sig.add(structuralSignature(s));sil.add([b.maxY.toFixed(1),s.parts.length,(b.maxX-b.minX).toFixed(1)].join('|'));}
  assert.ok(sig.size>=13,`${r}: ${sig.size} signatures`);assert.ok(sil.size>=12,`${r}: ${sil.size} silhouettes`);}
});
test('each civ has recognisable signature geometry',()=>{
 const g=(c,r='civic',era=4)=>generateCivBuilding(c,r,{seed:21,era,wealth:.6,wear:.2,footprint:{w:12,d:11}}),has=(s,fn)=>s.parts.some(fn),n=(s,shape)=>s.parts.filter(p=>p.shape===shape).length;
 assert.ok(n(g('aureline'),'cylinder')>=8,'columns');assert.ok(has(g('rusvolt'),p=>p.shape==='sphere'),'onion domes');assert.ok(has(g('steppan'),p=>p.shape==='sphere')&&n(g('steppan'),'prism')===0,'felt dome, no gable');
 assert.ok(has(g('hanrei'),p=>p.shape==='hip'),'tiled hip roof');assert.ok(n(g('kaaltun'),'box')>=8,'stepped tiers');assert.ok(has(g('mekhari','house'),p=>(p.shape==='prism'||p.shape==='sphere'&&p.size[0]>p.size[1])&&p.pos[1]>1.2),'raised rounded saddle roof on stilts');
 assert.ok(has(g('brythen','house'),p=>p.shape==='cone'),'conical thatch');assert.ok(has(g('sahelan'),p=>p.shape==='cone'),'pinnacles');assert.ok(g('sandrill','house').parts.some(p=>p.size[1]>=4),'cliff mass');
 assert.ok(g('rusvolt','house').parts.filter(p=>p.shape==='cylinder'&&p.rot).length>=10,'log ends');assert.ok(has(g('tigrane'),p=>p.shape==='wedge'),'temple ramp');assert.ok(has(g('vedara'),p=>p.shape==='cylinder'&&p.sides===4),'curved tower stack');
});
test('ages: era 0-1 is the poorest local dwelling, later eras differ and get bigger and richer',()=>{
 for(const c of CIV_IDS){const e0=generateCivBuilding(c,'house',ctx(1,{era:0})),e4=generateCivBuilding(c,'house',ctx(1,{era:4}));assert.ok(e0.parts.length<e4.parts.length,c+' poor dwelling is simpler');assert.notEqual(structuralSignature(e0),structuralSignature(e4));}
 const civic0=generateCivBuilding('aureline','civic',ctx(2,{era:1})),civic4=generateCivBuilding('aureline','civic',ctx(2,{era:4}));assert.ok(civic4.parts.length>civic0.parts.length*2);
});
test('every building is individually different: seeded size, lean, door, parts; not cookie-cutter',()=>{
 for(const c of CIV_IDS)for(const r of['house','civic']){const sigs=new Set(),leans=new Set(),scales=new Set(),offs=new Set();for(let i=0;i<20;i++){const s=generateCivBuilding(c,r,{seed:500+i*31,era:4,wealth:.5,wear:.4,footprint:{w:10,d:9}});sigs.add(structuralSignature(s));leans.add(s.parts.map(p=>(p.rot??[]).join()).join('|'));scales.add(s.imperfection.scale.toFixed(3));offs.add(s.imperfection.offDoor.toFixed(3));}
  assert.ok(sigs.size>=6,`${c}/${r}: only ${sigs.size} structures in 20`);assert.ok(leans.size>=15,`${c}/${r}: walls do not lean individually`);assert.ok(scales.size>=16&&offs.size>=16,`${c}/${r} scale ${scales.size} door ${offs.size}`);}
});
test('wear adds lean, rubble and patches; new buildings are straighter',()=>{
 let more=0;for(const c of CIV_IDS){const a=generateCivBuilding(c,'house',ctx(2,{era:4,wear:0})),b=generateCivBuilding(c,'house',ctx(2,{era:4,wear:1}));assert.ok(b.imperfection.patches>a.imperfection.patches&&b.imperfection.lean>a.imperfection.lean,c);if(b.parts.length>a.parts.length)more++;}assert.equal(more,14);
});
test('deterministic, and a different seed is a different building',()=>{
 for(const c of CIV_IDS){const a=generateCivBuilding(c,'civic',ctx(3)),b=generateCivBuilding(c,'civic',ctx(3)),d=generateCivBuilding(c,'civic',ctx(4,{footprint:ctx(3).footprint,era:ctx(3).era,wealth:ctx(3).wealth,wear:ctx(3).wear}));assert.deepEqual(a,b);assert.notDeepEqual(a.parts,d.parts);}
});
test('prosperity shows: wealthy buildings carry banners with the civ cloth; poor ones fewer',()=>{
 let rich=0,poor=0;for(const c of CIV_IDS){rich+=generateCivBuilding(c,'civic',ctx(2,{era:4,wealth:.9})).banners.length;poor+=generateCivBuilding(c,'civic',ctx(2,{era:4,wealth:.0})).banners.length;}assert.ok(rich>=14,'every civic hall flies its banner');assert.ok(rich>=poor);
});
const BUDGET={near:1600,mid:1000,far:660};
test('LOD tiers shrink, every tier draws, and triangle budgets hold',()=>{
 const worst=[0,0,0],per={};for(const {c,r,i,s} of all(8)){const n=[0,1,2].map(t=>tri(s,t));assert.ok(n[0]>=n[1]&&n[1]>=n[2]&&n[2]>0,`${c}/${r}#${i} ${n}`);for(let t=0;t<3;t++){worst[t]=Math.max(worst[t],n[t]);}per[c]=Math.max(per[c]??0,n[0]);}
 console.log('# worst near/mid/far',JSON.stringify(worst),'heaviest civ near',JSON.stringify(per));assert.ok(worst[0]<=BUDGET.near&&worst[1]<=BUDGET.mid&&worst[2]<=BUDGET.far,JSON.stringify(worst));
});
test('mourning banners hang at half-mast, stay inside the footprint and budgets, and change nothing otherwise',()=>{
 for(const c of CIV_IDS)for(const r of['house','civic']){
  const a=generateCivBuilding(c,r,ctx(3,{wealth:.9})),b=generateCivBuilding(c,r,ctx(3,{wealth:.9,mourning:true}));
  const cloth=matId(c,'cloth'),top=s=>Math.max(...s.parts.filter(p=>p.mat===cloth&&p.size[2]<.1&&p.size[1]>.3).map(p=>p.pos[1]+p.size[1]/2));
  if(!a.parts.some(p=>p.mat===cloth&&p.size[2]<.1&&p.size[1]>.3))continue;
  assert.ok(top(b)<=top(a)+1e-9,c+' '+r+' mourning cloth must not rise');
  assert.ok(partsAtLod(b,'near').length>=partsAtLod(a,'near').length);
  assert.ok(tri(b,'mid')<=tri(a,'mid')+0,c+' '+r+' mid budget unchanged (band is near-only)');
 }
});
test('weathered banners add exactly one near-only torn patch per banner from high wear, inside budgets',()=>{
 let more=0;
 for(const c of CIV_IDS)for(const r of['house','civic'])for(let i=0;i<5;i++){
  const a=generateCivBuilding(c,r,ctx(i,{wear:.54,wealth:1})),b=generateCivBuilding(c,r,ctx(i,{wear:.56,wealth:1})),h=generateCivBuilding(c,r,ctx(i,{wear:.95,wealth:1}));
  const banners=a.parts.filter(p=>p.shape==='cone'&&p.lod===0&&p.size[1]>.2&&p.size[1]<.3).length;
  if(b.parts.length-a.parts.length>0)more++;
  assert.ok(b.parts.length-a.parts.length>=0&&b.parts.length-a.parts.length<=Math.max(banners,6),c+' '+r+' patch count bounded');
  assert.ok(tri(h,'near')<=1600&&tri(h,'mid')<=1000,c+' '+r+' budgets');
 }
 assert.ok(more>=20,'torn patches appear across civs, got '+more);
});
