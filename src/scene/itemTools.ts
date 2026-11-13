/** TOOLS AND CARRIED ITEMS: farming (ard, hoe, spade, sickle, flail, quern), crafting (mallet, hammer, felling axe, pick, staff, standard), hunting kit
 *  (snare, nets, deadfall, skinning knife, scraper, hide frame), fishing (rod, leister, net, fish trap), carried goods (pots, baskets, waterskin, pack,
 *  sack, torch, handcart, harness) and ship fittings (oar, steering oar, anchor, rope coil, block, bailer). Each is shaped for its era's material
 *  and its society's style, with hafting and lashing done the way that era did it. Hand items: grip at the origin, working end along +Y.
 *  World items: origin on the ground, +Y up, working front toward +Z. */
import {TAU,v3,hexRgb,rgbMix,likePaint,type V3,type Paint} from './itemMesh';
import {type Ctx,shaft,splinters,lashing,gripWrap,decorPaint,makerMark,tassel,curve} from './itemKit';
import {haft,wedge} from './itemMelee';
import {hideSheet,log,timber,wheel} from './itemSiege';
import type {ItemCategory,Frame} from './itemModels';

type Gen={id:string;name:string;category:ItemCategory;frame:Frame;gen:(c:Ctx)=>void;budget?:readonly [number,number,number]};
const prof=(pts:[number,number][])=>(t:number)=>{
 for(let i=1;i<pts.length;i++)if(t<=pts[i][0]){const [t0,r0]=pts[i-1],[t1,r1]=pts[i],u=(t-t0)/(t1-t0||1),s=u*u*(3-2*u);return r0+(r1-r0)*s;}
 return pts[pts.length-1][1];
};
const mp=(c:Ctx,len:number,o:{pattern?:boolean}={})=>c.paint(c.metal,{len,pattern:o.pattern??c.era===4});
const eraHead=(c:Ctx):'stone'|'copper'|'bronze'|'iron'|'steel'=>c.era===0?'stone':(['copper','bronze','iron','steel'] as const)[c.era-1];

// ---------------------------------------------------------------------------------------------------------------- farming
function hoe(c:Ctx){
 const b=c.b;
 if(c.broken){haft(c,-.25,.4,.019);splinters(c,[0,.4,0],.019,[0,1,0],.07);return;}
 // haft with a natural crook at the top; blade lashed on at ~60 degrees to it
 haft(c,-.25,.74,.019,{knob:false,crook:.05});
 b.push([0,.66,.05],[-1.0,0,0]);
 const w=c.era===0?.11:.125,L=.2;
 const P=c.era===0?c.paint(c.r('bone')<.5?'bone':'stone',{len:L}):mp(c,L);
 b.loft([{c:[0,0,0],w:w*.55,h:.022},{c:[0,L*.5,0],w:w*.9,h:.012},{c:[0,L,0],w:w,h:.005}],'y',P,{shape:'oct'});b.pop();
 lashing(c,.6,.72,.026,0,{z:.02,mat:c.era===0?'sinew':'cord'});
 if(c.era>=2)for(const s of [-1,1])b.ellipsoid([s*.02,.66,.05],[.006,.006,.006],mp(c,.01),4);
 makerMark(c,[0,.1,.019],'wood');
}
function spade(c:Ctx){
 const b=c.b;
 if(c.era===0){ // digging stick with a fire-hardened point and a foot peg
  log(c,[0,-.2,0],[0,1.1,0],.022,.018,c.wood2(1.3));b.rod([0,-.2,0],[0,-.38,0],t=>.022*(1-t)+.002,7,c.paint('char',{len:.2}),{segs:2,caps:'b'});
  b.rod([-.05,.05,.02],[.07,.05,.02],()=>.016,5,c.wood2(.2),{segs:1});return;}
 log(c,[0,-.1,0],[0,.95,0],.02,.017,c.wood2(1));
 b.loft([{c:[0,.99,0],w:.09,h:.03},{c:[0,.95,0],w:.045,h:.03}],'y',c.wood2(.1),{shape:'oct'});
 const P=c.era>=2?mp(c,.3):c.wood2(.3);
 b.loft([{c:[0,.0,0],w:.05,h:.016},{c:[0,-.12,0],w:.2,h:.016},{c:[0,-.32,0],w:.2,h:.014},{c:[0,-.42,0],w:.05,h:.01}],'y',P,{shape:'oct'});
 if(c.era>=3)b.loft([{c:[0,.0,.0],w:.06,h:.034},{c:[0,-.1,0],w:.07,h:.034}],'y',mp(c,.1),{shape:'oct'});
 lashing(c,-.02,.1,.022,0,{mat:'cord'});makerMark(c,[0,.4,.019],'wood');
}
function sickle(c:Ctx){
 const b=c.b,n=b.pick(14,9,5);
 // curved handle and blade in the plane Y/Z; teeth are inset flint flakes before metal
 log(c,[0,-.12,0],[0,.08,0],.016,.014,c.wood2(.3));gripWrap(c,-.1,.04,.0185);
 const arc=(R:number,a0:number,a1:number)=>Array.from({length:n+1},(_,i)=>{const a=a0+(a1-a0)*i/n;return [0,.08+Math.sin(a)*R,R-Math.cos(a)*R] as V3;});
 const R=.22,path=arc(R,.0,1.6);
 if(c.era===0){ // antler/wood curved haft with a groove; flint microlith teeth set in pitch
  b.tube(path,t=>[.012,.01+.004*(1-t)],c.sd(7),c.wood2(.4),{caps:true});
  b.tube(path.map(p=>[p[0]+.011,p[1],p[2]] as V3),()=>.0075,4,c.paint('pitch',{len:.4}),{caps:true});
  const m=b.pick(11,7,4);for(let i=0;i<m;i++){const t=(i+.5)/m,k=Math.floor(t*n),p=path[Math.min(n,k)];const a=1.6*t;b.push([.012,p[1],p[2]],[-a,0,0]);b.loft([{c:[0,0,0],w:.004,h:.014},{c:[0,.018,0],w:.003,h:.004}],'y',c.paint(c.st.stone==='obsidian'?'obsidian':'flint',{len:.03}),{shape:'oct'});b.pop();}
 }else{
  const bt=c.era===1?.004:.003,wd=c.era>=3?.022:.019;
  b.tube(path,t=>[bt,wd*(1-.55*Math.pow(t,2.2))+.003],c.sd(6),mp(c,.4),{caps:true});
  b.rod([0,.07,-.012],[0,.14,.01],()=>.01,5,mp(c,.1),{segs:1});
  lashing(c,.05,.11,.019,0,{mat:'cord'});
 }
 makerMark(c,[0,-.06,.0165],'wood',.9,[0,0,0]);
}
function flail(c:Ctx){
 const b=c.b,metalHead=c.era>=2,P=metalHead?mp(c,.1):c.paint('leather',{len:.15}),thong=c.paint('rawhide',{len:.2,tint:c.st.cordColour,tintAmount:.15});
 haft(c,-.2,.62,.017,{knob:true});
 // the swivel: a bound ferrule on the handle, a leather (or iron) eye, and a hinge thong looped through the beater
 if(c.lod<2)b.rod([0,.585,0],[0,.655,0],()=>.0225,c.sd(8),metalHead?mp(c,.06):c.paint('rawhide',{len:.1}),{segs:1,caps:'a'});
 b.ring([0,.64,0],[1,0,0],.024,.0065,P,b.pick(14,10,6),4);
 b.tube([[0,.64,0],[0,.665,.03],[0,.67,.07]],()=>.0058,5,thong,{caps:true});
 if(c.lod<2)b.ring([0,.67,.052],[1,0,0],.016,.0045,thong,b.pick(12,8,6),4);
 b.push([0,.67,.07],[Math.PI/2-.2,0,0]);
 // the swipple: a split of hardwood, thicker at the free end, worn pale where the hands of threshers have knocked it
 log(c,[0,0,0],[0,.55,0],.021,.027,decorPaint(c,c.wood2(.6),.55,.2,.9));
 if(c.lod<2){
  b.ring([0,.035,0],[0,1,0],.0215,.006,thong,b.pick(14,8,6),4);                      // hinge groove, bound
  b.ring([0,.505,0],[0,1,0],.0275,.007,P,b.pick(14,8,6),4);                           // cap band near the free end
  if(metalHead){for(const y of [.025,.545])b.ring([0,y,0],[0,1,0],y<.1?.0225:.0285,.0048,mp(c,.05),b.pick(16,10,6),4);if(c.lod===0)for(let i=0;i<5;i++){const a=i/5*TAU;b.ellipsoid([Math.cos(a)*.0295,.5,Math.sin(a)*.0295],[.0045,.0045,.0045],mp(c,.01),4);}}
 }
 b.pop();
 makerMark(c,[.0,.1,.0172],'wood');
}
function quern(c:Ctx){
 const b=c.b,stone=c.paint('stone',{len:.6,tint:'#8a8478',tintAmount:.3}),flour=c.paint('linen',{len:.3,tint:'#f1ead6',tintAmount:.8}),grain=c.paint('rawhide',{len:.2,tint:'#d8c47a',tintAmount:.6});
 if(c.era<=1){ // saddle quern: a long dished slab, a rubbing stone, grain and flour
  b.ellipsoid([0,.09,0],[.42,.11,.26],stone,c.sd(9));b.ellipsoid([0,.19,0],[.3,.03,.17],c.paint('stone',{len:.3,tint:'#6a655b',tintAmount:.5}),7);
  b.ellipsoid([0,.24,.04],[.17,.05,.07],c.paint('stone',{len:.3,tint:'#9a948a',tintAmount:.3}),7,{rot:[0,.2,0]});
  const n=b.pick(22,12,5);for(let i=0;i<n;i++){const a=i*2.4,r=.02+.15*Math.sqrt(i/n);b.ellipsoid([-.19+Math.cos(a)*r*.7,.2+.04*(1-r/.17),.1+Math.sin(a)*r*.5],[.007,.006,.01],grain,3);}
  b.ellipsoid([.34,.04,.3],[.16,.04,.1],flour,6);b.rod([.2,.0,.34],[.48,.0,.26],()=>.0,3,flour,{segs:1});
  b.ellipsoid([.36,.05,-.31],[.13,.07,.1],c.paint('wicker',{len:.1}),6);
 }else{ // rotary quern: two stones, hopper, a handle peg
  b.rod([0,0,0],[0,.11,0],()=>.28,c.sd(18),stone,{segs:1});
  b.rod([0,.11,0],[0,.2,0],t=>.27-.01*t,c.sd(18),c.paint('stone',{len:.6,tint:'#a39d92',tintAmount:.3}),{segs:1});
  b.ring([0,.205,0],[0,1,0],.05,.016,c.paint('char',{len:.1}),b.pick(16,10,6),5);
  b.rod([.2,.2,0],[.2,.34,0],()=>.014,5,c.wood2(.2),{segs:1});b.rod([.2,.33,0],[.14,.33,.06],()=>.01,4,c.wood2(.1),{segs:1});
  b.rod([-.28,.07,0],[-.38,.03,0],()=>.04,6,stone,{segs:1});
  b.ellipsoid([-.5,.03,.1],[.17,.05,.12],flour,6);b.rod([-.6,.0,.05],[-.3,0,.35],()=>0,3,flour,{segs:1});
  b.ellipsoid([.0,.23,0],[.07,.03,.07],grain,5);
 }
 makerMark(c,[.15,.12,.28],'stone',2,[0,0,0]);
}
function ard(c:Ctx){
 const b=c.b,wood=(l:number)=>c.wood(l),P=eraHead(c),share=P==='stone'?c.paint('stone',{len:.3,tint:'#7c8470',tintAmount:.3}):mp(c,.3);
 // sole (share-beam) slanting into the soil, beam rising to the rear, stilt handle behind
 timber(c,[0,.02,-.55],[0,.08,.55],.1,.1,wood(1.1));
 b.rod([0,.08,.5],[0,0,.78],t=>.055*(1-t*.6)+.012,c.sd(8),c.era===0?c.paint('char',{len:.3}):share,{segs:3,caps:'a'}); // working tip
 if(c.era>=1)b.loft([{c:[0,.1,.4],w:.1,h:.05},{c:[0,.02,.74],w:.14,h:.045},{c:[0,-.02,.86],w:.012,h:.02}],'z',share,{shape:'oct',caps:true});
 timber(c,[0,.1,-.5],[0,1.12,-1.0],.09,.09,wood(1.2)); // stilt
 b.rod([-.14,1.12,-1.0],[.14,1.12,-1.0],()=>.022,6,c.wood2(.3),{segs:1});gripWrapStilt(c);
 log(c,[0,.34,-.2],[0,.78,1.6],.045,.035,wood(2.2)); // beam
 timber(c,[0,.26,.2],[0,.5,.1],.06,.06,wood(.5));lashing(c,.04,.34,.06,0,{x:0,z:.05,mat:'cord'});
 // yoke bar and traces at the front
 b.rod([-.55,.8,1.52],[.55,.8,1.52],()=>.035,c.sd(8),c.wood2(1.1),{segs:2});
 for(const s of [-.45,.45]){b.tube([[s,.8,1.52],[s*1.1,.66,1.3],[s*.8,.45,1.0]],()=>.011,4,c.paint('leather',{len:.5}),{caps:true});}
 lashing(c,.78,.82,.04,0,{x:0,z:1.5,mat:'cord'});
 if(P!=='stone'&&c.era>=3)b.rod([0,.35,-.1],[0,.2,.4],()=>.01,4,share,{segs:1});
 makerMark(c,[.05,.1,-.1],'wood',2,[0,Math.PI/2,0]);
}
function gripWrapStilt(c:Ctx){c.b.lash([-.1,1.12,-1.0],[.1,1.12,-1.0],.026,5,.004,c.paint('leather',{len:.2}));}

