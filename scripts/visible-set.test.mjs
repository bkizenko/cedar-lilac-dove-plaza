import test from 'node:test';import assert from 'node:assert/strict';
import {visibleSet,levelFor,DEFAULT_BANDS as B,DEFAULT_CAPS as C} from '../src/scene/visibleSet.ts';
function world(nVill=20,per=25,seed=1){let s=seed;const r=()=>(s=(s*1664525+1013904223)>>>0)/4294967296;const out=[];
 for(let v=0;v<nVill;v++){const x=(v%5)*700+r()*80,z=Math.floor(v/5)*700+r()*80,bs=[];for(let i=0;i<per;i++)bs.push({id:`v${v}b${i}`,x:x+(r()-.5)*90,z:z+(r()-.5)*90,kind:['house','farm','forge','market','granary','shrine'][Math.floor(r()*6)]+Math.floor(r()*3)});out.push({id:`v${v}`,x,z,buildings:bs});}return out;}
const W=world();
test('world is 20 villages and 500 buildings',()=>{assert.equal(W.length,20);assert.equal(W.reduce((n,s)=>n+s.buildings.length,0),500);});
test('caps hold for every camera position in a sweep over the world',()=>{
 let worst={draws:0,instances:0,full:0};let prev;
 for(let x=-400;x<=3900;x+=97)for(let z=-400;z<=2900;z+=89){const v=visibleSet({camera:{x,z},settlements:W,previous:prev});prev=v.state;const s=v.stats;
  assert.ok(s.draws<=C.maxDraws&&s.instances<=C.maxInstances&&s.fullBuildings<=C.maxFullBuildings&&s.cards<=C.maxCards,`caps at ${x},${z}: ${JSON.stringify(s)}`);
  worst.draws=Math.max(worst.draws,s.draws);worst.instances=Math.max(worst.instances,s.instances);worst.full=Math.max(worst.full,s.fullBuildings);}
 console.log('# worst frame',JSON.stringify(worst));});
test('tight caps force degradation but never exceed the caps',()=>{
 const caps={maxDraws:12,maxInstances:80,maxFullBuildings:10,maxCards:4},c=W[0].buildings[0],v=visibleSet({camera:{x:c.x,z:c.z},settlements:W,caps});
 assert.ok(v.stats.draws<=12&&v.stats.instances<=80&&v.stats.fullBuildings<=10&&v.cards.length<=4);assert.ok(v.stats.degraded>0);});
test('nothing is drawn beyond the far radius; a far settlement is a single card',()=>{
 const v=visibleSet({camera:{x:-5000,z:-5000},settlements:W});assert.equal(v.stats.draws,0);assert.equal(v.cards.length,0);
 const s=W[0],cam={x:s.x+B.far-100,z:s.z},w=visibleSet({camera:cam,settlements:[s]});assert.equal(w.cards.length,1);assert.ok(w.chunks.every(c=>c.residency==='none'));assert.equal(w.stats.draws,1);});
test('detail follows distance: full close, merged, impostor, none',()=>{
 const s={id:'s',x:0,z:0,buildings:[{id:'a',x:5,z:5,kind:'h'}]};const at=d=>visibleSet({camera:{x:5+d,z:5},settlements:[s]}).chunks[0]?.residency;
 assert.equal(at(1),'full');assert.equal(at(B.full+40),'merged');assert.equal(at(B.merged+60),'impostor');});
test('hysteresis: hovering on a band edge does not pop; moving through the edge switches once',()=>{
 const edge=B.full;let r=levelFor(edge-30,B);assert.equal(r,'full');
 for(const d of[edge+3,edge-3,edge+8,edge-8,edge+10])r=levelFor(d,B,r),assert.equal(r,'full','held at '+d);
 r=levelFor(edge+B.hysteresis+2,B,r);assert.equal(r,'merged');
 for(const d of[edge+3,edge-3,edge-B.hysteresis+3])r=levelFor(d,B,r),assert.equal(r,'merged','held back at '+d);
 r=levelFor(edge-B.hysteresis-2,B,r);assert.equal(r,'full');
 // a camera dithering +-6 m about every edge never toggles after settling
 for(const e of[B.full,B.merged,B.impostor]){let lv=levelFor(e-50,B),n=0;for(let i=0;i<40;i++){const nx=levelFor(e+(i%2?6:-6),B,lv);if(nx!==lv)n++;lv=nx;}assert.equal(n,0,'edge '+e);}
});
test('a walk through a village changes residency monotonically per chunk (no flicker)',()=>{
 const s=W[3];let prev,hist={};for(let x=s.x-600;x<=s.x+600;x+=4){const v=visibleSet({camera:{x,z:s.z},settlements:[s],previous:prev});prev=v.state;for(const c of v.chunks)(hist[c.id]??=[]).push(c.residency);}
 for(const h of Object.values(hist)){let flips=0;for(let i=1;i<h.length;i++)if(h[i]!==h[i-1])flips++;assert.ok(flips<=6,'chunk flips '+flips+' '+[...new Set(h)]);}
});
test('deterministic, and the same call twice agrees',()=>{const a=visibleSet({camera:{x:300,z:300},settlements:W}),b=visibleSet({camera:{x:300,z:300},settlements:W});assert.deepEqual(a,b);});
test('dense world (20 villages 150 m apart, 500 buildings) still stays under the caps and degrades far chunks first',()=>{
 const D=world(20,25,7).map((s,i)=>{const dx=(i%5)*150-s.x,dz=Math.floor(i/5)*150-s.z;return {...s,x:s.x+dx,z:s.z+dz,buildings:s.buildings.map(b=>({...b,x:b.x+dx,z:b.z+dz}))};});
 let worst=0;for(let x=-100;x<=700;x+=53)for(let z=-100;z<=500;z+=47){const v=visibleSet({camera:{x,z},settlements:D}),s=v.stats;worst=Math.max(worst,s.draws);assert.ok(s.draws<=C.maxDraws&&s.instances<=C.maxInstances&&s.fullBuildings<=C.maxFullBuildings,JSON.stringify(s));
  const fulls=v.chunks.filter(c=>c.residency==='full').map(c=>c.distance),far=v.chunks.filter(c=>c.residency==='impostor'||c.residency==='merged').map(c=>c.distance);if(fulls.length&&far.length)assert.ok(Math.max(...fulls)<=Math.max(...far)+1e-6);}
 console.log('# dense worst draws',worst);
});
