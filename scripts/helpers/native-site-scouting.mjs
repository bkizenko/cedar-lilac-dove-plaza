import assert from 'node:assert/strict';
import {plotSurveyPoints} from '../../src/game/plotTopography.ts';
/** Fixture-only survey: would this site pass placement once a resident has
 * actually seen it? Fog is restored byte-for-byte before returning, so this is
 * not a vision grant; actual placement still requires real exploration. */
export function admissibleOnceExplored(g,type,x,z,footprint){
 const before=g.vision.slice();
 try{for(const p of plotSurveyPoints({x,z,w:footprint?.w??6,d:footprint?.d??6}))g.stampVision(p.x,p.z,1,1);g.stampVision(x,z,1,1);return g.placementIssue(type,x,z);}
 finally{g.vision.set(before);assert.deepEqual(g.vision,before,'survey left fog unchanged');}
}
/** Real scouting: an actual resident walks to the site through ordinary
 * Game.step until every plot survey point is explored. No teleport, no reveal. */
export function scoutSite(g,scout,site,{maxSeconds=900,step=.2}={}){
 const points=plotSurveyPoints({x:site.x,z:site.z,w:site.w??6,d:site.d??6}),seen=()=>points.every(p=>g.exploredAt(p.x,p.z));
 g.clearSelect();g.selectEntity(scout);g.issueMove(site.x,site.z);const start={x:scout.x,z:scout.z};let walked=0;
 for(let t=0;t<maxSeconds&&!seen();t+=step){const p={x:scout.x,z:scout.z};g.step(step);const moved=Math.hypot(scout.x-p.x,scout.z-p.z);assert.ok(moved<1.8,`scout jumped ${moved}`);walked+=moved;assert.ok(scout.hp>0,'scout survives');}
 assert.ok(seen(),`scout ${scout.id} did not see the whole site within ${maxSeconds}s (at ${scout.x.toFixed(1)},${scout.z.toFixed(1)})`);
 g.clearSelect();return{seconds:g.state.time,walkedMetres:walked,netMetres:Math.hypot(scout.x-start.x,scout.z-start.z)};
}
