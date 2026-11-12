import test from'node:test';import assert from'node:assert/strict';
import {Game}from'../src/game/sim.ts';import {encodeGame,decodeGame}from'../src/game/persistence.ts';import{campAnchor}from'../src/game/campAnchor.ts';
import{collectWildBatch,resumeWildWork,enableWildCraft,beginWildWork,cancelWildWork,wildIssue,wildStock,tickWildCraft,wildCraftFeedback,wildSpoilRate,validWildCraftState,WILD_RECIPES,BUTCHERY_PARTS,huntMethodFor,trapKindFor,WILD_RULES}from'../src/game/wildCraft.ts';
import{CARCASS_MEAT}from'../src/game/hunting.ts';import{foodInventory}from'../src/game/pantry.ts';
function fixture(){const g=new Game();g.reset(1,14,{size:1040,layout:'pangaea'});g.enterIsland();g.state.autoWorkEnabled=false;g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.wildlife=[];for(const t of g.state.tribes)t.thinkT=10000;Object.assign(g.tribe(0),{wood:120,stone:70,food:1000,foodLots:{provisions:1000},items:{}});g.tribe(0).survival.waterLiters=1000;for(const u of g.state.units.filter(u=>u.team===0)){u.order='hold';u.jobLock=true;}return g;}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){const before=g.state.time;g.state.paused=false;g.step(.2);assert.ok(g.state.time>before);}assert.deepEqual(g.simulationErrors,[]);}
function site(g,type){const home=campAnchor(g,0);for(let radius=10;radius<=44;radius+=4)for(let i=0;i<24;i++){const x=home.x+Math.cos(i*Math.PI/12)*radius,z=home.z+Math.sin(i*Math.PI/12)*radius;if(g.placementIssue(type,x,z))continue;assert.equal(g.placeBuilding(type,x,z),true,g.state.banner);const b=g.state.buildings.at(-1),u=g.state.units.find(u=>u.team===0);g.clearSelect();g.selectEntity(u);g.orderConstruction(b);drive(g,200,()=>g.finished(b));assert.ok(g.finished(b));g.clearSelect();for(const v of g.state.units.filter(u=>u.team===0)){g.interruptMission(v);v.order='hold';v.jobLock=true;}return b;}throw Error('no site '+type);}
const free=g=>g.state.units.find(x=>x.team===0&&x.type==='worker'&&x.carry<=0&&x.wildWorkId===undefined&&x.hp>0);
const worker=(g,n=0)=>g.state.units.filter(u=>u.team===0&&u.type==='worker')[n];
function carcass(g,species,dx=4){const c=campAnchor(g,0),x=c.x+dx,z=c.z+3;const a={id:g.id(),species,x,z,y:g.height(x,z),hp:0,maxHp:6,facing:0,vx:0,vz:0,wanderT:10000,fly:0,scale:1,carcass:{meat:CARCASS_MEAT[species],diedAt:g.state.time,prepared:true,preparationWork:2}};g.state.wildlife.push(a);return a;}
const PP={batches:1,failedBatches:0,usefulOutputs:1,firstAt:0,lastAt:0,lastSuccessfulAt:0,makers:[]};
const total=o=>Object.values(o||{}).reduce((n,v)=>n+(v||0),0);

