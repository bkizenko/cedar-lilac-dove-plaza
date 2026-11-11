import test from 'node:test';import assert from 'node:assert/strict';
import {tradeDialogView} from '../src/ui/h/tradeModel.ts';
const player={name:'Ashfield',held:[{kind:'grain',amount:42},{kind:'wood',amount:900},{kind:'pottery',amount:3},{kind:'wood',amount:100}],offers:[{kind:'grain',amount:20}],wants:[{kind:'copper',amount:5}],knowledge:'exact'};
const partner={name:'Riverfolk',held:[{kind:'copper',amount:12},{kind:'fish',amount:30}],offers:[{kind:'copper',amount:5}],wants:[{kind:'grain',amount:20},{kind:'iron',amount:2}],knowledge:'observed'};
const base={player,partner,leader:{name:'Oda',society:'Riverfolk',relation:30},proposal:{give:[{kind:'grain',amount:20}],get:[{kind:'copper',amount:5}]}};
test('chips show the goods actually held, merged, with icon and compact quantity',()=>{
 const v=tradeDialogView(base);const wood=v.player.held.chips.find(c=>c.kind==='wood');assert.equal(wood.amount,1000);assert.equal(wood.value,'1k');assert.equal(wood.icon,'wood');
 assert.equal(v.player.held.chips.filter(c=>c.kind==='wood').length,1);assert.deepEqual(v.player.held.chips.map(c=>c.kind),['wood','grain','pottery']);
 assert.equal(v.partner.heldNote,'Last seen holding');assert.deepEqual(v.partner.held.chips.map(c=>c.kind),['fish','copper'].sort((a,b)=>({fish:30,copper:12}[b]-({fish:30,copper:12}[a]))));
 const many=tradeDialogView({...base,player:{...player,held:Array.from({length:9},(_,i)=>({kind:'k'+i,amount:i+1}))}});assert.equal(many.player.held.chips.length,6);assert.equal(many.player.held.more,3);
 const none=tradeDialogView({...base,player:{...player,held:[{kind:'grain',amount:0},{kind:'wood',amount:NaN}]}});assert.equal(none.player.held.chips.length,0);
});
test('offers and wants are shown per side; goods the player lacks are marked short',()=>{
 const v=tradeDialogView(base);assert.deepEqual(v.partner.offers.chips.map(c=>c.kind),['copper']);
 assert.equal(v.partner.wants.chips.find(c=>c.kind==='iron').state,'short','player holds no iron');assert.notEqual(v.partner.wants.chips.find(c=>c.kind==='grain').state,'short');
 assert.equal(v.player.offers.chips[0].kind,'grain');assert.equal(v.player.wants.chips[0].kind,'copper');
});
test('leader context uses only the real relation value; unknown stays unknown',()=>{
 assert.equal(tradeDialogView({...base,leader:{...base.leader,relation:undefined}}).leader.stance,'unknown');assert.equal(tradeDialogView({...base,leader:{...base.leader,relation:undefined}}).leader.relationText,'Relation not yet known');
 assert.equal(tradeDialogView({...base,leader:{...base.leader,relation:NaN}}).leader.stance,'unknown');
 for(const [rel,st] of[[-60,'hostile'],[-20,'wary'],[0,'neutral'],[50,'friendly']])assert.equal(tradeDialogView({...base,leader:{...base.leader,relation:rel}}).leader.stance,st);
 assert.equal(tradeDialogView(base).leader.relationText,'Relation 30');
 const unk=tradeDialogView({...base,partner:{...partner,knowledge:'unknown',held:[{kind:'copper',amount:99}]}});assert.equal(unk.partner.held.chips.length,0,'no invented stock when stores are unknown');
});
test('a good deal is acceptable; exactly one blocker, the most severe, otherwise',()=>{
 const ok=tradeDialogView(base);assert.equal(ok.blocker,undefined);assert.ok(ok.accept.enabled&&ok.counter.enabled&&ok.decline.enabled);
 const short=tradeDialogView({...base,proposal:{give:[{kind:'grain',amount:50}],get:[{kind:'copper',amount:5}]}});
 assert.match(short.blocker.reason,/hold 42 of the 50 grain/);assert.equal(short.accept.enabled,false);assert.equal(short.accept.reason,short.blocker.reason);assert.ok(short.counter.enabled,'can still counter a shortage');assert.equal(short.proposal.give.chips[0].state,'short');
 const multi=tradeDialogView({...base,limits:{routeBlocked:'No safe road to Riverfolk',carryCapacity:1},proposal:{give:[{kind:'grain',amount:50}],get:[{kind:'copper',amount:5}]}});
 assert.equal(multi.blocker.reason,'No safe road to Riverfolk','route outranks shortage and capacity');assert.equal(multi.counter.enabled,false);
 const war=tradeDialogView({...base,limits:{atWar:true,routeBlocked:'x'}});assert.match(war.blocker.reason,/at war/);
 const host=tradeDialogView({...base,leader:{...base.leader,relation:-70}});assert.match(host.blocker.reason,/refuses to deal/);assert.equal(host.counter.enabled,false);assert.ok(host.decline.enabled);
 assert.equal(tradeDialogView({...base,limits:{hardBlock:'Their envoy is away'},leader:{...base.leader,relation:-70}}).blocker.reason,'Their envoy is away','sim hard block first');
});
test('proposal edge cases: none, one-sided, same good, partner stock only enforced when known exactly, carry capacity',()=>{
 assert.equal(tradeDialogView({...base,proposal:null}).blocker.reason,'Choose goods to offer or ask for');assert.equal(tradeDialogView({...base,proposal:null}).proposal,null);
 assert.match(tradeDialogView({...base,proposal:{give:[],get:[{kind:'copper',amount:1}]}}).blocker.reason,/offering nothing/);
 assert.match(tradeDialogView({...base,proposal:{give:[{kind:'grain',amount:1}],get:[]}}).blocker.reason,/asking for nothing/);
 assert.match(tradeDialogView({...base,proposal:{give:[{kind:'grain',amount:5}],get:[{kind:'grain',amount:5}]}}).blocker.reason,/same good/);
 const big={give:[{kind:'grain',amount:20}],get:[{kind:'copper',amount:50}]};
 assert.equal(tradeDialogView({...base,proposal:big}).accept.enabled,true,'observed stock is not a guarantee, so no block');
 assert.match(tradeDialogView({...base,partner:{...partner,knowledge:'exact'},proposal:big}).blocker.reason,/hold only 12 copper/);
 assert.match(tradeDialogView({...base,limits:{carryCapacity:10},proposal:big}).blocker.reason,/can move 10, not 50/);
 assert.equal(tradeDialogView({...base,limits:{counterAllowed:false}}).counter.enabled,false);
 assert.deepEqual(tradeDialogView(base),tradeDialogView(base));
});
