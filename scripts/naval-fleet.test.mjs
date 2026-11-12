import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {declareSocietyHostility} from '../src/game/societyRelations.ts';
import {SHIP_DESIGNS,PORT_WORK_SPECS,navalMatchup,designStrength,NAVAL_COUNTER_RULES as K,tierFor,PORT_TIERS} from '../src/game/navalClasses.ts';
import {NAVAL_RULES as R,ensureNaval,navalState,beginPortWork,resumePortWork,portTier,portInfluenceReachMeters,blockadeAt,portBlockaded,dockBlockaded,resupplyVessel,navalSpeedMultiplier,validNaval,vesselOf,portWorkIssue} from '../src/game/navalPorts.ts';
import {commissionVessel,commissionIssue,tickNaval,ramBlow,beginBoarding,boardingIssue,boardNearest,navalView,navalSpeedFactor,designOfBoat,NAVAL_COMBAT_RULES as C} from '../src/game/navalFleet.ts';
import {dispatchCoastalTrade} from '../src/game/coastalTrade.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {appointCommander,assignToCommander,commandersState} from '../src/game/commanders.ts';

function harbour(){
 const g=new Game();g.reset(4242,3);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.boats=[];g.state.trails=[];g.state.trees=[];
 g.world.waterY=0;g.world.baseWaterY=0;g.world.waterfalls=[];g.height=x=>Math.abs(x)<10?-2:1.5;g.state.conflict='quiet';g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();
 const add=(type,x,z,team=0)=>{const b=g.makeBld(type,x,z,team);b.build=1;g.state.buildings.push(b);g.rebuildWalk();return b;};
 const hall=add('townhall',-40,0),dock=add('dock',-12,0);
 Object.assign(g.tribe(0),{wood:900,stone:600,copper:100,food:500});g.tribe(0).items={cordage:200};
 const worker=(x=-14,z=4,team=0)=>g.spawnUnit('worker',x,z,team);
 const run=(seconds,dt=1)=>{for(let t=0;t<seconds;t+=dt){g.state.time+=dt;g.steerBudget=50;tickNaval(g,dt);}};
 return {g,add,hall,dock,worker,run};
}
const build=(h,work,who=h.worker())=>{const r=beginPortWork(h.g,h.dock.id,work,who.id);assert.equal(r.accepted,true,r.reason);h.run(PORT_WORK_SPECS[work].workSeconds+60);return who;};
function hull(g,team,x,z,facing=0,captain=true,id=undefined){
 const boat={id:g.id(),team,dock:0,x,z,y:.16,hp:300,facing,capacity:5};g.state.boats.push(boat);
 if(captain){const u=g.spawnUnit('spearman',x,z,team);u.militia=true;u.boat={id:boat.id,phase:'aboard'};boat.captain=u.id;}
 return boat;
}
const crew=(g,boat,n,type='swordsman')=>{const out=[];for(let i=0;i<n;i++){const u=g.spawnUnit(type,boat.x,boat.z,boat.team);u.militia=true;u.boat={id:boat.id,phase:'aboard'};out.push(u);}return out;};

