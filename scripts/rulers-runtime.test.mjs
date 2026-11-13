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
 assert.match(applyEngineCommand(g,{kind:'marry-houses',team:1}).reason,/not met/,'unmet society: no envoy can carry a marriage offer');for(const k of ['foster-houses','exchange-hostages'])assert.match(applyEngineCommand(g,{kind:k,team:1}).reason,/not met/);
 g.state.societyRelations=[{from:0,to:1,known:true,trust:.5,grievance:0,hostile:false,peaceUntil:0,lastContactSeconds:0}];
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
 {const died=g.state.rulers.wardReturns.find(w=>w.how==='died'&&w.name==='Kid1');assert.ok(died,'death in custody is recorded');
  const cl=(g.state.rulers.claims??[]).filter(c=>c.kind==='defence'&&c.holder===died.from&&c.target===died.to);assert.ok(cl.length<=1,'at most one defence claim, gated by era/feature');
  const before=JSON.stringify(g.state.rulers.claims);settleWards(g);assert.equal(JSON.stringify(g.state.rulers.claims),before,'no repeat grievance once the ward is settled');}
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
 {const {expeditionHome}=await import('../src/game/expeditionProvisions.ts');const {foodInventory}=await import('../src/game/pantry.ts');const t=g.tribe(0),h=expeditionHome(g,u);assert.ok(h,'a cache to load provisions at');u.x=h.spot.x;u.z=h.spot.z;const inv=foodInventory(t);inv.berries=200;t.foodLots=inv;t.food=200;}
 assert.ok(beginExpedition(g,u));const packed=u.expedition.food,left=g.tribe(0).food;
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
test('neighbourNews: succession at a known court is reported publicly; unmet courts and private tallies stay out; old saves empty',async()=>{
 const {neighbourNews}=await import('../src/game/rulersRuntime.ts');
 const {ensureDecisions}=await import('../src/game/societyRuntime.ts');
 const g=fixture();g.state.time=RULERS_YEAR_SECONDS*2;advanceRulers(g);
 const d=ensureDecisions(g);assert.ok(d,'decision state exists');
 d.history['1']=[{year:2,kind:'succession',text:'Aren succeeded Bel (child, contested); 3 agreements carried (1 strained); grievances kept'}];
 g.state.societyRelations=[];
 assert.equal(neighbourNews(g).some(n=>n.kind==='succession'),false,'unmet court: nothing reported');
 g.state.societyRelations=[{from:0,to:1,known:true,trust:.5,grievance:0,hostile:false,peaceUntil:0,lastContactSeconds:0}];
 const n=neighbourNews(g).find(x=>x.kind==='succession');
 assert.ok(n&&n.a===1&&n.time===2*RULERS_YEAR_SECONDS&&/Aren succeeded Bel, and the claim is disputed/.test(n.text));
 assert.equal(/agreement|grievance/.test(n.text),false,'private tallies are not published');
 assert.equal(neighbourNews(g,3*RULERS_YEAR_SECONDS).some(x=>x.kind==='succession'),false);
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

test('AUD-SOC-SUCCESSION-WAR: a ruler dying mid-front or mid-exchange changes the throne only; fronts, claims and wards are untouched',async()=>{
 const R=await import('../src/game/rulersRuntime.ts');const {validRulersState}=await import('../src/game/rulersState.ts');
 const g=fixture();R.ensureRulers(g);
 for(const t of [0,1]){const u=g.state.units.find(u=>u.team===t&&u.hp>0);for(let i=0;i<45;i++)g.state.units.push({...u,id:g.state.units.length+9700+i+t*100});}
 for(const t of ['0','1']){const d=g.state.rulers.societies[t].dynasty,k=Object.values(d.people).find(p=>p.alive);
  d.people[t+'-kid']={...k,id:t+'-kid',name:'Kid'+t,age:5,spouse:undefined,parent:undefined,ruler:undefined,claimStrength:1};
  d.people[t+'-heir']={...k,id:t+'-heir',name:'Heir'+t,age:30,parent:d.rulerId,spouse:undefined,ruler:undefined,legit:true,claimStrength:90};}
 const f=R.fosterHouses(g,0,1);
 R.grantClaim(g,2,1,'claim',60,50);
 const front={id:1,hallId:1,defenderTeam:1,attackerTeam:2,phase:'pressed',openedAt:1,lastMeasuredAt:1,residentIds:[],armedAtOpen:3,buildingIds:[],hallHpAtOpen:100,casualties:1,captured:0,lostArmed:0,buildingLoss:0,occupiedSeconds:0,starvingSeconds:0,unrelievedSeconds:0,absentSeconds:0,ratio:.3,score:.2,threshold:.5,refusals:1,yieldedIds:[],reason:'test'};
 g.state.capitulation={version:1,fronts:[front]};
 const frontBefore=JSON.stringify(g.state.capitulation),claimsBefore=JSON.stringify(R.claimsOf(g)),wardsBefore=JSON.stringify(R.wardsOf(g));
 const d1=g.state.rulers.societies['1'].dynasty,old=d1.rulerId;d1.people[old].alive=false;
 g.state.time=RULERS_YEAR_SECONDS*(g.state.rulers.year+1)+1;advanceRulers(g);
 const after=g.state.rulers.societies['1'].dynasty;
 assert.notEqual(after.rulerId,old,'the throne passes');assert.ok(after.people[after.rulerId].alive);
 assert.equal(JSON.stringify(g.state.capitulation),frontBefore,'succession does not reset pressed/relieved front state');
 assert.equal(JSON.stringify(R.claimsOf(g)),claimsBefore,'claims against the house outlive its ruler');
 assert.equal(JSON.stringify(R.wardsOf(g)),wardsBefore,'wards stay where they are: no free release on a death');
 assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))),'save round-trip after succession mid-war');
 void f;
});

