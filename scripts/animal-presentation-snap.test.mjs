import test from 'node:test';import assert from 'node:assert/strict';
import {shouldSnapPresentation,SNAP_GAP_METERS} from '../src/scene/animalMotion.ts';
// BUG-BORIS-ANIMAL-GLITCH: the drawn body eases toward the sim position (rate 14/s, frame dt capped at .1 s).
// A galloping deer at 4x game speed must never trip the teleport snap while it simply runs.
function maxLead(speedMps,gameSpeed,frameDt,simStep=.1){
 let simX=0,drawn=0,acc=0,lead=0,snaps=0;
 for(let t=0;t<20;t+=frameDt){
  acc+=frameDt*gameSpeed;while(acc>=simStep){simX+=speedMps*simStep;acc-=simStep;}
  if(shouldSnapPresentation(Math.abs(simX-drawn),speedMps)){snaps++;drawn=simX;}
  else drawn+=(simX-drawn)*(1-Math.exp(-Math.min(.1,frameDt)*14));
  lead=Math.max(lead,Math.abs(simX-drawn));
 }
 return {lead,snaps};
}
test('running animals at every game speed and frame rate ease instead of snapping',()=>{
 for(const speed of [1.5,4,8,9])for(const game of [1,2,4])for(const dt of [1/120,1/60,1/30,.1]){
  const r=maxLead(speed,game,dt);assert.equal(r.snaps,0,JSON.stringify({speed,game,dt,...r}));
 }
});
test('a real relocation still snaps; standing animals snap only past the gap',()=>{
 assert.equal(shouldSnapPresentation(40,0),true);assert.equal(shouldSnapPresentation(SNAP_GAP_METERS+.01,0),true);
 assert.equal(shouldSnapPresentation(3.5,0),false);assert.equal(shouldSnapPresentation(NaN,0),true);
 assert.equal(shouldSnapPresentation(12,8),false);assert.equal(shouldSnapPresentation(30,8),true);
});
