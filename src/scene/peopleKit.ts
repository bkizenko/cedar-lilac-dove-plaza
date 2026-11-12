/** PEOPLE KIT (people v2): part generators for the shared rig, driven by a PeopleLook and one Individual. Pure data and maths, no three.js.
 *
 *  Everything is cut from simple shapes (box, tapered cylinder, cone, sphere) in the rig's unit frame (feet y=0, +Z forward, shoulders .86,
 *  head centre ~1.06) and split per bone so it moves with the body. Parts carry their own colour (`col`), so one geometry builder serves
 *  every society and the instancer still shares draws between identical bones. LOD: part.lod 2 = every tier (the silhouette), 1 = near and
 *  mid, 0 = near only (face, jewellery, marks, fibre detail, patches). Nothing here invents equipment: gear parts (armor, helmet, shield,
 *  weapon) live in peopleGear.ts and are drawn only when owned; clothing is the owned garment cut by the society's fibre and cut;
 *  worn-ness (patches, frayed hem) reads the garment's real condition. */
import {part,type LodTier,type Part} from './buildingParts';
import {mix} from './unitAppearance';
import type {RigBone,RigPart,RigSlot} from './characterRig';
import {skinColour,fibreOf,warmthOf,SKIN_RAMP,type BeardStyle,type Cut,type Fibre,type Foot,type HairStyle,type HeadKind,type Individual,type Jewel,type MarkPattern,type PeopleLook,type Role} from './peopleLook';
import type {BodyClass} from './characterRig';

export type Bones=Record<RigBone,RigPart[]>;
export const emptyBones=():Bones=>({hips:[],spine:[],head:[],armL:[],armR:[],legL:[],legR:[]});
/** Coloured part. `slot` is only a fallback; `col` wins. */
export const Q=(col:string,shape:Part['shape'],size:[number,number,number],pos:[number,number,number],lod:LodTier,rot?:[number,number,number],sides?:number,onlyFrom?:LodTier):RigPart=>({...part(shape,'cloth',size,pos,lod,rot,sides),slot:'garment' as RigSlot,col,...(onlyFrom!==undefined?{onlyFrom}:{})});
export const shade=(hex:string,k:number)=>mix(hex,k<1?'#000000':'#ffffff',Math.min(1,Math.abs(1-k)));

export const FIBRE_BASE:Record<Fibre,string>={linen:'#ddd0ae',wool:'#b3aa90',felt:'#c9c0a8',hide:'#a07a52',fur:'#76503a',cotton:'#e6decb',bark:'#9c7c54',feather:'#cdbb8c',silk:'#eadcbc',leather:'#74492f'};
export const DYE_K:Record<Fibre,number>={linen:.78,wool:.72,felt:.55,hide:.16,fur:.1,cotton:.86,bark:.4,feather:.3,silk:.92,leather:.22};
const sideOf=(i:number)=>i<0?'L':'R';
const CLASS_HEM:Record<BodyClass,number>={adult:0,child:.02,elder:-.02,leader:-.03,soldier:.02};

export type Palette={skin:string;hair:string;cloth:string;cloth2:string;under:string;trim:string;accent:string;leather:string;metal:string;fur:string;paint:string};
export type KitCtx={look:PeopleLook;ind:Individual;cls:BodyClass;role:Role;item?:string;fibre:Fibre|null;cond:number;season:string;rich:number;cut:Cut;pal:Palette;bones:Bones;v:number;cold:boolean};

/** Hex colours of one person: skin from the society's band, hair greying with age, cloth from the real garment's fibre and the society's dye family. */
export function paletteFor(look:PeopleLook,ind:Individual,cls:BodyClass,fibre:Fibre|null,dyeBody:string,dyeTrim:string):Palette{
 const skin=skinColour(look,ind.skinTone),h0=look.hair.colors[ind.hairColour%look.hair.colors.length],grey=cls==='elder'?.55+ind.age*.4:ind.age>.6?.18:0,hair=grey>0?mix(h0,'#d0ccc2',Math.min(.95,grey)):h0;
 const dyes=look.dyes,di=ind.variant<2?0:ind.variant-1,body=di===0?dyeBody:dyes.cloth[di%dyes.cloth.length],base=fibre?FIBRE_BASE[fibre]:'#a88b61',k=fibre?DYE_K[fibre]:0,cloth=mix(base,body,k),FURS=['#6e5440','#8a7258','#a89478','#4a3a30'];
 return {skin,hair,cloth,cloth2:mix(base,dyes.cloth[(di+1)%dyes.cloth.length],k),under:dyes.under,trim:dyeTrim||dyes.trim,accent:dyes.accent,leather:mix('#70462f',skin,.12),metal:'#8a8478',fur:mix(FURS[(ind.variant+ind.hairColour)%4],cloth,.08),paint:look.mark.colour};
}

