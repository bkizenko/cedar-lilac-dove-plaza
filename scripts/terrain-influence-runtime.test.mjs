import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {influenceRadius} from '../src/game/territory.ts';
import {INFLUENCE_RULES,flushGeographicInfluence,geographicInfluenceAt,geographicInfluenceDiagnostics} from '../src/game/influenceField.ts';
import {terrainInfluenceActive,enableTerrainInfluence,terrainInfluenceModel,validTerrainInfluence} from '../src/game/terrainInfluenceRuntime.ts';
import {dominationSpheres} from '../src/game/dominatedTerritory.ts';
import {gradientAt} from '../src/game/terrainInfluenceView.ts';

function fixture(height=()=>1.5,legacy=false){const g=new Game();g.reset(42,10,{size:1040,layout:'continents'});if(legacy)delete g.state.terrainInfluence;g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.boats=[];g.state.trails=[];g.state.trees=[];g.world.waterY=0;g.world.baseWaterY=0;g.world.waterfalls=[];g.world.rivers=[];g.world.mapgen={...(g.world.mapgen||{}),fords:[]};g.world.ecology=undefined;g.height=height;g.rebuildWalk();return g;}
function add(g,type,x,z,team=0){const b=g.makeBld(type,x,z,team);b.build=1;g.state.buildings.push(b);g.rebuildWalk();return b;}
const infl=(g,x,z,team=0)=>{g.state.time+=3;if(!terrainInfluenceActive(g))flushGeographicInfluence(g);return g.influenceAt(x,z,team);};
const RADIUS=influenceRadius('townhall')*INFLUENCE_RULES.radiusScale;

test('new games use the terrain field and old saves keep the legacy field, with the old finite 36 m fade',()=>{
 const g=fixture();assert.equal(terrainInfluenceActive(g),true);
 add(g,'townhall',-30,0);
 assert.equal(infl(g,-30+RADIUS*.7,0),1);
 assert.ok(infl(g,-30+RADIUS+INFLUENCE_RULES.fadeMeters+8,0)>.01,'the new sphere reaches past the old 36 m fade');
 const old=fixture(()=>1.5,true);assert.equal(terrainInfluenceActive(old),false);add(old,'townhall',-30,0);
 assert.equal(infl(old,-30+RADIUS+INFLUENCE_RULES.fadeMeters+1,0),0,'legacy save: the old fade ends where it always did');
 assert.equal(infl(old,-30+RADIUS*.7,0),1);
});

test('no hard ring: the new field is full inside the old ring and falls smoothly without a step',()=>{
 const g=fixture();add(g,'townhall',0,0);let previous=1,biggest=0;
 for(let m=0;m<=RADIUS+130;m+=2){const v=infl(g,m,0);assert.ok(Number.isFinite(v)&&v>=0&&v<=1);if(m<=RADIUS-4)assert.equal(v,1);biggest=Math.max(biggest,previous-v);previous=v;}
 assert.ok(biggest<.12,`largest single-sample drop ${biggest}`);
});

test('a real cliff blocks the new field and an opened pass restores it',()=>{
 let pass=false;const g=fixture((x,z)=>Math.abs(x)<8&&(!pass||Math.abs(z)>12)?40:1.5);add(g,'townhall',-30,0);
 assert.equal(infl(g,25,0),0);assert.ok(geographicInfluenceDiagnostics(g).blocked.cliff>0);
 pass=true;g.height=(x,z)=>Math.abs(x)<8&&(!pass||Math.abs(z)>12)?40:1.5;g.rebuildWalk();g.state.time+=5;assert.ok(infl(g,25,0)>0);
});

