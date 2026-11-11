import test from 'node:test';import assert from 'node:assert/strict';
import {BUILDINGS} from '../src/game/constants.ts';
import {specBounds,floatingParts,partsAtLod,specTriangles,partBounds,lodForDistance,fitToFootprint,seededRandom} from '../src/scene/buildingParts.ts';
import {BUILDING_FAMILIES,generateFamily,maxStoreys} from '../src/scene/buildingFamilies.ts';
import {CARVED_TYPES,carvedBuildingSpec,carvedVariantFor,familyForType,VARIANTS_PER_FAMILY} from '../src/scene/buildingStyleMap.ts';
import {CARVED_MATERIALS} from '../src/scene/carvedPalette.ts';

const HABITATS=['plains','forest','hills','desert','tundra','wetland'];
const WATER=['+x','-x','+z','-z',undefined];
function* allSpecs(){
 for(const type of CARVED_TYPES)for(const era of[0,1,2,3,5])for(const habitat of HABITATS)for(let id=1;id<=8;id++){
  const extra=type==='grindingStone'?{waterSide:WATER[id%5]}:type==='palisade'?{wallAxis:['x','z','corner'][id%3]}:{};
  const input={worldSeed:777,type,id,era,habitat,footprint:{w:BUILDINGS[type].w,d:BUILDINGS[type].d},...extra};
  yield {input,spec:carvedBuildingSpec(input)};
 }
}

test('every carved type maps to a known family and real building ID with its unchanged footprint',()=>{
 for(const type of CARVED_TYPES){assert.ok(BUILDINGS[type],type);const m=familyForType(type,2,'temperate');assert.ok(m&&BUILDING_FAMILIES[m.family],type);}
 assert.equal(familyForType('farm',2,'temperate'),null);assert.equal(familyForType('bridge',2,'temperate'),null);
 for(const f of Object.keys(BUILDING_FAMILIES))assert.ok(BUILDING_FAMILIES[f].reference.length>20,f+' needs a real-world reference');
});

test('generation is deterministic for the same seed and building ID',()=>{
 for(const type of CARVED_TYPES){const input={worldSeed:42,type,id:17,era:2,habitat:'forest',footprint:{w:BUILDINGS[type].w,d:BUILDINGS[type].d}};
  assert.deepEqual(carvedBuildingSpec(input),carvedBuildingSpec(input),type);}
 const a=seededRandom(5),b=seededRandom(5);for(let i=0;i<20;i++)assert.equal(a(),b());
});

test('every family stays inside its footprint, never below ground, with no floating parts',()=>{
 let checked=0;
 for(const {input,spec} of allSpecs()){
  const b=specBounds(spec),{w,d}=input.footprint,label=`${input.type}/${spec.family}/${spec.variantKey}`;
  assert.ok(b.minX>=-w/2-1e-6&&b.maxX<=w/2+1e-6,label+` x ${b.minX.toFixed(2)}..${b.maxX.toFixed(2)} in ${w}`);
  assert.ok(b.minZ>=-d/2-1e-6&&b.maxZ<=d/2+1e-6,label+` z ${b.minZ.toFixed(2)}..${b.maxZ.toFixed(2)} in ${d}`);
  for(const p of spec.parts){const pb=partBounds(p);assert.ok(pb.minY>=-1e-6,label+' part below ground '+JSON.stringify(p));for(const v of[...p.size,...p.pos])assert.ok(Number.isFinite(v),label);}
  const floating=floatingParts(spec);assert.deepEqual(floating,[],label+' floating '+JSON.stringify(floating.map(i=>spec.parts[i])));
  assert.ok(spec.parts.length>=4,label);
  checked++;
 }
 assert.ok(checked>3000,`checked ${checked}`);
});

test('small hearths are stones and fire, not a building base',()=>{
 for(let id=1;id<20;id++){const spec=carvedBuildingSpec({worldSeed:3,type:'hearth',id,era:2,footprint:{w:3,d:3}}),b=specBounds(spec);
  assert.ok(b.maxX-b.minX<2.2&&b.maxZ-b.minZ<2.6,'hearth spread');assert.ok(b.maxY<1.3,'hearth height '+b.maxY);
  assert.ok(spec.parts.some(p=>p.mat==='fire'));assert.ok(spec.parts.filter(p=>p.mat==='stone'||p.mat==='stoneDark').length>=7);}
});

