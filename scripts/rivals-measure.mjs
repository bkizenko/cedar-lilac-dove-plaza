import {Game} from '../src/game/sim.ts';import {isRivalTeam} from '../src/game/factions.ts';
import {answerEncounter} from '../src/game/encounters.ts';import {assessRivalPairRaid} from '../src/game/rivalActivity.ts';import {reserveSeconds} from '../src/game/settlement.ts';
const id=process.argv[2]||'hard',secs=Number(process.argv[3]||6000);
let n=987654;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
const g=new Game();g.reset(345,14,{size:1040,layout:'pangaea',difficulty:id});g.enterAsBand();g.checkVictory=()=>{};
const home=g.campOf(0),food=[...g.state.forage].sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z))[0];
let p=false;for(const r of [8,12,16,22])for(let i=0;i<16&&!p;i++){const a=i/16*Math.PI*2;p=g.placeBuilding('townhall',food.x+Math.cos(a)*r,food.z+Math.sin(a)*r,0);}
const rivals=g.state.tribes.filter(t=>isRivalTeam(t.id)).map(t=>t.id);
const row=()=>({t:Math.round(g.state.time),player:g.popNow(0),pb:g.state.buildings.filter(b=>b.team===0&&b.hp>0).length,rivals:rivals.map(t=>{const tr=g.tribe(t);const a=tr.alive?assessRivalPairRaid(g,t,reserveSeconds(g,t)):{reason:'dead',counts:{}};return [t,tr.alive?1:0,g.popNow(t),tr.age,g.state.units.filter(u=>u.team===t&&u.hp>0&&(u.militia||!['worker','leader'].includes(u.type))).length,g.state.buildings.filter(b=>b.team===t&&b.hp>0).length,Math.round(tr.food),a.plan?'PLAN':a.reason,JSON.stringify(a.counts)].join('/');}),raids:JSON.stringify(Object.fromEntries(Object.entries(g.state.rivalActivity?.totals||{}).filter(([k])=>k.includes('raid')&&!k.endsWith('reviewed')&&!k.endsWith('blocked'))))});
for(let i=0;i<secs*3;i++){if(g.state.encounter)answerEncounter(g,'observe');g.step(1/3);if(process.env.FEED&&i%90===0){g.tribe(0).food=Math.max(g.tribe(0).food,3000);}if(i%(600*3)===600*3-1)console.log(JSON.stringify(row()));}
