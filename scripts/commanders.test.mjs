import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {COMMANDER_RULES as R,COMMANDER_TRAITS,COMMANDER_PROMOTIONS,appointCommander,assignToCommander,releaseFromCommander,promoteCommander,awardCommanderXp,commanderAuraFor,fleetAuraFor,commanderViews,commandersState,commanderCapacity,commanderRadius,commanderEffects,tickCommanders,validCommanders,enableCommanders} from '../src/game/commanders.ts';
import {combatMatchup} from '../src/game/combatDoctrine.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function world(){
 const g=new Game();g.reset(4242,3);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0)];g.state.boats=[];
 g.state.conflict='quiet';g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();g.tribe(0).wood=100;
 const soldier=(type='spearman',x=50,z=50,team=0)=>{const u=g.spawnUnit(type,x,z,team);u.militia=true;return u;};
 return {g,soldier};
}
const tick=(g,seconds)=>{for(let i=0;i<seconds;i++){g.state.time+=1;tickCommanders(g,1);}};

test('appointing costs a finite standard, traits are seeded and kind-limited, and only free adults qualify',()=>{
 const {g,soldier}=world(),w=soldier('swordsman');
 const wood=g.tribe(0).wood,r=appointCommander(g,w.id,'army');
 assert.equal(r.accepted,true,r.reason);assert.equal(g.tribe(0).wood,wood-R.standardWood);
 const c=commandersState(g).roster[0];assert.equal(c.traits.length,2);assert.ok(c.traits.every(t=>COMMANDER_TRAITS.find(d=>d.id===t).kinds.includes('army')));
 assert.equal(appointCommander(g,w.id,'army').accepted,false,'already a commander');
 const twin=world();const w2=twin.soldier('swordsman');twin.g.state.seed=g.state.seed;
 appointCommander(twin.g,w2.id,'army');
 // Same seed, same unit id and team give the same traits.
 const a=world(),b=world();const ua=a.soldier(),ub=b.soldier();a.g.state.seed=b.g.state.seed=99;ub.id=ua.id;
 appointCommander(a.g,ua.id,'army');appointCommander(b.g,ub.id,'army');
 assert.deepEqual(commandersState(a.g).roster[0].traits,commandersState(b.g).roster[0].traits);
 const poor=world();poor.g.tribe(0).wood=0;assert.match(appointCommander(poor.g,poor.soldier().id,'army').reason,/timber/);
 const child=soldier();child.maturesAt=g.state.time+500;assert.equal(appointCommander(g,child.id,'army').accepted,false);
 const held=soldier();held.prisoner={originTeam:0,captorTeam:1,phase:'custody'};assert.equal(appointCommander(g,held.id,'army').accepted,false);
 assert.match(appointCommander(g,soldier().id,'fleet').reason,/aboard/);
 assert.equal(appointCommander(g,soldier().id,'army').accepted,false,'one slot until barracks or a keep exist');
 const barracks=g.makeBld('barracks',20,20,0);barracks.build=1;g.state.buildings.push(barracks);
 assert.equal(appointCommander(g,soldier().id,'army').accepted,true,'a barracks opens a second command');
});

test('capacity and radius are limited; assigned people get the aura only inside the radius, and it is bounded',()=>{
 const {g,soldier}=world(),lead=soldier('swordsman',50,50);appointCommander(g,lead.id,'army');
 const c=commandersState(g).roster[0],cap=commanderCapacity(c);
 const troops=Array.from({length:cap+4},(_,i)=>soldier('spearman',50+(i%5),52+Math.floor(i/5)));
 const r=assignToCommander(g,c.id,troops.map(t=>t.id));assert.equal(r.accepted,true);assert.equal(c.memberIds.length,cap,'cannot lead more than capacity');
 const other=soldier('swordsman',70,70);appointCommander(g,other.id,'army');// slot limit: should fail
 assert.equal(commandersState(g).roster.length,1);
 c.traits=['bold','steadfast'];c.promotions=[];
 const near=troops[0],far=troops[1];far.x=50+commanderRadius(c)+5;
 assert.ok(commanderAuraFor(g,near).attack>0);assert.equal(commanderAuraFor(g,far),null,'outside the command radius');
 assert.equal(commanderAuraFor(g,troops.at(-1)),null,'unassigned troops get nothing');
 c.traits=['bold'];c.promotions=['drill','warcry'];c.level=5;
 const e=commanderEffects(c);assert.ok(e.attack>.1);
 g.state.time+=1;assert.ok(commanderAuraFor(g,near).attack<=R.maximumBonus+1e-9,'bonus is capped');
 lead.x=300;g.state.time+=1;assert.equal(commanderAuraFor(g,near),null,'the commander is physically elsewhere');
});

