import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeBoatVillage} from './helpers/native-boat-village.mjs';
import {Game} from '../src/game/sim.ts';
import {beginRiverboat,boardRiverboat,commandRiverboat,recallRiverboat} from '../src/game/boats.ts';
import {pauseHaulageWork,resumeHaulageProject} from '../src/game/haulage.ts';
import {beginProduction,productionOutputs,productionIssue} from '../src/game/production.ts';
import {prepareSocietyHandover} from '../src/game/communityHandover.ts';
import {settlePeace,peaceIssue} from '../src/game/peace.ts';
import {gameSnapshot,decodeGame} from '../src/game/persistence.ts';
const clone=x=>JSON.parse(JSON.stringify(x));
const terrain=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
function strict(g){const save=clone(gameSnapshot(g));assert.doesNotThrow(()=>decodeGame(save));return save;}
function drive(g,seconds,done,label){const end=g.state.time+seconds;while(g.state.time<end&&!done()){g.state.paused=false;const before=g.state.time;g.step(.2);assert.ok(g.state.time>before,JSON.stringify({label,ended:g.state.ended,paused:g.state.paused,time:g.state.time,banner:g.state.banner}));assert.deepEqual(g.simulationErrors,[]);}assert.ok(done(),JSON.stringify({label,time:g.state.time,banner:g.state.banner,boats:g.state.boats,haulage:g.state.haulageProjects,production:g.state.production?.projects,people:g.state.units.map(u=>({id:u.id,team:u.team,order:u.order,reason:u.workReason,x:u.x,z:u.z,boat:u.boat,work:u.haulageWork,carry:u.carry}))}));}
function guards(g,home){for(let i=0;i<8;i++){const u=g.spawnUnit('spearman',home.x+(i%2)*1.1,home.z+9+Math.floor(i/2),0);u.order='hold';}}
function nativeSociety(){
 const f=nativeBoatVillage(4,100),{g,home,dock,people}=f;
 // Everything here is declared initial setup before any work starts.
 // Existing dock/hall, four residents, historical personal canoe and finite
 // goods are authored; only the later hulls and their work are paid evidence.
 const originalCamp={...g.world.camps[0]};
 g.state.campSites=[{team:0,x:originalCamp.x,z:originalCamp.z}];
 dock.team=1;const hall=g.makeBld('townhall',home.x+16,home.z+6,1);g.state.buildings.push(hall);
 for(const u of people){u.team=1;u.homeHall=hall.id;}delete people[0].haulage;
 const source=g.tribe(1),recipient=g.tribe(0);Object.assign(source,{wood:580,stone:100,food:2000,foodLots:{provisions:2000},items:{cordage:20},hostile:false,ally:false,aggro:0});source.survival.waterLiters=200;
 Object.assign(recipient,{wood:40,stone:10,food:500,foodLots:{provisions:500},items:{}});recipient.survival.waterLiters=100;
 guards(g,home);const other=g.world.camps.find(c=>c.team===2);const witness=g.spawnUnit('worker',other.x,other.z,2);witness.order='hold';g.rebuildWalk();g.vision.fill(2);return{...f,hall};
}

test('native paid hull with actual afloat loaded crew and second paid hull transfers intact, saves and physically returns',()=>{
 let{g,dock,people,home,target}=nativeSociety();const recipientHome={x:g.campOf(0).x,z:g.campOf(0).z},hash=terrain(g),builder=people[2],captain=people[0],passenger=people[1],initialWood=g.tribe(1).wood,initialStone=g.tribe(1).stone;
 assert.equal(beginRiverboat(g,dock.id,1,builder.id),true,g.state.banner);assert.equal(g.tribe(1).wood,initialWood-40);assert.equal(g.tribe(1).stone,initialStone-4);
 drive(g,260,()=>g.state.boats?.length===1,'real first hull construction');let boat=g.state.boats[0];
 assert.equal(boardRiverboat(g,boat.id,[captain,passenger],1),2);drive(g,100,()=>[captain,passenger].every(u=>u.boat?.phase==='aboard'),'actual two-body boarding');
 assert.equal(commandRiverboat(g,boat.id,target.x,target.z),true);drive(g,160,()=>Math.hypot(boat.x-dock.x,boat.z-dock.z)>45,'actual outbound loaded water leg');
 assert.ok(captain.waterCargoEvidence?.waterMeters>=20);
 // Ordinary coastal/exploration commissioning may already have paid this
 // same spare builder's second hull while the first crew sailed. Retain that
 // actual project rather than requesting a duplicate or clearing its job.
 if(!builder.haulageWork)assert.equal(beginRiverboat(g,dock.id,1,builder.id),true,g.state.banner);
 assert.equal(builder.haulageWork.vessel,true);assert.equal(builder.haulageWork.workplace,dock.id);assert.equal(g.tribe(1).wood,initialWood-80);assert.equal(g.tribe(1).stone,initialStone-8);
 drive(g,100,()=>builder.haulageWork?.progress>2,'second paid hull bench progress');pauseHaulageWork(builder,g);
 const project=g.state.haulageProjects.find(p=>p.team===1),projectId=project.id,progress=project.work.progress;
 const boatId=boat.id,crewIds=[captain.id,passenger.id],builderId=builder.id,dockId=dock.id,body=crewIds.map(id=>{const u=g.state.units.find(u=>u.id===id);return clone({id,boat:u.boat,x:u.x,y:u.y,z:u.z,carry:u.carry,carryType:u.carryType});});
 const evidenceBefore=clone(captain.waterCargoEvidence),hull=clone(boat),woods=g.tribe(0).wood+g.tribe(1).wood,stones=g.tribe(0).stone+g.tribe(1).stone,practice=clone(g.tribe(0).boatPractice||null);
 g.makeHostile(1);assert.equal(peaceIssue(g,1,'annexation'),null);g.state.paused=true;strict(g);const preflight=prepareSocietyHandover(g,1);assert.equal(preflight.accepted,true,preflight.reason);assert.equal(settlePeace(g,1,'annexation'),true,g.state.banner);
 assert.deepEqual({x:g.campOf(0).x,z:g.campOf(0).z},recipientHome,'recipient nomadic primary home remains anchored');boat=g.state.boats.find(b=>b.id===boatId);assert.equal(boat.team,0);for(const k of ['x','y','z','hp','captain','capacity'])assert.equal(boat[k],hull[k]);
 for(const before of body){const u=g.state.units.find(u=>u.id===before.id);assert.equal(u.team,0);for(const k of ['x','y','z','carry','carryType'])assert.equal(u[k],before[k]);assert.deepEqual(u.boat,before.boat);}
 const held=g.state.units.find(u=>u.id===captain.id).waterCargoEvidence;assert.equal(held.waterMeters,evidenceBefore.waterMeters);assert.equal(held.amount,evidenceBefore.amount);assert.equal(held.originTeam,1);assert.equal(held.team,0);assert.deepEqual(g.tribe(0).boatPractice||null,practice,'ownership itself grants no travel/delivery practice');
 assert.equal(g.state.haulageProjects.find(p=>p.id===projectId).work.progress,progress);assert.equal(g.tribe(0).wood,woods);assert.equal(g.tribe(0).stone,stones);
 g=decodeGame(strict(g));assert.equal(terrain(g),hash);const pending=g.state.haulageProjects.find(p=>p.id===projectId);assert.equal(pending.work.progress,progress);assert.equal(pending.team,0);
 assert.equal(resumeHaulageProject(g,projectId,builderId,dockId),true);assert.equal(recallRiverboat(g,boatId),true);drive(g,400,()=>g.state.boats.length===2&&crewIds.every(id=>!g.state.units.find(u=>u.id===id).boat),'same paid hull completion and physical disembarkation');
 g.soundRecall();drive(g,250,()=>g.state.units.find(u=>u.id===captain.id).carry===0,'same cargo physically delivered');
 assert.equal(g.tribe(0).wood,woods+20,'two hulls were already paid; original twenty carried logs arrive once');assert.equal(g.tribe(0).stone,stones);assert.equal(g.state.boats.length,2);assert.equal(g.tribe(0).boatPractice.deliveredGoods,20);assert.equal(terrain(g),hash);strict(g);
});

