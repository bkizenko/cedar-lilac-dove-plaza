import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {validAnimalBeh} from '../src/game/animalBehaviour.ts';

test('animal headings are wrapped into [-PI, PI] after many updates, including ones that start far outside',{timeout:120000},()=>{
 const g=new Game();g.reset(20261115,undefined,{size:1040,layout:'continents'});g.enterIsland();
 const withBeh=g.state.wildlife.filter(c=>c.beh);assert.ok(withBeh.length>0,'animals have behaviour records');
 const birds=withBeh.filter(c=>/bird|eagle|vulture|crow|hawk|raptor|stork|goose|duck/i.test(c.species));
 // a heading that had already drifted out of range (as in the damaged autosave) must come back in range
 for(const c of withBeh.slice(0,40))c.beh.hd=-1005+(c.id%7);
 for(let i=0;i<4000;i++)g.step(.34);
 let worst=0;for(const c of g.state.wildlife)if(c.beh)worst=Math.max(worst,Math.abs(c.beh.hd));
 assert.ok(worst<=Math.PI+1e-9,`largest |heading| after 4000 updates is ${worst} (birds sampled: ${birds.length})`);
 const half=g.world.size/2+40;
 for(const c of g.state.wildlife)if(c.beh)assert.ok(validAnimalBeh(c.beh,g.state.time,half),`creature ${c.id} (${c.species}) behaviour record is savable`);
 // old saves with large headings must still validate
 const sample={...withBeh.find(c=>c.beh).beh,hd:-1005};assert.ok(validAnimalBeh(sample,g.state.time,half),'legacy out-of-range heading still loads');
});
