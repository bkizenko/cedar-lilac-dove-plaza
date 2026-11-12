import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {influenceRadius,influenceStrength} from '../src/game/territory.ts';
import {geographicInfluenceAt as rawInfluence,paintGeographicTerritory as queuePaint,geographicInfluenceDiagnostics as rawDiagnostics,advanceGeographicInfluence,geographicInfluenceReady,geographicInfluenceSample,INFLUENCE_RULES} from '../src/game/influenceField.ts';
import {trailCell} from '../src/game/trails.ts';
let wallClock=100000;
function settle(g,paint=false){for(let i=0;i<20000;i++){advanceGeographicInfluence(g,wallClock+=17);if(geographicInfluenceReady(g)&&rawDiagnostics(g).pendingJobs===0&&(!paint||rawDiagnostics(g).paintReady))return;}throw Error('Influence work did not complete');}
function influence(g,x,z,team){settle(g);return g.influenceAt(x,z,team);}
function diagnostics(g){settle(g);return rawDiagnostics(g);}
function paintGeographicTerritory(g){queuePaint(g);settle(g,true);}
function fixture(height=()=>1.5){const g=new Game();g.reset(42,10,{size:1040,layout:'continents'});g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.boats=[];g.state.trails=[];g.world.waterY=0;g.world.baseWaterY=0;g.world.waterfalls=[];g.height=height;g.rebuildWalk();return g;}
function add(g,type,x,z,team=0){const b=g.makeBld(type,x,z,team);b.build=1;g.state.buildings.push(b);g.rebuildWalk();return b;}
test('the whole historical ring remains full-strength; the continuous fade is outside it',()=>{
 const g=fixture(),hall=add(g,'townhall',-30,0),radius=influenceRadius('townhall')*INFLUENCE_RULES.radiusScale;
 for(const angle of[0,.23,.79,1.2,2.7,4.3])assert.equal(influence(g,hall.x+Math.cos(angle)*radius,hall.z+Math.sin(angle)*radius,0),1);
 const inner=influence(g,hall.x+radius+8,0,0),outer=influence(g,hall.x+radius+26,0,0);assert.ok(inner>outer&&inner<1&&outer>0);assert.ok(influence(g,hall.x+radius+38,0,0)<.001);
 assert.equal(influenceStrength(radius,radius),1);assert.equal(influenceStrength(radius+36,radius),0);
 const initial=diagnostics(g).cacheBuild;for(let i=0;i<50;i++)influence(g,-15+i*.2,4,0);assert.equal(diagnostics(g).cacheBuild,initial,'small queries reuse the bounded propagation');
 paintGeographicTerritory(g);assert.ok(g.territory.some(t=>t===0));assert.ok(g.territoryStrength.some(v=>v>0&&v<1));
});
test('an actual cliff blocks a claim and an opened walkable pass restores it',()=>{
 let pass=false;const g=fixture((x,z)=>Math.abs(x)<5&&(!pass||Math.abs(z)>7)?30:1.5);add(g,'townhall',-25,0);
 assert.equal(influence(g,15,0,0),0);const first=diagnostics(g).cacheBuild;assert.ok(diagnostics(g).blocked.cliff+diagnostics(g).blocked.obstacle>0);
 pass=true;g.rebuildWalk();assert.equal(influence(g,15,0,0),1);assert.ok(diagnostics(g).cacheBuild>first);
});
test('a real finished bridge carries influence across water; removing it restores the barrier',()=>{
 const g=fixture(x=>Math.abs(x)<5?-2:1.5);add(g,'townhall',-25,0);assert.equal(influence(g,15,0,0),0);
 const bridge=add(g,'bridge',0,0);bridge.bridge={ax:-8,az:0,bx:8,bz:0};g.rebuildWalk();assert.ok(influence(g,15,0,0)>.95);
 bridge.hp=0;g.rebuildWalk();assert.equal(influence(g,15,0,0),0);
});
test('ports need actual healthy aboard crew and connected water; an empty hull or technology grants no sea control',()=>{
 const g=fixture(x=>Math.abs(x)<5?-.5:1.5);add(g,'townhall',-25,0);const dock=add(g,'dock',-7,0);g.tribe(0).age=5;
 const boat={id:g.id(),team:0,dock:dock.id,x:0,z:0,y:.16,hp:300,facing:0,capacity:5};g.state.boats.push(boat);
 assert.equal(influence(g,15,0,0),0);assert.equal(influence(g,-4.9,0,0),0,'interpolation cannot leak land control into uncrewed water');assert.equal(diagnostics(g).eligiblePorts,0);
 const captain=g.spawnUnit('worker',0,0,0);captain.haulage='canoe';captain.boat={id:boat.id,phase:'aboard'};boat.captain=captain.id;
 const withCrew=influence(g,15,0,0);assert.ok(withCrew>0&&withCrew<1,`real sea travel has a cost: ${withCrew} ${JSON.stringify(diagnostics(g))}`);assert.equal(diagnostics(g).eligiblePorts,1);
 boat.z=22.9;captain.z=22.9;g.state.time+=3;assert.equal(diagnostics(g).eligiblePorts,1);
 boat.z=23.1;captain.z=23.1;g.state.time+=3;assert.equal(diagnostics(g).eligiblePorts,0,'crossing the actual port reach boundary invalidates even a sub-metre move');
 boat.z=0;captain.z=0;g.state.time+=3;
 captain.hp=0;g.state.time+=3;assert.equal(influence(g,15,0,0),0,'loss of the actual crew revokes the sea extension');
 captain.hp=48;captain.boat.phase='boarding';g.state.time+=3;assert.equal(influence(g,15,0,0),0,'a boarding reservation is not an available crew');
 boat.hp=0;captain.boat=undefined;captain.x=-7;g.state.time+=3;assert.ok(influence(g,15,0,0)>0,'an actual healthy adult with a personal canoe can operate the port');
 captain.maturesAt=g.state.time+100;g.state.time+=3;assert.equal(diagnostics(g).eligiblePorts,0,'dependent children cannot operate a sea supply route');
});
test('worn real routes reduce geographic cost; weather invalidates the cached field',()=>{
 const g=fixture();add(g,'townhall',-30,0);const before=influence(g,35,0,0),initial=diagnostics(g).cacheBuild;
 const cells=new Set();for(let x=-30;x<=40;x+=1)for(const z of[-3,-1,1,3])cells.add(trailCell(x,z,g.world.size));
 g.state.trails=[...cells].map(cell=>({cell,wear:1,last:0,angle:0}));g.state.time+=INFLUENCE_RULES.trailRefreshSeconds+1;const after=influence(g,35,0,0);assert.ok(after>before,`${after}>${before}`);assert.ok(diagnostics(g).cacheBuild>initial);
 const roadCache=diagnostics(g).cacheBuild;g.state.weather='flood';g.world.waterY=2;g.state.time+=3;g.rebuildWalk();assert.equal(influence(g,35,0,0),0);assert.ok(diagnostics(g).cacheBuild>roadCache);
});

