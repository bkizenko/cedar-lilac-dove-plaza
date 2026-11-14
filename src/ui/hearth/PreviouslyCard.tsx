import {useEffect,useRef,useState} from 'react';
import {ScrollText,X} from 'lucide-react';
import type {Engine} from '@/game/engine';
import {useOwnerReadModels} from '../useOwnerReadModels';
import {previousLines,rememberLines} from './previously';
import {cx} from './kit';

const Q={kind:'rulers-council'} as const;
/** "Previously": on returning to a saved village, a short dismissible card with the chronicle lines that happened since the viewer last
 * looked. Read-only presentation from the council read model; per-viewer memory in localStorage, never gameplay state. */
export function PreviouslyCard({engine}:{engine:Engine}){
 const read=useOwnerReadModels(engine,[Q]),log=read(Q).model?.council?.log,key=`${engine.game.state.seed}:${engine.game.tribe(0).name}`;
 const [fresh,setFresh]=useState<string[]|null>(null),decided=useRef(false),latest=useRef<string[]>([]);
 useEffect(()=>{
  if(!log)return;latest.current=log;
  if(!decided.current){decided.current=true;const p=previousLines(key,log);if(p.length)setFresh(p);else rememberLines(key,log);}
 },[log,key]);
 useEffect(()=>{
  const save=()=>{if(decided.current&&latest.current.length&&fresh===null)rememberLines(key,latest.current);};
  const vis=()=>{if(document.visibilityState==='hidden')save();};
  window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',vis);const t=window.setInterval(save,20000);
  return()=>{window.removeEventListener('pagehide',save);document.removeEventListener('visibilitychange',vis);window.clearInterval(t);};
 },[key,fresh]);
 if(!fresh)return null;
 const close=()=>{rememberLines(key,latest.current);setFresh(null);};
 return <section className={cx('hw-prev')} role="status" aria-label="Previously">
  <h3><ScrollText size={20}/>Previously</h3>
  <ul>{fresh.map((l,i)=><li key={i}>{l}</li>)}</ul>
  <button type="button" className="hw-prev-x" aria-label="Dismiss recap" onClick={close}><X size={20}/></button>
 </section>;
}
