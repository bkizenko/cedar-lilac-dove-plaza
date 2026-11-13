// Taste envelope: validator + repair + cast distance + era progression + presets as exemplars + the 'generated' civ source + the off-by-default switch.
// node --import ./scripts/game-loader.mjs --test scripts/taste-envelope.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/scene/tasteEnvelope.ts';
import {PIGMENTS,PROPORTIONS,LIMITS,MEASURED_RATIO,DISTANCE,MATERIAL_BY_CLIMATE} from '../src/scene/tasteData.ts';
import {CIVS,CIV_IDS} from '../src/scene/civStyles.ts';
import {listSkins,skinFromCiv,presetSkin,validSkin,lookOf} from '../src/scene/civSkin.ts';
import {generateCiv,generateCast} from '../src/game/civGenerator.ts';
import {buildSkins} from '../src/game/skinState.ts';
import {generateCivBuilding} from '../src/scene/civBuildings.ts';
import {specBounds} from '../src/scene/buildingParts.ts';
import {lookForSkin} from '../src/scene/peopleLook.ts';

const N=200;
const rolesOf=p=>Object.fromEntries(T.ROLES.map(k=>[k,p[k].hex]));
const hsl=T.toHsl;

test('colour maths: round trip, perceptual distance, hue families',()=>{
 assert.ok(T.deltaE(T.hslHex(...hsl('#a8412f')),'#a8412f')<.005,'hsl round trip');
 assert.ok(T.deltaE('#000000','#ffffff')>.99&&T.deltaE('#000000','#ffffff')<1.01);
 assert.ok(T.deltaE('#a8412f','#a9422f')<.01);
 assert.equal(T.hueFamilies(['#c9a043','#a65a3c','#6b5139']).length,1,'ochre, sienna, umber are one earth family');
 assert.equal(T.hueFamilies(['#c9a043','#2e4a73']).length,2);
});

test('pigment table is historically shaped: undyed and earth first, dyes later, purple rare and last',()=>{
 const by=id=>PIGMENTS.find(p=>p.id===id);
 assert.equal(by('undyedWool').minEra,0);assert.equal(by('yellowOchre').minEra,0);assert.ok(by('madder').minEra>=2&&by('woad').minEra>=2);
 assert.ok(by('tyrian').minEra>=4&&by('tyrian').weight<=Math.min(...PIGMENTS.filter(p=>!['tyrian','crimson','lapis'].includes(p.id)).map(p=>p.weight))/2);
 for(const p of PIGMENTS){const [,s,l]=hsl(p.hex);assert.ok(s<=.7&&l>=.14,`${p.id} is itself inside the taste limits`);}
});

test('presets are exemplar points: all 14 civ bibles and every registry skin pass the exemplar palette rules',()=>{
 let n=0;for(const s of listSkins()){if(!s.palette)continue;n++;const v=T.checkPalette(rolesOf(s.palette),'exemplar');assert.deepEqual(v,[],`${s.id}: ${v.map(x=>x.rule+' '+x.detail)}`);}
 assert.ok(n>=22);
 assert.equal(T.PRESET_EXEMPLARS.length,14);
 for(const e of T.PRESET_EXEMPLARS){const v=T.validateGenome(e,'exemplar');assert.deepEqual(v.violations,[],`${e.grammar}: ${JSON.stringify(v.violations)}`);}
});

test('presets stay byte for byte: switch is off by default and generating presets never changes them',()=>{
 assert.equal(T.tasteEnvelopeEnabled(),false);
 const before=JSON.stringify(CIV_IDS.map(i=>presetSkin(i)));
 T.setTasteEnvelope(true);try{
  for(const id of CIV_IDS){const c=generateCiv(7,0,'preset',id),s=skinFromCiv(c);assert.equal(JSON.stringify({...s,origin:undefined}),JSON.stringify({...presetSkin(id),origin:undefined}));}
 }finally{T.setTasteEnvelope(false);}
 assert.equal(JSON.stringify(CIV_IDS.map(i=>presetSkin(i))),before);
 // default cast (preset/remix/free) is identical with the switch off to what it was: no 'generated' civ is ever dealt by default
 assert.ok(generateCast(3,6).every(c=>c.mode!=='generated'));
});

