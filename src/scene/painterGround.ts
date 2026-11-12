import * as THREE from 'three';
import {PROVINCE_KINDS,ecologicalConditionsAt,type EcologicalProvinceGrid,type ProvinceKind} from '../game/ecologicalProvinces';
import {fbm} from './biomeTerrain';
/** Painterly ground albedo, baked per terrain vertex (the shader adds the fine painted detail on top). Warm, readable biome families:
 * lush meadow, dim forest floor, straw scrub, red-gold arid, alpine turf, wet green wetland, bright coast; sandstone and granite rock with strata;
 * beach sand, packed paths, snow. Season and altitude shift every family. Pure colour: heights, collision and saves are untouched. */
export type SeasonWeights={spring:number;summer:number;autumn:number;winter:number;snow:number};
type Palette={grass:[string,string,string,string];dry:string;litter:string;sand:string;rock:string;rockWarm:string};
export const PAINTER_PALETTE:Record<ProvinceKind,Palette>={
 meadow:{grass:['#9bb552','#8da44a','#b9a04c','#a4a888'],dry:'#c9b665',litter:'#86703c',sand:'#dfca98',rock:'#908d85',rockWarm:'#b99b73'},
 'mixed-woodland':{grass:['#6f9448','#617f3e','#98743a','#7f8062'],dry:'#a99c5a',litter:'#745c37',sand:'#d4c190',rock:'#878379',rockWarm:'#a98f6b'},
 'conifer-forest':{grass:['#4f7340','#466739','#5d6738','#65705a'],dry:'#7f7f4c',litter:'#634c33',sand:'#cabb8d',rock:'#7e7d77',rockWarm:'#907f6b'},
 alpine:{grass:['#86a863','#7a9a5a','#a99c5a','#b3b6ae'],dry:'#a8a770',litter:'#7d6c4e',sand:'#cdc19c',rock:'#8e8d89',rockWarm:'#a19079'},
 wetland:{grass:['#6b9c5c','#5f8e50','#908d4d','#869277'],dry:'#969a5e',litter:'#52462f',sand:'#c1b78f',rock:'#80827b',rockWarm:'#8b8271'},
 'dry-scrub':{grass:['#b2ad60','#b3a656','#aa8c4c','#a0977a'],dry:'#cdb56f',litter:'#8f7249',sand:'#dcc590',rock:'#9b8f7d',rockWarm:'#b9956b'},
 arid:{grass:['#d6bc80','#d4b87c','#cdae75','#d0c3a4'],dry:'#dec489',litter:'#aa8456',sand:'#e3ca92',rock:'#bb9465',rockWarm:'#c47e53'},
 'warm-coast':{grass:['#a0bb58','#95b04d','#b0a84d','#a4aa7c'],dry:'#c3b665',litter:'#7e6b3f',sand:'#e4cc97',rock:'#959086',rockWarm:'#b5966f'},
};
const lin=(h:string):[number,number,number]=>{const c=new THREE.Color(h);return [c.r,c.g,c.b];};
type LinPalette={grass:[number,number,number][];dry:[number,number,number];litter:[number,number,number];sand:[number,number,number];rock:[number,number,number];rockWarm:[number,number,number]};
const LIN:Record<string,LinPalette>={};
for(const k of PROVINCE_KINDS){const p=PAINTER_PALETTE[k];LIN[k]={grass:p.grass.map(lin),dry:lin(p.dry),litter:lin(p.litter),sand:lin(p.sand).map(v=>v*(k==='arid'?1.0:k==='dry-scrub'?.86:.72)) as [number,number,number],rock:lin(p.rock).map(v=>v*.75) as [number,number,number],rockWarm:lin(p.rockWarm).map(v=>v*.66) as [number,number,number]};}
const AUTUMN_GOLD=lin('#c9983c'),AUTUMN_RUST=lin('#a65a2c'),AUTUMN_OLIVE=lin('#8c9a44');
const FLOWER_YELLOW=lin('#dcc548'),FLOWER_WHITE=lin('#e6dccb'),FLOWER_VIOLET=lin('#9d7fbd');
const SNOW=lin('#eef3f8'),SNOW_SHADE=lin('#cfdcec'),PATH=lin('#a68558'),MUD=lin('#5d4c37');
const mix3=(a:readonly number[],b:readonly number[],t:number,o:number[])=>{o[0]=a[0]+(b[0]-a[0])*t;o[1]=a[1]+(b[1]-a[1])*t;o[2]=a[2]+(b[2]-a[2])*t;return o;};
const clamp01=(v:number)=>v<0?0:v>1?1:v;
const smooth=(a:number,b:number,x:number)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
export type GroundSource={world:{waterY:number;ecology?:EcologicalProvinceGrid};state:{seed:number}};
/** Legacy worlds without an ecology grid fall back to the old biome index (0 water,1 shore,2 plain,3 fertile,4 hills,5 rock,6 path,7 high,8 forest). */
const LEGACY_KIND:Record<number,ProvinceKind>={0:'meadow',1:'warm-coast',2:'meadow',3:'meadow',4:'dry-scrub',5:'alpine',6:'meadow',7:'alpine',8:'mixed-woodland'};
/** 3x3 box blur on a square vertex grid (row-major). Rock exposure is computed per vertex from slope and curvature, which dithers at the
 * triangle scale; softening it keeps rock edges painterly instead of pixelated. */
