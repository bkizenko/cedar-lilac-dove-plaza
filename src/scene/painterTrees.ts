import * as THREE from 'three';
/** Painterly vegetation geometry: soft clustered crowns with baked light/shade vertex colour (warm tops, cool undersides, dark crown core),
 * tapered trunks with root flare, layered conifer skirts, weeping willow strands, arched palm fronds, birch and cypress, plus clump
 * undergrowth. Pure geometry builders (deterministic, no state). Every tree is rooted at y=0 and stays inside the kit's vertex budget. */
export type V3=[number,number,number];
export const PAINTER_TREE_BUDGET=2600;
export function rngFrom(seed:number){let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const lin=(h:string):V3=>{const c=new THREE.Color(h);return [c.r,c.g,c.b];};
const mix=(a:V3,b:V3,t:number):V3=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const clamp=(v:number,a=0,b=1)=>v<a?a:v>b?b:v;
function ensure(g:THREE.BufferGeometry){
 const n=g.attributes.position.count;
 if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(n*2),2));
 if(!g.attributes.normal)g.computeVertexNormals();
 if(!g.attributes.color){const c=new Float32Array(n*3).fill(1);g.setAttribute('color',new THREE.BufferAttribute(c,3));}
 for(const key of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(key))g.deleteAttribute(key);
 return g;
}
/** Weld coincident vertices (position only) so soft shapes get smooth normals; independent of any addon implementation. */
export function weld(src:THREE.BufferGeometry){
 const p=src.attributes.position,map=new Map<string,number>(),out:number[]=[],idx:number[]=[];
 for(let i=0;i<p.count;i++){const key=`${Math.round(p.getX(i)*1e4)},${Math.round(p.getY(i)*1e4)},${Math.round(p.getZ(i)*1e4)}`;let j=map.get(key);if(j===undefined){j=out.length/3;map.set(key,j);out.push(p.getX(i),p.getY(i),p.getZ(i));}idx.push(j);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out,3));g.setIndex(idx);return g;
}
export function mergeParts(parts:THREE.BufferGeometry[]){
 // Own concatenation (not an addon): keeps shared vertices when every part is indexed, so welded crowns stay small and smooth.
 for(const g of parts)ensure(g);
 const allIndexed=parts.every(g=>g.index),list=allIndexed?parts:parts.map(g=>{if(!g.index)return g;const flat=g.toNonIndexed();g.dispose();return flat;});
 let verts=0,indices=0;for(const g of list){verts+=g.attributes.position.count;indices+=g.index?g.index.count:0;}
 const P=new Float32Array(verts*3),N=new Float32Array(verts*3),U=new Float32Array(verts*2),C=new Float32Array(verts*3),I=allIndexed?new Uint32Array(indices):null;
 let vo=0,io=0;
 for(const g of list){const n=g.attributes.position.count;P.set(g.attributes.position.array as Float32Array,vo*3);N.set(g.attributes.normal.array as Float32Array,vo*3);U.set(g.attributes.uv.array as Float32Array,vo*2);C.set(g.attributes.color.array as Float32Array,vo*3);
  if(I&&g.index){for(let i=0;i<g.index.count;i++)I[io++]=g.index.getX(i)+vo;}vo+=n;g.dispose();}
 const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.BufferAttribute(P,3));out.setAttribute('normal',new THREE.BufferAttribute(N,3));out.setAttribute('uv',new THREE.BufferAttribute(U,2));out.setAttribute('color',new THREE.BufferAttribute(C,3));
 if(I)out.setIndex(new THREE.BufferAttribute(I,1));out.computeBoundingBox();out.computeBoundingSphere();return out;
}
/** Soft crown lump: an icosphere pushed around by low-frequency value noise, with baked light.
 * rel=(vertex-crownCenter)/crownRadius drives the top-light / core-shade gradient. */
export function lump(c:V3,r:V3,seed:number,crown:{center:V3;radius:number;top:V3;bottom:V3;jitter?:number},bump=.16,detail=2){
 const raw=new THREE.IcosahedronGeometry(1,detail);raw.deleteAttribute('normal');raw.deleteAttribute('uv');const g=weld(raw);raw.dispose();const rnd=rngFrom(seed),pos=g.attributes.position,colors=new Float32Array(pos.count*3);
 const phase=[rnd()*6.28,rnd()*6.28,rnd()*6.28],jit=crown.jitter??.1;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),len=Math.hypot(x,y,z)||1,ux=x/len,uy=y/len,uz=z/len;
  const d=1+bump*(Math.sin(ux*3.1+phase[0])*Math.sin(uy*2.7+phase[1])+Math.sin(uz*3.7+phase[2])*Math.cos(ux*2.3+phase[1]))*.6+bump*.35*Math.sin(ux*7+uy*5+uz*6+phase[2]);
  const px=c[0]+ux*r[0]*d,py=c[1]+uy*r[1]*d,pz=c[2]+uz*r[2]*d;pos.setXYZ(i,px,py,pz);
  const rx=(px-crown.center[0])/crown.radius,ry=(py-crown.center[1])/crown.radius,rz=(pz-crown.center[2])/crown.radius;
  const t=clamp(.5+.5*(ry*.85+uy*.35)),core=clamp(Math.hypot(rx,ry*.8,rz)/1.05),ao=.55+.45*Math.pow(core,.7);
  const col=mix(crown.bottom,crown.top,Math.pow(t,.9)),v=1+(Math.sin(px*4.1+pz*3.3+seed)*.5)*jit;
  colors[i*3]=col[0]*ao*v;colors[i*3+1]=col[1]*ao*v;colors[i*3+2]=col[2]*ao*v;
 }
 g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
