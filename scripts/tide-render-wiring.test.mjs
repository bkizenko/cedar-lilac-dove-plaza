import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);return next(specifier,context);}});
import {advanceTide,TIDE_RULES,tidalWaterLevel} from '../src/game/tides.ts';
import {waterSurfaceAt,seaSurfaceY} from '../src/game/localWater.ts';
import {weatherWaterLevel} from '../src/game/hydrology.ts';
const {WorldView}=await import('../src/scene/world.ts');
function fixture(tideVersion,weather='clear'){
 const world={waterY:3,baseWaterY:3,size:1040,localWaterVersion:17,waterBodies:[{id:'upland',kind:'lake',x:20,z:20,rx:8,rz:8,surfaceY:12},{id:'river',kind:'river',width:4,pts:[{x:-30,z:20,y:8},{x:-10,z:20,y:9}]}]};
 const state={time:0,weather,worldOptions:tideVersion?{tideVersion}:{},excavations:[]};let rebuilds=0;
 return{world,state,rebuildWalk(){rebuilds++;},get rebuilds(){return rebuilds;}};
}
function viewFor(g){
 const v={lost:false,disposed:false,synchronizedState:g.state,buildingSyncIn:100,water:{position:{y:-999}},localWater:{position:{y:-999}},timeU:{value:0}};
 for(const method of ['updateDay','syncNature','syncWildlife','syncBuildings','syncUnits','syncTrails','syncCargo','syncRiverboatMeshes','syncGhost','syncArrows','syncSmoke','syncFow','syncRain','paintSeason'])v[method]=()=>{};
 return v;
}
function sync(g,v){WorldView.prototype.sync.call(v,g,1/60);}
test('actual WorldView sync follows physical sea-only tide while inland render offset stays weather-only',()=>{
 const g=fixture(2),v=viewFor(g),sea=[],inland=[{x:20,z:20},{x:-20,z:20}],levels=inland.map(p=>waterSurfaceAt(g.world,p.x,p.z));
 for(let stage=0;stage<TIDE_RULES.stages;stage++){
  g.state.time=stage*TIDE_RULES.periodSeconds/TIDE_RULES.stages;advanceTide(g);sync(g,v);
  const physical=waterSurfaceAt(g.world,200,200);assert.equal(physical,seaSurfaceY(g.world));
  assert.equal(v.water.position.y,physical+Math.sin(g.state.time*.6)*.03);
  assert.equal(v.localWater.position.y,0);inland.forEach((p,i)=>assert.equal(waterSurfaceAt(g.world,p.x,p.z),levels[i]));sea.push(physical);
 }
 assert.ok(new Set(sea).size>=4);assert.ok(Math.max(...sea)>3);assert.ok(Math.min(...sea)<3);
});
test('disabled tide preserves exact legacy sea bob and inland rendering without navigation work',()=>{
 const g=fixture(),v=viewFor(g);for(const time of [0,1,120,360,719]){g.state.time=time;assert.equal(advanceTide(g),false);sync(g,v);assert.equal(v.water.position.y,3+Math.sin(time*.6)*.03);assert.equal(v.localWater.position.y,0);assert.equal(g.world.seaTideY,undefined);}assert.equal(g.rebuilds,0);
});
test('unchanged tide stage and repeated render frames never rebuild walk every frame',()=>{
 const g=fixture(2),v=viewFor(g);assert.equal(advanceTide(g),true);assert.equal(g.rebuilds,1);
 for(let i=1;i<=300;i++){g.state.time=i/60;assert.equal(advanceTide(g),false);sync(g,v);}assert.equal(g.rebuilds,1);
 g.state.time=120;assert.equal(advanceTide(g),true);assert.equal(g.rebuilds,2);assert.equal(advanceTide(g),false);
});
test('weather and tide compose within the existing envelope and inland stays on weather',()=>{
 for(const weather of ['clear','flood','drought']){const g=fixture(2,weather),v=viewFor(g);
  for(let stage=0;stage<6;stage++){g.state.time=stage*120;advanceTide(g);sync(g,v);const w=weatherWaterLevel(3,weather);assert.equal(g.world.waterY,w);assert.equal(v.localWater.position.y,w-3);assert.equal(waterSurfaceAt(g.world,20,20),12+w-3);assert.ok(seaSurfaceY(g.world)>=weatherWaterLevel(3,'drought')-1e-9);assert.ok(seaSurfaceY(g.world)<=weatherWaterLevel(3,'flood')+1e-9);assert.equal(v.water.position.y,seaSurfaceY(g.world)+Math.sin(g.state.time*.6)*.03);}}
});
test('legacy explicit v1 keeps the shared weather/tide channel and matching renderer offset',()=>{
 const g=fixture(1),v=viewFor(g);g.state.time=120;advanceTide(g);sync(g,v);assert.equal(g.world.waterY,tidalWaterLevel(g));assert.equal(g.world.seaTideY,undefined);assert.equal(v.localWater.position.y,g.world.waterY-3);assert.equal(waterSurfaceAt(g.world,20,20),12+g.world.waterY-3);assert.equal(v.water.position.y,g.world.waterY+Math.sin(g.state.time*.6)*.03);
});
test('sea-only phase is derived from saved clock without adding persistent tide state',()=>{
 const a=fixture(2),b=fixture(2);a.state.time=480;b.state.time=JSON.parse(JSON.stringify(a.state)).time;advanceTide(a);advanceTide(b);assert.equal(a.world.seaTideY,b.world.seaTideY);assert.equal(seaSurfaceY(a.world),seaSurfaceY(b.world));assert.equal(Object.hasOwn(a.state,'seaTideY'),false);
});
