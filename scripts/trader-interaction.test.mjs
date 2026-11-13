import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {contactActions,performContactAction,robContactIssue} from '../src/game/encounters.ts';
import {isTraderUnit,noteTraderIncident,traderIncidentCounts,setTraderConsequences,TRADER_RULES} from '../src/game/traderInteraction.ts';
import {markStolenLoad,tickStolenCargo} from '../src/game/stolenCargo.ts';
import {captiveIntel} from '../src/game/captiveDealings.ts';
import {societyRelation} from '../src/game/societyRelations.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function ground(g){g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];for(const u of g.state.units)u.y=g.height(u.x,u.z);for(const b of g.state.buildings)b.y=g.height(b.x,b.z);g.rebuildWalk();}
/** Player hall at 0,38; rival hall at 100,38; a trader at 60,52; one player guard at 30,52 (+ optional second guard). */
function fixture(mutate,{guards=1,witness=false}={}){
 const g=new Game();g.reset(123456,2);g.enterIsland();g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',100,38,1)];
 for(const key of ['trees','stones','copper','iron','forage','fish','wildlife'])g.state[key]=[];g.state.autoWorkEnabled=false;g.state.conflict='quiet';g.state.contacts=[];g.state.encounter=undefined;g.state.weather='clear';g.state.weatherT=10000;g.state.visitorTimer=900;
 for(const t of g.state.tribes)Object.assign(t,{hostile:false,ally:false,spears:0,bows:0,blades:0,wood:0,stone:0,copper:0,iron:0,food:40});
 g.spawnUnit('worker',104,45,1).order='hold';// a living home resident keeps the rival society alive
 const scout=g.spawnUnit('worker',54,52,0),trader=g.spawnUnit('worker',60,52,1);const guard=[];for(let i=0;i<guards;i++)guard.push(g.spawnUnit('spearman',30+i*2,52,0));
 scout.selected=true;scout.order='hold';trader.order='hold';trader.homeHall=g.state.buildings[1].id;
 mutate&&mutate(g,trader);let witnessUnit;if(witness){witnessUnit=g.spawnUnit('worker',trader.x+8,trader.z+6,1);witnessUnit.order='hold';witnessUnit.jobLock=true;witnessUnit.maxHp=witnessUnit.hp=5000;}
 ground(g);g.vision.fill(2);return {g,scout,trader,guard,witness:witnessUnit};
}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;g.step(.1);}assert.deepEqual(g.simulationErrors,[]);}
const caravan=(g,t)=>{Object.assign(t,{carry:10,carryType:'food',carryFood:'provisions',itemCargo:{cordage:3},tradeNeedsId:77});g.state.tradeNeeds={version:1,teams:[],offers:[{id:77,from:1,to:0,give:{kind:'food',amount:10},get:{kind:'wood',amount:12},fairGet:12,spread:.3,phase:'outbound',createdAt:0,answerAt:0,hall:{x:0,z:38},reserved:true,carriers:[t.id],escorts:[],ready:[],lines:[{unitId:t.id,kind:'food',amount:10},{unitId:t.id,kind:'cordage',amount:3}],risk:0,trust:0,escortsWanted:0,escortsArmed:0,escortsLost:0,carriersLost:0,paid:false,reason:'',lostAmount:0,lostToParcel:0,needAmount:0,volume:0}],cooldowns:[],receipts:[]};};
const visitor=(g,t)=>{Object.assign(t,{x:10,z:50,carry:12,carryType:'wood',visit:{phase:'waiting',wait:0}});};
const envoy=(g,t)=>{Object.assign(t,{carry:10,carryType:'wood',trade:{},tradeTeam:0});};
const sum=(g,u)=>({food:g.tribe(0).food,wood:g.tribe(0).wood,cordage:g.tribe(0).items?.cordage||0});
const held=(g)=>g.state.units.reduce((n,u)=>n+(u.carry||0)+Object.values(u.itemCargo||{}).reduce((a,b)=>a+(b||0),0),0)+(g.state.droppedCargo?.parcels||[]).reduce((n,p)=>n+p.amount,0);

