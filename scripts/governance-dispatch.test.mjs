import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {applyEngineReadQuery,isEngineReadQuery} from '../src/game/engineReadModels.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {GOVERNMENTS,POLICIES,governmentsAvailable,aiGovernmentFor,governanceEffects,policiesAvailable,CLASSICAL_AGE,MEDIEVAL_AGE,RENAISSANCE_AGE} from '../src/game/governance.ts';
const governanceModelGov=g=>applyEngineReadQuery(g,{kind:'governance'}).governance.gov;
const cmd=(g,c)=>applyEngineCommand(g,c);
function village(){
 const g=new Game();g.reset(4242,10);g.enterIsland();const t=g.tribe(0);t.food=9000;t.wood=9000;t.stone=9000;g.state.age=1;
 const proto=g.state.units.find(u=>u.team===0&&u.type!=='leader');for(let i=0;i<30;i++)g.state.units.push({...proto,id:g.state.nextId++,ageT:30*1800,parents:undefined});
 for(const u of g.state.units)if(u.team===0)u.ageT=30*1800;
 const lead=g.state.units.find(u=>u.team===0),spot=g.findOpenSpot(lead.x,lead.z,'townhall',0);g.placeBuilding('townhall',spot.x,spot.z,0);
 const hall=g.state.buildings.find(b=>b.type==='townhall'&&b.team===0);hall.build=1;hall.hp=Math.max(hall.hp,10);return {g,hall};
}
test('validators accept the governance command and query, reject malformed ones',()=>{
 assert.ok(isEngineDispatchCommand({kind:'governance',action:'adopt',id:'chiefdom'}));
 assert.ok(!isEngineDispatchCommand({kind:'governance',action:'conquer'}));assert.ok(!isEngineDispatchCommand({kind:'governance',action:'adopt',id:7}));
 assert.ok(!isEngineDispatchCommand({kind:'governance',action:'appoint',hallId:-1}));
 assert.ok(isEngineReadQuery({kind:'governance'}));assert.ok(!isEngineReadQuery({kind:'governance',team:1}));
});
test('end to end: adopt, policy on/off, appoint, dismiss through dispatch; read model reflects each step; refusals leave state alone',()=>{
 const {g,hall}=village();
 const m0=applyEngineReadQuery(g,{kind:'governance'}).governance;assert.equal(m0.gov,'bandCouncil');assert.equal(m0.halls.length,1);
 let r=cmd(g,{kind:'governance',action:'adopt',id:'republic'});assert.equal(r.accepted,false);assert.match(r.reason,/Iron Age/);assert.equal(governanceModelGov(g),'bandCouncil');
 r=cmd(g,{kind:'governance',action:'adopt',id:'nonsense'});assert.equal(r.accepted,false);
 r=cmd(g,{kind:'governance',action:'adopt',id:'chiefdom'});assert.ok(r.accepted,r.reason);
 assert.equal(applyEngineReadQuery(g,{kind:'governance'}).governance.gov,'chiefdom');
 r=cmd(g,{kind:'governance',action:'policy-on',id:'harvestLevy'});assert.ok(r.accepted);assert.equal(cmd(g,{kind:'governance',action:'policy-on',id:'harvestLevy'}).accepted,false,'twice');
 assert.equal(cmd(g,{kind:'governance',action:'policy-on',id:'standingArmy'}).accepted,false,'age gate');
 assert.ok(applyEngineReadQuery(g,{kind:'governance'}).governance.policies.find(p=>p.id==='harvestLevy').on);
 assert.ok(cmd(g,{kind:'governance',action:'policy-off',id:'harvestLevy'}).accepted);assert.equal(cmd(g,{kind:'governance',action:'policy-off',id:'harvestLevy'}).accepted,false);
 const person=g.state.units.find(u=>u.team===0&&u.type!=='leader');
 assert.equal(cmd(g,{kind:'governance',action:'appoint',hallId:hall.id+999,unitId:person.id}).accepted,false,'unknown hall');
 assert.equal(cmd(g,{kind:'governance',action:'appoint',hallId:hall.id,unitId:999999}).accepted,false,'unknown person');
 assert.ok(cmd(g,{kind:'governance',action:'appoint',hallId:hall.id,unitId:person.id}).accepted);
 assert.equal(applyEngineReadQuery(g,{kind:'governance'}).governance.halls[0].governor,person.id);
 assert.ok(cmd(g,{kind:'governance',action:'dismiss',hallId:hall.id}).accepted);assert.equal(cmd(g,{kind:'governance',action:'dismiss',hallId:hall.id}).accepted,false);
 g.tribe(0).food=0;g.state.time+=1000;assert.match(cmd(g,{kind:'governance',action:'adopt',id:'theocracy'}).reason,/costs|people/);
});
test('save/load round trip keeps government, policies and governors',()=>{
 const {g,hall}=village();const person=g.state.units.find(u=>u.team===0&&u.type!=='leader');
 cmd(g,{kind:'governance',action:'adopt',id:'chiefdom'});cmd(g,{kind:'governance',action:'policy-on',id:'festivals'});cmd(g,{kind:'governance',action:'appoint',hallId:hall.id,unitId:person.id});
 const before=JSON.parse(JSON.stringify(g.state.governance));const g2=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
 assert.deepEqual(g2.state.governance,before);assert.equal(applyEngineReadQuery(g2,{kind:'governance'}).governance.gov,'chiefdom');
 const old=encodeGame(g);delete old.governance;if(old.state)delete old.state.governance;const g3=decodeGame(JSON.parse(JSON.stringify(old)));
 assert.equal(applyEngineReadQuery(g3,{kind:'governance'}).governance.gov,'bandCouncil','a save without governance loads with defaults');
});
test('later ages: Classical, Medieval and Renaissance governments and policies are gated by age and population',()=>{
 assert.ok(RENAISSANCE_AGE>MEDIEVAL_AGE&&MEDIEVAL_AGE>CLASSICAL_AGE);
 assert.ok(!governmentsAvailable(CLASSICAL_AGE,500).some(g=>g.minAge>CLASSICAL_AGE));assert.ok(governmentsAvailable(CLASSICAL_AGE,500).some(g=>g.id==='aristocracy'));
 assert.ok(!governmentsAvailable(CLASSICAL_AGE,50).some(g=>g.id==='aristocracy'),'population gate');
 assert.ok(governmentsAvailable(MEDIEVAL_AGE,500).some(g=>g.id==='feudalKingdom')&&governmentsAvailable(MEDIEVAL_AGE,500).some(g=>g.id==='merchantRepublic'));
 for(const id of ['constitutionalMonarchy','parliamentaryRepublic'])assert.ok(governmentsAvailable(RENAISSANCE_AGE,500).some(g=>g.id===id)&&!governmentsAvailable(MEDIEVAL_AGE,500).some(g=>g.id===id));
 assert.ok(policiesAvailable('parliamentaryRepublic',RENAISSANCE_AGE,300).some(p=>p.id==='parliamentBudget'));assert.ok(!policiesAvailable('chiefdom',RENAISSANCE_AGE,300).some(p=>p.id==='parliamentBudget'));
 assert.ok(GOVERNMENTS.length>=11&&POLICIES.length>=13);
 for(const g of GOVERNMENTS)assert.ok(g.slots>=1&&g.minPop>=0);
 assert.ok(governanceEffects('parliamentaryRepublic',['parliamentBudget','publicSchools'],[],RENAISSANCE_AGE,300).tax<-20);
});
test('aiGovernmentFor: pure, never exceeds what the civ qualifies for, honours bias within the top age',()=>{
 for(const age of [0,1,2,3,4,5])for(const pop of [0,10,20,50,100,150,250]){const gv=aiGovernmentFor({age,pop});assert.ok(age>=gv.minAge&&pop>=gv.minPop,`${age}/${pop}`);}
 assert.equal(aiGovernmentFor({age:0,pop:500}).id,'bandCouncil');
 assert.equal(aiGovernmentFor({age:4,pop:200,bias:'martial'}).id,'feudalKingdom');assert.equal(aiGovernmentFor({age:4,pop:200,bias:'mercantile'}).id,'merchantRepublic');
 assert.equal(aiGovernmentFor({age:5,pop:250,bias:'mercantile'}).id,'parliamentaryRepublic');
});
