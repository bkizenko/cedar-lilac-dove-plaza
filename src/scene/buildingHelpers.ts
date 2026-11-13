/** Shared helpers and types for the Option H procedural building families
 * (split out so core and extra family files can share them without a cycle). */
import {beam,chance,far,fitToFootprint,part,pick,range,seededRandom,type BuildingSpec,type Part,type Rng,type LodTier} from './buildingParts';
import type {CarvedMaterialId} from './carvedPalette';
export type BuildMaterial='wattle'|'timber'|'stone'|'mudbrick';
export type Climate='temperate'|'cold'|'wet'|'arid';
export type Trade='bench'|'forge'|'kiln'|'loom'|'rack'|'saw'|'smoke'|'oven'|'pottery';
export type WallAxis='x'|'z'|'corner';
/** Which neighbours a tiled cell (wall, gate, trench, moat, canal, aqueduct) touches, in the cell's own frame: bit 1 = +X, 2 = -X, 4 = +Z, 8 = -Z. */
export const JOIN={px:1,nx:2,pz:4,nz:8} as const;
export const joinOfAxis=(axis:WallAxis|undefined)=>axis==='z'?JOIN.pz|JOIN.nz:axis==='corner'?JOIN.px|JOIN.pz:JOIN.px|JOIN.nx;
/** Cultural FORMS a society's skin chooses (civSkin.ts formsOf; data in civSkinData.ts): the shape of walls, gates and great-hall roofs, not just colours. */
export type WallStyle='log'|'drystone'|'mudbrick'|'ashlar';
export type GateShape='stockade'|'arch'|'lintel'|'pylon'|'pavilion';
export type HallForm='gable'|'thatchHip'|'terrace'|'vault'|'stave'|'turf'|'felt'|'upturned'|'saddle';
export type WallCap='plain'|'tile'|'thatch'|'turf';
export type SkinForms={wall:WallStyle;gate:GateShape;hall:HallForm;cap:WallCap};
export const NEUTRAL_FORMS:SkinForms={wall:'log',gate:'stockade',hall:'gable',cap:'plain'};
/** Learned local building habits of one settlement (G3): two villages of the
 * same era and climate still differ in pitch, proportions and annex habits. */
export type Tradition={pitchBiasDeg:number;annexBias:number;proportion:number;porchBias:number};
export const NEUTRAL_TRADITION:Tradition={pitchBiasDeg:0,annexBias:0,proportion:1,porchBias:0};
export type FamilyContext={seed:number;era:number;material:BuildMaterial;climate:Climate;wealth:number;
 tradition?:Tradition;footprint:{w:number;d:number};trade?:Trade;waterSide?:'+x'|'-x'|'+z'|'-z';wallAxis?:WallAxis;scale?:'small'|'large';
 /** false removes fire parts (cold hearth/forge); undefined = lit. */lit?:boolean;
 /** Tiled cells: neighbour mask (JOIN bits). Absent = derived from wallAxis (legacy). */join?:number;
 /** Gate leaves swung open against the towers. */gateOpen?:boolean;
 /** The society's cultural forms (walls, gates, hall roofs); absent = the neutral Village forms. */form?:SkinForms};
export type Generator=(ctx:FamilyContext,r:Rng)=>{parts:Part[];entry?:{x:number;z:number;width:number}};
export type CoreFamilyId='roundhouse'|'cottage'|'longhouse'|'granary'|'storehouse'|'watermill'|'quernShelter'|'workshop'|'palisade'|'gate'|'tower'|'church'|'marketStalls'|'hearth';
export type ExtraFamilyId='fieldPlot'|'pen'|'pier'|'bridge'|'keep'|'stables'|'college'|'quarry'|'cairn'|'grove'|'outpost'|'threshing'|'stoneWall'|'trench'|'moat'|'well'|'cistern'|'millHouse'|'windmill'|'aqueduct'|'canal';
export type FamilyId=CoreFamilyId|ExtraFamilyId;

