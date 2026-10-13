/** Repeatable full-year food-focus audit. Never reads or writes browser saves. */
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {answerEncounter} from '../src/game/encounters.ts';
const version=Number(process.env.WORLDGEN_VERSION||2);
const seeds=process.argv.slice(2).map(Number);if(!seeds.length)seeds.push(345,123456,98765);
for(const seed of seeds){
 let value=seed;const previous=Math.random;Math.random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
 try{
  const g=new Game();g.reset(seed,version);g.enterIsland();g.state.conflict='quiet';g.setGrowthPolicy('stable');g.setLaborPriority('food');
  const delivered={};const workerAI=g.workerAI.bind(g);g.workerAI=(u,dt)=>{const before=g.tribe(u.team).food,kind=u.carryFood||'provisions';workerAI(u,dt);if(u.team===0&&g.tribe(0).food>before)delivered[kind]=(delivered[kind]||0)+g.tribe(0).food-before;};
  const initial=g.state.units.filter(u=>u.team===0).map(u=>u.id);let empty=0;const months=[];
  for(let i=0;i<5400;i++){
   if(g.state.encounter)answerEncounter(g,'observe');g.step(1/3);
   if(g.tribe(0).food<.01)empty+=1/3;
   if(i%450===449)months.push({month:Math.round(g.state.time/150),food:Math.round(g.tribe(0).food),pop:g.popNow(0),...(process.env.FOOD_AUDIT_DETAIL?{delivered:{...delivered},knownFood:g.state.forage.filter(n=>g.exploredAt(n.x,n.z)).reduce((s,n)=>s+n.amount,0),nearFood:g.state.forage.filter(n=>Math.hypot(n.x-g.campOf(0).x,n.z-g.campOf(0).z)<100).reduce((s,n)=>s+n.amount,0),liveHerd:g.state.wildlife.filter(n=>n.species!=="bird"&&n.hp>0&&g.visibleAt(n.x,n.z)).length,workers:g.state.units.filter(u=>u.team===0).map(u=>({order:u.order,node:u.node?.kind||u.node?.species,reason:u.workReason,stuck:u.stuckT,carry:u.carry,x:Math.round(u.x),z:Math.round(u.z),fatigue:u.fatigue}))}:{})});
  }
  const survivors=initial.filter(id=>g.state.units.some(u=>u.id===id&&u.hp>0)).length;
  console.log(JSON.stringify({seed,version,time:Math.round(g.state.time),survivors,initial:initial.length,food:Math.round(g.tribe(0).food),emptySeconds:Math.round(empty),months}));
  assert.deepEqual(g.simulationErrors,[],'no hidden simulation failures');
  assert.ok(g.state.time>1799,'audit must reach the end of winter');
  assert.ok(survivors>=Math.ceil(initial.length*.85),'food focus must preserve starting residents through winter');
  assert.ok(empty<30,'food focus cannot leave a village without meals for an extended period');
 }finally{Math.random=previous;}
}
