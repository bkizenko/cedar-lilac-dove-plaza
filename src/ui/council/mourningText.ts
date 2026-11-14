import type {CouncilModel} from '../../game/rulersView';
type Mourning=NonNullable<CouncilModel['mourning']>;
const REL:Record<string,string>={child:'their child',sibling:'their sibling',kin:'a kinsperson',none:'no near kin'};
/** Plain-language handover lines for the hall's mourning period (read-only; same wording in Field and Hearth). */
export function mourningText(m:Mourning){
 const mins=Math.max(1,Math.ceil(m.secondsLeft/60));
 const rel=REL[m.relation]??'kin';
 const headline=`${m.from} is mourned; ${m.to} takes the seat${m.relation==='none'?'':` as ${rel}`}.`;
 const pacts:string[]=[];
 if(m.carried-m.strained>0)pacts.push(`${m.carried-m.strained} agreement${m.carried-m.strained>1?'s':''} carried over`);
 if(m.strained>0)pacts.push(`${m.strained} strained`);
 if(m.lapsed>0)pacts.push(`${m.lapsed} lapsed`);
 return {headline,contested:m.contested,left:`about ${mins} min of mourning left`,pacts:pacts.length?pacts.join(', ')+'.':null,kind:m.kind==='ruler-set-aside'?'Set aside':'Death'};
}
