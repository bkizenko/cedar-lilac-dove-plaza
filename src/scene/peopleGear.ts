/** PEOPLE GEAR (people v2): armor by PROTECTION TYPE first (padding, hide, wicker, bark, laminated linen, scale, lamellar, mail, plate), then the
 *  society's dress on top; helmets and shields with motifs; role kit; and `peopleOutfit`, the assembler the shared rig calls. Pure data and maths.
 *
 *  Nothing here is free equipment. The simulation owns one armor kind today (`paddedTorso`); this society builds it in its own padded style
 *  (look.armor.padded: quilted cotton, felt, hide, wicker, bark, laminated linen). Scale, lamellar, mail and plate parts exist for the assets
 *  that will own those kinds, and helmets and shields are drawn only when the unit owns one (RigGear), exactly like the first rig. Role kit
 *  is worn or carried only when the matching real state says so (see peopleLook.roleOf). */
import {hashSeed} from './buildingParts';
import {dressFor,type Culture,type GarmentId,type Season} from './cultureGrammar';
import {mix,type UnitKind} from './unitAppearance';
import type {BodyClass,RigBone,RigGear,RigInput,RigOutfit,RigPart,RigSlot} from './characterRig';
import {ARM,armSeg,armX,bodyParts,earthy,TB,frameOf,frontZ,emptyBones,footParts,headParts,headwearParts,jewelParts,markParts,paletteFor,Q,shade,type KitCtx,type Palette} from './peopleKit';
import {garmentParts} from './peopleGarb';
import {fibreOf,individualFor,lookForSkin,warmthOf,type ArmorStyle,type HelmStyle,type Individual,type PeopleLook,type Role,type ShieldShape} from './peopleLook';

const TAU=Math.PI*2;
const ring=(n:number,r:number,f:(i:number,x:number,z:number,a:number)=>RigPart)=>Array.from({length:n},(_,i)=>{const a=i/n*TAU;return f(i,Math.sin(a)*r,Math.cos(a)*r,a);});
const PADDED_BASE:Record<ArmorStyle,string>={quilted:'#dcd2b6',felt:'#b9b09a',hide:'#80583a',wicker:'#bd9d66',bark:'#7e5e3e',linen:'#e2d8be',scale:'#b48e3e',lamellar:'#8c3c30',mail:'#8d9296',plate:'#a3a7ab'};
/** Protection class of each style, for tests and for the simulation to adopt: what the part claims to protect with. */
export const PROTECTION_CLASS:Record<ArmorStyle,'padding'|'hide'|'wicker'|'bark'|'laminate'|'scale'|'lamellar'|'mail'|'plate'>={quilted:'padding',felt:'padding',hide:'hide',wicker:'wicker',bark:'bark',linen:'laminate',scale:'scale',lamellar:'lamellar',mail:'mail',plate:'plate'};

