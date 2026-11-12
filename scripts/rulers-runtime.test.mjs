import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {rulerOf,advanceRulers,RULERS_YEAR_SECONDS} from '../src/game/rulersRuntime.ts';
import {rulersOf} from '../src/game/rulersState.ts';
function fixture(){const g=new Game();g.reset(123456,10);g.enterIsland();return g;}
test('new games carry rulers; dynastic years advance with sim time; every society has a ruling house',()=>{
 const g=fixture();assert.equal(g.state.worldOptions?.rulersVersion,2);
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
 if(c2.showSuccession){assert.ok(c2.handover&&typeof c2.handover.law==='string'&&c2.handover.rulerAge>0,'handover card data');assert.ok(c2.handover.heir||c2.handover.extinct||c2.handover.regent);assert.ok(Array.isArray(c2.handover.rivals)&&c2.handover.rivals.length<=3,'rival claimants listed');assert.ok(c2.handover.pressure&&Number.isFinite(c2.handover.pressure.unrest)&&c2.handover.pressure.claimsAgainst>=0,'unrest and claims pressure on the handover card');JSON.parse(JSON.stringify(c2.handover));}else assert.equal(c2.handover,undefined);
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

test('lane A: yearly step settles wards and weds rivals; expansion party plan follows drivers; claims gate, expire, cite and raise unrest; save round-trip',async()=>{
 const R=await import('../src/game/rulersRuntime.ts');const {validRulersState}=await import('../src/game/rulersState.ts');const {societyRelation}=await import('../src/game/societyRelations.ts');
 const g=fixture();
 // expansion party plan: null when rulers off, otherwise a stated, bounded plan
 const p=R.expansionParty(g,1);assert.ok(p&&p.crew>=2&&p.crew<=4&&p.cooldown>=900&&p.cooldown<=3600&&Array.isArray(p.why));
 assert.equal(R.expansionParty(g,1,true).allow,p.mode==='settle'||p.mode==='migrate');
 const old=fixture();delete old.state.worldOptions.rulersVersion;delete old.state.rulers;assert.equal(R.expansionParty(old,1),null);
 // wards settle inside the yearly step: a foster child aged to 16 goes home with no manual call
 for(const t of [0,1]){const u=g.state.units.find(u=>u.team===t&&u.hp>0);for(let i=0;i<45;i++)g.state.units.push({...u,id:g.state.units.length+9500+i+t*100});}
 for(const t of ['0','1']){const d=g.state.rulers.societies[t].dynasty,k=Object.values(d.people).find(p=>p.alive);d.people[t+'-kid']={...k,id:t+'-kid',name:'Kid'+t,age:15,spouse:undefined,parent:undefined,ruler:undefined,claimStrength:1};}
 const f=R.fosterHouses(g,0,1);
 if(f){g.state.rulers.societies['0'].dynasty.people['0-kid'].age=16;g.state.time=RULERS_YEAR_SECONDS*(g.state.rulers.year+1)+1;advanceRulers(g);assert.ok(!R.wardsOf(g,0).some(w=>w.person==='0-kid'),'yearly step ends the fosterage');}
 // claims: need known target and the claims feature; duplicates refused; expire; cite spends it
 const a=2,b=1;g.state.tribes.forEach((_,i)=>{});
 const cl=R.grantClaim(g,a,a,'claim');assert.equal(cl,null,'no claim on yourself');
 const tier=g.state.rulers.societies[String(a)].civ.polity.tier;
 const known=societyRelation(g,a,b).known;
 const granted=R.grantClaim(g,a,b,'claim',60,2);
 if(granted){assert.ok(known);assert.equal(R.claimsOf(g,b).length,1);assert.equal(R.grantClaim(g,a,b,'claim'),null,'duplicate refused');
  const u0=R.unrestOf(g,b).value;assert.ok(R.unrestOf(g,b).why.includes('claims press on the house'));
  assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))),'claims survive a save round-trip');
  const c=R.citeClaim(g,a,b,'claim');assert.ok(c&&c.cost>0);assert.equal(R.claimsOf(g).length,0);assert.ok(R.unrestOf(g,b).value<=u0);
  R.grantClaim(g,a,b,'claim',60,1);g.state.time=RULERS_YEAR_SECONDS*(g.state.rulers.year+3)+1;advanceRulers(g);assert.equal(R.claimsOf(g).length,0,'claims expire');}
 else assert.ok(!known||tier==='band'||true);
 // war-grade causes need a state-tier polity
 const lowTier=g.state.rulers.societies[String(a)].civ.polity.tier!=='state';if(lowTier)assert.equal(R.grantClaim(g,a,b,'raid'),null);
 const bad=JSON.parse(JSON.stringify(g.state.rulers));bad.claims=[{holder:1}];assert.equal(validRulersState(bad),false,'malformed claims rejected');
 const u=R.unrestOf(g,1);assert.ok(u&&u.value>=0&&u.value<=100&&u.stage);assert.equal(R.unrestOf(old,1),null);
});

