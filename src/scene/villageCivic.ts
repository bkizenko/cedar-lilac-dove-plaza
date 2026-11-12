/** Village grammar: civic and defensive landmarks (watchtower, church/temple, keep, college). See buildingFamiliesVillage.ts.
 * Entrance +Z, units metres, everything aimed inside the footprint; lod 2 carries the silhouette, lod 1/0 add structure and props. */
import {beam,chance,part,range,type Part} from './buildingParts';
import {roofPitch,type Generator} from './buildingHelpers';
import {barrel,box,bucket,cyl,doorway,ladder,post,quoins,roofGable,stoneWall,window2,type V3} from './buildingKit';
import {roofFor} from './villageHomes';
import type {CarvedMaterialId as M} from './carvedPalette';

const TAU=Math.PI*2;
const stoneAge=(ctx:{material:string;era:number})=>ctx.material==='stone'||ctx.era>=3;

/** Crenellation ring: merlons around a square at half-sizes (hx,hz), y = wall top. */
function merlons(p:Part[],x:number,z:number,hx:number,hz:number,y:number,mat:M='stone',n=5,h=.42){
  const w=.34;
  for(const s of[-1,1]){
    for(let i=0;i<n;i++){const u=-hx+.3+i*(2*hx-.6)/(n-1);if(i%2===0){p.push(part('box',mat,[w,h,.3],[x+u,y,z+s*(hz-.15)],1));p.push(part('box',mat,[.3,h,w],[x+s*(hx-.15),y,z+(-hz+.3+i*(2*hz-.6)/(n-1))],1));}}
  }
}

/** Watchtower. Stone era: tapered ashlar shaft on a battered plinth, projecting timber hoarding with merlons behind, pitched slate cap, arrow slits,
 * a ground-floor door with an outside ladder to the upper door, banner and brazier. Earlier: four splayed log legs with cross bracing, a plank
 * lookout with railing and a small hipped thatch roof, ladder, hanging shield and signal fire basket. */
