/** ITEM MESH BUILDER: a small, pure, deterministic triangle-mesh kit for weapons, tools and carried things. No three.js, no DOM, no Math.random.
 *
 *  BLUF: items are built from lofted tubes (shafts, limbs, cords, handles), lens-section blades (knapped flint, leaf, lozenge, sabre),
 *  dished plates (shields), helical lashings and boxes, all painted per vertex by a material `Paint` (grain, patina, rust, wear). The output
 *  (`positions`, `normals`, `colors`, `triangles`) has exactly the shape of `RigMeshData`, so it drops into the same geometry path the
 *  character rig already uses. Frames are metres; hand items have the grip at the origin, tip along +Y and the face along +Z. */
export type V3=[number,number,number];
export type RGB=[number,number,number];
export type LodTier=0|1|2;
/** colour at a surface point: local position, surface normal, t = 0..1 along the primitive's length, a = 0..1 around it (blades: |x|/halfwidth) */
export type TexMeta={/** layer of the detail atlas (itemTexture.ts TILE) */layer:number;/** planar mapping from the local position (shield faces, flat plates) instead of metric along/around */planar?:(p:V3)=>[number,number];/** repeats per metre across (u) and along (v) the surface */du:number;dv:number;
 /** up to two painted decals (cells of the decal atlas) mapped planar from the local position */
 decal?:{cellA:number;cellB:number;uv:(p:V3)=>[number,number];accA:RGB;accB:RGB}};
