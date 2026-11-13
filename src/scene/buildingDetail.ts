/** Procedural dwelling dressing: the construction detail and individual wear that make a hut or house read as built by hand.
 * Pure: reads the massing a generator already emitted (wall mass, roof mass, door) and appends small seeded Parts to it.
 * Used by the per-civ grammars (civBuildings.ts) and the Village families (buildingFamilies.ts) through a material map, so the
 * same dressing works on civ swatches and on carved palette ids. Every added part is near-only (lod 0) unless it carries
 * a mid-distance read (wall courses, thatch ledges, base skirt: lod 1), touches the massing (no floaters) and stays within the
 * massing's own extent, so footprint and budgets hold. The seed is the caller's, so two huts in one village never match.
 *
 * What it adds (studied from the Codex-era hut: banded daub walls, stepped overhanging thatch, dark framed door, plank seams):
 *  walls   courses or posts and rails, daub/plaster patches, a lashing band, earth skirt or footing stones, soot over the door
 *  roofs   stepped thatch ledges with lap lines, ragged eave fringe, rafter ends, ridge roll and pole ends, smoke hole
 *  yard    firewood stack, pots, a leaning tool, a sack or basket, hanging herbs, chosen per building from a seeded set */
import {beam,partBounds,partTriangles,part,pick,range,seededRandom,type LodTier,type Part,type Rng} from './buildingParts';

type M=Part['mat'];
export type DetailMats={wall:M;wall2:M;roof:M;trim:M;accent:M;cloth:M;ground:M;dark:M};
export type DetailOpts={/** 0 new .. 1 ruined-ish */wear:number;wealth:number;era:number;footprint:{w:number;d:number};/** 'house' (default) or 'granary' (fewer wall marks, more sacks) */kind?:'house'|'granary'|'shed'};
type V=[number,number,number];

