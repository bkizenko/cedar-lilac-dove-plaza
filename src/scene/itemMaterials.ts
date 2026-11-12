/** ITEM MATERIALS: honest surface colour for every substance a tool or weapon is made of, with wear, patina, grain and tint.
 *
 *  BLUF: `paintFor(mat,opts)` returns a per-vertex `Paint`. Wood has grain and knots along the primitive's length; flint is faceted with cortex
 *  and a bright fresh edge; copper and bronze green with age and wear, iron rusts, steel keeps a pattern-welded sheen; leather darkens and
 *  shines at the grip; cord and sinew show their twist. `wear` 0 is new, 1 is ruined. Nothing here touches the simulation. */
import {hexRgb,rgbMix,vnoise,TAU,type Paint,type RGB,type V3} from './itemMesh';

export type MatId=
 |'flint'|'obsidian'|'chert'|'bone'|'antler'|'horn'|'ivory'|'stone'|'basalt'|'shell'
 |'copper'|'bronze'|'iron'|'steel'|'gold'|'lead'
 |'ash'|'oak'|'yew'|'birch'|'bamboo'|'cedar'|'pine'|'ebony'|'elm'|'willow'
 |'leather'|'rawhide'|'sinew'|'cord'|'linen'|'wool'|'felt'|'pitch'|'clay'|'wicker'|'hair'|'feather'|'hide'|'ochre'|'char'|'fire'|'water';
