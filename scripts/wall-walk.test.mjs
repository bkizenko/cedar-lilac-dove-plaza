import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {enableCombatDoctrine} from '../src/game/combatDoctrine.ts';
import {wallLayout,manWalls} from '../src/game/wallWalk.ts';
import {dutyOf,guardDutyAI,validGuardDuties} from '../src/game/guardDuty.ts';
import {isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function world(){const g=new Game();g.reset(4242,3);g.enterIsland();g.world.heights.fill(4);g.state.units=[];for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 const bs=[g.makeBld('townhall',0,0,0)];
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2;bs.push(g.makeBld(i===0?'gate':'stonewall',Math.round(Math.cos(a)*40/4)*4,Math.round(Math.sin(a)*40/4)*4,0));}
 bs.push(g.makeBld('watchtower',44,0,0));g.state.buildings=bs;for(const b of bs){b.done=true;b.progress=1;}
 g.state.conflict='quiet';g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();enableCombatDoctrine(g);return g;}
const armed=(g,i)=>{const u=g.spawnUnit('spearman',i*2,5,0);u.militia=true;u.y=4;return u;};
test('walls give gate and tower posts plus a patrol loop; too few walls give none',()=>{
 const g=world(),l=wallLayout(g);assert.ok(l&&l.posts.some(p=>p.kind==='gate')&&l.posts.some(p=>p.kind==='tower')&&l.loop.length>=2);
 const h=new Game();h.reset(4242,3);h.enterIsland();h.state.buildings=[];assert.equal(wallLayout(h),null);
});
test('manning the walls posts guards at gate and tower and sends the rest around the loop; survives save',()=>{
 const g=world(),us=[0,1,2,3,4].map(i=>armed(g,i)),r=manWalls(g,us.map(u=>u.id));
 assert.equal(r.accepted,true);assert.equal(r.posts,2);assert.equal(r.patrols,3);
 const patrols=us.map(u=>dutyOf(g,u)).filter(d=>d?.kind==='patrol');assert.equal(patrols.length,3);assert.ok(patrols.every(d=>d.route.length>=2));
 assert.equal(new Set(patrols.map(d=>d.leg)).size,3,'patrols are spread around the loop');
 const rl=decodeGame(encodeGame(g));assert.ok(validGuardDuties(rl.state));assert.equal(rl.state.guardDuties.filter(d=>d.route).length,3);
 const d=patrols[0],u=us.find(p=>dutyOf(g,p)===d);for(let i=0;i<300;i++){g.state.time+=.1;g.navBudget=50;guardDutyAI(g,u,.1);g.combatAI(u,.1);}
 assert.ok(Math.min(...d.route.map(p=>Math.hypot(u.x-p.x,u.z-p.z)))<30,'patrolling along the wall');
 assert.ok(isEngineDispatchCommand({kind:'man-walls',unitIds:[1,2]}));assert.ok(!isEngineDispatchCommand({kind:'man-walls',unitIds:[]}));
});
test('unarmed people are refused',()=>{const g=world(),w=g.spawnUnit('worker',1,1,0);assert.equal(manWalls(g,[w.id]).accepted,false);});
