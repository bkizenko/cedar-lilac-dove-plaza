/** SIEGE ITEMS: beam ram, scaling ladders, mantlet, sappers' kit, ballista, stone thrower and siege tower. World frame: origin on the ground at the
 *  footprint centre, +Y up, the working front toward +Z. Built from squared timbers, hide, rope, wheels and era-correct metal (iron-shod heads,
 *  bronze or iron fittings); wear shows as weathered grey timber, frayed lashings, patched hides and missing planks. */
import {TAU,v3,hexRgb,rgbMix,type V3,type Paint} from './itemMesh';
import {type Ctx,lashing,splinters,makerMark,decorPaint,gripWrap} from './itemKit';
import {wedge} from './itemMelee';

// ---------------------------------------------------------------------------------------------------------------- shared timber craft
/** a squared timber between two points */
export function timber(c:Ctx,a:V3,b:V3,w:number,h:number,paint?:Paint,roll=0){
 const L=v3.len(v3.sub(b,a));if(L<1e-4)return;
 c.b.pushAlong(a,b);if(roll)c.b.push([0,0,0],[0,roll,0]);
 c.b.loft([{c:[0,0,0],w,h},{c:[0,L,0],w,h}],'y',paint??c.wood(L),{shape:'oct'});
 if(roll)c.b.pop();c.b.pop();
}
const logPaint=(c:Ctx,len:number)=>c.wood(len,{tint:'#6a5a44',tintAmount:.15});
/** a round log */
export function log(c:Ctx,a:V3,b:V3,r:number,r2=r,paint?:Paint){c.b.rod(a,b,t=>r+(r2-r)*t,c.sd(9),paint??logPaint(c,v3.len(v3.sub(b,a))),{segs:c.b.pick(6,3,1)});}
/** a wheel in the XY plane at `at` with axis along X (spoked from the bronze age, solid planks before) */
export function wheel(c:Ctx,at:V3,R:number,w:number,o:{spokes?:number;solid?:boolean}={}){
 const b=c.b,solid=o.solid??c.era<2,P=c.wood2(1,{tint:'#5f4d38',tintAmount:.2}),iron=c.era>=3?c.paint('iron',{len:1}):c.paint('leather',{len:1});
 b.push(at,[0,0,Math.PI/2]);
 b.rod([0,-w/2,0],[0,w/2,0],()=>R,b.pick(20,14,10),solid?P:P,{segs:1}); // outer disc standing in for the felloes; planks show as seams below
 if(!solid){b.rod([0,-w/2-.002,0],[0,w/2+.002,0],()=>R*.7,b.pick(20,14,10),c.paint('char',{len:.5,tint:'#2e261e',tintAmount:.3}),{segs:1,caps:false});}
 b.ring([0,0,0],[0,1,0],R*.985,.014,iron,b.pick(26,16,10),4);
 b.rod([0,-w*.9,0],[0,w*.9,0],()=>R*.17,8,P,{segs:1});
 if(!solid&&c.lod<2){const n=o.spokes??8;for(let i=0;i<n;i++){const a=i/n*TAU;b.rod([Math.cos(a)*R*.17,0,Math.sin(a)*R*.17],[Math.cos(a)*R*.95,0,Math.sin(a)*R*.95],()=>R*.055,5,P,{segs:1,caps:false});}}
 else if(c.lod<2){for(const s of [-1,1])for(let i=0;i<3;i++){b.box([R*1.7,.02,.012],[0,s*(w/2+.002),(i-1)*R*.5],c.paint('char',{len:1,tint:'#3a2e22',tintAmount:.3}));}}
 b.pop();
}
/** hide sheet stretched between four corners (a quad as a shallow dish), laced at the edge */
export function hideSheet(c:Ctx,corners:[V3,V3,V3,V3],sag=.03,tone?:string){
 const n=c.b.pick(6,4,2),pts:V3[][]=[];
 for(let i=0;i<=n;i++){const row:V3[]=[];for(let j=0;j<=n;j++){const u=i/n,v=j/n,p=v3.lerp(v3.lerp(corners[0],corners[1],u),v3.lerp(corners[3],corners[2],u),v),nrm=v3.norm(v3.cross(v3.sub(corners[1],corners[0]),v3.sub(corners[3],corners[0])));
   row.push(v3.add(p,v3.mul(nrm,Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*sag)));}pts.push(row);}
 c.b.grid(pts,c.paint('hide',{len:2,tint:tone,tintAmount:tone?.4:0}),{smooth:true,closed:false,flip:false});
 c.b.grid(pts,c.paint('hide',{len:2,tint:tone,tintAmount:.2}),{smooth:true,closed:false,flip:true});
}
const stud=(c:Ctx,p:V3,r=.012)=>{if(c.lod<2)c.b.ellipsoid(p,[r,r,r*.6],c.paint(c.era>=3?'iron':'bronze',{len:.02}),4);};

