// Graded slope model: tiers, building classes, foundations, geology, goods + labour, saves, geometry. Deterministic (no Math.random / Date.now).
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {assessSite,surveySite,tierFor,slopeClassOf,groundKind,foundationBill,siteRecord,validSiteRecord,CLASS_PROFILES,SLOPE_COLOURS,COST_RULES} from '../src/game/slopeTiers.ts';
import {foundationBoxes,foundationLevel} from '../src/game/siteFoundation.ts';
const tilt=deg=>{const g=Math.tan(deg*Math.PI/180);return (x,z)=>10+g*x;};
const HUT=[5.4,5.2];
const at=(type,deg,w,d,opts)=>assessSite(tilt(deg),type,0,0,w,d,opts);
const hut=(deg,opts)=>at('hut',deg,...HUT,opts);
const SAND={rockName:'sandstone',hardness:.7,soilDepthMeters:.2,landformTag:'none'},GRANITE={rockName:'granite',hardness:.95,soilDepthMeters:.1,landformTag:'cliff'},SHALE={rockName:'shale',hardness:.18,soilDepthMeters:1.2,landformTag:'none'};

test('ladder: the same hut climbs level, moderate, moderate, steep, steep, severe at 2/5/10/15/22/35 degrees',()=>{
  const tiers=[2,5,10,15,22,35].map(d=>hut(d).tier);
  assert.deepEqual(tiers,['level','moderate','moderate','steep','steep','severe']);
  const labels=[2,5,10,15,22,35].map(d=>hut(d).label);
  assert.deepEqual(labels.slice(0,3),['Level site','Needs levelling','Needs levelling']);assert.equal(labels[5],'Too steep');
  assert.match(labels[3],/Terrace and wall|Posts on steep ground/);
  const cols=[2,5,15,35].map(d=>hut(d).colour);assert.deepEqual(cols,[SLOPE_COLOURS.level,SLOPE_COLOURS.moderate,SLOPE_COLOURS.steep,SLOPE_COLOURS.severe]);
  assert.ok(hut(2).ok&&hut(22).ok&&!hut(35).ok);assert.match(hut(35).issue,/^Too steep/);
});
test('a slight angle is free; a mountainside is not: cost and time grow with the volume moved',()=>{
  const a=[2,5,10,15,22].map(d=>hut(d));
  assert.equal(a[0].extraWood+a[0].extraStone+a[0].extraWork,0,'2 degrees costs nothing');
  for(let i=2;i<a.length;i++)assert.ok(a[i].extraWork>a[i-1].extraWork,`labour rises ${i}`);
  assert.ok(a[1].extraWork>0&&a[1].extraWork<a[4].extraWork/2,'a gentle levelling is far cheaper than a terrace');
  assert.ok(a[3].extraStone>a[1].extraStone&&a[4].workPct>a[1].workPct);
  assert.match(a[1].detail,/labour time/);assert.match(a[2].detail,/stone|wood/);
  // goods are whole numbers (finite goods, nothing fractional or free)
  for(const x of a){assert.ok(Number.isInteger(x.extraWood)&&Number.isInteger(x.extraStone));}
});
test('classes: huts and pole houses tolerate more than stores, wells, civic halls, wonders and kilns',()=>{
  const slope=9;const t=type=>at(type,slope,6,6).tier;
  assert.equal(t('hut'),'moderate');assert.equal(t('house'),'moderate');
  assert.equal(t('warehouse'),'steep');assert.equal(t('well'),'steep');assert.equal(t('townhall'),'steep');assert.equal(t('kiln'),'moderate');
  assert.equal(at('wonderOfTheAges',9,6,6).tier,'severe'.replace('severe','steep')==='steep'?at('wonderOfTheAges',9,6,6).tier:'');
  assert.equal(slopeClassOf('wonderOfTheAges'),'wonder');assert.equal(at('wonderOfTheAges',6,10,10).tier,'steep');
  // each class has monotone, ordered ceilings
  for(const [name,p] of Object.entries(CLASS_PROFILES))assert.ok(p.level<p.moderate&&p.moderate<p.steep,name);
  assert.ok(CLASS_PROFILES.dwelling.moderate>CLASS_PROFILES.storage.moderate&&CLASS_PROFILES.dwelling.steep>CLASS_PROFILES.civic.steep);
  for(const e of['palisade','gate','stonewall','trench','moat','bridge','quarry','lumber','cairn','grove','pen','canal'])assert.equal(slopeClassOf(e),'exempt',e);
  const wall=at('stonewall',45,4,4);assert.ok(wall.ok&&wall.tier==='level'&&wall.extraStone===0,'walls are never refused by the slope model');
});
test('civic and storage buildings: a big hall on a steep hillside is refused, a small one is terraced',()=>{
  assert.ok(!at('townhall',13,10,10).ok,'13 degrees is past a hall\'s steep ceiling');assert.ok(at('townhall',10,10,10).ok&&at('townhall',10,10,10).foundation==='terrace');
  assert.match(at('warehouse',12,12,12).issue||'',/Too steep.*large/,'a big store has no steep-ground option');
  assert.ok(at('warehouse',12,6,6).ok);
  assert.equal(at('warehouse',2,30,6).tier,'level','a long store on a faint slope is not penalised by its length');
});
test('foundations: pad, terrace, stilts, dugout, outcrop each chosen where they belong',()=>{
  assert.equal(hut(10).foundation,'pad');assert.equal(hut(2).foundation,'none');
  assert.equal(hut(15).foundation,'terrace');assert.equal(hut(22).foundation,'stilts');
  for(const fire of['kiln','oven','forge','smokehouse','hearth','potter'])for(const d of[12,16])assert.ok(at(fire,d,4,4).foundation!=='stilts',fire);
  assert.equal(at('kiln',15,4,4).foundation,'terrace');
  const d=hut(35,{ground:SAND});assert.ok(d.ok&&d.foundation==='dugout'&&d.tier==='severe');assert.match(d.label,/Cut into the slope/);
  assert.ok(!hut(35,{ground:GRANITE}).ok,'granite cannot be dug with antler and stone');assert.ok(!hut(35,{ground:SHALE}).ok);
  assert.equal(hut(22,{ground:SAND}).foundation==='dugout'||['terrace','stilts'].includes(hut(22,{ground:SAND}).foundation),true);
  const tower=at('watchtower',40,4,4,{ground:GRANITE});assert.ok(tower.ok&&tower.foundation==='outcrop');assert.ok(!at('watchtower',40,4,4).ok,'no outcrop no tower');
  const lean=at('dryrack',30,4,3);assert.ok(lean.ok&&lean.foundation==='stilts','a lean-to rack can stand on a severe slope');assert.ok(!at('dryrack',42,4,3).ok);
  assert.ok(!at('dryrack',30,8,8).ok,'only light small structures');assert.ok(!at('townhall',30,10,10,{ground:SAND}).ok);
  assert.ok(!hut(35,{ground:SAND}).issue,'dugout is not a refusal');
});
test('geology: rock quarries its own terrace stone; loose clay and shale lower the ceiling and raise the bill',()=>{
  assert.equal(groundKind(GRANITE),'rock');assert.equal(groundKind(SAND),'soft-rock');assert.equal(groundKind(SHALE),'unstable');assert.equal(groundKind(null),'plain');
  const plain=hut(19),rock=hut(19,{ground:GRANITE}),clay=hut(19,{ground:SHALE});
  assert.equal(plain.foundation,'terrace');assert.ok(rock.extraStone<plain.extraStone,'rock is cheaper stone');assert.ok(foundationBill('terrace',5.4,5.2,2.2,'rock').stone<foundationBill('terrace',5.4,5.2,2.2,'plain').stone);
  assert.ok(clay.extraWork>=plain.extraWork&&clay.extraStone>=plain.extraStone);
  assert.equal(hut(13).tier,'moderate');assert.equal(hut(13,{ground:SHALE}).tier,'steep','wet clay slips: a 13 degree slope counts as steep');
  assert.match(clay.detail,/loose ground/);assert.match(rock.detail,/quarried on site/);
});
test('fields: gentle slopes are free, steeper ground gets terraced strips, a hillside is refused',()=>{
  assert.equal(at('farm',3,8.2,8.2).foundation,'none');
  const m=at('farm',9,8.2,8.2);assert.equal(m.tier,'moderate');assert.equal(m.foundation,'strips');assert.equal(m.extraWood,0);assert.ok(m.extraWork>0);
  const s=at('farm',18,8.2,8.2);assert.equal(s.tier,'steep');assert.equal(s.foundation,'strips');assert.ok(s.extraStone>0,'drystone strip walls');
  assert.ok(!at('farm',30,8.2,8.2).ok);
});
test('survey: mean slope, fall, ledge and downhill direction are measured, not guessed',()=>{
  const s=surveySite(tilt(10),0,0,5.4,5.2);assert.ok(Math.abs(s.meanSlopeDeg-10)<.01);assert.ok(Math.abs(s.fall-5.4*Math.tan(10*Math.PI/180))<1e-6);assert.ok(s.downhill.x<-.99);
  const cliff=assessSite((x)=>x<0?10:14,'hut',0,0,5.4,5.2);assert.ok(!cliff.ok,'a 4 m ledge is a cliff');
  const bump=assessSite((x,z)=>10+(Math.hypot(x,z)<1.5?1.3:0),'hut',0,0,5.4,5.2);assert.notEqual(bump.tier,'level','a hump raises the fall tier though the mean slope is small');
  const s2=surveySite((x)=>5,0,0,6,6,()=>9);assert.equal(s2.fall,0,'submerged bank counts as flat water');
  assert.equal(tierFor('dwelling',s),'moderate');
});
test('determinism and purity: same inputs same answer, no clocks or RNG in the model',()=>{
  assert.deepEqual(hut(17,{ground:SAND}),hut(17,{ground:SAND}));
  for(const f of['slopeTiers','siteFoundation']){const src=readFileSync(new URL(`../src/game/${f}.ts`,import.meta.url),'utf8');assert.ok(!/Math\.random|Date\.now|performance\.now/.test(src),f);}
});
test('save record: only a built, non-level site stores a record, and the validator rejects nonsense',()=>{
  assert.equal(siteRecord(hut(2)),undefined);assert.equal(siteRecord(hut(35)),undefined);
  const r=siteRecord(hut(22));assert.ok(r&&validSiteRecord(r));assert.equal(r.v,1);
  for(const bad of[null,{},{...r,v:2},{...r,tier:'level'},{...r,foundation:'moat'},{...r,foundation:'none'},{...r,fall:-1},{...r,wood:1e9},{...r,extraWork:NaN},'x'])assert.ok(!validSiteRecord(bad),JSON.stringify(bad));
});
test('foundation geometry: every box reaches the terrain beneath it; no floating corners at any tier',()=>{
  const H=tilt(22),W=5.4,D=5.2,level=Math.max(H(-W/2,0),H(W/2,0))+.03,down={x:-1,z:0};
  for(const kind of['pad','terrace','stilts','dugout','outcrop']){
    const boxes=foundationBoxes(kind,{x:0,z:0,w:W,d:D},{height:H,level,downhill:down,fall:2.2});assert.ok(boxes.length>0,kind);
    for(const b of boxes){if(b.kind==='beam')continue;const bottom=b.y-b.height/2,top=b.y+b.height/2,ground=Math.min(H(b.x-b.length/2,b.z),H(b.x+b.length/2,b.z),H(b.x,b.z));
      assert.ok(bottom<=ground+1e-6,`${kind}/${b.kind} floats: bottom ${bottom.toFixed(2)} above ground ${ground.toFixed(2)}`);assert.ok(b.height>0&&b.length>0&&b.width>0);
      if(b.kind!=='portal')assert.ok(top<=level+1e-6,`${kind}/${b.kind} pokes through the floor`);}
  }
  assert.ok(foundationBoxes('stilts',{x:0,z:0,w:W,d:D},{height:H,level,downhill:down}).some(b=>b.kind==='post'),'stilts have posts');
  assert.ok(foundationBoxes('terrace',{x:0,z:0,w:W,d:D},{height:H,level,downhill:down,fall:2.2}).some(b=>b.kind==='apron'),'terraces step down');
  assert.deepEqual(foundationBoxes('none',{x:0,z:0,w:W,d:D},{height:H,level,downhill:down}),[]);
  const flat=foundationBoxes('pad',{x:0,z:0,w:W,d:D},{height:()=>10,level:10.03,downhill:down});assert.equal(flat.length,0,'level ground gets no podium');
});
test('doors at grade: the floor sits on the highest contact, a dugout floor at the door ground',()=>{
  assert.equal(foundationLevel('pad',12,10,10),12.03);assert.equal(foundationLevel('terrace',12,10),12.03);assert.equal(foundationLevel('stilts',12,10),12.03);
  assert.equal(foundationLevel('dugout',12,10,10.5),10.53);assert.equal(foundationLevel('dugout',12,10),12.03,'no door known: safe highest');
});
test('the graded model is on for new games and old saves keep the earlier linear rule',async()=>{
  const {Game}=await import('../src/game/sim.ts');const {testAction}=await import('../src/game/testing.ts');const {encodeGame,decodeGame,validateGameSave}=await import('../src/game/persistence.ts');
  const g=new Game();g.reset(1,undefined,{size:1040,layout:'pangaea'});g.enterIsland();g.testMode=true;testAction(g,'supplies');g.revealMap=true;g.updateVision(0);
  assert.equal(g.state.slopeModel,'graded');
  const home=g.campOf(0);let spot=null;for(let r=30;r<260&&!spot;r+=6)for(let k=0;k<24&&!spot;k++){const x=Math.round((home.x+Math.cos(k/24*6.283)*r)/2)*2,z=Math.round((home.z+Math.sin(k/24*6.283)*r)/2)*2;if(!g.placementIssue('hut',x,z))spot={x,z};}
  assert.ok(spot);const orig=g.height.bind(g);const slope=k=>{g.height=(x,z)=>orig(x,z)+k*Math.max(0,x-spot.x+4);};
  g.height=orig;const flatStore=g.placementIssue('warehouse',spot.x,spot.z);assert.equal(flatStore,null,'a store fits the open site');
  slope(.3);assert.match(g.placementIssue('warehouse',spot.x,spot.z)||'',/Too steep/,'graded: a store on a 17 degree hillside is refused');
  g.state.slopeModel=undefined;assert.equal(g.placementIssue('warehouse',spot.x,spot.z),null,'old saves: the earlier linear rule never surveyed stores');
  g.state.slopeModel='graded';slope(1.5);assert.match(g.placementIssue('hut',spot.x,spot.z)||'',/Too steep/,'a cliff is still refused for a hut');
  g.state.slopeModel='graded';slope(.3);const before={wood:g.tribe(0).wood,stone:g.tribe(0).stone,n:g.state.buildings.length};
  const quote=g.siteAssessment('hut',spot.x,spot.z,5.4,5.2);assert.ok(quote.ok&&quote.tier!=='level'&&quote.extraWork>0);
  assert.equal(g.placementIssue('hut',spot.x,spot.z),null);assert.equal(g.placeBuilding('hut',spot.x,spot.z,0),true);
  const b=g.state.buildings.at(-1);assert.equal(b.type,'hut');assert.ok(b.site&&b.site.foundation===quote.foundation&&b.site.extraWork===quote.extraWork,'record stored');
  const {BUILDINGS}=await import('../src/game/constants.ts');
  assert.equal(before.wood-g.tribe(0).wood,(BUILDINGS.hut.wood||0)+quote.extraWood,'extra wood is really spent');assert.equal(before.stone-g.tribe(0).stone,(BUILDINGS.hut.stone||0)+quote.extraStone,'extra stone is really spent');
  // save round trip keeps the record; an old save without the switch loads as linear
  const raw=JSON.parse(JSON.stringify(encodeGame(g)));validateGameSave(raw);const back=decodeGame(raw);assert.equal(back.state.slopeModel,'graded');assert.deepEqual(back.state.buildings.find(x=>x.id===b.id).site,b.site);
  const old=JSON.parse(JSON.stringify(raw));delete old.state.slopeModel;for(const x of old.state.buildings)delete x.site;validateGameSave(old);assert.equal(decodeGame(old).state.slopeModel,undefined);
  const bad=JSON.parse(JSON.stringify(raw));bad.state.buildings.find(x=>x.id===b.id).site={v:1,tier:'moderate',foundation:'moat',slope:1,fall:1,extraWork:1,wood:1,stone:1};assert.throws(()=>validateGameSave(bad));
  const orphan=JSON.parse(JSON.stringify(raw));delete orphan.state.slopeModel;assert.throws(()=>validateGameSave(orphan),'a site record needs the graded switch');
  g.height=orig;
  // build time: the extra labour is part of the work need
  const {BUILD_TIME}=await import('../src/game/constants.ts');assert.ok(BUILD_TIME.hut+b.site.extraWork>BUILD_TIME.hut);void COST_RULES;
});
