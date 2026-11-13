// Terrace farming (terrain model v2): kinds by slope, gates, cost ladder, layout and wall geometry, soil/sun/frost/altitude/erosion, saves, sim integration.
// Deterministic (no Math.random / Date.now).
import test from 'node:test';import assert from 'node:assert/strict';
import {assessSite,siteRecord,validSiteRecord} from '../src/game/slopeTiers.ts';
import {assessSiteV2} from '../src/game/siteAssessmentV2.ts';
import * as T from '../src/game/terraceFarming.ts';
import {foundationBoxes} from '../src/game/siteFoundation.ts';
const tilt=deg=>{const g=Math.tan(deg*Math.PI/180);return (x,z)=>10+g*x;};
const field=(deg,o={})=>assessSiteV2(tilt(deg),'farm',0,0,8.2,8.2,{baseWork:82,...o});
const SAND={rockName:'sandstone',hardness:.7,soilDepthMeters:.5,landformTag:'none'},GRANITE_BARE={rockName:'granite',hardness:.95,soilDepthMeters:.05,landformTag:'cliff'},SHALE={rockName:'shale',hardness:.18,soilDepthMeters:1.3,landformTag:'none'},THIN={rockName:'limestone',hardness:.65,soilDepthMeters:.1,landformTag:'none'};
const POOR={age:0,stonework:false,labour:3,irrigationKnown:false,mountain:false};