// ---------------------------------------------------------------------------------------------------------------- beam ram
export function beamRam(c:Ctx){
 const b=c.b,hw=.78,Lr=1.7,H=1.95,P=(L:number)=>c.wood(L);
 for(const sx of [-1,1])for(const sz of [-1,1]){ // posts and wheel axle stubs
  timber(c,[sx*hw,.35,sz*Lr*.8],[sx*hw,H,sz*Lr*.8],.14,.14,P(1.6));
  wheel(c,[sx*(hw+.2),.36,sz*Lr*.62],.36,.12);
 }
 for(const sz of [-1,1])timber(c,[-hw-.14,.36,sz*Lr*.62],[hw+.14,.36,sz*Lr*.62],.1,.1,P(1.6));
 for(const sx of [-1,1]){timber(c,[sx*hw,.62,-Lr*.8],[sx*hw,.62,Lr*.8],.12,.12,P(3));timber(c,[sx*hw,H,-Lr*.8],[sx*hw,H,Lr*.8],.12,.12,P(3));}
 for(const sz of [-1,1])timber(c,[-hw,H,sz*Lr*.8],[hw,H,sz*Lr*.8],.12,.12,P(1.6));
 // gabled roof: ridge, rafters, hide covering
 const ridge=H+.62;timber(c,[0,ridge,-Lr*.95],[0,ridge,Lr*.95],.13,.13,P(3.4));
 for(let i=0;i<=c.b.pick(6,4,2);i++){const z=-Lr*.85+i*(Lr*1.7/c.b.pick(6,4,2));for(const s of [-1,1])timber(c,[s*(hw+.06),H+.02,z],[0,ridge,z],.07,.07,P(1));}
 for(const s of [-1,1]){hideSheet(c,[[s*(hw+.18),H-.06,-Lr*.98],[s*(hw+.18),H-.06,Lr*.98],[0,ridge+.07,Lr*.98],[0,ridge+.07,-Lr*.98]],.04,c.wear>.5?'#5a4a36':undefined);}
 if(c.lod<2)for(let i=0;i<5;i++)for(const s of [-1,1])stud(c,[s*(hw*.5+.05),(H+ridge)/2+.02+.02*i,-Lr*.9+i*Lr*.45+.0],.014);
 // low wicker/hide side screens
 if(c.lod<2)for(const s of [-1,1])for(let k=0;k<4;k++)timber(c,[s*(hw+.02),.7+k*.3,-Lr*.78],[s*(hw+.02),.7+k*.3,Lr*.78],.025,.05,c.paint('wicker',{len:3}));
 // the ram: a squared log slung from the ridge on two pairs of ropes, with a head fitted for the era
 const by=1.32,rz0=-2.0,rz1=2.55,rope=c.paint('cord',{len:2,tint:c.st.cordColour,tintAmount:.2}),sway=c.broken?.18:0;
 log(c,[0,by,rz0],[0,by,rz1],.17,.15);
 b.ring([0,by,rz1-.02],[0,0,1],.165,.012,c.paint('leather',{len:1}),b.pick(14,10,6),4);
 for(const z of [rz0+1.3,rz1-1.6]){for(const s of [-1,1])b.rod([s*.04,by+.12,z],[s*(.2),ridge-.07,z+sway],()=>.011,5,rope,{segs:2});lashing(c,by+.1,by+.19,.17,6,{x:0,z,mat:'cord'});}
 if(c.era<=1){b.rod([0,by,rz1],[0,by,rz1+.28],t=>.15*(1-t*.7)+.02,c.sd(9),c.wood(.3,{tint:'#d7c9a6',tintAmount:.2}),{segs:3}); // fire-hardened, pointed beam end
  lashing(c,rz1-.3,rz1,.17,6,{});}
 else if(c.era===2){b.rod([0,by,rz1-.02],[0,by,rz1+.32],t=>.17*(1-t*.55)+.02,c.sd(10),c.paint('bronze',{len:.4,age:.06}),{segs:3});b.ring([0,by,rz1+.04],[0,0,1],.17,.012,c.paint('bronze',{len:.1}),b.pick(16,10,6),4);}
 else{ // an iron-shod ram's head with horns
  const m=c.paint(c.metal,{len:.5});b.rod([0,by,rz1-.02],[0,by,rz1+.36],t=>.17*(1-t*.45)+.025,c.sd(10),m,{segs:3});
  for(const s of [-1,1]){const path=Array.from({length:6},(_,i)=>{const t=i/5;return [s*(.09+.07*Math.sin(t*1.8)),by+.02-.03*t,rz1+.14-.02*t+.1*t*t*.0] as V3;});path.forEach((p,i)=>{p[2]+=i*.012;});b.tube(path,t=>.04*(1-t)+.007,5,m,{caps:'a'});}}
 // crew handles
 if(c.lod<2)for(const z of [rz0+.6,rz0+1.3,rz1-1.1]){for(const s of [-1,1])b.rod([s*.17,by,z],[s*.3,by-.06,z],()=>.012,4,c.wood2(.3),{segs:1});}
 makerMark(c,[hw+.001,1.2,Lr*.3],'wood',2,[0,Math.PI/2,0]);
 if(c.broken)splinters(c,[0,H,0],.05,[0,1,0],.18);
}

