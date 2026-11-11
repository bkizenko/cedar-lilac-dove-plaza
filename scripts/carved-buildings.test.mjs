import test from 'node:test';import assert from 'node:assert/strict';
import {BUILDINGS} from '../src/game/constants.ts';
import {specBounds,floatingParts,partsAtLod,specTriangles,partBounds,lodForDistance,renderTierForDistance,fitToFootprint,seededRandom,structuralSignature} from '../src/scene/buildingParts.ts';
import {BUILDING_FAMILIES,generateFamily,maxStoreys} from '../src/scene/buildingFamilies.ts';
import {CARVED_TYPES,carvedBuildingSpec,carvedVariantFor,familyForType,traditionFor,VARIANTS_PER_FAMILY} from '../src/scene/buildingStyleMap.ts';
import {CARVED_MATERIALS,CARVED_MATERIAL_IDS,CARVED_TERRAIN,CARVED_LIGHT_RIG,WOOD_FAMILY,hsv,luminance,woodGrainPixels} from '../src/scene/carvedPalette.ts';
import {buildCarvedMesh,impostorCard} from '../src/scene/carvedMesh.ts';
import {carvedTerraceSample,carvedTerrainColorsForPositions,terracedHeight} from '../src/scene/carvedTerrace.ts';
import {familyBudgets,estimateVillage} from '../src/scene/carvedBudget.ts';

const HABITATS=['plains','forest','hills','desert','tundra','wetland'];
const WATER=['+x','-x','+z','-z',undefined];
const fp=type=>({w:BUILDINGS[type].w,d:BUILDINGS[type].d});
function* allSpecs(ids=8){
 for(const type of CARVED_TYPES)for(const era of[0,1,2,3,5])for(const habitat of HABITATS)for(let id=1;id<=ids;id++){
  const extra=type==='grindingStone'?{waterSide:WATER[id%5]}:type==='palisade'?{wallAxis:['x','z','corner'][id%3]}:{};
  const input={worldSeed:777,type,id,era,habitat,footprint:fp(type),settlementSeed:id%3,...extra};
  yield {input,spec:carvedBuildingSpec(input)};
 }
}

test('every carved type maps to a known family and real building ID with its unchanged footprint',()=>{
 for(const type of CARVED_TYPES){assert.ok(BUILDINGS[type],type);const m=familyForType(type,2,'temperate');assert.ok(m&&BUILDING_FAMILIES[m.family],type);}
 assert.equal(familyForType('farm',2,'temperate'),null);assert.equal(familyForType('bridge',2,'temperate'),null);
 for(const f of Object.keys(BUILDING_FAMILIES))assert.ok(BUILDING_FAMILIES[f].reference.length>20,f+' needs a real-world reference');
 const spec=carvedBuildingSpec({worldSeed:1,type:'house',id:4,era:2,footprint:fp('house')});assert.deepEqual(spec.footprint,fp('house'));
});

