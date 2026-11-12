import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {beginEraUpgrade,beginHousingUpgrade} from '../src/game/housing.ts';
import {ERA_UPGRADE_RULES,fabricContext,eraUpgradeIssue,reservedBuildingFootprint,validFabricState,commitEraUpgrade} from '../src/game/buildingFabric.ts';
// Controlled finite flat, dry authoring fixture; this is not native-terrain evidence.
// Terrain/resources/positions are authored before the clock starts; no route overrides.
function fixture(){
 const g=new Game();g.reset(345,14);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.world.waterBodies=[];g.world.waterfalls=[];g.world.waterHeights=undefined;g.world.ecology=undefined;
 for(const k of ['units','buildings','trees','stones','forage','copper','iron','fish','wildlife'])g.state[k]=[];
 g.state.campSites=[];g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.conflict='quiet';g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=1000;g.state.birthT=10000;g.calamityT=10000;
 for(const t of g.state.tribes)t.thinkT=10000;
 Object.assign(g.tribe(0),{wood:240,stone:100,food:1000,foodLots:{provisions:1000},items:{}});g.tribe(0).survival.waterLiters=1000;
 const hall=g.makeBld('townhall',0,40,0),b=g.makeBld('hearth',20,40,0);g.state.buildings.push(hall,b);
 const u=g.spawnUnit('worker',8,40,0);u.order='hold';g.vision.fill(2);g.territory.fill(255);g.rebuildWalk();g.state.paused=false;return{g,b,u,hall};
}
function drive(g,seconds,done){const end=g.state.time+seconds,wall=Date.now();while(g.state.time<end&&!done()){assert.ok(Date.now()-wall<25000,'bounded fixture wall time');g.step(.1);assert.deepEqual(g.simulationErrors,[]);}assert.ok(done(),JSON.stringify({time:g.state.time,projects:g.state.buildings.filter(b=>b.renovation).map(b=>b.renovation),people:g.state.units.map(u=>({x:u.x,z:u.z,order:u.order,reason:u.workReason}))}));}
test('paid rebuild uses physical cache packets and labour, grants repairable durability without healing, and survives strict save',()=>{
 const{g,b}=fixture();const hp=b.hp=70,max=b.maxHp,wood=g.tribe(0).wood;g.tribe(0).age=1;
 assert.equal(beginEraUpgrade(g,b.id,'rebuild').accepted,true);assert.equal(b.renovation.paid,false);const project=b.renovation;assert.equal(g.tribe(0).wood,wood);assert.equal(b.maxHp,max);assert.equal(b.hp,hp);
 drive(g,240,()=>!b.renovation);assert.equal(b.hp,hp);assert.equal(b.maxHp,max*1.15);assert.equal(b.type,'hearth');assert.equal(b.fabric.upgrades.length,1);
 assert.match(commitEraUpgrade(g,b,project,project.actorId),/actual paid project/);assert.equal(b.maxHp,max*1.15);
 const r=b.fabric.upgrades[0];assert.deepEqual(r.materials,{wood:24,stone:8,plantFibre:0});assert.equal(r.workSeconds,48);assert.equal(fabricContext(b).built.era,1);
 assert.equal(validFabricState(g.state),true);const copy=decodeGame(encodeGame(g)),saved=copy.state.buildings.find(x=>x.id===b.id);assert.deepEqual(saved.fabric,b.fabric);assert.equal(saved.hp,hp);assert.equal(saved.maxHp,max*1.15);
});
test('shifted wing reserves full ground and physically completes before durability benefits',()=>{
 const{g,b}=fixture(),origin={x:b.x,z:b.z,w:b.w,d:b.d},hp=b.hp,max=b.maxHp,revision=g.navigationRevision();
 assert.equal(beginEraUpgrade(g,b.id,'extend','north').accepted,true);const target=structuredClone(b.renovation.eraChange.target);assert.deepEqual(target,{x:origin.x,z:origin.z-origin.d/2,w:origin.w,d:origin.d*2});assert.deepEqual(reservedBuildingFootprint(b),target);
 assert.match(g.placementIssue('hearth',20,34,0),/reserves.*footprint/);assert.deepEqual({x:b.x,z:b.z,w:b.w,d:b.d},origin);assert.equal(b.maxHp,max);
 drive(g,300,()=>!b.renovation);assert.deepEqual({x:b.x,z:b.z,w:b.w,d:b.d},target);assert.equal(b.hp,hp);assert.equal(b.maxHp,max*1.15);assert.ok(g.navigationRevision()>revision);assert.deepEqual(fabricContext(b).extensions,[{era:0}]);
 assert.equal(validFabricState(g.state),true);
 g.tribe(0).age=1;assert.equal(beginEraUpgrade(g,b.id,'rebuild').accepted,true);drive(g,240,()=>!b.renovation);
 assert.equal(b.maxHp,max*1.3);assert.equal(b.hp,hp);assert.equal(b.fabric.upgrades.length,2);assert.match(eraUpgradeIssue(g,b.id,'extend','south'),/Two paid/);
});
test('old saves grant no legacy durability; unsupported and malformed intents are rejected',()=>{
 const{g,b}=fixture(),hp=b.hp,max=b.maxHp;delete b.fabric;const old=encodeGame(g),copy=decodeGame(old),legacy=copy.state.buildings.find(x=>x.id===b.id);
 assert.equal(legacy.maxHp,max);assert.equal(legacy.hp,hp);assert.equal(legacy.fabric.upgrades.length,0);assert.equal(legacy.fabric.built.legacy,true);
 assert.match(eraUpgradeIssue(g,g.makeBld('dock',40,40,0).id,'rebuild'),/owned/);
 const dock=g.makeBld('dock',40,40,0);g.state.buildings.push(dock);assert.match(eraUpgradeIssue(g,dock.id,'extend','east'),/own.*upgrade rules/);
 assert.equal(beginEraUpgrade(g,b.id,'extend','diagonal').accepted,false);assert.equal(b.renovation,undefined);
 assert.equal(beginEraUpgrade(g,b.id,'extend','north').accepted,true);const bad=encodeGame(g);bad.state.buildings.find(x=>x.id===b.id).renovation.eraChange.target.x+=1;assert.throws(()=>decodeGame(bad));
});
test('existing hut housing conversion keeps its original costs, capacity and health semantics',()=>{
 const{g,b}=fixture();b.type='hut';b.w=4;b.d=4;b.maxHp=140;b.hp=80;delete b.fabric;
 assert.equal(beginHousingUpgrade(g,b.id).accepted,true);assert.deepEqual(b.renovation.quote,{wood:24,stone:8,plantFibre:0});assert.equal(b.renovation.duration,48);
 drive(g,240,()=>!b.renovation);assert.equal(b.type,'house');assert.equal(b.maxHp,320);assert.equal(b.hp,80);assert.equal(b.fabric?.upgrades.length??0,0);
});