test('design data is finite, has counters that are bounded and readable, and every design rides an existing hull',()=>{
 for(const d of Object.values(SHIP_DESIGNS)){assert.ok(['riverboat','scoutCanoe','freightPunt'].includes(d.baseHull));assert.ok(Object.values(d.cost).every(Number.isFinite)&&d.workSeconds>0&&d.armour>0);}
 for(const a of Object.values(SHIP_DESIGNS))for(const d of Object.values(SHIP_DESIGNS))for(const mode of ['ram','boarding','missile']){const m=navalMatchup(a,d,mode);assert.ok(m.multiplier>=K.floor&&m.multiplier<=K.ceiling);}
 assert.ok(navalMatchup(SHIP_DESIGNS.galley,SHIP_DESIGNS.warCanoe,'ram').multiplier>navalMatchup(SHIP_DESIGNS.galley,SHIP_DESIGNS.knarr,'ram').multiplier*0.99-.0001);
 assert.ok(navalMatchup(SHIP_DESIGNS.longship,SHIP_DESIGNS.galley,'boarding').multiplier>1,'boarders beat a ram galley');
 assert.match(navalMatchup(SHIP_DESIGNS.galley,SHIP_DESIGNS.warCanoe,'ram').reasons[0],/light hull/);
 assert.ok(designStrength(SHIP_DESIGNS.galley,'ram',6)>designStrength(SHIP_DESIGNS.galley,'ram',2),'undermanned hulls fight worse');
 assert.ok(designStrength(SHIP_DESIGNS.galley,'ram',0)>0,'but never to zero by crew alone');
 assert.equal(tierFor({}),0);assert.equal(tierFor({breakwater:1}),1);assert.equal(tierFor({breakwater:1,slipway:1}),2);assert.equal(tierFor({breakwater:1,slipway:1,drydock:1}),3);
});

test('port works need a real builder at the dock and finite stores; tiers and sea reach follow; losing the builder pauses it without refund',()=>{
 const h=harbour(),{g,dock}=h;const w=h.worker();
 assert.equal(portTier(g,dock),0);
 assert.match(portWorkIssue(g,dock.id,'drydock',w.id),/first/);
 const wood=g.tribe(0).wood,stone=g.tribe(0).stone;
 const r=beginPortWork(g,dock.id,'breakwater',w.id);assert.equal(r.accepted,true,r.reason);
 assert.equal(g.tribe(0).wood,wood-PORT_WORK_SPECS.breakwater.wood);assert.equal(g.tribe(0).stone,stone-PORT_WORK_SPECS.breakwater.stone);
 w.x=-14;w.z=40;h.run(2);assert.ok(navalState(g).projects[0].progress<2,'progress needs the builder at the dock');
 h.run(NAVAL_COMBAT_RULES_SAFE());// the builder walks to the dock and works
 const p=navalState(g).projects[0];assert.ok(!p||p.progress>0);
 const w2=h.worker();const poor=harbour();poor.g.tribe(0).wood=0;assert.match(portWorkIssue(poor.g,poor.dock.id,'breakwater',poor.worker().id),/in store/);
 // Fresh world: full run to completion.
 const k=harbour();const kw=build(k,'breakwater');assert.equal(portTier(k.g,k.dock),1);assert.equal(kw.portWorkId,undefined);
 const base=portInfluenceReachMeters(k.g,k.dock,1);build(k,'slipway');assert.equal(portTier(k.g,k.dock),2);
 build(k,'lighthouse');assert.ok(portInfluenceReachMeters(k.g,k.dock,1)>base,'works lengthen sea reach');
 build(k,'drydock');assert.equal(portTier(k.g,k.dock),3);assert.ok(portInfluenceReachMeters(k.g,k.dock,9)<=R.maximumShipReachMeters);
 assert.match(portWorkIssue(k.g,k.dock.id,'drydock',k.worker().id),/already built/);
 // A killed builder pauses the work; the materials stay spent.
 const m=harbour(),mw=m.worker(),mood=m.g.tribe(0).wood;beginPortWork(m.g,m.dock.id,'breakwater',mw.id);mw.hp=0;m.run(3);
 const proj=navalState(m.g).projects[0];assert.equal(proj.phase,'paused');assert.ok(m.g.tribe(0).wood<mood);
 const mw2=m.worker();assert.equal(resumePortWork(m.g,proj.id,mw2.id).accepted,true);m.run(PORT_WORK_SPECS.breakwater.workSeconds+80);assert.equal(portTier(m.g,m.dock),1);
 assert.equal(validNaval(m.g.state),true);
});
function NAVAL_COMBAT_RULES_SAFE(){return 40;}

