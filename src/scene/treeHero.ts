/** HERO tree tier (lod 2): the near-tier enrichment pass for botanical trees. Pure geometry (no Math.random, no Date.now, no clock): every extra comes from a
 * seeded generator `rh` that is separate from the skeleton generators, so the hero tree has EXACTLY the skeleton, trunk and crown of its lod 0 twin and only
 * adds: twig sprays (3-level branching with individually oriented single-leaf cards of mixed shape and size, clustered by twig), root buttresses and surface
 * roots, bark relief (see tube() in treeBotany: ridged radial displacement and more sides), dead broken limbs, moss pads, lichen discs, and hanging fruit,
 * catkins or cones by species. Leaf cards carry `aShed` thresholds so autumn and winter drop them card by card and leave the twig network bare; fruit
 * carries its own later thresholds. Used only for the nearest `DETAIL_RULES.maxHeroTrees` trees inside the hero radius (src/game/detailLevel.ts). */
import {TILE} from './botanicalMaterial';
import type {BotanicalSpecies} from './botanicalSpecies';
import type {BOTANICAL_PRIMS,BotanicalCrown} from './treeBotany';

type V3=[number,number,number];
type Rgb=[number,number,number];
export type Seg={pts:V3[];radii:number[]};
type Prims=typeof BOTANICAL_PRIMS;
export type HeroCtx={sp:BotanicalSpecies;a:InstanceType<Prims['Acc']>;crown:BotanicalCrown;H:number;age:number;rh:()=>number;bark:(t:number,ang:number)=>Rgb};

/** triangles the hero pass may add on top of the lod 0 tree, by architecture (the M1 cap on the number of hero trees does the rest) */
export const HERO_EXTRA_TRIS:Record<string,number>={decurrent:2900,weeping:2200,umbrella:2400,bottle:2000,mangrove:2400,shrub:1600,whorl:2200,column:1500,palm:1400,snag:900};

type FruitKind='acorn'|'nut'|'catkin'|'berry'|'samara'|'cone'|'upcone'|'gumnut'|'olive'|'pod';
type Fruit={kind:FruitKind;n:number;col:Rgb;shed:number;size:number};
/** which fruit a species carries at the near tier; thresholds compare with the tree's leaf density (autumn), -1 = stays all year */
const FRUIT:Record<string,Fruit>={
 oak:{kind:'acorn',n:14,col:[.5,.36,.16],shed:.32,size:1},beech:{kind:'nut',n:10,col:[.46,.3,.14],shed:.32,size:1},birch:{kind:'catkin',n:12,col:[.66,.58,.3],shed:.85,size:1},
 maple:{kind:'samara',n:12,col:[.62,.5,.26],shed:.55,size:1},poplar:{kind:'catkin',n:12,col:[.5,.28,.2],shed:.85,size:1.2},willow:{kind:'catkin',n:12,col:[.74,.7,.34],shed:.85,size:1},
 hawthorn:{kind:'berry',n:20,col:[.62,.1,.07],shed:.3,size:1},scotsPine:{kind:'cone',n:9,col:[.42,.27,.14],shed:-1,size:1},stonePine:{kind:'cone',n:6,col:[.4,.25,.12],shed:-1,size:1.6},
 spruce:{kind:'cone',n:12,col:[.4,.26,.14],shed:-1,size:1.5},fir:{kind:'upcone',n:9,col:[.36,.26,.2],shed:-1,size:1.2},cedar:{kind:'upcone',n:8,col:[.4,.3,.2],shed:-1,size:1.3},
 cypress:{kind:'cone',n:14,col:[.36,.3,.18],shed:-1,size:.8},juniper:{kind:'berry',n:20,col:[.2,.24,.4],shed:-1,size:1},krummholz:{kind:'cone',n:7,col:[.4,.28,.16],shed:-1,size:.8},
 acacia:{kind:'pod',n:10,col:[.5,.4,.2],shed:-1,size:1},baobab:{kind:'pod',n:4,col:[.5,.42,.3],shed:-1,size:2.2},mangrove:{kind:'pod',n:9,col:[.32,.42,.16],shed:-1,size:1.3},
 olive:{kind:'olive',n:18,col:[.3,.34,.14],shed:-1,size:1},eucalyptus:{kind:'gumnut',n:14,col:[.4,.38,.28],shed:-1,size:1},tamarisk:{kind:'catkin',n:10,col:[.7,.5,.5],shed:.85,size:.8},
};
/** leaf shapes per species for twig sprays: single leaves of several outlines, with a few small-leaf sprigs for density */
const LEAF_TILES:Record<string,number[]>={
 oak:[TILE.lobed,TILE.lobed,TILE.leaf],beech:[TILE.leaf,TILE.leaf,TILE.toothed],birch:[TILE.toothed,TILE.toothed,TILE.small],maple:[TILE.palmate,TILE.palmate,TILE.leaf],poplar:[TILE.toothed,TILE.leaf],
 willow:[TILE.narrow],hawthorn:[TILE.lobed,TILE.leaf,TILE.small],olive:[TILE.narrow,TILE.narrow,TILE.leaf],eucalyptus:[TILE.narrow,TILE.leaf],acacia:[TILE.small,TILE.small],tamarisk:[TILE.small,TILE.narrow],
 mangrove:[TILE.leaf,TILE.leaf],baobab:[TILE.palmate,TILE.leaf],
};
const CARD_SCALE:Record<number,number>={[TILE.leaf]:.34,[TILE.lobed]:.4,[TILE.palmate]:.42,[TILE.toothed]:.34,[TILE.small]:.5,[TILE.narrow]:.5,[TILE.sprig]:.55};