// ---------------------------------------------------------------------------------------------------------------- crafting tools
function mallet(c:Ctx){
 const b=c.b;haft(c,-.15,.42,.019);
 b.push([0,.4,0],[0,0,Math.PI/2]);
 b.rod([0,-.1,0],[0,.1,0],()=>.062,c.sd(10),c.wood(.3,{tint:'#6a5438',tintAmount:.2}),{segs:1});
 if(c.era>=3)for(const y of [-.09,.09])b.ring([0,y,0],[0,1,0],.063,.006,mp(c,.1),b.pick(16,10,6),4);
 else for(const y of [-.09,.09])b.ring([0,y,0],[0,1,0],.063,.005,c.paint('rawhide',{len:.1}),b.pick(16,10,6),4);
 b.pop();makerMark(c,[0,.12,.02],'wood');
}
function hammer(c:Ctx){
 const b=c.b;haft(c,-.15,.5,.017);const y=.46;
 if(c.era===0){b.ellipsoid([0,y,0],[.045,.06,.05],c.paint('stone',{len:.1,tint:'#6d7378',tintAmount:.3}),7);lashing(c,y-.05,y+.05,.04,0,{mat:'sinew'});}
 else{const m=mp(c,.2);b.loft([{c:[0,y,-.07],w:.04,h:.05},{c:[0,y,0],w:.044,h:.062},{c:[0,y,.06],w:.05,h:.062}],'z',m,{shape:'oct'});
  if(c.era>=3)b.loft([{c:[0,y,.06],w:.05,h:.062},{c:[0,y,.09],w:.052,h:.052}],'z',c.paint('steel',{len:.1}),{shape:'oct'});
  b.loft([{c:[0,y,-.07],w:.04,h:.05},{c:[0,y,-.14],w:.01,h:.04}],'z',m,{shape:'oct'});b.box([.012,.012,.03],[0,y+.036,0],c.wood2(.05));}
 makerMark(c,[0,.05,.0172],'wood');
}
function fellingAxe(c:Ctx){
 const b=c.b,hy=.78;haft(c,-.22,.92,.021,{knob:true});
 if(c.era===0){b.ellipsoid([0,hy+.02,.02],[.04,.06,.045],c.wood2(.1),6);wedge(c,hy,.0,.19,{w0:.045,w1:.004,h0:.065,h1:.115,paint:c.paint('stone',{len:.2,tint:'#7e8a72',tintAmount:.3})});lashing(c,hy-.09,hy+.09,.04,0,{z:.02,mat:'sinew'});}
 else if(c.era===1){wedge(c,hy,.01,.18,{w0:.016,w1:.003,h0:.07,h1:.12,paint:mp(c,.2),shape:'rect'});b.ellipsoid([0,hy,0],[.03,.07,.03],c.wood2(.1),6);lashing(c,hy-.08,hy+.08,.032,0,{mat:'cord'});}
 else{b.loft([{c:[0,hy,-.04],w:.05,h:.08},{c:[0,hy,.03],w:.05,h:.085}],'z',mp(c,.2),{shape:'oct'});wedge(c,hy,.03,.24,{w0:.036,w1:.003,h0:.085,h1:.15,drop:.01,paint:mp(c,.25)});b.box([.04,.06,.05],[0,hy,-.065],mp(c,.1));}
 makerMark(c,[.0,.15,.022],'wood');
}
function pickaxe(c:Ctx){
 const b=c.b,hy=.7;haft(c,-.2,.8,.021,{knob:true});
 const spike=(P:Paint,len:number,dir:1|-1)=>{const n=b.pick(8,5,3),path=Array.from({length:n+1},(_,i)=>{const t=i/n;return [0,hy-.045*t*t,dir*(.03+len*t)] as V3;});b.tube(path,t=>.02*Math.pow(1-t,.9)+.0012,c.sd(6),P,{caps:'a'});};
 if(c.era===0){b.ellipsoid([0,hy,0],[.032,.05,.032],c.wood2(.1),6);spike(c.paint('antler',{len:.3}),.24,1);spike(c.paint('antler',{len:.3}),.14,-1);lashing(c,hy-.07,hy+.07,.034,0,{mat:'sinew'});}
 else{const P=mp(c,.4);b.loft([{c:[0,hy,-.035],w:.045,h:.075},{c:[0,hy,.03],w:.045,h:.08}],'z',P,{shape:'oct'});spike(P,.26,1);spike(P,.2,-1);}
 makerMark(c,[0,.1,.022],'wood');
}
function staff(c:Ctx){
 const b=c.b;shaft(c,-.7,1.15,.024,.02,{paint:decorPaint(c,c.wood(1.9),1.9,.55,.95)});gripWrap(c,-.1,.18,.027);
 const y=1.15,P=c.era>=1?mp(c,.2):c.paint('antler',{len:.2}),top=c.st.pommel;
 if(c.era===0||top==='none'){for(let i=-1;i<=1;i++)b.rod([0,y,0],[i*.07,y+.17,.0],t=>.014*(1-t)+.003,5,c.paint('antler',{len:.2}),{segs:2,caps:'a'});lashing(c,y-.06,y,.02,0,{mat:'sinew'});}
 else if(top==='disc'||top==='wheel'){b.ring([0,y+.1,0],[0,0,1],.09,.01,P,b.pick(20,12,8),5);b.ellipsoid([0,y+.1,0],[.03,.03,.03],c.paint('gold',{len:.1}),5);b.rod([0,y,0],[0,y+.02,0],()=>.03,6,P,{segs:1});}
 else if(top==='crescent'||top==='antenna'){const path=Array.from({length:12},(_,i)=>{const a=(i/11-.5)*2.7;return [0,y+.1+Math.cos(a)*.08-.06,Math.sin(a)*.1] as V3;});b.tube(path,t=>.014*(1-.4*Math.abs(t-.5)*2),5,P,{caps:true});b.ellipsoid([0,y+.03,0],[.03,.03,.03],P,5);}
 else{b.ellipsoid([0,y+.07,0],[.06,.06,.06],P,8);b.rod([0,y-.02,0],[0,y+.02,0],()=>.035,6,P,{segs:1});}
 b.ring([0,y-.07,0],[0,1,0],.027,.005,c.paint('cord',{len:.1,tint:c.st.cordColour,tintAmount:.8}),b.pick(12,8,6),4);
 tassel(c,[.03,y-.08,0],1.1);makerMark(c,[0,.35,.024],'wood');
}
function standard(c:Ctx){
 const b=c.b;shaft(c,-.7,1.85,.024,.019,{paint:decorPaint(c,c.wood(2.5),2.5,.45,.95)});gripWrap(c,-.1,.2,.027);
 const y=1.85,P=c.era>=1?mp(c,.2):c.paint('antler',{len:.2});
 b.ellipsoid([0,y+.08,0],[.055,.075,.055],P,7);b.rod([0,y-.03,0],[0,y+.01,0],()=>.035,6,P,{segs:1});
 b.rod([0,1.62,0],[.62,1.62,0],()=>.012,5,c.wood2(.7),{segs:1});
 const F=c.paint('linen',{len:1,tint:c.st.field,tintAmount:.9,wear:c.wear}),A=c.paint('linen',{len:1,tint:c.st.accent,tintAmount:.9});
 const sag=c.wear*.05,n=c.b.pick(8,5,3),sec=(t:number,f:number)=>({c:[.04+.58*t,1.6-(.05+sag)*Math.sin(t*3),.03*Math.sin(t*5+c.seed)] as V3,w:.004,h:f});
 b.loft(Array.from({length:n+1},(_,i)=>sec(i/n,.46*(1-.12*i/n))),'x',F,{shape:'rect'});
 b.loft([sec(.0,.07),sec(.5,.07),sec(1,.05)].map((s,i)=>({...s,c:[s.c[0],s.c[1]-.14,s.c[2]+.004] as V3,h:.07})),'x',A,{shape:'rect'});
 b.loft([{c:[.3,1.4,.012],w:.004,h:.14},{c:[.3,1.4,.012],w:.004,h:.14}],'x',A,{shape:'rect'});
 tassel(c,[.62,1.62,0],1.2);makerMark(c,[0,.4,.024],'wood');
}

