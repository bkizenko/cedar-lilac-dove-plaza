import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {DIFFICULTIES,rivalDifficulty,difficultyEffects} from '../src/game/difficulty.ts';
import {isRivalTeam} from '../src/game/factions.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
const ids=['super-easy','easy','normal','hard','survival','apocalypse'];
function seeded(fn){const old=Math.random;let n=987654;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};try{return fn();}finally{Math.random=old;}}
test('rival modifiers rise monotonically with difficulty, are neutral at normal, and are disclosed',()=>{
 const f=(k)=>ids.map(i=>DIFFICULTIES[i][k]);
 for(const k of ['rivalGrowth','rivalAggression','rivalStock'])assert.deepEqual(f(k),[...f(k)].sort((a,b)=>a-b),k);
 assert.deepEqual(f('rivalWork'),[...f('rivalWork')].sort((a,b)=>b-a));
 for(const k of ['rivalWork','rivalGrowth','rivalAggression','rivalStock'])assert.equal(DIFFICULTIES.normal[k],1);
 for(const i of ids)assert.match(difficultyEffects(i),/Rival handicaps/);
});
const run=(id,seconds)=>seeded(()=>{
 const g=new Game();g.reset(345,14,{size:1040,layout:'pangaea',difficulty:id});g.enterAsBand();
 g.checkVictory=()=>{};
 const home=g.campOf(0),food=[...g.state.forage].sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z))[0];
 let planted=false;for(const r of [8,12,16,22])for(let i=0;i<16&&!planted;i++){const a=i/16*Math.PI*2;planted=g.placeBuilding('townhall',food.x+Math.cos(a)*r,food.z+Math.sin(a)*r,0);}
 assert.ok(planted,'passive player founded a hall and then gives no orders');
 const rivals=g.state.tribes.filter(t=>isRivalTeam(t.id)).map(t=>t.id);
 const start=rivals.map(t=>g.popNow(t));
 for(let i=0;i<seconds*3;i++)g.step(1/3);
 return {g,rivals,start,pop:rivals.reduce((n,t)=>n+g.popNow(t),0),age:rivals.reduce((n,t)=>n+g.tribe(t).age,0),player:g.popNow(0)};
});
test('rival modifiers apply to rivals only',()=>{
 const g=seeded(()=>{const g=new Game();g.reset(345,14,{size:1040,layout:'pangaea',difficulty:'hard'});g.enterIsland();return g;});
 assert.equal(rivalDifficulty(g,0).work,1);assert.equal(rivalDifficulty(g,3).aggression,1);
 assert.equal(rivalDifficulty(g,1).work,DIFFICULTIES.hard.rivalWork);
 assert.equal(decodeGame(encodeGame(g)).state.difficulty,'hard');
});
test('a Brutal-class rival out-grows an Easy one and a passive player over the same simulated time',{timeout:600000},()=>{
 const easy=run('easy',1500),hard=run('apocalypse',1500);
 console.log(JSON.stringify({easy:[easy.pop,easy.age,easy.player],hard:[hard.pop,hard.age,hard.player]}));
 assert.ok(hard.pop>easy.pop,'rival population');
 assert.ok(hard.pop/hard.rivals.length>hard.player,'average hard rival exceeds passive player');
});