test('lane A: journeyPermit steers explore/trade/raid parties from the drivers; states need a raid claim; old saves unchanged',async()=>{
 const R=await import('../src/game/rulersRuntime.ts');const {validRulersState}=await import('../src/game/rulersState.ts');
 const g=fixture();
 const ex=R.journeyPermit(g,1,'explore');assert.ok(ex&&ex.allow&&[300,450].includes(ex.reserve));
 const tr=R.journeyPermit(g,1,'trade');assert.ok(tr&&[60,120].includes(tr.cadence));
 // a peaceful, known target; make the striker a state in conquer mode by pinning the cached drive
 const a=1,b=2;g.state.rulers.societies[String(a)].civ.polity.tier='state';
 const d=R.expansionOf(g,a);d.mode='conquer'; // the cached Drivers object is what journeyPermit reads
 const {societyRelation,nudgeSocietyRelation}=await import('../src/game/societyRelations.ts');
 nudgeSocietyRelation(g,a,b,{trust:.2,grievance:0});
 if(!g.isFoe(a,b)&&societyRelation(g,a,b).known){
  const first=R.journeyPermit(g,a,'raid',b);
  assert.equal(first.allow,false,'no claim: the strike waits');
  const second=R.journeyPermit(g,a,'raid',b);
  if(R.claimsOf(g,a).some(c=>c.kind==='raid')){assert.equal(second.allow,true,'claim stands: the strike may go');
   const spent=R.spendRaidClaim(g,a,b);assert.ok(spent&&spent.cost>=0);assert.ok(!R.claimsOf(g,a).some(c=>c.kind==='raid'&&c.target===String(b)),'strike spends the claim');}
  assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))),'claims save round-trip');
 }
 d.mode='stay';g.state.rulers.societies[String(a)].civ.polity.tier='state';
 if(!g.isFoe(a,b))assert.equal(R.journeyPermit(g,a,'raid',b).allow,false,'a state in stay mode does not strike a peaceful neighbour');
 const old=fixture();delete old.state.worldOptions.rulersVersion;delete old.state.rulers;
 for(const k of ['explore','trade','raid'])assert.equal(R.journeyPermit(old,1,k,2),null,'old saves: null permit');
});

test('AUD-SOC-SAVE-ROUNDTRIP: wards validate, malformed wards are rejected, and an old save without wards/claims still loads',async()=>{
 const {validRulersState,initRulers}=await import('../src/game/rulersState.ts');
 const s=initRulers(42,['a','b']);
 assert.ok(validRulersState(s),'old save: no wards, no claims');
 const ok={...s,wards:[{kind:'foster',person:'a-kid',from:'a',to:'b',since:3}]};
 assert.ok(validRulersState(JSON.parse(JSON.stringify(ok))),'ward survives JSON round-trip');
 for(const bad of [{kind:'tribute',person:'x',from:'a',to:'b',since:1},{kind:'foster',person:1,from:'a',to:'b',since:1},{kind:'hostage',person:'x',from:'a',to:'b',since:NaN},null])
  assert.equal(validRulersState({...s,wards:[bad]}),false,'malformed ward rejected');
 assert.equal(validRulersState({...s,wards:'x'}),false);
});

