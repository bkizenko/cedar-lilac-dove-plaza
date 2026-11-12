import {Game} from '../src/game/sim.ts';
import {declareSocietyHostility} from '../src/game/societyRelations.ts';
import {enableCombatDoctrine,tickFormations} from '../src/game/combatDoctrine.ts';
import {mulberry32} from '../src/game/rng.ts';
/** Deterministic duel harness: two rival societies, no village AI, fixed step. */
export function skirmish({seed=1,left,right,doctrine=true,formation='line',flags={},steps=1800,dt=.1,gap=26}){
 const g=new Game();g.reset(777,3);g.enterIsland();g.world.heights.fill(4);
 g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0)];g.state.conflict='quiet';g.state.weather='clear';g.state.paused=false;g.vision.fill(2);g.rebuildWalk();
 if(!doctrine)delete g.state.combatDoctrine;
 if(doctrine){enableCombatDoctrine(g,flags);g.state.combatDoctrine.preferred=formation;}
 declareSocietyHostility(g,1,2);
 const rand=mulberry32(seed*7919+13),make=(types,team,x0,dir)=>types.map((type,i)=>{const u=g.spawnUnit(type,x0+dir*(rand()*3),50+(i-types.length/2)*1.8+rand()*.6,team);u.militia=true;return u;});
 const A=make(left,1,50,-1),B=make(right,2,50+gap,1);
 g.state.time=10;
 const nearest=(u,foes)=>{let b=null,bd=1e9;for(const f of foes){if(f.hp<=0)continue;const d=Math.hypot(f.x-u.x,f.z-u.z);if(d<bd){bd=d;b=f;}}return b;};
 for(const u of A)u.facing=Math.PI/2;for(const u of B)u.facing=-Math.PI/2;
 if(doctrine&&flags.formations!==false){
  if(A.length>=4)g.slotOffsets(A,50+gap,50);
  if(B.length>=4)g.slotOffsets(B,50,50);
 }
 for(let i=0;i<steps;i++){
  g.state.time+=dt;g.navBudget=50;
  for(const [mine,foes] of [[A,B],[B,A]])for(const u of mine){if(u.hp<=0)continue;const t=nearest(u,foes);if(!t)continue;u.target=t;u.order='attack';u.tx=t.x;u.tz=t.z;g.combatAI(u,dt);}
  g.separate(dt);tickFormations(g,dt);g.updateProjectiles(dt);
  if(!A.some(u=>u.hp>0)||!B.some(u=>u.hp>0))break;
 }
 const hp=l=>l.reduce((n,u)=>n+Math.max(0,u.hp),0),max=l=>l.reduce((n,u)=>n+u.maxHp,0);
 return {g,A,B,left:hp(A)/max(A),right:hp(B)/max(B),winner:hp(A)>hp(B)?'left':'right',aliveA:A.filter(u=>u.hp>0).length,aliveB:B.filter(u=>u.hp>0).length};
}
