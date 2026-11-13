/** Where a finished carved building actually touches the ground, read from the REAL generated spec (no guessing from the plot rectangle).
 *  Pure (no three.js, no sim). The foundation code (siteFoundation.ts) sinks a continuous footing ring under `polys` and a stone column under every
 *  pier, so the earth always meets the walls with no gap and no thin legs; a building that the generator itself raises on legs (staddle-stone
 *  granary) reports piers instead of a ring.
 *  All numbers are metres in the building's local frame (x right, z toward the door side), before yaw. */
import {partBounds,type BuildingSpec,type Part} from './buildingParts';

export type PlanPoint={x:number;z:number};
export type GroundPlan={
 /** Convex wall outlines (rectangles for boxes, regular polygons for cylinders), counter-clockwise seen from above. */
 polys:readonly (readonly PlanPoint[])[];
 /** Height of each outline's lowest wall above the floor level (a wall that starts on a 0.3 m base course needs a footing up to there). Same length as `polys`. */
 lifts:readonly number[];
 /** Legs the generator itself raises the building on: staddle stones, corner posts. */
 piers:readonly {x:number;z:number;r:number}[];
 /** The door, in the same frame (z is the wall face). */
 entry?:{x:number;z:number;width:number};
 /** The generator raises the body on its own legs (piers, no ring). */
 raised:boolean;
 /** Radius of the biggest outline (for placing posts on a round building). */
 round:boolean;
};

