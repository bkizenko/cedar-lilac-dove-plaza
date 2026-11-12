import * as THREE from 'three';
import {mergeParts,tube,frond,rngFrom,type V3} from './painterTrees';
/** Painterly crops: denser, bent plants with a baked base-to-tip light gradient (the instance colour carries the growth-stage hue), so a
 * field reads as rows of living plants that go from pale seedlings through lush green to gold stubble. Pure geometry + pure colour. */
export type PainterCrop='grain'|'pulses'|'tubers';
export type CropState={planted:number;tended:number;ripened:boolean;remaining:number};
const col=(hex:string)=>new THREE.Color(hex);
const STAGES:Record<PainterCrop,{sprout:THREE.Color;young:THREE.Color;lush:THREE.Color;late:THREE.Color;ripe:THREE.Color;stubble:THREE.Color}>={
 grain:{sprout:col('#a8e070'),young:col('#76b84a'),lush:col('#5fa23c'),late:col('#a3b54a'),ripe:col('#ecbc4c'),stubble:col('#c2a468')},
 pulses:{sprout:col('#9edd7c'),young:col('#6cb352'),lush:col('#4f9a43'),late:col('#8aa84a'),ripe:col('#c9b25a'),stubble:col('#a89460')},
 tubers:{sprout:col('#92d36a'),young:col('#62b04e'),lush:col('#459641'),late:col('#6f9a45'),ripe:col('#a49246'),stubble:col('#8c7650')},
};
/** Hue of one plant. jitter in [0,1) is a stable per-plant value so neighbouring plants differ a little (painted, not stamped). */
export function painterCropColor(kind:PainterCrop,state:CropState|undefined,growth:number,jitter:number,out=new THREE.Color()){
 const S=STAGES[kind];
 if(state?.ripened&&state.remaining<=0)out.copy(S.stubble);
 else if(state?.ripened)out.copy(S.ripe);
 else if(growth<.3)out.copy(S.sprout).lerp(S.young,growth/.3);
 else if(growth<.75)out.copy(S.young).lerp(S.lush,(growth-.3)/.45);
 else out.copy(S.lush).lerp(S.late,Math.min(1,(growth-.75)/.25)*.8);
 const hsl={h:0,s:0,l:0};out.getHSL(hsl);out.setHSL(hsl.h+(jitter-.5)*.035,hsl.s*(.92+jitter*.14),hsl.l*(.9+((jitter*7.3)%1)*.2));
 return out;
}
/** Plant scale: seedlings are small tufts, mature plants fill their row. */
export function painterCropScale(growth:number){const g=Math.max(.04,Math.min(1,growth));return {xz:.5+.5*Math.sqrt(g),y:Math.max(.03,g)};}
function shade(g:THREE.BufferGeometry,base:number,tip:number,warmTop=0){
 g.computeBoundingBox();const b=g.boundingBox!,h=Math.max(.01,b.max.y-b.min.y),pos=g.attributes.position,c=new Float32Array(pos.count*3);
 for(let i=0;i<pos.count;i++){const t=Math.max(0,Math.min(1,(pos.getY(i)-b.min.y)/h)),v=base+(tip-base)*Math.pow(t,.8);c[i*3]=v*(1+warmTop*t);c[i*3+1]=v;c[i*3+2]=v*(1-warmTop*t*.6);}
 g.setAttribute('color',new THREE.BufferAttribute(c,3));return g;
}
function ear(x:number,y:number,z:number,len:number,lean:number){
 const g=new THREE.CylinderGeometry(.018,.034,len,5,1);g.translate(0,len/2,0);g.rotateZ(-lean);g.translate(x,y,z);return shade(g,1.05,1.35,.18);
}
export function painterCropGeometry(kind:PainterCrop){
 const rnd=rngFrom(kind.length*131+kind.charCodeAt(0)),parts:THREE.BufferGeometry[]=[];
 const stalk=(x:number,z:number,h:number,lean:number,r:number,sides=3)=>{
  const dx=Math.cos(lean*7)*lean,dz=Math.sin(lean*7)*lean,pts:V3[]=[[x,.02,z],[x+dx*.25,h*.5,z+dz*.25],[x+dx,h,z+dz]];
  return shade(tube(pts,[r,r*.8,r*.5],sides,()=>[1,1,1],rnd()*50),.55,1.05);
 };
 if(kind==='grain'){
  for(let i=0;i<8;i++){const a=rnd()*6.283,rr=Math.sqrt(rnd())*.17,x=Math.cos(a)*rr,z=Math.sin(a)*rr,h=.62+rnd()*.2,lean=.06+rnd()*.14;
   parts.push(stalk(x,z,h,lean,.014));
   const dx=Math.cos(lean*7)*lean,dz=Math.sin(lean*7)*lean;
   parts.push(ear(x+dx,h,z+dz,.17+rnd()*.05,lean*1.6));
   if(i%2===0)parts.push(shade(frond([x,.1,z],a,.3+rnd()*.12,.5,.9,.035,{top:[1,1,1],bottom:[.7,.7,.7]},4),.6,1.0));}
 }else if(kind==='pulses'){
  for(let i=0;i<4;i++){const a=i*Math.PI/2+rnd()*.6,x=Math.cos(a)*.12,z=Math.sin(a)*.12,h=.36+rnd()*.12;
   parts.push(stalk(x,z,h,.1,.02));
   for(let j=0;j<3;j++)parts.push(shade(frond([x,.14+j*.11,z],a+j*1.9,.22+rnd()*.06,.3,.7,.12,{top:[1,1,1],bottom:[.7,.7,.7]},3),.6,1.1));
   const pod=new THREE.CapsuleGeometry(.032,.12,2,4);pod.rotateZ(.4);pod.translate(x+.07,h*.8,z);parts.push(shade(pod,1.0,1.3,.2));}
 }else{
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7+rnd()*.3;parts.push(shade(frond([0,.07,0],a,.3+rnd()*.12,.45,1.0,.15,{top:[1,1,1],bottom:[.7,.7,.7]},4),.55,1.1));}
  const mound=new THREE.IcosahedronGeometry(.17,1);mound.scale(1,.3,1);mound.translate(0,.04,0);parts.push(shade(mound,.45,.6));
 }
 return mergeParts(parts);
}