export const tower:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,lit=ctx.lit!==false,s=Math.min(w,d)/4.6;
  if(stoneAge(ctx)){
    const B=3.5*s,T=2.9*s,H=range(r,5.2,5.9)*Math.min(1.1,s+.1);
    box(parts,'stoneDark',[B+.5,.3,B+.5],[0,0,0],1);
    stoneWall(parts,{x:0,z:0,w:B,d:B,y0:.3,h:1.0,mat:'stoneDark',course:.35});
    stoneWall(parts,{x:0,z:0,w:T+.3,d:T+.3,y0:1.3,h:H-1.3,course:.38});
    quoins(parts,0,0,T+.3,T+.3,1.3,H-1.3,'stoneDark',5);
    // hoarding gallery: overhanging plank box on corbels, then a pitched cap
    const gy=H,gw=T+.9;
    for(const sx of[-1,1])for(const sz of[-1,1])parts.push(beam('woodDark',[sx*(T/2-.1),gy-.7,sz*(T/2-.1)],[sx*(gw/2-.15),gy,sz*(gw/2-.15)],.16,1));
    box(parts,'woodDark',[gw,.16,gw],[0,gy,0],1);
    box(parts,'woodMid',[gw,.9,gw],[0,gy+.16,0],2);
    for(const f of[-1,1]){for(let i=0;i<3;i++){box(parts,'recess',[.5,.34,.06],[(i-1)*.9*s,gy+.5,f*(gw/2+.02)],0);box(parts,'recess',[.06,.34,.5],[f*(gw/2+.02),gy+.5,(i-1)*.9*s],0);}}
    for(const f of[-1,1])for(let i=0;i<4;i++){box(parts,'woodDark',[.07,.9,.07],[-gw/2+.1+i*(gw-.2)/3,gy+.16,f*(gw/2-.02)],0);box(parts,'woodDark',[.07,.9,.07],[f*(gw/2-.02),gy+.16,-gw/2+.1+i*(gw-.2)/3],0);}
    const rm:M=ctx.era>=3&&ctx.wealth>.5?'tile':'shingle';
    parts.push(part('pyramid',rm,[gw+.7,range(r,1.7,2.1),gw+.7],[0,gy+1.06,0],2));
    cyl(parts,'iron',.08,1.0,[0,gy+1.06+1.7,0],1,5);box(parts,'clothRed',[.7,.42,.04],[.4,gy+1.06+2.2,0],0);
    // openings
    doorway(parts,{x:0,z:T/2+.15,wall:0,w:.9*s,h:1.5*s,double:false,step:true});
    for(const y of[2.3,3.8])for(const f of[-1,1]){box(parts,'recess',[.12,.8,.07],[0,y,f*(T/2+.18)],0);box(parts,'recess',[.07,.8,.12],[f*(T/2+.18),y,0],0);}
    ladder(parts,T/2-.5,T/2+1.1,T/2+.3,3.4,6);box(parts,'recess',[.9,1.2,.08],[T/2-.5,3.1,T/2+.18],0);
    // brazier on a post, sandbags, signal fire
    post(parts,'woodDark',-T/2-.4,T/2+.6,.8,.1,0);cyl(parts,'iron',.5,.2,[-T/2-.4,.8,T/2+.6],0,6);if(lit)parts.push(part('cone','fire',[.34,.5,.34],[-T/2-.4,1.0,T/2+.6],0,undefined,5));
  }else{
    const sp=range(r,2.4,2.9)*s,top=range(r,4.3,5.0)*Math.min(1.12,s+.1),pw=2.7*s;
    for(const sx of[-1,1])for(const sz of[-1,1]){parts.push(beam('trunk',[sx*sp/2,0,sz*sp/2],[sx*pw/2*.78,top,sz*pw/2*.78],.3,2));box(parts,'stoneDark',[.6,.2,.6],[sx*sp/2,0,sz*sp/2],0);}
    for(const y of[1.3,2.7])for(const f of[-1,1]){const k=1-y/top*.22,hw=sp/2*k;box(parts,'woodDark',[2*hw,.12,.12],[0,y,f*hw],1);box(parts,'woodDark',[.12,.12,2*hw],[f*hw,y,0],1);}
    for(const sx of[-1,1]){parts.push(beam('woodMid',[sx*sp/2,.1,-sp/2],[sx*sp/2*.9,2.7,sp/2*.9],.09,1),beam('woodMid',[sx*sp/2,.1,sp/2],[sx*sp/2*.9,2.7,-sp/2*.9],.09,1));}
    box(parts,'woodDark',[pw+.5,.16,pw+.5],[0,top,0],2);box(parts,'woodMid',[pw+.3,.12,pw+.3],[0,top+.16,0],1);
    for(const f of[-1,1]){box(parts,'woodMid',[pw+.3,.5,.08],[0,top+.28,f*(pw/2+.1)],1);box(parts,'woodMid',[.08,.5,pw+.3],[f*(pw/2+.1),top+.28,0],1);}
    for(const sx of[-1,1])for(const sz of[-1,1])post(parts,'woodDark',sx*(pw/2+.1),sz*(pw/2+.1),1.6,.12,1,top+.16);
    const rm:M=ctx.era<=1?'thatch':'shingle';
    parts.push(part('hip',rm,[pw+.9,1.0,pw+.9],[0,top+1.76,0],2,undefined,undefined),part('pyramid',rm,[pw+.9,.8,pw+.9],[0,top+1.76,0],0));
    ladder(parts,0,pw/2+.9,pw/2+.2,top,8);
    parts.push(part('cylinder','clothRed',[.55,.06,.55],[0,top+.7,pw/2+.18],0,[Math.PI/2,0,0],8));
    if(lit){cyl(parts,'iron',.5,.2,[pw/2+.4,top+.16,0],0,6);parts.push(part('cone','fire',[.34,.46,.34],[pw/2+.4,top+.36,0],0,undefined,5));}
    barrel(parts,sp/2+.5,0,sp/2+.5,1);
  }
  return {parts,entry:{x:0,z:Math.min(w,d)/2,width:.9}};
};

