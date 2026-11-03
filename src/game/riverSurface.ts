/** Plain geometry shared by V17 physics and rendering; no renderer/state objects. */
export type RiverSurfacePoint={x:number;y:number;z:number;w?:number};
export type RiverCaps={startCap?:'round'|'butt';endCap?:'round'|'butt'};
export function riverSurfaceData(points:readonly RiverSurfacePoint[],width:number,caps:RiverCaps={startCap:'butt',endCap:'butt'}){
 const centers:{x:number;y:number;z:number;w:number;distance:number}[]=[];let along=0;
 for(let segment=1;segment<points.length;segment++){const a=points[segment-1],b=points[segment],len=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(len/2));for(let row=0;row<steps;row++){const t=row/steps;centers.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,w:(a.w??width)+((b.w??width)-(a.w??width))*t,distance:along+len*t});}along+=len;}
 if(points.length){const p=points[points.length-1];centers.push({...p,w:p.w??width,distance:along});}
 const columns=Math.max(2,Math.ceil(Math.max(width,...centers.map(p=>p.w))/2)),stride=columns+1,positions:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(let row=0;row<centers.length;row++){const p=centers[row],before=centers[Math.max(0,row-1)],after=centers[Math.min(centers.length-1,row+1)],inLen=Math.hypot(p.x-before.x,p.z-before.z)||1,outLen=Math.hypot(after.x-p.x,after.z-p.z)||1;let nx=-(p.z-before.z)/inLen-(after.z-p.z)/outLen,nz=(p.x-before.x)/inLen+(after.x-p.x)/outLen;const normalLen=Math.hypot(nx,nz)||1;nx/=normalLen;nz/=normalLen;const sx=row===centers.length-1?-(p.z-before.z)/inLen:-(after.z-p.z)/outLen,sz=row===centers.length-1?(p.x-before.x)/inLen:(after.x-p.x)/outLen,miter=Math.min(1.6,1/Math.max(.625,nx*sx+nz*sz));for(let col=0;col<=columns;col++){const lateral=(col/columns-.5)*p.w*miter;positions.push(p.x+nx*lateral,p.y,p.z+nz*lateral);uvs.push(col/columns,p.distance/Math.max(1,width));}if(row)for(let col=0;col<columns;col++){const a=(row-1)*stride+col,b=a+1,c=row*stride+col,d=c+1;indices.push(a,b,c,b,d,c);}}
 // Semicircular source/mouth coverage is merged into the same geometry/draw.
 for(const end of [0,1]){if((end?caps.endCap:caps.startCap)!=='round'||points.length<2)continue;const p=centers[end?centers.length-1:0],q=centers[end?centers.length-2:1],angle=Math.atan2(p.z-q.z,p.x-q.x),base=positions.length/3,r=p.w/2;positions.push(p.x,p.y,p.z);uvs.push(.5,p.distance/Math.max(1,width));for(let i=0;i<=32;i++){const a=angle-Math.PI/2+i*Math.PI/32;positions.push(p.x+Math.cos(a)*r,p.y,p.z+Math.sin(a)*r);uvs.push(.5+Math.cos(a)*.5,p.distance/Math.max(1,width)+Math.sin(a)*.5);if(i)indices.push(base,base+i,base+i+1);}}
 return{positions:new Float32Array(positions),uvs:new Float32Array(uvs),indices:new Uint32Array(indices)};
}
export const FALL_SURFACE_SEGMENTS=10;
export function fallingSurfacePoints(f:{x:number;z:number;upperY:number;lowerY:number;dx:number;dz:number}){return Array.from({length:FALL_SURFACE_SEGMENTS+1},(_,i)=>{const t=i/FALL_SURFACE_SEGMENTS;return{x:f.x+f.dx*t,z:f.z+f.dz*t,y:f.upperY+(f.lowerY-f.upperY)*t};});}
