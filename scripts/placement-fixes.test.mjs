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
test('plinth: only explicitly large halls/keeps receive a structural base; small buildings never do',()=>{
  assert.equal(levellingPlinth('hut',{x:0,z:0,w:5.4,d:5.2},10.03,9.9,.18),null);
  for(const type of ['hut','house','hearth','workshop','butcher','smokehouse','oven'])assert.equal(levellingPlinth(type,{x:0,z:0,w:20,d:20},11.5,10,.18),null,type);
  assert.equal(levellingPlinth('townhall',{x:0,z:0,w:7,d:7},11.5,10,.18),null);
  const p=levellingPlinth('townhall',{x:4,z:-2,w:10,d:10},11.5,10,.18);assert.ok(p);assert.equal(p.kind,'plinth');
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
    const doors=spec.parts.filter(p=>p.shape==='box'&&p.size[1]>=1&&p.size[1]<=1.8&&p.size[0]>=.6&&p.size[0]<=1.25&&p.size[2]<=.16&&p.lod>=1);
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

// ---- foundation audit 2026-11-13: no gap under a footprint, doors at grade, same path for the ghost and the finished building -------------------------
import {setGroundPlanProvider,foundationProfile} from '../src/scene/foundations.ts';
import {buildingGroundSupports} from '../src/scene/buildingGrounding.ts';
import {groundPlanOf} from '../src/scene/groundPlan.ts';
import {assessSite,siteRecord} from '../src/game/slopeTiers.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {buildingGeos} from '../src/scene/meshes.ts';
buildingGeos();
const realBuilt=(type,civ,era,deg,yaw)=>{
  const t=Math.tan(deg*Math.PI/180),H=(x,z)=>10+t*x,fp=BUILDINGS[type];
  const spec=variantSpec(carvedVariantFor({worldSeed:4,type,id:5,era,footprint:{w:fp.w,d:fp.d},settlementSeed:0,...(civ?{skin:presetSkin(civ)}:{})})),plan={...groundPlanOf(spec),yaw};
  const site=siteRecord(assessSite(H,type,0,0,fp.w,fp.d,{})),b={id:5,type,team:0,x:0,z:0,y:0,w:fp.w,d:fp.d,hp:100,build:1,...(site?{site}:{})};
  const g={world:{heights:new Float32Array(9)},state:{buildings:[],time:0},height:H,terrainRevision:()=>0,exploredAt:()=>true};
  setGroundPlanProvider(()=>plan);
  try{const f=foundationProfile(g,b),sup=buildingGroundSupports(g,b);return {H,spec,plan,f,sup,b,site};}finally{setGroundPlanProvider(null);}
};
/** lowest solid bottom (metres) among real parts and real supports that cover the point (within `reach` horizontally), or Infinity */
function lowestAt(r,x,z,reach=.5){
  const c=Math.cos(r.plan.yaw),s=Math.sin(r.plan.yaw);let low=Infinity;
  for(const p of r.spec.parts){if(p.lod<1)continue;const q=partBounds(p);if(q.maxY-q.minY<.05)continue;
   // point into the part's local frame (yaw of the instance): local = R(-yaw) * world
   const lx=c*x-s*z,lz=s*x+c*z;if(lx>=q.minX-reach&&lx<=q.maxX+reach&&lz>=q.minZ-reach&&lz<=q.maxZ+reach)low=Math.min(low,r.f.level+q.minY);}
  for(const u of r.sup){const cs=Math.cos(u.yaw),sn=Math.sin(u.yaw),dx=x-u.x,dz=z-u.z,lx=cs*dx-sn*dz,lz=sn*dx+cs*dz;if(Math.abs(lx)<=u.length/2+reach&&Math.abs(lz)<=u.width/2+reach)low=Math.min(low,u.y-u.height/2);}
  return low;
}
const CASES=[['hut','sandrill',0],['hut','hanrei',1],['hut','aureline',2],['house','aureline',1],['house','vedara',2],['workshop','aureline',1],['warehouse',null,1],['warehouse','hanrei',1]];
test('no gap under the footprint on flat ground: the lowest real part sits within 6 cm of the terrain at the centre and every wall corner',()=>{
  for(const [type,civ,era] of CASES)for(const yaw of[0,Math.PI/2]){
    const r=realBuilt(type,civ,era,0,yaw),lifted=Math.max(0,...r.plan.lifts);
    // flat ground needs no footing, except under a wall the generator itself starts on a base course (then a footing up to that course, no more)
    for(const u of r.sup.filter(u=>u.kind!=='step'))assert.ok(lifted>0&&u.kind==='footing'&&u.y+u.height/2<=r.f.level+lifted+1e-6,`${type}/${civ}: flat ground needs no ${u.kind}`);
    const pts=[...(r.plan.raised?[]:[{x:0,z:0}]),...r.plan.polys.flat().map(q=>({x:Math.cos(yaw)*q.x+Math.sin(yaw)*q.z,z:-Math.sin(yaw)*q.x+Math.cos(yaw)*q.z})),...r.plan.piers.map(q=>({x:Math.cos(yaw)*q.x+Math.sin(yaw)*q.z,z:-Math.sin(yaw)*q.x+Math.cos(yaw)*q.z}))];
    for(const p of pts){const low=lowestAt(r,p.x,p.z),ground=r.H(p.x,p.z);assert.ok(low<=ground+.06,`${type}/${civ}/${era} yaw ${yaw}: gap ${(low-ground).toFixed(2)} m at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);}
    assert.ok(r.f.level-r.H(0,0)<=.06&&r.f.level-r.H(0,0)>=0,`${type}: floor ${(r.f.level-r.H(0,0)).toFixed(2)} m above the ground on flat ground`);
  }
});
test('no gap on gentle and moderate slopes either: floor within a hand-span of the ground at the centre, footing meets the terrain at every wall corner, no posts',()=>{
  for(const deg of[3,6,10])for(const [type,civ,era] of CASES){
    const r=realBuilt(type,civ,era,deg,0);if(!['none','pad'].includes(r.site?.foundation||'none'))continue; // a terraced site is tested with the terrace tier
    assert.ok(!r.sup.some(u=>u.kind==='post'||u.kind==='beam'),'no posts on dry gentle ground');
    assert.ok(Math.abs(r.f.level-r.H(0,0))<=.12,`${type} ${deg}: floor ${(r.f.level-r.H(0,0)).toFixed(2)} m from the ground at the centre`);
    for(const p of[...r.plan.polys.flat(),...r.plan.piers]){const low=lowestAt(r,p.x,p.z,.45),ground=r.H(p.x,p.z);assert.ok(low<=ground+.06,`${type}/${civ} ${deg} deg: gap ${(low-ground).toFixed(2)} m under a wall corner`);}
  }
});
test('doors at grade: a downhill door has steps from the floor to the earth, an uphill door is not buried more than a hand-span',()=>{
  for(const deg of[6,10]){const r=realBuilt('house','aureline',1,deg,0),e=r.plan.entry;if(!e)continue;
    const out={x:e.x,z:e.z+.5},g0=r.H(out.x,out.z),gap=r.f.level-g0;
    if(gap>.14)assert.ok(r.sup.some(u=>u.kind==='step'),`${deg} deg: ${gap.toFixed(2)} m above the door ground needs steps`);
    assert.ok(g0-r.f.level<=.2,`${deg} deg: door ground ${(g0-r.f.level).toFixed(2)} m above the floor`);
    const steps=r.sup.filter(u=>u.kind==='step');for(const u of steps){assert.ok(u.y-u.height/2<=r.H(u.x,u.z)+1e-6,'steps reach the ground');assert.ok(u.y+u.height/2<=r.f.level+.03,'steps stay below the floor');}
  }
});
test('staddle-stone granary: stone columns under every stone on a slope, bottom in the ground, none on flat ground',()=>{
  const flat=realBuilt('warehouse','hanrei',1,0,0);assert.equal(flat.plan.raised,true);assert.equal(flat.sup.length,0);
  const sl=realBuilt('warehouse','hanrei',1,6,0),cols=sl.sup.filter(u=>u.kind==='footing');assert.ok(cols.length>=2,'columns under the downhill stones');
  for(const u of cols){assert.ok(u.y-u.height/2<=sl.H(u.x,u.z)+1e-6);assert.ok(u.y+u.height/2<=sl.f.level+1e-6);assert.ok(u.width<=.9,'column, not a slab');}
});