/** Church (the 'temple' type). Arid/mudbrick: whitewashed domed shrine on a square drum with a lantern, arcaded porch, courtyard well-basin.
 * Stone: aisled nave with buttresses, lancet windows, west tower with belfry and spire, rounded apse, crossed ridge finial, arched door with steps.
 * Early timber/wattle: stave-style sanctuary of stacked gabled roofs with carved dragon-head finials and a plank porch. */
export const church:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,k=Math.min(w/8.4,d/8),arid=ctx.climate==='arid'||ctx.material==='mudbrick',stone=ctx.material==='stone'||ctx.era>=3,rm=roofFor(ctx);
  if(arid){
    const S=5.0*k,H=3.0*k;
    box(parts,'stoneDark',[S+.5,.3,S+.5],[0,0,-.4],1);
    box(parts,'plaster',[S,H,S],[0,.3,-.4],2);
    for(const f of[-1,1]){box(parts,'recess',[.8,1.2,.08],[f*1.3*k,1.2,-.4+S/2+.02],0);box(parts,'recess',[.08,1.2,.8],[f*(S/2+.02),1.2,-.4],0);}
    box(parts,'stone',[S+.2,.2,S+.2],[0,H+.3,-.4],1);
    cyl(parts,'plaster',S*.82,.9,[0,H+.5,-.4],2,12);parts.push(part('sphere','plaster',[S*.82,S*.46,S*.82],[0,H+1.4,-.4],2));
    cyl(parts,'plaster',.5,.5,[0,H+1.4+S*.4,-.4],1,8);parts.push(part('sphere','tile',[.5,.5,.5],[0,H+1.9+S*.4,-.4],1),part('cylinder','iron',[.05,.7,.05],[0,H+2.2+S*.4,-.4],0));
    // arcaded porch on the entrance side: 4 columns, lintel, flat roof beams
    for(let i=0;i<4;i++){const x=-1.7*k+i*1.13*k;cyl(parts,'stone',.34,2.1*k,[x,.2,S/2+1.2*k-.4],1,8);cyl(parts,'stoneDark',.46,.14,[x,2.3*k,S/2+1.2*k-.4],0,8);}
    box(parts,'stone',[4.2*k,.3,1.5*k],[0,2.3*k+.1,S/2+.5*k-.4],1);
    doorway(parts,{x:0,z:S/2-.4,wall:0,w:1.2*k,h:2.0*k,double:true,leaf:'woodDark',frame:'stoneDark'});
    cyl(parts,'stoneDark',1.0*k,.5,[S/2+.9*k,0,-S/2+.3],0,10);box(parts,'water',[.8*k,.05,.8*k],[S/2+.9*k,.45,-S/2+.3],0);
    return {parts,entry:{x:0,z:S/2+1.2*k-.4,width:1.4}};
  }
  const L=(stone?4.5:5.6)*k,Wd=(stone?3.4:3.4)*k,wh=(stone?2.9:2.3)*k,cz=stone?-.55*k:-.2;
  if(stone){
    box(parts,'stoneDark',[Wd+.4,.3,L+.4],[0,0,cz],1);
    stoneWall(parts,{x:0,z:cz,w:Wd,d:L,y0:.3,h:wh,course:.36,faces:['+x','-x']});
    // buttresses and lancets
    for(let i=0;i<4;i++){const z=cz-L/2+.9+i*(L-1.8)/3;for(const sx of[-1,1]){box(parts,'stoneDark',[.35,wh*.8,.45],[sx*(Wd/2+.12),.3,z],1);box(parts,'recess',[.07,1.4*k,.34],[sx*(Wd/2+.02),1.0*k,z+(L-1.8)/6],0);}}
    for(const sx of[-1,1])for(let i=0;i<3;i++)box(parts,'recess',[.07,1.4*k,.36],[sx*(Wd/2+.03),1.0*k,cz-L/2+1.5+i*(L-2.4)/2],0);
    // apse (rounded east end)
    cyl(parts,'stone',Wd*.9,wh*.85,[0,.3,cz-L/2],2,10);parts.push(part('cone',rm==='thatch'?'thatch':'shingle',[Wd*1.02,1.5*k,Wd*1.02],[0,.3+wh*.85,cz-L/2],2,undefined,10));
    // nave roof
    const pitch=Math.max(.7,roofPitch(ctx,r)),rise=roofGable(parts,ctx,{span:Wd,len:L,eave:.3+wh,pitch,cx:0,cz,axis:'z',over:.3,mat:rm==='thatch'?'shingle':rm});
    // west tower on the entrance side
    const tz=cz+L/2+.3*k,tw=2.3*k,th=wh+3.2*k;
    stoneWall(parts,{x:0,z:tz,w:tw,d:tw,y0:.3,h:th,course:.36});quoins(parts,0,tz,tw,tw,.3,th,'stoneDark',6);
    box(parts,'recess',[.6*k,1.1*k,.07],[0,th*.78,tz+tw/2+.01],0);box(parts,'recess',[.6*k,1.1*k,.07],[0,th*.78,tz-tw/2-.01],0);box(parts,'recess',[.07,1.1*k,.6*k],[tw/2+.01,th*.78,tz],0);box(parts,'recess',[.07,1.1*k,.6*k],[-tw/2-.01,th*.78,tz],0);
    box(parts,'stoneDark',[tw+.3,.2,tw+.3],[0,.3+th,tz],1);
    const sh=range(r,3.0,3.6)*k;parts.push(part('pyramid','slate',[tw+.4,sh,tw+.4],[0,.5+th,tz],2));
    cyl(parts,'iron',.07,.9,[0,.5+th+sh-.2,tz],1,4);box(parts,'iron',[.5,.07,.07],[0,.5+th+sh+.4,tz],0);
    doorway(parts,{x:0,z:tz+tw/2,wall:0,w:1.2*k,h:2.0*k,double:true,leaf:'woodDark',frame:'stoneDark'});
    box(parts,'stoneDark',[2.2*k,.14,.5],[0,0,tz+tw/2+.25],0);box(parts,'stoneDark',[2.6*k,.14,.5],[0,0,tz+tw/2+.65],0);
    box(parts,'recess',[.7,.8,.07],[0,2.5*k,tz+tw/2+.02],0);
    // ridge cross on the east gable
    box(parts,'iron',[.07,.55,.07],[0,.3+wh+rise,cz-L/2+.2],0);box(parts,'iron',[.4,.07,.07],[0,.3+wh+rise+.3,cz-L/2+.2],0);
  }else{
    // timber hall sanctuary with stepped (stave-style) roofs
    box(parts,'stoneDark',[Wd+.5,.3,L*.85+.5],[0,0,cz],1);
    box(parts,'woodMid',[Wd,wh,L*.85],[0,.3,cz],2);
    for(let i=0;i<8;i++)for(const sx of[-1,1])box(parts,'woodDark',[.16,wh,.2],[sx*(Wd/2+.02),.3,cz-L*.85/2+.3+i*(L*.85-.6)/7],0);
    const pitch=Math.max(.7,roofPitch(ctx,r));
    const r1=roofGable(parts,ctx,{span:Wd,len:L*.85,eave:.3+wh,pitch,cx:0,cz,axis:'z',over:.35,mat:rm});
    box(parts,'woodMid',[Wd*.55,1.0*k,L*.45],[0,.3+wh+r1*.55,cz],2);
    roofGable(parts,ctx,{span:Wd*.55,len:L*.45,eave:.3+wh+r1*.55+1.0*k,pitch,cx:0,cz,axis:'z',over:.3,mat:rm});
    for(const e of[-1,1]){parts.push(beam('woodEdge',[0,.3+wh+r1*.55+1.0*k+.3,cz+e*L*.225],[0,.3+wh+r1*.55+1.0*k+1.3,cz+e*(L*.225+.2)],.1,0));}
    for(const e of[-1,1]){parts.push(beam('woodEdge',[0,.3+wh+r1-.1,cz+e*(L*.85/2+.3)],[0,.3+wh+r1+.7,cz+e*(L*.85/2+.65)],.09,0));}
    // plank porch
    const pz=cz+L*.85/2+.9*k;
    for(const sx of[-1,1])post(parts,'woodDark',sx*1.0*k,pz,wh,.2,1,.3);
    parts.push(part('prism',rm,[2.8*k,.9,1.8*k],[0,.3+wh,pz-.3],1));
    doorway(parts,{x:0,z:cz+L*.85/2,wall:0,w:1.2*k,h:1.9*k,double:true,leaf:'woodDark'});
  }
  barrel(parts,Wd/2+.8,0,cz+L/2,1);
  void window2;void bucket;void chance;void TAU;
  return {parts,entry:{x:0,z:cz+L/2+.4*k+1.25*k,width:1.2}};
};

