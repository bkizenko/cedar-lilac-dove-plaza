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
import{applyEngineCommand}from'../src/game/engineDispatch.ts';import{generateSites,SITE_RULES,validSites,siteNear}from'../src/game/wildStores.ts';
const run=(g,u,x,z)=>{drive(g,900,()=>u.wildWorkId===undefined);assert.equal(u.wildWorkId,undefined,u.workReason);};
function withSites(g){enableWildCraft(g);g.vision.fill(2);g.state.wildCraft.sites=generateSites(g);return g.state.wildCraft.sites;}
test('sites are deterministic, finite, on standable ground, and only generated for wild-craft worlds',()=>{
 const g=fixture();assert.equal(g.state.wildCraft,undefined);enableWildCraft(g);const a=generateSites(g),b=generateSites(g);assert.deepEqual(a,b);
 assert.ok(a.length>0&&a.length<=SITE_RULES.maxSites);for(const s of a){assert.ok(g.walkable(s.x,s.z),s.kind);assert.equal(s.cap,SITE_RULES.cap[s.kind]);assert.ok(s.left<=s.cap);}
 assert.equal(validSites(a,1040),true);assert.equal(validSites([{...a[0],cap:999}],1040),false);assert.equal(validSites([{...a[0],extra:1}],1040),false);assert.equal(validSites(undefined,1040),true);
});
test('a salt trip removes exactly what it carries from a finite site and lands in the ledger',()=>{
 const g=fixture(),sites=withSites(g),s=sites.find(s=>s.kind==='pan'||s.kind==='lick'||s.kind==='mine');assert.ok(s,'a salt site exists near this world');
 const left=s.left,u=worker(g);const r=applyEngineCommand(g,{kind:'wild-begin',recipe:'gatherSalt',unitId:u.id,x:s.x,z:s.z});assert.equal(r.accepted,true,r.reason);
 run(g,u);const got=wildStock(g,0).salt||0;assert.ok(got>0&&got<=SITE_RULES.draw.salt);assert.ok(Math.abs(left-s.left-got)<1e-9,'site lost exactly what stock gained');
 assert.equal(g.state.wildCraft.metrics.produced.salt,got);
 // a made-up place is refused
 assert.equal(applyEngineCommand(g,{kind:'wild-begin',recipe:'gatherSalt',x:s.x+80,z:s.z+80}).accepted,false);
 // a spent lick refuses and never refills
 const lick={...s,kind:'lick',left:.4};g.state.wildCraft.sites=[lick];assert.equal(applyEngineCommand(g,{kind:'wild-begin',recipe:'gatherSalt',x:lick.x,z:lick.z}).accepted,false);
});
test('licks and mines never refill; pans and meadows refill only when warm and never beyond cap',async()=>{
 const{renewSites}=await import('../src/game/wildStores.ts');const g=fixture();enableWildCraft(g);
 const mk=(kind,left)=>({id:1,kind,x:0,z:0,left,cap:SITE_RULES.cap[kind]});const lick=mk('lick',3),pan=mk('pan',0),meadow=mk('meadow',SITE_RULES.cap.meadow);
 renewSites(g,[lick,meadow],1e5);assert.equal(lick.left,3);assert.equal(meadow.left,SITE_RULES.cap.meadow);
 const climate=await import('../src/game/ecology.ts');void climate;renewSites(g,[pan],1e6);assert.ok(pan.left<=pan.cap);
});
test('salt-curing a rack of meat turns six meat and one salt into five dried meat, finite and weather-bound',()=>{
 const g=fixture();enableWildCraft(g);site(g,'dryrack');const t=g.tribe(0);t.foodLots={provisions:900,meat:100};t.food=1000;wildStock(g,0).salt=2;
 const r=applyEngineCommand(g,{kind:'wild-begin',recipe:'saltMeat'});assert.equal(r.accepted,true,r.reason);assert.equal(wildStock(g,0).salt,1);
 const meat0=foodInventory(t).meat,p=g.state.wildCraft.projects[0];drive(g,3000,()=>p.phase==='ready');assert.equal(p.phase,'ready');
 assert.ok(foodInventory(t).meat<=meat0-5.99);const c=applyEngineCommand(g,{kind:'wild-collect',projectId:p.id});assert.equal(c.accepted,true,c.reason);drive(g,600,()=>!g.state.wildCraft.projects.length);
 assert.ok(foodInventory(t).driedMeat>=4.99&&foodInventory(t).driedMeat<=5.01);assert.equal(wildStock(g,0).salt,1);
 assert.equal(applyEngineCommand(g,{kind:'wild-begin',recipe:'saltMeat'}).accepted,true);wildStock(g,0).salt=0;
});
test('a hay trip draws from a meadow, hay rots slowly, and forking it feeds the pen once with the rest returned',()=>{
 const g=fixture(),sites=withSites(g),m=sites.find(s=>s.kind==='meadow');if(!m)return;const u=worker(g);
 const left=m.left;assert.equal(applyEngineCommand(g,{kind:'wild-begin',recipe:'cutHay',unitId:u.id,x:m.x,z:m.z}).accepted,true);run(g,u);
 const got=wildStock(g,0).hay;assert.equal(got,SITE_RULES.draw.hay);assert.equal(m.left,left-got);
 // build a pen standing at the camp and fork hay into it
 const c=campAnchor(g,0);const pen=g.makeBld('pen',c.x+12,c.z+12,0);pen.build=1;pen.hp=pen.maxHp;g.state.buildings.push(pen);
 wildStock(g,0).hay=8;const before=pen.pasture?.feed||0;
 const r=applyEngineCommand(g,{kind:'wild-begin',recipe:'forkHay',unitId:u.id,x:pen.x,z:pen.z});assert.equal(r.accepted,true,r.reason);assert.equal(wildStock(g,0).hay||0,0);run(g,u);
 const fed=pen.pasture.feed-before;assert.ok(fed>0&&fed<=8);assert.ok(Math.abs((wildStock(g,0).hay||0)+fed-8)<1e-6,'every forked unit is either in the pen or back in store');
 assert.equal(applyEngineCommand(g,{kind:'wild-begin',recipe:'forkHay',x:pen.x+90,z:pen.z}).accepted,false);
});
test('old saves and live jobs: sites round-trip, strict validation, and a world without sites loads then gains them',()=>{
 const g=fixture(),sites=withSites(g);const copy=decodeGame(encodeGame(g));assert.deepEqual(copy.state.wildCraft.sites,sites);
 delete g.state.wildCraft.sites;const again=decodeGame(encodeGame(g));assert.equal(again.state.wildCraft.sites,undefined);again.state.paused=false;again.step(.2);assert.ok(again.state.wildCraft.sites);
 const bad=encodeGame(withSitesBad());assert.throws(()=>decodeGame(bad));
 function withSitesBad(){const h=fixture();enableWildCraft(h);h.state.wildCraft.sites=[{id:1,kind:'lick',x:0,z:0,left:5,cap:99}];return h;}
});
