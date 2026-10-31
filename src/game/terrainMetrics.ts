import {sampleHeight,type WorldData} from './worldgen';
import {dryTreeRoot,highWaterLevel} from './hydrology';
/** Offline/diagnostic sampling, never a per-frame renderer scan. */
export function terrainMetrics(world:WorldData){
 const n=96,cell=world.size/n,heights:number[]=[];let samples=0,hills=0,walkable=0;
 const height=(x:number,z:number)=>sampleHeight(world.heights,x,z,world.size);
 const high=highWaterLevel(world.baseWaterY);
 for(let iz=1;iz<n-1;iz++)for(let ix=1;ix<n-1;ix++){
  samples++;const x=(ix/n-.5)*world.size,z=(iz/n-.5)*world.size,h=height(x,z);
  if(h<high+.3)continue;
  heights.push(h);
  const grade=Math.max(Math.abs(height(x+2,z)-height(x-2,z)),Math.abs(height(x,z+2)-height(x,z-2)))/4;
  if(grade<.6)walkable++;
  if(Math.abs(height(x+cell,z)-height(x-cell,z))+Math.abs(height(x,z+cell)-height(x,z-cell))>2)hills++;
 }
 heights.sort((a,b)=>a-b);
 return {landFraction:heights.length/Math.max(1,samples),rollingFraction:hills/Math.max(1,heights.length),gentleFraction:walkable/Math.max(1,heights.length),medianElevation:heights[Math.floor(heights.length*.5)]??0,highElevation:heights[Math.floor(heights.length*.95)]??0,trees:world.trees.length,wetTreeRoots:world.trees.filter(t=>!dryTreeRoot(height,t.x,t.z,world.baseWaterY)).length};
}