test('a living person in the future wing prevents atomic commit until they physically leave',()=>{
 const{g,b}=fixture(),visitor=g.spawnUnit('worker',20,35,0);visitor.order='hold';const hp=b.hp,max=b.maxHp;
 assert.equal(beginEraUpgrade(g,b.id,'extend','north').accepted,true);const original={x:b.x,z:b.z,w:b.w,d:b.d};
 drive(g,300,()=>b.renovation?.progress+1e-8>=b.renovation?.duration);
 assert.deepEqual({x:b.x,z:b.z,w:b.w,d:b.d},original);assert.equal(b.maxHp,max);assert.equal(b.hp,hp);assert.match(b.renovation.blockedReason,/living people/);assert.equal(b.renovation.paid,true);
 g.clearSelect();g.selectEntity(visitor);g.issueMove(30,30);
 drive(g,60,()=>!b.renovation);assert.equal(b.maxHp,max*1.15);assert.equal(b.hp,hp);assert.equal(validFabricState(g.state),true);
});
test('a paid builder death drops the exact physical packet and strict save retains the unpaid remainder',()=>{
 const{g,b,u}=fixture();assert.equal(beginEraUpgrade(g,b.id,'extend','north').accepted,true);
 drive(g,120,()=>!!u.housingCargo);const packet=structuredClone(u.housingCargo.materials),position={x:u.x,z:u.z},quote=structuredClone(b.renovation.quote),max=b.maxHp;
 u.hp=0;g.step(.1);assert.equal(b.renovation.paid,true);assert.equal(b.renovation.actorId,null);assert.equal(b.renovation.parcel.kind,'ground');
 assert.deepEqual(b.renovation.packet,packet);assert.equal(b.renovation.parcel.x,position.x);assert.equal(b.renovation.parcel.z,position.z);assert.deepEqual(b.renovation.quote,quote);assert.equal(b.maxHp,max);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('capturing a paid carrier cannot transfer remote inputs or complete the original owner’s upgrade',()=>{
 const{g,b,u}=fixture();assert.equal(beginEraUpgrade(g,b.id,'extend','north').accepted,true);
 drive(g,120,()=>!!u.housingCargo);const packet=structuredClone(u.housingCargo.materials),max=b.maxHp,position={x:u.x,z:u.z};
 u.team=1;g.step(.1);assert.equal(b.renovation.actorId,null);assert.equal(b.renovation.packetTeam,0);assert.deepEqual(b.renovation.packet,packet);assert.equal(b.renovation.parcel.kind,'ground');
 assert.equal(b.renovation.parcel.x,position.x);assert.equal(b.renovation.parcel.z,position.z);assert.equal(u.housingCargo,undefined);assert.equal(b.maxHp,max);assert.equal(b.fabric.upgrades.length,0);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
