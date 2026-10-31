import type {Weather} from './types';
/** Saves persist weather, so navigation and rendered water must reconstruct its level too. */
export function weatherWaterLevel(base:number,weather:Weather){
  return base+(weather==='flood'?.55:weather==='drought'?-.18:0);
}

/** Ordinary foundations and tree roots stay above the highest seasonal water. */
export function highWaterLevel(base:number){return weatherWaterLevel(base,'flood');}
export function dryTreeRoot(height:(x:number,z:number)=>number,x:number,z:number,base:number,radius=1.5){
 const level=highWaterLevel(base)+.3;
 if(height(x,z)<level)return false;
 for(let i=0;i<8;i++){const a=i*Math.PI/4;if(height(x+Math.cos(a)*radius,z+Math.sin(a)*radius)<level)return false;}
 return true;
}