export type Tint={top:V3;bottom:V3};
const FOLIAGE:Tint={top:[1.2,1.15,.82],bottom:[.62,.74,.72]};
const NEEDLE:Tint={top:[1.1,1.12,.95],bottom:[.5,.62,.62]};
const BIRCH:Tint={top:[1.22,1.2,.8],bottom:[.7,.82,.7]};
/** Tapered trunk/branch tube along a polyline. radii per point; colours by arc fraction. */
export function tube(points:V3[],radii:number[],sides:number,colorAt:(t:number)=>V3,seed=1){
 const n=points.length,g=new THREE.BufferGeometry(),pos:number[]=[],col:number[]=[],uv:number[]=[],idx:number[]=[],rnd=rngFrom(seed);
 const wob=rnd()*6.28;
 for(let i=0;i<n;i++){
  const a=points[Math.max(0,i-1)],b=points[Math.min(n-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1],tz=b[2]-a[2];const tl=Math.hypot(tx,ty,tz)||1;tx/=tl;ty/=tl;tz/=tl;
  let ux=0,uy=0,uz=1;if(Math.abs(tz)>.9){ux=1;uz=0;}
  let nx=ty*uz-tz*uy,ny=tz*ux-tx*uz,nz=tx*uy-ty*ux;const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
  const bx=ty*nz-tz*ny,by=tz*nx-tx*nz,bz=tx*ny-ty*nx,t=i/(n-1),c=colorAt(t);
  for(let s=0;s<=sides;s++){
   const ang=s/sides*Math.PI*2,ca=Math.cos(ang),sa=Math.sin(ang),r=radii[i]*(1+.07*Math.sin(ang*3+wob+i*1.7));
   pos.push(points[i][0]+(nx*ca+bx*sa)*r,points[i][1]+(ny*ca+by*sa)*r,points[i][2]+(nz*ca+bz*sa)*r);
   const shade=.82+.18*ca*.5+.0;col.push(c[0]*shade,c[1]*shade,c[2]*shade);uv.push(s/sides,t);
  }
 }
 for(let i=0;i<n-1;i++)for(let s=0;s<sides;s++){const a=i*(sides+1)+s,b=a+1,c=a+sides+1,d=c+1;idx.push(a,c,b,b,c,d);}
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 // clamp any vertex that dips under the root plane
 const p=g.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<0)p.setY(i,0);
 return g;
}
const BARK=lin('#7c6246'),BARK_DARK=lin('#52402e'),BARK_LIGHT=lin('#8a6b4c'),BIRCH_WHITE=lin('#e4dfd1'),BIRCH_DARK=lin('#2b2826'),PINE_BARK=lin('#7a4e34');
const barkColor=(t:number):V3=>mix(mix(BARK_DARK,BARK,clamp(t*5)),BARK_LIGHT,clamp((t-.5)*1.6)*.55);
function trunkPath(h:number,lean:V3,rnd:()=>number,steps=7):V3[]{const pts:V3[]=[];const wx=rnd()*6.28;for(let i=0;i<steps;i++){const t=i/(steps-1);pts.push([lean[0]*t*t+Math.sin(t*3+wx)*.07*h/6,h*t,lean[2]*t*t+Math.cos(t*2.6+wx)*.06*h/6]);}return pts;}
function trunkRadii(base:number,top:number,steps=7){return Array.from({length:steps},(_,i)=>{const t=i/(steps-1);return base*(1+(1-Math.min(1,t*6))*.7)*(1-t)+top*t;});}
export function limb(a:V3,b:V3,r0:number,r1:number,seed:number,color:(t:number)=>V3=barkColor){
 const mid:V3=[(a[0]+b[0])/2+(Math.sin(seed)*.12),(a[1]+b[1])/2+.15,(a[2]+b[2])/2+Math.cos(seed*1.3)*.12];return tube([a,mid,b],[r0,(r0+r1)/2,r1],5,color,seed);
}
function skirt(y:number,r:number,h:number,seed:number,tint:Tint,droop=.2,k=10){
 const rnd=rngFrom(seed),g=new THREE.BufferGeometry(),pos:number[]=[],col:number[]=[],idx:number[]=[];
 pos.push(0,y+h,0);col.push(...mix(tint.top,[1.25,1.25,1.1],.2));
 const A:number[]=[],B:number[]=[];
 for(let i=0;i<k;i++){const a=i/k*Math.PI*2+rnd()*.25,jr=.82+rnd()*.3,ca=Math.cos(a),sa=Math.sin(a);
  A.push(pos.length/3);pos.push(ca*r*.52*jr,y+h*.5,sa*r*.52*jr);col.push(...mix(tint.bottom,tint.top,.62));
  B.push(pos.length/3);pos.push(ca*r*jr,y-h*droop*(.4+.8*rnd()),sa*r*jr);col.push(...mix(tint.bottom,tint.top,.22+rnd()*.12));}
 const c0=pos.length/3;pos.push(0,y+h*.05,0);col.push(...mix(tint.bottom,[.3,.36,.34],.55));
 for(let i=0;i<k;i++){const j=(i+1)%k;idx.push(0,A[i],A[j],A[i],B[i],B[j],A[i],B[j],A[j],c0,B[j],B[i]);}
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function strand(x:number,y:number,z:number,len:number,w:number,seed:number,tint:Tint){
 const rnd=rngFrom(seed),segs=5,pos:number[]=[],col:number[]=[],idx:number[]=[],ang=Math.atan2(z,x),bend=(.15+rnd()*.25);
 for(let i=0;i<=segs;i++){const t=i/segs,px=x+Math.cos(ang)*bend*t*t*len,pz=z+Math.sin(ang)*bend*t*t*len,py=y-len*t,ww=w*(1-t*.65)*.5;
  const nx=-Math.sin(ang),nz=Math.cos(ang);pos.push(px-nx*ww,py,pz-nz*ww,px+nx*ww,py,pz+nz*ww);
  const c=mix(mix(tint.bottom,tint.top,.45),[1.15,1.15,.7],t*.7);col.push(...c,...c);}
 for(let i=0;i<segs;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function frond(base:V3,angle:number,len:number,arch:number,droop:number,w:number,tint:Tint,segs=6){
 const pos:number[]=[],col:number[]=[],idx:number[]=[],dx=Math.cos(angle),dz=Math.sin(angle),nx=-dz,nz=dx;
 for(let i=0;i<=segs;i++){const s=i/segs,x=base[0]+dx*len*s,z=base[2]+dz*len*s,y=base[1]+arch*Math.sin(s*Math.PI*.6)*len*.35-droop*s*s*len*.55,ww=w*Math.pow(1-s,.6)*(.4+.6*Math.sin(Math.min(1,s*2.2)*Math.PI*.5)),fold=ww*.28;
  pos.push(x-nx*ww,y-fold,z-nz*ww,x,y+fold*.4,z,x+nx*ww,y-fold,z+nz*ww);
  const c=mix(tint.bottom,tint.top,.55+.35*(1-s));col.push(...c,...mix(c,[1.25,1.25,1],.1),...c);}
 for(let i=0;i<segs;i++){const a=i*3;idx.push(a,a+1,a+3,a+1,a+4,a+3,a+1,a+2,a+4,a+2,a+5,a+4);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
export type PainterForm='broadleaf'|'conifer'|'willow'|'acacia'|'palm'|'stunted'|'scrub'|'birch'|'cypress';
export const PAINTER_FORMS:readonly PainterForm[]=['broadleaf','conifer','willow','acacia','palm','stunted','scrub','birch','cypress'];
export function painterTreeKit(form:PainterForm){
 const rnd=rngFrom(form.length*7919+form.charCodeAt(0)*31);let trunk:THREE.BufferGeometry[]=[],leaf:THREE.BufferGeometry[]=[];
 const crown=(c:V3,radius:number,tint=FOLIAGE)=>({center:c,radius,top:tint.top,bottom:tint.bottom});
 switch(form){
 case 'broadleaf':{
  trunk=[tube(trunkPath(4.4,[.25,0,.1],rnd),trunkRadii(.3,.15),7,barkColor,3),limb([.1,2.4,0],[-1.5,4.5,.3],.15,.07,4),limb([.1,3.0,0],[1.4,4.9,-.5],.14,.07,5),limb([.1,3.4,.05],[.1,5.2,1.1],.12,.06,6)];
  const cc:V3=[0,4.9,0],cr=2.7,L:[V3,V3,number][]=[[[-1.35,4.4,.1],[1.55,1.2,1.4],11],[[1.25,4.7,-.35],[1.6,1.25,1.35],12],[[0,5.7,.2],[1.5,1.1,1.4],13],[[-.15,4.3,1.35],[1.2,1,1.05],14],[[.2,4.45,-1.4],[1.2,.95,1],15],[[-2.25,4.1,.5],[.8,.7,.8],16],[[2.2,4.4,-.9],[.85,.72,.8],17],[[.6,6.35,-.3],[.9,.7,.85],18],[[-.9,5.9,.9],[.9,.7,.85],19]];
  leaf=L.map(([c,r,s])=>lump(c,r,s,crown(cc,cr),.2));break;}
 case 'birch':{
  const pts=trunkPath(5.6,[.3,0,-.2],rnd,12),rad=trunkRadii(.13,.06,12);
  trunk=[tube(pts,rad,6,t=>{const band=Math.abs(Math.sin(t*38+.7)),mark=band>.93?1:0;return mix(mix(BIRCH_WHITE,BARK_DARK,clamp(1-t*8)*.8),BIRCH_DARK,mark*.7);},7),limb([.05,3.2,0],[-.9,4.8,.2],.06,.03,8,()=>BIRCH_WHITE),limb([.08,3.8,0],[.8,5.3,-.3],.05,.03,9,()=>BIRCH_WHITE)];
  const cc:V3=[.1,5.3,0],cr=1.9;
  leaf=[[[ -.7,5,.1],[1,1.15,1],21],[[.7,5.2,-.2],[1.05,1.2,1],22],[[0,6,.1],[.95,1.1,.95],23],[[0,4.4,.7],[.85,.9,.85],24],[[.1,4.5,-.7],[.8,.85,.8],25],[[-.1,5.4,0],[1,1.1,1],26]].map(([c,r,s])=>lump(c as V3,r as V3,s as number,crown(cc,cr,BIRCH),.18));break;}
 case 'conifer':{
  trunk=[tube([[0,0,0],[.02,2,0],[0,4,.02],[0,6.6,0]],[.34,.22,.14,.05],7,t=>mix(BARK_DARK,PINE_BARK,clamp(t*2)),2)];
  const tiers:[number,number,number][]=[[1.1,2.15,1.95],[2.2,1.95,1.85],[3.3,1.7,1.7],[4.4,1.4,1.55],[5.4,1.05,1.4],[6.2,.62,1.25]];
  leaf=tiers.map(([y,r,h],i)=>skirt(y,r,h,40+i,NEEDLE,.22,10));break;}
 case 'cypress':{
  trunk=[tube([[0,0,0],[0,1.4,0],[0,2.6,0]],[.2,.15,.1],6,barkColor,3)];
  const cc:V3=[0,3.9,0],cr=3;
  leaf=[[[0,2.5,0],[.95,1.6,.95],51],[[0,3.9,0],[.88,1.85,.88],52],[[0,5.3,0],[.7,1.7,.7],53],[[0,6.5,0],[.38,1,.38],54]].map(([c,r,s])=>lump(c as V3,r as V3,s as number,{center:cc,radius:cr,top:[1.05,1.12,.9],bottom:[.46,.58,.55]},.1));break;}
 case 'willow':{
  trunk=[tube(trunkPath(3.1,[-.3,0,.1],rnd),trunkRadii(.32,.18),7,barkColor,6),limb([-.1,2,0],[-1.6,4.4,.4],.15,.07,7),limb([-.1,2.5,0],[1.7,4.3,.1],.15,.07,8),limb([0,2.4,0],[0,4.7,-1.2],.13,.06,9)];
  const cc:V3=[0,4.2,0],cr=2.6,tint:Tint={top:[1.12,1.15,.78],bottom:[.64,.78,.66]};
  leaf=[lump([0,4.6,0],[2.3,1.1,1.9],61,crown(cc,cr,tint),.14),lump([-1.3,4.1,.3],[1.2,.8,1.1],62,crown(cc,cr,tint),.14),lump([1.3,4.2,-.2],[1.2,.8,1.1],63,crown(cc,cr,tint),.14)];
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2+rnd()*.3,rr=1.6+rnd()*1.1;leaf.push(strand(Math.cos(a)*rr,4.0+rnd()*.5,Math.sin(a)*rr*.85,2.4+rnd()*1.4,.5,70+i,tint));}break;}
 case 'acacia':{
  trunk=[tube([[0,0,0],[.2,1.5,.05],[.45,3.3,.15]],[.26,.2,.12],6,barkColor,3),limb([.25,2.1,0],[-1.6,4.4,.2],.13,.07,4),limb([.35,2.9,.1],[2.1,4.7,-.3],.12,.06,5)];
  const cc:V3=[.2,4.9,0],cr=2.8,t:Tint={top:[1.18,1.1,.75],bottom:[.66,.72,.62]};
  leaf=[[[-1.5,4.7,.15],[2.1,.55,1.6],81],[[1.6,4.95,-.1],[2.2,.55,1.65],82],[[.2,5.25,0],[1.9,.45,1.6],83],[[-2.8,4.5,.1],[.8,.35,.7],84],[[2.9,4.7,-.3],[.85,.35,.7],85]].map(([c,r,s])=>lump(c as V3,r as V3,s as number,crown(cc,cr,t),.14));break;}
 case 'palm':{
  const steps=11,pts:V3[]=[],rad:number[]=[];for(let i=0;i<steps;i++){const t=i/(steps-1);pts.push([.8*t*t*1.0+.05*Math.sin(t*5),6.2*t,.2*t]);rad.push((.2-.07*t)*(1+(i%2?.09:0))*(1+(1-Math.min(1,t*8))*.6));}
  trunk=[tube(pts,rad,7,t=>mix([.52,.42,.32],[.66,.56,.42],t),5)];
  const top:V3=[.8,6.2,.2],tint:Tint={top:[1.15,1.15,.8],bottom:[.55,.7,.55]};
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2+.2*Math.sin(i*2.1);leaf.push(frond(top,a,3.2+((i*37)%7)*.09,i%3===0?.25:.55,.9+((i*13)%5)*.12,.5,tint));}
  leaf.push(frond(top,0,1,2.2,0,.3,tint));break;}
 case 'stunted':{
  trunk=[tube([[0,0,0],[.35,1.1,0],[.7,2.1,.1],[1.1,2.7,.15]],[.24,.2,.13,.07],6,t=>mix(BARK_DARK,PINE_BARK,t),9),limb([.4,1,0],[1.3,1.9,.3],.1,.05,3),limb([.5,1.5,0],[-.7,2.3,-.2],.08,.04,4)];
  const T:Tint={top:[1.05,1.12,.95],bottom:[.5,.62,.6]};
  leaf=[skirt(1.3,1.45,1.3,91,T,.18,9),skirt(2.0,1.1,1.1,92,T,.18,9),skirt(2.6,.7,.9,93,T,.15,8)].map(g=>{g.translate(.55,0,0);return g;});
  leaf.push(lump([-.65,1.9,-.1],[.8,.5,.7],95,{center:[.4,1.9,0],radius:1.8,top:T.top,bottom:T.bottom},.15));break;}
 case 'scrub':{
  trunk=[limb([0,0,0],[-.4,1.4,.2],.09,.04,2),limb([0,0,0],[.5,1.3,-.2],.08,.04,3),limb([0,.1,0],[0,1.6,.3],.07,.03,4)];
  const cc:V3=[0,1.5,0],t:Tint={top:[1.2,1.15,.8],bottom:[.6,.7,.62]};
  leaf=[[[-.5,1.5,.2],[.95,.75,.85],101],[[.6,1.4,-.1],[.95,.75,.8],102],[[0,1.9,.3],[.85,.65,.75],103],[[.1,1.1,-.5],[.7,.55,.65],104]].map(([c,r,s])=>lump(c as V3,r as V3,s as number,crown(cc,1.5,t),.18));break;}
 }
 return {trunk:mergeParts(trunk),canopy:mergeParts(leaf)};
}
/** Far-LOD crown proxies: unit-sized, centred, same baked gradient as the near crowns. */
export function painterFarRound(){
 return mergeParts([lump([0,0,0],[1,.92,1],301,{center:[0,0,0],radius:1.1,top:FOLIAGE.top,bottom:FOLIAGE.bottom},.22),lump([.38,.28,.1],[.62,.55,.6],302,{center:[0,0,0],radius:1.1,top:FOLIAGE.top,bottom:FOLIAGE.bottom},.2,0)]);
}
export function painterFarNeedle(){
 return mergeParts([skirt(-1,1,.9,311,NEEDLE,.2,8),skirt(-.15,.75,.9,312,NEEDLE,.2,8),skirt(.55,.45,.6,313,NEEDLE,.15,7)]);
}
/** Ground contact shadow card: a flat soft disc (radial alpha texture lives on the material). */
export function contactShadowGeometry(){const g=new THREE.CircleGeometry(1,20);g.rotateX(-Math.PI/2);g.translate(0,0,0);return g;}

// ---- undergrowth ------------------------------------------------------------------------------------------------
export type PainterDressing='grass'|'tallgrass'|'flowers'|'bloom'|'reeds'|'scrub'|'pebbles'|'fern'|'shrub'|'rocks'|'log'|'cattail'|'agave'|'drygrass'|'cushion';
export function blade(x:number,z:number,h:number,w:number,lean:number,angle:number,base:V3,tip:V3,bend=.5){
 const dx=Math.cos(angle),dz=Math.sin(angle),nx=-dz,nz=dx,pos:number[]=[],col:number[]=[];
 const pts=[[0,0],[.5,.55],[1,1]];
 // three-row blade strip: wide base, curved tip
 const rows=[0,.5,1],ww=[w,w*.75,0];
 const idx=[0,1,3,1,4,3,1,2,4,2,5,4];
 const out=new THREE.BufferGeometry();
 for(let i=0;i<3;i++){const t=rows[i],ox=x+dx*lean*t*t*bend*h,oz=z+dz*lean*t*t*bend*h,oy=h*t*(1-.12*t);const c=mix(base,tip,t);
  pos.push(ox-nx*ww[i],oy,oz-nz*ww[i],ox+nx*ww[i],oy,oz+nz*ww[i]);col.push(...c,...c);}
 void pts;
 const index=[0,1,2,1,3,2,2,3,4,3,5,4].filter(()=>true);void idx;void index;
 out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));out.setAttribute('color',new THREE.Float32BufferAttribute(col,3));out.setIndex([0,1,2,1,3,2,2,3,4,3,5,4]);out.computeVertexNormals();
 // blades are shaded as if facing the sky so tufts read soft rather than striped
 const nrm=out.attributes.normal;for(let i=0;i<nrm.count;i++)nrm.setXYZ(i,0,1,0);
 return out;
}
function tuft(count:number,radius:number,hMin:number,hMax:number,seed:number,base:V3,tip:V3,width=.05,tipMix?:(i:number)=>V3){
 const rnd=rngFrom(seed),parts:THREE.BufferGeometry[]=[];
 for(let i=0;i<count;i++){const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*radius,h=hMin+(hMax-hMin)*rnd();
  parts.push(blade(Math.cos(a)*r,Math.sin(a)*r,h,width*(.8+rnd()*.5),.35+rnd()*.55,a+(rnd()-.5)*1.4,mix(base,[.5,.6,.45],rnd()*.2),tipMix?tipMix(i):mix(tip,[1.25,1.2,.8],rnd()*.3)));}
 return mergeParts(parts);
}
function solid(g:THREE.BufferGeometry,color:V3){const n=g.attributes.position.count,c=new Float32Array(n*3);for(let i=0;i<n;i++)c.set(color,i*3);g.setAttribute('color',new THREE.BufferAttribute(c,3));return g;}
const DRESSING_ALBEDO:Record<PainterDressing,number>={grass:.58,tallgrass:.62,flowers:.55,bloom:1,reeds:.6,scrub:.45,pebbles:.9,fern:.5,shrub:.5,rocks:.85,log:.9,cattail:.6,agave:.5,drygrass:.6,cushion:.5};
/** Geometry colours above are authored as friendly 0..1.3 sRGB-ish values; the material works in linear light, so scale per kind. */
export function painterDressing(form:PainterDressing):THREE.BufferGeometry{
 const g=dressingRaw(form),k=DRESSING_ALBEDO[form],col=g.attributes.color,pos=g.attributes.position;
 for(let i=0;i<pos.count;i++)if(pos.getY(i)<0)pos.setY(i,0);g.computeBoundingBox();
 for(let i=0;i<col.count;i++)col.setXYZ(i,col.getX(i)*k,col.getY(i)*k,col.getZ(i)*k);return g;
}
function dressingRaw(form:PainterDressing):THREE.BufferGeometry{
 switch(form){
 case 'grass':return tuft(24,.62,.45,.95,401,[.2,.33,.14],[.5,.74,.26],.06);
 case 'tallgrass':return tuft(18,.55,.7,1.35,402,[.3,.38,.16],[.82,.78,.38],.045,i=>i%4===0?[.95,.72,.34]:[.74,.76,.36]);
 case 'flowers':{
  const rnd=rngFrom(403),parts:THREE.BufferGeometry[]=[tuft(8,.45,.2,.5,404,[.34,.5,.3],[.9,1.05,.7])];
  for(let i=0;i<6;i++){const a=rnd()*6.28,r=Math.sqrt(rnd())*.38,h=.32+rnd()*.34,x=Math.cos(a)*r,z=Math.sin(a)*r;parts.push(tube([[x,0,z],[x+.03,h*.55,z],[x+.05,h,z]],[.012,.01,.008],3,()=>[.42,.62,.34],i));}
  return mergeParts(parts);}
 case 'bloom':{ // flower heads for the coloured instance layer: tiny five-petal discs at the stem tops
  const rnd=rngFrom(403),parts:THREE.BufferGeometry[]=[];void rnd;const r2=rngFrom(403);
  tuft(8,.45,.2,.5,404,[.34,.5,.3],[.9,1.05,.7]).dispose();
  for(let i=0;i<6;i++){const a=r2()*6.28,r=Math.sqrt(r2())*.38,h=.32+r2()*.34,x=Math.cos(a)*r,z=Math.sin(a)*r;const d=new THREE.IcosahedronGeometry(.075,0);d.scale(1,.55,1);d.translate(x+.05,h+.015,z);parts.push(solid(d,[1,1,1]));
   const c=new THREE.IcosahedronGeometry(.032,0);c.translate(x+.05,h+.05,z);parts.push(solid(c,[1.1,.95,.3]));}
  return mergeParts(parts);}
 case 'reeds':{
  const rnd=rngFrom(405),parts:THREE.BufferGeometry[]=[];
  for(let i=0;i<9;i++){const a=rnd()*6.28,r=Math.sqrt(rnd())*.42,h=1+rnd()*.9,x=Math.cos(a)*r,z=Math.sin(a)*r,lean=(rnd()-.5)*.35;
   parts.push(tube([[x,0,z],[x+lean*.5,h*.5,z],[x+lean,h,z]],[.025,.02,.012],4,t=>mix([.5,.6,.32],[1.1,1.05,.65],t),i));
   if(i%2===0){const head=new THREE.CylinderGeometry(.045,.045,.26,5);head.translate(x+lean,h-.08,z);parts.push(solid(head,[.42,.28,.18]));}
   else parts.push(blade(x,z,h*.85,.045,.7,a,[.5,.62,.34],[1.15,1.15,.72]));}
  return mergeParts(parts);}
 case 'scrub':{
  const cc:V3=[0,.4,0],t:Tint={top:[1.15,1.1,.8],bottom:[.55,.62,.55]};
  return mergeParts([tube([[0,0,0],[-.1,.3,0],[-.22,.55,.05]],[.04,.03,.02],4,()=>BARK,1),lump([-.2,.46,.02],[.3,.2,.26],410,{center:cc,radius:.6,top:t.top,bottom:t.bottom},.2,0),lump([.22,.38,.1],[.28,.18,.22],411,{center:cc,radius:.6,top:t.top,bottom:t.bottom},.2,0),lump([0,.62,-.12],[.22,.16,.2],412,{center:cc,radius:.6,top:t.top,bottom:t.bottom},.2,0)]);}
 case 'shrub':{
  const cc:V3=[0,.6,0],t:Tint={top:[1.18,1.14,.78],bottom:[.58,.68,.6]};
  return mergeParts([lump([0,.55,0],[.72,.55,.66],420,{center:cc,radius:.9,top:t.top,bottom:t.bottom},.2),lump([-.5,.42,.2],[.5,.4,.46],421,{center:cc,radius:.9,top:t.top,bottom:t.bottom},.2,0),lump([.48,.4,-.15],[.48,.38,.44],422,{center:cc,radius:.9,top:t.top,bottom:t.bottom},.2,0)]);}
 case 'fern':{
  const parts:THREE.BufferGeometry[]=[],tint:Tint={top:[1.1,1.18,.8],bottom:[.55,.74,.5]};
  for(let i=0;i<9;i++){parts.push(frond([0,.04,0],i/9*Math.PI*2+.3*Math.sin(i*3.1),.85+((i*29)%5)*.07,.5,1.1,.14,tint,5));}
  return mergeParts(parts);}
 case 'pebbles':{
  const rnd=rngFrom(430),parts:THREE.BufferGeometry[]=[];
  for(let i=0;i<5;i++){const s=.1+rnd()*.14,g=new THREE.IcosahedronGeometry(1,0);g.scale(s*1.25,s*.65,s);g.rotateY(rnd()*6.28);g.translate((rnd()-.5)*.6,s*.3,(rnd()-.5)*.6);
   const c:V3=mix([.72,.7,.65],[.95,.88,.78],rnd());parts.push(solid(g,c));}
  return mergeParts(parts);}
 case 'cattail':{ // wetland: tall broad-bladed stand with brown sausage heads on bare stalks
  const rnd=rngFrom(440),parts:THREE.BufferGeometry[]=[];
  for(let i=0;i<7;i++){const a=rnd()*6.28,r=Math.sqrt(rnd())*.36,h=1.25+rnd()*.85,x=Math.cos(a)*r,z=Math.sin(a)*r,lean=(rnd()-.5)*.28;
   parts.push(tube([[x,0,z],[x+lean*.5,h*.5,z],[x+lean,h,z]],[.022,.018,.011],4,t=>mix([.42,.56,.28],[.86,.9,.52],t),i));
   const head=new THREE.CylinderGeometry(.05,.05,.3,6);head.translate(x+lean,h-.16,z);parts.push(solid(head,[.36,.22,.13]));
   const spike=new THREE.ConeGeometry(.012,.14,4);spike.translate(x+lean,h+.06,z);parts.push(solid(spike,[.6,.5,.3]));}
  for(let i=0;i<6;i++){const a=rnd()*6.28;parts.push(blade(Math.cos(a)*.1,Math.sin(a)*.1,1.1+rnd()*.5,.09,.55,a,[.4,.58,.26],[.95,1.1,.55]));}
  return mergeParts(parts);}
 case 'agave':{ // arid: rosette of stiff upswept blue-green leaves, pale tips
  const parts:THREE.BufferGeometry[]=[],tint:Tint={top:[.95,1.05,.9],bottom:[.4,.62,.5]};
  for(let i=0;i<11;i++){parts.push(frond([0,.05,0],i/11*Math.PI*2+.4*Math.sin(i*2.3),.55+((i*17)%4)*.07,.9,.1,.1,tint,4));}
  const cone=new THREE.ConeGeometry(.07,.38,5);cone.translate(0,.22,0);parts.push(solid(cone,[.36,.58,.46]));
  return mergeParts(parts);}
 case 'drygrass':return tuft(14,.5,.5,1,441,[.46,.4,.2],[1.05,.92,.5],.05,i=>i%3===0?[.95,.72,.38]:[1.05,.94,.52]);
 case 'cushion':{ // alpine: low hard cushion with tiny bloom flecks, hugging the scree
  const cc:V3=[0,.12,0],t:Tint={top:[.9,1.12,.78],bottom:[.38,.55,.42]};
  const parts:THREE.BufferGeometry[]=[lump([0,.12,0],[.34,.17,.3],450,{center:cc,radius:.5,top:t.top,bottom:t.bottom},.1,1),lump([.3,.09,.08],[.2,.11,.18],451,{center:cc,radius:.5,top:t.top,bottom:t.bottom},.1,1),lump([-.26,.08,-.1],[.18,.1,.16],452,{center:cc,radius:.5,top:t.top,bottom:t.bottom},.1,1)];
  for(const [x,z] of [[.05,.08],[-.1,-.04],[.2,.14],[-.2,-.12]]){const f=new THREE.IcosahedronGeometry(.03,0);f.translate(x,.25-.05*Math.abs(x),z);parts.push(solid(f,[1.2,1.1,.5]));}
  return mergeParts(parts);}
 case 'rocks':return painterRock(432,true);
 case 'log':{
  const g=new THREE.CylinderGeometry(.16,.19,1.9,7);g.rotateZ(Math.PI/2);g.translate(0,.17,0);const base=solid(g,[.5,.38,.28]);
  const cap=new THREE.CylinderGeometry(.14,.14,.02,7);cap.rotateZ(Math.PI/2);cap.translate(.96,.17,0);
  const moss=new THREE.IcosahedronGeometry(.17,0);moss.scale(2,.35,.8);moss.translate(-.2,.34,0);
  return mergeParts([base,solid(cap,[.78,.66,.46]),solid(moss,[.33,.52,.22])]);}
 }
}
/** Faceted rock with baked moss top, warm flanks and dark base. cluster=true gives an outcrop of three. */
export function painterRock(seed=432,cluster=false){
 const make=(s:number,sx:number,sy:number,sz:number,ox:number,oz:number)=>{
  const rnd=rngFrom(s),g=new THREE.IcosahedronGeometry(1,1),pos=g.attributes.position,col=new Float32Array(pos.count*3),ph=[rnd()*6.28,rnd()*6.28,rnd()*6.28];
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),l=Math.hypot(x,y,z),ux=x/l,uy=y/l,uz=z/l;
   const d=1+.2*Math.sin(ux*3.3+ph[0])*Math.cos(uz*2.9+ph[1])+.14*Math.sin(uy*5+ph[2]+ux*4);
   const px=ux*d*sx,py=Math.max(-.2*sy,uy*d*sy),pz=uz*d*sz;pos.setXYZ(i,px+ox,py+sy*.55,pz+oz);
   const top=clamp(uy*.9+.3),base=clamp(-uy);let c=mix([.36,.34,.31],[.62,.58,.5],top);c=mix(c,[.34,.46,.2],clamp(top-.55)*1.4*.55);c=mix(c,[.2,.19,.18],base*.8);
   const strata=.94+.06*Math.sin(py*9+ph[0]);col[i*3]=c[0]*strata;col[i*3+1]=c[1]*strata;col[i*3+2]=c[2]*strata;}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();return g;};
 const parts=cluster?[make(seed,.8,.6,.7,0,0),make(seed+1,.5,.4,.45,.8,.3),make(seed+2,.38,.3,.34,-.6,.55)]:[make(seed,.9,.62,.8,0,0)];
 const out=mergeParts(parts);
 // rest the whole group on y=0
 out.computeBoundingBox();const lift=-out.boundingBox!.min.y;out.translate(0,lift,0);out.computeBoundingBox();out.computeBoundingSphere();return out;
}
export function radialShadowTexture(){
 const n=32,data=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const d=Math.hypot((x+.5)/n*2-1,(y+.5)/n*2-1),a=Math.pow(clamp(1-d),1.6)*255;data.set([a,a,a,255],(y*n+x)*4);}
 const t=new THREE.DataTexture(data,n,n,THREE.RGBAFormat);t.colorSpace=THREE.NoColorSpace;t.magFilter=t.minFilter=THREE.LinearFilter;t.needsUpdate=true;return t;
}
/** Soft-edged path stamp: a worn core that breaks up into grass at the rim (value noise keeps the edge from reading as a smooth ellipse). */
export function trailStampTexture(){
 const n=64,data=new Uint8Array(n*n*4),h=(x:number,y:number)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=(x+.5)/n*2-1,v=(y+.5)/n*2-1,d=Math.hypot(u,v),rough=(h(Math.floor(x/8),Math.floor(y/8))-.5)*.16,a=clamp(1-(d+rough-.3)/.62)*255;data.set([a,a,a,255],(y*n+x)*4);}
 const t=new THREE.DataTexture(data,n,n,THREE.RGBAFormat);t.colorSpace=THREE.NoColorSpace;t.magFilter=t.minFilter=THREE.LinearFilter;t.needsUpdate=true;return t;
}

