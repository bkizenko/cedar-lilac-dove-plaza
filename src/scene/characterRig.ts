/** ONE shared character rig for every person (workers, soldiers, leaders, children, elders), as pure data and maths:
 * no three.js, no clock, no drawing state (ASTRA-13). The rig is seven rigid bones (hips, spine, head, armL, armR,
 * legL, legR; the same names animationClips.ts poses) plus two held-item sockets (itemR, itemL). Per-civ look is a
 * layer on top: garments, headwear, insignia, armor, helmet, shield and the leader's standard are cut from the same
 * part specs unitAppearance.ts uses (owned gear only; nothing is invented), split per bone so they move with the body.
 *
 * Frame: metres in the legacy unit frame (feet y=0, +Z forward, head centre ~1.06); the renderer scales it to people
 * size exactly as it scaled the old merged unit mesh. Each bone's parts are stored RELATIVE TO ITS PIVOT, so a bone
 * matrix from `boneMatrices` maps them straight into the unit frame.
 *
 * LOD tiers (same distances as animationClips): 0 near = every detail part, full animation; 1 mid = lod>=1 parts, reduced
 * animation; 2 far = one merged static silhouette (`farParts`), no animation. `RIG_BUDGET` caps triangles per tier and is
 * tested over every civ, body class, garment and gear combination.
 *
 * A LEGACY SET stays switchable: the old merged unit meshes (meshes.ts unitGeo + wornGarments/wornArmor) are untouched
 * and selected by `peopleSet:'legacy'` in the world adapter. Nothing there was deleted. */
import {hashSeed,part,partTriangles,seededRandom,type LodTier,type Part} from './buildingParts';
import {shapeTriangles} from './carvedMesh';
import {rotatePoint} from './buildingParts';
import {dressFor,type Culture,type GarmentId,type Season,type Dress} from './cultureGrammar';
import {APPEARANCE_RULES,mix,garmentParts,headwearParts,insigniaParts,armorParts,P,type OwnedGear,type Slot,type UnitKind,type UnitPart} from './unitAppearance';
import type {Part as Bone,Pose} from './animationClips';
import {peopleOutfit,shieldParts,hammerParts,staffParts,type ShieldKind} from './peopleGear';
import {individualFor,type Individual,type PeopleLook,type Role} from './peopleLook';

export type RigBone=Bone;
export const RIG_BONES:readonly RigBone[]=['hips','spine','head','armL','armR','legL','legR'];
export type RigSocket='itemR'|'itemL';
export type BodyClass='adult'|'child'|'elder'|'leader'|'soldier';
export type RigSlot=Slot|'skin'|'body'|'cloak'|'flag'|'flag2'|'charge'|'team'|'boot';
export type RigPart=Part&{slot:RigSlot;/** direct hex colour (people v2); wins over the slot colour */col?:string};
export type ItemId='spear'|'bow'|'blade'|'axe'|'pick'|'mallet'|'hoe'|'rod'|'standard'|'shield'|'hammer'|'staff';
/** Optional equipment the simulation does not produce yet (helmets and shields arrive with W4/W6); drawn only when owned. */
export type RigGear=OwnedGear&{helmet?:{kind:'leatherCap'|'bronzeHelm'|'ironHelm';condition:number};shield?:{kind:'woodShield'|'hideShield'|'bronzeShield';condition:number}};

