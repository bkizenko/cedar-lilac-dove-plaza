import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {tickOccupation,validConflictIntentState} from '../src/game/conflictIntent.ts';
import {tickRivalSiege,siegeUnderWay,RIVAL_SIEGE_RULES} from '../src/game/rivalSiege.ts';
import {frontScore} from '../src/game/capitulation.ts';
import {declareSocietyHostility} from '../src/game/societyRelations.ts';
import {SIEGE_RAM_RULES} from '../src/game/siegeRam.ts';

function fixture({walls=true,cordage=6}={}){const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 const hall=g.makeBld('townhall',80,38,1),shop=g.makeBld('workshop',30,38,2),home=g.makeBld('townhall',10,38,2);g.state.buildings=[g.makeBld('townhall',-200,38,0),hall,shop,home];
 if(walls)g.state.buildings.push(g.makeBld('palisade',70,38,1),g.makeBld('gate',80,28,1));for(const b of g.state.buildings){b.build=1;b.hp=b.maxHp;}
 g.vision.fill(2);g.rebuildWalk();declareSocietyHostility(g,2,1);g.tribe(2).wood=60;g.tribe(2).items={cordage};
 for(let i=0;i<4;i++){const u=g.spawnUnit('worker',84+i,46,1);u.homeHall=hall.id;u.order='hold';}
 for(let i=0;i<6;i++){const u=g.spawnUnit('spearman',62+i*.5,44,2);u.order='hold';}
 const crew=[0,1,2,3].map(i=>{const u=g.spawnUnit('worker',32+i,42,2);u.order='idle';return u;});
 for(let i=0;i<20;i++){g.state.time+=.1;tickOccupation(g,.1);}
 return{g,hall,shop,crew};}

test('a society pressing a walled community pays for a real ram at its own workshop; no walls, no engine',()=>{
 const {g}=fixture();const wood=60,cordage=6;// fixture's own conflict ticks already ran the siege review
 assert.ok(g.state.capitulation.fronts.some(f=>f.attackerTeam===2&&f.phase==='pressed'),'front opened from presence');
 tickRivalSiege(g);const ram=g.state.siegeRams?.assets.find(a=>a.team===2);assert.ok(ram,'ram commissioned');
 assert.equal(g.tribe(2).wood,wood-SIEGE_RAM_RULES.wood);assert.equal(g.tribe(2).items.cordage,cordage-SIEGE_RAM_RULES.cordage,'paid from its own stores');
 g.state.time+=RIVAL_SIEGE_RULES.reviewSeconds+1;tickRivalSiege(g);assert.equal(g.state.siegeRams.assets.filter(a=>a.team===2).length,1,'one engine at a time');
 const open=fixture({walls:false});tickRivalSiege(open.g);assert.equal(open.g.state.siegeRams?.assets?.length??0,0);
 const poor=fixture({cordage:0});tickRivalSiege(poor.g);assert.equal(poor.g.state.siegeRams?.assets?.length??0,0,'no cordage, no engine');
});
test('a finished ram is crewed against the nearest fortification and adds a measured siege term to capitulation',()=>{
 const {g,hall}=fixture();tickRivalSiege(g);const ram=g.state.siegeRams.assets.find(a=>a.team===2);
 ram.progress=SIEGE_RAM_RULES.workSeconds;ram.phase='ready';ram.makerId=undefined;for(const u of g.state.units)if(u.siegeRamId===ram.id)delete u.siegeRamId;ram.uncollected={wood:0,cordage:0};ram.delivered={wood:SIEGE_RAM_RULES.wood,cordage:SIEGE_RAM_RULES.cordage};
 g.state.time+=RIVAL_SIEGE_RULES.reviewSeconds+1;tickRivalSiege(g);assert.equal(ram.phase,'moving',ram.blockedReason);assert.ok(ram.crewIds.length>=SIEGE_RAM_RULES.minimumCrew);
 assert.equal(siegeUnderWay(g,hall,2),true);const f=g.state.capitulation.fronts.find(f=>f.attackerTeam===2);const before=frontScore(f);
 for(let i=0;i<300;i++){g.state.time+=.1;tickOccupation(g,.1);}assert.ok(f.siegeSeconds>=25,String(f.siegeSeconds));assert.ok(frontScore(f)>before);
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));assert.equal(validConflictIntentState(raw.state),true);const bad=structuredClone(raw.state);bad.capitulation.fronts[0].siegeSeconds=-1;assert.equal(validConflictIntentState(bad),false);
 decodeGame(raw);
});
