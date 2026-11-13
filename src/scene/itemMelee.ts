/** MELEE ITEMS: spears, javelins, pikes, clubs and maces, axes, war picks, swords and daggers, shields. Each is built for an era (0 flint & bone,
 *  1 copper, 2 bronze, 3 iron, 4 steel) with correct hafting for that era, in the society's own style, with visible wear.
 *  Frames: hand items have the grip at the origin, tip along +Y, face along +Z; shields are centred where the left arm carries them. */
import {TAU,v3,hexRgb,rgbMix,likePaint,withTex,type V3,type Paint} from './itemMesh';
import {type Ctx,shaft,splinters,lashing,gripWrap,decorPaint,makerMark,tassel} from './itemKit';
import {bandPaint,texMetaFor} from './itemMaterials';
import {TILE,TILE_SCALE,motifCell,emblemCell,type MotifName} from './itemTexture';

const leaf=(t:number)=>Math.pow(Math.max(0,Math.sin(Math.PI*Math.pow(Math.min(1,t),.72))),.75);
const edgeGlint=(p:Paint,t0:number,k=.4):Paint=>likePaint((q,n,t,a)=>{const c=p(q,n,t,a);return t>t0?[Math.min(1,c[0]+k*(t-t0)),Math.min(1,c[1]+k*(t-t0)),Math.min(1,c[2]+k*(t-t0))]:c;},p);
const mp=(c:Ctx,len:number,o:{pattern?:boolean}={})=>c.paint(c.metal,{len,pattern:o.pattern??c.era===4,age:c.era===1?.1:c.era===2?.08:0});
const stoneOf=(c:Ctx)=>c.st.stone;

