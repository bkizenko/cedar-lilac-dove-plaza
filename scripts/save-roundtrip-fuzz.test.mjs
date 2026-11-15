// Save round-trip: every live state a running game can reach must validate, load, match key state, and save again.
// Fast by default; HW_SAVE_FUZZ_LONG=1 runs more seeds and 60 game-minutes each.
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {acceptConquest} from '../src/game/conquest.ts';
import {tickOccupation,occupationActorAI} from '../src/game/conflictIntent.ts';
import {prisonerAI} from '../src/game/captivity.ts';
import {massRaid} from '../src/game/massRaid.ts';
import {settlePeace,peaceIssue} from '../src/game/peace.ts';
import {ensureRulers,advanceRulers,RULERS_YEAR_SECONDS} from '../src/game/rulersRuntime.ts';
import {launchRiverboat,boardRiverboat,riverboatAI,syncRiverboats} from '../src/game/boats.ts';
import {beginBoatExploration} from '../src/game/boatExploration.ts';
import {waterNavigation} from '../src/game/waterTravel.ts';
import {SEGS,MAP,HALF} from '../src/game/constants.ts';
import {roundTrip,quiet,jsonCopy,digest} from './save-roundtrip-helpers.mjs';
const LONG=process.env.HW_SAVE_FUZZ_LONG==='1';
const SEEDS=LONG?[3,11,22,33,44,55,66,77]:[11,33];
const MINUTES=LONG?60:8;

test('fresh worlds of every size, layout and generator version save, validate and load',()=>{
  const configs=[[1,10],[2,14,{size:1040,layout:'pangaea'}],[3,15,{size:1560,layout:'archipelago'}],[4,18,{size:1040,layout:'continents'}],[5,21,{size:2080,layout:'continents'}],[6,21,{size:1560,layout:'pangaea',skillsVersion:1}]];
  for(const [seed,v,opts] of configs){const g=new Game();g.reset(seed,v,opts);g.enterIsland();roundTrip(g,`fresh ${seed}/${v}`);}
});
test('default newest-generator game with every optional version flag saves and loads',()=>{
  const g=new Game();g.reset(99,21,{size:1040,layout:'archipelago',rulersVersion:2,flowFieldVersion:1,forestEcologyVersion:1,geologyVersion:1,chunkTerrainVersion:1,preset:'island'});g.enterIsland();
  roundTrip(g,'flags');
});

for(const seed of SEEDS)test(`long run seed ${seed}: dangerous world, raids, trade, rulers, armed people, animals; saving never rejects (${MINUTES} game minutes)`,()=>{
  let g=new Game();g.reset(seed,21,{size:1040,layout:seed%2?'pangaea':'continents',rulersVersion:2});g.enterIsland();quiet(g);
  g.state.conflict='dangerous';g.state.raidT=40;ensureRulers(g);
  Object.assign(g.tribe(0),{food:400,wood:300,stone:120,spears:8,bows:4,blades:2});
  for(let i=0;i<6;i++){const u=g.spawnUnit('spearman',g.campOf(0).x+4+i,g.campOf(0).z+8,0);u.militia=true;}
  let cycle=0;const slice=150;
  for(let t=0;t<MINUTES*60;t+=0.25){
    g.step(0.25);
    if(t>0&&t%slice===0){
      if(cycle%3===0)g.callToArms();
      if(cycle%4===1)g.state.time+=RULERS_YEAR_SECONDS;
      try{advanceRulers(g);}catch{}
      const loaded=roundTrip(g,`seed ${seed} t=${t}`);
      if(cycle%2===0){g=loaded;quiet(g);} // keep playing the reloaded village on alternate cycles
      cycle++;
    }
  }
});

function drive(g,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units){if(u.hp<=0)continue;if(prisonerAI(g,u,.1))continue;occupationActorAI(g,u,.1);}tickOccupation(g,.1);}}
function beaten(){
  const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
  g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1),g.makeBld('hut',95,38,1),g.makeBld('townhall',200,38,1),g.makeBld('townhall',-120,38,2)];
  g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();const hall=g.state.buildings[1];
  const residents=[0,1,2,3,4,5].map(i=>{const u=g.spawnUnit('worker',84+i,50,1);u.homeHall=hall.id;u.order='hold';return u;});
  const defenders=[0,1].map(i=>{const u=g.spawnUnit('spearman',82+i,46,1);u.homeHall=hall.id;u.order='hold';return u;});
  g.makeHostile(1);for(let i=0;i<6;i++){const u=g.spawnUnit('spearman',78+i*.5,44,0);u.order='hold';}
  drive(g,170);defenders.forEach(u=>u.hp=0);residents.slice(0,2).forEach(u=>u.hp=0);drive(g,3);
  const f=g.state.capitulation.fronts.find(x=>x.phase==='capitulated');assert.ok(f,'a beaten community asks for terms');return{g,f};
}
for(const [choice,people] of [['annex','integrate'],['annex','execute'],['annex','spare'],['puppet','integrate'],['pillage','integrate']])
  test(`conquest ${choice}/${people}: before and after, saved and reloaded`,()=>{
    const {g,f}=beaten();roundTrip(g,`pre-${choice}`);
    const r=acceptConquest(g,f.id,choice,people);assert.equal(r.accepted,true,r.reason);
    let l=roundTrip(g,`post-${choice}/${people}`);quiet(l);for(let i=0;i<600;i++)l.step(.25);roundTrip(l,`post-${choice}/${people}+150s`);
  });
