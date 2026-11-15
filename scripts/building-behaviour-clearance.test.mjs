import test from 'node:test';import assert from 'node:assert/strict';
import {ADULT_HEIGHT_M,DOOR_HEIGHT_M,EAVE_MIN_M,doorHeight,eaveHeight,PERSON_SCALE_Y} from '../src/scene/personScale.ts';
import {roundhouse,cottage,longhouse} from '../src/scene/villageHomes.ts';
import {seededRandom} from '../src/scene/buildingParts.ts';
import {doorway} from '../src/scene/buildingKit.ts';
import {door} from '../src/scene/buildingHelpers.ts';
test('person height constants follow the renderer scale and leave headroom in doors and eaves',()=>{
 assert.equal(PERSON_SCALE_Y,1.65);assert.ok(ADULT_HEIGHT_M>1.8&&ADULT_HEIGHT_M<2.0);
 assert.ok(DOOR_HEIGHT_M>=ADULT_HEIGHT_M+.1);assert.ok(EAVE_MIN_M>=DOOR_HEIGHT_M+.1);
 assert.equal(doorHeight(1.3),DOOR_HEIGHT_M);assert.equal(doorHeight(.9),.9,'a hatch stays small');assert.equal(eaveHeight(1.5),EAVE_MIN_M);assert.equal(eaveHeight(3),3);
});
test('doorway and door helpers always open at least adult height',()=>{
 const a=[];doorway(a,{x:0,z:0,wall:0,h:1.3,w:.8});const rec=a.find(p=>p.mat==='recess');assert.ok(rec.size[1]>=DOOR_HEIGHT_M);
 const b=[];door(b,0,0,.8,1.5);assert.ok(b[0].size[1]>=DOOR_HEIGHT_M);
 const c=[];door(c,0,0,.6,.9);assert.equal(c[0].size[1],.9);
});
const ctxFor=(seed,scale,wealth)=>({seed,era:1,material:'timber',climate:'temperate',wealth,footprint:{w:5.4,d:5.2},scale});
test('village homes: every walk-in door is taller than a person and sits under its wall',()=>{
 for(const [name,gen] of Object.entries({roundhouse,cottage,longhouse}))for(let seed=1;seed<=24;seed++)for(const scale of ['small','large']){
  const {parts}=gen(ctxFor(seed,scale,(seed%5)/4),seededRandom(seed));
  const openings=parts.filter(p=>p.mat==='recess'&&p.size[1]>=1.2);assert.ok(openings.length>0,`${name} has a door`);
  for(const o of openings)assert.ok(o.size[1]>=ADULT_HEIGHT_M,`${name} seed ${seed} door ${o.size[1]} < adult ${ADULT_HEIGHT_M}`);
  const wallTop=Math.max(...parts.filter(p=>['box','cylinder'].includes(p.shape)&&p.pos[1]<.5).map(p=>p.pos[1]+p.size[1]));
  assert.ok(wallTop>=Math.max(...openings.map(o=>o.size[1])),`${name} seed ${seed}: wall ${wallTop} lower than its door`);
 }
});
