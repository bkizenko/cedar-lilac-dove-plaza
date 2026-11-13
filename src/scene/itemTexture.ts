/** ITEM TEXTURES: one procedural surface atlas for every weapon, tool and carried item. Pure (no three.js, no DOM, no network, no Math.random).
 *
 *  BLUF: vertex colours cannot show grain, so each primitive carries a surface layer. `buildAtlas(seed)` generates, from a seed and fixed formulas,
 *   - a DETAIL array (rgb = luminance/tint multiplier around 0.5, 2x in the shader) and a MATERIAL array (rg = tangent-space normal, b = roughness, a = metalness),
 *     one layer per substance (wood grain, planks with seams, leather pores, hide, twisted cord, plaited weave, cloth, hammered bronze, forge-scaled iron,
 *     brushed pattern-welded steel, flaked flint, glassy obsidian, bone, burnished clay, stone, riveted plate), all tileable so metric UVs repeat them;
 *   - a DECAL atlas (8 x 8 cells, 8 bit coverage) holding painted shield motifs (stripes, chevrons, rings, spiral, lozenges, fret, rays, quarters,
 *     dots, teeth, zigzag, diagonal) and one cell per civ EMBLEM, rasterised from the very emblem vectors the banners use (civStyles.ts).
 *  Everything a layer holds is hand-scaled: `TILE_SCALE` says how many repeats per metre each substance wants. */
import {CIVS} from './civStyles';
import type {Prim} from './civStyles';

export const ATLAS_SIZE=192,DECAL_CELL=128,DECAL_GRID=8;
/** Layer numbers of the detail/material arrays. */
export const TILE={NONE:0,WOOD:1,PLANK:2,LEATHER:3,HIDE:4,CORD:5,WEAVE:6,CLOTH:7,BRONZE:8,IRON:9,STEEL:10,FLINT:11,BONE:12,CLAY:13,STONE:14,RIVET:15,OBSIDIAN:16,GOLD:17} as const;
export const TILE_COUNT=18;
export const TILE_NAMES=['none','wood','plank','leather','hide','cord','weave','cloth','bronze','iron','steel','flint','bone','clay','stone','rivet','obsidian','gold'] as const;
/** repeats per metre across (u) and along (v) the surface, per layer */
export const TILE_SCALE:Readonly<Record<number,readonly [number,number]>>=Object.freeze({
 [TILE.NONE]:[1,1],[TILE.WOOD]:[5,3.4],[TILE.PLANK]:[3.8,2.6],[TILE.LEATHER]:[8,8],[TILE.HIDE]:[7,7],[TILE.CORD]:[46,34],[TILE.WEAVE]:[15,15],[TILE.CLOTH]:[22,22],
 [TILE.BRONZE]:[10,6],[TILE.IRON]:[10,6],[TILE.STEEL]:[8,4],[TILE.FLINT]:[16,16],[TILE.BONE]:[9,5],[TILE.CLAY]:[10,10],[TILE.STONE]:[10,10],[TILE.RIVET]:[13,13],[TILE.OBSIDIAN]:[14,14],[TILE.GOLD]:[10,6],
});

// ---------------------------------------------------------------------------------------------------------------- noise (all tileable)
const mod=(a:number,n:number)=>((a%n)+n)%n;
const hash3=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(s|0,1274126177);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
/** periodic value noise 0..1: lattice of px by py cells */
function pn(x:number,y:number,px:number,py:number,s:number){
 const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),x0=mod(xi,px),x1=mod(xi+1,px),y0=mod(yi,py),y1=mod(yi+1,py);
 const a=hash3(x0,y0,s),b=hash3(x1,y0,s),c=hash3(x0,y1,s),d=hash3(x1,y1,s);
 return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