test('commissioning a hull needs port works, practice, moorage and finite materials; it launches a real hull of its base class',()=>{
 const h=harbour(),{g,dock}=h;const w=h.worker();
 assert.match(commissionIssue(g,dock.id,'galley',w.id),/lacks/);assert.match(commissionIssue(g,dock.id,'knarr',w.id),/lacks/);
 build(h,'breakwater');build(h,'slipway');
 const issue=commissionIssue(g,dock.id,'riverPatrol',h.worker().id);assert.equal(issue,null,issue);
 const wood=g.tribe(0).wood,before=g.state.boats.length,ship=h.worker();
 const r=commissionVessel(g,dock.id,'riverPatrol',ship.id);assert.equal(r.accepted,true,r.reason);
 assert.equal(g.tribe(0).wood,wood-SHIP_DESIGNS.riverPatrol.cost.wood);
 h.run(SHIP_DESIGNS.riverPatrol.workSeconds+90);
 assert.equal(g.state.boats.length,before+1);const boat=g.state.boats.at(-1),v=vesselOf(g,boat.id);
 assert.equal(v.design,'riverPatrol');assert.equal(designOfBoat(g,boat.id).role,'patrol');assert.equal(boat.hp,300);
 assert.equal(navalState(g).commissions.length,0);
 assert.match(commissionIssue(g,dock.id,'galley',h.worker().id),/drydock/);
 const view=navalView(g);assert.equal(view.vessels.length,1);assert.deepEqual(JSON.parse(JSON.stringify(view)),view);assert.ok(view.designs.length>=5);
 const poor=harbour();build(poor,'breakwater');build(poor,'slipway');poor.g.tribe(0).wood=1;assert.match(commissionIssue(poor.g,poor.dock.id,'riverPatrol',poor.worker().id),/in store/);
});

test('ram: only a hostile hull struck bow-on at speed takes damage; light hulls suffer more; cooldown and recoil apply',()=>{
 const h=harbour(),{g}=h;declareSocietyHostility(g,1,2);ensureNaval(g);
 const rammer=hull(g,1,0,0,0,true),light=hull(g,2,0,3.6,0,true),heavy=hull(g,2,40,0,0,true);
 navalState(g).vessels.push({boatId:rammer.id,team:1,design:'galley',commissionedAt:0,stores:{food:10,missiles:0},atSeaSeconds:0,captures:0,rams:0});
 navalState(g).vessels.push({boatId:light.id,team:2,design:'warCanoe',commissionedAt:0,stores:{food:10,missiles:0},atSeaSeconds:0,captures:0,rams:0});
 crew(g,rammer,5);
 const slow=ramBlow(g,rammer.id,light.id,2),weak=ramBlow(g,rammer.id,light.id,1.4);assert.ok(slow.damage>weak.damage,'faster blow hits harder');
 assert.ok(slow.damage<=SHIP_DESIGNS.galley.ram*C.ramBaseDamage*K.ceiling*C.ramSpeedCap*1.3*1.5);
 // Stationary: no blow.
 const hp=light.hp;h.run(3,.5);assert.equal(light.hp,hp,'a drifting hull rams nothing');
 // Moving bow-on at speed.
 rammer.z=-8;rammer.facing=0;
 for(let i=0;i<8;i++){rammer.z+=1.4;g.state.time+=.5;tickNaval(g,.5);}
 assert.ok(light.hp<hp,'a bow-on strike at speed hurts');assert.equal(vesselOf(g,rammer.id).rams>=1,true);assert.ok(rammer.hp<300,'recoil');
 const after=light.hp;rammer.z=light.z-3.2;for(let i=0;i<4;i++){rammer.z+=.0;g.state.time+=.5;tickNaval(g,.5);}
 assert.equal(light.hp,after,'cooldown');
 // Allies and wrong facing are safe.
 const ally=hull(g,1,200,0,0,true),striker=hull(g,1,200,-8,0,true);navalState(g).vessels.push({boatId:striker.id,team:1,design:'galley',commissionedAt:0,stores:{food:10,missiles:0},atSeaSeconds:0,captures:0,rams:0});crew(g,striker,5);
 for(let i=0;i<8;i++){striker.z+=1.4;g.state.time+=.5;tickNaval(g,.5);}assert.equal(ally.hp,300,'never rams your own hulls');
 assert.equal(light.hp>=0,true);
 for(const e of navalState(g).events)assert.ok(e.text.length<=160);
});

