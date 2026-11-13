// Ordinary hillside farming (terrain model v3): the default is plain furrowed fields on slopes, terraces are an optional upgrade, v2 saves keep automatic terraces.
// Deterministic (no Math.random / Date.now).
import test from 'node:test';import assert from 'node:assert/strict';
import {validSiteRecord} from '../src/game/slopeTiers.ts';
import {assessSiteV2} from '../src/game/siteAssessmentV2.ts';
import * as H from '../src/game/hillFarming.ts';
import * as T from '../src/game/terraceFarming.ts';
import {foundationBoxes} from '../src/game/siteFoundation.ts';
import {surveyFieldTopography} from '../src/game/plotTopography.ts';
import {boundaryKind} from '../src/game/fieldLook.ts';
const tilt=deg=>{const g=Math.tan(deg*Math.PI/180);return (x,z)=>10+g*x;};
const field=(deg,o={})=>assessSiteV2(tilt(deg),'farm',0,0,8.2,8.2,{baseWork:82,model:'v3',...o});
const POOR={age:0,stonework:false,labour:3,irrigationKnown:false,mountain:false};
const SAND={rockName:'sandstone',hardness:.7,soilDepthMeters:.9,landformTag:'none'};

test('v3 default: a steep field is ordinary farmland, no terrace strips, no walls, no stone or wood bill',()=>{
  for(const d of[8,15,22,28]){
    const a=field(d,{capability:T.OPEN_CAPABILITY});
    assert.ok(a.ok,`${d} deg is farmable`);assert.equal(a.terrace.k,'none',`${d} deg: no terrace kind`);assert.equal(a.terrace.n,1);
    assert.equal(a.extraStone,0);assert.equal(a.extraWood,0);
    assert.deepEqual(foundationBoxes('strips',{x:0,z:0,w:8.2,d:8.2},{height:tilt(d),level:10,downhill:a.downhill,terrace:{n:a.terrace.n,kind:a.terrace.k}}),[],'no walls or bunds are built');
    assert.doesNotMatch(a.detail,/\d strips?\b|wall|stairs/i);
  }
  const a=field(16,{capability:T.OPEN_CAPABILITY});assert.match(a.detail,/furrows ploughed along the contour/);assert.match(a.detail,/earth bank at the lower edge/);
  assert.match(a.detail,/Terraces available/,'the hint is there when the people could terrace');
  assert.doesNotMatch(field(22,{capability:POOR}).detail,/Terraces available/,'no hint without the means');assert.match(field(22,{capability:POOR}).detail,/terraces later: needs/);
  assert.doesNotMatch(field(6).detail,/Terraces available/,'gentle ground needs no hint');
  assert.match(field(26).detail,/hand-tilled|hoed/,'beyond the plough limit it is a hand-tilled plot');
  assert.match(field(26).detail,/lower harvest/);assert.match(field(26).detail,/loses about/,'erosion warning');
});

test('v3 limits: plough to 18, hoe plots to 30 and small only, beyond that only terraced ground, cliffs refused',()=>{
  assert.equal(H.hillWorkFor(17,67),'plough');assert.equal(H.hillWorkFor(25,67),'hoe');assert.equal(H.hillWorkFor(25,150),'terrace-only');assert.equal(H.hillWorkFor(35,60),'terrace-only');
  const big=assessSiteV2(tilt(25),'farm',0,0,13,13,{model:'v3',capability:T.OPEN_CAPABILITY});assert.ok(!big.ok&&/Too steep to plough/.test(big.issue),big.issue);
  const bare=field(35,{capability:POOR});assert.ok(!bare.ok&&/^Too steep to farm without terraces/.test(bare.issue),bare.issue);
  const able=field(35,{capability:T.OPEN_CAPABILITY});assert.ok(able.ok&&able.terrace.k==='stair'||able.terrace.k==='andean',JSON.stringify(able.terrace));assert.match(able.detail,/^Beyond 30°/);
  assert.ok(!field(56,{capability:T.OPEN_CAPABILITY}).ok&&/cliff/.test(field(56,{capability:T.OPEN_CAPABILITY}).issue),'cliffs are still refused');
  assert.ok(!assessSiteV2((x)=>x<0?10:16,'farm',0,0,8.2,8.2,{model:'v3'}).ok,'a wall across the plot is a cliff');
  // the earlier model is untouched when the option is absent
  assert.equal(assessSiteV2(tilt(22),'farm',0,0,8.2,8.2,{baseWork:82}).terrace.k,'stone');
  assert.equal(assessSiteV2(tilt(10),'farm',0,0,8.2,8.2,{baseWork:82,model:'v2'}).terrace.k,'bund');
});