/** periodic Worley noise on an n x n lattice; writes f1, f2, the cell id (0..1) and the offset to the nearest point into W */
const W={f1:0,f2:0,id:0,dx:0,dy:0};
function worley(u:number,v:number,n:number,s:number){
 const x=u*n,y=v*n,xi=Math.floor(x),yi=Math.floor(y);let f1=9,f2=9,id=0,bx=0,by=0;
 for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
  const cx=xi+i,cy=yi+j,wx=mod(cx,n),wy=mod(cy,n),px=cx+hash3(wx,wy,s)*.8+.1,py=cy+hash3(wx,wy,s+77)*.8+.1,dx=x-px,dy=y-py,d=dx*dx+dy*dy;
  if(d<f1){f2=f1;f1=d;id=hash3(wx,wy,s+13);bx=dx;by=dy;}else if(d<f2)f2=d;
 }
 W.f1=Math.sqrt(f1);W.f2=Math.sqrt(f2);W.id=id;W.dx=bx;W.dy=by;
}
const clamp=(x:number,a=0,b=1)=>x<a?a:x>b?b:x;
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const TAU=Math.PI*2;

// ---------------------------------------------------------------------------------------------------------------- tile generators
type Px={m:number;tr:number;tg:number;tb:number;h:number;rough:number;metal:number};
const PX:Px={m:1,tr:1,tg:1,tb:1,h:.5,rough:.82,metal:.03};
type Gen={fn:(u:number,v:number,s:number)=>void;/** normal strength */k:number};
const reset=(r=.82,m=.03)=>{PX.m=1;PX.tr=1;PX.tg=1;PX.tb=1;PX.h=.5;PX.rough=r;PX.metal=m;};