// ---------------------------------------------------------------------------------------------------------------- scaling ladders
function ladder(c:Ctx,L:number,w:number){
 const b=c.b,n=Math.round(L/.34),railP=c.wood(L);
 for(const s of [-1,1]){timber(c,[s*w/2,0,0],[s*w/2,L,0],.07,.05,railP);}
 for(let i=1;i<n;i++){const y=i*L/n;b.rod([-w/2,y,0],[w/2,y,0],()=>.017,c.sd(6),c.wood2(w),{segs:1});
  if(c.lod===0)for(const s of [-1,1])b.lash([s*w/2-.04,y,0],[s*w/2+.04,y,0],.026,3,.0032,c.paint('cord',{len:.1}));}
 for(const s of [-1,1]){if(c.era<2){timber(c,[s*w/2,L,0],[s*w/2,L+.12,.1],.05,.05,railP);}else{b.rod([s*w/2,L-.05,0],[s*w/2,L+.2,.0],t=>.03*(1-t)+.004,5,c.paint(c.metal,{len:.3}),{segs:2,caps:'a'});
   b.rod([s*w/2,L+.14,0],[s*w/2,L+.12,.16],()=>.012,4,c.paint(c.metal,{len:.2}),{segs:1,caps:'a'});}
  b.rod([s*w/2,0,0],[s*w/2,-.06,0],t=>.034*(1-t)+.006,5,c.paint(c.era>=2?c.metal:'char',{len:.2}),{segs:1,caps:'b'});}
 if(c.lod<2){b.tube([[-w/2,L-.4,0],[-w/4,L-.3,.04],[w/4,L-.5,.04],[w/2,L-.4,0]],()=>.008,4,c.paint('cord',{len:2,tint:c.st.cordColour,tintAmount:.25}),{caps:true});}
}
export function scalingLadder(c:Ctx){
 const b=c.b,L=4.4,w=.55;
 b.push([0,0,-.9],[-(Math.PI/2-1.05),0,0]);ladder(c,L,w);b.pop();
 if(c.lod<2){b.push([1.1,0,-.2],[-(Math.PI/2-.2),0,0.25]);ladder(c,L*.97,w);b.pop();}
 // grapnel rope coiled at the foot
 if(c.lod<2){b.ring([-.65,.06,.4],[0,1,0],.18,.022,c.paint('cord',{len:2,tint:c.st.cordColour,tintAmount:.2}),b.pick(18,12,8),5);b.ring([-.65,.1,.4],[0,1,0],.16,.022,c.paint('cord',{len:2}),b.pick(18,12,8),5);}
 if(c.broken)splinters(c,[w/2,2.2,-.2],.035,[0,1,.3],.14);
}