/** Torso armor of one protection type, then the society's colour. Spine and hips bones; shoulders sit on the spine. */
export function armorParts(c:KitCtx,style:ArmorStyle):RigPart[]{
 const {look,pal,rich}=c,b=look.body,F=frameOf(b),{tw,ww,wd,cw,cd}=F,hp=b.hip,sh=b.shoulder,base=mix(PADDED_BASE[style],pal.cloth,style==='quilted'||style==='felt'||style==='linen'?.3:style==='lamellar'?.1:.08),dark=shade(base,style==='quilted'?.84:.72),lite=shade(base,1.14),st=pal.accent;
 const o:RigPart[]=[],sp=(p:RigPart)=>{o.push(p);return p;},R=(col:string,sh2:Parameters<typeof Q>[1],size:[number,number,number],pos:[number,number,number],lod:0|1|2,rot?:[number,number,number],sides?:number)=>sp(Q(col,sh2,size,pos,lod,rot,sides));
 const T=(col:string,bot:readonly [number,number],top:readonly [number,number],h:number,pos:[number,number,number],lod:0|1|2,rot?:[number,number,number])=>sp(TB(col,bot,top,h,pos,lod,rot));
 // a cuirass cut to the trunk: tapered shell from the waist to a sloped shoulder line, tassets hanging over the hips
 const tb=tw-.03,th=.8-tb+.01,fz=(y:number)=>frontZ(F,y)+.04,e=.04;
 const shell=(col:string,grow=0,l:0|1|2=2)=>{T(col,[ww+.07+grow,wd+.065+grow],[cw+.08+grow,cd+.07+grow],th,[0,tb-.01,0],l);T(col,[F.sw+.01+grow,cd+.07+grow],[.19,.17],.09,[0,.78,0],l);};
 const tassets=(col:string,grow=0,l:0|1|2=1,h=.2)=>T(col,[.46*hp+.04+grow,.33*hp+.03+grow],[ww+.07,wd+.065],h,[0,tw-.02-h,0],l);
 const shoulders=(col:string,l:0|1|2=1)=>{for(const s of [-1,1])T(col,[.16,.22],[.13,.2],.07,[s*(.19*sh+.015),.8,0],l);};
 const bands=(n:number,cols:[string,string],grow=0,l:0|1|2=1)=>{const hh=th/n;for(let i=0;i<n;i++)T(cols[i%2],[ww+.07+grow+(cw-ww)*(i/n),wd+.065+grow+(cd-wd)*(i/n)],[ww+.07+grow+(cw-ww)*((i+1)/n),wd+.065+grow+(cd-wd)*((i+1)/n)],hh+.004,[0,tb-.01+i*hh,0],l);};
 const hline=(col:string,y:number,l:0|1|2=0,w=.9)=>R(col,'box',[cw*w,.014,.014],[0,y,fz(y)+.004],l);
 const vline=(col:string,x:number,y0:number,y1:number,l:0|1|2=0)=>R(col,'box',[.014,y1-y0,.014],[x,y0,fz((y0+y1)/2)+.004],l,[Math.atan2(fz(y1)-fz(y0),y1-y0),0,0]);
 const yTop=.78;
 switch(style){
  case 'quilted':shell(base);tassets(base);for(let i=0;i<4;i++)hline(dark,tb+.05+i*.06);for(let i=-2;i<=2;i++)vline(dark,i*.07,tb+.02,yTop);shoulders(base);R(lite,'box',[.2,.04,.19],[0,.855,0],1);break;
  case 'felt':shell(base,.01);tassets(base,.01);T(st,[.46*hp+.06,.33*hp+.05],[.46*hp+.06,.33*hp+.05],.03,[0,tw-.22,0],0);R(dark,'box',[.24,.06,.2],[0,.85,0],1);shoulders(base);hline(st,.64,0,.8);break;
  case 'hide':shell(base);tassets(base);shoulders(dark);for(let i=0;i<4;i++)R(lite,'box',[.045,.012,.012],[(i%2?.025:-.025),tb+.06+i*.055,fz(tb+.06+i*.055)+.004],0,[0,0,i%2?.5:-.5]);vline(lite,0,tb+.02,yTop);ring(8,.2,(i,x,z)=>Q(dark,'cone',[.07,.1,.05],[x*1.05,tw-.2,z*.72],0,[Math.PI,0,0],3)).forEach(sp);break;
  case 'wicker':bands(4,[base,dark]);tassets(base,0,1,.18);for(let i=0;i<5;i++)vline(lite,(i-2)*.07,tb+.02,yTop,0);shoulders(base,0);break;
  case 'bark':shell(dark,0,1);for(let i=-1;i<=1;i++)T(i%2?lite:base,[.12,.04],[.11,.036],.3,[i*.13*cw/.4,tb,fz(.65)-.02],1);tassets(base,0,1);shoulders(base,0);R(st,'box',[ww+.09,.03,wd+.08],[0,tw-.03,0],0);break;
  case 'linen':bands(3,[base,dark]);tassets(base,0,1,.18);for(const s of [-1,1])R(base,'box',[.14,.2,.025],[s*(.19*sh+.03),.6,.06],0);ring(8,.2,(i,x,z,a)=>Q(i%2?base:lite,'box',[.07,.15,.012],[x*1.1,tw-.34,z*.78],0,[0.12,a,0])).forEach(sp);R(st,'box',[ww+.1,.04,wd+.09],[0,tw-.04,0],0);shoulders(lite,0);break;
  case 'scale':bands(4,[base,lite]);tassets(base,0,1,.16);shoulders(lite);R(dark,'box',[.2,.05,.19],[0,.855,0],1);break;
  case 'lamellar':shell(base);tassets(dark);for(let i=0;i<6;i++)vline(i%2?st:lite,(i-2.5)*.065*cw/.4,tb+.02,yTop);for(let i=0;i<3;i++)hline(st,tb+.06+i*.07,0);ring(8,.22,(i,x,z,a)=>Q(i%2?base:dark,'box',[.08,.15,.02],[x*1.0,tw-.3,z*.74],0,[.2,a,0])).forEach(sp);shoulders(dark);break;
  case 'mail':shell(base);tassets(base);shoulders(dark,1);R(lite,'box',[.22,.05,.2],[0,.85,0],1);for(let i=0;i<5;i++)hline(i%2?lite:dark,tb+.04+i*.05);R(dark,'box',[.46*hp+.07,.03,.33*hp+.06],[0,tw-.22,0],0);break;
  case 'plate':T(base,[ww+.07,wd+.065],[cw+.09,cd+.08],th,[0,tb-.01,0],2);T(base,[F.sw+.02,cd+.08],[.19,.17],.09,[0,.78,0],2);tassets(lite,0,1,.12);T(base,[.4*hp+.07,.3*hp+.06],[ww+.07,wd+.065],.1,[0,tw-.2,0],1);for(const s of [-1,1])T(lite,[.19,.25],[.15,.22],.1,[s*(.19*sh+.02),.78,0],1);R(dark,'box',[.21,.06,.2],[0,.855,0],1);R(st,'box',[cw*.5,.02,.012],[0,.66,fz(.66)+.006],0);break;
 }
 void rich;void e;
 return o;
}