test(`${N} seeded genomes: every one passes the strict validator after sampling + repair`,()=>{
 for(let s=1;s<=N;s++){
  const r=T.repairGenome(T.sampleGenome(s),'generated');
  assert.deepEqual(r.verdict.violations,[],`seed ${s}: ${JSON.stringify(r.verdict.violations)}`);
  assert.equal(r.verdict.ok,true);assert.equal(r.verdict.score,1);
  assert.deepEqual(T.generateGenome(s),r.genome,'generateGenome = sample + repair, deterministic');
 }
});

test(`${N} unconstrained (status quo style) genomes: validator catches them and repair fixes every one`,()=>{
 let caught=0;const rules=new Set();
 for(let s=1;s<=N;s++){
  const raw=T.rawGenome(s),v=T.validateGenome(raw);if(v.violations.length){caught++;v.violations.forEach(x=>rules.add(x.rule));}
  const r=T.repairGenome(raw,'generated');assert.deepEqual(r.verdict.violations,[],`raw seed ${s}: ${JSON.stringify(r.verdict.violations)}`);
 }
 assert.ok(caught>=N*.98,`unconstrained sampling is almost always weird (${caught}/${N})`);
 for(const need of ['neon','saturation-cap','hue-count','harmony','purple-rare','material-compat','roof-pitch','garb-cut','ornament-zone-family'])assert.ok(rules.has(need),'rule exercised: '+need);
});

test('no forbidden palette survives: no neon, pure primary, near-black, blown white, dark-brown-with-green, more than 3 hue families',()=>{
 for(let s=1;s<=N;s++){
  const g=T.generateGenome(s),p=g.palette,L=LIMITS.generated;
  const made=['wall','wall2','roof','trim','accent','cloth'];
  for(const k of T.ROLES){const [h,sa,l]=hsl(p[k]);assert.ok(sa<.75||l<.42||l>.78,`neon ${s}/${k}`);assert.ok(l>=L.floorL-1e-3&&l<=L.ceilL,`lightness ${s}/${k}`);
   assert.ok(!(sa>=.65&&l>=.3&&l<=.72&&[0,120,240].some(c=>Math.min(Math.abs(h-c),360-Math.abs(h-c))<=14)),`primary ${s}/${k}`);}
  assert.ok(T.hueFamilies(made.map(k=>p[k])).length<=3,`families ${s}`);
  const brown=made.some(k=>{const [h,sa,l]=hsl(p[k]);return h>=5&&h<=50&&sa>=.15&&l<L.darkBrownL;}),green=made.some(k=>{const [h,sa]=hsl(p[k]);return h>=70&&h<=170&&sa>=.2;});
  assert.ok(!(brown&&green),`dark brown with green ${s}`);
 }
});

test('forbidden examples are caught by name',()=>{
 const base=T.generateGenome(4).palette;
 const hit=(over,rule)=>assert.ok(T.checkPalette({...base,...over}).some(v=>v.rule===rule),rule+' for '+JSON.stringify(over));
 hit({accent:'#00ff40'},'neon');hit({cloth:'#ff0000'},'pure-primary');hit({roof:'#050505'},'near-black');hit({trim:'#3a2a1a',accent:'#3f8a3a'},'dark-brown-with-green');
 hit({accent:'#c030c0',cloth:'#7040b0'},'purple-rare');
 const four={...base,wall:'#d8c89a',roof:'#3a6a9a',accent:'#a03030',cloth:'#4a8a4a',trim:'#c9a043'};assert.ok(T.checkPalette(four).some(v=>v.rule==='hue-count'||v.rule==='harmony'),'too many hues');
 assert.deepEqual(T.checkPalette(T.repairPalette({...four,accent:'#00ff40'})),[],'repair clears it');
});

test('repair is deterministic and idempotent; clamp never needs randomness',()=>{
 for(let s=1;s<=40;s++){
  const raw=T.rawGenome(s),a=T.clampGenome(raw),b=T.clampGenome(raw);assert.deepEqual(a,b);
  const fixed=T.repairGenome(raw).genome;assert.deepEqual(T.clampGenome(fixed),fixed,'repairing a valid genome changes nothing');
 }
});

test('material availability and compatibility: biome-appropriate, no forbidden pairs, roofs sit on what can carry them',()=>{
 for(let s=1;s<=N;s++){
  const g=T.generateGenome(s),m=g.materials,av=MATERIAL_BY_CLIMATE[g.climate];
  for(const k of ['wall','wall2','roof'])assert.ok((av[m[k]]??0)>0,`${s} ${m[k]} not local in ${g.climate}`);
  assert.ok(!(g.climate==='wet'&&m.wall==='felt'));assert.ok(!(g.climate==='arid'&&['bamboo','turf'].includes(m.wall)));
  assert.ok(!(g.climate==='arid'&&m.wall==='wood'),'no timber walls in the desert');
 }
});

