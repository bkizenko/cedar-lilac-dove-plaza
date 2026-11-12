import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {wonderSiteRules,wonderTerrainCut,siteWaterFacts,WONDER_SITE_RULES} from '../src/game/wonderSites.ts';
import {riverSections,sectionCentrelinePoint} from '../src/game/waterSections.ts';

const SIZE={ringObservatory:[30,30],crescentHarbor:[30,30],cascadeGarden:[30,30],canyonCistern:[30,30],assemblyCourt:[32,28],millMarket:[30,30]};
function world(seed,layout){const g=new Game();g.reset(seed,18,{size:1040,layout});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);return g;}
const worlds=[world(4,'pangaea'),world(2,'archipelago')];

test('native terrain: every wonder family has qualifying sites, and each qualifying site meets its physical rule',()=>{
  const counts={};
  for(const g of worlds)for(let z=-480;z<=480;z+=20)for(let x=-480;x<=480;x+=20)for(const [family,[w,d]] of Object.entries(SIZE)){
    const r=wonderSiteRules(g,family,{x,z,w,d},0);if(r.issues.length)continue;counts[family]=(counts[family]??0)+1;
    if(family==='canyonCistern')assert.ok(r.facts.catchmentShare>=WONDER_SITE_RULES.catchmentShare);
    if(family==='assemblyCourt'){assert.ok(r.sample.meanGrade>=WONDER_SITE_RULES.courtGrade.min&&r.sample.meanGrade<=WONDER_SITE_RULES.courtGrade.max);assert.equal(r.facts.openGroundAhead,true);}
    if(family==='millMarket')assert.ok(r.water.nearestRiver.distanceMetres<=WONDER_SITE_RULES.millRiverMetres);
    if(family==='crescentHarbor')assert.ok(r.facts.deepFaceShare>0);
    if(family==='millMarket')assert.ok(r.sample.wetFraction<=.4);else if(family!=='crescentHarbor')assert.equal(r.sample.wetFraction,0);}
  console.log('qualifying sites',JSON.stringify(counts));
  for(const family of Object.keys(SIZE))assert.ok((counts[family]??0)>0,`${family} has a native site`);
});

test('the player cannot site a wonder on unexplored ground',()=>{
  const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});g.enterIsland();g.updateVision(0);
  assert.ok(wonderSiteRules(g,'assemblyCourt',{x:-450,z:-450,w:32,d:28},0).issues.includes('Explore the whole site first'));
});

test('cuts are exact on known ground and never free',()=>{
  const flat={world:{size:400,rivers:[],waterY:0,baseWaterY:0},state:{buildings:[]},height:()=>10,waterAt:()=>0,exploredAt:()=>true};
  const pit=wonderTerrainCut(flat,'canyonCistern',{x:0,z:0,w:30,d:30},{depthMetres:3,wallMetres:1});
  assert.equal(pit.cutCubicMetres,28*28*3);assert.equal(pit.fillCubicMetres,0);assert.equal(pit.workSeconds,28*28*3*6);assert.equal(pit.floorBelowWaterMetres,0);
  // a hillside steeper than the rake needs cutting; flat ground needs fill under the raked tiers
  const hill={...flat,height:(x,z)=>10+z*.6};const cav=wonderTerrainCut(hill,'assemblyCourt',{x:0,z:0,w:32,d:28},{rake:.45});
  assert.ok(cav.cutCubicMetres>0&&cav.workSeconds>0);
  const onFlat=wonderTerrainCut(flat,'assemblyCourt',{x:0,z:0,w:32,d:28},{rake:.45});assert.equal(onFlat.cutCubicMetres,0);assert.ok(onFlat.fillCubicMetres>0&&onFlat.workSeconds>0,'raked tiers on flat ground are built up, not free');
});

test('water facts: nearest river section width and distance, no tides, seasonal range',()=>{
  const g=worlds[0],s=riverSections(g)[0];assert.ok(s);const p=sectionCentrelinePoint(s,{x:s.pts[0].x+20,z:s.pts[0].z});
  const facts=siteWaterFacts(g,{x:p.x+12,z:p.z,w:8,d:8});assert.ok(facts.nearestRiver);assert.ok(facts.nearestRiver.distanceMetres<=12.5);
  assert.equal(facts.tides,false);assert.equal(facts.waterLevelRangeMetres,.73);
});
