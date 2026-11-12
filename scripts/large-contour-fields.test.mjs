import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);return next(specifier,context);}});
const {Engine}=await import('../src/game/engine.ts');
import {Game} from '../src/game/sim.ts';import {BUILDINGS} from '../src/game/constants.ts';
import {maximumPlotAxisMultiple,dragPlot,validPlot,plotArea,fieldCrewSlots,fieldSeedIssue} from '../src/game/plots.ts';
import {buildingCost} from '../src/game/construction.ts';import {planExpansion} from '../src/game/plotExpansion.ts';import {farmHarvestEstimate,farmWork} from '../src/game/settlement.ts';
import {surveyFieldTopography,fieldTopographyIssue} from '../src/game/plotTopography.ts';
import {contourPlantSites,CROP_ART_RULES} from '../src/scene/contourFields.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';import {buildingGeos} from '../src/scene/meshes.ts';import {staffField,fieldWorkStep} from '../src/game/fieldWork.ts';
const base=BUILDINGS.farm,maximum={w:base.w*16,d:base.d*16};
let world;
function fixture(){if(!world){world=new Game();world.reset(345,2);world.enterIsland();world.world.heights.fill(4);world.vision.fill(2);world.world.rivers=[];world.world.biomes=[{kind:'plains',x:0,z:0}];world.rebuildWalk();}const g=world;g.state.time=0;g.state.ended=null;g.state.weather='clear';g.state.units=[];g.state.buildings=[];g.state.trees=[];g.state.stones=[];g.state.forage=[];g.tribe(0).cultivated=['grain'];g.tribe(0).seeds=2000;g.tribe(0).wood=1000;return g;}
test('farm-only dimensions allow one 256-area field; other structures keep their old limits',()=>{
 assert.equal(maximumPlotAxisMultiple('farm'),16);assert.equal(maximumPlotAxisMultiple('warehouse'),3);
 assert.ok(validPlot('farm',maximum));assert.ok(!validPlot('farm',{...maximum,w:maximum.w+.001}));assert.ok(!validPlot('warehouse',{w:BUILDINGS.warehouse.w*4,d:BUILDINGS.warehouse.d}));
 const p=dragPlot('farm',{x:0,z:0},{x:999,z:-999});assert.deepEqual({w:p.w,d:p.d},maximum);assert.equal(plotArea({type:'farm',...p}),256);assert.equal(fieldCrewSlots({type:'farm',...p}),768);
});
test('large fields conserve seeds, area-scaled yield/labor and save dimensions',()=>{
 const g=fixture();assert.equal(buildingCost('farm',g,0,maximum).seeds,1024);assert.ok(g.placeBuilding('farm',0,0,0,maximum));const b=g.state.buildings.at(-1);assert.equal(g.tribe(0).seeds,976);
 const small=g.makeBld('farm',0,0,0);const yieldSmall=farmHarvestEstimate(g,small),yieldLarge=farmHarvestEstimate(g,b);assert.ok(Math.abs(yieldLarge-256*yieldSmall)<256,'only integer estimate rounding may differ');
 const u=g.spawnUnit('worker',0,0,0);farmWork(g,u,small,1);farmWork(g,u,b,1);assert.ok(Math.abs(b.crop.planted*256-small.crop.planted)<1e-10);
 const loaded=decodeGame(encodeGame(g));const restored=loaded.state.buildings.find(x=>x.id===b.id);assert.equal(restored.w,maximum.w);assert.equal(restored.d,maximum.d);assert.equal(loaded.tribe(0).seeds,976);
});
test('keyboard sizing and paid expansion use the same farm-only larger limit',()=>{
 const g=fixture(),e=Object.create(Engine.prototype);Object.assign(e,{game:g,plotWidth:1,plotDepth:1,updateGhost(){},pushHud(){}});g.state.placing='farm';for(let i=0;i<20;i++)e.resizePlot(1);assert.equal(e.plotWidth,16);g.state.placing='warehouse';e.resizePlot(1);assert.equal(e.plotWidth,3);
 const b=g.makeBld('farm',0,0,0);b.w=base.w*3;b.crop={year:0,kind:'grain',planted:.5,tended:.25,remaining:17,ripened:false};g.state.buildings=[b];const before=g.tribe(0).seeds;assert.ok(planExpansion(g,b,'w'));assert.equal(b.w,base.w*4);assert.equal(g.tribe(0).seeds,before-4);assert.equal(b.crop.planted,.375);assert.equal(b.crop.tended,.1875);assert.equal(b.crop.remaining,17);
});
test('full large footprint detects off-centre water/cliffs while retaining a rolling usable slope',()=>{
 const plot={x:0,z:0,...maximum},plane={height:(x,z)=>30+x*.1+z*.06,waterAt:()=>0};const start=performance.now(),s=surveyFieldTopography(plane,plot);console.log(JSON.stringify({largeFieldSurvey:{samples:s.samples,milliseconds:performance.now()-start}}));assert.equal(s.samples,4489);assert.equal(fieldTopographyIssue(plane,plot),null);
 assert.match(fieldTopographyIssue({height:(x,z)=>Math.abs(x-42)<3&&Math.abs(z+38)<3?0:30,waterAt:()=>1},plot),/wet/);
 assert.match(fieldTopographyIssue({height:(x,z)=>30+Math.max(0,3-Math.abs(x-42))*3,waterAt:()=>0},plot),/steep/);
});
test('bounded crop samples cover all four quarters and full extents at different contour angles',()=>{
 for(const kind of ['grain','pulses','tubers'])for(const angle of [0,.37,1.1,Math.PI/2]){const points=contourPlantSites({x:0,z:0,...maximum},angle,kind);assert.ok(points.length>300&&points.length<=CROP_ART_RULES.maximumPlantsPerField);for(const axis of ['x','z']){assert.ok(Math.min(...points.map(p=>p[axis]))<-maximum.w*.42);assert.ok(Math.max(...points.map(p=>p[axis]))>maximum.w*.42);}for(const sx of [-1,1])for(const sz of [-1,1])assert.ok(points.filter(p=>p.x*sx>0&&p.z*sz>0).length>60);}
});
test('one field can employ more than12 actual farmers without creating workers or losing physical row assignments',()=>{
 const g=fixture(),b=g.makeBld('farm',0,0,0);Object.assign(b,maximum);g.state.buildings=[b];for(let i=0;i<30;i++){const u=g.spawnUnit('worker',i*.2,0,0);u.order='idle';}g.workBoard.connected=()=>true;assert.equal(staffField(g,b),30);assert.equal(g.state.units.length,30);
 for(const u of g.state.units)fieldWorkStep(g,u,b,0);assert.equal(g.state.units.filter(u=>u.node===b&&u.order==='gather').length,30);assert.equal(new Set(g.state.units.map(u=>`${u.tx}/${u.tz}`)).size,30);
});
test('seed preview matches the real action; throttled dragging still refreshes the exact final click',()=>{
 const g=fixture();g.state.placing='farm';g.tribe(0).seeds=0;let ground={x:0,z:0},green=null,calls=0;const original=g.placementIssue.bind(g);g.placementIssue=(...a)=>{calls++;return original(...a);};
 const e=Object.create(Engine.prototype);Object.assign(e,{game:g,pointer:{x:0,y:0},plotStart:null,plotPointerStart:null,plotWidth:2,plotDepth:1,ghostPos:{x:0,z:0},view:{groundAt:()=>ground,setLinePreview(){},setGhost(...a){green=a[4];}},pushHud(){}});
 e.updateGhost(true);assert.equal(green,false);assert.equal(g.state.placeIssue,fieldSeedIssue(0,8));assert.equal(g.placeBuilding('farm',0,0,0,e.plotSize),false);
 const before=calls;for(let i=0;i<40;i++)e.updateGhost();assert.equal(calls,before,'no repeated full-area survey within preview interval');
 g.tribe(0).seeds=100;ground={x:20,z:20};e.leftClick(0,0,false);const b=g.state.buildings.at(-1);assert.ok(b);assert.equal(b.x,20);assert.equal(b.z,20);assert.equal(g.tribe(0).seeds,92);assert.equal(green,true);
 g.placementIssue=original;
});

test('scalable field ground has no merged rigid posts that stretch with its footprint',()=>{
 const geos=buildingGeos(),ground=geos.farm.timber;ground.computeBoundingBox();assert.ok(ground.boundingBox.max.y-ground.boundingBox.min.y<1e-6,'only the contour-displaced soil surface scales');assert.ok(Math.abs(ground.boundingBox.min.y-.075)<1e-6);for(const kit of Object.values(geos))for(const key of ['timber','roof','extra'])kit[key]?.dispose();
});