/** Keep. Stone: battered plinth, three-stage rectangular tower keep with an exterior timber stair to the first-floor door, quoined corners,
 * arrow slits, corbelled crown with merlons, four corner turrets with conical caps, banner pole. Timber: motte-top stockaded tower: earth mound,
 * ring palisade with gate, tall log tower with hoarding and thatch cap, ladders and a signal fire. */
export const keep:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,k=Math.min(w,d)/9.2,lit=ctx.lit!==false;
  if(stoneAge(ctx)){
    const B=5.5*k,H=range(r,6.6,7.4)*Math.min(1.1,k+.05);
    box(parts,'stoneDark',[B+1.4,.5,B+1.4],[0,0,0],1);
    stoneWall(parts,{x:0,z:0,w:B+.7,d:B+.7,y0:.5,h:1.2,mat:'stoneDark',course:.38});
    stoneWall(parts,{x:0,z:0,w:B,d:B,y0:1.7,h:H-1.7,course:.4});
    quoins(parts,0,0,B,B,1.7,H-1.7,'stoneDark',6);
    // stages: string courses
    for(const y of[3.7,5.7])box(parts,'stoneDark',[B+.14,.16,B+.14],[0,y,0],0);
    // arrow slits and upper windows
    for(const f of[-1,1]){for(let i=0;i<3;i++){const u=(i-1)*B*.28;box(parts,'recess',[.12,.9,.07],[u,2.3,f*(B/2+.02)],0);box(parts,'recess',[.07,.9,.12],[f*(B/2+.02),2.3,u],0);
      if(i!==1||f<0)box(parts,'recess',[.5,.7,.07],[u,4.4,f*(B/2+.02)],0);}}
    // corbelled crown + crenellation
    box(parts,'stoneDark',[B+.5,.22,B+.5],[0,H,0],1);
    for(let i=0;i<6;i++){const u=-B/2+.4+i*(B-.8)/5;for(const f of[-1,1]){box(parts,'stoneDark',[.22,.3,.3],[u,H-.3,f*(B/2+.1)],0);box(parts,'stoneDark',[.3,.3,.22],[f*(B/2+.1),H-.3,u],0);}}
    box(parts,'stone',[B+.5,.9,B+.5],[0,H+.22,0],2);
    for(const f of[-1,1])for(let i=0;i<6;i+=1){const u=-B/2+.4+i*(B-.8)/5;if(i%2===0){box(parts,'stoneDark',[.46,.4,.3],[u,H+1.12,f*(B/2+.09)],0);box(parts,'stoneDark',[.3,.4,.46],[f*(B/2+.09),H+1.12,u],0);}}
    // corner turrets with conical caps
    for(const sx of[-1,1])for(const sz of[-1,1]){const tx=sx*(B/2+.1),tz=sz*(B/2+.1);cyl(parts,'stone',1.5*k,H-1.0,[tx,1.0,tz],2,10);box(parts,'stoneDark',[1.7*k,.2,1.7*k],[tx,H-.2,tz],1);
      cyl(parts,'stone',1.4*k,.9,[tx,H,tz],1,10);parts.push(part('cone','slate',[1.8*k,1.4,1.8*k],[tx,H+.9,tz],2,undefined,10));box(parts,'recess',[.1,.5,.06],[tx,H-1.6,tz+sz*.7*k],0);}
    // entrance forebuilding: timber stair to the first-floor door
    doorway(parts,{x:0,z:B/2,wall:0,w:1.2*k,h:1.8*k,double:true,step:false,face:'+z',leaf:'woodDark',frame:'stoneDark'});
    box(parts,'woodDark',[2.0*k,.18,1.5*k],[0,2.1,B/2+.75*k],1);for(const sx of[-1,1])for(const sz of[0,1])post(parts,'woodDark',sx*.9*k,B/2+(sz?1.4:.1)*k,2.1,.16,1);
    for(let i=0;i<8;i++)box(parts,'woodMid',[.3,(i+1)*.26,1.1*k],[1.0*k+.17+(7-i)*.3,0,B/2+.75*k],0);
    // flag
    cyl(parts,'iron',.08,2.2,[0,H+1.12,0],1,4);box(parts,'clothRed',[.9,.5,.04],[.5,H+2.8,0],0);
    void lit;
  }else{
    const Rm=4.4*k;
    parts.push(part('cone','mud',[2*Rm,1.4,2*Rm],[0,0,0],2,undefined,12));cyl(parts,'moss',2*Rm*.62,.2,[0,1.3,0],1,12);
    // ring palisade
    const n=14;for(let i=0;i<n;i++){if(i===3||i===4)continue;const a=i/n*TAU,x=Math.cos(a)*Rm*.78,z=Math.sin(a)*Rm*.78;cyl(parts,'trunk',.3,2.2,[x,.6,z],1,5);parts.push(part('cone','trunk',[.3,.35,.3],[x,2.8,z],0,undefined,5));}
    // tower
    const tw=3.0*k,th=range(r,5.2,6.0);
    box(parts,'woodDark',[tw,th,tw],[0,1.4,0],2);
    for(let i=0;i<8;i++)for(const f of[-1,1]){box(parts,'woodMid',[.3,th,.1],[-tw/2+.2+i*(tw-.4)/7,1.4,f*(tw/2+.02)],0);box(parts,'woodMid',[.1,th,.3],[f*(tw/2+.02),1.4,-tw/2+.2+i*(tw-.4)/7],0);}
    for(const y of[3.0,4.6])box(parts,'woodEdge',[tw+.1,.14,tw+.1],[0,y,0],0);
    box(parts,'woodDark',[tw+1.1,.2,tw+1.1],[0,1.4+th,0],1);box(parts,'woodMid',[tw+1.1,.9,tw+1.1],[0,1.6+th,0],2);
    parts.push(part('hip','thatch',[tw+1.8,1.6,tw+1.8],[0,2.5+th,0],2),part('pyramid','thatch',[tw+1.8,1.2,tw+1.8],[0,2.5+th,0],0));
    for(const f of[-1,1])box(parts,'recess',[.6,.34,.06],[0,1.9+th,f*(tw/2+.58)],0);
    doorway(parts,{x:0,z:tw/2,wall:0,w:1.0*k,h:1.5*k,leaf:'woodDark',step:false});
    ladder(parts,tw/2-.5,tw/2+1.1,tw/2+.2,th*.55,7);
    if(lit)parts.push(part('cone','fire',[.4,.6,.4],[tw/2+.4,1.4+th,0],0,undefined,5));
    barrel(parts,Rm*.4,1.3,Rm*.4,1);
  }
  return {parts,entry:{x:0,z:stoneAge(ctx)?Math.min(w,d)/2:Math.min(w,d)*.4,width:1.2}};
};