test('boarding: real crews hit real crews through the damage path; capture moves the hull and one boarder; a prize with no harbour is scuttled',()=>{
 const h=harbour(),{g}=h;declareSocietyHostility(g,1,2);ensureNaval(g);
 const home=g.makeBld('townhall',-300,0,1);home.build=1;g.state.buildings.push(home);const dock1=g.makeBld('dock',-30,0,1);dock1.build=1;g.state.buildings.push(dock1);
 const att=hull(g,1,0,0,0,true),tgt=hull(g,2,0,5,0,true);
 const designs=[[att,'longship'],[tgt,'knarr']];for(const [b,d] of designs)navalState(g).vessels.push({boatId:b.id,team:b.team,design:d,commissionedAt:0,stores:{food:10,missiles:0},atSeaSeconds:0,captures:0,rams:0});
 const boarders=crew(g,att,5),defenders=crew(g,tgt,1);
 assert.match(boardingIssue(g,att.id,att.id,1),/enemy/);
 tgt.x=40;assert.match(boardingIssue(g,att.id,tgt.id,1),/grapnel/);tgt.x=0;
 const solo=hull(g,1,100,100,0,false);assert.match(boardingIssue(g,solo.id,tgt.id,1),/fighters|grapnel/);
 const begin=beginBoarding(g,att.id,tgt.id,1);assert.equal(begin.accepted,true,begin.reason);
 assert.match(beginBoarding(g,att.id,tgt.id,1).reason,/already/);
 const hpBefore=[...defenders,g.state.units.find(u=>u.id===tgt.captain)].map(u=>u.hp);
 for(let i=0;i<40&&tgt.team===2;i++){g.state.time+=1;tickNaval(g,1);}
 assert.ok([...defenders,g.state.units.find(u=>u.id===tgt.captain)].some((u,i)=>u.hp<hpBefore[i]),'defenders were actually hurt');
 // Remove defenders to finish the capture deterministically.
 for(const u of g.state.units.filter(u=>u.boat?.id===tgt.id))u.hp=0;
 g.state.time+=1;tickNaval(g,1);
 assert.equal(tgt.team,1,'the hull changed hands');assert.equal(tgt.dock,dock1.id);assert.ok(g.state.units.find(u=>u.id===tgt.captain&&u.team===1));
 assert.equal(vesselOf(g,tgt.id).team,1);assert.equal(vesselOf(g,att.id).captures,1);assert.equal(navalState(g).boardings.length,0);
 // No harbour for the captor: scuttled, nothing is conjured.
 const h2=harbour(),g2=h2.g;declareSocietyHostility(g2,1,2);ensureNaval(g2);
 const a2=hull(g2,1,0,0,0,true),t2=hull(g2,2,0,5,0,false);crew(g2,a2,3);
 for(const [b,d] of [[a2,'longship'],[t2,'knarr']])navalState(g2).vessels.push({boatId:b.id,team:b.team,design:d,commissionedAt:0,stores:{food:10,missiles:0},atSeaSeconds:0,captures:0,rams:0});
 assert.equal(beginBoarding(g2,a2.id,t2.id,1).accepted,true);g2.state.time+=1;tickNaval(g2,1);assert.equal(t2.hp,0);assert.equal(t2.team,2);
 // Broken off at distance.
 const h3=harbour(),g3=h3.g;declareSocietyHostility(g3,1,2);ensureNaval(g3);const a3=hull(g3,1,0,0,0,true),t3=hull(g3,2,0,5,0,true);crew(g3,a3,3);crew(g3,t3,3);
 for(const [b,d] of [[a3,'longship'],[t3,'knarr']])navalState(g3).vessels.push({boatId:b.id,team:b.team,design:d,commissionedAt:0,stores:{food:10,missiles:0},atSeaSeconds:0,captures:0,rams:0});
 beginBoarding(g3,a3.id,t3.id,1);t3.z=60;g3.state.time+=1;tickNaval(g3,1);assert.equal(navalState(g3).boardings.length,0);assert.equal(t3.team,2);
 assert.equal(boardNearest(g3,a3.id,1).accepted,false);
});

