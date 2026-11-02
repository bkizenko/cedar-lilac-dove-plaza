import assert from 'node:assert/strict';
import {initializeSurvival} from '../../src/game/survivalNeeds.ts';
import {Game} from '../../src/game/sim.ts';
import {SEGS} from '../../src/game/constants.ts';
import {scoutKnowledge} from '../../src/game/scouting.ts';
import {rivalKnows} from '../../src/game/rivalDevelopment.ts';
import {observedCoastalLandings} from '../../src/game/coastalStrategy.ts';
import {endowSettlementSites} from '../helpers/endowed-settlement-sites.mjs';
const g=new Game();g.reset(345,3);g.enterIsland();g.state.units=[];g.state.buildings=[];
for(let z=0;z<=SEGS;z++)for(let x=0;x<=SEGS;x++){const wz=z/SEGS*g.world.size-g.world.size/2;g.world.heights[z*(SEGS+1)+x]=Math.abs(wz)<40?g.world.waterY-1:4;}
g.world.rivers=[];g.world.features=[];g.world.waterBodies=[];g.world.waterHeights=undefined;g.world.ecology=undefined;
for(const k of ['trees','stones','forage','copper','iron','fish','wildlife'])g.state[k]=[];
for(const [team,x,z]of[[0,-150,-90],[1,0,-90],[2,0,90]]){g.state.buildings.push(g.makeBld('townhall',x,z,team));for(let i=0;i<(team?6:1);i++){const u=g.spawnUnit('worker',x+8+i,z+10,team);u.order='hold';u.jobLock=true;}Object.assign(g.tribe(team),{food:1000,foodLots:{provisions:1000},wood:300,stone:100,hostile:false,ally:false,thinkT:100000});}
initializeSurvival(g);for(const t of g.state.tribes)t.survival.waterLiters=200;
g.state.buildings.push(g.makeBld('dock',0,-44,1));g.state.autoWorkEnabled=false;g.state.birthT=100000;g.state.weather='clear';g.state.weatherT=100000;g.state.raidT=100000;g.state.visitorTimer=900;g.state.scoutTimer=900;g.state.conflict='quiet';g.calamityT=100000;g.seaT=100000;
scoutKnowledge(g,{team:1,x:0,z:44});endowSettlementSites(g,1,2);g.rebuildWalk();g.vision.fill(2);
const hall=g.state.buildings.find(b=>b.team===2&&b.type==='townhall'),before=observedCoastalLandings(g,1,hall),wood=g.tribe(2).wood;
assert.equal(rivalKnows(g,1,0,44),true,'only old empty terrain is endowed');
assert.ok(g.state.units.filter(u=>u.team===1).every(u=>Math.hypot(u.x,u.z-44)>26));
assert.ok(g.state.buildings.filter(b=>b.team===1).every(b=>Math.hypot(b.x,b.z-44)>55));
assert.equal(g.placeBuilding('dock',0,44,2),true,g.state.banner);const dock=g.state.buildings.find(b=>b.team===2&&b.type==='dock');assert.ok(dock);
const paid=wood-g.tribe(2).wood,builder=g.state.units.find(u=>u.team===2);Object.assign(builder,{order:'build',node:dock,jobLock:false});let witnessed=false,walked=0;
for(let i=0;i<4000&&!g.finished(dock);i++){const x=builder.x,z=builder.z;g.state.paused=false;g.step(.1);walked+=Math.hypot(builder.x-x,builder.z-z);witnessed ||= g.state.units.some(u=>u.team===1&&u.hp>0&&Math.hypot(u.x-dock.x,u.z-dock.z)<=26);}
assert.ok(g.finished(dock));assert.equal(witnessed,false);assert.deepEqual(g.simulationErrors,[]);
const after=observedCoastalLandings(g,1,hall);
console.log(JSON.stringify({scope:'Remaining M2-07 diagnostic: historical empty coast knowledge must not expose a later unseen paid foreign dock',historicalTerrainMapped:true,actualObserverEverPresent:witnessed,ownContinuousVisionNearSite:false,paidLogs:paid,realBuilderWalked:walked,dockId:dock.id,beforeKnownDockIds:[...new Set(before.map(p=>p.dockId).filter(id=>id!==undefined))],afterKnownDockIds:[...new Set(after.map(p=>p.dockId).filter(id=>id!==undefined))],leak:after.some(p=>p.dockId===dock.id)&&!before.some(p=>p.dockId===dock.id),callPaths:['reviewCoastalCommissioning → observedCoastalLandings','dispatchCoastalTrade → observedCoastalLandings','observedCoastalLandings → live foreign docks + historical terrain cells']},null,2));