const wearTier=(c?:number)=>c===undefined||!Number.isFinite(c)||c>=.75?'-':String(Math.max(0,Math.ceil(c*8)));
/** Cosmetic wear on OWNED armor and helmets, read from the asset's real condition (near LOD only, no stat change, nothing added when condition is high):
 *  scuffed dark patches and a rubbed bright edge from about three-quarters condition down, a torn gap and a hanging cord when badly worn. */
export function wornGearParts(c:KitCtx,kind:'armor'|'helm',cond:number,col:string):RigPart[]{
 if(!Number.isFinite(cond)||cond>=.75)return [];
 const wear=Math.min(1,(.75-Math.max(0,cond))/.75),n=Math.min(6,1+Math.floor(wear*6)),b=c.look.body,ch=b.chest,dark=shade(col,.55),lite=shade(col,1.22),o:RigPart[]=[];
 for(let i=0;i<n;i++){const h=hashSeed(`${kind}-wear-${c.v}-${i}`),u=(h%97)/97,v=((h>>>7)%89)/89;
  if(kind==='armor')o.push(Q(i%3===2?lite:dark,'box',[.06+u*.07,.03+v*.04,.012],[(u-.5)*.3*ch,.58+v*.2,frontZ(frameOf(c.look.body),.58+v*.2)+.05],0,[0,0,(u-.5)*1.4]));
  else o.push(Q(i%3===2?lite:dark,'box',[.05+u*.06,.03,.02],[(u-.5)*.2,.99+(v-.2)*.18,.15+v*.03],0,[0,0,(u-.5)*1.2]));}
 if(wear>.55){if(kind==='armor')o.push(Q('#1c1712','box',[.09,.1,.02],[.1*ch,.6,frontZ(frameOf(c.look.body),.62)+.052],0,[0,0,.3]),Q(dark,'box',[.012,.16,.012],[.12*ch,.44,frontZ(frameOf(c.look.body),.5)+.05],0,[0,0,.1]));
  else o.push(Q('#1c1712','box',[.06,.05,.02],[-.1,1.04,.15],0));}
 return o;
}