test('no 22 degree refusal: fields climb a ladder of terrace kinds, refused only on a cliff',()=>{
  const kinds=[2,6,10,15,22,30,38,45,50].map(d=>field(d).terrace?.k);
  assert.deepEqual(kinds,['none','bund','bund','stone','stone','andean','stair','stair','stair']);
  for(const d of[2,6,10,15,22,30,38,45,50])assert.ok(field(d).ok,`${d} degrees is farmable`);
  assert.ok(!assessSite(tilt(30),'farm',0,0,8.2,8.2).ok,'the plain tiers still refuse 30 degrees (old behaviour, saves without the switch)');
  assert.ok(!field(56).ok&&/cliff/.test(field(56).issue),'a cliff face is refused');
  assert.ok(!assessSiteV2((x)=>x<0?10:16,'farm',0,0,8.2,8.2).ok,'a 6 m wall across the plot is a cliff');
  assert.equal(T.terraceKindFor(4.9),null);assert.equal(T.terraceKindFor(60),null);
});
test('cost and build time rise with the slope; goods are whole, finite numbers',()=>{
  const a=[10,15,22,30,38,45].map(d=>field(d));
  for(let i=1;i<a.length;i++){assert.ok(a[i].extraWork>a[i-1].extraWork,`labour rises ${i}`);assert.ok(a[i].extraStone>=a[i-1].extraStone,`stone rises ${i}`);assert.ok(a[i].workPct>a[i-1].workPct);}
  assert.equal(field(10).extraStone,0,'earth bunds need no stone');assert.ok(field(15).extraStone>0&&field(30).extraStone>field(15).extraStone);
  for(const x of a){assert.ok(Number.isInteger(x.extraWood)&&Number.isInteger(x.extraStone)&&Number.isFinite(x.extraWork));}
  assert.ok(field(30).extraWork>field(15).extraWork*2,'andean work is a different order of effort');
  assert.match(field(30).detail,/strips .* m wide, .* risers/);assert.match(field(30).detail,/water channel/);assert.match(field(15).label,/Drystone terraces/);
  assert.equal(field(2).extraWork+field(2).extraStone+field(2).extraWood,0);
});
test('gated by stone-working, irrigation know-how, labour and age; a mountain people needs less',()=>{
  assert.equal(field(10,{capability:POOR}).ok,true,'bunds need nothing');
  const s=field(15,{capability:POOR});assert.ok(!s.ok);assert.match(s.issue,/stone-working/);assert.match(s.issue,/4 able workers/);assert.equal(s.slopeClass,'field');
  const base={age:1,stonework:true,labour:20,irrigationKnown:false,mountain:false};
  assert.ok(field(15,{capability:base}).ok);const an=field(30,{capability:base});assert.ok(!an.ok);assert.match(an.issue,/irrigation know-how/);assert.ok(!/stone-working/.test(an.issue));
  assert.ok(field(30,{capability:{...base,irrigationKnown:true}}).ok);assert.ok(field(30,{capability:{...base,mountain:true}}).ok,'mountain builders know andenes without ditches');
  assert.match(field(42,{capability:{...base,irrigationKnown:true}}).issue,/Iron Age/);assert.ok(field(42,{capability:{age:2,stonework:true,labour:16,irrigationKnown:true,mountain:false}}).ok);
  assert.match(field(30,{capability:{...base,irrigationKnown:true,labour:6}}).issue,/10 able workers \(you have 6\)/);
  assert.equal(T.labourNeeded('andean',{mountain:true}),7);assert.ok(field(30,{capability:{...base,mountain:true}}).extraStone<field(30,{capability:{...base,irrigationKnown:true}}).extraStone,'mountain builders are cheaper');
  assert.equal(T.terraceGate('bund',POOR),null);
});
test('geology: bare rock cannot hold a terrace stair; thin soil means hauled fill; rock is quarried on the spot',()=>{
  assert.ok(!field(45,{ground:GRANITE_BARE}).ok);assert.match(field(45,{ground:GRANITE_BARE}).issue,/Bare rock/);
  assert.ok(field(45,{ground:SAND}).ok,'sandstone has soil enough');assert.ok(field(30,{ground:GRANITE_BARE}).ok,'an andén can be filled on a rock slope');
  assert.ok(field(30,{ground:THIN}).extraWork>field(30,{ground:SAND}).extraWork,'thin soil: carry fill');
  assert.ok(field(30,{ground:GRANITE_BARE}).extraStone<field(30,{ground:SHALE}).extraStone,'hard rock is quarried on site; loose ground needs deeper footings');
});
test('layout: strips narrow with slope, walls stand at the strip edges, treads are level and never below the hillside',()=>{
  const n=d=>field(d).terrace;assert.ok(n(15).n<=n(30).n&&n(30).n<=n(45).n);assert.ok(n(45).tread<=n(22).tread+1e-9);
  const L=T.terraceLayoutFor('andean',8.2,8.2,4.7);assert.equal(L.n,3);assert.ok(L.tread>=T.TERRACE_RULES.kinds.andean.minTread&&Math.abs(L.rise*L.n-4.7)<1e-9&&L.wallLength===8.2*3);
  const H=tilt(30),plot={x:0,z:0,w:8.2,d:8.2},dir=T.fieldDownhill(H,plot);assert.ok(dir.x<-.99);
  const fr=T.terraceFrame(H,plot,3,dir);assert.equal(fr.strips.length,3);
  for(let i=1;i<3;i++)assert.ok(fr.strips[i].level<fr.strips[i-1].level,'treads step down the slope');
  for(let k=0;k<200;k++){const x=-4+8.2*((k*37)%101)/100,z=-4+8.2*((k*53)%97)/96,h=T.terraceHeightAt(H,plot,fr,x,z);assert.ok(h>=H(x,z)-1e-9,'tread is never below the ground');assert.ok(h-H(x,z)<=fr.strips[0].level-fr.strips[2].low+1e-6);}
  const t0=T.terraceHeightAt(H,plot,fr,3.5,0),t1=T.terraceHeightAt(H,plot,fr,3.0,2),t2=T.terraceHeightAt(H,plot,fr,-1.2,-2);assert.ok(Math.abs(t0-t1)<1e-9&&t2<t0,'one level per strip, along the contour');
  assert.deepEqual(T.chordAt({x:0,z:0,w:8,d:8},{x:1,z:0},0),{s0:-4,s1:4});assert.equal(T.chordAt({x:0,z:0,w:8,d:8},{x:1,z:0},5),null);
});
test('terrace boxes: walls reach the ground, treads are flat, andean strips carry a channel',()=>{
  for(const deg of[12,30,45]){
    const H=tilt(deg),a=field(deg),opt={height:H,level:10,downhill:a.downhill,terrace:{n:a.terrace.n,kind:a.terrace.k}},boxes=foundationBoxes('strips',{x:0,z:0,w:8.2,d:8.2},opt);
    assert.ok(boxes.some(b=>b.kind==='strip-tread')&&boxes.some(b=>b.kind==='strip-wall'||b.kind==='strip-bund'),`${deg}`);
    for(const b of boxes){if(b.kind==='channel')continue;const bottom=b.y-b.height/2,ground=Math.min(H(b.x,b.z),H(b.x+b.length/2*Math.cos(b.yaw),b.z-b.length/2*Math.sin(b.yaw)),H(b.x-b.length/2*Math.cos(b.yaw),b.z+b.length/2*Math.sin(b.yaw)));assert.ok(bottom<=ground+1e-6,`${deg} ${b.kind} floats`);assert.ok(b.height>0&&b.length>0&&b.width>0);}
    assert.equal(boxes.some(b=>b.kind==='channel'),a.terrace.k==='andean'||a.terrace.k==='stair');
    const treads=boxes.filter(b=>b.kind.startsWith('strip-tread'));assert.ok(treads.every(b=>Math.abs(b.y+b.height/2-(treads.find(c=>Math.abs(c.x-b.x)<.01&&Math.abs(c.z-b.z)<5)?.y+treads.find(c=>Math.abs(c.x-b.x)<.01&&Math.abs(c.z-b.z)<5)?.height/2))<1e-6),'one top level per strip');
  }
  assert.deepEqual(foundationBoxes('strips',{x:0,z:0,w:8,d:8},{height:()=>10,level:10,downhill:{x:1,z:0},terrace:{n:1,kind:'none'}}),[],'a flat field draws nothing');
  const old=foundationBoxes('strips',{x:0,z:0,w:8.2,d:8.2},{height:tilt(20),level:10,downhill:{x:-1,z:0},fall:3});assert.ok(old.every(b=>b.kind==='strip-wall'),'without a terrace record the earlier lip walls stay');
});
test('soil, sun, frost, wetness and altitude move the yield; walls blunt frost; tubers like the cold',()=>{
  const rec=(o={})=>({k:'stone',n:3,rise:1,tread:2.7,soil:.7,sun:0,frost:0,wet:.3,eros:.01,alt:30,slope:20,...o});
  assert.equal(T.terraceYield(undefined),1);const y=o=>T.terraceYield(rec(o));
  assert.ok(y({soil:.15})<y({soil:.8}),'thin soil');assert.ok(y({sun:1})>y({sun:-1}),'sun slope');assert.ok(y({sun:1,alt:80})-y({sun:-1,alt:80})>y({sun:1,alt:0})-y({sun:-1,alt:0}),'aspect matters more when it is cold');
  assert.ok(y({frost:.9})<y({frost:0}));assert.ok(T.terraceYield(rec({frost:.9}),'grain',true)<T.terraceYield(rec({frost:.9}),'grain',false),'a frost year hurts frost pockets');
  assert.ok(T.terraceYield(rec({k:'stone',frost:.9}),'grain',true)>T.terraceYield(rec({k:'bund',frost:.9}),'grain',true),'stone walls store heat');
  assert.ok(y({wet:.95})<y({wet:.4}),'waterlogged');
  const hi=k=>T.terraceYield(rec({alt:90}),k),lo=k=>T.terraceYield(rec({alt:5}),k);assert.ok(hi('tubers')>hi('grain')&&lo('grain')>lo('tubers'),'highland favours tubers, lowland grain');assert.equal(T.altitudeBand(10),'lowland');assert.equal(T.altitudeBand(40),'upland');assert.equal(T.altitudeBand(90),'highland');
  assert.ok(T.HIGHLAND_CROPS.every(c=>c.implemented===false),'hook only: maize, potato and quinoa are not crops yet');
  assert.ok(y({})>.35&&y({})<1.25);
  // site-level: a sun slope reads better than a shade slope
  const sunny=assessSiteV2((x,z)=>10-Math.tan(.35)*z,'farm',0,0,8.2,8.2,{altitude:60}).terrace,shady=assessSiteV2((x,z)=>10+Math.tan(.35)*z,'farm',0,0,8.2,8.2,{altitude:60}).terrace;
  assert.ok(sunny.sun>0&&shady.sun<0&&T.terraceYield(sunny)>T.terraceYield(shady));
});
test('soil depth thins with slope and geology; terraces bring fill',()=>{
  assert.ok(T.naturalSoilDepth(40,1)<T.naturalSoilDepth(10,1)&&T.naturalSoilDepth(10,.2)<T.naturalSoilDepth(10,1));
  assert.ok(T.terraceSoilDepth('andean',35,1)>T.naturalSoilDepth(35,1)*2,'filled terraces hold far more than the bare slope');
  assert.ok(T.terraceSoilDepth('andean',35,.05)<T.terraceSoilDepth('andean',35,1)&&T.terraceSoilDepth('andean',35,.05)>.5,'thin geology limits but fill still helps');
  assert.ok(field(35,{ground:THIN}).terrace.soil<field(35,{ground:SAND}).terrace.soil+1e-9);
});
test('erosion: unterraced steep fields lose soil fast; walls stop most of it; soft rock goes first; loss lowers the harvest',()=>{
  const bare=T.erosionPerYear(30,null,'sandstone'),walled=T.erosionPerYear(30,'andean','sandstone');
  assert.ok(bare>.1&&walled<bare*.1,`${bare} vs ${walled}`);assert.ok(T.erosionPerYear(30,null,'shale')>T.erosionPerYear(30,null,'granite'));
  assert.ok(T.erosionPerYear(30,null,'sandstone')>T.erosionPerYear(12,null,'sandstone')&&T.erosionPerYear(2,null,'sandstone')===0);assert.ok(T.erosionPerYear(30,null,'sandstone',false)>bare,'bare ground erodes more than a crop');
  assert.ok(T.erosionPerYear(10,'bund')<T.erosionPerYear(10,null)&&T.erosionPerYear(10,'bund')>T.erosionPerYear(10,'stone'));
  let loss=0;for(let y=0;y<30;y++)loss=T.soilLossAfter(loss,bare);assert.equal(loss,T.TERRACE_RULES.soilCap,'soil loss is capped');assert.equal(T.soilLossFactor(loss),.4);assert.equal(T.soilLossFactor(undefined),1);
  assert.equal(field(30).terrace.eros,T.erosionPerYear(30,'andean',undefined,true));
});
test('sim: a hillside field is allowed, costs real goods and time, needs the capability, yields by its terrace and loses soil unterraced',async()=>{
  const {Game}=await import('../src/game/sim.ts');const {testAction}=await import('../src/game/testing.ts');const {encodeGame,decodeGame,validateGameSave}=await import('../src/game/persistence.ts');const {BUILDINGS,BUILD_TIME}=await import('../src/game/constants.ts');
  const st=await import('../src/game/settlement.ts');const rt=await import('../src/game/terraceRuntime.ts');
  const g=new Game();g.reset(1,undefined,{size:1040,layout:'pangaea'});g.enterIsland();g.testMode=true;testAction(g,'supplies');g.revealMap=true;g.updateVision(0);
  assert.equal(g.state.terrainModel,'v2');assert.ok(rt.terrainV2(g));
  g.tribe(0).cultivated=['grain'];g.tribe(0).seeds=500;
  const home=g.campOf(0);let spot=null;for(let r=30;r<260&&!spot;r+=6)for(let k=0;k<24&&!spot;k++){const x=Math.round((home.x+Math.cos(k/24*6.283)*r)/2)*2,z=Math.round((home.z+Math.sin(k/24*6.283)*r)/2)*2;if(!g.placementIssue('farm',x,z))spot={x,z};}
  assert.ok(spot,'a flat field site exists');const orig=g.height.bind(g);
  const hill=k=>{g.height=(x,z)=>orig(x,z)+k*Math.max(0,x-spot.x+4.1);};
  hill(.58);// about 30 degrees across the plot
  g.tribe(0).age=0;assert.match(g.placementIssue('farm',spot.x,spot.z)||'',/stone-working/);
  g.tribe(0).age=2;assert.match(g.siteAssessment('farm',spot.x,spot.z,8.2,8.2).issue,/10 able workers \(you have \d+\)/,'a small band cannot raise andenes');
  for(let i=0;i<10;i++)g.state.units.push({...g.state.units.find(u=>u.team===0&&u.hp>0),id:g.state.nextId++});
  const q=g.siteAssessment('farm',spot.x,spot.z,8.2,8.2);assert.ok(q.terrace&&q.terrace.k==='andean',JSON.stringify(q));const cap=rt.terraceCapability(g,0);assert.ok(cap.stonework&&cap.irrigationKnown,JSON.stringify(cap));
  assert.equal(g.placementIssue('farm',spot.x,spot.z),null,'a 30 degree field is allowed once the people can build it');
  g.state.terrainModel=undefined;assert.match(g.placementIssue('farm',spot.x,spot.z)||'',/steep/,'old saves: still refused');g.state.terrainModel='v2';
  const before={wood:g.tribe(0).wood,stone:g.tribe(0).stone,seeds:g.tribe(0).seeds},quote=g.siteAssessment('farm',spot.x,spot.z,8.2,8.2);
  assert.equal(g.placeBuilding('farm',spot.x,spot.z,0),true);const b=g.state.buildings.at(-1);assert.equal(b.type,'farm');assert.ok(b.site?.terrace&&b.site.foundation==='strips'&&b.site.extraWork===quote.extraWork);
  assert.equal(before.stone-g.tribe(0).stone,(BUILDINGS.farm.stone||0)+quote.extraStone,'terrace stone is really spent');assert.equal(before.wood-g.tribe(0).wood,(BUILDINGS.farm.wood||0)+quote.extraWood);
  // harvest: the terrace record scales the estimate (same field without a record is the plain estimate)
  b.build=1;b.hp=b.maxHp;const withRec=st.farmHarvestEstimate(g,b,1,1,1),rec=b.site;delete b.site;const plain=st.farmHarvestEstimate(g,b,1,1,1);b.site=rec;
  assert.ok(withRec>0&&plain>0&&withRec!==plain,`terrace yield applies (${withRec} vs ${plain})`);
  // erosion at the year turn: terraced slowly, a field without a record (rival, unterraced) faster
  const t0=b.soilLoss??0;b.crop={year:-1,planted:1,tended:1,remaining:0,ripened:true,water:1,kind:'grain'};st.crop(g,b);const terracedLoss=(b.soilLoss??0)-t0;
  const r=g.state.buildings.at(-1);delete r.site;r.soilLoss=0;r.crop={year:-1,planted:1,tended:1,remaining:0,ripened:true,water:1,kind:'grain'};st.crop(g,r);
  assert.ok((r.soilLoss??0)>terracedLoss*5,`unterraced ${r.soilLoss} vs terraced ${terracedLoss}`);
  const healthy=st.farmHarvestEstimate(g,r,1,1,1);r.soilLoss=.5;assert.ok(st.farmHarvestEstimate(g,r,1,1,1)<healthy*.6,'lost soil lowers the harvest');r.soilLoss=0;
  // save round trip: terrace record and soil loss survive; old saves ignore them
  b.site=rec;b.soilLoss=.12;const raw=JSON.parse(JSON.stringify(encodeGame(g)));validateGameSave(raw);const back=decodeGame(raw),bb=back.state.buildings.find(x=>x.id===b.id);assert.deepEqual(bb.site,b.site);assert.equal(bb.soilLoss,.12);assert.equal(back.state.terrainModel,'v2');
  const old=JSON.parse(JSON.stringify(raw));delete old.state.terrainModel;assert.throws(()=>validateGameSave(old),'terrace records need the v2 switch');
  const old2=JSON.parse(JSON.stringify(old));for(const x of old2.state.buildings){delete x.site;delete x.soilLoss;}validateGameSave(old2);assert.equal(decodeGame(old2).state.terrainModel,undefined);
  const bad=JSON.parse(JSON.stringify(raw));bad.state.buildings.find(x=>x.id===b.id).soilLoss=.9;assert.throws(()=>validateGameSave(bad));
  const bad2=JSON.parse(JSON.stringify(raw));bad2.state.buildings.find(x=>x.id===b.id).site.terrace.k='moat';assert.throws(()=>validateGameSave(bad2));
  const bad3=JSON.parse(JSON.stringify(raw));bad3.state.slopeModel=undefined;delete bad3.state.slopeModel;assert.throws(()=>validateGameSave(bad3),'v2 needs graded');
  assert.ok(BUILD_TIME.farm>0);g.height=orig;
});
