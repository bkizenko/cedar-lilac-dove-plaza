/** RANGED ITEMS: self bows, composite war bows, crossbows, slings, atlatls, arrows and quivers. Limbs taper in width and thickness, nocks are bone or
 *  horn, strings are served at the nocking point, composites show their horn belly and sinew back, crossbows have a real tiller, nut, stirrup and prod.
 *  Frames: bows have the grip at the origin, limbs along Y, belly bulging +Z (toward the target), string toward -Z. */
import {TAU,v3,hexRgb,rgbMix,likePaint,type V3,type Paint} from './itemMesh';
import {type Ctx,splinters,lashing,gripWrap,decorPaint,makerMark,tassel} from './itemKit';

// ---------------------------------------------------------------------------------------------------------------- bow
export function bow(c:Ctx,composite=false){
 const b=c.b,H=composite?.56:.69,n=b.pick(22,12,6),strung=!c.broken,belly=composite?.1:.115;
 const zOf=(u:number)=>belly*(1-u*u)-(composite?.0:.025)*u*u+(composite?-.052*Math.pow(Math.abs(u),7)-.018*Math.pow(Math.abs(u),2)*0+.07*Math.pow(Math.abs(u),5):0);
 const limbPath=(s:1|-1,from:number,to:number)=>Array.from({length:n+1},(_,i)=>{const u=s*(from+(to-from)*i/n);return [0,u*H,zOf(u)] as V3;});
 const wood=c.wood2(1.4,{len:H}),tipP=c.paint(composite?'horn':'bone',{len:.1});
 const widthAt=(u:number)=>(composite?.017:.0155)*(1-.62*Math.abs(u)),thickAt=(u:number)=>(composite?.0095:.0105)*(1-.5*Math.abs(u))+.0035;
 const sinewBack=hexRgb('#b6a074'),hornBelly=hexRgb('#43341f');
 const compositePaint:Paint=likePaint((p,nn,t,a)=>{const base=wood(p,nn,t,a);if(!composite)return base;const back=Math.sin(a*TAU)>0;
  const m=back?rgbMix(sinewBack,hexRgb(c.st.cordColour),(((p[1]*22)%1+1)%1)<.18&&Math.abs(p[1])>.18?.7:0):hornBelly;return rgbMix(base,m,.8);},wood);
 const lim=(s:1|-1,from:number,to:number,paint:Paint)=>b.tube(limbPath(s,from,to),t=>{const u=from+(to-from)*t;return [widthAt(u),thickAt(u)];},c.sd(8),paint,{caps:true});
 const broken=c.broken;
 // limbs: grip riser is a little thicker; the upper limb snaps when broken
 lim(1,0,broken?.55:1,compositePaint);lim(-1,0,1,compositePaint);
 if(broken)splinters(c,[0,.55*H,zOf(.55)],.011,[0,.9,-.3],.07);
 // grip wrap, arrow shelf, decoration on limbs
 gripWrap(c,-.075,.07,.0225,{z:belly-.0005});
 b.box([.016,.03,.008],[.0,.085,belly-.002],c.paint('leather',{len:.05}));
 if(c.lod<2){for(const s of [-1,1])for(const u of [.3,.34]){const y=s*u*H,z=zOf(s*u);b.ring([0,y,z],[0,1,0],widthAt(u)*.95,.0022,c.paint('cord',{len:.1,tint:c.st.cordColour,tintAmount:.9}),b.pick(10,8,6),4);}}
 // tips: nocks of bone or horn
 for(const s of [-1,1]){if(broken&&s===1)continue;const u=1,y=s*H,z=zOf(u);b.push([0,y,z],[0,0,0]);
  b.rod([0,-s*.012,0],[0,s*.022,-.006*(composite?-1:1)],t=>.0075*(1-t*.55),c.sd(6),tipP,{segs:2,caps:true});b.pop();}
 // string with a served middle and a loop at each nock
 if(strung){
  const a:V3=[0,-H-.018,zOf(1)-.006],e:V3=[0,H+.018,zOf(1)-.006],mid=v3.lerp(a,e,.5);
  b.rod(a,e,()=>.0022,4,c.paint('sinew',{len:H*2}),{segs:1,caps:true});
  b.rod(v3.add(mid,[0,-.05,0]),v3.add(mid,[0,.05,0]),()=>.0033,5,c.paint('cord',{len:.1,tint:c.st.cordColour,tintAmount:.6}),{segs:1});
 }else{ // string snapped: one end hangs loose
  b.rod([0,-H-.018,zOf(1)-.006],[.03,-H*.25,zOf(.25)-.05],()=>.002,4,c.paint('sinew',{len:.5}),{segs:3});
 }
 makerMark(c,[0,-.12,belly-.016],'wood',1,[0,0,0]);
 tassel(c,[.012,-.085,belly],.6);
}