// ---------------------------------------------------------------- helmets
export type HelmKind='leatherCap'|'bronzeHelm'|'ironHelm';
const HELM_COL:Record<HelmKind,string>={leatherCap:'#7a5236',bronzeHelm:'#b48e3e',ironHelm:'#7d8084'};
export function helmetParts(c:KitCtx,kind:HelmKind,style:HelmStyle,leader:boolean):RigPart[]{
 const {look,pal}=c,hs=look.body.head,col=kind==='leatherCap'&&style==='feltcap'?pal.cloth2:HELM_COL[kind],dark=shade(col,.78),lite=shade(col,1.18),ac=pal.accent,tr=pal.trim;
 const o:RigPart[]=[Q(col,'sphere',[.3*hs,.2,.3*hs],[0,.99,-.005],2),Q(dark,'cylinder',[.315*hs,.045,.315*hs],[0,.99,-.005],2,undefined,8)];
 switch(style){
  case 'rounded':o.push(Q(lite,'sphere',[.06,.05,.06],[0,1.17,0],1));break;
  case 'conical':o[0]=Q(col,'cone',[.3*hs,.32,.3*hs],[0,.99,-.005],2,undefined,8);o.push(Q(ac,'sphere',[.05,.05,.05],[0,1.3,0],0),Q(lite,'cylinder',[.2*hs,.02,.2*hs],[0,1.05,-.005],0,undefined,8));break;
  case 'kettle':o.push(Q(col,'cylinder',[.52*hs,.025,.52*hs],[0,1.0,-.005],2,undefined,10),Q(dark,'cylinder',[.32*hs,.03,.32*hs],[0,1.03,-.005],0,undefined,8));break;
  case 'crested':o.push(Q(lite,'box',[.04,.13,.3*hs],[0,1.14,-.01],2),Q(tr,'box',[.18,.05,.03],[0,1.02,.15*hs],1),Q(col,'box',[.04,.16,.12],[-.145*hs,.88,.03],1),Q(col,'box',[.04,.16,.12],[.145*hs,.88,.03],1));break;
  case 'nasal':o.push(Q(lite,'box',[.025,.12,.02],[0,.95,.15*hs],1),Q(col,'box',[.04,.14,.1],[-.145*hs,.88,.03],0),Q(col,'box',[.04,.14,.1],[.145*hs,.88,.03],0));break;
  case 'plumed':o.push(Q(lite,'box',[.03,.07,.05],[0,1.15,0],1),Q(ac,'box',[.03,.3,.012],[.04,1.15,-.01],2,[0,0,-.2]),Q(pal.cloth2,'box',[.03,.34,.012],[0,1.16,-.03],2,[0,0,0]),Q(ac,'box',[.03,.28,.012],[-.04,1.15,-.05],1,[0,0,.2]));break;
  case 'feltcap':o.push(Q(tr,'cylinder',[.32*hs,.03,.32*hs],[0,1.0,-.005],0,undefined,8),Q(ac,'sphere',[.05,.05,.05],[0,1.17,0],0));break;
  case 'horsehair':o.push(Q(lite,'box',[.04,.1,.3*hs],[0,1.14,-.01],1),Q('#2a211c','box',[.12,.4,.05],[0,.72,-.14*hs],2),Q(ac,'sphere',[.05,.05,.05],[0,1.19,.0],0));break;
 }
 if(leader)o.push(Q(pal.metal,'box',[.06,.14,.2],[0,1.2,-.05],1));
 return o;
}