// ---- Skeleton. Pivots are rest-pose positions in the unit frame; parents give the chain.
export const RIG_PIVOTS:Record<RigBone,readonly [number,number,number]>={hips:[0,.5,0],spine:[0,.5,0],head:[0,.93,0],armL:[-.205,.86,0],armR:[.205,.86,0],legL:[-.085,.5,0],legR:[.085,.5,0]};
export const RIG_PARENT:Record<RigBone,RigBone|null>={hips:null,spine:'hips',head:'spine',armL:'spine',armR:'spine',legL:'hips',legR:'hips'};
/** Where the hand holds an item, in the arm bone's frame (arm hangs down -Y). */
export const HAND_OFFSET:readonly [number,number,number]=[0,-.33,.03];
export type ClassSpec={/** uniform scale of the whole body relative to an adult */scale:number;head:number;/** shoulder/torso width factor */width:number;/** resting forward stoop in degrees (spine) */stoop:number;hairGrey:boolean};
export const BODY_CLASSES:Record<BodyClass,ClassSpec>={
 adult:{scale:1,head:1,width:1,stoop:0,hairGrey:false},child:{scale:.64,head:1.34,width:.88,stoop:0,hairGrey:false},elder:{scale:.97,head:1,width:.94,stoop:13,hairGrey:true},
 leader:{scale:1,head:1.06,width:1.14,stoop:0,hairGrey:false},soldier:{scale:1,head:1,width:1.1,stoop:0,hairGrey:false}};
/** Real age fields: a child has Unit.maturesAt in the future; an elder has Unit.ageT past this (the simulation does not age people yet). */
export const ELDER_AGE_T=40*1800;
export function bodyClassFor(u:{type:string;maturesAt?:number;ageT?:number},time:number):BodyClass{
 if(u.maturesAt!==undefined&&u.maturesAt>time)return 'child';if(u.type==='leader')return 'leader';if((u.ageT??0)>=ELDER_AGE_T)return 'elder';
 return u.type==='swordsman'||u.type==='warden'||u.type==='spearman'?'soldier':'adult';
}

// ---- Tiny matrix maths (column-major 4x4, three.js layout). No allocation in the hot path when `out` is given.
export type Mat=number[]|Float32Array;
const ident=(o:Mat)=>{for(let i=0;i<16;i++)o[i]=i%5===0?1:0;return o;};
export function composeEuler(o:Mat,t:readonly number[],r:readonly number[],s:readonly number[]|number=1){
 // R = Ry * Rx * Rz (three 'YXZ'), then scale columns, then translate.
 const [x,y,z]=r,a=Math.cos(x),b=Math.sin(x),c=Math.cos(y),d=Math.sin(y),e=Math.cos(z),f=Math.sin(z),sx=typeof s==='number'?s:s[0],sy=typeof s==='number'?s:s[1],sz=typeof s==='number'?s:s[2];
 const ce=c*e,cf=c*f,de=d*e,df=d*f;
 o[0]=(ce+df*b)*sx;o[1]=a*f*sx;o[2]=(cf*b-de)*sx;o[3]=0;
 o[4]=(de*b-cf)*sy;o[5]=a*e*sy;o[6]=(df+ce*b)*sy;o[7]=0;
 o[8]=a*d*sz;o[9]=-b*sz;o[10]=a*c*sz;o[11]=0;
 o[12]=t[0];o[13]=t[1];o[14]=t[2];o[15]=1;return o;
}
export function mul(o:Mat,A:Mat,B:Mat){
 const a=A,b=B;for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;
}
const _tmp:number[]=new Array(16).fill(0),_loc:number[]=new Array(16).fill(0),_cp=new Array(16).fill(0);
export const transformPoint=(m:Mat,p:readonly number[]):[number,number,number]=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
export type BoneMatrices=Record<RigBone|RigSocket,number[]>;
export const newBoneMatrices=():BoneMatrices=>Object.fromEntries([...RIG_BONES,'itemR','itemL'].map(b=>[b,new Array(16).fill(0)])) as BoneMatrices;
const bone=(out:Mat,parent:Mat,at:readonly number[],rot:readonly number[],scale:readonly number[]|number=1)=>{composeEuler(_loc,at,rot,scale);return mul(out,parent,_loc);};
/** Fill `out` with unit-frame matrices for every bone and both item sockets from a pose. Pure; reuse `out` between calls. */
export function boneMatrices(pose:Pose,cls:BodyClass,out:BoneMatrices):BoneMatrices{
 const S=BODY_CLASSES[cls],P0=RIG_PIVOTS,sub=(a:readonly number[],b:readonly number[])=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
 const root=composeEuler(_tmp,pose.root,pose.rootRot,S.scale);
 bone(out.hips,root,P0.hips,pose.parts.hips);
 const stoop=S.stoop*Math.PI/180,sp=[pose.parts.spine[0]+stoop,pose.parts.spine[1],pose.parts.spine[2]];
 bone(out.spine,out.hips,sub(P0.spine,P0.hips),sp,[S.width,1,S.width]);
 bone(out.head,out.spine,sub(P0.head,P0.spine),[pose.parts.head[0]+stoop*.8,pose.parts.head[1],pose.parts.head[2]],S.head);
 bone(out.armL,out.spine,sub(P0.armL,P0.spine),pose.parts.armL);bone(out.armR,out.spine,sub(P0.armR,P0.spine),pose.parts.armR);
 bone(out.legL,out.hips,sub(P0.legL,P0.hips),pose.parts.legL);bone(out.legR,out.hips,sub(P0.legR,P0.hips),pose.parts.legR);
 // Item sockets: at the hand, oriented like the TORSO (so a spear stays a spear while the arm swings), then the item's own angle.
 for(const [sock,arm] of [['itemR','armR'],['itemL','armL']] as const){
  const h=transformPoint(out[arm],HAND_OFFSET),sm=out.spine,m=_cp;
  // torso rotation without its width scale: normalise the three columns
  for(let c=0;c<3;c++){const l=Math.hypot(sm[c*4],sm[c*4+1],sm[c*4+2])||1;for(let r=0;r<3;r++)m[c*4+r]=sm[c*4+r]/l*S.scale;m[c*4+3]=0;}
  m[12]=h[0];m[13]=h[1];m[14]=h[2];m[15]=1;
  composeEuler(_loc,[0,0,0],pose[sock],1);mul(out[sock],m,_loc);
 }
 return out;
}

