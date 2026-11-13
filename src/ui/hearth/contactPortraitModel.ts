/** Contact portrait model: the person you are meeting, read from the same genome the people renderer dresses them from.
 *  Pure and seeded. Inputs are the society's PeopleLook and the Individual that `individualFor` derives from (society key, unit id),
 *  so the face on the dialog is the face on the field: same hair, beard, paint, ornaments and garb. Nothing here draws or rolls dice. */
import {skinColour,type PeopleLook,type Individual,type HairStyle,type BeardStyle,type HeadKind,type Jewel,type MarkPattern,type MarkKind,type Cut,type Fibre} from '../../scene/peopleLook';
import type {Mood} from '../../game/vocab';
export type PortraitSpec={
 skin:string;skinShade:string;hair:HairStyle;hairColour:string;beard:BeardStyle;head:HeadKind;jewel:Jewel[];
 mark:{kind:MarkKind;pattern:MarkPattern;colour:string;sites:string[]}|null;
 torso:Cut['torso'];mantle:Cut['mantle'];sleeve:Cut['sleeve'];cloth:string;under:string;trim:string;accent:string;fibre:Fibre;
 jaw:number;brow:number;nose:number;ears:number;shoulder:number;head_:number;age:number;grey:boolean;mood:Mood;scar:boolean;
};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const darken=(hex:string,k:number)=>{const n=parseInt(hex.slice(1),16),f=(c:number)=>Math.round(clamp(c*k,0,255)).toString(16).padStart(2,'0');return '#'+f(n>>16&255)+f(n>>8&255)+f(n&255);};
export function warmthForEra(age:number):'light'|'mild'|'cold'{return age<=0?'cold':age<=2?'mild':'light';}
/** `cold` picks the heavier cut for the cold-weather band and early ages: furs and hides read as prehistoric. */
export function portraitSpec(look:PeopleLook,ind:Individual,o:{era:number;mood?:Mood;cold?:boolean}):PortraitSpec{
 const warmth=o.cold?'cold':warmthForEra(o.era),cut=look.cuts[warmth],tone=skinColour(look,ind.skinTone),hairBase=look.hair.colors[ind.hairColour%look.hair.colors.length]??'#2a1d14';
 const grey=ind.age>=.8,mk=ind.mark;
 return {skin:tone,skinShade:darken(tone,.62),hair:ind.hair,hairColour:grey?'#c9c5bb':hairBase,beard:ind.beard,head:warmth==='cold'&&look.head.cold!=='none'?look.head.cold:ind.head,jewel:ind.jewel,
  mark:mk?{kind:mk.kind,pattern:mk.pattern,colour:look.mark.colour,sites:mk.sites}:null,
  torso:cut.torso,mantle:cut.mantle,sleeve:cut.sleeve,cloth:look.dyes.cloth[ind.variant%look.dyes.cloth.length]??look.dyes.cloth[0],under:look.dyes.under,trim:look.dyes.trim,accent:look.dyes.accent,fibre:look.fibre[warmth==='light'?'light':warmth==='mild'?'skin':'hide'],
  jaw:look.face.jaw,brow:look.face.brow,nose:look.face.nose,ears:look.face.ears,shoulder:look.body.shoulder*ind.build,head_:look.body.head,age:ind.age,grey,mood:o.mood??'unknown',scar:!!mk&&mk.kind==='scar'};
}
