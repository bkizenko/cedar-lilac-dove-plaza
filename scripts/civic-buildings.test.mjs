import test from 'node:test';import assert from 'node:assert/strict';
import {CIVIC_FAMILIES,CIVIC_ROLES,generateCivic,grammarOf} from '../src/scene/buildingFamiliesCivic.ts';
import {specBounds,floatingParts,partsAtLod,partBounds,structuralSignature,partTriangles} from '../src/scene/buildingParts.ts';
import {CARVED_MATERIALS} from '../src/scene/carvedPalette.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {generateCulture} from '../src/scene/cultureGrammar.ts';
const FAMS=Object.keys(CIVIC_FAMILIES);
const ctxOf=(f,i,o={})=>{const sizes=CIVIC_FAMILIES[f].sizes;return {seed:1000+i*7,era:[0,1,2,3,5][i%5],material:['timber','stone','wattle','mudbrick'][i%4],climate:['temperate','cold','wet','arid'][i%4],wealth:(i%5)/4,footprint:sizes[i%sizes.length],...o};};
function* all(n=25){for(const f of FAMS)for(let i=0;i<n;i++)yield {f,i,spec:generateCivic(f,ctxOf(f,i),`${f}${i}`)};}
const tri=(spec,t)=>partsAtLod(spec,t).reduce((s,p)=>s+partTriangles(p),0);
test('every family cites a real-world reference and is deterministic',()=>{
 assert.equal(FAMS.length,19);for(const f of FAMS){assert.ok(CIVIC_FAMILIES[f].reference.length>30,f);const c=ctxOf(f,3);assert.deepEqual(generateCivic(f,c,'k'),generateCivic(f,c,'k'));assert.ok(generateCivic(f,c,'k').notes.reference===CIVIC_FAMILIES[f].reference);}
});
test('footprint-true: nothing outside the footprint, nothing below ground, known materials, entry inside',()=>{
 for(const {f,i,spec} of all()){const b=specBounds(spec),L=`${f}#${i}`,{w,d}=spec.footprint;
  assert.ok(b.minX>=-w/2-1e-6&&b.maxX<=w/2+1e-6&&b.minZ>=-d/2-1e-6&&b.maxZ<=d/2+1e-6,L+' footprint '+JSON.stringify(b)+' in '+w+'x'+d);
  for(const p of spec.parts){assert.ok(partBounds(p).minY>=-1e-6,L+' below ground');assert.ok(CARVED_MATERIALS[p.mat],p.mat);}
  assert.ok(spec.entry&&Math.abs(spec.entry.x)<=w/2&&Math.abs(spec.entry.z)<=d/2+1e-6,L+' entry');
  // No platform bigger than the footprint: no flat slab covers more than the footprint in either axis.
  for(const p of spec.parts){const q=partBounds(p);if(q.maxY-q.minY<.5)assert.ok(q.maxX-q.minX<=w+1e-6&&q.maxZ-q.minZ<=d+1e-6,L+' slab');}}
});
test('grounded at every LOD tier: no floating parts',()=>{
 for(const {f,i,spec} of all())for(const t of[0,1,2])assert.deepEqual(floatingParts({...spec,parts:partsAtLod(spec,t)}),[],`${f}#${i} tier ${t}`);
});
test('LOD tiers shrink, every tier draws something, and triangle budgets hold per family',()=>{
 const worst={};for(const {f,i,spec} of all()){const n=[0,1,2].map(t=>tri(spec,t)),L=`${f}#${i} ${n}`;assert.ok(n[0]>=n[1]&&n[1]>=n[2]&&n[2]>0,L);const w=worst[f]??=[0,0,0];for(let t=0;t<3;t++)w[t]=Math.max(w[t],n[t]);}
 for(const f of FAMS){assert.ok(worst[f][0]<=(BUDGET.near[f]??1e9)&&worst[f][1]<=(BUDGET.mid[f]??1e9)&&worst[f][2]<=(BUDGET.far[f]??1e9),`${f} exceeds budget ${worst[f]}`);}
 console.log('# measured worst near/mid/far',JSON.stringify(worst));
});
const BUDGET={"near": {"marketHall": 1420, "shrine": 880, "archive": 800, "lyceum": 1260, "fortBarracks": 700, "smithy": 520, "kilnYard": 660, "storeBarn": 940, "dryingYard": 780, "tannery": 1040, "loomHouse": 1100, "bakeryOven": 580, "windmill": 480, "horseMill": 560, "harborStore": 660, "shipyard": 720, "beacon": 320, "gatehouse": 520, "townHall": 880}, "mid": {"marketHall": 640, "shrine": 660, "archive": 440, "lyceum": 1000, "fortBarracks": 420, "smithy": 280, "kilnYard": 480, "storeBarn": 780, "dryingYard": 400, "tannery": 440, "loomHouse": 460, "bakeryOven": 340, "windmill": 380, "horseMill": 560, "harborStore": 200, "shipyard": 580, "beacon": 240, "gatehouse": 480, "townHall": 460}, "far": {"marketHall": 280, "shrine": 580, "archive": 260, "lyceum": 780, "fortBarracks": 280, "smithy": 120, "kilnYard": 280, "storeBarn": 580, "dryingYard": 40, "tannery": 200, "loomHouse": 100, "bakeryOven": 220, "windmill": 320, "horseMill": 460, "harborStore": 40, "shipyard": 160, "beacon": 120, "gatehouse": 300, "townHall": 360}};
test('structural variation across seeds within each family (not paint)',()=>{
 for(const f of FAMS){const sigs=new Set();for(let i=0;i<25;i++)sigs.add(structuralSignature(generateCivic(f,ctxOf(f,0,{seed:500+i*13}),'v')));assert.ok(sigs.size>=8,`${f} only ${sigs.size} structures in 25 seeds`);}
});
test('era, prosperity, material and climate change the building; culture changes shrines and courtyards',()=>{
 for(const f of FAMS){const base=ctxOf(f,0,{seed:42,era:1,wealth:.2,material:'timber',climate:'temperate'}),sigs=new Set();
  for(const o of[{},{era:5},{wealth:.9},{material:'stone'},{climate:'arid'},{era:3,wealth:.9,material:'stone'}])sigs.add(JSON.stringify(generateCivic(f,{...base,...o},'x').parts));assert.ok(sigs.size>=4,`${f} barely reacts to context (${sigs.size})`);}
 const cs=Array.from({length:30},(_,i)=>generateCulture({seed:i+1})),gram=new Set(cs.map(c=>grammarOf({seed:1,culture:c})));assert.equal(gram.size,3,'all three shrine grammars occur across cultures');
 const bygram={};for(const c of cs){const g=grammarOf({seed:1,culture:c});bygram[g]??=new Set();bygram[g].add(structuralSignature(generateCivic('shrine',{...ctxOf('shrine',1,{seed:9}),culture:c},'s')));}
 const sigsAcross=new Set(Object.values(bygram).flatMap(s=>[...s]));assert.ok(sigsAcross.size>=6,'grammars look different '+sigsAcross.size);
 const col=cs.find(c=>grammarOf({seed:1,culture:c})==='colonnade'),ter=cs.find(c=>grammarOf({seed:1,culture:c})==='terrace');
 const a=generateCivic('shrine',{...ctxOf('shrine',1,{seed:9}),culture:col},'s'),b=generateCivic('shrine',{...ctxOf('shrine',1,{seed:9}),culture:ter},'s');assert.ok(a.parts.some(p=>p.shape==='cylinder')&&!b.parts.some(p=>p.shape==='cylinder'&&p.size[1]>2),'colonnade has columns, terrace has none');
});
test('market hall scales with its footprint: small hall, medium ring, large ring with a well',()=>{
 const n=(w,d)=>generateCivic('marketHall',ctxOf('marketHall',2,{seed:7,footprint:{w,d},era:2}),'m').parts.filter(p=>p.shape==='wedge'&&p.pos[1]>1.5).length;
 assert.equal(n(7.4,7),0);assert.ok(n(12,10)>=3);assert.ok(n(18,14)>n(12,10),'larger yard, more stalls');
});
test('fort barracks: the wall ring is closed except the gate gap, and the gap equals the entry width',()=>{
 for(let i=0;i<20;i++){const s=generateCivic('fortBarracks',ctxOf('fortBarracks',i,{seed:3000+i}),'f'),[back,left,right,segL,segR]=s.parts.slice(0,5).map(partBounds),tol=.02;
  assert.ok(Math.abs(segR.minX-segL.maxX-s.entry.width)<tol,'gate gap = entry width #'+i);
  assert.ok(Math.abs(segL.minX-back.minX)<tol&&Math.abs(segR.maxX-back.maxX)<tol,'front wall reaches both corners #'+i);
  assert.ok(Math.abs(left.minZ-back.maxZ)<tol&&Math.abs(right.minZ-back.maxZ)<tol,'side walls start at the back wall #'+i);
  assert.ok(Math.abs(left.maxZ-segL.minZ)<tol&&Math.abs(right.maxZ-segR.minZ)<tol,'side walls end at the front wall #'+i);
  assert.ok(back.maxY>=2&&left.maxY===back.maxY&&segL.maxY===back.maxY,'one wall height #'+i);
  assert.ok(Math.abs(s.entry.z-segL.maxZ)<=.6,'entry sits in the gate #'+i);}
 const closed=generateCivic('fortBarracks',ctxOf('fortBarracks',1,{seed:5,gateOpen:false}),'f'),open=generateCivic('fortBarracks',ctxOf('fortBarracks',1,{seed:5}),'f');assert.notDeepEqual(closed.parts,open.parts,'gate state changes the leaves');
});
test('lit state: fire parts exist when lit and vanish when cold (smithy, kiln, bakery, beacon)',()=>{
 for(const f of['smithy','kilnYard','bakeryOven','beacon']){const c=ctxOf(f,1,{seed:11});assert.ok(generateCivic(f,c,'l').parts.some(p=>p.mat==='fire'),f+' lit');assert.ok(!generateCivic(f,{...c,lit:false},'l').parts.some(p=>p.mat==='fire'),f+' cold');}
});
test('roles: simulation ids are real BldTypes, proposed ids are not, every family is reachable',()=>{
 for(const [id,r] of Object.entries(CIVIC_ROLES)){assert.ok(CIVIC_FAMILIES[r.family],id);if(r.sim)assert.ok(BUILDINGS[id],id+' should be a real building id');else assert.ok(!BUILDINGS[id],id+' is proposed, not real');}
 for(const f of FAMS)assert.ok(Object.values(CIVIC_ROLES).some(r=>r.family===f),f+' has a role');
 assert.ok(Object.values(CIVIC_ROLES).filter(r=>!r.sim).length>=6);
});
test('windmill sails clear the ground; shipyard hull stays in the slip footprint',()=>{
 for(let i=0;i<20;i++){const s=generateCivic('windmill',ctxOf('windmill',i,{seed:77+i}),'w');assert.ok(s.parts.every(p=>partBounds(p).minY>=-1e-6));}
 for(let i=0;i<10;i++){const s=generateCivic('shipyard',ctxOf('shipyard',i,{seed:9+i}),'s'),b=specBounds(s);assert.ok(b.maxZ<=s.footprint.d/2&&b.minZ>=-s.footprint.d/2);}
});
const CULTS=[1,2,3,4,5,6,7,8,9,10,11,12].map(i=>generateCulture({seed:i*97}));
test('culture is the default path: 6 cultures give measurably different silhouettes for the same building id',()=>{
 for(const f of FAMS){const base=ctxOf(f,1,{seed:314,era:2,wealth:.5}),sil=new Set(),heights=new Set(),sigs=new Set();
  for(const c of CULTS.slice(0,6)){const s=generateCivic(f,{...base,culture:c},'c'),b=specBounds(s);sigs.add(structuralSignature(s));heights.add(b.maxY.toFixed(1));sil.add([b.maxY.toFixed(1),(b.maxX-b.minX).toFixed(1),(b.maxZ-b.minZ).toFixed(1),s.parts.length].join('|'));assert.equal(s.notes.culture,c.key);}
  assert.ok(sil.size>=4,`${f}: only ${sil.size} distinct silhouettes across 6 cultures`);assert.ok(sigs.size>=4,`${f}: ${sigs.size} signatures`);}
});
test('cultures keep every family footprint-true, grounded at all tiers (stilts, courtyards, banners included)',()=>{
 let stilts=0;for(const f of FAMS)for(const [i,c] of CULTS.entries()){const s=generateCivic(f,{...ctxOf(f,i),culture:c},'c'),b=specBounds(s),{w,d}=s.footprint;if(c.architecture.stilts)stilts++;
  assert.ok(b.minX>=-w/2-1e-6&&b.maxX<=w/2+1e-6&&b.minZ>=-d/2-1e-6&&b.maxZ<=d/2+1e-6,`${f} culture ${i} footprint`);
  for(const t of[0,1,2])assert.deepEqual(floatingParts({...s,parts:partsAtLod(s,t)}),[],`${f} culture ${i} tier ${t}`);}
 assert.ok(stilts>0,'some cultures build on stilts');
});
test('culture habits come from the culture: unpinned takes its material, climate and tradition; pinned keeps the caller\'s',()=>{
 const c=CULTS[0],base=ctxOf('smithy',1,{seed:5}),a=generateCivic('smithy',{...base,culture:c},'x'),m=generateCivic('smithy',{...base,culture:c,material:c.architecture.material,climate:c.architecture.climate,tradition:c.architecture.tradition,pinned:true},'x');
 assert.deepEqual(a.parts,m.parts);
});
