/** Village grammar: great-hall and barracks ROOF FORMS. The hall body (plinth, walls, porch, yard) lives in villageHomes.ts; this file puts the
 * roof on it, and the roof is where a society's identity reads from the hill: a tiled cross-gabled hall with a bell cupola, a shaggy
 * thatch hip, a flat-roofed terrace with parapet and toron beams, a barrel-vaulted hall, tiered stave roofs with dragon heads, a turf hall with
 * crossed ridge ends, a tiered upturned-eave hall, a saddle-back with upswept horns, or a felt yurt hall. The form comes from the society's
 * skin (SkinForms.hall, civSkinData.ts); no skin means the plain 'gable' hall.
 * Frame: ridge runs along X, entrance +Z, `eave` is the wall-top height, `cz` the hall's centre. Returns the roof's rise above the eave. */
import {beam,part,type Part,type Rng} from './buildingParts';
import type {FamilyContext,HallForm} from './buildingHelpers';
import {box,cyl} from './buildingKit';
import type {CarvedMaterialId as M} from './carvedPalette';

export type HallRoofIn={L:number;D:number;cz:number;eave:number;pitch:number;mat:M;large:boolean;span:number;len:number;hip:number;k:number};
const rolled=(m:M):M=>m==='straw'||m==='thatch'?'thatch':m;