// ---------------------------------------------------------------- body
/** Skin body, clothed where the cut covers it (sleeve and trouser colour are the body part colour: no extra triangles). */
export function bodyParts(c:KitCtx){
 const {look,ind,cut,pal,bones,cls}=c,b=look.body,covered=cut.torso==='tunic'||cut.torso==='robe'||cut.torso==='deel'||cut.torso==='poncho';
 const sleeveUp=cut.sleeve!=='none',sleeveLow=cut.sleeve==='long'||cut.sleeve==='wide',trousers=cut.lower==='trousers'||cut.lower==='leggings'||cut.lower==='dhoti';
 const tw=.57+b.torso*.5,w=b.waist,sh=b.shoulder,ch=b.chest,hp=b.hip,lt=b.limb,hand=b.hand;
 const cloth=pal.cloth,sk=pal.skin;
 for(const sd of [-1,1] as const){
  const leg:RigBone=sd<0?'legL':'legR',arm:RigBone=sd<0?'armL':'armR',x=sd*.085*hp,legCol=trousers?(cut.lower==='leggings'?pal.cloth2:cloth):sk;
  bones[leg].push(Q(legCol,'cylinder',[.07*lt,.25,.098*lt],[x,.07,0],2,undefined,6),Q(legCol,'cylinder',[.098*lt,.24,.132*lt],[x,.27,0],2,undefined,6));
  const ax=sd*(.17+.04*sh),upper=sleeveUp&&covered?cloth:sk,lower=sleeveLow&&covered?(cut.sleeve==='wide'?pal.cloth2:cloth):sk;
  bones[arm].push(Q(upper,'cylinder',[.074*lt,.16,.095*lt],[ax,.71,0],2,undefined,6),Q(lower,'cylinder',[.056*lt,.16,.074*lt],[ax,.55,0],2,undefined,6),Q(sk,'box',[.07*hand,.075*hand,.075*hand],[ax,.48,.01],1,undefined,undefined,1),
   // near only: a rounded mitten fist instead of the box hand (24 vs 12 tris); mid keeps the box so the far/mid budgets are unchanged
   Q(sk,'cylinder',[.066*hand,.07*hand,.072*hand],[ax,.4825,.012],0,undefined,6));
  if(cut.sleeve==='wide'&&covered)bones[arm].push(Q(pal.cloth2,'cone',[.15,.1,.15],[ax,.42,0],1,[Math.PI,0,0],6),Q(pal.trim,'cylinder',[.15,.02,.15],[ax,.42,0],0,undefined,6));
 }
 const torsoCol=covered?cloth:sk,hipCol=cut.lower!=='none'||covered?cloth:sk;
 bones.hips.push(Q(hipCol,'cylinder',[.31*hp,.16,.28*w],[0,.42,0],2,undefined,7));
 bones.spine.push(Q(torsoCol,'cylinder',[.27*w,tw-.5+.22,.34*ch],[0,tw-.14,0],2,undefined,8),Q(torsoCol,'box',[.38*sh+.06,.085,.2*ch],[0,.805,0],1,undefined,undefined,1),Q(torsoCol,'cylinder',[.092,.38*sh+.06,.2*ch],[0,.8,0],0,[0,0,Math.PI/2],8),Q(sk,'cylinder',[.09*b.neck,.07+.02*b.neck,.078*b.neck],[0,.885,0],0,undefined,5));
 void cls;
}

