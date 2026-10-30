import type {Game} from './sim';
import type {Building} from './types';
import {BUILDINGS} from './constants';
import {HABITATS,habitatAt,soilQuality,riverDistance} from './ecology';

const cached=new WeakMap<Building,{world:Game['world'];biomes:Game['world']['biomes'];rivers:Game['world']['rivers'];heights:Game['world']['heights'];key:string;soil:number;grain:number;tubers:number;droughtWater:number}>();
/** At most nine equal-area land samples. Static terrain is cached per footprint,
 * so large villages do not rescan rivers for every worker/forecast update. */
export function fieldTerrain(g:Game,b:Building){
 const key=`${b.x}:${b.z}:${b.w}:${b.d}`;
 const old=cached.get(b);if(old?.world===g.world&&old.biomes===g.world.biomes&&old.rivers===g.world.rivers&&old.heights===g.world.heights&&old.key===key)return old;
 const nx=Math.max(1,Math.min(3,Math.ceil(b.w/BUILDINGS.farm.w))),nz=Math.max(1,Math.min(3,Math.ceil(b.d/BUILDINGS.farm.d)));
 let soil=0,grain=0,tubers=0,droughtWater=0;
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
  const x=b.x+((i+.5)/nx-.5)*b.w,z=b.z+((j+.5)/nz-.5)*b.d;
  const h=habitatAt(g,x,z),q=soilQuality(g,x,z),yieldFactor=h.crops*(.65+q*.5);
  soil+=q;grain+=yieldFactor;tubers+=yieldFactor*(h===HABITATS.forest?1.15:.9);
  droughtWater+=riverDistance(g,x,z)<24?.8:.4;
 }
 const n=nx*nz,result={world:g.world,biomes:g.world.biomes,rivers:g.world.rivers,heights:g.world.heights,key,soil:soil/n,grain:grain/n,tubers:tubers/n,droughtWater:droughtWater/n};
 cached.set(b,result);return result;
}
