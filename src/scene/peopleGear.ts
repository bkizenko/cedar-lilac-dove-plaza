/** PEOPLE GEAR (people v2): armor by PROTECTION TYPE first (padding, hide, wicker, bark, laminated linen, scale, lamellar, mail, plate), then the
 *  society's dress on top; helmets and shields with motifs; role kit; and `peopleOutfit`, the assembler the shared rig calls. Pure data and maths.
 *
 *  Nothing here is free equipment. The simulation owns one armor kind today (`paddedTorso`); this society builds it in its own padded style
 *  (look.armor.padded: quilted cotton, felt, hide, wicker, bark, laminated linen). Scale, lamellar, mail and plate parts exist for the assets
 *  that will own those kinds, and helmets and shields are drawn only when the unit owns one (RigGear), exactly like the first rig. Role kit
 *  is worn or carried only when the matching real state says so (see peopleLook.roleOf). */
import {hashSeed} from './buildingParts';
import {dressFor,type Culture,type GarmentId,type Season} from './cultureGrammar';
import {insigniaParts,mix,type UnitKind} from './unitAppearance';
import type {BodyClass,RigBone,RigGear,RigInput,RigOutfit,RigPart,RigSlot} from './characterRig';
import {bodyParts,emptyBones,footParts,headParts,headwearParts,jewelParts,markParts,paletteFor,Q,shade,type KitCtx,type Palette} from './peopleKit';
import {garmentParts} from './peopleGarb';
import {fibreOf,individualFor,lookForSkin,warmthOf,type ArmorStyle,type HelmStyle,type Individual,type PeopleLook,type Role,type ShieldShape} from './peopleLook';

const TAU=Math.PI*2;
const ring=(n:number,r:number,f:(i:number,x:number,z:number,a:number)=>RigPart)=>Array.from({length:n},(_,i)=>{const a=i/n*TAU;return f(i,Math.sin(a)*r,Math.cos(a)*r,a);});
const PADDED_BASE:Record<ArmorStyle,string>={quilted:'#dcd2b6',felt:'#b9b09a',hide:'#80583a',wicker:'#bd9d66',bark:'#7e5e3e',linen:'#e2d8be',scale:'#b48e3e',lamellar:'#8c3c30',mail:'#8d9296',plate:'#a3a7ab'};
/** Protection class of each style, for tests and for the simulation to adopt: what the part claims to protect with. */
export const PROTECTION_CLASS:Record<ArmorStyle,'padding'|'hide'|'wicker'|'bark'|'laminate'|'scale'|'lamellar'|'mail'|'plate'>={quilted:'padding',felt:'padding',hide:'hide',wicker:'wicker',bark:'bark',linen:'laminate',scale:'scale',lamellar:'lamellar',mail:'mail',plate:'plate'};

