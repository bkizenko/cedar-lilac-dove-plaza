// Grok World T4 / CURRENT-POWER-HOOK: finished watermills and windmills grind grain at a rate
// set by their real power (river current / millrace head; site exposure × weather).
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {watermillSite,windmillSite} from '../src/game/waterWorks.ts';import {currentPowerKw} from '../src/game/riverCurrents.ts';
import {millPowerKw,millWorkRate,millIssue,MILL_RULES} from '../src/game/millPower.ts';
import {beginProduction,productionIssue,productionAI,productionSlots,PRODUCTION_RECIPES} from '../src/game/production.ts';
import {grindingRecipes} from '../src/game/cerealProcessing.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
let world;function fixture(){if(world)return world;const g=new Game();g.reset(1,19,{size:1040,layout:'continents'});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);
 let strong=null,dead=null,wind=null;const powered=[],home=g.campOf(0);for(let x=-500;x<500;x+=12)for(let z=-500;z<500;z+=12){const s=watermillSite(g,x,z);if(s.issues.length||!s.wheel)continue;const kw=millPowerKw(g,{type:'watermill',x,z});if(kw>=MILL_RULES.referenceKw)powered.push({x,z,kw,site:s});if(kw<MILL_RULES.minKw&&!dead)dead={x,z,kw};}
 strong=powered.filter(p=>g.workBoard.connected(g,home.x,home.z,p.x,p.z)).sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z))[0]??null;
 for(let x=-500;x<500&&!wind;x+=24)for(let z=-500;z<500;z+=24){if(!windmillSite(g,x,z).issues.length&&millPowerKw(g,{type:'windmill',x,z})>=MILL_RULES.minKw){wind={x,z};break;}}
 return world={g,strong,dead,wind};}
test('mill power comes from the real river and site, never below the wheel current, and weather moves it',()=>{
 const{g,strong,dead,wind}=fixture();assert.ok(strong,'a strong watermill site on the native map');assert.ok(dead,'a still-water mill site');assert.ok(wind,'an exposed windmill site');
 assert.ok(strong.kw>=currentPowerKw(g,strong.site.wheel.x,strong.site.wheel.z));
 assert.equal(millWorkRate(g,{type:'watermill',...dead}),0);assert.match(millIssue(g,{type:'watermill',...dead}),/too little current/);
 assert.ok(millWorkRate(g,{type:'watermill',...strong})>=1&&millWorkRate(g,{type:'watermill',...strong})<=MILL_RULES.maxRate);
 assert.equal(millWorkRate(g,{type:'grindingStone',x:0,z:0}),1,'other workplaces unchanged');
 const w={type:'windmill',...wind},clear=millPowerKw(g,w);g.state.weather='mist';const mist=millPowerKw(g,w);g.state.weather='clear';assert.ok(mist<clear,'mist slows the sails');
});
test('a finished powered watermill grinds a paid 16-grain batch faster than its catalogue time; a dead one refuses the batch',()=>{
 const{g,strong,dead}=fixture();const t=g.tribe(0);t.foodLots={...(t.foodLots||{}),grain:40};t.food=Math.max(t.food,40);
 assert.ok(grindingRecipes.includes('grindGrainWatermill')&&grindingRecipes.includes('grindGrainWindmill'));
 const mill=g.makeBld('watermill',strong.x,strong.z,0);mill.build=1;mill.hp=mill.maxHp;g.state.buildings.push(mill);assert.equal(productionSlots(mill),1);
 const still=g.makeBld('watermill',dead.x,dead.z,0);still.build=1;still.hp=still.maxHp;g.state.buildings.push(still);
 assert.match(productionIssue(g,'grindGrainWatermill',still.id)||'',/too little current/);
 assert.equal(productionIssue(g,'grindGrainWatermill',mill.id),null);assert.equal(beginProduction(g,'grindGrainWatermill',mill.id),true);
 const p=g.state.production.projects.at(-1);assert.equal(p.recipe,'grindGrainWatermill');const u=g.state.units.find(q=>q.id===p.actorId);assert.ok(u,'a miller was assigned');
 const spot=g.interactionSpot(u,mill)||{x:mill.x,z:mill.z};
 let worked=0,progressed=0;for(let i=0;i<4000&&p.progress<PRODUCTION_RECIPES.grindGrainWatermill.workSeconds;i++){Object.assign(u,{x:spot.x,z:spot.z,y:g.height(spot.x,spot.z)});const before=p.progress;g.state.time+=.1;g.navBudget=4;productionAI(g,u,.1);if(p.phase==='working'&&p.progress>before){worked+=.1;progressed+=p.progress-before;}}
 assert.ok(worked>0,'the miller worked at the mill: '+p.phase+' '+p.blockedReason);
 const rate=progressed/worked,expected=millWorkRate(g,mill);assert.ok(rate>=expected*.95,`work rate ${rate.toFixed(2)} follows mill power ${expected.toFixed(2)}`);
 const raw=encodeGame(g);const loaded=decodeGame(structuredClone(raw));assert.ok(loaded.state.production.projects.some(q=>q.recipe==='grindGrainWatermill'),'mill batch saves and loads');
});