type Base={c:string;v:number;g:number;/** darker tone for grain / facets */d:string};
const B=(c:string,v:number,g:number,d?:string):Base=>({c,v,g,d:d??c});
export const MATERIALS:Readonly<Record<MatId,Base>>=Object.freeze({
 flint:B('#6d6b63',.2,0,'#34332f'),obsidian:B('#1d1d24',.12,0,'#08080b'),chert:B('#a5804f',.2,0,'#6b4d2c'),bone:B('#e2d7b9',.1,.4,'#a8946a'),antler:B('#c8b592',.12,.5,'#8a7656'),horn:B('#4b3b2b',.14,.5,'#1e1610'),ivory:B('#efe6cc',.06,.3,'#c0ad84'),
 stone:B('#8d897f',.2,0,'#5b5850'),basalt:B('#54585b',.14,0,'#2c2f31'),shell:B('#e8ddd0',.08,0,'#b9a89a'),
 copper:B('#b9744a',.12,0,'#7b4128'),bronze:B('#b28b3c',.1,0,'#6e5120'),iron:B('#7d7f84',.1,0,'#3b3c40'),steel:B('#c6cacf',.07,0,'#7e848b'),gold:B('#d6ae38',.05,0,'#8c6b1a'),lead:B('#6f7378',.06,0,'#3a3d40'),
 ash:B('#b8a27c',.1,.9,'#7e6339'),oak:B('#826648',.1,.9,'#53391e'),yew:B('#a56a3c',.1,.9,'#5e3217'),birch:B('#d3c3a1',.07,.5,'#4a3f33'),bamboo:B('#c9b55a',.06,.4,'#6e5e24'),cedar:B('#a4603c',.09,.9,'#5d2e18'),pine:B('#c2a273',.09,.9,'#8a6330'),ebony:B('#4a3628',.08,.7,'#1f1710'),elm:B('#96795a',.1,.9,'#5c4125'),willow:B('#b39d78',.08,.8,'#7a5f37'),
 leather:B('#704a2c',.13,.2,'#3d2514'),rawhide:B('#cdb68c',.1,.2,'#8f7a52'),sinew:B('#b9a06c',.08,.5,'#7b6738'),cord:B('#c4b184',.1,.6,'#85744d'),linen:B('#d8cdaa',.07,.4,'#a79a74'),wool:B('#cbbd9c',.12,.3,'#8c7e5e'),felt:B('#b8ad94',.12,0,'#7f7560'),pitch:B('#2a2018',.08,0,'#0f0b08'),clay:B('#b5694a',.1,0,'#7a3f27'),wicker:B('#bd9d66',.09,.7,'#7e6334'),hair:B('#8a3426',.12,.5,'#3d140d'),feather:B('#d9d2c0',.12,.6,'#6b5f4a'),hide:B('#8a6b45',.14,.2,'#4d3a22'),ochre:B('#b5532c',.1,0,'#7a3319'),char:B('#2e2a27',.12,0,'#100e0d'),fire:B('#ff9a2a',.2,0,'#e04a12'),water:B('#6a93a8',.08,0,'#3c5f73'),
});
const PATINA:Partial<Record<MatId,string>>={copper:'#4f9b7c',bronze:'#4d8c6c',iron:'#8e4a28',steel:'#6d5b45',lead:'#b8bcbc',gold:'#b8923a'};
const clamp=(x:number,a=0,b=1)=>Math.max(a,Math.min(b,x));
export type PaintOpts={seed?:number;/** 0 new .. 1 ruined */wear?:number;/** length of the primitive along t, metres (grain stretch) */len?:number;tint?:string;tintAmount?:number;/** second colour for stripes, bands and painted work */accent?:string;/** forged pattern or twisted strands */pattern?:boolean;/** extra age for metals (patina) independent of use */age?:number};
const isWood=(m:MatId)=>['ash','oak','yew','birch','bamboo','cedar','pine','ebony','elm','willow'].includes(m);
const isMetal=(m:MatId)=>['copper','bronze','iron','steel','gold','lead'].includes(m);
/** The painter for one substance. Pure and deterministic in (mat, opts, position). */
export function paintFor(mat:MatId,o:PaintOpts={}):Paint{
 const b=MATERIALS[mat],base=hexRgb(b.c),dark=hexRgb(b.d),seed=(o.seed??1)|0,wear=clamp(o.wear??0),len=o.len??1,age=clamp(o.age??0);
 const tint=o.tint?hexRgb(o.tint):null,ta=o.tintAmount??.35,acc=o.accent?hexRgb(o.accent):null;
 const patina=PATINA[mat]?hexRgb(PATINA[mat]!):null,wood=isWood(mat),metal=isMetal(mat),dirt=hexRgb('#40321f');
 return (p:V3,n:V3,t:number,a:number):RGB=>{
  let c:RGB=base;
  if(tint)c=rgbMix(c,tint,ta);
  const lo=vnoise(p[0]*7+seed,p[1]*7,p[2]*7,seed),hi=vnoise(p[0]*31,p[1]*31,p[2]*31,seed+3);
  let k=1+b.v*((lo-.5)*1.4+(hi-.5)*.6);
  if(wood){
   // growth rings and grain run along the length: stretch noise in t, wrap it around in a
   const g=vnoise(a*9+seed*.1,t*len*3.2,seed+9),ring=.5+.5*Math.sin((g*5+t*len*.6)*TAU*.5);
   c=rgbMix(c,dark,clamp((ring-.45)*b.g*.9));
   const knot=vnoise(p[0]*11+5,p[1]*11,p[2]*11+7,seed+1);if(knot>.84)c=rgbMix(c,dark,.55*(knot-.84)/.16*b.g+.1);
   if(wear>.55)c=rgbMix(c,hexRgb('#8b8a82'),(wear-.55)*.5); // silvered, weathered
  }
  switch(mat){
   case 'flint':case 'chert':case 'obsidian':{
    const f=Math.floor(vnoise(p[0]*58,p[1]*58,p[2]*58,seed+4)*4)/4; // flake facets
    c=rgbMix(c,dark,f*.75);
    if(mat!=='obsidian'){const cortex=vnoise(p[0]*13+2,p[1]*13,p[2]*13,seed+8);if(cortex>.74&&a<.5)c=rgbMix(c,hexRgb('#cdbf9c'),.8);} // chalky cortex
    else{k*=1+.35*Math.max(0,Math.sin((p[1]*70+p[0]*50)))*(a>.6?1:0);}
    if(a>.82)c=rgbMix(c,hexRgb(mat==='obsidian'?'#4a4a58':'#b9b3a0'),.35); // fresh sharp edge
    break;}
   case 'bone':case 'antler':case 'ivory':case 'horn':{
    const s=.5+.5*Math.sin(a*TAU*5+vnoise(a*4,t*len*5,0,seed)*4);c=rgbMix(c,dark,s*b.g*.35);
    if(mat==='bone'||mat==='antler'){c=rgbMix(c,hexRgb('#6a5236'),wear*.5*vnoise(p[0]*9,p[1]*9,p[2]*9,seed+2));}
    break;}
   case 'copper':case 'bronze':case 'iron':case 'steel':case 'gold':case 'lead':{
    // hammered mottling
    k*=1+(hi-.5)*.22;
    if(mat==='steel'&&o.pattern){const s=.5+.5*Math.sin(t*len*120+vnoise(p[0]*14,p[1]*3,p[2]*14,seed)*7);c=rgbMix(c,dark,s*.34);}
    if(mat==='iron'||mat==='steel'){const s=.5+.5*Math.sin(t*len*180+vnoise(p[0]*10,p[1]*2,p[2]*10,seed)*5);c=rgbMix(c,dark,s*.1);}
    // edge bevel catches light
    if(a>.84&&len>.12)c=rgbMix(c,hexRgb(mat==='iron'?'#a9abb0':'#ecefef'),mat==='copper'||mat==='bronze'?.2:.45*(1-wear*.6));
    const worn=clamp(wear*1.1+age*.9);
    if(patina&&worn>0){
     const m=vnoise(p[0]*9+3,p[1]*9,p[2]*9+1,seed+6)*.7+vnoise(p[0]*27,p[1]*27,p[2]*27,seed+2)*.3,cover=m*.55+worn*1.25-.72;
     // patina collects in recesses: less on exposed edges
     const edgeKeep=a>.88?.55:1;if(cover>0)c=rgbMix(c,patina,clamp(cover*2.2)*edgeKeep*(mat==='gold'?.3:mat==='steel'?.45:1));
    }
    break;}
   case 'leather':case 'hide':case 'rawhide':{
    c=rgbMix(c,dark,clamp(wear*.55+(vnoise(p[0]*19,p[1]*19,p[2]*19,seed)-.5)*.35));
    if(acc)c=rgbMix(c,acc,.0);
    break;}
   case 'cord':case 'sinew':case 'linen':case 'hair':{
    const tw=.5+.5*Math.sin((a*2+t*len*(mat==='hair'?30:75))*TAU);c=rgbMix(c,dark,tw*.32);
    break;}
   case 'wicker':{
    const wv=Math.sin(t*len*70)*Math.sin(a*TAU*7+Math.floor(t*len*70)*1.9);c=rgbMix(c,dark,clamp(wv*.5+.25)*.55);break;}
   case 'clay':{
    const s=vnoise(p[0]*40,p[1]*40,p[2]*40,seed+11);c=rgbMix(c,dark,s*.28);break;}
   case 'stone':case 'basalt':{c=rgbMix(c,dark,vnoise(p[0]*26,p[1]*26,p[2]*26,seed+5)*.55);break;}
   case 'pitch':{k*=1+(hi-.5)*.2;break;}
   default:break;
  }
  if(!metal&&mat!=='fire'){ // use darkens and dirties everything organic
   const grime=clamp(wear*.7*(.4+.6*vnoise(p[0]*5+1,p[1]*5,p[2]*5,seed+12)));c=rgbMix(c,dirt,grime*.55);k*=1-wear*.12;
  }
  if(a>0&&acc&&(mat==='leather'||mat==='rawhide'||mat==='linen'||mat==='wool'||mat==='felt'||mat==='cord')&&Math.abs(Math.sin(t*len*14*TAU/6))>.97)c=acc;
  return [clamp(c[0]*k),clamp(c[1]*k),clamp(c[2]*k)];
 };
}
/** Stripe/band paint over a base paint: used for painted hafts, shield fields and pot bands. `along` selects t (length) or a (around). */
export function bandPaint(base:Paint,band:RGB,period:number,duty:number,along:'t'|'a'|'x'|'y'='t',phase=0):Paint{
 return (p,n,t,a)=>{const c=base(p,n,t,a),v=along==='t'?t:along==='a'?a:along==='x'?p[0]:p[1],f=((v*period+phase)%1+1)%1;return f<duty?rgbMix(c,band,.85):c;};
}
/** A different paint for the part of a surface where `pred` holds (decoration, wear patches, inlays). */
export function overPaint(base:Paint,over:Paint,pred:(p:V3,n:V3,t:number,a:number)=>boolean):Paint{return (p,n,t,a)=>pred(p,n,t,a)?over(p,n,t,a):base(p,n,t,a);}
/** Which metal a given era forges. 0 stone age, 1 copper, 2 bronze, 3 iron, 4 steel. */
export const ERA_METAL:readonly (MatId|null)[]=[null,'copper','bronze','iron','steel'];
export const ERA_NAMES=['flint & bone','copper','bronze','iron','steel'] as const;
export const metalOfEra=(era:number):MatId=>ERA_METAL[Math.max(0,Math.min(4,Math.floor(era)))]??'flint';