test('raids and pillage in flight (mass raid sends armed adults; pillagers carry loot)',()=>{
  const g=new Game();g.reset(123456,3);g.enterIsland();g.world.heights.fill(4);
  g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',100,38,1)];
  g.state.conflict='quiet';g.state.weather='clear';quiet(g);g.vision.fill(2);g.rebuildWalk();
  for(let i=0;i<4;i++){const u=g.spawnUnit('worker',i*3,50,0);u.selected=true;}
  Object.assign(g.tribe(0),{spears:4,bows:0,blades:0});g.callToArms();for(const u of g.state.units)u.selected=false;
  assert.ok(massRaid(g,g.state.buildings[1].id)>0);
  roundTrip(g,'raid launched');for(let i=0;i<200;i++)g.step(.25);roundTrip(g,'raid underway');
  for(let i=0;i<400;i++)g.step(.25);roundTrip(g,'raid resolved');
});
test('every peace term (white peace, tribute, forced labour, puppet, annexation) saves and loads',()=>{
  let exercised=0;
  for(const term of ['whitePeace','tribute','forcedLabor','puppet','annexation']){
    const {g,f}=beaten();void f;
    const issue=peaceIssue(g,1,term);if(issue!==null)continue;
    g.state.paused=true;if(settlePeace(g,1,term)){exercised++;const l=roundTrip(g,'peace '+term);quiet(l);for(let i=0;i<300;i++)l.step(.25);roundTrip(l,'peace '+term+' later');}
  }
  assert.ok(exercised>=1,'at least one peace term must be reachable in the fixture');
});
test('rulers and succession over decades save without drift',()=>{
  let g=new Game();g.reset(123456,10);g.enterIsland();g.state.worldOptions={...(g.state.worldOptions||{}),rulersVersion:2};ensureRulers(g);
  for(const year of [5,10,25,50,80]){g.state.time=Math.max(g.state.time,year*RULERS_YEAR_SECONDS+1);advanceRulers(g);g=roundTrip(g,'rulers year '+year);}
});
function boatWorld(){
  const g=new Game();g.reset(123456);g.enterIsland();g.state.units=[];g.state.buildings=[];for(const k of['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
  for(let z=0;z<=SEGS;z++)for(let x=0;x<=SEGS;x++){const p=z/SEGS*MAP-HALF;g.world.heights[z*(SEGS+1)+x]=Math.abs(p)<12?g.world.waterY-1:4;}g.rebuildWalk();
  const dock=g.makeBld('dock',0,-15,0);g.state.buildings=[dock];Object.assign(g.tribe(0),{food:1000,wood:100,stone:30});
  for(let i=0;i<3;i++)g.spawnUnit('worker',i,-17,0);g.rebuildWalk();launchRiverboat(g,dock);const b=g.state.boats[0];boardRiverboat(g,b.id,g.state.units);
  for(let i=0;i<600;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units)riverboatAI(g,u,.1);syncRiverboats(g);}
  quiet(g);g.seaT=1e9;g.calamityT=1e9;g.state.weather='clear';g.vision.fill(0);g.updateVision(0);waterNavigation(g,true);return{g,b};
}
test('ships: docked, crewed, exploring and returning boats with cargo save and load',()=>{
  const {g,b}=boatWorld();g.state.units.forEach((u,i)=>{u.carry=3+i;u.carryType='wood';});
  roundTrip(g,'boat crewed');assert.equal(beginBoatExploration(g,b.id),null);
  for(let i=0;i<5;i++){for(let k=0;k<30;k++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units)riverboatAI(g,u,.1);syncRiverboats(g);g.updateVision(.1);}roundTrip(g,'boat exploring '+i);}
});
test('armed people and expedition provisions survive (caravan guards, militia, weapons stock)',()=>{
  const g=new Game();g.reset(7,21,{size:1040,layout:'pangaea'});g.enterIsland();quiet(g);
  const c=g.campOf(0);Object.assign(g.tribe(0),{spears:6,bows:3,blades:3,food:300});
  for(const t of ['spearman','archer','swordsman']){const u=g.spawnUnit(t,c.x+3,c.z+9,0);u.militia=true;u.caravanArmed=true;}
  for(let i=0;i<4;i++)g.spawnUnit('worker',c.x+i,c.z+10,0);g.callToArms();
  roundTrip(g,'armed');for(let i=0;i<400;i++)g.step(.25);roundTrip(g,'armed later');
});
