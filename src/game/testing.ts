import {launchRiverboat} from './boats';
import {isDependent} from './settlement';
import type {Game} from './sim';
import {receiveFood} from './pantry';
export type TestAction='supplies'|'weapons'|'heal'|'cultivation'|'raid'|'finish'|'transport'|'ferry';
/** Explicit testing commands operate only on the disposable test copy. */
export function testAction(g:Game,action:TestAction){
 if(!g.testMode)return false;
 const t=g.tribe(0);
 if(action==='supplies'){receiveFood(g,0,500);t.wood+=500;t.stone+=300;t.copper+=100;t.iron+=100;t.seeds=(t.seeds||0)+100;}
 if(action==='weapons'){t.spears+=20;t.bows+=20;t.blades+=10;}
 if(action==='heal')for(const u of g.state.units.filter(u=>u.team===0)){u.hp=u.maxHp;u.fatigue=0;}
 if(action==='cultivation'){t.cultivated=['grain','pulses','tubers'];t.cropTrial=undefined;t.seeds=(t.seeds||0)+40;}
 if(action==='transport'){
  const adults=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)).slice(0,2);
  adults.forEach((u,i)=>{g.interruptMission(u);u.haulageWork=undefined;u.tamingWork=undefined;u.haulage=i===0?'canoe':'pack';u.order='hold';u.carry=8;u.carryType='wood';u.carryFood=undefined;u.selected=true;});
 }
 if(action==='ferry'){
  g.revealMap=true;g.updateVision(0);
  let dock=g.state.buildings.find(b=>b.team===0&&b.type==='dock'&&g.finished(b));
  if(!dock){const home=g.campOf(0),site=[...g.world.dockSites].sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z)).find(p=>g.placementValid('dock',p.x,p.z,0));
   if(!site){g.banner('No valid dock bank found for this test',4);return false;}
   dock=g.makeBld('dock',site.x,site.z,0);g.state.buildings.push(dock);g.state.walkDirty=true;g.rebuildWalk();
  }
  if(!launchRiverboat(g,dock)){g.banner('This dock has no launch space',4);return false;}
  let dry:{x:number;z:number}|undefined;
  for(let r=2;r<=18&&!dry;r+=2)for(let i=0;i<24;i++){const a=i*Math.PI/12,x=dock.x+Math.cos(a)*r,z=dock.z+Math.sin(a)*r;if(g.walkable(x,z)&&g.height(x,z)>g.world.waterY+.3){dry={x,z};break;}}
  if(dry)for(const u of g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)).slice(0,3)){
   g.interruptMission(u);u.boat=undefined;u.haulage=undefined;u.x=dry.x;u.z=dry.z;u.y=g.height(u.x,u.z);u.order='hold';g.invalidateRoute(u);
  }
  g.clearSelect();g.state.selBld=dock;dock.selected=true;
 }
 if(action==='raid')g.spawnRaid();
 if(action==='finish')for(const b of g.state.buildings.filter(b=>b.team===0&&b.hp>0)){b.plannedCost=undefined;b.planPaused=undefined;b.build=1;b.hp=b.maxHp;}
 g.state.walkDirty=true;g.workBoard.reset();g.banner(`Test: ${action}`,2);return true;
}