export function blurGrid(a:Float32Array,passes:number){
 const w=Math.round(Math.sqrt(a.length));if(w*w!==a.length)return;
 let src=a,dst:Float32Array=new Float32Array(a.length);
 for(let p=0;p<passes;p++){
  for(let y=0;y<w;y++)for(let x=0;x<w;x++){let sum=0,c=0;for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=w)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=w)continue;sum+=src[yy*w+xx];c++;}}dst[y*w+x]=sum/c;}
  const t=src;src=dst;dst=t;
 }
 if(src!==a)a.set(src);
}
/** The sparse bank-tile mesh derives vertex normals from a height function that is stepped on terraces and cliffs, which hatches steep
 * faces with contour-line noise once the surface shader reads the slope. Smooth them inside each (n+1)x(n+1) tile; tile borders keep
 * their values so seams with the coarse terrain do not open. Render-only: positions are untouched. */
export function smoothTileNormals(g:THREE.BufferGeometry,n:number,passes=3){
 const nrm=g.getAttribute('normal') as THREE.BufferAttribute|undefined;if(!nrm||n<3)return;
 const w=n+1,per=w*w,tiles=Math.floor(nrm.count/per),a=nrm.array as Float32Array,tmp=new Float32Array(per*3);
 for(let t=0;t<tiles;t++){const o=t*per*3;
  for(let p=0;p<passes;p++){tmp.set(a.subarray(o,o+per*3));
   for(let iz=1;iz<n;iz++)for(let ix=1;ix<n;ix++){let x=0,y=0,z=0;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const k=((iz+dz)*w+ix+dx)*3;x+=tmp[k];y+=tmp[k+1];z+=tmp[k+2];}
    const l=Math.hypot(x,y,z)||1,k=o+(iz*w+ix)*3;a[k]=x/l;a[k+1]=y/l;a[k+2]=z/l;}}
 }
 nrm.needsUpdate=true;
}
/** Row-major (segs+1)^2 grid normals: blur and renormalise so steep, terraced faces shade as one surface instead of per-cell noise. */
export function smoothGridNormals(g:THREE.BufferGeometry,segs:number,passes=2){
 const nrm=g.getAttribute('normal') as THREE.BufferAttribute,w=segs+1;if(!nrm||nrm.count!==w*w)return;
 const a=nrm.array as Float32Array,tmp=new Float32Array(a.length);
 for(let p=0;p<passes;p++){tmp.set(a);
  for(let iz=0;iz<w;iz++)for(let ix=0;ix<w;ix++){let x=0,y=0,z=0;
   for(let dz=-1;dz<=1;dz++){const jz=Math.min(w-1,Math.max(0,iz+dz));for(let dx=-1;dx<=1;dx++){const jx=Math.min(w-1,Math.max(0,ix+dx)),k=(jz*w+jx)*3;x+=tmp[k];y+=tmp[k+1];z+=tmp[k+2];}}
   const l=Math.hypot(x,y,z)||1,k=(iz*w+ix)*3;a[k]=x/l;a[k+1]=y/l;a[k+2]=z/l;}}
 nrm.needsUpdate=true;
}
export class PainterGround{
 private n:number;private x:Float32Array;private z:Float32Array;private h:Float32Array;private grade:Float32Array;private exposure:Float32Array;private warm:Float32Array;private legacy:Uint8Array;private region:Uint8Array;
 private kinds:Uint8Array;private weights:Float32Array;private moist:Float32Array;private patch:Float32Array;private fine:Float32Array;private bloom:Float32Array;private hue:Float32Array;private waterY:number;private pathMask:Float32Array;
 constructor(game:GroundSource,positions:THREE.BufferAttribute,landscape:Float32Array,legacy:Uint8Array,region:Uint8Array|null){
  const n=this.n=positions.count;this.x=new Float32Array(n);this.z=new Float32Array(n);this.h=new Float32Array(n);this.grade=new Float32Array(n);this.exposure=new Float32Array(n);this.warm=new Float32Array(n);
  this.legacy=legacy;this.region=region??new Uint8Array(n).fill(255);this.kinds=new Uint8Array(n*4);this.weights=new Float32Array(n*4);this.moist=new Float32Array(n);this.patch=new Float32Array(n);this.fine=new Float32Array(n);this.bloom=new Float32Array(n);this.hue=new Float32Array(n);this.waterY=game.world.waterY;
  const grid=game.world.ecology,seed=game.state.seed%997;
  for(let i=0;i<n;i++){
   const x=positions.getX(i),z=positions.getZ(i);this.x[i]=x;this.z[i]=z;this.h[i]=positions.getY(i);
   this.exposure[i]=landscape[i*5];this.warm[i]=clamp01((landscape[i*5+1]-.68)/.1);
   this.patch[i]=fbm(x*.017+seed,z*.017-seed,3);this.fine[i]=fbm(x*.11,z*.11,3);this.bloom[i]=fbm(x*.045+11,z*.045-7,3);this.hue[i]=fbm(x*.03-3,z*.03+5,2);
   if(grid){
    const gx=(x/grid.size+.5)*grid.width-.5,gz=(z/grid.size+.5)*grid.width-.5,ix=Math.max(0,Math.min(grid.width-2,Math.floor(gx))),iz=Math.max(0,Math.min(grid.width-2,Math.floor(gz))),fx=clamp01(gx-ix),fz=clamp01(gz-iz);
    const cells=[[ix,iz,(1-fx)*(1-fz)],[ix+1,iz,fx*(1-fz)],[ix,iz+1,(1-fx)*fz],[ix+1,iz+1,fx*fz]];
    for(let c=0;c<4;c++){this.kinds[i*4+c]=grid.kinds[cells[c][1]*grid.width+cells[c][0]];this.weights[i*4+c]=cells[c][2];}
    this.moist[i]=ecologicalConditionsAt(grid,x,z).moisture;
   }else{this.kinds[i*4]=PROVINCE_KINDS.indexOf(LEGACY_KIND[legacy[i]]??'meadow');this.weights[i*4]=1;this.moist[i]=.5;}
  }
  blurGrid(this.exposure,3);blurGrid(this.warm,2);
  this.pathMask=new Float32Array(n);for(let i=0;i<n;i++)this.pathMask[i]=legacy[i]===6?1:0;blurGrid(this.pathMask,2);
 }
 /** Writes linear RGB into out (length 3n). */
 paint(out:Float32Array,sn:SeasonWeights){
  const n=this.n,tmp=[0,0,0],acc=[0,0,0],rock=[0,0,0],grass=[0,0,0],waterY=this.waterY;
  for(let i=0;i<n;i++){
   const h=this.h[i],rel=h-waterY,patch=this.patch[i],fine=this.fine[i],m=this.moist[i];
   acc[0]=acc[1]=acc[2]=0;let wsum=0;
   for(let c=0;c<4;c++){const w=this.weights[i*4+c];if(w<=0)continue;const kind=PROVINCE_KINDS[this.kinds[i*4+c]]??'meadow',P=LIN[kind];wsum+=w;
    // seasonal grass colour: blend the four seasons, then dry out where moisture is low
    for(let k=0;k<3;k++)grass[k]=P.grass[0][k]*sn.spring+P.grass[1][k]*sn.summer+P.grass[2][k]*sn.autumn+P.grass[3][k]*sn.winter;
    const dryT=clamp01((.55-m)*1.1+(patch-.5)*1.1+sn.autumn*.1);mix3(grass,P.dry,dryT*.75,tmp);
    const lushT=smooth(.6,.8,patch)*(1-dryT);tmp[0]=tmp[0]*(1-lushT*.14);tmp[1]=tmp[1]*(1-lushT*.04);tmp[2]=tmp[2]*(1-lushT*.1);
    mix3(tmp,P.litter,smooth(.62,.85,fine*.5+patch*.5)*(kind==='conifer-forest'||kind==='mixed-woodland'?.55:.2),tmp);
    if(sn.autumn>.05){ // autumn is patchwork: olive greens, gold and rust drifts that follow broad noise, not one flat mustard
     const a=sn.autumn,goldT=smooth(.38,.62,this.hue[i])*a*.55,rustT=smooth(.62,.82,patch*.6+this.bloom[i]*.4)*a*.5,oliveT=(1-smooth(.3,.5,this.hue[i]))*a*.35;
     mix3(tmp,AUTUMN_OLIVE,oliveT,tmp);mix3(tmp,AUTUMN_GOLD,goldT,tmp);mix3(tmp,AUTUMN_RUST,rustT,tmp);
    }
    if(kind==='meadow'||kind==='warm-coast'||kind==='alpine'||kind==='wetland'){
     const fl=smooth(.6,.72,this.bloom[i])*(sn.spring+sn.summer*.75)*(1-dryT*.6);
     if(fl>.01)mix3(tmp,this.hue[i]>.55?FLOWER_YELLOW:this.hue[i]>.38?FLOWER_WHITE:FLOWER_VIOLET,fl*.34,tmp);
    }
    acc[0]+=tmp[0]*w;acc[1]+=tmp[1]*w;acc[2]+=tmp[2]*w;
   }
   if(wsum>0){acc[0]/=wsum;acc[1]/=wsum;acc[2]/=wsum;}
   // rock: granite to sandstone by geological province, strata bands follow height
   const strata=Math.sin(h/9*Math.PI*2)*.5+.5,warm=this.warm[i];
   const kindA=PROVINCE_KINDS[this.kinds[i*4]]??'meadow',PR=LIN[kindA];
   mix3(PR.rock,PR.rockWarm,clamp01(warm*.8+patch*.35-.1),rock);const sv=.96+strata*.07;rock[0]*=sv;rock[1]*=sv;rock[2]*=sv;
   const rockT=smooth(.04,.55,this.exposure[i]);
   mix3(acc,rock,rockT,tmp);let r=tmp[0],g=tmp[1],b=tmp[2];
   // beach: sand to grass across the first metre above the water line; river and lake beds read as wet sand
   if(this.legacy[i]===0||rel<.08){mix3([r,g,b],mix3(PR.sand,MUD,clamp01(-rel/2.4)*.55,tmp),.82,tmp);r=tmp[0];g=tmp[1];b=tmp[2];}
   else if(rel<1.15){const t=1-smooth(.15,1.15+fine*.5,rel);mix3([r,g,b],PR.sand,t*.85*(1-rockT),tmp);r=tmp[0];g=tmp[1];b=tmp[2];}
   if(this.pathMask[i]>.02){mix3([r,g,b],PATH,.6*this.pathMask[i],tmp);r=tmp[0];g=tmp[1];b=tmp[2];}
   // altitude: cooler and greyer on the heights, warmer and lusher in the valleys
   const alt=smooth(10,34,h);r*=1-alt*.07;g*=1-alt*.04;b*=1+alt*.06;
   // resource-cluster tints stay faint hints
   const rk=this.region[i];
   if(rk===0){r=r*.94+.03;g*=.95;}else if(rk===1){g=Math.min(1,g*1.05);}else if(rk===2){r*=.95;g*=.96;b*=.93;}else if(rk===3){r=Math.min(1,r*.95+.05);g*=.94;b*=.9;}
   // snow
   const snowH=clamp01((h-3.2)/12);let cover=clamp01(sn.snow*(.35+snowH*.75)+(this.legacy[i]===7||this.legacy[i]===5?sn.winter*.25:0));
   if(this.legacy[i]===0||rel<.1)cover*=.35;
   if(cover>.02){const sh=clamp01(.5+fine*.5);mix3(SNOW_SHADE,SNOW,sh,tmp);r+=(tmp[0]-r)*cover;g+=(tmp[1]-g)*cover;b+=(tmp[2]-b)*cover;}
   out[i*3]=r;out[i*3+1]=g;out[i*3+2]=b;
  }
  // one light smoothing pass keeps province seams soft without erasing rock edges
  return out;
 }
}