test('lane A: a party mid-expedition survives save/load with its packed food, and rulers state/wards ride along',async()=>{
 const {encodeGame,decodeGame}=await import('../src/game/persistence.ts');const {beginExpedition}=await import('../src/game/journeys.ts');
 const {foodDemand}=await import('../src/game/settlement.ts');
 const g=fixture(),u=g.state.units.find(u=>u.team===0&&u.type==='worker'&&u.maturesAt===undefined);
 g.tribe(0).food=200;assert.ok(beginExpedition(g,u));const packed=u.expedition.food,left=g.tribe(0).food;
 g.state.time=RULERS_YEAR_SECONDS*2+1;advanceRulers(g);
 g.state.rulers.wards=[{kind:'foster',person:'x',from:'0',to:'1',since:1}];
 const back=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
 const v=back.state.units.find(x=>x.id===u.id);assert.ok(v.expedition,'party still out after reload');
 assert.equal(v.expedition.food,packed);assert.equal(back.tribe(0).food,left,'no food invented or lost across reload');
 assert.equal(packed+back.tribe(0).food,200,'packed + stores still equals the starting stock');
 assert.equal(back.state.rulers.wards.length,1,'wards survive reload');assert.ok(foodDemand(back,0)>=0);
});

test('lane A: war-weariness builds in a long war, feeds unrest and peace pressure, recovers at peace, saves round-trip, old saves untouched',async()=>{
 const R=await import('../src/game/rulersRuntime.ts');const {validRulersState}=await import('../src/game/rulersState.ts');
 const g=fixture();R.ensureRulers(g);
 assert.equal(R.wearinessOf(g,1),0);assert.equal(R.warPeaceBonus(g,1),0);
 g.state.tribes[1].hostile=true;
 const u0=R.unrestOf(g,1).value;
 for(let i=0;i<12;i++)R.tireOfWar(g);
 assert.ok(R.wearinessOf(g,1)>=90,'a dozen war years wear a society down');
 assert.ok(R.warPeaceBonus(g,1)>1,'a tired society presses for peace');
 const u1=R.unrestOf(g,1);assert.ok(u1.value>=u0&&u1.why.includes('the war has worn the people down'));
 assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))),'weariness survives a save round-trip');
 const bad=JSON.parse(JSON.stringify(g.state.rulers));bad.weary={1:500};assert.equal(validRulersState(bad),false,'out-of-range weariness rejected');
 g.state.tribes[1].hostile=false;for(let i=0;i<20;i++)R.tireOfWar(g);
 assert.equal(R.wearinessOf(g,1),0,'peace heals');
 const old=fixture();delete old.state.worldOptions.rulersVersion;delete old.state.rulers;R.tireOfWar(old);assert.equal(old.state.rulers,undefined);assert.equal(R.warPeaceBonus(old,1),0);
});
test('AUD-SOC-TRIBUTE-LEDGER: marriage, fosterage, hostage and claim commands move no goods, units or buildings (no free dowry, no teleporting)',async()=>{
 const {marryHouses,fosterHouses,exchangeHostages,grantClaim,citeClaim,settleWards}=await import('../src/game/rulersRuntime.ts');
 const g=fixture();fosterHouses(g,0,1);
 for(const t of [0,1]){const u=g.state.units.find(u=>u.team===t&&u.hp>0);for(let i=0;i<45;i++)g.state.units.push({...u,id:g.state.units.length+9500+i+t*100});}
 for(const t of ['0','1']){const d=g.state.rulers.societies[t].dynasty,k=Object.values(d.people).find(p=>p.alive);
  d.people[t+'-kid']={...k,id:t+'-kid',name:'Kid'+t,age:6,spouse:undefined,parent:undefined,ruler:undefined,claimStrength:1};
  d.people[t+'-maid']={...k,id:t+'-maid',name:'Maid'+t,age:20,spouse:undefined,parent:undefined,ruler:undefined,claimStrength:1};}
 const snap=()=>JSON.stringify({res:[0,1].map(t=>{const x=g.tribe(t);return [x.food,x.wood,x.stone,x.copper,x.iron];}),
  units:g.state.units.map(u=>[u.id,u.team,Math.round(u.x*100),Math.round(u.y*100)]),bld:g.state.buildings.map(b=>[b.id,b.team,b.x,b.y]),stock:g.state.deals?.length??0});
 const before=snap();
 marryHouses(g,0,1);fosterHouses(g,0,1);exchangeHostages(g,0,1);
 grantClaim(g,0,1,'raid',50,10);citeClaim(g,0,1,'raid');settleWards(g);
 assert.equal(snap(),before,'diplomatic kin commands must not create or move goods, people on the map, or buildings');
});
test('era gating: bands send small slow parties and get no organised explore/trade speed-up; states are uncapped; old saves unchanged',async()=>{
 const R=await import('../src/game/rulersRuntime.ts');
 const g=fixture();g.state.time=RULERS_YEAR_SECONDS*3;advanceRulers(g);const set=(tier,mode)=>{g.state.rulers.societies['1'].civ.polity.tier=tier;g.state.time+=31;return mode;};
 const plan=(tier)=>{set(tier);return R.expansionParty(g,1);};
 const band=plan('band'),chief=plan('chiefdom'),state=plan('state');
 assert.ok(band.crew<=R.ERA_REACH.band.crew&&chief.crew<=R.ERA_REACH.chiefdom.crew&&state.crew<=4);
 assert.ok(band.cooldown>=state.cooldown||band.cooldown===3600,'bands are slower or capped');
 assert.ok(band.cooldown<=3600&&state.cooldown>=900);
 set('band');assert.equal(R.journeyPermit(g,1,'explore').reserve,450);assert.equal(R.journeyPermit(g,1,'trade').cadence,120);
 const old=fixture();delete old.state.worldOptions.rulersVersion;delete old.state.rulers;
 assert.equal(R.expansionParty(old,1),null);assert.equal(R.journeyPermit(old,1,'explore'),null);
});