// ---------------------------------------------------------------- head, hair, face
const HAIR_LOD:LodTier=1;
function hairParts(c:KitCtx,style:HairStyle,covered:boolean){
 const {pal,bones,look}=c,hs=look.body.head,hair=pal.hair,sk=pal.skin,out:RigPart[]=bones.head,cap=(l:LodTier=2)=>Q(hair,'cylinder',[.26*hs,.1*hs,.25*hs],[0,1.08*1,-.012],l,undefined,7);
 const back=(h:number,y:number,w=.25,d=.07,l:LodTier=1)=>Q(hair,'box',[w*hs,h,d],[0,y,-.125*hs],l);
 if(style==='wrapped'||covered)return out.push(Q(hair,'box',[.2*hs,.1,.05],[0,.95,-.12*hs],HAIR_LOD));
 const stub=mix(hair,sk,.62);
 switch(style){
  case 'shaved':out.push(Q(stub,'cylinder',[.25*hs,.07,.24*hs],[0,1.1,-.01],1,undefined,7));break;
  case 'crop':out.push(cap(2),back(.12,.97,.24,.05,1));break;
  case 'bob':out.push(cap(2),back(.2,.9,.28,.07,2),Q(hair,'box',[.045,.18,.18*hs],[-.135*hs,.95,-.03],1),Q(hair,'box',[.045,.18,.18*hs],[.135*hs,.95,-.03],1));break;
  case 'long':out.push(cap(2),back(.46,.64,.26,.08,2),Q(hair,'box',[.04,.3,.1],[-.13*hs,.8,-.08],1),Q(hair,'box',[.04,.3,.1],[.13*hs,.8,-.08],1));break;
  case 'topknot':out.push(Q(hair,'cylinder',[.25*hs,.08*hs,.24*hs],[0,1.09,-.01],2,undefined,7),Q(hair,'sphere',[.1,.11,.1],[0,1.17,-.01],2),Q(pal.accent,'cylinder',[.07,.025,.07],[0,1.165,-.01],0,undefined,5),back(.12,.97,.22,.04,1));break;
  case 'braids':out.push(cap(2),...[-1,1].flatMap(s=>[Q(hair,'cylinder',[.05,.34,.045],[s*.115*hs,.7,-.07],1,undefined,5),Q(pal.accent,'cylinder',[.062,.03,.062],[s*.115*hs,.68,-.07],0,undefined,5)]));break;
  case 'bun':out.push(cap(2),Q(hair,'sphere',[.12,.12,.12],[0,.97,-.15*hs],2),back(.1,1.0,.22,.05,1));break;
  case 'crest':out.push(Q(stub,'cylinder',[.25*hs,.06,.24*hs],[0,1.1,-.01],1,undefined,7),Q(hair,'box',[.05,.13,.27*hs],[0,1.14,-.02],2),Q(hair,'box',[.045,.2,.05],[0,.98,-.13*hs],1));break;
  case 'locks':out.push(cap(2),...[-1,-.5,0,.5,1].map(i=>Q(hair,'cylinder',[.04,.3+Math.abs(i)*.04,.036],[i*.11*hs,.72,-.11*hs],1,undefined,4)));break;
  case 'sideplait':out.push(cap(2),Q(hair,'cylinder',[.05,.36,.045],[.125*hs,.7,.0],1,undefined,5),Q(stub,'box',[.03,.1,.2],[-.13*hs,1.0,-.02],0),back(.1,.99,.22,.04,1));break;
  case 'curls':out.push(cap(2),...Array.from({length:7},(_,i)=>{const a=i/7*Math.PI*2;return Q(hair,'cone',[.09,.09,.09],[Math.sin(a)*.13*hs,1.0+(i%2)*.04,Math.cos(a)*.12*hs-.02],1,undefined,4);}));break;
 }
}
const BEARD:Record<BeardStyle,(c:KitCtx)=>RigPart[]>={
 none:()=>[],stubble:c=>[Q(mix(c.pal.hair,c.pal.skin,.55),'box',[.17*c.look.face.jaw,.09,.035],[0,.94,.095],0)],
 short:c=>[Q(c.pal.hair,'box',[.19*c.look.face.jaw,.1,.07],[0,.94,.085],1),Q(c.pal.hair,'box',[.11,.025,.04],[0,1.0,.125],0)],
 full:c=>[Q(c.pal.hair,'box',[.2*c.look.face.jaw,.2,.09],[0,.82,.07],1),Q(c.pal.hair,'box',[.13,.03,.045],[0,.99,.125],0)],
 braided:c=>[Q(c.pal.hair,'box',[.18*c.look.face.jaw,.14,.08],[0,.86,.085],1),Q(c.pal.hair,'cylinder',[.045,.2,.04],[0,.7,.12],1,undefined,5),Q(c.pal.accent,'cylinder',[.056,.025,.056],[0,.74,.12],0,undefined,5)],
 moustache:c=>[Q(c.pal.hair,'box',[.15,.03,.05],[0,1.0,.125],0),Q(c.pal.hair,'box',[.03,.07,.04],[-.065,.94,.12],0),Q(c.pal.hair,'box',[.03,.07,.04],[.065,.94,.12],0)],
};
/** Skull, face (eyes, brow, nose, jaw, ears), hair and beard. */
export function headParts(c:KitCtx,coveredHair:boolean){
 const {look,ind,pal,bones}=c,f=look.face,hs=look.body.head,h=bones.head,eye='#241a16';
 h.push(Q(pal.skin,'sphere',[.235*hs,.26*hs,.235*hs],[0,.93,0],1),Q(pal.skin,'box',[.21*hs,.24*hs,.21*hs],[0,.94,0],2,undefined,undefined,2),
  Q(pal.skin,'box',[.15*hs*f.jaw,.07,.15*hs],[0,.935,.035],1),
  Q(pal.skin,'wedge',[.045*f.nose,.07*f.nose,.06*f.nose],[0,.99,.112*hs],0,[0,0,0]),Q(mix(pal.skin,'#000000',.25),'box',[.15,.022*f.brow,.03],[0,1.088,.108*hs],0),
  Q(eye,'box',[.03,.022,.015],[-.052,1.05,.112*hs],0),Q(eye,'box',[.03,.022,.015],[.052,1.05,.112*hs],0),
  Q(pal.skin,'box',[.03,.05*f.ears,.035*f.ears],[-.12*hs,.99,0],0),Q(pal.skin,'box',[.03,.05*f.ears,.035*f.ears],[.12*hs,.99,0],0));
 hairParts(c,ind.hair,coveredHair);
 h.push(...BEARD[ind.beard](c));
}