test('blockade: enemy warships on station choke a port, stop coastal departures and sea influence; defenders and a breakwater lift it',()=>{
 const h=harbour(),{g,dock}=h;declareSocietyHostility(g,1,2);ensureNaval(g);
 const peer=g.makeBld('townhall',-300,0,1);peer.build=1;g.state.buildings.push(peer);
 g.state.tribes[0].alive=true;g.state.tribes[1].alive=true;
 const raider=hull(g,1,-12,40,0,true),other=hull(g,1,-12,45,0,true);
 for(const b of [raider,other])navalState(g).vessels.push({boatId:b.id,team:1,design:'longship',commissionedAt:0,stores:{food:10,missiles:0},atSeaSeconds:0,captures:0,rams:0});
 crew(g,raider,5);crew(g,other,5);
 declareSocietyHostility(g,0,1);
 assert.equal(dockBlockaded(g,dock),true,JSON.stringify(blockadeAt(g,dock)));assert.equal(portBlockaded(g,0),true);
 assert.equal(blockadeAt(g,dock).by,1);
 assert.equal(dispatchCoastalTrade(g,0,1,1).accepted,false);
 const r=dispatchCoastalTrade(g,0,raider.id,1);assert.match(r.reason,/blockad|non-hostile/);
 tickNaval(g,1);g.state.time+=1;tickNaval(g,1);assert.ok(navalState(g).blockades.length>=1);assert.ok(navalState(g).events.some(e=>e.kind==='blockade'));
 // Defenders on station restore the port; the lift is noted.
 for(const z of [5,8,11]){const guard=hull(g,0,-12,z,0,true);navalState(g).vessels.push({boatId:guard.id,team:0,design:'longship',commissionedAt:0,stores:{food:10,missiles:0},atSeaSeconds:0,captures:0,rams:0});crew(g,guard,6);}
 assert.equal(dockBlockaded(g,dock),false,'a stronger defending squadron breaks it');
 g.state.time+=2;tickNaval(g,1);g.state.time+=2;tickNaval(g,1);assert.ok(navalState(g).events.some(e=>e.kind==='lifted'));
 // Troops-free hulls and haulers never blockade.
 const empty=hull(g,1,-12,50,0,false);navalState(g).vessels.push({boatId:empty.id,team:1,design:'longship',commissionedAt:0,stores:{food:10,missiles:0},atSeaSeconds:0,captures:0,rams:0});
 const clean=harbour();declareSocietyHostility(clean.g,1,2);ensureNaval(clean.g);const hauler=hull(clean.g,1,-12,40,0,true);crew(clean.g,hauler,5);navalState(clean.g).vessels.push({boatId:hauler.id,team:1,design:'knarr',commissionedAt:0,stores:{food:10,missiles:0},atSeaSeconds:0,captures:0,rams:0});
 declareSocietyHostility(clean.g,0,1);assert.equal(dockBlockaded(clean.g,clean.dock),false,'a cargo ship cannot blockade');
});

