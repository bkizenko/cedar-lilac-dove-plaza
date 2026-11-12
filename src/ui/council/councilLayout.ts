import {useState} from 'react';
export type CouncilLayout='current'|'classic';
const KEY='hearthwild.ui.councilLayout';
/** Per-viewer UI preference. The classic council panel stays archived and selectable. Storage may be unavailable. */
export function useCouncilLayout():[CouncilLayout,(l:CouncilLayout)=>void]{
 const [layout,set]=useState<CouncilLayout>(()=>{try{return globalThis.localStorage?.getItem(KEY)==='classic'?'classic':'current';}catch{return 'current';}});
 return [layout,l=>{set(l);try{globalThis.localStorage?.setItem(KEY,l);}catch{/* preference only */}}];
}
