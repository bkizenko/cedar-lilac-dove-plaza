/** ITEM KIT: the shared context and craft helpers every item generator uses (shafts, lashings, grips, tassels, decoration, maker's marks).
 *  Pure. A generator receives a `Ctx` (builder + era + society style + wear) and draws into `ctx.b`; nothing here knows about the game state. */
import {MeshBuilder,hash32,hexRgb,rgbMix,v3,TAU,likePaint,type LodTier,type Paint,type V3,type RGB} from './itemMesh';
import {paintFor,metalOfEra,type MatId,type PaintOpts} from './itemMaterials';
import {itemStyleFor,type ItemStyle} from './itemStyle';

/** What to build. `condition` 1 new .. 0 ruined; `variant` picks a sub-form (shield shape, spear kind) or 'broken'. */
export type ItemReq={id:string;era:number;skin?:string|null;condition:number;seed:number;lod:LodTier;variant?:string};
export type Ctx={
 b:MeshBuilder;req:ItemReq;era:number;st:ItemStyle;wear:number;broken:boolean;seed:number;lod:LodTier;
 /** the metal this era works */metal:MatId;
 paint:(m:MatId,o?:PaintOpts)=>Paint;
 /** hafting wood of this society */wood:(len:number,o?:PaintOpts)=>Paint;wood2:(len:number,o?:PaintOpts)=>Paint;
 /** binding of this society (leather strip, sinew, dyed cord) */wrap:(len:number)=>Paint;
 /** radial segment count scaled by LOD */sd:(near:number)=>number;
 /** value 0..1 deterministic per item for `k` */r:(k:string)=>number;
};
export function makeCtx(req:ItemReq):Ctx{
 const lod=req.lod,b=new MeshBuilder(hash32('item',req.id,req.seed,req.skin??'',req.era,req.variant??''),lod),st=itemStyleFor(req.skin);
 const wear=Math.max(0,Math.min(1,1-req.condition)),broken=req.variant==='broken'||req.condition<=.06,w=broken?Math.max(.8,wear):wear;
 const era=Math.max(0,Math.min(4,Math.round(req.era)));
 const P=(m:MatId,o:PaintOpts={}):Paint=>paintFor(m,{seed:req.seed*31+hash32(m)%997,wear:w,...o});
 const c:Ctx={b,req,era,st,wear:w,broken,seed:req.seed,lod,metal:metalOfEra(era),paint:P,
  wood:(len,o)=>P(st.wood,{len,...o}),wood2:(len,o)=>P(st.wood2,{len,...o}),
  wrap:len=>P(st.wrap,{len,tint:st.wrapKind==='cord'||st.wrapKind==='wire'?st.cordColour:undefined,tintAmount:.55}),
  sd:n=>lod===0?n:lod===1?Math.max(5,Math.round(n*.7)):Math.max(3,Math.round(n*.45)),
  r:k=>(hash32(req.id,req.seed,k)%10007)/10007};
 return c;
}
/** a Catmull-Rom curve through the points (handles, straps, cords): `n` samples per span, fewer at lower LOD */
export function curve(c:Ctx,pts:V3[],n=6):V3[]{
 const k=c.b.pick(n,Math.max(2,Math.round(n/2)),1),out:V3[]=[];
 for(let i=0;i<pts.length-1;i++){
  const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
  for(let j=0;j<k;j++){const t=j/k,t2=t*t,t3=t2*t;out.push([0,1,2].map(a=>.5*((2*p1[a])+(-p0[a]+p2[a])*t+(2*p0[a]-5*p1[a]+4*p2[a]-p3[a])*t2+(-p0[a]+3*p1[a]-3*p2[a]+p3[a])*t3)) as V3);}
 }
 out.push(pts[pts.length-1]);return out;
}
/** a shaft path with a slight, wear-dependent warp */
export function shaftPath(c:Ctx,x:number,y0:number,y1:number,z=0,warp=.01):V3[]{
 const n=c.b.pick(24,10,3),wx=(c.r('wx')-.5)*warp*(1+c.wear*3),wz=(c.r('wz')-.5)*warp*(1+c.wear*3);
 return Array.from({length:n+1},(_,i)=>{const t=i/n,s=Math.sin(t*Math.PI);return [x+wx*s,y0+(y1-y0)*t,z+wz*s] as V3;});
}
/** A tapered wooden shaft from y0 to y1; radius r0 at the bottom, r1 at the top, with a slight swell where the hand goes. */
export function shaft(c:Ctx,y0:number,y1:number,r0:number,r1:number,o:{x?:number;z?:number;paint?:Paint;caps?:boolean|'a'|'b';warp?:number;sides?:number}={}){
 const len=Math.abs(y1-y0),path=shaftPath(c,o.x??0,y0,y1,o.z??0,o.warp??.012);
 c.b.tube(path,t=>r0+(r1-r0)*t,o.sides??c.sd(8),o.paint??c.wood(len),{caps:o.caps??true});
 return path;
}
/** a jagged snapped end: several thin splinters rising from a broken shaft */
export function splinters(c:Ctx,at:V3,r:number,dir:V3=[0,1,0],len=.09){
 const n=c.b.pick(6,4,2),paint=c.wood(.1,{wear:.3});
 for(let i=0;i<n;i++){const a=i/n*TAU+c.r('sp')*2,ln=len*(.35+.65*((hash32(c.seed,'spl',i)%100)/100)),o:V3=[Math.cos(a)*r*.55,0,Math.sin(a)*r*.55];
  const from=v3.add(at,o),to=v3.add(v3.add(from,v3.mul(dir,ln)),[Math.cos(a)*r*.2,0,Math.sin(a)*r*.2]);
  c.b.rod(from,to,t=>r*.5*(1-t)+.0006,3,paint,{segs:1,caps:'a'});}
}
/** a wound lashing with a tail; wear frays it (loose turns, dangling end) */
export function lashing(c:Ctx,y0:number,y1:number,r:number,turns:number,o:{x?:number;z?:number;mat?:MatId;cord?:number;paint?:Paint}={}){
 const cx=o.x??0,cz=o.z??0,cord=o.cord??.0034,p=o.paint??(o.mat?c.paint(o.mat,{len:.1}):c.wrap(.1));
 const dense=Math.max(3,Math.min(30,Math.round(Math.abs(y1-y0)/(cord*2.05)))),fray=c.wear>.55?Math.round(dense*.2):0;void turns;
 c.b.lash([cx,y0,cz],[cx,y1,cz],r+cord*.7,dense-fray,cord,p);
 if(c.lod===0&&c.wear>.35){c.b.rod([cx+r,y0,cz],[cx+r+.012,y0-.035-.03*c.wear,cz+.006],()=>cord*.8,4,p,{segs:1});}
}
/** a bound grip: leather/cord overlapped turns with a dyed accent band at each end */
export function gripWrap(c:Ctx,y0:number,y1:number,r:number,o:{x?:number;z?:number;bands?:boolean}={}){
 lashing(c,y0,y1,r,0,{x:o.x,z:o.z,cord:c.st.wrapKind==='leather'?.0042:.0034});
 if(o.bands!==false&&c.lod<2){for(const y of [y0+.006,y1-.006])c.b.ring([o.x??0,y,o.z??0],[0,1,0],r+.002,.003,c.paint('cord',{len:.1,tint:c.st.cordColour,tintAmount:.9}),c.b.pick(14,10,6),4);}
}
/** Decorated wood paint: society decoration (bands, chevrons, dots, spirals, steps) in the accent over the shaft grain. */
export function decorPaint(c:Ctx,base:Paint,len:number,t0=0,t1=1,col?:string):Paint{
 const ink=hexRgb(col??c.st.cordColour),d=c.st.decor;if(d==='none'||c.lod===2)return base;
 return likePaint((p,n,t,a)=>{
  const k=base(p,n,t,a);if(t<t0||t>t1)return k;const u=(t-t0)/(t1-t0||1),L=len*(t1-t0);let m=0;
  if(d==='bands')m=(u*L*14)%1<.22&&(Math.floor(u*L*14)%3===0)?1:0;
  else if(d==='chevron'){const f=Math.abs(((a*3+u*L*9)%1+1)%1-.5)*2;m=Math.abs(((u*L*12)%1+1)%1-f)<.14?1:0;}
  else if(d==='dots'){const f=((a*6)%1+1)%1,g=(u*L*22)%1;m=Math.hypot(f-.5,g-.5)<.22?1:0;}
  else if(d==='spiral'){m=((a*2+u*L*7)%1+1)%1<.16?1:0;}
  else if(d==='notches'){m=((u*L*26)%1)<.09&&a>.4&&a<.6?1:0;}
  else if(d==='steps'){const s=Math.floor(u*L*18),f=((a*4)%1+1)%1;m=f<.5&&s%2===0&&((a*4+s*.5)%1)<.5?1:0;}
  return m?rgbMix(k,ink,.82):k;
 },base);
}
/** the maker's mark: tiny stamped dots or a cross, as the workshop's identity, on a flat surface at `at` facing +Z (or `rot`). */
export function makerMark(c:Ctx,at:V3,mat:MatId|'wood',scale=1,rot:V3=[0,0,0]){
 if(c.lod>0)return;
 const dark=c.paint(mat==='wood'?c.st.wood:mat,{len:.05,wear:Math.min(1,c.wear+.5)}),n=1+c.st.maker,s=.0045*scale;
 c.b.push(at,rot);
 for(let i=0;i<n;i++)c.b.box([s,s,s*.5],[(i-(n-1)/2)*s*1.9,0,0],flatDark(dark));
 const sh=c.st.markShape;
 if(sh%3===0)c.b.box([s*.5,s*2.4,s*.5],[0,-s*2,0],flatDark(dark));
 else if(sh%3===1)c.b.box([s*2.2,s*.5,s*.5],[0,-s*1.8,0],flatDark(dark));
 c.b.pop();
}
const flatDark=(p:Paint):Paint=>(q,n,t,a)=>{const k=p(q,n,t,a);return [k[0]*.38,k[1]*.38,k[2]*.38] as RGB;};
/** society tassel / hanging decoration at a point, hanging down */
export function tassel(c:Ctx,at:V3,scale=1){
 const t=c.st.tassel;if(t==='none'||c.lod===2||c.wear>.8)return;
 const col=c.st.cordColour,b=c.b,lo=c.lod===1;
 if(t==='horsehair'){const n=lo?4:9;for(let i=0;i<n;i++){const a=i/n*TAU,r=.012*scale,x=Math.cos(a)*r,z=Math.sin(a)*r,L=(.14+.05*((hash32(c.seed,'h',i)%100)/100))*scale;
   b.rod(v3.add(at,[x,0,z]),v3.add(at,[x*3,-L,z*3+.01*scale]),k=>.0028*(1-k*.6),3,c.paint('hair',{len:L,tint:col,tintAmount:.7}),{segs:2,caps:'a'});}}
 else if(t==='feather'){const n=lo?2:4;for(let i=0;i<n;i++){const a=(i-(n-1)/2)*.35;b.push(at,[0,0,a]);
   b.loft([{c:[0,0,0],w:.002,h:.012},{c:[0,-.07*scale,0],w:.002,h:.03*scale},{c:[0,-.15*scale,0],w:.002,h:.02*scale},{c:[0,-.2*scale,0],w:.002,h:.004}],'y',c.paint('feather',{len:.2,tint:i%2?c.st.fletch[1]:c.st.accent,tintAmount:.7}),{shape:'rect'});b.pop();}}
 else if(t==='ribbon'){for(let i=0;i<2;i++){const dx=(i-.5)*.02;b.loft([{c:[dx,0,0],w:.018*scale,h:.002},{c:[dx+.006,-.1*scale,.01*i],w:.016*scale,h:.002},{c:[dx-.004,-.2*scale,.02],w:.014*scale,h:.002}],'y',c.paint('linen',{len:.2,tint:i?c.st.accent:col,tintAmount:.85}),{shape:'rect'});}}
 else if(t==='wool'){b.ellipsoid(v3.add(at,[0,-.03*scale,0]),[.026*scale,.026*scale,.026*scale],c.paint('wool',{len:.05,tint:col,tintAmount:.8}),5);
  if(!lo)for(let i=0;i<5;i++){const a=i/5*TAU;b.rod(v3.add(at,[0,-.05*scale,0]),v3.add(at,[Math.cos(a)*.03,-.15*scale,Math.sin(a)*.03]),()=>.003,3,c.paint('wool',{len:.1,tint:col,tintAmount:.8}),{segs:1});}}
 else if(t==='shells'){const n=lo?2:5;for(let i=0;i<n;i++){const y=-.02-i*.032*scale;b.ellipsoid(v3.add(at,[0,y,0]),[.011,.014,.008],c.paint('shell',{len:.03}),4);}
  b.rod(at,v3.add(at,[0,-.03*n*scale,0]),()=>.0016,3,c.paint('cord',{len:.2}),{segs:1});}
}
export {hexRgb};
