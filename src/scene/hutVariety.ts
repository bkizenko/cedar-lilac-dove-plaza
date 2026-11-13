/** Hut variety (pure): turns the one basic hut a civ grammar emitted into an individual dwelling.
 * Runs on the finished parts of ONE hut (indices from `n0`), seeded per building, so a row of huts in one village differs at a glance at mid zoom:
 *  - plan: width and depth scale separately (round wall -> oval via Part.oval, square -> long house), optional D-shaped back (an apse behind a round wall)
 *  - extensions: a lean-to on a side, a roofed porch over the door, a small annex store, a windbreak hurdle, a drying rack
 *  - walls: a stone/earth plinth course of random height (wall material mix), a painted band on richer huts
 *  - roof: patched thatch on poorer huts (patches follow the cone or gable slope), ridge finial or capped smoke vent on richer ones
 *  - finish follows wealth and age: poor = patches, bare, crooked props; rich = trim, band, neat stacks. No geometry below ground level.
 * All additions are lod 1 (mid-visible, they carry the silhouette) or lod 0 (near only), so mid and near triangle caps hold (checked by test). */
import {beam,part,partBounds,partTriangles,pick,range,type LodTier,type Part,type Rng} from './buildingParts';

type M=Part['mat'];
export type HutMats={wall:M;wall2:M;roof:M;trim:M;accent:M;cloth:M;ground:M;dark:M};
type V=[number,number,number];
/** mid-tier triangles a hut may reach before the later dressing pass (cap 1000 for the whole building) */
const MID_BUDGET=780;
const clamp=(v:number,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
export type HutPlan={kx:number;kz:number;apse:boolean;doorK:[number,number];doorSpread:number};
/** Draw the per-hut plan numbers first (the generator reads doorK/doorSpread while it builds), then call `varyHut` on the result. */
export function hutPlan(r:Rng):HutPlan{
 const shape=r(),kx=shape<.3?range(r,.7,.88):shape<.6?range(r,1.14,1.36):range(r,.92,1.12),kz=shape<.3?range(r,1.14,1.36):shape<.6?range(r,.7,.88):range(r,.9,1.12);
 return {kx,kz,apse:r()<.3,doorK:[range(r,.84,1.16),range(r,.94,1.08)],doorSpread:range(r,.35,2.3)};
}
const isDoorLeaf=(p:Part)=>p.shape==='box'&&p.size[1]>=1.0&&p.size[1]<=2.0&&p.size[2]<=.3&&p.size[0]<=1.3&&p.pos[1]<.3;
/** Non-uniform plan scale of the parts from n0 (door leaves keep their width; beams are rebuilt between scaled endpoints). */
export function scaleHutPlan(parts:Part[],n0:number,kx:number,kz:number){
 for(let i=n0;i<parts.length;i++){const p=parts[i],yawed=p.rot&&Math.abs(p.rot[1])>.05&&Math.abs(Math.sin(p.rot[1]*2))>.1;
  if(p.ends){const [a,b]=p.ends;parts[i]={...beam(p.mat,[a[0]*kx,a[1],a[2]*kz],[b[0]*kx,b[1],b[2]*kz],p.size[0],p.lod),...(p.onlyFrom!==undefined?{onlyFrom:p.onlyFrom}:{})};continue;}
  const k=Math.sqrt(kx*kz),sx=yawed?k:kx,sz=yawed?k:kz,leaf=isDoorLeaf(p),pos:V=[p.pos[0]*kx,p.pos[1],p.pos[2]*kz];
  if(p.shape==='cylinder'){parts[i]={...p,pos,size:[p.size[0]*kx,p.size[1],p.size[2]*kx],oval:(p.oval??1)*kz/kx};continue;}
  if(p.shape==='sphere'||p.shape==='cone'){parts[i]={...p,pos,size:[p.size[0]*kx,p.size[1],p.size[2]*kz]};continue;}
  parts[i]={...p,pos,size:[leaf?p.size[0]:p.size[0]*sx,p.size[1],p.size[2]*sz],...(p.inset!==undefined?{inset:p.inset*kz}:{})};}
}
/** The wall mass of a hut: union bounds of the ground-standing upright parts and the roof cone/gable. */
function massOf(parts:Part[],n0:number){
 let b={minX:1e9,maxX:-1e9,minZ:1e9,maxZ:-1e9,H:0},roof:Part|null=null,ra=0,round=false,wall:Part|null=null,wa=0;
 for(let i=n0;i<parts.length;i++){const p=parts[i];if(p.ends||p.lod<2)continue;
  const big=(p.shape==='box'||p.shape==='cylinder')&&p.pos[1]<.35&&p.size[1]>=1&&!p.rot;
  if(big){const q=partBounds(p);b.minX=Math.min(b.minX,q.minX);b.maxX=Math.max(b.maxX,q.maxX);b.minZ=Math.min(b.minZ,q.minZ);b.maxZ=Math.max(b.maxZ,q.maxZ);b.H=Math.max(b.H,p.pos[1]+p.size[1]);const a=p.size[0]*p.size[2];if(a>wa){wa=a;wall=p;round=p.shape==='cylinder';}}
  else if((p.shape==='cone'||p.shape==='prism'||p.shape==='hip')&&p.pos[1]>.6){const a=p.size[0]*p.size[2];if(a>ra){ra=a;roof=p;}}}
 return {...b,roof,round,wall,ok:b.maxX>b.minX};
}
export function varyHut(parts:Part[],n0:number,m:HutMats,r:Rng,o:{wealth:number;wear:number;plan:HutPlan;footprint:{w:number;d:number}}):number{
 const {plan}=o,start=parts.length;
 if(Math.abs(plan.kx-1)>.001||Math.abs(plan.kz-1)>.001)scaleHutPlan(parts,n0,plan.kx,plan.kz);
 const M=massOf(parts,n0);if(!M.ok)return 0;
 const add=(p:Part)=>void parts.push(p),box=(mat:M,size:V,pos:V,lod:LodTier=0,rot?:V)=>add(part('box',mat,size,pos,lod,rot)),cyl=(mat:M,dia:number,h:number,pos:V,lod:LodTier=0,sides=8,top?:number,oval?:number)=>add({...part('cylinder',mat,[dia,h,top??dia],pos,lod,undefined,sides),...(oval&&oval!==1?{oval}:{})});
 const age=clamp(o.wear*.55+r()*.6),poor=1-clamp(o.wealth*1.1),rich=clamp((o.wealth-.45)*2),H=M.H,cx=(M.minX+M.maxX)/2,cz=(M.minZ+M.maxZ)/2,hx=(M.maxX-M.minX)/2,hz=(M.maxZ-M.minZ)/2;
 const lim={x:o.footprint.w/2-.1,z:o.footprint.d/2-.1},cl=(v:number,l:number)=>Math.max(-l,Math.min(l,v));
 const door=parts.slice(n0).find(isDoorLeaf),dX=door?door.pos[0]:0,front=M.maxZ;
 const roof=M.roof,Ro=roof?roof.size[0]/2:hx,Hr=roof?roof.size[1]:1.2,y0=roof?roof.pos[1]:H;
 // ---- D-shaped plan: a half-height rounded or boxed back behind a round wall
 if(plan.apse&&M.round&&M.wall){const w=M.wall,rad=w.size[0]/2;box(m.wall,[rad*1.7,H*.72,rad*.9],[w.pos[0],0,w.pos[2]-rad*.9],1);box(m.wall2,[rad*1.76,.16,rad*.96],[w.pos[0],H*.72,w.pos[2]-rad*.9],1);}
 // ---- wall material mix: a plinth course of stone/earth, taller on poorer huts, a different material from the wall
 {const ph=range(r,.28,.75)*(.7+.5*poor),mat=pick(r,[m.ground,m.wall2,m.trim]),on=r()<.8;if(on){
  if(M.round&&M.wall){const w=M.wall,sides=w.sides??8,apo=Math.cos(Math.PI/sides);cyl(mat,w.size[0]/apo*1.04,ph,[w.pos[0],0,w.pos[2]],1,sides,undefined,w.oval);}
  else box(mat,[hx*2+.1,ph,hz*2+.1],[cx,0,cz],1);}}
 // ---- painted band on richer huts (a trim stripe near the eave); poorer huts have a rough daub band instead
 if(rich>.25&&!M.round)box(r()<.5?m.accent:m.trim,[hx*2+.07,.12,hz*2+.07],[cx,H*.78,cz],1);
 else if(rich>.25&&M.wall){const w=M.wall,sides=w.sides??8,apo=Math.cos(Math.PI/sides);cyl(r()<.5?m.accent:m.trim,w.size[0]/apo*1.03,.12,[w.pos[0],H*.74,w.pos[2]],1,sides,undefined,w.oval);}
 // ---- roof repairs: patched thatch; follows the cone or gable slope
 if(roof&&poor>.2){const np=Math.round(1+poor*2+age*2+r()*1.5);
  for(let i=0;i<np;i++){const t=range(r,.2,.7),a=r()*Math.PI*2;
   if(roof.shape==='cone'){const rad=Ro*(1-t),th=Math.atan2(Ro,Hr),px=roof.pos[0]+Math.sin(a)*rad*.98,pz=roof.pos[2]+Math.cos(a)*rad*.98*(roof.size[2]/roof.size[0]);
    box(r()<.5?m.wall2:m.ground,[.5+r()*.45,.045,.4+r()*.3],[px,y0+Hr*t,pz],1,[th,a,0]);}
   else{const side=r()<.5?-1:1,len=roof.size[2],u=range(r,-.4,.4)*len,sl=Math.atan2(Hr,roof.size[0]/2),axisX=Math.abs(roof.rot?.[1]??0)>1,hs=roof.size[0]/2*(1-t);
    const pos:V=axisX?[roof.pos[0]+u,y0+Hr*t+.03,roof.pos[2]-side*hs]:[roof.pos[0]+side*hs,y0+Hr*t+.03,roof.pos[2]+u];
    add(part('box',r()<.5?m.wall2:m.ground,[.7+r()*.4,.05,.5+r()*.3],pos,1,axisX?[0,Math.PI/2,side<0?sl:-sl]:[0,0,side<0?sl:-sl]));}}}
 // ---- ridge finial / capped vent on richer huts
 if(roof&&rich>.35){if(roof.shape==='cone')cyl(m.trim,.2,.5,[roof.pos[0],y0+Hr-.1,roof.pos[2]],1,6,.05);else add(beam(m.trim,[roof.pos[0],y0+Hr,roof.pos[2]-roof.size[2]*.5-.1],[roof.pos[0],y0+Hr+.35,roof.pos[2]-roof.size[2]*.5-.2],.08,1));}
 // ---- extensions (0..2): lean-to, porch, annex, windbreak, rack
 const kinds=['lean','porch','annex','hurdle','rack'].map(k=>({k,w:r()})).sort((a,b)=>a.w-b.w).map(x=>x.k),count=r()<.2?0:r()<.55?1:2,side=r()<.5?-1:1;
 for(const k of kinds.slice(0,count)){
  const sx=cl(cx+side*(hx+.2),lim.x);
  switch(k){
   case 'lean':{const L=range(r,1.6,2.4),dp=range(r,1.1,1.6),hh=Math.min(H*.85,1.7);
    if(Math.abs(sx)+dp<lim.x+.8){box(m.wall2,[.12,hh,L],[side*(hx+.04)+cx,0,cz-.2],1);add(part('wedge',m.roof,[L+.3,hh,dp+.25],[side*(hx+dp/2+.1)+cx,0,cz-.2],1,[0,side>0?Math.PI/2:-Math.PI/2,0]));
     for(const z of[-1,1])add(beam(m.trim,[side*(hx+dp)+cx,0,cz-.2+z*L*.45],[side*(hx+dp)+cx,hh*.4,cz-.2+z*L*.45],.1,1));}break;}
   case 'porch':{const wd=range(r,1.7,2.4),dp=range(r,.9,1.3),x=cl(dX,hx-wd/2+.2),ph=range(r,1.9,2.2);
    for(const s of[-1,1])add(beam(m.trim,[x+s*wd/2,0,front+dp],[x+s*wd/2,ph,front+dp],.12,1));
    add(part('wedge',m.roof,[wd+.3,.7,dp+.5],[x,ph-.2,front+dp/2-.05],1));break;}
   case 'annex':{const w=range(r,1.3,1.9),h=range(r,1.1,1.5),sz=side>0?1:-1,x=cl(cx+sz*(hx+w/2-.1),lim.x-w/2),z=cl(cz-hz*.3,lim.z-w/2);
    if(r()<.5){cyl(m.wall,w,h,[x,0,z],1,8);add(part('cone',m.roof,[w*1.3,.75,w*1.3],[x,h-.05,z],1,undefined,8));}
    else{box(m.wall2,[w,h,w*.9],[x,0,z],1);add(part('prism',m.roof,[w*1.25,.7,w*1.15],[x,h-.04,z],1));}break;}
   case 'hurdle':{const n=Math.round(range(r,4,7)),len=n*.4,z0=front+range(r,.3,.9),x0=cx-len/2+range(r,-.6,.6),ph=range(r,.85,1.15);
    for(let i=0;i<=n;i++)add(beam(m.trim,[cl(x0+i*.4,lim.x),0,cl(z0,lim.z)],[cl(x0+i*.4,lim.x),ph+(r()-.5)*.12,cl(z0,lim.z)],.06,0));
    for(const y of[.35,.7])box(m.wall2,[len,.05,.05],[cl(x0+len/2,lim.x),y,cl(z0,lim.z)],0);break;}
   default:{const x=cl(cx+side*(hx+.7),lim.x),z=cl(cz+hz*.3,lim.z);for(const s of[-1,1])add(beam(m.trim,[x+s*.5,0,z],[x,1.5,z],.07,0));box(m.trim,[.06,.06,1.1],[x,1.5,z],0);box(m.cloth,[.9,.06,.6],[x,1.46,z],0,[0,0,0]);}
  }
 }
 // ---- budget: keep the mid tier under its cap (dressing adds to it later), dropping the newest extras first
 let mid=parts.reduce((a,p)=>p.lod>=1?a+partTriangles(p):a,0);while(parts.length>start&&mid>MID_BUDGET)mid-=parts[parts.length-1].lod>=1?partTriangles(parts[parts.length-1]):0,parts.pop();
 // ---- trimmed down: no part may dip below the ground
 for(let i=start;i<parts.length;i++){const p=parts[i];if(p.pos[1]<0)parts[i]={...p,pos:[p.pos[0],0,p.pos[2]]};}
 return parts.length-start;
}
