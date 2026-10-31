import test from 'node:test';import assert from 'node:assert/strict';
import {generateWorld} from '../src/game/worldgen.ts';
import {buildEcologicalProvinces,provinceAt,ecologicalConditionsAt,PROVINCE_KINDS,PROVINCE_PROFILES,ECOLOGY_RULES} from '../src/game/ecologicalProvinces.ts';
function check(grid,label){
 const required=Math.max(6000,grid.metrics.landAreaSquareMeters*.03);assert.equal(grid.metrics.regions.length,8);
 for(const region of grid.metrics.regions){assert.ok(region.largestConnectedAreaSquareMeters>=required-1e-5,`${label}/${region.kind}: ${region.largestConnectedAreaSquareMeters}<${required}`);assert.ok(region.areaSquareMeters>=region.largestConnectedAreaSquareMeters);}
 const wet=grid.metrics.regions.find(r=>r.kind==='wetland'),arid=grid.metrics.regions.find(r=>r.kind==='arid');
 assert.ok(wet.meanMoisture-arid.meanMoisture>.45);assert.ok(wet.meanSoil-arid.meanSoil>.35);
 assert.ok(wet.meanFreshwaterDistanceMeters<=ECOLOGY_RULES.wetlandMaximumWaterDistanceMeters);
 assert.ok(grid.soil.every(x=>x>=0&&x<=1));assert.ok(grid.moisture.every(x=>x>=0&&x<=1));
 console.log(JSON.stringify({label,minimumArea:required,areas:grid.metrics.regions.map(r=>[r.kind,Math.round(r.largestConnectedAreaSquareMeters)])}));
}
test('each ecological province has substantial connected terrain across regression layouts',()=>{
 for(const seed of [42,9876,123456])for(const layout of ['pangaea','continents','archipelago'])check(generateWorld(seed,12,{size:1040,layout}).ecology,`${seed}/${layout}`);
});
test('large and huge holdouts scale biome area with actual land area',()=>{
 for(let i=0;i<6;i++){const seed=Math.imul(i+31,0x41c64e6d)>>>0,size=i%2?2080:1560,layout=['pangaea','continents','archipelago'][Math.floor(i/2)];check(generateWorld(seed,12,{size,layout}).ecology,`${seed}/${size}/${layout}`);}
});
test('ecological field is deterministic and queries use cached derived data',()=>{
 const world=generateWorld(42,12,{size:1040,layout:'pangaea'}),a=world.ecology,b=buildEcologicalProvinces(world,42);
 assert.deepEqual(a.kinds,b.kinds);assert.deepEqual(a.soil,b.soil);assert.deepEqual(a.moisture,b.moisture);assert.deepEqual(a.metrics,b.metrics);
 const profiles=new Set();for(let z=-world.size*.45;z<world.size*.45;z+=12)for(let x=-world.size*.45;x<world.size*.45;x+=12){const p=provinceAt(a,x,z);profiles.add(p.kind);const c=ecologicalConditionsAt(a,x,z);assert.equal(p,c.profile);assert.ok(c.soil>=0&&c.soil<=1);}
 assert.equal(profiles.size,8);
});
test('biomes define distinct functional conditions and real tree-form mixes',()=>{
 assert.equal(PROVINCE_KINDS.length,8);
 for(const p of Object.values(PROVINCE_PROFILES)){assert.ok(Math.abs(Object.values(p.treeForms).reduce((s,n)=>s+n,0)-1)<1e-9);assert.ok(p.treeDensityPerHectare>0);assert.ok(p.resourceWeights.tree>0);assert.ok(p.advice.length>30);}
 assert.ok(PROVINCE_PROFILES['conifer-forest'].treeDensityPerHectare>PROVINCE_PROFILES.arid.treeDensityPerHectare*10);
 assert.ok(PROVINCE_PROFILES.meadow.crops>PROVINCE_PROFILES.alpine.crops*3);
 assert.ok(PROVINCE_PROFILES.alpine.temperatureOffsetCelsius<PROVINCE_PROFILES['warm-coast'].temperatureOffsetCelsius-10);
});
test('v12 ecological conditions control actual resources, fields, climate and work opportunities',async()=>{
 const {Game}=await import('../src/game/sim.ts'),{soilQuality,climateAt,habitatAt}=await import('../src/game/ecology.ts');
 const g=new Game();g.reset(42,12,{size:1040,layout:'pangaea'});const w=g.world;
 for(const metrics of w.ecologyResourceMetrics){assert.ok(metrics.tree>=5);assert.ok(metrics.forage>=5);assert.ok(metrics.stone>=3);}
 const pine=w.ecologyResourceMetrics.find(m=>m.kind==='conifer-forest'),arid=w.ecologyResourceMetrics.find(m=>m.kind==='arid');
 assert.ok(pine.treesPerHectare>arid.treesPerHectare*8,'actual evergreen density exceeds desert timber density');
 const locations={};for(let i=0;i<w.ecology.kinds.length;i++){const kind=PROVINCE_KINDS[w.ecology.kinds[i]];if(kind&&!locations[kind])locations[kind]={x:(i%w.ecology.width+.5)*w.ecology.cellMeters-w.size/2,z:(Math.floor(i/w.ecology.width)+.5)*w.ecology.cellMeters-w.size/2};}
 for(const [kind,p]of Object.entries(locations))assert.equal(habitatAt(g,p.x,p.z).kind,kind);
 const desert=locations.arid,wet=locations.wetland;
 assert.ok(climateAt(g,wet.x,wet.z).humidity>climateAt(g,desert.x,desert.z).humidity);
 assert.ok(soilQuality(g,wet.x,wet.z)>soilQuality(g,desert.x,desert.z));
});
