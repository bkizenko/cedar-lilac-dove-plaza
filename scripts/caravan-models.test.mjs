import test from 'node:test';import assert from 'node:assert/strict';
import {caravanSpec,parcelSpec} from '../src/scene/caravanModels.ts';
import {GOODS_VISUAL,goodVisual,goodIconId,loadUnitParts} from '../src/scene/goodsVisuals.ts';
import {HULL_SEATS,hullSize} from '../src/scene/hullSizes.ts';
import {BOAT_CLASSES} from '../src/game/boatClasses.ts';
import {specBounds,floatingParts,partsAtLod,specTriangles,partBounds,structuralSignature} from '../src/scene/buildingParts.ts';
import {buildCarvedMesh} from '../src/scene/carvedMesh.ts';
import {CARVED_MATERIALS} from '../src/scene/carvedPalette.ts';
const CARRIERS=['packAnimal','sled','cart','boat','stall'];
const MIX=[[],[{kind:'grain',amount:40}],[{kind:'wood',amount:120},{kind:'stone',amount:30}],[{kind:'grain',amount:60},{kind:'copper',amount:20},{kind:'pottery',amount:12},{kind:'fish',amount:10}],[{kind:'iron',amount:9999},{kind:'mystery',amount:5}]];
const all=function*(){for(const c of CARRIERS)for(const cargo of MIX)for(const escort of[false,true])for(const boatClass of(c==='boat'?Object.keys(HULL_SEATS):[undefined]))yield {input:{carrier:c,seed:7,cargo,escort,boatClass},spec:caravanSpec({carrier:c,seed:7,cargo,escort,boatClass})};};