// ---------------------------------------------------------------- shields (socket frame: grip at origin, face along +Z)
export type ShieldKind='woodShield'|'hideShield'|'bronzeShield';
const SHIELD_BASE:Record<ShieldKind,string>={woodShield:'#8a6a42',hideShield:'#b3946c',bronzeShield:'#b48e3e'};
/** A shield face painted from the society's flag (division, colours, charge), so the motif matches banner and insignia. */
export function shieldParts(shape:ShieldShape,flag:{fields:readonly string[];chargeColor:string;division:string},kind:ShieldKind,metal='#8a8478',cond?:number):RigPart[]{
 const f0=flag.fields[0]??SHIELD_BASE[kind],f1=flag.fields[1]??f0,ink=flag.chargeColor,rim=kind==='bronzeShield'?'#b48e3e':'#5a4a38',cx=-.12,cy=.1,z0=.09;
 const R=(col:string,s:Parameters<typeof Q>[1],size:[number,number,number],pos:[number,number,number],lod:0|1|2,rot?:[number,number,number],sides?:number)=>Q(col,s,size,pos,lod,rot,sides);
 const o:RigPart[]=[];const H=Math.PI/2,div=flag.division,vert=/vertical|triband-v/.test(div),hor=/horizontal|triband-h/.test(div),diag=/diagonal|saltire|quarters|canton|pall|checker/.test(div);
 const motif=(w:number,h:number,y0:number)=>{
  if(vert)o.push(R(f1,'box',[w*.3,h*.9,.014],[cx,y0,z0+.03],1));else if(hor)o.push(R(f1,'box',[w*.9,h*.3,.014],[cx,y0+h*.35,z0+.03],1));else if(diag)o.push(R(f1,'box',[w*.3,h*1.05,.014],[cx,y0,z0+.03],1,[0,0,.7]));
  else o.push(R(f1,'cylinder',[w*.55,.014,w*.55],[cx,y0+h*.5,z0+.032],0,[H,0,0],8));
  o.push(R(ink,'box',[w*.2,w*.2,.016],[cx,y0+h*.5,z0+.05],0,[0,0,Math.PI/4]));
 };
 switch(shape){
  case 'round':o.push(R(f0,'cylinder',[.5,.05,.5],[cx,cy,z0],2,[H,0,0],9),R(rim,'cylinder',[.52,.022,.52],[cx,cy,z0+.0],1,[H,0,0],9),R(metal,'sphere',[.13,.13,.07],[cx,cy-.02,z0+.06],1,[H,0,0]));motif(.4,.4,cy-.2);break;
  case 'buckler':o.push(R(f0,'cylinder',[.3,.05,.3],[cx,cy,z0],2,[H,0,0],8),R(rim,'cylinder',[.32,.022,.32],[cx,cy,z0],1,[H,0,0],8),R(metal,'cone',[.14,.1,.14],[cx,cy-.03,z0+.05],1,[H,0,0]));motif(.25,.25,cy-.12);break;
  case 'oval':o.push(R(f0,'sphere',[.44,.7,.07],[cx,cy-.17,z0+.03],2),R(rim,'sphere',[.46,.72,.03],[cx,cy-.18,z0+.02],1),R(metal,'sphere',[.1,.12,.07],[cx,cy-.05,z0+.1],1));motif(.34,.6,cy-.3);break;
  case 'kite':o.push(R(f0,'box',[.42,.3,.05],[cx,cy+.2,z0],2),R(f0,'box',[.32,.26,.05],[cx,cy-.06,z0],2),R(f0,'box',[.2,.2,.05],[cx,cy-.26,z0],2),R(rim,'box',[.44,.03,.056],[cx,cy+.48,z0],1),R(metal,'sphere',[.1,.1,.06],[cx,cy+.15,z0+.06],1));motif(.3,.6,cy-.3);break;
  case 'tower':o.push(R(f0,'box',[.4,.8,.05],[cx,cy-.25,z0],2),R(f0,'cylinder',[.4,.05,.4],[cx,cy+.55,z0],1,[H,0,0],8),R(rim,'box',[.42,.035,.056],[cx,cy-.25,z0],1),R(rim,'box',[.42,.035,.056],[cx,cy+.53,z0],1),R(metal,'sphere',[.1,.1,.06],[cx,cy+.1,z0+.06],1));motif(.3,.7,cy-.2);break;
  case 'wicker':o.push(R(mix(f0,'#b89a62',.5),'cylinder',[.5,.05,.5],[cx,cy,z0],2,[H,0,0],9),...[.42,.32,.2].map((d,i)=>R(i%2?'#8a6a42':'#c8aa70','cylinder',[d,.012,d],[cx,cy,z0+.032],0,[H,0,0],9)),R(metal,'sphere',[.12,.12,.07],[cx,cy-.02,z0+.06],1,[H,0,0]),R(rim,'cylinder',[.52,.022,.52],[cx,cy,z0],1,[H,0,0],9));break;
 }
 if(cond!==undefined&&Number.isFinite(cond)&&cond<.75){const wear=Math.min(1,(.75-Math.max(0,cond))/.75),n=Math.min(6,1+Math.floor(wear*6)),dk=shade(f0,.55),lt=shade(f0,1.22);
  // cosmetic only: scuffs and a rubbed rim, then a chipped gap and a split plank when badly worn (near LOD, bounded)
  for(let i=0;i<n;i++){const h=hashSeed(`shield-wear-${kind}-${shape}-${i}`),u=(h%97)/97,v=((h>>>7)%89)/89;o.push(R(i%3===2?lt:dk,'box',[.05+u*.07,.03+v*.04,.012],[cx+(u-.5)*.3,cy+(v-.5)*.3,z0+.036],0,[0,0,(u-.5)*1.4]));}
  if(wear>.55)o.push(R('#1c1712','box',[.1,.09,.02],[cx+.12,cy+.14,z0+.04],0,[0,0,.4]),R(dk,'box',[.012,.3,.012],[cx-.06,cy,z0+.04],0,[0,0,.12]));}
 return o;
}
export function hammerParts(metal:string):RigPart[]{return [Q('#8a5a2c','cylinder',[.04,.5,.035],[0,-.15,0],2,undefined,5),Q(metal,'box',[.07,.1,.16],[0,.35,0],2),Q(shade(metal,.8),'box',[.05,.06,.05],[0,.35,-.1],1)];}
export function staffParts(look:PeopleLook,pal:{accent:string;trim:string;metal:string}):RigPart[]{
 const top=look.id.length%3;return [Q('#8a5a2c','cylinder',[.045,1.9,.04],[0,-.7,0],2,undefined,5),
  top===0?Q(pal.accent,'sphere',[.14,.14,.14],[0,1.2,0],2):top===1?Q(pal.metal,'cylinder',[.2,.03,.2],[0,1.2,0],2,[Math.PI/2,0,0],8):Q(pal.trim,'pyramid',[.12,.22,.12],[0,1.2,0],2),Q(pal.trim,'cylinder',[.07,.04,.07],[0,1.16,0],0,undefined,5),Q(pal.accent,'box',[.04,.2,.012],[.06,.95,0],1)];
}