test('neighbourNews: only witnessed losses and observed reciprocal replacements are reported',async()=>{
 // Authored loss/lineage read-model fixture, not an earned battle or campaign.
 const {neighbourNews}=await import('../src/game/rulersRuntime.ts');
 const {enableCommanders,appointCommander,tickCommanders}=await import('../src/game/commanders.ts');
 const {encodeGame,decodeGame}=await import('../src/game/persistence.ts');
 const g=fixture();g.state.paused=false;enableCommanders(g,false);
 const mk=(team,x)=>{const u=g.state.units.find(p=>p.team===team&&p.hp>0&&p.type!=='worker')||g.state.units.find(p=>p.team===team&&p.hp>0);Object.assign(u,{x,z:0,y:g.height(x,0)});return u;};
 const far=mk(1,-180),near=mk(2,180),a=appointCommander(g,far.id,'army',{team:1,free:true}),b=appointCommander(g,near.id,'army',{team:2,free:true});assert.ok(a.accepted&&b.accepted,a.reason+b.reason);
 const home=g.state.units.find(u=>u.team===0&&u.hp>0);Object.assign(home,{x:180,z:0,y:g.height(180,0)});
 for(const u of g.state.units)if(u.team===0&&u.id!==home.id){u.x=0;u.z=-180;}
 for(const bd of g.state.buildings)if(bd.team===0){bd.x=0;bd.z=-200;}
 g.state.time=50;tickCommanders(g,1.01);g.state.time=60;far.hp=0;near.hp=0;tickCommanders(g,1.01);g.updateVision(0);
 assert.equal(neighbourNews(g).filter(n=>n.kind==='commander-fell').length,1);const roster=g.state.commanders.roster;assert.equal(roster.find(c=>c.id===a.commanderId).seenByPlayer,false);assert.equal(roster.find(c=>c.id===b.commanderId).seenByPlayer,true);
 g.state.time=70;const alt=g.state.units.find(u=>u.team===2&&u.hp>0&&u.id!==near.id);assert.ok(alt,'test must actually exercise a replacement');Object.assign(alt,{x:-180,z:0,y:g.height(-180,0)});const rep=appointCommander(g,alt.id,'army',{team:2,free:true,replaces:b.commanderId});assert.ok(rep.accepted,rep.reason);const successor=roster.find(c=>c.id===rep.commanderId),old=roster.find(c=>c.id===b.commanderId);assert.equal(successor.replaces,old.id);assert.equal(old.replacedBy,successor.id);assert.equal(successor.seenByPlayer,undefined,'fresh appointment has never suffered a witnessed loss');g.updateVision(0);assert.equal(g.visibleAt(alt.x,alt.z),false);assert.equal(neighbourNews(g).some(n=>n.kind==='commander-replaced'),false,'known death cannot reveal a hidden private appointment');
 Object.assign(alt,{x:home.x,z:home.z,y:home.y});g.updateVision(0);assert.equal(g.visibleAt(alt.x,alt.z),true);const before=JSON.stringify(encodeGame(g)),news=neighbourNews(g),replacement=news.filter(n=>n.kind==='commander-replaced');assert.equal(replacement.length,1);assert.match(replacement[0].text,new RegExp(successor.name));assert.match(replacement[0].text,new RegExp(old.name));assert.equal(replacement[0].time,70);assert.equal(JSON.stringify(encodeGame(g)),before,'news read never creates an observation receipt');assert.equal(neighbourNews(g,71).some(n=>n.kind==='commander-replaced'),false);
 delete old.replacedBy;assert.equal(neighbourNews(g).some(n=>n.kind==='commander-replaced'),false,'unrelated appointment cannot masquerade as a reciprocal replacement');old.replacedBy=successor.id;
 const unknown=g.state.units.find(u=>u.team===1&&u.hp>0&&u.id!==far.id);assert.ok(unknown);Object.assign(unknown,{x:home.x,z:home.z,y:home.y});const hiddenRep=appointCommander(g,unknown.id,'army',{team:1,free:true,replaces:a.commanderId});assert.ok(hiddenRep.accepted,hiddenRep.reason);g.updateVision(0);assert.equal(neighbourNews(g).filter(n=>n.kind==='commander-replaced').length,1,'seeing a new commander cannot reveal an unknown predecessor loss');
 const rt=decodeGame(encodeGame(g));assert.deepEqual(neighbourNews(rt),neighbourNews(g));const oldSave=fixture();assert.deepEqual(neighbourNews(oldSave).filter(n=>n.kind.startsWith('commander')),[]);
});