// ---------------------------------------------------------------------------------------------------------------- spear family
function spearHead(c:Ctx,y:number,S:number,r:number){
 const b=c.b,chip=.003+.007*c.wear;
 if(c.era===0){
  if(c.r('hd')<.3){ // barbed antler point
   const L=.24*S,P=c.paint('antler',{len:L});
   b.rod([0,y-.02,0],[0,y+L,0],t=>.0125*S*Math.pow(1-t,.8)+.0012,c.sd(7),P,{segs:6});
   for(let k=0;k<3;k++)for(const s of [-1,1]){const yk=y+.07*S+k*.05*S;b.rod([s*.01*S,yk,0],[s*.034*S,yk+.045*S,0],t=>.0042*(1-t)+.0008,4,P,{segs:1,caps:'a'});}
   lashing(c,y-.065*S,y+.03*S,r*1.0,8,{mat:'sinew'});
  }else{
   const L=.17*S,W=.026*S,m=stoneOf(c)==='obsidian'?'obsidian':stoneOf(c)==='chert'?'chert':'flint';
   b.blade({y0:y-.02,y1:y+L,w:t=>W*leaf(t),th:t=>.0058*S*(.5+.5*Math.sin(Math.PI*Math.min(1,t*1.15))),chip:chip*1.8,steps:b.pick(20,12,6),section:'lens'},c.paint(m,{len:L}));
   b.ellipsoid([0,y+.004,0],[r*1.55,.034*S,r*1.55],c.paint('pitch',{len:.05}),5);
   lashing(c,y-.075*S,y+.03*S,r*1.45,10,{mat:'sinew'});
  }
 }else if(c.era===1){
  const L=.2*S,W=.03*S;
  b.blade({y0:y+.004,y1:y+L,w:t=>W*Math.min(1,.35+t*2.4)*Math.pow(1-t,.55),th:t=>.0052*S*(1-t*.5),chip:chip,section:'diamond',steps:b.pick(10,7,4)},mp(c,L));
  lashing(c,y-.085*S,y+.012,r*1.0,9,{mat:'cord'});
  for(const s of [-1,1])b.ellipsoid([s*(r*1.4),y-.03*S,0],[.0045,.0045,.0045],mp(c,.01),4);
 }else{
  const sock=(c.era===2?.1:c.era===3?.115:.1)*S,L=(c.era===2?.23:c.era===3?.26:.3)*S,W=(c.era===2?.03:c.era===3?.028:.024)*S,m=mp(c,L);
  b.rod([0,y-sock,0],[0,y+.01,0],t=>r*(1.28-.3*t),c.sd(8),mp(c,sock),{segs:2,caps:'a'});
  b.ring([0,y-sock*.55,0],[0,1,0],r*1.2,.0035,m,b.pick(16,10,6),4);
  if(c.lod<2)for(const s of [-1,1])b.ellipsoid([s*r*1.3,y-sock*.3,0],[.0045,.0045,.0045],m,4);
  const f=c.era===2?(t:number)=>W*leaf(t):c.era===3?(t:number)=>W*Math.pow(Math.max(0,Math.sin(Math.PI*Math.pow(t,.62))),.62):(t:number)=>W*Math.pow(Math.max(0,Math.sin(Math.PI*Math.pow(t,.8))),.85);
  b.blade({y0:y+.01,y1:y+.01+L,w:f,th:t=>(c.era===2?.0062:.0052)*S*(1-t*.55),chip:chip*.7,section:c.era===4?'hollow':'diamond',steps:b.pick(16,9,5)},m);
  if(c.era===4&&c.lod<2){for(const dy of [-.07,-.045])b.ring([0,y+dy*S,0],[0,1,0],r*1.1,.0028,c.paint('gold',{len:.02}),b.pick(14,10,6),4);}
  makerMark(c,[0,y-sock*.7,r*1.3],c.metal,.7);
 }
}
function butt(c:Ctx,y:number,r:number){
 const b=c.b;
 if(c.era===0){b.rod([0,y,0],[0,y-.035,0],t=>r*(1-t*.8)+.001,c.sd(6),c.paint('char',{len:.05}),{segs:1,caps:'b'});return;}
 const L=.09;b.rod([0,y+.04,0],[0,y-L,0],t=>t<.4?r*1.12:r*1.12*(1-(t-.4)/.6)+.0015,c.sd(7),mp(c,L),{segs:4,caps:'b'});
 b.ring([0,y+.012,0],[0,1,0],r*1.15,.003,mp(c,.02),b.pick(14,10,6),4);
}
export function spearFamily(c:Ctx,kind:'spear'|'javelin'|'pike'){
 const b=c.b,S=kind==='javelin'?.78:kind==='pike'?.85:1,y0=kind==='javelin'?-.42:kind==='pike'?-1.45:-.62,yTop=kind==='javelin'?.98:kind==='pike'?2.62:1.4;
 const r0=kind==='javelin'?.0125:kind==='pike'?.0215:.0185,r1=r0*.8,rAt=(y:number)=>r0+(r1-r0)*(y-y0)/(yTop-y0);
 const wood=(len:number)=>decorPaint(c,c.wood(len),len,.5,.92);
 const seg=(ya:number,yb:number,head:boolean,tail:boolean)=>{
  shaft(c,ya,yb,rAt(ya),rAt(yb),{paint:wood(yb-ya),caps:head?'a':true});
  if(head)spearHead(c,yb,S,rAt(yb));
  if(tail)butt(c,ya,rAt(ya));
  const g0=kind==='javelin'?-.08:-.11,g1=kind==='javelin'?.1:kind==='pike'?.2:.17;
  if(ya<g0&&yb>g1)gripWrap(c,g0,g1,rAt(0)+.0015);
  if(kind==='pike'&&c.era>=2&&head){for(const s of [-1,1])c.b.box([.004,.5,.01],[s*(rAt(yTop)+.003),yb-.3,0],mp(c,.5));}
  if(kind==='javelin'&&head){ // throwing loop / weighted shaft wrap behind the balance point
   c.b.lash([0,.12,0],[0,.28,0],rAt(.2)+.002,12,.0028,c.paint('cord',{len:.1,tint:c.st.cordColour,tintAmount:.5}));}
 };
 if(!c.broken){
  seg(y0,yTop,true,true);tassel(c,[0,yTop-(kind==='javelin'?.04:.06),rAt(yTop)],kind==='pike'?1.2:1);
  if(c.lod===0)makerMark(c,[0,y0+.35,rAt(y0)+.001],'wood',1,[0,0,0]);
 }else{
  const yb=y0+(yTop-y0)*.6;
  seg(y0,yb,false,true);splinters(c,[0,yb,0],rAt(yb),[0,1,0],.1);
  b.push([.2,.1,.02],[0,0,-1.2]);const yf=yTop-(yTop-y0)*.34;seg(yf,yTop,true,false);splinters(c,[0,yf,0],rAt(yf),[0,-1,0],.08);b.pop();
 }
}

