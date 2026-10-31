import test from 'node:test';
import assert from 'node:assert/strict';
import {grievanceChange,grievanceTemper} from '../src/game/antagonism.ts';
import {Game} from '../src/game/sim.ts';
test('territorial grievances persist for minutes, with personality-sensitive cooling and escalation',()=>{
 const calm=grievanceTemper(.1,.1,.7),warlike=grievanceTemper(.9,.9,.1);
 assert.ok(warlike.warThreshold<calm.warThreshold);
 assert.ok(grievanceChange(30,.9,.9,.1,2,0)>grievanceChange(30,.1,.1,.7,2,0));
 const after=.7+grievanceChange(30,.5,.5,0,0,0);
 assert.ok(after>.65&&after<.7,'withdrawal cools anger gradually rather than erasing it in seconds');
 assert.equal(grievanceChange(0,1,1,0,20,5),0);
});
test('distant villages retain grievances, and unseen foreign homes do not create new overlap anger',()=>{
 const g=new Game();g.reset(345);g.enterIsland();g.state.buildings=[g.makeBld('townhall',-300,0,0),g.makeBld('townhall',300,0,1)];g.state.units=[];g.state.rivalKnowledge=[];
 const t=g.tribe(1);Object.assign(t,{alive:true,hostile:false,ally:false,recoveryUntil:0,peaceTerm:undefined,tension:.7,trust:0,aggro:.5,expand:.5});
 g.tickInfluence(10);assert.ok(t.tension>.68&&t.tension<.7);
 t.tension=0;g.tickInfluence(10);assert.equal(t.tension,0);
});
test('simulation influence has the same stable core and finite fading sphere as the territory map',()=>{
 const g=new Game();g.reset(345);g.state.buildings=[g.makeBld('townhall',0,0,0)];g.paintTerritory();
 const radius=34*1.45;
 assert.equal(g.influenceAt(0,0,0),1);assert.equal(g.influenceAt(radius*.7,0,0),1);
 assert.ok(Math.abs(g.influenceAt(radius*.875,0,0)-.5)<1e-8);
 assert.equal(g.influenceAt(radius+1,0,0),0);
 const side=Math.sqrt(g.territoryStrength.length),cell=g.world.size/side;
 for(let z=0;z<side;z++)for(let x=0;x<side;x++)assert.ok(Math.abs(g.territoryStrength[z*side+x]-g.influenceAt(-g.world.size/2+(x+.5)*cell,-g.world.size/2+(z+.5)*cell,0))<.00001);
});