/** Roof pitch in radians: snow sheds off steep thatch, arid roofs are low. */
export function roofPitch(ctx:FamilyContext,r:Rng){
 const [lo,hi]={cold:[46,56],wet:[40,50],temperate:[32,45],arid:[14,24]}[ctx.climate];
 const thatchBonus=roofMaterial(ctx)==='thatch'?4:0,bias=ctx.tradition?.pitchBiasDeg??0;return Math.max(10,range(r,lo,hi)+thatchBonus+bias)*Math.PI/180;
}
export function roofMaterial(ctx:FamilyContext):CarvedMaterialId{
 if(ctx.era<=1||ctx.material==='wattle')return 'thatch';
 if(ctx.climate==='arid'||ctx.material==='mudbrick'||(ctx.era>=3&&ctx.wealth>.55&&ctx.material==='stone'))return 'tile';
 return ctx.era>=2?'shingle':'thatch';
}
export function wallMaterial(ctx:FamilyContext):CarvedMaterialId{
 return ctx.material==='stone'?'stone':ctx.material==='mudbrick'?'plaster':ctx.material==='wattle'?'plaster':'woodMid';
}
/** Storeys are limited by material: wattle 1, timber 2, stone 2 (3 in late eras). */
export function maxStoreys(material:BuildMaterial,era:number){return material==='wattle'?1:material==='mudbrick'?2:material==='timber'?2:era>=5?3:2;}

/** Gable roof prism plus a carved ridge and dark edge boards. axis = ridge direction. */
export function gableRoof(parts:Part[],ctx:FamilyContext,span:number,length:number,eave:number,pitch:number,cx:number,cz:number,axis:'x'|'z',overhang=.22,mat?:CarvedMaterialId){
 const rise=Math.max(.25,span/2*Math.tan(pitch)),m=mat??roofMaterial(ctx),rot:[number,number,number]|undefined=axis==='x'?[0,Math.PI/2,0]:undefined;
 parts.push(part('prism',m,[span+2*overhang,rise,length+2*overhang],[cx,eave,cz],2,rot));
 roofCourses(parts,span/2+overhang,rise,length+2*overhang-.08,eave,cx,cz,axis,m==='thatch'?2:3);
 const half=(length+2*overhang)/2;
 parts.push(axis==='x'?part('box','woodEdge',[length+2*overhang,.12,.14],[cx,eave+rise-.04,cz],1):part('box','woodEdge',[.14,.12,length+2*overhang],[cx,eave+rise-.04,cz],1));
 // Bargeboards at both gable ends read the pitch at mid distance.
 for(const s of[-1,1]){const ex=axis==='x'?cx+s*half:cx,ez=axis==='z'?cz+s*half:cz;parts.push(part('box','woodEdge',axis==='x'?[.08,.1,span+2*overhang]:[span+2*overhang,.1,.08],[ex,eave-.05,ez],0));}
 return rise;
}
/** Carved shingle/thatch course lines laid on both roof slopes (near LOD
 * only): the board's roofs read as stacked boards, not flat planes. */
export function roofCourses(parts:Part[],halfSpan:number,rise:number,length:number,eave:number,cx:number,cz:number,axis:'x'|'z',perSide:number){
 const a=Math.atan2(rise,halfSpan);
 for(const side of[-1,1])for(let i=0;i<perSide;i++){
  const t=.22+i*(.62/Math.max(1,perSide-1)),lx=side*halfSpan*(1-t),y=eave+rise*t,theta=side<0?a:-a;
  const pos:[number,number,number]=axis==='z'?[cx+lx,y,cz]:[cx,y,cz-lx];
  parts.push(part('box','woodDark',[.12,.035,length],pos,0,axis==='z'?[0,0,theta]:[0,Math.PI/2,theta]));
 }
}
export function door(parts:Part[],x:number,z:number,w=.85,h=1.55,face:'+z'|'-z'|'+x'|'-x'='+z'){
 // A readable doorway at any distance: dark opening, pale-or-wood frame (posts + lintel) standing proud of the wall, and a step.
 const t=.07,along=face==='+z'||face==='-z',f=.12,o=.035,s=face==='+z'||face==='+x'?1:-1;
 const at=(a:number,b:number)=>(along?[x+a,0,z+s*b]:[x+s*b,0,z+a]) as [number,number,number];
 const box=(mat:CarvedMaterialId,sw:number,sh:number,st:number,a:number,y:number,b:number,lod:LodTier=1)=>{const q=part('box',mat,along?[sw,sh,st]:[st,sh,sw],at(a,b),lod);parts.push({...q,pos:[q.pos[0],y,q.pos[2]]});};
 box('recess',w,h,t,0,0,0,1);
 for(const sx of[-1,1])box('woodDark',f,h+f,t+o*2,sx*(w/2+f/2-.01),0,o,0);
 box('woodDark',w+f*2,f,t+o*2,0,h,o,0);
 box('stoneDark',w+.5,.1,.4,0,0,.3,0);
}
export function windowAt(parts:Part[],x:number,y:number,z:number,face:'z'|'x'){parts.push(part('box','recess',face==='z'?[.45,.42,.06]:[.06,.42,.45],[x,y,z],0));}