export function hallRoof(parts:Part[],ctx:FamilyContext,r:Rng,form:HallForm,o:HallRoofIn):number{
  const {L,D,cz,eave,pitch,mat,large,span,len,hip,k}=o,rise=D/2*Math.tan(pitch),cx=0;
  const finialCross=(x:number,y:number)=>{parts.push(beam('woodEdge',[x,y,cz-.28],[x,y+.7,cz+.28],.1,0),beam('woodEdge',[x,y,cz+.28],[x,y+.7,cz-.28],.1,0));};
  switch(form){
    case 'thatchHip':{// deep shaggy hip, eaves nearly to the shoulder, crossed spars along the ridge, smoke gablets
      const rs=rise*1.12;
      parts.push({...part('hip',rolled(mat),[span+.7,rs,len+.7],[0,eave-.18,cz],2,[0,Math.PI/2,0]),inset:hip*.8+.4});
      for(const s of[-1,1])for(let i=0;i<3;i++){const t=.18+i*.22;box(parts,'woodDark',[len*(1-t*.5),.05,.12],[0,eave-.18+rs*t+.02,cz+s*(span+.7)/2*(1-t)],0,[s*-Math.atan2(rs,(span+.7)/2),0,0]);}
      cyl(parts,'thatch',.32,L-2*hip+.4,[cx+(L-2*hip+.4)/2,eave-.18+rs-.16,cz],1,6,[0,0,Math.PI/2]);
      for(let i=0;i<Math.floor((L-2*hip)/.8);i++){const x=-(L-2*hip)/2+.4+i*.8;parts.push(beam('woodEdge',[x-.14,eave-.18+rs-.12,cz-.2],[x+.14,eave-.18+rs+.32,cz+.2],.05,0),beam('woodEdge',[x+.14,eave-.18+rs-.12,cz-.2],[x-.14,eave-.18+rs+.32,cz+.2],.05,0));}
      for(const x of large?[-L*.24,L*.24]:[0]){parts.push(part('cone','thatch',[.9,.6,.9],[x,eave-.18+rs*.55,cz+D*.16],1,undefined,6),part('box','recess',[.36,.26,.06],[x,eave-.18+rs*.55+.18,cz+D*.16+.42],0));}
      return rs;
    }
    case 'terrace':{// flat mud roof: crenel parapet, raised corner blocks, stair block, toron beams, water spouts
      const t=.34,pw=L+.3,pd=D+.3,py=eave,pm:M='plaster';
      box(parts,'woodDark',[pw,.2,pd],[0,py-.1,cz],1);
      for(const s of[-1,1]){box(parts,pm,[pw,.62,t],[0,py,cz+s*(pd/2-t/2)],2);box(parts,pm,[t,.62,pd-2*t],[s*(pw/2-t/2),py,cz],2);}
      for(const s of[-1,1])for(let i=0;i<Math.floor(pw/.8);i++)box(parts,'stoneDark',[.46,.26,t*.8],[-pw/2+.4+i*.8,py+.62,cz+s*(pd/2-t/2)],0);
      for(const sx of[-1,1])for(const sz of[-1,1])box(parts,pm,[.9,1.25,.9],[sx*(pw/2-.45),py,cz+sz*(pd/2-.45)],2);
      for(const sx of[-1,1])for(const sz of[-1,1])parts.push(part('pyramid','stoneDark',[.98,.32,.98],[sx*(pw/2-.45),py+1.25,cz+sz*(pd/2-.45)],1));
      box(parts,pm,[2.2,1.0,1.6],[L*.18,py,cz-pd*.12],2);parts.push(part('wedge','stoneDark',[2.2,.9,1.6],[L*.18,py,cz+pd*.18],1,[0,Math.PI,0]));
      for(let i=0;i<Math.floor(L/.7);i++)parts.push(beam('woodDark',[-L/2+.35+i*.7,py-.4,cz+D/2],[-L/2+.35+i*.7,py-.4,cz+D/2+.5],.1,0));
      for(let i=0;i<3;i++)box(parts,'woodLight',[.18,.14,.55],[-L/2+1.2+i*(L-2.4)/2,py+.18,cz+pd/2+.1],0);
      box(parts,'woodMid',[1.4,.06,1.2],[-L*.24,py+1.18,cz],1);for(const sx of[-1,1])for(const sz of[-1,1])parts.push(beam('woodDark',[-L*.24+sx*.62,py,cz+sz*.52],[-L*.24+sx*.62,py+1.2,cz+sz*.52],.07,1));
      return 1.2;
    }
    case 'vault':{// row of barrel vaults springing from the wall tops, stone ribs between, small crowning dome
      const n=large?3:2,vw=L/n,vr=D/2+.15;
      for(let i=0;i<n;i++){const x=-L/2+vw*(i+.5);parts.push(part('cylinder',i%2?'plaster':'plaster',[D+.3,vw-.12,D+.3],[x,eave,cz],2,[0,0,Math.PI/2],10));box(parts,'stoneDark',[vw-.02,.16,D+.34],[x,eave,cz],0);}
      for(let i=0;i<=n;i++){const x=-L/2+i*vw;box(parts,'stoneDark',[.22,.5,D+.4],[x,eave-.25,cz],1);}
      parts.push(part('sphere','plaster',[2.1,1.1,2.1],[0,eave+vr*.78,cz],1),part('cone','stoneDark',[.5,.55,.5],[0,eave+vr*.78+.86,cz],0,undefined,6));
      cyl(parts,'stoneDark',2.2,.2,[0,eave+vr*.78-.1,cz],0,8);
      return vr;
    }
    case 'stave':{// three stepped tiers (stave church / hall roof), shingles, dragon-head gable finials, ridge turret
      const tiers=2;let y=eave,spanT=D+.8,lenT=L+.8;const rs:number[]=[];
      for(let i=0;i<tiers;i++){const rr=spanT/2*Math.tan(pitch+.12);rs.push(rr);
        parts.push({...part('hip',mat==='tile'?'shingle':mat,[spanT,rr,lenT],[0,y,cz],2,[0,Math.PI/2,0]),inset:Math.max(.3,lenT*.18)});
        box(parts,'woodDark',[lenT*.9,.12,.14],[0,y+.02,cz+spanT/2*.97],0);box(parts,'woodDark',[lenT*.9,.12,.14],[0,y+.02,cz-spanT/2*.97],0);
        y+=rr*.66;spanT*=.7;lenT*=.74;}
      const top=y+rs[tiers-1]*.3;
      parts.push(part('cone','shingle',[.9,1.6,.9],[0,top,cz],1,undefined,8),beam('woodEdge',[0,top+1.55,cz],[0,top+2.35,cz],.06,0));
      for(const sx of[-1,1]){const x=sx*(L/2+.1);parts.push(beam('woodEdge',[x,eave+.2,cz-.7],[x+sx*.55,eave+1.3,cz-.04],.12,0),beam('woodEdge',[x,eave+.2,cz+.7],[x+sx*.55,eave+1.3,cz+.04],.12,0));}
      return top-eave;
    }
    case 'turf':{// long low sod roof on a ridge pole with crossed rafter ends, timber barge boards, grass tufts and a smoke hole
      const rs=Math.max(.7,rise*.8);
      parts.push({...part('hip','moss',[span+.5,rs,len+.5],[0,eave,cz],2,[0,Math.PI/2,0]),inset:hip*.55+.2});
      box(parts,'woodDark',[len+.6,.16,.22],[0,eave+rs-.05,cz],1);
      for(const s of[-1,1])for(let i=0;i<Math.floor(L/.9);i++)box(parts,'woodDark',[.1,.14,.5],[-L/2+.5+i*.9,eave-.02,cz+s*(span/2+.2)],0);
      for(let i=0;i<Math.floor(L/.9);i++){const x=-L/2+.45+i*.9,s=i%2?1:-1;parts.push(part('cone','foliageDark',[.18,.3,.18],[x,eave+rs*.5+(i%3)*.04,cz+s*span*.12],0,undefined,4));}
      for(const sx of[-1,1])finialCross(sx*(L/2-hip*.3),eave+rs-.06);
      box(parts,'woodEdge',[.9,.3,.9],[L*.18,eave+rs*.7,cz],1);
      return rs;
    }
    case 'upturned':{// two tiers of hipped tile with swept corners, chiwen ridge ends, finial
      const r1=rise*.62,s1=span+1.3,l1=len+1.3;
      parts.push({...part('hip','tile',[s1,r1,l1],[0,eave-.1,cz],2,[0,Math.PI/2,0]),inset:hip*.9+.2});
      for(const sx of[-1,1])for(const sz of[-1,1])parts.push(beam('stoneDark',[sx*(l1/2-.5),eave-.1,cz+sz*(s1/2-.5)],[sx*(l1/2+.15),eave+.34,cz+sz*(s1/2+.15)],.1,0));
      const y2=eave-.1+r1*.82,r2=rise*.72,s2=span*.72,l2=len*.72;
      parts.push({...part('hip','tile',[s2,r2,l2],[0,y2,cz],2,[0,Math.PI/2,0]),inset:hip*.6});
      box(parts,'woodDark',[l2,.26,s2],[0,y2-.18,cz],1);
      for(const sx of[-1,1])for(const sz of[-1,1])parts.push(beam('stoneDark',[sx*(l2/2-.3),y2,cz+sz*(s2/2-.3)],[sx*(l2/2+.1),y2+.3,cz+sz*(s2/2+.1)],.08,0));
      box(parts,'stoneDark',[l2*.7,.14,.2],[0,y2+r2-.04,cz],1);
      for(const sx of[-1,1])parts.push(beam('stoneDark',[sx*l2*.35,y2+r2,cz],[sx*(l2*.35+.14),y2+r2+.52,cz],.1,0));
      parts.push(part('sphere','iron',[.34,.4,.34],[0,y2+r2+.1,cz],0));
      return y2+r2-eave;
    }
    case 'saddle':{// saddle-back: long deep thatch with upswept gable horns
      const rs=rise*1.05;
      parts.push({...part('hip',rolled(mat),[span+.6,rs,len+.7],[0,eave-.1,cz],2,[0,Math.PI/2,0]),inset:hip*.35+.2});
      for(const sx of[-1,1]){const x=sx*(len/2+.2);parts.push(beam('woodDark',[x-sx*.8,eave-.1+rs*.6,cz],[x+sx*.55,eave-.1+rs+1.1,cz],.2,1),beam('woodEdge',[x+sx*.25,eave-.1+rs+.55,cz],[x+sx*.62,eave-.1+rs+1.05,cz],.1,0));
        parts.push(beam('woodEdge',[x-sx*.4,eave-.1+rs*.8,cz-.45],[x+sx*.2,eave-.1+rs+.75,cz-.2],.08,0),beam('woodEdge',[x-sx*.4,eave-.1+rs*.8,cz+.45],[x+sx*.2,eave-.1+rs+.75,cz+.2],.08,0));}
      cyl(parts,'thatch',.3,L-2*hip,[(L-2*hip)/2,eave-.1+rs-.12,cz],1,6,[0,0,Math.PI/2]);
      return rs+1;
    }
    default:{// 'gable': hip with a tiled cross-gable over the porch bay, dormers, ridge crest and a bell cupola on the large hall
      parts.push({...part('hip',mat,[span,rise,len],[0,eave,cz],2,[0,Math.PI/2,0]),inset:hip+.3});
      const rows=mat==='straw'||mat==='thatch'?3:4;
      for(const s of[-1,1])for(let i=0;i<rows;i++){const t=.2+i*.2,y=eave+rise*t,lz=s*span/2*(1-t);box(parts,'woodDark',[len*(1-t*.55),.035,.1],[0,y+.01,cz+lz],0,[s*Math.atan2(rise,span/2)*-1,0,0]);}
      box(parts,'woodEdge',[L-2*hip,.15,.18],[0,eave+rise-.04,cz],1);
      for(let i=0;i<Math.floor((L-2*hip)/.6);i++)parts.push(part('pyramid','woodEdge',[.16,.2,.16],[-(L-2*hip)/2+.3+i*.6,eave+rise-.04,cz],0));
      for(const sx of[-1,1])finialCross(sx*(L/2-hip),eave+rise+.1);
      // cross gable over the entrance bay
      const gw=large?3.6:2.6,gr=Math.min(rise*.78,gw/2*Math.tan(pitch)),gl=D/2+.7;
      parts.push(part('prism',mat,[gw,gr,gl],[0,eave,cz+D/2-gl/2+.55],2));
      box(parts,'woodEdge',[.08,.1,gl],[-gw/2,eave-.04,cz+D/2-gl/2+.55],0);box(parts,'woodEdge',[.08,.1,gl],[gw/2,eave-.04,cz+D/2-gl/2+.55],0);
      parts.push(part('cylinder','recess',[.5,.06,.5],[0,eave+gr*.38,cz+D/2+.58],0,[Math.PI/2,0,0],10));
      // dormers on the front and back slopes
      for(const s of[-1,1])for(const x of large?[-L*.3,L*.3]:[-L*.24,L*.24]){const z=cz+s*span*.22,y=eave+rise*.34;box(parts,'woodMid',[.9,.8,.6],[x,y,z],1);parts.push(part('prism',mat,[1.1,.44,.74],[x,y+.8,z],1));box(parts,'recess',[.4,.42,.05],[x,y+.12,z+s*.31],0);}
      if(large){box(parts,'woodDark',[1.0,.7,1.0],[L*.02,eave+rise-.15,cz],1);for(const sx of[-1,1])box(parts,'recess',[.04,.4,.5],[sx*.5,eave+rise+.1,cz],0);parts.push(part('pyramid',mat==='straw'?'thatch':mat,[1.3,.8,1.3],[L*.02,eave+rise+.55,cz],1),beam('iron',[L*.02,eave+rise+1.3,cz],[L*.02,eave+rise+1.8,cz],.04,0),part('box','clothRed',[.5,.3,.03],[L*.02+.26,eave+rise+1.6,cz],0));}
      return rise;
    }
  }
}
/** Felt yurt hall (steppe nomads turned caravan lords): one great felt drum with a shallow cone roof and crown ring, flanked by two smaller ones,
 * roped round with a banner pole and a door frame. Replaces the whole longhouse body. */
