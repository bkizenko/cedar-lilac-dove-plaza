import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/sim.ts';
import { campRaidAI, canScheduleSeaRaid, findRaiderLanding } from '../src/game/raiders.ts';
import { encodeGame, decodeGame } from '../src/game/persistence.ts';

function fixture(seed=123456, version=2) {
  const g = new Game(); g.reset(seed, version); g.enterIsland();
  return g;
}
function band(g) {
  const camp = g.state.buildings.find(b => b.raiderCamp);
  assert.ok(camp, 'fixture has a raider camp');
  return { camp, raider:g.state.units.find(u => u.homeCamp === camp.id) };
}

test('permanent camp guards no longer block sea arrivals, including in the Stone Age', () => {
  const g=fixture(); g.state.time=1300; g.state.conflict='balanced'; g.tribe(0).age=0;
  assert.ok(g.state.units.some(u=>u.homeCamp!==undefined));
  assert.equal(canScheduleSeaRaid(g),true);
  const u=g.spawnUnit('spearman',0,0,3);
  assert.equal(canScheduleSeaRaid(g),false,'an existing sea band prevents another');
  u.hp=0; assert.equal(canScheduleSeaRaid(g),true);
  g.state.conflict='quiet'; assert.equal(canScheduleSeaRaid(g),false);
  g.state.conflict='balanced'; g.state.time=1199; assert.equal(canScheduleSeaRaid(g),false);
  g.state.conflict='dangerous'; g.state.time=600; assert.equal(canScheduleSeaRaid(g),true);
  let scheduled=0;g.spawnRaid=()=>{scheduled++};g.raidThreat=()=>1;g.state.raidT=0;
  const originalRandom=Math.random;Math.random=()=>0;
  try { g.tickRaiders(.1); } finally { Math.random=originalRandom; }
  assert.equal(scheduled,1,'the live scheduler uses the eligibility rule');
});

test('sea landing is dry, connected, coastal and outside the settlement in both map generations', () => {
  for(const version of [1,2]) for(const seed of [345,123456,98765]) {
    const g=fixture(seed,version), spot=findRaiderLanding(g), home=g.campOf(0);
    assert.ok(spot, `shore landing for seed ${seed} version ${version}`);
    assert.ok(g.walkable(spot.x,spot.z));
    assert.ok(g.workBoard.connected(g,home.x,home.z,spot.x,spot.z));
    assert.ok(Math.hypot(spot.x-home.x,spot.z-home.z)>=80);
    assert.ok(Array.from({length:8},(_,i)=>i*Math.PI/4).some(a=>
      g.height(spot.x+Math.cos(a)*10,spot.z+Math.sin(a)*10)<g.world.waterY));
  }
});

test('an unreachable shore cancels an arrival instead of spawning stranded invaders', () => {
  const g=fixture(); g.workBoard.connected=()=>false;
  assert.equal(findRaiderLanding(g),null);
});

test('hungry land raiders harvest finite nearby food and physically deliver it', () => {
  const g=fixture(),{camp,raider:u}=band(g);
  const node={id:g.id(),kind:'forage',x:u.x,z:u.z,y:u.y,amount:13,maxAmt:13,regenT:0,scale:1,rich:1};
  g.state.forage=[node]; g.tribe(3).food=0;
  const population=g.popNow(3);
  campRaidAI(g,u,1);
  assert.equal(g.tribe(3).food,0,'nothing arrives while harvesting');
  assert.equal(u.node,node);
  const restored=decodeGame(encodeGame(g)), ru=restored.state.units.find(p=>p.id===u.id);
  assert.equal(ru.node,restored.state.forage[0],'save preserves active foraging target');
  campRaidAI(g,u,7);
  assert.equal(node.amount,8); assert.ok(node.pressure>0); assert.equal(u.carry,5); assert.equal(u.carryType,'food');
  assert.equal(g.tribe(3).food,0,'carried food is not credited at a distance');
  u.x=camp.x+3;u.z=camp.z;
  campRaidAI(g,u,.1);
  assert.equal(g.tribe(3).food,5); assert.equal(u.carry,0);
  assert.equal(g.popNow(3),population,'camps never manufacture replacements');
});

test('camp provisions last through the opening grace without immunity to food consumption', () => {
  const g=fixture(), bandIds=g.state.units.filter(u=>u.homeCamp!==undefined).map(u=>u.id);
  g.state.units=g.state.units.filter(u=>bandIds.includes(u.id));
  const before=g.tribe(3).food;
  for(let t=0;t<310;t++) { g.state.time=t; g.tickPeople(1); }
  assert.ok(g.tribe(3).food<before,'same food consumption applies');
  assert.ok(g.tribe(3).food>0,'supplies cover the grace period');
  assert.ok(g.state.units.every(u=>u.hp>0));
});

test('raider patrols keep reachable destinations until arrival instead of rerolling every five seconds', () => {
  const g=fixture(),{raider:u}=band(g); g.state.time=400; g.state.conflict='balanced';
  g.tribe(3).food=1000;u.order='hold';u.wanderT=0;
  g.navBudget=4;campRaidAI(g,u,.1);
  assert.equal(u.order,'move');
  const target=[u.tx,u.tz];
  assert.ok(g.walkable(u.tx,u.tz));
  assert.ok(g.workBoard.connected(g,u.x,u.z,u.tx,u.tz));
  g.state.time+=6;u.wanderT=-1;g.navBudget=4;campRaidAI(g,u,.1);
  assert.deepEqual([u.tx,u.tz],target);
});

test('destroying a camp stops gathering and preserves the finite surviving band', () => {
  const g=fixture(),{camp,raider:u}=band(g),count=g.state.units.length;
  camp.hp=0;campRaidAI(g,u,100);
  assert.equal(u.order,'hold');assert.equal(u.node,null);assert.equal(g.state.units.length,count);
});

 test('raider gathering cannot instantly regrow an exhausted patch', () => {
  const g=fixture(),{raider:u}=band(g);
  const node={id:g.id(),kind:'forage',x:u.x,z:u.z,y:u.y,amount:5,maxAmt:5,regenT:0,scale:1,rich:1};
  g.state.forage=[node];g.tribe(3).food=0;campRaidAI(g,u,8);
  assert.equal(node.amount,0);assert.ok(node.regenT>=240);
});

test('spawned sea scouts walk from their landing to damage an undefended village', () => {
  const g=fixture(123456,2), previous=new Set(g.state.units.map(u=>u.id));
  g.spawnRaid();
  const attackers=g.state.units.filter(u=>!previous.has(u.id)&&u.team===3);
  assert.ok(attackers.length>0);
  assert.equal(new Set(attackers.map(u=>`${u.seaRaid.goalX},${u.seaRaid.goalZ}`)).size,1,'landing party shares its approach objective');
  assert.ok(attackers.every(u=>g.walkable(u.x,u.z)));
  g.state.units=attackers;
  g.state.buildings=g.state.buildings.filter(b=>b.team===0);
  g.rebuildWalk();
  const hp=g.state.buildings.reduce((n,b)=>n+b.hp,0);
  for(let step=0;step<3000&&g.state.buildings.reduce((n,b)=>n+b.hp,0)>=hp;step++) {
    g.state.time+=.2;g.navBudget=4;
    for(const u of attackers){u.cd=Math.max(0,u.cd-.2);g.barbarianAI(u,.2);}
    g.updateProjectiles(.2);
  }
  assert.ok(g.state.buildings.reduce((n,b)=>n+b.hp,0)<hp,'landing must result in a physically delivered attack');
});
