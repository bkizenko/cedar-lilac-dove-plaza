import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../../src/game/sim.ts';
import {encodeGame,decodeGame} from '../../src/game/persistence.ts';
import {potteryOrigin} from '../../src/game/pottery.ts';
import {supplyDrops,supplyApproach,supplyReached} from '../../src/game/campAnchor.ts';
import {isDependent} from '../../src/game/settlement.ts';
import {mulberry32} from '../../src/game/rng.ts';
const terrainHash=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
/** Authored finite native opening; no milk production or dairy work is pre-completed. */
export function nativeDairyVillage(){
 const random=Math.random;Math.random=mulberry32(42);try{
  let g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();g.vision.fill(2);
  const originalTerrain=terrainHash(g),home=g.campOf(0),atCache=u=>supplyDrops(g,0).some(d=>{const spot=supplyApproach(g,u,d);return spot&&supplyReached(g,u,d,spot);});
  const worker=g.state.units.find(u=>u.team===0&&u.type==='worker'&&!isDependent(g,u)&&atCache(u));assert.ok(worker,'native adult begins within reach of an actual communal cache');
  const cache=supplyDrops(g,0).find(d=>{const spot=supplyApproach(g,worker,d);return spot&&supplyReached(g,worker,d,spot);});assert.ok(cache);
  let point;
  for(let radius=12;radius<=42&&!point;radius+=4)for(let i=0;i<24&&!point;i++){
   const x=home.x+Math.cos(i*Math.PI/12)*radius,z=home.z+Math.sin(i*Math.PI/12)*radius;
   if(g.placementIssue('hearth',x,z,0)===null&&g.workBoard.connected(g,worker.x,worker.z,x,z))point={x,z};
  }
  assert.ok(point,'naturally legal hearth site, without clearing or flattening');
  // Authored finite opening: observed home ground, one completed legal hearth,
  // four delivered goat-milk food units and one real fired vessel in its cache.
  // Every generated actor/resource/terrain position remains unchanged.
  const hearth=g.makeBld('hearth',point.x,point.z,0);g.state.buildings.push(hearth);g.rebuildWalk();
  const origin=potteryOrigin(g,0,hearth.id);Object.assign(g.tribe(0),{food:304,foodLots:{provisions:300,milk:4},wood:100,items:{pottery:1},potteryOrigins:[{origin,count:1}]});g.tribe(0).survival.waterLiters=300;
  for(const u of g.state.units.filter(u=>u.team===0)){u.selected=false;u.jobLock=true;u.order='hold';}worker.selected=true;worker.jobLock=false;
  g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';g.state.visitorTimer=900;g.state.raidT=g.state.birthT=10000;g.raidT=g.seaT=g.calamityT=10000;for(const t of g.state.tribes)t.thinkT=10000;
  g.state.paused=true;const save=encodeGame(g);decodeGame(save);
  return {save,hearth:hearth.id,worker:worker.id,origin,terrain:originalTerrain};
 }finally{Math.random=random;}
}