test('open water blocks the new field until a finished dock has a crewed hull; losing the crew revokes it',()=>{
 const g=fixture(x=>Math.abs(x)<10?-1:1.5);add(g,'townhall',-30,0);const dock=add(g,'dock',-12,0);
 assert.equal(infl(g,25,0),0,'sea stops influence with no hull');
 const boat={id:g.id(),team:0,dock:dock.id,x:-10,z:0,y:.16,hp:300,facing:0,capacity:5};g.state.boats.push(boat);
 assert.equal(infl(g,25,0),0,'an empty hull is not a ship');
 const captain=g.spawnUnit('worker',0,-10,0);captain.haulage='canoe';captain.boat={id:boat.id,phase:'aboard'};boat.captain=captain.id;
 const across=infl(g,25,0);assert.ok(across>0,`crewed ship carries it across: ${across}`);
 captain.hp=0;g.state.time+=5;assert.equal(infl(g,25,0),0,'crew lost, crossing lost');
});

test('a finished bridge carries influence over a wide river; a river alone stops it',()=>{
 const g=fixture();add(g,'townhall',-30,0);
 g.world.rivers=[{pts:[{x:0,z:-200},{x:0,z:200}],w:14}];g.height=(x,z)=>Math.abs(x)<7?-1.2:1.5;g.rebuildWalk();
 assert.equal(infl(g,25,0),0);
 const bridge=add(g,'bridge',0,0);bridge.bridge={ax:-10,az:0,bx:10,bz:0};g.rebuildWalk();g.state.time+=5;
 assert.ok(infl(g,25,0)>0,'bridge crosses');
});

test('dominated-territory spheres and the painted territory read the new field unchanged',()=>{
 const g=fixture();add(g,'townhall',-30,0);add(g,'townhall',300,0,1);
 g.state.dominations={list:[{id:1,overlord:0,subject:1,hallId:g.state.buildings[1].id,terms:'tribute',phase:'active',leverage:.8}]};
 flushGeographicInfluence(g);
 assert.ok(g.territory.some(t=>t===0)&&g.territory.some(t=>t===1));
 const side=Math.sqrt(g.territory.length),cell=g.world.size/side;
 for(let z=0;z<side;z+=5)for(let x=0;x<side;x+=5){const t=g.territory[z*side+x];if(t===0||t===1)assert.ok(Math.abs(g.territoryStrength[z*side+x]-geographicInfluenceAt(g,-g.world.size/2+(x+.5)*cell,-g.world.size/2+(z+.5)*cell,t))<=1e-4);}
 const spheres=dominationSpheres(g);assert.equal(spheres.length,1);assert.ok(spheres[0].cells>0);
 assert.equal(geographicInfluenceDiagnostics(g).terrainAware,true);
});

test('read model is JSON, finite, and agrees with point queries; switch validates and round-trips',()=>{
 const g=fixture();add(g,'townhall',-30,0);add(g,'townhall',200,0,1);g.state.time+=3;
 const model=terrainInfluenceModel(g);assert.deepEqual(JSON.parse(JSON.stringify(model)),model);assert.deepEqual(model.teams,[0,1]);
 assert.equal(gradientAt(model,-30,0).team,0);assert.equal(gradientAt(model,200,0).team,1);assert.ok(model.alpha.every(Number.isFinite));
 assert.ok(Math.abs(gradientAt(model,-30+RADIUS+20,0).alpha/255-g.influenceAt(-30+RADIUS+20,0,0))<.1);
 assert.equal(validTerrainInfluence({}),true);assert.equal(validTerrainInfluence({terrainInfluence:{version:1}}),true);
 assert.equal(validTerrainInfluence({terrainInfluence:{version:2}}),false);assert.equal(validTerrainInfluence({terrainInfluence:{version:1,extra:1}}),false);assert.equal(validTerrainInfluence({terrainInfluence:5}),false);
 const twin=fixture();enableTerrainInfluence(twin);assert.deepEqual(JSON.parse(JSON.stringify(twin.state.terrainInfluence)),{version:1});
});

test('same world and buildings give the same field twice (seeded, no clock)',()=>{
 const a=fixture(),b=fixture();for(const g of [a,b]){add(g,'townhall',-30,0);add(g,'hut',10,20);}
 const sample=g=>[0,10,30,60,90,120].map(m=>infl(g,-30+m,0));
 assert.deepEqual(sample(a),sample(b));
});