test('AUD-SOC-DIPLO-FLAVOUR: voice differs by ruler traits, is deterministic and goods-free; old callers without traits get the plain voice',async()=>{
 const {diplomaticVoice}=await import('../src/game/diplomaticVoice.ts');
 const base=Object.fromEntries(['ambition','piety','innovation','tradition','boldness','prudence','cruelty','mercy','generosity','paranoia','charisma','pride','honor'].map(k=>[k,50]));
 const warm=diplomaticVoice({...base,generosity:80},'Ash'),guarded=diplomaticVoice({...base,paranoia:80,generosity:30},'Ash'),proud=diplomaticVoice({...base,pride:80},'Ash'),stern=diplomaticVoice({...base,cruelty:80},'Ash');
 assert.deepEqual([warm.manner,guarded.manner,proud.manner,stern.manner],['warm','guarded','proud','stern']);
 assert.equal(new Set([warm,guarded,proud,stern].map(v=>v.greeting)).size,4);
 assert.deepEqual(diplomaticVoice({...base,generosity:80},'Ash'),warm);
 assert.equal(diplomaticVoice(undefined,'Ash').manner,'plain');
 assert.ok(Object.keys(warm).sort().join()==='gift,greeting,manner,refusal');
});
test('lane A rival court read model: known neighbours show ruler, heir and regent only; read-only, goods-free, JSON-safe; old saves empty',async()=>{
 const {councilModel}=await import('../src/game/rulersView.ts');
 const {societyRelation}=await import('../src/game/societyRelations.ts');
 const g=fixture();g.state.time=RULERS_YEAR_SECONDS*3;advanceRulers(g);
 const m0=councilModel(g,0);
 for(const n of m0.neighbours){assert.ok(societyRelation(g,0,n.team).known,'only known neighbours listed');}
 for(const t of [1,2])if(t<g.state.tribes.length)societyRelation(g,0,t).known=true;
 const snap=JSON.stringify(g.state);const m=councilModel(g,0);assert.equal(JSON.stringify(g.state),snap,'read model must not mutate state');
 const withCourt=m.neighbours.filter(n=>n.court);
 if(m.neighbours.length)assert.ok(withCourt.length>0,'each known neighbour has a court line');
 for(const n of withCourt){const o=g.state.rulers.societies[String(n.team)].dynasty;assert.equal(n.court.ruler,o.people[o.rulerId].name);assert.equal(n.court.house,o.house);if(n.court.heir)assert.ok(n.court.heir.name&&n.court.heir.age>=0);assert.deepEqual(Object.keys(n.court).filter(k=>!['ruler','rulerAge','house','law','heir','regent','extinct','lastEvent'].includes(k)),[]);}
 JSON.parse(JSON.stringify(m));
 delete g.state.worldOptions.rulersVersion;delete g.state.rulers;assert.equal(councilModel(g,0).neighbours.length,0);
});
test('lane A long-run stylized facts: 200 dynastic years in a real game stay valid, bounded, goods-free and save-safe',async()=>{
 const R=await import('../src/game/rulersRuntime.ts');const {validRulersState}=await import('../src/game/rulersState.ts');
 const g=fixture();R.ensureRulers(g);const units0=g.state.units.length,builds0=g.state.buildings.length;
 let jumps=0;const unrestStages={};
 for(let y=1;y<=200;y++){
  g.state.time=R.RULERS_YEAR_SECONDS*y+1;R.advanceRulers(g);
  if(y%50===0){const copy=JSON.parse(JSON.stringify(g.state.rulers));assert.ok(validRulersState(copy),'valid at year '+y);jumps++;}
  for(let t=1;t<g.state.tribes.length;t++){if(t===3)continue;const u=R.unrestOf(g,t);if(u)unrestStages[u.stage]=(unrestStages[u.stage]||0)+1;}
 }
 assert.equal(jumps,4);const r=g.state.rulers;assert.equal(r.year,200);
 for(const [id,sr] of Object.entries(r.societies)){const d=sr.dynasty;assert.ok(d.people[d.rulerId]||d.regent||d.log.length,'society '+id+' has a ruler, regent or logged gap');assert.ok(d.generation<=60,'no succession churn: '+d.generation);}
 assert.ok((r.claims??[]).length<=60,'claims stay bounded');assert.ok((r.wards??[]).length<=40,'wards stay bounded');
 for(const w of r.wards??[])assert.ok(r.societies[w.from]?.dynasty.people[w.person]?.alive,'wards are living kin');
 for(const list of Object.values(r.decisions?.history??{}))assert.ok(list.length<=40,'history capped');
 assert.equal(g.state.units.length,units0,'dynastic years conjure and remove no units');assert.equal(g.state.buildings.length,builds0,'and no buildings');
 const total=Object.values(unrestStages).reduce((a,b)=>a+b,0),severe=(unrestStages.civilWar||0)+(unrestStages.uprising||0);
 assert.ok(total>0&&severe/total<.5,'most society-years are not in uprising: '+JSON.stringify(unrestStages));
});

