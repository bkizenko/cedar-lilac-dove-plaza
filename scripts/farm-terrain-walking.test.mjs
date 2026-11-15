// Farms, terrain and walking: trimmed placement, fertility gradient, crop stages, steep-slope routing and pace, raised-building footings.
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {testAction} from '../src/game/testing.ts';
import {planFieldArea,placeFieldArea} from '../src/game/fieldArea.ts';
import {fertilityGreenness} from '../src/game/fertilityPreview.ts';
import {riparianSoilBonus,RIPARIAN_SOIL_RULES} from '../src/game/ecology.ts';
import {fieldStage} from '../src/game/fieldLook.ts';
import {SIM_CALENDAR_RULES} from '../src/game/calendarPacing.ts';
import {findPath} from '../src/game/navigation.ts';
import {WALK_SLOPE_COST,walkSlopeClass,climbPace,climbFatigueRate} from '../src/game/slopeTiers.ts';
import {foundationLevel,foundationBoxes} from '../src/game/siteFoundation.ts';
import {insideField,fieldClearingTest} from '../src/game/fieldClearing.ts';

const lab=(seed=0)=>{const g=new Game();g.reset(seed,undefined,{size:1040,layout:'continents'});g.state.conflict='quiet';g.enterIsland();g.testMode=true;testAction(g,'cultivation');testAction(g,'supplies');g.tribe(0).seeds=2000;for(let x=-500;x<=500;x+=10)for(let z=-500;z<=500;z+=10)g.exploreAt?.(x,z,12);return g;};

test('trim: a blocked tile is split and its clear pieces stay valid; blocked pieces keep their own reason',()=>{
 const g=lab(),home=g.campOf(0);let found=null;
 for(let r=20;r<200&&!found;r+=10)for(let k=0;k<24&&!found;k++){
  const a={x:home.x+Math.cos(k/24*6.283)*r,z:home.z+Math.sin(k/24*6.283)*r},b={x:a.x+24,z:a.z+24},plan=planFieldArea(g,a,b);
  if(plan.trimmed>0&&plan.valid>0)found={a,b,plan};
 }
 if(!found)return; // no partly blocked ground on this seed: nothing to trim
 const {plan}=found;assert.ok(plan.tiles.length>1&&plan.tiles.every(t=>t.trimmed));
 assert.ok(plan.tiles.some(t=>!t.issue)&&plan.valid===plan.tiles.filter(t=>!t.issue).length);
 for(const t of plan.tiles)assert.ok(t.issue===null||typeof t.issue==='string');
 const placed=placeFieldArea(g,plan);assert.ok(placed.length>0&&placed.length<=plan.valid);
});

test('fertility: tiles carry a 0..1 greenness, and ground beside a river is richer than far from it',()=>{
 const g=lab(),home=g.campOf(0),plan=planFieldArea(g,{x:home.x+10,z:home.z+10},{x:home.x+50,z:home.z+50});
 for(const t of plan.tiles)assert.ok(t.fertility===null||(t.fertility>=0&&t.fertility<=1));
 assert.ok(fertilityGreenness(1,1.2)>fertilityGreenness(.2,1.2));
 const R=RIPARIAN_SOIL_RULES;assert.equal(riparianSoilBonus(0),R.maximumBonus);assert.ok(riparianSoilBonus(30)<riparianSoilBonus(5));assert.equal(riparianSoilBonus(R.reachMetres+1),0);assert.equal(riparianSoilBonus(Infinity),0);
});

test('stumps inside a field are cleared ground (not drawn); stumps outside are not',()=>{
 const f={x:0,z:0,w:8.2,d:8.2};assert.ok(insideField(f,2,2));assert.ok(!insideField(f,9,0));
 const test=fieldClearingTest({state:{buildings:[{type:'farm',hp:10,x:0,z:0,w:8.2,d:8.2},{type:'hut',hp:10,x:50,z:0,w:5,d:5},{type:'farm',hp:10,plannedCost:{},x:90,z:0,w:8.2,d:8.2}]}});
 assert.ok(test(1,1));assert.ok(!test(50,0));assert.ok(!test(90,0),'a merely planned field has not been cleared yet');
});

test('crop visuals: an autumn field is full when ripe, green when not yet ripe, stubble only after harvest',()=>{
 const Y=SIM_CALENDAR_RULES.yearSeconds,at=(y,p)=>y*Y+(p+.5)*Y/4;
 assert.equal(fieldStage({crop:{year:2,planted:1,tended:1,ripened:true,remaining:90}},at(2,2)),'ripe');
 assert.equal(fieldStage({crop:{year:2,planted:1,tended:.6,ripened:false,remaining:0}},at(2,2)),'growing','late-sown crop still standing in autumn');
 assert.equal(fieldStage({crop:{year:2,planted:1,tended:1,ripened:true,remaining:0}},at(2,2)),'stubble');
 assert.equal(fieldStage({crop:{year:2,planted:0,tended:0,ripened:false,remaining:0}},at(2,2)),'bare');
 assert.equal(fieldStage({crop:{year:2,planted:.5,tended:0,ripened:false,remaining:0}},at(2,0)),'sprouting');
});