// ---------------------------------------------------------------- headwear
export function headwearParts(c:KitCtx,kind:HeadKind){
 const {pal,bones,look,rich}=c,hs=look.body.head,h=bones.head,cl=(kind==='turban'||kind==='headcloth'||kind==='veilwrap'||kind==='kerchief')?mix(pal.under,pal.cloth2,.3):pal.cloth,cl2=pal.cloth2,tr=pal.trim,ac=pal.accent,straw=mix('#c9a85a',pal.cloth2,.15);
 const crown=(w:number,y:number,hh:number,col:string,l:LodTier=2,sides=8)=>Q(col,'cylinder',[w*hs,hh,w*hs*.96],[0,y,-.01],l,undefined,sides);
 switch(kind){
  case 'none':return false;
  case 'turban':h.push(crown(.31,1.04,.1,cl),crown(.285,1.12,.09,cl2,2),Q(cl,'sphere',[.24*hs,.14,.24*hs],[0,1.16,-.01],1),Q(tr,'cylinder',[.32*hs,.02,.31*hs],[0,1.07,-.01],0,undefined,8),Q(cl2,'box',[.11,.26,.04],[.06,.84,-.15*hs],1,[.1,0,.1]));if(rich>=2)h.push(Q(ac,'sphere',[.05,.05,.05],[0,1.1,.145*hs],0));break;
  case 'headcloth':h.push(crown(.3,1.07,.08,cl),Q(cl,'box',[.26*hs,.2,.07],[0,.9,-.14*hs],1),Q(tr,'cylinder',[.305*hs,.018,.3*hs],[0,1.075,-.01],0,undefined,8));break;
  case 'feltcap':h.push(Q(cl,'cone',[.27*hs,.3,.27*hs],[0,1.06,-.01],2,undefined,8),Q(shade(cl,.8),'cylinder',[.31*hs,.07,.285*hs],[0,1.04,-.01],2,undefined,8),Q(tr,'cylinder',[.312*hs,.02,.312*hs],[0,1.06,-.01],0,undefined,8),Q(ac,'sphere',[.05,.05,.05],[0,1.34,-.01],0));break;
  case 'furcap':h.push(crown(.32,1.03,.11,pal.fur,2),Q(pal.fur,'sphere',[.28*hs,.14,.28*hs],[0,1.1,-.01],2),Q(pal.fur,'box',[.07,.16,.12],[-.15*hs,.9,0],1),Q(pal.fur,'box',[.07,.16,.12],[.15*hs,.9,0],1),Q(shade(pal.fur,.75),'box',[.15,.06,.05],[0,1.0,.15*hs],0));break;
  case 'flapcap':h.push(Q(cl,'sphere',[.29*hs,.2,.29*hs],[0,1.0,-.01],2),Q(cl2,'box',[.06,.2,.15],[-.14*hs,.82,.02],1),Q(cl2,'box',[.06,.2,.15],[.14*hs,.82,.02],1),Q(tr,'cylinder',[.295*hs,.035,.295*hs],[0,1.04,-.01],0,undefined,8),Q(ac,'cone',[.04,.14,.04],[-.14*hs,.68,.02],0,undefined,4),Q(ac,'cone',[.04,.14,.04],[.14*hs,.68,.02],0,undefined,4),Q(ac,'sphere',[.06,.06,.06],[0,1.19,-.01],0));break;
  case 'cone':h.push(Q(straw,'cone',[.46*hs,.2,.46*hs],[0,1.08,-.01],2,undefined,8),Q(shade(straw,.9),'cone',[.2*hs,.1,.2*hs],[0,1.26,-.01],1,undefined,6),Q(tr,'cylinder',[.2*hs,.018,.2*hs],[0,1.08,-.01],0,undefined,8),Q(ac,'sphere',[.04,.04,.04],[0,1.35,-.01],0));break;
  case 'widebrim':h.push(Q(straw,'cylinder',[.46*hs,.025,.46*hs],[0,1.09,-.005],2,undefined,10),Q(straw,'cylinder',[.27*hs,.11,.22*hs],[0,1.09,-.01],2,undefined,8),Q(tr,'cylinder',[.272*hs,.025,.272*hs],[0,1.11,-.01],0,undefined,8));break;
  case 'plume':h.push(Q(tr,'cylinder',[.29*hs,.05,.29*hs],[0,1.08,-.01],1,undefined,8),Q(ac,'box',[.03,.2,.012],[.1,1.12,-.02],2,[0,0,-.25]),Q(cl2,'box',[.03,.24,.012],[.065,1.13,-.04],2,[0,0,-.1]),Q(ac,'box',[.03,.26,.012],[.03,1.14,-.06],1,[0,0,.05]),Q(cl,'box',[.03,.2,.012],[0,1.14,-.07],1,[0,0,.2]));if(rich>=1)h.push(Q(pal.metal,'sphere',[.05,.05,.04],[0,1.12,.14*hs],0));break;
  case 'circlet':h.push(Q(pal.metal,'cylinder',[.27*hs,.04,.27*hs],[0,1.1,-.005],2,undefined,8),Q(ac,'box',[.05,.09,.03],[0,1.13,.12*hs],1),...[-1,0,1].map(i=>Q(pal.metal,'pyramid',[.045,.1,.045],[i*.085,1.14,.0],1)),Q(ac,'sphere',[.04,.04,.03],[0,1.1,.13*hs],0));break;
  case 'hood':h.push(Q(cl,'sphere',[.29*hs,.3,.3*hs],[0,.96,-.03],2),Q(cl,'cone',[.2,.2,.2],[0,.84,-.2*hs],1,[.9,0,0],6),Q(pal.fur,'cylinder',[.28*hs,.04,.27*hs],[0,1.0,.02],1,undefined,8));return false;
  case 'fillet':h.push(Q(tr,'cylinder',[.27*hs,.03,.27*hs],[0,1.08,-.01],1,undefined,8),Q(ac,'sphere',[.04,.04,.03],[0,1.085,.125*hs],0));break;
  case 'kerchief':h.push(crown(.285,1.08,.06,cl,1),Q(cl,'box',[.2*hs,.1,.06],[0,.94,-.145*hs],1),Q(ac,'box',[.04,.07,.03],[.12*hs,1.08,.1],0,[0,0,.5]));break;
  case 'veilwrap':h.push(crown(.31,1.03,.13,cl),crown(.29,1.15,.07,cl2,2),Q(cl,'box',[.26*hs,.36,.06],[0,.62,-.14*hs],2),Q(cl2,'box',[.2,.1,.05],[0,.9,.12*hs],0),Q(tr,'cylinder',[.31*hs,.02,.31*hs],[0,1.1,-.01],0,undefined,8));break;
 }
 const k:HeadKind=kind as HeadKind;return k==='turban'||k==='veilwrap'||k==='headcloth'||k==='feltcap'||k==='furcap'||k==='flapcap'||k==='cone'||k==='hood';
}