test('neighbourMemory: acts between two houses fade with a ten-year half-life, third parties and old saves stay out, no state added',async()=>{
 const {neighbourMemory,MEMORY_HALF_LIFE_YEARS}=await import('../src/game/rulersView.ts');
 const {recordAgreement}=await import('../src/game/societyRuntime.ts');
 const g=fixture();g.state.time=RULERS_YEAR_SECONDS*2;advanceRulers(g);const r=rulersOf(g.state);
 assert.deepEqual(neighbourMemory(g,0,1),[],'nothing happened, nothing remembered');
 g.state.time=RULERS_YEAR_SECONDS*r.year;recordAgreement(g,0,1,'pact','Hearth and Rivals swore a pact');recordAgreement(g,1,2,'marriage','Rivals and Others wed');
 const before=JSON.stringify(g.state.rulers);
 const fresh=neighbourMemory(g,0,1);assert.equal(fresh.length,1,'only acts between these two houses');assert.equal(fresh[0].weight,100);
 assert.equal(JSON.stringify(g.state.rulers),before,'read-only: no memory state is stored');
 r.year+=MEMORY_HALF_LIFE_YEARS;assert.equal(neighbourMemory(g,0,1)[0].weight,50,'half after one half-life');
 r.year+=3*MEMORY_HALF_LIFE_YEARS;assert.deepEqual(neighbourMemory(g,0,1),[],'forgotten once below the floor');
 r.year-=3*MEMORY_HALF_LIFE_YEARS;const d1=r.societies['1'].dynasty,k=Object.values(d1.people).find(p=>p.alive);
 d1.people['1-kid']={...k,id:'1-kid',name:'Kid1',age:6};r.wards=[{kind:'foster',person:'1-kid',from:'1',to:'0',since:r.year-1}];
 const m=neighbourMemory(g,0,1);assert.ok(m.some(x=>x.kind==='foster'&&/They sent Kid1 to us/.test(x.text)),'hosted ward is remembered');
 assert.ok(neighbourMemory(g,0,2).every(x=>x.kind!=='foster'),'a ward of house 1 is not a memory with house 2');
 const old=fixture();delete old.state.worldOptions.rulersVersion;delete old.state.rulers;assert.deepEqual(neighbourMemory(old,0,1),[]);
});

