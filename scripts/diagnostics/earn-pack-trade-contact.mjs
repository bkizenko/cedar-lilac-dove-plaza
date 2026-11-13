// Genuine discovery only: all destinations are ordinary exploration targets or
// settlements physically witnessed by the player's actual living people.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {encodeGame,decodeGame} from '../../src/game/persistence.ts';
import {orderExploration} from '../../src/game/explorationOrders.ts';
import {expeditionHome,expeditionAtOwnCache} from '../../src/game/expeditionProvisions.ts';
import {answerEncounter} from '../../src/game/encounters.ts';
import {refreshSettlementSites} from '../../src/game/settlementKnowledge.ts';
import {knownSettlementSite,localSettlementHall,recordTradeMeeting} from '../../src/game/barter.ts';
const file=process.argv[2]??'/tmp/hearthwild-pack-expedition-earned.json',limit=Number(process.argv[3]??360),output=process.argv[4]??'/tmp/hearthwild-pack-trade-contact-home.json';
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=readFileSync(file),inputHash=hash(bytes);let g=decodeGame(JSON.parse(bytes));
assert.ok(limit>0&&limit<=900,'Bounded discovery limit is 1–900 ordinary simulation seconds');
const actorId=6223,animalId=6354,u=g.state.units.find(u=>u.id===actorId&&u.team===0&&u.hp>0);assert.ok(u);assert.equal(u.packAnimal?.id,animalId);assert.equal(u.expedition,undefined);assert.equal(u.packJourneySupplies,undefined);
const terrain=hash(JSON.stringify(Array.from(g.world.heights))),start=g.state.time;let stage='ordinary exploration',greetings=0,partner,report,lastLog=start;
const select=()=>{g.clearSelect();g.selectEntity(u);};
function step(){if(g.state.encounter){answerEncounter(g,'greet');greetings++;}const before=g.state.time;g.state.paused=false;g.step(.2);assert.ok(g.state.time>before,'Simulation stopped; no pending state is overridden');assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);assert.ok(u.hp>0,'Actual handler lost');assert.equal(u.packAnimal?.id,animalId,'The original horse must survive without substitution');if(g.state.time-lastLog>=30){lastLog=g.state.time;console.log(JSON.stringify({stage,time:g.state.time,elapsed:g.state.time-start,actor:{x:u.x,z:u.z,order:u.order,reason:u.workReason},known:(g.state.observedSettlements||[]).filter(m=>m.observer===0&&m.active).map(m=>({owner:m.owner,siteId:m.siteId})),greetings}));}}
function drive(seconds,done){const end=g.state.time+seconds;while(g.state.time<end&&!done())step();assert.ok(done(),`Bounded ${stage} did not complete: ${u.workReason}`);}
try{
 select();assert.equal(orderExploration(g,u),null);
 while(g.state.time-start<limit){refreshSettlementSites(g);const fact=(g.state.observedSettlements||[]).find(m=>m.observer===0&&m.owner!==0&&m.owner!==3&&m.active);if(fact){partner=fact.owner;break;}if(!u.expedition&&!u.exploreAfterDelivery&&!u.recalled&&expeditionAtOwnCache(g,u)){const issue=orderExploration(g,u);assert.equal(issue,null,issue);}step();}
 if(partner===undefined)throw Error('No settlement physically witnessed within the bounded ordinary exploration; no hidden destination used');
 stage='walking to physically witnessed meeting site';const known=knownSettlementSite(g,partner);assert.ok(known);const local=localSettlementHall(g,u,partner),site=local??known,point=g.interactionSpot(u,site);assert.ok(point,'Observed settlement needs an actual reachable entrance');select();g.issueMove(point.x,point.z);drive(180,()=>!!localSettlementHall(g,u,partner)&&g.buildingWorkReached(u,localSettlementHall(g,u,partner)));
 g.haltSelected();report=recordTradeMeeting(g,partner,u);assert.ok(report,'Actual local meeting produced no willing trade report');assert.ok(report.offers.some(d=>d.give!=='food'&&d.get!=='food'),'No actual non-food terms available');g.state.paused=true;writeFileSync('/tmp/hearthwild-pack-trade-actual-meeting.json',JSON.stringify(encodeGame(g)));
 stage='physical home return with discovered offers';const home=expeditionHome(g,u);assert.ok(home);select();g.issueMove(home.spot.x,home.spot.z);drive(300,()=>!!expeditionAtOwnCache(g,u)&&!u.expedition&&!u.packJourneySupplies);g.haltSelected();g.state.paused=true;assert.equal(hash(JSON.stringify(Array.from(g.world.heights))),terrain);writeFileSync(output,JSON.stringify(encodeGame(g)));const metadata={scope:'Actual exploration and witnessed physical meeting; no authored partner or hidden destination',input:file,inputHash,actorId,animalId,partner,report,greetings,startedAt:start,finishedAt:g.state.time,output};writeFileSync(output.replace(/\.json$/,'.meta.json'),JSON.stringify(metadata,null,2));console.log(JSON.stringify({status:'earned',...metadata}));
}catch(error){g.state.paused=true;writeFileSync('/tmp/hearthwild-pack-trade-discovery-blocked.json',JSON.stringify(encodeGame(g)));console.log(JSON.stringify({status:'blocked',stage,reason:error.message,elapsed:g.state.time-start,actor:{id:u.id,x:u.x,z:u.z,order:u.order,reason:u.workReason},greetings,checkpoint:'/tmp/hearthwild-pack-trade-discovery-blocked.json'}));process.exitCode=2;}
assert.equal(hash(readFileSync(file)),inputHash,'The original earned horse checkpoint is byte-identical');
