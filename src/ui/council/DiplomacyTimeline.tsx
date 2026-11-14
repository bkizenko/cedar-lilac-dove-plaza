import type {CouncilModel} from '../../game/rulersView';
import {diplomacyTimeline} from './dipTimeline';
/** One dated strip: running ultimatums, claims lapsing, wards and fosterage ends, soonest first. Glyph plus label, never colour alone; a row centres the camera on the house (via onFocus, fog-safe). Hidden when empty. */
export function DiplomacyTimeline({council,onFocus}:{council:CouncilModel|undefined;onFocus?:(team:number)=>void}){
 const items=diplomacyTimeline(council);if(!items.length)return null;
 return <section aria-label="Diplomatic timeline" data-dip-timeline="1" className="space-y-1">
  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-parchment-dim">Coming up · {items.length}</h3>
  <ol className="space-y-1 border-l border-parchment/20 pl-2">{items.map(i=><li key={i.key} data-kind={i.kind}>
   <button type="button" onClick={()=>onFocus?.(i.team)} title="Centre the map on their settlement" className={'flex min-h-11 w-full items-start gap-2 rounded border px-2 py-1.5 text-left text-[12px] '+(i.kind==='ultimatum'?'border-red-400/50 bg-red-900/25 text-red-100':'border-parchment/15 bg-black/20 text-parchment-dim')}>
    <span aria-hidden="true" className="w-4 shrink-0 text-center">{i.glyph}</span>
    <span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-wide">{i.label}</span><span className="block">{i.text}</span></span>
   </button>
  </li>)}</ol>
 </section>;
}
