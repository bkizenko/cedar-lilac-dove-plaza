// Disposable deterministic gameplay audit; never reads or writes a player's browser save.
import {Game} from '../src/game/sim.ts';
import {answerEncounter} from '../src/game/encounters.ts';
import {mulberry32} from '../src/game/rng.ts';
const seeds=process.argv.slice(2).map(Number);if(!seeds.length)seeds.push(123456,98765);
for(const seed of seeds){
 const random=Math.random;Math.random=mulberry32(seed^0x3a51);
 try{
  const g=new Game();g.reset(seed,5);g.enterIsland();g.state.paused=false;g.checkVictory=()=>{};
  const start=performance.now();
  for(let i=0;i<10800;i++){
   if(g.state.encounter)answerEncounter(g,'observe');
   g.step(1/3);
   if((i+1)%1800===0)console.log(JSON.stringify({seed,time:Math.round(g.state.time),villages:g.state.tribes.filter(t=>t.id!==3).map(t=>({team:t.id,alive:t.alive,pop:g.popNow(t.id),age:t.age,food:Math.round(t.food),wood:Math.round(t.wood),buildings:g.state.buildings.filter(b=>b.team===t.id&&b.hp>0).length})),errors:g.simulationErrors,wallMs:Math.round(performance.now()-start)}));
  }
 }finally{Math.random=random;}
}