test('variation is structural: part counts, roof pitch and dimensions differ across variants',()=>{
 for(const type of ['hut','house','warehouse','workshop','temple','market','watchtower','townhall']){
  const specs=Array.from({length:VARIANTS_PER_FAMILY[carvedVariantFor({worldSeed:9,type,id:1,era:3,footprint:BUILDINGS[type]}).family]*6},(_,i)=>carvedBuildingSpec({worldSeed:9,type,id:i+1,era:3,habitat:'plains',footprint:{w:BUILDINGS[type].w,d:BUILDINGS[type].d}}));
  const keys=new Set(specs.map(s=>s.variantKey)),counts=new Set(specs.map(s=>s.parts.length)),heights=new Set(specs.map(s=>specBounds(s).maxY.toFixed(2)));
  assert.ok(keys.size>=2,type+' variants '+keys.size);assert.ok(counts.size>=2,type+' part counts');assert.ok(heights.size>=2,type+' heights');
  const prisms=new Set(specs.flatMap(s=>s.parts.filter(p=>p.shape==='prism'||p.shape==='cone'||p.shape==='wedge').slice(0,1).map(p=>p.shape+(p.size[1]/p.size[0]).toFixed(2))));
  assert.ok(prisms.size>=2,type+' roof pitch/rise differs');
 }
 // Era and climate change the silhouette family, not just colour.
 const hut0=carvedBuildingSpec({worldSeed:1,type:'hut',id:1,era:0,footprint:{w:5.4,d:5.2}}),hut3=carvedBuildingSpec({worldSeed:1,type:'hut',id:1,era:3,footprint:{w:5.4,d:5.2}});
 assert.equal(hut0.family,'roundhouse');assert.equal(hut3.family,'cottage');
 const pitch=h=>{const s=carvedBuildingSpec({worldSeed:1,type:'house',id:2,era:3,habitat:h,footprint:{w:5.4,d:5.2}}),p=s.parts.find(p=>p.shape==='prism');return p.size[1]/(p.size[0]/2);};
 assert.ok(pitch('tundra')>pitch('desert')*1.8,'cold roofs are much steeper than arid');
 const granary=carvedBuildingSpec({worldSeed:1,type:'warehouse',id:1,era:1,footprint:{w:6.6,d:6}});assert.equal(granary.family,'granary');
 assert.ok(granary.parts.filter(p=>p.mat==='stone'&&p.shape==='cylinder').length>=8,'staddle stones');
 assert.equal(carvedBuildingSpec({worldSeed:1,type:'warehouse',id:1,era:3,footprint:{w:6.6,d:6}}).family,'storehouse');
 assert.equal(maxStoreys('wattle',5),1);assert.equal(maxStoreys('stone',5),3);
});

test('watermill wheel sits on the declared water side; without water it is a quern shelter',()=>{
 const wheelCentre=(side)=>{const s=carvedBuildingSpec({worldSeed:5,type:'grindingStone',id:3,era:2,footprint:{w:3,d:3},waterSide:side});assert.equal(s.family,'watermill');
  const wheel=s.parts.find(p=>p.shape==='cylinder'&&p.mat==='woodDark'&&p.sides===12),b=partBounds(wheel);return [(b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2];};
 assert.ok(wheelCentre('+x')[0]>.5);assert.ok(wheelCentre('-x')[0]<-.5);assert.ok(wheelCentre('+z')[1]>.5);assert.ok(wheelCentre('-z')[1]<-.5);
 assert.equal(carvedBuildingSpec({worldSeed:5,type:'grindingStone',id:3,era:2,footprint:{w:3,d:3}}).family,'quernShelter');
});

test('LOD tiers reduce parts and triangles; far palisade uses an impostor wall',()=>{
 for(const {spec} of allSpecs()){
  const n=[0,1,2].map(t=>partsAtLod(spec,t).length),tri=[0,1,2].map(t=>specTriangles(spec,t));
  assert.ok(n[0]>=n[1]&&n[1]>=n[2]&&n[2]>0,spec.variantKey+' '+n);
  assert.ok(tri[0]>=tri[1],spec.variantKey);
  if(spec.family!=='palisade')assert.ok(tri[1]>=tri[2],spec.variantKey);
  assert.ok(n[0]>n[2],spec.variantKey+' far tier must drop detail');
 }
 const pal=carvedBuildingSpec({worldSeed:5,type:'palisade',id:3,era:1,footprint:{w:4,d:4},wallAxis:'x'});
 assert.ok(specTriangles(pal,2)<specTriangles(pal,0)/5,'far palisade is cheap');
 assert.equal(lodForDistance(10),0);assert.equal(lodForDistance(50),1);assert.equal(lodForDistance(200),2);
});

test('variant pool is bounded so instancing works',()=>{
 const keys=new Set();for(let id=0;id<400;id++)keys.add(carvedVariantFor({worldSeed:11,type:'house',id,era:2,habitat:'plains',footprint:{w:5.4,d:5.2}}).key);
 assert.equal(keys.size,VARIANTS_PER_FAMILY.cottage);
});

test('every part material has a palette swatch',()=>{
 const mats=new Set();for(const {spec} of allSpecs())for(const p of spec.parts)mats.add(p.mat);
 for(const m of mats)assert.ok(CARVED_MATERIALS[m],'missing swatch '+m);
});

test('fitToFootprint shrinks only horizontally for upright parts',()=>{
 const spec={family:'t',variantKey:'t',footprint:{w:2,d:2},notes:{reference:''},parts:[{shape:'box',mat:'woodMid',size:[4,3,1],pos:[0,0,0],lod:2}]};
 const fit=fitToFootprint(spec,.1),b=specBounds(fit);assert.ok(b.maxX<=.9+1e-9);assert.equal(fit.parts[0].size[1],3);
});
