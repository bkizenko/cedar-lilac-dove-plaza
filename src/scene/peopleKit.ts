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
import {skinColour,fibreOf,warmthOf,SKIN_RAMP,type Body,type BeardStyle,type Cut,type Fibre,type Foot,type HairStyle,type HeadKind,type Individual,type Jewel,type MarkPattern,type PeopleLook,type Role} from './peopleLook';
import type {BodyClass} from './characterRig';

export type Bones=Record<RigBone,RigPart[]>;
export const emptyBones=():Bones=>({hips:[],spine:[],head:[],armL:[],armR:[],legL:[],legR:[]});
/** Coloured part. `slot` is only a fallback; `col` wins. */
export const Q=(col:string,shape:Part['shape'],size:[number,number,number],pos:[number,number,number],lod:LodTier,rot?:[number,number,number],sides?:number,onlyFrom?:LodTier):RigPart=>({...part(shape,'cloth',size,pos,lod,rot,sides),slot:'garment' as RigSlot,col,...(onlyFrom!==undefined?{onlyFrom}:{})});
export const shade=(hex:string,k:number)=>mix(hex,k<1?'#000000':'#ffffff',Math.min(1,Math.abs(1-k)));

/** Tapered box (a frustum, same 12 triangles as a box): `bot` and `top` are [width,depth], `pos` the base centre. The tailoring primitive: tapered torso, A-line skirt, sloped yoke, tapered sleeve. */
export const TB=(col:string,bot:readonly [number,number],top:readonly [number,number],h:number,pos:[number,number,number],lod:LodTier,rot?:[number,number,number]):RigPart=>({...Q(col,'box',[bot[0],h,bot[1]],pos,lod,rot),taper:[top[0]/bot[0],top[1]/bot[1]] as const});