test('a nearby crew in a disconnected basin cannot operate the port',()=>{
 const g=fixture((x,z)=>Math.abs(x)<5?(Math.abs(z)<3?30:-.5):1.5);add(g,'townhall',-25,-10);const dock=add(g,'dock',-7,-10);
 const captain=g.spawnUnit('worker',0,10,0),boat={id:g.id(),team:0,dock:dock.id,x:0,z:10,y:.16,hp:300,facing:0,capacity:5,captain:captain.id};captain.haulage='canoe';captain.boat={id:boat.id,phase:'aboard'};g.state.boats.push(boat);
 assert.equal(diagnostics(g).eligiblePorts,0);assert.equal(influence(g,15,-10,0),0);
 boat.z=-10;captain.z=-10;g.state.time+=3;assert.equal(diagnostics(g).eligiblePorts,1);assert.ok(influence(g,15,-10,0)>0);
 dock.build=.5;g.state.time+=3;assert.equal(diagnostics(g).eligiblePorts,0,'an unfinished port cannot project a sea claim');
});

test('a traversable uphill approach costs more than the same flat distance',()=>{
 const g=fixture();add(g,'townhall',-30,0);assert.equal(influence(g,15,0,0),1);
 g.height=x=>1.5+Math.max(0,x)*.3;g.rebuildWalk();const uphill=influence(g,15,0,0);
 assert.ok(uphill>0&&uphill<.99,`physical climbing reduces geographic reach: ${uphill}`);
});