// ---------------------------------------------------------------------------------------------------------------- mantlet
export function mantlet(c:Ctx){
 const b=c.b,W=1.7,H=1.78,wicker=c.era<2;
 for(const s of [-1,1])timber(c,[s*W/2,.0,0],[s*W/2,H,0],.12,.12,c.wood(H));
 for(const y of [.05,H*.5,H-.05])timber(c,[-W/2,y,0],[W/2,y,0],.1,.1,c.wood(W));
 // face: woven hurdle, or planks with a hide skirt, and a loophole slit
 if(wicker){const n=b.pick(14,9,5);for(let i=0;i<n;i++){const x=-W/2+.1+i*(W-.2)/(n-1);b.rod([x,.05,.07],[x,H-.05,.07],()=>.026,5,c.paint('wicker',{len:1.7,tint:i%2?'#8b6c40':undefined,tintAmount:.3}),{segs:1});}
  const m=b.pick(12,8,4);for(let k=0;k<m;k++){const y=.1+k*(H-.2)/(m-1);b.rod([-W/2+.08,y,.08+(k%2)*.03],[W/2-.08,y,.08+(k%2)*.03],()=>.013,4,c.paint('wicker',{len:1.7}),{segs:3});}}
 else{const n=9;for(let i=0;i<n;i++){const x=-W/2+.1+(i+.5)*(W-.2)/n;timber(c,[x,.04,.06],[x,H-.04,.06],(W-.2)/n-.006,.05,c.wood(H,{tint:i%2?'#8a7a60':undefined,tintAmount:.15}));}}
 if(c.lod<2){timber(c,[-.28,H*.64,.09],[.28,H*.64,.09],.56,.045,c.paint('char',{len:.5}));hideSheet(c,[[-W/2+.05,.05,.1],[W/2-.05,.05,.1],[W/2-.05,H*.5,.1],[-W/2+.05,H*.5,.1]],.025);}
 for(const x of [-.55,-.2,.2,.55])stud(c,[x,H*.5-.05,.12],.012);
 // sloped timber roof, props, carry handles, a small wheel pair
 timber(c,[-W/2-.06,H+.02,-.18],[W/2+.06,H+.02,.1],.1,.06,c.wood(W));hideSheet(c,[[-W/2-.05,H+.02,-.4],[W/2+.05,H+.02,-.4],[W/2+.05,H+.02,.12],[-W/2-.05,H+.02,.12]],.02);
 for(const s of [-.6,.6])timber(c,[s,H*.8,0],[s*1.1,.0,-.9],.08,.06,c.wood(1.4));
 for(const s of [-1,1])b.rod([s*W/2,H*.55,-.04],[s*(W/2+.14),H*.55,-.5],()=>.02,5,c.wood2(.5),{segs:1});
 if(c.lod<2)for(const s of [-1,1])wheel(c,[s*(W/2-.14),.14,.2],.14,.07,{solid:true});
 if(c.broken)splinters(c,[W/2,H,0],.06,[0,1,0],.16);
 makerMark(c,[.6,H*.72,.095],'wood',1.6,[0,0,0]);
}

// ---------------------------------------------------------------------------------------------------------------- sappers' kit
function mattock(c:Ctx,at:V3,rot:V3,L=1.0){
 const b=c.b;b.push(at,rot);
 log(c,[0,-L*.5,0],[0,L*.5,0],.02,.0165,c.wood2(L));
 gripWrap(c,-L*.5+.06,-L*.5+.3,.021);
 const y=L*.5-.05;
 if(c.era===0){b.rod([0,y,-.02],[0,y+.01,.26],t=>.02*(1-t)+.004,6,c.paint('antler',{len:.3}),{segs:3});b.rod([0,y,-.02],[0,y+.01,-.1],()=>.016,6,c.paint('antler',{len:.1}),{segs:1});lashing(c,y-.06,y+.06,.025,8,{mat:'sinew'});}
 else{const m=c.paint(c.metal,{len:.5});
  b.loft([{c:[0,y,-.036],w:.046,h:.075},{c:[0,y,.03],w:.046,h:.08}],'z',m,{shape:'oct'});            // the eye
  wedge(c,y,.03,.2,{w0:.026,w1:.003,h0:.07,h1:.12,drop:.012,paint:m});                                 // adze blade, broad and thin
  b.rod([0,y,-.036],[0,y-.012,-.21],t=>.02*(1-t)+.002,c.sd(6),m,{segs:4,caps:'a'});                    // pick on the other side
 }
 b.pop();
}
export function sapperTools(c:Ctx){
 const b=c.b;
 // a compact kit lying where the gallery will start: tools along one side, spoil basket and rope on the other, a few props. About 1.3 m by 0.9 m.
 mattock(c,[-.3,.06,.28],[Math.PI/2,.12,0]);mattock(c,[-.28,.07,.1],[Math.PI/2-.03,-.1,0],1.05);if(c.lod===0)mattock(c,[-.3,.06,-.08],[Math.PI/2,.2,0],.95);
 // a spade: shaft and a broad blade
 b.push([.25,.07,.32],[Math.PI/2,-.1,0]);log(c,[0,-.5,0],[0,.3,0],.018,.015,c.wood2(.9));b.box([.04,.035,.045],[0,.33,0],c.wood2(.1));
 b.loft([{c:[0,.3,0],w:.035,h:.018},{c:[0,.12,0],w:.18,h:.011},{c:[0,-.08,0],w:.17,h:.011},{c:[0,-.26,0],w:.03,h:.009}],'y',c.era>=2?c.paint(c.metal,{len:.5}):c.wood2(.5),{shape:'rect'});b.pop();
 // a pry bar, iron or hardwood, with a flattened toe
 const bar=c.era>=2?c.paint(c.metal,{len:1.2}):c.wood(1.2);
 b.rod([.5,.035,.5],[.5,.035,-.55],t=>.018-.006*t,c.sd(6),bar,{segs:2});b.rod([.5,.035,-.55],[.5,.05,-.62],()=>.011,c.sd(6),bar,{segs:1,caps:'b'});
 // rope coil and a basket of spoil
 if(c.lod<2){for(let k=0;k<4;k++)b.ring([-.55,.025+k*.03,.4],[0,1,0],.15-k*.008,.016,c.paint('cord',{len:2,tint:c.st.cordColour,tintAmount:.2}),b.pick(18,12,8),5);}
 b.rod([.2,.0,-.2],[.2,.24,-.2],t=>.18-.04*t,c.sd(14),c.paint('wicker',{len:1}),{segs:5});
 b.ring([.2,.24,-.2],[0,1,0],.14,.01,c.paint('wicker',{len:.3,tint:'#7a5a34',tintAmount:.4}),b.pick(20,12,8),4);
 b.ellipsoid([.2,.24,-.2],[.15,.05,.15],c.paint('stone',{len:1,tint:'#6a5a44',tintAmount:.5}),6);
 // timber props to hold a gallery, cut to a hand's length
 timber(c,[-.75,.05,-.4],[-.1,.05,-.45],.075,.075,c.wood(.7));timber(c,[-.1,.05,-.45],[.2,.05,-.6],.07,.07,c.wood(.4));
 makerMark(c,[-.4,.1,-.4],'wood',2,[-Math.PI/2,0,0]);
}