test('soil and erosion on an ordinary slope: thinner soil, real erosion, cheap mitigations help but are not terraces',()=>{
  const flat=field(2),mid=field(14),steep=field(26);
  assert.ok(flat.terrace.soil>mid.terrace.soil&&mid.terrace.soil>steep.terrace.soil,'soil thins with slope');
  const bare=T.erosionPerYear(26,null,'sandstone',true),ord=H.ordinaryErosion(26,'sandstone'),terraced=T.erosionPerYear(26,'andean','sandstone',true);
  assert.ok(ord<bare&&ord>terraced*3,`furrows and a bank cut erosion (${ord}) but terraces cut far more (${terraced}), bare ${bare}`);
  assert.equal(H.ordinaryErosion(1),0);assert.ok(H.ordinaryProtect(12)>.4&&H.ordinaryProtect(12)<.5);
  assert.ok(H.coverFactor(true,false)>H.coverFactor(false,true)&&H.coverFactor(false,false)>H.coverFactor(true,false),'grass fallow protects, bare ground does not');
  assert.ok(H.gullyRisk(H.ordinaryErosion(40,'shale'))&&!H.gullyRisk(H.ordinaryErosion(8,'granite')));
  assert.equal(field(26,{ground:SAND}).terrace.eros,H.ordinaryErosion(field(26).meanSlopeDeg,'sandstone'),'the record carries the ordinary rate for the rock');
  const y=r=>T.terraceYield(r,'grain',false);assert.ok(y(field(10).terrace)>y(field(26).terrace),'a hand-tilled steep plot yields less than a ploughed gentle one');
  assert.ok(Math.abs(H.handTillYield(18)-1)<1e-9&&H.handTillYield(30)<.85&&H.handTillYield(60)===H.handTillYield(30));
  // aspect still counts
  const sunny=assessSiteV2((x,z)=>10-Math.tan(.25)*z,'farm',0,0,8.2,8.2,{model:'v3',altitude:60}).terrace,shady=assessSiteV2((x,z)=>10+Math.tan(.25)*z,'farm',0,0,8.2,8.2,{model:'v3',altitude:60}).terrace;
  assert.ok(sunny.sun>0&&shady.sun<0&&T.terraceYield(sunny)>T.terraceYield(shady));
});

test('contour furrows: every furrow runs across the slope, the bank sits at the lower edge, the survey agrees',()=>{
  for(const deg of[8,15,25])for(const aspect of[0,40,95,170,250,320]){
    const a=aspect*Math.PI/180,g=Math.tan(deg*Math.PI/180),H3=(x,z)=>10+g*(x*Math.cos(a)+z*Math.sin(a)),plot={x:3,z:-2,w:8.2,d:8.2};
    const dir=T.fieldDownhill(H3,plot),lines=H.hillFieldLines(H3,plot,dir);
    assert.ok(lines.length>10);
    for(const ln of lines){
      const along={x:Math.cos(ln.yaw),z:-Math.sin(ln.yaw)};
      assert.ok(Math.abs(along.x*dir.x+along.z*dir.z)<1e-6,'a furrow is perpendicular to the downhill line');
      assert.ok(Math.abs(H3(ln.x+along.x*ln.length/2,ln.z+along.z*ln.length/2)-H3(ln.x-along.x*ln.length/2,ln.z-along.z*ln.length/2))<1e-6,'and level along its length');
    }
    const survey=surveyFieldTopography({height:H3,waterAt:()=>-99},plot),u={x:Math.cos(survey.contourAngleRadians),z:Math.sin(survey.contourAngleRadians)};
    assert.ok(Math.abs(u.x*dir.x+u.z*dir.z)<1e-6,'crop rows (survey contour angle) follow the same direction');
    const t=l=>(l.x-plot.x)*dir.x+(l.z-plot.z)*dir.z,bank=lines.filter(l=>l.kind==='bank'),furrows=lines.filter(l=>l.kind==='furrow');
    assert.ok(bank.length>=1&&bank.every(l=>t(l)>Math.max(...furrows.map(t))),'the bank is the lowest line');
  }
  assert.deepEqual(H.furrowDirection({x:0,z:1}),{x:-1,z:0});
});

