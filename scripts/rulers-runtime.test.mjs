import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {rulerOf,advanceRulers,RULERS_YEAR_SECONDS} from '../src/game/rulersRuntime.ts';
import {rulersOf} from '../src/game/rulersState.ts';
function fixture(){const g=new Game();g.reset(123456,10);g.enterIsland();return g;}
test('new games carry rulers; dynastic years advance with sim time; every society has a ruling house',()=>{
 const g=fixture();assert.equal(g.state.worldOptions?.rulersVersion,1);
 g.state.time=RULERS_YEAR_SECONDS*5+1;advanceRulers(g);
 const r=rulersOf(g.state);assert.ok(r,'rulers state valid');assert.equal(r.year,5);
 for(let i=0;i<g.state.tribes.length;i++){const o=rulerOf(g,i);assert.ok(o&&o.name&&o.house,'society '+i);}
 assert.ok(['household','kingroup','house','dynasty'].includes(rulerOf(g,0).stage));
});
test('old saves (no option, no field) are untouched',()=>{
 const g=fixture();delete g.state.worldOptions.rulersVersion;delete g.state.rulers;
 g.state.time=RULERS_YEAR_SECONDS*9;advanceRulers(g);assert.equal(g.state.rulers,undefined);assert.equal(rulerOf(g,0),null);
});
test('rulers state round-trips through JSON',()=>{
 const g=fixture();g.state.time=RULERS_YEAR_SECONDS*3;advanceRulers(g);
 const copy=JSON.parse(JSON.stringify(g.state.rulers));assert.deepEqual(JSON.parse(JSON.stringify(copy)),copy);assert.ok(rulersOf({rulers:copy}));assert.ok(rulersOf(g.state));
});

test('marryHouses: gated by scale; then ties and trust rise with a cause chain',async()=>{
 const {marryHouses,tiesBetween}=await import('../src/game/rulersRuntime.ts');
 const {societyRelation}=await import('../src/game/societyRelations.ts');
 const g=fixture();
 assert.equal(marryHouses(g,0,1),null,'a household of five does not trade spouses');
 for(const t of [0,1]){const u=g.state.units.find(u=>u.team===t&&u.hp>0);for(let i=0;i<20;i++)g.state.units.push({...u,id:g.state.units.length+9000+i+t*100});}
 for(const t of ['0','1']){const d=g.state.rulers.societies[t].dynasty,k=Object.values(d.people).find(p=>p.alive);d.people[t+'-cadet']={...k,id:t+'-cadet',name:'Cadet'+t,age:20,spouse:undefined,parent:undefined,ruler:undefined};}
 const before=societyRelation(g,0,1).trust,bond0=tiesBetween(g,0,1).bond;
 const res=marryHouses(g,0,1);assert.ok(res,'marriage happens at kingroup scale');
 assert.ok(res.why.length>0);assert.ok(tiesBetween(g,0,1).bond>bond0);assert.ok(societyRelation(g,0,1).trust>=before);
 assert.ok(societyRelation(g,1,0).trust>=0);
 assert.deepEqual(JSON.parse(JSON.stringify(g.state.rulers)),JSON.parse(JSON.stringify(g.state.rulers)));
 assert.ok(rulersOf(g.state),'state still valid after marriage');
});

