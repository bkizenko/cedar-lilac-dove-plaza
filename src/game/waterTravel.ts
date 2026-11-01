import type {Game} from './sim';
import type {Unit} from './types';

import {waterNavigation} from './waterNavigation';
export type {WaterNavigation,WaterNavigationRequest} from './waterNavigation';
export {waterNavigation,requestWaterNavigation,tickWaterNavigationPreparation,waterNavigationPreparationStatus,WATER_NAVIGATION_RULES} from './waterNavigation';

export function canoeHeight(g:Game,u:Unit,x:number,z:number){
 return u.haulage==='canoe'?Math.max(g.travelHeight(x,z),g.waterAt(x,z)+.16):g.travelHeight(x,z);
}
export function connectedForUnit(g:Game,u:Unit,x:number,z:number){
 if(u.haulage!=='canoe')return g.workBoard.connected(g,u.x,u.z,x,z);
 const nav=waterNavigation(g,u.boat?.phase==='aboard'),cell=g.world.size/nav.width;
 const index=(px:number,pz:number)=>Math.max(0,Math.min(nav.width-1,Math.floor((pz+(g.world.size/2))/cell)))*nav.width+Math.max(0,Math.min(nav.width-1,Math.floor((px+(g.world.size/2))/cell)));
 const a=nav.labels[index(u.x,u.z)],b=nav.labels[index(x,z)];return a>0&&a===b;
}