// ---------------------------------------------------------------- footwear
export function footParts(c:KitCtx,foot:Foot){
 const {pal,bones,look}=c,lt=look.body.limb;
 for(const sd of [-1,1] as const){
  const leg:RigBone=sd<0?'legL':'legR',x=sd*.085*look.body.hip,o=bones[leg],sk=pal.skin,lea=pal.leather,cl=pal.cloth2;
  switch(foot){
   case 'bare':o.push(Q(sk,'box',[.1,.055,.19],[x,0,.03],1),Q(shade(sk,.85),'box',[.1,.012,.04],[x,.055,.12],0));break;
   case 'sandal':o.push(Q(sk,'box',[.1,.05,.19],[x,.012,.03],1),Q(lea,'box',[.115,.016,.21],[x,0,.03],1),Q(lea,'box',[.115,.016,.03],[x,.05,.06],0),Q(lea,'box',[.03,.07,.03],[x,.01,.1],0));break;
   case 'moccasin':o.push(Q(lea,'box',[.115,.075,.2],[x,0,.03],1),Q(lea,'cylinder',[.1*lt,.07,.11*lt],[x,.07,0],1,undefined,6),Q(pal.accent,'box',[.09,.015,.03],[x,.07,.12],0));break;
   case 'boot':o.push(Q(lea,'box',[.115,.075,.2],[x,0,.03],1),Q(lea,'cylinder',[.1*lt,.2,.115*lt],[x,.07,0],1,undefined,6),Q(shade(lea,.7),'box',[.12,.03,.21],[x,0,.03],1),Q(pal.trim,'cylinder',[.118*lt,.02,.118*lt],[x,.26,0],0,undefined,6));break;
   case 'tallboot':o.push(Q(lea,'box',[.12,.08,.22],[x,0,.035],1),Q(lea,'cylinder',[.105*lt,.3,.13*lt],[x,.07,0],2,undefined,6),Q(shade(lea,.7),'box',[.125,.03,.23],[x,0,.035],1),Q(pal.trim,'cylinder',[.14*lt,.025,.14*lt],[x,.36,0],0,undefined,6),Q(lea,'cone',[.08,.08,.08],[x,.03,.14],0,[Math.PI/2,0,0],4));break;
   case 'wraps':o.push(Q(cl,'box',[.11,.07,.2],[x,0,.03],1),...[0,1,2,3].map(i=>Q(i%2?pal.trim:cl,'cylinder',[.106*lt,.045,.112*lt],[x,.08+i*.05,0],i<2?1:0,undefined,6)));break;
   case 'clog':o.push(Q('#8a6a42','box',[.115,.07,.2],[x,0,.03],1),Q('#8a6a42','box',[.1,.035,.06],[x,.07,.12],0),Q(shade('#8a6a42',.7),'box',[.12,.03,.07],[x,0,-.04],0),Q(pal.accent,'box',[.09,.012,.1],[x,.07,.05],0));break;
  }
 }
}