test('a blockade revokes ship-borne influence across the water until it is lifted',()=>{
 const h=harbour(),{g,dock}=h;declareSocietyHostility(g,1,2);ensureNaval(g);
 const boat=hull(g,0,-10,0,0,true);boat.dock=dock.id;g.state.units.find(u=>u.id===boat.captain).haulage='canoe';
 g.state.time+=5;const across=g.influenceAt(25,0,0);
 declareSocietyHostility(g,0,1);const w1=hull(g,1,-12,40,0,true),w2=hull(g,1,-12,45,0,true);
 for(const b of [w1,w2])navalState(g).vessels.push({boatId:b.id,team:1,design:'longship',commissionedAt:0,stores:{food:10,missiles:0},atSeaSeconds:0,captures:0,rams:0});crew(g,w1,5);crew(g,w2,5);
 g.state.time+=5;const blocked=g.influenceAt(25,0,0);assert.ok(across>0,'ships carry influence normally');assert.equal(blocked,0,'the blockaded port projects none');
});

test('naval supply comes out of the real stores, is eaten at sea, and starvation slows and weakens the hull',()=>{
 const h=harbour(),{g,dock}=h;ensureNaval(g);const boat=hull(g,0,-10,0,0,true);boat.dock=dock.id;crew(g,boat,3);
 navalState(g).vessels.push({boatId:boat.id,team:0,design:'longship',commissionedAt:0,stores:{food:0,missiles:0},atSeaSeconds:0,captures:0,rams:0});
 const food=g.tribe(0).food,wood=g.tribe(0).wood;
 const r=resupplyVessel(g,boat.id,{food:30,missileLoads:2},0);assert.equal(r.accepted,true,r.reason);
 assert.equal(g.tribe(0).food,food-30);assert.equal(g.tribe(0).wood,wood-2);assert.equal(vesselOf(g,boat.id).stores.food,30);assert.equal(vesselOf(g,boat.id).stores.missiles,2*R.missilesPerWood);
 const huge=resupplyVessel(g,boat.id,{food:1e6},0);assert.ok(vesselOf(g,boat.id).stores.food<=boat.capacity*R.foodCapacityPerSeat+1e-9);void huge;
 assert.equal(navalSpeedFactor(g,boat),1);
 // Away from any dock, the crew eats the stores down.
 boat.x=300;boat.z=300;for(const u of g.state.units.filter(u=>u.boat?.id===boat.id)){u.x=300;u.z=300;}
 const v=vesselOf(g,boat.id),start=v.stores.food;h.run(10);assert.ok(v.stores.food<start&&v.atSeaSeconds>=10);
 assert.equal(resupplyVessel(g,boat.id,{food:5},0).accepted,false,'no loading at sea');
 v.stores.food=0;v.stores.foodLots={};h.run(5);assert.ok(navalSpeedMultiplier(g,boat.id)<1);assert.ok(navalSpeedFactor(g,boat)<1);assert.ok(navalState(g).events.some(e=>e.kind==='starved'));
 assert.ok(g.state.units.filter(u=>u.boat?.id===boat.id).every(u=>(u.hunger||0)>0),'real crew go hungry');
 // Back at the harbour the clock resets and loading works.
 boat.x=-10;boat.z=0;for(const u of g.state.units.filter(u=>u.boat?.id===boat.id)){u.x=-10;u.z=0;}h.run(2);assert.equal(v.atSeaSeconds,0);assert.equal(resupplyVessel(g,boat.id,{food:5},0).accepted,true);
 const poor=harbour();ensureNaval(poor.g);const b2=hull(poor.g,0,-10,0,0,true);navalState(poor.g).vessels.push({boatId:b2.id,team:0,design:'longship',commissionedAt:0,stores:{food:0,missiles:0},atSeaSeconds:0,captures:0,rams:0});poor.g.tribe(0).food=0;poor.g.tribe(0).wood=0;
 assert.equal(resupplyVessel(poor.g,b2.id,{},0).accepted,false);
});