test('generation is deterministic for the same seed and building ID',()=>{
 for(const type of CARVED_TYPES){const input={worldSeed:42,type,id:17,era:2,habitat:'forest',footprint:fp(type),settlementSeed:3,prosperity:.5};
  assert.deepEqual(carvedBuildingSpec(input),carvedBuildingSpec(input),type);
  const s=carvedBuildingSpec(input);for(const t of[0,1,2]){const a=buildCarvedMesh(s,t),b=buildCarvedMesh(s,t);assert.deepEqual(a.positions,b.positions);assert.deepEqual(a.colors,b.colors);}}
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

test('generators aim inside the footprint: the final fit never distorts proportions by more than 18%',()=>{
 for(const {input} of allSpecs(4)){
  const v=carvedVariantFor(input),raw=BUILDING_FAMILIES[v.family].generate(v.ctx,seededRandom(v.ctx.seed)),b=specBounds({parts:raw.parts}),{w,d}=v.ctx.footprint;
  const s=Math.min(1,(w/2)/Math.max(-b.minX,b.maxX),(d/2)/Math.max(-b.minZ,b.maxZ));
  assert.ok(s>=.82,`${input.type}/${v.family} raw overhang scale ${s.toFixed(2)}`);
 }
});

test('built triangle meshes match the declared parts, stay in the footprint and above ground',()=>{
 for(const {input,spec} of allSpecs(2)){
  const {w,d}=input.footprint;
  for(const t of[0,1,2]){
   const m=buildCarvedMesh(spec,t),label=`${spec.variantKey}@${t}`;
   assert.equal(m.triangles,specTriangles(spec,t),label);assert.equal(m.positions.length,m.triangles*9,label);
   assert.ok(m.bounds.minY>=-1e-5,label+' below ground '+m.bounds.minY);
   assert.ok(m.bounds.minX>=-w/2-1e-5&&m.bounds.maxX<=w/2+1e-5&&m.bounds.minZ>=-d/2-1e-5&&m.bounds.maxZ<=d/2+1e-5,label+' outside footprint');
   for(let i=0;i<m.normals.length;i+=3){const l=Math.hypot(m.normals[i],m.normals[i+1],m.normals[i+2]);assert.ok(l===0||Math.abs(l-1)<1e-4,label+' normal');}
   for(const a of[m.positions,m.uvs,m.colors,m.grain])for(const x of a)assert.ok(Number.isFinite(x),label);
   for(const c of m.colors)assert.ok(c>=0&&c<=1,label);
  }
 }
});

test('small hearths are stones and fire, not a building base',()=>{
 for(let id=1;id<20;id++){const spec=carvedBuildingSpec({worldSeed:3,type:'hearth',id,era:2,footprint:{w:3,d:3}}),b=specBounds(spec);
  assert.ok(b.maxX-b.minX<2.2&&b.maxZ-b.minZ<2.6,'hearth spread');assert.ok(b.maxY<1.3,'hearth height '+b.maxY);
  assert.ok(spec.parts.some(p=>p.mat==='fire'));assert.ok(spec.parts.filter(p=>p.mat==='stone'||p.mat==='stoneDark').length>=7);
  assert.ok(!spec.parts.some(p=>p.shape==='box'&&p.size[0]>1&&p.size[2]>1),'no platform under a hearth');}
});

test('no oversized universal platform: no ground slab wider than the walls it carries',()=>{
 for(const {spec} of allSpecs(2)){
  for(const p of spec.parts){if(p.shape!=='box'||p.pos[1]>.01||p.size[1]>.4)continue;
   const {w,d}=spec.footprint;assert.ok(p.size[0]*p.size[2]<w*d*.8||spec.family==='palisade',spec.variantKey+' ground slab '+p.size);}
 }
});

test('variation is structural across seeds: distinct massing/roof/part-mix signatures per family',()=>{
 const MIN={roundhouse:5,cottage:6,longhouse:4,granary:4,storehouse:3,watermill:3,quernShelter:2,workshop:6,palisade:3,gate:3,tower:4,church:4,marketStalls:4,hearth:4};
 const sigs=new Map();
 for(const type of CARVED_TYPES)for(const era of[0,1,2,3])for(let id=1;id<=30;id++){
  const extra=type==='grindingStone'&&id%2?{waterSide:'+x'}:type==='palisade'?{wallAxis:['x','z','corner'][id%3]}:{};
  const spec=carvedBuildingSpec({worldSeed:9,type,id,era,habitat:HABITATS[id%4],footprint:fp(type),settlementSeed:id%5,...extra});
  if(!sigs.has(spec.family))sigs.set(spec.family,new Set());sigs.get(spec.family).add(structuralSignature(spec));
 }
 for(const [f,min] of Object.entries(MIN))assert.ok((sigs.get(f)?.size??0)>=min,`${f}: ${sigs.get(f)?.size} distinct structures < ${min}`);
 // Era and climate change the silhouette family, not just colour.
 const hut0=carvedBuildingSpec({worldSeed:1,type:'hut',id:1,era:0,footprint:fp('hut')}),hut3=carvedBuildingSpec({worldSeed:1,type:'hut',id:1,era:3,footprint:fp('hut')});
 assert.equal(hut0.family,'roundhouse');assert.equal(hut3.family,'cottage');
 const pitch=h=>{const s=carvedBuildingSpec({worldSeed:1,type:'house',id:2,era:3,habitat:h,footprint:fp('house')}),p=s.parts.find(p=>p.shape==='prism');return p.size[1]/(p.size[0]/2);};
 assert.ok(pitch('tundra')>pitch('desert')*1.8,'cold roofs are much steeper than arid');
 const granary=carvedBuildingSpec({worldSeed:1,type:'warehouse',id:1,era:1,footprint:fp('warehouse')});assert.equal(granary.family,'granary');
 assert.ok(granary.parts.filter(p=>p.mat==='stone'&&p.shape==='cylinder').length>=8,'staddle stones');
 assert.equal(carvedBuildingSpec({worldSeed:1,type:'warehouse',id:1,era:3,footprint:fp('warehouse')}).family,'storehouse');
 assert.equal(maxStoreys('wattle',5),1);assert.equal(maxStoreys('stone',5),3);
 const longhouse=carvedBuildingSpec({worldSeed:1,type:'townhall',id:1,era:1,footprint:fp('townhall')});assert.ok(longhouse.parts.some(p=>p.shape==='hip'&&p.inset>0),'hall has a true hipped roof');
});

test('G3: the same building ID shows era and prosperity variants; equal-era villages look different',()=>{
 const base={worldSeed:5,type:'house',id:12,habitat:'plains',footprint:fp('house'),settlementSeed:1};
 const eras=new Set([0,1,2,3,5].map(era=>structuralSignature(carvedBuildingSpec({...base,era}))));assert.ok(eras.size>=3,'era variants '+eras.size);
 const poor=carvedVariantFor({...base,era:3,prosperity:.1}),rich=carvedVariantFor({...base,era:3,prosperity:.95});assert.ok(rich.ctx.wealth>poor.ctx.wealth+.3);
 const villages=[1,2].map(s=>new Set(Array.from({length:24},(_,i)=>structuralSignature(carvedBuildingSpec({...base,id:i+1,era:2,settlementSeed:s*101})))));
 const shared=[...villages[0]].filter(x=>villages[1].has(x)).length;assert.ok(shared<=villages[0].size/4,`villages share ${shared}/${villages[0].size} house structures`);
 const t1=traditionFor(5,101),t2=traditionFor(5,202);assert.notDeepEqual(t1,t2);assert.deepEqual(traditionFor(5,101),t1);
});

test('watermill wheel sits on the declared water side; without water it is a quern shelter',()=>{
 const wheelCentre=(side)=>{const s=carvedBuildingSpec({worldSeed:5,type:'grindingStone',id:3,era:2,footprint:{w:3,d:3},waterSide:side});assert.equal(s.family,'watermill');
  const wheel=s.parts.find(p=>p.shape==='cylinder'&&p.mat==='woodDark'&&p.sides===12),b=partBounds(wheel);return [(b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2];};
 assert.ok(wheelCentre('+x')[0]>.5);assert.ok(wheelCentre('-x')[0]<-.5);assert.ok(wheelCentre('+z')[1]>.5);assert.ok(wheelCentre('-z')[1]<-.5);
 assert.equal(carvedBuildingSpec({worldSeed:5,type:'grindingStone',id:3,era:2,footprint:{w:3,d:3}}).family,'quernShelter');
});

test('LOD tiers reduce parts and triangles; far tier is an impostor card',()=>{
 for(const {spec} of allSpecs(3)){
  const n=[0,1,2].map(t=>partsAtLod(spec,t).length),tri=[0,1,2].map(t=>specTriangles(spec,t));
  assert.ok(n[0]>=n[1]&&n[1]>=n[2]&&n[2]>0,spec.variantKey+' '+n);
  assert.ok(tri[0]>=tri[1],spec.variantKey);
  if(spec.family!=='palisade')assert.ok(tri[1]>=tri[2],spec.variantKey);
  assert.ok(n[0]>n[2],spec.variantKey+' far tier must drop detail');
  const card=impostorCard(spec);assert.ok(card.width<=spec.footprint.w+1e-9&&card.depth<=spec.footprint.d+1e-9&&card.height>0&&card.eave<=card.height+1e-9,spec.variantKey);
  assert.ok(CARVED_MATERIALS[card.wall]&&CARVED_MATERIALS[card.roof]);
 }
 const pal=carvedBuildingSpec({worldSeed:5,type:'palisade',id:3,era:1,footprint:{w:4,d:4},wallAxis:'x'});
 assert.ok(specTriangles(pal,2)<specTriangles(pal,0)/5,'far palisade is cheap');
 assert.equal(lodForDistance(10),0);assert.equal(lodForDistance(50),1);assert.equal(lodForDistance(100),2);assert.equal(renderTierForDistance(200),3);
});

test('variant pool is bounded so instancing works',()=>{
 const keys=new Set();for(let id=0;id<400;id++)keys.add(carvedVariantFor({worldSeed:11,type:'house',id,era:2,habitat:'plains',footprint:fp('house')}).key);
 assert.equal(keys.size,VARIANTS_PER_FAMILY.cottage);
 const withTiers=new Set();for(let id=0;id<400;id++)withTiers.add(carvedVariantFor({worldSeed:11,type:'house',id,era:2,footprint:fp('house'),settlementSeed:4,prosperity:(id%10)/10}).key);
 assert.ok(withTiers.size<=VARIANTS_PER_FAMILY.cottage*3);
});

test('palette tokens are complete, warm honey-orange wood, blue water, restrained foliage',()=>{
 const mats=new Set();for(const {spec} of allSpecs(2))for(const p of spec.parts)mats.add(p.mat);
 for(const m of mats)assert.ok(CARVED_MATERIALS[m],'missing swatch '+m);
 for(const id of CARVED_MATERIAL_IDS){const s=CARVED_MATERIALS[id];assert.match(s.hex,/^#[0-9a-f]{6}$/);assert.ok(s.roughness>0&&s.roughness<=1);assert.ok(s.grain>=0&&s.grain<=1);}
 // Board-measured wood: hue 24-34 deg; not brown/rust (value and saturation floors).
 for(const id of ['woodLight','woodMid','thatch','shingle','tile','plaster']){const [h,s,v]=hsv(CARVED_MATERIALS[id].hex);assert.ok(h>=22&&h<=34,`${id} hue ${h.toFixed(0)}`);assert.ok(s>=.4,`${id} saturation ${s.toFixed(2)}`);assert.ok(v>=.7,`${id} value ${v.toFixed(2)}`);}
 assert.ok(hsv(CARVED_MATERIALS.woodMid.hex)[1]>=.55,'woodMid is honey-orange, not beige');
 for(const id of WOOD_FAMILY){const h=hsv(CARVED_MATERIALS[id].hex)[0];assert.ok(h>=20&&h<=38,id+' stays in the wood hue family');}
 const [wh,ws]=hsv(CARVED_MATERIALS.water.hex);assert.ok(wh>=180&&wh<=220&&ws>=.12&&ws<=.35,'slate-blue water');
 for(const id of ['foliage','foliageDark']){const [h,s]=hsv(CARVED_MATERIALS[id].hex);assert.ok(h>=50&&h<=90&&s<=.5,id+' restrained olive-sage');}
 assert.ok(luminance(CARVED_MATERIALS.woodEdge.hex)<luminance(CARVED_MATERIALS.woodDark.hex)&&luminance(CARVED_MATERIALS.woodDark.hex)<luminance(CARVED_MATERIALS.woodMid.hex)&&luminance(CARVED_MATERIALS.woodMid.hex)<luminance(CARVED_MATERIALS.woodLight.hex));
 assert.ok(luminance(CARVED_MATERIALS.recess.hex)<luminance(CARVED_MATERIALS.woodEdge.hex));
 for(const b of CARVED_TERRAIN.bands)assert.ok(luminance(CARVED_TERRAIN.riser)<luminance(b)*.7,'carved riser darker than band '+b);
 assert.ok(luminance(CARVED_TERRAIN.path)>Math.max(...CARVED_TERRAIN.bands.map(luminance)),'inlaid paths are lighter');
 // Warm rig: the cool classic sky would beige the wood.
 const warm=hex=>{const [r,,b]=[parseInt(hex.slice(1,3),16),0,parseInt(hex.slice(5,7),16)];return r>b;};
 assert.ok(warm(CARVED_LIGHT_RIG.hemiSky)&&warm(CARVED_LIGHT_RIG.sun)&&warm(CARVED_LIGHT_RIG.fog));
});

test('wood grain texture is deterministic, visible but gentle',()=>{
 const a=woodGrainPixels(64,7),b=woodGrainPixels(64,7),c=woodGrainPixels(64,8);assert.deepEqual(a,b);assert.notDeepEqual(a,c);
 let sum=0,min=255;for(let i=0;i<a.length;i+=4){sum+=a[i];min=Math.min(min,a[i]);assert.equal(a[i],a[i+1]);assert.equal(a[i+3],255);}
 const mean=sum/(a.length/4)/255;assert.ok(mean>.88&&mean<1,'grain mean '+mean.toFixed(3));assert.ok(min/255<.85,'grain lines visible');
});

test('carved terrace terrain: dark risers at band edges, inlaid paths, water below',()=>{
 const slope=(x,z)=>x*.4;let edgeMax=0,flatEdge=1;
 for(let x=0;x<20;x+=.05){const s=carvedTerraceSample(slope,x,0,0);edgeMax=Math.max(edgeMax,s.edge);}
 assert.ok(edgeMax>.8,'risers appear on slopes');
 assert.equal(carvedTerraceSample((x,z)=>-1,0,0,0).band,-1);
 const pos=new Float32Array([0,0,0,5,2,0,10,4,0]),cols=carvedTerrainColorsForPositions(pos,slope,0,0,()=>1),plain=carvedTerrainColorsForPositions(pos,slope,0,0);
 assert.equal(cols.length,9);assert.ok(cols[4]>=plain[4],'path inlay lightens');
 assert.ok(terracedHeight(2.3,0,1)!==2.3&&terracedHeight(-1,0,1)===-1);
});

test('budget estimate: families stay within near/mid/far triangle caps; a 60-building village is a handful of draws',()=>{
 const caps={near:2600,mid:1400,far:700};
 for(const f of familyBudgets(3)){assert.ok(f.trisMax[0]<=caps.near,`${f.family} near ${f.trisMax[0]}`);assert.ok(f.trisMax[1]<=caps.mid,`${f.family} mid ${f.trisMax[1]}`);assert.ok(f.trisMax[2]<=caps.far,`${f.family} far ${f.trisMax[2]}`);}
 const types=['house','house','house','hut','hut','warehouse','workshop','forge','hearth','market','watchtower','palisade'],instances=[];
 for(let i=0;i<60;i++)instances.push({type:types[i%types.length],id:i+1,era:2,distance:10+i*3,settlementSeed:1});
 const est=estimateVillage(3,instances,renderTierForDistance);
 assert.ok(est.drawCalls<=60&&est.drawCalls>0,'draws '+est.drawCalls);assert.ok(est.triangles<60*2600);assert.ok(est.geometryBytes<16*1024*1024,'resident geometry '+est.geometryBytes);
});

test('fitToFootprint shrinks only horizontally for upright parts',()=>{
 const spec={family:'t',variantKey:'t',footprint:{w:2,d:2},notes:{reference:''},parts:[{shape:'box',mat:'woodMid',size:[4,3,1],pos:[0,0,0],lod:2}]};
 const fit=fitToFootprint(spec,.1),b=specBounds(fit);assert.ok(b.maxX<=.9+1e-9);assert.equal(fit.parts[0].size[1],3);
});

test('G2: daytime grade is golden-hour dominant with a gentle noon dip',async()=>{
 const {carvedDaylightGrade}=await import('../src/scene/carvedPalette.ts');
 let warm=0;for(let i=0;i<=100;i++){const g=carvedDaylightGrade(i/100);if(g.warmth>.85)warm++;assert.match(g.sun,/^#[0-9a-f]{6}$/);assert.ok(g.sunIntensity>0);}
 assert.ok(warm>=60,'warm for most of the day: '+warm);
 assert.ok(carvedDaylightGrade(.5).warmth<carvedDaylightGrade(.2).warmth&&carvedDaylightGrade(.5).warmth>.5);
 assert.deepEqual(carvedDaylightGrade(.3),carvedDaylightGrade(.3));
});