// ---------------------------------------------------------------- jewellery
export function jewelParts(c:KitCtx,jewels:readonly Jewel[]){
 const {pal,bones,look,rich}=c,sh=look.body.shoulder,gold=pal.metal==='#8a8478'?mix('#c9a23c',pal.trim,.2):pal.metal,bead=(i:number)=>[pal.accent,pal.trim,pal.cloth2][i%3];
 for(const j of jewels){
  switch(j){
   case 'beads':bones.spine.push(Q(bead(0),'cylinder',[.21,.035,.19],[0,.8,0],0,undefined,8),Q(bead(1),'box',[.04,.05,.03],[0,.76,.115],0),Q(bead(2),'cylinder',[.2,.02,.18],[0,.815,0],0,undefined,8));break;
   case 'collar':bones.spine.push(Q(gold,'cylinder',[.34*sh,.028,.2],[0,.82,.01],0,undefined,10),Q(pal.accent,'cylinder',[.27*sh,.03,.17],[0,.83,.012],0,undefined,10),Q(pal.trim,'cylinder',[.2,.032,.14],[0,.835,.013],0,undefined,10));break;
   case 'torc':bones.spine.push(Q(gold,'cylinder',[.2,.03,.18],[0,.845,0],0,undefined,8),Q(gold,'sphere',[.045,.045,.045],[-.07,.845,.095],0),Q(gold,'sphere',[.045,.045,.045],[.07,.845,.095],0));break;
   case 'earring':bones.head.push(Q(gold,'box',[.03,.08,.03],[-.135*look.body.head,.9,0],0),Q(gold,'box',[.03,.08,.03],[.135*look.body.head,.9,0],0));break;
   case 'earspool':for(const s of [-1,1])bones.head.push(Q(gold,'cylinder',[.07,.03,.07],[s*.135*look.body.head,.97,0],0,[0,0,Math.PI/2],6),Q(pal.accent,'sphere',[.04,.04,.04],[s*.16*look.body.head,.97,0],0));break;
   case 'bangles':for(const s of [-1,1]){const x=s*(.17+.04*sh);bones[s<0?'armL':'armR'].push(Q(gold,'cylinder',[.068,.022,.068],[x,.51,0],0,undefined,6),Q(pal.accent,'cylinder',[.07,.02,.07],[x,.54,0],0,undefined,6));}break;
   case 'armlet':for(const s of [-1,1])bones[s<0?'armL':'armR'].push(Q(gold,'cylinder',[.1,.04,.1],[s*(.17+.04*sh),.76,0],0,undefined,6));break;
   case 'brooch':bones.spine.push(Q(gold,'sphere',[.07,.07,.04],[.15*sh,.83,.13],0),Q(pal.accent,'sphere',[.035,.035,.03],[.15*sh,.845,.15],0));break;
   case 'amulet':bones.spine.push(Q(pal.leather,'cylinder',[.2,.015,.18],[0,.82,0],0,undefined,6),Q(pal.accent,'box',[.055,.07,.03],[0,.73,.13],0),Q(gold,'box',[.03,.02,.032],[0,.8,.125],0));break;
   case 'anklet':for(const s of [-1,1])bones[s<0?'legL':'legR'].push(Q(gold,'cylinder',[.09,.02,.09],[s*.085*look.body.hip,.11,0],0,undefined,6));break;
   case 'shells':bones.spine.push(Q('#e8e0cc','cylinder',[.2,.03,.18],[0,.8,0],0,undefined,8),...[-1,0,1].map(i=>Q('#efe7d2','cone',[.04,.07,.03],[i*.06,.72+Math.abs(i)*.02,.12],0,[Math.PI,0,0],4)));break;
   case 'browband':bones.head.push(Q(pal.trim,'cylinder',[.255*look.body.head,.026,.255*look.body.head],[0,1.065,-.005],0,undefined,8),Q(pal.accent,'sphere',[.04,.04,.025],[0,1.07,.122*look.body.head],0));break;
  }
 }
 void rich;
}