// ---------------------------------------------------------------------------------------------------------------- ballista (torsion bolt thrower)
function skein(c:Ctx,at:V3,R:number,hgt:number){
 const b=c.b;
 b.rod([at[0],at[1]-hgt/2,at[2]],[at[0],at[1]+hgt/2,at[2]],()=>R,c.sd(12),c.paint('sinew',{len:.4,tint:'#b09462',tintAmount:.3}),{segs:1});
 if(c.lod<2)for(let i=0;i<c.b.pick(6,4,2);i++){const y=at[1]-hgt/2+.01+i*(hgt-.02)/c.b.pick(5,3,1);b.ring([at[0],y,at[2]],[0,1,0],R,.006,c.paint('cord',{len:.2}),b.pick(14,10,6),4);}
 for(const s of [-1,1])b.rod([at[0],at[1]+s*hgt/2,at[2]],[at[0],at[1]+s*(hgt/2+.025),at[2]],()=>R*1.35,c.sd(12),c.paint(c.era>=3?'iron':'bronze',{len:.1}),{segs:1});
}
export function ballista(c:Ctx){
 const b=c.b,iron=c.paint(c.era>=3?'iron':'bronze',{len:.5}),W=.55;
 // stand: a column on a tripod with iron shoes
 log(c,[0,.25,0],[0,.95,0],.09,.07);
 for(let i=0;i<3;i++){const a=i/3*TAU+.4;timber(c,[Math.cos(a)*.7,0,Math.sin(a)*.7],[0,.62,0],.08,.08,c.wood(.9));b.rod([Math.cos(a)*.7,0,Math.sin(a)*.7],[Math.cos(a)*.7,-.0,Math.sin(a)*.7],()=>.05,4,iron,{segs:1});}
 // frame: two spring frames and cross beams
 const fy=1.12;
 for(const s of [-1,1]){timber(c,[s*W,fy-.22,-.05],[s*W,fy+.22,-.05],.12,.1,c.wood(.5));timber(c,[s*(W-.16),fy-.22,-.05],[s*(W-.16),fy+.22,-.05],.12,.1,c.wood(.5));
  skein(c,[s*(W-.08),fy,-.05],.07,.4);
  const arm:V3=[s*(W+.5),fy,.46];
  b.rod([s*(W-.08),fy,-.05],arm,t=>.026*(1-t*.5)+.008,c.sd(7),c.wood2(.6),{segs:3});
  b.ellipsoid(arm,[.012,.012,.012],iron,4);
 }
 timber(c,[-W-.18,fy+.22,-.05],[W+.18,fy+.22,-.05],.1,.08,c.wood(1.2));timber(c,[-W-.18,fy-.22,-.05],[W+.18,fy-.22,-.05],.1,.08,c.wood(1.2));
 // string and slider with the bolt
 b.tube([[-W-.5,fy,.46],[-.03,fy,-.02],[.03,fy,-.02],[W+.5,fy,.46]],()=>.0055,4,c.paint('sinew',{len:2}),{caps:true});
 timber(c,[0,fy-.05,-.6],[0,fy-.05,1.25],.07,.09,c.wood2(1.9));
 b.box([.02,.025,1.8],[0,fy-.005,.35],c.paint('char',{len:1.8}));
 const bz0=.06,bz1=1.12;b.rod([0,fy+.02,bz0],[0,fy+.02,bz1],()=>.009,5,c.wood(1),{segs:1});
 b.rod([0,fy+.02,bz1],[0,fy+.02,bz1+.1],t=>.014*(1-t)+.002,5,iron,{segs:1,caps:'a'});
 for(const s of [-1,1])b.box([.002,.03,.1],[0,fy+.02+s*.01,bz0+.07],c.paint('feather',{len:.1,tint:c.st.fletch[0],tintAmount:.4}),[0,0,s*0.9]);
 // winch at the rear: drum, ratchet and handles
 b.rod([-.12,fy-.05,-.6],[.12,fy-.05,-.6],()=>.055,c.sd(10),c.wood2(.3),{segs:1});
 b.ring([.12,fy-.05,-.6],[1,0,0],.075,.008,iron,b.pick(16,10,6),4);
 for(const s of [-1,1])b.rod([s*.12,fy-.05,-.6],[s*.32,fy+.04,-.66],()=>.012,4,c.wood2(.3),{segs:1});
 // iron plate shield in front of the frame and bracing
 if(c.era>=3){b.loft([{c:[0,fy,.52],w:.7,h:.012},{c:[0,fy,.52],w:.7,h:.012}],'y',iron,{shape:'rect'});}
 for(const s of [-1,1])timber(c,[s*W,fy-.22,-.05],[s*.12,.62,-.05],.06,.05,c.wood(.7));
 makerMark(c,[0,fy-.12,-.095],'wood',2.2,[0,Math.PI,0]);
 if(c.broken){b.rod([-W-.5,fy,.46],[-W-.5,fy-.5,.36],()=>.003,3,c.paint('sinew',{len:.5}),{segs:3});}
}