const add=(a:V3,b:V3):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a:V3,k:number):V3=>[a[0]*k,a[1]*k,a[2]*k];
const norm=(a:V3):V3=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

export function heroPass(P:Prims,c:HeroCtx,rec:readonly Seg[],baseTris:number){
 const {sp,a,crown,H,rh,age}=c,cap=baseTris+(HERO_EXTRA_TRIS[sp.arch]??1500),tris=()=>a.idx.length/3;
 const room=(n:number)=>tris()+n<=cap;
 const trunk=rec[0];if(!trunk)return;
 const r0=trunk.radii[0];
 // ---- bark colour variants for twigs and dead wood (the tree's own bark function, so species colour carries through)
 const grey=(t:number,ang:number):Rgb=>{const b=c.bark(t,ang),g=.2+.22*(.5+.5*Math.sin(ang*7+t*9));return [b[0]*.5+g*.5,b[1]*.5+g*.5,b[2]*.5+g*.48];};
 const mossCr:BotanicalCrown={...crown,top:[.42,.62,.24],bottom:[.2,.3,.1],dark:.9};
 const fruitFn=sp.group==='conifer'||sp.arch==='whorl';
 // ---- 1. root buttresses and surface roots: longer, thinner, between the lod 0 buttresses
 if(sp.flare>.2&&sp.arch!=='palm'){
  const n=sp.flare>.55?5:3;
  for(let i=0;i<n;i++){const an=(i+.5)/n*Math.PI*2+rh()*.9,d:V3=[Math.cos(an),0,Math.sin(an)],L=r0*(1.9+rh()*1.5);
   P.tube(a,[[d[0]*r0*.5,r0*.55,d[2]*r0*.5],[d[0]*r0*1.4,r0*.2,d[2]*r0*1.4],[d[0]*L*.7+d[2]*r0*.25,-.02,d[2]*L*.7-d[0]*r0*.25],[d[0]*L,-.04,d[2]*L]],[r0*.34,r0*.24,r0*.15,r0*.07],5,c.bark);}
 }
 // ---- 2. dead and broken limbs on the trunk (more on old trees); grey wood, never any leaf
 {const nd=age===2?2:rh()<.4?1:0;
  for(let i=0;i<nd&&room(80);i++){
   const ti=Math.floor(lerp(.35,.8,rh())*(trunk.pts.length-1)),p=trunk.pts[ti],an=rh()*Math.PI*2,d:V3=norm([Math.cos(an),.55+rh()*.5,Math.sin(an)]),L=.9+rh()*1.1,r=trunk.radii[ti]*.34;
   const e=add(p,mul(d,L)),m=add(add(p,mul(d,L*.5)),[0,L*.06,0]);
   P.tube(a,[p,m,e],[r,r*.7,r*.4],5,grey,.9,0,true);
   for(let k=0;k<2;k++){const q=add(p,mul(d,L*(.4+k*.25))),sd=norm([d[0]+(rh()-.5)*1.4,d[1]*.5+.2,d[2]+(rh()-.5)*1.4]);P.tube(a,[q,add(q,mul(sd,L*.35))],[r*.4,r*.14],3,grey,.9,0,true);}
  }}
 // ---- 3. lichen discs and moss pads on the trunk and the larger limbs
 {const nl=sp.bark.pattern==='birch'?6:12,mossy=sp.bark.moss;
  for(let i=0;i<nl&&room(30);i++){
   const t=lerp(.08,.95,rh()),ti=Math.min(trunk.pts.length-1,Math.floor(t*(trunk.pts.length-1))),p=trunk.pts[ti],r=trunk.radii[ti],an=rh()*Math.PI*2,d:V3=[Math.cos(an),0,Math.sin(an)],ctr=add(p,mul(d,r*1.012)),
    up:V3=[0,1,0],side=cross(d,up),rr=.035+rh()*.06,col:Rgb=rh()<.5?[.78,.82,.6]:[.88,.86,.7],ids:number[]=[];
   const hub=a.v(ctr,d,[.5,.5],mul(col,.95) as Rgb,0,-1);
   for(let k=0;k<7;k++){const an2=k/7*Math.PI*2,rad=rr*(.7+.5*Math.sin(an2*3+i)),q=add(add(ctr,mul(side,Math.cos(an2)*rad)),mul(up,Math.sin(an2)*rad*1.2));ids.push(a.v(q,d,[.5,.5],mul(col,.8) as Rgb,0,-1));}
   for(let k=0;k<7;k++)a.tri(hub,ids[k],ids[(k+1)%7]);
  }
  const nm=mossy>.2?3+Math.floor(mossy*6):0;
  for(let i=0;i<nm&&room(60);i++){
   if(i<3){const an=rh()*1.6-.8,d:V3=[Math.cos(an+1),0,Math.sin(an+1)],ro=r0*(1.0+rh()*.6);P.core(a,mossCr,[d[0]*ro,r0*(.35+rh()*.5),d[2]*ro],[r0*.42,r0*.18,r0*.42],0,rh,.85,-1);}
   else{const s=rec[1+Math.floor(rh()*Math.min(rec.length-1,10))];if(!s||s.radii[0]<.05)continue;const k=Math.floor(rh()*(s.pts.length-1)),p=s.pts[k],r=s.radii[k];P.core(a,mossCr,add(p,[0,r*.85,0]),[r*1.1+.03,r*.35,r*1.1+.03],0,rh,.85,-1);}
  }}
 // ---- 4. twig sprays at the limb ends (broadleaf and shrub architectures), then fruit
 const tips:{p:V3;d:V3;r:number}[]=[];
 for(let i=1;i<rec.length;i++){const s=rec[i],n=s.pts.length,e=s.pts[n-1];if(n<2||e[1]<H*.2||s.radii[n-1]>.1)continue;if(s.radii[0]<.012)continue;tips.push({p:e,d:norm(sub(e,s.pts[n-2])),r:s.radii[n-1]});}
 const broad=sp.arch==='decurrent'||sp.arch==='weeping'||sp.arch==='umbrella'||sp.arch==='bottle'||sp.arch==='mangrove'||sp.arch==='shrub';
 const tiles=LEAF_TILES[sp.id]??[TILE.leaf,TILE.leaf,TILE.small],evergreenBroad=sp.evergreen&&broad;
 if(broad&&sp.arch!=='bottle'||broad&&sp.id==='baobab'){
  const sz=(sp.cardSize[0]+sp.cardSize[1])/2;
  for(const tp of tips){
   if(!room(120))break;
   const nTw=2+(rh()<.5?1:0);
   for(let k=0;k<nTw&&room(70);k++){
    const sp0=.6+rh()*.8,ang=rh()*Math.PI*2,d=norm([tp.d[0]+Math.cos(ang)*sp0,tp.d[1]*.6+(rh()-.3)*.6,tp.d[2]+Math.sin(ang)*sp0]),L=(.45+rh()*.5)*(.7+.3*sz),e=add(tp.p,mul(d,L)),m=add(add(tp.p,mul(d,L*.5)),[0,-.03*L,0]);
    P.tube(a,[tp.p,m,add(e,[0,-.06*L,0])],[Math.max(.008,tp.r*.7),.007,.003],3,c.bark,.9);
    // side twiglet
    const sdir=norm([d[0]+(rh()-.5)*1.5,d[1]*.5+.15,d[2]+(rh()-.5)*1.5]),sb=add(tp.p,mul(d,L*.45));P.tube(a,[sb,add(sb,mul(sdir,L*.45))],[.006,.003],3,c.bark,.9);
    // leaves along the twig and its twiglet: alternate sides, each its own outline, size, angle and fall threshold
    const nC=Math.round(4+rh()*2.4);
    for(let j=0;j<nC&&room(2);j++){
     const t=.3+.7*(j/(nC-1||1)),onSide=j%3===2,base=onSide?add(sb,mul(sdir,L*.45*t)):add(tp.p,mul(d,L*t)),axis0=onSide?sdir:d,tile=tiles[Math.floor(rh()*tiles.length)%tiles.length];
     const side=j%2?1:-1,ax=norm([axis0[0]+side*.35*(rh()+.3),axis0[1]-.15+rh()*.35,axis0[2]+(rh()-.5)*.7]),rgt=norm(cross(ax,norm([rh()-.5,1,rh()-.5]))),sc=CARD_SCALE[tile]??.4,w=sz*sc*(.7+.6*rh())*(.9-.25*(1-t));
     const lc:BotanicalCrown={...crown};
     P.card(a,lc,base,rgt,ax,w*.5,w*.5*(1.05+rh()*.35),tile,.04+rh()*.9,1,.96+rh()*.08,.7,true);
    }
   }
  }
 }
 // ---- 5. conifers: dead lower boughs and cones
 if(sp.arch==='whorl'&&room(150)){
  for(let i=0;i<7&&room(60);i++){const y=H*(.06+rh()*.22),an=rh()*Math.PI*2,d:V3=[Math.cos(an),-.08-rh()*.2,Math.sin(an)],ti=Math.min(trunk.pts.length-1,Math.floor(y/H*(trunk.pts.length-1))),p=trunk.pts[ti],L=.45+rh()*.7;
   const q=add(p,[Math.cos(an)*trunk.radii[ti]*.8,0,Math.sin(an)*trunk.radii[ti]*.8]);P.tube(a,[q,add(q,mul(d,L*.5)),add(q,mul(d,L))],[.035,.024,.01],3,grey,.8,0,true);}
 }
 const fr=FRUIT[sp.id];
 if(fr&&sp.arch!=='palm'&&room(80)){
  const pool=tips.length?tips:[{p:[0,H*.6,0] as V3,d:[0,1,0] as V3,r:.02}],n=Math.min(fr.n,Math.max(4,Math.floor(pool.length*.8)));
  const tint=(col:Rgb)=>col;
  for(let i=0;i<n&&room(40);i++){
   const tp=pool[Math.floor(rh()*pool.length)],jit:V3=[(rh()-.5)*.35,-(rh()*.15),(rh()-.5)*.35],at=add(tp.p,jit),s=fr.size,fcr:BotanicalCrown={...crown,top:tint(fr.col),bottom:mul(fr.col,.6) as Rgb,dark:1};
   switch(fr.kind){
    case 'acorn':case 'nut':case 'olive':case 'gumnut':case 'berry':{
     const st=add(at,[0,-.09,0]),r=(fr.kind==='berry'?.017:fr.kind==='olive'?.022:.026)*s;
     P.tube(a,[at,st],[.004,.003],3,c.bark,.8);
     P.core(a,fcr,add(st,[0,-r*1.1,0]),fr.kind==='olive'?[r*.8,r*1.3,r*.8]:[r,r*1.15,r],0,rh,1,fr.shed);
     if(fr.kind==='acorn'||fr.kind==='nut'||fr.kind==='gumnut')P.core(a,{...fcr,top:mul(fr.col,.55) as Rgb,bottom:mul(fr.col,.4) as Rgb},add(st,[0,-r*.1,0]),[r*1.1,r*.55,r*1.1],0,rh,1,fr.shed);
     break;}
    case 'catkin':{
     const len=(.22+rh()*.12)*s,w=.035*s,dir:V3=sp.id==='willow'?[0,1,0]:[0,-1,0],sw:V3=[(rh()-.5)*.08,0,(rh()-.5)*.08],pts:V3[]=[at,add(add(at,mul(dir,len*.5)),sw),add(add(at,mul(dir,len)),mul(sw,1.6))];
     P.strip(a,fcr,pts,[w*.5,w,w*.4],TILE.solid,[1,0,rh()-.5],fr.shed,0,1,()=>fr.col,.5);
     P.strip(a,fcr,pts,[w*.5,w,w*.4],TILE.solid,[rh()-.5,0,1],fr.shed,0,.9,()=>mul(fr.col,.85) as Rgb,.5);
     break;}
    case 'samara':{
     for(const sg of [-1,1]){const dir=norm([sg*.7,-.5,(rh()-.5)*.3]),rgt:V3=[0,0,1],e=add(at,mul(dir,.1*s));P.strip(a,fcr,[add(at,[0,-.02,0]),e],[.012,.03*s],TILE.solid,rgt,fr.shed,0,1,()=>fr.col,.5);}
     break;}
    case 'pod':{
     const len=(.14+rh()*.1)*s;P.tube(a,[at,add(at,[0,-len*.5,0]),add(at,[(rh()-.5)*.05,-len,0])],[.008*s,.012*s,.006*s],4,c.bark,1.1);break;}
    case 'cone':case 'upcone':{
     const up=fr.kind==='upcone',len=(.14+rh()*.06)*s,r=len*.34,base=up?add(at,[0,-.05,0]):add(at,[0,-.08,0]),ctr=up?add(base,[0,len*.5,0]):add(base,[0,-len*.55,0]);
     P.core(a,fcr,ctr,[r,len*.55,r],0,rh,1,fr.shed);break;}
   }
  }
 }
 // ---- 6. palms: leaf-base scars up the trunk and drooping dead fronds
 if(sp.arch==='palm'&&room(60)){
  const n=10;for(let i=0;i<n&&room(24);i++){const t=(i+.5)/n*.85,ti=Math.min(trunk.pts.length-1,Math.floor(t*(trunk.pts.length-1))),p=trunk.pts[ti],r=trunk.radii[ti];
   P.tube(a,[add(p,[0,-.03,0]),add(p,[0,.03,0])],[r*1.07,r*1.07],7,c.bark,.7);}
 }
}
