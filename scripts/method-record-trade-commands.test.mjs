import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return n(s.startsWith('@/')?new URL('../src/'+s.slice(2)+'.ts',import.meta.url).href:s,c);}});
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {workRuntime} from '../src/game/workRuntime.ts';
const {Engine}=await import('../src/game/engine.ts');
// Controlled initial actors, visible peaceful store, stock and record. This tests
// typed admission/cancellation/transport only, not an earned purchase journey.
function fixture(){
 const g=new Game();g.reset(42,2);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.world.ecology=undefined;
 for(const k of ['trees','forage','stones','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.time=100;g.state.units=[];g.state.buildings=[];g.vision.fill(2);g.state.autoWorkEnabled=false;
 const home=g.makeBld('townhall',0,20,0),seller=g.makeBld('townhall',50,20,1);g.state.buildings=[home,seller];
 const u=g.spawnUnit('worker',-12,20,0),foreign=g.spawnUnit('worker',62,20,1);u.order=foreign.order='hold';u.jobLock=foreign.jobLock=false;
 Object.assign(g.tribe(0),{wood:30});Object.assign(g.tribe(1),{hostile:false,alive:true,compactUntil:1000});
 const record={id:g.id(),source:{recipe:'twistCordage',makerId:foreign.id,makerName:foreign.name,team:1,teamName:g.tribe(1).name,successfulBatches:3,demonstratedAt:20},authoredAt:30,authorProjectId:g.id(),team:1,holder:{kind:'cache',team:1,buildingId:seller.id,x:seller.x,z:seller.z},deliveredAt:40,studies:[]};
 g.state.methodRecords={version:1,records:[record]};g.rebuildWalk();return{g,u,foreign,record};
}
const buy=(r,u)=>({kind:'method-record-purchase',recordId:r.id,unitId:u.id});
function unchanged(g,c){const before=JSON.stringify(g.state),r=applyEngineCommand(g,c);assert.equal(r.accepted,false,JSON.stringify(c));assert.ok(r.reason);assert.equal(JSON.stringify(g.state),before);}
test('typed purchase/cancel reject malformed shapes and unavailable or foreign original people without mutation',()=>{
 const{g,u,foreign,record}=fixture();
 for(const c of [null,{},[],{kind:'method-record-purchase'},buy(record,{id:0}),buy(record,{id:NaN}),{...buy(record,u),recordId:-1},{...buy(record,u),extra:true},{kind:'cancel-method-record-purchase'},{kind:'cancel-method-record-purchase',unitId:u.id,recordId:record.id}]){assert.equal(isEngineDispatchCommand(c),false);unchanged(g,c);}
 for(const c of [buy(record,foreign),{...buy(record,u),recordId:g.state.nextId+10},buy(record,{id:g.state.nextId+10}),{kind:'cancel-method-record-purchase',unitId:foreign.id},{kind:'cancel-method-record-purchase',unitId:u.id}])unchanged(g,c);
});
test('typed unpaid intent owns the exact actor/record and cancellation creates no goods or knowledge',()=>{
 const{g,u,foreign,record}=fixture(),before=structuredClone({wood:g.tribe(0).wood,sellerWood:g.tribe(1).wood,record,carry:u.carry,x:u.x,z:u.z});
 const result=applyEngineCommand(g,buy(record,u),{selectedUnitIds:[u.id]});assert.equal(result.accepted,true,result.reason);
 assert.deepEqual(u.methodRecordTrade,{recordId:record.id,sellerTeam:1,priceWood:4,startedAt:100,phase:'loading'});
 assert.equal(workRuntime(g).activeJob(u.id)?.kind,'method-record-trade');assert.equal(workRuntime(g).reservations.used(`method-record:${record.id}:pickup`),1);
 assert.deepEqual({wood:g.tribe(0).wood,sellerWood:g.tribe(1).wood,record,carry:u.carry,x:u.x,z:u.z},before);
 const pending=structuredClone(u.methodRecordTrade);unchanged(g,{kind:'cancel-method-record-purchase',unitId:foreign.id});assert.deepEqual(u.methodRecordTrade,pending);
 const canceled=applyEngineCommand(g,{kind:'cancel-method-record-purchase',unitId:u.id});assert.equal(canceled.accepted,true,canceled.reason);assert.equal(u.methodRecordTrade,undefined);assert.equal(workRuntime(g).activeJob(u.id),undefined);assert.equal(workRuntime(g).reservations.used(`method-record:${record.id}:pickup`),0);
 assert.deepEqual({wood:g.tribe(0).wood,sellerWood:g.tribe(1).wood,record,carry:u.carry,x:u.x,z:u.z},before);
});
test('dispatch replies retain original epoch and captured selection across a village swap',async()=>{
 const{g,u,record}=fixture(),replacement=fixture().g,received=[];let finish;
 g.clearSelect();g.selectEntity(u);const replacementBefore=JSON.stringify(replacement.state);
 const engine={game:g,dispatchEpoch:7,commandReady:true,workerHost:{dispatch:(command,selection)=>{received.push({command,selection});return new Promise(resolve=>finish=resolve);}},readModelCache:new Map()};
 const pending=Engine.prototype.dispatchRaw.call(engine,buy(record,u));
 engine.game=replacement;engine.dispatchEpoch=8;
 finish({accepted:true,reason:'Original session reply',sequence:1,stateRevision:1});const reply=await pending;
 assert.equal(reply.epoch,7,'caller can discard this stale reply');assert.deepEqual(received,[{command:buy(record,u),selection:{selectedUnitIds:[u.id],selectedBuildingId:undefined,selectedBoatId:undefined}}]);assert.equal(JSON.stringify(replacement.state),replacementBefore,'old transport reply never executes against the replacement village');
});
