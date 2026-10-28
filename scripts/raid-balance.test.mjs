import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {seaRaidStrength,raidReadiness,finishSeaRaid,canScheduleSeaRaid} from '../src/game/raiders.ts';
import {demobilizationAI} from '../src/game/demobilization.ts';
import {emergencyResponse} from '../src/game/defense.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function fixture(){
 const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);
 g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0)];g.state.conflict='quiet';g.state.paused=false;
 g.state.forage=[{id:g.id(),kind:'forage',x:14,y:4,z:50,amount:100,maxAmt:100,regenT:0,scale:1,rich:1}];
 g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();
 const u=g.spawnUnit('worker',0,50,0);u.selected=true;g.tribe(0).spears=4;g.tribe(0).bows=0;g.tribe(0).blades=0;
 return {g,u};
}

test('raid waves increase gradually and plateau, with strict population and defense caps',()=>{
 const counts=[1,3,5,7,9,11,99,10000].map(w=>seaRaidStrength(40,0,.6,w,.5).count);
 assert.ok(counts[0]<counts[3]);
 for(let i=1;i<counts.length;i++){assert.ok(counts[i]>=counts[i-1]);assert.ok(counts[i]-counts[i-1]<=1);}
 assert.equal(counts[5],counts[7]);
 for(const dangerous of [false,true])for(const pop of [1,5,12,40,150])for(const wave of [1,2,20,10000]){
  const r=seaRaidStrength(pop,5,1,wave,1,dangerous,4);
  assert.ok(r.count<=4&&r.count<=Math.max(1,Math.ceil(pop*(dangerous?.6:.45))));assert.ok(r.condition<=.95);
 }
 assert.ok(seaRaidStrength(40,2,1,11,.5,false,20,.5).count<seaRaidStrength(40,2,1,11,.5,false,20,0).count);
});

test('children, wounds and distant missions cannot inflate usable raid defenses',()=>{
 const {g,u}=fixture();for(let i=0;i<10;i++)g.spawnUnit('worker',i,50,0);
 g.tribe(0).spears=20;const healthy=raidReadiness(g);
 for(const p of g.state.units)p.hp=p.maxHp*.2;
 assert.ok(raidReadiness(g).cap<healthy.cap);
 const injured=raidReadiness(g);for(let i=0;i<20;i++){const child=g.spawnUnit('worker',0,50,0);child.maturesAt=g.state.time+500;}
 assert.deepEqual(raidReadiness(g),injured);
 u.envoy={team:1,kind:'trade',phase:'outbound',talk:0};assert.ok(raidReadiness(g).cap<=injured.cap);
});

test('retreating bands block overlapping raids and losses grant a saved recovery interval',()=>{
 let {g}=fixture();g.state.conflict='balanced';g.state.time=1300;g.tribe(0).food=0;
 const enemy=g.spawnUnit('spearman',90,50,3);enemy.seaRaid={x:90,z:50,goalX:0,goalZ:38,phase:'retreat',thinkAt:0,departAt:1500};
 g.state.raidCampaign={active:true,adults:5,buildings:2,loss:0};g.state.raidT=0;
 finishSeaRaid(g);assert.equal(g.state.raidCampaign.active,true);assert.equal(canScheduleSeaRaid(g),false);
 enemy.hp=0;finishSeaRaid(g);assert.equal(g.state.raidCampaign.active,false);assert.equal(g.state.raidCampaign.loss,.8);assert.ok(g.state.raidT>=1200);
 const respite=g.state.raidT;g=decodeGame(encodeGame(g));finishSeaRaid(g);assert.equal(g.state.raidT,respite,'completion cannot repeatedly reset respite');
 let spawned=0;g.spawnRaid=()=>spawned++;g.tickRaiders(.2);assert.equal(spawned,0);assert.ok(g.state.raidT<respite);
});

test('remote militia physically return cargo, disarm once and resume actual food production after loading',()=>{
 let {g,u}=fixture();const hp=u.hp;g.callToArms();const weapons=g.tribe(0).spears;
 u.x=75;u.z=50;u.carry=7;u.carryType='wood';const wood=g.tribe(0).wood;g.standDown();
 assert.ok(u.militia&&u.demobilizing);assert.equal(g.tribe(0).wood,wood);assert.equal(g.tribe(0).spears,weapons);
 const id=u.id;g=decodeGame(encodeGame(g));u=g.state.units.find(p=>p.id===id);g.world.heights.fill(4);g.rebuildWalk();
 for(let i=0;i<2000&&u.demobilizing;i++){g.state.time+=.1;g.navBudget=10;demobilizationAI(g,u,.1);}
 assert.equal(u.demobilizing,undefined);assert.equal(u.type,'worker');assert.equal(u.carry,0);assert.equal(g.tribe(0).wood,wood+7);
 assert.equal(g.tribe(0).spears,weapons+1);assert.equal(u.hp,hp);g.standDown();assert.equal(g.tribe(0).spears,weapons+1);
 g.state.paused=false;g.tribe(0).food=20;g.setLaborPriority('food');
 for(let i=0;i<1600&&g.tribe(0).food<=20;i++)g.step(.1);
 assert.ok(g.tribe(0).food>20,'the stood-down adult gathers and delivers real food');
 assert.equal(g.state.paused,false);
});

test('standing down keeps weapons during immediate danger, then resumes after the alarm',()=>{
 const {g,u}=fixture();g.callToArms();const stock=g.tribe(0).spears;
 const enemy=g.spawnUnit('spearman',u.x+4,u.z,3);g.standDown();assert.equal(u.militia,true);assert.equal(g.tribe(0).spears,stock);
 emergencyResponse(g,u,.1);assert.ok(u.emergency);enemy.hp=0;g.state.time+=11;emergencyResponse(g,u,.1);demobilizationAI(g,u,.1);
 assert.equal(u.militia,false);assert.equal(g.tribe(0).spears,stock+1);
});

test('new orders cancel queued stand-down, and invalid saved campaign state is rejected',()=>{
 const {g,u}=fixture();g.callToArms();u.x=70;g.standDown();assert.equal(u.demobilizing,true);
 g.issueMove(80,60);assert.equal(u.demobilizing,undefined);assert.equal(u.militia,true);
 const raw=encodeGame(g);raw.state.raidCampaign={active:true,adults:-1,buildings:1,loss:0};assert.throws(()=>decodeGame(raw));
 delete raw.state.raidCampaign;raw.state.units[0].demobilizing='yes';assert.throws(()=>decodeGame(raw));
});

test('new settlers cannot hide raid casualties from the recovery policy',()=>{
 const {g,u}=fixture();const home=g.state.buildings[0];
 g.state.raidCampaign={active:true,adults:1,buildings:1,people:[u.id],sites:[home.id],loss:0};
 u.hp=0;g.spawnUnit('worker',0,50,0);finishSeaRaid(g);
 assert.equal(g.state.raidCampaign.loss,1);assert.ok(g.state.raidT>=1380);
 const r=decodeGame(encodeGame(g));assert.deepEqual(r.state.raidCampaign.people,[u.id]);
});