/** College (the 'university' type): a stone lecture hall with a pedimented front, a six-column arcade on a stepped stylobate, entablature,
 * tall windows, a lantern cupola with a bell, a courtyard well with benches and lecterns. Timber era: a long hall with a deep porch and carved posts. */
export const college:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,k=Math.min(w/10,d/8.6),stone=stoneAge(ctx)||ctx.wealth>.6,rm=roofFor(ctx);
  const W=8.6*k,D=5.0*k,cz=-1.4*k,wh=(stone?3.2:2.5)*k,wm:M=stone?'plaster':'woodMid';
  box(parts,'stoneDark',[W+.5,.3,D+.5],[0,0,cz],1);
  box(parts,wm,[W,wh,D],[0,.3,cz],2);
  quoins(parts,0,cz,W,D,.3,wh,stone?'stone':'woodDark',4);
  // tall windows with sills
  for(let i=0;i<4;i++){const x=-W/2+1.3*k+i*(W-2.6*k)/3;window2(parts,{x,y:1.1*k+.3,z:cz,wall:D,w:.7,h:1.35*k,shutters:stone?null:undefined,face:'-z'});}
  for(const sx of[-1,1])for(let i=0;i<2;i++)window2(parts,{x:0,y:1.1*k+.3,z:cz+(i?1:-1)*D*.22,wall:W,w:.6,h:1.3*k,face:sx>0?'+x':'-x',shutters:null});
  // roof
  const pitch=Math.max(.45,Math.min(.7,roofPitch(ctx,r)));
  const rise=roofGable(parts,ctx,{span:D,len:W,eave:.3+wh,pitch,cx:0,cz,axis:'x',over:.3,mat:stone&&rm==='thatch'?'tile':rm});
  // cupola with bell
  const cy=.3+wh+rise;box(parts,'woodMid',[1.0*k,.9,1.0*k],[0,cy-.05,cz],2);
  for(const sx of[-1,1])for(const sz of[-1,1])post(parts,'woodDark',sx*.4*k,cz+sz*.4*k,.9,.1,1,cy-.05);
  parts.push(part('pyramid','shingle',[1.3*k,.8,1.3*k],[0,cy+.85,cz],2),part('sphere','iron',[.3,.3,.3],[0,cy+.3,cz],0));
  // front arcade (6 columns), stylobate steps, entablature, pediment
  const az=cz+D/2+1.3*k,ac=6;
  box(parts,'stone',[W+.4,.26,2.5*k],[0,0,az-.05],1);box(parts,'stoneDark',[W+.9,.14,3.0*k],[0,0,az],1);
  for(let i=0;i<ac;i++){const x=-W/2+.5+i*(W-1.0)/(ac-1);cyl(parts,'plaster',.5,wh*.84,[x,.3,az+.15*k],2,10);cyl(parts,'stone',.62,.16,[x,.3,az+.15*k],1,10);cyl(parts,'stone',.62,.14,[x,.3+wh*.84,az+.15*k],1,10);}
  box(parts,'stone',[W+.5,.3,1.9*k],[0,.3+wh*.84+.14,az-.15],2);
  parts.push(part('prism','plaster',[1.9*k,.9*k,W*.74],[0,.3+wh*.84+.44,az-.15],2,[0,Math.PI/2,0]));
  box(parts,'recess',[1.1*k,.6*k,.05],[0,.3+wh*.84+.5,az+.85*k],0);
  doorway(parts,{x:0,z:cz+D/2,wall:0,w:1.3*k,h:2.3*k,double:true,leaf:'woodDark',frame:'stone',step:false});
  // courtyard: well with basin, two benches, lecterns, a stone bust plinth
  cyl(parts,'stoneDark',1.1,.7,[-W*.3,0,az+2.0*k],1,10);box(parts,'water',[.8,.05,.8],[-W*.3,.7,az+2.0*k],0);
  for(const x of[W*.28,W*.4]){box(parts,'woodMid',[.9,.14,.4],[x,.42,az+1.9*k],0);post(parts,'woodDark',x-.35,az+1.9*k,.42,.08,0);post(parts,'woodDark',x+.35,az+1.9*k,.42,.08,0);}
  parts.push(part('prism','clothBlue',[.4,.4,3*k],[W/2-.2,2.0,az-1.2*k],0));
  void ladder;void bucket;void chance;
  return {parts,entry:{x:0,z:az+2.0*k,width:2.0}};
};