// ---------------------------------------------------------------------------------------------------------------- hafted head helpers
/** An axe or adze head extending along +Z from the haft, edge at the far end: a slab with chamfered spines whose cheeks stay thick over the first half and are ground down
 *  to a convex bevel and a thin edge, with rounded edge corners and an optional beard (`drop`). `w0` is the thickness at the eye, `w1` at the edge, `h0`/`h1` the height. */
export function wedge(c:Ctx,y:number,z0:number,z1:number,o:{w0:number;w1:number;h0:number;h1:number;drop?:number;paint:Paint;shape?:'oct'|'rect'}){
 const L=z1-z0,corner=(t:number)=>t<.8?1:Math.sqrt(Math.max(.08,1-Math.pow((t-.8)/.2,2)*.7)),thick=Math.max(o.w0,.012)/2,edge=Math.max(.0011,o.w1/2);
 const th=(t:number)=>t<.45?thick*(1-.16*t/.45):edge+(thick*.84-edge)*Math.pow(1-(t-.45)/.55,1.7),hh=(t:number)=>(o.h0+(o.h1-o.h0)*Math.pow(t,.8))/2*corner(t);
 c.b.push([0,y,z0],[0,0,0],[0,0,1,1,0,0,0,1,0] as never);
 c.b.blade({y0:0,y1:L,w:hh,th,sweep:o.drop?t=>-o.drop!*t*t:undefined,section:'slab',steps:c.b.pick(16,10,6),capEnd:true},edgeGlint(o.paint,.8,.32));
 c.b.pop();
}
/** a hafted tool's handle with a butt swell; returns top y */
export function haft(c:Ctx,y0:number,y1:number,r:number,o:{knob?:boolean;crook?:number}={}){
 const L=y1-y0,P=decorPaint(c,c.wood2(L),L,.35,.85),n=c.b.pick(10,6,4),zOf=(t:number)=>(o.crook??0)*Math.pow(Math.max(0,t-.8)/.2,2);
 const path=Array.from({length:n+1},(_,i)=>{const t=i/n;return [Math.sin(t*3)*.004*(1+c.wear*2),y0+L*t,zOf(t)] as V3;});
 c.b.tube(path,t=>r*(1.25-.35*Math.sin(Math.min(1,t*1.3)*Math.PI*.6))*(t>.9?1.1:1),c.sd(8),P,{caps:true});
 if(o.knob)c.b.ellipsoid([0,y0-.004,0],[r*1.45,r*1.1,r*1.45],c.wood2(.05),6);
 gripWrap(c,y0+.05,y0+.27,r*1.3);
}

// ---------------------------------------------------------------------------------------------------------------- axe
export function handAxe(c:Ctx){
 const b=c.b,hy=.5;
 if(c.broken){haft(c,-.2,.34,.02,{knob:true});splinters(c,[0,.34,0],.02,[0,1,0],.07);
  b.push([.17,.04,.02],[0,0,-1.3]);haft(c,.0,.3,.019);b.pop();return;}
 haft(c,-.2,.62,.02,{knob:true,crook:c.era===0?.06:0});
 if(c.era===0){ // ground stone celt in a knee haft
  b.ellipsoid([0,hy+.02,.025],[.034,.05,.04],c.wood2(.1),6);
  wedge(c,hy,.005,.17,{w0:.036,w1:.003,h0:.05,h1:.08,paint:c.paint(c.st.stone==='obsidian'?'basalt':'stone',{len:.2,tint:'#7e8a72',tintAmount:.3}),shape:'oct'});
  lashing(c,hy-.075,hy+.075,.036,12,{x:0,z:.02,mat:'sinew'});
 }else if(c.era===1){ // flat copper axe in a cleft haft
  wedge(c,hy,.01,.16,{w0:.012,w1:.0025,h0:.055,h1:.088,paint:mp(c,.2),shape:'rect'});
  b.ellipsoid([0,hy,.0],[.026,.06,.026],c.wood2(.1),6);
  lashing(c,hy-.07,hy+.07,.03,9,{mat:'cord'});
  for(const dy of [-.02,.02])b.ellipsoid([.008,hy+dy,.02],[.004,.004,.004],mp(c,.01),4);
 }else if(c.era===2){ // flanged palstave with a stop ridge and a side loop
  wedge(c,hy,.012,.16,{w0:.016,w1:.0025,h0:.05,h1:.09,paint:mp(c,.2),shape:'rect'});
  for(const s of [-1,1])b.box([.005,.06,.075],[s*.011,hy,.04],mp(c,.1));
  b.box([.034,.058,.01],[0,hy,.088],mp(c,.1));
  b.ring([.012,hy-.045,-.01],[1,0,0],.016,.003,mp(c,.1),b.pick(10,8,6),4);
  b.ellipsoid([0,hy+.01,-.006],[.026,.052,.022],c.wood2(.1),6);
  lashing(c,hy-.065,hy+.065,.03,8,{mat:'cord'});
 }else if(c.era===3){ // iron shaft-hole axe: eye, wedge, poll
  b.loft([{c:[0,hy,-.035],w:.046,h:.07},{c:[0,hy,.03],w:.046,h:.075}],'z',mp(c,.2),{shape:'oct'});
  wedge(c,hy,.03,.2,{w0:.034,w1:.003,h0:.075,h1:.125,drop:.015,paint:mp(c,.2)});
  b.box([.036,.05,.045],[0,hy,-.058],mp(c,.1));
  b.box([.012,.012,.03],[0,hy+.039,0],c.wood2(.05));
 }else{ // steel bearded axe, inlaid collar
  b.loft([{c:[0,hy,-.032],w:.044,h:.07},{c:[0,hy,.03],w:.044,h:.076}],'z',mp(c,.2),{shape:'oct'});
  wedge(c,hy,.03,.22,{w0:.03,w1:.0024,h0:.07,h1:.17,drop:.045,paint:mp(c,.22)});
  b.loft([{c:[0,hy,-.032],w:.016,h:.012},{c:[0,hy,-.07],w:.012,h:.02},{c:[0,hy,-.095],w:.003,h:.01}],'z',mp(c,.1),{shape:'oct'});
  if(c.lod<2)b.ring([0,hy-.032,0],[0,1,0],.024,.0035,c.paint('gold',{len:.1}),b.pick(14,10,6),4);
 }
 makerMark(c,[.02,.08,.012],'wood',1,[0,Math.PI/2,0]);
 tassel(c,[0,-.19,.02],.8);
}