function wood(u:number,v:number,s:number,planks=0){
 reset(.78,.02);
 let uu=u;
 if(planks){const p=Math.floor(u*planks);uu=(u*planks-p);s+=p*17;}
 const w=pn(u*3,v*2,3,2,s+1)*2.2,P=planks||1,
  s1=pn(uu*40*(planks?1:1)+w,v*2,planks?40:40,2,s+2),s2=pn(uu*96+w*2,v*4,96,4,s+3),ring=.5+.5*Math.sin(TAU*(uu*(planks?3:6)+w*.9+(planks?pn(v*2,0,2,1,s+9)*.5:0))),
  pore=pn(uu*220,v*34,220,34,s+4),late=smooth(.62,.95,ring);
 void P;
 PX.m=1+(s1-.5)*.8+(s2-.5)*.5+(ring-.5)*.5-late*.12-(pore>.78?.28:0);
 PX.tr=1+late*.05;PX.tb=1-late*.07;
 PX.h=.5+(s2-.5)*.3+(ring-.5)*.22-(pore>.78?.18:0);
 if(planks){const e=Math.min(Math.abs(u*planks-Math.round(u*planks)),1)/1,seam=1-smooth(0,.045,Math.abs(u*planks-Math.round(u*planks)));PX.m*=1-seam*.75;PX.h-=seam*.5;PX.rough=.9;
  // nails: a dot every third of the length at the plank ends
  const nv=Math.abs(v*3-Math.round(v*3)),nu=Math.abs(uu-.5);if(nu<.16&&nv<.03){const d=Math.hypot(nu*1.0,nv*.9);if(d<.03){PX.m*=.45;PX.h+=.1;PX.rough=.5;PX.metal=.4;}}void e;}
}
function leather(u:number,v:number,s:number){
 reset(.7,.02);worley(u,v,26,s+5);const crease=smooth(.0,.22,W.f2-W.f1),n2=pn(u*60,v*60,60,60,s+6),big=pn(u*5,v*5,5,5,s+7);
 PX.m=.78+crease*.42+(n2-.5)*.22+(big-.5)*.3;PX.h=.35+crease*.5;PX.rough=.62+(1-crease)*.2;
 const fold=Math.abs(pn(u*3,v*7,3,7,s+8)-.5);if(fold<.03){PX.m*=.62;PX.h-=.25;}
 PX.tr=1+(1-crease)*.04;PX.tb=1-(1-crease)*.06;
}
function hide(u:number,v:number,s:number){
 reset(.92,.0);const hair=pn(u*150,v*12,150,12,s+1),hair2=pn(u*320,v*30,320,30,s+2),patch=pn(u*6,v*6,6,6,s+3),pore=pn(u*80,v*80,80,80,s+4);
 PX.m=.72+(hair-.5)*.55+(hair2-.5)*.34+(patch-.5)*.5+(pore>.8?-.15:0);PX.h=.5+(hair-.5)*.3;
 PX.tr=1+(patch-.5)*.1;PX.tb=1-(patch-.5)*.12;
}
function cord(u:number,v:number,s:number){
 reset(.88,0);const tw=TAU*(u*3+v*2.2+pn(u*8,v*8,8,8,s+1)*.12),st=.5+.5*Math.sin(tw),fib=pn(u*90,v*90,90,90,s+2);
 PX.m=.55+st*.7+(fib-.5)*.35;PX.h=.2+st*.7;PX.tr=1+(1-st)*.03;
}
function weave(u:number,v:number,s:number){
 reset(.86,0);const n=6,iu=Math.floor(u*n),iv=Math.floor(v*n),fu=u*n-iu,fv=v*n-iv,over=((iu+iv)&1)===0;
 const along=over?fu:fv,across=over?fv:fu,strand=Math.sin(Math.PI*clamp(across)),edge=smooth(0,.14,across)*smooth(0,.14,1-across),fibre=pn(u*130,v*60,130,60,s+1);
 const cross=over?Math.sin(Math.PI*clamp(along))*.5+.5:.65+.35*Math.sin(Math.PI*clamp(along));
 PX.m=(.45+.75*strand*cross*edge)*(.86+(fibre-.5)*.5)+(pn(u*10,v*10,10,10,s+2)-.5)*.2;PX.h=.15+.75*strand*edge*(over?1:.55);
}
function cloth(u:number,v:number,s:number){
 reset(.93,0);const n=40,a=Math.sin(u*n*TAU)*.5+.5,b=Math.sin(v*n*TAU)*.5+.5,ck=((Math.floor(u*n)+Math.floor(v*n))&1)?a:b,slub=pn(u*6,v*60,6,60,s+1)*.5+pn(u*60,v*5,60,5,s+2)*.5;
 PX.m=.72+ck*.4+(slub-.5)*.5;PX.h=.3+ck*.5;
}
function bronzeLike(u:number,v:number,s:number,gold=false){
 reset(.38,.7);worley(u,v,10,s+3);const facet=hash3(Math.floor(W.id*997),3,s),hamm=smooth(0,.5,W.f2-W.f1),brush=pn(u*260,v*3,260,3,s+4),brush2=pn(u*90,v*2,90,2,s+5),scr=pn(u*40,v*210,40,210,s+6);
 PX.m=.92+(W.id-.5)*.26+(brush-.5)*.34+(brush2-.5)*.18+(hamm-.5)*.2+(scr>.9?.35:0);PX.h=.5+(W.id-.5)*.5-(1-hamm)*.12+(brush-.5)*.06;
 PX.rough=clamp(.34+(1-brush)*.18+(1-hamm)*.1-(scr>.9?.12:0));PX.metal=gold?.8:.6;
 PX.tr=1+(W.id-.5)*.05;PX.tb=1-(W.id-.5)*.06;void facet;
}
function iron(u:number,v:number,s:number){
 reset(.6,.5);const scale=pn(u*34,v*34,34,34,s+1),pit=pn(u*110,v*110,110,110,s+2),streak=pn(u*180,v*4,180,4,s+3),hamm=(worley(u,v,12,s+4),W.f2-W.f1),bright=pn(u*14,v*7,14,7,s+5);
 PX.m=.78+(scale-.5)*.5+(streak-.5)*.3+smooth(0,.4,hamm)*.18-(pit>.82?.34:0)+(bright>.7?.28:0);PX.h=.5+(scale-.5)*.35-(pit>.82?.35:0);
 PX.rough=clamp(.48+(1-streak)*.18+(pit>.82?.3:0)-(bright>.7?.18:0));PX.metal=pit>.82?.15:.5;
 PX.tr=1+(pit>.82?.1:0);PX.tb=1-(pit>.82?.1:0);
}
function steel(u:number,v:number,s:number){
 reset(.26,.82);const fine=pn(u*300,v*2,300,2,s+1),fine2=pn(u*120,v*3,120,3,s+2),wave=.5+.5*Math.sin(TAU*(u*7+pn(u*3,v*3,3,3,s+3)*1.6+v*1.2)),weld=pn(u*22+wave*2.4,v*4,22,4,s+4),scr=pn(u*30,v*300,30,300,s+5);
 PX.m=.98+(fine-.5)*.3+(fine2-.5)*.18+(weld-.5)*.34*(1)+(scr>.93?.4:0);PX.h=.5+(weld-.5)*.12+(fine-.5)*.05;
 PX.rough=clamp(.2+(1-fine)*.16+(weld<.35?.1:0)-(scr>.93?.1:0));PX.metal=.7;
 PX.tr=1-(weld-.5)*.02;PX.tb=1+(weld-.5)*.04;
}
function flint(u:number,v:number,s:number){
 reset(.42,.04);worley(u,v,9,s+1);const id=W.id,ripple=Math.sin(W.f1*46+id*20)*.5+.5,edge=smooth(0,.32,W.f2-W.f1),fine=pn(u*110,v*110,110,110,s+2),cortex=pn(u*5,v*5,5,5,s+3);
 PX.m=.62+(id-.5)*.7+(ripple-.5)*.26*(edge)+(fine-.5)*.2+(edge<.3?-.26:0)+(cortex>.74?.38:0);
 PX.h=.5+(id-.5)*.55+(ripple-.5)*.12-(1-edge)*.22+W.dx*.18-W.dy*.1;PX.rough=(cortex>.74?.9:.36)+(1-edge)*.1;PX.metal=0;
}
function obsidian(u:number,v:number,s:number){
 reset(.12,.04);worley(u,v,5,s+1);const flow=pn(u*10+pn(u*3,v*3,3,3,s+2)*3,v*3,10,3,s+3),ripple=Math.sin(W.f1*38+W.id*10)*.5+.5;
 PX.m=.6+(flow-.5)*.5+(ripple-.5)*.2+(W.id-.5)*.4;PX.h=.5+(W.id-.5)*.4+(ripple-.5)*.08;PX.rough=.1+(1-smooth(0,.3,W.f2-W.f1))*.12;PX.metal=.08;
}
function bone(u:number,v:number,s:number){
 reset(.45,0);const line=pn(u*60+pn(u*4,v*2,4,2,s+1)*3,v*2,60,2,s+2),pore=pn(u*130,v*44,130,44,s+3),sp=pn(u*14,v*7,14,7,s+4);
 PX.m=.94+(line-.5)*.3+(sp-.5)*.26-(pore>.82?.3:0);PX.h=.5+(line-.5)*.2-(pore>.82?.25:0);PX.tr=1+(sp-.5)*.05;PX.tb=1-(sp-.5)*.1;
}
function clay(u:number,v:number,s:number){
 reset(.84,0);const grit=pn(u*90,v*90,90,90,s+1),burn=pn(u*16,v*3,16,3,s+2),slip=pn(u*5,v*5,5,5,s+3),pit=pn(u*140,v*140,140,140,s+4);
 PX.m=.92+(grit-.5)*.34+(burn-.5)*.3+(slip-.5)*.3-(pit>.86?.3:0);PX.h=.5+(grit-.5)*.3-(pit>.86?.25:0);PX.rough=.75-(burn>.6?.18:0);
 PX.tr=1+(slip-.5)*.06;PX.tb=1-(slip-.5)*.08;
}
function stone(u:number,v:number,s:number){
 reset(.9,0);worley(u,v,14,s+1);const g=pn(u*100,v*100,100,100,s+2),band=pn(u*3,v*9,3,9,s+3);
 PX.m=.9+(W.id-.5)*.4+(g-.5)*.4+(band-.5)*.2;PX.h=.5+(W.id-.5)*.5+(g-.5)*.2-smooth(.18,0,W.f2-W.f1)*.2;
}
function rivet(u:number,v:number,s:number){
 reset(.42,.66);const n=4,cu=(u*n)%1-.5,cv=(v*n)%1-.5,d=Math.hypot(cu,cv),dome=smooth(.3,.06,d),brush=pn(u*200,v*3,200,3,s+1),dent=pn(u*16,v*16,16,16,s+2),
  ring=smooth(.32,.3,d)*smooth(.24,.3,d);
 PX.m=.85+dome*.55+(brush-.5)*.3-ring*.35+(dent-.5)*.3;PX.h=.4+dome*.55-ring*.12+(dent-.5)*.1;PX.rough=.36+(1-dome)*.14;PX.metal=.66;
}
/** tile generators, one per layer */
const GENS:Record<number,Gen>={
 [TILE.NONE]:{fn:()=>{reset();PX.m=1;},k:0},
 [TILE.WOOD]:{fn:(u,v,s)=>wood(u,v,s),k:.055},[TILE.PLANK]:{fn:(u,v,s)=>wood(u,v,s,3),k:.07},
 [TILE.LEATHER]:{fn:leather,k:.07},[TILE.HIDE]:{fn:hide,k:.05},[TILE.CORD]:{fn:cord,k:.09},[TILE.WEAVE]:{fn:weave,k:.1},[TILE.CLOTH]:{fn:cloth,k:.06},
 [TILE.BRONZE]:{fn:(u,v,s)=>bronzeLike(u,v,s),k:.06},[TILE.GOLD]:{fn:(u,v,s)=>bronzeLike(u,v,s,true),k:.05},[TILE.IRON]:{fn:iron,k:.08},[TILE.STEEL]:{fn:steel,k:.045},
 [TILE.FLINT]:{fn:flint,k:.11},[TILE.OBSIDIAN]:{fn:obsidian,k:.08},[TILE.BONE]:{fn:bone,k:.035},[TILE.CLAY]:{fn:clay,k:.05},[TILE.STONE]:{fn:stone,k:.09},[TILE.RIVET]:{fn:rivet,k:.12},
};