// ---- Geometry: parts -> triangles in a bone's frame.
export type RigMeshData={positions:Float32Array;normals:Float32Array;/** sRGB 0..1; the renderer converts to linear */colors:Float32Array;triangles:number};
const hexRgb=(h:string):[number,number,number]=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255) as [number,number,number];
type V3=[number,number,number];
/** Same shape maths and winding rules as carvedMesh.buildCarvedMesh, but painted from slot colours, relative to a pivot, with a soft baked height shade. */
export function rigMeshData(parts:readonly RigPart[],pivot:readonly number[],colors:Record<RigSlot,string>,tier:LodTier,shade=true):RigMeshData{
 const live=parts.filter(p=>p.lod>=tier&&(p.onlyFrom??0)<=tier),tris=live.reduce((n,p)=>n+partTriangles(p),0),pos=new Float32Array(tris*9),nor=new Float32Array(tris*9),col=new Float32Array(tris*9);let v=0;
 for(const p of live){
  const h=p.size[1],c:V3=p.shape==='cone'||p.shape==='pyramid'?[0,h/4,0]:p.shape==='prism'||p.shape==='hip'?[0,h/3,0]:[0,h/2,0],base=hexRgb(p.col??colors[p.slot]);
  for(const tri of shapeTriangles(p)){
   let [a,b,e]=tri;const u:V3=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],w:V3=[e[0]-a[0],e[1]-a[1],e[2]-a[2]];let n:V3=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];
   const mid:V3=[(a[0]+b[0]+e[0])/3-c[0],(a[1]+b[1]+e[1])/3-c[1],(a[2]+b[2]+e[2])/3-c[2]];if(n[0]*mid[0]+n[1]*mid[1]+n[2]*mid[2]<0){[b,e]=[e,b];n=[-n[0],-n[1],-n[2]];}
   const len=Math.hypot(n[0],n[1],n[2])||1,ln:V3=[n[0]/len,n[1]/len,n[2]/len],wn=p.rot?rotatePoint(ln,p.rot):ln;
   for(const q of [a,b,e]){
    const r=p.rot?rotatePoint(q,p.rot):q,x=r[0]+p.pos[0]-pivot[0],y=r[1]+p.pos[1]-pivot[1],z=r[2]+p.pos[2]-pivot[2],ao=shade?.86+.14*Math.min(1,Math.max(0,(y+pivot[1])/1.1)):1;
    pos[v*3]=x;pos[v*3+1]=y;pos[v*3+2]=z;nor[v*3]=wn[0];nor[v*3+1]=wn[1];nor[v*3+2]=wn[2];col[v*3]=base[0]*ao;col[v*3+1]=base[1]*ao;col[v*3+2]=base[2]*ao;v++;
   }
  }
 }
 return {positions:pos,normals:nor,colors:col,triangles:tris};
}