// ---------------------------------------------------------------------------------------------------------------- catapult (onager-style stone thrower)
export function catapult(c:Ctx){
 const b=c.b,hw=.62,L=1.7,P=(l:number)=>c.wood(l),iron=c.paint(c.era>=3?'iron':'bronze',{len:.5});
 // base: two long beams on cross sleepers, with four small wheels
 for(const s of [-1,1]){timber(c,[s*hw,.34,-L],[s*hw,.34,L],.18,.2,P(3.4));for(const z of [-L*.65,L*.65])wheel(c,[s*(hw+.19),.2,z],.2,.1,{solid:true});}
 for(const z of [-L*.8,-.2,L*.55,L*.95])timber(c,[-hw-.1,.34,z],[hw+.1,.34,z],.15,.16,P(1.5));
 // uprights + a horizontal torsion frame carrying two spring skeins
 for(const s of [-1,1]){timber(c,[s*hw,.4,.55],[s*hw,2.0,.55],.2,.16,P(1.8));timber(c,[s*hw,.5,.1],[s*hw,2.0,.55],.12,.1,P(1.8));timber(c,[s*hw,.4,1.1],[s*hw,1.45,.55],.12,.1,P(1.2));}
 timber(c,[-hw,2.0,.55],[hw,2.0,.55],.15,.14,P(1.4));
 for(const s of [-1,1])skein(c,[s*.38,1.62,.55],.14,.4);
 b.push([0,1.62,.55],[0,0,Math.PI/2]);
 b.rod([-.7,0,0],[.7,0,0],()=>.04,c.sd(8),c.wood2(1.4),{segs:1});b.pop();
 // the throwing arm, rest-cocked toward the rear, with the sling and cup
 const hub:V3=[0,1.62,.55],tip:V3=[0,3.0,-.75];
 b.rod(hub,tip,t=>.06*(1-t*.45)+.01,c.sd(8),c.wood2(2),{segs:c.b.pick(8,4,2)});
 b.ring([0,2.3,-.1],[0,.5,.8],.07,.012,iron,b.pick(14,10,6),4);
 b.tube([[0,3.0,-.75],[0,2.78,-1.0],[0,2.6,-1.12]],()=>.012,4,c.paint('cord',{len:.6,tint:c.st.cordColour,tintAmount:.2}),{caps:true});
 b.ellipsoid([0,2.55,-1.14],[.14,.1,.14],c.paint('leather',{len:.3}),7);
 b.ellipsoid([0,2.64,-1.14],[.08,.07,.08],c.paint('stone',{len:.2}),6);
 // stop beam with a padded cross-bar at the front top and the rear winch
 timber(c,[-hw+.05,1.55,1.28],[hw-.05,1.55,1.28],.13,.12,P(1.2));
 b.rod([-hw+.1,1.64,1.28],[hw-.1,1.64,1.28],()=>.09,c.sd(8),c.paint('hide',{len:1.2}),{segs:1});
 b.rod([-.2,.58,-L*.8],[.2,.58,-L*.8],()=>.07,c.sd(10),c.wood2(.4),{segs:1});
 for(const s of [-1,1])b.rod([s*.2,.58,-L*.8],[s*.36,.74,-L*.8-.06],()=>.014,4,c.wood2(.3),{segs:1});
 b.tube([[0,.58,-L*.8],[0,1.0,-.9],[0,2.3,-.35]],()=>.011,4,c.paint('cord',{len:2,tint:c.st.cordColour,tintAmount:.2}),{caps:true});
 b.ring([.2,.58,-L*.8],[1,0,0],.08,.008,iron,b.pick(16,10,6),4);
 // stones stacked beside the engine
 for(const [x,z,r] of [[1.4,-.2,.13],[1.55,.1,.12],[1.25,.15,.11],[1.45,-.4,.1]] as const)b.ellipsoid([x,r,z],[r,r*.9,r],c.paint('stone',{len:.3}),6);
 makerMark(c,[hw+.095,.78,.0],'wood',2.2,[0,Math.PI/2,0]);
 if(c.broken)splinters(c,[0,2.4,-.2],.05,[0,.5,-.8],.15);
}