test('native paid firing retains original culture through takeover, strict save and actual output delivery',()=>{
 let g=new Game();g.reset(345,14,{size:1040,layout:'pangaea'});g.enterIsland();const home={...g.campOf(1)},own={...g.campOf(0)};g.state.units=[];g.state.buildings=[];g.state.autoWorkEnabled=false;g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.birthT=10000;g.calamityT=10000;for(const t of g.state.tribes)t.thinkT=10000;
 // Finite declared dry ware and existing architecture; upstream clay process is
 // not claimed by this ownership test. Hearth firing itself is paid and real.
 const recipient=g.makeBld('townhall',own.x,own.z,0),hall=g.makeBld('townhall',home.x,home.z,1),hearth=g.makeBld('hearth',home.x+12,home.z,1);g.state.buildings=[hall,recipient,hearth];
 const maker=g.spawnUnit('worker',home.x+6,home.z,1);maker.homeHall=hall.id;maker.order='hold';guards(g,home);g.vision.fill(2);g.rebuildWalk();
 Object.assign(g.tribe(1),{wood:40,stone:10,food:500,foodLots:{provisions:500},items:{dryWare:4},hostile:false});g.tribe(1).survival.waterLiters=100;Object.assign(g.tribe(0),{wood:40,stone:10,food:500,foodLots:{provisions:500},items:{}});g.tribe(0).survival.waterLiters=100;
 const hash=terrain(g);assert.equal(beginProduction(g,'fireClayHand',hearth.id,maker.id),true,productionIssue(g,'fireClayHand',hearth.id,maker.id));let p=g.state.production.projects.at(-1);drive(g,100,()=>p.phase==='working'&&p.progress>3,'actual paid firing progress');
 const before=clone(p),paid=clone(g.state.production.metrics),id=p.id;g.makeHostile(1);assert.equal(settlePeace(g,1,'annexation'),true,g.state.banner);assert.deepEqual({x:g.campOf(0).x,z:g.campOf(0).z},{x:own.x,z:own.z},'source-first building order does not steal recipient primary hall');p=g.state.production.projects.find(p=>p.id===id);assert.deepEqual(p.pottery.origin,before.pottery.origin);assert.equal(p.pottery.origin.team,1);assert.equal(p.team,0);assert.equal(p.progress,before.progress);
 g.state.paused=true;g=decodeGame(strict(g));p=g.state.production.projects.find(p=>p.id===id);assert.equal(terrain(g),hash);drive(g,240,()=>p.phase==='complete','original paid cultural batch actual delivery');assert.deepEqual(g.state.production.metrics.consumed,paid.consumed);assert.equal(g.state.production.metrics.logsUsed,paid.logsUsed);assert.equal(g.state.production.metrics.logsUsed,4);
 const output=productionOutputs(p);assert.ok(output.pottery>0,'This declared initial firing produces at least one culturally identified vessel');assert.equal((g.tribe(0).items.pottery||0)+(g.tribe(0).items.potsherds||0),4);if(output.pottery)assert.equal(g.tribe(0).potteryOrigins.find(o=>o.origin.site===hearth.id).origin.team,1);assert.equal(g.tribe(1).items.dryWare||0,0);strict(g);
});