test('painted strengths match point queries and overlapping societies are contested',()=>{
 const g=fixture();add(g,'townhall',-30,0);add(g,'hut',0,0,1);paintGeographicTerritory(g);assert.ok(g.territory.some(t=>t===254));
 const n=Math.sqrt(g.territory.length),cell=g.world.size/n;
 for(let iz=91;iz<101;iz++)for(let ix=87;ix<101;ix++){const x=-g.world.size/2+(ix+.5)*cell,z=-g.world.size/2+(iz+.5)*cell;
  assert.ok(Math.abs(g.territoryStrength[iz*n+ix]-Math.max(influence(g,x,z,0),influence(g,x,z,1)))<1e-6);
 }
 const sample=geographicInfluenceSample(g,-10,15,0);assert.ok(sample.routeCostMeters>=0);assert.ok(sample.sampledAt);assert.equal(sample.blockedReason,null);
});

test('central Game hooks share cached paint and route fields across many ordinary point queries',()=>{
 const g=fixture();const hall=add(g,'townhall',-30,0);add(g,'hut',5,0);const radius=influenceRadius('townhall')*INFLUENCE_RULES.radiusScale;
 const height=g.height;let reads=0;g.height=(x,z)=>{reads++;return height(x,z);};settle(g);assert.equal(g.influenceAt(hall.x+radius,0,0),1);assert.ok(g.influenceAt(hall.x+radius+20,0,0)>0);paintGeographicTerritory(g);const initial=diagnostics(g).cacheBuild;
 reads=0;for(let i=0;i<20;i++)g.paintTerritory();assert.equal(reads,0,'unchanged paint does not retraverse terrain or repaint the whole map');
 for(let i=0;i<200;i++)g.influenceAt(-20+(i%10),10,0);assert.equal(diagnostics(g).cacheBuild,initial);assert.ok(reads<1000,'queries reuse graph propagation rather than rebuilding it');
});

test('pending work cannot supply authoritative control; unrelated plans and births do not restart a wave',()=>{
 const g=fixture();add(g,'townhall',-30,0);add(g,'townhall',100,0,1);queuePaint(g);const before=g.territory.slice(),tension=g.tribe(1).tension;
 assert.equal(geographicInfluenceReady(g,0),false,'pending work is not yet authoritative');assert.equal(rawInfluence(g,-20,0,0),0,'unready fields read as 0, not NaN');g.tickInfluence(10);assert.equal(g.tribe(1).tension,tension);assert.deepEqual(g.territory,before,'old texture stays intact while pending');
 advanceGeographicInfluence(g,wallClock+=17);const first=rawDiagnostics(g).cacheBuild,plan=g.makeBld('hut',150,0,0);plan.build=.01;plan.plannedCost={wood:40};g.state.buildings.push(plan);g.spawnUnit('worker',180,0,0);g.rebuildWalk();g.state.time+=3;
 assert.equal(rawDiagnostics(g).cacheBuild,first,'unpaid drawing, civilian birth and identical navigation rebuild do not discard progress');settle(g,true);assert.ok(geographicInfluenceReady(g));assert.ok(Number.isFinite(g.influenceAt(-20,0,0)));
 const slices=rawDiagnostics(g).slices.count;advanceGeographicInfluence(g,wallClock);assert.equal(rawDiagnostics(g).slices.count,slices,'simulation substeps share the16ms wall interval');
 plan.plannedCost=undefined;plan.build=1;g.rebuildWalk();assert.ok(rawDiagnostics(g).cacheBuild>first,'an actual new source and solid footprint invalidate correctly');
});