// ---------------------------------------------------------------------------------------------------------------- decal cells
/** Geometric shield motifs (cells 1..12) over the unit square, a circle of radius .5 being the shield. Return coverage 0..1. */
export const MOTIF_NAMES=['stripes','chevrons','rings','spiral','lozenges','fret','rays','quarters','dots','teeth','zigzag','diagonal'] as const;
export type MotifName=typeof MOTIF_NAMES[number];
export const motifCell=(name:MotifName)=>1+MOTIF_NAMES.indexOf(name);
function motif(name:MotifName,x:number,y:number){
 const cx=x-.5,cy=y-.5,r=Math.hypot(cx,cy)*2,ang=Math.atan2(cy,cx);
 switch(name){
  case 'stripes':return Math.abs(cx)<.07||(Math.abs(Math.abs(cx)-.24)<.055)?1:0;
  case 'chevrons':{let m=0;for(let k=0;k<3;k++){const d=Math.abs(cy*2*.0+(-cy)-(Math.abs(cx)*.8)+.33-k*.2);if(d<.045&&cy>-.45)m=1;}return m;}
  case 'rings':return Math.abs(r-.72)<.05||Math.abs(r-.46)<.04||r<.12?1:0;
  case 'spiral':{const a=((ang/TAU)+r*2.4+10)%1;return a<.17&&r>.16&&r<.95?1:0;}
  case 'lozenges':{const a=Math.abs(((x*5)%1)-.5)+Math.abs(((y*5)%1)-.5);return a<.26&&r<.92?1:0;}
  case 'fret':{const q=Math.floor((r<.9?x:0)*6),h=Math.floor(y*6);return r<.92&&r>.42&&((q+h)&1)===0&&Math.abs(Math.abs(cx)-Math.abs(cy))<.32?1:0;}
  case 'rays':{const a=(ang/TAU*14+14)%1;return r>.3&&r<.95&&a<.4?1:0;}
  case 'quarters':return (cx>0)!==(cy>0)&&r<.94?1:0;
  case 'dots':{const ring=Math.abs(r-.78)<.07,a=(ang/TAU*14+14)%1;return ring&&a<.5?1:0;}
  case 'teeth':{const a=(ang/TAU*30+30)%1;return r>.86&&r<.98&&a<.5?1:0;}
  case 'zigzag':{const z=Math.abs(((x*4)%1)-.5)*.5;let m=0;for(let k=-1;k<=1;k++)if(Math.abs(cy-k*.28+(z-.12))<.045&&r<.95)m=1;return m;}
  case 'diagonal':return Math.abs(cx+cy)<.1&&r<.95?1:0;
 }
}
/** coverage of one emblem vector (civStyles Prim list) at (x,y) in 0..1, y down */
function inPoly(pts:[number,number][],x:number,y:number){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;}
function distSeg(px:number,py:number,a:[number,number],b:[number,number]){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?clamp(((px-a[0])*dx+(py-a[1])*dy)/l):0;return Math.hypot(px-a[0]-dx*t,py-a[1]-dy*t);}
function emblemCover(prims:readonly Prim[],x:number,y:number){
 for(const p of prims){
  if(p.k==='poly'){if(inPoly(p.pts,x,y))return 1;}
  else if(p.k==='circle'){if(Math.hypot(x-p.c[0],y-p.c[1])<=p.r)return 1;}
  else{for(let i=0;i<p.pts.length-1;i++)if(distSeg(x,y,p.pts[i],p.pts[i+1])<=p.w/2)return 1;}
 }
 return 0;
}
/** All emblem ids the atlas holds: the 14 civ bibles' emblems then the extras any registered skin uses. Stable order. */
export const EMBLEMS:{id:string;prims:readonly Prim[]}[]=(()=>{const seen=new Map<string,readonly Prim[]>();for(const id of Object.keys(CIVS).sort())seen.set(CIVS[id as keyof typeof CIVS].emblem.id,CIVS[id as keyof typeof CIVS].emblem.prims);return [...seen].map(([id,prims])=>({id,prims}));})();
export const FIRST_EMBLEM_CELL=16;
export const emblemCell=(emblemId:string|undefined)=>{
 let i=EMBLEMS.findIndex(e=>e.id===emblemId);
 if(i<0){let h=0x811c9dc5;for(const ch of String(emblemId??'')){h^=ch.charCodeAt(0);h=Math.imul(h,0x01000193);}i=(h>>>0)%EMBLEMS.length;} // unknown (remix) emblem: a stable kin of the civ emblems
 return FIRST_EMBLEM_CELL+i;
};

