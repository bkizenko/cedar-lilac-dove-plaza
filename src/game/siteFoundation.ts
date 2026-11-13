/** Foundation geometry for the graded slope model: pure boxes (no three.js) shared by the renderer, the placement ghost and the preview sheets.
 *  Every box is sunk to the real terrain under it, so no corner floats; the floor `level` is chosen by foundationLevel() so doors sit at grade. */
import type {FoundationKind} from './slopeTiers';
import {terraceFrame,chordAt,TERRACE_RULES,type TerraceKind} from './terraceFarming';
import {offsetPolygon,type GroundPlan} from '../scene/groundPlan';
export type FoundationBoxKind='kerb'|'wall'|'apron'|'post'|'beam'|'portal'|'footing'|'strip-wall'|'strip-bund'|'strip-tread'|'strip-tread-alt'|'channel';
export type FoundationBox=Readonly<{x:number;z:number;y:number;length:number;width:number;height:number;yaw:number;kind:FoundationBoxKind}>;
export type FoundationInput={x:number;z:number;w:number;d:number;/** yaw and scale of the building's own frame (team style) */yaw?:number;sx?:number;sz?:number};
/** `terrace` (terrain model v2 fields): strips, kind. Without it, 'strips' keeps the earlier low lip walls. */
/** `plan` (carved buildings): the real wall outlines and legs of the generated model (groundPlan.ts). Without it the plot rectangle is used, as before. */
export type FoundationOptions={height:(x:number,z:number)=>number;level:number;downhill:{x:number;z:number};burial?:number;fall?:number;terrace?:{n:number;kind:TerraceKind|'none'};plan?:Pick<GroundPlan,'polys'|'piers'|'round'|'raised'>&{lifts?:readonly number[]}|null};
export const FOUNDATION_RULES={segmentMetres:.9,minimumGapMetres:.12,/** the small stone/earth footing under a building on gentle ground shows from this gap up */footingGapMetres:.03,footingThickness:.26,kerbThickness:.3,wallThickness:.55,/** timber corner posts: sturdy squared timbers on a stone pad (a staddle), never spindly */postSize:.32,padSize:.56,padHeight:.16,postSpacing:2.7,beamHeight:.3,beamWidth:.26,portalHeight:1.7,pierMargin:.1,/** an uphill door may sit this far below the earth before the floor is raised to meet it */doorBuryMetres:.1,/** a pile dwelling on flat or gently sloping wet ground stands this far above the highest ground under it (flood line, damp, vermin) */pileLiftMetres:.9,/** below this mean slope a post platform is a pile dwelling (flood country); above it, a steep-ground platform */pileBelowDegrees:10} as const;

/** Floor level for a foundation. Dugouts take the ground at the door so the door is at grade. Level and levelled-pad sites (cut and fill) take the MEAN ground
 *  under the footprint when it is known, so the uphill side is cut into the earth and the downhill side needs at most half the fall of footing, never the full
 *  fall; `doorGround` (carved buildings) stops an uphill door from being buried. Terraces, posts and outcrops stand on the highest contact. */
