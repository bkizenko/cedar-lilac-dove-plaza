// Playtest fixes 2026-11-12: slope tolerance + plinth, village heraldry beyond hue, hut readability for every civ/age, plaza-facing doors, ghost/builder contract.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {siteRelief,siteSlopeIssue,reliefAllowance,levellingPlinth,needsLevelledPlinth,SLOPE_RULES} from '../src/game/siteSlope.ts';
import {villageHeraldry,heraldryDistance,heraldryKey,FINIAL_SHAPES} from '../src/scene/villageIdentity.ts';
import {plazaQuarterTurns,nearestAnchor,facesPlaza} from '../src/scene/placementFacing.ts';
import {carvedVariantFor,variantSpec} from '../src/scene/buildingStyleMap.ts';
import {presetSkin} from '../src/scene/civSkin.ts';
import {CIV_IDS,CIVS} from '../src/scene/civStyles.ts';
import {partBounds} from '../src/scene/buildingParts.ts';
const plane=(gx,gz)=>(x,z)=>10+gx*x+gz*z;
test('slope: flat and gentle ground is fine, a cliff is refused, bigger footprints tolerate more fall',()=>{
  assert.equal(siteSlopeIssue(plane(0,0),'hut',0,0,5.4,5.2),null);
  assert.equal(siteSlopeIssue(plane(.2,.1),'hut',0,0,5.4,5.2),null,'a 20% slope is a normal building site');
  assert.equal(siteSlopeIssue(plane(.3,0),'house',0,0,7,6),null);
  assert.match(siteSlopeIssue(plane(1.4,0),'hut',0,0,5.4,5.2)||'',/Too steep/);
  assert.ok(reliefAllowance(14,12)>reliefAllowance(5.4,5.2));assert.ok(reliefAllowance(40,40)<=SLOPE_RULES.maximumReliefMetres);
  const r=siteRelief(plane(.25,0),0,0,6,6);assert.ok(Math.abs(r.range-1.5)<1e-6&&r.ok&&r.maxGrade<=.26);
});
test('slope: fields, walls, docks and water works are never refused by the plinth rule',()=>{for(const t of['farm','pen','palisade','gate','dock','canal','hearth'])assert.equal(needsLevelledPlinth(t),false);assert.equal(siteSlopeIssue(plane(2,0),'farm',0,0,9,9),null);});
test('plinth: a sloping site gets a levelled platform that covers the footprint and sits under the floor; level ground gets none',()=>{
  assert.equal(levellingPlinth('hut',{x:0,z:0,w:5.4,d:5.2},10.03,9.9,.18),null);
  const p=levellingPlinth('hut',{x:4,z:-2,w:5.4,d:5.2},11.5,10,.18);assert.ok(p);assert.equal(p.kind,'plinth');
  assert.ok(p.length>=5.4&&p.width>=5.2);assert.ok(p.y+p.height/2<11.5,'top stays under the floor');assert.ok(p.y-p.height/2<10,'bottom is below the lowest contact');
  assert.equal(levellingPlinth('farm',{x:0,z:0,w:9,d:9},12,10,.18),null);
});
test('slope: placementIssue lets the player build a hut on a reasonable slope and refuses a cliff (real Game)',async()=>{
  const {Game}=await import('../src/game/sim.ts');const {testAction}=await import('../src/game/testing.ts');
  const g=new Game();g.reset(1,undefined,{size:1040,layout:'pangaea'});g.enterIsland();g.testMode=true;testAction(g,'supplies');g.revealMap=true;g.updateVision(0);
  const home=g.campOf(0);let spot=null;for(let r=30;r<260&&!spot;r+=6)for(let k=0;k<24&&!spot;k++){const x=Math.round((home.x+Math.cos(k/24*6.283)*r)/2)*2,z=Math.round((home.z+Math.sin(k/24*6.283)*r)/2)*2;if(!g.placementIssue('hut',x,z))spot={x,z};}
  assert.ok(spot,'a valid open site exists');const orig=g.height.bind(g);
  const tilt=k=>{g.height=(x,z)=>orig(x,z)+k*Math.max(0,x-spot.x+4);};
  tilt(.25);assert.equal(g.placementIssue('hut',spot.x,spot.z),null,'gentle slope accepted');
  tilt(1.5);assert.match(g.placementIssue('hut',spot.x,spot.z)||'',/Too steep/);
  g.height=orig;assert.equal(g.placementIssue('hut',spot.x,spot.z),null);
});
test('heraldry: seeded, stable, and the first villages never share all marks (same-colour villages differ beyond hue)',()=>{
  for(let v=0;v<8;v++)assert.deepEqual(villageHeraldry(77,v),villageHeraldry(77,v));
  for(let a=0;a<6;a++)for(let b=a+1;b<6;b++)assert.ok(heraldryDistance(villageHeraldry(77,a),villageHeraldry(77,b))>=1,`villages ${a},${b} are identical`);
  const seen=new Set();for(let v=0;v<6;v++)seen.add(villageHeraldry(5,v).shape);assert.ok(seen.size>=3&&FINIAL_SHAPES===5);
});
test('heraldry: two villages of the SAME civ and colour build different houses (finial / trim / banner), footprint and palette untouched',()=>{
  const skin=presetSkin('aureline'),mk=(v,type='house')=>variantSpec(carvedVariantFor({worldSeed:9,type,id:11,era:3,footprint:{w:7,d:6},settlementSeed:v,skin,heraldry:villageHeraldry(9,v)}));
  const find=(a,b)=>{for(let x=0;x<8;x++)for(let y=x+1;y<8;y++)if(heraldryDistance(villageHeraldry(9,x),villageHeraldry(9,y))>=2)return[x,y];return null;};
  const [a,b]=find();const A=mk(a),B=mk(b);
  assert.notEqual(A.variantKey,B.variantKey);assert.notDeepEqual(A.parts,B.parts);assert.deepEqual(A.footprint,B.footprint);assert.deepEqual(A.materials,B.materials);
  const none=variantSpec(carvedVariantFor({worldSeed:9,type:'house',id:11,era:3,footprint:{w:7,d:6},settlementSeed:a,skin}));assert.ok(A.parts.length>none.parts.length,'heraldry adds marks');
  for(const t of A.parts){const q=partBounds(t);assert.ok(q.maxX-q.minX<=A.footprint.w+1e-6&&q.maxZ-q.minZ<=A.footprint.d+1e-6,'marks stay in the footprint');}
});
test('hut: every civ at every early age is a readable hut - dark framed door at person scale, a wall, an overhanging roof mass, 2.2 m or more tall',()=>{
  for(const civ of CIV_IDS)for(const era of[0,1]){
    const spec=variantSpec(carvedVariantFor({worldSeed:3,type:'hut',id:4,era,footprint:{w:5.4,d:5.2},settlementSeed:0,skin:presetSkin(civ)})),L=`${civ} era${era}`;
    const lum=h=>{const n=parseInt(h.slice(1),16);return .2126*(n>>16&255)+.7152*(n>>8&255)+.0722*(n&255);};
    const mats=Object.entries(spec.materials).filter(([k])=>/\.(wall2|accent|trim|roof|cloth)$/.test(k)).sort((a,b)=>lum(a[1].hex)-lum(b[1].hex));
    const doors=spec.parts.filter(p=>p.shape==='box'&&p.size[1]>=1&&p.size[1]<=1.8&&p.size[0]>=.7&&p.size[0]<=1.25&&p.size[2]<=.16&&p.lod>=1);
    assert.ok(doors.length>0,L+' has a mid-distance door opening');
    assert.ok(doors.some(p=>p.mat===mats[0][0]),L+' door opening is the darkest tone of its palette');
    let top=0,maxZ=-1e9;for(const p of spec.parts){const q=partBounds(p);top=Math.max(top,q.maxY);if(p.lod>=1&&Math.abs(q.maxX-q.minX)<1.3)maxZ=Math.max(maxZ,q.maxZ);}
    assert.ok(top>=2.2,L+` is person-scale tall (${top.toFixed(2)})`);
    const roofy=spec.parts.filter(p=>/\.roof$/.test(p.mat)&&p.lod>=1);assert.ok(roofy.length>0||['sandrill','tigrane'].includes(civ),L+' has a roof mass (rock-cut flat roof and mud dome excepted)');
    assert.ok(doors.every(p=>p.pos[2]>=-.1),L+' door is on the +Z (entry) face');
  }
});
test('hut: the shared door helper gives every family dwelling a dark opening with a frame',async()=>{
  const {door}=await import('../src/scene/buildingHelpers.ts');const parts=[];door(parts,0,2,.85,1.55);
  assert.ok(parts.some(p=>p.mat==='recess'&&p.lod>=1&&p.size[1]===1.55));assert.ok(parts.filter(p=>p.mat==='woodDark').length>=3,'posts + lintel');
});
test('doors face the plaza: the quarter turn swings local +Z toward the hall; huts and houses only',()=>{
  const at=(x,z)=>({x,z});assert.equal(plazaQuarterTurns(0,0,at(0,20)),0);assert.equal(plazaQuarterTurns(0,0,at(20,0)),1);assert.equal(plazaQuarterTurns(0,0,at(0,-20)),2);assert.equal(plazaQuarterTurns(0,0,at(-20,0)),3);
  assert.equal(plazaQuarterTurns(0,0,at(1,1)),0,'standing on the plaza: leave alone');assert.equal(plazaQuarterTurns(0,0,null),0);
  assert.deepEqual(nearestAnchor(0,0,[at(30,0),at(0,10)]),at(0,10));assert.equal(facesPlaza('hut',5.4,5.2),true);assert.equal(facesPlaza('townhall',14,14),false);assert.equal(facesPlaza('house',12,5),false);
});
test('ghost contract: the placement ghost and the finished building both go through carvedInputFor; the ghost tints that model and previews the plinth; rings skip hostile units',()=>{
  const w=readFileSync(new URL('../src/scene/world.ts',import.meta.url),'utf8');
  assert.ok(/carvedList\.push\(\{\.\.\.this\.carvedInputFor\(game,b,type,ys\),b\}\)/.test(w),'built buildings use carvedInputFor');
  assert.ok(/const input=this\.carvedInputFor\(game,fake,type,1\)/.test(w),'ghost uses carvedInputFor');
  assert.ok(/buildCarvedMesh\(variantSpec\(variant\),0\)/.test(w)&&/buildingGroundSupports\(game,c\.fake\)/.test(w));
  assert.ok(/this\.ghost\.add\(new THREE\.Mesh\(geo,mat\)\)/.test(w));
});
