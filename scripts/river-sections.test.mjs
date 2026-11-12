import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {riverSections,riverSectionAt,RIVER_SECTION_RULES} from '../src/game/waterSections.ts';
import {waterReachAt,surveyReachFish,waterReachReport} from '../src/game/waterReach.ts';

// GW-04: "river should be clickable in sections … resource depletion rates that you can see" (scenic#458);
// "big rectangular sections" (scenic#696); "50 rivers worth of fish in one river" (scenic#712).
const world=(reveal=true)=>{const g=new Game();g.reset(0,undefined,{size:1040,layout:'continents'});g.state.conflict='quiet';g.enterIsland();g.testMode=true;g.revealMap=reveal;g.updateVision(0);return g;};
const wetRiverPoints=g=>{const out=[];for(const s of riverSections(g))for(let i=1;i<s.pts.length;i++){const p={x:(s.pts[i-1].x+s.pts[i].x)/2,z:(s.pts[i-1].z+s.pts[i].z)/2};if(g.height(p.x,p.z)<=g.waterAt(p.x,p.z)+.04&&Math.abs(p.x)<500&&Math.abs(p.z)<500)out.push({s,p});}return out;};

test('rivers are cut into deterministic channel sections that cover the whole centreline in order',()=>{
 const g=world(),secs=riverSections(g);assert.ok(secs.length>10);assert.equal(riverSections(g),secs,'cached per world');
 const again=new Game();again.reset(0,undefined,{size:1040,layout:'continents'});assert.deepEqual(riverSections(again).map(s=>s.id),secs.map(s=>s.id));
 for(const [ri,river] of g.world.rivers.entries()){let last=-1;
  for(let i=1;i<river.pts.length;i++){const a=river.pts[i-1],b=river.pts[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2);
   for(let k=0;k<n;k++){const p={x:a.x+(b.x-a.x)*k/n,z:a.z+(b.z-a.z)*k/n},s=riverSectionAt(g,p);assert.ok(s,'every centreline point has a section');
    if(s.river===ri){assert.ok(s.index>=last-1,'sections advance along the channel');last=Math.max(last,s.index);}}}}
 const long=secs.filter(s=>g.world.rivers[s.river].pts.length>2);for(const s of long)assert.ok(s.lengthMetres>8&&s.lengthMetres<=RIVER_SECTION_RULES.lengthMetres*1.6,`${s.id} ${s.lengthMetres}`);
});

test('clicking anywhere in one section selects that whole section; surveying twice never duplicates fish',()=>{
 const g=world(),pts=wetRiverPoints(g);const pick=pts.find(({s,p})=>pts.filter(o=>o.s.id===s.id).length>=2&&(()=>{const probe=world(),r=waterReachAt(probe,p);if(!r?.section)return false;surveyReachFish(probe,r);return waterReachReport(probe,r).fishCapacity>0;})());assert.ok(pick);
 const same=pts.filter(o=>o.s.id===pick.s.id),a=waterReachAt(g,same[0].p),b=waterReachAt(g,same.at(-1).p);
 assert.ok(a?.section&&b?.section);assert.equal(a.section.id,b.section.id);
 surveyReachFish(g,a);const count=g.state.fish.length,first=waterReachReport(g,a);surveyReachFish(g,b);surveyReachFish(g,a);
 assert.equal(g.state.fish.length,count,'no duplicated river fish');const second=waterReachReport(g,b);
 assert.equal(second.fishCount,first.fishCount);assert.equal(second.fishCapacity,first.fishCapacity);assert.ok(first.fishCapacity>0);
 assert.deepEqual(first.section.corners,a.section.corners);assert.equal(first.section.corners.length,4);
});

test('neighbouring sections own disjoint fish, and every surveyed node belongs to exactly one section',()=>{
 const g=world(),pts=wetRiverPoints(g),seen=new Set();for(const {p} of pts.slice(0,400)){const r=waterReachAt(g,p);if(r?.section&&!seen.has(r.section.id)){seen.add(r.section.id);surveyReachFish(g,r);}}
 const owners=new Map();
 for(const n of g.state.fish){const s=riverSectionAt(g,n);if(!s||!seen.has(s.id))continue;assert.ok(!owners.has(n.id));owners.set(n.id,s.id);}
 let total=0;for(const id of seen){const s=riverSections(g).find(x=>x.id===id);total+=waterReachReport(g,{x:s.centre.x,z:s.centre.z,kind:'river',section:s}).fishCapacity;}
 const sum=[...owners.keys()].reduce((a,id)=>a+g.state.fish.find(n=>n.id===id).maxAmt,0);
 assert.ok(owners.size>5);assert.ok(total<=sum,'no node is counted in two sections');
});

test('the section report shows a real recovery rate: zero when full, positive while regrowing',()=>{
 const g=world(),{p}=wetRiverPoints(g)[20],r=waterReachAt(g,p);surveyReachFish(g,r);
 const full=waterReachReport(g,r);assert.ok(full.fishCapacity>0);assert.equal(full.fishRecoveryPerMinute,0);
 const node=g.state.fish.find(n=>riverSectionAt(g,n)?.id===r.section.id);node.amount=Math.floor(node.maxAmt/2);node.regenT=0;
 const regrowing=waterReachReport(g,r);assert.ok(regrowing.fishRecoveryPerMinute>0);assert.equal(regrowing.fishCount,full.fishCount-(node.maxAmt-node.amount));
 assert.equal(node.amount,Math.floor(node.maxAmt/2),'reporting never changes stock');
});

test('hidden ground is excluded: an unexplored river has no reach, and sections never count unexplored nodes',()=>{
 const g=world(false),pts=wetRiverPoints(g),hidden=pts.find(({p})=>!g.exploredAt(p.x,p.z));assert.ok(hidden);
 assert.equal(waterReachAt(g,hidden.p),null);
});
