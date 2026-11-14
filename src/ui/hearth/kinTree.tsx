import {Users,Crown} from 'lucide-react';
import type {CouncilModel} from '../../game/rulersView';
type Fam=NonNullable<CouncilModel['house']>['family'][number];
/** Rows of the family by descent: elders first, then children under the house. Pure; works on old models with no parent links (single row). */
export function kinGenerations(family:Fam[]):Fam[][]{
 const byId=new Map(family.filter(p=>p.id).map(p=>[p.id!,p]));
 const depth=(p:Fam,seen=new Set<string>()):number=>{if(!p.parent||!p.id||seen.has(p.id))return 0;seen.add(p.id);const par=byId.get(p.parent);if(!par)return 0;return 1+depth(par,seen);};
 const rows:Fam[][]=[];
 for(const p of family){const d=depth(p);(rows[d]??=[]).push(p);}
 return rows.filter(Boolean).map(r=>r.sort((a,b)=>b.age-a.age));
}
/** The house as a family tree: generations stacked, spouses tagged, the ruler marked, children shown under their elders. */
export function KinTree({house,rulerName}:{house:NonNullable<CouncilModel['house']>;rulerName?:string}){
 const rows=kinGenerations(house.family),byId=new Map(house.family.filter(p=>p.id).map(p=>[p.id!,p]));
 return <section className="hw-card hw-kin" aria-label="House">
  <div className="hw-card-head"><h3>House {house.name}</h3><span className="hw-chip hw-chip-soft"><Users size={16}/>Generation {house.generation+1}</span></div>
  <ol className="hw-kin-rows">{rows.map((r,i)=><li key={i} className="hw-kin-row"><ul>{r.map(p=>{const sp=p.spouse?byId.get(p.spouse)?.name:undefined;return <li key={p.id??p.name+p.age} className={'hw-kin-p'+(p.name===rulerName?' is-ruler':'')+(p.adult?'':' is-child')} data-parent={p.parent??''}>
   <b>{p.name===rulerName&&<Crown size={14} aria-label="Ruler"/>}{p.name}</b><span>{p.role}, {p.age}</span>{sp&&<em>wed to {sp}</em>}{p.care&&<em>{p.care}</em>}</li>;})}</ul></li>)}</ol>
 </section>;
}
