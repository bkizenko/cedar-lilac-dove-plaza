import {sampleWorldHeight} from '../../src/game/worldgen.ts';
import {waterSurfaceAt,lakeContains} from '../../src/game/localWater.ts';

// Offline physical survey. Feature labels/centres, designed district IDs and
// generation regions are never inputs to the footprint or concentration score.
export const PHYSICAL_SPREAD_RULES={grid:128,localRingMetres:48,bankProbeMetres:24,reliefMetres:22,prominenceMetres:8,incisionMetres:6,minimumLakeDepthMetres:1,neighborhoodMetres:220,nearDestinationMetres:120};
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
function rowPrefix(mask,n){const a=new Int32Array(n*(n+1));for(let z=0;z<n;z++)for(let x=0;x<n;x++)a[z*(n+1)+x+1]=a[z*(n+1)+x]+mask[z*n+x];return a;}
// Expanded radius bounds any continuous-centre disk by its nearest grid-centre
// disk. The returned maximum is conservative for accepting non-concentration.
export function physicalDiskCover(mask,n,cell,radius,land){const prefix=rowPrefix(mask,n),r=(radius+cell/Math.sqrt(2))/cell,extent=Math.ceil(r),widths=Array.from({length:extent*2+1},(_,i)=>{const dz=i-extent;return Math.abs(dz)>r?-1:Math.floor(Math.sqrt(r*r-dz*dz));});let maximum=0,nearLand=0,centre=null;
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){let total=0;for(let dz=-extent;dz<=extent;dz++){const zz=z+dz,w=widths[dz+extent];if(zz<0||zz>=n||w<0)continue;const lo=Math.max(0,x-w),hi=Math.min(n-1,x+w);total+=prefix[zz*(n+1)+hi+1]-prefix[zz*(n+1)+lo];}if(total>maximum){maximum=total;centre={x,z};}if(land?.[z*n+x]&&total>0)nearLand++;}
 return{maximum,nearLand,centre,expandedRadiusMetres:r*cell};
}
export function physicalGeographySpread(w,{grid=PHYSICAL_SPREAD_RULES.grid}={}){
 const n=grid,cell=w.size/n,half=w.size/2,size=n*n,heights=new Float64Array(size),water=new Float64Array(size),dry=new Uint8Array(size),rare=new Uint8Array(size),gentle=new Uint8Array(size),lakeWet=new Uint8Array(size),riverWet=new Uint8Array(size);
 const height=(x,z)=>sampleWorldHeight(w,x,z),surface=(x,z)=>waterSurfaceAt(w,x,z),point=(x,z)=>({x:-half+(x+.5)*cell,z:-half+(z+.5)*cell});
 const lakes=(w.waterBodies||[]).filter(b=>b.kind==='lake'),rivers=(w.waterBodies||[]).filter(b=>b.kind==='river'),classes={relief:0,prominent:0,incised:0,lake:0},samples=[];
 let dryCount=0,rareCount=0,gentleCount=0,actualLakeCells=0,actualRiverCells=0;
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){const i=z*n+x,p=point(x,z),h=height(p.x,p.z),v=surface(p.x,p.z);heights[i]=h;water[i]=v;dry[i]=Number(h>v+.55);dryCount+=dry[i];
  if(h<v-.05&&lakes.some(b=>lakeContains(b,p.x,p.z))){lakeWet[i]=1;actualLakeCells++;if(v-h>=PHYSICAL_SPREAD_RULES.minimumLakeDepthMetres){rare[i]=1;classes.lake++;}}
  if(h<v-.05&&!lakeWet[i]&&v>=w.waterY-.001){for(const b of rivers){const level=waterSurfaceAt({...w,waterBodies:[b],waterHeights:undefined,localWaterVersion:undefined},p.x,p.z);if(level>w.waterY+.02&&h<level-.05){riverWet[i]=1;actualRiverCells++;break;}}}
  if(!dry[i])continue;
  const rings=[];for(let k=0;k<8;k++){const a=k*Math.PI/4,px=p.x+Math.cos(a)*48,pz=p.z+Math.sin(a)*48;if(Math.abs(px)<half&&Math.abs(pz)<half)rings.push(height(px,pz));}
  const around=[];for(let k=0;k<8;k++){const a=k*Math.PI/4,px=p.x+Math.cos(a)*24,pz=p.z+Math.sin(a)*24;if(Math.abs(px)<half&&Math.abs(pz)<half)around.push(height(px,pz));}
  const relief=rings.length?Math.max(h,...rings)-Math.min(h,...rings):0,prominence=around.length?h-median(around):0;let bankRise=0,bankAngle=0;
  for(let k=0;k<4;k++){const a=k*Math.PI/4,dx=Math.cos(a)*24,dz=Math.sin(a)*24;if(Math.abs(p.x+dx)>=half||Math.abs(p.x-dx)>=half||Math.abs(p.z+dz)>=half||Math.abs(p.z-dz)>=half)continue;const aH=height(p.x+dx,p.z+dz),bH=height(p.x-dx,p.z-dz);if(aH<=surface(p.x+dx,p.z+dz)+.55||bH<=surface(p.x-dx,p.z-dz)+.55)continue;const rise=Math.min(aH,bH)-h;if(rise>bankRise){bankRise=rise;bankAngle=a;}}
  const slope=Math.hypot(height(p.x+2,p.z)-height(p.x-2,p.z),height(p.x,p.z+2)-height(p.x,p.z-2))/4;
  const flags={relief:relief>=22&&h-v>=10,prominent:prominence>=8&&relief>=16,incised:bankRise>=6};for(const[k,yes]of Object.entries(flags))if(yes)classes[k]++;
  rare[i]=Number(Object.values(flags).some(Boolean));gentle[i]=Number(slope<=.35&&relief<=18&&h-v<=24);gentleCount+=gentle[i];
  // Wider dry valley witnesses are separate from the unchanged24m spatial mask.
  let valleyRise=bankRise,valleyAngle=bankAngle,valleyRadius=24;
  if(slope<=.6)for(const radius of[48,96])for(let k=0;k<4;k++){const a=k*Math.PI/4,dx=Math.cos(a)*radius,dz=Math.sin(a)*radius;if(Math.abs(p.x+dx)>=half||Math.abs(p.x-dx)>=half||Math.abs(p.z+dz)>=half||Math.abs(p.z-dz)>=half)continue;const aH=height(p.x+dx,p.z+dz),bH=height(p.x-dx,p.z-dz);if(aH<=surface(p.x+dx,p.z+dz)+.55||bH<=surface(p.x-dx,p.z-dz)+.55)continue;const rise=Math.min(aH,bH)-h;if(rise>valleyRise){valleyRise=rise;valleyAngle=a;valleyRadius=radius;}}
  if(valleyRise>=6&&slope<=.6&&samples.length<2000)samples.push({...p,height:h,water:v,bankRise:valleyRise,bankAngle:valleyAngle,bankProbeRadiusMetres:valleyRadius,slope,relief});
 }
 rareCount=rare.reduce((a,b)=>a+b,0);
 const cap=physicalDiskCover(rare,n,cell,Math.min(PHYSICAL_SPREAD_RULES.neighborhoodMetres,w.size*.22)),near=physicalDiskCover(rare,n,cell,PHYSICAL_SPREAD_RULES.nearDestinationMetres,dry),sectors=Array.from({length:16},(_,i)=>({x:i%4,z:Math.floor(i/4),dry:0,rare:0,lake:0,river:0}));
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){const s=sectors[Math.min(3,Math.floor(z/n*4))*4+Math.min(3,Math.floor(x/n*4))],i=z*n+x;s.dry+=dry[i];s.rare+=rare[i];s.lake+=lakeWet[i];s.river+=riverWet[i];}
 const threshold=Math.max(800,rareCount*cell*cell*.025),meaningful=sectors.filter(s=>s.rare*cell*cell>=threshold);let xmin=Infinity,xmax=-Infinity,zmin=Infinity,zmax=-Infinity;for(let z=0;z<n;z++)for(let x=0;x<n;x++)if(rare[z*n+x]){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);zmin=Math.min(zmin,z);zmax=Math.max(zmax,z);}
 return{rules:{...PHYSICAL_SPREAD_RULES,grid:n,cellMetres:cell},dryAreaSquareMetres:dryCount*cell*cell,remarkableAreaSquareMetres:rareCount*cell*cell,ordinaryGentleFraction:gentleCount/(dryCount||1),physicalClassAreas:Object.fromEntries(Object.entries(classes).map(([k,v])=>[k,v*cell*cell])),actualLakeWetAreaSquareMetres:actualLakeCells*cell*cell,actualRiverWetAreaSquareMetres:actualRiverCells*cell*cell,singleNeighborhoodShareUpperBound:cap.maximum/(rareCount||1),maxNeighborhoodCentre:cap.centre?point(cap.centre.x,cap.centre.z):null,neighborhoodRadiusMetres:Math.min(220,w.size*.22),expandedNeighborhoodRadiusMetres:cap.expandedRadiusMetres,dryLandWithin120mFractionUpperBound:near.nearLand/(dryCount||1),meaningfulSectorThresholdSquareMetres:threshold,meaningfulSectors:meaningful.length,sectors:sectors.map(s=>({...s,dryAreaSquareMetres:s.dry*cell*cell,remarkableAreaSquareMetres:s.rare*cell*cell})),footprintSpanMetres:Number.isFinite(xmin)?{x:(xmax-xmin)*cell,z:(zmax-zmin)*cell}:null,dryIncisionWitnesses:samples,gridData:{n,cell,heights,water,dry,rare,lakeWet,riverWet}};
}
