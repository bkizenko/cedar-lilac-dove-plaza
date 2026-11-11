import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {leaderDialogue,chooseLeaderDialogue} from '../src/game/leaderDialogue.ts';
function fixture(){
 const g=new Game();g.reset(123456,2);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.diplomaticReports=[];g.state.diplomaticMessages=[];g.state.tradeIntel=undefined;
 for(const t of g.state.tribes)Object.assign(t,{hostile:false,ally:false,peaceOffer:undefined,peaceTerm:undefined});
 const player=g.spawnUnit('worker',0,0,0),speaker=g.spawnUnit('leader',2,0,1);for(const u of [player,speaker])Object.assign(u,{order:'hold',job:null,jobLock:false,carry:0,carryType:null});Object.assign(player,{x:0,z:0});Object.assign(speaker,{x:2,z:0});g.vision.fill(2);return {g,player,speaker};
}
test('leader conversation has direct contextual replies without querying remote stocks or mutating the world',()=>{
 const {g,player,speaker}=fixture();for(const kind of ['food','wood','stone','copper','iron'])Object.defineProperty(g.tribe(1),kind,{get(){throw Error('remote stock oracle');},configurable:true});
 const before=JSON.stringify(g.state.units),history=JSON.stringify(g.state.lifeHistory);const view=leaderDialogue(g,player.id,speaker.id);assert.equal(view.role,'leader');assert.match(view.reply,/speaking with/);
 const result=chooseLeaderDialogue(g,player.id,speaker.id,'welcome','topic:needs');assert.equal(result.accepted,true);assert.match(result.reply,/no current account/);assert.equal(JSON.stringify(g.state.units),before);assert.equal(JSON.stringify(g.state.lifeHistory),history);
 const ordinary=speaker.type='worker';assert.equal(leaderDialogue(g,player.id,speaker.id).role,'representative');assert.ok(ordinary);
});
test('needs use only delivered dated bands and label stale evidence instead of current hidden stocks',()=>{
 const {g,player,speaker}=fixture();g.state.time=1000;g.state.tradeIntel={version:1,reports:[{observer:0,partner:1,observedAt:100,receivedAt:120,goods:[{kind:'wood',need:'needs',canOffer:false}]}],metrics:{}};
 Object.defineProperty(g.tribe(1),'wood',{get(){throw Error('remote stock oracle');},configurable:true});const view=leaderDialogue(g,player.id,speaker.id,'needs');assert.match(view.reply,/900 seconds old and may be out of date/);assert.match(view.reply,/need for timber/);g.state.time=2000;assert.match(leaderDialogue(g,player.id,speaker.id,'needs').reply,/no current account/);
});
test('conversation exchanges actual carried goods once; changed bundles and distance invalidate old choices',()=>{
 const {g,player,speaker}=fixture();Object.assign(player,{carry:4,carryType:'wood'});Object.assign(speaker,{carry:4,carryType:'food',carryFood:'provisions'});
 const view=leaderDialogue(g,player.id,speaker.id,'trade'),offer=view.choices.find(c=>c.kind==='exchange');assert.ok(offer,view.reply);const initialTotal=player.carry+speaker.carry;
 speaker.carry=3;assert.equal(chooseLeaderDialogue(g,player.id,speaker.id,'trade',offer.id).accepted,false);speaker.carry=4;speaker.x=30;assert.equal(chooseLeaderDialogue(g,player.id,speaker.id,'trade',offer.id).accepted,false);speaker.x=2;
 const exchange=chooseLeaderDialogue(g,player.id,speaker.id,'trade',offer.id);assert.equal(exchange.accepted,true,JSON.stringify(exchange));assert.equal(player.carryType,'food');assert.equal(speaker.carryType,'wood');assert.equal(player.carry+speaker.carry,initialTotal);assert.equal(chooseLeaderDialogue(g,player.id,speaker.id,'trade',offer.id).accepted,false);
});
test('an ordinary representative cannot sign a treaty; actual delivered messenger terms are revalidated and executed',()=>{
 const {g,player,speaker}=fixture();speaker.type='worker';assert.equal(leaderDialogue(g,player.id,speaker.id,'treaties').choices.some(c=>c.kind==='peace'),false);
 const t=g.tribe(1);t.hostile=true;t.peaceOffer={from:1,term:'whitePeace',expires:g.state.time+100};g.state.diplomaticMessages=[{version:1,id:999,team:1,kind:'peaceOffer',term:'whitePeace',phase:'delivered',carrierId:speaker.id,createdAt:g.state.time,account:{}}];
 const view=leaderDialogue(g,player.id,speaker.id,'treaties'),offer=view.choices.find(c=>c.kind==='peace');assert.ok(offer,view.reply);const otherHostile=g.tribe(2).hostile;
 t.peaceOffer.expires=g.state.time;assert.equal(chooseLeaderDialogue(g,player.id,speaker.id,'treaties',offer.id).accepted,false);t.peaceOffer.expires=g.state.time+100;
 assert.equal(chooseLeaderDialogue(g,player.id,speaker.id,'treaties',offer.id).accepted,true);assert.equal(t.hostile,false);assert.equal(g.tribe(2).hostile,otherHostile);assert.equal(t.peaceTerm,'whitePeace');
});