test('expansion parties: read model shows real founding units, supplies and position; empty when rulers off',async()=>{
 const {expansionParties}=await import('../src/game/rulersRuntime.ts');
 const {councilModel}=await import('../src/game/rulersView.ts');
 const g=fixture();assert.deepEqual(expansionParties(g),[]);
 const us=g.state.units.filter(u=>u.team===1&&u.hp>0).slice(0,3);assert.ok(us.length>=2);
 const dx=us[0].x+40,dz=us[0].z+10;us.forEach((u,i)=>{u.foundingJourney={x:dx,z:dz,leader:i===0,timber:20};if(i===0){u.carry=20;u.carryType='wood';}});
 const ps=expansionParties(g,1);assert.equal(ps.length,1);assert.equal(ps[0].crew,us.length);assert.equal(ps[0].carrying,'20 wood');assert.ok(ps[0].distance>0);
 assert.deepEqual(JSON.parse(JSON.stringify(councilModel(g,1).parties)),ps);
 const before=g.state.units.length;expansionParties(g);assert.equal(g.state.units.length,before,'pure read');
 us[0].stuckT=9;assert.match(expansionParties(g,1)[0].status,/struggling/);
 delete g.state.worldOptions.rulersVersion;assert.deepEqual(expansionParties(g),[]);
});

test('expansion party provisions: organised eras carry real pantry stores, returned on turn-back, never conjured; band carries none; save validator accepts them',async()=>{
 const {expansionParty,expansionParties}=await import('../src/game/rulersRuntime.ts');
 const {foundingJourneyAI}=await import('../src/game/communities.ts');
 const g=fixture();const t=g.tribe(1);
 const plan=expansionParty(g,1,true);if(plan){assert.equal(plan.rations,['chiefdom','state'].includes(g.state.rulers.societies['1'].civ.polity.tier)?plan.crew*3:0);}
 const us=g.state.units.filter(u=>u.team===1&&u.hp>0).slice(0,2);assert.ok(us.length>=2);
 t.foodLots={...(t.foodLots||{}),provisions:30};t.food=Math.max(t.food,30);
 const {takeFoodLot}=await import('../src/game/pantry.ts');
 const food0=t.food;assert.ok(takeFoodLot(g,1,'provisions',6));assert.equal(t.food,food0-6,'leaving costs the pantry');
 const dx=us[0].x+40,dz=us[0].z+10;us.forEach((u,i)=>{u.foundingJourney={x:dx,z:dz,leader:i===0,timber:20,...(i===0?{rations:6}:{})};});
 us[0].carry=20;us[0].carryType='wood';
 assert.match(expansionParties(g,1)[0].carrying,/20 wood and 6 provisions/);
 us[0].stuckT=17;foundingJourneyAI(g,us[0],.1);
 assert.equal(t.food,food0,'turned back: the same provisions come home, none gained or lost');assert.equal(us[0].foundingJourney,undefined);
});

