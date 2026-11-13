/** Foundation geometry for the graded slope model: pure boxes (no three.js) shared by the renderer, the placement ghost and the preview sheets.
 *  Every box is sunk to the real terrain under it, so no corner floats; the floor `level` is chosen by foundationLevel() so doors sit at grade. */
import type {FoundationKind} from './slopeTiers';
import {terraceFrame,chordAt,TERRACE_RULES,type TerraceKind} from './terraceFarming';
export type FoundationBoxKind='kerb'|'wall'|'apron'|'post'|'beam'|'portal'|'footing'|'strip-wall'|'strip-bund'|'strip-tread'|'strip-tread-alt'|'channel';
export type FoundationBox=Readonly<{x:number;z:number;y:number;length:number;width:number;height:number;yaw:number;kind:FoundationBoxKind}>;
export type FoundationInput={x:number;z:number;w:number;d:number;/** yaw and scale of the building's own frame (team style) */yaw?:number;sx?:number;sz?:number};
/** `terrace` (terrain model v2 fields): strips, kind. Without it, 'strips' keeps the earlier low lip walls. */
export type FoundationOptions={height:(x:number,z:number)=>number;level:number;downhill:{x:number;z:number};burial?:number;fall?:number;terrace?:{n:number;kind:TerraceKind|'none'}};
export const FOUNDATION_RULES={segmentMetres:.9,minimumGapMetres:.12,kerbThickness:.3,wallThickness:.55,postSize:.22,postSpacing:2.7,beamHeight:.2,portalHeight:1.7} as const;

/** Floor level for a foundation: dugouts take the ground at the door so the door is at grade; everything else sits on the highest contact. */
export function foundationLevel(kind:FoundationKind|undefined,highest:number,lowest:number,doorGround?:number){
 if(kind==='dugout'&&doorGround!==undefined)return doorGround+.03;
 void lowest;return highest+.03;
}
export function foundationBoxes(kind:FoundationKind|undefined,b:FoundationInput,o:FoundationOptions):FoundationBox[]{
 if(!kind||kind==='none')return[];
 const R=FOUNDATION_RULES,yaw=b.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw),sx=b.sx??1,sz=b.sz??1,burial=o.burial??.18,hw=b.w/2*sx,hd=b.d/2*sz;
 const W=(lx:number,lz:number)=>({x:b.x+c*lx+s*lz,z:b.z-s*lx+c*lz});
 const ground=(x:number,z:number,w=0)=>{let m=Infinity;for(const [ox,oz] of w?[[0,0],[w,0],[-w,0],[0,w],[0,-w]]:[[0,0]])m=Math.min(m,o.height(x+ox,z+oz));return m;};
 const out:FoundationBox[]=[];
 /** Box between two world points, bottom at the lowest terrain under it. */
 const strip=(ax:number,az:number,bx:number,bz:number,width:number,top:number,kind:FoundationBoxKind)=>{
  const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);if(len<.02)return;const n=Math.max(1,Math.ceil(len/R.segmentMetres)),nx=-dz/len,nz=dx/len;
  for(let i=0;i<n;i++){const x0=ax+dx*i/n,z0=az+dz*i/n,x1=ax+dx*(i+1)/n,z1=az+dz*(i+1)/n;let lo=Infinity;
   for(const t of[0,.5,1])for(const side of[-.5,0,.5])lo=Math.min(lo,o.height(x0+(x1-x0)*t+nx*width*side,z0+(z1-z0)*t+nz*width*side));
   if(top-lo<R.minimumGapMetres)continue;lo-=burial;out.push({x:(x0+x1)/2,z:(z0+z1)/2,y:(top+lo)/2,length:len/n+.012,width,height:top-lo,yaw:Math.atan2(-dz,dx),kind});}
 };
 const ring=(m:number,width:number,top:number,kind:FoundationBoxKind)=>{
  const a=W(-hw-m,-hd-m),bb=W(hw+m,-hd-m),cc=W(hw+m,hd+m),dd=W(-hw-m,hd+m);
  strip(a.x,a.z,bb.x,bb.z,width,top,kind);strip(bb.x,bb.z,cc.x,cc.z,width,top,kind);strip(cc.x,cc.z,dd.x,dd.z,width,top,kind);strip(dd.x,dd.z,a.x,a.z,width,top,kind);
 };
 const top=o.level-.02;
 if(kind==='pad'){ring(R.kerbThickness/2-.02,R.kerbThickness,top,'kerb');}
 else if(kind==='terrace'){
  ring(R.wallThickness/2-.02,R.wallThickness,top,'wall');
  // stepped apron: a lower course in front of every downhill face
  for(const[nxl,nzl]of[[1,0],[-1,0],[0,1],[0,-1]]){
   const nw={x:c*nxl+s*nzl,z:-s*nxl+c*nzl};if(nw.x*o.downhill.x+nw.z*o.downhill.z<.35)continue;
   const off=(nxl?hw:hd)+R.wallThickness+.35,tangent={x:-nw.z,z:nw.x},half=nxl?hd:hw,cx=b.x+nw.x*off,cz=b.z+nw.z*off,g=ground(cx,cz,.3),lowTop=(top+g)/2;
   if(lowTop-g>.3)strip(cx-tangent.x*half,cz-tangent.z*half,cx+tangent.x*half,cz+tangent.z*half,.7,lowTop,'apron');
  }
 }
 else if(kind==='stilts'){
  const nx=Math.ceil(b.w/R.postSpacing)+1,nz=Math.ceil(b.d/R.postSpacing)+1,inset=.3;
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
   const lx=-hw+inset+(2*hw-2*inset)*ix/(nx-1),lz=-hd+inset+(2*hd-2*inset)*iz/(nz-1),p=W(lx,lz),lo=ground(p.x,p.z,R.postSize/2)-burial,t=o.level-R.beamHeight;
   if(t-lo>.05)out.push({x:p.x,z:p.z,y:(t+lo)/2,length:R.postSize,width:R.postSize,height:t-lo,yaw,kind:'post'});
  }
  const a=W(-hw+inset,-hd+inset),bb=W(hw-inset,-hd+inset),cc=W(hw-inset,hd-inset),dd=W(-hw+inset,hd-inset),by=o.level-R.beamHeight/2-.01;
  for(const[p,q]of[[a,bb],[bb,cc],[cc,dd],[dd,a]]){const dx=q.x-p.x,dz=q.z-p.z;out.push({x:(p.x+q.x)/2,z:(p.z+q.z)/2,y:by,length:Math.hypot(dx,dz),width:.18,height:R.beamHeight,yaw:Math.atan2(-dz,dx),kind:'beam'});}
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
     const w1=at(st.t1-K.wallThick/2,sm);let wlo=Infinity;for(const s of[sa,sm,sb]){const q=at(st.t1+.1,s);wlo=Math.min(wlo,o.height(q.x,q.z));}
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
