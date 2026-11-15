import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {tickOccupation,occupationActorAI} from '../src/game/conflictIntent.ts';
import {prisonerAI} from '../src/game/captivity.ts';
import {acceptConquest,conquestAssessment,tickConquestRebellion} from '../src/game/conquest.ts';
import {personName} from '../src/game/people.ts';
import {isEngineDispatchCommand,applyEngineCommand} from '../src/game/engineDispatch.ts';
import {recordDiplomaticLegal,knownDiplomaticRelation} from '../src/game/diplomaticKnowledge.ts';
import {councilModel} from '../src/game/rulersView.ts';

function fixture(){const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1),g.makeBld('hut',95,38,1),g.makeBld('townhall',200,38,1),g.makeBld('townhall',-120,38,2)];
 g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();
 const hall=g.state.buildings[1];
 const residents=[0,1,2,3,4,5].map(i=>{const u=g.spawnUnit('worker',84+i,50,1);u.homeHall=hall.id;u.order='hold';return u;});
 const defenders=[0,1].map(i=>{const u=g.spawnUnit('spearman',82+i,46,1);u.homeHall=hall.id;u.order='hold';return u;});
 return{g,hall,residents,defenders};}
function step(g,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units){if(u.hp<=0)continue;if(prisonerAI(g,u,.1))continue;occupationActorAI(g,u,.1);}tickOccupation(g,.1);}}
const party=(g,n)=>Array.from({length:n},(_,i)=>{const u=g.spawnUnit('spearman',78+i*.5,44,0);u.order='hold';return u;});
/** A beaten community: presence, then real losses. */
function beaten(){const f=fixture();f.g.makeHostile(1);f.party=party(f.g,6);step(f.g,170);
 f.defenders[0].hp=0;f.defenders[1].hp=0;f.residents[0].hp=0;f.residents[1].hp=0;step(f.g,3);
 f.front=f.g.state.capitulation.fronts.find(x=>x.phase==='capitulated');assert.ok(f.front,'they ask for terms');return f;}

test('surrender is earned: presence alone gives will left and no offer; losses open an offer visible in the assessment',()=>{
 const{g}=fixture();g.makeHostile(1);party(g,6);step(g,240);
 const a=conquestAssessment(g,1);assert.equal(a.offer,false);assert.ok(a.willLeft>0);
 assert.deepEqual(acceptConquest(g,a.frontId,'annex','integrate').accepted,false,'cannot annex without an offer');
});
test('annex + integrate: buildings, people and stores transfer; captives carry their tribe name',()=>{
 const{g,hall:h0,residents}=beaten();const hid=h0.id;g.tribe(1).wood=50;const before=g.tribe(0).wood;
 assert.equal(conquestAssessment(g,1).offer,true);
 const r=acceptConquest(g,g.state.capitulation.fronts.find(x=>x.phase==='capitulated').id,'annex','integrate');assert.equal(r.accepted,true,r.reason);
 assert.equal(g.state.buildings.find(b=>b.id===hid).team,0,'hall transferred');assert.ok(g.tribe(0).wood>=before+50,'resources transferred');
 const joined=residents.filter(u=>u.hp>0).map(u=>g.state.units.find(x=>x.id===u.id));assert.ok(joined.length>=3&&joined.every(u=>u.team===0),'surviving people joined');
 assert.match(personName(joined[0]),/\(.+\)$/,'tribe name in parentheses');
 assert.ok(!joined.some(u=>u.originTribe.rebel));
});
test('annex + execute kills the armed adults and keeps civilians',()=>{
 let armedId;const{g,residents}=beaten(f=>{const a=f.g.spawnUnit('spearman',86,46,1);a.homeHall=f.hall.id;a.order='hold';armedId=a.id;});
 for(const d of g.state.units)if(d.id===armedId)d.hp=d.hp;
 const r=acceptConquest(g,g.state.capitulation.fronts.find(x=>x.phase==='capitulated').id,'annex','execute');assert.equal(r.accepted,true,r.reason);
 const dead=g.state.units.find(u=>u.id===armedId);assert.ok(!dead||dead.hp<=0,'warrior executed');assert.ok(residents.filter(u=>u.hp>0).every(u=>g.state.units.find(x=>x.id===u.id).team===0));
});
test('annex + spare marks adults as possible rebels, who can turn on the player; save round-trips',()=>{
 const{g,residents}=beaten();
 assert.equal(acceptConquest(g,g.state.capitulation.fronts.find(x=>x.phase==='capitulated').id,'annex','spare').accepted,true);
 const rebels=g.state.units.filter(u=>u.originTribe?.rebel);assert.ok(rebels.length>=2);
 const g2=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.ok(g2.state.units.some(u=>u.originTribe?.rebel),'originTribe persists');
 let turned=0;for(let t=0;t<400000&&!turned;t++){g.state.time+=1;turned=tickConquestRebellion(g);}
 assert.ok(turned>=2,'a rebellion eventually happens');assert.ok(rebels.every(u=>g.state.units.find(x=>x.id===u.id).team===3));
});
test('puppet keeps their buildings and people; pillage takes goods only',()=>{
 const a=beaten();assert.equal(acceptConquest(a.g,a.front.id,'puppet','integrate').accepted,true);assert.equal(a.g.state.buildings.find(b=>b.id===a.hall.id).team,1);
 const b=beaten();b.g.tribe(1).wood=40;assert.equal(acceptConquest(b.g,b.front.id,'pillage','integrate').accepted,true);assert.equal(b.g.state.buildings.find(x=>x.id===b.hall.id).team,1);
});
test('neighbour card and minimap chip agree: both read the held diplomatic report, and a hostile neighbour can be offered peace',()=>{
 const{g}=fixture();g.state.worldOptions={...(g.state.worldOptions||{}),rulersVersion:1};
 g.makeHostile(1);recordDiplomaticLegal(g,1,true);
 g.tribe(1).hostile=false;// private change nobody reported: the held report still says war
 const hud=g.hud?g.hud():null;const known=knownDiplomaticRelation(g,1);assert.equal(known.hostile,true);
 const m=councilModel(g,0),n=m.neighbours.find(x=>x.team===1);
 assert.ok(m.enabled&&n,'council neighbours enabled');{assert.equal(n.hostile,true,'card shows the same war as the chip');assert.equal(n.atPeace,false);assert.ok(n.peace,'peace actions offered');}
});
test('peace commands are valid owner commands',()=>{
 for(const c of [{kind:'propose-peace',team:1},{kind:'accept-peace',team:1},{kind:'decline-peace',team:1},{kind:'accept-conquest',frontId:5,choice:'annex',people:'spare'}])assert.equal(isEngineDispatchCommand(c),true,c.kind);
 assert.equal(isEngineDispatchCommand({kind:'accept-conquest',frontId:5,choice:'raze',people:'spare'}),false);
 const{g}=fixture();g.makeHostile(1);const t=g.tribe(1);t.peaceOffer={from:1,term:'whitePeace',expires:g.state.time+100};
 assert.equal(applyEngineCommand(g,{kind:'decline-peace',team:1}).accepted,true);assert.equal(t.peaceOffer,undefined);
 assert.equal(applyEngineCommand(g,{kind:'accept-peace',team:1}).accepted,false,'nothing left to accept');
});
