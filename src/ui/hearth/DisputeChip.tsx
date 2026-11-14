import {useState} from 'react';
import type {Engine} from '../../game/engine';
import {useOwnerReadModels} from '../useOwnerReadModels';
import {attentionInbox} from '../council/attentionInbox';
import {disputeChip} from '../council/disputeChip';
const QC={kind:'rulers-council'} as const;
const dismissed=new Set<string>();
/** Compact dispute/feud/unrest chip under the Hearth top strip. Tap opens the council at the right tab; the x hides these events until a new one arises. Glyph and word carry the meaning, never colour alone. */
export function DisputeChip({engine,onOpen}:{engine:Engine;onOpen:(tab:'neighbours'|'ruler')=>void}){
 const council=useOwnerReadModels(engine,[QC])(QC).model?.council,[,bump]=useState(0);
 const chip=disputeChip(attentionInbox(council),dismissed);if(!chip)return null;
 return <div className="hw-dispute" data-tone={chip.tone} data-dispute-chip="1" role="status">
  <button type="button" className="hw-dispute-main" title={chip.text} onClick={()=>onOpen(chip.tab)}><span aria-hidden="true" className="hw-dispute-glyph">{chip.glyph}</span><span className="hw-dispute-word">{chip.tone==='danger'?'Urgent':'Watch'} · {chip.label}</span></button>
  <button type="button" className="hw-dispute-x" aria-label="Hide these disputes" onClick={()=>{chip.keys.forEach(k=>dismissed.add(k));bump(n=>n+1);}}>×</button>
 </div>;
}
