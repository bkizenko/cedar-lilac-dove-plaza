import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {nearestFreshWater} from '../src/game/waterWorks.ts';
import {commissionWaterEngineering,tickWaterEngineering} from '../src/game/waterEngineering.ts';
import {excavationCuts} from '../src/game/excavation.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
let authored;
function fixture(){if(authored)return authored;const g=new Game();g.reset(2,18,{size:1040,layout:'archipelago',flowFieldVersion:1,tideVersion:2});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);const source=nearestFreshWater(g,49.6,265.6,60);assert.ok(source);authored={g,source,target:{x:-71.6,z:195.6}};return authored;}
test('native channel commission queues real builders, persists its next stages, and never completes earthworks for free',()=>{
 const{g,source,target}=fixture(),before=Array.from(g.world.heights),actors=g.state.units.map(u=>[u.id,u.x,u.z]);
 const result=commissionWaterEngineering(g,'aqueduct',source,target);assert.equal(result.ok,true,result.reason);assert.ok(result.buildingIds.length>0);assert.equal(g.state.aqueductWorks.length,1);assert.equal(excavationCuts(g).length,0);assert.deepEqual(Array.from(g.world.heights),before);assert.deepEqual(g.state.units.map(u=>[u.id,u.x,u.z]),actors);
 assert.ok(g.state.units.some(u=>u.constructionQueue?.sites.some(id=>result.buildingIds.includes(id))),'ordinary construction coordinator receives the work without requiring Auto work');
 assert.ok(result.buildingIds.every(id=>g.state.buildings.some(b=>b.id===id&&b.type==='trench'&&b.build<1)));
 const raw=encodeGame(g);assert.doesNotThrow(()=>validateGameSave(raw));const loaded=decodeGame(structuredClone(raw));assert.equal(loaded.state.aqueductWorks.length,1);assert.deepEqual(loaded.state.aqueductWorks[0].stages,g.state.aqueductWorks[0].stages);assert.deepEqual(Array.from(loaded.world.heights),before);const count=loaded.state.buildings.length;tickWaterEngineering(loaded);assert.equal(loaded.state.buildings.length,count,'reload review does not lay duplicate digs');
});
test('optional world switches reject malformed values and keep legacy saves valid',()=>{
 const raw=encodeGame(fixture().g);for(const [key,bad]of [['flowFieldVersion',2],['tideVersion',3],['riverProfileVersion',true],['landformLabelVersion',1]]){const altered=structuredClone(raw);altered.state.worldOptions[key]=bad;assert.throws(()=>validateGameSave(altered),key);}
 const legacy=structuredClone(raw);delete legacy.state.worldOptions.flowFieldVersion;delete legacy.state.worldOptions.tideVersion;assert.doesNotThrow(()=>validateGameSave(legacy));
});
test('malformed staged works cannot load unbounded or out-of-world excavations',()=>{
 const raw=encodeGame(fixture().g);for(const change of [s=>s.aqueductWorks[0].stages[0].depth=50,s=>s.aqueductWorks[0].source.x=1e8,s=>s.aqueductWorks[0].team=999,s=>s.canalWorks=[{version:1,id:1,team:0,channel:[{x:1e8,z:0,depth:1}],breach:[]}]]){const altered=structuredClone(raw);change(altered.state);assert.throws(()=>validateGameSave(altered));}
});
