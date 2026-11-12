import test from 'node:test';import assert from 'node:assert/strict';
import {generateCivBuilding,villageLayers,rebuild,extend,ERA_MODES,DEFAULT_ERA_MODE} from '../src/scene/civBuildings.ts';
import {CIV_IDS} from '../src/scene/civStyles.ts';
import {specBounds,floatingParts,partsAtLod,structuralSignature} from '../src/scene/buildingParts.ts';
const base={seed:41,era:2,wealth:.5,wear:.3,footprint:{w:10,d:9}};
test('modes exist; default keeps the existing behaviour',()=>{assert.deepEqual(ERA_MODES,['morph','fixed']);assert.equal(DEFAULT_ERA_MODE,'morph');assert.equal(generateCivBuilding('aureline','house',base).eraMode,'morph');});
test('fixed mode: advancing the world era never changes an existing building',()=>{
 for(const c of CIV_IDS)for(const role of['house','civic','granary']){const b={...base,eraMode:'fixed',built:{era:3,wealth:.4}},a=generateCivBuilding(c,role,{...b,era:3}),z=generateCivBuilding(c,role,{...b,era:5,wealth:.9});assert.deepEqual(a,z,`${c}/${role} morphed`);assert.equal(a.builtEra,3);}
});
test('morph mode still follows the era (so the option is a real choice)',()=>{
 let diff=0;for(const c of CIV_IDS){const a=generateCivBuilding(c,'house',{...base,era:1,eraMode:'morph'}),z=generateCivBuilding(c,'house',{...base,era:5,eraMode:'morph'});if(JSON.stringify(a.parts)!==JSON.stringify(z.parts))diff++;}assert.equal(diff,14);
});
test('fixed without a built era freezes at the era it was generated at',()=>{
 const a=generateCivBuilding('hanrei','civic',{...base,era:4,eraMode:'fixed'}),z=generateCivBuilding('hanrei','civic',{...base,era:4,eraMode:'fixed',built:{era:4,wealth:.5}});assert.deepEqual(a.parts,z.parts);assert.equal(a.builtEra,4);
});
test('layered villages: old and new buildings coexist; each keeps its own build era',()=>{
 for(const era of[2,3,5]){const v=villageLayers(7,era,12),eras=new Set(v.map(x=>x.built.era));assert.ok(eras.size>=2,'layers at era '+era);assert.ok(v.every(x=>x.built.era<=era&&x.built.era>=0));assert.ok(v.some(x=>x.built.era===era),'newest uses current techniques');assert.deepEqual(villageLayers(7,era,12),v);}
 const v=villageLayers(9,5,10),looks=new Set(v.map((x,i)=>structuralSignature(generateCivBuilding('vedara','house',{...base,seed:100+i,eraMode:'fixed',built:x.built}))));assert.ok(looks.size>=8,'a layered village is varied');
 const later=villageLayers(9,5,10).map(x=>x.built.era),adv=villageLayers(9,5,10);assert.deepEqual(adv.map(x=>x.built.era),later);
});
test('upgrades are explicit: rebuild changes the base look, extend adds a wing and leaves the base alone',()=>{
 const c0={...base,eraMode:'fixed',built:{era:2,wealth:.4}},a=generateCivBuilding('aureline','house',c0),re=generateCivBuilding('aureline','house',rebuild(c0,4)),ex=generateCivBuilding('aureline','house',extend(c0,4));
 assert.notDeepEqual(a.parts,re.parts);assert.equal(re.builtEra,4);assert.equal(ex.builtEra,2);assert.deepEqual(ex.extensionEras,[4]);const wing=x=>x.parts.filter(p=>p.pos[0]>a.footprint.w*.2&&p.lod>=0),old=x=>x.parts.filter(p=>p.pos[0]<=a.footprint.w*.2);assert.ok(wing(ex).length>=3,'wing sits in the reserved strip');
 const ex5=generateCivBuilding('aureline','house',extend(c0,2));assert.deepEqual(old(ex),old(ex5),'the base is untouched by what era the wing was built in');assert.notDeepEqual(wing(ex),wing(ex5),'the wing uses its own era techniques');
 const two=generateCivBuilding('aureline','house',extend(extend(c0,3),5));assert.deepEqual(two.extensionEras,[3,5]);assert.equal(generateCivBuilding('aureline','house',extend(extend(extend(c0,3),4),5)).extensionEras.length,2,'at most two wings');
 assert.deepEqual(generateCivBuilding('aureline','house',extend(c0,4)),generateCivBuilding('aureline','house',{...extend(c0,4),era:5}),'extended buildings still never morph');
});
test('extended and fixed buildings stay footprint-true and grounded at every tier',()=>{
 for(const c of CIV_IDS)for(const role of['house','civic']){const s=generateCivBuilding(c,role,extend({...base,eraMode:'fixed',built:{era:3,wealth:.5}},4)),b=specBounds(s),{w,d}=s.footprint;assert.ok(b.minX>=-w/2-1e-6&&b.maxX<=w/2+1e-6&&b.minZ>=-d/2-1e-6&&b.maxZ<=d/2+1e-6,`${c}/${role} footprint ${JSON.stringify(b)}`);for(const t of[0,1,2])assert.deepEqual(floatingParts({...s,parts:partsAtLod(s,t)}),[],`${c}/${role} tier ${t}`);}
});
