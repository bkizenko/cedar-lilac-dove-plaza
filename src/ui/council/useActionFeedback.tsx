import {useCallback,useEffect,useRef,useState} from 'react';
import type {Engine} from '../../game/engine';
export type Feedback={id:number;ok:boolean;text:string};
type Command=Parameters<Engine['dispatch']>[0];
/** Dispatches a council command and keeps the last outcomes, so no accept or refusal is silent: a tone, a visible line (fading), and a sound cue. */
export function useActionFeedback(engine:Engine){
 const [items,setItems]=useState<Feedback[]>([]),n=useRef(0),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const push=useCallback((ok:boolean,text:string)=>{try{engine.audio?.play(ok?'trade':'invalid');}catch{/* cue is optional */}if(alive.current)setItems(p=>[{id:++n.current,ok,text},...p].slice(0,3));},[engine]);
 const send=useCallback(async(command:Command)=>{try{const r=await engine.dispatch(command);push(r.accepted,r.reason);return r.accepted;}catch(e){push(false,e instanceof Error?e.message:'Unavailable');return false;}},[engine,push]);
 useEffect(()=>{if(!items.length)return;const t=setTimeout(()=>setItems(p=>p.slice(0,-1)),9000);return()=>clearTimeout(t);},[items]);
 return {items,send};
}
/** Polite live region; accepted outcomes read green with a tick, refusals read red with a cross (not colour alone). */
export function FeedbackList({items}:{items:Feedback[]}){
 return <ul role="status" aria-live="polite" className="space-y-1 empty:hidden">{items.map((f,i)=><li key={f.id} data-ok={f.ok} className={'flex gap-1.5 rounded border px-2 py-1 '+(f.ok?'border-green-400/30 bg-green-900/20 text-green-200':'border-red-400/30 bg-red-900/20 text-red-200')} style={{opacity:i===0?1:.65}}><span aria-hidden="true" className="font-bold">{f.ok?'✓':'✕'}</span><span>{f.text}</span></li>)}</ul>;
}