export function yurtHall(parts:Part[],ctx:FamilyContext,r:Rng,o:{w:number;d:number;large:boolean;k:number}):{entry:{x:number;z:number;width:number}}{
  const {w,d,large,k}=o,R=Math.min(w,d)*(large?.34:.3),h=2.1*k,cz=-d*.04;
  const yurt=(x:number,z:number,rad:number,hh:number,tilt:number)=>{
    cyl(parts,'stoneDark',2*rad+.22,.18,[x,0,z],1,14);
    cyl(parts,'cloth',2*rad,hh,[x,.1,z],2,14);
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2;box(parts,'woodDark',[.08,hh*.9,.05],[x+Math.cos(a)*(rad+.02),.15,z+Math.sin(a)*(rad+.02)],0,[0,-a+Math.PI/2,0]);}
    for(const y of[hh*.38,hh*.78])cyl(parts,'woodEdge',2*rad+.06,.07,[x,y,z],0,14);
    parts.push(part('cone','cloth',[2*rad+.5,rad*(.62+tilt),2*rad+.5],[x,.1+hh-.1,z],2,undefined,14));
    cyl(parts,'woodDark',rad*.46,.2,[x,.1+hh+rad*(.62+tilt)-.12,z],1,10);
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;parts.push(beam('woodLight',[x+Math.cos(a)*rad*.2,.1+hh+rad*(.62+tilt)-.1,z+Math.sin(a)*rad*.2],[x+Math.cos(a)*(rad+.2),.1+hh-.06,z+Math.sin(a)*(rad+.2)],.04,0));}
  };
  yurt(0,cz,R,h,.1);
  yurt(-R*1.7,cz-R*.15,R*.62,h*.82,0);yurt(R*1.62,cz-R*.1,R*.58,h*.78,0);
  // door frame on the +Z side of the great felt drum, felt rug and banner pole
  box(parts,'woodDark',[1.15,1.5,.12],[0,.15,cz+R+.04],1);box(parts,'recess',[.8,1.3,.06],[0,.15,cz+R+.1],0);
  box(parts,'clothRed',[1.3,.04,1.0],[0,.05,cz+R+.7],0);
  const bx=R*.95,bz=cz+R*.95;parts.push(beam('woodDark',[bx,0,bz],[bx,h+2.4*k,bz],.1,1));box(parts,'clothRed',[.7,.7,.04],[bx+.38,h+1.6*k,bz],1);
  for(const s of[-1,1])box(parts,'woodMid',[.06,.06,R*.7],[s*.5,.5,cz+R+.4],0);
  void ctx;void r;
  return {entry:{x:0,z:cz+R,width:1}};
}
