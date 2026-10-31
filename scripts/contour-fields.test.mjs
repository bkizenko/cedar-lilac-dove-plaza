import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {surveyFieldTopography} from '../src/game/plotTopography.ts';
import {contourPlantSites,cropPlantGeometry,fieldCropGrowth,fieldCropKind,ContourFields,CROP_ART_RULES} from '../src/scene/contourFields.ts';
import {FieldSurface} from '../src/scene/fieldSurface.ts';
const field=(id,kind)=>({id,type:'farm',x:0,z:0,w:16,d:12,hp:100,team:0,build:1,crop:{kind,planted:1,tended:1,ripened:false,remaining:100}});
test('contour rows are perpendicular to measured slope and clipped within the unrotated rectangle',()=>{
 const ground={height:(x,z)=>5+x*.2+z*.1,waterAt:()=>0},plot={x:13,z:17,w:24,d:16},before={...plot},survey=surveyFieldTopography(ground,plot),angle=survey.contourAngleRadians;
 assert.ok(Math.abs(Math.cos(angle)*survey.meanGradientX+Math.sin(angle)*survey.meanGradientZ)<1e-10);
 for(const kind of ['grain','pulses','tubers']){const sites=contourPlantSites(plot,angle,kind);assert.ok(sites.length>20&&sites.length<=CROP_ART_RULES.maximumPlantsPerField);assert.ok(sites.every(p=>Math.abs(p.x-plot.x)<=plot.w/2-CROP_ART_RULES.edgeMarginMetres+1e-9&&Math.abs(p.z-plot.z)<=plot.d/2-CROP_ART_RULES.edgeMarginMetres+1e-9));}
 assert.deepEqual(plot,before);
});
test('grain ears, pulse pods and tuber rosettes have genuinely different shapes and lifecycle follows actual crop state',()=>{
 const dimensions=[];for(const kind of ['grain','pulses','tubers']){const geo=cropPlantGeometry(kind);geo.computeBoundingBox();dimensions.push(geo.boundingBox.max.y-geo.boundingBox.min.y);assert.ok(geo.attributes.position.count<1000);geo.dispose();}
 assert.ok(dimensions[0]>dimensions[1]&&dimensions[1]>dimensions[2]);const f=field(1,'grain');assert.equal(fieldCropGrowth(f),.99);f.crop.ripened=true;assert.equal(fieldCropGrowth(f),1);f.crop.remaining=0;assert.equal(fieldCropGrowth(f),.04);f.cropType='tubers';assert.equal(fieldCropKind(f),'grain','next-year plan never converts current standing crop');
});
test('active crop layer preserves field dimensions/terrain/progress, roots every plant on terrain and shares displaced shadow material',()=>{
 const scene=new THREE.Scene(),surface={bind(){},depth:new THREE.MeshDepthMaterial(),texture:{needsUpdate:false}},view=new ContourFields(scene,surface),fields=[field(1,'grain'),{...field(2,'pulses'),x:25},{...field(3,'tubers'),x:-25}];
 const g={world:{heights:new Float32Array([1,2,3,4])},state:{time:0,buildings:fields},height:(x,z)=>5+x*.1+z*.05,waterAt:()=>0,exploredAt:()=>true,navigationRevision:()=>1},before=structuredClone(g.state),heights=g.world.heights.slice();
 const report=view.sync(g,{x:0,z:0});assert.ok(report.grain>0&&report.pulses>0&&report.tubers>0);assert.ok(report.plants<=8192);
 const m=new THREE.Matrix4(),p=new THREE.Vector3();for(const mesh of scene.children){assert.equal(mesh.customDepthMaterial,surface.depth);for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);p.setFromMatrixPosition(m);assert.ok(Math.abs(p.y-g.height(p.x,p.z))<1e-5);}}
 assert.deepEqual(g.state,before);assert.deepEqual(g.world.heights,heights);fields[0].fallowYear=0;assert.equal(view.sync(g,{x:0,z:0}).grain,0);view.dispose();assert.equal(scene.children.length,0);
});
test('furrow material uses world-space contour phase while depth displacement stays on original sampled height contract',()=>{
 const surface=new FieldSurface(new Float32Array([0,1,2,3]),20),material=new THREE.MeshStandardMaterial();surface.bind(material,{furrows:true});
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,null);
 assert.match(shader.vertexShader,/vFieldRows=fieldRows/);assert.match(shader.fragmentShader,/dot\(vFieldWorldXZ,vFieldRows.xy\)/);assert.match(shader.vertexShader,/fieldHeight\(fieldWorld.xz\)/);assert.equal(shader.uniforms.fieldHeights.value,surface.texture);surface.dispose();material.dispose();
});
