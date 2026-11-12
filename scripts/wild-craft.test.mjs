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

test('hunt method follows the held tool and animal; passive traps follow the species',()=>{
 assert.equal(huntMethodFor({type:'archer'},'deer'),'bow-ambush');assert.equal(huntMethodFor({type:'spearman'},'boar'),'stalk-spear');
 assert.equal(huntMethodFor({type:'worker'},'goat'),'thrown-stones');assert.equal(huntMethodFor({type:'worker'},'cattle'),null);assert.equal(huntMethodFor({type:'archer'},'bird'),null);
 assert.equal(trapKindFor('goat'),'snare');assert.equal(trapKindFor('boar'),'pitfall');
});
test('recipe tables conserve: nothing is made from nothing and parts never exceed the carcass',()=>{
 for(const r of Object.values(WILD_RECIPES)){const into=total(r.goods)+total(r.foodIn)+total(r.items)-total(r.retain),out=total(r.outGoods)+total(r.outFood)+total(r.outItems);if(!r.outGoods&&!r.outFood&&!r.outItems)continue;assert.ok(out<=into+1e-9,`${r.id}: ${out} out from ${into} in`);}
 for(const[sp,p]of Object.entries(BUTCHERY_PARTS))assert.ok(total(p)<=CARCASS_MEAT[sp]/2+1e-9,sp);
});
test('field-dressing takes finite fat, sinew, brain and horn from an actual gutted carcass once, and carries them home',()=>{
 const g=fixture();enableWildCraft(g);const c=carcass(g,'deer'),u=worker(g);
 assert.equal(beginWildWork(g,u.id,'dressParts',{critterId:c.id}).accepted,true);
 drive(g,400,()=>u.wildWorkId===undefined);assert.equal(u.wildWorkId,undefined,u.workReason);
 assert.equal(total(wildStock(g,0)),6,'one trip carries at most six parts');
 assert.equal(beginWildWork(g,u.id,'dressParts',{critterId:c.id}).accepted,true);drive(g,400,()=>u.wildWorkId===undefined);
 const s=wildStock(g,0),w=g.state.wildCraft;
 assert.ok(Math.abs(total(s)+total(w.metrics.spoiled)-total(BUTCHERY_PARTS.deer))<1e-6,'every part is either stored or counted as rotted');assert.equal(total(w.metrics.produced),total(BUTCHERY_PARTS.deer));assert.deepEqual(w.parts[c.id],{fat:0,sinew:0,brain:0,horn:0});
 assert.match(wildIssue(g,0,'dressParts',{critterId:c.id})||'',/Nothing left/);
 const u2=worker(g,1);assert.equal(beginWildWork(g,u2.id,'dressParts',{critterId:c.id}).accepted,false);assert.equal(total(g.state.wildCraft.metrics.produced),total(BUTCHERY_PARTS.deer));
});
test('hide chain needs seen/taught method, real stations and weather; one scraped hide becomes one leather',()=>{
 const g=fixture();enableWildCraft(g);const t=g.tribe(0);t.items={cleanHide:1};
 assert.match(wildIssue(g,0,'soakHide'),/seen or been taught|Needs a finished/);
 t.productionPractice={fleshHide:PP};
 const tanner=site(g,'tanner'),rack=site(g,'dryrack');
 const u=worker(g);{const started=beginWildWork(g,u.id,'soakHide');assert.equal(started.accepted,true,started.reason);}
 drive(g,600,()=>u.wildWorkId===undefined);assert.equal(t.items.cleanHide,0,'hide is paid at the cache, not created');assert.equal(wildStock(g,0).soakedHide>0.5,true);
 wildStock(g,0).brain=1;{const f=free(g);assert.equal(beginWildWork(g,f.id,'brainTan').accepted,true);drive(g,700,()=>f.wildWorkId===undefined);}
 assert.ok(wildStock(g,0).tannedHide>0.5);assert.equal(wildStock(g,0).brain||0,0);
 assert.equal(beginWildWork(g,free(g).id,'frameDry').accepted,true);
 drive(g,1500,()=>g.state.wildCraft.projects[0]?.phase==='ready');{const c=collectWildBatch(g,free(g).id);assert.equal(c.accepted,true,c.reason+JSON.stringify(g.state.wildCraft.projects)+g.state.weather+u.workReason);}
 drive(g,700,()=>g.state.wildCraft.metrics.produced.frameHide>0);
 assert.ok(g.state.wildCraft.metrics.produced.frameHide>=1-1e-9,JSON.stringify(g.state.wildCraft.projects));
 {const f=free(g);assert.equal(beginWildWork(g,f.id,'softenHide').accepted,true);drive(g,700,()=>f.wildWorkId===undefined);}
 assert.ok(t.items.leather>=1-1e-9&&t.items.leather<=1+1e-9);
 const m=g.state.wildCraft.metrics;assert.ok(m.produced.leather<=m.consumed.cleanHide+1e-9);void tanner;void rack;
});
test('wet weather ruins a loaded drying rack instead of producing goods',()=>{
 const g=fixture();enableWildCraft(g);const t=g.tribe(0);t.productionPractice={fleshHide:PP};site(g,'tanner');site(g,'dryrack');wildStock(g,0).tannedHide=1;
 const u=worker(g);assert.equal(beginWildWork(g,u.id,'frameDry').accepted,true);g.state.weather='rain';g.state.weatherT=100000;
 drive(g,1200,()=>g.state.wildCraft.metrics.lost.tannedHide>0);assert.ok(g.state.wildCraft.metrics.lost.tannedHide>=1);assert.equal(wildStock(g,0).frameHide||0,0);
});
test('berries dry into fewer, longer-lived food; units are debited from the actual berry lot',()=>{
 const g=fixture();enableWildCraft(g);site(g,'dryrack');const t=g.tribe(0);t.food=1020;t.foodLots={provisions:1000,berries:20};
 const u=worker(g);assert.equal(beginWildWork(g,u.id,'dryBerries').accepted,true);
 drive(g,1500,()=>g.state.wildCraft.projects[0]?.phase==='ready');{const c=collectWildBatch(g,free(g).id);assert.equal(c.accepted,true,c.reason+JSON.stringify(g.state.wildCraft.projects)+g.state.weather+u.workReason);}drive(g,700,()=>(foodInventory(t).driedBerries||0)>0);
 const lots=foodInventory(t);assert.ok(Math.abs(lots.driedBerries-3)<0.05,'three dried units minus a little rot');assert.ok(lots.berries<=16,'the four berries are gone from the lot');assert.ok(wildSpoilRate(g,'brain',0,0)>wildSpoilRate(g,'sinew',0,0));
});
test('a snare consumes real cordage and kills only real passing wildlife; the carcass is the ordinary finite one',()=>{
 const g=fixture();enableWildCraft(g);const t=g.tribe(0);t.items={cordage:2};const u=worker(g),c=campAnchor(g,0);let x,z;for(let r=8;r<30&&x===undefined;r+=2)for(let i=0;i<16;i++){const px=c.x+Math.cos(i)*r,pz=c.z+Math.sin(i)*r;if(g.walkable(px,pz)){x=px;z=pz;break;}}
 assert.equal(beginWildWork(g,u.id,'setSnare',{x,z}).accepted,true);assert.equal(t.items.cordage||0,0,'cordage is claimed from the cache');
 drive(g,600,()=>g.state.wildCraft.traps.length>0);assert.equal(g.state.wildCraft.traps.length,1);assert.equal(t.items.cordage,0);
 const goat={id:g.id(),species:'goat',x,z,y:g.height(x,z),hp:4,maxHp:4,facing:0,vx:0,vz:0,wanderT:10000,fly:0,scale:1};g.state.wildlife.push(goat);
 for(let i=0;i<40&&goat.hp>0;i++){g.state.time+=WILD_RULES.trapCheckSeconds;tickWildCraft(g,.1);}
 assert.equal(goat.hp,0);assert.equal(goat.carcass.meat,CARCASS_MEAT.goat);assert.equal(g.state.wildCraft.metrics.trapCatches,1);assert.equal(g.state.wildCraft.traps[0].uses,WILD_RULES.snareUses-1);
 const cow={...goat,id:g.id(),species:'cattle',hp:9,maxHp:9};g.state.wildlife.push(cow);for(let i=0;i<20;i++){g.state.time+=WILD_RULES.trapCheckSeconds;tickWildCraft(g,.1);}assert.equal(cow.hp,9,'snare cannot hold cattle');
});
test('a wounded animal bleeds along a trail and dies where it ran; a tracker follows the trail',()=>{
 const g=fixture();enableWildCraft(g);const c=campAnchor(g,0),deer={id:g.id(),species:'deer',x:c.x+10,z:c.z+10,y:0,hp:3,maxHp:6,facing:0,vx:1.5,vz:0,wanderT:10000,fly:0,scale:1};g.state.wildlife.push(deer);
 const u=worker(g);let tracked=false;
 for(let i=0;i<400&&deer.hp>0;i++){deer.x+=.3;tickWildCraft(g,.2);g.state.time+=.2;if(!tracked&&g.state.wildCraft.wounds[deer.id]?.trail.length>=2){const r=beginWildWork(g,u.id,'trackWounded',{critterId:deer.id});tracked=r.accepted;if(!tracked)console.log(r.reason);}}
 assert.equal(deer.hp,0);assert.ok(deer.carcass&&deer.carcass.meat===CARCASS_MEAT.deer);assert.equal(g.state.wildCraft.metrics.bledOut,1);assert.ok(tracked);
});
test('ledger goods rot by weather and every lost unit is counted; cold keeps longer than heat',()=>{
 const g=fixture();enableWildCraft(g);const camp=g.campOf(0);wildStock(g,0).fat=10;wildStock(g,0).horn=3;
 g.state.weather='drought';const hotter=wildSpoilRate(g,'fat',camp.x,camp.z);g.state.weather='frost';const colder=wildSpoilRate(g,'fat',camp.x,camp.z);assert.ok(hotter>colder);
 g.state.weather='clear';for(let i=0;i<50;i++)tickWildCraft(g,10);const s=wildStock(g,0),m=g.state.wildCraft.metrics;
 assert.ok(s.fat<10);assert.equal(s.fat+m.spoiled.fat,10);assert.equal(s.horn,3);
 const rows=wildCraftFeedback(g,0);assert.ok(rows.some(r=>r.icon==='🧈'));
});
test('determinism, save round-trip with live jobs, strict validation, and old saves without the field',()=>{
 const run=()=>{const g=fixture();enableWildCraft(g);site(g,'tanner');site(g,'dryrack');g.tribe(0).productionPractice={fleshHide:PP};g.tribe(0).items={cleanHide:2};const u=worker(g);beginWildWork(g,u.id,'soakHide');drive(g,300,()=>g.state.wildCraft.projects[0]?.phase==='work'&&g.state.wildCraft.projects[0].progress>3);return g;};
 const a=run(),b=run();assert.equal(JSON.stringify(a.state.wildCraft),JSON.stringify(b.state.wildCraft));
 assert.ok(a.state.wildCraft.projects.length===1);
 const r=decodeGame(encodeGame(a));assert.deepEqual(r.state.wildCraft,a.state.wildCraft);assert.equal(r.state.units.find(u=>u.wildWorkId!==undefined)?.wildWorkId,a.state.wildCraft.projects[0].id);
 drive(r,800,()=>r.state.wildCraft.projects.length===0);assert.ok(wildStock(r,0).soakedHide>0.5);assert.equal(r.tribe(0).items.cleanHide,1);
 assert.equal(validWildCraftState({wildCraft:{...a.state.wildCraft,nextId:0},units:a.state.units}),false);
 const bad=structuredClone(a.state.wildCraft);bad.stock['0']={fat:-1};assert.equal(validWildCraftState({wildCraft:bad,units:a.state.units}),false);
 const old=fixture();assert.equal(old.state.wildCraft,undefined);const o=decodeGame(encodeGame(old));assert.equal(o.state.wildCraft,undefined);assert.equal(validWildCraftState({units:o.state.units}),true);
 drive(o,20);assert.equal(o.state.wildCraft,undefined,'an old save never grows the field');
});
test('unfetched cache escrow cancels in place; remote cancellation retains paid inputs until actual Resume and delivery',()=>{
 const g=fixture();enableWildCraft(g);site(g,'tanner');g.tribe(0).productionPractice={fleshHide:PP};const t=g.tribe(0);t.items={cleanHide:1};const u=worker(g),water=t.survival.waterLiters;
 {const started=beginWildWork(g,u.id,'soakHide');assert.equal(started.accepted,true,started.reason);}assert.equal(t.items.cleanHide,0);assert.equal(cancelWildWork(g,u.id),true,'inputs never left the actual cache');assert.equal(t.items.cleanHide,1);assert.equal(t.survival.waterLiters,water);assert.equal(g.state.wildCraft.projects.length,0);
 {const started=beginWildWork(g,u.id,'soakHide');assert.equal(started.accepted,true,started.reason);}const p=g.state.wildCraft.projects[0];drive(g,120,()=>p.phase==='work'&&p.progress>1);assert.equal(p.phase,'work');const held=structuredClone(p.held),after=t.survival.waterLiters;assert.equal(cancelWildWork(g,u.id),false,'cannot teleport inputs from the distant tannery');assert.equal(p.paused,true);assert.deepEqual(p.held,held);assert.equal(t.items.cleanHide,0);assert.equal(t.survival.waterLiters,after);assert.equal(resumeWildWork(g,u.id),true);drive(g,300,()=>u.wildWorkId===undefined);assert.equal(u.wildWorkId,undefined);assert.equal(g.state.wildCraft.projects.length,0);assert.ok(wildStock(g,0).soakedHide>0);assert.equal(t.items.cleanHide,0);
});