test('trader kinds are recognised from the errand they are on, not from a flag',()=>{
 for(const [name,m] of [['caravan',caravan],['visitor',visitor],['envoy',envoy]]){const {g,trader}=fixture(m);assert.equal(isTraderUnit(g,trader),true,name);}
 const {g,trader}=fixture();assert.equal(isTraderUnit(g,trader),false,'an ordinary foreign worker is not a trader');
 const f=fixture(caravan);assert.equal(contactActions(f.g,f.trader.id).trader,true);
});

for(const [name,m] of [['need-based caravan carrier',caravan],['visiting trader',visitor],['rival envoy carrier',envoy]])
test(`attack kills a ${name}; cargo becomes finite parcels, war and a witnessed incident follow`,()=>{
 const {g,scout,trader,guard}=fixture(m);const before=held(g);const archer=g.spawnUnit('archer',trader.x-2,trader.z,0);archer.y=4;
 assert.equal(performContactAction(g,'attack',trader.id,scout.id).accepted,true);
 drive(g,60,()=>trader.hp<=0);assert.equal(trader.hp,0);assert.equal(g.tribe(1).hostile,true,'hostile act has diplomatic consequence');
 g.step(.1);const parcels=g.state.droppedCargo?.parcels||[];assert.ok(parcels.length>=1);
 assert.equal(held(g),before,'goods are conserved: they moved from a body to parcels');
 assert.ok(parcels.every(p=>p.originalOwnerTeam===1),'parcels remember the real owner');
});

test('rob takes the exact carried resource and bulk items, marks them stolen, and a robber walks them to a real cache',()=>{
 const {g,scout,trader,guard}=fixture(caravan);Object.assign(guard[0],{caravanArmed:true,militia:true});
 const stock=sum(g),total=held(g),id=trader.id;assert.equal(contactActions(g,id,scout.id).rob.reason,null);
 assert.equal(performContactAction(g,'rob',id,scout.id).accepted,true);assert.equal(trader.carry,10,'nothing moves at the order, only on arrival');
 let marked=false;drive(g,200,()=>{if(g.state.droppedCargo?.marks.some(m=>m.unitId===guard[0].id&&m.owner===1))marked=true;return (g.state.droppedCargo?.ledger.deposited||0)>=13;});
 assert.ok(marked,'the robber carries a cargo mark naming the victim society as owner');
 assert.equal(trader.carry,0);assert.equal(trader.itemCargo,undefined);assert.equal(g.tribe(0).items.cordage,stock.cordage+3);const ledger=g.state.droppedCargo.ledger;assert.equal(ledger.deposited,13);assert.equal(ledger.depositedByFinder,13,'a taker is a finder, never the owner');assert.equal(g.state.simulationEvents?.totals['cargo_delivered:0:food'],10);
 assert.equal(g.tribe(1).hostile,true);assert.equal(trader.hp,trader.maxHp,'a robbery is not a killing');
 assert.equal(g.state.droppedCargo?.marks.some(m=>m.unitId===guard[0].id)||false,false,'mark clears on deposit');
});

test('robbing refuses an empty-handed person, a protected child and a switched-off world, with the reason shown',()=>{
 let {g,trader}=fixture();assert.match(robContactIssue(g,trader.id),/nothing to take/);
 ({g,trader}=fixture(caravan));trader.maturesAt=g.state.time+100;assert.match(robContactIssue(g,trader.id),/Children/);
 ({g,trader}=fixture(caravan));setTraderConsequences(g,false);assert.match(robContactIssue(g,trader.id),/switched off/);
});

