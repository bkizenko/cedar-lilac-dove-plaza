import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {equipCaravan,recoverCaravanEquipment} from '../src/game/caravans.ts';
import {visitorAI} from '../src/game/visitors.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){
 const g=new Game();g.reset(345);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[g.makeBld('townhall',0,40,1),g.makeBld('townhall',80,40,0)];g.state.units=[];
 const u=g.spawnUnit('worker',10,40,1);g.tribe(1).spears=1;g.tribe(1).bows=0;g.tribe(1).blades=0;g.tribe(1).hostile=false;g.rebuildWalk();g.vision.fill(2);return {g,u};
}
test('foreign traders borrow actual local weapons without healing, duplication or remote refunds',()=>{
 const {g,u}=fixture();u.hp=20;assert.equal(equipCaravan(g,u),true);assert.equal(g.tribe(1).spears,0);assert.equal(u.hp,20);assert.equal(equipCaravan(g,u),false);
 const r=decodeGame(encodeGame(g)),v=r.state.units.find(p=>p.id===u.id);assert.equal(v.caravanArmed,true);assert.equal(v.type,'spearman');
 u.x=100;recoverCaravanEquipment(g,u);assert.equal(g.tribe(1).spears,0);assert.equal(u.recalled,true);
 u.x=10;recoverCaravanEquipment(g,u);recoverCaravanEquipment(g,u);assert.equal(g.tribe(1).spears,1);assert.equal(u.type,'worker');assert.equal(u.hp,20);
});
test('missing equipment, distant stores and death never manufacture or refund a weapon',()=>{
 const {g,u}=fixture();u.x=100;assert.equal(equipCaravan(g,u),false);u.x=10;g.tribe(1).spears=0;assert.equal(equipCaravan(g,u),false);
 g.tribe(1).spears=1;equipCaravan(g,u);u.hp=0;recoverCaravanEquipment(g,u);assert.equal(g.tribe(1).spears,0);
 const raw=encodeGame(g);raw.state.units.find(p=>p.id===u.id).caravanArmed='yes';assert.throws(()=>decodeGame(raw));
});
test('an armed visiting trader reaches the player through the real dispatcher and returns goods and equipment',()=>{
 const {g,u}=fixture();equipCaravan(g,u);u.visit={phase:'outbound',wait:0};u.order='move';u.carry=12;u.carryType='wood';u.x=88;u.z=40;
 g.state.paused=false;g.step(.1);assert.equal(u.visit.phase,'waiting');assert.equal(u.type,'spearman');
 u.visit.phase='return';u.order='move';const before=g.tribe(1).wood;
 for(let i=0;i<1500&&u.visit;i++){g.state.time+=.1;g.navBudget=10;visitorAI(g,u,.1);}
 assert.equal(u.visit,undefined);assert.equal(u.carry,0);assert.equal(g.tribe(1).wood,before+12);
 recoverCaravanEquipment(g,u);assert.equal(g.tribe(1).spears,1);assert.equal(u.type,'worker');
});

test('escorts follow real cargo, survive saves, and return home after delivery or death',async()=>{
 const {sendTradeEscort,escortAI}=await import('../src/game/caravans.ts');const {g}=fixture();
 const carrier=g.spawnUnit('worker',65,40,0),guard=g.spawnUnit('worker',90,40,0);g.tribe(0).spears=1;g.tribe(0).bows=0;g.tribe(0).blades=0;guard.selected=true;g.callToArms();
 carrier.carry=10;carrier.carryType='wood';carrier.tradeTeam=1;carrier.order='return';
 assert.equal(sendTradeEscort(g,carrier.id),true);assert.equal(guard.escortId,carrier.id);assert.equal(g.tribe(0).spears,0);
 const r=decodeGame(encodeGame(g));assert.equal(r.state.units.find(p=>p.id===guard.id).escortId,carrier.id);
 const start=guard.x;for(let i=0;i<80;i++){g.navBudget=10;escortAI(g,guard,.1);}assert.ok(guard.x<start);assert.ok(Math.hypot(guard.x-carrier.x,guard.z-carrier.z)<=5);
 carrier.carry=0;carrier.tradeTeam=0;escortAI(g,guard,.1);assert.equal(guard.escortId,undefined);assert.equal(guard.recalled,true);assert.equal(guard.stationOnArrival,true);
 carrier.carry=10;carrier.tradeTeam=1;guard.recalled=undefined;guard.order='hold';assert.equal(sendTradeEscort(g,carrier.id),true);carrier.hp=0;escortAI(g,guard,.1);assert.equal(guard.recalled,true);
});
test('direct orders cancel escort duty and frontier guards are never silently taken',async()=>{
 const {sendTradeEscort}=await import('../src/game/caravans.ts');const {g}=fixture(),carrier=g.spawnUnit('worker',65,40,0),guard=g.spawnUnit('worker',90,40,0);
 guard.selected=true;g.tribe(0).spears=1;g.tribe(0).bows=0;g.tribe(0).blades=0;g.callToArms();carrier.carry=10;carrier.tradeTeam=1;
 const post=g.makeBld('cornerstone',100,40,0);g.state.buildings.push(post);assert.equal(sendTradeEscort(g,carrier.id),false);
 post.hp=0;assert.equal(sendTradeEscort(g,carrier.id),true);g.issueMove(95,70);assert.equal(guard.escortId,undefined);
});

test('escort duty resumes after a local fight without discarding its charge or equipment',async()=>{
 const {sendTradeEscort,escortAI}=await import('../src/game/caravans.ts');const {emergencyResponse}=await import('../src/game/defense.ts');const {g}=fixture();
 const carrier=g.spawnUnit('worker',85,40,0),guard=g.spawnUnit('worker',90,40,0);guard.selected=true;g.tribe(0).spears=1;g.tribe(0).bows=0;g.tribe(0).blades=0;g.callToArms();
 carrier.carry=10;carrier.carryType='wood';carrier.tradeTeam=1;assert.equal(sendTradeEscort(g,carrier.id),true);
 g.spawnUnit('spearman',92,40,3);const foe=g.state.units.at(-1);g.vision.fill(2);
 assert.equal(emergencyResponse(g,guard,.1),true);assert.equal(guard.target,foe);assert.equal(guard.escortId,carrier.id);
 foe.hp=0;g.state.time+=11;emergencyResponse(g,guard,.1);assert.equal(escortAI(g,guard,.1),true);
 assert.equal(guard.escortId,carrier.id);assert.equal(guard.militia,true);assert.equal(carrier.carry,10);assert.equal(g.tribe(0).spears,0);
});