// ---------------------------------------------------------------------------------------------------------------- atlas
export type Atlas={size:number;layers:number;/** RGBA8 per layer: rgb detail multiplier / 2, a unused */detail:Uint8Array;/** RGBA8 per layer: normal x, normal y, roughness, metalness */material:Uint8Array;
 decal:Uint8Array;decalSize:number;/** checksum of every byte, for determinism tests */checksum:number;bytes:number;ms:number};
const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
function fnv(a:Uint8Array,h=0x811c9dc5){for(let i=0;i<a.length;i+=7)h=Math.imul(h^a[i],0x01000193);return h>>>0;}
let cached:Map<number,Atlas>|null=null;
export function buildAtlas(seed=1,layers:readonly number[]|null=null):Atlas{
 cached??=new Map();if(!layers){const hit=cached.get(seed);if(hit)return hit;}
 const t0=now(),S=ATLAS_SIZE,L=TILE_COUNT,detail=new Uint8Array(S*S*4*L),material=new Uint8Array(S*S*4*L),H=new Float32Array(S*S);
 for(let l=0;l<L;l++){
  if(layers&&!layers.includes(l))continue;
  const g=GENS[l],s=seed*1009+l*131,base=l*S*S*4,r8=(x:number)=>Math.max(0,Math.min(255,Math.round(x)));
  const tmp:{m:number;tr:number;tg:number;tb:number;rough:number;metal:number}[]=new Array(S*S);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
   g.fn((x+.5)/S,(y+.5)/S,s);H[y*S+x]=PX.h;tmp[y*S+x]={m:PX.m,tr:PX.tr,tg:PX.tg,tb:PX.tb,rough:PX.rough,metal:PX.metal};
  }
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
   const i=y*S+x,t=tmp[i],dx=(H[y*S+mod(x+1,S)]-H[y*S+mod(x-1,S)])*S*.5*g.k,dy=(H[mod(y+1,S)*S+x]-H[mod(y-1,S)*S+x])*S*.5*g.k,il=1/Math.hypot(dx,dy,1),o=base+i*4;
   const lum=t.m*.5;detail[o]=r8(lum*t.tr*255);detail[o+1]=r8(lum*t.tg*255);detail[o+2]=r8(lum*t.tb*255);detail[o+3]=255;
   material[o]=r8((-dx*il*.5+.5)*255);material[o+1]=r8((-dy*il*.5+.5)*255);material[o+2]=r8(t.rough*255);material[o+3]=r8(t.metal*255);
  }
 }
 // decals
 const D=DECAL_CELL,DG=DECAL_GRID,decal=new Uint8Array(D*DG*D*DG);
 const paint=(cell:number,cov:(x:number,y:number)=>number,salt:number)=>{
  const cx=(cell%DG)*D,cy=Math.floor(cell/DG)*D;
  for(let y=0;y<D;y++)for(let x=0;x<D;x++){
   let a=0;for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++){const u=(x+(sx+.5)/2)/D,v=(y+(sy+.5)/2)/D;
    // hand-painted wobble: edges drift a little so no two strokes are ruler straight
    const wx=(pn(u*6,v*6,6,6,salt)-.5)*.018,wy=(pn(u*6+3,v*6,6,6,salt+1)-.5)*.018;a+=cov(u+wx,v+wy);}
   const thick=.86+.14*pn(x/D*14,y/D*14,14,14,salt+2);
   decal[(cy+y)*D*DG+cx+x]=Math.round(clamp(a/4*thick)*255);
  }
 };
 {
  MOTIF_NAMES.forEach((n,i)=>paint(1+i,(x,y)=>motif(n,x,1-y),i*5+3));
  EMBLEMS.forEach((e,i)=>paint(FIRST_EMBLEM_CELL+i,(x,y)=>{const u=(x-.11)/.78,v=(y-.11)/.78;return u<0||u>1||v<0||v>1?0:emblemCover(e.prims,u,v);},i*7+91));
 }
 const checksum=(fnv(detail)^Math.imul(fnv(material),31)^Math.imul(fnv(decal),131))>>>0;
 const a:Atlas={size:S,layers:L,detail,material,decal,decalSize:D*DG,checksum,bytes:detail.length+material.length+decal.length,ms:now()-t0};
 if(!layers)cached.set(seed,a);return a;
}
/** bytes of GPU memory the atlas costs once mipmapped (each level is a quarter of the one above) */
export const atlasGpuBytes=(a:Atlas)=>Math.round((a.detail.length+a.material.length)*4/3+a.decal.length*4/3);
export const clearAtlasCache=()=>{cached=null;};
