import test from 'node:test';
import assert from 'node:assert/strict';
import {carvedSnowUniform,patchSnowShader,SNOW_CAP_RULES} from '../src/scene/roofSnow.ts';
import {CarvedBuildingLayer} from '../src/scene/carvedBuildingLayer.ts';

const shader=()=>({uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'});

test('snow patch shares one uniform and only whitens up-facing faces',()=>{
  const a=shader(),b=shader();patchSnowShader(a);patchSnowShader(b);
  assert.equal(a.uniforms.uSnow,carvedSnowUniform);assert.equal(b.uniforms.uSnow,a.uniforms.uSnow);
  assert.match(a.vertexShader,/vUpFace=normalize\(mat3\(modelMatrix\)\*sn\)\.y/);
  assert.match(a.fragmentShader,/smoothstep\(0\.5,0\.82,vUpFace\)\*uSnow/);
  assert.ok(SNOW_CAP_RULES.coverage<1,'roofs keep a trace of their own colour');
});

test('layer snow is clamped and snaps to zero when thin',()=>{
  const fake={add(){},remove(){}};
  const layer=new CarvedBuildingLayer(fake);
  layer.setSnow(3);assert.equal(carvedSnowUniform.value,1);
  layer.setSnow(.01);assert.equal(carvedSnowUniform.value,0);
  layer.setSnow(-1);assert.equal(carvedSnowUniform.value,0);
  layer.dispose();
});

test('no face whitens at zero snow, including windmill cap cone and tapered tower normals',async()=>{
  const {snowMix}=await import('../src/scene/roofSnow.ts');
  for(const up of [-1,0,.1,.3,.5,.7,.82,.95,1])assert.equal(snowMix(up,0),0,'up '+up);
  // windmill cap cone: radius ~(2R1+.5)/2, height 1.9k with R1=.78k; sloped normal y = r/hypot(r,h)
  for(const k of [.6,1,1.5]){const r=(2*.78*k+.5)/2,h=1.9*k,ny=r/Math.hypot(r,h);assert.equal(snowMix(ny,0),0);assert.ok(snowMix(ny,1)<=SNOW_CAP_RULES.coverage);}
  // tapered tower wall normal is nearly horizontal and stays bare even in deep snow
  assert.ok(snowMix(.08,1)<1e-9);assert.ok(snowMix(1,1)>.9);
});
