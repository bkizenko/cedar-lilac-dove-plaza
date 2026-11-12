import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {UNITS} from '../src/game/constants.ts';
import {FORMATION_KINDS,FORMATION_PROFILES,FORMATION_RULES,formationSlots,minimumSlotGap,rotateSlot} from '../src/game/formations.ts';
import {COUNTER_RULES,combinedMatchup,counterMatchup} from '../src/game/combatCounters.ts';
import {enableCombatDoctrine,formationOf,tickFormations,combatMatchup,explainMatchup,setPreferredFormation,validCombatDoctrine} from '../src/game/combatDoctrine.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {skirmish} from './combat-skirmish-fixture.mjs';

const facts=(role,extra={})=>({role,speed:5,armoured:false,ranged:false,cohesion:0,morale:1,advancing:false,...extra});
const rep=(t,n)=>Array(n).fill(t);

test('soft counters are bounded, readable and symmetric-free: no matchup is decisive', () => {
 const spear=counterMatchup(facts('spear'),facts('mounted'));
 assert.ok(spear.multiplier>1&&spear.multiplier<=COUNTER_RULES.ceiling);assert.match(spear.reasons[0],/Spears against cavalry ×1\.25/);
 const charge=counterMatchup(facts('mounted'),facts('spear',{formation:'line',cohesion:1}));assert.ok(charge.multiplier<1,'formed spears blunt a charge');
 assert.equal(counterMatchup(facts('mounted'),facts('spear')).multiplier,1,'a ragged crowd of spears does not blunt anything');
 const arrow=(armoured)=>counterMatchup(facts('archer',{ranged:true}),facts('blade',{armoured})).multiplier;assert.ok(arrow(false)>1&&arrow(true)<1);
 assert.ok(counterMatchup(facts('skirmisher',{speed:5.2,ranged:true}),facts('blade',{speed:4.5})).reasons.some(r=>/outpaces a slow heavy/.test(r)));
 assert.equal(counterMatchup(facts('skirmisher',{speed:5.2,ranged:true}),facts('mounted',{speed:7.2,armoured:false})).reasons.some(r=>/outpaces/.test(r)),false);
 // Shield wall cuts arrows hard, only in proportion to cohesion.
 const wall=c=>combinedMatchup(facts('archer',{ranged:true}),facts('blade',{formation:'shieldWall',cohesion:c})).multiplier;
 assert.ok(wall(1)<wall(.5)&&wall(.5)<wall(0));assert.ok(wall(1)>=COUNTER_RULES.floor);
 // Stacking can never exceed the band.
 for(const a of ['civilian','spear','blade','archer','skirmisher','mounted','commander','warden'])for(const d of ['civilian','spear','blade','archer','skirmisher','mounted','commander','warden'])for(const kind of [undefined,...FORMATION_KINDS])for(const ranged of [false,true]){
  const m=combinedMatchup(facts(a,{ranged,formation:kind,cohesion:1,morale:0,advancing:true}),facts(d,{armoured:true,formation:kind,cohesion:1,morale:0})).multiplier;
  assert.ok(m>=COUNTER_RULES.floor&&m<=COUNTER_RULES.ceiling,`${a} vs ${d}: ${m}`);
 }
});

test('formation geometry has real spacing without touching collision radii, and is seeded', () => {
 const radii=Math.max(...['spearman','swordsman','archer','ranger','warden'].map(t=>UNITS[t].r));
 for(const kind of FORMATION_KINDS)for(let n=4;n<=FORMATION_RULES.maximumMembers;n+=4){
  const slots=formationSlots(kind,n,7);assert.equal(slots.length,n);
  assert.ok(minimumSlotGap(slots)>=FORMATION_RULES.minimumSpacingMeters,`${kind} ${n}: ${minimumSlotGap(slots)}`);
  assert.ok(minimumSlotGap(slots)>=2*radii+.1,`${kind} ${n} would overlap foot soldiers`);
  const turned=slots.map(s=>rotateSlot(s,1.1));assert.ok(Math.abs(minimumSlotGap(turned)-minimumSlotGap(slots))<1e-9,'rotation preserves spacing');
 }
 assert.deepEqual(formationSlots('loose',12,3),formationSlots('loose',12,3));assert.notDeepEqual(formationSlots('loose',12,3),formationSlots('loose',12,4));
 assert.ok(FORMATION_PROFILES.loose.spacing>FORMATION_PROFILES.line.spacing&&FORMATION_PROFILES.line.spacing>FORMATION_PROFILES.shieldWall.spacing);
 assert.ok(Math.abs(formationSlots('wedge',6)[0].oz)<1e-9,'the wedge points at its apex');
 assert.ok(formationSlots('shieldWall',9)[0].oz>=formationSlots('shieldWall',9).at(-1).oz,'front rank comes first');
});

