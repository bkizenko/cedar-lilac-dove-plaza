import * as THREE from 'three';
import {BOTANICAL_PRIMS as P,botanicalStump,botanicalTree,type V3} from './treeBotany';
import {TILE,tileUV} from './botanicalMaterial';
import {SPECIES_BY_ID} from './botanicalSpecies';
import {rngFrom} from './painterTrees';
/** Understory and forest-floor geometry on the botanical atlas: leaf-card grass, tall and dry grass, ferns and bracken, reeds, bushes grown from the
 * hawthorn/juniper skeletons, mushrooms, fallen logs with moss and bracket fungus, stumps, deadwood piles and moss mounds. Same attribute layout as
 * the trees (`aLeaf` tint amount, `aShed` -1) so one material draws them; rooted at y=0, deterministic, nonblocking decoration only. */
export const UNDERSTORY_KINDS=['flowers','grass','tallgrass','drygrass','fern','bracken','reeds','bush','mushroom','log','stump','deadwood','moss'] as const;
export type UnderstoryKind=typeof UNDERSTORY_KINDS[number];
type Rgb=[number,number,number];
const {Acc,tube,strip,barkFn,SOLID_UV,add,mul,norm,cross,mix,UP}=P;
/** Upright leaf quad with a base-to-tip colour ramp. */
function blade(a:InstanceType<typeof Acc>,base:V3,yaw:number,tilt:number,w:number,h:number,tile:number,cb:Rgb,ct:Rgb,leaf=1,bend=0){
 const [u0,v0,u1,v1]=tileUV(tile),right:V3=[Math.cos(yaw),0,Math.sin(yaw)],fwd:V3=[-Math.sin(yaw),0,Math.cos(yaw)],up=norm([fwd[0]*Math.sin(tilt),Math.cos(tilt),fwd[2]*Math.sin(tilt)]),n=norm(cross(right,up));
 const mid=add(base,add(mul(up,h*.5),mul(fwd,bend*h*.5))),top=add(base,add(mul(up,h),mul(fwd,bend*h*1.1)));
 const ids=[[base,[u0,v0],cb],[base,[u1,v0],cb],[mid,[u1,(v0+v1)/2],mix(cb,ct,.55)],[mid,[u0,(v0+v1)/2],mix(cb,ct,.55)],[top,[u1,v1],ct],[top,[u0,v1],ct]].map(([p,uv,c],i)=>{
  const q=add(p as V3,mul(right,(i%2?1:-1)*w*(i<2?.5:i<4?.5:.3)));return a.v(q,norm([n[0],n[1]+.5,n[2]]),uv as [number,number],c as Rgb,leaf,-1);});
 a.tri(ids[0],ids[1],ids[2]);a.tri(ids[0],ids[2],ids[3]);a.tri(ids[3],ids[2],ids[4]);a.tri(ids[3],ids[4],ids[5]);
}
const DARK:Rgb=[.55,.6,.45],LIGHT:Rgb=[1.15,1.18,.85];
function tuft(count:number,rad:number,h:[number,number],w:[number,number],seed:number,lean=.25){
 const a=new Acc(),r=rngFrom(seed);
 for(let i=0;i<count;i++){const an=i/count*Math.PI*2+r()*.5,d=Math.sqrt(r())*rad;blade(a,[Math.cos(an)*d,0,Math.sin(an)*d],an+Math.PI/2+(r()-.5)*.8,lean*(.4+r()),w[0]+(w[1]-w[0])*r(),h[0]+(h[1]-h[0])*r(),TILE.grass,DARK,LIGHT,1,.35+r()*.4);}
 return a;
}
function frondFan(count:number,len:number,w:number,seed:number,rise:number,droop:number,tile:number){
 const a=new Acc(),r=rngFrom(seed),crown={c:[0,len*.5,0] as V3,r:[len,len*.6,len] as V3,top:[1.15,1.2,.85] as Rgb,bottom:[.58,.74,.52] as Rgb,dark:.6};
 for(let i=0;i<count;i++){
  const an=i/count*Math.PI*2+r()*.4,L=len*(.75+.35*r()),up=rise*(.6+.6*r()),d:V3=[Math.cos(an),0,Math.sin(an)],pts:V3[]=[];
  for(let s=0;s<=4;s++){const t=s/4;pts.push([d[0]*L*t*.95,.06+up*Math.sin(t*Math.PI*.6)*L*.55-droop*L*t*t*.6,d[2]*L*t*.95]);}
  const widths=pts.map((_,s)=>w*L*(.2+.8*Math.sin(Math.min(1,s/4*1.1+.12)*Math.PI*.9)));
  strip(a,crown,pts,widths,tile,[-d[2],.35,d[0]],-1,1,1);
 }
 return a;
}
function mushroomCluster(){
 const a=new Acc(),r=rngFrom(881),caps:Rgb[]=[[.55,.36,.22],[.82,.74,.6],[.72,.14,.1],[.62,.5,.32]];
 for(let i=0;i<5;i++){
  const x=(r()-.5)*.34,z=(r()-.5)*.34,h=.07+r()*.1,cw=.05+r()*.06,cap=caps[Math.floor(r()*caps.length*.999)],stalk:Rgb=[.82,.78,.7];
  tube(a,[[x,0,z],[x,h*.5,z],[x,h,z]],[cw*.3,cw*.24,cw*.22],5,()=>[stalk[0]*stalk[0],stalk[1]*stalk[1],stalk[2]*stalk[2]],1,0);
  const rows=3,seg=8,ring:number[][]=[],c2:Rgb=[cap[0]*cap[0],cap[1]*cap[1],cap[2]*cap[2]];
  for(let k=0;k<=rows;k++){const t=k/rows,an=t*Math.PI*.5,rr=cw*Math.cos(an),yy=h+cw*.55*Math.sin(an),row:number[]=[];for(let s=0;s<seg;s++){const b=s/seg*Math.PI*2;row.push(a.v([x+Math.cos(b)*rr,yy,z+Math.sin(b)*rr],norm([Math.cos(b)*Math.cos(an),Math.sin(an)+.2,Math.sin(b)*Math.cos(an)]),SOLID_UV,k===rows&&cap[0]>.7&&cap[1]<.2?[1,.92,.8]:c2,0,-1));}ring.push(row);}
  for(let k=0;k<rows;k++)for(let s=0;s<seg;s++){const s2=(s+1)%seg;a.tri(ring[k][s],ring[k+1][s],ring[k][s2]);a.tri(ring[k][s2],ring[k+1][s],ring[k+1][s2]);}
 }
 return a;
}
function fallenLog(){
 const a=new Acc(),r=rngFrom(551),bark=barkFn({...SPECIES_BY_ID.oak,bark:{...SPECIES_BY_ID.oak.bark,moss:.95}},.37),n=6,L=2.7,pts:V3[]=[],rad:number[]=[];
 for(let i=0;i<n;i++){const t=i/(n-1);pts.push([-L/2+L*t,.2+Math.sin(t*3)*.02,Math.sin(t*2.2)*.05]);rad.push(.25-.05*t+.012*Math.sin(i*2.3));}
 tube(a,pts,rad,9,(t,ang)=>{const c=bark(t,ang+Math.PI*.5);return c;},1,0);
 // broken end: pale cut face, jagged
 const sides=9,face=a.n;for(let s=0;s<sides;s++){const an=s/sides*Math.PI*2;a.v([L/2+.01,.2+Math.cos(an)*rad[n-1]*.98,Math.sin(an)*rad[n-1]*.98],[1,0,0],SOLID_UV,[.5,.38,.24],0,-1);}
 const cen=a.v([L/2+.02,.2,0],[1,0,0],SOLID_UV,[.32,.22,.14],0,-1);for(let s=0;s<sides;s++)a.tri(face+s,face+(s+1)%sides,cen);
 // stubs and bracket fungus
 for(let i=0;i<3;i++){const t=.2+.6*r(),an=Math.PI*(.3+1.3*r()),p:V3=[pts[0][0]+L*t,.2+Math.cos(an)*.2,Math.sin(an)*.2],d=norm([r()-.5,Math.cos(an)*.9+.3,Math.sin(an)]);tube(a,[p,add(p,mul(d,.18)),add(p,mul(d,.34))],[.05,.04,.025],4,bark,1,0,true);}
 for(let i=0;i<2;i++){const t=.3+.5*r(),an=Math.PI*.15+r()*.6,x=pts[0][0]+L*t,cy=.2+Math.cos(an)*.24,cz=-Math.sin(an)*.24,ids:number[]=[];
  for(let s=0;s<=4;s++){const b=s/4*Math.PI;ids.push(a.v([x+Math.cos(b)*.08,cy-.01,cz-Math.sin(b)*.1],[0,.3,-1],SOLID_UV,[.62*.62,.5*.5,.34*.34],0,-1));}const c=a.v([x,cy,cz],[0,.3,-1],SOLID_UV,[.45*.45,.34*.34,.2*.2],0,-1);for(let s=0;s<4;s++)a.tri(ids[s],ids[s+1],c);}
 return a;
}
function deadwoodPile(){
 const a=new Acc(),r=rngFrom(631),bark=barkFn({...SPECIES_BY_ID.oak,bark:{...SPECIES_BY_ID.oak.bark,moss:.2}},.5);
 for(let i=0;i<6;i++){const an=r()*Math.PI,l=.8+r()*.8,cx=(r()-.5)*.35,cz=(r()-.5)*.35,y=.05+.07*i*.6,d:V3=[Math.cos(an),(r()-.5)*.25,Math.sin(an)],p0=add([cx,y,cz],mul(d,-l/2)),p1=add([cx,y,cz],mul(d,l/2));
  tube(a,[p0,add(mul(add(p0,p1),.5),[0,.03,0]),p1],[.035+r()*.02,.03+r()*.015,.022],5,bark,1,0,true);
  if(r()<.6){const m=add(mul(add(p0,p1),.5),[0,.02,0]),side=norm(cross(d,UP));tube(a,[m,add(m,mul(norm(add(side,[0,.6,0])),.25)),add(m,mul(norm(add(side,[0,.3,0])),.5))],[.018,.013,.008],3,bark,1,0,true);}}
 return a;
}
function mossMound(){
 const a=new Acc(),r=rngFrom(417);
 for(let k=0;k<3;k++){
  const cx=(k-1)*.34+(r()-.5)*.1,cz=(r()-.5)*.3,R=.32+r()*.2,H=.1+r()*.06,rows=3,seg=9,ids:number[][]=[];
  for(let q=0;q<=rows;q++){const t=q/rows,an=t*Math.PI*.5,rr=R*Math.cos(an)*(1+.15*Math.sin(q*3+k)),yy=H*Math.sin(an),row:number[]=[];
   for(let s=0;s<seg;s++){const b=s/seg*Math.PI*2,rj=rr*(1+.12*Math.sin(b*3+k*2));const l=.7+.45*t;row.push(a.v([cx+Math.cos(b)*rj,yy,cz+Math.sin(b)*rj],norm([Math.cos(b)*Math.cos(an)*.6,Math.sin(an)+.3,Math.sin(b)*Math.cos(an)*.6]),SOLID_UV,[.42*l*.72,.62*l*.8,.26*l*.72],.55,-1));}ids.push(row);}
  for(let q=0;q<rows;q++)for(let s=0;s<seg;s++){const s2=(s+1)%seg;a.tri(ids[q][s],ids[q+1][s],ids[q][s2]);a.tri(ids[q][s2],ids[q+1][s],ids[q+1][s2]);}
 }
 return a;
}
const cache=new Map<string,THREE.BufferGeometry>();
function finish(a:InstanceType<typeof Acc>,scale=1){const g=a.geometry();if(scale!==1)g.scale(scale,scale,scale);const p=g.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<0)p.setY(i,0);g.computeBoundingBox();g.computeBoundingSphere();return g;}
/** Deterministic: the same kind always gives the same geometry (shared; callers must not dispose it). */
export function understoryGeometry(kind:UnderstoryKind):THREE.BufferGeometry{
 let g=cache.get(kind);if(g)return g;
 switch(kind){
  case 'grass':g=finish(tuft(7,.3,[.45,.85],[.5,.8],401));break;
  case 'flowers':{const a=tuft(7,.4,[.22,.5],[.4,.6],404),r=rngFrom(403);for(let i=0;i<6;i++){const an=r()*6.28,d=Math.sqrt(r())*.38,h=.32+r()*.34,x=Math.cos(an)*d,z=Math.sin(an)*d;tube(a,[[x,0,z],[x+.03,h*.55,z],[x+.05,h,z]],[.012,.01,.008],3,()=>[.2,.4,.12],1,1);}g=finish(a);break;}
  case 'tallgrass':g=finish(tuft(7,.28,[.9,1.5],[.5,.75],402,.3));break;
  case 'drygrass':g=finish(tuft(6,.3,[.6,1.1],[.45,.7],403,.4));break;
  case 'fern':g=finish(frondFan(8,.95,.2,411,.55,.9,TILE.fern));break;
  case 'bracken':g=finish(frondFan(10,1.5,.26,412,.7,.7,TILE.fern));break;
  case 'reeds':{const r=rngFrom(421),a=new Acc();for(let i=0;i<9;i++){const an=r()*6.28,d=Math.sqrt(r())*.4;blade(a,[Math.cos(an)*d,0,Math.sin(an)*d],an+(r()-.5)*.8,.1+r()*.16,.1+r()*.05,1.3+r()*.9,TILE.grass,[.5,.62,.34],[1.15,1.12,.7],1,.3+r()*.5);}g=finish(a);break;}
  case 'bush':{const t=botanicalTree('hawthorn',1,1);g=t.geometry.clone();g.scale(.5,.5,.5);for(const k of ['position'])void k;g.computeBoundingBox();g.computeBoundingSphere();break;}
  case 'mushroom':g=finish(mushroomCluster());break;
  case 'log':g=finish(fallenLog());break;
  case 'stump':{g=botanicalStump().clone();g.scale(.3,.55,.3);g.computeBoundingBox();g.computeBoundingSphere();break;}
  case 'deadwood':g=finish(deadwoodPile());break;
  case 'moss':g=finish(mossMound());break;
 }
 cache.set(kind,g);return g;
}
export function clearUnderstoryCache(){for(const g of cache.values())g.dispose();cache.clear();}

/** Per-mesh geometry that shares the cached attribute buffers and adds its own per-instance state (leaf density, snow load), default fully leafed and snow-free. */
export function instanceGeometry(shared:THREE.BufferGeometry,capacity:number){
 const g=new THREE.BufferGeometry();for(const k of Object.keys(shared.attributes))if(k!=='iState')g.setAttribute(k,shared.attributes[k]);if(shared.index)g.setIndex(shared.index);g.boundingBox=shared.boundingBox;g.boundingSphere=shared.boundingSphere;
 const st=new Float32Array(capacity*2);for(let i=0;i<capacity;i++)st[i*2]=1;const attr=new THREE.InstancedBufferAttribute(st,2);attr.setUsage(THREE.DynamicDrawUsage);g.setAttribute('iState',attr);return g;
}
