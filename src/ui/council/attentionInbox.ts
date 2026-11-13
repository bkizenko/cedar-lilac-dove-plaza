import type {CouncilModel} from '../../game/rulersView';
/** One slow diplomatic matter the player should not miss. Pure, derived from the council read model only; no new state. */
export type InboxItem={key:string;team?:number;tone:'danger'|'warn'|'note';glyph:string;label:string;text:string;actions?:{label:string;command:'take-in-refugees'|'turn-away-refugees'}[]};
const RANK={danger:0,warn:1,note:2} as const;
const yrs=(n:number)=>n<=0?'under a year':n===1?'1 year':`${n} years`;
/** Ward, claim, grievance and handover matters in one list, worst first. Old or empty models give []. */
export function attentionInbox(c:CouncilModel|undefined):InboxItem[]{
 if(!c||!c.enabled)return [];const out:InboxItem[]=[];
 for(const n of c.neighbours){
  for(const k of n.casus??[]){
   out.push(k.byUs?{key:`cb-us-${n.team}-${k.kind}`,team:n.team,tone:'note',glyph:'⚑',label:'Our claim',text:`${n.name}: ${k.reason} Lapses in ${yrs(k.endsIn)}.`}
    :{key:`cb-them-${n.team}-${k.kind}`,team:n.team,tone:k.strength>=50?'danger':'warn',glyph:'⚑',label:'Claim against us',text:`${n.name} hold ${k.reason.replace(/^They hold /,'')}`});
  }
  for(const w of n.wards??[]){
   if(w.endsIn<=1)out.push({key:`ward-${n.team}-${w.name}`,team:n.team,tone:'note',glyph:'⌂',label:w.heldByUs?'Ward to return':'Kin due home',text:`${w.name} (${w.kind}) ${w.heldByUs?'leaves our hall for':'comes home from'} ${n.name} in ${yrs(w.endsIn)}.`});
  }
  if(n.hostile)out.push({key:`war-${n.team}`,team:n.team,tone:'danger',glyph:'⚔',label:'At odds',text:`${n.name} stand against us${n.means.length?`: ${n.means[0]}`:''}.`});
 }
 for(const r of c.refugees??[])out.push({key:`refugees-${r.team}`,team:r.team,tone:'warn',glyph:'☗',label:'Hungry families at the hall',text:`${r.count} ${r.count===1?'person':'people'} from ${r.name} ask to be taken in. They leave in ${yrs(r.yearsLeft)}.`,actions:[{label:'Take them in',command:'take-in-refugees'},{label:'Turn away',command:'turn-away-refugees'}]});
 const h=c.handover;
 if(h){
  if(h.extinct)out.push({key:'extinct',tone:'danger',glyph:'♛',label:'No heir',text:'The line has no heir; the house may end with this ruler.'});
  else if(h.regent)out.push({key:'regent',tone:'warn',glyph:'♛',label:'Regency',text:`${h.regent} rules in the heir's name.`});
  if(h.pressure&&h.pressure.unrest>=50)out.push({key:'unrest',tone:h.pressure.unrest>=75?'danger':'warn',glyph:'!',label:'Unrest',text:`${h.pressure.stage}: ${h.pressure.why[0]??'the hall is restless'}.`});
 }
 if(c.mourning)out.push({key:'mourning',tone:'note',glyph:'✦',label:'Mourning',text:`${c.mourning.from} is mourned${c.mourning.contested?'; the succession is contested':''}.`});
 return out.sort((a,b)=>RANK[a.tone]-RANK[b.tone]);
}
