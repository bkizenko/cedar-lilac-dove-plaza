/** Plain-words age of a needs-trade offer, from real game seconds only (answerLeft comes from the read model). */
export type OfferAge={text:string;tone:'ok'|'soon'|'gone'};
const minutes=(s:number)=>{const m=Math.ceil(s/60);return m<=1?'a minute':`${m} minutes`;};
export function offerAge(o:{phase:string;status:string;answerLeft?:number|null;canAnswer:boolean}):OfferAge|null{
 if(o.canAnswer&&typeof o.answerLeft==='number'&&Number.isFinite(o.answerLeft)){
  if(o.answerLeft<=0)return {text:'Offer lapsed: it was not answered in time',tone:'gone'};
  return {text:`Answer within ${minutes(o.answerLeft)}`,tone:o.answerLeft<120?'soon':'ok'};
 }
 if(o.status==='Offer expired')return {text:'Lapsed: not answered in time, so they took it elsewhere',tone:'gone'};
 if(o.status==='Caravan overdue')return {text:'Their caravan is overdue and may not come',tone:'soon'};
 if(o.status==='Awaiting caravan')return {text:'Agreed: their caravan is gathering goods and walking to us',tone:'ok'};
 return null;
}
