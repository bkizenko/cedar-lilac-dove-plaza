import test from 'node:test';import assert from 'node:assert/strict';
import {unitAppearance,appearanceTriangles,APPEARANCE_RULES,mix,unitFit} from '../src/scene/unitAppearance.ts';
import {generateCulture,contrast,SEASONS,GARMENT_HEAT} from '../src/scene/cultureGrammar.ts';
import {partBounds} from '../src/scene/buildingParts.ts';
import {GARMENT_KINDS} from '../src/game/textiles.ts';
const cultures=Array.from({length:40},(_,i)=>generateCulture({seed:i+1}));const C=cultures[0];
const A=(o={})=>unitAppearance({type:'worker',seed:1,gear:{},culture:C,season:'summer',...o});
test('nothing is invented: no gear and no weapon type means no parts; each part class needs the real thing',()=>{
 assert.equal(A().parts.length,0);assert.deepEqual(A().rendered,{});
 for(const t of['worker','leader','warden','ranger','cavalry'])assert.equal(A({type:t}).rendered.weapon,undefined,t+' carries no invented weapon');
 assert.equal(A({type:'spearman'}).rendered.weapon,'spear');assert.equal(A({type:'archer'}).rendered.weapon,'bow');assert.equal(A({type:'swordsman'}).rendered.weapon,'blade');
 const bare=A({type:'spearman'});assert.ok(bare.parts.every(p=>p.slot==='wood'||p.slot==='metal'),'a bare spearman shows only the spear');
 const g=A({gear:{garment:{item:'woolCoat',condition:.8}}});assert.equal(g.rendered.garment,'woolCoat');assert.equal(g.rendered.armor,undefined);assert.ok(!g.parts.some(p=>p.slot==='padding'||p.slot==='stitch'));
 assert.equal(A({gear:{garment:{item:'woolCoat',condition:0}}}).parts.length,0);assert.equal(A({gear:{garment:{item:'woolCoat',condition:0}}}).ignored.length,1);
 const ar=A({gear:{armor:{kind:'paddedTorso',condition:.5}}});assert.equal(ar.rendered.armor,'paddedTorso');assert.equal(ar.rendered.garment,undefined,'armor alone does not conjure clothes');
 const bad=A({gear:{armor:{kind:'plateMail',condition:1}}});assert.equal(bad.parts.length,0);assert.match(bad.ignored[0],/plateMail/);
 // Headwear and cuts only ever come with an owned garment; there is no shield, helmet or mail part anywhere.
 for(const c of cultures)for(const s of SEASONS){const a=unitAppearance({type:'worker',seed:3,gear:{},culture:c,season:s});assert.equal(a.rendered.headwear,undefined);}
});
test('the drawn garment is the owned one, whatever the culture prefers; culture only styles it',()=>{
 for(const item of GARMENT_KINDS)for(const s of SEASONS){const a=A({gear:{garment:{item,condition:1}},season:s});assert.equal(a.rendered.garment,item);assert.ok(a.parts.length>0);}
 const a=A({gear:{garment:{item:'skinClothes',condition:1}},season:'winter'});assert.equal(a.rendered.cut,C.dress.winter.cut);
});
test('consistency per culture, difference between cultures; few shared meshes serve many people',()=>{
 const keys=new Set(),cuts=new Set();for(let id=1;id<=300;id++){const a=unitAppearance({type:'spearman',seed:id,gear:{garment:{item:'woolCoat',condition:.9},armor:{kind:'paddedTorso',condition:.9}},culture:C,season:'autumn'});keys.add(a.geometryKey);cuts.add(a.rendered.cut+a.rendered.headwear);}
 assert.ok(keys.size<=4,'one culture, one outfit, at most 4 geometry variants: '+keys.size);assert.equal(cuts.size,1,'same cut and headwear for everyone');
 const diff=new Set(cultures.map(c=>unitAppearance({type:'worker',seed:1,gear:{garment:{item:'woolCoat',condition:1}},culture:c,season:'winter'}).geometryKey));assert.ok(diff.size>=12,'cultures differ in what they wear '+diff.size);
 const cols=new Set(cultures.map(c=>unitAppearance({type:'worker',seed:1,gear:{garment:{item:'lightClothes',condition:1}},culture:c,season:'summer'}).slotColors.garment));assert.ok(cols.size>=30);
});
test('modest individual variation: tints stay within 5 percent, same geometry per variant',()=>{
 const t=Array.from({length:200},(_,i)=>A({seed:i}).tint);assert.ok(t.every(x=>x.every(v=>v>=.95&&v<=1.05)));assert.ok(new Set(t.map(x=>x.join())).size>150);
 const by={};for(let id=0;id<200;id++){const a=A({seed:id,gear:{garment:{item:'hideCoat',condition:1}}});(by[a.geometryKey]??=[]).push(JSON.stringify(a.parts));}
 for(const g of Object.values(by))assert.equal(new Set(g).size,1,'same key means identical parts');assert.equal(Object.keys(by).length,4);
});
test('seasonal clothing follows the owned garment and the culture wardrobe is climate-sensible',()=>{
 for(const c of cultures){assert.ok(GARMENT_HEAT[c.dress.winter.garment]>=GARMENT_HEAT[c.dress.summer.garment]);}
 const hoods=cultures.filter(c=>c.dress.winter.headwear==='hood');assert.ok(hoods.length>0);
 const a=unitAppearance({type:'worker',seed:1,gear:{garment:{item:'hideCoat',condition:1}},culture:hoods[0],season:'winter'});assert.equal(a.rendered.headwear,'hood');
});
test('armor: culture tints the padding, affiliation colours the stitching, wear dims it; era adds trim only',()=>{
 const arm=(c,o={})=>unitAppearance({type:'worker',seed:1,gear:{armor:{kind:'paddedTorso',condition:1}},culture:c,season:'summer',...o});
 assert.equal(arm(C,{affiliation:'#336699'}).slotColors.stitch,'#336699');assert.equal(arm(C).slotColors.stitch,APPEARANCE_RULES.paddedStitchDefault);
 assert.notEqual(arm(cultures[1]).slotColors.padding,arm(cultures[2]).slotColors.padding);
 const d=(x,y)=>rgbDist(x,y);function rgbDist(a,b){const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));return Math.hypot(...p(a).map((v,i)=>v-p(b)[i]));}
 for(const c of cultures)assert.ok(d(arm(c).slotColors.padding,APPEARANCE_RULES.paddedBase)<=d(c.palette.field,APPEARANCE_RULES.paddedBase)*.23+1,'padding stays near the real padded colour');
 assert.ok(arm(C,{}).brightness.armor===1);const worn=unitAppearance({type:'worker',seed:1,gear:{armor:{kind:'paddedTorso',condition:.2}},culture:C,season:'summer'});assert.ok(worn.brightness.armor<.7&&worn.brightness.armor>=APPEARANCE_RULES.armorBrightness);
 const e1=unitAppearance({type:'worker',seed:1,gear:{garment:{item:'lightClothes',condition:1}},culture:cultures.find(c=>c.dress.summer.trimMotif!=='none'),season:'summer',era:1}),e3=unitAppearance({type:'worker',seed:1,gear:{garment:{item:'lightClothes',condition:1}},culture:cultures.find(c=>c.dress.summer.trimMotif!=='none'),season:'summer',era:3});
 assert.ok(e3.parts.length>e1.parts.length,'later eras decorate more');assert.equal(e3.rendered.garment,e1.rendered.garment);
});
test('LOD tiers: every tier non-empty and shrinking, budgets respected, parts hug the body',()=>{
 for(const c of cultures)for(const s of SEASONS){const a=unitAppearance({type:'swordsman',seed:7,gear:{garment:{item:'woolCoat',condition:1},armor:{kind:'paddedTorso',condition:1}},culture:c,season:s,era:3});
  const n=[0,1,2].map(t=>appearanceTriangles(a,t));assert.ok(n[0]>n[1]&&n[1]>n[2]&&n[2]>0,c.seed+s+' '+n);assert.ok(n[0]<=APPEARANCE_RULES.budget.near&&n[1]<=APPEARANCE_RULES.budget.mid&&n[2]<=APPEARANCE_RULES.budget.far,n.join());
  for(const p of a.parts){const b=partBounds(p);assert.ok(b.minY>=-.05&&b.maxY<=2.1,'y');if(p.slot!=='wood'&&p.slot!=='metal'&&p.slot!=='trim')assert.ok(Math.max(Math.abs(b.minX),Math.abs(b.maxX),Math.abs(b.minZ),Math.abs(b.maxZ))<=.45,'garment parts hug the body '+p.slot);}}
 assert.deepEqual(unitFit('leader').scale,[1.65,1,1.65]);assert.equal(unitFit('cavalry').y,.68);
});
test('colours: culture dyes light cloth strongly and hides barely; trim reads against the garment',()=>{
 const c=cultures.find(x=>x.dress.summer.body!==APPEARANCE_RULES.baseColor.lightClothes);
 const light=unitAppearance({type:'worker',seed:1,gear:{garment:{item:'lightClothes',condition:1}},culture:c,season:'summer'}),hide=unitAppearance({type:'worker',seed:1,gear:{garment:{item:'hideCoat',condition:1}},culture:c,season:'summer'});
 const body=c.dress.summer.body,dist=(a,b)=>{const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));return Math.hypot(...p(a).map((v,i)=>v-p(b)[i]));};assert.ok(dist(light.slotColors.garment,body)<dist(hide.slotColors.garment,body)||dist(body,APPEARANCE_RULES.baseColor.lightClothes)<40,'dye takes more strongly on light cloth than on hide');assert.equal(mix('#000000','#ffffff',.5),'#808080');
 for(const cu of cultures)for(const item of GARMENT_KINDS){const a=unitAppearance({type:'worker',seed:2,gear:{garment:{item,condition:1}},culture:cu,season:'spring'});assert.ok(contrast(a.slotColors.garment,a.slotColors.trim)>=1.1,'trim distinguishable');}
});
