/** Per-game civ and faith generation. Three modes: preset (one of the 14), remix (preset + mutation), free (from nothing).
 * Output is data only: a CivSeed that the scene layer maps to palettes/kits and the sim maps to polity/ruler. */
import {hash32,makeRng,normal,pick,weighted,type Rng} from './rulerCore';
import {generatePolity,type Ecology,type Polity} from './polityModel';
import {generateRuler,type Ruler} from './rulerGenome';

export const PRESETS=['aureline','hanrei','steppan','sandrill','kaaltun','mekhari','skoldar','nilemark','tigrane','rusvolt'] as const;
export type Mode='preset'|'remix'|'free';
export const MATERIALS=['wood','stone','brick','mudbrick','felt','thatch','turf','bamboo','plaster','timberFrame'] as const;
export type Material=(typeof MATERIALS)[number];

export type Faith={id:string;name:string;focus:'ancestors'|'sky'|'earth'|'law'|'trade'|'fire'|'sea';doctrines:string[];tolerance:number;proselytism:number;clergy:'none'|'shamans'|'priesthood'|'ruler';taboo:string};
export type CivSeed={id:string;mode:Mode;preset?:string;name:string;ecology:Ecology;materials:Material[];silhouette:string;hueShift:number;traditionalism:number;polity:Polity;ruler:Ruler;faith:Faith};

const FOCI:Faith['focus'][]=['ancestors','sky','earth','law','trade','fire','sea'];
const DOCTRINES=['hospitality','blood-price','tithe of first fruits','sacred groves','cremation','sky burial','pilgrimage','fasting','oath-binding','no images of the divine','sacred kingship','war-trance','twin deities','ancestor feast'];
const TABOOS=['eating the draft animal','iron on holy ground','speaking the dead by name','cutting living trees','usury','crossing running water at night','shedding blood in the shrine'];
const SYL=['ka','lo','mir','ven','tha','sul','dre','ish','or','an','el','ru','ba','shi'];
export function generateFaith(seed:number,eco:Ecology):Faith{
 const r=makeRng(hash32('faith',seed));
 const focus=weighted(r,[['ancestors',1+(1-eco.scale)*2],['sky',1+eco.pastoral*2],['earth',1+eco.surplus*2],['law',.5+eco.scale*2],['trade',.5+eco.trade*2],['fire',1],['sea',.5+eco.trade] ] as const);
 const n=2+Math.floor(r()*2),d=new Set<string>();while(d.size<n)d.add(pick(r,DOCTRINES));
 return {id:`faith-${seed}`,name:cap(pick(r,SYL)+pick(r,SYL))+'ism',focus,doctrines:[...d],tolerance:Math.round(normal(r,50,22)),proselytism:Math.round(normal(r,40,22)),clergy:eco.scale<.25?'shamans':eco.scale<.6?pick(r,['shamans','priesthood'] as const):pick(r,['priesthood','ruler'] as const),taboo:pick(r,TABOOS)};
}
const cap=(s:string)=>s[0].toUpperCase()+s.slice(1);
function ecologyFor(r:Rng,base?:Partial<Ecology>):Ecology{
 const e:Ecology={surplus:r(),threat:r(),trade:r(),pastoral:r(),sacred:r(),scale:Math.min(1,r()*.9),...base};
 return e;
}
/** Mutate a preset's ecology/materials so a remix reads as kin, not clone. Deterministic per seed. */
function mutate(r:Rng,base:Ecology,k:number):Ecology{
 const m=(x:number)=>Math.min(1,Math.max(0,x+(r()-.5)*k));
 return {surplus:m(base.surplus),threat:m(base.threat),trade:m(base.trade),pastoral:m(base.pastoral),sacred:m(base.sacred),scale:base.scale};
}
const PRESET_ECO:Record<string,Partial<Ecology>>={
 aureline:{trade:.8,surplus:.6},hanrei:{surplus:.8,scale:.8},steppan:{pastoral:.95,threat:.7},sandrill:{pastoral:.3,sacred:.7},kaaltun:{sacred:.8,surplus:.7},
 mekhari:{trade:.6,surplus:.7},skoldar:{threat:.8,surplus:.3},nilemark:{surplus:.9,sacred:.7},tigrane:{trade:.7,scale:.7},rusvolt:{threat:.6,surplus:.4},
};
const PRESET_MAT:Record<string,Material[]>={aureline:['plaster','stone'],hanrei:['timberFrame','plaster'],steppan:['felt','wood'],sandrill:['stone','mudbrick'],kaaltun:['plaster','thatch'],mekhari:['bamboo','thatch','wood'],skoldar:['turf','stone','wood'],nilemark:['plaster','mudbrick'],tigrane:['brick','stone'],rusvolt:['wood','timberFrame']};
export function generateCiv(gameSeed:number,slot:number,mode:Mode,preset?:string):CivSeed{
 const seed=hash32('civ',gameSeed,slot),r=makeRng(seed);
 const p=preset??pick(r,PRESETS);
 let eco=ecologyFor(r,mode==='free'?undefined:PRESET_ECO[p]);
 if(mode==='remix')eco=mutate(r,eco,.5);
 let mats:Material[]=mode==='free'?[...new Set<Material>([pick(r,MATERIALS),pick(r,MATERIALS),pick(r,MATERIALS)])]:[...(PRESET_MAT[p]??['wood'])];
 if(mode==='remix'&&r()<.6)mats=[...new Set<Material>([...mats.slice(0,1),pick(r,MATERIALS)])];
 const trad=Math.round(normal(r,50,20));
 const polity=generatePolity(seed,eco,{traditionalism:trad});
 const ruler=generateRuler(hash32('civ-ruler',seed),{traditionalism:trad});
 const sil=pick(r,['terraced','radial','linear','courtyard','stilted','clustered','walled','scattered']);
 return {id:`civ-${gameSeed}-${slot}`,mode,preset:mode==='free'?undefined:p,name:cap(pick(r,SYL)+pick(r,SYL)+pick(r,['an','ar','ine','ok','ul'])),ecology:eco,materials:mats,silhouette:sil,hueShift:Math.round((r()-.5)*40),traditionalism:trad,polity,ruler,faith:generateFaith(seed,eco)};
}
/** A game's cast: unique names, no two civs with identical material+silhouette. */
export function generateCast(gameSeed:number,n:number,modes:Mode[]=['preset','remix','free']):CivSeed[]{
 const out:CivSeed[]=[],seen=new Set<string>(),names=new Set<string>();
 for(let i=0,tries=0;out.length<n&&tries<n*20;i++,tries++){
  const c=generateCiv(gameSeed,i,modes[out.length%modes.length]);
  const key=c.materials.join('+')+'|'+c.silhouette;
  if(seen.has(key)||names.has(c.name))continue;seen.add(key);names.add(c.name);out.push(c);
 }
 return out;
}