// ---------------------------------------------------------------------------------------------------------------- mace / club
export function club(c:Ctx){
 const b=c.b;
 if(c.broken){haft(c,-.2,.3,.022);splinters(c,[0,.3,0],.022,[0,1,0],.07);b.push([.14,.06,.03],[0,0,-1.1]);
  b.ellipsoid([0,.0,0],[.06,.06,.06],c.wood(.1),6);b.pop();return;}
 if(c.era===0){ // knobbed club shaped from a root crown
  haft(c,-.2,.46,.022,{knob:true});
  b.ellipsoid([0,.53,0],[.062,.075,.062],c.wood2(.15),c.sd(8));
  const n=c.lod===0?9:c.lod===1?5:0;for(let i=0;i<n;i++){const a=i/n*TAU+.3,h=.48+.05*((i*7)%3);b.ellipsoid([Math.cos(a)*.056,h,Math.sin(a)*.056],[.014,.014,.014],c.wood2(.05),4);}
  lashing(c,.4,.46,.026,5,{mat:'sinew'});
 }else if(c.era===1){ // pierced stone mace head, wedged and lashed
  haft(c,-.2,.5,.02,{knob:true});
  b.ellipsoid([0,.49,0],[.06,.044,.06],c.paint('stone',{len:.12,tint:'#9a8f82',tintAmount:.3}),8);
  b.ellipsoid([0,.55,0],[.024,.02,.024],c.wood2(.05),5);
  lashing(c,.4,.45,.026,6,{mat:'sinew'});
 }else{
  const metal=mp(c,.15);
  haft(c,-.2,.5,.02,{knob:true});
  if(c.era===2||c.era===4){ // flanged mace
   const n=c.era===2?6:7,H=c.era===2?.12:.14;
   b.rod([0,.38,0],[0,.38+H,0],()=>.02,c.sd(8),metal,{segs:1});
   for(let i=0;i<n;i++){const a=i/n*TAU;b.push([Math.cos(a)*.022,.38+H*.5,Math.sin(a)*.022],[0,-a+Math.PI/2,0]);
    b.loft([{c:[0,-H*.5,0],w:.026,h:.004},{c:[0,-H*.1,.03],w:.03,h:.004},{c:[0,H*.45,.034],w:.01,h:.004},{c:[0,H*.5,.0],w:.004,h:.003}],'y',metal,{shape:'rect'});b.pop();}
   b.rod([0,.38+H,0],[0,.38+H+.03,0],t=>.014*(1-t)+.002,c.sd(6),metal,{segs:1});
   b.ring([0,.38,0],[0,1,0],.022,.004,metal,b.pick(14,10,6),4);
   if(c.era===4)for(const s of [-1,1])b.box([.005,.34,.012],[s*.024,.2,0],metal);
  }else{ // iron spiked ball
   b.ellipsoid([0,.5,0],[.05,.05,.05],metal,8);
   const n=c.lod===0?14:c.lod===1?8:0;
   for(let i=0;i<n;i++){const phi=Math.acos(1-2*(i+.5)/n),th=i*2.399963,d:V3=[Math.sin(phi)*Math.cos(th),Math.cos(phi),Math.sin(phi)*Math.sin(th)];
    b.rod(v3.add([0,.5,0],v3.mul(d,.045)),v3.add([0,.5,0],v3.mul(d,.078)),t=>.0095*(1-t)+.0012,4,metal,{segs:1,caps:'a'});}
  }
 }
 makerMark(c,[.0,.05,.02],'wood');tassel(c,[0,-.19,0],.8);
}