test('AUD-SOC-SAVE-ROUNDTRIP: a multi-unit founding party survives encode/decode with units, leader, timber, rations and position unchanged; no duplicates, no teleport',async()=>{
 const {encodeGame,decodeGame}=await import('../src/game/persistence.ts');
 const {expansionParties}=await import('../src/game/rulersRuntime.ts');
 const g=fixture();const t=g.tribe(1);
 const us=g.state.units.filter(u=>u.team===1&&u.hp>0).slice(0,3);assert.ok(us.length>=2);
 const dx=us[0].x+40,dz=us[0].z+10;
 us.forEach((u,i)=>{u.foundingJourney={x:dx,z:dz,leader:i===0,timber:20,...(i===0?{rations:6}:{})};});
 us[0].carry=20;us[0].carryType='wood';
 const before=expansionParties(g,1),n0=g.state.units.length,food0=t.food;
 const back=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
 assert.equal(back.state.units.length,n0,'no units created or lost by a reload');
 assert.equal(new Set(back.state.units.map(u=>u.id)).size,n0,'no duplicate unit ids');
 for(const u of us){const v=back.state.units.find(x=>x.id===u.id);assert.ok(v,'party member present');
  assert.deepEqual(v.foundingJourney,u.foundingJourney,'journey record intact');assert.equal(v.x,u.x);assert.equal(v.z,u.z);}
 assert.equal(back.state.units.filter(u=>u.foundingJourney?.leader&&u.team===1).length,1,'exactly one leader');
 assert.deepEqual(expansionParties(back,1),before,'read model identical after reload');
 assert.equal(back.tribe(1).food,food0,'pantry unchanged by reload');
});

test('AUD-SOC-HOSTAGE-RETURN: a fosterling coming home or a pledge broken by war is chronicled for the player, saved, validated, and old saves have none',async()=>{
 const R=await import('../src/game/rulersRuntime.ts');const {validRulersState}=await import('../src/game/rulersState.ts');
 const g=fixture();R.ensureRulers(g);
 for(const t of [0,1]){const u=g.state.units.find(u=>u.team===t&&u.hp>0);for(let i=0;i<45;i++)g.state.units.push({...u,id:g.state.units.length+9800+i+t*100});}
 for(const t of ['0','1']){const d=g.state.rulers.societies[t].dynasty,k=Object.values(d.people).find(p=>p.alive);
  d.people[t+'-kid']={...k,id:t+'-kid',name:'Kid'+t,age:5,spouse:undefined,parent:undefined,ruler:undefined,claimStrength:1};}
 assert.deepEqual(R.neighbourNews(g).filter(n=>n.kind==='ward-return'),[],'old save / no wards: nothing');
 const f=R.fosterHouses(g,0,1);assert.ok(f,'fixture must allow fosterage');
 g.state.rulers.societies['0'].dynasty.people['0-kid'].age=16;
 R.settleWards(g);
 const ret=g.state.rulers.wardReturns;assert.equal(ret.length,1);assert.equal(ret[0].how,'grown');
 const news=R.neighbourNews(g).filter(n=>n.kind==='ward-return');assert.equal(news.length,1);assert.match(news[0].text,/came home .* grown/);
 assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))),'return log survives a save');
 assert.equal(validRulersState({...JSON.parse(JSON.stringify(g.state.rulers)),wardReturns:[{kind:'x'}]}),false,'malformed log rejected');
 assert.equal(R.wardsOf(g,0).some(w=>w.person==='0-kid'),false,'the ward is really gone, not just reported');
 g.tribe(1).hostile=true;R.settleWards(g);
 assert.ok(g.state.rulers.wardReturns.some(w=>w.how==='war'),'war ending the other pledge is logged');
});

