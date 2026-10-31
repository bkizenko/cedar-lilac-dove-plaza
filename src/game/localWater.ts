export type LocalWaterBody={kind:'lake';id:string;x:number;z:number;rx:number;rz:number;surfaceY:number;shoreline?:{x:number;z:number}[]}|{kind:'river';id:string;pts:{x:number;z:number;y:number;w?:number}[];width:number};
export type Waterfall={x:number;z:number;upperY:number;lowerY:number;width:number;dx:number;dz:number};
export type LakeBody=Extract<LocalWaterBody,{kind:'lake'}>;
export function lakeContains(body:LakeBody,x:number,z:number){
 const path=body.shoreline;if(!path)return ((x-body.x)/body.rx)**2+((z-body.z)/body.rz)**2<=1;
 let inside=false;for(let i=0,j=path.length-1;i<path.length;j=i++){
  const a=path[i],b=path[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
 }return inside;
}
/** Signed distance to the same shoreline polygon rendered and used for wet cells. */
export function lakeBoundaryDistance(body:LakeBody,x:number,z:number){
 const path=body.shoreline;
 if(!path)return (Math.hypot((x-body.x)/body.rx,(z-body.z)/body.rz)-1)*Math.min(body.rx,body.rz);
 if(Math.abs(x-body.x)>body.rx*2||Math.abs(z-body.z)>body.rz*2)return Math.hypot(x-body.x,z-body.z)-Math.max(body.rx,body.rz);
 let distance=Infinity;for(let i=0;i<path.length;i++){
  const a=path[i],b=path[(i+1)%path.length],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
  distance=Math.min(distance,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
 }return lakeContains(body,x,z)?-distance:distance;
}
/** Exact shared wet footprint for rendering, terrain carving and navigation. */
export function localWaterAt(bodies:LocalWaterBody[],x:number,z:number):number|null{
 let surface:number|null=null;
 for(const body of bodies){
  if(body.kind==='lake'){
   if(lakeContains(body,x,z))surface=Math.max(surface??-Infinity,body.surfaceY);
  }else for(let i=1;i<body.pts.length;i++){
   const a=body.pts[i-1],b=body.pts[i],dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
   if(len<.0001)continue;const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/len));
   const width=(a.w??body.width)+((b.w??body.width)-(a.w??body.width))*t;
   if(Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<=width*.5){const y=a.y+(b.y-a.y)*t;surface=Math.max(surface??-Infinity,y);}
  }
 }
 return surface;
}
export function waterSurfaceAt(world:{waterY:number;baseWaterY?:number;size?:number;waterBodies?:LocalWaterBody[];waterHeights?:Float32Array},x:number,z:number){
 const grid=world.waterHeights,size=world.size;
 if(grid&&size){
  const segs=Math.round(Math.sqrt(grid.length))-1,n=segs+1,gx=(x/size+.5)*segs,gz=(z/size+.5)*segs;
  const ix=Math.max(0,Math.min(segs-1,Math.floor(gx))),iz=Math.max(0,Math.min(segs-1,Math.floor(gz)));
  const fx=Math.max(0,Math.min(1,gx-ix)),fz=Math.max(0,Math.min(1,gz-iz));
  const y=grid[iz*n+ix]*(1-fx)*(1-fz)+grid[iz*n+ix+1]*fx*(1-fz)+grid[(iz+1)*n+ix]*(1-fx)*fz+grid[(iz+1)*n+ix+1]*fx*fz;
  return Math.max(world.waterY,y+world.waterY-(world.baseWaterY??world.waterY));
 }
 return Math.max(world.waterY,localWaterAt(world.waterBodies??[],x,z)??-Infinity);
}