/** Resource-node rock: same footprint and height as the classic dodecahedron (picking and clearance unchanged), but faceted with a baked
 * mossy crown, strata, dark foot, and ore veins for copper (oxidised green and orange) and iron (rust bands). Flat shading on purpose. */
export function painterNodeRock(kind:'stone'|'copper'|'iron',seed=7){
 const rnd=rngFrom(seed*17+kind.length),raw=new THREE.IcosahedronGeometry(1,1),pos=raw.attributes.position,ph=[rnd()*6.28,rnd()*6.28,rnd()*6.28],col=new Float32Array(pos.count*3);
 const base:V3=kind==='stone'?[.34,.32,.29]:kind==='copper'?[.24,.21,.18]:[.17,.16,.16];
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),l=Math.hypot(x,y,z),ux=x/l,uy=y/l,uz=z/l;
  const d=1+.17*Math.sin(ux*3.3+ph[0])*Math.cos(uz*2.9+ph[1])+.12*Math.sin(uy*5+ph[2]+ux*4);
  const px=ux*d*.84,py=Math.max(-.18,uy*d*.5)+.28,pz=uz*d*.7;pos.setXYZ(i,px,py,pz);
 }
 for(let f=0;f<pos.count;f+=3){ // one tone per facet so the rock reads painted and faceted, not smoothly noisy
  const cy=(pos.getY(f)+pos.getY(f+1)+pos.getY(f+2))/3,cx=(pos.getX(f)+pos.getX(f+1)+pos.getX(f+2))/3,cz=(pos.getZ(f)+pos.getZ(f+1)+pos.getZ(f+2))/3;
  const top=clamp((cy-.1)/.55),foot=clamp((.12-cy)/.3),facet=.92+rnd()*.16;
  let c=mix(base,[base[0]*1.3,base[1]*1.28,base[2]*1.22],top);
  if(kind==='stone')c=mix(c,[.17,.25,.09],clamp(top-.55)*1.6*.6);
  else if(kind==='copper'){const vein=Math.sin(cx*9+cy*5+cz*7+seed)>.55?1:0;c=mix(c,[.42,.18,.07],vein*.75);const patina=Math.sin(cx*6-cz*8+seed*2)>.7?1:0;c=mix(c,[.14,.3,.24],patina*.5);}
  else{const band=Math.sin(cy*14+cx*3)>.35?1:0;c=mix(c,[.3,.12,.07],band*.7);}
  c=mix(c,[base[0]*.4,base[1]*.4,base[2]*.4],foot*.8);
  for(let k=0;k<3;k++){col[(f+k)*3]=c[0]*facet;col[(f+k)*3+1]=c[1]*facet;col[(f+k)*3+2]=c[2]*facet;}
 }
 raw.deleteAttribute('uv');raw.deleteAttribute('normal');raw.setAttribute('color',new THREE.BufferAttribute(col,3));raw.computeVertexNormals();
 raw.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(pos.count*2),2));
 return raw;
}