test('owner pursuit also follows a robber carrying only bulk items, and a broken walk home resumes',()=>{
 const {g,scout,trader,guard}=fixture();const robber=guard[0];Object.assign(robber,{x:20,z:50,y:4,itemCargo:{cordage:3},order:'hold'});
 markStolenLoad(g,robber,1);assert.equal(g.state.droppedCargo.marks.length,1);
 const defender=g.spawnUnit('worker',30,50,1);defender.y=4;defender.order='hold';
 tickStolenCargo(g,1);const chase=g.state.droppedCargo.trips.find(t=>t.phase==='chase');assert.ok(chase,'an owner adult is dispatched after an items-only robber');assert.equal(chase.raiderId,robber.id);assert.equal(chase.owner,1);
 g.state.droppedCargo.trips=[];delete defender.cargoRecoveryId;delete robber.cargoRecoveryId;robber.order='hold';g.state.time+=10;tickStolenCargo(g,1);
 assert.ok(g.state.droppedCargo.trips.some(t=>t.unitId===robber.id&&t.phase==='return'),'the robber resumes its walk to a real cache');
});

test('capture takes an unarmed trader into custody with the knowledge snapshot they carried; interrogation yields only that',()=>{
 const {g,scout,trader,guard}=fixture(caravan,{guards:1});Object.assign(guard[0],{caravanArmed:true,militia:true});
 g.state.observedSettlements=[{version:1,observer:1,owner:2,siteId:9,x:-120,z:70,observedAt:1,witnessId:5,active:true}];
 g.tribe(1).alive=true;const id=trader.id;assert.equal(contactActions(g,id,scout.id).capture.reason,null);
 assert.equal(performContactAction(g,'capture',id,scout.id).accepted,true);
 drive(g,200,()=>trader.prisoner?.phase==='custody');assert.equal(trader.prisoner?.phase,'custody');
 const k=trader.prisoner.knows;assert.ok(k.trade,'capture-time snapshot has trade knowledge');assert.equal(k.trade.offer.give,'food');assert.equal(k.trade.route.team,0);
 assert.equal(trader.carry,10,'custody keeps the goods on the same body (no free goods)');
 assert.equal(contactActions(g,id,scout.id).interrogate.reason,null);
 assert.equal(performContactAction(g,'interrogate',id,scout.id).accepted,true);
 const snapshot=JSON.stringify(k);g.tribe(1).food=999;g.tribe(1).wood=999; // live changes at home must not leak
 drive(g,80,()=>captiveIntel(g,0).some(i=>i.prisonerId===id));
 const intel=captiveIntel(g,0).find(i=>i.prisonerId===id);assert.ok(intel,'questioning finishes');assert.equal(JSON.stringify(trader.prisoner.knows),snapshot);assert.notEqual(intel.knowledge.homeFood,1000);
 const lines=contactActions(g,id,scout.id).interrogate.report;assert.ok(lines.some(l=>/Carrying terms: 10 food for 12 wood/.test(l)),lines.join('|'));
 assert.match(contactActions(g,id,scout.id).interrogate.reason,/Already questioned/);
 assert.equal(contactActions(g,id,scout.id).ransom.reason,null);
 const ransom=performContactAction(g,'ransom',id,scout.id);assert.equal(ransom.accepted,true);assert.match(contactActions(g,id,scout.id).ransom.reason,/already pending/);
 assert.equal(performContactAction(g,'release-prisoner',id,scout.id).accepted,true);
});

test('an armed adult who is not a caravan escort cannot be captured; a healthy escort fights on; a beaten one can yield',()=>{
 const {g,trader,scout}=fixture(caravan,{guards:2});Object.assign(trader,{type:'spearman',militia:true});
 assert.match(contactActions(g,trader.id,scout.id).capture.reason,/armed adult must be defeated/);
 Object.assign(trader,{caravanArmed:true});assert.match(contactActions(g,trader.id,scout.id).capture.reason,/fights on until it is beaten/);
 trader.hp=trader.maxHp*.4;assert.equal(contactActions(g,trader.id,scout.id).capture.reason,null);
});

test('a witness carries the news home on foot; only then does the victim society change attitude',()=>{
 const {g,scout,trader,guard,witness}=fixture(visitor,{witness:true});const archer=g.spawnUnit('archer',trader.x-2,trader.z,0);archer.y=4;
 const before=societyRelation(g,1,0).grievance;
 assert.equal(performContactAction(g,'attack',trader.id,scout.id).accepted,true);
 drive(g,40,()=>trader.hp<=0);assert.equal(trader.hp,0);
 const counts=traderIncidentCounts(g);assert.equal(counts.pending,1,'an incident is recorded, news not yet delivered');
 drive(g,600,()=>traderIncidentCounts(g).delivered>0);
 assert.equal(traderIncidentCounts(g).delivered,1);assert.ok(societyRelation(g,1,0).grievance>=before+TRADER_RULES.grievance.killed-1e-9);
});

