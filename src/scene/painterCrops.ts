import * as THREE from 'three';
import {mergeParts,rngFrom,type V3} from './painterTrees';
/** Painterly crops: denser, bent plants with a baked base-to-tip light gradient (the instance colour carries the growth-stage hue), so a
 * field reads as rows of living plants that go from pale seedlings through lush green to gold stubble. Pure geometry + pure colour. */
export type PainterCrop='grain'|'pulses'|'tubers';
export type CropState={planted:number;tended:number;ripened:boolean;remaining:number};
const col=(hex:string)=>new THREE.Color(hex);
const STAGES:Record<PainterCrop,{sprout:THREE.Color;young:THREE.Color;lush:THREE.Color;late:THREE.Color;ripe:THREE.Color;stubble:THREE.Color}>={
 grain:{sprout:col('#9bb872'),young:col('#7a9a56'),lush:col('#6a8a4a'),late:col('#a0a65a'),ripe:col('#cdb06a'),stubble:col('#b8a27a')},
 pulses:{sprout:col('#97b57c'),young:col('#6f9658'),lush:col('#5d8450'),late:col('#8a9a58'),ripe:col('#b8a96a'),stubble:col('#a09070')},
 tubers:{sprout:col('#8fb078'),young:col('#628f58'),lush:col('#527a4c'),late:col('#6f8a50'),ripe:col('#968a56'),stubble:col('#85755a')},
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
/** Metres of row covered by one crop instance (the renderer stretches it to the real plant spacing so rows run on without gaps). */
export const PAINTER_CROP_SEGMENT:Record<PainterCrop,number>={grain:.82,pulses:1.15,tubers:1.3};
/** A thin bending ribbon (the building block of stalks, leaves and tufts). Lean direction is `yaw` (radians in the xz plane); `bend` is the
 * horizontal reach of the tip as a fraction of `len`; c0 and c1 are the linear base and tip colours. */
export function blade(base:V3,yaw:number,len:number,w:number,bend:number,c0:V3,c1:V3,segs=2){
 const dx=Math.cos(yaw),dz=Math.sin(yaw),px=-dz,pz=dx,pos:number[]=[],col:number[]=[],idx:number[]=[];
 for(let i=0;i<=segs;i++){
  const t=i/segs,r=t*t*bend*len,y=base[1]+len*(t-.25*Math.min(1.5,bend)*t*t),ww=w*(1-.88*t)*.5,c=[c0[0]+(c1[0]-c0[0])*t,c0[1]+(c1[1]-c0[1])*t,c0[2]+(c1[2]-c0[2])*t];
  pos.push(base[0]+dx*r-px*ww,y,base[2]+dz*r-pz*ww,base[0]+dx*r+px*ww,y,base[2]+dz*r+pz*ww);col.push(...c,...c);
 }
 for(let i=0;i<segs;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function cone(x:number,y:number,z:number,r:number,h:number,tilt:number,dir:number,c:V3,tip=1.15){
 const g=new THREE.ConeGeometry(r,h,3,1,true);g.translate(0,h/2,0);g.rotateZ(-Math.sin(tilt)*Math.cos(dir));g.rotateX(Math.sin(tilt)*Math.sin(dir));g.translate(x,y,z);
 const p=g.attributes.position,col=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const k=.85+(tip-.85)*Math.max(0,Math.min(1,(p.getY(i)-y)/h));col[i*3]=c[0]*k;col[i*3+1]=c[1]*k;col[i*3+2]=c[2]*k;}
 g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();return g;
}
/** One crop instance is a short stretch of row: grain is ~22 fine stalks of unequal height and lean with ears and the odd flag leaf, pulses are
 * five low bushy plants with leaves and pods, tubers are a low ridge with rosettes. Colour is a light gradient only; the instance colour is the stage hue. */
export function painterCropGeometry(kind:PainterCrop){
 const rnd=rngFrom(kind.length*131+kind.charCodeAt(0)),parts:THREE.BufferGeometry[]=[],len=PAINTER_CROP_SEGMENT[kind];
 const tone=(k:number,t:number):V3=>[k*(1+t),k,k*(1-t)];
 if(kind==='grain'){
  for(let i=0;i<22;i++){
   const x=(rnd()-.5)*(len+.12),z=(rnd()+rnd()-1)*.14,h=.5+Math.pow(rnd(),.8)*.42,lean=.03+rnd()*.17,la=rnd()<.4?(rnd()-.5)*1.2:rnd()*6.283,k=.86+rnd()*.3,t=(rnd()-.5)*.12;
   parts.push(blade([x,0,z],la,h,.021,lean/h*(h>.7?1.2:1)+.02,tone(.62*k,t),tone(1.02*k,t)));
   const tx=x+Math.cos(la)*lean*h,tz=z+Math.sin(la)*lean*h;
   parts.push(cone(tx,h*.97,tz,.021,.14+rnd()*.05,lean*2.2,la,tone(1.0*k,t+.1),1.3));
   if(i%3===0)parts.push(blade([x,h*(.3+.3*rnd()),z],rnd()*6.283,.22+rnd()*.12,.034,1.6,tone(.7*k,t),tone(1.0*k,t),1));
  }
 }else if(kind==='pulses'){
  for(let i=0;i<5;i++){
   const cx=-len/2+.12+i*(len-.24)/4+(rnd()-.5)*.1,cz=(rnd()-.5)*.1;
   for(let j=0;j<3;j++){const la=rnd()*6.283,h=.3+rnd()*.16,k=.88+rnd()*.24;parts.push(blade([cx+(rnd()-.5)*.05,0,cz+(rnd()-.5)*.05],la,h,.03,.28,tone(.6*k,0),tone(1.0*k,0)));
    parts.push(blade([cx,h*.35,cz],la+1.2+rnd(),.2+rnd()*.07,.12,.55,tone(.65*k,0),tone(1.1*k,0),1));parts.push(blade([cx,h*.62,cz],la+2.9+rnd(),.18+rnd()*.06,.11,.55,tone(.7*k,0),tone(1.1*k,0),1));}
   for(let j=0;j<2;j++)parts.push(cone(cx+(rnd()-.5)*.16,.18+rnd()*.12,cz+(rnd()-.5)*.16,.026,.13,.5,rnd()*6.28,[1,1.02,.78],1.2));
  }
 }else{
  const ridge=new THREE.IcosahedronGeometry(1,0);ridge.scale(len*.48,.1,.2);ridge.translate(0,.03,0);const rp=ridge.attributes.position,rc=new Float32Array(rp.count*3);for(let i=0;i<rp.count;i++){const k=.45+.2*Math.max(0,rp.getY(i)/.13);rc[i*3]=k*1.05;rc[i*3+1]=k;rc[i*3+2]=k*.8;}ridge.setAttribute('color',new THREE.BufferAttribute(rc,3));ridge.computeVertexNormals();parts.push(ridge);
  for(let i=0;i<4;i++){const cx=-len/2+.2+i*(len-.4)/3+(rnd()-.5)*.1;for(let j=0;j<7;j++){const a=j/7*6.283+rnd()*.5,k=.86+rnd()*.28;parts.push(blade([cx+Math.cos(a)*.03,.08,(rnd()-.5)*.06+Math.sin(a)*.03],a,.28+rnd()*.12,.15,.55,tone(.62*k,0),tone(1.05*k,0),1));}}
 }
 return mergeParts(parts);
}
/** A clump of broadleaved weeds with a few small flowers; colours are real (linear), the instance colour only dims them by season. */
export function painterWeedGeometry(){
 const rnd=rngFrom(977),parts:THREE.BufferGeometry[]=[],G=['#5f7d3a','#6d8a3e','#4f6f35','#7a8f45'].map(h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b] as V3;}),F=['#e8e0a8','#e0c040','#c88494'].map(h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b] as V3;});
 for(let j=0;j<9;j++){const a=j/9*6.283+rnd()*.5,g=G[Math.floor(rnd()*G.length)],k=.8+rnd()*.35;parts.push(blade([Math.cos(a)*.04,0,Math.sin(a)*.04],a,.2+rnd()*.28,.1+rnd()*.05,.6+rnd()*.4,[g[0]*k*.7,g[1]*k*.7,g[2]*k*.7],[g[0]*k*1.1,g[1]*k*1.1,g[2]*k*1.1],1));}
 const fc=F[Math.floor(rnd()*F.length)];
 for(let j=0;j<3;j++){const a=rnd()*6.283,r=rnd()*.12,o=new THREE.OctahedronGeometry(.026,0);o.translate(Math.cos(a)*r,.3+rnd()*.14,Math.sin(a)*r);const p=o.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){c[i*3]=fc[0];c[i*3+1]=fc[1];c[i*3+2]=fc[2];}o.setAttribute('color',new THREE.BufferAttribute(c,3));o.computeVertexNormals();parts.push(o);}
 return mergeParts(parts);
}