// ---------------------------------------------------------------------------------------------------------------- crossbow
export function crossbow(c:Ctx){
 const b=c.b,steel=c.era>=4,wood=c.wood2(.7),P=c.paint(c.era>=3?c.metal:'bronze',{len:.1});
 // tiller / stock along Y (butt at -.4, muzzle at +.3), top (groove) toward +Z
 b.loft([{c:[0,-.4,-.01],w:.04,h:.05},{c:[0,-.2,-.01],w:.036,h:.044},{c:[0,.05,0],w:.034,h:.036},{c:[0,.3,0],w:.04,h:.03}],'y',decorPaint(c,wood,.7,.1,.9),{shape:'oct'});
 b.box([.012,.62,.006],[0,-.05,.021],c.paint('char',{len:.4}));
 b.rod([0,-.27,-.03],[0,-.2,-.07],()=>.012,6,wood,{segs:1}); // trigger lever
 b.rod([0,-.3,-.025],[0,-.1,-.025],()=>.007,5,c.paint('bone',{len:.2}),{segs:1});
 b.ellipsoid([0,.05,.016],[.013,.016,.01],c.paint('bone',{len:.03}),5); // nut
 // prod across X at y=.24
 const m=b.pick(14,8,5),H=.34,prodY=.24,prod=Array.from({length:m+1},(_,i)=>{const u=i/m*2-1;return [u*H,prodY+.04*u*u,.01-.025*Math.abs(u)*0] as V3;});
 b.tube(prod,t=>{const u=Math.abs(t*2-1);return [.012*(1-.45*u)+.004,.016*(1-.55*u)+.004];},c.sd(8),steel?c.paint('steel',{len:.7,pattern:true}):c.paint(c.era===2?c.st.wood2:'yew',{len:.7}),{caps:true});
 lashing(c,prodY-.03,prodY+.03,.03,10,{x:0,z:0,mat:'sinew'});
 for(const s of [-1,1])b.ellipsoid([s*H,prodY+.04,0],[.01,.01,.01],c.paint('bone',{len:.03}),4);
 // string to the nut and a bolt resting in the groove
 b.tube([[-H,prodY+.04,0],[0,.06,.028],[H,prodY+.04,0]],()=>.0022,4,c.paint('sinew',{len:.7}),{caps:true});
 b.loft([{c:[0,.0,.03],w:.006,h:.006},{c:[0,.5,.03],w:.006,h:.006}],'y',c.paint(c.st.wood,{len:.5}),{shape:'oct'});
 b.rod([0,.5,.03],[0,.56,.03],t=>.006*(1-t)+.001,4,P,{segs:1,caps:'a'});
 for(const s of [-1,1])b.box([.0016,.07,.016],[0,.06,.03+s*0.0],c.paint('feather',{len:.1,tint:c.st.fletch[0],tintAmount:.4}),[0,0,s*.0]);
 // stirrup at the muzzle (iron ring) and a butt cap
 if(c.era>=3)b.ring([0,.32,0],[1,0,0],.04,.0045,P,b.pick(14,10,6),4);else b.ring([0,.32,0],[1,0,0],.035,.005,c.paint('cord',{len:.1}),12,4);
 b.ellipsoid([0,-.4,-.01],[.024,.012,.028],P,5);
 if(c.broken){b.box([.12,.02,.006],[.05,-.1,.03],c.paint('char',{len:.1}));}
 makerMark(c,[0,-.16,.0215],'wood',1);
}

