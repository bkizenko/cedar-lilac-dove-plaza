import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {communityResidency,tickCommunities} from '../src/game/communities.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

test('completed halls report their actual residents, excluding plans and stale foreign assignments',()=>{
 const g=new Game();g.reset(42,10);g.enterIsland();
 g.state.units=g.state.units.filter(u=>u.team===0);
 const camp=g.campOf(0),first=g.makeBld('townhall',camp.x,camp.z,0),second=g.makeBld('townhall',camp.x+70,camp.z,0);
 const plan=g.makeBld('townhall',camp.x+35,camp.z,0);plan.build=0;
 g.state.buildings=[first,second,plan];
 const [a,b,c,d,e]=g.state.units;
 a.homeHall=first.id;b.homeHall=first.id;c.homeHall=second.id;d.homeHall=plan.id;e.homeHall=undefined;
 const foreign=g.spawnUnit('worker',camp.x,camp.z+4,1);foreign.homeHall=second.id;
 g.state.communities=[
  {hall:first.id,team:0,name:'River hearth',founded:0,emptySince:null,status:'growing'},
  {hall:second.id,team:0,name:'High hearth',founded:0,emptySince:null,status:'growing'},
 ];
 const before=JSON.stringify(encodeGame(g));
 const report=communityResidency(g,0);
 assert.deepEqual(report.rows.map(row=>[row.id,row.name,row.residents]),[
  [first.id,'River hearth',2],[second.id,'High hearth',1],
 ]);
 assert.equal(report.unassigned,2);
 assert.equal(JSON.stringify(encodeGame(g)),before);
 assert.deepEqual(communityResidency(decodeGame(encodeGame(g)),0),report);
 g.state.communityTimer=0;
 tickCommunities(g,1);
 assert.equal(g.state.communities.some(row=>row.hall===plan.id),false);
 assert.notEqual(e.homeHall,plan.id);
});