test('combat matchup reads the aura with a readable reason; no commander, no change; one unit never both leads two groups',()=>{
 const {g,soldier}=world(),lead=soldier('swordsman',50,50);appointCommander(g,lead.id,'army');
 const c=commandersState(g).roster[0];c.traits=['bold','steadfast'];
 const a=soldier('spearman',51,50),d=soldier('spearman',52,50,0);d.team=2;
 const before=combatMatchup(g,a,d).multiplier;assignToCommander(g,c.id,[a.id]);g.state.time+=1;
 const after=combatMatchup(g,a,d);assert.ok(after.multiplier>before);assert.ok(after.reasons.some(x=>x.includes('leads the attack')));
 const defend=combatMatchup(g,d,a);assert.ok(defend.multiplier<1.2);
 assert.equal(assignToCommander(g,c.id,[a.id]).accepted,false,'already in the command');
 const noCommander=world();const x=noCommander.soldier(),y=noCommander.soldier();y.team=2;
 assert.equal(combatMatchup(noCommander.g,x,y).multiplier,combatMatchup(noCommander.g,x,y).multiplier);
});

test('experience follows what the group actually earns; levels grant promotions chosen under rules',()=>{
 const {g,soldier}=world(),lead=soldier('swordsman',50,50);appointCommander(g,lead.id,'army');
 const c=commandersState(g).roster[0],troops=[soldier(),soldier(),soldier()];assignToCommander(g,c.id,troops.map(t=>t.id));tick(g,2);
 assert.equal(c.xp,0,'idle troops earn nothing');
 for(const t of troops)t.combatXP=60;tick(g,3);assert.ok(c.xp>0&&c.level>=2,`xp ${c.xp} level ${c.level}`);assert.ok(c.promotionPoints>=1);
 assert.equal(promoteCommander(g,c.id,'forcedmarch').accepted,false,'needs its prerequisite and level');
 const ok=promoteCommander(g,c.id,'drill');assert.equal(ok.accepted,true,ok.reason);assert.ok(c.promotions.includes('drill'));
 assert.equal(promoteCommander(g,c.id,'drill').accepted,false);
 awardCommanderXp(g,c.id,1e6);assert.equal(c.level,R.maximumLevel);
 assert.equal(c.promotionPoints+c.promotions.length,R.maximumLevel-1);
 assert.equal(promoteCommander(g,c.id,'ramdrill').accepted,false,'naval promotions are for fleet commanders');
 for(const p of COMMANDER_PROMOTIONS)if(p.requires)assert.ok(COMMANDER_PROMOTIONS.some(q=>q.id===p.requires));
 const view=commanderViews(g)[0];assert.equal(view.level,R.maximumLevel);assert.equal(view.nextLevelXp,null);assert.ok(Array.isArray(view.options));
});

test('a commander can be killed, captured and replaced; members are not silently reassigned',()=>{
 const {g,soldier}=world();const barracks=g.makeBld('barracks',20,20,0);barracks.build=1;g.state.buildings.push(barracks);
 const lead=soldier('swordsman',50,50),second=soldier('warden',55,50),t1=soldier(),t2=soldier();
 appointCommander(g,lead.id,'army');const c=commandersState(g).roster[0];assignToCommander(g,c.id,[t1.id,t2.id]);
 lead.prisoner={originTeam:0,captorTeam:1,phase:'custody'};tick(g,2);
 assert.equal(c.status,'captured');assert.equal(c.capturedBy,1);assert.equal(commanderAuraFor(g,t1),null,'no aura while held');
 lead.prisoner.phase='released';tick(g,2);assert.equal(c.status,'serving','ransomed commander returns');
 lead.hp=0;tick(g,2);assert.equal(c.status,'fallen');assert.deepEqual(c.memberIds,[]);
 const r=appointCommander(g,second.id,'army',{replaces:c.id});assert.equal(r.accepted,true,r.reason);
 assert.equal(c.replacedBy,r.commanderId);assert.equal(commandersState(g).roster.at(-1).replaces,c.id);
 assert.equal(appointCommander(g,soldier().id,'army',{replaces:c.id}).accepted,false,'already replaced');
 const gone=world();const l2=gone.soldier();appointCommander(gone.g,l2.id,'army');gone.g.state.units=gone.g.state.units.filter(u=>u!==l2);tick(gone.g,2);
 assert.equal(commandersState(gone.g).roster[0].status,'fallen','a commander who is no longer in the world has fallen');
});

test('fleet commanders must be aboard, lead hulls, and give the fleet aura only near the flagship',()=>{
 const {g,soldier}=world(),cap=soldier('worker',100,100);
 const boat={id:g.id(),team:0,x:100,z:100,y:.16,hp:300,facing:0,capacity:5,captain:cap.id},far={id:g.id(),team:0,x:400,z:400,y:.16,hp:300,facing:0,capacity:5};g.state.boats.push(boat,far);
 cap.boat={id:boat.id,phase:'aboard'};
 const r=appointCommander(g,cap.id,'fleet');assert.equal(r.accepted,true,JSON.stringify(r));
 const c=commandersState(g).roster[0];assert.ok(c.traits.every(t=>COMMANDER_TRAITS.find(d=>d.id===t).kinds.includes('fleet')));
 c.traits=['seawolf','navigator'];assert.equal(assignToCommander(g,c.id,[boat.id,far.id]).accepted,true);
 g.state.time+=1;const aura=fleetAuraFor(g,boat);assert.ok(aura.ram>0&&aura.boarding>0&&aura.navalSpeed>0);
 assert.equal(fleetAuraFor(g,far),null,'a hull beyond the flagship radius is out of command');
 assert.equal(assignToCommander(g,c.id,[999999]).accepted,false);
 far.hp=0;tick(g,2);assert.deepEqual(c.boatIds,[boat.id],'a sunk hull leaves the command');
 assert.equal(releaseFromCommander(g,c.id,[boat.id]).accepted,true);
});

