import {Game} from '../../src/game/sim.ts';
import {mulberry32} from '../../src/game/rng.ts';
import {calendar,foodDemand,reserveSeconds} from '../../src/game/settlement.ts';
import {foodSpoilage} from '../../src/game/pantry.ts';
import {encodeGame,decodeGame} from '../../src/game/persistence.ts';
import {workAllocationDiagnostics} from '../../src/game/workAllocation.ts';

/** Only player-facing placement and village-focus commands; no resource grants,
 * teleporting, terrain edits, visibility edits, weather changes or unit repairs. */
export function firstWinter(seed,onSnapshot=()=>{},options={}){
 const random=Math.random;Math.random=mulberry32(seed^0x71bca9);
 try{
  const g=new Game();g.reset(seed,10,{size:1040,layout:'continents'});g.enterIsland();
  g.state.difficulty='normal';
  const starting=g.state.units.filter(u=>u.team===0).map(u=>u.id),initialFood=g.tribe(0).food;
  const actions=[],snapshots=[],incidents=[],observedFoes=new Set(),deadFounders=new Set();let next=0,iterations=0,foodEmptySeconds=0,consumed=0,spoiled=0,produced=0,otherOutflow=0;
  let lastFood=initialFood,lastTime=0;
  function build(type){const home=g.campOf(0);const spot=g.findPlaceSpot(type,home.x+14,home.z);if(!spot)return false;const accepted=g.placeBuilding(type,spot.x,spot.z);actions.push({at:g.state.time,type,accepted});return accepted;}
  g.setLaborPriority('food');build('townhall');
  // Initial provisions fund only one development project. Wood focus obtains the
  // missing two logs for a store; then routine food labor remains autonomous.
  g.setLaborPriority('wood');let storeOrdered=false,foodFocus=false,hutOrdered=false,guardsReady=false,workshopOrdered=false,weaponsQueued=false;
  while(g.state.time<1800&&iterations++<30000&&!g.state.ended){
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
    if(workshop&&!weaponsQueued){for(let i=0;i<6;i++){const accepted=g.craftWeapon('spear',workshop.id);actions.push({at:g.state.time,type:'craft:spear',accepted});}weaponsQueued=true;}
   }
   // Dismiss milestone/dialog pauses just as a player presses Continue.
   if(g.state.paused)g.state.paused=false;
   const demand=foodDemand(g),loss=foodSpoilage(g);
   g.step(.25);const dt=g.state.time-lastTime;
   consumed+=demand*dt;spoiled+=loss*dt;
   const net=g.tribe(0).food-lastFood+demand*dt+loss*dt;
   produced+=Math.max(0,net);otherOutflow+=Math.max(0,-net);
   if(g.tribe(0).food<.1)foodEmptySeconds+=dt;
   lastFood=g.tribe(0).food;lastTime=g.state.time;
   const home=g.campOf(0);
   for(const foe of g.state.units)if(foe.hp>0&&g.isFoe(0,foe.team)&&g.visibleAt(foe.x,foe.z)&&Math.hypot(foe.x-home.x,foe.z-home.z)<45&&!observedFoes.has(foe.id)){observedFoes.add(foe.id);incidents.push({at:g.state.time,event:'visible-approach',id:foe.id,team:foe.team,type:foe.type,hp:foe.hp});}
   for(const id of starting){const u=g.state.units.find(u=>u.id===id);if((!u||u.hp<=0)&&!deadFounders.has(id)){deadFounders.add(id);incidents.push({at:g.state.time,event:'founder-death',id,order:u?.order,workReason:u?.workReason,nearbyHostiles:g.state.units.filter(e=>e.hp>0&&g.isFoe(0,e.team)&&u&&Math.hypot(e.x-u.x,e.z-u.z)<25).map(e=>({id:e.id,team:e.team,type:e.type,target:e.target?.id}))});}}

   if(g.state.time>=next){
    const residents=g.state.units.filter(u=>u.team===0&&u.hp>0);
    const snapshot={seconds:Math.round(g.state.time),season:calendar(g).name,food:Math.round(g.tribe(0).food),reserveSeconds:Math.round(reserveSeconds(g)),wood:Math.round(g.tribe(0).wood),population:residents.length,originalSurvivors:residents.filter(u=>starting.includes(u.id)).length,orders:Object.fromEntries([...new Set(residents.map(u=>u.order))].map(order=>[order,residents.filter(u=>u.order===order).length])),reasons:residents.map(u=>({id:u.id,order:u.order,reason:u.workReason,carry:u.carry,hp:Math.round(u.hp)})),buildings:g.state.buildings.filter(b=>b.team===0&&b.hp>0).map(b=>({type:b.type,build:b.build}))};
    snapshots.push(snapshot);onSnapshot(snapshot);next+=450;
   }
  }
  const loaded=decodeGame(encodeGame(g));
  return {seed,defended:!!options.defended,incidents,seconds:g.state.time,initialFood,food:g.tribe(0).food,foodEmptySeconds,estimatedFoodDelivered:produced,estimatedFoodConsumed:consumed,estimatedFoodSpoiled:spoiled,estimatedOtherFoodOutflow:otherOutflow,originalResidents:starting.length,originalSurvivors:g.state.units.filter(u=>u.hp>0&&starting.includes(u.id)).length,ended:g.state.ended,simulationErrors:g.simulationErrors,saveRoundtrip:loaded.popNow(0)===g.popNow(0),actions,snapshots,jobs:workAllocationDiagnostics(g)};
 }finally{Math.random=random;}
}
if(process.argv[1]?.endsWith('first-winter.mjs')){
 const seeds=process.argv.slice(2).filter(arg=>!arg.startsWith('--')).map(Number);
 for(const seed of seeds.length?seeds:[42,123456]){
  const result=firstWinter(seed,s=>console.log(JSON.stringify({seed,...s})),{defended:process.argv.includes('--defended')});
  console.log(JSON.stringify({result}));
  if(result.seconds<1800||result.originalSurvivors!==result.originalResidents||result.foodEmptySeconds>0||result.food<=0||!result.saveRoundtrip||result.simulationErrors.length)process.exitCode=1;
 }
}