/** Torso armor of one protection type, then the society's colour. Spine and hips bones; shoulders sit on the spine. */
export function armorParts(c:KitCtx,style:ArmorStyle):RigPart[]{
 const {look,pal,rich}=c,b=look.body,w=b.waist,ch=b.chest,sh=b.shoulder,base=mix(PADDED_BASE[style],pal.cloth,style==='quilted'||style==='felt'||style==='linen'?.3:style==='lamellar'?.1:.08),dark=shade(base,style==='quilted'?.84:.72),lite=shade(base,1.14),st=pal.accent;
 const o:RigPart[]=[],sp=(p:RigPart)=>{o.push(p);return p;},R=(col:string,sh2:Parameters<typeof Q>[1],size:[number,number,number],pos:[number,number,number],lod:0|1|2,rot?:[number,number,number],sides?:number)=>sp(Q(col,sh2,size,pos,lod,rot,sides));
 const shellB=.32*w+.07,shellT=.37*ch+.06;
 const shoulders=(col:string,l:0|1|2=1)=>{for(const s of [-1,1])R(col,'box',[.15,.07,.22],[s*(.19*sh+.015),.82,0],l);};
 switch(style){
  case 'quilted':R(base,'cylinder',[shellB,.38,shellT],[0,.49,0],2,undefined,8);R(base,'cylinder',[.4*w+.12,.2,shellB],[0,.34,0],1,undefined,8);for(let i=0;i<4;i++)R(dark,'box',[.4*ch,.014,.014],[0,.52+i*.09,.186*ch+.045],0);for(let i=-2;i<=2;i++)R(dark,'box',[.014,.34,.014],[i*.07,.5,.186*ch+.045],0);shoulders(base);R(lite,'cylinder',[.2,.04,.19],[0,.86,0],1,undefined,8);break;
  case 'felt':R(base,'cylinder',[shellB+.03,.4,shellT+.03],[0,.48,0],2,undefined,8);R(base,'cylinder',[.42*w+.12,.22,shellB+.03],[0,.32,0],1,undefined,8);R(st,'cylinder',[.42*w+.14,.035,.42*w+.14],[0,.32,0],0,undefined,8);R(dark,'cylinder',[.24,.07,.2],[0,.85,0],1,undefined,8);shoulders(base);R(st,'box',[.3*ch,.03,.012],[0,.64,.19*ch+.05],0);break;
  case 'hide':R(base,'cylinder',[shellB,.38,shellT],[0,.49,0],2,undefined,8);R(base,'cylinder',[.42*w+.1,.18,shellB],[0,.35,0],1,undefined,8);shoulders(dark);for(let i=0;i<4;i++)R(lite,'box',[.02,.012,.012],[(i%2?.03:-.03),.56+i*.07,.19*ch+.05],0,[0,0,i%2?.5:-.5]);R(lite,'box',[.012,.3,.012],[0,.55,.19*ch+.05],0);ring(8,.22,(i,x,z)=>Q(dark,'cone',[.07,.1,.05],[x,.28,z],0,[Math.PI,0,0],3)).forEach(sp);break;
  case 'wicker':for(let i=0;i<5;i++)R(i%2?dark:base,'cylinder',[shellB+.03-(i===4?.02:0),.085,shellT-(i<1?.04:0)],[0,.46+i*.085,0],1,undefined,8);R(base,'cylinder',[.38*w+.1,.18,shellB],[0,.34,0],1,undefined,8);for(let i=0;i<6;i++){const a=i/6*TAU;R(lite,'box',[.015,.4,.015],[Math.sin(a)*.2*ch,.46,Math.cos(a)*.2*ch],0);}shoulders(base,0);break;
  case 'bark':R(dark,'cylinder',[shellB-.02,.38,shellT-.02],[0,.49,0],1,undefined,8);ring(8,.19*ch,(i,x,z,a)=>Q(i%2?base:lite,'box',[.12,.34,.035],[x,.5,z],1,[0,a,0])).forEach(sp);ring(8,.22,(i,x,z,a)=>Q(base,'box',[.1,.16,.03],[x,.32,z],0,[0.18,a,0])).forEach(sp);shoulders(base,0);R(st,'cylinder',[.38*w+.07,.03,.38*w+.07],[0,.55,0],0,undefined,8);break;
  case 'linen':for(let i=0;i<4;i++)R(i%2?dark:base,'cylinder',[shellB+.02+i*.003,.1,shellT-.03+(i<1?-.02:0)],[0,.46+i*.1,0],1,undefined,8);for(const s of [-1,1])R(base,'box',[.14,.2,.025],[s*(.19*sh+.03),.64,.06],0);ring(10,.21,(i,x,z,a)=>Q(i%2?base:lite,'box',[.07,.17,.012],[x,.3,z],0,[0.12,a,0])).forEach(sp);R(st,'cylinder',[.34*w+.08,.04,.34*w+.08],[0,.5,0],0,undefined,8);shoulders(lite,0);break;
  case 'scale':for(let i=0;i<5;i++)R(i%2?base:lite,'cylinder',[shellB+.03,.1,shellT-.015-i*.004],[0,.45+i*.088,0],1,undefined,8);R(base,'cylinder',[.42*w+.11,.14,shellB],[0,.34,0],1,undefined,8);R(dark,'cylinder',[.42*w+.12,.025,.42*w+.12],[0,.34,0],0,undefined,8);shoulders(lite);R(dark,'cylinder',[.2,.05,.19],[0,.86,0],1,undefined,8);break;
  case 'lamellar':R(base,'cylinder',[shellB,.38,shellT],[0,.49,0],2,undefined,8);R(base,'cylinder',[.42*w+.1,.2,shellB],[0,.33,0],1,undefined,8);for(let i=0;i<8;i++){const a=i/8*TAU;R(i%2?st:lite,'box',[.025,.34,.012],[Math.sin(a)*.2*ch,.5,Math.cos(a)*.2*ch],0,[0,a,0]);}for(let i=0;i<3;i++)R(st,'cylinder',[shellB+.04,.016,shellT+.01],[0,.54+i*.11,0],0,undefined,8);ring(8,.23,(i,x,z,a)=>Q(i%2?base:dark,'box',[.08,.17,.02],[x,.22,z],0,[.2,a,0])).forEach(sp);shoulders(dark);break;
  case 'mail':R(base,'cylinder',[shellB,.4,shellT],[0,.47,0],2,undefined,8);R(base,'cylinder',[.42*w+.1,.22,shellB],[0,.3,0],1,undefined,8);shoulders(dark,1);R(lite,'cylinder',[.22,.07,.2],[0,.85,0],1,undefined,8);for(let i=0;i<5;i++)R(i%2?lite:dark,'box',[.42*ch,.012,.012],[0,.52+i*.07,.19*ch+.055],0);R(dark,'cylinder',[.42*w+.12,.03,.42*w+.12],[0,.3,0],0,undefined,8);break;
  case 'plate':R(base,'sphere',[.4*ch,.4,.3*ch],[0,.47,.015],2);R(base,'cylinder',[shellB-.03,.3,shellT-.04],[0,.5,-.02],1,undefined,8);R(lite,'cylinder',[.4*w+.1,.1,shellB+.02],[0,.4,0],1,undefined,8);R(base,'cylinder',[.44*w+.13,.1,.4*w+.1],[0,.32,0],1,undefined,8);for(const s of [-1,1])R(lite,'sphere',[.17,.12,.2],[s*(.19*sh+.03),.78,0],1);R(dark,'cylinder',[.2,.06,.19],[0,.86,0],1,undefined,8);R(st,'cylinder',[.4*ch+.01,.02,.3*ch+.01],[0,.58,.01],0,undefined,8);break;
 }
 void rich;
 return o;
}

