import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldEdgeDepth,fieldInset,fieldSeed,fieldStage,boundaryKind,boundarySites,fieldSoilColour,fieldWeeds,BOUNDARY_RULES,hash01} from '../src/game/fieldLook.ts';
import {EDGE} from '../src/game/fieldSnap.ts';
import {SIM_CALENDAR_RULES} from '../src/game/calendarPacing.ts';
const Y=SIM_CALENDAR_RULES.yearSeconds,at=(year,phase)=>year*Y+(phase+.5)*Y/4;
test('stage follows the crop and the season',()=>{
 assert.equal(fieldStage({},at(2,0)),'bare');
 assert.equal(fieldStage({crop:{year:2,planted:.4,tended:0,ripened:false,remaining:0}},at(2,0)),'sprouting');
 assert.equal(fieldStage({crop:{year:2,planted:1,tended:.8,ripened:false,remaining:0}},at(2,1)),'growing');
 assert.equal(fieldStage({crop:{year:2,planted:1,tended:1,ripened:true,remaining:90}},at(2,2)),'ripe');
 assert.equal(fieldStage({crop:{year:2,planted:1,tended:1,ripened:true,remaining:0}},at(2,2)),'stubble');
 assert.equal(fieldStage({crop:{year:2,planted:1,tended:1,ripened:true,remaining:0}},at(2,3)),'stubble');
 assert.equal(fieldStage({crop:{year:2,planted:0,tended:0,ripened:true,remaining:0}},at(2,2)),'bare');
 assert.equal(fieldStage({fallowYear:2,crop:{year:2,planted:0,tended:0,ripened:false,remaining:0}},at(2,1)),'fallow');
 assert.equal(fieldStage({crop:{year:1,planted:1,tended:1,ripened:true,remaining:0}},at(2,0)),'bare');
});
test('boundary kind moves from banks to hedges and walls with age and slope',()=>{
 assert.equal(boundaryKind(0,2),'bank');assert.equal(boundaryKind(1,0),'wattle');assert.equal(boundaryKind(2,0),'hedge');assert.equal(boundaryKind(2,2),'stone');assert.equal(boundaryKind(3,1),'stone');assert.equal(boundaryKind(3,0,.5),'stone');assert.equal(boundaryKind(0,0,.9),'bank');
});
test('boundary sites skip merged sides, leave a gate, are deterministic and capped',()=>{
 const f={id:5,x:0,z:0,w:8.2,d:8.2},all=boundarySites(f,0,'hedge'),some=boundarySites(f,EDGE.E,'hedge');
 assert.ok(all.length>20&&some.length<all.length);
 assert.deepEqual(boundarySites(f,0,'hedge'),all);
 assert.equal(boundarySites(f,EDGE.E|EDGE.W|EDGE.N|EDGE.S,'hedge').length,0);
 const big=boundarySites({id:9,x:0,z:0,w:131,d:131},0,'wattle');assert.ok(big.length<=BOUNDARY_RULES.maximumPerField+8);
});
test('boundary sites sit on the drawn soil edge, inside the rectangle, and corners are not left floating',()=>{
 for(const f of [{id:5,x:0,z:0,w:8.2,d:8.2},{id:11,x:40,z:-20,w:24.6,d:16.4}])for(const mask of [0,EDGE.E,EDGE.W|EDGE.S]){
  const sites=boundarySites(f,mask,'hedge');assert.ok(sites.length>0);
  for(const s of sites){const depth=fieldEdgeDepth(f,mask,s.x,s.z);assert.ok(depth>-.2&&depth<1.1,`site off edge: ${depth}`);assert.ok(Math.abs(s.x-f.x)<=f.w/2&&Math.abs(s.z-f.z)<=f.d/2);}
 }
 const ins=[];for(let i=0;i<50;i++)ins.push(fieldInset(i*3.1,i*1.7,fieldSeed(5),8.2));assert.ok(Math.min(...ins)>=.6-1e-9);assert.ok(Math.max(...ins)>1.6);
});
test('soil is muted (no saturated cartoon brown) and dry soil is paler than wet',()=>{
 const wet=fieldSoilColour(1,1,1),dry=fieldSoilColour(.5,.2,1);
 for(const c of [wet,dry]){const mx=Math.max(...c),mn=Math.min(...c);assert.ok((mx-mn)/mx<.5);assert.ok(mx<.6&&mn>.1);}
 assert.ok(dry[0]>wet[0]);assert.ok(fieldWeeds('fallow',0)>fieldWeeds('growing',1));
 assert.ok(hash01(1,2,3)>=0&&hash01(1,2,3)<1);
});
import {fieldDetailTier,FIELD_DETAIL_TIERS} from '../src/game/fieldLook.ts';
test('boundary pieces run corner to corner with uneven lengths, one gate, and open where a trail crosses',()=>{
 const f={id:5,x:0,z:0,w:16.4,d:12.3},all=boundarySites(f,0,'stone'),lens=all.map(s=>s.len);
 assert.ok(Math.max(...lens)/Math.min(...lens)>1.4,'lengths should not be uniform');
 assert.equal(all.filter(s=>s.gate).length,1);
 assert.ok(all.every(s=>s.variant>=0&&s.variant<BOUNDARY_RULES.variants.stone&&s.len>.15));
 const g=all.find(s=>s.gate),across=boundarySites(f,0,'stone',{crossings:[{x:-6,z:-f.d/2+1}]});
 assert.ok(across.length<=all.length+1);assert.ok(!across.some(s=>!s.gate&&Math.hypot(s.x+6,s.z+f.d/2-1)<.6),'no wall piece sits on the trail');
 assert.ok(g&&g.len>=BOUNDARY_RULES.gateMetres);
 const hed=boundarySites(f,0,'hedge');assert.ok(hed.length>20);assert.deepEqual(boundarySites(f,0,'hedge',{crossings:[]}),hed);
});
test('draw-distance tiers: full detail, low-poly boundary and thinned crops, then soil texture only; farther tiers for better quality',()=>{
 for(const q of ['low','med','high']){const t=FIELD_DETAIL_TIERS[q];assert.equal(fieldDetailTier(q,t.full-1),0);assert.equal(fieldDetailTier(q,t.full+1),1);assert.equal(fieldDetailTier(q,t.max+1),2);}
 assert.ok(FIELD_DETAIL_TIERS.low.max<FIELD_DETAIL_TIERS.med.max&&FIELD_DETAIL_TIERS.med.max<FIELD_DETAIL_TIERS.high.max);
});