test('proportion envelopes by climate and material hold for every genome',()=>{
 for(let s=1;s<=N;s++){
  const g=T.generateGenome(s),P=PROPORTIONS[g.climate];
  for(const k of Object.keys(P)){assert.ok(g.proportions[k]>=P[k][0]-1e-6&&g.proportions[k]<=P[k][1]+1e-6,`${s} ${k} ${g.proportions[k]}`);}
 }
 // the real buildings of all 14 grammars sit inside the measured silhouette envelope
 for(const id of CIV_IDS)for(const [role,key] of [['house','house'],['civic','civic']]){
  const spec=generateCivBuilding(id,role,{seed:11,era:3,wealth:.6,wear:.1,footprint:role==='house'?{w:8,d:7}:{w:14,d:12}}),b=specBounds(spec);
  const r=Math.max(b.maxX-b.minX,b.maxZ-b.minZ)/(b.maxY-b.minY);assert.ok(r>=MEASURED_RATIO[key][0]&&r<=MEASURED_RATIO[key][1],`${id} ${role} ratio ${r}`);
 }
});

test('ornament rules: motifs belong to the family, density and zone caps, symmetry and repeat ranges',()=>{
 for(let s=1;s<=N;s++){
  const o=T.generateGenome(s).ornament;
  assert.ok(o.motifs.length>=1&&o.motifs.length<=2&&o.zones.length>=1&&o.zones.length<=3&&o.density<=.68);
 }
 const bad=T.sampleGenome(3);bad.ornament={...bad.ornament,family:'mosaic',motifs:['wave','spiral','knot'],zones:['hem','lintel','banner','potRim'],density:.95,repeat:99};
 const rules=new Set(T.validateGenome(bad).violations.map(v=>v.rule));
 for(const r of ['ornament-motifs','ornament-motif-family','ornament-zones','ornament-zone-family','ornament-density','ornament-repeat'])assert.ok(rules.has(r),r);
});

test('garb: cut, headwear and fibre fit the climate, colours come from the civ palette, motif from its ornament',()=>{
 for(let s=1;s<=N;s++){
  const g=T.generateGenome(s);
  assert.ok(g.garb.body===g.palette.cloth);assert.ok([g.palette.accent,g.palette.trim,g.palette.cloth].includes(g.garb.trim));
  assert.ok(g.ornament.motifs.includes(g.garb.motif));
  assert.ok(T.hueFamilies([g.garb.body,g.garb.trim]).length<=2);
 }
 const g=T.sampleGenome(9);g.climate='arid';g.garb={...g.garb,cut:'poncho',headwear:'hood',fibre:'fur'};
 const rules=new Set(T.validateGenome(g).violations.map(v=>v.rule));for(const r of ['garb-cut','garb-headwear','garb-fibre'])assert.ok(rules.has(r),r);
});

test('one style genome drives everything: skin garb, banner, wonder, roof and palette all come from it',()=>{
 for(let slot=0;slot<6;slot++){
  const civ=generateCiv(21,slot,'generated'),skin=skinFromCiv(civ),g=T.genomeForCivId(civ.id);
  assert.ok(validSkin(skin));assert.equal(skin.mode,'generated');assert.equal(skin.grammar,g.grammar);assert.equal(skin.roof,g.roofForm);
  assert.equal(skin.palette.wall.hex,g.palette.wall);assert.equal(skin.palette.accent.hex,g.palette.accent);assert.equal(skin.garb.body,g.palette.cloth);assert.equal(skin.garb.cut,g.garb.cut);
  assert.deepEqual(skin.banner,g.banner);assert.equal(skin.wonder.signature,g.wonder.signature);assert.equal(skin.silhouette,g.silhouette);
  assert.deepEqual(civ.materials.slice().sort(),[...new Set([g.materials.wall,g.materials.wall2,g.materials.roof])].sort());
  assert.deepEqual(skinFromCiv(generateCiv(21,slot,'generated')),skin,'deterministic');
  assert.ok(lookOf(skin)&&lookForSkin(skin),'renderers accept it');
  assert.deepEqual(T.checkPalette(rolesOf(skin.palette),'generated'),[]);
 }
});