function army(extra=0){
 const g=new Game();g.reset(4242,3);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0)];
 g.state.conflict='quiet';g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();
 const units=['spearman','spearman','swordsman','spearman','archer','archer','swordsman','spearman'].slice(0,8+extra).map((t,i)=>{const u=g.spawnUnit(t,40+i*1.5,50+(i%2),0);u.militia=true;u.selected=true;return u;});
 return {g,units};
}

test('switch off: orders and hits behave exactly as before, and saves gain no keys', () => {
 const {g,units}=army();const r=units.map(u=>u.r);g.issueMove(90,50);
 assert.equal(g.state.formations,undefined);assert.equal(g.state.combatDoctrine,undefined);
 assert.deepEqual(units.map(u=>u.r),r);
 assert.equal(combatMatchup(g,units[0],units[1]).multiplier,1);
 const saved=JSON.parse(JSON.stringify(g.state));assert.equal('combatDoctrine'in saved||'formations'in saved||'guardDuties'in saved||'raidReports'in saved||'transit'in saved,false);
 const back=decodeGame(encodeGame(g));assert.equal(back.state.combatDoctrine,undefined);
});

test('ordering a group forms it with real spacing, keeps collision radii and survives a save', () => {
 const {g,units}=army();enableCombatDoctrine(g);setPreferredFormation(g,'shieldWall');const radii=units.map(u=>u.r);
 g.issueMove(90,50);
 const group=formationOf(g,units[0]);assert.ok(group);assert.equal(group.kind,'shieldWall');assert.equal(group.memberIds.length,8);
 const goals=units.map(u=>({ox:u.tx,oz:u.tz}));assert.ok(minimumSlotGap(goals)>=FORMATION_RULES.minimumSpacingMeters);
 assert.deepEqual(units.map(u=>u.r),radii,'collision is untouched');
 assert.ok(group.cohesion>0&&group.morale===FORMATION_RULES.startMorale);
 const back=decodeGame(encodeGame(g));assert.equal(back.state.formations.length,1);assert.equal(back.state.formations[0].kind,'shieldWall');assert.deepEqual(back.state.formations[0].memberIds,group.memberIds);
 // Re-ordering replaces rather than duplicating.
 setPreferredFormation(g,'wedge');g.issueMove(60,60);assert.equal(g.state.formations.length,1);assert.equal(formationOf(g,units[0]).kind,'wedge');
 // Fewer than four people keep the legacy loose spacing.
 const {g:g2,units:few}=army();enableCombatDoctrine(g2);few.slice(3).forEach(u=>{u.selected=false;});g2.issueMove(90,50);assert.equal((g2.state.formations||[]).length,0);
});

test('cohesion follows actual position, commanders raise it, and casualties cost morale', () => {
 const settle=(g,seconds=30)=>{for(let i=0;i<seconds;i++){g.state.time+=1.1;tickFormations(g,1.1);}};
 // A packed group standing on its slots.
 const packed=(leader)=>{const {g,units}=army();enableCombatDoctrine(g);g.issueMove(90,50);const gr=g.state.formations[0];
  units.forEach(u=>{u.order='idle';u.vx=0;u.vz=0;});
  // Standing near, but not on, their slots (within a spacing), so the cap does not hide the commander.
  units.forEach((u,i)=>{u.x=u.tx+(i%2?1:-1)*1.3;u.z=u.tz+(i%3?1:-1)*1.1;});
  if(leader){g.spawnUnit('leader',90+1,50+3,0);}
  gr.cohesion=.2;settle(g,25);return gr.cohesion;};
 const ragged=()=>{const {g,units}=army();enableCombatDoctrine(g);g.issueMove(90,50);const gr=g.state.formations[0];units.forEach((u,i)=>{u.order='idle';u.x=20+(i*37)%50;u.z=20+(i*53)%60;});settle(g,25);return gr.cohesion;};
 const a=packed(false),b=packed(true),c=ragged();
 assert.ok(a>c+.2,`formed ${a} vs scattered ${c}`);assert.ok(b>a,`commander ${b} vs none ${a}`);assert.ok(b-a<=.2,'a commander helps, but is bounded');
 // Casualties lower morale, a fallen commander more so.
 const {g,units}=army();enableCombatDoctrine(g);g.issueMove(90,50);const gr=g.state.formations[0];units.forEach(u=>{u.x=u.tx;u.z=u.tz;u.order='idle';});
 const before=gr.morale;units[2].hp=0;units[5].hp=0;g.state.time+=1.1;tickFormations(g,1.1);
 assert.equal(gr.casualties,2);assert.ok(gr.morale<before);assert.equal(gr.memberIds.length,6);
});