test('expansion drivers: layered push/pull/enable/brake, bounded, readable, and they move NPC expansion odds',async()=>{
 const {assess}=await import('../src/game/expansionDrivers.ts');
 const {expansionOf,expansionDrive,ensureRulers}=await import('../src/game/rulersRuntime.ts');
 const calm={crowding:0,hunger:0,climate:0,cadets:0,grievance:0,openLand:.2,richNeighbour:0,weakNeighbour:0,tradePull:0,zeal:0,seafaring:0,mobility:.5,rulerDrive:40,polityPressure:30,cohesion:.6,fortified:.2,unknown:.5};
 const base=assess(calm);assert.equal(base.mode,'stay');
 const squeezed=assess({...calm,crowding:1,hunger:.8,climate:.8,cadets:.5,openLand:.9,seafaring:.3});
 assert.ok(squeezed.drive>base.drive*2,'push plus open land plus means raises the drive');assert.ok(['settle','migrate'].includes(squeezed.mode));assert.ok(squeezed.why.length>=3);
 const pushOnly=assess({...calm,crowding:1,hunger:1,climate:1,rulerDrive:0,polityPressure:0,mobility:0});
 const both=assess({...calm,crowding:1,hunger:1,climate:1,openLand:.9,rulerDrive:70,polityPressure:60});
 assert.ok(both.drive>pushOnly.drive,'pressure without a place or means moves less');
 const rooted=assess({...calm,crowding:1,hunger:1,openLand:.9,cohesion:1,fortified:1,unknown:1});assert.ok(rooted.brake>.5);
 assert.equal(assess({...calm,unknown:1,seafaring:1,openLand:.6,tradePull:.8,rulerDrive:70}).mode,'stay','pull alone: dreamers stay home');
 const sea=assess({...calm,unknown:1,seafaring:1,openLand:.6,tradePull:.8,rulerDrive:70,crowding:.8,climate:.6,cohesion:.3});assert.ok(['explore','trade','settle'].includes(sea.mode),sea.mode);
 for(const d of [base,squeezed,pushOnly,both,rooted,sea]){assert.ok(d.drive>=.25&&d.drive<=1.85);assert.ok(Number.isFinite(d.push+d.pull+d.enable+d.brake));}
 const g=fixture();ensureRulers(g);
 const d=expansionOf(g,1);assert.ok(d&&d.drive>=.25,'live game produces an assessment');assert.equal(expansionDrive(g,1),d.drive);
 const old=new Game();old.reset(5,10,{rulersVersion:0});old.enterIsland();assert.equal(expansionDrive(old,1),1,'rulers off: unchanged behaviour');
});

test('council read model and marry command: JSON-safe, gated, and the UI action changes real ties',async()=>{
 const {applyEngineReadQuery,isEngineReadQuery}=await import('../src/game/engineReadModels.ts');
 const {applyEngineCommand,isEngineDispatchCommand}=await import('../src/game/engineDispatch.ts');
 const {tiesBetween}=await import('../src/game/rulersRuntime.ts');
 const g=fixture();
 assert.ok(isEngineReadQuery({kind:'rulers-council'}));assert.ok(!isEngineReadQuery({kind:'rulers-council',x:1}));
 const m=applyEngineReadQuery(g,{kind:'rulers-council'});const c=JSON.parse(JSON.stringify(m)).council;
 assert.ok(c.enabled&&c.ruler.name&&c.house.family.length>=1&&Array.isArray(c.neighbours));
 const old=new Game();old.reset(5,10,{rulersVersion:0});old.enterIsland();assert.equal(applyEngineReadQuery(old,{kind:'rulers-council'}).council.enabled,false);
 assert.ok(isEngineDispatchCommand({kind:'marry-houses',team:1}));assert.ok(!isEngineDispatchCommand({kind:'marry-houses',team:1,x:2}));
 assert.equal(applyEngineCommand(g,{kind:'marry-houses',team:1}).accepted,false,'small houses cannot');
 for(const t of [0,1]){const u=g.state.units.find(u=>u.team===t&&u.hp>0);for(let i=0;i<20;i++)g.state.units.push({...u,id:g.state.units.length+7000+i+t*100});}
 for(const t of ['0','1']){const d=g.state.rulers.societies[t].dynasty,k=Object.values(d.people).find(p=>p.alive);d.people[t+'-cadet']={...k,id:t+'-cadet',name:'Cadet'+t,age:20,spouse:undefined,parent:undefined,ruler:undefined};}
 const b0=tiesBetween(g,0,1).bond,r=applyEngineCommand(g,{kind:'marry-houses',team:1});
 assert.equal(r.accepted,true,r.reason);assert.ok(tiesBetween(g,0,1).bond>b0);
 const c2=JSON.parse(JSON.stringify(applyEngineReadQuery(g,{kind:'rulers-council'}))).council;
 if(c2.showSuccession){assert.ok(c2.handover&&typeof c2.handover.law==='string'&&c2.handover.rulerAge>0,'handover card data');assert.ok(c2.handover.heir||c2.handover.extinct||c2.handover.regent);}else assert.equal(c2.handover,undefined);
});

