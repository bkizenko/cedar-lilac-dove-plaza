import test from 'node:test';import assert from 'node:assert/strict';
import {BIOME_TERRAIN,terrainColor,classify,goldenHour,bakeTerrainColors,slopeAt,TERRAIN_TREATMENT} from '../src/scene/biomeTerrain.ts';
import {CARVED_TERRAIN,hexToRgb,hsv} from '../src/scene/carvedPalette.ts';
const B=Object.keys(BIOME_TERRAIN),I=(biome,o={})=>({biome,height:5,slope:.2,waterY:0,x:12.3,z:7.7,seed:3,...o});
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
test('natural treatment, and no carved honey band colour survives as terrain',()=>{
 assert.equal(TERRAIN_TREATMENT,'natural');const bands=CARVED_TERRAIN.bands.map(c=>hexToRgb(c));
 for(const b of B)for(let i=0;i<200;i++){const c=terrainColor(I(b,{x:i*3.1,z:i*1.7,height:2+i%9,slope:(i%7)*.15}));for(const k of bands)assert.ok(dist(c,k)>.025,`${b} reproduces a carved band`);}
});
test('classification: water, shore sand, grass, rock on slopes, snow only high and only where the biome snows',()=>{
 assert.equal(classify(I('temperate',{height:-2})),'water');assert.equal(classify(I('temperate',{height:.3})),'shore');
 assert.equal(classify(I('temperate',{slope:1.4})),'rock');assert.equal(classify(I('temperate',{height:150,slope:.3})),'snow');assert.notEqual(classify(I('temperate',{height:5})),'snow');
 for(const b of B)if(!BIOME_TERRAIN[b].snow)assert.notEqual(classify(I(b,{height:500,slope:.3})),'snow',b+' never snows');
 assert.equal(classify(I('temperate',{path:.9})),'path');
});
test('ground reads as the biome: green grass, sand shores, grey rock, near-white snow, red canyon rock, brown savanna',()=>{
 const g=terrainColor(I('temperate',{x:2,z:2}));assert.ok(g[1]>g[0]&&g[1]>g[2],'temperate grass is green');
 const sh=terrainColor(I('coast',{height:.3}));assert.ok(sh[0]>.7&&sh[1]>.6&&sh[2]<sh[0],'shore is sand');
 const r=terrainColor(I('temperate',{slope:1.5}));assert.ok(Math.max(...r)-Math.min(...r)<.14,'rock is grey');
 const s=terrainColor(I('alpine',{height:200,slope:.3}));assert.ok(Math.min(...s)>.8,'snow is near white');
 const cr=terrainColor(I('canyon',{slope:1.5}));assert.ok(cr[0]>cr[1]*1.3&&cr[0]>cr[2]*1.5,'canyon rock is red');
 const sv=terrainColor(I('savanna',{x:5,z:9}));assert.ok(sv[0]>=sv[1]*.9&&sv[0]>sv[2]*1.4,'savanna is brown/gold, not green');
});
test('biomes are distinct from each other',()=>{
 const avg=b=>{let s=[0,0,0];for(let i=0;i<60;i++){const c=terrainColor(I(b,{x:i*5.3,z:i*2.9,height:3+i%5}));s=s.map((v,k)=>v+c[k]/60);}return s;};
 const a=Object.fromEntries(B.map(b=>[b,avg(b)]));for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++)assert.ok(dist(a[B[i]],a[B[j]])>.02,`${B[i]} vs ${B[j]}`);
});
test('no wood grain: noise is isotropic (stripe energy equal along x and z) and has no banding',()=>{
 const ys=[],xs=[];for(let i=0;i<400;i++){xs.push(terrainColor(I('grassland',{x:i*.5,z:20,height:5}))[1]);ys.push(terrainColor(I('grassland',{x:20,z:i*.5,height:5}))[1]);}
 const e=a=>{let s=0;for(let i=1;i<a.length;i++)s+=Math.abs(a[i]-a[i-1]);return s/a.length;};assert.ok(Math.abs(e(xs)-e(ys))/Math.max(e(xs),e(ys),1e-9)<.45,'direction-free');
 const distinct=new Set(xs.map(v=>v.toFixed(5))).size;assert.ok(distinct>100,'continuous, not banded');
});
test('terrain never stepped by height: colour changes smoothly over a gentle slope',()=>{
 let jump=0;let prev=terrainColor(I('temperate',{height:5,x:0,z:0,seed:9}));for(let x=.1;x<40;x+=.1){const c=terrainColor(I('temperate',{height:5+x*.05,x,z:0,seed:9}));jump=Math.max(jump,dist(c,prev));prev=c;}assert.ok(jump<.25,'max step '+jump);
});
test('golden hour is a uniform warm multiply and the bake is deterministic',()=>{
 const c=[.5,.5,.5],g=goldenHour(c);assert.ok(g[0]>g[1]&&g[1]>g[2]&&g[0]<=1);assert.deepEqual(goldenHour(c,0),c);
 const h=(x,z)=>Math.sin(x*.1)*3+z*.05,a=bakeTerrainColors(h,40,16,0,'temperate',2),b=bakeTerrainColors(h,40,16,0,'temperate',2);assert.deepEqual(a,b);assert.equal(a.length,17*17*3);assert.ok(slopeAt(h,0,0)>0);
 for(const v of a)assert.ok(v>=0&&v<=1);
});
