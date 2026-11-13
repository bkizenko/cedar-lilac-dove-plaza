import type {CouncilModel} from '../../game/rulersView';
import {attentionInbox} from './attentionInbox';
const TONE={danger:'border-red-400/50 bg-red-900/25 text-red-100',warn:'border-bronze/50 bg-bronze/15 text-parchment',note:'border-parchment/15 bg-black/20 text-parchment-dim'} as const;
const WORD={danger:'Urgent',warn:'Watch',note:'Note'} as const;
/** One inbox card for slow diplomatic matters. Each row carries a glyph and a word, never colour alone; a row about a house centres the camera on it (via onFocus, fog-safe). Hidden when empty. */
export function AttentionInbox({council,onFocus}:{council:CouncilModel|undefined;onFocus?:(team:number)=>void}){
 const items=attentionInbox(council);if(!items.length)return null;
 return <section aria-label="Needs your attention" data-attention-inbox="1" className="space-y-1">
  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-parchment-dim">Needs your attention · {items.length}</h3>
  <ul className="space-y-1">{items.map(i=><li key={i.key}>
   <button type="button" disabled={i.team===undefined} onClick={()=>i.team!==undefined&&onFocus?.(i.team)} title={i.team===undefined?undefined:'Centre the map on their settlement'} className={'flex min-h-11 w-full items-start gap-2 rounded border px-2 py-1.5 text-left text-[12px] '+TONE[i.tone]} data-tone={i.tone}>
    <span aria-hidden="true" className="w-4 shrink-0 text-center">{i.glyph}</span>
    <span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-wide">{WORD[i.tone]} · {i.label}</span><span className="block">{i.text}</span></span>
   </button></li>)}</ul>
 </section>;
}