test('boundaries: a v3 hill field never gets a drystone wall; earlier fields keep theirs',()=>{
  for(let e=0;e<5;e++)for(let v=0;v<4;v++)assert.notEqual(boundaryKind(e,v,.6,true),'stone');
  assert.equal(boundaryKind(1,0,.6),'stone','unchanged for earlier saves');assert.equal(boundaryKind(2,2,0),'stone');
});

test('terrace upgrade plan: earth bunds first for everyone, stone facing only with stone-working and a gang; costs are real',()=>{
  const H25=tilt(20),plot={x:0,z:0,w:8.2,d:8.2},rec=field(20,{capability:T.OPEN_CAPABILITY}).terrace;assert.equal(rec.k,'none');
  const p1=H.planTerraceUpgrade(H25,plot,rec,POOR,{ground:SAND});assert.ok(p1.ok&&p1.to==='bund'&&p1.from==='none',JSON.stringify(p1));assert.equal(p1.stone,0,'earth bunds need no stone');assert.ok(p1.wood>0);
  assert.equal(p1.record.k,'bund');assert.ok(p1.record.eros<rec.eros&&p1.record.soil>=rec.soil);
  const p2=H.planTerraceUpgrade(H25,plot,p1.record,POOR,{ground:SAND});assert.ok(!p2.ok&&/stone-working/.test(p2.issue)&&p2.to==='stone',JSON.stringify(p2));
  const p3=H.planTerraceUpgrade(H25,plot,p1.record,T.OPEN_CAPABILITY,{ground:SAND});assert.ok(p3.ok&&p3.to==='stone'&&p3.stone>0,JSON.stringify(p3));assert.ok(p3.record.eros<p1.record.eros);
  assert.ok(!H.planTerraceUpgrade(H25,plot,p3.record,T.OPEN_CAPABILITY).ok,'already terraced');
  const mild=field(3,{capability:T.OPEN_CAPABILITY}).terrace;assert.match(H.planTerraceUpgrade(tilt(3),plot,mild,T.OPEN_CAPABILITY).issue,/level/);
  const bundOnly=H.planTerraceUpgrade(tilt(9),plot,H.planTerraceUpgrade(tilt(9),plot,field(9).terrace,POOR).record,T.OPEN_CAPABILITY);assert.match(bundOnly.issue,/Bunds are all/);
});

