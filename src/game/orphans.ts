/** Orphan care for ruling houses. A child under sixteen whose parent is dead and whose parent's spouse is dead too is taken in by the nearest
 * living kin household: an adult elder sibling, then a grandparent, then an uncle or aunt, then the hall itself (the ruler, or the regent
 * when the orphan is the ruler). Pure and derived from the dynasty people alone: no spawned adults, no goods, so old saves resolve on load. */
import type {Dynasty,Person} from './dynasty';
import {ADULT} from './dynasty';

export type OrphanKind='sibling'|'grandparent'|'kin'|'hall'|'regent';
export type OrphanCare={child:string;guardian:string;kind:OrphanKind;/** optional: saved records (rulers.orphanCare) do not carry it; orphanLine derives it */relation?:string};
const alive=(d:Dynasty,id?:string):Person|undefined=>{const p=id?d.people[id]:undefined;return p&&p.alive?p:undefined;};

export function orphanCare(d:Dynasty):OrphanCare[]{
 const out:OrphanCare[]=[];
 for(const c of Object.values(d.people).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)){
  if(!c.alive||c.age>=ADULT||!c.parent)continue;
  const par=d.people[c.parent];if(!par||par.alive||alive(d,par.spouse))continue; // only a child with no living parent is an orphan
  const adults=Object.values(d.people).filter(p=>p.alive&&p.id!==c.id&&p.age>=ADULT);
  const sib=adults.filter(p=>p.parent===c.parent).sort((a,b)=>b.age-a.age||(a.id<b.id?-1:1))[0];
  if(sib){out.push({child:c.id,guardian:sib.id,kind:'sibling',relation:sib.sex==='f'?'elder sister':'elder brother'});continue;}
  const gp=alive(d,par.parent);
  if(gp){out.push({child:c.id,guardian:gp.id,kind:'grandparent',relation:gp.sex==='f'?'grandmother':'grandfather'});continue;}
  const aunt=par.parent?adults.filter(p=>p.parent===par.parent&&p.id!==par.id).sort((a,b)=>b.age-a.age||(a.id<b.id?-1:1))[0]:undefined;
  if(aunt){out.push({child:c.id,guardian:aunt.id,kind:'kin',relation:aunt.sex==='f'?'aunt':'uncle'});continue;}
  if(c.id===d.rulerId){const rg=alive(d,d.regent);if(rg){out.push({child:c.id,guardian:rg.id,kind:'regent',relation:'regent'});continue;}}
  const head=alive(d,d.rulerId);
  if(head&&head.id!==c.id)out.push({child:c.id,guardian:head.id,kind:'hall',relation:'ruler of the hall'});
 }
 return out;
}
/** One plain line for a card or the chronicle. */
export const orphanLine=(d:Dynasty,o:OrphanCare):string=>{
 const c=d.people[o.child],g=d.people[o.guardian];if(!c||!g)return '';
 const rel=o.relation??(o.kind==='sibling'?(g.sex==='f'?'elder sister':'elder brother'):o.kind==='grandparent'?(g.sex==='f'?'grandmother':'grandfather'):o.kind==='kin'?(g.sex==='f'?'aunt':'uncle'):'kinsman');
 return o.kind==='hall'?`${c.name} has no kin left to raise them and is fed at the hall under ${g.name}`:o.kind==='regent'?`${c.name}, still a child, is raised in the hall under regent ${g.name}`:`${c.name} is taken in by ${g.name}, their ${rel}, and eats at that table`;
};
