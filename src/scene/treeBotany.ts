import * as THREE from 'three';
import {rngFrom} from './painterTrees';
import {TILE,tileUV} from './botanicalMaterial';
import {BOTANICAL_SPECIES,SPECIES_BY_ID,VARIANTS_PER_SPECIES,type BotanicalSpecies,type Rgb} from './botanicalSpecies';
import {heroPass,type Seg} from './treeHero';
/** Botanical tree geometry. Every species is grown from its architecture: a tapered, flared trunk tube with bark bands baked into vertex
 * colour, a branching skeleton (decurrent limbs that fork, or excurrent whorls), then leaf mass built from clumps of alpha-cut leaf cards around
 * a dark inner core so crowns have ragged silhouettes and depth rather than smooth lobes. All randomness is seeded per species x variant; the two
 * LODs share one skeleton (same seeds), only detail differs. One merged geometry per (species, variant, LOD): position, normal, uv, colour, `aLeaf`
 * (0 wood .. 1 leaf; hue tint amount) and `aShed` (leaf-fall threshold, -1 never shed). Rooted at y=0, finite, deterministic. */
export type V3=[number,number,number];
/** 0 full, 1 mid, 2 hero (the full tree plus the near-detail pass of treeHero.ts: same skeleton, more twigs, leaves, bark relief, fruit); the hero tier is built from the lod 0 skeleton with a separate generator */
type Lod=0|1|2;
const add=(a:V3,b:V3):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a:V3,k:number):V3=>[a[0]*k,a[1]*k,a[2]*k],len=(a:V3)=>Math.hypot(a[0],a[1],a[2]);
const norm=(a:V3):V3=>{const l=len(a)||1;return [a[0]/l,a[1]/l,a[2]/l];},cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t,clamp=(v:number,a=0,b=1)=>v<a?a:v>b?b:v,mix=(a:Rgb,b:Rgb,t:number):Rgb=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const UP:V3=[0,1,0];
class Acc{
 /** hero tier only: every tube the builders lay (limbs, twigs) for the hero pass, and the bark relief amplitude */rec:Seg[]|null=null;hero=false;relief=0;
 pos:number[]=[];nrm:number[]=[];uv:number[]=[];col:number[]=[];leaf:number[]=[];shed:number[]=[];idx:number[]=[];
 get n(){return this.pos.length/3;}
 v(p:V3,n:V3,uv:[number,number],c:Rgb,leaf:number,shed:number){this.pos.push(p[0],p[1],p[2]);this.nrm.push(n[0],n[1],n[2]);this.uv.push(uv[0],uv[1]);this.col.push(c[0],c[1],c[2]);this.leaf.push(leaf);this.shed.push(shed);return this.n-1;}
 tri(a:number,b:number,c:number){this.idx.push(a,b,c);}
 geometry(){
  const g=new THREE.BufferGeometry(),n=this.n;
  g.setAttribute('position',new THREE.Float32BufferAttribute(this.pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.nrm,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));
  g.setAttribute('color',new THREE.Float32BufferAttribute(this.col,3));g.setAttribute('aLeaf',new THREE.Float32BufferAttribute(this.leaf,1));g.setAttribute('aShed',new THREE.Float32BufferAttribute(this.shed,1));
  g.setIndex(n>65535?new THREE.Uint32BufferAttribute(this.idx,1):new THREE.Uint16BufferAttribute(this.idx,1));g.computeBoundingBox();g.computeBoundingSphere();return g;
 }
}
const SOLID=tileUV(TILE.solid,40);const SOLID_UV:[number,number]=[(SOLID[0]+SOLID[2])/2,(SOLID[1]+SOLID[3])/2];
/** Crown context: proxy ellipsoid for soft normals and baked light, so many small cards light like one rounded mass. */
type Crown={c:V3;r:V3;top:Rgb;bottom:Rgb;dark:number};
function shade(cr:Crown,p:V3):Rgb{
 const dx=(p[0]-cr.c[0])/cr.r[0],dy=(p[1]-cr.c[1])/cr.r[1],dz=(p[2]-cr.c[2])/cr.r[2],core=clamp(Math.hypot(dx,dy*.85,dz)),t=clamp(.5+.5*(dy*.85)),ao=cr.dark+(1-cr.dark)*Math.pow(core,.7);
 const c=mix(cr.bottom,cr.top,Math.pow(t,.9));return [c[0]*ao,c[1]*ao,c[2]*ao];
}
function proxyNormal(cr:Crown,p:V3,own:V3,k=.7):V3{
 const r=norm([(p[0]-cr.c[0])/(cr.r[0]*cr.r[0]),(p[1]-cr.c[1])/(cr.r[1]*cr.r[1]),(p[2]-cr.c[2])/(cr.r[2]*cr.r[2])]);
 return norm([r[0]*k+own[0]*(1-k),r[1]*k+own[1]*(1-k)+.12,r[2]*k+own[2]*(1-k)]);
}
type BarkFn=(t:number,ang:number)=>Rgb;
function barkFn(sp:BotanicalSpecies,phase:number):BarkFn{
 const {pattern,base,dark,light,moss}=sp.bark,mossCol:Rgb=[.28,.4,.16],mossAng=phase*6.28;
 return (t,ang)=>{
  let c:Rgb;
  const ridge=Math.abs(Math.sin(ang*5+phase*9+Math.sin(t*7+ang)*1.2)),fine=.5+.5*Math.sin(ang*13+t*31+phase*17);
  switch(pattern){
   case 'smooth':c=mix(base,dark,.18*Math.abs(Math.sin(t*38+ang*2+phase))*smooth(.3,1,fine)+.1*ridge);break;
   case 'birch':{const band=Math.abs(Math.sin(t*(34+phase*8)+Math.sin(ang*3+phase)*.9));c=mix(base,dark,smooth(.9,.98,band)*.9*(.35+.65*smooth(.2,.8,.5+.5*Math.sin(ang*2+phase*5))));c=mix(c,dark,smooth(.2,.0,t)*.75);c=mix(c,[.78,.74,.66],.15*fine);break;}
   case 'scaly':{const plate=smooth(.25,.9,.5+.5*Math.sin(ang*3+t*10+Math.sin(ang*7+t*23)*1.4)),upper=smooth(.38,.8,t);c=mix(mix(dark,base,plate),mix(base,light,plate),upper);break;}
   case 'peeling':{const s=Math.sin(ang*3+t*9+phase*6)*.5+.5,s2=Math.sin(ang*7-t*16)*.5+.5;c=mix(mix(base,dark,smooth(.5,.95,s2)*.55),light,smooth(.55,.9,s)*.5);c=mix(c,[.5,.42,.36],smooth(.25,0,t)*.7);break;}
   case 'ringed':{const ring=Math.abs(Math.sin(t*46+phase));c=mix(base,dark,smooth(.82,1,ring)*.9+.12*fine);break;}
   case 'rough':{const diamond=Math.abs(Math.sin(ang*4+t*20))*Math.abs(Math.sin(ang*4-t*20));c=mix(dark,mix(base,light,.4*fine),smooth(.05,.5,diamond));break;}
   case 'gnarled':{c=mix(dark,mix(base,light,.5*fine),smooth(.1,.75,Math.abs(Math.sin(ang*3+t*9+Math.sin(t*14)*2))));break;}
   default:c=mix(dark,mix(base,light,.35*fine),smooth(.1,.8,ridge));
  }
  if(moss>0){const m=Math.cos(ang-mossAng)*.5+.5;c=mix(c,mossCol,clamp(moss*smooth(.55,.15,t)*smooth(.35,.95,m)*1.25));}
  return [c[0]*c[0],c[1]*c[1],c[2]*c[2]];
 };
}
function frame(tan:V3,prev:V3|null):[V3,V3]{
 let n:V3=prev?sub(prev,mul(tan,dot(prev,tan))):cross(tan,Math.abs(tan[1])>.9?[1,0,0]:UP);if(len(n)<1e-5)n=cross(tan,[1,0,0]);n=norm(n);return [n,norm(cross(tan,n))];
}
/** Tapered tube along a polyline; vertex colour from the bark function. Parallel-transport frames so bends never twist. */
function tube(a:Acc,pts:V3[],radii:number[],sides:number,col:BarkFn,tint=1,leaf=0,cap=false){
 const n=pts.length;if(a.rec)a.rec.push({pts,radii});
 // hero tier: thick wood gets more sides and ridged relief (bark plates, fluting) so trunks and limbs read as bark, not tubes
 const wood=a.hero&&radii[0]>.06&&sides>=4,rel=wood?a.relief:0;if(wood)sides=Math.max(sides,radii[0]>.2?15:11);let prev:V3|null=null;const base=a.n;
 for(let i=0;i<n;i++){
  const tan=norm(sub(pts[Math.min(n-1,i+1)],pts[Math.max(0,i-1)])),[nx,bx]=frame(tan,prev);prev=nx;const t=i/(n-1);
  for(let s=0;s<=sides;s++){
   const ang=s/sides*Math.PI*2,ca=Math.cos(ang),sa=Math.sin(ang),dir:V3=[nx[0]*ca+bx[0]*sa,nx[1]*ca+bx[1]*sa,nx[2]*ca+bx[2]*sa],r=radii[i]*(1+.05*Math.sin(ang*3+i*1.7))*(rel?1+rel*(Math.abs(Math.sin(ang*(sides>12?7:5)+i*.9+Math.sin(i*2.3+ang*2)))-.45)*(i<2?1.5:1):1);
   const c=col(t,ang),sh=.86+.14*ca;
   a.v([pts[i][0]+dir[0]*r,pts[i][1]+dir[1]*r,pts[i][2]+dir[2]*r],dir,SOLID_UV,[c[0]*sh*tint,c[1]*sh*tint,c[2]*sh*tint],leaf,-1);
  }
 }
 for(let i=0;i<n-1;i++)for(let s=0;s<sides;s++){const p=base+i*(sides+1)+s,q=p+sides+1;a.tri(p,q,p+1);a.tri(p+1,q,q+1);}
 if(cap){const tip=a.v(pts[n-1],mul(norm(sub(pts[n-1],pts[n-2])),1),SOLID_UV,[.3,.25,.2],leaf,-1);const last=base+(n-1)*(sides+1);for(let s=0;s<sides;s++)a.tri(last+s,last+s+1,tip);}
}
function radii(n:number,r0:number,r1:number,flare=0,pow=1){return Array.from({length:n},(_,i)=>{const t=i/(n-1);return lerp(r0,r1,Math.pow(t,pow))*(1+flare*Math.exp(-t*16));});}
const bez=(p0:V3,p1:V3,p2:V3,t:number):V3=>{const u=1-t;return [u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0],u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1],u*u*p0[2]+2*u*t*p1[2]+t*t*p2[2]];};
function curve(p0:V3,p1:V3,p2:V3,n:number){return Array.from({length:n},(_,i)=>bez(p0,p1,p2,i/(n-1)));}
/** One leaf card (two triangles): centre-anchored, tangent to the crown shell, normals blended with the crown proxy. */
function card(a:Acc,cr:Crown,p:V3,right:V3,up:V3,hw:number,hh:number,tile:number,shed:number,leafAmt=1,shadeK=1,nBias=.7,anchorBase=false,loc?:{c:V3;r:V3}){
 const own=cross(right,up),[u0,v0,u1,v1]=tileUV(tile),o=anchorBase?0:hh;
 const corners:[V3,[number,number]][]=[[add(add(p,mul(right,-hw)),mul(up,-o)),[u0,v0]],[add(add(p,mul(right,hw)),mul(up,-o)),[u1,v0]],[add(add(p,mul(right,hw)),mul(up,2*hh-o)),[u1,v1]],[add(add(p,mul(right,-hw)),mul(up,2*hh-o)),[u0,v1]]];
 const ids=corners.map(([q,uv])=>{const c=shade(cr,q);let k=shadeK,wr=1;if(loc){const dy=clamp((q[1]-loc.c[1])/loc.r[1],-1,1);k*=.66+.4*(dy*.5+.5);wr=1+.1*dy;}return a.v(q,proxyNormal(cr,q,own,nBias),uv,[c[0]*k*wr,c[1]*k,c[2]*k/wr],leafAmt,shed);});
 a.tri(ids[0],ids[1],ids[2]);a.tri(ids[0],ids[2],ids[3]);
}
/** Displaced low-poly core: dark inner mass that stops the crown reading see-through. */
function core(a:Acc,cr:Crown,c:V3,r:V3,detail:number,rnd:()=>number,dark=.8,shedAt=.02){
 const ico=new THREE.IcosahedronGeometry(1,detail),pos=ico.attributes.position,ph=[rnd()*6.28,rnd()*6.28,rnd()*6.28],map=new Map<string,number>(),ids:number[]=[];
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),l=Math.hypot(x,y,z),ux=x/l,uy=y/l,uz=z/l,key=`${Math.round(x*1e3)},${Math.round(y*1e3)},${Math.round(z*1e3)}`;let id=map.get(key);
  if(id===undefined){const d=1+.16*Math.sin(ux*3.1+ph[0])*Math.sin(uy*2.7+ph[1])+.1*Math.sin(uz*4.3+ph[2]+ux*3)+(detail>0?.09*Math.sin(ux*7.3+uy*5.9+ph[1])*Math.sin(uz*6.1+ph[0]):0);const p:V3=[c[0]+ux*r[0]*d,c[1]+uy*r[1]*d,c[2]+uz*r[2]*d],cc=shade(cr,p);
   id=a.v(p,proxyNormal(cr,p,[ux,uy,uz],.55),SOLID_UV,[cc[0]*dark,cc[1]*dark,cc[2]*dark],1,shedAt);map.set(key,id);}
  ids.push(id);
 }
 for(let i=0;i<ids.length;i+=3)a.tri(ids[i],ids[i+1],ids[i+2]);ico.dispose();
}
type ClumpOpt={c:V3;r:V3;n:number;tile:number;size:[number,number];flat?:number;droop?:number;rnd:()=>number;coreDetail?:number;coreDark?:number;lum?:number;sizeBoost?:number};
/** Clump of leaf cards over a shell, plus an inner core. `flat` lays cards toward horizontal (pads); `droop` hangs them (willow, eucalypt). */
function clump(a:Acc,cr:Crown,o:ClumpOpt){
 const {c,r,rnd}=o,boost=o.sizeBoost??1,mid=boost>1;
 // mid LOD: the core is the visible lump (displaced, baked light), a few cards only break its outline; near LOD: a small dark core hides behind many cards
 if(o.coreDetail!==undefined&&o.coreDetail>=0)core(a,cr,c,mul(r,mid?.62:.3),mid?0:o.coreDetail,rnd,mid?.8:(o.coreDark??.78)*.5);
 const nCards=Math.round(o.n*(mid?.95:1.9));
 for(let i=0;i<nCards;i++){
  // sample a direction on the shell, upper hemisphere weighted (leaves face the light)
  const u=rnd()*2-1,th=rnd()*Math.PI*2,rr=Math.sqrt(1-u*u);let d:V3=[rr*Math.cos(th),u*.9+.1,rr*Math.sin(th)];d=norm(d);
  const rad=(mid?.7:.62)+(mid?.3:.38)*Math.sqrt(rnd()),p:V3=[c[0]+d[0]*r[0]*rad,c[1]+d[1]*r[1]*rad,c[2]+d[2]*r[2]*rad];
  let nrm=norm([d[0]/r[0],d[1]/r[1],d[2]/r[2]]);
  if(o.flat)nrm=norm([nrm[0]*(1-o.flat*.8),lerp(nrm[1],1,o.flat*.85),nrm[2]*(1-o.flat*.8)]);
  if(rnd()<.5)nrm=norm([nrm[0]+(rnd()-.5)*1.6,nrm[1]+(rnd()-.5)*1.6,nrm[2]+(rnd()-.5)*1.6]);
  const t1=norm(cross(nrm,Math.abs(nrm[1])>.92?[1,0,0]:UP)),t2=cross(nrm,t1),phi=rnd()*Math.PI*2;
  let right=add(mul(t1,Math.cos(phi)),mul(t2,Math.sin(phi))),up=add(mul(t1,-Math.sin(phi)),mul(t2,Math.cos(phi)));
  if(o.droop){up=norm(add(mul(up,1-o.droop),[0,-o.droop*1.6,0]));right=norm(cross(up,nrm));}
  const w=lerp(o.size[0],o.size[1],rnd())*.5*boost*(mid?.9:.62),h=w*(.9+rnd()*.3);
  card(a,cr,p,right,up,w,h,o.tile,.05+rnd()*.9,1,o.lum??1,.7,false,{c,r});
 }
}
/** Strip along a curve for needle boughs, fronds and strands. Width taper per point; `across` fixes the strip's orientation. */
function strip(a:Acc,cr:Crown,pts:V3[],widths:number[],tile:number,across:V3,shed:number,leafAmt=1,lum=1,tintFn?:(t:number)=>Rgb,nBias=.55){
 const n=pts.length,[u0,v0,u1,v1]=tileUV(tile),base=a.n;
 for(let i=0;i<n;i++){
  const tan=norm(sub(pts[Math.min(n-1,i+1)],pts[Math.max(0,i-1)]));let side=norm(sub(across,mul(tan,dot(across,tan))));if(len(side)<.2)side=norm(cross(tan,UP));
  const own=norm(cross(side,tan)),t=i/(n-1),v=lerp(v0,v1,t);
  for(const s of [-1,1]){const q=add(pts[i],mul(side,s*widths[i]*.5)),c=tintFn?tintFn(t):shade(cr,q);a.v(q,proxyNormal(cr,q,own[1]<0?mul(own,-1):own,nBias),[s<0?u0:u1,v],[c[0]*lum,c[1]*lum,c[2]*lum],leafAmt,shed);}
 }
 for(let i=0;i<n-1;i++){const p=base+i*2;a.tri(p,p+1,p+2);a.tri(p+1,p+3,p+2);}
}
type Ctx={sp:BotanicalSpecies;v:number;lod:0|1;a:Acc;r:()=>number;rd:()=>number;bark:BarkFn;H:number;age:number;crown:Crown;sideFor:(i:number)=>number};
const AGE={young:{h:.8,r:.78,crown:.88,sparse:1.1,curve:.55,limbs:-1},mature:{h:1,r:1,crown:1,sparse:1,curve:1,limbs:0},old:{h:1.04,r:1.28,crown:1.12,sparse:.82,curve:1.9,limbs:1}};
function trunkPath(c:Ctx,height:number,lean:[number,number],n:number,wob:number):V3[]{
 const {r,sp}=c,ph=r()*6.28,out:V3[]=[];
 for(let i=0;i<n;i++){const t=i/(n-1),w=wob*sp.curve*(c.age===2?1.9:c.age===1?.55:1);out.push([lean[0]*t*t+Math.sin(t*3.1+ph)*.07*w*height/6,height*t,lean[1]*t*t+Math.cos(t*2.7+ph)*.06*w*height/6]);}
 return out;
}
function twigs(c:Ctx,tip:V3,dir:V3,count:number,length:number,rad:number){
 if(c.lod>0)return;
 for(let i=0;i<count;i++){
  const a=c.rd()*Math.PI*2,sp=.5+c.rd()*.7,d=norm([dir[0]+Math.cos(a)*sp,dir[1]*.8+c.rd()*.5,dir[2]+Math.sin(a)*sp]),l=length*(.7+c.rd()*.6);
  tube(c.a,[tip,add(tip,mul(d,l*.55)),add(add(tip,mul(d,l)),[0,-.06*l,0])],[rad,rad*.6,rad*.2],3,c.bark,.9);
 }
}
/** Decurrent crown: trunk forks into limbs that arch outward, fork again, and each end carries a leaf clump. */
function buildDecurrent(c:Ctx){
 const {sp,a,r,lod}=c,H=c.H,age=c.age,m=AGE[['mature','young','old'][age] as 'mature'],forkH=sp.fork*H,leanA=r()*6.28,lean:[number,number]=[Math.cos(leanA)*sp.lean*H,Math.sin(leanA)*sp.lean*H],nT=lod?5:9;
 const tp=trunkPath(c,forkH,lean,nT,1),r0=sp.r0*m.r,rTop=Math.max(sp.rTop*m.r,r0*.42),rad=radii(nT,r0,rTop,sp.flare,.8);
 tube(a,tp,rad,lod?6:9,c.bark);
 // root flare buttresses
 if(lod===0&&sp.flare>.3)for(let i=0;i<4;i++){const an=i/4*Math.PI*2+c.rd()*.8,d:V3=[Math.cos(an),0,Math.sin(an)];tube(a,[[d[0]*r0*.4,r0*.9,d[2]*r0*.4],[d[0]*r0*1.2,r0*.35,d[2]*r0*1.2],[d[0]*r0*2.1,-.04,d[2]*r0*2.1]],[r0*.34,r0*.26,r0*.12],4,c.bark);}
 const top=tp[nT-1],crownTop=forkH+sp.crownH*m.crown,nl=Math.max(2,Math.round(lerp(sp.limbs[0],sp.limbs[1],r())+m.limbs)),clumpR=sp.clumpR*m.crown;
 const clumps:{p:V3;k:number}[]=[];
 for(let i=0;i<nl;i++){
  const R=[r(),r(),r(),r(),r(),r(),r(),r(),r(),r()],az=i/nl*Math.PI*2+R[0]*.7,tS=.62+R[1]*.36,k=Math.floor(tS*(nT-1)),f=tS*(nT-1)-k,pS=add(mul(tp[k],1-f),mul(tp[Math.min(nT-1,k+1)],f)),rS=lerp(rad[k],rad[Math.min(nT-1,k+1)],f)*.7;
  const reach=sp.crownR*m.crown*(.5+.42*R[2]),yEnd=forkH+sp.crownH*m.crown*(.22+.62*R[3]),horizPitch=Math.sin(sp.pitch);
  const end:V3=[pS[0]+Math.cos(az)*reach*(.6+.4*horizPitch),yEnd,pS[2]+Math.sin(az)*reach*(.6+.4*horizPitch)],ctl:V3=[pS[0]+Math.cos(az)*reach*.22,pS[1]+(yEnd-pS[1])*.85+.15*sp.crownH*R[4],pS[2]+Math.sin(az)*reach*.22];
  const broken=age===2&&R[5]<.3,pts=curve(pS,ctl,end,lod?3:5),L=broken?.55:1,use=pts.slice(0,Math.max(2,Math.round(pts.length*L)));
  tube(a,use,use.map((_,j)=>lerp(rS,rS*.2,j/(use.length-1)*L)),lod?5:6,c.bark,.95);
  if(broken){if(lod===0)twigs(c,use[use.length-1],[0,1,0],2,.5,.03);continue;}
  // secondary fork
  const forks=lod?1:2;
  for(let q=0;q<forks;q++){
   const tq=.45+q*.28,pq=bez(pS,ctl,end,tq),tanq=norm(sub(bez(pS,ctl,end,tq+.05),pq)),side=(q%2?1:-1)*(.6+R[6+q]*.5),dir=norm([tanq[0]*.5-tanq[2]*side*.8,tanq[1]*.7+.3,tanq[2]*.5+tanq[0]*side*.8]),l=reach*(.3+.25*R[8+q]),e=add(pq,mul(dir,l)),mid=add(pq,add(mul(dir,l*.5),[0,l*.12,0]));
   tube(a,[pq,mid,e],[rS*.42,rS*.28,rS*.09],lod?4:5,c.bark,.95);clumps.push({p:e,k:.62});twigs(c,e,dir,2,.85,.028);
  }
  clumps.push({p:end,k:1});twigs(c,end,norm(sub(end,pS)),3,1.05,.032);
  clumps.push({p:bez(pS,ctl,end,.58),k:.62});
 }
 // crown top and a few interior fillers so the mass is dense in the middle
 clumps.push({p:[top[0],crownTop-clumpR*.4,top[2]],k:.9});
 const ccy=forkH+sp.crownH*m.crown*.55;c.crown.c=[top[0],ccy,top[2]];c.crown.r=[sp.crownR*m.crown*1.02,sp.crownH*m.crown*.56+.4,sp.crownR*m.crown*1.02];
 const sparse=sp.sparse*m.sparse;
 for(const cl of clumps){
  const cr=clumpR*cl.k,flat=sp.flat,ry=cr*lerp(.82,.42,flat);
  clump(a,c.crown,{c:cl.p,r:[cr*(1+.3*flat),ry,cr*(1+.3*flat)],n:Math.round(sp.cards[lod]*cl.k*sparse),tile:sp.tile,size:sp.cardSize,flat,rnd:c.rd,coreDetail:lod?0:1,coreDark:.82,sizeBoost:lod?1.45:1,droop:sp.id==='eucalyptus'||sp.id==='olive'?.35:0});
 }
 
}
/** Ragged conifer tier for the mid LOD: apex, inner ring, jagged drooping hem; shaded by the crown proxy. */
function skirt(a:Acc,cr:Crown,at:V3,R:number,h:number,k:number,droop:number,rnd:()=>number,dark:number){
 const col=(p:V3,n:V3,k2=1)=>{const c=shade(cr,p);return a.v(p,proxyNormal(cr,p,n,.5),SOLID_UV,[c[0]*dark*k2,c[1]*dark*k2,c[2]*dark*k2],1,-1);};
 const apex=col([at[0],at[1]+h,at[2]],[0,1,0],1.08),under=col([at[0],at[1]+h*.05,at[2]],[0,-1,0],.7),A:number[]=[],B:number[]=[];
 for(let i=0;i<k;i++){const an=i/k*Math.PI*2+rnd()*.3,jr=.78+rnd()*.44,ca=Math.cos(an),sa=Math.sin(an);
  A.push(col([at[0]+ca*R*.52*jr,at[1]+h*.45,at[2]+sa*R*.52*jr],[ca*.6,.7,sa*.6],1.02));B.push(col([at[0]+ca*R*jr,at[1]-h*droop*(.25+.9*rnd()),at[2]+sa*R*jr],[ca,.15,sa],.86));}
 for(let i=0;i<k;i++){const j=(i+1)%k;a.tri(apex,A[i],A[j]);a.tri(A[i],B[i],B[j]);a.tri(A[i],B[j],A[j]);a.tri(under,B[j],B[i]);}
 // needle fringe: a drooping needle card on every hem point breaks the outline
 for(let i=0;i<k;i++){const p=[a.pos[B[i]*3],a.pos[B[i]*3+1],a.pos[B[i]*3+2]] as V3,out=norm([p[0]-at[0],0,p[2]-at[2]]),across=cross(out,UP),w2=Math.max(.5,R*.34);
  strip(a,cr,[add(p,mul(out,-R*.22)),add(add(p,mul(out,R*.04)),[0,-.05*h,0]),add(add(p,mul(out,R*.12)),[0,-h*.55,0])],[w2*.7,w2,w2*.5],TILE.needle,across,-1,1,.96,undefined,.5);}
}
/** Excurrent spire (spruce, fir): straight leader with whorls of drooping or lifted boughs, needle strips on each, and a dark inner cone. */
function buildWhorl(c:Ctx){
 const {sp,a,r,lod}=c,H=c.H,m=AGE[['mature','young','old'][c.age] as 'mature'],r0=sp.r0*m.r,nT=lod?5:8,leanA=r()*6.28,lean:[number,number]=[Math.cos(leanA)*sp.lean*H,Math.sin(leanA)*sp.lean*H];
 const tp=trunkPath(c,H,lean,nT,.5),rad=radii(nT,r0,.025,sp.flare,.85);tube(a,tp,rad,lod?6:8,c.bark);
 if(lod===0)for(let i=0;i<4;i++){const an=i/4*Math.PI*2+c.rd(),d:V3=[Math.cos(an),0,Math.sin(an)];tube(a,[[d[0]*r0*.4,r0*.8,d[2]*r0*.4],[d[0]*r0*1.1,r0*.3,d[2]*r0*1.1],[d[0]*r0*1.8,-.03,d[2]*r0*1.8]],[r0*.3,r0*.22,r0*.1],4,c.bark);}
 const nW=Math.round((lod?8:20)*(c.age===1?.8:1)),y0=H*(sp.fork+.04),Lmax=(sp.whorlLen??3)*m.crown*(c.age===2?.85:1),drp=(sp.whorlDroop??.3)*(c.age===1?.5:1);
 const cr=c.crown;cr.c=[lean[0]*.5,H*.42,lean[1]*.5];cr.r=[Lmax*1.05,H*.5,Lmax*1.05];
 if(lod===1){
  for(let i=0;i<nW;i++){const u=i/(nW-1),y=lerp(y0,H*.94,u),prof=Math.pow(1-u,.85)*.92+.08,R=Lmax*prof*1.08*(.88+.2*r()),h=(H-y0)/nW*1.9,bx=lerp(0,lean[0],(y/H)**2),bz=lerp(0,lean[1],(y/H)**2);
   skirt(a,cr,[bx,y,bz],R,h,11,drp*.9+.15,r,.98);}
  const topP=tp[nT-1];skirt(a,cr,[topP[0],H*.9,topP[2]],.28,H*.1,6,0,r,1);return;
 }
 for(let i=0;i<nW;i++){
  const u=i/(nW-1),y=lerp(y0,H*.97,u),prof=Math.pow(1-u,.85)*.92+.08,L=Lmax*prof*(.82+.2*r()),nb=Math.max(5,Math.round(lerp(10,6,u))),tIdx=Math.min(nT-1,Math.floor(y/H*(nT-1))),base=tp[tIdx];
  for(let k=0;k<nb;k++){
   const az=(k+.5*(i%2))/nb*Math.PI*2+r()*.35,d:V3=[Math.cos(az),0,Math.sin(az)],pitch=lerp(-drp,drp*-.4+.45,u)+(r()-.5)*.25,w=Math.max(.55,L*.85);
   const p0:V3=[base[0]+d[0]*.05,y+(r()-.5)*.25,base[2]+d[2]*.05],pts:V3[]=[];const segs=lod?2:3;
   for(let s=0;s<=segs;s++){const t=s/segs;pts.push([p0[0]+d[0]*L*t,p0[1]+Math.tan(pitch)*L*t-drp*L*t*t*.9+.15*L*t*t*(c.sp.id==='fir'?1:0),p0[2]+d[2]*L*t]);}
   const across=cross(d,UP),widths=pts.map((_,s)=>w*(s===0?.35:Math.sin(Math.min(1,(s/segs)*1.1+.18)*Math.PI*.86)*.9+.1));
   if(lod===0){const wood=pts.slice(0,3).map((q,s)=>add(q,[0,0,0]));tube(a,[wood[0],wood[1],wood[2]],[rad[tIdx]*.28,rad[tIdx]*.16,.025],3,c.bark,.9);}
   strip(a,cr,pts,widths,TILE.needle,across,-1,1,1,undefined,.55);
   if(lod===0){const lift=pts.map(q=>add(q,[0,.14*L,0])),tilt=pts.map((q,s)=>add(q,[0,w*.2*Math.sin(s/segs*Math.PI),0]));void lift;strip(a,cr,tilt.map((q,s)=>add(q,mul(across,.12*w*(s>0?1:0)))),widths.map(x=>x*.8),TILE.needle,norm(add(across,[0,.9,0])),-1,1,.94,undefined,.6);
    if(k%2===0&&u<.8){const e=pts[segs];strip(a,cr,[add(e,[0,.05,0]),add(e,mul(d,.08*L)),add(add(e,mul(d,.12*L)),[0,-.5*L,0])].map((q,s)=>[q[0],q[1]-s*.02,q[2]] as V3),[w*.38,w*.34,w*.2],TILE.needle,across,-1,1,.9,undefined,.5);}}
  }
 }
 // inner dark cone and leader tuft
 const sides=lod?6:8,rings=lod?4:6,cone:number[][]=[];
 for(let i=0;i<=rings;i++){const u=i/rings,y=lerp(y0*.9,H*.99,u),rr=Math.max(.05,Lmax*(1-u)*.5),row:number[]=[];const bx=lerp(0,lean[0],u*u),bz=lerp(0,lean[1],u*u);
  for(let s=0;s<sides;s++){const an=s/sides*Math.PI*2+u*.7,p:V3=[bx+Math.cos(an)*rr,y,bz+Math.sin(an)*rr],col=shade(cr,p);row.push(a.v(p,norm([Math.cos(an),.35,Math.sin(an)]),SOLID_UV,[col[0]*.78,col[1]*.78,col[2]*.78],1,-1));}cone.push(row);}
 for(let i=0;i<rings;i++)for(let s=0;s<sides;s++){const s2=(s+1)%sides;a.tri(cone[i][s],cone[i+1][s],cone[i][s2]);a.tri(cone[i][s2],cone[i+1][s],cone[i+1][s2]);}
 const topP=tp[nT-1];for(let k=0;k<(lod?3:5);k++){const az=k/5*Math.PI*2,d:V3=[Math.cos(az)*.25,1,Math.sin(az)*.25];strip(a,cr,[add(topP,[0,-.5,0]),add(topP,mul(norm(d),.7)),add(topP,mul(norm(d),1.5))],[.35,.3,.05],TILE.needle,cross(d,[1,0,0]),-1);}
}
function buildWeeping(c:Ctx){
 const {sp,a,r,lod}=c,H=c.H,m=AGE[['mature','young','old'][c.age] as 'mature'],forkH=sp.fork*H,leanA=r()*6.28,lean:[number,number]=[Math.cos(leanA)*sp.lean*H,Math.sin(leanA)*sp.lean*H],nT=lod?4:7,tp=trunkPath(c,forkH,lean,nT,1.4),r0=sp.r0*m.r,rad=radii(nT,r0,r0*.5,sp.flare,.7);
 tube(a,tp,rad,lod?6:9,c.bark);if(lod===0)for(let i=0;i<4;i++){const an=i/4*Math.PI*2+c.rd(),d:V3=[Math.cos(an),0,Math.sin(an)];tube(a,[[d[0]*r0*.4,r0*.8,d[2]*r0*.4],[d[0]*r0*1.2,r0*.3,d[2]*r0*1.2],[d[0]*r0*2,-.03,d[2]*r0*2]],[r0*.34,r0*.25,r0*.1],4,c.bark);}
 const top=tp[nT-1],nl=Math.round(lerp(sp.limbs[0],sp.limbs[1],r())+m.limbs),cr=c.crown;cr.c=[top[0],forkH+sp.crownH*.35,top[2]];cr.r=[sp.crownR*1.05,sp.crownH*.7,sp.crownR*1.05];
 for(let i=0;i<nl;i++){
  const az=i/nl*Math.PI*2+r()*.6,reach=sp.crownR*(.62+.3*r()),yEnd=forkH+sp.crownH*(.7+.3*r()),end:V3=[top[0]+Math.cos(az)*reach,yEnd,top[2]+Math.sin(az)*reach],ctl:V3=[top[0]+Math.cos(az)*reach*.2,forkH+sp.crownH*1.1,top[2]+Math.sin(az)*reach*.2],pts=curve(top,ctl,end,lod?3:5);
  tube(a,pts,pts.map((_,j)=>lerp(rad[nT-1]*.72,rad[nT-1]*.16,j/(pts.length-1))),lod?4:6,c.bark,.95);
  clump(a,cr,{c:add(end,[0,.2,0]),r:[sp.clumpR*.7,sp.clumpR*.5,sp.clumpR*.7],n:Math.round(sp.cards[lod]*.45),tile:TILE.narrow,size:sp.cardSize,rnd:c.rd,coreDetail:lod?0:0,coreDark:.8,sizeBoost:lod?1.4:1});
  const ns=lod?4:8;
  for(let s=0;s<ns;s++){const t=.35+.65*(s/(ns-1)),p=bez(top,ctl,end,t),dir:V3=[Math.cos(az+(r()-.5)*.6),0,Math.sin(az+(r()-.5)*.6)],len2=1.7+r()*1.9;
   const q0=add(p,mul(dir,.15)),q1=add(add(q0,mul(dir,.12)),[0,-len2*.5,0]),q2=add(add(q0,mul(dir,.05)),[0,-len2,0]);
   strip(a,cr,[q0,q1,q2],[.5,.62,.36],TILE.narrow,cross(dir,UP),.06+r()*.9,1,.95,undefined,.4);
   strip(a,cr,[q0,add(q1,mul(dir,.1)),add(q2,mul(dir,.14))],[.45,.55,.3],TILE.narrow,[0,0,1],.06+r()*.9,1,.9,undefined,.4);}
 }
 clump(a,cr,{c:[top[0],forkH+sp.crownH*.95,top[2]],r:[sp.crownR*.55,sp.crownH*.28,sp.crownR*.55],n:Math.round(sp.cards[lod]*.7),tile:TILE.narrow,size:sp.cardSize,rnd:c.rd,coreDetail:lod?0:1,coreDark:.82,sizeBoost:lod?1.4:1,droop:.3});
}
function buildPalm(c:Ctx){
 const {sp,a,r,lod}=c,H=c.H,m=AGE[['mature','young','old'][c.age] as 'mature'],nT=lod?6:12,leanA=r()*6.28,lean:[number,number]=[Math.cos(leanA)*sp.lean*H,Math.sin(leanA)*sp.lean*H],r0=sp.r0*m.r;
 const tp:V3[]=[];for(let i=0;i<nT;i++){const t=i/(nT-1);tp.push([lean[0]*Math.pow(t,1.7)+Math.sin(t*4)*.06,H*t,lean[1]*Math.pow(t,1.7)]);}
 const rad=Array.from({length:nT},(_,i)=>{const t=i/(nT-1);return lerp(r0,sp.rTop*m.r,t)*(1+sp.flare*Math.exp(-t*12))*(sp.id==='coconutPalm'?1+.12*Math.exp(-t*30):1);});
 tube(a,tp,rad,lod?6:9,c.bark);
 const top=tp[nT-1],nf=Math.round((sp.fronds??12)*(c.age===1?.75:1)*(lod?.75:1)),cr=c.crown;cr.c=add(top,[0,.6,0]);cr.r=[sp.crownR,sp.crownH,sp.crownR];cr.dark=.6;
 const cocos=sp.id==='coconutPalm';
 for(let i=0;i<nf;i++){
  const az=i/nf*Math.PI*2+Math.sin(i*2.1)*.22,up=i%3===0?.9:i%3===1?.45:.1,L=sp.crownR*(.92+.2*Math.sin(i*1.7)),d:V3=[Math.cos(az),0,Math.sin(az)],pts:V3[]=[],segs=lod?3:5;
  const dead=sp.id==='datePalm'&&i%5===4;
  for(let s=0;s<=segs;s++){const t=s/segs;pts.push([top[0]+d[0]*L*t,top[1]+.25+up*L*Math.sin(t*Math.PI*.55)*.55-(cocos?.95:.55)*L*t*t*(1-up*.4),top[2]+d[2]*L*t]);}
  const wdt=(cocos?1.05:.9),w=pts.map((_,s)=>wdt*Math.sin(Math.min(1,s/segs*1.15+.1)*Math.PI*.9)*(1-.2*s/segs)+.05);
  strip(a,cr,pts,w,TILE.frond,[Math.cos(az+Math.PI/2),0.15,Math.sin(az+Math.PI/2)],-1,dead?.3:1,dead?.8:1,dead?()=>[.62,.5,.3]:undefined,.5);
  strip(a,cr,pts.map(q=>add(q,[0,.04,0])),w.map(x=>x*.92),TILE.frond,[Math.cos(az+Math.PI/2),-.6,Math.sin(az+Math.PI/2)],-1,dead?.3:1,dead?.8:.92,dead?()=>[.58,.46,.28]:undefined,.5);
 }
 if(cocos)for(let i=0;i<(lod?3:6);i++){const an=i/6*6.28,p:V3=[top[0]+Math.cos(an)*.28,top[1]-.15,top[2]+Math.sin(an)*.28];core(a,{...cr,top:[.5,.42,.2],bottom:[.4,.32,.15]},p,[.16,.2,.16],0,c.rd,1,-1);}
 else if(!lod)for(let i=0;i<3;i++){const an=i/3*6.28+.6,p:V3=[top[0]+Math.cos(an)*.35,top[1]-.35,top[2]+Math.sin(an)*.35];core(a,{...cr,top:[.78,.5,.2],bottom:[.55,.34,.14]},p,[.2,.32,.2],0,c.rd,1,-1);}
 // base suckers / shaggy dead-frond skirt on the date palm
 if(sp.id==='datePalm'&&!lod)for(let i=0;i<9;i++){const an=i/9*6.28,y=H*(.78+.2*(i%2)),p=tp[Math.min(nT-1,Math.floor(y/H*(nT-1)))];strip(a,cr,[add(p,[Math.cos(an)*r0*.8,0,Math.sin(an)*r0*.8]),add(p,[Math.cos(an)*r0*2,-.5,Math.sin(an)*r0*2]),add(p,[Math.cos(an)*r0*2.2,-1.3,Math.sin(an)*r0*2.2])],[.22,.3,.16],TILE.frond,[-Math.sin(an),0,Math.cos(an)],-1,.25,.7,()=>[.5,.4,.26]);}
}
/** Flat-topped umbrella (acacia, stone pine): leaning bole, a few ascending limbs, then wide horizontal pads of foliage. */
function buildUmbrella(c:Ctx){
 const {sp,a,r,lod}=c,H=c.H,m=AGE[['mature','young','old'][c.age] as 'mature'],forkH=sp.fork*H,leanA=r()*6.28,lean:[number,number]=[Math.cos(leanA)*sp.lean*H,Math.sin(leanA)*sp.lean*H],nT=lod?5:9,tp=trunkPath(c,forkH,lean,nT,1.6),r0=sp.r0*m.r,rad=radii(nT,r0,r0*.55,sp.flare,.8);
 tube(a,tp,rad,lod?6:9,c.bark);if(lod===0)for(let i=0;i<4;i++){const an=i/4*Math.PI*2+c.rd(),d:V3=[Math.cos(an),0,Math.sin(an)];tube(a,[[d[0]*r0*.4,r0*.9,d[2]*r0*.4],[d[0]*r0*1.2,r0*.3,d[2]*r0*1.2],[d[0]*r0*2,-.03,d[2]*r0*2]],[r0*.32,r0*.24,r0*.1],4,c.bark);}
 const top=tp[nT-1],nl=Math.round(lerp(sp.limbs[0],sp.limbs[1],r())+m.limbs),cr=c.crown,crH=sp.crownH*m.crown;cr.c=[top[0],forkH+crH*.5,top[2]];cr.r=[sp.crownR*m.crown,crH*.62,sp.crownR*m.crown];cr.dark=.7;
 for(let i=0;i<nl;i++){
  const az=i/nl*Math.PI*2+r()*.7,reach=sp.crownR*m.crown*(.38+.38*r()),yEnd=forkH+crH*(.5+.45*r()),end:V3=[top[0]+Math.cos(az)*reach,yEnd,top[2]+Math.sin(az)*reach],ctl:V3=[top[0]+Math.cos(az)*reach*.2,forkH+crH*.5,top[2]+Math.sin(az)*reach*.2],pts=curve(top,ctl,end,lod?3:5);
  tube(a,pts,pts.map((_,j)=>lerp(rad[nT-1]*.8,rad[nT-1]*.2,j/(pts.length-1))),lod?4:6,c.bark);
  const pr=sp.clumpR*m.crown*(.8+.5*r());
  clump(a,cr,{c:add(end,[0,crH*.12,0]),r:[pr*1.35,pr*.4,pr*1.35],n:Math.round(sp.cards[lod]*sp.sparse*m.sparse),tile:sp.tile,size:sp.cardSize,flat:sp.flat,rnd:c.rd,coreDetail:lod?0:1,coreDark:.8,sizeBoost:lod?1.4:1});
  twigs(c,end,[Math.cos(az),.3,Math.sin(az)],3,1,.03);
 }
}
function buildBottle(c:Ctx){
 const {sp,a,r,lod}=c,H=c.H,m=AGE[['mature','young','old'][c.age] as 'mature'],forkH=sp.fork*H,nT=lod?6:11,r0=sp.r0*m.r,tp:V3[]=[],rad:number[]=[];
 for(let i=0;i<nT;i++){const t=i/(nT-1);tp.push([Math.sin(t*3)*.08,forkH*t,0]);rad.push(lerp(r0,sp.rTop*m.r,Math.pow(t,1.5))*(1+.28*Math.sin(Math.min(1,t*1.6)*Math.PI*.8))*(1+sp.flare*Math.exp(-t*10)));}
 tube(a,tp,rad,lod?8:12,c.bark);
 const top=tp[nT-1],nl=Math.round(lerp(sp.limbs[0],sp.limbs[1],r())),cr=c.crown;cr.c=[0,forkH+sp.crownH*.5,0];cr.r=[sp.crownR,sp.crownH*.7,sp.crownR];cr.dark=.7;
 for(let i=0;i<nl;i++){
  const az=i/nl*Math.PI*2+r()*.5,reach=sp.crownR*(.45+.4*r()),yEnd=forkH+sp.crownH*(.4+.55*r()),end:V3=[Math.cos(az)*reach,yEnd,Math.sin(az)*reach],ctl:V3=[Math.cos(az)*reach*.25,forkH+.5,Math.sin(az)*reach*.25],pts=curve([top[0],top[1]-.1,top[2]],ctl,end,lod?3:5);
  tube(a,pts,pts.map((_,j)=>lerp(rad[nT-1]*.55,rad[nT-1]*.12,j/(pts.length-1))),lod?4:6,c.bark);twigs(c,end,[Math.cos(az),.4,Math.sin(az)],3,1.1,.035);
  clump(a,cr,{c:add(end,[0,.2,0]),r:[sp.clumpR*.8,sp.clumpR*.45,sp.clumpR*.8],n:Math.round(sp.cards[lod]*sp.sparse),tile:sp.tile,size:sp.cardSize,flat:sp.flat,rnd:c.rd,coreDetail:0,coreDark:.8,sizeBoost:lod?1.4:1});
 }
}
function buildMangrove(c:Ctx){
 const {sp,a,r,lod}=c;buildDecurrent({...c,sp:{...sp,fork:.45,H:sp.H}} as Ctx);
 const H=c.H,n=lod?5:9;
 for(let i=0;i<n;i++){const an=i/n*Math.PI*2+r()*.5,d:V3=[Math.cos(an),0,Math.sin(an)],y0=H*(.28+.1*r()),reach=1.2+r()*1.3,pts=curve([d[0]*.1,y0,d[2]*.1],[d[0]*reach*.55,y0+.5,d[2]*reach*.55],[d[0]*reach,-.05,d[2]*reach],lod?3:5);
  tube(a,pts,pts.map((_,j)=>lerp(.09,.045,j/(pts.length-1))),lod?4:5,c.bark);}
}
function buildShrub(c:Ctx){
 const {sp,a,r,lod}=c,m=AGE[['mature','young','old'][c.age] as 'mature'],ns=Math.round(lerp(sp.limbs[0],sp.limbs[1],r())),cr=c.crown,H=c.H;cr.c=[0,H*.55,0];cr.r=[sp.crownR*m.crown,H*.5,sp.crownR*m.crown];cr.dark=.62;
 for(let i=0;i<ns;i++){
  const az=i/ns*Math.PI*2+r()*.7,out=sp.crownR*m.crown*(.4+.4*r()),yEnd=H*(.65+.4*r()),end:V3=[Math.cos(az)*out,yEnd,Math.sin(az)*out],ctl:V3=[Math.cos(az)*out*.15,yEnd*.7,Math.sin(az)*out*.15],pts=curve([Math.cos(az)*.06,0,Math.sin(az)*.06],ctl,end,lod?3:4);
  tube(a,pts,pts.map((_,j)=>lerp(sp.r0*m.r,sp.r0*.22,j/(pts.length-1))),lod?4:5,c.bark);twigs(c,end,[Math.cos(az),.5,Math.sin(az)],3,.8,.025);
  clump(a,cr,{c:add(end,[0,.1,0]),r:[sp.clumpR*(.8+.2*r()),sp.clumpR*.65,sp.clumpR*(.8+.2*r())],n:Math.round(sp.cards[lod]*(sp.sparse*m.sparse)),tile:sp.tile,size:sp.cardSize,flat:sp.flat,rnd:c.rd,coreDetail:lod?0:1,coreDark:.8,sizeBoost:lod?1.4:1,droop:sp.tile===TILE.narrow?.3:0});
 }
}
function buildColumn(c:Ctx){
 const {sp,a,r,lod}=c,H=c.H,m=AGE[['mature','young','old'][c.age] as 'mature'],nT=4,tp=trunkPath(c,H*.2,[0,0],nT,.5);tube(a,tp,radii(nT,sp.r0*m.r,sp.rTop*m.r,sp.flare),lod?6:7,c.bark);
 const cr=c.crown;cr.c=[0,H*.55,0];cr.r=[sp.crownR,H*.5,sp.crownR];cr.dark=.62;const nc=lod?6:9;
 for(let i=0;i<nc;i++){const u=i/(nc-1),y=lerp(H*.14,H*.96,u),w=sp.crownR*Math.pow(Math.sin(Math.min(1,u*.95+.12)*Math.PI*.92),.7)*(.8+.2*r()),hh=(H*.82/nc)*1.25;
  clump(a,cr,{c:[(r()-.5)*.25,y,(r()-.5)*.25],r:[w,hh,w],n:Math.round(sp.cards[lod]*(i===nc-1?.5:1)),tile:TILE.needle,size:sp.cardSize,rnd:c.rd,coreDetail:lod?0:1,coreDark:.78,sizeBoost:lod?1.35:1});}
}
function buildSnag(c:Ctx){
 const {sp,a,r,lod}=c,H=c.H,m=AGE[['mature','young','old'][c.age] as 'mature'],nT=lod?5:9,leanA=r()*6.28,lean:[number,number]=[Math.cos(leanA)*sp.lean*H,Math.sin(leanA)*sp.lean*H],tp=trunkPath(c,H,lean,nT,2),r0=sp.r0*m.r,rad=radii(nT,r0,sp.rTop*.7,sp.flare,.8);
 tube(a,tp,rad,lod?6:8,c.bark,1,0,true);
 const nl=Math.round(lerp(sp.limbs[0],sp.limbs[1],r()));
 for(let i=0;i<nl;i++){const az=i/nl*6.28+r(),t=.35+.5*r(),k=Math.floor(t*(nT-1)),p=tp[k],l=1.3+r()*1.6,d:V3=norm([Math.cos(az),.7+r()*.5,Math.sin(az)]),e=add(p,mul(d,l)),pts=curve(p,add(p,mul(d,l*.55)),add(e,[0,-.1*l,0]),lod?3:4);tube(a,pts,pts.map((_,j)=>lerp(rad[k]*.5,rad[k]*.14,j/(pts.length-1))),lod?4:5,c.bark,.95,0,true);if(!lod&&r()<.6)twigs(c,e,d,2,.7,.022);}
}
const BUILDERS:Record<string,(c:Ctx)=>void>={decurrent:buildDecurrent,whorl:buildWhorl,weeping:buildWeeping,palm:buildPalm,umbrella:buildUmbrella,bottle:buildBottle,mangrove:buildMangrove,shrub:buildShrub,column:buildColumn,snag:buildSnag};
export type TreeGeometry={geometry:THREE.BufferGeometry;/** crown centre and half extents (leaf vertices) for impostors and shadows */crownCenter:V3;crownHalf:V3;height:number;trunkRadius:number;triangles:number};
const cache=new Map<string,TreeGeometry>();
/** Deterministic: the same (species, variant, lod) always gives the same geometry. */
/** `cardScale` multiplies every leaf-card count of the species (tree detail steps); 1 is the original tree. Only one non-1 scale is kept cached at a time. */
export function botanicalTree(speciesId:string,variant:number,lod:Lod=0,cardScale:number=1):TreeGeometry{
 const v=((variant%VARIANTS_PER_SPECIES)+VARIANTS_PER_SPECIES)%VARIANTS_PER_SPECIES,ck=cardScale===1?'':`|c${Math.round(cardScale*100)}`,key=`${speciesId}|${v}|${lod}${ck}`,hit=cache.get(key);if(hit)return hit;
 if(ck)for(const k of [...cache.keys()])if(k.includes('|c')&&!k.endsWith(ck))cache.delete(k);
 const sp0=SPECIES_BY_ID[speciesId];if(!sp0)throw new Error('unknown tree species '+speciesId);
 const sp=cardScale===1?sp0:{...sp0,cards:[Math.max(sp0.cards[0]?3:0,Math.round(sp0.cards[0]*cardScale)),Math.max(sp0.cards[1]?2:0,Math.round(sp0.cards[1]*cardScale))] as [number,number]};
 const idx=BOTANICAL_SPECIES.indexOf(sp0),seed=idx*7919+v*104729+17,m=AGE[['mature','young','old'][v] as 'mature'];
 const a=new Acc(),hero=lod===2,L=(hero?0:lod) as 0|1,rnd=rngFrom(seed),H=sp.H*m.h*(.94+.12*rngFrom(seed+3)());
 const crown:Crown={c:[0,H*.5,0],r:[sp.crownR,H*.45,sp.crownR],top:sp.top,bottom:sp.bottom,dark:.55};
 if(hero){a.hero=true;a.rec=[];a.relief=({ridged:.2,rough:.22,gnarled:.28,scaly:.14,peeling:.12,ringed:.06,smooth:.05,birch:.06} as Record<string,number>)[sp.bark.pattern]??.1;}
 const ctx:Ctx={sp,v,lod:L,a,r:rnd,rd:rngFrom(seed*3+11),bark:barkFn(sp,rngFrom(seed+9)()),H,age:v,crown,sideFor:()=>1};
 BUILDERS[sp.arch](ctx);
 if(hero){const base=a.idx.length/3;a.hero=false;const rec=a.rec!;a.rec=null;heroPass(BOTANICAL_PRIMS,{sp,a,crown,H,age:v,rh:rngFrom(seed*5+23),bark:ctx.bark},rec,base);}
 const g=a.geometry(),pos=g.attributes.position,leaf=g.attributes.aLeaf;let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9,minZ=1e9,maxZ=-1e9,any=false;
 for(let i=0;i<pos.count;i++){if(leaf.getX(i)<.5)continue;any=true;const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
 if(!any){minX=-.5;maxX=.5;minY=H*.7;maxY=H;minZ=-.5;maxZ=.5;}
 // keep everything above the ground plane
 for(let i=0;i<pos.count;i++)if(pos.getY(i)<0)pos.setY(i,0);g.computeBoundingBox();g.computeBoundingSphere();
 const out:TreeGeometry={geometry:g,crownCenter:[(minX+maxX)/2,(minY+maxY)/2,(minZ+maxZ)/2],crownHalf:[(maxX-minX)/2,(maxY-minY)/2,(maxZ-minZ)/2],height:g.boundingBox!.max.y,trunkRadius:sp.r0*m.r,triangles:g.index!.count/3};
 cache.set(key,out);return out;
}
export function clearBotanicalCache(){for(const t of cache.values())t.geometry.dispose();cache.clear();}

/** Felled-tree stump: unit radius, 0.55 tall, flared foot with root buttresses, rough bark and a pale cut face with growth rings. Instance scale sets size. */
export function botanicalStump(){
 const a=new Acc(),rnd=rngFrom(777),sides=11,bark=barkFn(SPECIES_BY_ID.oak,.31),pts:V3[]=[[0,0,0],[0,.14,0],[0,.32,0],[0,.5,0]];
 tube(a,pts,[1.34,1.06,.99,.95],sides,bark);
 for(let i=0;i<3;i++){const an=i/3*Math.PI*2+rnd(),d:V3=[Math.cos(an),0,Math.sin(an)];tube(a,[[d[0]*.7,.3,d[2]*.7],[d[0]*1.3,.1,d[2]*1.3],[d[0]*1.9,-.02,d[2]*1.9]],[.3,.22,.1],4,bark);}
 const wood:Rgb[]=([[.78,.64,.44],[.7,.55,.36],[.62,.48,.3]] as Rgb[]).map(c=>[c[0]*c[0],c[1]*c[1],c[2]*c[2]] as Rgb),ringsN=3,ids:number[][]=[];
 for(let r=0;r<=ringsN;r++){const row:number[]=[],rr=r===ringsN?0:(1-r/ringsN)*.95,c=wood[r%3];for(let s=0;s<sides;s++){const an=s/sides*Math.PI*2;row.push(a.v([Math.cos(an)*rr,.5+.02*Math.sin(an*3+r),Math.sin(an)*rr],[0,1,0],SOLID_UV,r===ringsN?[.3,.16,.06]:c,0,-1));}ids.push(row);}
 for(let r=0;r<ringsN;r++)for(let s=0;s<sides;s++){const s2=(s+1)%sides;a.tri(ids[r][s],ids[r+1][s],ids[r][s2]);a.tri(ids[r][s2],ids[r+1][s],ids[r+1][s2]);}
 const g=a.geometry();return g;
}
/** Primitive builders shared with the understory module (same attribute layout, same material). */
export const BOTANICAL_PRIMS={Acc,tube,strip,card,core,shade,barkFn,SOLID_UV,add,sub,mul,norm,cross,mix,clamp,lerp,smooth,UP,curve,bez};
export type BotanicalCrown=Crown;