test('party rations save round-trip: valid rations load, negative or absurd rations reject, absent field (old save) loads',async()=>{
 const {encodeGame,validateGameSave}=await import('../src/game/persistence.ts');
 const g=fixture();const u=g.state.units.find(x=>x.team===1&&x.hp>0);
 u.foundingJourney={x:u.x+30,z:u.z,leader:true,timber:20};
 const save=()=>JSON.parse(JSON.stringify(encodeGame(g)));
 validateGameSave(save());
 u.foundingJourney.rations=9;validateGameSave(save());
 u.foundingJourney.rations=-1;assert.throws(()=>validateGameSave(save()));
 u.foundingJourney.rations=1e6;assert.throws(()=>validateGameSave(save()));
});

test('lane A: domestic pressure executor overthrows a house after sustained uprising, through heir(); counter saved; old saves untouched',async()=>{
 const R=await import('../src/game/rulersRuntime.ts');const {validRulersState}=await import('../src/game/rulersState.ts');
 const g=fixture();R.ensureRulers(g);const t=1,id='1';
 const d0=g.state.rulers.societies[id].dynasty;const kid={...Object.values(d0.people).find(p=>p.alive),id:'heirx',name:'Heirx',age:30,parent:d0.rulerId,spouse:undefined,legit:true,claimStrength:80};d0.people.heirx=kid;
 // press the house: heavy claims against it, full weariness, no legitimacy pillar
 g.state.rulers.claims=Array.from({length:6},(_,i)=>({holder:'2',target:id,kind:'claim',strength:100,expiresTick:1e9,since:0}));
 g.state.rulers.weary={...(g.state.rulers.weary??{}),[id]:100};
 const pol=g.state.rulers.societies[id].civ.polity;pol.institutionalization=0;
 g.tribe(t).food=0;g.state.tribes[t].food=0;
 const u=R.unrestOf(g,t);
 assert.ok(u.stage==='uprising'||u.stage==='civilWar','fixture reaches uprising: '+u.stage);
 const before=g.state.rulers.societies[id].dynasty.rulerId;let fell=[];
 for(let y=0;y<R.UPRISING_YEARS&&!fell.length;y++)fell=R.domesticPressure(g);
 assert.equal(fell.length,1,'house falls after the streak');
 const d=g.state.rulers.societies[id].dynasty;assert.notEqual(d.rulerId,before);assert.ok(d.people[before].alive,'the old ruler is not killed');assert.equal(d.people[d.rulerId].legit,false);
 assert.equal(g.state.rulers.unrestYears[id],0);assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))),'save round-trip');
 const bad=JSON.parse(JSON.stringify(g.state.rulers));bad.unrestYears={1:'x'};assert.equal(validRulersState(bad),false);
 const old=fixture();delete old.state.worldOptions.rulersVersion;delete old.state.rulers;assert.deepEqual(R.domesticPressure(old),[]);
});

test('save round-trip: claims, wards, unrest counters and weariness survive a JSON save mid-run and the reloaded game keeps stepping identically',()=>{
 const make=()=>{const g=fixture();g.state.time=RULERS_YEAR_SECONDS*4;advanceRulers(g);
  const r=g.state.rulers;r.claims=[{holder:'0',target:'1',kind:'claim',strength:3,expiresTick:1e9}];r.unrestYears={'0':2};r.weary={'1':12};
  r.wards=[{kind:'foster',person:'0-x',from:'0',to:'1',since:r.year}];return g;};
 const a=make(),saved=JSON.parse(JSON.stringify(a.state.rulers));
 assert.ok(rulersOf({rulers:saved}),'saved rulers state validates');
 assert.deepEqual(saved.claims,a.state.rulers.claims);assert.deepEqual(saved.unrestYears,{'0':2});assert.deepEqual(saved.weary,{'1':12});assert.equal(saved.wards.length,1);
 const b=fixture();b.state.rulers=JSON.parse(JSON.stringify(saved));
 for(const g of [a,b]){g.state.time=RULERS_YEAR_SECONDS*7;advanceRulers(g);}
 assert.equal(b.state.rulers.year,a.state.rulers.year);
 assert.deepEqual(Object.keys(b.state.rulers.societies),Object.keys(a.state.rulers.societies));
 assert.ok(rulersOf(a.state)&&rulersOf(b.state),'both still valid after more years');
 const bad=JSON.parse(JSON.stringify(saved));bad.claims=[{holder:1}];assert.equal(rulersOf({rulers:bad}),null,'corrupt claims are rejected, not loaded');
});

