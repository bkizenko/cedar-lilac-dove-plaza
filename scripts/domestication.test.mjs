import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginHerdTaming,penPlacesReserved} from '../src/game/husbandry.ts';
import {searchForWildGoats,cancelGoatSearch} from '../src/game/animalOrders.ts';
import {domesticationReport,DOMESTICATION_RULES as R,validDomesticationState} from '../src/game/domestication.ts';
import {herdRules} from '../src/game/animalSpecies.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {orderExploration} from '../src/game/explorationOrders.ts';
import {supplyDrops,supplyApproach,supplyReached} from '../src/game/campAnchor.ts';
import {insidePen} from '../src/game/penGeometry.ts';

// Authored finite initial people, bait, completed pen and wild individuals.
// Natural generated terrain; subsequent movement, handling and arrivals use Game.step.
function fixture(species='goat',seed=42,sequence){
 const g=new Game();g.reset(seed,2);g.enterIsland();g.state.units=[];g.state.buildings=[];
 for(const k of ['trees','forage','stones','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.time=100;g.state.weather='clear';g.state.autoWorkEnabled=false;g.state.growthPolicy='stable';g.state.paused=false;g.state.nightWork=true;delete g.state.survivalVersion;
 g.raidT=g.seaT=g.calamityT=1e8;g.vision.fill(2);
 Object.assign(g.tribe(0),{food:1000,foodLots:{provisions:1000},wood:100});
 const c=g.campOf(0);let point;
 for(let r=20;r<90&&!point;r+=4)for(let i=0;i<24&&!point;i++){const x=c.x+Math.cos(i*Math.PI/12)*r,z=c.z+Math.sin(i*Math.PI/12)*r;if(!g.placementIssue('pen',x,z))point={x,z};}
 assert.ok(point);const hall=g.makeBld('townhall',c.x,c.z,0),pen=g.makeBld('pen',point.x,point.z,0);pen.w=pen.d=16;g.state.buildings=[hall,pen];g.rebuildWalk();
 let at;for(let r=8;r<30&&!at;r+=2)for(let i=0;i<24&&!at;i++){const x=c.x+Math.cos(i*Math.PI/12)*r,z=c.z+Math.sin(i*Math.PI/12)*r;if(g.walkable(x,z)&&g.height(x,z)>g.waterAt(x,z)+.5)at={x,z};}assert.ok(at);const u=g.spawnUnit('worker',at.x,at.z,0);Object.assign(u,{order:'hold',jobLock:false});
 let wildPoint;for(let r=10;r<26&&!wildPoint;r+=2)for(let i=0;i<24&&!wildPoint;i++){const x=pen.x+Math.cos(i*Math.PI/12)*r,z=pen.z+Math.sin(i*Math.PI/12)*r;if(g.walkable(x,z)&&g.height(x,z)>g.waterAt(x,z)+.5&&g.workBoard.connected(g,u.x,u.z,x,z)&&g.workBoard.connected(g,x,z,pen.x,pen.z))wildPoint={x,z};}
 assert.ok(wildPoint);let id=g.id();
 // Choose an explicitly authored initial individual for outcome-specific regression.
 // No live roll, RNG, body or terrain is changed after an attempt is admitted.
 if(sequence){const draw=(id,i)=>{let n=(seed^Math.imul(id,0x45d9f3b)^Math.imul(i,0x27d4eb2d))>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return((n^(n>>>16))>>>0)/4294967296;};while(!(draw(id,1)>.95&&(sequence==='refuse-twice'?draw(id,2)>.95:draw(id,2)<.4)))id=g.id();}
 const a={id,species,x:wildPoint.x,y:g.height(wildPoint.x,wildPoint.z),z:wildPoint.z,facing:0,vx:0,vz:0,wanderT:10000,hp:24,maxHp:24,fly:0,scale:1,...(species==='sheep'?{fleece:{version:1,units:2,grownUnits:2,shearedUnits:0}}:{})};if(species==='sheep')g.state.sheepVersion=1;g.state.wildlife=[a];return{g,u,pen,a};
}
function drive(g,seconds,done){g.state.paused=false;const end=g.state.time+seconds;for(let steps=0;steps<Math.ceil(seconds*10)&&g.state.time<end&&!done();steps++){g.step(.2);assert.deepEqual(g.simulationErrors,[]);if(g.state.paused||g.state.ended)break;}assert.ok(done(),JSON.stringify({time:g.state.time,paused:g.state.paused,ended:g.state.ended,report:domesticationReport(g),animals:g.state.livestock,units:g.state.units.map(u=>({id:u.id,x:u.x,z:u.z,order:u.order,reason:u.workReason,work:u.tamingWork})),queue:g.state.buildings.find(b=>b.type==='pen')?.goatSearch}));}
const outcome=(g,u)=>!u.tamingWork?.trial||u.tamingWork.trial.resolved==='success';

test('new paid terms survive pause and strict reload; actual completion matches the frozen outcome',()=>{
 let{g,u,pen,a}=fixture();const food=g.tribe(0).food;
 assert.equal(beginHerdTaming(g,pen.id,u.id),true);assert.equal(g.tribe(0).food,food-6);const terms=structuredClone(u.tamingWork.trial);
 drive(g,80,()=>u.tamingWork?.progress>1);g.clearSelect();g.selectEntity(u);g.haltSelected();assert.equal(u.tamingWork.paused,true);
 const progress=u.tamingWork.progress,paid=g.tribe(0).food;g=decodeGame(encodeGame(g));u=g.state.units.find(p=>p.id===u.id);pen=g.state.buildings.find(b=>b.id===pen.id);
 assert.deepEqual(u.tamingWork.trial,{...terms,handlingSeconds:progress});assert.equal(beginHerdTaming(g,pen.id,u.id),true);assert.equal(g.tribe(0).food,paid);
 drive(g,240,()=>outcome(g,u));const report=domesticationReport(g);assert.equal(report.paidAttempts,1);assert.equal(report.recent[0].outcome,terms.roll<terms.chance?'success':'refused');
 assert.equal(report.baitSpent,6);assert.equal(validDomesticationState(g.state),true);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 const text=JSON.stringify(report);assert.doesNotMatch(text,/chance|roll|temperament|\"x\"|\"z\"/);
});
test('species difficulty is explicit while payment and real individual temperament are preserved',()=>{
 const chances=[];for(const species of ['goat','sheep','horse','cattle']){const{g,u,pen,a}=fixture(species),food=g.tribe(0).food;assert.equal(beginHerdTaming(g,pen.id,u.id,species),true);chances.push(u.tamingWork.trial.chance);assert.equal(g.tribe(0).food,food-herdRules(species).tamingFood);assert.equal(a.domestication.attempts,1);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));}
 assert.ok(chances[0]>chances[1]&&chances[1]>chances[2]&&chances[2]>chances[3]);
});
test('interruption retains paid terms; actual death releases the wild animal and reserved place',()=>{
 const{g,u,pen,a}=fixture('horse');assert.equal(beginHerdTaming(g,pen.id,u.id,'horse'),true);const terms=structuredClone(u.tamingWork.trial),food=g.tribe(0).food;
 g.interruptMission(u);assert.equal(u.tamingWork.paused,true);assert.equal(beginHerdTaming(g,pen.id,u.id,'horse'),true);assert.deepEqual(u.tamingWork.trial,terms);assert.equal(g.tribe(0).food,food);
 u.hp=0;g.step(.2);assert.equal(u.tamingWork,undefined);assert.equal(penPlacesReserved(g,pen.id),0);assert.equal(g.state.wildlife.find(p=>p.id===a.id).hp>0,true);assert.equal(domesticationReport(g).abandoned,1);assert.ok(g.tribe(0).food<=food);assert.equal(domesticationReport(g).baitSpent,12);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('legacy already paid unmarked handling remains guaranteed with its original progress and price',()=>{
 const{g,u,pen,a}=fixture('horse');u.tamingWork={animal:a.id,pen:pen.id,progress:0,paused:true};u.order='hold';const food=g.tribe(0).food;assert.equal(beginHerdTaming(g,pen.id,u.id,'horse'),true);assert.equal(g.tribe(0).food,food);assert.equal(u.tamingWork.trial,undefined);
 drive(g,300,()=>g.state.livestock?.some(p=>p.id===a.id&&insidePen(pen,p.x,p.z,.25))&&!u.tamingWork);
 assert.ok(g.tribe(0).food<=food);assert.equal(domesticationReport(g).paidAttempts,0);assert.equal(a.domestication,undefined);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('trial snapshots and individual history reject forged or unbounded saves',()=>{
 const{g,u,pen}=fixture();const before=JSON.stringify(g.state);assert.equal(domesticationReport(g).paidAttempts,0);assert.equal(JSON.stringify(g.state),before,'old-state reports never initialize trial metadata');assert.equal(beginHerdTaming(g,pen.id,u.id),true);const saved=encodeGame(g);
 for(const edit of [s=>s.units.find(p=>p.id===u.id).tamingWork.trial=null,s=>s.units.find(p=>p.id===u.id).tamingWork.trial.roll=.12345,s=>s.units.find(p=>p.id===u.id).tamingWork.trial.paidFood=0,s=>s.units.find(p=>p.id===u.id).tamingWork.trial.chance=2,s=>s.wildlife[0].domestication.temperament=.12345,s=>s.tribes[0].domestication.paidAttempts=0]){const raw=structuredClone(saved);edit(raw.state);assert.throws(()=>decodeGame(raw));}
});

test('actual refusal spends finite bait then paid retry handles and escorts the same animal after strict reload',()=>{
 let{g,u,pen,a}=fixture('goat',42,'refuse-then-success');const aid=a.id,uid=u.id,pid=pen.id,food=g.tribe(0).food;
 assert.equal(beginHerdTaming(g,pid,uid),true);assert.ok(u.tamingWork.trial.roll>=u.tamingWork.trial.chance);
 drive(g,240,()=>domesticationReport(g).refusals===1);assert.equal(u.tamingWork,undefined);assert.equal(penPlacesReserved(g,pid),0);assert.equal(g.state.wildlife.find(v=>v.id===aid).hp>0,true);assert.equal(g.state.livestock?.some(v=>v.id===aid)||false,false);
 assert.ok(g.tribe(0).food<=food-6);assert.equal(domesticationReport(g).baitSpent,6);assert.equal(beginHerdTaming(g,pid,uid),false,'refused animal cooldown or actual return prevents instant repurchase');
 const lastSeen={x:a.x,z:a.z};g=decodeGame(encodeGame(g));u=g.state.units.find(v=>v.id===uid);pen=g.state.buildings.find(v=>v.id===pid);a=g.state.wildlife.find(v=>v.id===aid);
 drive(g,180,()=>g.state.time>=a.domestication.cooldownUntil&&!u.recalled&&u.order!=='return');
 // The real animal can wander out of sight while the handler returns. Revisit
 // only the actual last observed refusal point before asking for another trial.
 g.clearSelect();g.selectEntity(u);g.issueMove(lastSeen.x,lastSeen.z);drive(g,180,()=>g.visibleAt(a.x,a.z)&&!['move','return'].includes(u.order));
 const before=g.tribe(0).food;assert.equal(beginHerdTaming(g,pid,uid),true,g.state.banner);assert.equal(g.tribe(0).food,before-6);assert.equal(u.tamingWork.trial.attempt,2);assert.ok(u.tamingWork.trial.roll<u.tamingWork.trial.chance);
 drive(g,300,()=>domesticationReport(g).arrivals===1);const herd=g.state.livestock.filter(v=>v.id===aid);assert.equal(herd.length,1);assert.ok(insidePen(pen,herd[0].x,herd[0].z,.25));assert.equal(g.state.wildlife.some(v=>v.id===aid),false);
 assert.deepEqual(herd[0].domestication.recent.map(r=>r.outcome),['refused','success']);assert.equal(u.domesticationPractice.completed,2);assert.equal(domesticationReport(g).baitSpent,12);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('one goat search stops after two actual refusals without a stuck capture or third bait debit',()=>{
 const{g,u,pen,a}=fixture('goat',42,'refuse-twice');const food=g.tribe(0).food;
 assert.equal(searchForWildGoats(g,pen.id).accepted,true);drive(g,600,()=>pen.goatSearch.state==='exhausted');
 assert.equal(pen.goatSearch.reason,'refused');assert.equal(pen.goatSearch.paidTrials,2);assert.equal(domesticationReport(g).refusals,2);assert.equal(domesticationReport(g).paidAttempts,2);assert.equal(g.state.wildlife.some(v=>v.id===a.id&&v.hp>0),true);assert.equal(u.tamingWork,undefined);assert.equal(penPlacesReserved(g,pen.id),0);
 const spent=g.tribe(0).food;drive(g,60,()=>g.state.time>=pen.goatSearch.nextAttemptAt+20);assert.equal(domesticationReport(g).paidAttempts,2);assert.ok(g.tribe(0).food<=food-12);assert.equal(domesticationReport(g).baitSpent,12);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('actual scouting packet pays bait once and cancelled paused capture retains original actor and paid trial',()=>{
 const{g,u,pen,a}=fixture();const drop=supplyDrops(g,0).find(d=>d.kind!=='camp'),spot=supplyApproach(g,u,drop);assert.ok(spot);
 g.clearSelect();g.selectEntity(u);g.issueMove(spot.x,spot.z);drive(g,120,()=>supplyReached(g,u,drop,spot)&&u.order!=='move');
 // Controlled controller substage: the existing Explore executor loads actual
 // provisions; the pen owns this scout just as attemptGoatSearch assigns it.
 assert.equal(orderExploration(g,u,{x:a.x,z:a.z}),null);u.goatSearchPen=pen.id;pen.goatSearch={requestedAt:g.state.time,nextAttemptAt:g.state.time,state:'searching'};
 const loaded=u.expedition.food,used=u.expedition.foodUsed;drive(g,180,()=>!!u.tamingWork?.trial);
 assert.equal(u.tamingWork.animal,a.id);assert.equal(pen.goatSearch.paidTrials,1);
 assert.ok(Math.abs((loaded-u.expedition.food)-(u.expedition.foodUsed-used)-6)<1e-6,'bait is exact packed food, distinct from meals');
 const trial=structuredClone(u.tamingWork.trial),packet=structuredClone(u.expedition),food=g.tribe(0).food;
 assert.equal(cancelGoatSearch(g,pen.id),true);assert.equal(u.tamingWork.paused,true);assert.deepEqual(u.tamingWork.trial,trial);assert.deepEqual(u.expedition,packet);assert.equal(g.tribe(0).food,food);
 const copy=decodeGame(encodeGame(g)),same=copy.state.units.find(v=>v.id===u.id);assert.deepEqual(same.tamingWork.trial,trial);assert.equal(same.expedition.food,packet.food);assert.equal(same.tamingWork.animal,a.id);
});
