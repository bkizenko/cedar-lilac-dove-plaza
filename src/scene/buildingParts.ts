/** Pure structural part specs for procedural buildings. No three.js import:
 * generators emit plain parts that tests can measure and the thin adapter in
 * carvedBuildingLayer.ts turns into merged, vertex-coloured geometry.
 *
 * Conventions match ART_DIRECTION.md: metres, Y up, origin at footprint
 * base centre, entrance faces +Z. `pos` is the centre of the part's base
 * (y = bottom of the part before rotation about that base point). */
import type {CarvedMaterialId} from './carvedPalette';

/** box: w × h × d. cylinder: size[0] = bottom diameter, size[2] = top diameter
 * (taper), size[1] = height. cone: size[0] = base diameter, size[1] = height.
 * prism: gable roof, triangle in X/Y (w × rise), extruded along Z (d).
 * wedge: lean-to slope, full height at -Z edge falling to zero at +Z.
 * sphere: ellipsoid w × h × d resting on its base.
 * pyramid: square/rectangular base w × d (axis-aligned in the part frame),
 *   apex at height h; used for tower and gate caps so the cap really covers
 *   the masonry below (a 4-sided cone would be inset by 1/sqrt2).
 * hip: hipped roof, base w × d, ridge along Z shortened by `inset` at each end. */
export type PartShape='box'|'cylinder'|'cone'|'prism'|'wedge'|'sphere'|'pyramid'|'hip';
/** Coarsest LOD tier at which a part is still drawn: 2 = core massing
 * (near, mid and far), 1 = near and mid, 0 = near-only detail. */
export type LodTier=0|1|2;
export type Part={shape:PartShape;size:readonly [number,number,number];pos:readonly [number,number,number];
 rot?:readonly [number,number,number];mat:CarvedMaterialId;lod:LodTier;sides?:number;
 /** Impostor parts drawn only at tiers >= onlyFrom (e.g. a far palisade wall). */
 onlyFrom?:LodTier;
 /** Hip roof: ridge shortening at each end in metres (shape 'hip' only). */
 inset?:number;
 /** Beam endpoints, kept so footprint fitting can rebuild the beam exactly. */
 ends?:readonly [readonly [number,number,number],readonly [number,number,number]]};
export type BuildingSpec={family:string;variantKey:string;footprint:{w:number;d:number};parts:Part[];
 entry?:{x:number;z:number;width:number};notes:{reference:string}};

export const LOD_DISTANCES_METRES=[30,70,120] as const;

/** Deterministic small PRNG (mulberry32); same seed gives the same building. */
export function seededRandom(seed:number){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function hashSeed(...values:(number|string)[]){let h=0x811c9dc5;for(const v of values){const s=String(v);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}h^=0x2c;h=Math.imul(h,0x01000193);}return h>>>0;}
export type Rng=ReturnType<typeof seededRandom>;
export const range=(r:Rng,lo:number,hi:number)=>lo+(hi-lo)*r();
export const pick=<T,>(r:Rng,items:readonly T[])=>items[Math.min(items.length-1,Math.floor(r()*items.length))];
export const chance=(r:Rng,p:number)=>r()<p;

export function part(shape:PartShape,mat:CarvedMaterialId,size:[number,number,number],pos:[number,number,number],lod:LodTier=2,rot?:[number,number,number],sides?:number):Part{
 return rot?{shape,mat,size,pos,lod,rot,...(sides?{sides}:{})}:{shape,mat,size,pos,lod,...(sides?{sides}:{})};
}
/** A straight post/beam between two points, as a thin box. */
export function beam(mat:CarvedMaterialId,a:[number,number,number],b:[number,number,number],thick=.14,lod:LodTier=1):Part{
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz),yaw=Math.atan2(dx,dz),pitch=Math.atan2(Math.hypot(dx,dz),dy);
 // Box height runs along the beam; rotate local Y onto (dx,dy,dz) about its base point a.
 // Lift by the half-thickness swing so a tilted post's foot never dips below its base point.
 return {shape:'box',mat,size:[thick,len,thick],pos:[a[0],a[1]+thick/2*Math.abs(Math.sin(pitch)),a[2]],rot:[pitch,yaw,0],lod,ends:[a,b]};
}