// ---------------------------------------------------------------------------------------------------------------- hunting kit
function skinningKnife(c:Ctx){
 const b=c.b,L=c.era===0?.12:.15;
 b.rod([0,-.1,0],[0,.0,0],t=>.012+.004*Math.sin(t*Math.PI),c.sd(7),c.era===0?c.paint('bone',{len:.1}):c.wood2(.1),{segs:3});gripWrap(c,-.085,-.01,.0145);
 const P=c.era===0?c.paint(c.st.stone==='obsidian'?'obsidian':'flint',{len:L}):mp(c,L);
 b.blade({y0:0,y1:L,w:t=>(.012+.014*Math.sin(Math.min(1,t*1.5)*Math.PI*.5))*Math.pow(1-t,.5),th:t=>.0035*(1-t*.5),sweep:t=>-.02*t*t,chip:.002+.004*c.wear,section:'lens',steps:b.pick(14,8,4)},P);
 b.ellipsoid([0,-.102,0],[.014,.01,.014],c.paint(c.era===0?'bone':'bronze',{len:.03}),5);
 makerMark(c,[0,.02,.006],c.era===0?'flint':c.metal,.7);
}
function scraper(c:Ctx){
 const b=c.b;
 b.tube([[0,-.14,0],[0,-.03,.004],[0,.07,.02]],t=>[.016-.004*t,.012],c.sd(7),c.wood2(.2),{caps:true});gripWrap(c,-.1,-.02,.0175);
 const P=c.era===0?c.paint(c.st.stone==='obsidian'?'obsidian':'flint',{len:.08}):mp(c,.08);
 b.push([0,.085,.024],[-.6,0,0]);b.loft([{c:[0,0,0],w:.05,h:.014},{c:[0,.035,0],w:.065,h:.01},{c:[0,.06,0],w:.07,h:.004}],'y',P,{shape:'oct'});b.pop();
 lashing(c,.04,.092,.022,0,{z:.01,mat:c.era===0?'sinew':'cord'});makerMark(c,[0,-.06,.013],'wood',.8);
}
function snare(c:Ctx){
 const b=c.b;
 log(c,[0,0,0],[0,.5,0],.028,.022,c.wood2(.5));b.rod([0,.5,0],[0,.52,0],()=>.0,3,c.wood2(.1),{segs:1});
 b.tube([[.0,.1,-.5],[.0,.55,-.7],[0,1.0,-.45],[0,1.18,.02],[0,1.1,.5]].map(p=>[p[0],p[1],p[2]] as V3),t=>.02*(1-.7*t)+.004,c.sd(6),c.wood2(1.5),{caps:true});
 log(c,[0,0,-.5],[0,.12,-.5],.03,.03,c.wood2(.2));
 // noose set above a game trail, trigger peg and bait stick
 b.ring([0,.5,.5],[0,0,1],.12,.0045,c.paint(c.era>=3?'iron':'cord',{len:.5}),b.pick(18,12,8),4);
 b.tube([[0,1.1,.5],[0,.8,.5],[0,.52,.5]],()=>.0035,4,c.paint('cord',{len:.8}),{caps:true});
 b.rod([-.1,.02,.5],[.1,.02,.5],()=>.011,5,c.wood2(.2),{segs:1});b.rod([-.12,.02,.55],[.12,.02,.55],()=>.01,4,c.paint('char',{len:.2}),{segs:1});
 for(const s of [-1,1])b.rod([s*.13,.0,.46],[s*.13,.4,.46],()=>.012,5,c.wood2(.4),{segs:1});
 b.ellipsoid([.05,.04,.3],[.02,.012,.016],c.paint('rawhide',{len:.05}),4);
 makerMark(c,[0,.2,.029],'wood',1.5);
}
function netPanel(c:Ctx,w:number,h:number,y0:number,z:number,cell:number,cordCol:Paint){
 const b=c.b,nx=Math.max(3,Math.round(w/cell*b.pick(1,.7,.4))),ny=Math.max(3,Math.round(h/cell*b.pick(1,.7,.4)));
 for(let i=0;i<=nx;i++){const x=-w/2+i*w/nx;b.rod([x,y0,z],[x+(i%2?.02:-.02),y0+h,z+.01*Math.sin(i)],()=>.0032,3,cordCol,{segs:2,caps:false});}
 for(let j=0;j<=ny;j++){const y=y0+j*h/ny;b.tube(Array.from({length:6},(_,k)=>[-w/2+k*w/5,y+.015*Math.sin(k+j),z+.012*Math.sin(k*1.3)] as V3),()=>.0032,3,cordCol,{caps:false});}
}
function huntNet(c:Ctx){
 const b=c.b,W=3.2,H=1.7;
 for(const s of [-1,1]){log(c,[s*W/2,0,0],[s*W/2,H+.35,0],.045,.035,c.wood(2));b.rod([s*W/2,H+.35,0],[s*(W/2+.0),H+.38,0],()=>.0,3,c.wood2(.1),{segs:1});
  for(const g of [[0,1.2],[.5,-1.6]] as [number,number][]){b.tube([[s*W/2,H*.9,0],[s*(W/2+.5*g[0]+s*.3),H*.5,g[1]*.5],[s*(W/2+g[0]*.5+s*.6),.0,g[1]]],()=>.01,4,c.paint('cord',{len:2,tint:c.st.cordColour,tintAmount:.15}),{caps:true});b.rod([s*(W/2+g[0]*.5+s*.6),.0,g[1]],[s*(W/2+g[0]*.5+s*.6),.2,g[1]],()=>.02,5,c.wood2(.3),{segs:1});}}
 b.rod([-W/2,H,0],[W/2,H,0],()=>.012,5,c.paint('cord',{len:3.2,tint:c.st.cordColour,tintAmount:.2}),{segs:4});b.rod([-W/2,.05,0],[W/2,.05,0],()=>.012,5,c.paint('cord',{len:3.2}),{segs:4});
 netPanel(c,W,H-.08,.08,0,.14,c.paint('cord',{len:.2,wear:c.wear}));
 if(c.lod<2)for(let i=0;i<9;i++)b.ellipsoid([-W/2+.2+i*(W-.4)/8,.04,0],[.028,.032,.028],c.paint('stone',{len:.05}),4);
 if(c.broken)b.rod([0,.5,0],[.3,.1,.1],()=>.004,3,c.paint('cord',{len:.3}),{segs:2});
 makerMark(c,[W/2+.0,1.1,.046],'wood',2,[0,0,0]);
}
function deadfall(c:Ctx){
 const b=c.b;
 // a heavy slab propped on a figure-four trigger, with bait
 b.push([0,.5,0],[.0,0,.0]);b.loft([{c:[0,0,0],w:.9,h:.6},{c:[0,.11,0],w:.9,h:.6}],'y',c.paint('stone',{len:.8,tint:'#8f897d',tintAmount:.3}),{shape:'oct'});b.pop();
 b.rod([-.3,.0,.25],[.2,.5,.0],()=>.026,6,c.wood2(.8),{segs:2});
 b.rod([.1,.0,.1],[.1,.55,.1],()=>.022,6,c.wood2(.6),{segs:2});
 b.rod([-.3,.45,.02],[.3,.45,.02],()=>.015,5,c.wood2(.6),{segs:1});
 b.ellipsoid([.15,.02,.0],[.04,.02,.03],c.paint('rawhide',{len:.05,tint:'#8a3426',tintAmount:.3}),4);
 for(const [x,z,r] of [[-.55,.45,.08],[.55,-.4,.06],[.62,.35,.1]] as const)b.ellipsoid([x,r*.6,z],[r,r*.7,r],c.paint('stone',{len:.2}),5);
 makerMark(c,[0,.35,.31],'stone',2.5,[0,0,0]);
}
function hideFrame(c:Ctx){
 const b=c.b,W=1.35,H=1.7;
 for(const s of [-1,1])log(c,[s*(W/2+.05),0,-.35*s*0],[s*(W/2+.05),H+.15,0],.04,.035,c.wood(2));
 for(const y of [.08,H-.04])timber(c,[-W/2-.05,y,0.0],[W/2+.05,y,0],.06,.06,c.wood2(1.5));
 for(const s of [-1,1]){lashing(c,.04,.14,.044,0,{x:s*(W/2+.05),mat:'cord'});lashing(c,H-.1,H,.044,0,{x:s*(W/2+.05),mat:'cord'});}
 // props leaning behind
 for(const s of [-1,1])b.rod([s*(W/2+.05),H*.7,0],[s*(W/2+.4),0,-.9],()=>.03,6,c.wood2(1.2),{segs:2});
 hideSheet(c,[[-W/2+.02,.14,.03],[W/2-.02,.14,.03],[W/2-.02,H-.1,.03],[-W/2+.02,H-.1,.03]],.04,'#b49a6c');
 // lacing cords around the edge
 const n=c.b.pick(10,6,3);if(c.lod<2)for(let i=0;i<n;i++){const u=-W/2+.05+i*(W-.1)/(n-1);for(const y of [.1,H-.06])b.tube([[u,y+.03,.04],[u,y+.01,.0],[u+.01,y-.02,-.02]],()=>.0045,3,c.paint('cord',{len:.1}),{caps:true});}
 // scraper left on the rail
 b.push([.0,H*.5,-.12],[0,0,.6]);scraper(c);b.pop();
 makerMark(c,[W/2+.05,1.2,.042],'wood',2,[0,0,0]);
}

