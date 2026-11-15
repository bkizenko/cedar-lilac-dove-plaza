import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {GOVERNMENTS,POLICIES,governmentFor,governmentsAvailable,policiesAvailable,governanceEffects,adoptGovernment,setPolicy,appointGovernor,dismissGovernor,governanceJobMul,governanceDmgMul,governanceUnrest,governanceModel,sanitizeGovernance,activeGovernors,BRONZE_AGE} from '../src/game/governance.ts';
const fresh=()=>{const g=new Game();g.reset(4242,10);g.enterIsland();return g;};
const rich=g=>{const t=g.tribe(0);t.food=5000;t.wood=5000;t.stone=5000;};
test('pure tables: Stone Age has only the band council; Bronze unlocks by population; Iron adds states',()=>{
 assert.deepEqual(governmentsAvailable(0,500).map(x=>x.id),['bandCouncil']);
 assert.deepEqual(governmentsAvailable(BRONZE_AGE,10).map(x=>x.id),['bandCouncil']);
 assert.ok(governmentsAvailable(BRONZE_AGE,20).some(x=>x.id==='chiefdom'));assert.ok(!governmentsAvailable(BRONZE_AGE,20).some(x=>x.id==='monarchy'));
 assert.equal(governmentFor(BRONZE_AGE,50).id,'monarchy');assert.equal(governmentFor(2,200).id,'republic');
 assert.ok(!policiesAvailable('bandCouncil',BRONZE_AGE,100).some(p=>p.id==='corvee'),'corvee needs a ruling government');
 assert.ok(GOVERNMENTS.every(g=>g.slots>=1)&&POLICIES.every(p=>p.cost));
});
test('pure effects: policies stack, slot cap applies, governors add standing and lower tax',()=>{
 const e=governanceEffects('chiefdom',['harvestLevy','corvee','warBand'],[]);// slots 2: warBand ignored
 assert.ok(Math.abs(e.jobTime.food-.93)<1e-9&&Math.abs(e.jobTime.wood-.91)<1e-9);assert.equal(e.dmg,1);assert.equal(e.tax,30);
 const q=governanceEffects('chiefdom',[],[1,1,1]);assert.equal(q.legitimacy,4+3,'only one governor counts under a chiefdom');assert.equal(q.tax,-6);
});
test('adopting: age, population, cost and cooldown are enforced; resources are spent',()=>{
 const g=fresh();g.state.age=0;rich(g);assert.equal(adoptGovernment(g,0,'chiefdom').ok,false,'Stone Age refuses');
 g.state.age=BRONZE_AGE;const pop=g.popNow(0);const r0=adoptGovernment(g,0,'monarchy');assert.equal(r0.ok,false);assert.match(r0.reason,/people/);
 for(let i=0;i<30;i++)g.state.units.push({...g.state.units.find(u=>u.team===0&&u.type!=='leader'),id:g.state.nextId++});
 const food=g.tribe(0).food;assert.ok(adoptGovernment(g,0,'chiefdom').ok);assert.equal(g.tribe(0).food,food-60);
 assert.equal(adoptGovernment(g,0,'theocracy').ok,false,'cooldown');g.state.time+=600;assert.ok(adoptGovernment(g,0,'theocracy').ok);
 g.tribe(0).food=0;g.tribe(0).wood=0;g.state.time+=600;assert.match(adoptGovernment(g,0,'chiefdom').reason,/costs/);
});
test('policies: slot limit, availability, effect on job time, damage and unrest inputs; no goods created',()=>{
 const g=fresh();rich(g);g.state.age=BRONZE_AGE;for(let i=0;i<30;i++)g.state.units.push({...g.state.units.find(u=>u.team===0&&u.type!=='leader'),id:g.state.nextId++});
 const u=g.state.units.find(x=>x.team===0);assert.equal(governanceJobMul(g,u,'food'),1,'no state, no effect');
 assert.ok(adoptGovernment(g,0,'chiefdom').ok);assert.ok(setPolicy(g,0,'harvestLevy',true).ok);
 const stock=g.tribe(0).food+g.tribe(0).wood;assert.ok(Math.abs(governanceJobMul(g,u,'food')-.93)<1e-9);assert.equal(governanceJobMul(g,u,'wood'),1);
 assert.ok(setPolicy(g,0,'warBand',true).ok);assert.equal(setPolicy(g,0,'festivals',true).ok,false,'two slots');assert.ok(governanceDmgMul(g,0)>1.05);
 assert.equal(governanceUnrest(g,0).tax,20,'12+8');assert.ok(g.canAfford(0,{food:1}));
 assert.ok(setPolicy(g,0,'warBand',false).ok);assert.equal(governanceDmgMul(g,0),1);
 assert.equal(setPolicy(g,0,'masonGuild',true).ok,false,'needs monarchy');assert.ok(stock>0);
});
test('governors: adult only, one per hall, skill-based quality, local bonus, release and death',()=>{
 const g=fresh();rich(g);g.state.age=BRONZE_AGE;for(let i=0;i<30;i++)g.state.units.push({...g.state.units.find(u=>u.team===0&&u.type!=='leader'),id:g.state.nextId++});
 const lead=g.state.units.find(u=>u.team===0),spot=g.findOpenSpot(lead.x,lead.z,'townhall',0);assert.ok(g.placeBuilding('townhall',spot.x,spot.z,0));const hall=g.state.buildings.find(b=>b.type==='townhall'&&b.team===0);hall.build=1;hall.hp=Math.max(hall.hp,10);assert.ok(g.finished(hall));
 const people=g.state.units.filter(u=>u.team===0&&u.type!=='leader');for(const p of people)p.ageT=30*1800;
 assert.equal(appointGovernor(g,0,hall.id,people[0].id).ok,false,'band council appoints none');
 adoptGovernment(g,0,'chiefdom');const kid=people[1];kid.ageT=3*1800;kid.parents=undefined;assert.equal(appointGovernor(g,0,hall.id,kid.id).ok,false);
 assert.ok(appointGovernor(g,0,hall.id,people[0].id).ok);assert.equal(activeGovernors(g,0).length,1);
 const near={team:0,x:hall.x,z:hall.z},far={team:0,x:hall.x+500,z:hall.z};
 assert.ok(governanceJobMul(g,near,'food')<1&&governanceJobMul(g,far,'food')===1,'bonus is local to the hall');
 assert.ok(governanceUnrest(g,0).legitimacy>4);
 assert.equal(governanceModel(g).halls[0].governor,people[0].id);
 people[0].hp=0;assert.equal(activeGovernors(g,0).length,0,'dead governor holds no office');
 assert.ok(dismissGovernor(g,0,hall.id).ok);assert.equal(dismissGovernor(g,0,hall.id).ok,false);
});
test('read model lists every government and policy',()=>{
 const g=fresh();rich(g);g.state.age=BRONZE_AGE;assert.ok(governanceModel(g).governments.length===GOVERNMENTS.length);
});
test('saves: governance round trips, unknown data is dropped, absent field loads as nothing',()=>{
 assert.equal(sanitizeGovernance(undefined),undefined);
 const s=sanitizeGovernance({'0':{gov:'monarchy',since:1,changed:2,policies:['corvee','bogus'],governors:{'5':7,x:1}},'bad key':{}});
 assert.deepEqual(s['0'].policies,['corvee']);assert.deepEqual(s['0'].governors,{'5':7});assert.ok(!('bad key' in s));
 assert.equal(sanitizeGovernance({'1':{gov:'nonsense'}})['1'].gov,'bandCouncil');
 const g=fresh();rich(g);g.state.age=BRONZE_AGE;for(let i=0;i<30;i++)g.state.units.push({...g.state.units.find(u=>u.team===0&&u.type!=='leader'),id:g.state.nextId++});
 adoptGovernment(g,0,'chiefdom');setPolicy(g,0,'festivals',true);
 assert.deepEqual(sanitizeGovernance(JSON.parse(JSON.stringify(g.state.governance))),g.state.governance);
});
