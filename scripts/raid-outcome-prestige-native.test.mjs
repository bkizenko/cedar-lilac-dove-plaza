import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {dispatchExistingCampRaid} from '../src/game/raiders.ts';
import {claimParcel} from '../src/game/stolenCargo.ts';
import {settledWarPrestige,raidDefensePrestige,RAID_DEFENSE_RULES} from '../src/game/warPrestige.ts';
const terrain=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
function walk(g,u,point,seconds=120){g.clearSelect();u.selected=true;g.issueMove(point.x,point.z);drive(g,seconds,()=>Math.hypot(u.x-point.x,u.z-point.z)<2);u.jobLock=true;u.order='hold';}
function drive(g,seconds,done){const until=g.state.time+seconds;let n=0;while(!done()&&g.state.time<until&&n++<5000){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);}assert.ok(done(),JSON.stringify({time:g.state.time,raid:g.state.raidDefense,units:g.state.units.filter(u=>u.team===0||u.team===3).map(u=>({id:u.id,team:u.team,x:u.x,z:u.z,hp:u.hp,order:u.order,reason:u.workReason,carry:u.carry,raid:u.seaRaid?.plan?.metrics}))}));}
function fixture(){
 const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();
 const original=terrain(g),home=g.campOf(0),observer=g.state.units.find(u=>u.team===0&&u.type==='worker');
 g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.conflict='balanced';g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=g.state.birthT=10000;g.state.visitorTimer=900;g.raidT=g.seaT=g.calamityT=10000;for(const t of g.state.tribes)t.thinkT=10000;
 for(const u of g.state.units.filter(u=>u.team===0)){u.order='hold';u.jobLock=true;}
 // Finite scenario opening: legal finished store/camp, two native camp guards,
 // actual starting stocks. No terrain/resource edits, grants after dispatch,
 // actor teleport, outcome injection, visibility fill or executor overrides.
 const site=g.findDryFoundation('warehouse',home.x+10,home.z,28,(x,z)=>g.placementIssue('warehouse',x,z,0)===null&&g.workBoard.connected(g,observer.x,observer.z,x,z));assert.ok(site);
 const store=g.makeBld('warehouse',site.x,site.z,0);g.state.buildings.push(store);g.rebuildWalk();
 let campPoint;
 for(let i=0;i<48&&!campPoint;i++){const a=i*Math.PI/24;campPoint=g.findDryFoundation('hut',store.x+Math.cos(a)*84,store.z+Math.sin(a)*84,3,(x,z)=>g.placementIssue('hut',x,z,3)===null&&g.workBoard.connected(g,observer.x,observer.z,x,z));}assert.ok(campPoint);
 const camp=g.makeBld('hut',campPoint.x,campPoint.z,3);camp.raiderCamp=true;g.state.buildings.push(camp);g.rebuildWalk();
 const front=g.interactionSpot(observer,store);assert.ok(front);walk(g,observer,front); // actual player eyes at the store
 const spawn=g.interactionSpot(observer,camp);assert.ok(spawn);
 const crew=[g.spawnUnit('spearman',spawn.x,spawn.z,3),g.spawnUnit('spearman',spawn.x+1,spawn.z,3)];for(const u of crew){u.homeCamp=camp.id;u.order='hold';}
 // No food in this deliberately scarce opening: the targeted finite load is
 // timber, so ordinary food consumption cannot obscure timber conservation.
 Object.assign(g.tribe(0),{food:0,foodLots:{},wood:80});Object.assign(g.tribe(3),{food:100,foodLots:{provisions:100},wood:0});g.tribe(3).survival.waterLiters=100;
 camp.campEconomy={version:1,knownSites:[{version:1,campId:camp.id,siteId:store.id,team:0,x:store.x,z:store.z,observedAt:g.state.time}],lastDispatchAt:g.state.time-121,departures:0,returns:0,lost:0,foodPaid:0,waterPaid:0,foodUsed:0,waterUsed:0};
 return{g,original,store,camp,crew,observer};
}
test('native witnessed theft settles escaped only at physical camp arrival; a second real stolen load earns bounded defense credit only after combat, parcel pickup and actual owner-cache delivery across reload',()=>{
 let {g,original,store,camp,observer}=fixture();const campId=camp.id,storeId=store.id,observerId=observer.id;
 assert.equal(dispatchExistingCampRaid(g),true);let thief=g.state.units.find(u=>u.campTrip?.campId===campId);assert.ok(thief);const firstId=thief.id,firstBand=thief.seaRaid.plan.bandId;
 drive(g,150,()=>thief.carry>0);const firstTake=thief.carry;assert.equal(thief.carryType,'wood');assert.equal(g.tribe(0).wood,80-firstTake);assert.equal(raidDefensePrestige(g.state).value,0);assert.equal(g.tribe(3).wood,0);assert.ok(g.state.raidDefense?.bands.some(b=>b.bandId===firstBand));
 g=decodeGame(encodeGame(g));thief=g.state.units.find(u=>u.id===firstId);assert.equal(raidDefensePrestige(g.state).value,0);
 drive(g,150,()=>!thief.seaRaid);assert.ok(g.buildingWorkReached(thief,g.state.buildings.find(b=>b.id===campId)));assert.equal(g.tribe(3).wood,firstTake);assert.equal(g.state.raidDefense.bands.find(b=>b.bandId===firstBand).outcome,'escaped');assert.equal(settledWarPrestige(g.state).value,0);assert.equal(g.tribe(0).wood+g.tribe(3).wood,80);
 // The defense force is a declared finite second-scenario initial endowment,
 // positioned off the raid route before departure; real combat is commanded
 // only after the next load was physically stolen. It creates no cargo.
 store=g.state.buildings.find(b=>b.id===storeId);camp=g.state.buildings.find(b=>b.id===campId);observer=g.state.units.find(u=>u.id===observerId);
 const vx=(camp.x-store.x)/Math.hypot(camp.x-store.x,camp.z-store.z),vz=(camp.z-store.z)/Math.hypot(camp.x-store.x,camp.z-store.z);
 let guardSpot;for(const sign of [1,-1]){const x=store.x-vz*sign*23,z=store.z+vx*sign*23;if(g.walkable(x,z)&&g.workBoard.connected(g,observer.x,observer.z,x,z)){guardSpot={x,z};break;}}assert.ok(guardSpot);
 const guards=[0,1,2].map(i=>{const u=g.spawnUnit('archer',guardSpot.x+i*.8,guardSpot.z,0);u.order='hold';u.jobLock=true;return u;});
 camp.campEconomy.lastDispatchAt=g.state.time-121;camp.campEconomy.knownSites[0].observedAt=g.state.time;assert.equal(dispatchExistingCampRaid(g),true);thief=g.state.units.find(u=>u.campTrip?.campId===campId);assert.ok(thief);const secondId=thief.id,secondBand=thief.seaRaid.plan.bandId;
 drive(g,150,()=>thief.carry>0);const secondTake=thief.carry;assert.equal(thief.carryType,'wood');assert.equal(g.tribe(0).wood,80-firstTake-secondTake);
 g.clearSelect();for(const u of guards)u.selected=true;g.issueAttack(thief);
 drive(g,120,()=>!g.state.units.some(u=>u.id===secondId&&u.hp>0));assert.equal(raidDefensePrestige(g.state).value,0,'dead thief and dropped load are not recovered supplies');
 const parcel=g.state.droppedCargo.parcels.find(p=>p.raidBandId===secondBand);assert.ok(parcel);assert.equal(parcel.originalOwnerTeam,0);assert.equal(parcel.amount,secondTake);
 g=decodeGame(encodeGame(g));observer=g.state.units.find(u=>u.id===observerId);observer.jobLock=false;observer.order='hold';assert.ok(claimParcel(g,observer,parcel.id));
 drive(g,150,()=>observer.carry>0);assert.equal(raidDefensePrestige(g.state).value,0,'a carried recovery has not reached the owner cache');
 g=decodeGame(encodeGame(g));observer=g.state.units.find(u=>u.id===observerId);drive(g,150,()=>raidDefensePrestige(g.state).held===1);
 const b=g.state.raidDefense.bands.find(b=>b.bandId===secondBand);assert.equal(b.outcome,'held');assert.equal(b.recovered,secondTake);assert.equal(b.escaped,0);assert.equal(g.tribe(0).wood,80-firstTake);assert.equal(g.tribe(0).wood+g.tribe(3).wood,80);assert.equal(raidDefensePrestige(g.state).value,RAID_DEFENSE_RULES.heldWeight);assert.equal(settledWarPrestige(g.state).value,RAID_DEFENSE_RULES.heldWeight);
 const before=JSON.stringify(g.state.raidDefense);for(let i=0;i<5;i++)settledWarPrestige(g.state);assert.equal(JSON.stringify(g.state.raidDefense),before);g=decodeGame(encodeGame(g));drive(g,1,()=>g.state.time>b.settledAt+.5);assert.equal(g.state.raidDefense.bands.length,2);assert.equal(raidDefensePrestige(g.state).value,RAID_DEFENSE_RULES.heldWeight);assert.equal(terrain(g),original);
 for(const mutate of [s=>s.raidDefense.bands.push(structuredClone(s.raidDefense.bands[0])),s=>s.raidDefense.bands[1].recovered=0,s=>s.raidDefense.bands[1].settledAt=s.time+1,s=>s.raidDefense.bands[1].terminals.push(structuredClone(s.raidDefense.bands[1].terminals[0]))]){const raw=encodeGame(g);mutate(raw.state);assert.throws(()=>decodeGame(raw));}
 assert.equal(settledWarPrestige(g.state,1).value,0,'foreign band totals do not become private rival prestige');
});