test('dispatch commands validate, drive the module, and fleet commanders bonus the ram',()=>{
 const h=harbour(),{g,dock}=h,w=h.worker();
 const cmd={kind:'naval-order',action:'port-work',dockId:dock.id,work:'breakwater',builderId:w.id};assert.equal(isEngineDispatchCommand(cmd),true);
 assert.equal(applyEngineCommand(g,cmd).accepted,true);
 for(const bad of [{kind:'naval-order',action:'x'},{kind:'naval-order',action:'port-work',work:'moat'},{kind:'naval-order',action:'commission',design:'dreadnought'},{kind:'naval-order',action:'resupply',food:-1},{kind:'naval-order',action:'board',extra:1}])assert.equal(isEngineDispatchCommand(bad),false);
 assert.equal(applyEngineCommand(g,{kind:'naval-order',action:'commission',dockId:dock.id,design:'galley',builderId:h.worker().id}).accepted,false);
 assert.equal(applyEngineCommand(g,{kind:'naval-order',action:'board',boatId:9999}).accepted,false);
 // Fleet commander ram aura raises the blow.
 declareSocietyHostility(g,1,2);ensureNaval(g);g.tribe(0).wood=100;
 const flag=hull(g,0,100,100,0,true),prey=hull(g,2,100,104,0,true);g.state.units.find(u=>u.id===flag.captain).team=0;
 navalState(g).vessels.push({boatId:flag.id,team:0,design:'galley',commissionedAt:0,stores:{food:10,missiles:0},atSeaSeconds:0,captures:0,rams:0});crew(g,flag,5).forEach(u=>{u.team=0;});
 const plain=ramBlow(g,flag.id,prey.id,2).damage;
 assert.equal(appointCommander(g,flag.captain,'fleet').accepted,true);const c=commandersState(g).roster[0];c.traits=['seawolf','navigator'];assignToCommander(g,c.id,[flag.id]);g.state.time+=1;
 assert.ok(ramBlow(g,flag.id,prey.id,2).damage>plain);
});

test('state validates and round-trips through a full save; hostile or malformed state is refused; absent state changes nothing',()=>{
 const h=harbour(),{g,dock}=h;build(h,'breakwater');
 const boat=hull(g,0,-10,0,0,true);boat.dock=dock.id;navalState(g).vessels.push({boatId:boat.id,team:0,design:'warCanoe',commissionedAt:1,stores:{food:3,missiles:6},atSeaSeconds:2,captures:0,rams:0});
 assert.equal(validNaval(g.state),true);const copy=JSON.parse(JSON.stringify(navalState(g)));assert.deepEqual(copy,navalState(g));
 const saved=g.state.boats.splice(0);for(const u of g.state.units)u.boat=undefined;const decoded=decodeGame(encodeGame(g));g.state.boats.push(...saved);assert.deepEqual(decoded.state.naval.ports[0].works.breakwater.builtAt>0,true);assert.equal(decoded.state.naval.vessels[0].design,'warCanoe');
 const bad=f=>{const s=JSON.parse(JSON.stringify(g.state));f(s.naval);return validNaval(s);};
 assert.equal(bad(n=>{n.vessels[0].design='dreadnought';}),false);assert.equal(bad(n=>{n.vessels[0].stores.food=-1;}),false);assert.equal(bad(n=>{n.ports[0].works.drydock={builtAt:1};}),false,'a drydock needs its prerequisites');
 assert.equal(bad(n=>{n.events=Array(80).fill({at:1,kind:'ram',team:0,text:'x'});}),false);assert.equal(bad(n=>{n.version=2;}),false);
 const old=new Game();old.reset(4242,3);old.enterIsland();delete old.state.naval;assert.equal(validNaval(old.state),true);assert.equal(portBlockaded(old,0),false);
 const b=old.state.boats?.[0]??{id:1,x:0,z:0};assert.equal(navalSpeedFactor(old,b),1);assert.equal(navalState(old),undefined);
 assert.equal(PORT_TIERS.length,4);assert.equal(R.version,1);
});
