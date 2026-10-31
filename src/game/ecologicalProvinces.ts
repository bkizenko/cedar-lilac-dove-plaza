import {fbm} from './rng';
import {waterSurfaceAt,lakeBoundaryDistance} from './localWater';
import type {WorldData} from './worldgen';
export const ECOLOGY_RULES={version:1,cellMeters:12,minimumRegionAreaSquareMeters:6000,minimumLandFractionPerRegion:.03,transitionPasses:2,wetlandMaximumWaterDistanceMeters:96,wetlandMaximumHeightAboveWaterMeters:9,wetlandMaximumSlope:.60} as const;
export const PROVINCE_KINDS=['meadow','mixed-woodland','conifer-forest','alpine','wetland','dry-scrub','arid','warm-coast'] as const;
export type ProvinceKind=typeof PROVINCE_KINDS[number];
export type TreeForm='broadleaf'|'conifer'|'willow'|'acacia'|'palm'|'stunted'|'scrub';
export type ProvinceProfile={kind:ProvinceKind;name:string;baseHabitat:'plains'|'forest'|'hills';soil:number;moisture:number;temperatureOffsetCelsius:number;crops:number;forage:number;timber:number;winterFood:number;treeDensityPerHectare:number;treeForms:Partial<Record<TreeForm,number>>;resourceWeights:{tree:number;forage:number;stone:number;copper:number;iron:number};advice:string};
export const PROVINCE_PROFILES:Record<ProvinceKind,ProvinceProfile>={
 meadow:{kind:'meadow',name:'Meadow and grassland',baseHabitat:'plains',soil:.88,moisture:.58,temperatureOffsetCelsius:1,crops:1.25,forage:1.08,timber:.75,winterFood:1.08,treeDensityPerHectare:18,treeForms:{broadleaf:.8,willow:.15,conifer:.05},resourceWeights:{tree:.22,forage:1.5,stone:.4,copper:.35,iron:.35},advice:'Deep soil supports fields and pasture. Exposed routes need nearby shelter and stored winter food.'},
 'mixed-woodland':{kind:'mixed-woodland',name:'Mixed woodland',baseHabitat:'forest',soil:.72,moisture:.72,temperatureOffsetCelsius:0,crops:.85,forage:1.25,timber:1.18,winterFood:1,treeDensityPerHectare:115,treeForms:{broadleaf:.65,conifer:.25,willow:.10},resourceWeights:{tree:1.6,forage:1.35,stone:.65,copper:.65,iron:.65},advice:'Mixed trees and understory support timber and gathering; clear small fields rather than stripping the whole woodland.'},
 'conifer-forest':{kind:'conifer-forest',name:'Cool conifer forest',baseHabitat:'forest',soil:.55,moisture:.70,temperatureOffsetCelsius:-5,crops:.65,forage:.9,timber:1.28,winterFood:1.16,treeDensityPerHectare:130,treeForms:{conifer:.84,broadleaf:.08,stunted:.08},resourceWeights:{tree:1.8,forage:.9,stone:.9,copper:.8,iron:.9},advice:'Evergreen uplands provide fuel and timber. Cooler growing conditions reward preserved food and sheltered work.'},
 alpine:{kind:'alpine',name:'Montane and alpine',baseHabitat:'hills',soil:.26,moisture:.42,temperatureOffsetCelsius:-10,crops:.30,forage:.6,timber:.65,winterFood:1.38,treeDensityPerHectare:12,treeForms:{stunted:.75,conifer:.25},resourceWeights:{tree:.16,forage:.45,stone:1.8,copper:1.6,iron:1.8},advice:'Thin soil and exposed heights favor prospecting and stone. Protect routes and bring food and fuel from lower ground.'},
 wetland:{kind:'wetland',name:'Freshwater wetland and riparian',baseHabitat:'plains',soil:.83,moisture:.94,temperatureOffsetCelsius:0,crops:1.05,forage:1.18,timber:.9,winterFood:1.08,treeDensityPerHectare:48,treeForms:{willow:.8,broadleaf:.2},resourceWeights:{tree:.65,forage:1.4,stone:.25,copper:.2,iron:.25},advice:'Moist margins provide gathering and water access. Keep buildings above flood level and cultivate the dry banks.'},
 'dry-scrub':{kind:'dry-scrub',name:'Dry scrub and open woodland',baseHabitat:'hills',soil:.44,moisture:.30,temperatureOffsetCelsius:3,crops:.62,forage:.8,timber:.8,winterFood:1.10,treeDensityPerHectare:30,treeForms:{acacia:.45,scrub:.45,broadleaf:.1},resourceWeights:{tree:.5,forage:.8,stone:1.2,copper:1.2,iron:1.1},advice:'Open stony ground supports hardy forage and grazing. Sparse timber and seasonal water make supply planning useful.'},
 arid:{kind:'arid',name:'Arid dunes and badlands',baseHabitat:'hills',soil:.18,moisture:.12,temperatureOffsetCelsius:6,crops:.38,forage:.45,timber:.55,winterFood:1.06,treeDensityPerHectare:7,treeForms:{scrub:.8,acacia:.2},resourceWeights:{tree:.09,forage:.35,stone:1.6,copper:1.45,iron:1.3},advice:'Dry channels, dunes and exposed rock offer minerals and routes, with little timber or dependable cultivation.'},
 'warm-coast':{kind:'warm-coast',name:'Warm coastal woodland',baseHabitat:'forest',soil:.67,moisture:.63,temperatureOffsetCelsius:5,crops:1.02,forage:1.12,timber:1,winterFood:.97,treeDensityPerHectare:68,treeForms:{palm:.5,broadleaf:.3,acacia:.15,willow:.05},resourceWeights:{tree:.95,forage:1.15,stone:.65,copper:.45,iron:.5},advice:'Warm lowland woods and sheltered coast support gathering and exchange; protect stores and landing approaches from storms.'},
};
export class EcologyCoverageError extends Error{
 readonly code:'riparian-physical-coverage'|'province-allocation';readonly requiredAreaSquareMeters:number;readonly availableAreaSquareMeters:number;
 constructor(code:'riparian-physical-coverage'|'province-allocation',requiredAreaSquareMeters:number,availableAreaSquareMeters:number,message:string){super(message);this.name='EcologyCoverageError';this.code=code;this.requiredAreaSquareMeters=requiredAreaSquareMeters;this.availableAreaSquareMeters=availableAreaSquareMeters;}
}
export type EcologyWorld=Pick<WorldData,'size'|'heights'|'waterY'|'baseWaterY'|'waterHeights'|'waterBodies'|'features'|'rivers'>;
export type EcologicalProvinceGrid={version:number;size:number;width:number;cellMeters:number;kinds:Uint8Array;freshwaterDistanceMeters:Float32Array;soil:Float32Array;moisture:Float32Array;temperatureOffsetCelsius:Float32Array;metrics:{landAreaSquareMeters:number;minimumRegionAreaSquareMeters:number;regions:{kind:ProvinceKind;areaSquareMeters:number;largestConnectedAreaSquareMeters:number;meanElevationMeters:number;meanFreshwaterDistanceMeters:number;meanSoil:number;meanMoisture:number;center:{x:number;z:number}}[]}};
const unit=(n:number)=>Math.max(0,Math.min(1,n));
function heightAt(world:EcologyWorld,x:number,z:number){const segs=Math.round(Math.sqrt(world.heights.length))-1,n=segs+1,gx=(x/world.size+.5)*segs,gz=(z/world.size+.5)*segs,ix=Math.max(0,Math.min(segs-1,Math.floor(gx))),iz=Math.max(0,Math.min(segs-1,Math.floor(gz))),fx=unit(gx-ix),fz=unit(gz-iz),h=world.heights;return h[iz*n+ix]*(1-fx)*(1-fz)+h[iz*n+ix+1]*fx*(1-fz)+h[(iz+1)*n+ix]*(1-fx)*fz+h[(iz+1)*n+ix+1]*fx*fz;}
function freshwaterDistance(world:EcologyWorld,x:number,z:number){let best=Infinity,waterY=world.baseWaterY;
 for(const body of world.waterBodies??[]){if(body.kind==='lake'){const distance=Math.max(0,lakeBoundaryDistance(body,x,z));if(distance<best){best=distance;waterY=body.surfaceY;}}else for(let i=1;i<body.pts.length;i++){
  const a=body.pts[i-1],b=body.pts[i],dx=b.x-a.x,dz=b.z-a.z,t=unit(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));const distance=Math.max(0,Math.hypot(x-a.x-t*dx,z-a.z-t*dz)-body.width*.5);if(distance<best){best=distance;waterY=a.y+(b.y-a.y)*t;}}}
 return {distance:best,waterY};
}
class Heap{items:{id:number;cost:number;owner:number}[]=[];push(item:{id:number;cost:number;owner:number}){const a=this.items;a.push(item);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].cost<=item.cost)break;a[i]=a[p];i=p;}a[i]=item;}pop(){const a=this.items,first=a[0],last=a.pop()!;if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].cost<a[j].cost)j++;if(a[j].cost>=last.cost)break;a[i]=a[j];i=j;}a[i]=last;}return first;}get length(){return this.items.length;}}
/** Derived at generation time before resource placement. Climate is deliberately
 * compressed into ecological provinces on small game maps; no real-world ethnic
 * or culture identity is inferred from a climate or a plant community. */
