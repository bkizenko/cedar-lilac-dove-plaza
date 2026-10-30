import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {fieldTerrain} from '../src/game/fieldTerrain.ts';
import {cropWater,riverDistance,soilQuality,habitatAt} from '../src/game/ecology.ts';
import {farmHarvestEstimate} from '../src/game/settlement.ts';
function setup(){const g=new Game();g.reset(345);g.enterIsland();g.height=()=>4;g.world.biomes=[{kind:'plains',x:0,z:0}];g.world.rivers=[{pts:[{x:0,z:-200},{x:0,z:200}]}];return g;}
test('river moisture follows the whole segment rather than sparse vertices',()=>{
 const g=setup();g.state.weather='drought';assert.equal(riverDistance(g,2,0),2);assert.equal(cropWater(g,2,0),.8);assert.equal(cropWater(g,80,0),.4);
});
test('large fields average riverbank and dry-land conditions and refresh on expansion',()=>{
 const g=setup(),b=g.makeBld('farm',24,0,0);const base=fieldTerrain(g,b);
 assert.equal(fieldTerrain(g,b),base,'static land samples are reused');
 b.w*=3;const large=fieldTerrain(g,b);assert.notEqual(large,base);
 assert.ok(large.droughtWater>.4&&large.droughtWater<.8);
 const nx=3,expected=Array.from({length:nx},(_,i)=>soilQuality(g,b.x+((i+.5)/nx-.5)*b.w,b.z)).reduce((a,b)=>a+b)/nx;
 assert.ok(Math.abs(large.soil-expected)<1e-9);
});
test('base-size fields retain their existing yield and mixed habitats affect expanded harvests',()=>{
 const g=setup(),b=g.makeBld('farm',0,0,0);
 const expected=Math.floor(260*(b.fertility??1)*habitatAt(g,b.x,b.z).crops*(.65+soilQuality(g,b.x,b.z)*.5));
 assert.equal(farmHarvestEstimate(g,b),expected);
 const same=g.makeBld('farm',0,0,0);same.w*=3;const fertile=farmHarvestEstimate(g,same);
 g.world.biomes=[{kind:'plains',x:-3,z:0},{kind:'hills',x:3,z:0}];
 assert.ok(farmHarvestEstimate(g,same)<fertile,'replacing biome data invalidates cached samples');
});
