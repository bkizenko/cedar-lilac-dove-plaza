import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {massRaid,massRaidAI} from '../src/game/massRaid.ts';
import {demobilizationAI} from '../src/game/demobilization.ts';
import {emergencyResponse} from '../src/game/defense.ts';
import {finishSeaRaid} from '../src/game/raiders.ts';
import {recoverCaravanEquipment} from '../src/game/caravans.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function fixture(){
 const g=new Game();g.reset(123456,3);g.enterIsland();g.world.heights.fill(4);
 g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',100,38,1)];
 g.state.conflict='quiet';g.state.weather='clear';g.state.paused=false;g.vision.fill(2);g.rebuildWalk();
 const armed=g.spawnUnit('worker',0,50,0);armed.selected=true;Object.assign(g.tribe(0),{spears:4,bows:0,blades:0});g.callToArms();armed.selected=false;
 const unarmed=g.spawnUnit('worker',8,50,0);unarmed.selected=true;
 return {g,armed,unarmed,hall:g.state.buildings[1]};
}
test('town hall mass raid sends armed adults without selection and leaves unarmed workers alone',()=>{
 const {g,armed,unarmed,hall}=fixture();const before={order:unarmed.order,x:unarmed.tx,z:unarmed.tz};
 assert.equal(massRaid(g,hall.id),1);assert.equal(armed.order,'attackmove');assert.equal(armed.pillage,1);
 assert.equal(armed.returnAfterCombat,true);assert.deepEqual({order:unarmed.order,x:unarmed.tx,z:unarmed.tz},before);
 assert.equal(g.tribe(1).hostile,false,'war starts on arrival, not across the map');
 assert.equal(massRaid(g,g.state.buildings[0].id),0);g.vision.fill(0);assert.equal(massRaid(g,hall.id),0);
});
test('loaded militia unload real cargo before marching, including across a save',()=>{
 let {g,armed,hall}=fixture();armed.x=60;armed.carry=7;armed.carryType='wood';const wood=g.tribe(0).wood;
 const id=armed.id;massRaid(g,hall.id);assert.equal(armed.massRaidTarget,hall.id);assert.equal(g.tribe(0).wood,wood);
 g=decodeGame(encodeGame(g));g.world.heights.fill(4);g.rebuildWalk();armed=g.state.units.find(u=>u.id===id);
 for(let i=0;i<2000&&armed.massRaidTarget!==undefined;i++){g.state.time+=.1;g.navBudget=10;massRaidAI(g,armed,.1);}
 assert.equal(armed.massRaidTarget,undefined);assert.equal(armed.order,'attackmove');assert.equal(armed.pillage,1);
 assert.equal(armed.carry,0);assert.equal(g.tribe(0).wood,wood+7);
});
test('armed traders keep their borrowed weapon when explicitly dispatched in a mass raid',()=>{
 const {g,armed,hall}=fixture();armed.caravanArmed=true;const spears=g.tribe(0).spears;
 massRaid(g,hall.id);recoverCaravanEquipment(g,armed);
 assert.equal(armed.militia,true);assert.equal(armed.order,'attackmove');assert.equal(g.tribe(0).spears,spears);
 hall.hp=0;demobilizationAI(g,armed,.1);recoverCaravanEquipment(g,armed);
 assert.equal(armed.type,'worker');assert.equal(g.tribe(0).spears,spears+1);
});
test('completed offensive raid returns militia and weapons without a stand-down click',()=>{
 const {g,armed,hall}=fixture();const spears=g.tribe(0).spears;massRaid(g,hall.id);armed.x=65;hall.hp=0;
 for(let i=0;i<2000&&armed.militia;i++){g.state.time+=.1;g.navBudget=10;demobilizationAI(g,armed,.1);}
 assert.equal(armed.type,'worker');assert.equal(armed.militia,false);assert.equal(g.tribe(0).spears,spears+1);
 demobilizationAI(g,armed,.1);assert.equal(g.tribe(0).spears,spears+1);
});
test('pre-armed defenders automatically return to work when the local alarm ends',()=>{
 const {g,armed}=fixture();const spears=g.tribe(0).spears;const enemy=g.spawnUnit('spearman',armed.x+4,armed.z,3);
 emergencyResponse(g,armed,.1);assert.ok(armed.emergency);enemy.hp=0;g.state.time+=11;
 emergencyResponse(g,armed,.1);demobilizationAI(g,armed,.1);
 assert.equal(armed.type,'worker');assert.equal(g.tribe(0).spears,spears+1);
});
test('a finished sea raid stands down unused local reserves but preserves an offensive raid',()=>{
 const {g,armed,hall}=fixture();const other=g.spawnUnit('spearman',0,50,0);other.militia=true;other.pillage=1;other.returnAfterCombat=true;
 g.state.raidCampaign={active:true,adults:3,buildings:1,loss:0};finishSeaRaid(g);demobilizationAI(g,armed,.1);
 assert.equal(armed.type,'worker');assert.equal(other.pillage,hall.team);assert.equal(other.demobilizing,undefined);
});
test('peace cancels pending loaded mass raids and explicit new orders cancel automatic return',()=>{
 const {g,armed,hall}=fixture();armed.carry=7;armed.carryType='wood';massRaid(g,hall.id);g.agreeTruce(1);
 assert.equal(armed.massRaidTarget,undefined);demobilizationAI(g,armed,.1);assert.equal(armed.pillage,-1);
 armed.selected=true;g.issueMove(50,50);assert.equal(armed.returnAfterCombat,undefined);assert.equal(armed.demobilizing,undefined);
});