// ---------------------------------------------------------------------------------------------------------------- fishing
function fishingRod(c:Ctx){
 const b=c.b,n=b.pick(14,8,4);
 const path=Array.from({length:n+1},(_,i)=>{const t=i/n;return [0,-.25+1.35*t,.32*Math.pow(t,2.4)] as V3;});
 b.tube(path,t=>.017*(1-.85*t)+.0025,c.sd(7),c.wood2(1.5),{caps:true});gripWrap(c,-.23,.06,.019);
 if(c.lod<2)for(let i=1;i<5;i++){const t=.3+i*.14,p=path[Math.round(t*n)];b.ring([p[0],p[1],p[2]+.003],[0,0,1],.006,.0014,c.paint('cord',{len:.05}),6,3);}
 const tip=path[n],hook:V3=[0,.5,.7],lineP=c.paint('sinew',{len:1});
 b.tube([tip,[0,.8,.62],[0,.62,.68],hook],()=>.0018,3,lineP,{caps:true});
 b.ellipsoid([0,.62,.68],[.011,.016,.011],c.paint('birch',{len:.05,tint:c.st.accent,tintAmount:.3}),4); // float
 const hk=eraHead(c),hp=c.paint(hk==='stone'?'bone':hk,{len:.05});
 b.tube([[0,.5,.7],[0,.465,.7],[.0,.44,.715],[0,.45,.735],[0,.47,.725]],t=>.0036*(1-.4*t),4,hp,{caps:true});
 if(c.era>=2)b.ellipsoid([0,.51,.7],[.007,.01,.007],c.paint('lead',{len:.02}),4);
 makerMark(c,[0,-.1,.019],'wood',.8);
}
function leister(c:Ctx){
 const b=c.b;shaft(c,-.7,1.1,.02,.017,{paint:c.wood(1.8)});gripWrap(c,-.1,.15,.0225);
 const y=1.1,P=c.era===0?c.paint('antler',{len:.3}):mp(c,.3);
 lashing(c,y-.07,y+.04,.022,0,{mat:c.era===0?'sinew':'cord'});
 for(const s of [-1,0,1]){const x=s*.06;b.rod([s*.012,y,0],[x,y+.24,0],t=>.007*(1-t*.8)+.0012,5,P,{segs:3,caps:'a'});
  for(const k of [0,1])b.rod([x,y+.12+k*.06,0],[x+(s===0?(k?-.02:.02):s*.028),y+.15+k*.05,0],t=>.003*(1-t)+.0008,3,P,{segs:1,caps:'a'});}
 makerMark(c,[0,.4,.02],'wood');
}
function fishNet(c:Ctx){
 const b=c.b,W=2.6,H=1.3;
 b.rod([-W/2,H,0],[W/2,H,0],()=>.011,5,c.paint('cord',{len:3,tint:c.st.cordColour,tintAmount:.2}),{segs:5});b.rod([-W/2,.05,0],[W/2,.05,0],()=>.011,5,c.paint('cord',{len:3}),{segs:5});
 netPanel(c,W,H-.07,.07,0,.1,c.paint('cord',{len:.2,wear:c.wear}));
 for(let i=0;i<=10;i++){const x=-W/2+i*W/10;b.ellipsoid([x,H+.015,0],[.03,.02,.026],c.paint(c.era===0?'birch':'pine',{len:.06}),4);if(c.lod<2)b.ellipsoid([x,.04,0],[.022,.03,.022],c.paint(c.era>=2?'lead':'stone',{len:.04}),4);}
 b.ellipsoid([.2,.03,.4],[.5,.03,.3],c.paint('cord',{len:.3}),5);
 if(c.broken)b.ellipsoid([-.4,.5,.01],[.12,.1,.02],c.paint('char',{len:.1,wear:0}),4);
 makerMark(c,[W/2-.1,H+.04,.0],'wood',2,[0,0,0]);
}
function fishTrap(c:Ctx){
 const b=c.b,R=.34,Lg=1.2,n=c.sd(14),m=b.pick(16,10,6);
 // a conical wicker basket with a funnel throat
 const body=prof([[0,.0],[.12,.3],[.6,.34],[1,.12]]);b.push([0,R,0],[Math.PI/2,0,0]);
 b.tube(Array.from({length:m+1},(_,i)=>[0,Lg*i/m,0] as V3),t=>body(t),n,c.paint('wicker',{len:.12,wear:c.wear}),{caps:'a'});
 for(let k=0;k<5;k++)b.ring([0,Lg*(.1+k*.2),0],[0,1,0],body(.1+k*.2)+.004,.007,c.paint('wicker',{len:.1,tint:'#7a5a34',tintAmount:.4}),b.pick(20,12,8),4);
 b.rod([0,Lg,0],[0,Lg-.25,0],t=>.12-.05*t,c.sd(10),c.paint('wicker',{len:.1}),{segs:2,caps:false});
 b.ring([0,Lg-.25,0],[0,1,0],.07,.01,c.paint('cord',{len:.1}),b.pick(14,10,6),4);
 b.pop();
 b.tube([[0,R*2,.2],[.3,.9,.2],[.6,.6,.3]],()=>.01,4,c.paint('cord',{len:.9,tint:c.st.cordColour,tintAmount:.2}),{caps:true});
 for(const [x,z,r] of [[.3,.5,.12],[-.4,.1,.1]] as const)b.ellipsoid([x,r*.5,z],[r,r*.6,r],c.paint('stone',{len:.2}),5);
}