test('an unwitnessed killing is noticed late and weakly',()=>{
 const {g,scout,trader}=fixture(visitor);const archer=g.spawnUnit('archer',trader.x-2,trader.z,0);archer.y=4;
 performContactAction(g,'attack',trader.id,scout.id);drive(g,40,()=>trader.hp<=0);assert.equal(trader.hp,0);
 assert.equal(traderIncidentCounts(g).pending,1);const before=societyRelation(g,1,0).grievance;
 g.state.time+=TRADER_RULES.suspicionSeconds+1;g.state.paused=false;g.step(.1);
 assert.equal(traderIncidentCounts(g).suspected,1);const after=societyRelation(g,1,0).grievance;assert.ok(after>before&&after<before+TRADER_RULES.grievance.killed,'weaker than a delivered report');
});

test('consequences can be switched off: no incident, older Demand still works',()=>{
 const {g,scout,trader}=fixture(visitor);setTraderConsequences(g,false);const archer=g.spawnUnit('archer',trader.x-2,trader.z,0);archer.y=4;
 performContactAction(g,'attack',trader.id,scout.id);drive(g,40,()=>trader.hp<=0);assert.equal(g.state.traderIncidents.list.length,0);
});

test('incidents and trade knowledge survive a save round trip; corrupt ones are rejected; old saves without them load',()=>{
 const {g,scout,trader,guard}=fixture(caravan);Object.assign(guard[0],{caravanArmed:true,militia:true});
 performContactAction(g,'capture',trader.id,scout.id);drive(g,200,()=>trader.prisoner?.phase==='custody');
 performContactAction(g,'interrogate',trader.id,scout.id);
 const w=g.spawnUnit('worker',70,50,1);w.y=4;w.order='hold';const bystander=g.state.units.find(u=>u.team===1&&u.id!==trader.id);
 const probe=g.spawnUnit('worker',75,50,1);probe.y=4;probe.visit={phase:'waiting',wait:0};probe.carry=4;probe.carryType='wood';
 noteTraderIncident(g,probe,'robbed');
 const saved=JSON.parse(JSON.stringify(encodeGame(g))),load=decodeGame(saved);ground(load);
 assert.equal(load.state.traderIncidents.list.length,2);assert.ok(load.state.units.find(u=>u.id===trader.id).prisoner.knows.trade);
 const bad=JSON.parse(JSON.stringify(saved));bad.state.traderIncidents.list[0].kind='bogus';assert.throws(()=>decodeGame(bad));
 const old=JSON.parse(JSON.stringify(saved));delete old.state.traderIncidents;const oldLoad=decodeGame(old);assert.equal(oldLoad.state.traderIncidents,undefined);
 const stripped=JSON.parse(JSON.stringify(saved));delete stripped.state.units.find(u=>u.id===trader.id).prisoner.knows.trade;assert.ok(decodeGame(stripped));
});

test('a beaten caravan escort is captured with the weapon it carried: the weapon goes into a guard\'s hands, the stores are untouched',()=>{
 const {g,trader,scout,guard}=fixture(caravan,{guards:2});Object.assign(trader,{type:'spearman',militia:true,caravanArmed:true});trader.hp=trader.maxHp*.4;
 const spears=g.tribe(1).spears,cap=performContactAction(g,'capture',trader.id,scout.id);assert.equal(cap.accepted,true,cap.reason);
 drive(g,200,()=>trader.prisoner?.phase==='custody');assert.equal(trader.prisoner?.phase,'custody');
 assert.equal(trader.type,'worker');assert.equal(trader.militia,false);assert.equal(trader.caravanArmed,undefined);
 const holders=g.state.units.filter(u=>u.weaponCargo?.spears);assert.equal(holders.length,1,'exactly one guard holds the taken spear');assert.equal(holders[0].weaponCargo.spears,1);assert.equal(holders[0].team,0);
 assert.equal(g.tribe(1).spears,spears,'the loan never touched anyone\'s stock: it was already out');assert.equal(trader.carry,10,'cargo stays on the same body');
});

