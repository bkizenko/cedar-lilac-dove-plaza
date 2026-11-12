import test from 'node:test';import assert from 'node:assert/strict';
import {BUILDINGS} from '../src/game/constants.ts';
import {ruinSpec,ruinTriangles} from '../src/scene/ruins.ts';
import {specBounds,floatingParts,partsAtLod,partBounds,structuralSignature,partTriangles} from '../src/scene/buildingParts.ts';
import {CARVED_MATERIALS} from '../src/scene/carvedPalette.ts';
import {CARVED_TYPES,carvedBuildingSpec} from '../src/scene/buildingStyleMap.ts';
import {generateWonderPlan} from '../src/scene/wonderPlans.ts';
const fp=t=>({w:BUILDINGS[t].w,d:BUILDINGS[t].d}),WON={ringObservatory:{w:26,d:26},cascadeGarden:{w:22,d:18},crescentHarbor:{w:48,d:40},millMarket:{w:34,d:28},canyonCistern:{w:30,d:30},assemblyCourt:{w:32,d:28}};
const SKIP=['palisade','stonewall','trench','moat'];
function* sources(){
 for(const type of CARVED_TYPES.filter(t=>!SKIP.includes(t)))for(const era of[0,2,3])for(let id=1;id<=2;id++){const spec=carvedBuildingSpec({worldSeed:5,type,id,era,habitat:id%2?'plains':'desert',footprint:fp(type),...(type==='grindingStone'?{waterSide:'+x',reviewWatermill:true}:type==='dock'?{waterSide:'+z'}:{})});if(spec)yield {label:`${type}/${era}/${id}`,spec};}
 for(const f of Object.keys(WON))for(const s of[1,2]){const p=generateWonderPlan(f,9,s,WON[f]);yield {label:f+s,spec:{family:p.family,footprint:p.footprint,parts:p.parts}};}
}
const all=[...sources()];
const wallVol=s=>s.parts.reduce((n,p)=>n+(p.size[1]>=.5?p.size[0]*p.size[1]*p.size[2]:0),0);
const roofish=p=>['thatch','shingle','tile'].includes(p.mat);
test('ruins stay in the footprint, above ground, supported at every LOD tier, with known materials',()=>{
 assert.ok(all.length>60);
 for(const {label,spec} of all)for(const d of[.25,.6,.9]){const r=ruinSpec(spec,{seed:3,decay:d,climate:label.length%2?'arid':'wet'}),b=specBounds(r),L=label+' d'+d;
  assert.ok(b.minX>=-spec.footprint.w/2-.2&&b.maxX<=spec.footprint.w/2+.2&&b.minZ>=-spec.footprint.d/2-.2&&b.maxZ<=spec.footprint.d/2+.2,L+' footprint '+JSON.stringify(b));
  for(const p of r.parts){assert.ok(partBounds(p).minY>=-1e-6,L+' below ground');assert.ok(CARVED_MATERIALS[p.mat],p.mat);assert.ok(!['fire','cloth','water'].includes(p.mat),L+' '+p.mat+' cannot survive');}
  for(const tier of[0,1,2])assert.deepEqual(floatingParts({...r,parts:partsAtLod(r,tier)}),[],L+' floating at tier '+tier);}
});
test('it is a physical transformation: roofs go, walls break, stone becomes rubble but never more than fell',()=>{
 let checked=0;
 for(const {label,spec} of all){const roofs=spec.parts.filter(roofish).length,sound=ruinSpec(spec,{seed:1,decay:0}),mid=ruinSpec(spec,{seed:1,decay:.6}),bad=ruinSpec(spec,{seed:1,decay:.95});
  if(roofs){assert.equal(mid.parts.filter(p=>roofish(p)&&p.pos[1]>.5).length,0,label+' roof still on at .6');assert.ok(mid.ruin.stats.roofPartsRemoved>=mid.ruin.stats.roofPartsBefore);}
  assert.ok(mid.ruin.stats.wallVolumeAfter<=mid.ruin.stats.wallVolumeBefore+1e-6);assert.ok(bad.ruin.stats.wallVolumeAfter<=mid.ruin.stats.wallVolumeBefore);
  assert.ok(mid.ruin.stats.rubbleM3<=mid.ruin.stats.stoneFallenM3+1e-6,label+' rubble exceeds the stone that fell');
  if(mid.ruin.stats.stoneFallenM3>1){assert.ok(mid.ruin.rubble.length>0,label+' no rubble');assert.ok(mid.ruin.stats.rubbleM3>=.2*mid.ruin.stats.stoneFallenM3,label+' too little rubble');checked++;}
  assert.ok(sound.parts.filter(p=>p.onlyFrom===undefined).length>=spec.parts.filter(p=>p.onlyFrom===undefined&&!['fire','cloth','water'].includes(p.mat)).length-sound.ruin.stats.roofPartsRemoved,label+' decay 0 keeps the building (minus perishables)');assert.equal(sound.ruin.stats.roofPartsRemoved,0,label+' a sound building keeps its roof');
  assert.notEqual(structuralSignature(mid),structuralSignature({...spec,variantKey:''}),label+' must differ structurally from the clean building');void sound;}
 assert.ok(checked>20,'enough cases with real stone fall '+checked);
});
test('decay is monotonic in standing wall volume; seeds vary the ruin; same seed is identical',()=>{
 const {spec}=all.find(a=>a.label.startsWith('townhall'))||all[0];
 const v=[0,.3,.6,.9].map(d=>ruinSpec(spec,{seed:2,decay:d}).ruin.stats.wallVolumeAfter);for(let i=1;i<v.length;i++)assert.ok(v[i]<=v[i-1]+1e-6,v.join());assert.ok(v[3]<v[0]*.6,'a deep ruin has lost much of its walls '+v);
 assert.deepEqual(ruinSpec(spec,{seed:2,decay:.6}),ruinSpec(spec,{seed:2,decay:.6}));const sigs=new Set(Array.from({length:12},(_,s)=>JSON.stringify(ruinSpec(spec,{seed:s,decay:.6}).parts)));assert.ok(sigs.size>=11);
});
test('growth: wet ruins are reclaimed by plants that touch a standing face or the ground; arid ruins drift with sand',()=>{
 for(const {label,spec} of all.slice(0,60)){const w=ruinSpec(spec,{seed:4,decay:.6,overgrowth:.9,climate:'wet'}),a=ruinSpec(spec,{seed:4,decay:.6,overgrowth:.9,climate:'arid'});
  assert.ok(a.ruin.growth.every(i=>a.parts[i].mat==='plaster'),label+' arid growth is sand');assert.ok(w.parts.some(p=>p.mat==='foliage'||p.mat==='foliageDark')||w.ruin.standing.length===0,label+' wet growth');
  assert.ok(!a.parts.some(p=>p.mat==='foliage'||p.mat==='foliageDark')||spec.parts.some(p=>p.mat==='foliage'||p.mat==='foliageDark'),label+' no plants in arid ruins');
  assert.equal(ruinSpec(spec,{seed:4,decay:.6,overgrowth:0,climate:'wet'}).ruin.growth.length,0);}
});
test('artifact slots: real places, inside the footprint, apart, tied to real covering parts, never inside open air walls',()=>{
 let withRubble=0,kinds=new Set();
 for(const {label,spec} of all)for(const d of[.4,.8]){const r=ruinSpec(spec,{seed:6,decay:d,climate:'temperate'}),s=r.ruin.slots,L=label+' d'+d;
  assert.ok(s.length>=1&&s.length<=10,L+' slots '+s.length);assert.equal(new Set(s.map(x=>x.id)).size,s.length);
  for(const x of s){kinds.add(x.kind);assert.ok(Math.abs(x.x)<=spec.footprint.w/2&&Math.abs(x.z)<=spec.footprint.d/2,L+' slot outside');assert.ok([0,1,2].includes(x.rarity)&&x.depthM>=0);
   if(x.access==='under-rubble'){const c=r.parts[x.coveredBy];assert.ok(c&&(r.ruin.rubble.includes(x.coveredBy)||r.ruin.fallen.includes(x.coveredBy)),L+' covered by a real fallen part');const b=partBounds(c);assert.ok(x.x>=b.minX-.5&&x.x<=b.maxX+.5&&x.z>=b.minZ-.5&&x.z<=b.maxZ+.5,L+' under its pile');withRubble++;}
   else if(x.access==='in-wall'){const b=partBounds(r.parts[x.coveredBy]);assert.ok(r.ruin.standing.includes(x.coveredBy)&&x.x>=b.minX&&x.x<=b.maxX&&x.z>=b.minZ&&x.z<=b.maxZ&&b.maxY>=1);}
   else if(x.access==='under-wall'){const b=partBounds(r.parts[x.coveredBy]);assert.ok(r.ruin.standing.includes(x.coveredBy)&&x.x>=b.minX&&x.x<=b.maxX&&x.z>=b.minZ&&x.z<=b.maxZ&&x.depthM>0,L+' foundation deposit lies under a standing wall');}
   else for(const i of r.ruin.standing){const b=partBounds(r.parts[i]);if(b.maxY>.5)assert.ok(!(x.x>b.minX&&x.x<b.maxX&&x.z>b.minZ&&x.z<b.maxZ),L+` slot ${x.kind} inside standing wall`);}}
  for(let i=0;i<s.length;i++)for(let j=i+1;j<s.length;j++)assert.ok(Math.hypot(s[i].x-s[j].x,s[i].z-s[j].z)>=.55,L+' slots overlap');}
 assert.ok(withRubble>40&&kinds.has('hearth')&&kinds.has('rubble')&&kinds.has('floorPit'),'varied real slots '+[...kinds]);
 const w=all.filter(a=>WON[a.spec.family]).map(a=>ruinSpec(a.spec,{seed:1,decay:.6}).ruin.slots.length),h=all.filter(a=>a.label.startsWith('hut/')).map(a=>ruinSpec(a.spec,{seed:1,decay:.6}).ruin.slots.length);assert.ok(w.length>=12&&Math.min(...w)>=3,'every wonder keeps at least three slots '+w);assert.ok(h.length>0);
});
test('triangle budget: ruins add bounded debris (rubble and growth) over what the source draws at each tier',()=>{
 let worst=[0,0,0];
 for(const {label,spec} of all){const r=ruinSpec(spec,{seed:2,decay:.5,overgrowth:.8,climate:'wet'}),base={...spec,variantKey:'',notes:{reference:''}};
  for(const t of[0,1,2]){const a=ruinTriangles(r,t),b=partsAtLod(base,t).reduce((n,p)=>n+partTriangles(p),0);worst[t]=Math.max(worst[t],a-b);assert.ok(a>0,label+' tier '+t+' empty');}}
 assert.ok(worst[0]<=3200&&worst[1]<=1400&&worst[2]<=900,'extra triangles over the source '+worst);
});
