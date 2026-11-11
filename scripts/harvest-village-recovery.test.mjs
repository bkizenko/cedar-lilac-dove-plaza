import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {decodeGame,encodeGame} from '../src/game/persistence.ts';
test('36 residents process an overflowing harvest through repeated meal deliveries after food focus and save reload',()=>{
 let g=new Game();g.reset(42,10);g.enterIsland();g.state.units=[];g.state.buildings=[];g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];
 for(const key of ['trees','stones','forage','fish','copper','iron','wildlife'])g.state[key]=[];
 g.state.campSites=[{team:0,x:0,z:30}];g.world.camps.find(c=>c.team===0).x=0;g.world.camps.find(c=>c.team===0).z=30;
 for(const [kind,x,z]of [['townhall',0,30],['hearth',0,42],['warehouse',0,54],['threshingFloor',-12,42],['threshingFloor',12,42],['threshingFloor',-12,54],['threshingFloor',12,54],['grindingStone',-24,42],['grindingStone',24,42],['oven',-24,54],['oven',24,54]]){const b=g.makeBld(kind,x,z,0);b.y=4;g.state.buildings.push(b);}
 g.rebuildWalk();g.vision.fill(2);g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.conflict='quiet';g.state.time=950;g.state.autoWorkEnabled=true;g.state.encounter=undefined;
 for(const t of g.state.tribes)t.thinkT=10000;
 Object.assign(g.tribe(0),{food:741,foodLots:{provisions:741},wood:1000,stone:100,seeds:12,items:{grainSheaves:2409},cultivated:['grain']});g.tribe(0).survival.waterLiters=1000;
 for(let i=0;i<36;i++){const u=g.spawnUnit('worker',-6+i%6*2,34+Math.floor(i/6)*1.3,0);u.order='idle';u.jobLock=false;}
 g.setLaborPriority('food');const drive=seconds=>{const end=g.state.time+seconds;while(g.state.time<end){const time=g.state.time;g.state.paused=false;g.step(.1);assert.ok(g.state.time>time);assert.deepEqual(g.simulationErrors,[]);}};
 drive(100);const activeBefore=g.state.production?.projects.filter(p=>!['complete','lost','paused'].includes(p.phase)).length||0;assert.ok(activeBefore>0);g.setLaborPriority('food');assert.equal(g.state.production.projects.filter(p=>!['complete','lost','paused'].includes(p.phase)).length,activeBefore);
 const producedBefore=g.state.production.metrics.edibleFoodProduced||0;g=decodeGame(encodeGame(g));/* Restore the authored flat test terrain; generated terrain is reconstructed from its seed on load. */g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];for(const b of g.state.buildings)b.y=4;for(const u of g.state.units)u.y=4;g.rebuildWalk();g.vision.fill(2);drive(200);
 const jobs=g.state.production.projects,finished=recipe=>jobs.filter(p=>p.recipe.startsWith(recipe)&&p.phase==='complete').length;
 assert.ok(finished('threshCerealFloor')>=2);assert.ok(finished('winnowCerealFloor')>=2);assert.ok(finished('grindGrain')>=2);assert.ok(finished('bakeBread')>=2,JSON.stringify(jobs.map(p=>({recipe:p.recipe,phase:p.phase,blocked:p.blockedReason}))));
 assert.ok(g.state.production.metrics.edibleFoodProduced>producedBefore);assert.ok(g.tribe(0).items.grainSheaves<2409);assert.equal(g.state.units.filter(u=>u.team===0&&u.hp>0).length,36);assert.equal(jobs.filter(p=>p.phase==='paused').length,0);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 console.log(JSON.stringify({residents:36,simulationSeconds:300,deliveredFood:g.state.production.metrics.edibleFoodProduced,sheaves:g.tribe(0).items.grainSheaves,completed:{thresh:finished('threshCerealFloor'),winnow:finished('winnowCerealFloor'),grind:finished('grindGrain'),bread:finished('bakeBread')},paused:jobs.filter(p=>p.phase==='paused').length}));
});