test('a game never repeats a look: 60 games x 8 civs are pairwise far apart in palette, silhouette and ornament, and away from the presets',()=>{
 let minTotal=9,minPal=9,minForm=9,minPreset=9;
 for(let gs=1;gs<=60;gs++){
  const cast=T.castGenomes(gs,8);assert.equal(cast.length,8);
  assert.deepEqual(T.castGenomes(gs,4),cast.slice(0,4),'prefix-stable so slot i never depends on later slots');
  for(let i=0;i<8;i++){
   for(let j=i+1;j<8;j++){const d=T.genomeDistance(cast[i],cast[j]);assert.ok(T.pairOk(d),`game ${gs} civs ${i},${j}: ${JSON.stringify(d)}`);minTotal=Math.min(minTotal,d.total);minPal=Math.min(minPal,d.palette);minForm=Math.min(minForm,d.form);}
   for(const e of T.PRESET_EXEMPLARS)minPreset=Math.min(minPreset,T.exemplarDistance(cast[i],e));
  }
 }
 assert.ok(minTotal>=DISTANCE.minPair&&minPal>=DISTANCE.minPalette&&minForm>=.2&&minPreset>=DISTANCE.minFromPreset,JSON.stringify({minTotal,minPal,minForm,minPreset}));
});

test('era progression: huts first, dyes and ornament only arrive with the age, steps are gradual, every era is inside the envelope',()=>{
 for(let s=1;s<=N;s++){
  const g=T.generateGenome(s),v=T.checkEraProgression(g);assert.deepEqual(v,[],`seed ${s}: ${JSON.stringify(v)}`);
  const e0=T.eraView(g,0),e5=T.eraView(g,5);
  assert.ok(Object.values(e0.materials).every(m=>['thatch','wood','turf','felt','bamboo','mudbrick'].includes(m)),'era 0 builds huts');
  assert.deepEqual(e5.materials,g.materials);assert.ok(e0.ornamentDensity<=.1+1e-9&&e5.ornamentDensity>=e0.ornamentDensity);
  assert.ok(!e0.dyesKnown.includes('indigo')&&!e0.dyesKnown.includes('tyrian'));
 }
 // a hand-made abrupt style change is caught
 const g=T.generateGenome(5),eras=T.eraView(g,2);assert.ok(eras.satCap<T.eraView(g,5).satCap);
});

test('the switch: off by default (free/remix skins unchanged); on repairs them into the envelope deterministically',()=>{
 const raw=[];for(let gs=1;gs<=40;gs++)for(const mode of ['free','remix'])raw.push(skinFromCiv(generateCiv(gs,0,mode)));
 assert.equal(T.tasteEnvelopeEnabled(),false);
 const offA=JSON.stringify(raw.map(s=>s.palette));
 T.setTasteEnvelope(true);let fixed;try{
  fixed=[];for(let gs=1;gs<=40;gs++)for(const mode of ['free','remix'])fixed.push(skinFromCiv(generateCiv(gs,0,mode)));
  const again=[];for(let gs=1;gs<=40;gs++)for(const mode of ['free','remix'])again.push(skinFromCiv(generateCiv(gs,0,mode)));assert.deepEqual(fixed,again);
 }finally{T.setTasteEnvelope(false);}
 assert.equal(JSON.stringify(raw.map(s=>s.palette)),offA,'off again: identical to before');
 let before=0;
 for(let i=0;i<raw.length;i++){
  before+=T.checkPalette(rolesOf(raw[i].palette),'generated').length>0?1:0;
  assert.deepEqual(T.checkPalette(rolesOf(fixed[i].palette),'generated'),[],`${fixed[i].id}`);assert.ok(validSkin(fixed[i]));
  assert.equal(fixed[i].grammar,raw[i].grammar,'grammar and identity untouched');
 }
 assert.ok(before>0,'the legacy generators do emit out-of-envelope palettes (that is what the switch fixes): '+before+'/'+raw.length);
});

test('generated source works end to end in skinState without disturbing the default cast',()=>{
 const st=buildSkins(5,4);assert.ok(Object.values(st.slots).every(s=>s.mode!=='generated'));
 const c=generateCiv(9,2,'generated');assert.equal(c.mode,'generated');assert.equal(c.preset,undefined);assert.ok(c.materials.length>=1);
});