// ---- Outfit: the per-person set of parts, split per bone.
export type RigInput={type:UnitKind;bodyClass:BodyClass;seed:number;gear:RigGear;culture:Culture;season:Season;era?:number;/** people v2: the society's PeopleLook, this person's Individual and role. Absent = the first rig's culture-colour look (kept as ?people=rig1). */look?:PeopleLook;individual?:Individual;role?:Role;unitId?:number;/** TEAM_STYLE[team].unit: the readable team marker on bare bodies */teamColor:string;/** armorAffiliationColor(g,team) for the armor stitching */affiliation?:string};
export type RigOutfit={key:string;bones:Record<RigBone,RigPart[]>;colors:Record<RigSlot,string>;itemR?:ItemId;itemL?:ItemId;bodyClass:BodyClass;
 /** people v2 only */look?:PeopleLook;role?:Role;ind?:Individual;frame?:{height:number;build:number;dirt:number};
 rendered:{garment?:GarmentId;cut?:Dress['cut'];headwear?:Dress['headwear'];insignia?:UnitKind;armor?:'paddedTorso';helmet?:string;shield?:string;weapon?:'spear'|'bow'|'blade';standard?:boolean};ignored:string[];fit:BodyClass};
const SKINS=['#d8a577','#c48a5c','#a8704a','#8a5a3c'];
const rel=(p:Part)=>p;
const R=(slot:RigSlot,shape:Part['shape'],size:[number,number,number],pos:[number,number,number],lod:LodTier,rot?:[number,number,number],sides?:number,onlyFrom?:LodTier):RigPart=>({...part(shape,'cloth',size,pos,lod,rot,sides),slot,...(onlyFrom!==undefined?{onlyFrom}:{})});
const slotOf=(p:UnitPart):RigSlot=>p.slot;
/** Cylinder parts that span a pivot height are cut in two so the lower half follows the hips and the upper half the torso. */
function splitCylinder(p:RigPart,y:number):RigPart[]{
 const y0=p.pos[1],h=p.size[1],y1=y0+h;if(p.shape!=='cylinder'||!(y0<y-.02&&y1>y+.02))return [p];
 const f=(y-y0)/h,mid=p.size[0]+(p.size[2]-p.size[0])*f;
 return [{...p,size:[p.size[0],y-y0,mid]},{...p,pos:[p.pos[0],y,p.pos[2]],size:[mid,y1-y,p.size[2]]}];
}
const fromUnit=(p:UnitPart):RigPart=>({...p,slot:slotOf(p)});
function place(p:RigPart):RigBone{return p.pos[1]+(['box','sphere'].includes(p.shape)?p.size[1]/2:0)>=RIG_PIVOTS.spine[1]?'spine':'hips';}
/** Build the whole person. Decisions mirror unitAppearance.ts exactly: a garment only from an owned garment, armor only from an owned
 * paddedTorso asset, headwear only as part of a garment's cut; helmet and shield only when owned (the simulation has none yet). */