test('hull sizes cover every real hull class in boatClasses.ts and grow with seats',()=>{
 assert.deepEqual(Object.keys(HULL_SEATS).sort(),Object.keys(BOAT_CLASSES).sort());
 for(const [k,v] of Object.entries(BOAT_CLASSES))assert.equal(HULL_SEATS[k],v.seats,k);
 assert.ok(hullSize(2).length<hullSize(5).length&&hullSize(5).length<hullSize(8).length&&hullSize(2).beam<hullSize(8).beam);
});
test('every carrier x cargo x escort variant is footprint-true, grounded, supported at every LOD, known materials',()=>{
 let n=0;
 for(const {input,spec} of all()){const b=specBounds(spec),{w,d}=spec.footprint,label=spec.variantKey+(input.escort?'/escort':'');n++;
  assert.ok(b.minX>=-w/2-1e-6&&b.maxX<=w/2+1e-6&&b.minZ>=-d/2-1e-6&&b.maxZ<=d/2+1e-6,label+` ${b.minX.toFixed(2)}..${b.maxX.toFixed(2)} z ${b.minZ.toFixed(2)}..${b.maxZ.toFixed(2)} in ${w}x${d}`);
  assert.ok(b.minY>=-1e-6,label+' below ground');
  for(const p of spec.parts)assert.ok(CARVED_MATERIALS[p.mat],p.mat);
  for(const t of[0,1,2]){const sub={...spec,parts:partsAtLod(spec,t)};assert.deepEqual(floatingParts(sub),[],`${label}@${t} floating ${JSON.stringify(floatingParts(sub).map(i=>sub.parts[i].shape+sub.parts[i].mat+sub.parts[i].pos.map(x=>x.toFixed(2))))}`);}
 }
 assert.ok(n>=60);
});
test('boat footprint matches the real hull class; escort adds a guard beside the carrier',()=>{
 for(const [cls,seats] of Object.entries(HULL_SEATS)){const s=caravanSpec({carrier:'boat',seed:1,cargo:[],boatClass:cls}),h=hullSize(seats);assert.ok(Math.abs(s.footprint.d-h.length)<.01&&Math.abs(s.footprint.w-h.beam)<.01,cls);}
 for(const c of['packAnimal','sled','cart','boat']){const a=caravanSpec({carrier:c,seed:2,cargo:[]}),b=caravanSpec({carrier:c,seed:2,cargo:[],escort:true});
  assert.ok(b.footprint.w>a.footprint.w,c+' escort widens');assert.ok(b.parts.some(p=>p.mat==='iron')&&!a.parts.some(p=>p.mat==='iron'),c+' escort carries iron spear and helm');
  assert.ok(b.parts.some(p=>p.shape==='cone'&&p.mat==='iron'),'spear tip');}
});
test('cargo shown equals cargo carried: kinds, empty carriers, overflow reported, fill scales',()=>{
 for(const c of CARRIERS){
  const empty=caravanSpec({carrier:c,seed:3,cargo:[]});assert.equal(empty.loadPartIndices.length,0,c+' empty draws no load');assert.deepEqual(empty.cargo.kinds,[]);
  const zero=caravanSpec({carrier:c,seed:3,cargo:[{kind:'grain',amount:0},{kind:'wood',amount:-5}]});assert.equal(zero.loadPartIndices.length,0,c+' zero/negative draws nothing');
  const one=caravanSpec({carrier:c,seed:3,cargo:[{kind:'wood',amount:30}]});assert.deepEqual(one.cargo.kinds,['wood']);assert.ok(one.loadPartIndices.length>0);
  const few=caravanSpec({carrier:c,seed:3,cargo:[{kind:'grain',amount:20}]}),many=caravanSpec({carrier:c,seed:3,cargo:[{kind:'grain',amount:2000}]});
  assert.ok(many.loadPartIndices.length>few.loadPartIndices.length,c+' fuller carrier shows more');assert.equal(many.cargo.fill,1);assert.ok(few.cargo.fill<1);
  const mix=caravanSpec({carrier:c,seed:3,cargo:[{kind:'grain',amount:50},{kind:'stone',amount:50},{kind:'copper',amount:50}],capacity:150});
  assert.deepEqual([...mix.cargo.kinds].sort(),['copper','grain','stone'],c);for(const k of mix.cargo.kinds)assert.ok(mix.cargo.units[k]>=1);
  const loadMats=new Set(mix.loadPartIndices.map(i=>mix.parts[i].mat));assert.ok(loadMats.has('stone')&&loadMats.has('tile'),c+' distinct looks per kind');
  const many2=caravanSpec({carrier:c,seed:3,cargo:Array.from({length:20},(_,i)=>({kind:'k'+i,amount:20-i})),capacity:100});
  assert.equal(many2.cargo.kinds.length+many2.cargo.overflowKinds.length,20,c+' every kind accounted for');assert.ok(many2.cargo.kinds.length<=many2.cargo.slots);
  assert.equal(Object.values(many2.cargo.units).reduce((a,b)=>a+b,0)<=many2.cargo.slots,true);}
});
test('deterministic; same seed same model; different seeds vary load rotation but keep the same kinds',()=>{
 for(const {input,spec} of all())assert.deepEqual(spec,caravanSpec(input));
 const a=caravanSpec({carrier:'cart',seed:1,cargo:MIX[3]}),b=caravanSpec({carrier:'cart',seed:2,cargo:MIX[3]});assert.deepEqual(a.cargo.kinds,b.cargo.kinds);assert.notDeepEqual(a.parts,b.parts);
 assert.notEqual(structuralSignature(caravanSpec({carrier:'cart',seed:1,cargo:[]})),structuralSignature(caravanSpec({carrier:'sled',seed:1,cargo:[]})));
});
test('LOD tiers reduce parts and triangles; loads appear by mid distance; budgets stay small',()=>{
 for(const {spec} of all()){const n=[0,1,2].map(t=>partsAtLod(spec,t).length),tri=[0,1,2].map(t=>specTriangles(spec,t));
  assert.ok(n[0]>=n[1]&&n[1]>=n[2]&&n[2]>0,spec.variantKey+' '+n);assert.ok(tri[0]<=1400,spec.variantKey+' near '+tri[0]);assert.ok(tri[2]<=700);
  for(const t of[0,1,2]){const m=buildCarvedMesh(spec,t);assert.equal(m.triangles,specTriangles(spec,t));}
  if(spec.cargo.kinds.length)assert.ok(n[1]>partsAtLod({...spec,parts:spec.parts.filter((_,i)=>!spec.loadPartIndices.includes(i))},1).length,'mid tier shows a unit of each kind');}
});
test('market stall shows only real stock on its counter',()=>{
 const stock=caravanSpec({carrier:'stall',seed:4,cargo:[{kind:'bread',amount:30},{kind:'pottery',amount:12}]});assert.deepEqual([...stock.cargo.kinds].sort(),['bread','pottery']);
 for(const i of stock.loadPartIndices)assert.ok(stock.parts[i].pos[1]>=.85,'goods sit on the counter');
 assert.equal(caravanSpec({carrier:'stall',seed:4,cargo:[]}).loadPartIndices.length,0);
});
test('dropped parcel: small supported heap of the real dropped kind, 1-6 units by amount',()=>{
 for(const kind of[...Object.keys(GOODS_VISUAL),'unknownThing'])for(const amount of[1,10,40,500]){const s=parcelSpec(kind,amount,9),b=specBounds(s);
  assert.ok(b.minX>=-s.footprint.w/2-1e-6&&b.maxX<=s.footprint.w/2+1e-6&&b.minZ>=-s.footprint.d/2-1e-6&&b.maxZ<=s.footprint.d/2+1e-6&&b.minY>=-1e-6&&s.footprint.w<=1.8,`${kind}/${amount} footprint ${s.footprint.w}`);assert.ok(b.maxY<1,kind+' height');
  for(const t of[0,1,2])assert.deepEqual(floatingParts({...s,parts:partsAtLod(s,t)}),[],`${kind}/${amount}@${t}`);
  assert.ok(s.units>=1&&s.units<=6);assert.deepEqual(s,parcelSpec(kind,amount,9));}
 assert.ok(parcelSpec('grain',200,1).units>parcelSpec('grain',5,1).units);assert.equal(parcelSpec('grain',5,1).units,1);
 const grain=parcelSpec('grain',60,1),logs=parcelSpec('wood',60,1),pots=parcelSpec('pottery',30,1);
 assert.ok(grain.parts.some(p=>p.mat==='cloth'&&p.shape==='box'),'grain sacks');assert.ok(logs.parts.filter(p=>p.mat==='trunk'&&p.shape==='cylinder').length>=3,'log bundle');assert.ok(pots.parts.some(p=>p.mat==='tile'&&p.shape==='cylinder'),'pots');
 assert.equal(goodIconId('grain'),'grain');assert.equal(goodIconId('nope'),'parcel');assert.equal(goodVisual('nope').style,'crate');assert.ok(loadUnitParts('nope',0,0,0).length>0);
});