// ---------------------------------------------------------------------------------------------------------------- war pick
export function warPick(c:Ctx){
 const b=c.b,hy=.52;
 if(c.broken){haft(c,-.2,.36,.02);splinters(c,[0,.36,0],.02,[0,1,0],.07);return;}
 haft(c,-.2,.62,.02,{knob:true});
 const spike=(P:Paint,len:number,r:number,dir:1|-1,drop:number)=>{
  const n=c.b.pick(9,6,3),path=Array.from({length:n+1},(_,i)=>{const t=i/n;return [0,hy-drop*t*t,dir*(.025+len*t)] as V3;});
  b.tube(path,t=>r*Math.pow(1-t,.9)+.0012,c.sd(6),P,{caps:'a'});
 };
 if(c.era===0){ // antler tine through the crook, lashed
  b.ellipsoid([0,hy+.02,0],[.03,.05,.03],c.wood2(.1),6);
  spike(c.paint('antler',{len:.2}),.21,.017,1,.05);lashing(c,hy-.06,hy+.07,.03,10,{mat:'sinew'});
  b.rod([0,hy+.01,-.03],[0,hy+.01,-.07],()=>.012,6,c.paint('antler',{len:.1}),{segs:1});
 }else{
  const P=mp(c,.25);
  b.loft([{c:[0,hy,-.035],w:.042,h:.072},{c:[0,hy,.03],w:.042,h:.076}],'z',P,{shape:'oct'});
  spike(P,c.era===1?.17:.24,.019,1,c.era>=3?.055:.035);
  if(c.era>=3){b.loft([{c:[0,hy,-.035],w:.036,h:.04},{c:[0,hy,-.075],w:.034,h:.045},{c:[0,hy,-.09],w:.024,h:.03}],'z',P,{shape:'oct'});}
  else spike(P,.1,.014,-1,.0);
  if(c.era>=2)for(const s of [-1,1])b.box([.004,.3,.012],[s*.022,hy-.17,0],P);
 }
 makerMark(c,[.02,.08,.012],'wood',1,[0,Math.PI/2,0]);
}