const wearTier=(c?:number)=>c===undefined||!Number.isFinite(c)||c>=.75?'-':String(Math.max(0,Math.ceil(c*8)));
/** Cosmetic wear on OWNED armor and helmets, read from the asset's real condition (near LOD only, no stat change, nothing added when condition is high):
 *  scuffed dark patches and a rubbed bright edge from about three-quarters condition down, a torn gap and a hanging cord when badly worn. */
export function wornGearParts(c:KitCtx,kind:'armor'|'helm',cond:number,col:string):RigPart[]{
 if(!Number.isFinite(cond)||cond>=.75)return [];
 const wear=Math.min(1,(.75-Math.max(0,cond))/.75),n=Math.min(6,1+Math.floor(wear*6)),b=c.look.body,ch=b.chest,dark=shade(col,.55),lite=shade(col,1.22),o:RigPart[]=[];
 for(let i=0;i<n;i++){const h=hashSeed(`${kind}-wear-${c.v}-${i}`),u=(h%97)/97,v=((h>>>7)%89)/89;
  if(kind==='armor')o.push(Q(i%3===2?lite:dark,'box',[.06+u*.07,.03+v*.04,.012],[(u-.5)*.3*ch,.46+v*.3,.19*ch+.058],0,[0,0,(u-.5)*1.4]));
  else o.push(Q(i%3===2?lite:dark,'box',[.05+u*.06,.03,.02],[(u-.5)*.2,.99+(v-.2)*.18,.15+v*.03],0,[0,0,(u-.5)*1.2]));}
 if(wear>.55){if(kind==='armor')o.push(Q('#1c1712','box',[.09,.1,.02],[.1*ch,.62,.19*ch+.06],0,[0,0,.3]),Q(dark,'box',[.012,.16,.012],[.12*ch,.38,.19*ch+.06],0,[0,0,.1]));
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
 const {pal,bones,look,ind}=c,b=look.body,ch=b.chest,tw=.57+b.torso*.5;
 switch(role){
  case 'smith':bones.spine.push(Q(pal.leather,'box',[.28*ch,.42,.03],[0,tw-.34,.19*ch],2),Q(shade(pal.leather,.7),'box',[.02,.2,.012],[-.1,.78,.17],1,[0,0,.5]),Q(shade(pal.leather,.7),'box',[.02,.2,.012],[.1,.78,.17],1,[0,0,-.5]));break;
  case 'hunter':bones.spine.push(Q(pal.leather,'cylinder',[.1,.46,.09],[-.1,.38,-.2],1,[.15,0,.15],6),...[0,1,2].map(i=>Q(pal.accent,'box',[.012,.1,.012],[-.1+i*.025-.025,.82,-.215],0,[0,0,.1])),Q(shade(pal.leather,.7),'box',[.02,.5,.012],[0,.55,.18],1,[0,0,.7]));break;
  case 'scout':bones.spine.push(Q(pal.cloth2,'box',[.3,.34,.12],[0,.5,-.22],2),Q(shade(pal.cloth2,.75),'cylinder',[.1,.36,.1],[0,.86,-.24],1,[0,0,Math.PI/2],6),Q(pal.leather,'box',[.02,.5,.012],[0,.55,.18],1,[0,0,.7]));break;
  case 'merchant':bones.spine.push(Q(pal.leather,'box',[.2,.18,.08],[.2*ind.hand,.46,.15],1,[0,0,0]),Q(shade(pal.leather,.7),'box',[.02,.5,.012],[0,.55,.18],1,[0,0,-.7*ind.hand]),Q(pal.cloth2,'box',[.3,.26,.14],[0,.52,-.22],2),Q(pal.accent,'box',[.31,.04,.15],[0,.66,-.22],0),Q(pal.metal,'sphere',[.05,.05,.04],[-.2*ind.hand,.4,.16],0));break;
  case 'farmer':bones.hips.push(Q(pal.leather,'box',[.14,.1,.07],[-.18*ind.hand,.38,.16],1));break;
  case 'priest':bones.spine.push(Q(pal.trim,'box',[.1,.74,.03],[-.08,.12,.2*ch],2),Q(pal.trim,'box',[.1,.74,.03],[.08,.12,.2*ch],2),Q(pal.accent,'box',[.1,.03,.032],[-.08,.2,.2*ch],0),Q(pal.accent,'box',[.1,.03,.032],[.08,.2,.2*ch],0),Q(pal.metal,'sphere',[.06,.06,.04],[0,.8,.19],0));break;
  case 'soldier':if(type==='archer')bones.spine.push(Q(pal.leather,'cylinder',[.1,.46,.09],[-.1,.38,-.2],1,[.15,0,.15],6));bones.spine.push(Q(pal.leather,'box',[.025,.55,.012],[0,.52,.19],1,[0,0,type==='swordsman'?-.7:.7]));break;
  case 'ruler':bones.spine.push(Q(pal.trim,'box',[.025,.55,.012],[0,.52,.19],1,[0,0,.7]),Q(pal.metal,'sphere',[.06,.06,.04],[-.12,.84,.15],0));break;
  case 'elder':bones.spine.push(Q(pal.cloth2,'box',[.42,.14,.28],[0,.74,-.02],1));break;
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
 const pal=paletteFor(look,ind,bodyClass,fibre,look.dyes.cloth[0]||dress.body,dress.trim||look.dyes.trim);
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
 // insignia (worker sash, soldier shoulder cloth, chest patch) from the owned garment's cloth, as the first rig
 if(g&&type!=='worker'){const ins=insigniaParts(type,rich,ind.variant).filter(p=>!(type==='leader'&&(p.slot==='wood'||p.pos[1]>1.2||p.pos[0]<-.2))).map(p=>({...p,slot:p.slot as RigSlot}));if(ins.length){rendered.insignia=type;for(const q of ins)bones.spine.push(q);}}
 roleKit(c,role,type);
 // armor: owned padded torso built in the society's padded style; other protection kinds draw by kind
 if(gear.armor){
  const k=gear.armor.kind as string,style:ArmorStyle|null=k==='paddedTorso'?look.armor.padded:k==='hideCuirass'?'hide':k==='scaleCuirass'?'scale':k==='lamellar'?'lamellar':k==='mail'?'mail':k==='plate'?'plate':null;
  if(style&&gear.armor.condition>0){rendered.armor='paddedTorso';for(const q of armorParts(c,style)){bones[(q.pos[1]+(q.shape==='box'||q.shape==='sphere'?q.size[1]/2:0))<.5?'hips':'spine'].push(q);}for(const q of wornGearParts(c,'armor',gear.armor.condition,PADDED_BASE[style]))bones.spine.push(q);
   bones.spine.push(Q(input.affiliation??'#c2b080','box',[.2,.2,.03],[0,.58,.2],1));}
  else ignored.push(`armor kind '${k}' is not a known asset kind`);
 }
 const hm=hasHelm?gear.helmet!:undefined;
 if(hm){rendered.helmet=hm.kind;for(const q of helmetParts(c,hm.kind,look.helm,role==='ruler'))bones.head.push(q);for(const q of wornGearParts(c,'helm',hm.condition,HELM_COL[hm.kind]))bones.head.push(q);}else if(gear.helmet)ignored.push('helmet with no condition left is not drawn');
 // ruler: cloak and circlet from the society's flag, as the first rig, on top of the society's rank headwear
 const flag=culture.flag;
 if(type==='leader'){
  bones.spine.push(Q(mix(flag.fields[0] as string,'#000000',.12),'cone',[.62,.78,.5],[0,.2,-.1],2,[.12,0,0],8),Q(pal.metal,'box',[.06,.07,.02],[0,.82,.14],1));
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
