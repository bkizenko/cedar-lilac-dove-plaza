import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {applyEngineReadQuery,isEngineReadQuery} from '../src/game/engineReadModels.ts';
function fixture(){
 const g=new Game();g.reset(345,14);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.world.waterBodies=[];g.world.waterfalls=[];g.world.waterHeights=undefined;g.world.ecology=undefined;
 for(const k of ['units','buildings','trees','stones','forage','copper','iron','fish','wildlife'])g.state[k]=[];
 const hall=g.makeBld('townhall',0,40,0),b=g.makeBld('hearth',20,40,0),foreign=g.makeBld('hearth',60,40,1);g.state.buildings.push(hall,b,foreign);const u=g.spawnUnit('worker',8,40,0);u.order='hold';g.clearSelect();g.vision.fill(2);g.territory.fill(255);g.rebuildWalk();return{g,b,foreign,u};
}
test('flat era action/read schemas require immutable IDs and exact side/mode payloads',()=>{
 assert.equal(isEngineDispatchCommand({kind:'begin-era-upgrade',buildingId:1,mode:'rebuild'}),true);
 assert.equal(isEngineDispatchCommand({kind:'begin-era-upgrade',buildingId:1,mode:'extend',side:'west'}),true);
 assert.equal(isEngineDispatchCommand({kind:'era-upgrade-pause',buildingId:1,paused:true}),true);
 for(const bad of [{kind:'begin-era-upgrade',buildingId:1,mode:'extend'},{kind:'begin-era-upgrade',buildingId:1,mode:'extend',side:'diagonal'},{kind:'begin-era-upgrade',buildingId:1,mode:'rebuild',side:'north'},{kind:'begin-era-upgrade',buildingId:0,mode:'rebuild'},{kind:'begin-era-upgrade',buildingId:1,mode:'rebuild',team:1},{kind:'era-upgrade-pause',buildingId:1,paused:'yes'}])assert.equal(isEngineDispatchCommand(bad),false);
 assert.equal(isEngineReadQuery({kind:'building-fabric',buildingId:1}),true);
 for(const bad of [{kind:'building-fabric',buildingIds:[1]},{kind:'building-fabric',buildingId:1,team:1},{kind:'building-fabric',buildingId:NaN}])assert.equal(isEngineReadQuery(bad),false);
});
test('single owned building query returns five detached advisory choices without changing saved gameplay',()=>{
 const{g,b,foreign}=fixture(),before=JSON.stringify(g.state),model=applyEngineReadQuery(g,{kind:'building-fabric',buildingId:b.id});
 assert.equal(model.kind,'building-fabric');assert.equal(model.choices.length,5);assert.deepEqual(model.choices.filter(c=>c.mode==='extend').map(c=>c.side),['north','south','east','west']);
 assert.equal(model.benefits.completed,0);assert.equal(model.benefits.currentHp,b.hp);assert.equal(model.context.built.era,0);assert.equal(JSON.stringify(g.state),before);
 model.context.built.era=5;model.choices[1].quote.wood=999;model.benefits.repairableMaximumHp=9999;assert.equal(JSON.stringify(g.state),before);
 assert.throws(()=>applyEngineReadQuery(g,{kind:'building-fabric',buildingId:foreign.id}),/owned/);
});
test('owner command revalidates stale availability and selected IDs; admission cannot spend/heal remotely',()=>{
 const{g,b,u}=fixture(),query=applyEngineReadQuery(g,{kind:'building-fabric',buildingId:b.id}),quote=query.choices.find(c=>c.mode==='extend'&&c.side==='north');assert.equal(quote.issue,null);
 const money={wood:g.tribe(0).wood,stone:g.tribe(0).stone},hp=b.hp,max=b.maxHp;
 assert.equal(applyEngineCommand(g,{kind:'begin-era-upgrade',buildingId:b.id,mode:'extend',side:'north'},{selectedUnitIds:[g.state.nextId+100]}).accepted,false);assert.equal(b.renovation,undefined);
 assert.equal(applyEngineCommand(g,{kind:'begin-era-upgrade',buildingId:b.id,mode:'extend',side:'north'},{selectedUnitIds:[u.id]}).accepted,true);
 assert.equal(b.renovation.paid,false);assert.equal(b.maxHp,max);assert.equal(b.hp,hp);assert.deepEqual({wood:g.tribe(0).wood,stone:g.tribe(0).stone},money);
 const same=b.renovation;assert.equal(applyEngineCommand(g,{kind:'begin-era-upgrade',buildingId:b.id,mode:'extend',side:'north'}).accepted,false);assert.equal(b.renovation,same);
 const pending=applyEngineReadQuery(g,{kind:'building-fabric',buildingId:b.id});assert.equal(pending.work.mode,'extend');assert.equal(pending.work.paid,false);assert.ok(pending.choices.every(c=>c.issue!==null));
});
test('typed pause/resume keeps the exact physical project; foreign targets and ordinary home projects are refused',()=>{
 const{g,b,foreign}=fixture();assert.equal(applyEngineCommand(g,{kind:'begin-era-upgrade',buildingId:foreign.id,mode:'extend',side:'north'}).accepted,false);assert.equal(foreign.renovation,undefined);
 assert.equal(applyEngineCommand(g,{kind:'begin-era-upgrade',buildingId:b.id,mode:'extend',side:'north'}).accepted,true);const project=b.renovation,buckets=structuredClone(project);
 assert.equal(applyEngineCommand(g,{kind:'era-upgrade-pause',buildingId:b.id,paused:true}).accepted,true);assert.equal(b.planPaused,true);assert.equal(b.renovation,project);assert.equal(applyEngineReadQuery(g,{kind:'building-fabric',buildingId:b.id}).work.paused,true);
 assert.equal(applyEngineCommand(g,{kind:'era-upgrade-pause',buildingId:b.id,paused:false}).accepted,true);assert.equal(b.planPaused,undefined);for(const key of ['quote','uncollected','delivered','packet','progress','paid'])assert.deepEqual(project[key],buckets[key]);
 project.mode='upgrade';delete project.eraChange;assert.equal(applyEngineCommand(g,{kind:'era-upgrade-pause',buildingId:b.id,paused:true}).accepted,false);
});