function gearTrader(g,t){
 Object.assign(t,{x:10,z:50,visit:{phase:'waiting',wait:0},weaponCargo:{spears:2,bows:1},farmTool:'stoneHoe',farmToolCondition:.8,haulage:'pack',packAnimal:{id:g.id(),hp:30,maxHp:30,scale:1,species:'goat',hunger:0,thirstSeconds:0,foodConsumed:0,waterConsumedLiters:0}});
 const armorId=g.id(),projectId=g.id();g.state.armor={version:1,assets:[{id:armorId,team:1,kind:'paddedTorso',condition:.9,projectId,createdAt:0,holder:{kind:'carried',id:t.id,x:t.x,z:t.z}}],metrics:{crafted:1,damagePrevented:0}};t.armorCargoId=armorId;
}
test('rob takes the gear a trader carries: weapon bundles, armor, a farm tool and the led animal move exactly once to the robber',()=>{
 const {g,scout,trader,guard}=fixture(gearTrader);const robber=guard[0];
 const before={spears:2,bows:1},animalId=trader.packAnimal.id;assert.equal(contactActions(g,trader.id,scout.id).rob.reason,null,'gear alone is takeable');
 const rob=performContactAction(g,'rob',trader.id,scout.id);assert.equal(rob.accepted,true,rob.reason);
 drive(g,120,()=>!trader.packAnimal);
 assert.deepEqual(robber.weaponCargo,before,'the exact bundles moved');assert.equal(trader.weaponCargo,undefined);
 assert.equal(robber.armorCargoId!==undefined||g.state.armor.assets[0].holder.id===robber.id,true);assert.equal(g.state.armor.assets.length,1,'one armor asset, not copied');assert.equal(g.state.armor.assets[0].holder.id,robber.id);assert.equal(g.state.armor.assets[0].team,0);
 assert.equal(trader.farmTool,undefined);assert.equal(g.state.farmToolCargo.tools.length,1,'one tool record');assert.equal(g.state.farmToolCargo.tools[0].holder.unitId,robber.id);assert.equal(g.state.farmToolCargo.tools[0].condition,.8,'condition kept');assert.equal(g.state.farmToolCargo.tools[0].originalOwnerTeam,1);
 assert.equal(robber.packAnimal?.id,animalId);assert.equal(trader.packAnimal,undefined);assert.equal(trader.haulage,undefined);
 assert.equal(g.tribe(1).hostile,true);assert.equal(trader.hp,trader.maxHp,'a robbery is not a killing');
 assert.equal(traderIncidentCounts(g).pending+traderIncidentCounts(g).delivered+traderIncidentCounts(g).suspected>=1,true,'the robbery is on the ledger');
 // a second robbery finds nothing left; nothing is duplicated by saving
 assert.match(robContactIssue(g,trader.id),/nothing to take/);
 const g2=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(g2.state.units.filter(u=>u.packAnimal?.id===animalId).length,1);
});
test('a robber without room takes what fits and leaves the rest on the trader; a farmer\'s own tool is not fair game',()=>{
 const {g,scout,trader,guard}=fixture(gearTrader);guard[0].weaponCargo={blades:12};// 24 of 40 load units already carried
 g.state.units.find(u=>u===guard[0]).armorCargoId=777;g.state.units.find(u=>u===guard[0]).farmToolCargoId=888;
 performContactAction(g,'rob',trader.id,scout.id);drive(g,120,()=>trader.weaponCargo?.spears!==2);
 const total=(guard[0].weaponCargo.spears||0)+(trader.weaponCargo?.spears||0);assert.equal(total,2,'no spear vanished or duplicated');
 const farmer=g.spawnUnit('worker',70,52,1);farmer.farmTool='stoneHoe';farmer.y=4;assert.match(robContactIssue(g,farmer.id),/nothing to take/);
});