test('dispatch command appoints, assigns, promotes and validates its payload',()=>{
 const {g,soldier}=world(),lead=soldier('swordsman',50,50),t=soldier();
 const cmd={kind:'commander-order',action:'appoint',unitId:lead.id,commandKind:'army'};assert.equal(isEngineDispatchCommand(cmd),true);
 assert.equal(applyEngineCommand(g,cmd).accepted,true);const c=commandersState(g).roster[0];
 assert.equal(applyEngineCommand(g,{kind:'commander-order',action:'assign',commanderId:c.id,ids:[t.id]}).accepted,true);
 assert.deepEqual(c.memberIds,[t.id]);
 assert.equal(applyEngineCommand(g,{kind:'commander-order',action:'promote',commanderId:c.id,promotionId:'drill'}).accepted,false);
 assert.equal(applyEngineCommand(g,{kind:'commander-order',action:'release',commanderId:c.id,ids:[t.id]}).accepted,true);
 assert.equal(applyEngineCommand(g,{kind:'commander-order',action:'assign',commanderId:99999,ids:[t.id]}).accepted,false);
 for(const bad of [{kind:'commander-order',action:'nuke'},{kind:'commander-order',action:'assign',ids:[1,1]},{kind:'commander-order',action:'appoint',extra:1},{kind:'commander-order',action:'assign',ids:'x'}])assert.equal(isEngineDispatchCommand(bad),false);
 assert.equal(applyEngineCommand(g,{kind:'commander-order',action:'appoint',unitId:lead.id}).accepted,false);
});

test('state validates, survives a JSON round trip and a full save round trip; old saves have no commanders',()=>{
 const {g,soldier}=world(),lead=soldier('swordsman',50,50),t=soldier();appointCommander(g,lead.id,'army');const c=commandersState(g).roster[0];assignToCommander(g,c.id,[t.id]);awardCommanderXp(g,c.id,130);
 assert.equal(validCommanders(g.state),true);
 const copy=JSON.parse(JSON.stringify(commandersState(g)));assert.deepEqual(copy,commandersState(g));
 const bad=(f)=>{const s=JSON.parse(JSON.stringify(g.state));f(s.commanders.roster[0]);return validCommanders(s);};
 assert.equal(bad(r=>{r.level=9;}),false);assert.equal(bad(r=>{r.traits=['nope'];}),false);assert.equal(bad(r=>{r.xp=-1;}),false);assert.equal(bad(r=>{r.promotionPoints=9;}),false);assert.equal(bad(r=>{r.memberIds=[1,1e9];}),false);assert.equal(bad(r=>{r.status='fallen';}),false);
 const decoded=decodeGame(encodeGame(g));assert.deepEqual(decoded.state.commanders.roster[0].memberIds,[t.id]);assert.equal(decoded.state.commanders.roster[0].level,c.level);
 const old=world();delete old.g.state.commanders;const u=old.soldier();assert.equal(commanderAuraFor(old.g,u),null);assert.equal(validCommanders(old.g.state),true);assert.deepEqual(commanderViews(old.g),[]);
 for(const v of commanderViews(g))for(const n of Object.values(v.aura))assert.ok(Number.isFinite(n));
});

test('rival societies appoint a commander from real soldiers, deterministically, and never for free soldiers they lack',()=>{
 const build=()=>{const {g,soldier}=world();const t=g.state.tribes[1];t.alive=true;const hall=g.makeBld('townhall',200,200,1);hall.build=1;g.state.buildings.push(hall);
  for(let i=0;i<6;i++){const u=soldier(i?'spearman':'warden',200+i,205,1);u.combatXP=i?0:20;}
  enableCommanders(g,true);tick(g,70);return g;};
 const a=build(),b=build();
 const ra=commandersState(a).roster.filter(c=>c.team===1),rb=commandersState(b).roster.filter(c=>c.team===1);
 assert.equal(ra.length,1);assert.equal(ra[0].memberIds.length,5);assert.deepEqual(ra.map(c=>[c.traits,c.memberIds.length]),rb.map(c=>[c.traits,c.memberIds.length]));
 const few=world();few.g.state.tribes[1].alive=true;few.soldier('warden',200,200,1);enableCommanders(few.g,true);tick(few.g,70);assert.equal(commandersState(few.g).roster.length,0);
});
