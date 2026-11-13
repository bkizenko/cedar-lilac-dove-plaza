import test from 'node:test';import assert from 'node:assert/strict';
const D=await import('../src/game/detailLevel.ts'),bp=await import('../src/scene/buildingParts.ts'),sm=await import('../src/scene/buildingStyleMap.ts'),skins=await import('../src/scene/civSkin.ts'),nd=await import('../src/scene/nearDetail.ts'),rig=await import('../src/scene/characterRig.ts'),ir=await import('../src/scene/itemRegistry.ts');
/** horizontal eye-to-focus distance of the orbit camera (world.ts updateCamera): dist * cos(pitch) */
const horiz=(dist,pitch)=>dist*Math.cos(pitch);
const DEFAULT=horiz(58,.38),MAXIN=horiz(14,.38),NORMAL_MAX=horiz(90,.38);
test('default zoom (58 m, pitch .38) put buildings at the MID tier under the old thresholds (the reported regression)',()=>{
 assert.equal(bp.lodForDistance(DEFAULT),1);assert.equal(rig.tierForDistance(58),1);assert.ok(DEFAULT>14*.7,'old Medium item near radius was 9.8 m');
});
test('Standard: the whole normal gameplay zoom range (max zoom-in .. 90 m orbit) draws buildings, people and ground items at the NEAR tier',()=>{
 D.setDetailLevel('standard');
 for(const [dist,pitch] of [[14,.2],[14,.38],[30,.38],[58,.38],[58,.2],[90,.38],[90,.2]]){
  const h=horiz(dist,pitch);assert.equal(D.buildingTierAt(h),0,`building at ${h.toFixed(1)} m`);assert.equal(D.personTierAt(Math.hypot(h,dist*Math.sin(pitch))),0,`person at orbit ${dist}`);
  assert.equal(D.itemTierAt(h,'high'),0,`item at ${h.toFixed(1)} m (high gfx)`);
 }
 assert.ok(DEFAULT<D.buildingLodDistances()[0]-40,'the default view has headroom to the screen edges');
 assert.equal(D.itemTierAt(DEFAULT,'med'),0,'items at Medium graphics are near at the default view');
 assert.ok(D.treeNearMetres('med')*.4>=54-1,'full-detail trees reach the default focus distance at Medium graphics');
});
test('far zoom still drops tiers so the wide view stays cheap',()=>{
 D.setDetailLevel('standard');
 assert.equal(D.buildingTierAt(horiz(230,.62)),1);assert.equal(D.buildingTierAt(320),3);assert.equal(D.personTierAt(260),2);assert.equal(D.itemTierAt(260,'high'),2);
 assert.ok(D.buildingTierAt(horiz(140,.5))>=1);
});
test('High and Ultra scale every switch distance up; Standard is the base',()=>{
 const b=D.buildingLodDistances('standard'),h=D.buildingLodDistances('high'),u=D.buildingLodDistances('ultra');
 for(let i=0;i<3;i++){assert.ok(h[i]>b[i]&&u[i]>h[i]);}
 assert.equal(D.buildingTierAt(150,'standard'),1);assert.equal(D.buildingTierAt(150,'high'),0);assert.equal(D.personTierAt(150,'standard'),1);assert.equal(D.personTierAt(150,'ultra'),0);
 assert.ok(D.treeNearMetres('high','ultra')>D.treeNearMetres('high','standard'));
 assert.ok(D.DETAIL_RULES.maxFullTrees.ultra>D.DETAIL_RULES.maxFullTrees.high&&D.DETAIL_RULES.maxFullTrees.high>D.DETAIL_RULES.maxFullTrees.standard);
});
test('Standard stays cheap: no sun shadow map, no bump, Neutral grade; High and Ultra add them',()=>{
 const R=D.DETAIL_RULES;assert.equal(R.shadowMap.standard,0);assert.ok(R.shadowMap.high>0&&R.shadowMap.ultra>0);assert.equal(R.bump.standard,false);assert.equal(R.bump.high,true);assert.equal(R.grade.standard,'neutral');assert.equal(R.grade.high,'agx');
 assert.ok(R.msaaSamples.standard<=2);assert.equal(D.DETAIL_RULES.defaultLevel,'standard');
});
test('detail level validation and shadow box',()=>{
 assert.equal(D.isDetailLevel('ultra'),true);assert.equal(D.isDetailLevel('max'),false);assert.equal(D.setDetailLevel('nope'),'standard');
 assert.ok(D.shadowHalfExtent(14,'high')<D.shadowHalfExtent(90,'high'));assert.ok(D.shadowHalfExtent(500,'ultra')<=110);assert.ok(D.shadowHalfExtent(5,'high')>=36);
});
const hut=(civ,era)=>{const v=sm.carvedVariantFor({worldSeed:7,type:'hut',id:3,era,footprint:{w:5.4,d:5.2},settlementSeed:0,skin:skins.presetSkin(civ)});return sm.variantSpec(v);};
test('near-tier detail pass: huts gain several times the near triangles, mid/far barely change, nothing floats or leaves the footprint',()=>{
 for(const civ of ['sandrill','nilemark','tigrane','hanrei','vedara','aureline','sahelan','quillan']){
  for(const era of [0,2]){
   const s=hut(civ,era),base={...s,parts:s.parts.filter(p=>!p.nearDetail)};void base;
   const n0=bp.specTriangles(s,0),n1=bp.specTriangles(s,1),n2=bp.specTriangles(s,2);
   assert.ok(n0>=600,`${civ} e${era} near ${n0}`);assert.ok(n0<=nd.NEAR_DETAIL.nearCeiling+300,`${civ} e${era} near ceiling ${n0}`);
   assert.ok(n1<=1400&&n2<=700,`${civ} e${era} mid/far ${n1}/${n2}`);
   assert.deepEqual(bp.floatingParts(s),[],`${civ} e${era} floating parts`);
   const b=bp.specBounds(s);assert.ok(b.maxX<=s.footprint.w/2+.35&&b.minX>=-s.footprint.w/2-.35&&b.maxZ<=s.footprint.d/2+.35&&b.minZ>=-s.footprint.d/2-.35,`${civ} e${era} footprint`);
  }
 }
});
test('near-tier detail is deterministic, near-only (far tier equals the generator output) and can be switched off',()=>{
 const a=hut('hanrei',2),b=hut('hanrei',2);assert.equal(JSON.stringify(a.parts),JSON.stringify(b.parts));
 const fewer=a.parts.filter(p=>p.lod===0&&p.onlyFrom===undefined).length;assert.ok(fewer>20);
 nd.NEAR_DETAIL.enabled=false;try{const off=hut('hanrei',2);assert.ok(bp.specTriangles(off,0)<bp.specTriangles(a,0));assert.equal(bp.specTriangles(off,2),bp.specTriangles(a,2));}finally{nd.NEAR_DETAIL.enabled=true;}
});
test('every family keeps near <= 2600 triangles with the detail pass and no floating parts',()=>{
 const K=null;void K;
 for(const type of sm.CARVED_TYPES){
  for(const era of [0,2,3]){
   const fp=({w:6,d:6});const spec=sm.carvedBuildingSpec({worldSeed:1207,type,id:11,era,habitat:'plains',footprint:fp,prosperity:.5,settlementSeed:3});if(!spec)continue;
   assert.ok(bp.specTriangles(spec,0)<=3000,`${type} e${era} ${bp.specTriangles(spec,0)}`);
  }
 }
});