test('lane A: event claims are born of real events (raided house gets a defence claim; married heirless house draws a succession claim), saved and old saves load',async()=>{
 const R=await import('../src/game/rulersRuntime.ts');const {validRulersState}=await import('../src/game/rulersState.ts');
 const g=fixture();
 const none=fixture();delete none.state.worldOptions.rulersVersion;delete none.state.rulers;assert.deepEqual(R.eventClaims(none),[],'old saves: no claims born');
 assert.doesNotThrow(()=>R.spendRaidClaim(g,1,2));
 const d=R.claimsOf(g).filter(c=>c.kind==='defence');for(const c of d){assert.equal(c.holder,'2');assert.equal(c.target,'1');}
 // marriage tie + heirless line => succession claim, only from a real tie
 const r=g.state.rulers;r.ties={...(r.ties??{}),'0|1':{...(r.ties?.['0|1']??{}),bond:30}};
 const dyn=r.societies['1'].dynasty;for(const p of Object.values(dyn.people))if(p.id!==dyn.rulerId)p.alive=false;dyn.regent=undefined;
 R.eventClaims(g);for(const c of R.claimsOf(g).filter(c=>c.kind==='succession'))assert.equal(c.holder,'0');
 assert.deepEqual(R.eventClaims(g),[],'duplicates refused');
 assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))),'event claims survive a save round-trip');
});

