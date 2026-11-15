import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {assessRivalPairRaid,rivalIntel,dispatchPairRaid} from '../src/game/rivalActivity.ts';
import {rivalMilitaryTarget} from '../src/game/rivalOperations.ts';
import {reserveSeconds} from '../src/game/settlement.ts';
import {UNITS} from '../src/game/constants.ts';
function seeded(fn){const old=Math.random;let n=424242;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};try{return fn();}finally{Math.random=old;}}
/** A neutral stage: rival 2 armed with its own residents, the passive player's hall within reach of rival 2. */
function stage(id){return seeded(()=>{
 const g=new Game();g.reset(345,14,{size:1040,layout:'pangaea',difficulty:id});g.enterAsBand();g.checkVictory=()=>{};
 const home=g.campOf(0),food=[...g.state.forage].sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z))[0];
 let p=false;for(const r of [8,12,16,22])for(let i=0;i<16&&!p;i++){const a=i/16*Math.PI*2;p=g.placeBuilding('townhall',food.x+Math.cos(a)*r,food.z+Math.sin(a)*r,0);}
 assert.ok(p);for(const b of g.state.buildings)if(b.team===0)b.build=1;
 const h2=g.campOf(2),hall=g.state.buildings.find(b=>b.team===0&&b.type==='townhall');
 // Move the player's hall near rival 2 is not allowed; instead bring rival 2's stage within intel range by testing with the real distance.
 return {g,d:Math.hypot(h2.x-hall.x,h2.z-hall.z),hall};});}
test('Hard-and-above raise army targets and disclose intel range; Normal is unchanged',()=>{
 const t={};for(const id of ['normal','hard','apocalypse']){const {g}=stage(id);const h=g.campOf(2);for(let i=0;i<30;i++){const u=g.spawnUnit('worker',h.x+3+i%10,h.z+3,2);u.maturesAt=0;}t[id]=rivalMilitaryTarget(g,2);}
 assert.ok(t.hard>=t.normal&&t.apocalypse>t.hard,JSON.stringify(t));
 assert.equal(rivalIntel(stage('normal').g,2).length,0,'no intel bonus at Normal');
});
test('a Hard rival with a real army plans and dispatches a raid on a weaker neighbour with no grievance; an Easy rival does not',()=>{
 const out={};
 for(const id of ['easy','hard']){const {g}=stage(id);
  const rival=2,home=g.campOf(rival);
  // The passive player's structures sit where the neighbouring society can see them: place the player's hall by the rival's range edge via the actual distance.
  const hall=g.state.buildings.find(b=>b.team===0&&b.type==='townhall');
  const dist=Math.hypot(home.x-hall.x,home.z-hall.z);
  // Real finite fighters: existing adults of rival 2 take up spears. Enough food and a long-enough world clock to pass opening protection.
  const adults=g.state.units.filter(u=>u.team===rival&&u.hp>0);
  for(const u of adults){u.maturesAt=0;u.militia=true;u.dmg=UNITS.spearman.dmg;u.range=UNITS.spearman.range;u.rof=UNITS.spearman.rof;}
  // Extra adults of the rival so retained guards plus a party exist.
  for(let i=0;i<10;i++){const u=g.spawnUnit('worker',home.x+3+i,home.z+3,rival);u.maturesAt=0;u.militia=true;u.dmg=UNITS.spearman.dmg;u.range=UNITS.spearman.range;u.rof=UNITS.spearman.rof;}
  g.tribe(rival).food=5000;g.state.time=1300;
  const a=assessRivalPairRaid(g,rival,reserveSeconds(g,rival));
  out[id]={dist:Math.round(dist),reason:a.plan?'PLAN':a.reason,partners:a.counts.eligiblePartners,known:a.counts.knownPartners};
 }
 console.log(JSON.stringify(out));
 assert.ok(out.hard.dist<=Math.min(700,400*DIFF('hard'))||out.hard.reason==='PLAN','stage not in intel range: '+JSON.stringify(out));
 assert.equal(out.hard.reason,'PLAN');
 assert.notEqual(out.easy.reason,'PLAN');
});
import {answerEncounter} from '../src/game/encounters.ts';
function armed(g,rival){const home=g.campOf(rival);
 for(const u of g.state.units.filter(u=>u.team===rival&&u.hp>0)){u.maturesAt=0;u.militia=true;u.dmg=UNITS.spearman.dmg;u.range=UNITS.spearman.range;u.rof=UNITS.spearman.rof;}
 for(let i=0;i<10;i++){const u=g.spawnUnit('worker',home.x+3+i,home.z+3,rival);u.maturesAt=0;u.militia=true;u.dmg=UNITS.spearman.dmg;u.range=UNITS.spearman.range;u.rof=UNITS.spearman.rof;}
 g.tribe(rival).food=5000;g.state.time=1300;}
test('EXPLORE: a dispatched Hard raid reaches and pressures a passive player settlement',{timeout:900000},()=>{
 const {g}=stage('hard');armed(g,2);
 const before={units:g.state.units.filter(u=>u.team===0&&u.hp>0).length,blds:g.state.buildings.filter(b=>b.team===0&&b.hp>0).length};
 const r=dispatchPairRaid(g,2,reserveSeconds(g,2),0);
 let log=[];
 for(let i=0;i<3*900;i++){if(g.state.encounter)answerEncounter(g,'observe');g.state.tribes[0].food=Math.max(g.state.tribes[0].food,4000);g.step(1/3);
  if(i%(60*3)===0){const hall=g.state.buildings.find(b=>b.team===0&&b.type==='townhall');log.push([Math.round(g.state.time),g.state.units.filter(u=>u.team===0&&u.hp>0).length,hall?Math.round(hall.hp):-1,g.state.units.filter(u=>u.team===2&&u.hp>0&&u.militia).length,(g.state.capitulation?.fronts||[]).map(f=>f.phase+':'+(f.goal||'')).join('|'),(g.state.occupations||[]).map(o=>o.phase).join('|'),g.tribe(0).food|0,'mission',(g.state.rivalMissions||[]).map(m=>m.phase).join(','),'min',Math.round(Math.min(...g.state.units.filter(u=>u.team===2&&u.societyMissionId).map(u=>Math.hypot(u.x-(hall?.x??0),u.z-(hall?.z??0))))),g.state.units.filter(u=>u.team===2&&u.societyMissionId).map(u=>u.order).slice(0,3).join(',')].join(' '));}}
 console.log(JSON.stringify(r),JSON.stringify(before));console.log(log.join('\n'));
});
import {DIFFICULTIES} from '../src/game/difficulty.ts';
function DIFF(id){return DIFFICULTIES[id].rivalAggression;}
