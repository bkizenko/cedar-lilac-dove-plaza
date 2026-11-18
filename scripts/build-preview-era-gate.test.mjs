import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {BUILDINGS} from '../src/game/constants.ts';

function world(){
  const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);
  Object.assign(g.state,{weather:'clear',weatherT:1e5,raidT:1e5});
  const t=g.tribe(0);t.wood+=400;t.stone+=400;t.food+=200;
  return g;
}
function siteFor(g,type){for(let z=-460;z<=460;z+=16)for(let x=-460;x<=460;x+=16)if(!g.placementIssue(type,x,z,0))return {x,z};return null;}

test('build preview shows the era gate the click enforces, while the shared site check stays age-agnostic',()=>{
  const g=world();
  assert.ok(BUILDINGS.watermill.age>g.tribe(0).age,'watermill is later than the starting age');
  const s=siteFor(g,'watermill');assert.ok(s,'a geometrically valid watermill site exists');
  assert.equal(g.placementIssue('watermill',s.x,s.z,0),null,'shared site check ignores the age gate');
  const preview=g.playerPlacementIssue('watermill',s.x,s.z,0);
  assert.match(preview??'',/^Requires .* Age$/,'preview refuses the out-of-era building');
  assert.equal(g.placeBuilding('watermill',s.x,s.z,0),false,'click refuses it too');
  g.tribe(0).age=BUILDINGS.watermill.age;
  assert.equal(g.playerPlacementIssue('watermill',s.x,s.z,0),null,'once the age is reached the preview matches the site check');
  // an always-available building is unaffected
  g.tribe(0).age=0;assert.equal(BUILDINGS.hut.age,0);
  for(const [x,z] of [[s.x,s.z],[0,0],[40,-40]])assert.equal(g.playerPlacementIssue('hut',x,z,0),g.placementIssue('hut',x,z,0));
});