// ---------------------------------------------------------------------------------------------------------------- carried goods
const potForms:Record<string,{H:number;p:[number,number][]}>={
 round:{H:.34,p:[[0,.09],[.08,.13],[.4,.205],[.7,.175],[.86,.115],[.95,.128],[1,.135]]},
 amphora:{H:.64,p:[[0,.035],[.1,.09],[.35,.17],[.62,.155],[.8,.065],[.94,.062],[1,.098]]},
 bowl:{H:.19,p:[[0,.07],[.2,.12],[.6,.185],[1,.205]]},
 tall:{H:.5,p:[[0,.1],[.2,.14],[.5,.165],[.78,.12],[.94,.105],[1,.13]]},
};
function potAt(c:Ctx,form:string,at:V3,rotZ=0,scale=1){
 const b=c.b,def=potForms[form]??potForms.round,m=b.pick(56,28,10),n=c.sd(26),f=prof(def.p),H=def.H*scale;
 const clay=c.paint('clay',{len:def.H,tint:c.st.field,tintAmount:.08}),ink=hexRgb(c.st.cordColour),acc=hexRgb(c.st.accent),dec=c.st.decor,slip=hexRgb('#e1cfae'),soot=hexRgb('#2b211b');
 const sootK=.25+.5*c.r('soot')+c.wear*.3;
 const paint:Paint=likePaint((p,nn,t,a)=>{let k=clay(p,nn,t,a);
  const band=(t0:number,t1:number)=>t>t0&&t<t1;
  if(t>.84)k=rgbMix(k,slip,.42);                 // a slipped, burnished neck
  if(band(.02,.06)||band(.82,.86)||band(.5,.53))k=rgbMix(k,ink,.75);
  const ang=a*TAU;let m2=0;
  if(band(.55,.8)){if(dec==='chevron')m2=Math.abs(((ang*3/TAU*4)%1)-.5)*2<.4+.9*Math.abs(((t*9)%1)-.5)?0:1;else if(dec==='dots')m2=((a*14)%1<.5&&((t*10)%1)<.5)?1:0;else if(dec==='spiral')m2=(((a*3+t*5)%1)<.2)?1:0;else if(dec==='steps')m2=(Math.floor(a*12)+Math.floor(t*12))%2===0?1:0;else if(dec==='notches')m2=(a*20)%1<.3?1:0;else m2=band(.62,.66)||band(.72,.75)?1:0;}
  if(m2)k=rgbMix(k,acc,.82);
  // fire clouds: soot climbs from the base on one side, thicker with use; the base itself is blackened
  const cloud=Math.max(0,1-t/(.3+.4*sootK))*(.35+.65*Math.max(0,Math.sin(a*TAU*1+c.r('cloud')*6)));if(t<.7)k=rgbMix(k,soot,Math.min(.8,cloud*sootK*1.3));
  if(c.wear>.5&&((vn(p)>.78)))k=rgbMix(k,hexRgb('#2a1e16'),.6);
  return k;},clay);
 b.push(at,[0,0,rotZ]);b.push([0,0,0],[0,0,0]);
 // hand-coiled walls: each coil is a faint ridge, and no pot is a perfect circle
 const ecc=.02+.02*c.r('ecc'),eph=c.r('eph')*TAU,coil=H/Math.max(7,Math.round(def.H/.034));
 b.tube(Array.from({length:m+1},(_,i)=>[Math.sin(i/m*2.2+eph)*.004*scale,H*i/m,0] as V3),t=>{const r=f(t)*scale*(1+(t>.06&&t<.8?.012*Math.sin(t*H/coil*TAU):0));return [r*(1+ecc),r*(1-ecc)];},n,paint,{caps:'a'});
 const rimR=f(1)*scale;
 b.rod([0,H*.985,0],[0,H*.93,0],()=>rimR*.86,n,c.paint('char',{len:.1}),{segs:1,caps:'a'});
 if(c.lod<2){
  b.ring([0,H*.995,0],[0,1,0],rimR*.97,.011*scale,clay,b.pick(30,18,10),5);                       // rolled lip
  b.ring([0,H*.04,0],[0,1,0],f(.04)*scale*1.02,.01*scale,clay,b.pick(30,18,10),5);               // foot ring
  if(c.lod===0)for(const t of [.56,.6,.64])b.ring([0,H*t,0],[0,1,0],f(t)*scale+.0015,.0034*scale,c.paint('cord',{len:.2,tint:c.st.cordColour,tintAmount:.2}),b.pick(36,18,10),4); // cord impressed bands
 }
 if(form==='amphora')for(const s of [-1,1])b.tube([[s*.07,.52,0],[s*.16,.5,0],[s*.19,.38,0],[s*.16,.3,0]].map(p=>[p[0],p[1]*scale,p[2]] as V3),()=>.016,6,clay,{caps:true});
 if(form==='round'&&c.lod<2)for(const s of [-1,1])b.ring([s*.2,.17,0],[0,0,1],.03,.008,clay,10,4);
 b.pop();b.pop();
}
const vn=(p:V3)=>{const x=Math.sin(p[0]*91.3+p[1]*47.7+p[2]*13.1)*43758.5453;return x-Math.floor(x);};
function pot(c:Ctx){
 const form=c.req.variant&&potForms[c.req.variant]?c.req.variant:c.st.potForm,b=c.b;
 if(!c.broken){potAt(c,form,[0,0,0]);return;}
 const def=potForms[form];
 const f=prof(def.p),m=b.pick(12,8,4),n=c.sd(24),cut=.45;
 b.tube(Array.from({length:m+1},(_,i)=>[0,def.H*cut*i/m,0] as V3),t=>f(t*cut),n,c.paint('clay',{len:.3,wear:.9}),{caps:'a'});
 for(let i=0;i<4;i++){const a=i*1.7+.4,px=Math.cos(a)*.3,pz=Math.sin(a)*.3;b.push([px,.012,pz],[.5,a,.0]);b.loft([{c:[0,0,0],w:.11,h:.07},{c:[0,.01,0],w:.15,h:.1},{c:[0,.02,0],w:.05,h:.03}],'y',c.paint('clay',{len:.2,wear:.7}),{shape:'oct'});b.pop();}
}
function basket(c:Ctx){
 const b=c.b,H=.36,n=c.sd(30),m=b.pick(40,22,8),f=prof([[0,.14],[.3,.19],[1,.25]]);
 const W=c.paint('wicker',{len:.1,wear:c.wear}),acc=hexRgb(c.st.accent),dark=c.paint('wicker',{len:.1,tint:'#6a4a28',tintAmount:.5,wear:c.wear});
 const pat:Paint=likePaint((p,nn,t,a)=>{const k=W(p,nn,t,a);return (Math.floor(a*15)%3===0&&t>.55&&t<.8)?rgbMix(k,acc,.6):k;},W);
 // coiled courses ripple the wall; the radius also breathes a little so it never looks turned
 const course=H/18;
 b.tube(Array.from({length:m+1},(_,i)=>[0,H*i/m,0] as V3),t=>f(t)*(1+.016*Math.sin(t*H/course*TAU)+.012*Math.sin(t*5.3+c.r('br')*6)),n,pat,{caps:'a'});
 if(c.lod<2){ // the upright stakes show through the weaving
  const k=b.pick(22,12,0);for(let i=0;i<k;i++){const a=i/k*TAU+.1,r0=f(0)+.004,r1=f(1)+.004;
   b.rod([Math.cos(a)*r0,.004,Math.sin(a)*r0],[Math.cos(a)*r1,H,Math.sin(a)*r1],()=>.0058,4,dark,{segs:3,caps:'b'});}
 }
 b.ring([0,H,0],[0,1,0],.25,.013,c.paint('wicker',{len:.1,tint:'#7a5a34',tintAmount:.4}),b.pick(30,18,10),5);
 b.ring([0,H-.03,0],[0,1,0],.247,.007,c.paint('cord',{len:.2,tint:c.st.cordColour,tintAmount:.5}),b.pick(30,18,10),4);   // binding below the rim
 b.ring([0,.0,0],[0,1,0],.14,.012,c.paint('wicker',{len:.1,tint:'#7a5a34',tintAmount:.4}),b.pick(22,12,8),5);
 b.rod([0,.004,0],[0,.016,0],()=>.14,c.sd(18),dark,{segs:1,caps:'a'});                                                 // plaited base
 b.tube(curve(c,[[.25,H,0],[.285,H+.1,0],[.2,H+.22,0],[0,H+.29,0],[-.2,H+.22,0],[-.285,H+.1,0],[-.25,H,0]],6),()=>.0115,6,c.paint('cord',{len:.5,tint:c.st.cordColour,tintAmount:.25}),{caps:true});
 if(c.lod===0)for(const s of [-1,1])lashing(c,H-.02,H+.07,.012,0,{x:s*.255,mat:'cord'});
 if(!c.broken&&c.lod<2){const n2=b.pick(16,8,3);for(let i=0;i<n2;i++){const a=i*2.4,r=.03+.17*Math.sqrt(i/n2);b.ellipsoid([Math.cos(a)*r,H-.03,Math.sin(a)*r],[.022,.016,.026],c.paint(i%3?'leather':'rawhide',{len:.05,tint:'#a0443a',tintAmount:i%5===0?.5:0}),3);}}
 makerMark(c,[0,.1,.15],'wood',1.5,[0,0,0]);
}
function waterskin(c:Ctx){
 const b=c.b,P=c.paint('hide',{len:.5,tint:'#a08158',tintAmount:.3}),sag=.02+c.wear*.03,cordP=c.paint('cord',{len:.1,tint:c.st.cordColour,tintAmount:.5}),dark=c.paint('hide',{len:.3,tint:'#4a3622',tintAmount:.5,wear:Math.min(1,c.wear+.3)});
 // the body is a tanned hide stitched up its seam: a flattened ellipsoid, fuller at the belly than at the shoulders
 b.ellipsoid([0,.2,0],[.17,.22,.1],P,c.sd(10));b.ellipsoid([0,.14,.0],[.16,.14,.095],P,c.sd(8));
 for(const [x,y] of [[-.16,.34],[.16,.34],[-.14,.04],[.14,.04]] as const)b.rod([x*.8,y-.04,0],[x*1.05,y+(y>.2?.05:-.03),0],()=>.024,6,P,{segs:2}); // the limbs, tied off
 // gathers where the neck was cut away, then the neck itself with a bound lip
 if(c.lod<2)for(let i=0;i<b.pick(9,5,0);i++){const a=i/9*TAU;b.rod([Math.cos(a)*.05,.38,Math.sin(a)*.04],[Math.cos(a)*.026,.46,Math.sin(a)*.022],()=>.011,4,P,{segs:1});}
 b.tube([[0,.4,0],[0,.5,0],[0,.58,sag]],t=>.04-.015*t,c.sd(9),P,{caps:true});
 b.ring([0,.55,sag],[0,1,0],.04,.005,cordP,b.pick(14,8,6),4);b.ring([0,.5,0],[0,1,0],.037,.005,cordP,b.pick(14,8,6),4);
 b.rod([0,.57,sag],[0,.67,sag],()=>.026,c.sd(8),c.wood2(.1),{segs:1}); // stopper
 b.ring([0,.64,sag],[0,1,0],.026,.0035,cordP,b.pick(12,8,6),4);          // the stopper is tied on
 b.tube(curve(c,[[-.14,.36,.075],[-.21,.5,.1],[-.12,.65,.13],[0,.7,.14],[.12,.65,.13],[.21,.5,.1],[.14,.36,.075]],6),()=>.009,5,c.paint('leather',{len:.4,tint:c.st.cordColour,tintAmount:.15}),{caps:true}); // carrying strap
 if(c.lod===0){ // toggle on the strap, a bone peg
  b.rod([-.03,.7,.14],[.03,.7,.14],()=>.009,5,c.paint('bone',{len:.06}),{segs:1});
  // the seam: whipstitch along the rim of the hide, each stitch a short cord crossing it, with a darker welt under
  const N=18;for(let i=0;i<N;i++){const a=-Math.PI*.42+i/(N-1)*Math.PI*.84,sx=Math.sin(a)*.17,sy=.2+Math.cos(a)*.22*(a>0?.9:1);
   b.rod([sx*.97,sy-.01,.092*Math.cos(a)*.0+.012],[sx*1.0,sy+.01,-.012+.0],()=>.0021,3,cordP,{segs:1,caps:'a'});}
  b.tube(Array.from({length:14},(_,i)=>{const a=-Math.PI*.46+i/13*Math.PI*.92;return [Math.sin(a)*.171,.2+Math.cos(a)*.222,.0] as V3;}),()=>.007,4,dark,{caps:true});
 }
 b.tube(Array.from({length:b.pick(12,8,4)},(_,i)=>{const N=b.pick(12,8,4)-1,y=.08+.28*i/N;return [.0,y,.098*Math.sqrt(Math.max(0,1-Math.pow((y-.2)/.22,2)))+.003] as V3;}),()=>.0035,3,c.paint('cord',{len:.4}),{caps:true});
 makerMark(c,[.0,.12,.103],'wood',1.3,[0,0,0]);
}
function pack(c:Ctx){
 const b=c.b,P=c.paint('hide',{len:.8,tint:c.st.field,tintAmount:.12}),leather=c.paint('leather',{len:.5});
 for(const s of [-1,1])log(c,[s*.17,.05,-.04],[s*.19,.8,-.06],.014,.012,c.wood2(.8));
 for(const y of [.2,.5,.76])b.rod([-.19,y,-.05],[.19,y,-.05],()=>.012,5,c.wood2(.4),{segs:1});
 b.ellipsoid([0,.4,.08],[.25,.31,.17],P,c.sd(10));b.ellipsoid([0,.35,.17],[.2,.2,.08],c.paint('hide',{len:.5,tint:'#8a6b45',tintAmount:.2}),c.sd(8));
 b.push([0,.74,.06],[0,0,Math.PI/2]);b.rod([0,-.22,0],[0,.22,0],()=>.075,c.sd(10),c.paint('wool',{len:.5,tint:c.st.field,tintAmount:.6}),{segs:1});
 for(const y of [-.14,.14])b.ring([0,y,0],[0,1,0],.078,.007,c.paint('cord',{len:.2,tint:c.st.cordColour,tintAmount:.5}),b.pick(14,10,6),4);b.pop();
 for(const s of [-1,1])b.tube([[s*.15,.72,-.03],[s*.27,.52,.0],[s*.26,.2,-.02],[s*.14,.1,-.05]],()=>.017,5,leather,{caps:true});
 b.box([.14,.12,.04],[0,.26,.24],leather);b.rod([-.04,.3,.265],[.04,.3,.265],()=>.006,4,c.paint('bone',{len:.1}),{segs:1});
 makerMark(c,[.0,.5,.255],'wood',1.5,[0,0,0]);
}
function sack(c:Ctx){
 const b=c.b,P=c.paint('linen',{len:.6,tint:c.st.field,tintAmount:.25});
 b.ellipsoid([0,.2,0],[.22,.26,.16],P,c.sd(9));
 b.tube([[0,.4,0],[0,.5,0],[.02,.58,0],[.06,.64,0]],t=>.09*(1-t*.6)+.02,c.sd(8),P,{caps:true});
 b.ring([0,.47,0],[0,1,0],.065,.007,c.paint('cord',{len:.2,tint:c.st.cordColour,tintAmount:.6}),b.pick(12,8,6),4);
 if(c.lod<2)b.tube([[-.22,.15,.07],[-.1,.35,.15],[.1,.35,.15],[.22,.15,.07]],()=>.0035,3,c.paint('cord',{len:.5}),{caps:true});
 makerMark(c,[.0,.15,.165],'wood',1.5,[0,0,0]);
}
function torch(c:Ctx){
 const b=c.b,lit=c.req.variant!=='unlit'&&!c.broken;
 shaft(c,-.2,.5,.017,.014,{paint:c.wood(.7)});
 const wrapY=.5,head=lit?.17:.1;
 b.rod([0,wrapY-.02,0],[0,wrapY+head,0],t=>.035+.012*Math.sin(t*3),c.sd(9),c.paint(lit?'char':'pitch',{len:.2,tint:'#3a2a1c',tintAmount:.3}),{segs:3});
 b.lash([0,wrapY-.02,0],[0,wrapY+head,0],.04,Math.round(head/.012),.0038,c.paint('linen',{len:.2,tint:'#7a6a50',tintAmount:.4,wear:.4}));
 if(lit){const tip=wrapY+head;
  const flame=(h:number,r:number,col:string,dx=0)=>b.tube(Array.from({length:b.pick(8,6,4)},(_,i)=>{const t=i/(b.pick(8,6,4)-1);return [dx*t+.012*Math.sin(t*3+c.seed),tip+h*t,.008*Math.sin(t*4)] as V3;}),t=>r*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.05+.0)*.92+.2),.8)*(1-t*.5)+.0008,c.sd(7),()=>hexRgb(col),{caps:'a'});
  flame(.19,.042,'#e8641a');flame(.14,.03,'#ffa22a',.005);flame(.09,.018,'#ffd860');}
 else b.ellipsoid([0,wrapY+head,0],[.03,.012,.03],c.paint('char',{len:.1}),5);
 makerMark(c,[0,.0,.0175],'wood',.8);
}
function handcart(c:Ctx){
 const b=c.b,W=.95,L=1.6,Rw=.52,wy=Rw,P=(l:number)=>c.wood(l);
 // axle, two wheels, bed with floor planks and stake sides, tailboard, shafts and a pulling bar
 b.rod([-W/2-.2,wy,0],[W/2+.2,wy,0],()=>.04,c.sd(8),c.wood2(1.4),{segs:2});
 for(const s of [-1,1]){wheel(c,[s*(W/2+.2),wy,0],Rw,.1,{spokes:8});b.rod([s*(W/2+.26),wy,0],[s*(W/2+.31),wy,0],()=>.025,5,c.paint('iron',{len:.1}),{segs:1});}
 for(const s of [-1,1]){timber(c,[s*W/2,wy+.1,-L/2],[s*W/2,wy+.1,L/2],.08,.08,P(1.6));timber(c,[s*W/2,wy+.1,L/2],[s*W/2*.7,wy+.2,L/2+1.0],.07,.07,P(1.2));}
 const nb=b.pick(8,5,3);for(let i=0;i<nb;i++){const z=-L/2+.08+i*(L-.16)/(nb-1);timber(c,[-W/2,wy+.16,z],[W/2,wy+.16,z],.075,.04,c.wood(1,{tint:i%2?'#7a6a50':undefined,tintAmount:.2}));}
 for(const s of [-1,1])for(const z of [-L/2+.05,0,L/2-.05])b.rod([s*(W/2+.02),wy+.16,z],[s*(W/2+.02),wy+.62,z],()=>.017,5,c.wood2(.5),{segs:1});
 for(const s of [-1,1])timber(c,[s*(W/2+.02),wy+.6,-L/2],[s*(W/2+.02),wy+.6,L/2],.04,.04,c.wood2(1.5));
 for(const k of [.28,.42])timber(c,[-W/2-.02,wy+.16+k,-L/2],[W/2+.02,wy+.16+k,-L/2],.04,.05,P(1));
 // the pulling yoke, trace ropes and a breast strap for a person or an animal
 b.rod([-.48,wy+.25,L/2+1.0],[.48,wy+.25,L/2+1.0],()=>.03,c.sd(8),c.wood2(1),{segs:2});
 b.tube([[-.48,wy+.25,L/2+1.0],[-.3,wy+.1,L/2+1.5],[.3,wy+.1,L/2+1.5],[.48,wy+.25,L/2+1.0]],()=>.012,4,c.paint('leather',{len:1,tint:c.st.cordColour,tintAmount:.1}),{caps:true});
 b.tube([[0,wy+.3,L/2+1.0],[0,wy+.45,L/2+1.35],[0,wy+.6,L/2+1.5]],()=>.01,4,c.paint('cord',{len:.5}),{caps:true});
 lashing(c,wy+.2,wy+.3,.04,0,{x:.0,z:L/2+1.0,mat:'cord'});
 makerMark(c,[W/2+.04,wy+.4,L/2-.3],'wood',2,[0,Math.PI/2,0]);
 if(c.broken){b.push([W/2+.5,.0,.2],[0,0,Math.PI/2*.2]);b.pop();splinters(c,[W/2,wy+.6,-L/2],.04,[0,1,0],.15);}
}
function harness(c:Ctx){
 const b=c.b,leather=c.paint('leather',{len:1,tint:c.st.cordColour,tintAmount:.12});
 // ox yoke with two neck bows, a breast strap and trace ropes trailing behind it
 b.rod([-.75,.55,0],[.75,.55,0],()=>.055,c.sd(9),c.wood2(1.5),{segs:5});
 for(const s of [-1,1])for(const x of [.2,.55]){const X=s*x;b.tube([[X-.045,.55,.0],[X-.07,.2,0],[X,.05,0],[X+.07,.2,0],[X+.045,.55,0]].map(p=>[p[0],p[1],p[2]] as V3),()=>.017,6,c.wood2(.5),{caps:true});b.rod([X-.05,.52,0],[X-.05,.62,.0],()=>.02,5,c.wood2(.2),{segs:1});}
 for(const s of [-1,1])b.rod([s*.75,.52,0],[s*.78,.62,0],()=>.04,5,c.wood2(.2),{segs:1});
 b.rod([0,.62,0],[0,.7,0.0],()=>.02,5,c.paint('char',{len:.1}),{segs:1});
 b.tube([[-.5,.55,.05],[-.3,.3,.35],[.3,.3,.35],[.5,.55,.05]],()=>.022,5,leather,{caps:true});
 for(const s of [-1,1])b.tube([[s*.75,.5,.0],[s*.7,.2,-.6],[s*.5,.05,-1.4],[s*.4,.03,-2.1]],()=>.012,4,c.paint('cord',{len:2,tint:c.st.cordColour,tintAmount:.15}),{caps:true});
 b.ring([0,.3,.35],[0,0,1],.045,.007,c.paint(c.era>=2?'bronze':'bone',{len:.1}),b.pick(14,10,6),4);
 makerMark(c,[.0,.59,.056],'wood',2,[0,0,0]);
}

