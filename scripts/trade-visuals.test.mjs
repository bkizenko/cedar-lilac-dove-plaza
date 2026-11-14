import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {collectPartyPlacements,collectPilePlacements,partyYaw,pileShapeOf,PILE_RULES} from '../src/scene/tradeVisuals.ts';

function fixture(){const g=new Game();g.reset(123456,2);g.enterIsland();g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('warehouse',14,38,0)];return g;}
const party=(o)=>({version:1,id:1,kind:'expedition',mode:'land',team:1,x0:0,z0:0,x1:100,z1:0,phase:'outbound',progress:10,travel:20,dwell:0,...o});

test('party placements follow position and heading, and vanish with the party',()=>{
 const g=fixture(),out=[];g.state.tradeParties=[party({}),party({id:2,mode:'sea',phase:'returning',progress:5})];
 collectPartyPlacements(g,out);assert.equal(out.length,2);
 assert.ok(Math.abs(out[0].x-50)<1e-9);assert.ok(Math.abs(out[0].yaw-Math.PI/2)<1e-9);assert.equal(out[0].walking,true);
 assert.ok(Math.abs(partyYaw(party({phase:'returning'}))+Math.PI/2)<1e-9);assert.equal(out[1].mode,'sea');
 g.state.tradeParties=[];collectPartyPlacements(g,out);assert.equal(out.length,0);
 g.state.tradeParties=Array.from({length:40},(_,i)=>party({id:i}));collectPartyPlacements(g,out);assert.equal(out.length,PILE_RULES.maxPartyInstances);
});

test('stockpile piles appear only for real overflow and are bounded',()=>{
 const g=fixture();assert.equal(collectPilePlacements(g,0,[]).length,0);
 g.tribe(0).items={flour:5000,pottery:5000,bone:5000};
 const out=collectPilePlacements(g,0,[]);assert.ok(out.length>0&&out.length<=PILE_RULES.maxPileInstances);
 assert.ok(out.every(o=>Number.isFinite(o.x)&&Number.isFinite(o.z)));
 assert.equal(pileShapeOf('flour'),'sack');assert.equal(pileShapeOf('pottery'),'crate');assert.equal(pileShapeOf('bone'),'log');
});