// ---------------------------------------------------------------------------------------------------------------- sling
export function sling(c:Ctx){
 const b=c.b,n=b.pick(10,6,4),cordLen=.62,hang=c.broken?.2:0;
 const pouchY=.62,P=c.paint('cord',{len:cordLen,tint:c.st.cordColour,tintAmount:.5}),twist=(s:1|-1)=>Array.from({length:n+1},(_,i)=>{const t=i/n;return [s*(.012+.02*Math.sin(t*Math.PI)),pouchY*t,.05*Math.sin(t*Math.PI)*s] as V3;});
 b.tube(twist(1),()=>.0032,c.sd(5),P,{caps:true});
 b.tube(twist(-1).map((p,i,a)=>i>=n-1&&c.broken?[p[0],p[1]-hang,p[2]] as V3:p),()=>.0032,c.sd(5),P,{caps:true});
 // finger loop and a knot at the free end
 b.ring([.012,-.02,.0],[0,0,1],.018,.003,P,b.pick(14,10,6),4);
 b.ellipsoid([-.012,-.005,0],[.007,.007,.007],P,4);
 // leather pouch with a stone (lead bullet later)
 b.loft([{c:[0,pouchY-.05,0],w:.012,h:.01},{c:[0,pouchY-.015,0],w:.05,h:.03},{c:[0,pouchY+.015,0],w:.05,h:.03},{c:[0,pouchY+.05,0],w:.012,h:.01}],'y',c.paint('leather',{len:.1}),{shape:'oct'});
 b.ellipsoid([0,pouchY,.012],[.015,.017,.014],c.era>=2?c.paint('lead',{len:.03}):c.paint('stone',{len:.03}),6);
 makerMark(c,[0,pouchY,-.018],'wood',.7,[0,Math.PI,0]);
}

// ---------------------------------------------------------------------------------------------------------------- atlatl (spear thrower)
export function atlatl(c:Ctx){
 const b=c.b,L=.58,n=b.pick(8,5,3),path=Array.from({length:n+1},(_,i)=>{const t=i/n;return [0,-.1+L*t,.012*Math.sin(t*Math.PI)] as V3;});
 b.tube(path,t=>[.018*(1-.35*t),.007+.003*(1-t)],c.sd(8),decorPaint(c,c.wood2(L),L,.2,.8),{caps:true});
 b.rod([0,.485,.004],[0,.5,.03],t=>.006*(1-t*.6),5,c.era>=2?c.paint('bone',{len:.04}):c.paint('antler',{len:.04}),{segs:1}); // hook spur
 for(const s of [-1,1])b.ring([s*.02,-.02,.004],[0,0,1],.014,.0028,c.paint('cord',{len:.05,tint:c.st.cordColour,tintAmount:.5}),b.pick(12,8,6),4); // finger loops
 b.ellipsoid([0,.22,.0],[.028,.02,.012],c.paint(c.era>=1?'stone':'stone',{len:.05,tint:'#8f8a6e',tintAmount:.35}),6); // bannerstone weight
 lashing(c,.19,.25,.016,6,{mat:'sinew'});
 gripWrap(c,-.09,-.01,.0165);
 makerMark(c,[0,.35,.011],'wood');tassel(c,[0,-.1,0],.5);
}