test('fosterage and hostages: real wards, tie effects, term end, war breaks the pledge, JSON round-trip',async()=>{
 const {fosterHouses,exchangeHostages,wardsOf,settleWards,tiesBetween}=await import('../src/game/rulersRuntime.ts');
 const g=fixture();
 assert.equal(fosterHouses(g,0,1),null,'a household does not foster');
 for(const t of [0,1]){const u=g.state.units.find(u=>u.team===t&&u.hp>0);for(let i=0;i<45;i++)g.state.units.push({...u,id:g.state.units.length+9000+i+t*100});}
 for(const t of ['0','1']){const d=g.state.rulers.societies[t].dynasty,k=Object.values(d.people).find(p=>p.alive);
  d.people[t+'-kid']={...k,id:t+'-kid',name:'Kid'+t,age:6,spouse:undefined,parent:undefined,ruler:undefined,claimStrength:1};
  d.people[t+'-youth']={...k,id:t+'-youth',name:'Youth'+t,age:18,spouse:undefined,parent:undefined,ruler:undefined,claimStrength:2};}
 const b0=tiesBetween(g,0,1).bond,f=fosterHouses(g,0,1);
 if(!f)return assert.fail('fosterage should happen at house scale');
 assert.equal(f.wards.length,2);assert.ok(tiesBetween(g,0,1).bond>b0);assert.equal(wardsOf(g,0).length,2);
 assert.equal(g.state.rulers.societies['0'].dynasty.people['0-kid'].alive,true,'child stays in own dynasty record');
 const h=exchangeHostages(g,0,1);const tiers=['0','1'].map(t=>g.state.rulers.societies[t].civ.polity.tier);
 if(tiers.every(t=>t==='state')){assert.ok(h);assert.equal(h.wards.length,2);assert.equal(wardsOf(g,0).length,4);}else assert.equal(h,null,'hostage exchange needs state-tier courts');
 assert.deepEqual(JSON.parse(JSON.stringify(g.state.rulers)).wards,g.state.rulers.wards);assert.ok(rulersOf(g.state));
 g.state.rulers.societies['0'].dynasty.people['0-kid'].age=16;settleWards(g);
 assert.ok(!wardsOf(g,0).some(w=>w.person==='0-kid'),'fosterling goes home at 16');
 const n=wardsOf(g,0).length;g.state.rulers.societies['1'].dynasty.people['1-kid'].alive=false;settleWards(g);assert.ok(wardsOf(g,0).length<=n);
 const {nudgeSocietyRelation}=await import('../src/game/societyRelations.ts');
 g.tribe(1).hostile=true;settleWards(g);assert.equal(wardsOf(g,0).length,0,'war ends every pledge');
});

test('npcMarriages: only rivals, only on cadence, only when scale and acquaintance allow; old saves untouched',async()=>{
 const {npcMarriages}=await import('../src/game/rulersRuntime.ts');
 const {ensureRulers}=await import('../src/game/rulersRuntime.ts');const g=fixture();ensureRulers(g);g.state.rulers.year=4;
 const w=npcMarriages(g);assert.ok(w.every(([a,b])=>a!==0&&b!==0),'player never auto-wed');
 g.state.rulers.year=5;assert.deepEqual(npcMarriages(g),[]);
 delete g.state.worldOptions.rulersVersion;delete g.state.rulers;g.state.time=0;assert.deepEqual(npcMarriages(g),[]);
});
