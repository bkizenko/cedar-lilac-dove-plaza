import {mulberry32} from './rng';
import {dryTreeRoot,dryTreeRootLocal} from './hydrology';
import {waterSurfaceAt} from './localWater';
import {provinceAt,PROVINCE_KINDS,PROVINCE_PROFILES,type EcologicalProvinceGrid} from './ecologicalProvinces';
import type {ResourceNode} from './types';
export const ECOLOGICAL_RESOURCE_RULES={forageAreaSquareMeters:2200,stoneAreaSquareMeters:5500,oreAreaSquareMeters:18000,protectedCampRadiusMeters:64,maximumPlacementAttemptsPerNode:90} as const;
type ResourceWorld={size:number;waterY:number;baseWaterY:number;waterHeights?:Float32Array;ecology:EcologicalProvinceGrid;camps:{x:number;z:number;team:number}[];dockSites:{x:number;z:number}[];trees:ResourceNode[];forage:ResourceNode[];stones:ResourceNode[];copper:ResourceNode[];iron:ResourceNode[]};
export function populateEcologicalResources(world:ResourceWorld,seed:number,height:(x:number,z:number)=>number,nextId:number,localWater?:((x:number,z:number)=>number)){
 const rules=ECOLOGICAL_RESOURCE_RULES,rand=mulberry32(seed^0x73ab138),grid=world.ecology;
 const cells=PROVINCE_KINDS.map(()=>[] as number[]);for(let id=0;id<grid.kinds.length;id++)if(grid.kinds[id]<8)cells[grid.kinds[id]].push(id);
 const nearCamp=(x:number,z:number,r:number=rules.protectedCampRadiusMeters)=>world.camps.some(c=>Math.hypot(c.x-x,c.z-z)<r);
 const collections=[['tree',world.trees],['forage',world.forage],['stone',world.stones],['copper',world.copper],['iron',world.iron]] as const;
 for(const [kind,list]of collections){
  const groups=PROVINCE_KINDS.map(k=>list.filter(n=>provinceAt(grid,n.x,n.z).kind===k));
  for(let owner=0;owner<8;owner++){
   const key=PROVINCE_KINDS[owner],profile=PROVINCE_PROFILES[key],region=grid.metrics.regions[owner];
   const wanted=kind==='tree'?Math.max(5,Math.round(region.areaSquareMeters/10000*profile.treeDensityPerHectare)):
    Math.max(kind==='forage'?5:kind==='stone'?3:1,Math.round(region.areaSquareMeters*profile.resourceWeights[kind]/(kind==='forage'?rules.forageAreaSquareMeters:kind==='stone'?rules.stoneAreaSquareMeters:rules.oreAreaSquareMeters)));
   const preserved=groups[owner].filter(n=>nearCamp(n.x,n.z)),other=groups[owner].filter(n=>!nearCamp(n.x,n.z));
   // Preserve the finite opening's already-placed supplies. Away from camps,
   // seeded thinning respects each actual province's density and resource mix.
   for(let i=other.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[other[i],other[j]]=[other[j],other[i]];}
   const keep=new Set([...preserved,...other.slice(0,Math.max(0,wanted-preserved.length))]),members=new Set(groups[owner]);
   for(let i=list.length-1;i>=0;i--)if(members.has(list[i])&&!keep.has(list[i]))list.splice(i,1);
   let count=keep.size;
   const separation=kind==='tree'?3.5:kind==='forage'?4:kind==='stone'?6:8;
   const bucketSize=8,buckets=new Map<string,ResourceNode[]>();
   const bucket=(x:number,z:number)=>`${Math.floor(x/bucketSize)},${Math.floor(z/bucketSize)}`;
   const add=(n:ResourceNode)=>{const key=bucket(n.x,n.z),items=buckets.get(key)??[];items.push(n);buckets.set(key,items);};list.forEach(add);
   const crowded=(x:number,z:number)=>{const ix=Math.floor(x/bucketSize),iz=Math.floor(z/bucketSize);for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)if(buckets.get(`${ix+dx},${iz+dz}`)?.some(n=>Math.hypot(n.x-x,n.z-z)<separation))return true;return false;};
   for(let attempt=0;attempt<wanted*rules.maximumPlacementAttemptsPerNode&&count<wanted;attempt++){
    const id=cells[owner][Math.floor(rand()*cells[owner].length)];if(id===undefined)break;
    const x=(id%grid.width+.5)*grid.cellMeters-world.size/2+(rand()-.5)*grid.cellMeters,z=(Math.floor(id/grid.width)+.5)*grid.cellMeters-world.size/2+(rand()-.5)*grid.cellMeters;
    if(provinceAt(grid,x,z).kind!==key||nearCamp(x,z,14)||world.dockSites.some(s=>Math.hypot(s.x-x,s.z-z)<8)||crowded(x,z))continue;
    const y=height(x,z),water=localWater?localWater(x,z):waterSurfaceAt(world,x,z);if(y<water+.85)continue;
    const grade=Math.max(Math.abs(height(x+2,z)-height(x-2,z)),Math.abs(height(x,z+2)-height(x,z-2)))/4;
    if(grade>(kind==='tree'||kind==='forage'?.6:1.1))continue;
    if(kind==='tree'&&!(localWater?dryTreeRootLocal(height,localWater,x,z):dryTreeRoot(height,x,z,water)))continue;
    const amount=kind==='tree'?(key==='alpine'||key==='arid'||key==='dry-scrub'?10+Math.floor(rand()*12):36+Math.floor(rand()*30)):
     kind==='forage'?40+Math.floor(rand()*26):kind==='stone'?18+Math.floor(rand()*15):10+Math.floor(rand()*12);
    const node:ResourceNode={id:nextId++,kind,x,y,z,amount,maxAmt:amount,regenT:0,scale:.85+rand()*.5,rich:.85+rand()*.3};list.push(node);add(node);count++;
   }
  }
 }
 const regions=PROVINCE_KINDS.map((kind,owner)=>{
  const counts={tree:0,forage:0,stone:0,copper:0,iron:0};for(const [resource,list]of collections)for(const n of list)if(provinceAt(grid,n.x,n.z).kind===kind)counts[resource]++;
  return{kind,...counts,treesPerHectare:counts.tree/Math.max(1,grid.metrics.regions[owner].areaSquareMeters)*10000};
 });
 return{nextId,regions};
}