// ---------------------------------------------------------------- role kit (worn or carried only when the matching real state says so)
export type RoleFlags={roleKit:boolean};
function roleKit(c:KitCtx,role:Role,type:UnitKind){
 const {pal,bones,look,ind}=c,b=look.body,ch=b.chest,F=frameOf(b),tw=F.tw,fz=(y:number)=>frontZ(F,y)+.03,bz=-(F.cd/2+.05),sd=ind.hand;
 switch(role){
  case 'smith':bones.spine.push(TB(pal.leather,[.3*ch,.04],[.26*ch,.04],.44,[0,tw-.4,fz(tw-.1)-.005],2),Q(shade(pal.leather,.7),'box',[.02,.2,.012],[-.1,.74,fz(.78)],1,[0,0,.5]),Q(shade(pal.leather,.7),'box',[.02,.2,.012],[.1,.74,fz(.78)],1,[0,0,-.5]));break;
  case 'hunter':bones.spine.push(Q(pal.leather,'cylinder',[.1,.46,.09],[-.1,.38,bz],1,[.15,0,.15],6),...[0,1,2].map(i=>Q(pal.accent,'box',[.012,.1,.012],[-.1+i*.025-.025,.82,bz-.015],0,[0,0,.1])),Q(shade(pal.leather,.7),'box',[.02,.5,.012],[0,.55,fz(.7)],1,[0,0,.7]));break;
  case 'scout':bones.spine.push(TB(pal.cloth2,[.3,.12],[.26,.1],.34,[0,.5,bz-.02],2),Q(shade(pal.cloth2,.75),'cylinder',[.1,.36,.1],[0,.86,bz-.04],1,[0,0,Math.PI/2],6),Q(pal.leather,'box',[.02,.5,.012],[0,.55,fz(.7)],1,[0,0,.7]));break;
  case 'merchant':bones.spine.push(Q(pal.leather,'box',[.2,.18,.08],[.2*sd,.46,fz(.5)+.02],1,[0,0,0]),Q(shade(pal.leather,.7),'box',[.02,.5,.012],[0,.55,fz(.7)],1,[0,0,-.7*sd]),TB(pal.cloth2,[.3,.14],[.26,.12],.26,[0,.52,bz-.02],2),Q(pal.accent,'box',[.31,.04,.15],[0,.66,bz-.02],0),Q(pal.metal,'sphere',[.05,.05,.04],[-.2*sd,.4,fz(.45)+.02],0));break;
  case 'farmer':bones.hips.push(Q(pal.leather,'box',[.07,.1,.12],[-.2*sd,.34,.03],1));break;
  case 'priest':bones.spine.push(TB(pal.trim,[.1,.03],[.1,.03],.78,[-.08,.1,fz(.7)+.012],2),TB(pal.trim,[.1,.03],[.1,.03],.78,[.08,.1,fz(.7)+.012],2),Q(pal.accent,'box',[.1,.03,.032],[-.08,.2,fz(.5)+.02],0),Q(pal.accent,'box',[.1,.03,.032],[.08,.2,fz(.5)+.02],0),Q(pal.metal,'sphere',[.06,.06,.04],[0,.78,fz(.78)+.012],0));break;
  case 'soldier':if(type==='archer')bones.spine.push(Q(pal.leather,'cylinder',[.1,.46,.09],[-.1,.38,bz],1,[.15,0,.15],6));bones.spine.push(Q(pal.leather,'box',[.025,.55,.012],[0,.52,fz(.7)+.01],1,[0,0,type==='swordsman'?-.7:.7]));for(const s of [-1,1])bones[s<0?'armL':'armR'].push(Q(pal.leather,'cylinder',[.066*b.limb,.08,.074*b.limb],armSeg(s*armX(b),.61,.08,ARM.foreTilt,(ARM.elbowY-.61)*Math.tan(ARM.foreTilt)),0,[-ARM.foreTilt,0,0],6));break;
  case 'ruler':bones.spine.push(Q(pal.trim,'box',[.025,.55,.012],[0,.52,fz(.7)+.01],1,[0,0,.7]),Q(pal.metal,'sphere',[.06,.06,.04],[-.12,.8,fz(.8)+.01],0));break;
  case 'elder':break;
  default:break;
 }
}

// ---------------------------------------------------------------- the assembler
const SLOT_KINDS:RigSlot[]=['garment','trim','leather','padding','stitch','wood','metal','hair','skin','body','cloak','flag','flag2','charge','team','boot'];
export type PeopleInput=RigInput&{look:PeopleLook;individual:Individual;role:Role;/** Unit.id, for the outfit key only */unitId?:number};
const CLS_HEIGHT:Record<BodyClass,number>={adult:1,child:1,elder:1,leader:1,soldier:1};
/** Build the whole person for the shared rig from a PeopleLook. Same decisions as the first rig (garment only if owned, armor only if owned, helmet and shield only if owned),
 *  now expressed through the society's fibre, cut, layering, features and kit. */
