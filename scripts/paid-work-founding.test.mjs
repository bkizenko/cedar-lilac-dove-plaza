import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {decodeGame, encodeGame} from '../src/game/persistence.ts';
import {beginProduction, productionIssue} from '../src/game/production.ts';
import {prepareOwnedHandover} from '../src/game/communityHandover.ts';
import {tickCommunities} from '../src/game/communities.ts';

test('automatic founding leaves an actual paid zero-load cook and its committed inputs intact',()=>{
 const f=nativeDairyVillage(); let g=decodeGame(f.save);
 // Finite opening fish, declared before starting the actual paid job.
 g.tribe(0).foodLots.fish=4; g.tribe(0).food+=4;
 assert.equal(beginProduction(g,'cookFish',f.hearth,f.worker),true,productionIssue(g,'cookFish',f.hearth,f.worker));
 const actor=g.state.units.find(u=>u.id===f.worker);
 assert.equal(actor.carry,0,'legacy founding filter admitted this real paid actor');
 assert.ok(actor.productionProjectId);
 const result=prepareOwnedHandover(g,0,1);assert.equal(result.accepted,true,result.reason);
 g=decodeGame({...encodeGame(g),state:result.state});
 const paid=g.state.units.find(u=>u.id===f.worker), project=g.state.production.projects.find(p=>p.id===paid.productionProjectId);
 const before=JSON.stringify(project); g.state.communityTimer=0;
 tickCommunities(g,.2);
 assert.equal(paid.foundingJourney,undefined);
 assert.equal(JSON.stringify(project),before,'founding cannot overwrite or recharge paid work');
 assert.ok(g.state.units.some(u=>u.team===1&&u.id!==paid.id&&u.foundingJourney),'an eligible peer really founds, proving the filter ran');
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