export function buildEcologicalProvinces(world:EcologyWorld,seed:number):EcologicalProvinceGrid{
 const width=Math.ceil(world.size/ECOLOGY_RULES.cellMeters),cell=world.size/width,total=width*width,area=cell*cell;
 const point=(id:number)=>({x:(id%width+.5)*cell-world.size/2,z:(Math.floor(id/width)+.5)*cell-world.size/2});
 const neighbors=(id:number)=>[id%width?id-1:-1,id%width<width-1?id+1:-1,id>=width?id-width:-1,id<total-width?id+width:-1].filter(n=>n>=0);
 const eligible=new Uint8Array(total),elevation=new Float32Array(total),slope=new Float32Array(total),fresh=new Float32Array(total),aboveFreshWater=new Float32Array(total),coast=new Float32Array(total).fill(Infinity),noise=new Float32Array(total),kinds=new Uint8Array(total).fill(255);
 const coastQueue:number[]=[];let landCells=0;
 for(let id=0;id<total;id++){
  const p=point(id),h=heightAt(world,p.x,p.z),water=waterSurfaceAt(world,p.x,p.z);elevation[id]=h;
  eligible[id]=Number(h>=water+.25);landCells+=eligible[id];const freshwater=freshwaterDistance(world,p.x,p.z);fresh[id]=freshwater.distance;aboveFreshWater[id]=h-freshwater.waterY;
  slope[id]=Math.max(Math.abs(heightAt(world,p.x+3,p.z)-heightAt(world,p.x-3,p.z)),Math.abs(heightAt(world,p.x,p.z+3)-heightAt(world,p.x,p.z-3)))/6;
  noise[id]=fbm(p.x*.004+(seed%919),p.z*.004-71,3);
  if(h<world.baseWaterY+.2&&water<world.baseWaterY+.7){coast[id]=0;coastQueue.push(id);}
 }
 for(let i=0;i<coastQueue.length;i++){const at=coastQueue[i];for(const n of neighbors(at))if(coast[n]>coast[at]+cell){coast[n]=coast[at]+cell;coastQueue.push(n);}}
 const minimum=Math.max(ECOLOGY_RULES.minimumRegionAreaSquareMeters,landCells*area*ECOLOGY_RULES.minimumLandFractionPerRegion),quota=Math.ceil(minimum/area),radius=Math.sqrt(minimum/Math.PI);
 const dunes=world.features?.find(f=>f.kind==='dunes'),plateau=world.features?.find(f=>f.kind==='plateau');
 const affinity=(owner:number,id:number)=>{
  const p=point(id),h=elevation[id],grade=slope[id],waterNear=Math.max(0,1-fresh[id]/96),flat=1-unit(grade),warm=1-unit(h/35),variation=noise[id]*.25;
  switch(PROVINCE_KINDS[owner]){
   case 'meadow':return flat*3+waterNear+warm+variation;
   case 'mixed-woodland':return flat+waterNear*1.2+(1-Math.abs(h-14)/45)+noise[id]+variation;
   case 'conifer-forest':return unit(h/28)*2+waterNear+(1-Math.abs(h-24)/45)+variation;
   case 'alpine':return unit(h/50)*6+Math.min(grade,1)+variation;
   case 'wetland':return waterNear*7+flat*2-Math.max(0,aboveFreshWater[id]-3)*.15+variation;
   case 'dry-scrub':return (1-waterNear)+grade+unit(h/25)+(plateau?Math.max(0,1-Math.hypot(p.x-plateau.x,p.z-plateau.z)/200):0)+variation;
   case 'arid':return (dunes?Math.max(0,1-Math.hypot(p.x-dunes.x,p.z-dunes.z)/180)*5:0)+(1-waterNear)+variation;
   case 'warm-coast':return Math.max(0,1-coast[id]/160)*5+warm+flat+variation;
  }
 };
 const allowed=(owner:number,id:number)=>eligible[id]&&(PROVINCE_KINDS[owner]!=='wetland'||fresh[id]<=ECOLOGY_RULES.wetlandMaximumWaterDistanceMeters&&aboveFreshWater[id]<=ECOLOGY_RULES.wetlandMaximumHeightAboveWaterMeters&&slope[id]<=ECOLOGY_RULES.wetlandMaximumSlope);
 const wetComponents=new Int32Array(total).fill(-1),wetSizes:number[]=[];
 for(let id=0;id<total;id++)if(allowed(4,id)&&wetComponents[id]<0){const queue=[id],group=wetSizes.length;wetComponents[id]=group;
  for(let q=0;q<queue.length;q++)for(const n of neighbors(queue[q]))if(allowed(4,n)&&wetComponents[n]<0){wetComponents[n]=group;queue.push(n);}wetSizes.push(queue.length);
 }
 if(Math.max(0,...wetSizes)<quota)throw new EcologyCoverageError('riparian-physical-coverage',minimum,Math.max(0,...wetSizes)*area,`Physical riparian terrain has only ${(Math.max(0,...wetSizes)*area).toFixed(0)} m² connected; ${minimum.toFixed(0)} m² required before biome allocation`);
 const seeds=new Int32Array(8).fill(-1),order=[4,3,6,2,7,0,1,5];
 // Reserve full connected cores before allocating the next province. This avoids
 // narrow regions being surrounded mid-growth by neighboring province fronts.
 for(const owner of order){
  const freeGroups=new Int32Array(total).fill(-1),freeSizes:number[]=[];
  for(let id=0;id<total;id++)if(kinds[id]===255&&allowed(owner,id)&&freeGroups[id]<0){
   const queue=[id],group=freeSizes.length;freeGroups[id]=group;
   for(let q=0;q<queue.length;q++)for(const n of neighbors(queue[q]))if(kinds[n]===255&&allowed(owner,n)&&freeGroups[n]<0){freeGroups[n]=group;queue.push(n);}freeSizes.push(queue.length);
  }
  let best=-Infinity,chosen=-1;
  for(let id=0;id<total;id++)if(kinds[id]===255&&allowed(owner,id)&&freeSizes[freeGroups[id]]>=quota){
   const p=point(id),distance=Math.min(...Array.from(seeds).filter(i=>i>=0).map(i=>{const q=point(i);return Math.hypot(p.x-q.x,p.z-q.z);}),Infinity);
   const separationPenalty=Math.max(0,1-distance/(radius*.95))*2;
   const value=affinity(owner,id)-separationPenalty+Math.min(distance/radius,2)*.15;
   if(value>best){best=value;chosen=id;}
  }
  if(chosen<0)throw new EcologyCoverageError('province-allocation',minimum,Math.max(0,...freeSizes)*area,`No connected unallocated ${PROVINCE_KINDS[owner]} region can hold ${minimum.toFixed(0)} m²`);
  seeds[owner]=chosen;kinds[chosen]=owner;const heap=new Heap();let count=1;
  for(const id of neighbors(chosen))if(allowed(owner,id)&&kinds[id]===255)heap.push({id,cost:cell,owner});
  while(count<quota&&heap.length){const node=heap.pop();if(kinds[node.id]!==255)continue;kinds[node.id]=owner;count++;
   for(const id of neighbors(node.id))if(kinds[id]===255&&allowed(owner,id))heap.push({id,cost:node.cost+cell*(1+Math.max(0,8-affinity(owner,id))*.25),owner});
  }
  if(count<quota)throw new EcologyCoverageError('province-allocation',minimum,count*area,`Connected ${PROVINCE_KINDS[owner]} core could not be reserved`);
 }
 const fill=new Heap();for(let id=0;id<total;id++)if(kinds[id]!==255)for(const n of neighbors(id))if(allowed(kinds[id],n)&&kinds[n]===255)fill.push({id:n,cost:cell,owner:kinds[id]});
 while(fill.length){const node=fill.pop();if(kinds[node.id]!==255)continue;kinds[node.id]=node.owner;
  for(const n of neighbors(node.id))if(allowed(node.owner,n)&&kinds[n]===255)fill.push({id:n,cost:node.cost+cell*(1+Math.max(0,8-affinity(node.owner,n))*.12),owner:node.owner});
 }
 // Disconnected islands inherit a feasible ecological character; the substantial
 // guaranteed core remains measured on the mainland, not fabricated tiny tokens.
 for(let id=0;id<total;id++)if(eligible[id]&&kinds[id]===255){let owner=0,best=-Infinity;for(let k=0;k<8;k++){if(!allowed(k,id))continue;const score=affinity(k,id);if(score>best){owner=k;best=score;}}const queue=[id];kinds[id]=owner;
  for(let q=0;q<queue.length;q++)for(const n of neighbors(queue[q]))if(allowed(owner,n)&&kinds[n]===255){kinds[n]=owner;queue.push(n);}
 }
 let soil=new Float32Array(total),moisture=new Float32Array(total),temperatureOffsetCelsius=new Float32Array(total);
 for(let id=0;id<total;id++){const profile=PROVINCE_PROFILES[PROVINCE_KINDS[kinds[id]??7]]??PROVINCE_PROFILES['warm-coast'],local=noise[id]-.5;
  soil[id]=unit(profile.soil+local*.12-Math.min(.18,slope[id]*.12));moisture[id]=unit(profile.moisture+local*.08+Math.max(0,1-fresh[id]/35)*.08);temperatureOffsetCelsius[id]=profile.temperatureOffsetCelsius+local*2;
 }
 const blur=(source:Float32Array)=>{const result=new Float32Array(total);for(let id=0;id<total;id++){let sum=source[id]*4,n=4;for(const j of neighbors(id)){sum+=source[j];n++;}result[id]=sum/n;}return result;};
 for(let pass=0;pass<ECOLOGY_RULES.transitionPasses;pass++){soil=blur(soil);moisture=blur(moisture);temperatureOffsetCelsius=blur(temperatureOffsetCelsius);}
 const largest=new Int32Array(8),seen=new Uint8Array(total);
 for(let id=0;id<total;id++)if(kinds[id]!==255&&!seen[id]){const kind=kinds[id],queue=[id];seen[id]=1;for(let q=0;q<queue.length;q++)for(const n of neighbors(queue[q]))if(!seen[n]&&kinds[n]===kind){seen[n]=1;queue.push(n);}largest[kind]=Math.max(largest[kind],queue.length);}
 const regions=PROVINCE_KINDS.map((kind,owner)=>{let count=0,h=0,water=0,s=0,m=0,x=0,z=0;for(let id=0;id<total;id++)if(kinds[id]===owner){const p=point(id);count++;h+=elevation[id];water+=fresh[id];s+=soil[id];m+=moisture[id];x+=p.x;z+=p.z;}
  if(largest[owner]*area+1e-6<minimum)throw new Error(`Disconnected ${kind} province did not meet actual area gate`);
  return{kind,areaSquareMeters:count*area,largestConnectedAreaSquareMeters:largest[owner]*area,meanElevationMeters:h/count,meanFreshwaterDistanceMeters:water/count,meanSoil:s/count,meanMoisture:m/count,center:{x:x/count,z:z/count}};
 });
 return{version:ECOLOGY_RULES.version,size:world.size,width,cellMeters:cell,kinds,freshwaterDistanceMeters:fresh,soil,moisture,temperatureOffsetCelsius,metrics:{landAreaSquareMeters:landCells*area,minimumRegionAreaSquareMeters:minimum,regions}};
}
function cellIndex(grid:EcologicalProvinceGrid,x:number,z:number){return Math.max(0,Math.min(grid.width-1,Math.floor((z/grid.size+.5)*grid.width)))*grid.width+Math.max(0,Math.min(grid.width-1,Math.floor((x/grid.size+.5)*grid.width)));}
export function provinceAt(grid:EcologicalProvinceGrid,x:number,z:number):ProvinceProfile{return PROVINCE_PROFILES[PROVINCE_KINDS[grid.kinds[cellIndex(grid,x,z)]]]??PROVINCE_PROFILES['warm-coast'];}
export function ecologicalConditionsAt(grid:EcologicalProvinceGrid,x:number,z:number){const profile=provinceAt(grid,x,z),gx=(x/grid.size+.5)*grid.width-.5,gz=(z/grid.size+.5)*grid.width-.5,ix=Math.max(0,Math.min(grid.width-2,Math.floor(gx))),iz=Math.max(0,Math.min(grid.width-2,Math.floor(gz))),fx=unit(gx-ix),fz=unit(gz-iz);
 const sample=(field:Float32Array)=>field[iz*grid.width+ix]*(1-fx)*(1-fz)+field[iz*grid.width+ix+1]*fx*(1-fz)+field[(iz+1)*grid.width+ix]*(1-fx)*fz+field[(iz+1)*grid.width+ix+1]*fx*fz;
 return{kind:profile.kind,profile,soil:sample(grid.soil),moisture:sample(grid.moisture),freshwaterDistanceMeters:sample(grid.freshwaterDistanceMeters),temperatureOffsetCelsius:sample(grid.temperatureOffsetCelsius)};
}