export function rigOutfit(input:RigInput):RigOutfit{
 if(input.look)return peopleOutfit({...input,look:input.look,role:input.role??'worker',individual:input.individual??individualFor(input.look,input.culture.key,input.unitId??input.seed,input.bodyClass)});
 const {type,gear,culture,season,bodyClass}=input,era=input.era??1,rich=era>=3?2:era>=2?1:0,ignored:string[]=[],rendered:RigOutfit['rendered']={};
 const v=hashSeed(input.seed,'variant')%4,tr=seededRandom(hashSeed(input.seed,'hair'));void tr;
 const g=gear.garment&&Number.isFinite(gear.garment.condition)&&gear.garment.condition>0?gear.garment:undefined,dress=g?dressFor(culture,season,g.item):dressFor(culture,season);
 const bones:Record<RigBone,RigPart[]>={hips:[],spine:[],head:[],armL:[],armR:[],legL:[],legR:[]},S=BODY_CLASSES[bodyClass];
 const skin=SKINS[hashSeed(culture.key,'skin')%SKINS.length];
 // ---- body (always): bare torso takes the team colour, a worn garment takes the garment colour.
 const trousers=!!g&&dress.cut==='trousers';
 for(const sd of [-1,1] as const){
  const leg:RigBone=sd<0?'legL':'legR',arm:RigBone=sd<0?'armL':'armR',x=sd*.085;
  bones[leg].push(R(trousers?'garment':'skin','cylinder',[.085,.46,.125],[x,.06,0],2,undefined,5),R('boot','box',[.11,.07,.19],[x,0,.03],1));
  bones[arm].push(R('body','cylinder',[.07,.3,.09],[sd*.205,.56,0],2,undefined,5),R('skin','box',[.075,.075,.075],[sd*.205,.5,.015],1));
 }
 bones.hips.push(R('body','cylinder',[.3,.14,.31],[0,.43,0],2,undefined,7));
 bones.spine.push(R('body','cylinder',[.31,.4,.38],[0,.5,0],2,undefined,8),R('body','box',[.43,.08,.2],[0,.81,0],1),R('skin','cylinder',[.09,.07,.09],[0,.89,0],0,undefined,5));
 bones.head.push(R('skin','sphere',[.25,.27,.25],[0,.93,0],1),R('skin','box',[.22,.24,.22],[0,.94,0],2,undefined,undefined,2),R('hair','cylinder',[.27,.11,.27],[0,1.09,-.02],1,undefined,6),R('hair','box',[.25,.13,.06],[0,.96,-.12],2),R('skin','box',[.035,.04,.05],[0,1.02,.125],0));
 // ---- garment, split per bone
 if(g){
  rendered.garment=g.item;rendered.cut=dress.cut;
  for(const gp of garmentParts(g.item,dress.cut,v,dress.trimMotif,rich).map(fromUnit))for(const q of splitCylinder(gp,RIG_PIVOTS.spine[1]))bones[place(q)].push(q);
  const hw=headwearParts(dress.headwear,g.item,rich,v).map(fromUnit);
  if(hw.length){rendered.headwear=dress.headwear;for(const q of hw)bones[q.slot==='hair'&&q.pos[1]<.9?'spine':'head'].push(q);}
  const ins=standardInsignia(type,rich,v);if(ins.length){rendered.insignia=type;for(const q of ins)bones.spine.push(q);}
 }else if(gear.garment)ignored.push('garment with no condition left is not drawn');
 if(gear.armor){if(gear.armor.kind==='paddedTorso'&&gear.armor.condition>0){rendered.armor='paddedTorso';for(const q of armorParts(culture.flag.border as never,rich).map(fromUnit))bones.spine.push(q);bones.spine.push(R('stitch','box',[.2,.22,.03],[0,.58,.2],2));}else ignored.push(`armor kind '${gear.armor.kind}' is not a known asset kind`);}
 const hm=gear.helmet&&gear.helmet.condition>0?gear.helmet:undefined;
 if(hm){rendered.helmet=hm.kind;for(const q of helmetParts(hm.kind,bodyClass==='leader'))bones.head.push(q);}else if(gear.helmet)ignored.push('helmet with no condition left is not drawn');
 // ---- leader distinction: cloak, circlet, wider stance; the standard is the leader's held item.
 if(type==='leader'){
  bones.spine.push(R('cloak','cone',[.62,.78,.5],[0,.2,-.1],2,[.12,0,0],8),R('cloak','box',[.5,.1,.3],[0,.82,-.02],1),R('trim','cylinder',[.28,.03,.28],[0,1.13,.02],1,undefined,8,undefined),R('metal','box',[.06,.07,.02],[0,1.17,.14],1));
  bones.head.push(R('trim','cylinder',[.27,.04,.27],[0,1.12,.0],1,undefined,8),R('metal','box',[.05,.09,.03],[0,1.15,.14],2),...[-1,0,1].map(i=>R('metal','pyramid',[.045,.1,.045],[i*.085,1.15,.0],2)));
 }
 // sockets
 const itemR:ItemId|undefined=type==='leader'?'standard':type==='spearman'?'spear':type==='swordsman'?'blade':type==='warden'?'axe':undefined,itemL:ItemId|undefined=type==='archer'||type==='ranger'?'bow':gear.shield&&gear.shield.condition>0?'shield':undefined;
 if(itemR)rendered.weapon=itemR==='spear'?'spear':itemR==='blade'?'blade':undefined;if(itemL==='bow')rendered.weapon='bow';if(itemR==='standard')rendered.standard=true;if(itemL==='shield')rendered.shield=gear.shield!.kind;
 const base=g?APPEARANCE_RULES.baseColor[g.item]:'#a88b61',dye=g?APPEARANCE_RULES.dye[g.item]:0,garmentColor=mix(base,dress.body,dye),trimColor=mix(garmentColor,dress.trim,.9);
 const flag=culture.flag,team=input.teamColor,bare=mix(team,skin,.2);
 const colors:Record<RigSlot,string>={garment:garmentColor,trim:trimColor,leather:mix(APPEARANCE_RULES.baseColor.leatherClothes,culture.palette.shadow,.25),padding:mix(APPEARANCE_RULES.paddedBase,culture.palette.field,.22),stitch:input.affiliation??APPEARANCE_RULES.paddedStitchDefault,
  wood:APPEARANCE_RULES.wood,metal:APPEARANCE_RULES.metal,hair:S.hairGrey?'#c9c5bb':APPEARANCE_RULES.hair,skin,body:g?garmentColor:bare,cloak:mix(flag.fields[0] as string,'#000000',.12),flag:flag.fields[0] as string,flag2:flag.fields[1] as string,charge:flag.chargeColor,team,boot:mix(APPEARANCE_RULES.baseColor.leatherClothes,'#000000',.35)};
 const key=['rig',bodyClass,type,rendered.garment??'-',rendered.cut??'-',rendered.headwear??'-',rendered.insignia??'-',rendered.armor??'-',rendered.helmet??'-',rendered.shield??'-',dress.trimMotif,rich,v,culture.key,input.teamColor,input.affiliation??'-',skin].join('|');
 return {key,bones,colors,itemR,itemL,bodyClass,rendered,ignored,fit:bodyClass};
}
/** Insignia without the old free-standing leader staff: the leader's standard is now a held item (see itemParts). */
function standardInsignia(type:UnitKind,rich:number,v:number):RigPart[]{
 return insigniaParts(type,rich,v).filter(p=>!(type==='leader'&&(p.slot==='wood'||p.pos[1]>1.2||p.pos[0]<-.2))).map(fromUnit);
}
function helmetParts(kind:'leatherCap'|'bronzeHelm'|'ironHelm',leader:boolean):RigPart[]{
 const m:RigSlot=kind==='leatherCap'?'leather':'metal',out=[R(m,'sphere',[.3,.2,.3],[0,1.0,0],2),R(m,'cylinder',[.31,.04,.31],[0,1.0,0],1,undefined,8)];
 if(kind!=='leatherCap')out.push(R(m,'box',[.05,.1,.03],[0,.93,.135],1),R('trim','box',[.04,.05,.34],[0,1.2,-.02],2),...(leader?[R('trim','box',[.06,.14,.2],[0,1.22,-.05],2)]:[]));
 return out;
}

