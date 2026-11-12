import test from 'node:test';import assert from 'node:assert/strict';
import {generateCulture,contrast,dressFor,toSocietyIdentity,SEASON_GARMENTS,GARMENT_HEAT,SEASONS,MOTIFS} from '../src/scene/cultureGrammar.ts';
import {identityIssue} from '../src/game/societyIdentity.ts';
import {GARMENT_KINDS} from '../src/game/textiles.ts';
const N=300,all=Array.from({length:N},(_,i)=>generateCulture({seed:i+1}));
test('cultures are deterministic per seed and structurally complete',()=>{
 assert.deepEqual(generateCulture({seed:42}),generateCulture({seed:42}));assert.notDeepEqual(generateCulture({seed:42}),generateCulture({seed:43}));
 for(const c of all){assert.ok(c.motifs.length>=1&&c.motifs.every(m=>MOTIFS.includes(m)));for(const col of Object.entries(c.palette).filter(([k])=>k!=='scheme'&&k!=='sources').map(([,v])=>v))assert.match(col,/^#[0-9a-f]{6}$/);
  assert.equal(Object.keys(c.dress).length,4);assert.ok(c.pottery.profile.length>=4&&c.pottery.profile.every(([r,h])=>r>=0&&r<=1.2&&h>=0&&h<=1));}
});
test('diversity over 300 seeds: palettes, flag layouts and pottery forms are mostly distinct',()=>{
 const pal=new Set(all.map(c=>[c.palette.ground,c.palette.field,c.palette.accent,c.palette.trim,c.palette.shadow].join())),flags=new Set(all.map(c=>c.flag.key)),pots=new Set(all.map(c=>c.pottery.key)),forms=new Set(all.map(c=>c.pottery.form)),divs=new Set(all.map(c=>c.flag.division)),charges=new Set(all.map(c=>c.flag.charge)),keys=new Set(all.map(c=>c.key));
 assert.ok(pal.size>=295,'palettes '+pal.size);assert.ok(flags.size>=290,'flag layouts '+flags.size);assert.ok(pots.size>=290,'pottery '+pots.size);assert.equal(keys.size,N);
 assert.equal(forms.size,12,'every pottery form appears');assert.ok(divs.size>=11&&charges.size>=15,'flag grammar is used broadly '+divs.size+'/'+charges.size);
 // Coarse layout (division x charge x placement) alone still has many combinations.
 assert.ok(new Set(all.map(c=>[c.flag.division,c.flag.charge,c.flag.placement].join())).size>=120);
});
test('not one culture per climate or material: each climate yields many palettes, forms and flags',()=>{
 for(const climate of['arid','temperate','cold','wet']){const cs=Array.from({length:60},(_,i)=>generateCulture({seed:i+1000,climate}));
  assert.ok(new Set(cs.map(c=>c.pottery.form)).size>=8,climate+' forms');assert.ok(new Set(cs.map(c=>c.flag.key)).size>=55,climate+' flags');assert.ok(new Set(cs.map(c=>c.palette.scheme)).size===4,climate+' schemes');assert.ok(new Set(cs.map(c=>c.architecture.material)).size>=2,climate+' materials');}
 const same=Array.from({length:40},(_,i)=>generateCulture({seed:i+5,climate:'arid',material:'mudbrick',craft:'pottery',coastal:false}));assert.ok(new Set(same.map(c=>c.key)).size>=38,'fixed inputs still differ by seed');
});
test('inputs steer the grammar: craft biases motifs, climate gates pigments and garments, coast opens marine pigments',()=>{
 const motifsBy=craft=>{const t={};for(let i=0;i<150;i++)for(const m of generateCulture({seed:i,craft}).motifs)t[m]=(t[m]||0)+1;return t;};
 const w=motifsBy('weaving'),b=motifsBy('boatwork');assert.ok((w.lattice||0)>(b.lattice||0)&&(b.wave||0)>(w.wave||0));
 for(const c of all){for(const s of SEASONS){assert.ok(GARMENT_KINDS.includes(c.dress[s].garment));assert.ok(SEASON_GARMENTS[c.climate][s].includes(c.dress[s].garment));}
  assert.ok(GARMENT_HEAT[c.dress.winter.garment]>=GARMENT_HEAT[c.dress.summer.garment],'winter is never lighter than summer');
  if(c.climate==='arid')assert.equal(c.dress.summer.garment,'lightClothes');if(c.climate==='cold')assert.ok(GARMENT_HEAT[c.dress.winter.garment]>=1.35-1e-9);}
 const inland=new Set(Array.from({length:80},(_,i)=>generateCulture({seed:i,climate:'temperate',coastal:false}).palette.sources).flat()),coast=new Set(Array.from({length:80},(_,i)=>generateCulture({seed:i,climate:'temperate',coastal:true}).palette.sources).flat());
 assert.ok(!inland.has('murex')&&coast.has('murex'),'murex purple only on coasts');assert.ok(!new Set(Array.from({length:80},(_,i)=>generateCulture({seed:i,climate:'cold'}).palette.sources).flat()).has('lapis'));
});
test('legibility: flag charge, border and dress trim contrast with what they sit on; the identity projection is valid',()=>{
 for(const c of all){const f=c.flag;assert.ok(contrast(f.fields[0],f.chargeColor)>=3,'charge');assert.ok(contrast(f.fields[0],f.borderColor)>=3,'border');
  for(const s of SEASONS)assert.ok(contrast(c.dress[s].body,c.dress[s].trim)>=3,'trim');assert.ok(contrast(c.pottery.body,c.pottery.paint)>=3,'pottery paint');
  const id=toSocietyIdentity(c);assert.ok(!identityIssue(id),c.seed+' '+identityIssue(id));}
});
test('dress follows the garment actually owned; nothing is invented',()=>{
 const c=generateCulture({seed:9});assert.equal(dressFor(c,'winter','skinClothes').garment,'skinClothes');assert.equal(dressFor(c,'winter').garment,c.dress.winter.garment);assert.equal(dressFor(c,'winter','skinClothes').cut,c.dress.winter.cut);
 assert.ok(Object.keys(c).every(k=>!/ethnic|race|nation|people/i.test(k)),'no ethnicity fields');
});
