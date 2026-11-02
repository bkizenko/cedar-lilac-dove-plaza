import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {finishSeaRaid} from '../src/game/raiders.ts';

// Controlled, ordinary unbuilt-camp topology. Runtime actions receive no gifts.
function fixture(){
 const g=new Game();g.reset(123456,10,{size:1040,layout:'pangaea'});g.enterIsland();g.state.conflict='quiet';g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.world.camps=[{team:0,x:0,z:38}];
 g.state.units=[];g.state.buildings=[];for(const key of ['trees','stones','copper','iron','forage','fish','wildlife'])g.state[key]=[];g.vision.fill(2);g.state.weather='clear';g.state.weatherT=10000;g.clockState=()=>({period:'Day',weather:'Clear · 12°C'});g.state.autoWorkEnabled=false;
 Object.assign(g.tribe(0),{food:40,wood:0,spears:1,bows:0,blades:0});const u=g.spawnUnit('worker',0,38,0);u.selected=true;g.rebuildWalk();return {g,u};
}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;g.step(.1);}assert.deepEqual(g.simulationErrors,[]);}
test('manual militia return cancels a stale raid, physically reaches an unbuilt camp, delivers cargo and returns its finite weapon once',()=>{
 const {g,u}=fixture();assert.equal(g.callToArms(),1);assert.equal(g.tribe(0).spears,0);const hall=g.makeBld('townhall',100,38,1);g.state.buildings.push(hall);g.rebuildWalk();g.issuePillage(hall);drive(g,6);assert.ok(u.x>2);assert.equal(u.pillage,1);
 // This is the resident's existing carried timber at the beginning of return.
 u.carry=7;u.carryType='wood';const timber=g.tribe(0).wood;g.standDown();assert.equal(u.pillage,-1);assert.equal(u.returnAfterCombat,undefined);assert.equal(u.massRaidTarget,undefined);drive(g,120,()=>!u.militia);
 assert.equal(u.type,'worker',JSON.stringify({x:u.x,z:u.z,order:u.order,reason:u.workReason}));assert.equal(u.carry,0);assert.equal(g.tribe(0).wood,timber+7);assert.equal(g.tribe(0).spears,1);assert.equal(u.demobilizing,undefined);assert.ok(Math.hypot(u.x,u.z-38)<4);drive(g,5);assert.equal(g.tribe(0).spears,1);
});
test('automatic local defense stands down at an unbuilt camp after the actual wounded attacker is defeated',()=>{
 const {g,u}=fixture(),foe=g.spawnUnit('spearman',7,38,3);foe.hp=8;foe.order='attack';foe.target=u;g.dealDamage(foe,u);assert.equal(u.militia,true);assert.equal(g.tribe(0).spears,0);drive(g,100,()=>foe.hp<=0&&!u.militia);assert.equal(foe.hp,0);assert.equal(u.type,'worker');assert.equal(g.tribe(0).spears,1);assert.equal(u.pillage,-1);
});
test('sea attack completion preserves a newer commanded camp station; explicit standdown and guard duties remain',()=>{
 const {g,u}=fixture();assert.equal(g.callToArms(),1);g.issueMove(18,38);drive(g,5);g.state.raidCampaign={active:true,adults:1,buildings:0,loss:0};finishSeaRaid(g);assert.equal(u.demobilizing,undefined);assert.equal(u.militia,true);g.standDown();assert.equal(u.demobilizing,true);drive(g,100,()=>!u.militia);assert.equal(u.type,'worker');assert.equal(g.tribe(0).spears,1);
 const guard=g.spawnUnit('spearman',0,38,0);guard.militia=true;guard.conflictIntent='occupy';const escort=g.spawnUnit('spearman',1,38,0);escort.militia=true;escort.escortId=u.id;g.standDown();assert.equal(guard.conflictIntent,'occupy');assert.equal(guard.militia,true);assert.equal(escort.escortId,u.id);assert.equal(escort.militia,true);
});
test('Hunt with weapons cancels a raid and completes real hunting, butchery and finite meat delivery to the camp',()=>{
 const {g,u}=fixture();g.tribe(0).spears=0;g.tribe(0).bows=1;assert.equal(g.callToArms(),1);assert.equal(u.type,'archer');const hall=g.makeBld('townhall',100,38,1);g.state.buildings.push(hall);g.rebuildWalk();g.issuePillage(hall);
 const prey={id:g.id(),species:'goat',x:4,z:38,y:4,hp:2,maxHp:2,facing:0,vx:0,vz:0,wanderT:20,fly:0,scale:1};g.state.wildlife=[prey];g.workBoard.reset();g.assignJob('hunt');assert.equal(u.huntOnly,true);assert.equal(u.pillage,-1);assert.equal(u.returnAfterCombat,undefined);assert.equal(u.node,prey);assert.equal(u.demobilizing,undefined);
 drive(g,160,()=>(g.tribe(0).items?.rawMeat||0)>0);assert.equal(prey.hp,0);const delivered=g.tribe(0).items?.rawMeat||0;assert.ok(delivered>0,JSON.stringify({x:u.x,z:u.z,order:u.order,reason:u.workReason,carry:u.carry,node:u.node?.id}));assert.ok(delivered<=16);assert.equal(g.state.simulationEvents?.totals['food_received:0:food']||0,0,'uncooked catch remains raw');assert.equal(u.militia,true);assert.equal(g.tribe(0).bows,0);assert.equal(g.musicMood(),'peace');g.standDown();drive(g,80,()=>!u.militia);assert.equal(g.tribe(0).bows,1);
});
test('music distinguishes an outbound attack, an actual defense at home, and a completed return',()=>{
 const {g,u}=fixture();assert.equal(g.musicMood(),'peace');assert.equal(g.callToArms(),1);const hall=g.makeBld('townhall',100,38,1);g.state.buildings.push(hall);g.rebuildWalk();g.issuePillage(hall);assert.equal(g.musicMood(),'pillage');const foe=g.spawnUnit('spearman',8,38,3);foe.order='attack';foe.target=u;assert.equal(g.musicMood(),'raid');foe.hp=0;g.standDown();drive(g,100,()=>!u.militia);assert.equal(g.musicMood(),'peace');
});

test('explicit armed hunting keeps a previously borrowed caravan weapon instead of being recalled every frame',()=>{
 const {g,u}=fixture();g.tribe(0).spears=0;g.tribe(0).bows=1;assert.equal(g.callToArms(),1);u.caravanArmed=true;u.visit={phase:'return',wait:0,team:1};const prey={id:g.id(),species:'goat',x:5,z:38,y:4,hp:2,maxHp:2,facing:0,vx:0,vz:0,wanderT:20,fly:0,scale:1};g.state.wildlife=[prey];g.workBoard.reset();g.assignJob('hunt');assert.equal(u.visit,undefined);drive(g,120,()=>(g.tribe(0).items?.rawMeat||0)>0);assert.ok((g.tribe(0).items?.rawMeat||0)>0,JSON.stringify({order:u.order,reason:u.workReason,recalled:u.recalled,node:u.node?.id,militia:u.militia}));assert.equal(u.type,'archer');assert.equal(u.militia,true);assert.equal(g.tribe(0).bows,0);g.standDown();drive(g,80,()=>!u.militia);assert.equal(g.tribe(0).bows,1);
});