const MASS_MIN_HEIGHT=.9,MASS_MIN_AREA=2.2,GROUND_Y=.4,PIER_MAX_WIDTH=.8,PIER_MIN_HEIGHT=.3;
const tilted=(p:Part)=>!!p.rot&&(Math.abs(p.rot[0])>.05||Math.abs(p.rot[2])>.05);
const rect=(cx:number,cz:number,w:number,d:number,yaw:number):PlanPoint[]=>{
 const c=Math.cos(yaw),s=Math.sin(yaw),pts:PlanPoint[]=[];
 for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const lx=sx*w/2,lz=sz*d/2;pts.push({x:cx+c*lx+s*lz,z:cz-s*lx+c*lz});}
 return pts;
};
const ngon=(cx:number,cz:number,rx:number,rz:number,sides:number,yaw:number):PlanPoint[]=>{
 const pts:PlanPoint[]=[],c=Math.cos(yaw),s=Math.sin(yaw);
 for(let i=0;i<sides;i++){const a=(i+.5)/sides*Math.PI*2,lx=Math.cos(a)*rx,lz=Math.sin(a)*rz;pts.push({x:cx+c*lx+s*lz,z:cz-s*lx+c*lz});}
 return pts;
};
const cache=new WeakMap<BuildingSpec,GroundPlan>();
/** The ground plan of a spec. Cached per spec object. */
export function groundPlanOf(spec:BuildingSpec):GroundPlan{
 const old=cache.get(spec);if(old)return old;
 const polys:PlanPoint[][]=[],lifts:number[]=[],piers:{x:number;z:number;r:number}[]=[];let round=false;
 // a body that starts above the ground with nothing big touching the ground: the generator lifted it on legs
 let liftedBody=false,groundBody=false;
 for(const p of spec.parts){if(p.lod<2||tilted(p)||p.shape!=='box'&&p.shape!=='cylinder')continue;const b=partBounds(p);if(b.maxY-b.minY<.5||(b.maxX-b.minX)*(b.maxZ-b.minZ)<MASS_MIN_AREA)continue;if(b.minY>=GROUND_Y)liftedBody=true;else groundBody=true;}
 const raisedBody=liftedBody&&!groundBody;
 for(const p of spec.parts){
  if(tilted(p)||p.shape!=='box'&&p.shape!=='cylinder')continue;
  const b=partBounds(p),w=b.maxX-b.minX,d=b.maxZ-b.minZ,h=b.maxY-b.minY;
  if(b.minY>GROUND_Y)continue;
  if(raisedBody){
   // legs: narrow ground-touching uprights (staddle stones, posts); the stone mushroom caps sit above them and are not legs
   if(p.lod===2&&b.minY<.05&&h>=PIER_MIN_HEIGHT&&w<=PIER_MAX_WIDTH&&d<=PIER_MAX_WIDTH&&h>=Math.max(w,d)*.5)piers.push({x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2,r:Math.max(w,d)/2});
   continue;
  }
  if(p.lod<2||h<MASS_MIN_HEIGHT&&b.maxY<MASS_MIN_HEIGHT||w*d<MASS_MIN_AREA)continue;
  const yaw=p.rot?.[1]??0;
  lifts.push(Math.max(0,b.minY));
  if(p.shape==='box')polys.push(rect(p.pos[0],p.pos[2],p.size[0],p.size[2],yaw));
  else{round=true;polys.push(ngon(p.pos[0],p.pos[2],p.size[0]/2,p.size[2]/2,Math.max(8,p.sides??8),yaw));}
 }
 // an open shed (no wall mass): its stone base slab is the outline and its tall posts are the piers
 if(!polys.length&&!raisedBody){
  let best:Part|null=null,ba=0;
  for(const p of spec.parts){if(tilted(p)||p.shape!=='box'||p.lod<1)continue;const b=partBounds(p),a=(b.maxX-b.minX)*(b.maxZ-b.minZ);if(b.minY<.1&&b.maxY<=GROUND_Y+.2&&a>=3&&a>ba){ba=a;best=p;}}
  if(best){polys.push(rect(best.pos[0],best.pos[2],best.size[0],best.size[2],best.rot?.[1]??0));lifts.push(0);}
  for(const p of spec.parts){if(tilted(p)||p.lod<1||p.shape!=='box'&&p.shape!=='cylinder')continue;const b=partBounds(p),w=b.maxX-b.minX,d=b.maxZ-b.minZ;
   if(b.minY<.05&&b.maxY-b.minY>=1.2&&w<=.5&&d<=.5)piers.push({x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2,r:Math.max(w,d)/2});}
 }
 // nothing recognisable: the box around everything that touches the ground
 if(!polys.length&&!piers.length){
  let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
  for(const p of spec.parts){if(tilted(p)||p.lod<1||p.shape!=='box'&&p.shape!=='cylinder')continue;const b=partBounds(p);if(b.minY>.1||(b.maxX-b.minX)*(b.maxZ-b.minZ)<.4)continue;x0=Math.min(x0,b.minX);x1=Math.max(x1,b.maxX);z0=Math.min(z0,b.minZ);z1=Math.max(z1,b.maxZ);}
  if(x1-x0>=1&&z1-z0>=1){polys.push(rect((x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0,0));lifts.push(0);}
 }
 const plan:GroundPlan={polys,lifts,piers,...(spec.entry?{entry:spec.entry}:{}),raised:raisedBody&&piers.length>0,round};
 cache.set(spec,plan);return plan;
}

/** Offset a convex polygon outward by `m` metres (mitred corners). */
export function offsetPolygon(poly:readonly PlanPoint[],m:number):PlanPoint[]{
 const n=poly.length,out:PlanPoint[]=[];if(n<3)return poly.slice();
 let area=0;for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n];area+=a.x*b.z-b.x*a.z;}
 const sign=area>=0?1:-1;
 for(let i=0;i<n;i++){
  const p0=poly[(i+n-1)%n],p1=poly[i],p2=poly[(i+1)%n];
  const e1={x:p1.x-p0.x,z:p1.z-p0.z},e2={x:p2.x-p1.x,z:p2.z-p1.z},l1=Math.hypot(e1.x,e1.z)||1,l2=Math.hypot(e2.x,e2.z)||1;
  // outward normals of the two edges (for a positive-area polygon in x/z the outward normal is (dz,-dx))
  const n1={x:sign*e1.z/l1,z:-sign*e1.x/l1},n2={x:sign*e2.z/l2,z:-sign*e2.x/l2},bx=n1.x+n2.x,bz=n1.z+n2.z,bl=Math.hypot(bx,bz)||1,cos=Math.max(.35,(n1.x*n2.x+n1.z*n2.z+1)/2);
  out.push({x:p1.x+bx/bl*m/Math.sqrt(cos),z:p1.z+bz/bl*m/Math.sqrt(cos)});
 }
 return out;
}