test('walking: slope cost classes follow the building tiers and the steepest is heavily penalised, not free',()=>{
 assert.deepEqual([2,10,20,30,40].map(walkSlopeClass),[1,1,2,3,4]);
 for(let i=2;i<WALK_SLOPE_COST.length;i++)assert.ok(WALK_SLOPE_COST[i]>=WALK_SLOPE_COST[i-1]);assert.ok(WALK_SLOPE_COST[4]>=8);
});

test('routing: with slope costs A* walks around a steep ridge instead of over it; without them it goes straight',()=>{
 const W=21,grid=new Uint8Array(W*W).fill(1),slope=new Uint8Array(W*W).fill(1);
 for(let z=3;z<=17;z++)slope[z*W+10]=4; // a steep ridge, open ends at z<3 and z>17
 const start=10*W+2,goal=10*W+18,through=findPath(grid,W,start,goal),around=findPath(grid,W,start,goal,undefined,slope);
 assert.ok(through.some(c=>c%W===10&&Math.floor(c/W)===10),'uniform cost crosses the ridge');
 assert.ok(!around.some(c=>c%W===10&&Math.floor(c/W)>=3&&Math.floor(c/W)<=17),'slope-weighted route goes round the ridge');
 const cheap=new Uint8Array(W*W).fill(1);assert.deepEqual(findPath(grid,W,start,goal,undefined,cheap),through,'a flat slope grid changes nothing');
});

test('climbing: uphill is slower and tires; level ground is exactly 1 with no fatigue; steep descent is careful',()=>{
 assert.equal(climbPace(0),1);assert.equal(climbFatigueRate(0),0);assert.equal(climbFatigueRate(.1),0);
 assert.ok(climbPace(.2)<1&&climbPace(.5)<climbPace(.2)&&climbPace(1.5)>=.35);
 assert.ok(climbFatigueRate(.6)>climbFatigueRate(.3)&&climbFatigueRate(.3)>0);
 assert.equal(climbPace(-.2),1);assert.ok(climbPace(-1)<1);
});

test('foundations: a building raised on its own legs stands on its highest contact so its legs reach the lower ground',()=>{
 assert.equal(foundationLevel('pad',12,10,undefined,11,0,false),11.03,'cut and fill uses the mean');
 assert.equal(foundationLevel('pad',12,10,undefined,11,0,true),12.03,'a granary on staddle stones is not sunk into the uphill side');
 const slope=(x)=>10+.5*x,plan={polys:[],lifts:[],piers:[{x:-1.5,z:-1.5,r:.2},{x:1.5,z:-1.5,r:.2},{x:1.5,z:1.5,r:.2},{x:-1.5,z:1.5,r:.2}],raised:true,round:false};
 const level=foundationLevel('pad',slope(1.7),slope(-1.7),undefined,10,0,true),boxes=foundationBoxes('pad',{x:0,z:0,w:4,d:4},{height:slope,level,downhill:{x:-1,z:0},plan});
 assert.equal(boxes.length,4);
 for(const b of boxes){const lo=b.y-b.height/2,hi=b.y+b.height/2;assert.ok(lo<=slope(b.x)+1e-6,'every leg reaches the ground');assert.ok(Math.abs(hi-(level-.02))<1e-6,'every leg meets the floor');}
});

import {assessSite} from '../src/game/slopeTiers.ts';
import {fieldTopographyIssue} from '../src/game/plotTopography.ts';
const ground=(h)=>({height:h,waterAt:()=>-50});
test('placement: a field on moderate hills and uneven ground is accepted; a cliff face is rejected',()=>{
 const tilt=deg=>{const g=Math.tan(deg*Math.PI/180);return (x)=>10+g*x;};
 for(const deg of [3,10,20,30]){
  assert.equal(fieldTopographyIssue(ground(tilt(deg)),{x:0,z:0,w:16.4,d:16.4}),null,`${deg} deg topography`);
  const a=assessSite(tilt(deg),'farm',0,0,16.4,16.4);assert.ok(a.ok,`${deg} deg graded: ${a.issue}`);
 }
 const bumpy=(x,z)=>10+1.2*Math.sin(x*.9)*Math.cos(z*.7);
 assert.equal(fieldTopographyIssue(ground(bumpy),{x:0,z:0,w:16.4,d:16.4}),null,'uneven ground');
 const cliff=(x)=>x<0?10:10+14*Math.min(1,x/1.5);
 assert.ok(fieldTopographyIssue(ground(cliff),{x:0,z:0,w:8.2,d:8.2}),'cliff face (topography)');
 const ca=assessSite(cliff,'farm',0,0,8.2,8.2);assert.ok(!ca.ok,'cliff face (graded)');
 // a little standing water at the edge does not refuse the field; a lake does
 const edgeWet=(x)=>x<-8?9:10, wet={height:edgeWet,waterAt:()=>9.5};
 assert.equal(fieldTopographyIssue(wet,{x:0,z:0,w:16.4,d:16.4}),null,'a wet sliver is tolerated');
 assert.ok(fieldTopographyIssue({height:()=>9,waterAt:()=>9.5},{x:0,z:0,w:8.2,d:8.2}),'open water is refused');
});
