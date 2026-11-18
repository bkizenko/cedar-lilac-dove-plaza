import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
// Regression: the 'borders never claim water' pass compared the water SURFACE height (waterAt) with 0, which is true
// on dry land too, so every claimed cell was erased and the territory map was blank for everyone.
test('a fresh world paints each society territory on land and never on open water',()=>{
 const g=new Game();g.reset(4,3);g.enterIsland();g.state.paused=false;for(let i=0;i<20;i++)g.step(.1);g.paintTerritory();
 const counts=new Map();for(const v of g.territory)counts.set(v,(counts.get(v)||0)+1);
 for(const team of [0,1,2])assert.ok((counts.get(team)||0)>50,JSON.stringify([...counts]));
 const n=Math.sqrt(g.territory.length),cell=g.world.size/n;let wetClaims=0;
 for(let i=0;i<g.territory.length;i++){if(g.territory[i]===255)continue;const x=-g.world.size/2+((i%n)+.5)*cell,z=-g.world.size/2+(Math.floor(i/n)+.5)*cell;if(g.waterAt(x,z)-g.height(x,z)>.05)wetClaims++;}
 assert.equal(wetClaims,0);
});