test('civ preference changes how often a people leans to terrace, never forces it, and builds nothing by itself',()=>{
  const plain=H.terracePreference({mountain:false,altitude:5,irrigationKnown:false}),mountain=H.terracePreference({mountain:true,altitude:90,irrigationKnown:true}),paddy=H.terracePreference({mountain:false,altitude:5,irrigationKnown:true,paddy:true});
  assert.ok(mountain>paddy&&paddy>plain&&mountain<=.85);
  const rate=(pref,pressure)=>{let n=0;for(let id=1;id<=2000;id++)if(H.leansToTerrace(pref,pressure,id))n++;return n/2000;};
  const pressure=H.terracePressure(.06,24);assert.ok(pressure>.5&&pressure<=1);
  const rp=rate(plain,pressure),rm=rate(mountain,pressure);assert.ok(rm>rp+.15,`mountain ${rm} vs plain ${rp}`);
  assert.ok(rm<.95&&rate(1,1)<1,'even the keenest people decline some fields');assert.ok(H.terraceInclination(1,1)<=.92);
  assert.equal(rate(mountain,0),0,'no pressure, no terracing');assert.ok(rp>0,'even a plain people sometimes choose it under pressure');
  assert.equal(H.leansToTerrace(mountain,pressure,7),H.leansToTerrace(mountain,pressure,7),'deterministic');
  assert.ok(H.terracePressure(.0,10)===0&&H.terracePressure(.2,40)===1);
});