// ---- Held items, in socket frame: grip at the origin, tip along +Y, face along +Z.
const L=(slot:RigSlot,a:[number,number,number],b:[number,number,number],t:number,lod:LodTier):RigPart=>{
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz),pitch=Math.atan2(Math.hypot(dx,dz),dy),yaw=Math.atan2(dx,dz);
 return {...part('box','cloth',[t,len,t],a,lod,[pitch,yaw,0]),slot};
};
export function itemParts(item:ItemId,culture?:Culture,look?:PeopleLook,opts?:{shield?:ShieldKind}):RigPart[]{
 switch(item){
  case 'hammer':return hammerParts('#7a756d');
  case 'staff':return staffParts(look??({id:'x'} as PeopleLook),{accent:culture?.palette.accent??'#c9a23c',trim:culture?.palette.trim??'#c9a23c',metal:'#b08a3a'});
  case 'spear':return [R('wood','cylinder',[.045,2.0,.04],[0,-.6,0],2,undefined,5),R('metal','pyramid',[.1,.24,.1],[0,1.4,0],2),R('trim','cylinder',[.07,.04,.07],[0,1.36,0],0,undefined,5)];
  case 'blade':return [R('metal','box',[.06,.62,.025],[0,.07,0],2),R('wood','box',[.17,.035,.045],[0,.05,0],1),R('wood','box',[.04,.16,.04],[0,-.12,0],1)];
  case 'axe':return [R('wood','cylinder',[.04,.8,.035],[0,-.18,0],2,undefined,5),R('metal','box',[.045,.2,.16],[0,.46,.05],2),R('metal','box',[.05,.2,.05],[0,.46,-.05],1)];
  case 'pick':return [R('wood','cylinder',[.04,.78,.035],[0,-.18,0],2,undefined,5),R('metal','box',[.045,.07,.4],[0,.56,0],2)];
  case 'mallet':return [R('wood','cylinder',[.04,.55,.035],[0,-.15,0],2,undefined,5),R('wood','box',[.13,.13,.17],[0,.36,0],2)];
  case 'hoe':return [R('wood','cylinder',[.04,.95,.035],[0,-.25,0],2,undefined,5),R('wood','box',[.04,.2,.14],[0,.62,.05],2,[-.5,0,0])];
  case 'rod':return [L('wood',[0,-.25,0],[0,1.1,.28],.03,2),L('trim',[0,1.1,.28],[0,.55,.62],.012,0)];
  case 'bow':return [L('wood',[0,-.55,-.02],[0,-.27,.09],.04,1),L('wood',[0,-.27,.09],[0,0,.11],.04,1),L('wood',[0,0,.11],[0,.27,.09],.04,1),L('wood',[0,.27,.09],[0,.55,-.02],.04,1),L('trim',[0,-.55,-.02],[0,.55,-.02],.012,0),R('wood','box',[.045,.14,.045],[0,-.07,.09],2)];
  case 'shield':{if(look&&culture)return shieldParts(look.shield,{fields:culture.flag.fields,chargeColor:culture.flag.chargeColor,division:culture.flag.division},opts?.shield??'woodShield');const f=(culture?.flag.fields[0]??'#c0a060') as string;void f;return [R('flag','cylinder',[.5,.05,.5],[-.12,.1,.1],2,[Math.PI/2,0,0],9),R('metal','sphere',[.12,.12,.08],[-.12,.0,.14],1,[Math.PI/2,0,0]),R('trim','cylinder',[.52,.02,.52],[-.12,.1,.095],1,[Math.PI/2,0,0],9)];}
  case 'standard':return [R('wood','cylinder',[.04,2.5,.04],[0,-.7,0],2,undefined,5),R('metal','sphere',[.1,.1,.1],[0,1.8,0],2),R('flag','box',[.62,.5,.03],[.31,1.26,0],2),R('flag2','box',[.62,.1,.034],[.31,1.62,0],2),R('flag2','box',[.62,.07,.034],[.31,1.3,0],2),R('charge','box',[.18,.18,.036],[.31,1.38,0],2,[0,0,Math.PI/4]),R('flag','box',[.2,.3,.03],[.72,1.34,0],1),R('flag2','box',[.2,.3,.03],[.92,1.38,0],0)];
 }
}
/** The tool a worker visibly holds while doing a real task. Never a free item: only while the clip is that work. */
export const TOOL_FOR_CLIP:Partial<Record<string,ItemId>>={chop:'axe',quarry:'pick',build:'mallet',till:'hoe',fish:'rod'};

