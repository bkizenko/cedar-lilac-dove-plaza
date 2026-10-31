import {Game} from '../../src/game/sim.ts';
import {mulberry32} from '../../src/game/rng.ts';
import {calendar,foodDemand,reserveSeconds,isDependent} from '../../src/game/settlement.ts';
import {foodSpoilage} from '../../src/game/pantry.ts';
import {encodeGame,decodeGame} from '../../src/game/persistence.ts';
import {hasTaskCommitment} from '../../src/game/workCommitments.ts';
import {answerEncounter} from '../../src/game/encounters.ts';
import {survivalStatus} from '../../src/game/survivalNeeds.ts';
import {workAllocationDiagnostics} from '../../src/game/workAllocation.ts';

/** Player-facing placement, delegation, village focus and encounter commands; no resource grants,
 * teleporting, terrain edits, visibility edits, weather changes or unit repairs. */
export function firstWinter(seed,onSnapshot=()=>{},options={}){
 const random=Math.random;Math.random=mulberry32(seed^0x71bca9);
 try{
  const worldgenVersion=options.worldgenVersion??10,request=options.request??{size:1040,layout:'continents'};
  const g=new Game();g.reset(seed,worldgenVersion,request);g.enterIsland();
  g.state.difficulty='normal';
  const starting=g.state.units.filter(u=>u.team===0).map(u=>u.id),initialFood=g.tribe(0).food;
  const actions=[],snapshots=[],incidents=[],observedFoes=new Set(),deadFounders=new Set();let next=0,iterations=0,foodEmptySeconds=0,consumed=0,spoiled=0,produced=0,otherOutflow=0;
  let lastFood=initialFood,lastTime=0,maximumThirstObservedSeconds=0,maximumColdObservedSeconds=0;
  const waterActors=()=>g.state.units.filter(u=>u.team===0&&u.waterWork).map(u=>{const route=g.paths?.get(u.id);return{id:u.id,x:u.x,y:u.y,z:u.z,tx:u.tx,tz:u.tz,hp:u.hp,order:u.order,workReason:u.workReason,stuckT:u.stuckT,waterWork:structuredClone(u.waterWork),walkable:g.walkable(u.x,u.z),targetWalkable:g.walkable(u.waterWork.bankX,u.waterWork.bankZ),route:route?{failed:route.failed,retry:route.retry,revision:route.revision,pointCount:route.points.length,next:route.points.slice(0,3)}:null};});
  const nextBuildAttempt=new Map();
  function build(type){
   const home=g.campOf(0);
   if(worldgenVersion>=12&&g.state.time<(nextBuildAttempt.get(type)??0))return false;
   if(worldgenVersion>=12)nextBuildAttempt.set(type,g.state.time+10);
   let spot=g.findPlaceSpot(type,home.x+14,home.z);
   // A player chooses another visible parcel when the first small frontage is
   // occupied. Do not repeatedly insist on the same 10 m search circle.
   if(!spot&&worldgenVersion>=12)search:for(const radius of [18,28,40,56,68])for(let i=0;i<20;i++){
    const a=i*Math.PI/10,x=Math.round((home.x+Math.cos(a)*radius)/2)*2,z=Math.round((home.z+Math.sin(a)*radius)/2)*2;
    if(!g.exploredAt(x,z)||!g.placementValid(type,x,z,0))continue;spot={x,z};break search;
   }
   if(!spot){if(worldgenVersion>=12)actions.push({at:g.state.time,type,accepted:false,reason:'No known valid parcel found'});return false;}
   const accepted=g.placeBuilding(type,spot.x,spot.z);actions.push({at:g.state.time,type,accepted,...(worldgenVersion>=12?{x:spot.x,z:spot.z}:{})});return accepted;
  }
  if(worldgenVersion>=12){g.setAutoWork(true);actions.push({at:g.state.time,type:'setAutoWork',enabled:true,reason:'Explicit player choice to delegate ordinary work'});}
  g.setLaborPriority('food');build('townhall');
  // Initial provisions fund only one development project. Wood focus obtains the
  // missing two logs for a store; then routine food labor remains autonomous.
  g.setLaborPriority('wood');let storeOrdered=false,foodFocus=false,hutOrdered=false,guardsReady=false,workshopOrdered=false,weaponRequests=0,nextWeaponAttempt=0;
  while(g.state.time<(options.stopAfterSeconds??1800)&&iterations++<30000&&!g.state.ended){
   if(!storeOrdered&&g.tribe(0).wood>=60){storeOrdered=build('warehouse');if(storeOrdered){g.setLaborPriority('food');foodFocus=true;}}
   if(!foodFocus&&g.state.time>=90){g.setLaborPriority('food');foodFocus=true;}
   if(!hutOrdered&&g.state.time>600&&reserveSeconds(g)>900&&g.tribe(0).wood>=40)hutOrdered=build('hut');
   if(options.defended&&g.state.time>=300&&reserveSeconds(g)>600){
    if(!workshopOrdered)workshopOrdered=build('workshop');
    if(!guardsReady){
     const home=g.campOf(0),ready=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.maturesAt&&u.carry===0&&Math.hypot(u.x-home.x,u.z-home.z)<20).slice(0,2);
     if(ready.length===2){g.clearSelect();for(const u of ready)u.selected=true;const armed=g.callToArms();actions.push({at:g.state.time,type:'callToArms',armed});g.clearSelect();guardsReady=armed===2;}
    }
    const workshop=g.state.buildings.find(b=>b.team===0&&b.type==='workshop'&&g.finished(b));
    const craftReady=workshop&&g.state.units.some(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&u.carry===0&&!hasTaskCommitment(u)&&!u.emergency&&!u.recalled&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.foundingJourney&&!u.tributeJourney&&u.drill==null&&['idle','gather','hold'].includes(u.order)&&g.interactionSpot(u,workshop));
    if(craftReady&&weaponRequests<6&&g.state.time>=nextWeaponAttempt&&!g.state.units.some(u=>u.team===0&&u.weaponWork)){
     const accepted=g.craftWeapon('spear',workshop.id);actions.push({at:g.state.time,type:'craft:spear',accepted});if(accepted)weaponRequests++;nextWeaponAttempt=g.state.time+30;
    }
   }
   // Dismiss milestone/dialog pauses just as a player presses Continue.
   if(worldgenVersion>=12&&g.state.encounter){actions.push({at:g.state.time,type:'answerEncounter',reaction:'greet',team:g.state.encounter.team});answerEncounter(g,'greet');}
   if(g.state.paused)g.state.paused=false;
   const previousResidents=new Map(g.state.units.filter(u=>starting.includes(u.id)).map(u=>[u.id,u]));
   const demand=foodDemand(g),loss=foodSpoilage(g);
   g.step(.25);const dt=g.state.time-lastTime;
   for(const u of g.state.units)if(u.team===0&&u.hp>0){maximumThirstObservedSeconds=Math.max(maximumThirstObservedSeconds,u.thirstSeconds??0);maximumColdObservedSeconds=Math.max(maximumColdObservedSeconds,u.coldSeconds??0);}
   consumed+=demand*dt;spoiled+=loss*dt;
   const net=g.tribe(0).food-lastFood+demand*dt+loss*dt;
   produced+=Math.max(0,net);otherOutflow+=Math.max(0,-net);
   if(g.tribe(0).food<.1)foodEmptySeconds+=dt;
   lastFood=g.tribe(0).food;lastTime=g.state.time;
   const home=g.campOf(0);
   for(const foe of g.state.units)if(foe.hp>0&&g.isFoe(0,foe.team)&&g.visibleAt(foe.x,foe.z)&&Math.hypot(foe.x-home.x,foe.z-home.z)<45&&!observedFoes.has(foe.id)){observedFoes.add(foe.id);incidents.push({at:g.state.time,event:'visible-approach',id:foe.id,team:foe.team,type:foe.type,hp:foe.hp});}
   for(const id of starting){const u=g.state.units.find(u=>u.id===id)||previousResidents.get(id);if((!u||u.hp<=0)&&!deadFounders.has(id)){deadFounders.add(id);incidents.push({at:g.state.time,event:'founder-death',id,order:u?.order,workReason:u?.workReason,nearbyHostiles:g.state.units.filter(e=>e.hp>0&&g.isFoe(0,e.team)&&u&&Math.hypot(e.x-u.x,e.z-u.z)<25).map(e=>({id:e.id,team:e.team,type:e.type,target:e.target?.id}))});}}

   if(g.state.time>=next){
    const residents=g.state.units.filter(u=>u.team===0&&u.hp>0);
    const snapshot={seconds:Math.round(g.state.time),season:calendar(g).name,food:Math.round(g.tribe(0).food),reserveSeconds:Math.round(reserveSeconds(g)),wood:Math.round(g.tribe(0).wood),population:residents.length,originalSurvivors:residents.filter(u=>starting.includes(u.id)).length,orders:Object.fromEntries([...new Set(residents.map(u=>u.order))].map(order=>[order,residents.filter(u=>u.order===order).length])),reasons:residents.map(u=>({id:u.id,order:u.order,reason:u.workReason,carry:u.carry,hp:Math.round(u.hp)})),...(worldgenVersion>=12?{waterActors:waterActors(),water:survivalStatus(g).water,waterReserveSeconds:survivalStatus(g).waterSeconds,waterDelivered:g.tribe(0).survival?.waterDeliveredLiters,fuelBurned:g.tribe(0).survival?.fuelBurnedWood,waterWarnings:survivalStatus(g).warnings}:{}),buildings:g.state.buildings.filter(b=>b.team===0&&b.hp>0).map(b=>({type:b.type,build:b.build}))};
    snapshots.push(snapshot);onSnapshot(snapshot);next+=450;
   }
  }
  const loaded=decodeGame(encodeGame(g));
  const livingAdults=g.state.units.filter(u=>u.team===0&&u.hp>0&&!isDependent(g,u)).length;
  const originalSurvivors=g.state.units.filter(u=>u.hp>0&&starting.includes(u.id)).length;
  const needs=survivalStatus(g),residents=g.state.units.filter(u=>u.team===0&&u.hp>0);
  const needsGate=worldgenVersion<12||needs.waterSeconds>=180&&needs.metrics?.waterDeliveredLiters>0&&needs.metrics?.fuelBurnedWood>0&&maximumThirstObservedSeconds<180;
  const survivalGate=needsGate&&g.state.time>=1800&&g.tribe(0).alive&&livingAdults>=2&&reserveSeconds(g)>=180&&!g.state.ended&&!g.simulationErrors.length&&loaded.popNow(0)===g.popNow(0);
  return {survivalGate,needsGate,worldgenVersion,worldOptions:g.world.options,conflict:g.state.conflict??'default',...(worldgenVersion>=12?{waterActors:waterActors(),water:structuredClone(needs.metrics),waterReserveSeconds:needs.waterSeconds,maximumThirstSeconds:maximumThirstObservedSeconds,maximumColdExposureSeconds:maximumColdObservedSeconds,completedShelters:g.state.buildings.filter(b=>b.team===0&&['hut','townhall','keep'].includes(b.type)&&g.finished(b)).length,biomeRegions:g.world.ecology?.metrics.regions.map(r=>({kind:r.kind,area:r.largestConnectedAreaSquareMeters}))}:{}),zeroFounderLoss:originalSurvivors===starting.length,livingAdults,foodReserveSeconds:reserveSeconds(g),societyAlive:g.tribe(0).alive,seed,defended:!!options.defended,incidents,seconds:g.state.time,initialFood,food:g.tribe(0).food,foodEmptySeconds,estimatedFoodDelivered:produced,estimatedFoodConsumed:consumed,estimatedFoodSpoiled:spoiled,estimatedOtherFoodOutflow:otherOutflow,originalResidents:starting.length,originalSurvivors:g.state.units.filter(u=>u.hp>0&&starting.includes(u.id)).length,ended:g.state.ended,simulationErrors:g.simulationErrors,saveRoundtrip:loaded.popNow(0)===g.popNow(0),actions,snapshots,jobs:workAllocationDiagnostics(g)};
 }finally{Math.random=random;}
}
if(process.argv[1]?.endsWith('first-winter.mjs')){
 const args=process.argv.slice(2),seeds=args.filter(arg=>/^-?\d+$/.test(arg)).map(Number);
 const option=(name)=>args.find(a=>a.startsWith(`--${name}=`))?.split('=')[1];
 const worldgenVersion=option('worldgen')===undefined?10:Number(option('worldgen'));
 const request={size:option('size')===undefined?1040:Number(option('size')),layout:option('layout')??'continents'};
 for(const seed of seeds.length?seeds:[42,123456]){
  const result=firstWinter(seed,s=>console.log(JSON.stringify({seed,...s})),{defended:process.argv.includes('--defended'),worldgenVersion,request});
  console.log(JSON.stringify({result}));
  if(!result.survivalGate||(process.argv.includes('--strict-founders')&&!result.zeroFounderLoss))process.exitCode=1;
 }
}