// ---------------------------------------------------------------------------------------------------------------- siege tower
export function siegeTower(c:Ctx){
 const b=c.b,hw=1.55,hd=1.55,Ht=8.6,P=(l:number)=>c.wood(l),iron=c.paint('iron',{len:1});
 // chassis and four solid wheels
 for(const s of [-1,1]){timber(c,[s*hw,.7,-hd-.4],[s*hw,.7,hd+.4],.3,.3,P(4));wheel(c,[s*(hw+.28),.55,-hd*.6],.58,.26,{solid:true});wheel(c,[s*(hw+.28),.55,hd*.6],.58,.26,{solid:true});}
 for(const z of [-hd*.6,hd*.6])timber(c,[-hw-.2,.55,z],[hw+.2,.55,z],.18,.18,P(3.4));
 for(const z of [-hd,hd])timber(c,[-hw,.78,z],[hw,.78,z],.26,.26,P(3.2));
 // corner posts and floor timbers at three levels
 const levels=[2.85,5.7,Ht];
 for(const sx of [-1,1])for(const sz of [-1,1])timber(c,[sx*hw,.8,sz*hd],[sx*hw*.82,Ht,sz*hd*.82],.26,.26,P(8));
 for(const y of levels)for(const [a,bb] of [[[-1,-1],[1,-1]],[[1,-1],[1,1]],[[1,1],[-1,1]],[[-1,1],[-1,-1]]] as [number[],number[]][]){const k=1-(y/Ht)*.18;timber(c,[a[0]*hw*k,y,a[1]*hd*k],[bb[0]*hw*k,y,bb[1]*hd*k],.22,.22,P(3));}
 // plank walls with hide cladding on the three outer faces, arrow slits, studs
 const wall=(face:'f'|'l'|'r'|'b')=>{
  const kx=face==='l'?-1:1;
  for(let lv=0;lv<3;lv++){
   const y0=(lv===0?.9:levels[lv-1]+.1),y1=levels[lv]-.1,k0=1-(y0/Ht)*.18,k1=1-(y1/Ht)*.18;
   const corners:[V3,V3,V3,V3]=face==='f'?[[-hw*k0,y0,hd*k0],[hw*k0,y0,hd*k0],[hw*k1,y1,hd*k1],[-hw*k1,y1,hd*k1]]:face==='b'?[[hw*k0,y0,-hd*k0],[-hw*k0,y0,-hd*k0],[-hw*k1,y1,-hd*k1],[hw*k1,y1,-hd*k1]]:
    [[kx*hw*k0,y0,hd*k0],[kx*hw*k0,y0,-hd*k0],[kx*hw*k1,y1,-hd*k1],[kx*hw*k1,y1,hd*k1]];
   if(face==='b'){continue;} // the back is open: the ladder is visible inside
   const n=c.lod===0?7:c.lod===1?4:2;
   const fw=v3.len(v3.sub(corners[1],corners[0])),nrm=v3.norm(v3.cross(v3.sub(corners[1],corners[0]),v3.sub(corners[3],corners[0]))),q=(u:number,v:number)=>v3.lerp(v3.lerp(corners[0],corners[1],u),v3.lerp(corners[3],corners[2],u),v);
   for(let i=0;i<n;i++){const u=(i+.5)/n;timber(c,v3.add(q(u,0),v3.mul(nrm,.04)),v3.add(q(u,1),v3.mul(nrm,.04)),fw/n*.96,.07,c.wood(2.8,{tint:i%2?'#8a7a60':undefined,tintAmount:.15}),0);}
   // wet hide over the lower two thirds
   if(c.lod<2)hideSheet(c,[v3.lerp(corners[0],corners[3],.0),v3.lerp(corners[1],corners[2],.0),v3.lerp(corners[1],corners[2],.62),v3.lerp(corners[0],corners[3],.62)].map((p,i)=>v3.add(p,[0,0,face==='f'?.08:0]) as V3) as [V3,V3,V3,V3],.06,c.wear>.5?'#4e3f2d':undefined);
   if(c.lod===0&&face==='f'){const yy=(y0+y1)/2+.4,k=1-(yy/Ht)*.18;for(const x of [-.9,0,.9])b.box([.08,.7,.06],[x*k*hw*.95,yy,hd*k+.09],c.paint('char',{len:.7}));}
  }
 };
 wall('f');wall('l');wall('r');
 // top parapet, a drawbridge raised on ropes, and a flag
 for(const sx of [-1,1])for(const sz of [-1,1])timber(c,[sx*hw*.82,Ht,sz*hd*.82],[sx*hw*.82,Ht+.9,sz*hd*.82],.2,.2,P(1));
 for(const sz of [-1,1])timber(c,[-hw*.82,Ht+.9,sz*hd*.82],[hw*.82,Ht+.9,sz*hd*.82],.18,.14,P(3));
 for(const sx of [-1,1])timber(c,[sx*hw*.82,Ht+.9,-hd*.82],[sx*hw*.82,Ht+.9,hd*.82],.18,.14,P(3));
 const brLen=3.0,brAng=c.broken?.55:-1.3;
 b.push([0,Ht+.2,hd*.82],[brAng,0,0]);for(let i=0;i<6;i++)timber(c,[-hw*.7+i*(hw*1.4/5),0,0],[-hw*.7+i*(hw*1.4/5),0,brLen],.26,.07,P(3));b.pop();
 if(c.lod<2)for(const s of [-1,1])b.tube([[s*hw*.7,Ht+.9,hd*.82],[s*hw*.7,Ht+1.6,hd*.82+.6],[s*hw*.7,Ht+.2-Math.sin(brAng)*brLen*.9,hd*.82+Math.cos(brAng)*brLen*.9]],()=>.016,4,c.paint('cord',{len:4,tint:c.st.cordColour,tintAmount:.2}),{caps:true});
 timber(c,[0,Ht+.9,0],[0,Ht+2.9,0],.1,.1,P(2));
 b.loft([{c:[.04,Ht+2.85,0],w:.02,h:.02},{c:[.7,Ht+2.65,0],w:.02,h:.55},{c:[1.3,Ht+2.45,0],w:.02,h:.35}],'x',c.paint('linen',{len:1.3,tint:c.st.field,tintAmount:.8}),{shape:'rect'});
 // interior ladder visible from the back, pushing beams
 for(const s of [-.45,.45])timber(c,[s,.9,-hd*.7],[s,Ht,-hd*.5],.08,.06,P(8));
 if(c.lod<2)for(let i=1;i<18;i++){const t=i/18,y=.9+t*(Ht-.9),z=-hd*.7+t*hd*.2;b.rod([-.45,y,z],[.45,y,z],()=>.02,4,c.wood2(.9),{segs:1});}
 for(const s of [-1,1])timber(c,[s*.9,.9,-hd-.4],[s*.9,.9,-hd-2.4],.16,.16,P(2));
 stud(c,[hw*.5,.9,hd+.12],.02);
 makerMark(c,[0,1.2,hd+.02],'wood',5,[0,0,0]);
 if(c.broken)splinters(c,[hw,Ht*.7,hd*.5],.1,[0,1,.2],.3);
}
void hexRgb;void rgbMix;void decorPaint;
export const SIEGE_GENERATORS:{id:string;name:string;gen:(c:Ctx)=>void}[]=[
 {id:'battering_ram',name:'Beam ram',gen:beamRam},{id:'scalingLadder',name:'Scaling ladders',gen:scalingLadder},{id:'mantlet',name:'Mantlet screen',gen:mantlet},{id:'sapperTools',name:"Sappers' picks",gen:sapperTools},
 {id:'ballista',name:'Bolt thrower',gen:ballista},{id:'catapult',name:'Stone thrower',gen:catapult},{id:'siegeTower',name:'Siege tower',gen:siegeTower},
];