// ---- Tier assembly + budgets.
/** One merged static silhouette for far tier: every bone at rest, plus item parts in their stance. */
export function farParts(o:RigOutfit,culture?:Culture):RigPart[]{
 const out:RigPart[]=[];for(const b of RIG_BONES)out.push(...o.bones[b]);
 const place=(item:ItemId|undefined,at:readonly number[],tilt=0)=>{if(!item)return;for(const p of itemParts(item,culture,o.look,{shield:o.rendered.shield as ShieldKind|undefined}))out.push({...p,pos:[p.pos[0]+at[0],p.pos[1]*Math.cos(tilt)+at[1],p.pos[2]+at[2]+p.pos[1]*Math.sin(tilt)]});};
 place(o.itemR,[.21,.6,.1],0);place(o.itemL,[-.22,.64,.08],0);return out;
}
/** `near/mid/far` are the ceiling over every kit (leader, helmet, shield, armor, richest trim); `typical` is what an ordinary garment-and-weapon person must fit. */
export const RIG_BUDGET={near:2300,mid:1700,far:900,typical:{near:1500,mid:820,far:380},/** the original gear-only budgets (garment+headwear+insignia+armor) */gear:APPEARANCE_RULES.budget} as const;
const tri=(parts:readonly RigPart[],tier:LodTier)=>parts.filter(p=>p.lod>=tier&&(p.onlyFrom??0)<=tier).reduce((n,p)=>n+partTriangles(p),0);
/** Triangles one person costs at a tier, items included (far uses the merged silhouette). */
export function rigTriangles(o:RigOutfit,tier:LodTier,culture?:Culture):number{
 if(tier===2)return tri(farParts(o,culture),2);
 return RIG_BONES.reduce((n,b)=>n+tri(o.bones[b],tier),0)+[o.itemR,o.itemL].reduce((n,i)=>n+(i?tri(itemParts(i,culture,o.look,{shield:o.rendered.shield as ShieldKind|undefined}),tier):0),0);
}
export const rigVertices=(o:RigOutfit,tier:LodTier,culture?:Culture)=>rigTriangles(o,tier,culture)*3;
/** Gear-only triangles (no body, no items): what the old appearance budget measured. */
export function gearTriangles(o:RigOutfit,tier:LodTier){
 const bodyShapes=new Set(['body','skin','boot']);let n=0;for(const b of RIG_BONES)n+=tri(o.bones[b].filter(p=>!bodyShapes.has(p.slot)&&p.slot!=='hair'),tier);return n;
}
export const tierForDistance=(d:number):LodTier=>d<35?0:d<70?1:2;
void rel;