export function foundationLevel(kind:FoundationKind|undefined,highest:number,lowest:number,doorGround?:number,mean?:number,lift=0){
 if(kind==='dugout'&&doorGround!==undefined)return doorGround+.03;
 if((!kind||kind==='none'||kind==='pad')&&mean!==undefined){
  const floor=Math.max(mean,doorGround!==undefined?doorGround-FOUNDATION_RULES.doorBuryMetres:-Infinity);
  return Math.min(highest,floor)+.03;
 }
 void lowest;return highest+.03+(kind==='stilts'?lift:0);
}
const polyArea=(q:readonly {x:number;z:number}[])=>{let a=0;for(let i=0;i<q.length;i++){const p=q[i],r=q[(i+1)%q.length];a+=p.x*r.z-r.x*p.z;}return Math.abs(a)/2;};
const perimeter=(q:readonly {x:number;z:number}[])=>{let l=0;for(let i=0;i<q.length;i++){const p=q[i],r=q[(i+1)%q.length];l+=Math.hypot(r.x-p.x,r.z-p.z);}return l;};
const centroid=(q:readonly {x:number;z:number}[])=>({x:q.reduce((a,p)=>a+p.x,0)/q.length,z:q.reduce((a,p)=>a+p.z,0)/q.length});
const bounds=(q:readonly {x:number;z:number}[])=>({x0:Math.min(...q.map(p=>p.x)),x1:Math.max(...q.map(p=>p.x)),z0:Math.min(...q.map(p=>p.z)),z1:Math.max(...q.map(p=>p.z))});
export function foundationBoxes(kind:FoundationKind|undefined,b:FoundationInput,o:FoundationOptions):FoundationBox[]{
 const plan=o.plan&&(o.plan.polys.length||o.plan.piers.length)?o.plan:null;
 if((!kind||kind==='none')&&!plan)return[];
 const R=FOUNDATION_RULES,yaw=b.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw),sx=b.sx??1,sz=b.sz??1,burial=o.burial??.18,hw=b.w/2*sx,hd=b.d/2*sz;
 const W=(lx:number,lz:number)=>({x:b.x+c*lx+s*lz,z:b.z-s*lx+c*lz});
 const ground=(x:number,z:number,w=0)=>{let m=Infinity;for(const [ox,oz] of w?[[0,0],[w,0],[-w,0],[0,w],[0,-w]]:[[0,0]])m=Math.min(m,o.height(x+ox,z+oz));return m;};
 const out:FoundationBox[]=[];
 /** Box between two world points, bottom at the lowest terrain under it. */
 const strip=(ax:number,az:number,bx:number,bz:number,width:number,top:number,kind:FoundationBoxKind,minGap=R.minimumGapMetres)=>{
  const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);if(len<.02)return;const n=Math.max(1,Math.ceil(len/R.segmentMetres)),nx=-dz/len,nz=dx/len;
  for(let i=0;i<n;i++){const x0=ax+dx*i/n,z0=az+dz*i/n,x1=ax+dx*(i+1)/n,z1=az+dz*(i+1)/n;let lo=Infinity;
   for(const t of[0,.5,1])for(const side of[-.5,0,.5])lo=Math.min(lo,o.height(x0+(x1-x0)*t+nx*width*side,z0+(z1-z0)*t+nz*width*side));
   if(top-lo<minGap)continue;lo-=burial;out.push({x:(x0+x1)/2,z:(z0+z1)/2,y:(top+lo)/2,length:len/n+.012,width,height:top-lo,yaw:Math.atan2(-dz,dx),kind});}
 };
 const ring=(m:number,width:number,top:number,kind:FoundationBoxKind,minGap=R.minimumGapMetres)=>{
  if(plan?.polys.length){
   // the real wall outlines of the generated model (local frame, never team-scaled), mitred outward by m
   const Wp=(p:{x:number;z:number})=>({x:b.x+c*p.x+s*p.z,z:b.z-s*p.x+c*p.z});
   plan.polys.forEach((poly,pi)=>{const o2=offsetPolygon(poly,m).map(Wp),t=top+(plan.lifts?.[pi]??0);for(let i=0;i<o2.length;i++){const p=o2[i],q=o2[(i+1)%o2.length];strip(p.x,p.z,q.x,q.z,width,t,kind,minGap);}});
   return;
  }
  const a=W(-hw-m,-hd-m),bb=W(hw+m,-hd-m),cc=W(hw+m,hd+m),dd=W(-hw-m,hd+m);
  strip(a.x,a.z,bb.x,bb.z,width,top,kind,minGap);strip(bb.x,bb.z,cc.x,cc.z,width,top,kind,minGap);strip(cc.x,cc.z,dd.x,dd.z,width,top,kind,minGap);strip(dd.x,dd.z,a.x,a.z,width,top,kind,minGap);
 };
 /** A stone column under every leg the generator raised the building on (staddle stones, corner posts), sunk to the terrain under it. */
 const piers=(top:number)=>{
  if(!plan)return;
  for(const pr of plan.piers){const p={x:b.x+c*pr.x+s*pr.z,z:b.z-s*pr.x+c*pr.z},size=pr.r*2+R.pierMargin,lo=ground(p.x,p.z,pr.r)-burial;if(top-lo>R.footingGapMetres+burial)out.push({x:p.x,z:p.z,y:(top+lo)/2,length:size,width:size,height:top-lo,yaw,kind:'footing'});}
 };
 const top=o.level-.02;
 if(!kind||kind==='none'){
  // gentle ground: a small continuous footing where the floor stands clear of the earth, nothing where it is already on it
  if(!plan?.raised)ring(.06,R.footingThickness,top,'footing',R.footingGapMetres);
  piers(top);return out;
 }
 if(kind==='pad'){if(!plan?.raised)ring(plan?.polys.length?.08:R.kerbThickness/2-.02,plan?.polys.length?.28:R.kerbThickness,top,'kerb',R.footingGapMetres);piers(top);}
 else if(kind==='terrace'){
  ring(plan?.polys.length?R.wallThickness/2+.02:R.wallThickness/2-.02,R.wallThickness,top,'wall');piers(top);
  // stepped apron: a lower course in front of every downhill face
  for(const[nxl,nzl]of[[1,0],[-1,0],[0,1],[0,-1]]){
   const nw={x:c*nxl+s*nzl,z:-s*nxl+c*nzl};if(nw.x*o.downhill.x+nw.z*o.downhill.z<.35)continue;
   const off=(nxl?hw:hd)+R.wallThickness+.35,tangent={x:-nw.z,z:nw.x},half=nxl?hd:hw,cx=b.x+nw.x*off,cz=b.z+nw.z*off,g=ground(cx,cz,.3),lowTop=(top+g)/2;
   if(lowTop-g>.3)strip(cx-tangent.x*half,cz-tangent.z*half,cx+tangent.x*half,cz+tangent.z*half,.7,lowTop,'apron');
  }
 }
 else if(kind==='stilts'){
  // A historical post platform: squared corner and intermediate posts on stone pads (staddles), tied by a ring beam and a cross beam at the floor.
  const inset=.3,t=o.level-R.beamHeight,pts:{x:number;z:number}[]=[];
  let ring4:{x:number;z:number}[]=[];
  const poly=plan?.polys.length?plan.polys.reduce((best,q)=>polyArea(q)>polyArea(best)?q:best):null;
  if(poly&&plan?.round){
   // round building: posts evenly round the wall circle, ring beam through them
   const n=Math.max(5,Math.ceil(perimeter(poly)/(R.postSpacing*.9))),Wp=(q:{x:number;z:number})=>({x:b.x+c*q.x+s*q.z,z:b.z-s*q.x+c*q.z}),cen=centroid(poly);
   for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r0=Math.max(...poly.map(q=>Math.hypot(q.x-cen.x,q.z-cen.z)))-inset;pts.push(Wp({x:cen.x+Math.cos(a)*r0,z:cen.z+Math.sin(a)*r0}));}
   ring4=pts.slice();
  }else{
   const bb=poly?bounds(poly):{x0:-hw,x1:hw,z0:-hd,z1:hd},bw=bb.x1-bb.x0,bd=bb.z1-bb.z0,nx=Math.ceil(bw/R.postSpacing)+1,nz=Math.ceil(bd/R.postSpacing)+1;
   for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const lx=bb.x0+inset+(bw-2*inset)*ix/(nx-1),lz=bb.z0+inset+(bd-2*inset)*iz/(nz-1);pts.push(W(lx,lz));}
   ring4=[W(bb.x0+inset,bb.z0+inset),W(bb.x1-inset,bb.z0+inset),W(bb.x1-inset,bb.z1-inset),W(bb.x0+inset,bb.z1-inset)];
  }
  for(const p of pts){const g0=ground(p.x,p.z,R.padSize/2),lo=g0-burial;
   if(t-lo>.05){
    const padTop=Math.max(g0+R.padHeight,lo+.1);
    out.push({x:p.x,z:p.z,y:(t+lo)/2,length:R.postSize,width:R.postSize,height:t-lo,yaw,kind:'post'});
    out.push({x:p.x,z:p.z,y:(padTop+lo)/2,length:R.padSize,width:R.padSize,height:padTop-lo,yaw,kind:'footing'});
   }}
  const by=o.level-R.beamHeight/2-.01;
  for(let i=0;i<ring4.length;i++){const p=ring4[i],q=ring4[(i+1)%ring4.length],dx=q.x-p.x,dz=q.z-p.z;out.push({x:(p.x+q.x)/2,z:(p.z+q.z)/2,y:by,length:Math.hypot(dx,dz)+R.postSize*.6,width:R.beamWidth,height:R.beamHeight,yaw:Math.atan2(-dz,dx),kind:'beam'});}
  // one cross beam between opposite ring points (floor joist), so the platform reads as framed rather than a floating ring
  if(ring4.length>=4){const p=ring4[0],q=ring4[Math.floor(ring4.length/2)],dx=q.x-p.x,dz=q.z-p.z;out.push({x:(p.x+q.x)/2,z:(p.z+q.z)/2,y:by-.04,length:Math.hypot(dx,dz),width:R.beamWidth*.8,height:R.beamHeight*.8,yaw:Math.atan2(-dz,dx),kind:'beam'});}
 }
 else if(kind==='dugout'){
  // the earth stays where it is; the front face gets stone cheeks either side of the door and a footing along the sill
  ring(.14,.28,top,'footing');
  let best=-2,bn={x:0,z:1},bl=0,bt={x:1,z:0},bo=0;
  for(const[nxl,nzl]of[[1,0],[-1,0],[0,1],[0,-1]]){const nw={x:c*nxl+s*nzl,z:-s*nxl+c*nzl},dot=nw.x*o.downhill.x+nw.z*o.downhill.z;if(dot>best){best=dot;bn=nw;bl=nxl?hd:hw;bo=nxl?hw:hd;bt={x:-nw.z,z:nw.x};}}
  for(const side of[-1,1]){const cx=b.x+bn.x*(bo+.35)+bt.x*side*(bl-.45),cz=b.z+bn.z*(bo+.35)+bt.z*side*(bl-.45),lo=ground(cx,cz,.3)-burial,t=o.level+R.portalHeight;
   if(t-lo>.2)out.push({x:cx,z:cz,y:(t+lo)/2,length:.9,width:.55,height:t-lo,yaw:Math.atan2(-bn.z,bn.x),kind:'portal'});}
 } else if(kind==='outcrop'){
  for(const[sxl,szl]of[[-1,-1],[1,-1],[1,1],[-1,1]]){const p=W(sxl*(hw-.3),szl*(hd-.3)),lo=ground(p.x,p.z,.3)-burial;if(top-lo>.05)out.push({x:p.x,z:p.z,y:(top+lo)/2,length:.6,width:.6,height:top-lo,yaw,kind:'footing'});}
 }
 else if(kind==='strips'){
  if(o.terrace){
   if(o.terrace.kind==='none')return out;
   const K=TERRACE_RULES.kinds[o.terrace.kind],plot={x:b.x,z:b.z,w:b.w,d:b.d},frame=terraceFrame(o.height,plot,o.terrace.n,o.downhill),tn=frame.tangent,yawT=Math.atan2(-tn.z,tn.x),seg=1.6,drained=o.terrace.kind==='andean'||o.terrace.kind==='stair';
   const at=(t:number,s:number)=>({x:plot.x+frame.dir.x*t+tn.x*s,z:plot.z+frame.dir.z*t+tn.z*s});
   for(const st of frame.strips){
    const tm=(st.t0+st.t1)/2,ch=chordAt(plot,frame.dir,tm);if(!ch)continue;const len=ch.s1-ch.s0,k=Math.max(1,Math.ceil(len/seg)),top=st.level+.03,tread=st.t1-st.t0;
    for(let j=0;j<k;j++){
     const sa=ch.s0+len*j/k,sb=ch.s0+len*(j+1)/k,sm=(sa+sb)/2,c=at(tm,sm);let lo=Infinity;
     for(const t of[st.t0,tm,st.t1])for(const s of[sa,sm,sb]){const q=at(t,s);lo=Math.min(lo,o.height(q.x,q.z));}
     if(top-lo>.05)out.push({x:c.x,z:c.z,y:(top+lo-burial)/2,length:len/k+.01,width:tread,height:top-lo+burial,yaw:yawT,kind:st.i%2?'strip-tread-alt':'strip-tread'});
     // the retaining wall: a facing on the downhill edge of the strip, from the ground below up to the tread
     const w1=at(st.t1-K.wallThick/2+.04,sm);let wlo=Infinity;for(const s of[sa,sm,sb]){const q=at(st.t1+.1,s);wlo=Math.min(wlo,o.height(q.x,q.z));}
     if(top-wlo>.12)out.push({x:w1.x,z:w1.z,y:(top+wlo-burial)/2+.01,length:len/k+.01,width:K.wallThick,height:top-wlo+burial,yaw:yawT,kind:o.terrace.kind==='bund'?'strip-bund':'strip-wall'});
    }
    // irrigation channel running down the terraces at the edge of each strip, falling from tread to tread
    if(drained){const c=at(tm,ch.s1-.35);out.push({x:c.x,z:c.z,y:top+.06,length:tread,width:.26,height:.1,yaw:Math.atan2(-frame.dir.z,frame.dir.x),kind:'channel'});}
   }
   return out;
  }
  const dir=o.downhill,extent=Math.abs(dir.x)*b.w+Math.abs(dir.z)*b.d,across=Math.abs(dir.z)*b.w+Math.abs(dir.x)*b.d,n=Math.max(1,Math.ceil((o.fall??extent*.3)/.7)),tan={x:-dir.z,z:dir.x};
  if((o.fall??0)>1.8)for(let i=1;i<=n;i++){const t=-extent/2+extent*i/(n+1),cx=b.x+dir.x*t,cz=b.z+dir.z*t,g=o.height(cx,cz);
   out.push({x:cx,z:cz,y:g+.08,length:across*.98,width:.4,height:.7,yaw:Math.atan2(-tan.z,tan.x),kind:'strip-wall'});}
 }
 return out;
}