export function peopleOutfit(input:PeopleInput):RigOutfit{
 const {type,gear,culture,season,bodyClass,look,individual:ind,role}=input,era=input.era??1,rich=era>=3?2:era>=2?1:0,ignored:string[]=[],rendered:RigOutfit['rendered']={};
 const g=gear.garment&&Number.isFinite(gear.garment.condition)&&gear.garment.condition>0?gear.garment:undefined,item:GarmentId|undefined=g?.item;
 const dress=g?dressFor(culture,season,g.item):dressFor(culture,season),warmth=item?warmthOf(item):'light',fibre=item?fibreOf(look,item):null;
 const seasonCold=season==='winter'||season==='autumn',cold=warmth==='cold'||(warmth==='mild'&&season==='winter');
 let cut={...look.cuts[warmth]};
 // role cuts: priest long sleeves and hem, smith sleeveless, farmer short sleeves, child plain
 if(role==='priest')cut={...cut,torso:'robe',hem:Math.min(cut.hem,.08),sleeve:'long',lower:cut.lower==='none'?'trousers':cut.lower,belt:'sash'};
 if(role==='smith')cut={...cut,sleeve:'none',mantle:'none',hem:Math.max(cut.hem,.2),belt:'wide'};
 if(role==='farmer'||role==='worker'&&cut.sleeve==='wide')cut={...cut,sleeve:cut.sleeve==='long'?'short':cut.sleeve};
 if(role==='child')cut={...cut,mantle:cold?cut.mantle:'none',belt:cut.belt==='wide'?'cord':cut.belt};
 if(!cold&&!seasonCold&&cut.mantle!=='none'&&role!=='ruler')cut={...cut,mantle:cut.mantle==='feather'?'feather':'none'};
 if(!g)cut={torso:'bare',hem:.3,sleeve:'none',lower:'kilt',mantle:'none',belt:'cord'};
 const pal=paletteFor(look,ind,bodyClass,fibre,look.dyes.cloth[0]||dress.body,dress.trim||look.dyes.trim,role);
 if(!g){pal.cloth=mix(input.teamColor,pal.skin,.3);pal.cloth2=pal.cloth;}
 const bones=emptyBones();
 const c:KitCtx={look,ind,cls:bodyClass,role,item,fibre,cond:g?.condition??1,season,rich,cut,pal,bones,v:ind.variant,cold};
 bodyParts(c);
 const gp=g?garmentParts(c):{cloakShoulders:false,coversNeck:false};
 if(g){rendered.garment=g.item;rendered.cut=dress.cut;}else if(gear.garment)ignored.push('garment with no condition left is not drawn');
 // headwear: the society's, by warmth; hood when the cut says so; role overrides
 let hk=cold?look.head.cold:look.head.light;if(cut.mantle==='hood'&&cold)hk='hood';if(role==='ruler'||role==='priest')hk=look.head.rank;if(role==='farmer'&&!cold)hk=look.head.light==='none'?'headcloth':look.head.light;if(role==='smith')hk='none';if(role==='child'&&hk==='plume')hk='fillet';
 if(!g&&warmth==='light')hk=ind.variant%2?hk:'none';
 const hasHelm=!!(gear.helmet&&gear.helmet.condition>0);
 const hairCovered=!hasHelm&&headwearParts(c,hasHelm?'none':hk);
 if(!hasHelm&&hk!=='none'){rendered.headwear=dress.headwear;}
 headParts(c,hairCovered||hasHelm);
 footParts(c,cold?look.foot.cold:look.foot.warm);
 if(bodyClass!=='child'){jewelParts(c,ind.jewel);if(ind.mark)markParts(c,ind.mark);}
 // insignia from the owned garment's cloth, cut to the new trunk: soldier shoulder cloth, a chest patch, a leader's collar badge
 if(g&&type!=='worker'){const F=frameOf(look.body),side=ind.variant%2?1:-1;const ins:RigPart[]=[];
  if(type==='spearman'||type==='archer'||type==='ranger'){ins.push(Q(pal.trim,'box',[.17,.04,.2],[-side*.2,.835,0],0));if(rich>=2)ins.push(Q(pal.trim,'box',[.17,.015,.21],[-side*.2,.875,0],0));}
  else if(type==='swordsman'||type==='warden')ins.push(Q(pal.trim,'box',[.14,.14,.02],[0,.6,frontZ(F,.67)+.02],0));
  else if(type==='leader')ins.push(Q(pal.trim,'box',[.15,.15,.02],[0,.6,frontZ(F,.67)+.02],0));
  if(ins.length){rendered.insignia=type;for(const q of ins)bones.spine.push(q);}}
 roleKit(c,role,type);
 // armor: owned padded torso built in the society's padded style; other protection kinds draw by kind
 if(gear.armor){
  const k=gear.armor.kind as string,style:ArmorStyle|null=k==='paddedTorso'?look.armor.padded:k==='hideCuirass'?'hide':k==='scaleCuirass'?'scale':k==='lamellar'?'lamellar':k==='mail'?'mail':k==='plate'?'plate':null;
  if(style&&gear.armor.condition>0){rendered.armor='paddedTorso';for(const q of armorParts(c,style)){bones[(q.pos[1]+(q.shape==='box'||q.shape==='sphere'?q.size[1]/2:0))<.5?'hips':'spine'].push(q);}for(const q of wornGearParts(c,'armor',gear.armor.condition,PADDED_BASE[style]))bones.spine.push(q);
   bones.spine.push(Q(input.affiliation??'#c2b080','box',[.2,.2,.03],[0,.58,frontZ(frameOf(look.body),.68)+.058],1,[.1,0,0]));}
  else ignored.push(`armor kind '${k}' is not a known asset kind`);
 }
 const hm=hasHelm?gear.helmet!:undefined;
 if(hm){rendered.helmet=hm.kind;for(const q of helmetParts(c,hm.kind,look.helm,role==='ruler'))bones.head.push(q);for(const q of wornGearParts(c,'helm',hm.condition,HELM_COL[hm.kind]))bones.head.push(q);}else if(gear.helmet)ignored.push('helmet with no condition left is not drawn');
 // ruler: cloak and circlet from the society's flag, as the first rig, on top of the society's rank headwear
 const flag=culture.flag;
 if(type==='leader'){
  bones.spine.push(TB(earthy(mix(flag.fields[0] as string,'#000000',.12),.45),[.56,.08],[.34,.06],.78,[0,.08,-(frameOf(look.body).cd/2+.05)],2,[.1,0,0]),Q(pal.metal,'box',[.06,.07,.02],[0,.8,frontZ(frameOf(look.body),.8)+.03],1));
 }
 // sockets
 const itemR=type==='leader'?'standard':type==='spearman'?'spear':type==='swordsman'?'blade':type==='warden'?'axe':role==='priest'?'staff':undefined,itemL=type==='archer'||type==='ranger'?'bow':gear.shield&&gear.shield.condition>0?'shield':undefined;
 if(itemR)rendered.weapon=itemR==='spear'?'spear':itemR==='blade'?'blade':undefined;if(itemL==='bow')rendered.weapon='bow';if(itemR==='standard')rendered.standard=true;if(itemL==='shield'){rendered.shield=gear.shield!.kind;if(gear.shield!.condition<.75)rendered.shieldCondition=gear.shield!.condition;}
 const colors={} as Record<RigSlot,string>;
 const garmentColor=pal.cloth,trimColor=pal.trim;
 Object.assign(colors,{garment:garmentColor,trim:trimColor,leather:pal.leather,padding:PADDED_BASE[look.armor.padded],stitch:input.affiliation??'#c2b080',wood:'#8a5a2c',metal:pal.metal,hair:pal.hair,skin:pal.skin,body:garmentColor,cloak:mix(flag.fields[0] as string,'#000000',.12),flag:flag.fields[0] as string,flag2:flag.fields[1] as string,charge:flag.chargeColor,team:input.teamColor,boot:shade(pal.leather,.6)});
 for(const k of SLOT_KINDS)if(!colors[k])colors[k]='#808080';
 const key=['rig2',look.id,bodyClass,type,role,rendered.garment??'-',item??'-',cut.torso,cut.mantle,hk,rendered.armor?look.armor.padded+(gear.armor?.kind??''):'-',rendered.helmet??'-',rendered.shield??'-',ind.skinTone,ind.hairColour,ind.hair,ind.beard,ind.jewel.join('+'),ind.mark?ind.mark.pattern+ind.mark.sites.join(''):'-',ind.patches,ind.variant,ind.hand,season,rich,culture.key,input.teamColor,input.affiliation??'-',g?Math.round((g.condition)*4):'-',wearTier(gear.armor?.condition),wearTier(gear.helmet?.condition),itemL==='shield'?wearTier(gear.shield?.condition):'-'].join('|');
 void CLS_HEIGHT;void hashSeed;void lookForSkin;void individualFor;
 return {key,bones,colors,itemR,itemL,bodyClass,rendered,ignored,fit:bodyClass,look,role,ind,frame:{height:look.body.height*ind.height,build:ind.build,dirt:ind.dirt}} as RigOutfit;
}
export type {Palette,Season,Culture,RigBone,RigGear};
