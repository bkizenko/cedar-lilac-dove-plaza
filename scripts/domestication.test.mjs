import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginHerdTaming,penPlacesReserved} from '../src/game/husbandry.ts';
import {searchForWildGoats,cancelGoatSearch} from '../src/game/animalOrders.ts';
import {domesticationReport,DOMESTICATION_RULES as R,validDomesticationState} from '../src/game/domestication.ts';
import {herdRules} from '../src/game/animalSpecies.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {insidePen} from '../src/game/penGeometry.ts';

// Authored finite initial people, bait, completed pen and wild individuals.
// Natural generated terrain; subsequent movement, handling and arrivals use Game.step.
function fixture(species='goat',seed=42){
 const g=new Game();g.reset(seed,2);g.enterIsland();g.state.units=[];g.state.buildings=[];
 for(const k of ['trees','forage','stones','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.time=100;g.state.weather='clear';g.state.autoWorkEnabled=false;g.state.paused=false;g.state.nightWork=true;delete g.state.survivalVersion;
 g.raidT=g.seaT=g.calamityT=1e8;g.vision.fill(2);
 Object.assign(g.tribe(0),{food:1000,foodLots:{provisions:1000},wood:100});
 const c=g.campOf(0);let point;
 for(let r=20;r<90&&!point;r+=4)for(let i=0;i<24&&!point;i++){const x=c.x+Math.cos(i*Math.PI/12)*r,z=c.z+Math.sin(i*Math.PI/12)*r;if(!g.placementIssue('pen',x,z))point={x,z};}
 assert.ok(point);const hall=g.makeBld('townhall',c.x,c.z,0),pen=g.makeBld('pen',point.x,point.z,0);pen.w=pen.d=16;g.state.buildings=[hall,pen];g.rebuildWalk();
 const at=g.nearestWalk(c.x+8,c.z+8);assert.ok(at);const u=g.spawnUnit('worker',at.x,at.z,0);Object.assign(u,{order:'hold',jobLock:false});
 let wildPoint;for(let r=10;r<26&&!wildPoint;r+=2)for(let i=0;i<24&&!wildPoint;i++){const x=pen.x+Math.cos(i*Math.PI/12)*r,z=pen.z+Math.sin(i*Math.PI/12)*r;if(g.walkable(x,z)&&g.height(x,z)>g.waterAt(x,z)+.5&&g.workBoard.connected(g,u.x,u.z,x,z)&&g.workBoard.connected(g,x,z,pen.x,pen.z))wildPoint={x,z};}
 assert.ok(wildPoint);const a={id:g.id(),species,x:wildPoint.x,y:g.height(wildPoint.x,wildPoint.z),z:wildPoint.z,facing:0,vx:0,vz:0,wanderT:10000,hp:24,maxHp:24,fly:0,scale:1,...(species==='sheep'?{fleece:{version:1,units:2,grownUnits:2,shearedUnits:0}}:{})};if(species==='sheep')g.state.sheepVersion=1;g.state.wildlife=[a];return{g,u,pen,a};
}
function drive(g,seconds,done){const end=g.state.time+seconds;while(g.state.time<end&&!done()){g.step(.2);assert.deepEqual(g.simulationErrors,[]);}assert.ok(done(),JSON.stringify({time:g.state.time,report:domesticationReport(g),animals:g.state.livestock,units:g.state.units.map(u=>({id:u.id,x:u.x,z:u.z,order:u.order,reason:u.workReason,work:u.tamingWork})),queue:g.state.buildings.find(b=>b.type==='pen')?.goatSearch}));}
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
 u.hp=0;g.step(.2);assert.equal(u.tamingWork,undefined);assert.equal(penPlacesReserved(g,pen.id),0);assert.equal(g.state.wildlife.find(p=>p.id===a.id).hp>0,true);assert.equal(domesticationReport(g).abandoned,1);assert.equal(g.tribe(0).food,food);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('legacy already paid unmarked handling remains guaranteed with its original progress and price',()=>{
 const{g,u,pen,a}=fixture('horse');u.tamingWork={animal:a.id,pen:pen.id,progress:0};u.order='hold';const food=g.tribe(0).food;
 drive(g,300,()=>g.state.livestock?.some(p=>p.id===a.id&&insidePen(pen,p.x,p.z,.25))&&!u.tamingWork);
 assert.equal(g.tribe(0).food,food);assert.equal(domesticationReport(g).paidAttempts,0);assert.equal(a.domestication,undefined);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('trial snapshots and individual history reject forged or unbounded saves',()=>{
 const{g,u,pen}=fixture();assert.equal(beginHerdTaming(g,pen.id,u.id),true);const saved=encodeGame(g);
 for(const edit of [s=>s.units.find(p=>p.id===u.id).tamingWork.trial.roll=.12345,s=>s.units.find(p=>p.id===u.id).tamingWork.trial.paidFood=0,s=>s.units.find(p=>p.id===u.id).tamingWork.trial.chance=2,s=>s.wildlife[0].domestication.temperament=.12345,s=>s.tribes[0].domestication.paidAttempts=0]){const raw=structuredClone(saved);edit(raw.state);assert.throws(()=>decodeGame(raw));}
});