// ---------------------------------------------------------------------------------------------------------------- ship fittings
function oar(c:Ctx){
 const b=c.b,L=3.1,P=c.wood(L,{tint:c.st.accent,tintAmount:.0});
 b.tube([[0,-.5,0],[0,.9,0],[0,1.6,0]],t=>.026-.007*Math.max(0,t-.5)*2,c.sd(8),P,{caps:true});
 b.loft([{c:[0,1.55,0],w:.045,h:.04},{c:[0,1.75,0],w:.14,h:.03},{c:[0,2.4,0],w:.17,h:.022},{c:[0,2.6,0],w:.1,h:.016}],'y',decorPaint(c,c.wood(.9),.9,0,1),{shape:'oct'});
 b.ring([0,.55,0],[0,1,0],.03,.01,c.paint('leather',{len:.3}),b.pick(14,10,6),4);b.rod([0,.5,0],[0,.62,0],()=>.036,c.sd(8),c.paint('leather',{len:.3}),{segs:1});
 b.ellipsoid([0,-.5,0],[.034,.03,.034],P,5);gripWrap(c,-.45,-.15,.029);
 makerMark(c,[0,1.9,.022],'wood',1.5);
}
function steerOar(c:Ctx){
 const b=c.b;
 b.tube([[0,-.2,0],[.0,1.3,0],[0,2.7,0]],t=>.04-.01*t,c.sd(9),c.wood(3),{caps:true});
 b.loft([{c:[0,2.2,0],w:.06,h:.05},{c:[0,2.5,0],w:.28,h:.04},{c:[0,3.3,0],w:.32,h:.03},{c:[0,3.6,0],w:.18,h:.022}],'y',c.wood(1.4),{shape:'oct'});
 b.rod([-.0,-.1,-.4],[0,-.1,.4],()=>.025,6,c.wood2(.8),{segs:1}); // tiller bar through the loom
 b.ring([0,1.2,0],[0,1,0],.05,.012,c.paint('leather',{len:.4}),b.pick(14,10,6),4);
 lashing(c,2.2,2.34,.04,0,{mat:'cord'});makerMark(c,[0,2.9,.034],'wood',2);
}
function anchor(c:Ctx){
 const b=c.b;
 if(c.era<3){ // a stone anchor: a pierced slab, a rope, and a wooden stock lashed across
  b.ellipsoid([0,.35,0],[.28,.38,.1],c.paint('stone',{len:.6,tint:'#7e7a70',tintAmount:.3}),c.sd(9));
  b.ring([0,.68,0],[0,0,1],.05,.016,c.era>=2?c.paint('bronze',{len:.1}):c.paint('stone',{len:.1,tint:'#5a574f',tintAmount:.4}),b.pick(14,10,6),4);
  if(c.era>=1)b.rod([0,.1,-.28],[0,.1,.28],()=>.02,5,c.wood2(.7),{segs:1});
  b.rod([-.3,.18,.0],[.3,.18,0],()=>.025,5,c.wood2(.7),{segs:1});b.rod([0,.05,-.28],[0,.05,.28],()=>.025,5,c.wood2(.7),{segs:1});
  lashing(c,.1,.24,.1,0,{mat:'cord'});
 }else{ // an iron anchor: shank, two curved arms with flukes, a stock, a ring
  const m=mp(c,.5);b.rod([0,.05,0],[0,1.2,0],()=>.04,c.sd(8),m,{segs:3});
  b.ring([0,1.22,0],[1,0,0],.06,.018,m,b.pick(14,10,6),4);
  for(const s of [-1,1]){b.tube(Array.from({length:8},(_,i)=>{const t=i/7;return [s*.5*Math.sin(t*1.5),.1+.18*(1-Math.cos(t*1.5)),0] as V3;}),t=>.034*(1-.3*t),c.sd(7),m,{caps:true});
   b.loft([{c:[s*.48,.3,0],w:.03,h:.14},{c:[s*.55,.34,0],w:.16,h:.14},{c:[s*.56,.37,0],w:.01,h:.04}],'x',m,{shape:'oct'});}
  b.rod([-.4,1.08,0],[.4,1.08,0],()=>.03,c.sd(7),c.wood2(.8),{segs:1});
 }
 if(c.lod<2)b.tube([[0,.68,0],[.2,.9,.1],[.5,.7,.3],[.8,.4,.5],[1.0,.04,.7]],()=>c.era===0?.024:.018,5,c.era===0?c.paint('sinew',{len:1.5}):c.paint('cord',{len:1.5,tint:c.st.cordColour,tintAmount:.15}),{caps:true});
 makerMark(c,[0,.4,.1],c.era<3?'stone':c.metal,2.5,[0,0,0]);
}
function ropeCoil(c:Ctx){
 const b=c.b,R=.35,turns=b.pick(5,4,3),P=c.paint('cord',{len:1.5,tint:c.st.cordColour,tintAmount:.12,wear:c.wear});
 for(let k=0;k<turns;k++){b.ring([0,.03+k*.035,0],[0,1,0],R-k*.035,.028,P,b.pick(30,18,10),5);b.ring([0,.03+k*.035,0],[0,1,0],R-k*.035-.052,.028,P,b.pick(30,18,10),5);}
 b.tube([[R-.1,.17,0],[R+.1,.12,.2],[R+.3,.05,.5],[R+.6,.04,.9]],()=>.028,5,P,{caps:true});
 b.lash([-R*.6,.0,0],[-R*.6+.0,.2,0],.15,3,.01,c.paint('cord',{len:.3,tint:c.st.accent,tintAmount:.6}));
}
function block(c:Ctx){
 const b=c.b;
 // two cheeks, a grooved sheave on a pin, a strop, and a hook
 for(const s of [-1,1])b.loft([{c:[s*.045,.0,0],w:.025,h:.18},{c:[s*.045,.28,0],w:.025,h:.22},{c:[s*.045,.5,0],w:.025,h:.12}],'y',c.wood2(.5),{shape:'oct'});
 b.rod([-.06,.24,0],[.06,.24,0],()=>.075,c.sd(16),c.paint(c.era>=2?'bronze':'ebony',{len:.1}),{segs:1});
 b.rod([-.07,.24,0],[.07,.24,0],()=>.012,6,mp(c,.1),{segs:1});
 b.ring([0,.3,0],[1,0,0],.14,.014,c.paint('cord',{len:.6,tint:c.st.cordColour,tintAmount:.15}),b.pick(18,12,8),5);
 b.tube([[0,.48,0],[0,.62,0],[.04,.7,0],[.07,.64,0],[.04,.58,0]],()=>.014,5,mp(c,.2),{caps:true});
 b.tube([[-.1,.2,0],[-.1,-.5,0]],()=>.011,4,c.paint('cord',{len:.7}),{caps:true});b.tube([[.1,.2,0],[.1,-.5,0]],()=>.011,4,c.paint('cord',{len:.7}),{caps:true});
 makerMark(c,[.058,.4,.0],'wood',1.2,[0,Math.PI/2,0]);
}
function bailer(c:Ctx){
 const b=c.b,P=c.wood(.4);
 b.ellipsoid([0,.12,0],[.1,.07,.13],P,c.sd(9));b.ellipsoid([0,.15,.01],[.08,.05,.1],c.paint('char',{len:.1,tint:'#2a1f16',tintAmount:.2}),c.sd(8));
 b.tube([[0,.12,-.1],[0,.2,-.2],[0,.36,-.3]],()=>.015,c.sd(6),c.wood2(.3),{caps:true});makerMark(c,[0,.1,.1],'wood',1);
}

