import test from 'node:test';import assert from 'node:assert/strict';
import {newPossession,canPossess,chooseVillager,liveUnit,followOrder,followSent,taskGiven,takeOver,eyeTowardUnit,handBack,isArmed,meleeTarget,heldLabel,crosshairVerb,POSSESSION_RULES as R} from '../src/game/firstPersonActions.ts';
import {insideSolid,canStand,eyeGround,stepBody,nearestStandable} from '../src/game/firstPerson.ts';

const U=(o={})=>({id:1,team:0,hp:10,x:0,z:0,type:'worker',...o});

test('chooseVillager prefers the selected living villager, else the nearest, else null',()=>{
 const us=[U({id:1,x:50}),U({id:2,x:5}),U({id:3,x:1,hp:0}),U({id:4,team:1,x:0}),U({id:5,x:0,prisoner:{}})];
 assert.equal(chooseVillager(us,[1],{x:0,z:0}).id,1);
 assert.equal(chooseVillager(us,[3],{x:0,z:0}).id,2,'dead selection ignored');
 assert.equal(chooseVillager(us,[],{x:0,z:0}).id,2);
 assert.equal(chooseVillager([],[],{x:0,z:0}),null);
 assert.equal(chooseVillager([U({team:2})],[],{x:0,z:0}),null);
 assert.ok(!canPossess(undefined)&&!canPossess(null));
});

test('liveUnit drops possession on death, capture or removal',()=>{
 const p={...newPossession(),unitId:1};
 assert.equal(liveUnit(p,[U()]).id,1);
 assert.equal(liveUnit(p,[U({hp:0})]),null);assert.equal(liveUnit(p,[U({prisoner:{}})]),null);assert.equal(liveUnit(p,[]),null);
 assert.equal(liveUnit(newPossession(),[U()]),null);
});

test('follow: villager is sent after the avatar only when far, rate-limited, and never while working',()=>{
 let p={...newPossession(),unitId:1};
 assert.equal(followOrder(p,{x:0,z:0},{x:1,z:0},0),null,'close enough');
 const to=followOrder(p,{x:0,z:0},{x:10,z:0},100);assert.deepEqual(to,{x:10,z:0});
 p=followSent(p,to,100);
 assert.equal(followOrder(p,{x:0,z:0},{x:20,z:0},100.1),null,'rate limited');
 assert.equal(followOrder(p,{x:0,z:0},{x:10.3,z:0},101),null,'target barely moved');
 assert.deepEqual(followOrder(p,{x:0,z:0},{x:20,z:0},101),{x:20,z:0});
 assert.equal(followOrder(taskGiven(p),{x:0,z:0},{x:50,z:0},500),null,'player orders win while working');
});

test('task given then movement takes the body back; standing still does not',()=>{
 let p=taskGiven({...newPossession(),unitId:1});assert.ok(p.working);
 assert.ok(takeOver(p,false).working);assert.ok(!takeOver(p,true).working);
 assert.equal(taskGiven(newPossession()).working,false,'no villager, nothing to work');
 const e=eyeTowardUnit({x:0,z:0},{x:10,z:0},.05);assert.ok(e.x>0&&e.x<10);
 let b={x:0,z:0};for(let i=0;i<120;i++)b=eyeTowardUnit(b,{x:10,z:0},1/60);assert.ok(Math.abs(b.x-10)<.1);
});

test('hand-back: a bare follow-move is stopped; a real task or no unit is left alone',()=>{
 const following={...newPossession(),unitId:1,following:true};
 assert.equal(handBack(following,U({order:'move'})),'stop');
 assert.equal(handBack(following,U({order:'idle'})),'none');
 assert.equal(handBack(taskGiven(following),U({order:'move'})),'none');
 assert.equal(handBack(following,null),'none');
 assert.equal(handBack(newPossession(),U({order:'move'})),'none');
});

test('melee: only armed adults swing, at the nearest hostile in front within reach',()=>{
 assert.ok(isArmed(U({militia:true}))&&isArmed(U({type:'soldier'}))&&!isArmed(U())&&!isArmed(U({type:'leader'})));
 const body={x:0,z:0,yaw:0};// faces -Z
 const foes=[{id:1,hp:5,x:0,z:-2},{id:2,hp:5,x:0,z:-1.5},{id:3,hp:5,x:0,z:2},{id:4,hp:0,x:0,z:-1},{id:5,hp:5,x:0,z:-30},{id:6,hp:5,x:2.5,z:-.2}];
 assert.equal(meleeTarget(body,foes).id,2);
 assert.equal(meleeTarget(body,[foes[2]]),null,'behind');assert.equal(meleeTarget(body,[foes[4]]),null,'too far');
 assert.equal(meleeTarget(body,[foes[5]]),null,'out of the arc');
 assert.equal(meleeTarget({x:0,z:0,yaw:Math.PI},[foes[2]]).id,3,'turned around');
 assert.equal(meleeTarget(body,[]),null);
});

test('held label and crosshair verbs',()=>{
 assert.equal(heldLabel(null),'');
 assert.equal(heldLabel(U({carry:3.2,carryType:'wood'})),'Carrying 3 wood');
 assert.equal(heldLabel(U({farmTool:'woodenArd'})),'Holding wooden ard');
 assert.equal(heldLabel(U()),'Hands empty');assert.equal(heldLabel(U({militia:true})),'Armed (militia)');
 assert.equal(crosshairVerb({kind:'building',site:true},false),'Build');
 assert.equal(crosshairVerb({kind:'building',workplace:true},false),'Work here');
 assert.equal(crosshairVerb({kind:'resource'},false),'Gather');assert.equal(crosshairVerb({kind:'animal'},false),'Hunt');
 assert.equal(crosshairVerb({kind:'unit',hostile:true},true),'Attack');assert.equal(crosshairVerb({kind:'unit',hostile:true},false),'Hostile');
 assert.equal(crosshairVerb({kind:'unit',stranger:true},false),'Meet (walk up to talk)');assert.equal(crosshairVerb({kind:'none'},false),'');
 assert.ok(R.meleeReach>0);
});

test('trunks and boulders are solid, so the lens never ends up inside one',()=>{
 const w={height:()=>0,water:()=>-9,solids:[],circles:[{x:0,z:-5,r:.45}],half:500};
 assert.ok(insideSolid(0,-5,[],.45,w.circles)&&!insideSolid(0,-8,[],.45,w.circles));
 let b={x:0,z:0,y:0,yaw:0,pitch:0,bob:0,travelled:0};for(let i=0;i<600;i++)b=stepBody(b,{forward:1,strafe:0,turn:0,run:true},1/60,w);
 assert.ok(Math.hypot(b.x,b.z+5)>=.45+.45-.05,'stopped at the trunk');
 assert.equal(canStand(w,0,-3,0,-5),false);
 assert.equal(nearestStandable(w,0,-5)!==null&&Math.hypot(nearestStandable(w,0,-5).x,nearestStandable(w,0,-5).z+5)>=.9,true);
});

test('eye ground is the highest nearby facet so the lens never dips under terrain',()=>{
 const step={height:x=>x>0?2:0};
 assert.equal(eyeGround(step,-.1,0),2,'a facet half a body ahead lifts the eye');
 assert.equal(eyeGround({height:()=>3},0,0),3);
});