test('sim v3: a steep field is placed ordinary (no terrace record), the upgrade spends goods, v2 saves keep automatic terraces',async()=>{
  const {Game}=await import('../src/game/sim.ts');const {testAction}=await import('../src/game/testing.ts');const {encodeGame,decodeGame,validateGameSave}=await import('../src/game/persistence.ts');const {BUILDINGS}=await import('../src/game/constants.ts');
  const st=await import('../src/game/settlement.ts');const rt=await import('../src/game/terraceRuntime.ts');
  const g=new Game();g.reset(1,undefined,{size:1040,layout:'pangaea'});g.enterIsland();g.testMode=true;testAction(g,'supplies');g.revealMap=true;g.updateVision(0);
  assert.equal(g.state.terrainModel,'v3');g.tribe(0).cultivated=['grain'];g.tribe(0).seeds=500;
  const home=g.campOf(0);let spot=null;for(let r=30;r<260&&!spot;r+=6)for(let k=0;k<24&&!spot;k++){const x=Math.round((home.x+Math.cos(k/24*6.283)*r)/2)*2,z=Math.round((home.z+Math.sin(k/24*6.283)*r)/2)*2;if(!g.placementIssue('farm',x,z))spot={x,z};}
  assert.ok(spot,'a flat field site exists');const orig=g.height.bind(g);
  g.height=(x,z)=>orig(x,z)+.4*Math.max(0,x-spot.x+4.1);// about 22 degrees across the plot
  g.tribe(0).age=0;g.tribe(0).wood=400;g.tribe(0).stone=400;
  assert.equal(g.placementIssue('farm',spot.x,spot.z),null,'an ordinary hillside field needs no stone-working');
  const before={wood:g.tribe(0).wood,stone:g.tribe(0).stone};
  assert.equal(g.placeBuilding('farm',spot.x,spot.z,0),true);const b=g.state.buildings.at(-1);
  assert.equal(b.site.terrace.k,'none','no terraces were built');assert.equal(g.tribe(0).stone,before.stone-(BUILDINGS.farm.stone||0),'no stone spent on terraces');
  assert.equal(b.site.stone,0);
  // never auto-built: a year of play does not terrace it
  b.build=1;b.hp=b.maxHp;for(let y=0;y<3;y++){b.crop={year:-1-y,planted:1,tended:1,remaining:0,ripened:true,water:1,kind:'grain'};st.crop(g,b);}
  assert.equal(b.site.terrace.k,'none');assert.ok(b.soilLoss>0&&b.soilLoss<.3,`slope erodes slowly with ordinary habits: ${b.soilLoss}`);
  // an unrecorded rival field on the same slope loses soil at the same ordinary rate
  const rate=rt.fieldErosionPerYear(g,b,true);assert.ok(rate>0&&rate===b.site.terrace.eros);
  // rested under grass loses less, bare ground more
  assert.ok(rt.fieldErosionPerYear(g,b,false,true)<rate&&rt.fieldErosionPerYear(g,b,false,false)>rate);
  // the optional upgrade
  const quote=rt.terraceUpgradeQuote(g,b);assert.ok(quote.ok&&quote.to==='bund',JSON.stringify(quote));assert.equal(rt.terraceUpgradeIssue(g,b),null);
  const loss0=b.soilLoss,w0=g.tribe(0).wood,s0=g.tribe(0).stone,eros0=b.site.terrace.eros;
  const r1=rt.terraceField(g,b);assert.ok(r1.ok);assert.equal(w0-g.tribe(0).wood,quote.wood,'bund wood is spent');assert.equal(s0-g.tribe(0).stone,quote.stone);
  assert.equal(b.site.terrace.k,'bund');assert.ok(b.site.terrace.eros<eros0);assert.ok(b.soilLoss<loss0,'hauled fill restores some soil');assert.ok(b.site.foundation==='strips'&&b.site.wood>=quote.wood);
  assert.ok(validSiteRecord(b.site));
  // the stone-facing step needs stone-working and a gang
  g.tribe(0).age=0;const q2=rt.terraceUpgradeQuote(g,b);assert.ok(!q2.ok&&/stone-working/.test(q2.issue),JSON.stringify(q2));assert.ok(!rt.terraceField(g,b).ok);assert.equal(b.site.terrace.k,'bund');
  g.tribe(0).age=2;for(let i=0;i<10;i++)g.state.units.push({...g.state.units.find(u=>u.team===0&&u.hp>0),id:g.state.nextId++});
  const q3=rt.terraceUpgradeQuote(g,b);assert.ok(q3.ok&&q3.to==='stone'&&q3.stone>0,JSON.stringify(q3));g.tribe(0).stone=0;assert.match(rt.terraceUpgradeIssue(g,b),/stone/,'it needs the goods');g.tribe(0).stone=400;
  const s1=g.tribe(0).stone;assert.ok(rt.terraceField(g,b).ok);assert.equal(s1-g.tribe(0).stone,q3.stone);assert.equal(b.site.terrace.k,'stone');assert.ok(!rt.terraceUpgradeQuote(g,b).ok);
  // saves: v3 round trip, and a v2 save keeps its behaviour
  const raw=JSON.parse(JSON.stringify(encodeGame(g)));validateGameSave(raw);const back=decodeGame(raw);assert.equal(back.state.terrainModel,'v3');assert.deepEqual(back.state.buildings.find(x=>x.id===b.id).site,b.site);
  const asV2=JSON.parse(JSON.stringify(raw));asV2.state.terrainModel='v2';validateGameSave(asV2);assert.equal(decodeGame(asV2).state.terrainModel,'v2');
  const bad=JSON.parse(JSON.stringify(raw));bad.state.terrainModel='v4';assert.throws(()=>validateGameSave(bad));
  const noGraded=JSON.parse(JSON.stringify(raw));delete noGraded.state.slopeModel;assert.throws(()=>validateGameSave(noGraded));
  // v2 behaviour: old villages still get terraces assigned by slope and no upgrade action
  g.state.terrainModel='v2';assert.equal(g.siteAssessment('farm',spot.x,spot.z,8.2,8.2).terrace.k,'stone','v2: assigned automatically');assert.equal(rt.terraceUpgradeQuote(g,b),null);assert.match(rt.terraceUpgradeIssue(g,b),/laid out/);
  const was=b.site.terrace.k;assert.ok(!rt.terraceField(g,b).ok&&b.site.terrace.k===was);
  g.state.terrainModel='v3';
  g.height=(x,z)=>orig(x,z)+.7*Math.max(0,x-spot.x+4.1);g.tribe(0).age=0;// a 35 degree face still needs terraces: refused without the means
  assert.match(g.placementIssue('farm',spot.x,spot.z)||'',/terraces|stone-working/);
  g.state.buildings=g.state.buildings.filter(x=>x!==b);g.tribe(0).age=2;assert.equal(g.placementIssue('farm',spot.x,spot.z),null,'an explicit terraced field is allowed with the means');assert.ok(g.siteAssessment('farm',spot.x,spot.z,8.2,8.2).terrace.k!=='none');
  g.height=orig;
});