// ---------------------------------------------------------------------------------------------------------------- arrow, quiver
/** one arrow: shaft, head for the era, three fletches; at its own origin the nock end is y=0 and the head points to +Y */
export function arrowParts(c:Ctx,x:number,z:number,y0:number,len:number,tilt:V3=[0,0,0],headOnly=false){
 const b=c.b;b.push([x,y0,z],tilt);
 const r=.0042;b.rod([0,0,0],[0,len,0],()=>r,5,c.paint(c.st.wood,{len}),{segs:1});
 if(!headOnly&&c.lod<2){for(let k=0;k<3;k++){const a=k/3*TAU;b.push([0,.025,0],[0,a,0]);
  b.loft([{c:[r,0,0],w:.001,h:.01},{c:[r+.008,.045,0],w:.001,h:.016},{c:[r+.005,.095,0],w:.001,h:.008}],'y',c.paint('feather',{len:.1,tint:k===0?c.st.fletch[1]:c.st.fletch[0],tintAmount:.7}),{shape:'rect'});b.pop();}}
 const hy=len;
 if(c.era===0){const S=c.st.stone==='obsidian'?'obsidian':'flint';
  b.blade({y0:hy-.01,y1:hy+.05,w:t=>.012*(1-t)*(1+.4*Math.sin(t*3)),th:t=>.0025*(1-t),section:'lens',chip:.002,steps:b.pick(7,5,3)},c.paint(S,{len:.06}));}
 else if(c.era===1){b.blade({y0:hy-.005,y1:hy+.055,w:t=>.011*(1-t*t)*Math.min(1,t*5+.4),th:t=>.0022*(1-t),section:'diamond',steps:b.pick(7,5,3)},c.paint('copper',{len:.06}));}
 else if(c.era===2){b.rod([0,hy-.01,0],[0,hy+.05,0],t=>.0058*(1-t)+.0006,5,c.paint('bronze',{len:.06}),{segs:2,caps:'a'});
  for(let k=0;k<3;k++){const a=k/3*TAU;b.push([0,hy,0],[0,a,0]);b.loft([{c:[.003,0,0],w:.001,h:.004},{c:[.011,.014,0],w:.001,h:.008},{c:[.003,.045,0],w:.001,h:.002}],'y',c.paint('bronze',{len:.05}),{shape:'rect'});b.pop();}}
 else{b.rod([0,hy-.012,0],[0,hy+(c.era===4?.06:.045),0],t=>.0055*(1-t)+.0006,5,c.paint(c.metal,{len:.06,pattern:true}),{segs:2,caps:'a'});
  if(c.era===3)for(const s of [-1,1])b.rod([0,hy,0],[s*.011,hy-.018,0],t=>.0022*(1-t)+.0006,3,c.paint('iron',{len:.03}),{segs:1,caps:'a'});}
 b.pop();
}
export function arrow(c:Ctx){arrowParts(c,0,0,-.3,.72);makerMark(c,[0,.15,.0045],'wood',.6);}
export function quiver(c:Ctx){
 const b=c.b,L=.58,lean:V3=[0,0,.18];
 b.push([0,0,0],lean);
 const path:V3[]=[[0,-L,0],[0,-L*.5,0],[0,0,0]],leather=c.paint('leather',{len:L,wear:c.wear*.8}),paintD=decorPaint(c,leather,L,.05,.95,c.st.cordColour);
 b.tube(path,t=>[.052+.012*t,.044+.01*t],c.sd(10),paintD,{caps:'a'});
 b.ring([0,0,0],[0,1,0],.06,.0045,c.paint('rawhide',{len:.3,tint:c.st.cordColour,tintAmount:.3}),b.pick(14,10,6),4);
 b.ring([0,-L,0],[0,1,0],.045,.006,c.paint('rawhide',{len:.3}),b.pick(12,8,6),4);
 b.ellipsoid([0,-L-.01,0],[.04,.022,.034],leather,5);
 if(c.lod<2)b.rod([.065,-.04,0],[.08,-.3,-.04],()=>.005,4,c.paint('leather',{len:.3}),{segs:1});
 const n=b.pick(9,6,3);for(let i=0;i<n;i++){const a=i/n*TAU,r=.02+.012*((i*5)%3);arrowParts(c,Math.cos(a)*r,Math.sin(a)*r*.8,-.04,.3+((i*3)%4)*.012,[0,0,0],i>5);}
 b.pop();
 if(c.lod===0)makerMark(c,[0,-.3,.05],'wood',1,[0,0,0]);
}
void rgbMix;
