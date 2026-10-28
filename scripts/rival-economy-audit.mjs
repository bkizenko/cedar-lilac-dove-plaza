/** Isolated rival-economy soak: never touches a browser or a saved player village.
 * Reports actual development; survival/advancement values are observations, not
 * hidden setup bonuses. Normal weather, conflict and rival AI stay enabled.
 */
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {answerEncounter} from '../src/game/encounters.ts';
import {foodDemand,farmHarvestEstimate} from '../src/game/settlement.ts';
import {isRivalTeam} from '../src/game/factions.ts';
import {writeFileSync,readFileSync} from 'node:fs';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
const years=Number(process.env.AUDIT_YEARS||3);
assert.ok(Number.isInteger(years)&&years>=3&&years<=20);
const version=Number(process.env.WORLDGEN_VERSION||2);
assert.ok([1,2,3].includes(version),'WORLDGEN_VERSION must be 1, 2 or 3');
const seeds=process.argv.slice(2).map(Number);if(!seeds.length)seeds.push(345,123456,98765);
const results=[];
for(const seed of seeds) {
 let random=seed;const original=Math.random;
 Math.random=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 try {
  let g;
  if(process.env.AUDIT_RESUME_PATH){const saved=JSON.parse(readFileSync(process.env.AUDIT_RESUME_PATH,'utf8'));g=decodeGame(saved.snapshot);random=saved.random;}
  else {g=new Game();g.reset(seed,version);g.enterIsland();}
  g.checkVictory=()=>{};g.state.paused=false;g.state.ended=null;
  const startTime=g.state.time;
  const teams=g.state.tribes.filter(t=>isRivalTeam(t.id)&&t.alive).map(t=>t.id);
  const initial=Object.fromEntries(teams.map(team=>[team,g.state.units.filter(u=>u.team===team).map(u=>u.id)]));
  let contacts=0;
  const barter=Object.fromEntries(teams.map(t=>[t,{departures:0,exchanges:0,declined:0}])),journeys=new Map();
  for(let i=0;i<5400*years;i++) {
   if(g.state.encounter){answerEncounter(g,'observe');contacts++;}
   g.step(1/3);
   for(const u of g.state.units){
    const m=u.visit;
    if(barter[u.team]&&m?.team!==undefined&&m.phase==='outbound'&&!journeys.has(u.id)){journeys.set(u.id,'outbound');barter[u.team].departures++;}
    if(barter[u.team]&&m?.team!==undefined&&m.phase==='return'&&journeys.get(u.id)==='outbound'){barter[u.team][u.carryType===m.wanted?'exchanges':'declined']++;journeys.set(u.id,'return');}
    if(!m)journeys.delete(u.id);
   }
   if(i%5400===5399){
    const row={seed,worldgenVersion:g.state.worldgenVersion,year:Math.round(g.state.time/1800),time:g.state.time,contactDialogs:contacts,errors:g.simulationErrors,rivals:teams.map(team=>{
     const t=g.tribe(team),h=g.campOf(team),workers=g.state.units.filter(u=>u.team===team&&u.type==='worker'&&u.hp>0);
     const counts={};for(const u of workers){const key=u.order+(u.node?' '+(u.node.type||u.node.kind||u.node.species):'');counts[key]=(counts[key]||0)+1;}
     return {team,name:t.name,alive:t.alive,pop:g.popNow(team),originalSurvivors:initial[team].filter(id=>g.state.units.some(u=>u.id===id&&u.hp>0)).length,initial:initial[team].length,food:Math.round(t.food),foodReserveSeconds:Math.round(t.food/Math.max(.001,foodDemand(g,team))),wood:Math.round(t.wood),stone:Math.round(t.stone),copper:Math.round(t.copper),age:t.age,nextAge:g.ageUpIssue(team),fields:g.state.buildings.filter(b=>b.team===team&&b.type==='farm'&&g.finished(b)).length,stores:g.state.buildings.filter(b=>b.team===team&&b.type==='warehouse'&&g.finished(b)).length,buildings:g.state.buildings.filter(b=>b.team===team&&b.hp>0).map(b=>({type:b.type,build:b.build})),localTimber:Math.round(g.state.trees.filter(n=>n.amount>0&&Math.hypot(n.x-h.x,n.z-h.z)<90).reduce((s,n)=>s+n.amount,0)),workerTasks:counts,barter:barter[team],fieldYield:g.state.buildings.filter(b=>b.team===team&&b.type==='farm').map(b=>({potential:farmHarvestEstimate(g,b,1,1,1),crop:b.crop})),workers:workers.slice(0,4).map(u=>({job:u.job,reason:u.workReason,carry:u.carry,node:u.node?.id,emergency:u.emergency,expedition:u.expedition,resting:u.resting})),stuck:workers.filter(u=>u.stuckT>10).map(u=>({id:u.id,order:u.order,reason:u.workReason,stuck:u.stuckT,carry:u.carry,x:u.x,z:u.z})),travelers:g.state.units.filter(u=>u.team===team&&u.hp>0&&(u.scout||u.visit)).length};
    })};
    console.log(JSON.stringify(row));
    if(i===5400*years-1)results.push(...row.rivals);
    if(process.env.AUDIT_SNAPSHOT_PATH)writeFileSync(process.env.AUDIT_SNAPSHOT_PATH,JSON.stringify({snapshot:encodeGame(g),random}));
    assert.ok(g.state.units.every(u=>[u.x,u.y,u.z,u.hp].every(Number.isFinite)));
   }
  }
  if(process.env.AUDIT_SNAPSHOT_PATH)writeFileSync(process.env.AUDIT_SNAPSHOT_PATH,JSON.stringify({snapshot:encodeGame(g),random}));
  assert.ok(g.state.time>startTime+years*1800-1,'audit must reach all requested years');
  assert.deepEqual(g.simulationErrors,[],'no hidden simulation exceptions');
 }finally{Math.random=original;}
}
assert.ok(results.filter(r=>r.pop>=4).length>=Math.ceil(results.length*2/3),'at least two thirds of the observed societies sustain residents through the requested years');
assert.ok(results.some(r=>r.pop>=8),'at least one society grows beyond its starting population');
if(process.env.AUDIT_REQUIRE_AGE)assert.ok(results.some(r=>r.age>=Number(process.env.AUDIT_REQUIRE_AGE)),'a surviving rival must actually reach the requested age');
console.log('Observed survival/growth checks passed; annual records retain actual age and resource outcomes.');