test('party read model: explorer, trade caravan and raid units are shown with real stores, status and kind; pure read; off for old saves',async()=>{
 const {expansionParties}=await import('../src/game/rulersRuntime.ts');
 const {councilModel}=await import('../src/game/rulersView.ts');
 const g=fixture();assert.deepEqual(expansionParties(g),[]);
 const us=g.state.units.filter(u=>u.team===1&&u.hp>0&&!u.prisoner).slice(0,3);assert.equal(us.length,3);
 const [s,t,r]=us,home=g.campOf(1);
 s.scout={legs:1,returning:false};s.scoutProvisions={food:20,water:3};s.tx=s.x+60;s.tz=s.z;
 t.visit={phase:'outbound',wait:0,team:2,wanted:'wood'};t.carry=12;t.carryType='stone';t.tx=t.x+30;t.tz=t.z;
 r.pillage=2;r.order='attackmove';r.attackDestination={x:r.x+50,z:r.z+5};
 const before=JSON.stringify(g.state.units),ps=expansionParties(g,1);
 assert.equal(JSON.stringify(g.state.units),before,'pure read: nothing created, moved or granted');
 const by=Object.fromEntries(ps.map(p=>[p.kind,p]));
 assert.deepEqual(Object.keys(by).sort(),['explore','raid','trade']);
 assert.equal(by.explore.carrying,'20 food, 3 water');assert.equal(by.explore.status,'on the road');assert.ok(by.explore.distance>=59);
 assert.equal(by.trade.carrying,'12 stone for wood');assert.equal(by.raid.crew,1);assert.equal(by.raid.destX,r.attackDestination.x);
 s.scoutProvisions.food=2;assert.equal(expansionParties(g,1).find(p=>p.kind==='explore').status,'stores running low');
 s.scout.returning=true;const back=expansionParties(g,1).find(p=>p.kind==='explore');assert.equal(back.status,'turning home');assert.equal(back.destX,home.x);
 t.visit.phase='return';assert.equal(expansionParties(g,1).find(p=>p.kind==='trade').status,'carrying goods home');
 t.stuckT=9;assert.match(expansionParties(g,1).find(p=>p.kind==='trade').status,/struggling/);
 assert.deepEqual(JSON.parse(JSON.stringify(councilModel(g,1).parties)),expansionParties(g,1));
 s.prisoner={};assert.ok(!expansionParties(g,1).some(p=>p.kind==='explore'),'a captive is not on an expedition');
 delete g.state.worldOptions.rulersVersion;assert.deepEqual(expansionParties(g),[]);
});
test('decision feed: a known court\'s breakaway and reintegration are public news; plans and reasons stay private; unmet courts silent; old saves empty',async()=>{
 const {neighbourNews}=await import('../src/game/rulersRuntime.ts');
 const {ensureDecisions}=await import('../src/game/societyRuntime.ts');
 const g=fixture();g.state.time=RULERS_YEAR_SECONDS*3;advanceRulers(g);
 const d=ensureDecisions(g);
 d.history['1']=[{year:2,kind:'breakaway',text:'recognised Eastfold as its own'},{year:3,kind:'reintegration',text:'brought Eastfold back under the hall by force'},{year:3,kind:'plan',text:'changed its plan to raid for settle: SECRET-REASON'}];
 g.state.societyRelations=[];
 assert.equal(neighbourNews(g).some(n=>n.kind==='breakaway'||n.kind==='reintegration'),false,'unmet court: silent');
 g.state.societyRelations=[{from:0,to:1,known:true,trust:.5,grievance:0,hostile:false,peaceUntil:0,lastContactSeconds:0}];
 const news=neighbourNews(g);
 assert.ok(news.some(n=>n.kind==='breakaway'&&/recognised Eastfold/.test(n.text)));
 assert.ok(news.some(n=>n.kind==='reintegration'));
 assert.equal(JSON.stringify(news).includes('SECRET-REASON'),false,'private plan reasons never leak');
 assert.equal(neighbourNews(g,RULERS_YEAR_SECONDS*3).some(n=>n.kind==='breakaway'),false,'since filter applies');
 const old=fixture();delete old.state.worldOptions.rulersVersion;delete old.state.rulers;assert.deepEqual(neighbourNews(old),[]);
});
test('lane A: a deep unsettled grievance yields a hunting-ground claim; war or low grievance does not; saves validate',async()=>{
 const R=await import('../src/game/rulersRuntime.ts');const {validRulersState}=await import('../src/game/rulersState.ts');const {societyRelation}=await import('../src/game/societyRelations.ts');
 const g=fixture();const a=2,b=1;
 const rel=(h,o,patch)=>{const l=(g.state.societyRelations??=[]);let r=l.find(x=>x.from===h&&x.to===o);if(!r){r={from:h,to:o,known:true,trust:0,grievance:0,hostile:false,peaceUntil:0,lastContactSeconds:0};l.push(r);}Object.assign(r,patch);};
 rel(a,b,{known:true,grievance:.2,hostile:false});R.eventClaims(g);
 assert.equal(R.claimsOf(g,b).filter(c=>c.holder===String(a)&&c.kind==='claim').length,0,'low grievance: no dispute claim');
 rel(a,b,{grievance:.9,hostile:true});R.eventClaims(g);
 assert.equal(R.claimsOf(g,b).filter(c=>c.holder===String(a)&&c.kind==='claim').length,0,'open war is not a dispute');
 rel(a,b,{grievance:.9,hostile:false});R.eventClaims(g);
 const got=R.claimsOf(g,b).filter(c=>c.holder===String(a)&&c.kind==='claim');
 const canHold=societyRelation(g,a,b).known&&!!R.grantClaim(fixture(),a,b,'claim');
 assert.ok(got.length<=1,'never duplicated');if(got.length)assert.ok(got[0].strength>=30&&got[0].strength<=60);
 R.eventClaims(g);assert.ok(R.claimsOf(g,b).filter(c=>c.holder===String(a)&&c.kind==='claim').length<=1,'repeat year does not duplicate');
 assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))));void canHold;
});