test('hits explain themselves: counters, shield wall and morale all show a reason', () => {
 const {g,units}=army();enableCombatDoctrine(g);setPreferredFormation(g,'shieldWall');
 const cav=g.spawnUnit('cavalry',70,50,3);
 const spear=units[0];assert.match(explainMatchup(g,spear,cav),/Spears against cavalry/);
 g.issueMove(90,50);units.forEach(u=>{u.x=u.tx;u.z=u.tz;u.order='idle';});for(let i=0;i<10;i++){g.state.time+=1.1;tickFormations(g,1.1);}
 const archer=g.spawnUnit('archer',60,50,3);
 const text=explainMatchup(g,archer,units[2]);assert.match(text,/Shield wall against arrows/);
 const m=combatMatchup(g,archer,units[2]);assert.ok(m.multiplier<1);
 const hit=combatMatchup(g,cav,units[0]);assert.ok(hit.reasons.some(r=>/Formed spears break the charge/.test(r)));
});

// A deterministic duel harness (scripts/combat-skirmish-fixture.mjs): fixed step, seeded start jitter, no village AI.
function breakEven(attacker,defenders,doctrine,counts,seeds){
 // Smallest force of `attacker` that wins most of the duels against a fixed `defenders` group.
 for(const n of counts){let wins=0;for(const seed of seeds)if(skirmish({seed,left:rep(attacker,n),right:defenders,doctrine}).winner==='left')wins++;if(wins*2>seeds.length)return n;}
 return Infinity;
}
test('deterministic skirmish: counters shift the balance but never decide a fight on their own', () => {
 const cav=rep('cavalry',4),seeds=[1,2,3];
 const off=breakEven('spearman',cav,false,[4,5,6,7,8,9,10],seeds),on=breakEven('spearman',cav,true,[3,4,5,6,7,8,9,10],seeds);
 assert.ok(Number.isFinite(off)&&Number.isFinite(on),`${off} ${on}`);
 assert.ok(on<off,`counters should matter: ${on} spears with the doctrine vs ${off} without`);
 assert.ok(off<=on*2,`counters must not dominate: ${off} vs ${on}`);
 // The countered side is not helpless: a modest numeric edge for the cavalry still wins under the doctrine.
 let cavalryWins=0;for(const seed of seeds)if(skirmish({seed,left:rep('spearman',Math.max(2,on-2)),right:cav,doctrine:true}).winner==='right')cavalryWins++;
 assert.ok(cavalryWins>=2,'riders still beat a clearly smaller spear line');
 // Same seeds, same result: pure and deterministic.
 const one=skirmish({seed:2,left:rep('spearman',on),right:cav,doctrine:true}),two=skirmish({seed:2,left:rep('spearman',on),right:cav,doctrine:true});
 assert.deepEqual([one.left,one.right],[two.left,two.right]);
 assert.ok(Object.keys(one.g.state.combatDoctrine.tally).length>0,'the tally records why the fight went as it did');
});

test('deterministic skirmish: a shield wall blunts archers, and archers still hurt it', () => {
 const archers=rep('archer',6),wall=rep('swordsman',4);
 const lossAfter=(doctrine,formation)=>skirmish({seed:5,left:archers,right:wall,doctrine,formation,steps:90}).right;
 const bare=lossAfter(false,'line'),walled=lossAfter(true,'shieldWall');
 assert.ok(walled>bare,`wall keeps more health in the first volleys: ${walled} vs ${bare}`);
 assert.ok(walled<1,'but the arrows still land');
});

test('invalid doctrine and formation saves are rejected, optional fields stay optional', () => {
 const {g,units}=army();enableCombatDoctrine(g);g.issueMove(90,50);
 const s=JSON.parse(JSON.stringify(g.state));assert.equal(validCombatDoctrine(s),true);
 const bad=(fn)=>{const c=JSON.parse(JSON.stringify(s));fn(c);return validCombatDoctrine(c);};
 assert.equal(bad(c=>{c.formations[0].kind='phalanx';}),false);assert.equal(bad(c=>{c.formations[0].morale=2;}),false);
 assert.equal(bad(c=>{c.formations[0].memberIds.push(c.formations[0].memberIds[0]);}),false);assert.equal(bad(c=>{delete c.combatDoctrine;}),false);
 assert.equal(bad(c=>{c.combatDoctrine.preferred='x';}),false);assert.equal(bad(c=>{c.combatDoctrine.tally={x:-1};}),false);
 assert.equal(bad(c=>{delete c.formations;}),true);
});
