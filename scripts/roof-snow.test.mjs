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