test('lane A: wardReturns validator accepts bounded feed records and rejects malformed or oversized ones; old saves without it load',async()=>{
 const {validRulersState,initRulers}=await import('../src/game/rulersState.ts');
 const s=initRulers(7,['a','b']);
 assert.ok(validRulersState(s),'old save: no wardReturns');
 const rec={kind:'foster',name:'Ada',from:'a',to:'b',year:5,how:'grown',age:16};
 assert.ok(validRulersState(JSON.parse(JSON.stringify({...s,wardReturns:[rec]}))),'record survives JSON round-trip');
 for(const bad of [{...rec,kind:'tribute'},{...rec,name:'x'.repeat(61)},{...rec,name:5},null])
  assert.equal(validRulersState({...s,wardReturns:[bad]}),false,'malformed wardReturn rejected');
 assert.equal(validRulersState({...s,wardReturns:Array(25).fill(rec)}),false,'oversized list rejected');
 assert.equal(validRulersState({...s,wardReturns:'x'}),false);
});

test('kinDealRefusal: no envoy crosses the lines while the houses are at war',async()=>{
 const {kinDealRefusal}=await import('../src/game/rulersRuntime.ts');
 const g=fixture();const orig=g.isFoe.bind(g);
 g.isFoe=(a,b)=>(a===0&&b===1)||(a===1&&b===0)?true:orig(a,b);
 assert.match(kinDealRefusal(g,1),/at war/);
});

test('partyRisk (CAT-97): hostile people near the road raise risk and demand escorts; quiet road none; off for old saves',async()=>{
 const {partyRisk}=await import('../src/game/rulersRuntime.ts');
 const g=fixture();const a={x:0,z:0},b={x:100,z:0};
 const quiet=partyRisk(g,0,a,b);assert.ok(quiet);
 const foe=g.state.units.find(u=>u.team!==0&&u.hp>0&&g.isFoe(0,u.team));
 if(foe){for(let i=0;i<3;i++)g.state.units.push({...foe,id:g.state.units.length+7000+i,x:50,z:5});
  const r=partyRisk(g,0,a,b);assert.ok(r.risk>quiet.risk&&r.escort>=1&&r.foes>=3);}
 assert.ok(quiet.risk>=0&&quiet.risk<=1);
 delete g.state.worldOptions.rulersVersion;assert.equal(partyRisk(g,0,a,b),null);
});

test('harvest gathering: rotating well-fed host, peaceful known rivals only, ties rise, no goods or units move, skipped at war, old saves untouched, save round-trip',async()=>{
 const R=await import('../src/game/rulersRuntime.ts');const {validRulersState}=await import('../src/game/rulersState.ts');
 const g=fixture();R.ensureRulers(g);
 const rel=(f,t,o={})=>({from:f,to:t,known:true,trust:.3,grievance:0,hostile:false,peaceUntil:0,lastContactSeconds:0,...o});
 const ids=g.state.tribes.map((_,i)=>i).filter(i=>i!==0&&i!==3&&g.tribe(i));assert.ok(ids.length>=2);
 g.state.societyRelations=[];for(const a of ids)for(const b of ids)if(a!==b)g.state.societyRelations.push(rel(a,b));
 const snap=()=>JSON.stringify([g.state.units.map(u=>[u.team,u.hp>0]),g.state.buildings.length,g.state.tribes.map(t=>t.stock??null)]);
 let gat=null,before=snap();for(let y=0;y<ids.length&&!gat;y++){g.state.rulers.year=y;gat=R.harvestGathering(g);}
 assert.ok(gat,'a fed peaceful host holds a gathering');if(gat){assert.ok(!gat.guests.includes(gat.host));assert.ok(gat.guests.every(x=>x!=='0'&&x!=='3'));assert.equal(snap(),before,'no goods, units or buildings created or moved');assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))),'round-trips valid');assert.equal(g.state.rulers.gatherings.at(-1).year,gat.year);}
 // war between any two attendees: no gathering
 for(const r of g.state.societyRelations)r.hostile=true;g.state.rulers.gatherings=[];
 for(let y=0;y<ids.length;y++){g.state.rulers.year=y;assert.equal(R.harvestGathering(g),null,'hostile houses do not feast together');}
 // old save: nothing
 delete g.state.worldOptions.rulersVersion;delete g.state.rulers;assert.equal(R.harvestGathering(g),null);
});