export const TOOL_GENERATORS:Gen[]=[
 {id:'hoe',name:'Hoe',category:'farm',frame:'hand',gen:hoe},{id:'spade',name:'Spade and digging stick',category:'farm',frame:'hand',gen:spade},{id:'sickle',name:'Sickle',category:'farm',frame:'hand',gen:sickle},
 {id:'flail',name:'Flail',category:'farm',frame:'hand',gen:flail},{id:'quern',name:'Quern',category:'farm',frame:'world',gen:quern,budget:[4000,1900,1000]},{id:'ard',name:'Ard (scratch plough)',category:'farm',frame:'world',gen:ard,budget:[6000,2600,800]},
 {id:'mallet',name:'Mallet',category:'craft',frame:'hand',gen:mallet},{id:'hammer',name:'Hammer',category:'craft',frame:'hand',gen:hammer},{id:'fellingAxe',name:'Felling axe',category:'craft',frame:'hand',gen:fellingAxe,budget:[5600,3200,900] as const},
 {id:'pickaxe',name:'Quarry pick',category:'craft',frame:'hand',gen:pickaxe},{id:'staff',name:'Staff',category:'craft',frame:'hand',gen:staff},{id:'standard',name:'Standard',category:'craft',frame:'hand',gen:standard},
 {id:'skinningKnife',name:'Skinning knife',category:'hunt',frame:'hand',gen:skinningKnife},{id:'scraper',name:'Hide scraper',category:'hunt',frame:'hand',gen:scraper},{id:'snare',name:'Snare',category:'hunt',frame:'world',gen:snare,budget:[4000,1800,500]},
 {id:'huntNet',name:'Hunting net',category:'hunt',frame:'world',gen:huntNet,budget:[9000,4000,1200]},{id:'deadfall',name:'Deadfall trap',category:'hunt',frame:'world',gen:deadfall,budget:[4000,1800,500]},{id:'hideFrame',name:'Hide frame',category:'hunt',frame:'world',gen:hideFrame,budget:[7000,4000,900]},
 {id:'fishingRod',name:'Fishing rod',category:'fish',frame:'hand',gen:fishingRod},{id:'leister',name:'Fish spear',category:'fish',frame:'hand',gen:leister},{id:'fishNet',name:'Fishing net',category:'fish',frame:'world',gen:fishNet,budget:[9000,4000,1300]},{id:'fishTrap',name:'Fish trap',category:'fish',frame:'world',gen:fishTrap,budget:[5000,2200,700]},
 {id:'pot',name:'Clay pot',category:'carry',frame:'world',gen:pot,budget:[5200,1900,500] as const},{id:'basket',name:'Basket',category:'carry',frame:'world',gen:basket,budget:[7200,2600,800] as const},{id:'waterskin',name:'Waterskin',category:'carry',frame:'world',gen:waterskin},
 {id:'pack',name:'Pack',category:'carry',frame:'world',gen:pack},{id:'sack',name:'Sack',category:'carry',frame:'world',gen:sack},{id:'torch',name:'Torch',category:'light',frame:'hand',gen:torch},
 {id:'handcart',name:'Handcart',category:'carry',frame:'world',gen:handcart,budget:[9000,4000,1200]},{id:'harness',name:'Yoke and harness',category:'carry',frame:'world',gen:harness},
 {id:'oar',name:'Oar',category:'ship',frame:'hand',gen:oar},{id:'steerOar',name:'Steering oar',category:'ship',frame:'hand',gen:steerOar},{id:'anchor',name:'Anchor',category:'ship',frame:'world',gen:anchor},
 {id:'ropeCoil',name:'Rope coil',category:'ship',frame:'world',gen:ropeCoil},{id:'block',name:'Block and tackle',category:'ship',frame:'world',gen:block},{id:'bailer',name:'Bailer',category:'ship',frame:'world',gen:bailer},
];
void log;void v3;void TAU;