/** Opt-in muted adult tone for civ swatches (default off: the approved presets stay byte for byte). */
let mute=false;
export const setBuildingMute=(on:boolean)=>{mute=!!on;};
export const getBuildingMute=()=>mute;
const clamp=(v:number,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
/** Desaturate and darken a hex colour toward a weathered, earthy value: saturation x .55 (cap .4), lightness x .93. */
export function muteHex(hex:string):string{
 const n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;
 if(!d)return hex;
 const s=d/(1-Math.abs(2*l-1)),h=(mx===r?((g-b)/d+(g<b?6:0)):mx===g?(b-r)/d+2:(r-g)/d+4)*60;
 const s2=Math.min(s*.55,.4),l2=clamp(l*.93,.08,.88),c=(1-Math.abs(2*l2-1))*s2,x=c*(1-Math.abs((h/60)%2-1)),m=l2-c/2;
 const [rr,gg,bb]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
 return '#'+[rr+m,gg+m,bb+m].map(v=>Math.round(clamp(v)*255).toString(16).padStart(2,'0')).join('');
}
export function muteTable<T extends Record<string,{hex:string}>>(t:T):T{
 if(!mute)return t;
 return Object.fromEntries(Object.entries(t).map(([k,v])=>[k,{...v,hex:muteHex(v.hex)}])) as T;
}

const ROOFY=new Set(['cone','prism','hip','pyramid','wedge','sphere']);
const rotY=(p:Part)=>Math.abs(p.rot?.[1]??0),tilted=(p:Part)=>!!p.rot&&(Math.abs(p.rot[0])>.05||Math.abs(p.rot[2])>.05);

/** Dress `parts` in place. Returns the number of parts added. */
export function dressDwelling(parts:Part[],m:DetailMats,r:Rng,o:DetailOpts):number{
 const n0=parts.length,add=(p:Part)=>void parts.push(p),room=clamp(1330-parts.filter(p=>p.size[2]>=.05).reduce((a,p)=>a+partTriangles(p),0),0,650),f=room/650,pr=seededRandom(Math.floor(r()*4294967296)); // richness: busy massings get fewer extras so the near budget holds
 const box=(mat:M,size:V,pos:V,lod:LodTier=0,rot?:V)=>add(part('box',mat,size,pos,lod,rot));
 const cyl=(mat:M,dia:number,h:number,pos:V,lod:LodTier=0,sides=6,rot?:V,top?:number)=>add(part('cylinder',mat,[dia,h,top??dia],pos,lod,rot,sides));
 const solid=parts.filter(p=>!p.ends&&p.lod>=1&&p.mat!==m.cloth);
 // ---- wall mass: the biggest upright block that starts at the ground
 let wall:Part|null=null,wa=0;
 for(const p of solid){if(p.shape!=='box'&&p.shape!=='cylinder')continue;if(tilted(p)||p.size[1]+p.pos[1]<.9||p.size[1]<.4||p.pos[1]>1.2||p.lod<2)continue;const a=p.shape==='box'?p.size[0]*p.size[2]:Math.PI*p.size[0]*p.size[0]/4;if(a>wa){wa=a;wall=p;}}
 if(!wall)return 0;
 const wb=partBounds(wall),H=wall.size[1]+wall.pos[1],round=wall.shape==='cylinder',cx=wall.pos[0],cz=wall.pos[2];
 const sides=wall.sides??8,Rb=wall.size[0]/2,Rt=wall.size[2]/2,apo=Math.cos(Math.PI/sides);
 // ---- roof mass: biggest roof shape resting on or above the wall top
 let roof:Part|null=null,ra=0;
 for(const p of solid){if(!ROOFY.has(p.shape)||p.lod<2||p.pos[1]<H*.5)continue;const a=p.shape==='cone'?p.size[0]*p.size[0]:p.size[0]*p.size[2];if(a>ra){ra=a;roof=p;}}
 // ---- door: a dark/accent upright leaf near the front on the ground
 const door=parts.find(p=>p.shape==='box'&&(p.mat===m.dark||p.mat===m.accent)&&p.pos[1]<.5&&p.size[1]>1.1&&p.size[1]<2.3&&p.size[0]<1.6&&p.size[2]<.35&&p.pos[2]>wb.minZ+(wb.maxZ-wb.minZ)*.4);
 const doorX=door?door.pos[0]:0,doorTop=door?door.pos[1]+door.size[1]:1.7,front=round?cz+Rb*apo:wb.maxZ;
 const lim={x:o.footprint.w/2-.12,z:o.footprint.d/2-.12},cl=(v:number,l:number)=>Math.max(-l,Math.min(l,v));
 const gran=o.kind==='granary',wearK=clamp(o.wear,0,1);
 const style=r(),wallStyle=style<.4?0:style<.75?1:2;
 const radAt=(t:number)=>Rb+(Rt-Rb)*t;
 // ================================================= walls
 if(o.kind!=='shed'){ // open-front sheds have no reliable front wall to mark: roof and yard only
 if(round){
  const nc=f>.5?pick(r,[2,3,3,4]):2;
  if(wallStyle!==1)for(let i=0;i<nc;i++){const t=(i+1)/(nc+1),rad=radAt(t)/apo*1.01;cyl(i%2?m.wall2:m.trim,rad*2,.05+r()*.05,[cx,H*t,cz],i===0?1:0,sides);}
  else for(let i=0;i<sides*2;i+=1){const a=(i/(sides*2))*Math.PI*2;if(Math.abs(Math.sin(a/2))<.14)continue;box(m.wall2,[.07,H*.78,.05],[cx+Math.sin(a)*Rb*apo*1.005,H*.1,cz+Math.cos(a)*Rb*apo*1.005],0,[0,a,0]);}
  cyl(m.cloth,radAt(.93)/apo*2.06,.08,[cx,H*.93,cz],1,sides); // lashing band under the eave
  // knots on the band
  for(let i=0;i<2;i++){const a=range(r,.7,2*Math.PI-.7);box(m.accent,[.1,.16,.1],[cx+Math.sin(a)*radAt(.93)/apo*1.03,H*.93-.04,cz+Math.cos(a)*radAt(.93)/apo*1.03],0,[0,a,0]);}
 }else{
  const w=wb.maxX-wb.minX,d=wb.maxZ-wb.minZ;
  if(wallStyle===0){const nc=f>.5?pick(r,[3,4,4]):2;for(let i=1;i<=nc;i++){const y=H*i/(nc+1);box(i%2?m.wall2:m.trim,[w+.03,.05+r()*.035,.04],[(wb.minX+wb.maxX)/2,y,wb.maxZ+.012],i===1?1:0);for(const s of[-1,1])box(i%2?m.wall2:m.trim,[.04,.05,d+.03],[s>0?wb.maxX+.012:wb.minX-.012,y,(wb.minZ+wb.maxZ)/2],0);}}
  else if(wallStyle===1){const nb=pick(r,[3,4,5]);for(let i=0;i<=nb;i++)box(m.wall2,[.1,H*.92,.06],[wb.minX+(i+.0)*w/nb,.04,wb.maxZ+.01],i%2?0:1);box(m.wall2,[w+.05,.09,.07],[(wb.minX+wb.maxX)/2,H*.5,wb.maxZ+.015],0);for(const s of[-1,1])box(m.wall2,[.07,.09,d+.05],[s>0?wb.maxX+.012:wb.minX-.012,H*.5,(wb.minZ+wb.maxZ)/2],0);}
  else{for(const sx of[-1,1])for(const sz of[-1,1])for(let i=0;i<3;i++){const x=(sx>0?wb.maxX:wb.minX)-sx*.09,z=(sz>0?wb.maxZ:wb.minZ)-sz*.09;cyl(i%2?m.wall2:m.trim,.2,.28,[x+sx*.0,H*(.18+i*.3),z],0,5,[0,0,Math.PI/2]);}}
  box(m.cloth,[w+.04,.07,.04],[(wb.minX+wb.maxX)/2,H*.93,wb.maxZ+.012],1);
 }
 // daub / plaster patches (more with wear), never over the doorway
 if(!gran||wearK>.3){const np=1+Math.round(wearK*3)+pick(pr,[0,1,2]);for(let i=0;i<np;i++){
  const pw=.34+pr()*.5,ph=.26+pr()*.36,py=.25+pr()*Math.max(.2,H-.9),mat=pr()<.55?m.wall2:m.ground;
  if(round){const a=range(pr,.8,2*Math.PI-.8),rr=radAt(py/H)*apo/1;box(mat,[pw,ph,.07],[cx+Math.sin(a)*rr,py,cz+Math.cos(a)*rr],0,[0,a,0]);}
  else{const face=pick(pr,[0,0,1,2]),u=range(pr,-.5,.5);let x=(wb.minX+wb.maxX)/2+u*(wb.maxX-wb.minX-pw),z=wb.maxZ+.015;
   if(face===0&&Math.abs(x-doorX)<.8)x=doorX+(x>doorX?1:-1)*.9;
   if(face===0)box(mat,[pw,ph,.06],[cl(x,wb.maxX-pw/2),py,z],0);else box(mat,[.06,ph,pw],[face===1?wb.maxX+.015:wb.minX-.015,py,(wb.minZ+wb.maxZ)/2+u*(wb.maxZ-wb.minZ-pw)],0);}}}
 // base: earth skirt and footing stones, or a moss-dark rubble line
 const baseStyle=pick(r,[0,1,2]);
 if(round){
  if(baseStyle!==2)cyl(m.ground,Rb/apo*2.12,.2+r()*.1,[cx,0,cz],1,sides);
  if(baseStyle!==1){const ns=Math.round(sides*.9);for(let i=0;i<ns;i++){const a=(i+r()*.5)/ns*Math.PI*2;if(Math.abs(Math.sin(a/2))<.2)continue;const s=.2+r()*.2;box(m.wall2,[s,.14+r()*.1,s*.8],[cx+Math.sin(a)*Rb*1.07,0,cz+Math.cos(a)*Rb*1.07],0,[0,a,0]);}}
 }else{
  const w=wb.maxX-wb.minX,d=wb.maxZ-wb.minZ;
  if(baseStyle!==2){box(m.ground,[w+.12,.2,.14],[(wb.minX+wb.maxX)/2,0,wb.maxZ+.04],1);for(const s of[-1,1])box(m.ground,[.14,.2,d+.1],[s>0?wb.maxX+.04:wb.minX-.04,0,(wb.minZ+wb.maxZ)/2],1);}
  if(baseStyle!==1)for(let i=0;i<5;i++){const x=wb.minX+.25+r()*(w-.5);if(Math.abs(x-doorX)<.7)continue;const s=.2+r()*.2;box(m.wall2,[s,.14+r()*.1,s*.8],[x,0,wb.maxZ+.07],0,[0,(r()-.5)*.8,0]);}
 }
 // soot over the door, a darker smear where fire has licked it
 if(door&&!gran)box(m.dark,[(door.size[0]+.15)*(.8+r()*.4),.28+r()*.3,.025],[doorX,doorTop+.12,Math.min(front,door.pos[2])+.07],0);
 }
 // ================================================= roofs
 if(roof&&roof.shape==='cone'){
  const rb=roof.pos,Ro=roof.size[0]/2,Hr=roof.size[1],y0=rb[1],rs=roof.sides??8,rapo=Math.cos(Math.PI/rs),pcx=rb[0],pcz=rb[2];
  const nt=f>.5?pick(r,[3,4,4]):2;
  for(let i=1;i<=nt;i++){const t=i/(nt+1),rad=Ro*(1-t)/rapo;
   cyl(m.roof,rad*2.06,Hr*.075,[pcx,y0+Hr*t-.03,pcz],i<=2?1:0,rs,undefined,rad*1.86); // stepped ledge
   if(i===2)cyl(m.ground,rad*2.02,.03,[pcx,y0+Hr*t+Hr*.05,pcz],0,rs,undefined,rad*1.96);}  // lap line (earthy, not the trim colour)
  const nf=f>.4?Math.min(13,Math.max(8,Math.round(Math.PI*2*Ro/.5))):0;
  for(let i=0;i<nf;i++){const a=(i+r()*.4)/nf*Math.PI*2,h=.22+r()*.2,rr=Ro*.96;box(m.roof,[.1+r()*.05,h,.06],[pcx+Math.sin(a)*rr,y0-h*.8,pcz+Math.cos(a)*rr],0,[.22,a,0]);}
  const nr=f>.7?pick(r,[0,0,6,8]):0;
  for(let i=0;i<nr;i++){const a=(i+.5)/nr*Math.PI*2+r()*.1;add(beam(m.trim,[pcx+Math.sin(a)*Ro*.8,y0+Hr*.12,pcz+Math.cos(a)*Ro*.8],[pcx+Math.sin(a)*Ro*.985,y0-.07,pcz+Math.cos(a)*Ro*.985],.085,0));}
  // smoke hole under a little cap at the apex, offset to one side on a rich roof
  const sx=r()<.5?0:range(r,-.18,.18);
  cyl(m.trim,.34,.16,[pcx+sx,y0+Hr-.17,pcz],1,6);cyl(m.dark,.2,.05,[pcx+sx,y0+Hr-.03,pcz],0,6);
 }else if(roof&&(roof.shape==='prism'||roof.shape==='hip')){
  const rb=partBounds(roof),axisX=rotY(roof)>1,eave=roof.pos[1],rise=roof.size[1],S=roof.size[0],L=roof.size[2],pcx=roof.pos[0],pcz=roof.pos[2];
  const a=Math.atan2(rise,S/2),hs=S/2,hl=L/2;
  // ridge roll and pole ends
  const rl=L*(roof.shape==='hip'?.6:1.0);
  if(axisX)box(m.trim,[rl,.13,.2],[pcx,eave+rise-.03,pcz],1);else box(m.trim,[.2,.13,rl],[pcx,eave+rise-.03,pcz],1);
  if(roof.shape==='prism'&&r()<.75)for(const e of[-1,1]){const ex=axisX?pcx+e*(hl-.05):pcx,ez=axisX?pcz:pcz+e*(hl-.05);
   cyl(m.trim,.12,.42,[ex,eave+rise-.12,ez],0,5,axisX?[0,0,Math.PI/2*e*-1]:[Math.PI/2*e,0,0]);}
  // stepped thatch / shingle laps on both slopes
  const rows=f>.4?pick(r,[2,2,3]):1;
  for(const side of[-1,1])for(let i=0;i<rows;i++){const t=.18+i*(.6/Math.max(1,rows-1)),lx=side*hs*(1-t),y=eave+rise*t,th=side<0?a:-a;
   const pos:V=axisX?[pcx,y+.012,pcz-lx]:[pcx+lx,y+.012,pcz],lenAlong=(roof.shape==='hip'?L*.7:L)-.1-(i%2)*.25;
   add(part('box',m.ground,[.1,.035,lenAlong*.86],pos,0,axisX?[0,Math.PI/2,th]:[0,0,th]));}
  // eave fringe and rafter ends along both long eaves
  const nf=f>.4?Math.max(4,Math.min(9,Math.round(L/.6))):0;
  for(const side of[-1,1])for(let i=0;i<nf;i++){const u=-hl+.3+(i+r()*.4)*(L-.6)/nf,h=.2+r()*.18,e=side*(hs-.02);
   if(axisX)box(m.roof,[.12,h,.1],[pcx+u,eave-h*.7,pcz+e],0,[0,0,0]);else box(m.roof,[.1,h,.12],[pcx+e,eave-h*.7,pcz+u],0);}
  if(f>.7&&r()<.6){const nr=Math.max(3,Math.round(L/.9));for(const side of[-1,1])for(let i=0;i<nr;i++){const u=-hl+.4+(i+.5)*(L-.8)/nr;
   const A:V=axisX?[pcx+u,eave+.08,pcz+side*(hs-.3)]:[pcx+side*(hs-.3),eave+.08,pcz+u],B:V=axisX?[pcx+u,eave-.08,pcz+side*(hs-.02)]:[pcx+side*(hs-.02),eave-.08,pcz+u];add(beam(m.trim,A,B,.085,0));}}
  // smoke hole: a dark patch with a soot streak on the slope away from the door
  const side=r()<.5?-1:1,t=.62,lx=side*hs*(1-t),th=side<0?a:-a,y=eave+rise*t,off=range(r,-hl*.35,hl*.35);
  const sp:V=axisX?[pcx+off,y+.02,pcz-lx]:[pcx+lx,y+.02,pcz+off];
  add(part('box',m.dark,[.42,.05,.5],sp,0,axisX?[0,Math.PI/2,th]:[0,0,th]));
  void rb;
 }
 // ================================================= yard: seeded props by the door
 const side=door&&door.pos[0]>0?-1:r()<.5?-1:1,roomX=(s:number)=>(s>0?lim.x-(round?Math.abs(cx)+Rb:wb.maxX):lim.x+(round?-Math.abs(cx)+Rb:wb.minX));
 void roomX;
 const baseR=round?Rb:Math.max(wb.maxX-wb.minX,.1)/2,px=(s:number,e:number)=>cl((round?cx:(wb.minX+wb.maxX)/2)+s*(baseR+e),lim.x),pz=(e:number)=>cl(front+e,lim.z);
 const props=['wood','pots','tool','sack','herbs','bench','jar'].map(k=>({k,w:r()})).sort((a,b)=>a.w-b.w).map(x=>x.k);
 const np=f>.6?2+(o.wealth>.45?1:0)+(r()<.4?1:0)+(gran?1:0):1;
 for(const k of props.slice(0,np)){
  const s=r()<.7?side:-side;
  switch(k){
   case 'wood':{const x=px(s,.2),rows=pick(r,[2,3]);for(let j=0;j<rows;j++){const n=rows+1-j;for(let i=0;i<n;i++)cyl(i%2?m.trim:m.wall2,.17,.55,[cl(x+(i-(n-1)/2)*.17+(r()-.5)*.02,lim.x),.09+j*.15,pz(-.55)],0,5,[Math.PI/2,0,0]);}break;}
   case 'pots':{const x=px(s,.32);cyl(m.ground,.32,.34,[x,0,pz(.12)],0,6,undefined,.24);cyl(m.accent,.26,.26,[cl(x+s*.3,lim.x),0,pz(.22)],0,6,undefined,.2);if(r()<.6)cyl(m.cloth,.24,.04,[x,.34,pz(.12)],0,6);break;}
   case 'tool':{const x=px(s,-.02),h=1.35+r()*.4;add(beam(m.trim,[x,0,pz(.3)],[x,h,pz(.0)],.06,0));box(m.dark,[.22,.07,.05],[x,h-.02,pz(.0)],0);break;}
   case 'sack':{const x=px(s,.35);box(m.cloth,[.42,.32,.3],[x,0,pz(.15)],0,[0,r()*.8,0]);box(m.cloth,[.28,.14,.2],[x,.32,pz(.15)],0,[0,r(),0]);if(gran)box(m.cloth,[.36,.28,.28],[cl(x-s*.4,lim.x),0,pz(.28)],0,[0,r(),0]);break;}
   case 'herbs':{const hy=Math.min(H-.2,doorTop+.02),x0=doorX+s*(.72+r()*.3);for(let i=0;i<2+pick(r,[0,1]);i++){const x=cl(x0+s*i*.2,lim.x),hh=.3+r()*.18;box(m.trim,[.025,hh*.6,.025],[x,hy-hh*.6,front+.06],0);add(part('cone',i%2?m.accent:m.wall2,[.15,hh,.15],[x,hy-hh*.6-hh,front+.06],0,undefined,4));}break;}
   case 'bench':{const x=px(s,.3);box(m.trim,[.7,.05,.24],[x,.26,pz(.15)],0);box(m.trim,[.06,.26,.2],[x-.28,0,pz(.15)],0);box(m.trim,[.06,.26,.2],[x+.28,0,pz(.15)],0);break;}
   default:{const x=px(s,.3);cyl(m.wall2,.36,.5,[x,0,pz(.1)],0,6,undefined,.3);box(m.cloth,[.3,.05,.3],[x,.5,pz(.1)],0,[0,r(),0]);}
  }
 }
 // hard cap: drop the last-added extras (yard props, then roof marks) until the near tier is back under the carved cap
 let tris=parts.slice(n0).reduce((a,p)=>a+partTriangles(p),0);
 while(parts.length>n0&&tris>room+60)tris-=partTriangles(parts.pop()!);
 return parts.length-n0;
}