// ---------------------------------------------------------------- colour: muted, dyed-cloth tones (no saturated primaries)
const hsl=(hex:string):[number,number,number]=>{const n=parseInt(hex.slice(1,7),16),r=(n>>16)/255,g=((n>>8)&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;let h=0,s=0;
 if(d>0){s=d/(1-Math.abs(2*l-1));h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6;}return [h,s,l];};
const unhsl=(h:number,s:number,l:number):string=>{const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q,f=(t:number)=>{t=(t%1+1)%1;const v=t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p;return Math.round(Math.min(1,Math.max(0,v))*255).toString(16).padStart(2,'0');};return '#'+f(h+1/3)+f(h)+f(h-1/3);};
/** Pull any dye towards a natural cloth tone: saturation capped (madder, woad, weld, walnut and lichen are never primary), lightness kept in a readable band. Pure and deterministic. */
export function earthy(hex:string,maxS=.4,sMul=.78,minL=.15,maxL=.7):string{const [h,s,l]=hsl(hex);return unhsl(h,Math.min(maxS,s*sMul),Math.min(maxL,Math.max(minL,l)));}
export const SAT_CAP:Record<Role,number>={child:.34,elder:.2,farmer:.28,hunter:.3,smith:.26,priest:.42,ruler:.46,soldier:.3,scout:.3,merchant:.44,worker:.3};

/** Torso frame in the rig's unit frame: a human-shaped trunk (wider than deep, shoulders over a narrower waist) rather than a drum. `tw` is the waist height. */
export type Frame={tw:number;ww:number;wd:number;cw:number;cd:number;sw:number};
export const frameOf=(b:Body):Frame=>({tw:.57+b.torso*.5,ww:.27*b.waist+.05,wd:.21*b.waist+.02,cw:.34*b.chest+.05,cd:.25*b.chest+.04,sw:.46*b.shoulder+.02});
/** Half depth of the bare torso front at height y (waist to chest, tapering to the neck above the shoulder line). */
export const frontZ=(F:Frame,y:number)=>y<=.8?F.wd/2+(F.cd-F.wd)/2*Math.min(1,Math.max(0,(y-F.tw)/(.8-F.tw))):F.cd/2-(F.cd-.17)/2*Math.min(1,(y-.8)/.09);
/** Depth of the shoulder yoke at height y (circular neck rings sit on this). */
export const yokeD=(F:Frame,y:number)=>(F.cd+.02)+(.17-(F.cd+.02))*Math.min(1,Math.max(0,(y-.79)/.1));

/** ARM-FIX-1: the one place arm proportions live (metres in the unit frame, shoulder joint at y .86). */
export const ARM={shoulderY:.86,elbowY:.685,wristY:.523,upperLen:.175,foreLen:.165,handLen:.085,upperBot:.068,upperTop:.094,foreBot:.052,foreTop:.068,handW:.062,handD:.052,foreTilt:.2,handTilt:.12,flare:.115} as const;
/** x of the arm centre line: clear of the chest so the arm hangs beside the trunk, kept near the rig's shoulder pivot (RIG_PIVOTS.armR) so held tools stay in the hand. */
export const armX=(b:Body)=>Math.min(.265,Math.max(.235,frameOf(b).cw/2+.017+.036*b.limb));
/** base-centre position of a part of height h hanging from `top` (y) and tilted so its lower end swings `tilt` radians forward (+z). */
export const armSeg=(x:number,topY:number,h:number,tilt:number,z0=0):[number,number,number]=>[x,topY-h*Math.cos(tilt),z0+h*Math.sin(tilt)];
const WZ=ARM.foreLen*Math.sin(ARM.foreTilt);
export const FIBRE_BASE:Record<Fibre,string>={linen:'#ddd0ae',wool:'#b3aa90',felt:'#c9c0a8',hide:'#a07a52',fur:'#76503a',cotton:'#e6decb',bark:'#9c7c54',feather:'#cdbb8c',silk:'#eadcbc',leather:'#74492f'};
export const DYE_K:Record<Fibre,number>={linen:.78,wool:.72,felt:.55,hide:.16,fur:.1,cotton:.86,bark:.4,feather:.3,silk:.92,leather:.22};
const sideOf=(i:number)=>i<0?'L':'R';
const CLASS_HEM:Record<BodyClass,number>={adult:0,child:.02,elder:-.02,leader:-.03,soldier:.02};

export type Palette={skin:string;hair:string;cloth:string;cloth2:string;under:string;trim:string;accent:string;leather:string;metal:string;fur:string;paint:string;/** shirt / undersleeve linen */sleeve:string;/** trouser / legging cloth */legs:string;/** darker hem and cuff soil */soil:string;/** work apron */apron:string};
export type KitCtx={look:PeopleLook;ind:Individual;cls:BodyClass;role:Role;item?:string;fibre:Fibre|null;cond:number;season:string;rich:number;cut:Cut;pal:Palette;bones:Bones;v:number;cold:boolean};

/** Hex colours of one person: skin from the society's band, hair greying with age, cloth from the real garment's fibre and the society's dye family, then pulled to muted adult cloth tones
 *  (role sets how bright a dye may be: rulers and traders wear the richest, elders and labourers the dullest; wear and dirt come from the individual). */
export function paletteFor(look:PeopleLook,ind:Individual,cls:BodyClass,fibre:Fibre|null,dyeBody:string,dyeTrim:string,role:Role='worker'):Palette{
 const skin=skinColour(look,ind.skinTone),h0=look.hair.colors[ind.hairColour%look.hair.colors.length],grey=cls==='elder'?.55+ind.age*.4:ind.age>.6?.18:0,hair=grey>0?mix(h0,'#d0ccc2',Math.min(.95,grey)):h0;
 const dyes=look.dyes,di=ind.variant<2?0:ind.variant-1,body=di===0?dyeBody:dyes.cloth[di%dyes.cloth.length],base=fibre?FIBRE_BASE[fibre]:'#a88b61',k=fibre?DYE_K[fibre]:0,FURS=['#6e5440','#8a7258','#a89478','#4a3a30'];
 const cap=SAT_CAP[cls==='child'?'child':cls==='elder'?'elder':role],elderGrey=cls==='elder'?.16:0,dirt=Math.min(.2,ind.dirt*1.6+(role==='farmer'||role==='worker'||role==='smith'?.04:0));
 const tone=(hex:string,c=cap,l=1)=>shade(mix(earthy(hex,c,.78),'#7c725f',elderGrey+dirt*.5),l);
 const cloth=tone(mix(base,body,k)),cloth2=tone(mix(base,dyes.cloth[(di+1)%dyes.cloth.length],k)),under=tone(mix(dyes.under,'#e6dcc2',.4),cap*.6,.98);
 const fur=mix(FURS[(ind.variant+ind.hairColour)%4],cloth,.08),leather=mix('#70462f',skin,.1);
 return {skin,hair,cloth,cloth2,under,trim:earthy(dyeTrim||dyes.trim,Math.min(.55,cap+.12),.85,.2,.72),accent:earthy(dyes.accent,Math.min(.5,cap+.1),.8,.2,.6),leather,metal:'#8a8478',fur,paint:look.mark.colour,
  sleeve:tone(mix(under,cloth,.28),cap*.7,.97),legs:tone(mix(cloth2,'#6a5b46',.45),cap*.8,.82),soil:shade(mix(cloth,'#4a3d2c',.35),.8),apron:fibre==='leather'||fibre==='hide'?shade(leather,1.05):mix('#cfc3a2',cloth,.32)};
}

// ---------------------------------------------------------------- body
/** The human frame under the clothes: legs (skin or the trouser cloth), arms with their sleeve cloth, the shoulder-hipped trunk where the cut leaves it bare, hips only where no skirt covers them.
 *  Sleeves and trousers are the body part's own colour; the garment (peopleGarb) cuts the clothed trunk itself, so nothing is drawn twice. */
export function bodyParts(c:KitCtx){
 const {look,ind,cut,pal,bones,fibre}=c,b=look.body,F=frameOf(b),covered=cut.torso==='tunic'||cut.torso==='robe'||cut.torso==='deel'||cut.torso==='poncho',clad=!!fibre&&covered;
 const sleeveUp=cut.sleeve!=='none',sleeveLow=cut.sleeve==='long'||cut.sleeve==='wide',trousers=cut.lower==='trousers'||cut.lower==='leggings'||cut.lower==='dhoti';
 const full=cut.torso==='tunic'||cut.torso==='robe'||cut.torso==='deel',skirted=!!fibre&&(full||cut.lower==='skirt'||cut.lower==='kilt');
 const w=b.waist,hp=b.hip,lt=b.limb,hand=b.hand,cloth=pal.cloth,sk=pal.skin;
 const coat=cut.torso==='robe'||cut.torso==='deel',shirt=cut.torso==='poncho'||(cut.torso==='tunic'&&ind.variant%2===1);
 for(const sd of [-1,1] as const){
  const leg:RigBone=sd<0?'legL':'legR',arm:RigBone=sd<0?'armL':'armR',x=sd*.085*hp,legCol=trousers?(cut.lower==='leggings'?shade(pal.legs,.92):cut.lower==='dhoti'?cloth:pal.legs):sk;
  bones[leg].push(Q(legCol,'cylinder',[.07*lt,.25,.098*lt],[x,.07,0],2,undefined,6),Q(legCol,'cylinder',[.098*lt,.24,.132*lt],[x,.27,0],2,undefined,6));
  // sleeve cloth: coats are one cloth to the wrist (cuff in the trim); a tunic over a shirt shows the shirt below the elbow; a poncho shows the shirt
  const ax=sd*armX(b),upper=!sleeveUp||!covered?sk:cut.torso==='poncho'?pal.sleeve:shade(cloth,.95),
   lower=!sleeveLow||!covered?(sleeveUp&&covered&&cut.torso!=='poncho'&&shirt?pal.sleeve:sk):coat?(cut.sleeve==='wide'?pal.cloth2:shade(cloth,.9)):shirt||cut.torso==='poncho'?pal.sleeve:shade(cloth,.9);
  // ARM-FIX-1: one slender limb hung from the real shoulder joint (outside the chest, so the trunk no longer swallows it): upper arm, forearm bent a few degrees forward at the elbow, a small mitten hand. All sizes live in ARM (tested).
  const A=ARM,w2=(k:number)=>k*lt,hh=hand;
  bones[arm].push(Q(upper,'cylinder',[w2(A.upperBot),A.upperLen+.01,w2(A.upperTop)],[ax,A.elbowY-.01,0],2,undefined,6),
   {...Q(lower,'cylinder',[w2(A.foreBot),A.foreLen,w2(A.foreTop)],armSeg(ax,A.elbowY,A.foreLen,A.foreTilt),2,[-A.foreTilt,0,0],6)},
   {...Q(sk,'box',[A.handW*hh,A.handLen,A.handD*hh],armSeg(ax,A.wristY,A.handLen,A.foreTilt+A.handTilt,WZ),1,[-(A.foreTilt+A.handTilt),0,0]),onlyFrom:1},
   // near only: a rounded mitten fist instead of the box hand (24 vs 12 tris); mid keeps the box so the far/mid budgets are unchanged
   Q(sk,'cylinder',[A.handW*hh*.84,A.handLen*.96,A.handW*hh*1.02],armSeg(ax,A.wristY+.002,A.handLen*.96,A.foreTilt+A.handTilt,WZ),0,[-(A.foreTilt+A.handTilt),0,0],6));
  // near only: a shoulder cap rounds the yoke seam, an elbow knuckle breaks the straight tube, and a cuff band closes the wrist (all inside the existing reach)
  bones[arm].push(Q(upper,'cylinder',[w2(A.upperTop),.07,w2(A.upperTop+.012)],[ax,.775,0],0,undefined,5),Q(lower,'cylinder',[w2(A.foreTop),.05,w2(A.foreTop+.006)],[ax,A.elbowY-.035,A.foreLen*Math.sin(A.foreTilt)*.12],0,undefined,5));
  if(sleeveLow&&covered)bones[arm].push({...Q(cut.torso==='poncho'?pal.trim:coat?pal.trim:shade(lower,.8),'cylinder',[w2(A.foreBot+.01),.026,w2(A.foreBot+.012)],armSeg(ax,A.wristY+.004,.026,A.foreTilt,WZ),0,[-A.foreTilt,0,0],6)});
  // wide sleeve (hanfu, robe): a flared cuff that hangs from the wrist, not wider than a hand and a half
  if(cut.sleeve==='wide'&&covered)bones[arm].push(Q(pal.cloth2,'cylinder',[A.flare,.075,A.foreBot*lt+.012],[ax,A.wristY-.05,A.foreLen*Math.sin(A.foreTilt)+.002],1,undefined,6),Q(pal.trim,'cylinder',[A.flare+.004,.016,A.flare+.004],[ax,A.wristY-.05,A.foreLen*Math.sin(A.foreTilt)+.002],0,undefined,6));
 }
 const hipCol=cut.lower!=='none'||covered?cloth:sk;
 // trunk: bare skin (chest tapering from the shoulders to a narrower waist) unless the garment cuts the clothed trunk itself
 if(!clad)bones.spine.push(TB(sk,[F.ww,F.wd],[F.cw*.96,F.cd*.92],.8-(F.tw-.03),[0,F.tw-.03,0],2),TB(sk,[F.sw*.96,F.cd],[.16,.15],.1,[0,.79,0],2));
 if(!skirted)bones.hips.push(TB(hipCol,[.3*hp+.05,.2*hp+.03],[F.ww+.01,F.wd],.17,[0,.4,0],2));
 bones.spine.push(Q(sk,'cylinder',[.09*b.neck,.07+.02*b.neck,.078*b.neck],[0,.885,0],0,undefined,5));
}

// ---------------------------------------------------------------- head, hair, face
const HAIR_LOD:LodTier=1;
/** near-black hair on dark skin reads as one dark block at any distance: lift it toward a warm brown */
const lum=(h:string)=>{const n=parseInt(h.slice(1),16);return ((n>>16&255)+(n>>8&255)+(n&255))/3;};
const darkLift=(h:string)=>{const n=parseInt(h.slice(1),16),l=((n>>16&255)+(n>>8&255)+(n&255))/3;return l<60?mix(h,'#7a6252',.7):h;};
function hairParts(c:KitCtx,style:HairStyle,covered:boolean){
 const {pal,bones,look}=c,hs=look.body.head,hair=darkLift(pal.hair),sk=pal.skin,out:RigPart[]=bones.head,cap=(l:LodTier=2)=>Q(hair,'cylinder',[.26*hs,.1*hs,.25*hs],[0,1.08*1,-.012],l,undefined,7);
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
/** near-black hair on dark skin reads as one dark cube at distance: lift a very dark beard toward a warm brown so the jaw keeps a shape */
const beardCol=(c:KitCtx)=>darkLift(c.pal.hair);
const BEARD:Record<BeardStyle,(c:KitCtx)=>RigPart[]>={
 none:()=>[],stubble:c=>[Q(mix(c.pal.hair,c.pal.skin,.55),'box',[.17*c.look.face.jaw,.09,.035],[0,.94,.095],0)],
 short:c=>[Q(c.pal.hair,'box',[.19*c.look.face.jaw,.1,.07],[0,.94,.085],1),Q(c.pal.hair,'box',[.11,.025,.04],[0,1.0,.125],0)],
 full:c=>[Q(beardCol(c),'box',[.19*c.look.face.jaw,.15,.065],[0,.85,.08],1),Q(beardCol(c),'box',[.13,.03,.045],[0,.99,.125],0)],
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
 const {pal,bones,look,rich}=c,hs=look.body.head,h=bones.head,cl=(kind==='turban'||kind==='headcloth'||kind==='veilwrap'||kind==='kerchief')?mix(pal.under,pal.cloth2,.3):pal.cloth,cl2=(['turban','headcloth','veilwrap','kerchief'].includes(kind)&&lum(pal.cloth2)<90)?mix(pal.cloth2,'#e8dcc0',.5):pal.cloth2,tr=pal.trim,ac=pal.accent,straw=mix('#c9a85a',pal.cloth2,.15);
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
  case 'veilwrap':h.push(crown(.31,1.03,.13,cl),crown(.29,1.15,.07,shade(cl,1.12),2),Q(cl,'box',[.26*hs,.36,.06],[0,.62,-.14*hs],2),Q(mix(cl2,'#e8dcc0',.55),'box',[.17,.065,.04],[0,.9,.12*hs],0),Q(tr,'cylinder',[.31*hs,.02,.31*hs],[0,1.1,-.01],0,undefined,8));break;
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
 const {pal,bones,look,rich}=c,sh=look.body.shoulder,F=frameOf(look.body),yd=(y:number)=>yokeD(F,y),gold=pal.metal==='#8a8478'?mix('#c9a23c',pal.trim,.2):pal.metal,bead=(i:number)=>[pal.accent,pal.trim,pal.cloth2][i%3];
 for(const j of jewels){
  switch(j){
   case 'beads':bones.spine.push(Q(bead(0),'cylinder',[yd(.85)+.025,.035,yd(.85)+.025],[0,.85,0],0,undefined,8),Q(bead(1),'box',[.04,.05,.03],[0,.79,yd(.8)/2+.005],0),Q(bead(2),'cylinder',[yd(.82)+.02,.02,yd(.82)+.02],[0,.82,0],0,undefined,8));break;
   case 'collar':bones.spine.push(Q(gold,'cylinder',[.34*sh,.028,.34*sh],[0,.83,0],0,undefined,10),Q(pal.accent,'cylinder',[.27*sh,.03,.27*sh],[0,.842,0],0,undefined,10),Q(pal.trim,'cylinder',[.2,.032,.2],[0,.856,0],0,undefined,10));break;
   case 'torc':bones.spine.push(Q(gold,'cylinder',[yd(.855)+.03,.03,yd(.855)+.03],[0,.855,0],0,undefined,8),Q(gold,'sphere',[.045,.045,.045],[-.06,.85,yd(.855)/2+.02],0),Q(gold,'sphere',[.045,.045,.045],[.06,.85,yd(.855)/2+.02],0));break;
   case 'earring':bones.head.push(Q(gold,'box',[.03,.08,.03],[-.135*look.body.head,.9,0],0),Q(gold,'box',[.03,.08,.03],[.135*look.body.head,.9,0],0));break;
   case 'earspool':for(const s of [-1,1])bones.head.push(Q(gold,'cylinder',[.07,.03,.07],[s*.135*look.body.head,.97,0],0,[0,0,Math.PI/2],6),Q(pal.accent,'sphere',[.04,.04,.04],[s*.16*look.body.head,.97,0],0));break;
   case 'bangles':for(const s of [-1,1]){const x=s*armX(look.body);bones[s<0?'armL':'armR'].push(Q(gold,'cylinder',[.068,.022,.068],[x,.51,0],0,undefined,6),Q(pal.accent,'cylinder',[.07,.02,.07],[x,.54,0],0,undefined,6));}break;
   case 'armlet':for(const s of [-1,1])bones[s<0?'armL':'armR'].push(Q(gold,'cylinder',[.1,.04,.1],[s*armX(look.body),.76,0],0,undefined,6));break;
   case 'brooch':bones.spine.push(Q(gold,'sphere',[.07,.07,.04],[.12*sh,.79,frontZ(F,.8)+.012],0),Q(pal.accent,'sphere',[.035,.035,.03],[.12*sh,.80,frontZ(F,.8)+.03],0));break;
   case 'amulet':bones.spine.push(Q(pal.leather,'cylinder',[yd(.84)+.02,.015,yd(.84)+.02],[0,.84,0],0,undefined,6),Q(pal.accent,'box',[.055,.07,.03],[0,.72,frontZ(F,.75)+.02],0,[.15,0,0]),Q(gold,'box',[.03,.02,.032],[0,.79,frontZ(F,.8)+.015],0));break;
   case 'anklet':for(const s of [-1,1])bones[s<0?'legL':'legR'].push(Q(gold,'cylinder',[.09,.02,.09],[s*.085*look.body.hip,.11,0],0,undefined,6));break;
   case 'shells':bones.spine.push(Q('#e8e0cc','cylinder',[yd(.85)+.025,.03,yd(.85)+.025],[0,.85,0],0,undefined,8),...[-1,0,1].map(i=>Q('#efe7d2','cone',[.04,.07,.03],[i*.06,.74+Math.abs(i)*.02,frontZ(F,.78)+.02],0,[Math.PI,0,0],4)));break;
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
 const F=.112*hs+.002,FR=frameOf(look.body),cz=(y:number)=>frontZ(FR,y)+.004;
 switch(mk.pattern){
  case 'eyeBand':if(faceSite)bones.head.push(Q(col,'box',[.2*hs,.032,.012],[0,1.05,F],0),Q(col,'box',[.035,.035,.012],[.095*hs,1.03,F-.01],0),Q(col,'box',[.035,.035,.012],[-.095*hs,1.03,F-.01],0));break;
  case 'cheekDots':if(faceSite)for(const s of [-1,1])for(let i=0;i<3;i++)bones.head.push(tick(col,s*(.06+i*.018)*hs/1,.99-i*.012,F,.018,.018));break;
  case 'browStripe':if(faceSite)bones.head.push(tick(col,-.05*hs,1.09,F+.004,.075,.016,.3),tick(col,.05*hs,1.09,F+.004,.075,.016,-.3),Q(col,'box',[.012,.07,.012],[0,.96,F],0));break;
  case 'spiralBrow':if(faceSite)bones.head.push(tick(col,0,1.115,F,.12,.014),tick(col,-.045,1.095,F,.03,.03),tick(col,.045,1.095,F,.03,.03),tick(col,0,1.135,F-.008,.02,.02));break;
  case 'foreheadDot':if(faceSite)bones.head.push(Q(col,'box',[.028,.028,.012],[0,1.11,F],0),Q(col,'box',[.1,.014,.012],[0,1.14,F-.006],0));break;
  case 'tideLines':case 'tickRows':case 'leafBand':case 'knotBand':case 'handDots':
   for(const s of [-1,1]){const arm:RigBone=s<0?'armL':'armR',x=s*armX(look.body);
    if(mk.pattern==='handDots'){if(handSite||armSite)bones[arm].push(Q(col,'box',[.022,.012,.022],[x,.552,.03],0),Q(col,'box',[.022,.012,.022],[x,.552,-.03],0));continue;}
    if(armSite&&forearmBare){const tr=mk.pattern==='tideLines'?[.6,.565,.53]:[.6,.57];for(let i=0;i<tr.length;i++)bones[arm].push(Q(col,'cylinder',[.06,.012,.06+(i%2?0:.002)],[x,tr[i],0],0,undefined,6));if(mk.pattern==='leafBand')for(let i=0;i<3;i++)bones[arm].push(Q(col,'box',[.02,.045,.01],[x,.57+i*.02,.05],0,[0,0,i%2?.5:-.5]));}
    if(armSite&&upperBare&&mk.pattern==='knotBand')bones[arm].push(Q(col,'cylinder',[.082,.03,.1],[x,.74,0],0,undefined,6),Q(col,'box',[.025,.03,.01],[x+s*.01,.77,.05],0));
   }
   if(chestSite&&torsoBare&&mk.pattern==='tickRows')for(let i=0;i<3;i++)bones.spine.push(tick(col,0,.75+i*.03,cz(.75+i*.03),.12,.012));
   break;
  case 'chevronChest':if((chestSite||faceSite)&&torsoBare)for(let i=0;i<3;i++)bones.spine.push(Q(col,'box',[.1,.014,.012],[-.045,.74+i*.032,cz(.74+i*.032)],0,[0,0,.5]),Q(col,'box',[.1,.014,.012],[.045,.74+i*.032,cz(.74+i*.032)],0,[0,0,-.5]));break;
 }
 void warmthOf;void SKIN_RAMP;void sideOf;void fibreOf;
}