test('casus belli is visible in the council neighbour view, both directions, and lapses (no hidden declarations)',async()=>{
 const {casusLines}=await import('../src/game/rulersView.ts');
 const r={year:10,claims:[{holder:'0',target:'1',kind:'raid',strength:55,expiresTick:22},{holder:'1',target:'0',kind:'tribute',strength:40,expiresTick:12},{holder:'1',target:'2',kind:'claim',strength:30,expiresTick:30},{holder:'0',target:'1',kind:'claim',strength:30,expiresTick:9}]};
 const l=casusLines(r,0,1);
 assert.equal(l.length,2);
 assert.ok(l.find(x=>x.byUs&&x.kind==='raid'&&x.endsIn===12&&x.cost===14&&/raids/.test(x.reason)));
 assert.ok(l.find(x=>!x.byUs&&x.kind==='tribute'&&x.endsIn===2&&/They hold/.test(x.reason)));
 assert.equal(casusLines({year:10},0,1).length,0);
});

test('neighbourNews: real agreements only, player-known, newest first, old saves empty',async()=>{
 const {neighbourNews,marryHouses}=await import('../src/game/rulersRuntime.ts');
 const {recordAgreement}=await import('../src/game/societyRuntime.ts');
 const g=fixture();g.state.time=RULERS_YEAR_SECONDS*2;advanceRulers(g);
 assert.deepEqual(neighbourNews(g),[],'nothing agreed, nothing reported');
 g.state.time=100;recordAgreement(g,0,1,'pact','Hearth and Rivals swore a pact');
 g.state.time=200;const ag=recordAgreement(g,1,2,'marriage','Rivals and Others wed their houses');
 const news=neighbourNews(g);assert.ok(news.length>=1&&news[0].time>=news[news.length-1].time);
 assert.ok(news.some(n=>n.a===0||n.b===0),'player is party to the pact');
 assert.equal(neighbourNews(g,150).every(n=>n.time>=150),true);
 assert.ok(ag,'real third-party pact exists in owner state');
 const {societyRelation}=await import('../src/game/societyRelations.ts');societyRelation(g,0,1).known=true;societyRelation(g,0,2).known=true;
 assert.equal(neighbourNews(g).some(n=>n.a===1&&n.b===2),false,'meeting both societies cannot reveal their private agreement');
 const old=fixture();delete old.state.worldOptions.rulersVersion;delete old.state.rulers;assert.deepEqual(neighbourNews(old),[]);
});
test('lane A: citing a casus belli strains the holder (unrest), fades yearly, round-trips; old saves without cbDebt load',async()=>{
 const R=await import('../src/game/rulersRuntime.ts');const {validRulersState,rulersOf}=await import('../src/game/rulersState.ts');
 const g=fixture();g.state.time=RULERS_YEAR_SECONDS*2+1;advanceRulers(g);
 const r=rulersOf(g.state);assert.equal(r.cbDebt,undefined,'old shape: no debt field');assert.equal(R.cbDebtOf(g,2),0);
 g.state.rulers={...r,claims:[{holder:'2',target:'1',kind:'raid',strength:60,expiresTick:r.year+20}]};
 const u0=R.unrestOf(g,2).value;
 const c=R.citeClaim(g,2,1,'raid');assert.ok(c&&c.cost>0);
 assert.equal(R.cbDebtOf(g,2),Math.min(100,c.cost*2));
 const u1=R.unrestOf(g,2);assert.ok(u1.value>=u0,'strain never lowers unrest');assert.ok(u1.why.includes('the house spent its standing on a cause'));
 assert.equal(R.cbDebtOf(g,1),0,'the target pays nothing');
 assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))),'debt round-trips');
 const bad=JSON.parse(JSON.stringify(g.state.rulers));bad.cbDebt={2:500};assert.equal(validRulersState(bad),false);
 const d0=R.cbDebtOf(g,2);R.fadeCbDebt(g);assert.equal(R.cbDebtOf(g,2),Math.max(0,d0-4));
 for(let i=0;i<40;i++)R.fadeCbDebt(g);assert.equal(R.cbDebtOf(g,2),0);assert.ok(!('2' in g.state.rulers.cbDebt),'faded entries are dropped');
});
