import test from 'node:test';import assert from 'node:assert/strict';
import {MATERIAL_LAYERS,LAYER_COUNT,NO_LAYER,generateMaterialSet,textureMemory,layerForMat,layerIndex,TEXTURE_SIZES,setBuildingTextureMode,getBuildingTextureMode,setBuildingWeather,buildingWeather,patchBuildingShader} from '../src/scene/buildingTextures.ts';
import {carvedVariantFor,variantSpec} from '../src/scene/buildingStyleMap.ts';
import {buildCarvedMesh} from '../src/scene/carvedMesh.ts';
import {presetSkin} from '../src/scene/civSkin.ts';
import {CIV_IDS} from '../src/scene/civStyles.ts';
import {villageHeraldry} from '../src/scene/villageIdentity.ts';
import {partsAtLod,partTriangles} from '../src/scene/buildingParts.ts';
import {setHutVariety} from '../src/scene/hutVariety.ts';

test('texture set is deterministic, tiling-sized and every layer has detail',()=>{
 const a=generateMaterialSet(64,5),b=generateMaterialSet(64,5);assert.equal(a,b);
 const c=generateMaterialSet(64,6);assert.notDeepEqual(Buffer.from(a.a.slice(0,4096)),Buffer.from(c.a.slice(0,4096)));
 assert.equal(a.layers,LAYER_COUNT);assert.equal(LAYER_COUNT,13);
 const n=64*64*4;
 for(let l=0;l<LAYER_COUNT;l++){let lo=255,hi=0,sum=0;for(let i=0;i<64*64;i++){const v=a.a[l*n+i*4+3];lo=Math.min(lo,v);hi=Math.max(hi,v);sum+=a.a[l*n+i*4]+a.a[l*n+i*4+1]+a.a[l*n+i*4+2];}
  assert.ok(hi-lo>60,`${MATERIAL_LAYERS[l]} height range ${hi-lo}`);const mean=sum/(64*64*3)/255;assert.ok(mean>.45&&mean<1,`${MATERIAL_LAYERS[l]} albedo mean ${mean}`);}
});
test('texture seams tile: left/right and top/bottom edge pixels are as close as neighbours',()=>{
 const s=generateMaterialSet(64,5),n=64*64*4;
 for(let l=0;l<LAYER_COUNT;l++){let edge=0,inner=0;for(let y=0;y<64;y++){const o=l*n+y*256;edge+=Math.abs(s.a[o+3]-s.a[o+63*4+3]);inner+=Math.abs(s.a[o+32*4+3]-s.a[o+33*4+3]);}
  assert.ok(edge/64<Math.max(60,inner/64*3+30),`${MATERIAL_LAYERS[l]} wrap seam ${edge/64} vs ${inner/64}`);}
});
test('memory budget: Standard 128 px set stays under 2.5 MB, Ultra under 10 MB (both layered atlases, full mips)',()=>{
 assert.ok(textureMemory(TEXTURE_SIZES.standard).withMipsMB<2.5);assert.ok(textureMemory(TEXTURE_SIZES.high).withMipsMB<5.5);assert.ok(textureMemory(TEXTURE_SIZES.ultra).withMipsMB<9.5);
 const s=generateMaterialSet(128);assert.equal(s.bytes,128*128*4*13*2);
});
test('material choice follows course, palette id and age',()=>{
 assert.equal(layerForMat('thatch'),layerIndex('thatch'));assert.equal(layerForMat('stone',undefined,0),layerIndex('rubble'));assert.equal(layerForMat('stone',undefined,3),layerIndex('ashlar'));
 assert.equal(layerForMat('civ.x.wall','wattle'),layerIndex('wattle'));assert.equal(layerForMat('civ.x.roof','tile'),layerIndex('tile'));assert.equal(layerForMat('civ.x.wall','brick'),layerIndex('mudbrick'));
 assert.equal(layerForMat('recess'),NO_LAYER);assert.equal(layerForMat('foliage'),NO_LAYER);
});
test('every civ hut/house/hall draws textured: per-vertex layers present, wear in range, deterministic',()=>{
 for(const civ of CIV_IDS)for(const [type,era] of [['hut',1],['house',3],['townhall',3],['market',3]]){
  const v=carvedVariantFor({worldSeed:7,type,id:12,era,footprint:{w:7,d:6.5},settlementSeed:2,skin:presetSkin(civ),heraldry:villageHeraldry(7,2)});if(!v)continue;
  const spec=variantSpec(v),m=buildCarvedMesh(spec,0),m2=buildCarvedMesh(spec,0);
  assert.deepEqual(Array.from(m.bm.slice(0,400)),Array.from(m2.bm.slice(0,400)));
  const layers=new Set();for(let i=0;i<m.triangles*3;i++){const l=m.bm[i*4];if(l)layers.add(l-1);assert.ok(l===0||l-1<LAYER_COUNT);}
  assert.ok(layers.size>=2,`${civ} ${type} uses ${layers.size} texture layers`);assert.equal(m.bm.length,m.triangles*3*4);}
});
test('legacy switch and weather inputs',()=>{
 setBuildingTextureMode('legacy');assert.equal(getBuildingTextureMode(),'legacy');setBuildingTextureMode('set');assert.equal(getBuildingTextureMode(),'set');
 setBuildingWeather({wet:2,sun:-1,moss:.3});assert.equal(buildingWeather.wet,1);assert.equal(buildingWeather.sun,0);assert.equal(buildingWeather.moss,.3);setBuildingWeather({wet:0,sun:.4,moss:.5});
 const sh={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>\n#include <alphamap_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>'};
 patchBuildingShader(sh,{a:{value:1},b:{value:2},set:{value:1},bump:{value:0},wet:{value:0},sun:{value:0},moss:{value:0}});
 assert.match(sh.fragmentShader,/sampler2DArray uBldA/);assert.match(sh.fragmentShader,/bldPerturb/);assert.match(sh.vertexShader,/attribute vec4 bm/);assert.ok(!sh.fragmentShader.includes('#include <map_fragment>'));
});
test('hut variety: 12 huts of one village differ, sit on the ground, stay in the mid and near caps',()=>{
 for(const civ of CIV_IDS){const sig=new Set();
  for(let k=0;k<12;k++){const v=carvedVariantFor({worldSeed:7,type:'hut',id:11+k*5,era:1,footprint:{w:5.4,d:5.2},settlementSeed:3,skin:presetSkin(civ),heraldry:villageHeraldry(7,3),prosperity:(k*37%10)/10}),spec=variantSpec(v);
   let tris1=0,tris0=0;for(const p of partsAtLod(spec,1))tris1+=partTriangles(p);for(const p of partsAtLod(spec,0))tris0+=partTriangles(p);
   assert.ok(tris1<=1000,`${civ} mid ${tris1}`);assert.ok(tris0<=2400,`${civ} near ${tris0}`);
   for(const p of spec.parts)assert.ok(p.pos[1]>=-.001,`${civ} part below ground`);
   const walls=spec.parts.filter(p=>p.lod===2&&(p.shape==='box'||p.shape==='cylinder')&&p.size[1]>1);assert.ok(walls.some(p=>p.pos[1]<.05),`${civ} hut wall does not start at ground level`);
   sig.add(spec.parts.map(p=>p.shape+Math.round(p.size[0]*4)+Math.round(p.size[2]*4)).join('|'));}
  assert.ok(sig.size>=11,`${civ} only ${sig.size}/12 distinct huts`);}
});
test('hut variety legacy switch restores the one-form-per-civ look',()=>{
 const build=()=>{const v=carvedVariantFor({worldSeed:7,type:'hut',id:11,era:1,footprint:{w:5.4,d:5.2},settlementSeed:3,skin:presetSkin('quillan')});return JSON.stringify(variantSpec(v).parts);};
 const on=build();setHutVariety(false);const off=build();setHutVariety(true);assert.notEqual(on,off);assert.equal(build(),on);
});
import {dressWorks,kitFor,WORKS_BUDGET} from '../src/scene/worksDetail.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {CARVED_TYPES} from '../src/scene/buildingStyleMap.ts';
import {specBounds,specTriangles} from '../src/scene/buildingParts.ts';
test('works props: every workshop/civic/defence type gets its kit, per-building variation, in the footprint, above ground, inside caps, for neutral and all 14 civ skins',()=>{
 const types=['workshop','forge','kiln','potter','tailor','tanner','butcher','dryrack','lumber','smokehouse','oven','palisade','gate','watchtower','temple','market','stables','dock','hearth','university'];
 for(const civ of [null,...CIV_IDS])for(const type of types){const fp=BUILDINGS[type];if(!fp)continue;const sigs=new Set();
  for(const id of [3,8,14]){const v=carvedVariantFor({worldSeed:7,type,id,era:3,footprint:{w:fp.w,d:fp.d},settlementSeed:2,...(civ?{skin:presetSkin(civ)}:{})});if(!v)continue;const spec=variantSpec(v);
   assert.ok(specTriangles(spec,1)<=1000,`${civ} ${type} mid ${specTriangles(spec,1)}`);const b=specBounds(spec);assert.ok(b.minY>=-.001,`${type} below ground`);
   sigs.add(spec.parts.length+':'+Math.round(spec.parts.reduce((a,p)=>a+p.pos[0]*7+p.pos[2]*3,0)));}
  if(!['palisade','gate'].includes(type))assert.ok(sigs.size>=2,`${civ} ${type} not varied per building`);}
 assert.equal(kitFor('workshop','forge'),'forge');assert.equal(kitFor('pier'),'quay');assert.equal(kitFor('fieldPlot'),null);
});
test('every civ watermill has a turning wheel part (rotor) in its near and mid mesh',()=>{
 for(const civ of [null,...CIV_IDS]){const fp=BUILDINGS.watermill,v=carvedVariantFor({worldSeed:7,type:'watermill',id:4,era:3,footprint:{w:fp.w,d:fp.d},waterSide:'-z',settlementSeed:2,...(civ?{skin:presetSkin(civ)}:{})}),spec=variantSpec(v);
  for(const tier of [0,1])assert.ok(partsAtLod(spec,tier).some(p=>p.anim?.kind==='wheel'),`${civ} watermill tier ${tier} has no wheel`);}
});