// ---------------------------------------------------------------------------------------------------------------- swords and daggers
function pommel(c:Ctx,y:number){
 const b=c.b,P=c.era>=1?mp(c,.1):c.paint('bone',{len:.1}),s=c.st.pommel,sd=b.pick(14,10,6);
 switch(s){
  case 'disc':b.rod([0,y,0],[0,y-.014,0],()=>.03,sd,P,{segs:1});break;
  case 'ball':b.ellipsoid([0,y-.012,0],[.024,.022,.024],P,6);break;
  case 'crescent':{const path=Array.from({length:9},(_,i)=>{const a=(i/8-.5)*2.4;return [Math.sin(a)*.045,y-.012+Math.cos(a)*.022-.02,0] as V3;});b.tube(path,t=>.011*(1-.35*Math.abs(t-.5)*2),6,P,{caps:true});break;}
  case 'wheel':b.ring([0,y-.008,0],[0,0,1],.03,.005,P,b.pick(16,10,6),4);b.rod([0,y-.008,0],[0,y-.008,0.0],()=>.006,4,P,{segs:1});b.box([.06,.006,.006],[0,y-.008,0],P);b.box([.006,.06,.006],[0,y-.008,0],P);break;
  case 'antenna':for(const s2 of [-1,1]){const path=Array.from({length:7},(_,i)=>{const t=i/6;return [s2*(.012+.03*t),y-.006+.035*Math.sin(t*2.2),0] as V3;});b.tube(path,t=>.006*(1-.5*t),5,P,{caps:true});}b.ellipsoid([0,y-.01,0],[.016,.012,.016],P,5);break;
  default:b.ellipsoid([0,y-.008,0],[.017,.012,.017],P,5);
 }
}
function guardAt(c:Ctx,y:number,wide:number){
 const b=c.b,P=mp(c,.15),g=c.era===1?'none':c.st.guard;
 if(g==='none')return;
 if(g==='disc'){b.rod([0,y,0],[0,y+.008,0],()=>.036,b.pick(16,10,6),P,{segs:1});return;}
 if(g==='down'){for(const s of [-1,1]){const path=Array.from({length:6},(_,i)=>{const t=i/5;return [s*(.006+wide*t),y+.01-.03*t*t,0] as V3;});b.tube(path,t=>.007*(1-.4*t),5,P,{caps:true});}return;}
 b.loft([{c:[0,y,0],w:wide*2,h:.03},{c:[0,y+.016,0],w:wide*2,h:.03}],'y',P,{shape:'oct'});
}
export function sword(c:Ctx,kind:'sword'|'dagger'='sword'){
 const b=c.b,dag=kind==='dagger',era=c.era;
 if(era===0&&!dag){ // macuahuitl-like paddle: hardwood blade with inset obsidian or flint teeth
  const L=.62,W=.05;
  b.loft([{c:[0,.03,0],w:.05,h:.02},{c:[0,.05,0],w:.09,h:.014},{c:[0,.03+L*.8,0],w:.11,h:.014},{c:[0,.03+L,0],w:.07,h:.012}],'y',c.wood2(L),{shape:'oct'});
  const m=stoneOf(c)==='obsidian'?'obsidian':'flint',n=b.pick(11,7,4);
  if(c.lod<2)for(let i=0;i<n;i++){const y=.1+i*(L-.1)/n;for(const s of [-1,1]){b.push([s*.052,y,0],[0,0,s*.2]);b.loft([{c:[0,0,0],w:.012,h:.014},{c:[0,.026,0],w:.002,h:.006}],'y',c.paint(m,{len:.03}),{shape:'oct'});b.pop();}}
  b.rod([-.0,.05,0],[0,.03,0],()=>.025,6,c.paint('pitch',{len:.05}),{segs:1});
  b.rod([0,-.1,0],[0,.04,0],t=>.016+.003*Math.sin(t*3),c.sd(8),c.wood2(.14),{segs:3});
  gripWrap(c,-.09,.0,.019);b.ellipsoid([0,-.11,0],[.022,.016,.022],c.wood2(.05),5);
  makerMark(c,[0,.2,.008],'wood',1.2);return;
 }
 const L=dag?[.19,.22,.25,.27,.27][era]:[.62,.38,.56,.7,.78][era],W=dag?[.021,.026,.025,.024,.022][era]:[.05,.043,.034,.03,.028][era],gy=.03;
 const form=era<=2?(c.st.bladeForm==='straight'&&era===2?'straight':'leaf'):(c.st.bladeForm==='leaf'?'straight':c.st.bladeForm);
 const y1=gy+L;
 // --- hilt
 if(era===0){ // flint dagger with a bone grip, sinew wrapped
  b.rod([0,-.1,0],[0,gy,0],t=>.013+.004*Math.sin(t*Math.PI),c.sd(8),c.paint('bone',{len:.13}),{segs:3});gripWrap(c,-.08,0,.016);b.ellipsoid([0,-.108,0],[.016,.012,.016],c.paint('bone',{len:.04}),5);
 }else{
  const hl=dag?.09:.115;
  b.rod([0,-hl,0],[0,gy,0],t=>.015+.003*Math.sin(t*Math.PI),c.sd(8),c.wood2(hl),{segs:3});
  if(era>=2||dag)gripWrap(c,-hl+.012,gy-.012,.0182);
  if(era===1&&!dag){for(const dy of [-.07,-.03])for(const s of [-1,1])b.ellipsoid([s*.0155,dy,0],[.004,.004,.004],mp(c,.01),4);}
  pommel(c,-hl);guardAt(c,gy,dag?.032:.065);
 }
 // --- blade
 const chip=.002+.006*c.wear,P=era===0?c.paint(stoneOf(c)==='obsidian'?'obsidian':'flint',{len:L}):mp(c,L,{pattern:era===4});
 const bladeW=(t:number)=>{
  if(era===0)return W*leaf(t);
  if(form==='leaf')return W*(.55+.45*Math.sin(Math.min(1,t*1.6)*Math.PI*.5))*Math.pow(1-t,.45)*(1+.18*Math.sin(Math.PI*Math.min(1,t*1.3)));
  const tip=.14;return W*(t<1-tip?1-.18*t:Math.pow((1-t)/tip,.8)*(1-.18*(1-tip)));
 };
 const sweepAmt=form==='curved'?L*.13:form==='sickle'&&era>=2?L*.28:0;
 b.blade({y0:gy,y1,w:bladeW,th:t=>(era===0?.006:era===1?.0045:era===2?.0055:.0042)*(1-t*.65),section:era===0?'lens':era===4?'hollow':era===2?'diamond':era===1?'diamond':'lens',
  sweep:sweepAmt?t=>(form==='sickle'?Math.pow(Math.max(0,(t-.3)/.7),1.8):t*t)*sweepAmt:undefined,chip:era===0?chip*2:chip,steps:b.pick(18,10,6),seed:c.seed},P);
 if(era>=2&&c.lod===0){ // central fuller / midrib accent line
  const ridge=mp(c,L,{pattern:era===4});void ridge;
 }
 if(!dag&&era>=3&&c.lod<2)b.ring([0,gy+.002,0],[0,1,0],.02,.0025,c.paint('gold',{len:.1}),b.pick(12,8,6),4);
 makerMark(c,[0,gy+.04,.006],era===0?'flint':c.metal,.9);
 if(c.broken){ // snapped tip: a jagged step shown by a darker stub at the break
  b.push([0,gy+L*.58,.0],[0,0,0]);b.box([W*2.2,.01,.01],[0,0,0],c.paint('char',{len:.02}));b.pop();
 }
}