/** Rotation order Y·X·Z applied about the part's base centre (three.js
 * Euler order 'YXZ'). Exported so the mesh builder and adapter agree. */
export function rotatePoint(v:[number,number,number],rot:readonly [number,number,number]):[number,number,number]{return rotate(v,rot);}
function rotate(v:[number,number,number],rot:readonly [number,number,number]):[number,number,number]{
 const [rx,ry,rz]=rot;let [x,y,z]=v;
 // Z
 let c=Math.cos(rz),s=Math.sin(rz);[x,y]=[x*c-y*s,x*s+y*c];
 // X
 c=Math.cos(rx);s=Math.sin(rx);[y,z]=[y*c-z*s,y*s+z*c];
 // Y
 c=Math.cos(ry);s=Math.sin(ry);[x,z]=[x*c+z*s,-x*s+z*c];
 return [x,y,z];
}
export function partCorners(p:Part):[number,number,number][]{
 const [w,h,d]=p.size,round=p.shape==='cylinder'||p.shape==='cone',hw=(round?Math.max(w,d):w)/2,hd=(round?Math.max(w,d):d)/2;
 const out:[number,number,number][]=[];
 for(const x of[-hw,hw])for(const y of[0,h])for(const z of[-hd,hd]){const r=p.rot?rotate([x,y,z],p.rot):[x,y,z] as [number,number,number];out.push([r[0]+p.pos[0],r[1]+p.pos[1],r[2]+p.pos[2]]);}
 return out;
}
export type Bounds={minX:number;maxX:number;minY:number;maxY:number;minZ:number;maxZ:number};
export function partBounds(p:Part):Bounds{
 const b={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
 for(const [x,y,z] of partCorners(p)){b.minX=Math.min(b.minX,x);b.maxX=Math.max(b.maxX,x);b.minY=Math.min(b.minY,y);b.maxY=Math.max(b.maxY,y);b.minZ=Math.min(b.minZ,z);b.maxZ=Math.max(b.maxZ,z);}
 return b;
}
export function specBounds(spec:BuildingSpec):Bounds{
 const b={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
 for(const p of spec.parts){const q=partBounds(p);b.minX=Math.min(b.minX,q.minX);b.maxX=Math.max(b.maxX,q.maxX);b.minY=Math.min(b.minY,q.minY);b.maxY=Math.max(b.maxY,q.maxY);b.minZ=Math.min(b.minZ,q.minZ);b.maxZ=Math.max(b.maxZ,q.maxZ);}
 return b;
}
/** Parts present at an LOD tier (0 near, 1 mid, 2 far). */
export function partsAtLod(spec:BuildingSpec,tier:LodTier){return spec.parts.filter(p=>p.lod>=tier&&(p.onlyFrom??0)<=tier);}
/** Mark a part as a far-LOD impostor. */
export function far(p:Part):Part{return {...p,lod:2,onlyFrom:2};}
export function lodForDistance(metres:number):LodTier{return metres<LOD_DISTANCES_METRES[0]?0:metres<LOD_DISTANCES_METRES[1]?1:2;}
/** Render tier including the far impostor card (3) beyond the last LOD distance. */
export type RenderTier=LodTier|3;
export function renderTierForDistance(metres:number):RenderTier{return metres>=LOD_DISTANCES_METRES[2]?3:lodForDistance(metres);}

/** Uniformly shrink X/Z (never Y) so every part stays inside footprint minus
 * margin. Generators already aim inside; this is a final guarantee so no
 * base, eave or wheel ever exceeds the navigation rectangle. */
export function fitToFootprint(spec:BuildingSpec,margin=.1,marginZ=margin):BuildingSpec{
 const b=specBounds(spec),hw=spec.footprint.w/2-margin,hd=spec.footprint.d/2-marginZ;
 const s=Math.min(1,hw/Math.max(1e-6,Math.abs(b.minX),Math.abs(b.maxX)),hd/Math.max(1e-6,Math.abs(b.minZ),Math.abs(b.maxZ)));
 if(s>=1)return spec;
 const parts=spec.parts.map(p=>{
  if(p.ends){const [a,b]=p.ends;return {...beam(p.mat,[a[0]*s,a[1],a[2]*s],[b[0]*s,b[1],b[2]*s],p.size[0],p.lod),...(p.onlyFrom!==undefined?{onlyFrom:p.onlyFrom}:{})};}
  // Scale the part's extents in its own frame only along axes that map to world X/Z.
  // Yaw-only or unrotated parts scale exactly; tilted beams scale conservatively.
  const tilted=p.rot&&(Math.abs(p.rot[0])>1e-6||Math.abs(p.rot[2])>1e-6);
  const size:[number,number,number]=tilted?[p.size[0]*s,p.size[1]*s,p.size[2]*s]:[p.size[0]*s,p.size[1],p.size[2]*s];
  const pos:[number,number,number]=[p.pos[0]*s,tilted?p.pos[1]:p.pos[1],p.pos[2]*s];
  return {...p,size,pos,...(p.inset!==undefined?{inset:p.inset*s}:{})};
 });
 const entry=spec.entry?{x:spec.entry.x*s,z:spec.entry.z*s,width:spec.entry.width*s}:undefined;
 return {...spec,parts,...(entry?{entry}:{})};
}

/** A part is supported when it rests on the ground or touches another part.
 * Returns indices of unsupported (floating) parts; used by tests. */
export function floatingParts(spec:BuildingSpec,tolerance=.06){
 const bounds=spec.parts.map(partBounds),out:number[]=[];
 const touches=(a:Bounds,b:Bounds)=>a.minX<=b.maxX+tolerance&&a.maxX>=b.minX-tolerance&&a.minY<=b.maxY+tolerance&&a.maxY>=b.minY-tolerance&&a.minZ<=b.maxZ+tolerance&&a.maxZ>=b.minZ-tolerance;
 // Flood from ground-contact parts so a chain of parts must reach the ground.
 const grounded=new Set<number>();bounds.forEach((b,i)=>{if(b.minY<=tolerance)grounded.add(i);});
 let grew=true;while(grew){grew=false;for(let i=0;i<bounds.length;i++){if(grounded.has(i))continue;for(const j of grounded)if(touches(bounds[i],bounds[j])){grounded.add(i);grew=true;break;}}}
 for(let i=0;i<bounds.length;i++)if(!grounded.has(i))out.push(i);
 return out;
}

/** Triangles for one part at its declared segment count. carvedMesh.ts emits
 * exactly this many (tested), so budgets are counts, not guesses. */
export const SPHERE_SEGMENTS={lon:8,lat:6} as const;
export function partTriangles(p:Part){
 const n=p.sides??8;
 switch(p.shape){case 'box':return 12;case 'prism':return 8;case 'wedge':return 8;case 'hip':return 8;case 'pyramid':return 6;case 'cone':return n*2;case 'cylinder':return n*4;case 'sphere':return SPHERE_SEGMENTS.lon*2+SPHERE_SEGMENTS.lon*(SPHERE_SEGMENTS.lat-2)*2;}
}
export function specTriangles(spec:BuildingSpec,tier:LodTier){return partsAtLod(spec,tier).reduce((sum,p)=>sum+partTriangles(p),0);}

/** Compact structural fingerprint used by tests to prove variation is
 * structural (massing, roof form, part mix), not a recolour. Materials are
 * deliberately excluded. */
export function structuralSignature(spec:BuildingSpec){
 const b=specBounds(spec),shapes:Record<string,number>={};
 for(const p of spec.parts)shapes[p.shape]=(shapes[p.shape]??0)+1;
 const roof=spec.parts.find(p=>p.shape==='prism'||p.shape==='hip'||p.shape==='cone'||p.shape==='pyramid'||p.shape==='wedge');
 const pitch=roof?(roof.size[1]/Math.max(.01,roof.size[0]/2)).toFixed(1):'none';
 return [spec.family,(b.maxX-b.minX).toFixed(1),(b.maxZ-b.minZ).toFixed(1),b.maxY.toFixed(1),pitch,spec.entry?`${spec.entry.x.toFixed(1)},${spec.entry.z.toFixed(1)}`:'-',Object.entries(shapes).sort().map(([k,v])=>k+v).join('.')].join('|');
}
