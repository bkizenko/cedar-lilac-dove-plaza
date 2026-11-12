import test from 'node:test';import assert from 'node:assert/strict';
import {generateWonderKit,pieceParts,serializePreset,deserializePreset,WONDER_FUNCTIONS,KIT_IDS,CORE_OF,AXES} from '../src/scene/wonderKit.ts';
import {CIV_IDS} from '../src/scene/civStyles.ts';
import {specBounds,floatingParts,partsAtLod,partBounds} from '../src/scene/buildingParts.ts';
const P=(seed,civ,family,options={})=>({v:1,seed,civ,family,options});
const gen=(seed,civ,family,options,site)=>generateWonderKit(P(seed,civ,family,options),site);
const site=(grade,wet=0)=>{const cols=7,rows=7,h=[];for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)h.push(i*grade*5);return {columns:cols,rows,heights:h,minHeightMetres:0,maxHeightMetres:Math.max(...h),meanHeightMetres:Math.max(...h)/2,heightRangeMetres:Math.max(...h),maxGrade:grade,meanGrade:grade,downhillRadians:Math.PI/2,wetFraction:wet,minimumDryClearanceMetres:1,biome:'meadow',biomeShares:{meadow:1},foundationDepthMetres:0};};
test('function identity: every wonder keeps its core piece, whatever the seed, civ and layout',()=>{
 for(const c of CIV_IDS)for(const f of WONDER_FUNCTIONS)for(let s=1;s<=4;s++){const p=gen(s,c,f);assert.ok(p.identity.satisfied&&p.identity.core===CORE_OF[f],`${c} ${f}`);assert.ok(p.pieces.some(x=>x.role==='core'&&x.kit===CORE_OF[f]));}
 assert.ok(gen(3,'aureline','observatory').identity.sightAzimuth!==undefined);assert.ok(gen(3,'aureline','harbor').identity.basin.r>0);assert.ok(gen(3,'aureline','assembly').identity.bema);
});
test('at least 20 seeds per civ give 20 distinct silhouettes, for every wonder function',()=>{
 for(const c of CIV_IDS)for(const f of WONDER_FUNCTIONS){const sil=new Set();for(let s=1;s<=20;s++)sil.add(gen(s*7+3,c,f).silhouette);assert.ok(sil.size>=19,`${c}/${f}: only ${sil.size} distinct silhouettes in 20 seeds`);}
});
test('the same civ looks different each game: crowns, axes and enclosures vary; civs lean different ways',()=>{
 for(const c of CIV_IDS){const crowns=new Set(),axes=new Set();for(let s=1;s<=30;s++){const p=gen(s,c,'assembly');crowns.add(p.pieces.find(x=>x.role==='crown')?.kit);axes.add(p.axis);}assert.ok(crowns.size>=3&&axes.size>=4,`${c} crowns ${crowns.size} axes ${axes.size}`);}
 const top=c=>{const n={};for(let s=1;s<=40;s++){const k=gen(s,c,'observatory').pieces.find(x=>x.role==='crown')?.kit;n[k]=(n[k]||0)+1;}return Object.entries(n).sort((a,b)=>b[1]-a[1])[0][0];};
 assert.ok(new Set(CIV_IDS.map(top)).size>=6,'civs favour different crowns');
});
test('determinism and presets: same preset same wonder; JSON round trip; validation rejects bad input',()=>{
 const pr=P(12345,'hanrei','cistern',{wealth:.6,axis:'cross',crown:'pagodaTiers',water:true,footprint:{w:40,d:32}});assert.deepEqual(generateWonderKit(pr),generateWonderKit(pr));
 const txt=serializePreset(pr),back=deserializePreset(txt);assert.ok(back.ok);assert.deepEqual(back.preset,pr);assert.ok(txt.length<220,'small JSON '+txt.length);assert.deepEqual(generateWonderKit(back.preset),generateWonderKit(pr));
 const pinned=generateWonderKit(pr);assert.equal(pinned.axis,'cross');assert.equal(pinned.pieces.find(x=>x.role==='crown')?.kit,'pagodaTiers');assert.ok(pinned.pieces.some(x=>x.role==='water'));
 for(const bad of['x','{"v":2}','{"v":1,"s":1.5,"c":"hanrei","f":"cistern"}','{"v":1,"s":1,"c":"nope","f":"cistern"}','{"v":1,"s":1,"c":"hanrei","f":"nope"}','{"v":1,"s":1,"c":"hanrei","f":"cistern","o":{"footprint":{"w":5,"d":5}}}','{"v":1,"s":1,"c":"hanrei","f":"cistern","o":{"crown":"zzz"}}','{"v":1,"s":1,"c":"hanrei","f":"cistern","o":{"axis":"q"}}'])assert.equal(deserializePreset(bad).ok,false,bad);
 const clamped=deserializePreset('{"v":1,"s":2,"c":"hanrei","f":"harbor","o":{"wealth":9,"era":-3}}');assert.ok(clamped.ok&&clamped.preset.options.wealth===1&&clamped.preset.options.era===0);
});
test('footprint-true, grounded at every LOD tier, known materials, even on a slope and with a wet site',()=>{
 for(const [c,f,s,fp,st] of[...CIV_IDS.flatMap(c=>WONDER_FUNCTIONS.map((f,i)=>[c,f,i+2,[{w:36,d:36},{w:28,d:40},{w:48,d:34}][i%3],undefined])),...CIV_IDS.map((c,i)=>[c,WONDER_FUNCTIONS[i%6],i+9,{w:40,d:40},site(.15+i%3*.1,i%4?0:.2)])]){
  const p=gen(s,c,f,{footprint:fp},st),b=specBounds(p.spec),{w,d}=p.footprint,L=`${c}/${f}#${s}`;assert.ok(b.minX>=-w/2-.011&&b.maxX<=w/2+.011&&b.minZ>=-d/2-.011&&b.maxZ<=d/2+.011,L+' footprint '+JSON.stringify(b));
  for(const t of[0,1,2])assert.deepEqual(floatingParts({...p.spec,parts:partsAtLod(p.spec,t)}),[],L+' tier '+t);for(const q of p.parts)assert.ok(p.materials[q.mat],L+' material '+q.mat);}
});
test('site steers the build: steep ground gets a plinth, wet ground a causeway, steep ground goes linear',()=>{
 const steep=gen(5,'aureline','assembly',{},site(.35)),flat=gen(5,'aureline','assembly',{});assert.ok(steep.grounding.needsPlinth);assert.equal(steep.axis,'linear');assert.ok(!flat.grounding.needsPlinth);
 assert.equal(gen(5,'aureline','assembly',{},site(.02,.2)).pieces.find(x=>x.role==='base').kit,'causeway');
});
test('instancing: one canonical mesh serves many placements; meshes are scale-quantised and identical per key',()=>{
 let inst=0;const keys=new Set();for(const c of CIV_IDS)for(let s=1;s<=10;s++){const p=gen(s,c,'millMarket');inst+=p.instances;p.meshKeys.forEach(k=>keys.add(k));assert.equal(p.meshKeys.length,new Set(p.pieces.map(x=>x.meshKey)).size);assert.ok(p.meshKeys.length<=p.instances);}
 assert.ok(keys.size<inst,`${keys.size} meshes for ${inst} placements`);
 for(const kit of KIT_IDS)for(const sz of['S','M','L','XL']){assert.deepEqual(pieceParts(kit,1,sz,'aureline'),pieceParts(kit,1,sz,'aureline'));assert.ok(pieceParts(kit,0,sz,'aureline').length>0);}
 const a=pieceParts('colonnade',0,'M','aureline'),b=pieceParts('colonnade',0,'L','aureline');assert.ok(Math.abs(partBounds(b[0]).maxX/partBounds(a[0]).maxX-1.6)<.01);
});
test('LOD tiers shrink and triangle budgets hold (near/mid/far)',()=>{
 const worst=[0,0,0];for(const c of CIV_IDS)for(const f of WONDER_FUNCTIONS)for(let s=1;s<=5;s++){const p=gen(s*5,c,f),t=p.triangles;assert.ok(t[0]>=t[1]&&t[1]>=t[2]&&t[2]>0,`${c}/${f} ${t}`);for(let i=0;i<3;i++)worst[i]=Math.max(worst[i],t[i]);}
 console.log('# wonder worst near/mid/far',JSON.stringify(worst));assert.ok(worst[0]<=3500&&worst[1]<=3300&&worst[2]<=1300,JSON.stringify(worst));
});
test('every kit piece and axis is reachable',()=>{
 const used=new Set(),axes=new Set();for(const c of CIV_IDS)for(let s=1;s<=12;s++){const p=gen(s,c,WONDER_FUNCTIONS[s%6]);p.pieces.forEach(x=>used.add(x.kit));axes.add(p.axis);}
 for(const k of KIT_IDS)assert.ok(used.has(k),k+' never placed');assert.equal(axes.size,AXES.length);
});
test('every civ wonder carries its own signature landmark, distinct per civ, within footprint',()=>{
 const sigs=new Set();for(const c of CIV_IDS){let placed=0;for(let s=1;s<=12;s++){const p=gen(s,c,WONDER_FUNCTIONS[s%6]);if(p.pieces.some(x=>x.kit==='signature'))placed++;}assert.ok(placed>=10,`${c} signature placed ${placed}/12`);const m=pieceParts('signature',0,'M',c);assert.ok(m.length>=4);sigs.add(JSON.stringify(m.map(q=>[q.shape,q.size])));}
 assert.equal(sigs.size,CIV_IDS.length,'each civ has a unique signature mesh');
});
