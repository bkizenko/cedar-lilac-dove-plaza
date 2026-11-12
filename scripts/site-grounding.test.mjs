import test from 'node:test';import assert from 'node:assert/strict';
import {groundSite,plinthSpec,habitatFromSite,siteHeightAt,wonderSiteIssues,wonderSiteFromSample,GROUNDING_RULES} from '../src/scene/siteGrounding.ts';
import {specBounds,partBounds} from '../src/scene/buildingParts.ts';
import {generateWonderPlan} from '../src/scene/wonderPlans.ts';
// Local stand-in for Grok's sampleSite lattice (same field names, v1): heights from a function over local x,z.
function sample(h,{w=8,d=6,wet=()=>false,shares={meadow:1},biome='meadow'}={}){
 const columns=Math.ceil(w/1.5)+1,rows=Math.ceil(d/1.5)+1,heights=new Float32Array(columns*rows);let min=Infinity,max=-Infinity,sum=0,nw=0,mg=0;
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const x=(i/(columns-1)-.5)*w,z=(j/(rows-1)-.5)*d,v=h(x,z);heights[j*columns+i]=v;min=Math.min(min,v);max=Math.max(max,v);sum+=v;if(wet(x,z))nw++;}
 const gx=(h(.5,0)-h(-.5,0)),gz=(h(0,.5)-h(0,-.5));
 return {version:1,columns,rows,heights,minHeightMetres:min,maxHeightMetres:max,meanHeightMetres:sum/(columns*rows),heightRangeMetres:max-min,maxGrade:Math.hypot(gx,gz),meanGrade:Math.hypot(gx,gz),downhillRadians:Math.atan2(-gx,-gz),wetFraction:nw/(columns*rows),minimumDryClearanceMetres:1,biome,biomeShares:shares,foundationDepthMetres:max-min};
}
test('flat ground needs no plinth, no steps; floor equals ground',()=>{
 const s=sample(()=>5),g=groundSite(s),p=plinthSpec(s,{w:8,d:6},g);assert.equal(g.needsPlinth,false);assert.equal(p.parts.length,0);assert.equal(g.entranceSteps,0);assert.ok(Math.abs(g.floorY-5)<1e-6);assert.equal(g.verdict,'ok');
});
test('slope: floor policy caps the plinth, plinth follows ground and stays inside the footprint',()=>{
 const slope=(x,z)=>10+z*.25,s=sample(slope),g=groundSite(s);
 assert.ok(g.needsPlinth&&g.plinthDepthMetres<=GROUNDING_RULES.maxPlinthMetres+1e-6&&g.floorY>=s.meanHeightMetres&&g.floorY<=s.maxHeightMetres+1e-6);
 const p=plinthSpec(s,{w:8,d:6},g),b=specBounds(p);assert.ok(p.parts.length>0&&b.minX>=-4-1e-6&&b.maxX<=4+1e-6&&b.minZ>=-3-1e-6&&b.maxZ<=3+1e-6,'plinth inside footprint');
 assert.ok(b.maxY<=1e-6,'plinth top is the floor');assert.ok(b.minY>=-g.plinthDepthMetres-1e-6&&b.minY<=-g.plinthDepthMetres+.3,'deepest plinth matches ground');
 // Downhill is -z side of a rising +z slope; local downhill angle points away from +z when yaw is 0.
 assert.ok(Math.cos(g.downhillLocalRadians)<0,'ground falls toward -z');
 // Plinth under a cell is as deep as floor minus ground there.
 for(const q of p.parts.filter(q=>q.mat==='stoneDark')){const u=q.pos[0]/8,v=q.pos[2]/6,gh=siteHeightAt(s,u,v);assert.ok(Math.abs(-q.pos[1]-(g.floorY-gh))<.45,'plinth depth follows ground');}
 const rot=groundSite(s,{yaw:Math.PI/2});assert.ok(Math.abs(rot.downhillLocalRadians-(s.downhillRadians-Math.PI/2))<1e-9);
});
test('entrance steps appear only when the entrance edge sits below the floor, with a comfortable rise',()=>{
 const down=sample((x,z)=>10-z*.3),g=groundSite(down);assert.ok(g.entranceSteps>0,'ground falls toward +z entrance');
 const p=plinthSpec(down,{w:8,d:6},g);assert.ok(p.steps.riseM<=.18+1e-9&&p.steps.treadM>=.3-1e-9&&p.steps.extentBeyondFootprintM>0);
 const up=sample((x,z)=>10+z*.3);assert.equal(groundSite(up).entranceSteps,0,'entrance edge is the high side');
});
test('verdicts: wet, steep, ok; reasons are plain',()=>{
 assert.equal(groundSite(sample(()=>1,{wet:(x)=>x>2})).verdict,'wet');assert.match(groundSite(sample(()=>1,{wet:(x)=>x>2})).reason,/under water/);
 const cliff=sample((x,z)=>z*1.2);assert.equal(groundSite(cliff).verdict,'steep');assert.match(groundSite(cliff).reason,/too steep/);
 assert.equal(groundSite(sample((x,z)=>z*.1)).verdict,'ok');
});
test('habitat from biome shares: dominant mapped habitat wins; unknown kinds fall back',()=>{
 assert.equal(habitatFromSite(sample(()=>0,{shares:{meadow:.2,'mixed-woodland':.3,'conifer-forest':.4}})),'forest','forest kinds add up');
 assert.equal(habitatFromSite(sample(()=>0,{shares:{arid:1}})),'desert');assert.equal(habitatFromSite(sample(()=>0,{shares:{},biome:'wetland'})),'wetland');
 assert.equal(habitatFromSite(sample(()=>0,{shares:{martian:1}})),'plains');assert.equal(habitatFromSite(sample(()=>0,{shares:{},biome:null})),'plains');
});
test('siteHeightAt is bilinear and clamped; wonder site facts derive deterministically',()=>{
 const s=sample((x,z)=>x*.5);assert.ok(Math.abs(siteHeightAt(s,-.5,0)-(-2))<1e-5&&Math.abs(siteHeightAt(s,.5,0)-2)<1e-5&&Math.abs(siteHeightAt(s,0,0))<1e-5);assert.equal(siteHeightAt(s,9,0),siteHeightAt(s,.5,0));
 const east=sample((x)=>-x*.2),west=sample((x)=>x*.2);assert.equal(wonderSiteFromSample(east).flowDir,1);assert.equal(wonderSiteFromSample(west).flowDir,-1);
 const w=wonderSiteFromSample(sample((x,z)=>x*.2+z,{shares:{'warm-coast':.5}}));assert.ok(w.exposed&&w.bankHeightM>=.6&&w.bankHeightM<=1.6&&w.flowSpeedMps<=3);assert.deepEqual(wonderSiteFromSample(east),wonderSiteFromSample(east));
 // The derived site is accepted by the plan generators and changes the plan.
 const a=generateWonderPlan('millMarket',1,1,{w:34,d:28},wonderSiteFromSample(east)),b=generateWonderPlan('millMarket',1,1,{w:34,d:28},wonderSiteFromSample(west));assert.notEqual(Math.sign(a.wheel.x),Math.sign(b.wheel.x));
});
test('wonder site issues: harbour needs water, observatory dry flat ground',()=>{
 const dry=sample(()=>3),wet=sample(()=>0,{wet:()=>true}),stream=sample(()=>0,{wet:(x,z)=>Math.abs(z)<.8}),steep=sample((x,z)=>z*.5);
 assert.ok(wonderSiteIssues('crescentHarbor',dry).length>0);assert.deepEqual(wonderSiteIssues('crescentHarbor',wet),[]);
 assert.deepEqual(wonderSiteIssues('millMarket',stream),[]);assert.ok(wonderSiteIssues('millMarket',wet).length>0);
 assert.deepEqual(wonderSiteIssues('ringObservatory',dry),[]);assert.ok(wonderSiteIssues('ringObservatory',wet).length>0);assert.ok(wonderSiteIssues('ringObservatory',steep).length>0);
});