import{applyEngineCommand,isEngineDispatchCommand}from'../src/game/engineDispatch.ts';import{applyEngineReadQuery}from'../src/game/engineReadModels.ts';
test('commands are strict, refuse without wild-craft and the plan is pure',()=>{
 assert.equal(isEngineDispatchCommand({kind:'wild-begin',recipe:'renderFat'}),true);assert.equal(isEngineDispatchCommand({kind:'wild-begin',recipe:'nope'}),false);
 assert.equal(isEngineDispatchCommand({kind:'wild-begin',recipe:'renderFat',extra:1}),false);assert.equal(isEngineDispatchCommand({kind:'wild-collect',projectId:0}),false);
 const g=fixture();assert.equal(applyEngineCommand(g,{kind:'wild-begin',recipe:'renderFat'}).accepted,false);
 assert.equal(applyEngineReadQuery(g,{kind:'wild-craft'}).wild.plan.enabled,false);
 enableWildCraft(g);const before=JSON.stringify(g.state.wildCraft),plan=applyEngineReadQuery(g,{kind:'wild-craft'}).wild.plan;
 assert.equal(plan.enabled,true);assert.equal(plan.recipes.length,10);assert.ok(plan.hands.length>0);assert.equal(JSON.stringify(g.state.wildCraft),before);
 assert.match(plan.recipes.find(r=>r.id==='renderFat').issue,/Need/);
});
test('typed begin assigns a free adult to a real station, debits stock once, and finishes',()=>{
 const g=fixture();enableWildCraft(g);site(g,'hearth');wildStock(g,0).fat=4;
 const r=applyEngineCommand(g,{kind:'wild-begin',recipe:'renderFat'},{selectedUnitIds:[]});assert.equal(r.accepted,true,r.reason);
 assert.equal(wildStock(g,0).fat||0,0);assert.equal(g.state.wildCraft.projects.length,1);
 const again=applyEngineCommand(g,{kind:'wild-begin',recipe:'renderFat'});assert.equal(again.accepted,false);assert.equal(wildStock(g,0).fat||0,0);
 const u=g.state.units.find(u=>u.id===g.state.wildCraft.projects[0].actorId);drive(g,600,()=>u.wildWorkId===undefined);assert.equal(u.wildWorkId,undefined,u.workReason);
 assert.ok(Math.abs((foodInventory(g.tribe(0)).tallow||0)-3)<.05);
 assert.equal(applyEngineCommand(g,{kind:'wild-collect'}).accepted,false);
});
test('typed begin honours an explicit hand and refuses an unknown hand, wrong station and busy hand',()=>{
 const g=fixture();enableWildCraft(g);site(g,'hearth');site(g,'dryrack');wildStock(g,0).sinew=4;const a=worker(g,0),b=worker(g,1);
 assert.equal(applyEngineCommand(g,{kind:'wild-begin',recipe:'twistSinew',unitId:1e6}).accepted,false);
 const st=g.state.buildings.find(b=>b.type==='hearth');assert.equal(applyEngineCommand(g,{kind:'wild-begin',recipe:'twistSinew',stationId:g.state.buildings.find(b=>b.type==='dryrack').id}).accepted,false);
 const r=applyEngineCommand(g,{kind:'wild-begin',recipe:'twistSinew',unitId:b.id,stationId:st.id},{selectedUnitIds:[b.id]});assert.equal(r.accepted,true,r.reason);assert.equal(b.wildWorkId,g.state.wildCraft.projects[0].id);assert.equal(a.wildWorkId,undefined);
 assert.equal(applyEngineCommand(g,{kind:'wild-begin',recipe:'twistSinew',unitId:b.id}).accepted,false);
});
test('a loaded rack is collected by a typed command and the dry batch comes home',()=>{
 const g=fixture();enableWildCraft(g);site(g,'dryrack');const t=g.tribe(0);t.foodLots={provisions:900,berries:100};t.food=1000;
 const r=applyEngineCommand(g,{kind:'wild-begin',recipe:'dryBerries'});assert.equal(r.accepted,true,r.reason);
 const p=g.state.wildCraft.projects[0];drive(g,3000,()=>p.phase==='ready');assert.equal(p.phase,'ready');
 assert.equal(applyEngineReadQuery(g,{kind:'wild-craft'}).wild.plan.ready.length,1);
 const c=applyEngineCommand(g,{kind:'wild-collect',projectId:p.id});assert.equal(c.accepted,true,c.reason);
 drive(g,600,()=>!g.state.wildCraft.projects.length);assert.equal(g.state.wildCraft.projects.length,0);assert.ok((foodInventory(g.tribe(0)).driedBerries||0)>=2.99);
});
test('world pin: a visible bleeding animal first, then a finished batch; silent without wild-craft',async()=>{
 const{wildAlert}=await import('../src/game/wildCraftControl.ts');const{detectAlerts}=await import('../src/ui/hearth/glanceReads.ts');
 const g=fixture();assert.equal(wildAlert(g),null);assert.equal(detectAlerts(g).some(a=>a.kind==='wild'),false);enableWildCraft(g);g.vision.fill(2);assert.equal(wildAlert(g),null);
 const c=campAnchor(g,0),a={id:g.id(),species:'deer',x:c.x+9,z:c.z+9,y:0,hp:3,maxHp:6,facing:0,vx:0,vz:0,wanderT:1e4,fly:0,scale:1};g.state.wildlife.push(a);g.state.wildCraft.wounds[a.id]={since:0,trail:[{x:a.x,z:a.z},{x:a.x+2,z:a.z}],bleed:.01};
 const w=wildAlert(g);assert.equal(w.count,1);assert.equal(w.x,a.x);const pin=detectAlerts(g).find(x=>x.kind==='wild');assert.ok(pin&&pin.at&&pin.severity==='warning');
});
