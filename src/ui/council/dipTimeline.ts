import type {CouncilModel} from '../../game/rulersView';
/** One dated diplomatic matter on the running timeline. Pure, derived from the council read model only; no new state. */
export type TimelineItem={key:string;team:number;inYears:number;kind:'ultimatum'|'claim'|'ward'|'foster';glyph:string;label:string;text:string};
const when=(n:number)=>n<=0?'within a year':n===1?'in 1 year':`in ${n} years`;
/** Running ultimatums, our own claims lapsing, wards due home and fosterage ends across all houses, soonest first. Old or empty models give []. */
export function diplomacyTimeline(c:CouncilModel|undefined):TimelineItem[]{
 if(!c||!c.enabled)return [];const out:TimelineItem[]=[];
 for(const n of c.neighbours){
  for(const k of n.casus??[]){
   if(k.byUs)out.push({key:`tl-claim-${n.team}-${k.kind}`,team:n.team,inYears:k.endsIn,kind:'claim',glyph:'⚑',label:'Our claim lapses',text:`${n.name}: our claim lapses ${when(k.endsIn)} unless pressed.`});
   else out.push({key:`tl-ult-${n.team}-${k.kind}`,team:n.team,inYears:k.endsIn,kind:'ultimatum',glyph:'⚠',label:'Ultimatum',text:`${n.name} want ${k.demand??'their cause answered'}; their claim runs out ${when(k.endsIn)}.`});
  }
  for(const w of n.wards??[]){
   const foster=w.kind==='foster';
   out.push({key:`tl-ward-${n.team}-${w.name}-${w.sinceYear}`,team:n.team,inYears:w.endsIn,kind:foster?'foster':'ward',glyph:foster?'♡':'⌂',label:foster?'Fosterage ends':'Hostage returns',text:`${w.name} (${w.age}) ${foster?'fostered':'held'} ${w.heldByUs?'with us':`in ${n.name}`} goes home ${when(w.endsIn)}.`});
  }
 }
 return out.sort((a,b)=>a.inYears-b.inYears||a.key.localeCompare(b.key));
}