// ---------------------------------------------------------------- body marks (ORIGINAL invented patterns)
const tick=(col:string,x:number,y:number,z:number,w=.03,h=.012,rot=0)=>Q(col,'box',[w,h,.01],[x,y,z],0,[0,0,rot]);
/** Skin marks: paint (matte colour), tattoo (darkened skin) or scar (lightened ridges). Drawn only on skin the clothing leaves bare. */
export function markParts(c:KitCtx,mk:{kind:string;pattern:MarkPattern;sites:readonly string[]}){
 const {pal,bones,look,cut}=c,col=mk.kind==='tattoo'?mix(pal.skin,'#1a2030',.5):mk.kind==='scar'?mix(pal.skin,'#ffffff',.22):pal.paint,hs=look.body.head,sh=look.body.shoulder;
 const faceSite=mk.sites.includes('face'),armSite=mk.sites.includes('arms'),chestSite=mk.sites.includes('chest'),handSite=mk.sites.includes('hands');
 const forearmBare=cut.sleeve==='none'||cut.sleeve==='short',upperBare=cut.sleeve==='none',torsoBare=cut.torso==='bare'||cut.torso==='vest';
 const F=.112*hs+.002;
 switch(mk.pattern){
  case 'eyeBand':if(faceSite)bones.head.push(Q(col,'box',[.2*hs,.032,.012],[0,1.05,F],0),Q(col,'box',[.035,.035,.012],[.095*hs,1.03,F-.01],0),Q(col,'box',[.035,.035,.012],[-.095*hs,1.03,F-.01],0));break;
  case 'cheekDots':if(faceSite)for(const s of [-1,1])for(let i=0;i<3;i++)bones.head.push(tick(col,s*(.06+i*.018)*hs/1,.99-i*.012,F,.018,.018));break;
  case 'browStripe':if(faceSite)bones.head.push(tick(col,-.05*hs,1.09,F+.004,.075,.016,.3),tick(col,.05*hs,1.09,F+.004,.075,.016,-.3),Q(col,'box',[.012,.07,.012],[0,.96,F],0));break;
  case 'spiralBrow':if(faceSite)bones.head.push(tick(col,0,1.115,F,.12,.014),tick(col,-.045,1.095,F,.03,.03),tick(col,.045,1.095,F,.03,.03),tick(col,0,1.135,F-.008,.02,.02));break;
  case 'foreheadDot':if(faceSite)bones.head.push(Q(col,'box',[.028,.028,.012],[0,1.11,F],0),Q(col,'box',[.1,.014,.012],[0,1.14,F-.006],0));break;
  case 'tideLines':case 'tickRows':case 'leafBand':case 'knotBand':case 'handDots':
   for(const s of [-1,1]){const arm:RigBone=s<0?'armL':'armR',x=s*(.17+.04*sh);
    if(mk.pattern==='handDots'){if(handSite||armSite)bones[arm].push(Q(col,'box',[.022,.012,.022],[x,.552,.03],0),Q(col,'box',[.022,.012,.022],[x,.552,-.03],0));continue;}
    if(armSite&&forearmBare){const tr=mk.pattern==='tideLines'?[.6,.565,.53]:[.6,.57];for(let i=0;i<tr.length;i++)bones[arm].push(Q(col,'cylinder',[.06,.012,.06+(i%2?0:.002)],[x,tr[i],0],0,undefined,6));if(mk.pattern==='leafBand')for(let i=0;i<3;i++)bones[arm].push(Q(col,'box',[.02,.045,.01],[x,.57+i*.02,.05],0,[0,0,i%2?.5:-.5]));}
    if(armSite&&upperBare&&mk.pattern==='knotBand')bones[arm].push(Q(col,'cylinder',[.082,.03,.1],[x,.74,0],0,undefined,6),Q(col,'box',[.025,.03,.01],[x+s*.01,.77,.05],0));
   }
   if(chestSite&&torsoBare&&mk.pattern==='tickRows')for(let i=0;i<3;i++)bones.spine.push(tick(col,0,.75+i*.03,.17*look.body.chest,.12,.012));
   break;
  case 'chevronChest':if((chestSite||faceSite)&&torsoBare)for(let i=0;i<3;i++)bones.spine.push(Q(col,'box',[.1,.014,.012],[-.045,.74+i*.032,.172*look.body.chest],0,[0,0,.5]),Q(col,'box',[.1,.014,.012],[.045,.74+i*.032,.172*look.body.chest],0,[0,0,-.5]));break;
 }
 void warmthOf;void SKIN_RAMP;void sideOf;void fibreOf;
}