// ---------------------------------------------------------------------------------------------------------------- shields
export type ShieldShapeId='round'|'oval'|'kite'|'tower'|'wicker'|'buckler';
const SHIELD_DIM:Record<ShieldShapeId,{rx:number;ry:number;n:number;bulge:number}>={
 round:{rx:.33,ry:.33,n:2,bulge:.05},oval:{rx:.26,ry:.42,n:2,bulge:.045},kite:{rx:.26,ry:.5,n:2,bulge:.045},tower:{rx:.25,ry:.5,n:5,bulge:.05},wicker:{rx:.31,ry:.31,n:2,bulge:.04},buckler:{rx:.15,ry:.15,n:2,bulge:.035},
};
export function shield(c:Ctx,shapeIn?:string){
 const b=c.b,shape=(shapeIn??c.req.variant??c.st.shield) as ShieldShapeId,D=SHIELD_DIM[shape]??SHIELD_DIM.round,era=c.era,N=b.pick(30,18,10);
 const bite=c.broken?{a0:c.r('bite')*TAU,w:.8}:null;
 const outline:[number,number][]=Array.from({length:N},(_,j)=>{
  const a=j/N*TAU,ca=Math.cos(a),sa=Math.sin(a),e=2/D.n;let x=D.rx*Math.sign(ca)*Math.pow(Math.abs(ca),e),y=D.ry*Math.sign(sa)*Math.pow(Math.abs(sa),e);
  if(shape==='kite'&&sa<0){x*=Math.pow(1+sa,.85);}
  if(bite){const d=Math.abs(((a-bite.a0+Math.PI)%TAU+TAU)%TAU-Math.PI);if(d<bite.w){const k=1-.38*Math.pow(Math.cos(d/bite.w*Math.PI/2),2);x*=k;y*=k;}}
  return [x,y];
 });
 const flatPlank=shape==='tower'||shape==='kite';
 const zFn=(s:number,j:number)=>{const [x,y]=outline[j],nx=(x*s)/D.rx,ny=(y*s)/D.ry;const r2=flatPlank?nx*nx*.9+ny*ny*.12:nx*nx+ny*ny;return D.bulge*(1-Math.min(1,r2))+(c.wear>.3?.006*Math.sin(j*2.3+c.seed)*s*c.wear:0);};
 const isHide=era===0&&shape!=='wicker',isWicker=shape==='wicker';
const field=hexRgb(c.st.field),acc=hexRgb(c.st.accent),ink=hexRgb(c.st.cordColour),trim=hexRgb(c.st.trim);
 const baseP=isWicker?c.paint('wicker',{len:1}):isHide?c.paint('hide',{len:1,tint:'#a07a4c',tintAmount:.2}):c.wood(.9,{tile:TILE.PLANK,grain:.15,tint:c.st.field,tintAmount:.3});
 const R=Math.max(D.rx,D.ry);
 // the painted face: society motif and civ emblem are decals (crisp, in the society's own colours); the vertex paint carries the rim band, the wear and the field
 const MOTIF:Record<string,MotifName>={bands:'rings',chevron:'chevrons',dots:'dots',spiral:'spiral',notches:'teeth',steps:'fret',none:'stripes'};
 const layer=isWicker?TILE.WEAVE:isHide?TILE.HIDE:TILE.PLANK,sc=TILE_SCALE[layer];
 const design:Paint=likePaint((p,n,t,a)=>{
  const col=baseP(p,n,t,a),x=p[0]/D.rx,y=p[1]/D.ry,r=Math.hypot(x,y),ang=Math.atan2(y,x);
  if(isWicker){const w=Math.sin(r*34)*.5+.5;return rgbMix(col,hexRgb('#6e5230'),w*.35*(Math.sin(ang*14)>0?1:.6));}
  let out=col;
  if(era>=1&&!isHide&&r>.82)out=rgbMix(out,field,.5);
  if(isHide&&r>.9)out=rgbMix(out,hexRgb('#6b4a2a'),.5);
  return out;},baseP);
 design.tex={...texMetaFor(layer),planar:(p)=>[p[0]*sc[0],p[1]*sc[1]],...(isWicker?{}:{decal:{cellA:motifCell(MOTIF[c.st.decor]??'rings'),cellB:emblemCell(c.st.emblem),uv:(p:V3):[number,number]=>[p[0]/(2*R)+.5,p[1]/(2*R)+.5],accA:ink,accB:era>=1&&!isHide?trim:acc}})};
 const back=c.paint('leather',{len:1});
 b.push([-.12,.1,.09]);
 b.dish(outline,b.pick(7,5,3),zFn,isHide?.014:.022,design,back);
 // edge binding: rawhide before metal, metal after
 const rimMat=era>=2?c.metal:'rawhide',rimP=rimMat==='rawhide'?c.paint('rawhide',{len:1,tint:c.st.cordColour,tintAmount:.3}):mp(c,1);
 if(!isWicker||c.lod<2){const path=outline.map(([x,y],j)=>[x,y,zFn(1,j)] as V3);path.push(path[0]);
  b.tube(path,()=>era>=2?.0085:.011,b.pick(6,5,3),rimP,{caps:false});}
 if(isWicker&&c.lod===0)for(const f of [.55,.8])b.ring([0,0,D.bulge*(1-f*f)+.002],[0,0,1],D.rx*f,.004,c.paint('wicker',{len:.5,tint:'#7a5a34',tintAmount:.4}),20,4);
 // boss
 const boss=era===0?(isWicker?c.paint('wicker',{len:.1}):c.paint('horn',{len:.1})):era===1?c.paint('copper',{len:.1,wear:c.wear}):mp(c,.2);
 const br=shape==='buckler'?.06:.075;
 b.ellipsoid([0,0,D.bulge+.004],[br,br,era>=3?.05:.034],boss,b.pick(10,7,5));
 if(era>=2&&c.lod<2){b.ring([0,0,D.bulge+.004],[0,0,1],br*1.02,.004,mp(c,.1),b.pick(16,10,6),4);}
 if(era>=3&&c.lod===0){const n=10;for(let i=0;i<n;i++){const a=i/n*TAU;b.ellipsoid([Math.cos(a)*D.rx*.78,Math.sin(a)*D.ry*.78,zFn(.78,Math.round((a/TAU*N))%N)+.012],[.007,.007,.006],mp(c,.01),4);}}
 // handle (behind), arm strap
 b.rod([-.075,0,-.03],[.075,0,-.03],()=>.0125,6,c.paint('leather',{len:.15}),{segs:1});
 for(const s of [-1,1])b.rod([s*.075,0,-.03],[s*.075,0,zFn(.2,0)-.012],()=>.006,4,c.paint('leather',{len:.05}),{segs:1});
 b.rod([-.08,-.2*D.ry/.33,-.02],[.08,-.2*D.ry/.33,-.02],()=>.007,4,c.paint('leather',{len:.15}),{segs:1});
 b.pop();
}
void bandPaint;
