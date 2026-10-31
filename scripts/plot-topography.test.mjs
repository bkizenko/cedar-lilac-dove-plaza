import test from 'node:test';import assert from 'node:assert/strict';import {surveyFieldTopography,fieldTopographyIssue} from '../src/game/plotTopography.ts';
test('whole footprint finds an off-centre escarpment that the old centre slope misses',()=>{
 const ground={height:(x,z)=>5+Math.max(0,2-Math.abs(x-7))*2,waterAt:()=>.2};
 assert.equal(fieldTopographyIssue(ground,{x:0,z:0,w:8,d:8}),null);
 assert.match(fieldTopographyIssue(ground,{x:0,z:0,w:20,d:12}),/Part.*steep/);
});
test('expanded field surveys actual wet interior and preserves useful sloping farms',()=>{
 const plot={x:0,z:0,w:24,d:18},plane={height:(x,z)=>10+x*.2+z*.1,waterAt:()=>.2};
 const survey=surveyFieldTopography(plane,plot);assert.ok(survey.samples>=130);assert.equal(fieldTopographyIssue(plane,plot),null);assert.ok(Math.abs(survey.maxGrade-Math.hypot(.2,.1))<1e-9);
 const alongX=Math.cos(survey.contourAngleRadians),alongZ=Math.sin(survey.contourAngleRadians);assert.ok(Math.abs(alongX*.2+alongZ*.1)<1e-9,'row direction follows the measured contour');
 const pond={height:(x,z)=>Math.abs(x-6)<2&&Math.abs(z-4)<2?0:4,waterAt:()=>1};assert.match(fieldTopographyIssue(pond,plot),/wet/);assert.ok(surveyFieldTopography(pond,plot).wetFraction>0);
});
