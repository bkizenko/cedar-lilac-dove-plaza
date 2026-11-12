import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {testAction} from '../src/game/testing.ts';import {BUILDINGS} from '../src/game/constants.ts';
import {turnableBuilding,turnedFootprint,buildingQuarterTurns} from '../src/game/footprints.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function fixture(){const g=new Game();g.reset(1,undefined,{size:1040,layout:'pangaea'});g.enterIsland();g.testMode=true;testAction(g,'supplies');g.revealMap=true;g.updateVision(0);return g;}
const TYPE='barracks',W=BUILDINGS[TYPE].w,D=BUILDINGS[TYPE].d;
function openPair(g,dx){const home=g.campOf(0);for(let r=40;r<240;r+=6)for(let k=0;k<24;k++){const x=home.x+Math.cos(k/24*6.283)*r,z=home.z+Math.sin(k/24*6.283)*r;
  if(!g.placementIssue(TYPE,x,z)&&!g.placementIssue(TYPE,x+dx,z)&&!g.placementIssue(TYPE,x+dx,z,0,undefined,undefined,undefined,true)&&!g.placementIssue(TYPE,x+14,z))return{x,z};}return null;}

test('quarter turn swaps the footprint only for non-square, non-fixed buildings',()=>{
  assert.ok(turnableBuilding('barracks'));assert.deepEqual(turnedFootprint('barracks'),{w:D,d:W});
  for(const t of ['house','dock','bridge','farm','warehouse','palisade','trench','quarry'])assert.equal(turnableBuilding(t),false,t);
  const g=fixture();assert.equal(g.placementIssue('dock',0,0,0,undefined,undefined,undefined,true),"That building can't be turned");
});

test('a turned barracks fits a gap the unturned one cannot, under the unchanged spacing rule',()=>{
  const g=fixture(),dx=(W+D)*.42+.12; // between turned (W+D)*.42 and unturned 2W*.42
  assert.ok(dx<2*W*.42);const spot=openPair(g,dx);assert.ok(spot,'open site');
  const a=g.makeBld(TYPE,spot.x,spot.z,0);g.state.buildings.push(a);g.rebuildWalk();
  assert.equal(g.placementIssue(TYPE,spot.x+dx,spot.z),'Too close to another building');
  assert.equal(g.placementIssue(TYPE,spot.x+dx,spot.z,0,undefined,undefined,undefined,true),null);
  // tighter than the turned rule still refused: no shrinking through solid buildings
  assert.equal(g.placementIssue(TYPE,spot.x+(W+D)*.42-.1,spot.z,0,undefined,undefined,undefined,true),'Too close to another building');
});

test('preview and commit agree, commit stores the swapped footprint, and saves round-trip it',()=>{
  const g=fixture(),spot=openPair(g,14);assert.ok(spot);
  const preview=g.placementIssue(TYPE,spot.x,spot.z,0,undefined,undefined,undefined,true);assert.equal(preview,null);
  const before=g.state.buildings.length;assert.notEqual(g.placeBuilding(TYPE,spot.x,spot.z,0,undefined,undefined,true),false);
  assert.equal(g.state.buildings.length,before+1);const b=g.state.buildings.at(-1);
  assert.deepEqual({w:b.w,d:b.d,x:b.x,z:b.z},{w:D,d:W,x:spot.x,z:spot.z});assert.equal(buildingQuarterTurns(b),1);
  const n=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));const r=n.state.buildings.find(x=>x.id===b.id);
  assert.deepEqual({w:r.w,d:r.d},{w:D,d:W});assert.equal(buildingQuarterTurns(r),1);
  assert.equal(buildingQuarterTurns(g.makeBld(TYPE,0,0,0)),0);
  // committing where preview refuses does nothing (no relocation for turned plans)
  const bad=g.placementIssue(TYPE,b.x+1,b.z,0,undefined,undefined,undefined,true);assert.ok(bad);
  assert.equal(g.placeBuilding(TYPE,b.x+1,b.z,0,undefined,undefined,true),false);assert.equal(g.state.buildings.length,before+1);
});