export type Paint=((p:V3,n:V3,t:number,a:number)=>RGB)&{tex?:TexMeta};
/** attach (or copy) surface-texture metadata onto a paint */
export const withTex=<P extends Paint>(p:P,tex:TexMeta|undefined):P=>{if(tex)p.tex=tex;return p;};
/** a derived paint keeps the texture of the paint it was made from */
export const likePaint=(f:(p:V3,n:V3,t:number,a:number)=>RGB,from:Paint):Paint=>withTex(f as Paint,from.tex);
export const TAU=Math.PI*2;
export const v3={
 add:(a:V3,b:V3):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a:V3,k:number):V3=>[a[0]*k,a[1]*k,a[2]*k],
 dot:(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 len:(a:V3)=>Math.hypot(a[0],a[1],a[2]),norm:(a:V3):V3=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];},
 lerp:(a:V3,b:V3,t:number):V3=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],
};
/** Deterministic PRNG (mulberry32). */
export function rng(seed:number){let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)>>>0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function hash32(...v:(number|string)[]){let h=0x811c9dc5;for(const x of v){const s=String(x);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}h^=0x2c;h=Math.imul(h,0x01000193);}return h>>>0;}
const ih=(x:number,y:number,z:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(z|0,2147483647)^Math.imul(s|0,1274126177);h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
/** Smooth value noise in 0..1. */
export function vnoise(x:number,y:number,z:number,s=0){
 const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),fx=x-xi,fy=y-yi,fz=z-zi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz);
 const c=(a:number,b:number,d:number)=>ih(xi+a,yi+b,zi+d,s),l=(a:number,b:number,t:number)=>a+(b-a)*t;
 return l(l(l(c(0,0,0),c(1,0,0),u),l(c(0,1,0),c(1,1,0),u),v),l(l(c(0,0,1),c(1,0,1),u),l(c(0,1,1),c(1,1,1),u),v),w);
}
export const hexRgb=(h:string):RGB=>{const s=h.length===4?'#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3]:h;return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255) as RGB;};
export const rgbMix=(a:RGB,b:RGB,t:number):RGB=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
export const mixHexColour=(a:string,b:string,t:number)=>{const m=rgbMix(hexRgb(a),hexRgb(b),t);return '#'+m.map(c=>Math.round(Math.max(0,Math.min(1,c))*255).toString(16).padStart(2,'0')).join('');};
export const flat=(hex:string):Paint=>{const c=hexRgb(hex);return ()=>c;};

type M=[number,number,number,number,number,number,number,number,number];
const mmul=(a:M,b:M):M=>[a[0]*b[0]+a[1]*b[3]+a[2]*b[6],a[0]*b[1]+a[1]*b[4]+a[2]*b[7],a[0]*b[2]+a[1]*b[5]+a[2]*b[8],a[3]*b[0]+a[4]*b[3]+a[5]*b[6],a[3]*b[1]+a[4]*b[4]+a[5]*b[7],a[3]*b[2]+a[4]*b[5]+a[5]*b[8],a[6]*b[0]+a[7]*b[3]+a[8]*b[6],a[6]*b[1]+a[7]*b[4]+a[8]*b[7],a[6]*b[2]+a[7]*b[5]+a[8]*b[8]];
const eulerM=(rx:number,ry:number,rz:number):M=>{
 const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
 return mmul(mmul([cy,0,sy,0,1,0,-sy,0,cy],[1,0,0,0,cx,-sx,0,sx,cx]),[cz,-sz,0,sz,cz,0,0,0,1]);
};
const I:M=[1,0,0,0,1,0,0,0,1];
const apply=(m:M,p:V3):V3=>[m[0]*p[0]+m[1]*p[1]+m[2]*p[2],m[3]*p[0]+m[4]*p[1]+m[5]*p[2],m[6]*p[0]+m[7]*p[1]+m[8]*p[2]];
/** Rotation taking +Y onto `dir`. */
export function alignY(dir:V3):M{
 const d=v3.norm(dir);if(d[1]>.99999)return I;if(d[1]<-.99999)return [1,0,0,0,-1,0,0,0,-1];
 const ax=v3.norm(v3.cross([0,1,0],d)),c=d[1],s=Math.sqrt(1-c*c),t=1-c,[x,y,z]=ax;
 return [t*x*x+c,t*x*y-s*z,t*x*z+s*y,t*x*y+s*z,t*y*y+c,t*y*z-s*x,t*x*z-s*y,t*y*z+s*x,t*z*z+c];
}
export type ItemMesh={positions:Float32Array;normals:Float32Array;colors:Float32Array;triangles:number;/** min/max corner, metres */bounds:{min:V3;max:V3};
 /** surface texture: (u,v,layer) per vertex; decal (u,v,cellA,cellB) per vertex; accents rgba8 x2 per vertex (decal colours). Absent on hand-built meshes. */
 uvs?:Float32Array;decals?:Float32Array;accents?:Uint8Array};
export type GridOpts={tex?:TexMeta;smooth?:boolean;capA?:boolean;capB?:boolean;flip?:boolean;/** wrap the ring around */closed?:boolean};
export type BladeOpts={
 /** along +Y from y0 to y1 */y0:number;y1:number;
 /** half-width at t (0 base..1 tip) */w:(t:number)=>number;
 /** half-thickness at t */th:(t:number)=>number;
 /** sideways bend (Z) at t */bend?:(t:number)=>number;
 /** sideways sweep (X) at t, for curved sabres */sweep?:(t:number)=>number;
 section?:'lens'|'diamond'|'flat'|'hollow';steps?:number;
 /** edge jitter in metres (knapped chips) */chip?:number;seed?:number;center?:V3;
};
const PAIRS=(n:number)=>Array.from({length:n},(_,i)=>i);

/** The builder. Every primitive is transformed by the current matrix stack, so a part can be authored in its own frame. */
export class MeshBuilder{
 P:number[]=[];N:number[]=[];C:number[]=[];U:number[]=[];D:number[]=[];A:number[]=[];
 private stack:{m:M;t:V3}[]=[{m:I,t:[0,0,0]}];
 readonly rnd:()=>number;
 readonly seed:number;readonly lod:LodTier;
 constructor(seed:number,lod:LodTier=0){this.seed=seed;this.lod=lod;this.rnd=rng(seed);}
 /** Pick by LOD: [near, mid, far]. */
 pick<T>(a:T,b:T,c:T):T{return this.lod===0?a:this.lod===1?b:c;}
 get m(){return this.stack[this.stack.length-1];}
 push(t:V3=[0,0,0],rot:V3=[0,0,0],m?:M){const c=this.m,r=m??eulerM(rot[0],rot[1],rot[2]);this.stack.push({m:mmul(c.m,r),t:v3.add(apply(c.m,t),c.t)});return this;}
 /** push with +Y aligned to a direction (a bone, a haft, a limb) */
 pushAlong(from:V3,to:V3){return this.push(from,[0,0,0],alignY(v3.sub(to,from)));}
 pop(){if(this.stack.length>1)this.stack.pop();return this;}
 with(t:V3,rot:V3,fn:()=>void){this.push(t,rot);fn();this.pop();}
 world(p:V3):V3{return v3.add(apply(this.m.m,p),this.m.t);}
 private tri(a:V3,b:V3,c:V3,na:V3,nb:V3,nc:V3,ca:RGB,cb:RGB,cc:RGB,ua?:[number,number],ub?:[number,number],uc?:[number,number],tex?:TexMeta){
  const {m,t}=this.m,layer=tex?tex.layer:0,dc=tex?.decal;
  const us=[ua,ub,uc];let i=0;
  for(const [p,n,k] of [[a,na,ca],[b,nb,cb],[c,nc,cc]] as [V3,V3,RGB][]){
   const w=v3.add(apply(m,p),t),wn=apply(m,n),uv=us[i++]??[0,0];this.P.push(w[0],w[1],w[2]);this.N.push(wn[0],wn[1],wn[2]);this.C.push(k[0],k[1],k[2]);
   this.U.push(uv[0],uv[1],layer);
   if(dc){const d=dc.uv(p);this.D.push(d[0],d[1],dc.cellA,dc.cellB);this.A.push(Math.round(dc.accA[0]*255),Math.round(dc.accA[1]*255),Math.round(dc.accA[2]*255),255,Math.round(dc.accB[0]*255),Math.round(dc.accB[1]*255),Math.round(dc.accB[2]*255),255);}
   else{this.D.push(0,0,0,0);this.A.push(0,0,0,0,0,0,0,0);}
  }
 }
 get triangles(){return this.P.length/9;}
 /** A grid of rings (rows along the length, columns around). Auto-oriented outward from the centroid unless `flip` is given. */
 grid(rings:V3[][],paint:Paint,o:GridOpts={}){
  const R=rings.length,Cn=rings[0].length,closed=o.closed!==false;if(R<2||Cn<2)return this;
  const cols=closed?Cn:Cn-1,idx=(i:number,j:number)=>rings[i][(j%Cn)];
  let cx=0,cy=0,cz=0,cnt=0;for(const r of rings)for(const p of r){cx+=p[0];cy+=p[1];cz+=p[2];cnt++;}const cen:V3=[cx/cnt,cy/cnt,cz/cnt];
  // orientation: majority vote of face normal vs outward direction
  let vote=0;
  const fn=(a:V3,b:V3,c:V3)=>v3.cross(v3.sub(b,a),v3.sub(c,a));
  for(let i=0;i<R-1;i++)for(let j=0;j<cols;j++){const a=idx(i,j),b=idx(i,j+1),c=idx(i+1,j),n=fn(a,b,c);vote+=v3.dot(n,v3.sub(a,cen))>0?1:-1;}
  const sgn=o.flip===undefined?(vote>=0?1:-1):(o.flip?-1:1),smooth=o.smooth!==false;
  const nrm:V3[][]=rings.map(r=>r.map(()=>[0,0,0] as V3));
  const tex=o.tex??paint.tex,du=tex?.du??1,dv=tex?.dv??1;
  // metric surface coordinates: v = distance along the rows, u = distance around each ring (the closing column gets its own unwrapped value)
  const rowV:number[]=[0],colU:number[][]=[];
  for(let i=0;i<R;i++){
   const row=rings[i],cu=[0];for(let j=1;j<Cn;j++)cu.push(cu[j-1]+v3.len(v3.sub(row[j],row[j-1])));
   cu.push(cu[Cn-1]+v3.len(v3.sub(row[0],row[Cn-1])));colU.push(cu);
   if(i>0){const a=rings[i-1],cx0=a.reduce((s,p)=>s+p[0],0)/Cn,cy0=a.reduce((s,p)=>s+p[1],0)/Cn,cz0=a.reduce((s,p)=>s+p[2],0)/Cn,cx1=row.reduce((s,p)=>s+p[0],0)/Cn,cy1=row.reduce((s,p)=>s+p[1],0)/Cn,cz1=row.reduce((s,p)=>s+p[2],0)/Cn;
    rowV.push(rowV[i-1]+Math.hypot(cx1-cx0,cy1-cy0,cz1-cz0));}
  }
  const pl=tex?.planar,uvOf=(r:number,uc:number):[number,number]=>pl?pl(rings[r][uc%Cn]):[colU[r][uc]*du,rowV[r]*dv];
  const faces:{a:[number,number,number];b:[number,number,number];c:[number,number,number];n:V3}[]=[];
  for(let i=0;i<R-1;i++)for(let j=0;j<cols;j++){
   const j1=(j+1)%Cn,q=[[i,j,j],[i,j1,j+1],[i+1,j1,j+1],[i+1,j,j]] as [number,number,number][];
   for(const tri of [[q[0],q[1],q[2]],[q[0],q[2],q[3]]] as [number,number,number][][]){
    const n=v3.mul(fn(rings[tri[0][0]][tri[0][1]],rings[tri[1][0]][tri[1][1]],rings[tri[2][0]][tri[2][1]]),sgn);
    faces.push({a:tri[0],b:tri[1],c:tri[2],n});for(const [r,c] of tri){const t=nrm[r][c];t[0]+=n[0];t[1]+=n[1];t[2]+=n[2];}
   }
  }
  const col=(i:number,j:number,n:V3)=>paint(rings[i][j%Cn],n,i/(R-1),(j%Cn)/(closed?Cn:Cn-1||1));
  for(const f of faces){
   const nf=v3.norm(f.n),pa=rings[f.a[0]][f.a[1]],pb=rings[f.b[0]][f.b[1]],pc=rings[f.c[0]][f.c[1]];
   const na=smooth?v3.norm(nrm[f.a[0]][f.a[1]]):nf,nb=smooth?v3.norm(nrm[f.b[0]][f.b[1]]):nf,nc=smooth?v3.norm(nrm[f.c[0]][f.c[1]]):nf;
   if(v3.len(v3.cross(v3.sub(pb,pa),v3.sub(pc,pa)))<1e-12)continue; // degenerate (tip rings)
   const ua=uvOf(f.a[0],f.a[2]),ub=uvOf(f.b[0],f.b[2]),uc=uvOf(f.c[0],f.c[2]);
   if(sgn>0)this.tri(pa,pb,pc,na,nb,nc,col(f.a[0],f.a[1],nf),col(f.b[0],f.b[1],nf),col(f.c[0],f.c[1],nf),ua,ub,uc,tex);
   else this.tri(pa,pc,pb,na,nc,nb,col(f.a[0],f.a[1],nf),col(f.c[0],f.c[1],nf),col(f.b[0],f.b[1],nf),ua,uc,ub,tex);
  }
  const cap=(ri:number,t:number)=>{
   const ring=rings[ri];let sx=0,sy=0,sz=0;for(const p of ring){sx+=p[0];sy+=p[1];sz+=p[2];}const c:V3=[sx/Cn,sy/Cn,sz/Cn];
   const outward=v3.sub(c,cen);let n:V3=v3.norm(v3.cross(v3.sub(ring[1],ring[0]),v3.sub(ring[2%Cn],ring[0])));
   const probe=v3.len(outward)>1e-9?outward:(t===0?v3.sub(rings[0][0],rings[R-1][0]):v3.sub(rings[R-1][0],rings[0][0]));
   if(v3.dot(n,probe)<0)n=v3.mul(n,-1);
   for(let j=0;j<Cn-(closed?0:1);j++){
    const a=ring[j],b=ring[(j+1)%Cn];if(v3.len(v3.cross(v3.sub(b,a),v3.sub(c,a)))<1e-12)continue;
    const w=v3.dot(v3.cross(v3.sub(b,a),v3.sub(c,a)),n)>0;
    const k=paint(c,n,t,.5),ka=paint(a,n,t,j/Cn),kb=paint(b,n,t,(j+1)/Cn);
    const e1=v3.norm(v3.sub(ring[0],c)),e2=v3.norm(v3.cross(n,e1)),cuv=(p:V3):[number,number]=>{const d=v3.sub(p,c);return [v3.dot(d,e1)*du,v3.dot(d,e2)*dv];};
    if(w)this.tri(a,b,c,n,n,n,ka,kb,k,cuv(a),cuv(b),cuv(c),tex);else this.tri(a,c,b,n,n,n,ka,k,kb,cuv(a),cuv(c),cuv(b),tex);
   }
  };
  if(o.capA&&closed)cap(0,0);if(o.capB&&closed)cap(R-1,1);
  return this;
 }
 /** Lofted tube along a path with parallel-transport frames. `r(t)` is a radius or [across, along-binormal] ellipse. */
 tube(path:V3[],r:(t:number)=>number|[number,number],sides:number,paint:Paint,o:{caps?:boolean|'a'|'b';smooth?:boolean;twist?:number;phase?:number}={}){
  const n=path.length;if(n<2)return this;
  const T=path.map((p,i)=>v3.norm(v3.sub(path[Math.min(n-1,i+1)],path[Math.max(0,i-1)])));
  let ref:V3=Math.abs(T[0][1])<.9?[0,1,0]:[1,0,0];let nrm=v3.norm(v3.cross(T[0],v3.cross(ref,T[0])));
  const rings:V3[][]=[];
  for(let i=0;i<n;i++){
   if(i>0){const axis=v3.cross(T[i-1],T[i]),s=v3.len(axis);if(s>1e-7){const k=v3.norm(axis),c=v3.dot(T[i-1],T[i]),sn=s,d=v3.dot(k,nrm);nrm=v3.norm(v3.add(v3.add(v3.mul(nrm,c),v3.mul(v3.cross(k,nrm),sn)),v3.mul(k,d*(1-c))));}}
   const bin=v3.cross(T[i],nrm),t=i/(n-1),rr=r(t),[ra,rb]=Array.isArray(rr)?rr:[rr,rr],tw=(o.twist??0)*t+(o.phase??0),ring:V3[]=[];
   for(let j=0;j<sides;j++){const a=j/sides*TAU+tw;ring.push(v3.add(path[i],v3.add(v3.mul(nrm,Math.cos(a)*ra),v3.mul(bin,Math.sin(a)*rb))));}
   rings.push(ring);
  }
  return this.grid(rings,paint,{smooth:o.smooth!==false,capA:o.caps===true||o.caps==='a'||o.caps===undefined,capB:o.caps===true||o.caps==='b'||o.caps===undefined});
 }
 /** Straight tube from a to b with a radius profile. */
 rod(a:V3,b:V3,r:(t:number)=>number|[number,number],sides:number,paint:Paint,o:{segs?:number;caps?:boolean|'a'|'b';smooth?:boolean;twist?:number}={}){
  const segs=o.segs??2,path=Array.from({length:segs+1},(_,i)=>v3.lerp(a,b,i/segs));return this.tube(path,r,sides,paint,o);
 }
 /** Cylinder-ish convenience: constant radius. */
 cyl(a:V3,b:V3,rad:number,sides:number,paint:Paint,caps=true){return this.rod(a,b,()=>rad,sides,paint,{segs:1,caps});}
 ellipsoid(c:V3,rad:V3,paint:Paint,seg=8,o:{rot?:V3}={}){
  const rings:V3[][]=[];const m=o.rot?eulerM(...o.rot):I;
  for(let i=0;i<=seg;i++){const th=i/seg*Math.PI,y=Math.cos(th)*rad[1],rr=Math.max(.0001,Math.sin(th));const ring:V3[]=[];
   for(let j=0;j<seg*2;j++){const a=j/(seg*2)*TAU;ring.push(v3.add(c,apply(m,[Math.cos(a)*rad[0]*rr,y,Math.sin(a)*rad[2]*rr])));}rings.push(ring);}
  return this.grid(rings,paint,{smooth:true});
 }
 /** Rectangular lofted block: sections {y,w,d,cx,cz} stacked along Y (taper, bevel, wedge). Flat shaded. */
 loftRect(sec:{y:number;w:number;d:number;cx?:number;cz?:number}[],paint:Paint,o:{caps?:boolean}={}){
  const rings=sec.map(s=>{const cx=s.cx??0,cz=s.cz??0,hw=s.w/2,hd=s.d/2;return [[cx-hw,s.y,cz-hd],[cx+hw,s.y,cz-hd],[cx+hw,s.y,cz+hd],[cx-hw,s.y,cz+hd]] as V3[];});
  return this.grid(rings,paint,{smooth:false,capA:o.caps!==false,capB:o.caps!==false});
 }
 /** Loft along an axis: sections at centres `c` with extents w (across) and h (up/other): rect, chamfered 'oct', or 'round'. Axis x: w=Z,h=Y; y: w=X,h=Z; z: w=X,h=Y. */
 loft(secs:{c:V3;w:number;h:number}[],axis:'x'|'y'|'z',paint:Paint,o:{shape?:'rect'|'oct'|'round';sides?:number;caps?:boolean;smooth?:boolean}={}){
  const shape=o.shape??'rect',n=o.sides??(this.lod===0?12:this.lod===1?8:6);
  const pts:[number,number][]=shape==='rect'?[[-1,-1],[1,-1],[1,1],[-1,1]]:shape==='oct'?[[-1,-.55],[-.55,-1],[.55,-1],[1,-.55],[1,.55],[.55,1],[-.55,1],[-1,.55]]
   :Array.from({length:n},(_,j)=>[Math.cos(j/n*TAU),Math.sin(j/n*TAU)] as [number,number]);
  const rings=secs.map(s=>pts.map(([u,v])=>{const a=u*s.w/2,b=v*s.h/2;return (axis==='y'?[s.c[0]+a,s.c[1],s.c[2]+b]:axis==='z'?[s.c[0]+a,s.c[1]+b,s.c[2]]:[s.c[0],s.c[1]+b,s.c[2]+a]) as V3;}));
  return this.grid(rings,paint,{smooth:o.smooth??shape==='round',capA:o.caps!==false,capB:o.caps!==false});
 }
 box(size:V3,c:V3,paint:Paint,rot?:V3){
  if(rot)this.push(c,rot);else this.push(c);
  this.loftRect([{y:-size[1]/2,w:size[0],d:size[2]},{y:size[1]/2,w:size[0],d:size[2]}],paint);this.pop();return this;
 }
 /** A flat-ish blade: lens, diamond, hollow-ground or flat section; width/thickness profiles; optional chipped edge. */
 blade(o:BladeOpts,paint:Paint){
  const steps=o.steps??this.pick(14,9,5),R=rng(o.seed??this.seed),rings:V3[][]=[],cx=o.center??[0,0,0],chip=this.lod===2?0:(o.chip??0);
  const sec=o.section??'lens';
  const prof:[number,number][]=sec==='flat'?[[-1,0],[-1,.9],[0,1],[1,.9],[1,0],[1,-.9],[0,-1],[-1,-.9]]
   :sec==='diamond'?[[-1,0],[-.5,.62],[0,1],[.5,.62],[1,0],[.5,-.62],[0,-1],[-.5,-.62]]
   :sec==='hollow'?[[-1,0],[-.62,.55],[-.2,.62],[.2,.62],[.62,.55],[1,0],[.62,-.55],[.2,-.62],[-.2,-.62],[-.62,-.55]]
   :[[-1,0],[-.72,.72],[0,1],[.72,.72],[1,0],[.72,-.72],[0,-1],[-.72,-.72]];
  const jit:number[][]=[];
  for(let i=0;i<=steps;i++){const t=i/steps,y=o.y0+(o.y1-o.y0)*t,w=Math.max(0,o.w(t)),th=Math.max(.0004,o.th(t)),bz=o.bend?.(t)??0,sx=o.sweep?.(t)??0;
   const ch=chip>0&&i>0&&i<steps?[(R()-.5)*chip,(R()-.5)*chip]:[0,0];jit.push(ch);
   rings.push(prof.map(([u,v])=>{const side=u<0?0:1,e=Math.abs(u)>.9?ch[side]:0;return [cx[0]+sx+u*(w+e),cx[1]+y,cx[2]+bz+v*th] as V3;}));}
  return this.grid(rings,(p,n,t,a)=>paint(p,n,t,Math.min(1,Math.abs(p[0]-cx[0])/Math.max(.001,o.w(t)||.001))),{smooth:false,capA:true,capB:false,tex:paint.tex});
 }
 /** Helical lashing from a to b around radius r. Near: a real wound cord; mid: fewer turns; far: a dark band. */
 lash(a:V3,b:V3,r:number,turns:number,cord:number,paint:Paint){
  if(this.lod===2){this.rod(a,b,()=>r+cord*.6,6,paint,{segs:1});return this;}
  const steps=Math.max(6,Math.round(turns*this.pick(7,5,3))),dir=v3.sub(b,a),L=v3.len(dir),al=alignY(dir),path:V3[]=[];
  for(let i=0;i<=steps;i++){const t=i/steps,ang=t*turns*TAU;path.push(v3.add(a,apply(al,[Math.cos(ang)*r,t*L,Math.sin(ang)*r])));}
  return this.tube(path,()=>cord,this.pick(5,4,3),paint,{caps:true});
 }
 /** A closed ring (torus) in a plane given by its axis. */
 ring(c:V3,axis:V3,R:number,r:number,paint:Paint,seg=16,sides=5){
  const al=alignY(axis),path:V3[]=[];for(let i=0;i<=seg;i++){const a=i/seg*TAU;path.push(v3.add(c,apply(al,[Math.cos(a)*R,0,Math.sin(a)*R])));}
  return this.tube(path,()=>r,sides,paint,{caps:false});
 }
 /** Dished plate from a 2D outline (counter-clockwise, in X/Y), domed forward by `dome` and `zFn`, thickness `thick`; used for shields. */
 dish(outline:[number,number][],rings:number,zFn:(s:number,j:number)=>number,thick:number,paint:Paint,backPaint?:Paint){
  const Cn=outline.length,make=(side:1|-1)=>{const g:V3[][]=[];for(let k=0;k<=rings;k++){const s=k/rings;g.push(outline.map(([x,y],j)=>[x*s,y*s,zFn(s,j)+side*thick/2] as V3));}return g;};
  const front=make(1),back=make(-1);
  this.grid(front,paint,{smooth:true,flip:false});this.grid(back,backPaint??paint,{smooth:true,flip:true});
  this.grid([front[rings],back[rings]],paint,{smooth:true});
  return this;
 }
 finish():ItemMesh{
  const positions=new Float32Array(this.P),normals=new Float32Array(this.N),colors=new Float32Array(this.C);
  const min:V3=[Infinity,Infinity,Infinity],max:V3=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<positions.length;i+=3)for(let k=0;k<3;k++){min[k]=Math.min(min[k],positions[i+k]);max[k]=Math.max(max[k],positions[i+k]);}
  if(!positions.length){for(let k=0;k<3;k++){min[k]=0;max[k]=0;}}
  return {positions,normals,colors,triangles:positions.length/9,bounds:{min,max},uvs:new Float32Array(this.U),decals:new Float32Array(this.D),accents:new Uint8Array(this.A)};
 }
}
export function meshIsFinite(m:ItemMesh){for(const a of [m.positions,m.normals,m.colors])for(let i=0;i<a.length;i++)if(!Number.isFinite(a[i]))return false;return true;}
export function mergeMeshes(parts:ItemMesh[]):ItemMesh{
 const n=parts.reduce((s,p)=>s+p.positions.length,0),nv=n/3,positions=new Float32Array(n),normals=new Float32Array(n),colors=new Float32Array(n),uvs=new Float32Array(nv*3),decals=new Float32Array(nv*4),accents=new Uint8Array(nv*8);let o=0,ov=0;
 for(const p of parts){positions.set(p.positions,o);normals.set(p.normals,o);colors.set(p.colors,o);if(p.uvs)uvs.set(p.uvs,ov*3);if(p.decals)decals.set(p.decals,ov*4);if(p.accents)accents.set(p.accents,ov*8);o+=p.positions.length;ov+=p.positions.length/3;}
 const b=new MeshBuilder(0);b.P=Array.from(positions);return {...b.finish(),normals,colors,uvs,decals,accents};
}
void PAIRS;
